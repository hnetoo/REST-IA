import { useState, useMemo, useCallback, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { useStockAdvanced } from '../../hooks/useStockAdvanced';
import { supabase } from '../../supabase_standalone';
import ProgressBar from '../../components/ProgressBar';
import {
  Search, Plus, Minus, Edit2, Package, AlertCircle, Box,
  TrendingDown, RefreshCw, Filter, ArrowUpDown, Zap, X,
} from 'lucide-react';

const formatKz = (val: number) => new Intl.NumberFormat('pt-AO', {
  style: 'currency', currency: 'AOA', maximumFractionDigits: 0
}).format(val);

type SortField = 'name' | 'stock' | 'value' | 'status';
type ViewMode = 'grid' | 'list';

const StockManage = () => {
  const { categories, currentUser, addNotification, updateDish } = useStore();
  const { productsWithStockInfo, loading, refresh } = useStockAdvanced();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('status');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [adjustModal, setAdjustModal] = useState<{ productId: string; name: string; currentStock: number; newStock: number } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // KPIs
  const kpis = useMemo(() => {
    const total = productsWithStockInfo.length;
    const out = productsWithStockInfo.filter(p => p.status === 'OUT').length;
    const low = productsWithStockInfo.filter(p => p.status === 'LOW').length;
    const ok = productsWithStockInfo.filter(p => p.status === 'OK').length;
    const valueCost = productsWithStockInfo.reduce((s, p) => s + p.stock_value_cost, 0);
    const valueSale = productsWithStockInfo.reduce((s, p) => s + p.stock_value_sale, 0);
    return { total, out, low, ok, valueCost, valueSale };
  }, [productsWithStockInfo]);

  // Filtro + ordenação
  const filteredProducts = useMemo(() => {
    let result = productsWithStockInfo;

    if (categoryFilter !== 'all') {
      result = result.filter(p => p.category_name === categoryFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p => p.product_name.toLowerCase().includes(q));
    }

    const sorted = [...result];
    sorted.sort((a, b) => {
      switch (sortField) {
        case 'name': return a.product_name.localeCompare(b.product_name);
        case 'stock': return b.stock_quantity - a.stock_quantity;
        case 'value': return b.stock_value_sale - a.stock_value_sale;
        case 'status': {
          const order = { OUT: 0, LOW: 1, OK: 2 };
          return order[a.status] - order[b.status];
        }
        default: return 0;
      }
    });
    return sorted;
  }, [productsWithStockInfo, categoryFilter, search, sortField]);

  // Fetch stock actual do Supabase
  const fetchStock = async (productId: string): Promise<number> => {
    const { data, error } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', productId)
      .single();
    if (error || !data) throw new Error('Produto não encontrado');
    return data.stock_quantity || 0;
  };

  // Quick adjust +/- 1
  const handleQuickAdjust = useCallback(async (productId: string, delta: number, productName: string) => {
    if (busyId === productId) return;
    setBusyId(productId);
    try {
      const currentStock = await fetchStock(productId);
      const newStock = Math.max(0, currentStock + delta);

      const { error } = await supabase.from('products').update({ stock_quantity: newStock }).eq('id', productId);
      if (error) throw error;

      await supabase.from('stock_movements').insert({
        product_id: productId,
        movement_type: 'AJUSTE',
        quantity: delta,
        reference_type: 'ADJUSTMENT',
        previous_quantity: currentStock,
        new_quantity: newStock,
        user_id: currentUser?.name || 'SYSTEM',
        notes: `Ajuste rápido: ${productName}`,
      });

      // Actualizar store
      const storeState = useStore.getState();
      const product = storeState.menu.find((p: any) => p.id === productId);
      if (product) {
        useStore.setState({
          menu: storeState.menu.map((p: any) =>
            p.id === productId ? { ...p, stock_quantity: newStock } : p
          )
        });
      }

      addNotification('success', `${productName}: ${currentStock} → ${newStock}`);
      refresh();
    } catch (e: any) {
      addNotification('error', e.message || 'Erro ao actualizar stock');
    } finally {
      setBusyId(null);
    }
  }, [busyId, currentUser, addNotification, refresh]);

  // Add stock (+10)
  const handleAddStock = useCallback(async (productId: string, amount: number, productName: string) => {
    if (busyId === productId) return;
    setBusyId(productId);
    try {
      const currentStock = await fetchStock(productId);
      const newStock = currentStock + amount;

      const { error } = await supabase.from('products').update({ stock_quantity: newStock }).eq('id', productId);
      if (error) throw error;

      await supabase.from('stock_movements').insert({
        product_id: productId,
        movement_type: 'ENTRADA',
        quantity: amount,
        reference_type: 'MANUAL_INPUT',
        previous_quantity: currentStock,
        new_quantity: newStock,
        user_id: currentUser?.name || 'SYSTEM',
        notes: `Entrada manual: +${amount} ${productName}`,
      });

      const storeState = useStore.getState();
      useStore.setState({
        menu: storeState.menu.map((p: any) =>
          p.id === productId ? { ...p, stock_quantity: newStock } : p
        )
      });

      addNotification('success', `+${amount} un. → ${productName} (total: ${newStock})`);
      refresh();
    } catch (e: any) {
      addNotification('error', e.message || 'Erro ao adicionar stock');
    } finally {
      setBusyId(null);
    }
  }, [busyId, currentUser, addNotification, refresh]);

  // Modal de ajuste manual
  const openManualAdjust = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('name, stock_quantity, min_stock, unit')
        .eq('id', productId)
        .single();
      if (error || !data) { addNotification('error', 'Produto não encontrado'); return; }
      setAdjustModal({
        productId,
        name: data.name,
        currentStock: data.stock_quantity || 0,
        newStock: data.stock_quantity || 0,
      });
    } catch (e) {
      addNotification('error', 'Erro ao buscar produto');
    }
  };

  const confirmManualAdjust = async () => {
    if (!adjustModal) return;
    const { productId, newStock, name } = adjustModal;
    if (isNaN(newStock) || newStock < 0) {
      addNotification('error', 'Valor inválido!');
      return;
    }
    setBusyId(productId);
    try {
      const realCurrent = await fetchStock(productId);
      const realDelta = newStock - realCurrent;

      if (realDelta === 0) { setAdjustModal(null); return; }

      const { error } = await supabase.from('products').update({ stock_quantity: newStock }).eq('id', productId);
      if (error) throw error;

      await supabase.from('stock_movements').insert({
        product_id: productId,
        movement_type: 'AJUSTE',
        quantity: realDelta,
        reference_type: 'ADJUSTMENT',
        previous_quantity: realCurrent,
        new_quantity: newStock,
        user_id: currentUser?.name || 'SYSTEM',
        notes: `Ajuste manual: ${name}`,
      });

      const storeState = useStore.getState();
      useStore.setState({
        menu: storeState.menu.map((p: any) =>
          p.id === productId ? { ...p, stock_quantity: newStock } : p
        )
      });

      addNotification('success', `${name}: ${realCurrent} → ${newStock}`);
      setAdjustModal(null);
      refresh();
    } catch (e: any) {
      addNotification('error', e.message || 'Erro ao actualizar stock');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-panel rounded-xl border border-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Package size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Total Produtos</p>
              <p className="text-2xl font-bold text-white">{kpis.total}</p>
            </div>
          </div>
        </div>
        <div className="glass-panel rounded-xl border border-red-500/30 p-4 bg-red-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle size={20} className="text-red-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Esgotados</p>
              <p className="text-2xl font-bold text-red-400">{kpis.out}</p>
            </div>
          </div>
        </div>
        <div className="glass-panel rounded-xl border border-yellow-500/30 p-4 bg-yellow-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <TrendingDown size={20} className="text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Stock Baixo</p>
              <p className="text-2xl font-bold text-yellow-400">{kpis.low}</p>
            </div>
          </div>
        </div>
        <div className="glass-panel rounded-xl border border-green-500/30 p-4 bg-green-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Box size={20} className="text-green-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Stock OK</p>
              <p className="text-2xl font-bold text-green-400">{kpis.ok}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass-panel rounded-xl border border-white/5 p-4">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Procurar produto..."
              className="w-full pl-9 pr-3 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-primary"
              title="Procurar produto por nome"
            />
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-500" />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm px-3 py-2.5 focus:outline-none focus:border-primary"
              title="Filtrar por categoria"
            >
              <option value="all">Todas categorias</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <ArrowUpDown size={16} className="text-slate-500" />
            <select
              value={sortField}
              onChange={e => setSortField(e.target.value as SortField)}
              className="bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm px-3 py-2.5 focus:outline-none focus:border-primary"
              title="Ordenar por"
            >
              <option value="status">Estado (críticos primeiro)</option>
              <option value="name">Nome (A-Z)</option>
              <option value="stock">Stock (maior primeiro)</option>
              <option value="value">Valor (maior primeiro)</option>
            </select>
          </div>

          {/* View toggle */}
          <div className="flex gap-1 bg-slate-700/50 border border-slate-600 rounded-lg p-1">
            <button type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${viewMode === 'grid' ? 'bg-primary text-black' : 'text-slate-400 hover:text-white'}`}
            >
              Grid
            </button>
            <button type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${viewMode === 'list' ? 'bg-primary text-black' : 'text-slate-400 hover:text-white'}`}
            >
              Lista
            </button>
          </div>

          {/* Refresh */}
          <button type="button" onClick={refresh}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-slate-300 transition-colors"
          >
            <RefreshCw size={16} /> Actualizar
          </button>
        </div>

        {/* Results count */}
        <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
          <span>{filteredProducts.length} produto(s)</span>
          <span>•</span>
          <span>Valor stock (venda): <span className="text-primary font-bold">{formatKz(kpis.valueSale)}</span></span>
          <span>•</span>
          <span>Valor stock (custo): <span className="text-slate-400 font-bold">{formatKz(kpis.valueCost)}</span></span>
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="glass-panel rounded-xl border border-white/5 p-12 text-center">
          <Package size={48} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-500">Nenhum produto encontrado.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredProducts.map(p => {
            const isOut = p.status === 'OUT';
            const isLow = p.status === 'LOW';
            const isBusy = busyId === p.product_id;
            return (
              <div key={p.product_id} className={`group bg-white/[0.03] border rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5 ${
                isOut ? 'border-red-500/30 bg-red-500/5' :
                isLow ? 'border-yellow-500/30 bg-yellow-500/5' :
                'border-white/[0.08] hover:border-primary/30'
              }`}>
                {/* Header com nome + status badge */}
                <div className="p-4 pb-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-white text-sm leading-tight flex-1" title={p.product_name}>{p.product_name}</h3>
                    <span className={`text-[8px] font-black px-2 py-1 rounded-full uppercase whitespace-nowrap ${
                      isOut ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      isLow ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                      'bg-green-500/20 text-green-400 border border-green-500/30'
                    }`}>
                      {isOut ? 'Esgotado' : isLow ? 'Baixo' : 'OK'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mb-3">{p.category_name}</p>

                  {/* Stock info */}
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-400">Stock actual</span>
                      <span className={`text-2xl font-black ${isOut ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-white'}`}>
                        {p.stock_quantity}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between text-[10px] text-slate-500">
                      <span>Mínimo: {p.min_stock}</span>
                      <span>{p.unit}</span>
                    </div>
                    <ProgressBar
                      percentage={Math.min(100, (p.stock_quantity / Math.max(p.min_stock * 2, 1)) * 100)}
                      className="h-1.5"
                      barClassName={isOut ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-green-500'}
                    />
                    {/* Value */}
                    <div className="flex justify-between text-[10px] pt-1">
                      <span className="text-slate-500">Valor venda: <span className="text-primary font-bold">{formatKz(p.stock_value_sale)}</span></span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-white/5 p-3 bg-black/20">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button type="button"
                        disabled={isBusy}
                        onClick={() => handleQuickAdjust(p.product_id, -1, p.product_name)}
                        className="w-9 h-9 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center transition-colors disabled:opacity-40"
                        title="Diminuir 1"
                      >
                        {isBusy ? <RefreshCw size={14} className="animate-spin" /> : <Minus size={16} />}
                      </button>
                      <button type="button"
                        disabled={isBusy}
                        onClick={() => handleQuickAdjust(p.product_id, 1, p.product_name)}
                        className="w-9 h-9 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 flex items-center justify-center transition-colors disabled:opacity-40"
                        title="Adicionar 1"
                      >
                        <Plus size={16} />
                      </button>
                      <button type="button"
                        disabled={isBusy}
                        onClick={() => handleAddStock(p.product_id, 10, p.product_name)}
                        className="h-9 px-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 flex items-center justify-center transition-colors text-xs font-bold disabled:opacity-40"
                        title="Adicionar 10"
                      >
                        +10
                      </button>
                    </div>
                    <button type="button"
                      onClick={() => openManualAdjust(p.product_id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold transition-colors"
                      title="Ajuste manual"
                    >
                      <Edit2 size={14} /> Ajustar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-black/30 border-b border-white/10">
                <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4 text-center">Stock</th>
                  <th className="py-3 px-4 text-center">Mínimo</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Valor Venda</th>
                  <th className="py-3 px-4 text-center">Acções</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => {
                  const isOut = p.status === 'OUT';
                  const isLow = p.status === 'LOW';
                  const isBusy = busyId === p.product_id;
                  return (
                    <tr key={p.product_id} className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${
                      isOut ? 'bg-red-500/5' : isLow ? 'bg-yellow-500/5' : ''
                    }`}>
                      <td className="py-3 px-4">
                        <p className="font-bold text-white text-xs">{p.product_name}</p>
                        <p className="text-[10px] text-slate-500">{p.category_name}</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-lg font-black ${isOut ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-white'}`}>
                          {p.stock_quantity}
                        </span>
                        <span className="text-[10px] text-slate-500 ml-1">{p.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-400 text-xs">{p.min_stock}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${
                          isOut ? 'bg-red-500/20 text-red-400' :
                          isLow ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {isOut ? 'Esgotado' : isLow ? 'Baixo' : 'OK'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-primary font-bold text-xs">{formatKz(p.stock_value_sale)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button type="button"
                            disabled={isBusy}
                            onClick={() => handleQuickAdjust(p.product_id, -1, p.product_name)}
                            className="w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center transition-colors disabled:opacity-40"
                            title="Diminuir 1"
                          >
                            {isBusy ? <RefreshCw size={12} className="animate-spin" /> : <Minus size={14} />}
                          </button>
                          <button type="button"
                            disabled={isBusy}
                            onClick={() => handleQuickAdjust(p.product_id, 1, p.product_name)}
                            className="w-8 h-8 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 flex items-center justify-center transition-colors disabled:opacity-40"
                            title="Adicionar 1"
                          >
                            <Plus size={14} />
                          </button>
                          <button type="button"
                            disabled={isBusy}
                            onClick={() => handleAddStock(p.product_id, 10, p.product_name)}
                            className="h-8 px-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 flex items-center justify-center transition-colors text-[10px] font-bold disabled:opacity-40"
                            title="Adicionar 10"
                          >
                            +10
                          </button>
                          <button type="button"
                            onClick={() => openManualAdjust(p.product_id)}
                            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition-colors"
                            title="Ajuste manual"
                          >
                            <Edit2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de ajuste manual */}
      {adjustModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setAdjustModal(null)}>
          <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Package size={24} className="text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Ajuste manual de stock</h3>
                <p className="text-sm text-slate-400 mt-0.5">{adjustModal.name}</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 mb-6">
              <p className="text-sm text-slate-500">Stock actual: <span className="text-white font-bold">{adjustModal.currentStock}</span></p>
              <div className="flex items-center gap-3">
                <button type="button"
                  onClick={() => setAdjustModal(prev => prev ? { ...prev, newStock: Math.max(0, prev.newStock - 10) } : null)}
                  className="w-10 h-10 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center transition-colors font-bold text-xs"
                  title="Diminuir 10"
                >
                  -10
                </button>
                <button type="button"
                  onClick={() => setAdjustModal(prev => prev ? { ...prev, newStock: Math.max(0, prev.newStock - 1) } : null)}
                  className="w-10 h-10 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center transition-colors"
                  title="Diminuir 1"
                >
                  <Minus size={18} />
                </button>
                <input
                  type="number"
                  value={adjustModal.newStock}
                  onChange={e => setAdjustModal(prev => prev ? { ...prev, newStock: parseInt(e.target.value) || 0 } : null)}
                  className="w-24 text-center text-2xl font-black text-white bg-slate-700 border border-slate-600 rounded-lg py-2 focus:outline-none focus:border-primary"
                  min="0"
                  title="Novo valor de stock"
                  placeholder="0"
                />
                <button type="button"
                  onClick={() => setAdjustModal(prev => prev ? { ...prev, newStock: prev.newStock + 1 } : null)}
                  className="w-10 h-10 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 flex items-center justify-center transition-colors"
                  title="Aumentar 1"
                >
                  <Plus size={18} />
                </button>
                <button type="button"
                  onClick={() => setAdjustModal(prev => prev ? { ...prev, newStock: prev.newStock + 10 } : null)}
                  className="w-10 h-10 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 flex items-center justify-center transition-colors font-bold text-xs"
                  title="Aumentar 10"
                >
                  +10
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button"
                onClick={() => setAdjustModal(null)}
                className="px-5 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button type="button"
                onClick={confirmManualAdjust}
                disabled={busyId === adjustModal.productId}
                className="px-5 py-2.5 bg-primary text-black rounded-lg hover:brightness-110 transition-all text-sm font-bold disabled:opacity-50"
              >
                {busyId === adjustModal.productId ? 'A gravar...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockManage;
