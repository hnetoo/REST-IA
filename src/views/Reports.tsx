import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Activity, Download, FileText, AlertCircle, ShoppingCart, Users, Filter, Calendar, BarChart3, Utensils, Beer, CreditCard, Wallet, Smartphone, Package, Clock, Target, AlertTriangle, TrendingDown, Receipt, UserCheck, PieChart, LineChart } from 'lucide-react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';

const Reports = () => {
  const { settings } = useStore();
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(false);

  // Estados para os 7 Cards
  const [vendasPorArtigo, setVendasPorArtigo] = useState({ data: [] as any[], loading: false });
  const [financasDetalhadas, setFinancasDetalhadas] = useState({ data: [] as any[], loading: false });
  const [rhEFaltas, setRhEFaltas] = useState({ data: [] as any[], loading: false });
  const [mapaDespesas, setMapaDespesas] = useState({ data: [] as any[], loading: false });
  const [topRentabilidade, setTopRentabilidade] = useState({ data: [] as any[], loading: false });
  const [fluxoPorTurno, setFluxoPorTurno] = useState({ data: [] as any[], loading: false });
  const [alertasStock, setAlertasStock] = useState({ data: [] as any[], loading: false });

  // Formatar moeda
  const formatKz = (value: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      maximumFractionDigits: 0
    }).format(value);
  };

  // CARD 1: VENDAS POR ARTIGO
  const fetchVendasPorArtigo = async () => {
    setVendasPorArtigo(prev => ({ ...prev, loading: true }));
    try {
      const { start, end } = dateRange;
      if (!start || !end) return;

      const { data: ordersData } = await supabase
        .from('orders')
        .select('items, created_at')
        .eq('status', 'FECHADO')
        .gte('created_at', new Date(start).toISOString())
        .lte('created_at', new Date(end).toISOString());

      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, category_id');

      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name');

      // Processar vendas por artigo
      const vendasMap = new Map();
      
      ordersData?.forEach(order => {
        const items = order.items || [];
        if (Array.isArray(items)) {
          items.forEach(item => {
            const key = item.name || 'Produto Sem Nome';
            const existing = vendasMap.get(key) || { 
              nome: key, 
              quantidade: 0, 
              categoria: 'Sem Categoria' 
            };
            existing.quantidade += item.quantity || 1;
            vendasMap.set(key, existing);
          });
        }
      });

      // Adicionar categorias
      const categoryMap = new Map(categoriesData?.map(c => [c.id, c.name]) || []);
      const result = Array.from(vendasMap.values()).map(item => {
        const product = productsData?.find(p => p.name === item.nome);
        const categoryId = product?.category_id;
        return {
          ...item,
          categoria: categoryId ? categoryMap.get(categoryId) || 'Sem Categoria' : 'Sem Categoria'
        };
      });

      setVendasPorArtigo({ data: result, loading: false });
    } catch (error) {
      console.error('Erro ao buscar vendas por artigo:', error);
      setVendasPorArtigo(prev => ({ ...prev, loading: false }));
    }
  };

  // CARD 2: FINANÇAS DETALHADAS
  const fetchFinancasDetalhadas = async () => {
    setFinancasDetalhadas(prev => ({ ...prev, loading: true }));
    try {
      const { start, end } = dateRange;
      if (!start || !end) return;

      // Buscar receitas (orders)
      const { data: ordersData } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .eq('status', 'FECHADO')
        .gte('created_at', new Date(start).toISOString())
        .lte('created_at', new Date(end).toISOString());

      // Buscar despesas (expenses)
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('amount_kz, category, created_at')
        .gte('created_at', new Date(start).toISOString())
        .lte('created_at', new Date(end).toISOString());

      const totalReceita = ordersData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      const totalDespesas = expensesData?.reduce((sum, expense) => sum + (expense.amount_kz || 0), 0) || 0;
      const lucroLiquido = totalReceita - totalDespesas;

      // Agrupar despesas por categoria
      const despesasPorCategoria = new Map();
      expensesData?.forEach(expense => {
        const categoria = expense.category || 'Sem Categoria';
        const existing = despesasPorCategoria.get(categoria) || { categoria, total: 0 };
        existing.total += expense.amount_kz || 0;
        despesasPorCategoria.set(categoria, existing);
      });

      const result = {
        totalReceita,
        totalDespesas,
        lucroLiquido,
        despesasPorCategoria: Array.from(despesasPorCategoria.values())
      };

      setFinancasDetalhadas({ data: [result], loading: false });
    } catch (error) {
      console.error('Erro ao buscar finanças detalhadas:', error);
      setFinancasDetalhadas(prev => ({ ...prev, loading: false }));
    }
  };

  // CARD 3: RH E FALTAS
  const fetchRhEFaltas = async () => {
    setRhEFaltas(prev => ({ ...prev, loading: true }));
    try {
      // Simulação - buscar dados reais de staff e faltas
      const staffData = [
        { nome: 'Funcionário 1', salarioBase: 150000, diasFalta: 2 },
        { nome: 'Funcionário 2', salarioBase: 120000, diasFalta: 0 },
        { nome: 'Funcionário 3', salarioBase: 180000, diasFalta: 1 }
      ];

      const result = staffData.map(staff => {
        const descontoDiario = staff.salarioBase / 30;
        const totalDesconto = descontoDiario * staff.diasFalta;
        const salarioLiquido = staff.salarioBase - totalDesconto;

        return {
          ...staff,
          descontoDiario,
          totalDesconto,
          salarioLiquido
        };
      });

      setRhEFaltas({ data: result, loading: false });
    } catch (error) {
      console.error('Erro ao buscar RH e faltas:', error);
      setRhEFaltas(prev => ({ ...prev, loading: false }));
    }
  };

  // CARD 4: MAPA DE DESPESAS
  const fetchMapaDespesas = async () => {
    setMapaDespesas(prev => ({ ...prev, loading: true }));
    try {
      const { start, end } = dateRange;
      if (!start || !end) return;

      const { data: expensesData } = await supabase
        .from('expenses')
        .select('amount_kz, category, description')
        .gte('created_at', new Date(start).toISOString())
        .lte('created_at', new Date(end).toISOString());

      // Agrupar por tipo de despesa
      const despesasMap = new Map();
      expensesData?.forEach(expense => {
        const tipo = expense.category || 'Outros';
        const existing = despesasMap.get(tipo) || { tipo, total: 0, itens: [] };
        existing.total += expense.amount_kz || 0;
        existing.itens.push({
          descricao: expense.description,
          valor: expense.amount_kz
        });
        despesasMap.set(tipo, existing);
      });

      const result = Array.from(despesasMap.values()).sort((a, b) => b.total - a.total);
      setMapaDespesas({ data: result, loading: false });
    } catch (error) {
      console.error('Erro ao buscar mapa de despesas:', error);
      setMapaDespesas(prev => ({ ...prev, loading: false }));
    }
  };

  // CARD 5: TOP RENTABILIDADE
  const fetchTopRentabilidade = async () => {
    setTopRentabilidade(prev => ({ ...prev, loading: true }));
    try {
      const { data: productsData } = await supabase
        .from('products')
        .select('name, price, cost_price, is_active')
        .eq('is_active', true);

      const result = productsData
        .map(product => ({
          nome: product.name,
          precoVenda: product.price || 0,
          precoCusto: product.cost_price || 0,
          margem: (product.price || 0) - (product.cost_price || 0),
          margemPercentual: product.price > 0 ? ((product.price - (product.cost_price || 0)) / product.price) * 100 : 0
        }))
        .filter(p => p.precoCusto > 0) // Apenas produtos com custo definido
        .sort((a, b) => b.margem - a.margem)
        .slice(0, 10);

      setTopRentabilidade({ data: result, loading: false });
    } catch (error) {
      console.error('Erro ao buscar top rentabilidade:', error);
      setTopRentabilidade(prev => ({ ...prev, loading: false }));
    }
  };

  // CARD 6: FLUXO POR TURNO
  const fetchFluxoPorTurno = async () => {
    setFluxoPorTurno(prev => ({ ...prev, loading: true }));
    try {
      const { start, end } = dateRange;
      if (!start || !end) return;

      const { data: ordersData } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .eq('status', 'FECHADO')
        .gte('created_at', new Date(start).toISOString())
        .lte('created_at', new Date(end).toISOString());

      // Agrupar por faixa horária
      const turnosMap = new Map();
      turnosMap.set('Manhã (6h-12h)', { turno: 'Manhã (6h-12h)', total: 0, pedidos: 0 });
      turnosMap.set('Almoço (12h-15h)', { turno: 'Almoço (12h-15h)', total: 0, pedidos: 0 });
      turnosMap.set('Tarde (15h-18h)', { turno: 'Tarde (15h-18h)', total: 0, pedidos: 0 });
      turnosMap.set('Jantar (18h-23h)', { turno: 'Jantar (18h-23h)', total: 0, pedidos: 0 });

      ordersData?.forEach(order => {
        const hour = new Date(order.created_at).getHours();
        let turnoKey = '';

        if (hour >= 6 && hour < 12) turnoKey = 'Manhã (6h-12h)';
        else if (hour >= 12 && hour < 15) turnoKey = 'Almoço (12h-15h)';
        else if (hour >= 15 && hour < 18) turnoKey = 'Tarde (15h-18h)';
        else if (hour >= 18 && hour < 23) turnoKey = 'Jantar (18h-23h)';

        if (turnoKey && turnosMap.has(turnoKey)) {
          const turno = turnosMap.get(turnoKey);
          turno.total += order.total_amount || 0;
          turno.pedidos += 1;
        }
      });

      const result = Array.from(turnosMap.values());
      setFluxoPorTurno({ data: result, loading: false });
    } catch (error) {
      console.error('Erro ao buscar fluxo por turno:', error);
      setFluxoPorTurno(prev => ({ ...prev, loading: false }));
    }
  };

  // CARD 7: ALERTAS DE STOCK
  const fetchAlertasStock = async () => {
    setAlertasStock(prev => ({ ...prev, loading: true }));
    try {
      const { data: productsData } = await supabase
        .from('products')
        .select('name, stock_quantity, cost_price, is_active')
        .eq('is_active', true);

      const alertas = [];
      
      productsData?.forEach(product => {
        const Alerts = [];
        
        // Alerta de quantidade crítica
        if (!product.stock_quantity || product.stock_quantity < 10) {
          Alerts.push('Quantidade crítica');
        }
        
        // Alerta de sem preço de custo
        if (!product.cost_price || product.cost_price <= 0) {
          Alerts.push('Sem preço de custo');
        }
        
        if (Alerts.length > 0) {
          alertas.push({
            nome: product.name,
            quantidade: product.stock_quantity || 0,
            precoCusto: product.cost_price || 0,
            alertas: Alerts
          });
        }
      });

      setAlertasStock({ data: alertas, loading: false });
    } catch (error) {
      console.error('Erro ao buscar alertas de stock:', error);
      setAlertasStock(prev => ({ ...prev, loading: false }));
    }
  };

  // Carregar todos os cards
  const loadAllCards = async () => {
    setLoading(true);
    await Promise.all([
      fetchVendasPorArtigo(),
      fetchFinancasDetalhadas(),
      fetchRhEFaltas(),
      fetchMapaDespesas(),
      fetchTopRentabilidade(),
      fetchFluxoPorTurno(),
      fetchAlertasStock()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      loadAllCards();
    }
  }, [dateRange]);

  // Componente Card
  const Card = ({ title, icon, description, data, loading, onGenerate, color }: any) => (
    <div className="glass-panel p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
      <div className="flex items-center gap-4 mb-4">
        <div className={`p-3 rounded-xl text-white`} style={{ backgroundColor: color }}>
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Renderizar dados específicos do card aqui */}
          <div className="text-sm text-slate-300">
            {Array.isArray(data) && data.length > 0 ? (
              <span>{data.length} registros encontrados</span>
            ) : (
              <span>Sem dados disponíveis</span>
            )}
          </div>
          
          <button
            onClick={onGenerate}
            className="w-full py-2 bg-white/10 border border-white/20 text-white rounded-xl text-sm font-black uppercase hover:bg-white/20 transition-all flex items-center justify-center gap-2"
          >
            <BarChart3 size={16} />
            Gerar Detalhes
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 h-full overflow-y-auto bg-background text-slate-200 no-scrollbar">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight italic uppercase">Hub de Relatórios</h2>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Análise Dinâmica</p>
        </div>
        
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm"
            placeholder="Data Início"
          />
          
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm"
            placeholder="Data Fim"
          />
          
          <button 
            onClick={loadAllCards}
            disabled={loading}
            className="px-4 py-2 bg-primary text-black rounded-xl text-sm font-black uppercase hover:brightness-110 transition-all flex items-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
            ) : (
              <BarChart3 size={16} />
            )}
            Atualizar
          </button>
        </div>
      </header>

      {/* Grid de 7 Cards Dinâmicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <Card
          title="Vendas por Artigo"
          icon={<Package size={20} />}
          description="Agrupar itens vendidos por nome e categoria"
          data={vendasPorArtigo.data}
          loading={vendasPorArtigo.loading}
          onGenerate={fetchVendasPorArtigo}
          color="#06b6d4"
        />
        
        <Card
          title="Finanças Detalhadas"
          icon={<DollarSign size={20} />}
          description="Cruzar orders (receita) com expenses (despesas)"
          data={financasDetalhadas.data}
          loading={financasDetalhadas.loading}
          onGenerate={fetchFinancasDetalhadas}
          color="#10b981"
        />
        
        <Card
          title="RH e Faltas"
          icon={<UserCheck size={20} />}
          description="Implementar lógica de descontos por dias de falta"
          data={rhEFaltas.data}
          loading={rhEFaltas.loading}
          onGenerate={fetchRhEFaltas}
          color="#f59e0b"
        />
        
        <Card
          title="Mapa de Despesas"
          icon={<Activity size={20} />}
          description="Agrupar gastos por tipo (Stock, Luz, Renda)"
          data={mapaDespesas.data}
          loading={mapaDespesas.loading}
          onGenerate={fetchMapaDespesas}
          color="#ef4444"
        />
        
        <Card
          title="Top Rentabilidade"
          icon={<Target size={20} />}
          description="Ranking dos 10 produtos com maior margem"
          data={topRentabilidade.data}
          loading={topRentabilidade.loading}
          onGenerate={fetchTopRentabilidade}
          color="#8b5cf6"
        />
        
        <Card
          title="Fluxo por Turno"
          icon={<Clock size={20} />}
          description="Total faturado por faixas horárias"
          data={fluxoPorTurno.data}
          loading={fluxoPorTurno.loading}
          onGenerate={fetchFluxoPorTurno}
          color="#ec4899"
        />
        
        <Card
          title="Alertas de Stock"
          icon={<AlertTriangle size={20} />}
          description="Produtos com quantidades críticas ou sem custo"
          data={alertasStock.data}
          loading={alertasStock.loading}
          onGenerate={fetchAlertasStock}
          color="#f97316"
        />
      </div>
    </div>
  );
};

export default Reports;
