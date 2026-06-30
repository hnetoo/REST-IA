import { useMemo } from 'react';
import { useStockAdvanced } from '../../hooks/useStockAdvanced';
import { useStore } from '../../store/useStore';
import { supabase } from '../../supabase_standalone';
import ProgressBar from '../../components/ProgressBar';
import {
  AlertCircle, Box, CheckCircle, DollarSign, TrendingUp,
  Package, Clock, Zap, RefreshCw
} from 'lucide-react';

const formatKz = (val: number) => new Intl.NumberFormat('pt-AO', {
  style: 'currency', currency: 'AOA', maximumFractionDigits: 0
}).format(val);

const StockDashboard = () => {
  const { loading, productsWithStockInfo, alerts, stats, refresh } = useStockAdvanced();
  const { addNotification } = useStore();

  const topCritical = useMemo(() =>
    productsWithStockInfo
      .filter(p => p.status === 'OUT' || p.status === 'LOW')
      .sort((a, b) => {
        if (a.status === 'OUT' && b.status !== 'OUT') return -1;
        if (b.status === 'OUT' && a.status !== 'OUT') return 1;
        return (a.days_until_empty ?? 999) - (b.days_until_empty ?? 999);
      })
      .slice(0, 8),
    [productsWithStockInfo]
  );

  const topRotation = useMemo(() =>
    productsWithStockInfo
      .filter(p => p.avg_daily_consumption > 0)
      .sort((a, b) => b.avg_daily_consumption - a.avg_daily_consumption)
      .slice(0, 8),
    [productsWithStockInfo]
  );

  const abcData = useMemo(() => {
    const a = stats.classA.length;
    const b = stats.classB.length;
    const c = stats.classC.length;
    const total = a + b + c || 1;
    return { a, b, c, total, aPct: (a / total) * 100, bPct: (b / total) * 100, cPct: (c / total) * 100 };
  }, [stats]);

  const { currentUser } = useStore();

  const handleQuickAdjust = async (productId: string, delta: number, productName: string) => {
    try {
      // Ler stock actual directamente do Supabase (sem depender do menu/store)
      const { data: prod, error: fetchErr } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', productId)
        .single();
      if (fetchErr || !prod) { addNotification('error', 'Produto não encontrado'); return; }
      
      const currentStock = prod.stock_quantity || 0;
      const newStock = Math.max(0, currentStock + delta);
      
      const { error } = await supabase.from('products').update({ stock_quantity: newStock }).eq('id', productId);
      if (error) { addNotification('error', 'Erro ao actualizar stock'); return; }
      await supabase.from('stock_movements').insert({
        product_id: productId,
        movement_type: 'AJUSTE',
        quantity: delta,
        reference_type: 'ADJUSTMENT',
        previous_quantity: currentStock,
        new_quantity: newStock,
        user_id: currentUser?.name || 'SYSTEM',
        notes: `Ajuste rápido dashboard: ${productName}`,
      });
      // Actualizar store local
      useStore.setState({
        menu: useStore.getState().menu.map((p: any) =>
          p.id === productId ? { ...p, stock_quantity: newStock } : p
        )
      });
      addNotification('success', `Stock de ${productName}: ${currentStock} → ${newStock}`);
    } catch (e) { addNotification('error', 'Erro ao actualizar stock'); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel rounded-xl border border-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Package size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Total Produtos</p>
              <p className="text-2xl font-bold text-white">{stats.totalProducts}</p>
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
              <p className="text-2xl font-bold text-red-400">{stats.outOfStock}</p>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-xl border border-yellow-500/30 p-4 bg-yellow-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Box size={20} className="text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Stock Baixo</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.lowStock}</p>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-xl border border-green-500/30 p-4 bg-green-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle size={20} className="text-green-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Stock OK</p>
              <p className="text-2xl font-bold text-green-400">{stats.okStock}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Valor de Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-panel rounded-xl border border-primary/30 p-5 bg-primary/5">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign size={20} className="text-primary" />
            <p className="text-xs text-slate-400 uppercase tracking-wider">Valor Stock (Custo CMP)</p>
          </div>
          <p className="text-3xl font-bold text-white">{formatKz(stats.totalValueCost)}</p>
        </div>
        <div className="glass-panel rounded-xl border border-blue-500/30 p-5 bg-blue-500/5">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp size={20} className="text-blue-400" />
            <p className="text-xs text-slate-400 uppercase tracking-wider">Valor Stock (Venda)</p>
          </div>
          <p className="text-3xl font-bold text-white">{formatKz(stats.totalValueSale)}</p>
        </div>
        <div className="glass-panel rounded-xl border border-green-500/30 p-5 bg-green-500/5">
          <div className="flex items-center gap-3 mb-2">
            <Zap size={20} className="text-green-400" />
            <p className="text-xs text-slate-400 uppercase tracking-wider">Lucro Potencial</p>
          </div>
          <p className="text-3xl font-bold text-green-400">{formatKz(stats.potentialProfit)}</p>
        </div>
      </div>

      {/* Alertas + Curva ABC */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas */}
        <div className="glass-panel rounded-xl border border-white/5 p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <AlertCircle size={20} className="text-red-400" />
            Alertas de Stock ({alerts.length})
          </h3>
          {alerts.length === 0 ? (
            <p className="text-slate-500 text-sm py-8 text-center">Sem alertas. Tudo OK!</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-red-500">
              {alerts.slice(0, 12).map((alert, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${
                  alert.type === 'OUT_OF_STOCK' ? 'bg-red-500/10 border border-red-500/20' :
                  alert.type === 'LOW_STOCK' ? 'bg-yellow-500/10 border border-yellow-500/20' :
                  'bg-orange-500/10 border border-orange-500/20'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    alert.type === 'OUT_OF_STOCK' ? 'bg-red-500' :
                    alert.type === 'LOW_STOCK' ? 'bg-yellow-500' : 'bg-orange-500'
                  }`} />
                  <span className="text-sm text-slate-300">{alert.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Curva ABC */}
        <div className="glass-panel rounded-xl border border-white/5 p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Package size={20} className="text-primary" />
            Curva ABC (Classificação por Valor)
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-green-400 font-bold">Classe A (80% valor)</span>
                <span className="text-slate-400">{abcData.a} produtos ({abcData.aPct.toFixed(0)}%)</span>
              </div>
              <ProgressBar percentage={abcData.aPct} className="h-3 bg-slate-700" barClassName="bg-green-500" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-blue-400 font-bold">Classe B (15% valor)</span>
                <span className="text-slate-400">{abcData.b} produtos ({abcData.bPct.toFixed(0)}%)</span>
              </div>
              <ProgressBar percentage={abcData.bPct} className="h-3 bg-slate-700" barClassName="bg-blue-500" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-400 font-bold">Classe C (5% valor)</span>
                <span className="text-slate-400">{abcData.c} produtos ({abcData.cPct.toFixed(0)}%)</span>
              </div>
              <ProgressBar percentage={abcData.cPct} className="h-3 bg-slate-700" barClassName="bg-slate-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Produtos Críticos + Rotação */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Críticos */}
        <div className="glass-panel rounded-xl border border-white/5 p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <AlertCircle size={20} className="text-red-400" />
            Produtos Críticos
          </h3>
          {topCritical.length === 0 ? (
            <p className="text-slate-500 text-sm py-8 text-center">Sem produtos críticos!</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-red-500">
              {topCritical.map(p => (
                <div key={p.product_id} className={`flex items-center justify-between p-3 rounded-lg ${
                  p.status === 'OUT' ? 'bg-red-500/10 border border-red-500/20' : 'bg-yellow-500/10 border border-yellow-500/20'
                }`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{p.product_name}</p>
                    <p className="text-xs text-slate-400">
                      {p.stock_quantity} {p.unit} • mín: {p.min_stock}
                      {p.days_until_empty !== null && p.days_until_empty > 0 && ` • esgota em ${p.days_until_empty}d`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button type="button" onClick={() => handleQuickAdjust(p.product_id, 1, p.product_name)}
                      className="w-8 h-8 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 flex items-center justify-center transition-colors"
                      title="Adicionar 1">
                      +
                    </button>
                    <button type="button" onClick={() => handleQuickAdjust(p.product_id, -1, p.product_name)}
                      className="w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center transition-colors"
                      title="Remover 1">
                      −
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rotação */}
        <div className="glass-panel rounded-xl border border-white/5 p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-primary" />
            Top Rotação (Mais Vendidos / 30 dias)
          </h3>
          {topRotation.length === 0 ? (
            <p className="text-slate-500 text-sm py-8 text-center">Sem dados de vendas no período.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary">
              {topRotation.map((p, i) => (
                <div key={p.product_id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-xs font-black text-primary w-6">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{p.product_name}</p>
                    <p className="text-xs text-slate-400">
                      {p.avg_daily_consumption.toFixed(1)}/dia • {p.stock_quantity} {p.unit} em stock
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Sugestão</p>
                    <p className="text-sm font-bold text-primary">{p.suggested_reorder > 0 ? `+${p.suggested_reorder}` : '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Previsão de Esgotamento */}
      <div className="glass-panel rounded-xl border border-white/5 p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Clock size={20} className="text-primary" />
          Previsão de Esgotamento
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 text-xs uppercase tracking-wider border-b border-white/10">
                <th className="pb-2 pr-4">Produto</th>
                <th className="pb-2 pr-4 text-center">Stock</th>
                <th className="pb-2 pr-4 text-center">Consumo/Dia</th>
                <th className="pb-2 pr-4 text-center">Dias Restantes</th>
                <th className="pb-2 pr-4 text-center">Reposição Sugerida</th>
                <th className="pb-2 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {productsWithStockInfo
                .filter(p => p.avg_daily_consumption > 0)
                .sort((a, b) => (a.days_until_empty ?? 999) - (b.days_until_empty ?? 999))
                .slice(0, 15)
                .map(p => (
                  <tr key={p.product_id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2 pr-4 font-medium text-white">{p.product_name}</td>
                    <td className="py-2 pr-4 text-center text-slate-300">{p.stock_quantity} {p.unit}</td>
                    <td className="py-2 pr-4 text-center text-slate-300">{p.avg_daily_consumption.toFixed(1)}</td>
                    <td className="py-2 pr-4 text-center">
                      <span className={`font-bold ${
                        p.days_until_empty === null ? 'text-slate-500' :
                        p.days_until_empty <= 3 ? 'text-red-400' :
                        p.days_until_empty <= 7 ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {p.days_until_empty === null ? '∞' : `${p.days_until_empty}d`}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-center text-primary font-bold">
                      {p.suggested_reorder > 0 ? `+${p.suggested_reorder} ${p.unit}` : '—'}
                    </td>
                    <td className="py-2 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        p.status === 'OUT' ? 'bg-red-500/20 text-red-400' :
                        p.status === 'LOW' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {p.status === 'OUT' ? 'ESGOTADO' : p.status === 'LOW' ? 'BAIXO' : 'OK'}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={refresh} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-slate-300 transition-colors">
          <RefreshCw size={16} /> Actualizar Dados
        </button>
      </div>
    </div>
  );
};

export default StockDashboard;
