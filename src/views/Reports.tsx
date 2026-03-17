import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Activity, Download, FileText, AlertCircle, ShoppingCart, Users, Filter, Calendar, BarChart3, Utensils, Beer, CreditCard, Wallet, Smartphone } from 'lucide-react';
import { generateSalesReport, generatePurchaseReport } from '../services/pdfService';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid } from 'recharts';

const Reports = () => {
  const { settings } = useStore();
  const [dateRange, setDateRange] = useState('Hoje');
  const [selectedDate, setSelectedDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDetailedReport, setShowDetailedReport] = useState(false);
  const [showPaymentReport, setShowPaymentReport] = useState(false);
  const [showMenuAnalysis, setShowMenuAnalysis] = useState(false);
  const [showVendasPorArtigo, setShowVendasPorArtigo] = useState(false);
  const [detailedData, setDetailedData] = useState<{
    totalItems: number;
    bebidas: { name: string; quantity: number }[];
    pratos: { name: string; quantity: number }[];
    loading: boolean;
    error: string | null;
  }>({
    totalItems: 0,
    bebidas: [],
    pratos: [],
    loading: false,
    error: null
  });

  const [vendasPorArtigoData, setVendasPorArtigoData] = useState<{
    items: {
      product_id: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
    }[];
    loading: boolean;
    error: string | null;
    totalGeral: number;
  }>({
    items: [],
    loading: false,
    error: null,
    totalGeral: 0
  });

  const [paymentData, setPaymentData] = useState<{
    totalAmount: number;
    methods: { name: string; amount: number; percentage: number }[];
    loading: boolean;
    error: string | null;
  }>({
    totalAmount: 0,
    methods: [],
    loading: false,
    error: null
  });

  const [menuAnalysisData, setMenuAnalysisData] = useState<{
    products: {
      name: string;
      margin: number;
      volume: number;
      price: number;
      cost: number;
    }[];
    loading: boolean;
    error: string | null;
  }>({
    products: [],
    loading: false,
    error: null
  });

  // Função para obter ícone do método de pagamento
  const getPaymentIcon = (methodName: string) => {
    const normalized = methodName.toLowerCase();
    
    if (normalized.includes('multicaixa') || normalized.includes('tpa')) {
      return <CreditCard size={16} className="text-cyan-400" />;
    } else if (normalized.includes('dinheiro') || normalized.includes('cash')) {
      return <Wallet size={16} className="text-green-400" />;
    } else if (normalized.includes('transfer') || normalized.includes('aki') || normalized.includes('mcx')) {
      return <Smartphone size={16} className="text-purple-400" />;
    }
    
    return <CreditCard size={16} className="text-slate-400" />;
  };

  // Cores para o gráfico de pizza
  const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // Buscar dados de análise de menu (engenharia de menu)
  const fetchMenuAnalysis = async (date: string) => {
    if (!date) return;
    
    setMenuAnalysisData(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      console.log('[REPORTS] Buscando análise de menu para:', date);
      
      // Converter data para formato ISO
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Buscar produtos com preços e custos
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, price, cost_price, is_active')
        .eq('is_active', true);

      if (productsError) {
        console.error('[REPORTS] Erro ao buscar produtos:', productsError);
        setMenuAnalysisData(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Erro ao buscar dados dos produtos' 
        }));
        return;
      }

      if (!productsData || productsData.length === 0) {
        console.log('[REPORTS] Nenhum produto encontrado');
        setMenuAnalysisData(prev => ({ 
          ...prev, 
          loading: false, 
          products: []
        }));
        return;
      }

      // Buscar vendas no período usando created_at
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, created_at, items, status')
        .eq('status', 'FECHADO')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());

      if (ordersError) {
        console.error('[REPORTS] Erro ao buscar vendas:', ordersError);
        setMenuAnalysisData(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Erro ao buscar dados das vendas' 
        }));
        return;
      }

      // Calcular volume de vendas por produto
      const salesVolume = new Map<string, number>();
      
      ordersData?.forEach(order => {
        const itemsData = (order as any).items || (order as any).items_json;
        
        if (itemsData && Array.isArray(itemsData)) {
          itemsData.forEach((item: any) => {
            const productName = item.name || item.title || item.product_name || 'Produto Sem Nome';
            const quantity = item.quantity || item.qty || 1;
            
            if (!salesVolume.has(productName)) {
              salesVolume.set(productName, 0);
            }
            salesVolume.set(productName, salesVolume.get(productName)! + quantity);
          });
        }
      });

      // Combinar dados de produtos com volume de vendas
      const productsAnalysis = productsData.map(product => {
        const volume = salesVolume.get(product.name) || 0;
        const price = product.price || 0;
        const cost = product.cost_price || 0;
        const margin = price - cost;
        
        return {
          name: product.name,
          margin,
          volume,
          price,
          cost
        };
      }).filter(p => p.volume > 0) // Apenas produtos com vendas
        .sort((a, b) => b.margin * b.volume - a.margin * a.volume); // Ordenar por contribuição total

      console.log('[REPORTS] Análise de menu processada:', {
        totalProducts: productsAnalysis.length,
        topProduct: productsAnalysis[0],
        avgMargin: productsAnalysis.reduce((sum, p) => sum + p.margin, 0) / productsAnalysis.length
      });

      setMenuAnalysisData({
        products: productsAnalysis,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('[REPORTS] Erro ao processar análise de menu:', error);
      setMenuAnalysisData(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Erro ao processar análise de menu' 
      }));
    }
  };

  // Buscar dados de meios de pagamento
  const fetchPaymentReport = async (date: string) => {
    if (!date) return;
    
    setPaymentData(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      console.log('[REPORTS] Buscando dados de pagamento para:', date);
      
      // Converter data para formato ISO
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Buscar pedidos fechados na data selecionada usando created_at
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, created_at, total, payment_method, status')
        .eq('status', 'FECHADO')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('[REPORTS] Erro ao buscar pedidos:', ordersError);
        setPaymentData(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Erro ao buscar dados dos pagamentos' 
        }));
        return;
      }

      if (!ordersData || ordersData.length === 0) {
        console.log('[REPORTS] Nenhum pedido encontrado para a data:', date);
        setPaymentData(prev => ({ 
          ...prev, 
          loading: false, 
          totalAmount: 0,
          methods: []
        }));
        return;
      }

      // Agrupar por método de pagamento
      const paymentMethods = new Map<string, number>();
      let totalAmount = 0;

      ordersData.forEach(order => {
        const method = order.payment_method || 'Não Especificado';
        const amount = order.total || 0;
        
        totalAmount += amount;
        
        if (!paymentMethods.has(method)) {
          paymentMethods.set(method, 0);
        }
        paymentMethods.set(method, paymentMethods.get(method)! + amount);
      });

      // Converter para array e calcular percentagens
      const methods = Array.from(paymentMethods.entries())
        .map(([name, amount]) => ({
          name: getPaymentMethodLabel(name),
          amount,
          percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount);

      console.log('[REPORTS] Dados de pagamento processados:', {
        totalAmount,
        totalMethods: methods.length,
        methods: methods.slice(0, 3)
      });

      setPaymentData({
        totalAmount,
        methods,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('[REPORTS] Erro ao processar relatório de pagamentos:', error);
      setPaymentData(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Erro ao processar relatório de pagamentos' 
      }));
    }
  };

  // Função para normalizar labels de métodos de pagamento
  const getPaymentMethodLabel = (method: string): string => {
    const normalized = method.toLowerCase();
    
    if (normalized.includes('multicaixa') || normalized.includes('tpa')) {
      return 'Multicaixa (TPA)';
    } else if (normalized.includes('dinheiro') || normalized.includes('cash')) {
      return 'Dinheiro';
    } else if (normalized.includes('transfer') || normalized.includes('aki') || normalized.includes('mcx')) {
      return 'Transferência / AKI / MCX';
    } else if (normalized.includes('nao') || normalized.includes('não') || normalized.includes('undefined')) {
      return 'Não Especificado';
    }
    
    return method.charAt(0).toUpperCase() + method.slice(1);
  };

  // Buscar dados detalhados por data
  const fetchDetailedReport = async (date: string) => {
    if (!date) return;
    
    setDetailedData(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      console.log('[REPORTS] Buscando dados detalhados para:', date);
      
      // Converter data para formato ISO
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Buscar pedidos fechados na data selecionada usando created_at e total
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, created_at, total, items, status')
        .eq('status', 'FECHADO')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('[REPORTS] Erro ao buscar pedidos:', ordersError);
        setDetailedData(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Erro ao buscar dados dos pedidos' 
        }));
        return;
      }

      if (!ordersData || ordersData.length === 0) {
        console.log('[REPORTS] Nenhum pedido encontrado para a data:', date);
        setDetailedData(prev => ({ 
          ...prev, 
          loading: false, 
          totalItems: 0,
          bebidas: [],
          pratos: []
        }));
        return;
      }

      // Processar itens dos pedidos
      const bebidasMap = new Map<string, number>();
      const pratosMap = new Map<string, number>();
      let totalItems = 0;

      ordersData.forEach(order => {
        const itemsData = (order as any).items || (order as any).items_json;
        
        if (itemsData && Array.isArray(itemsData)) {
          itemsData.forEach((item: any) => {
            const productName = item.name || item.title || item.product_name || 'Produto Sem Nome';
            const quantity = item.quantity || item.qty || 1;
            const category = item.category || 'Sem Categoria';
            
            totalItems += quantity;
            
            // Classificar por categoria
            if (category.toLowerCase().includes('bebida') || 
                category.toLowerCase().includes('drink') ||
                productName.toLowerCase().includes('cuca') ||
                productName.toLowerCase().includes('cerveja') ||
                productName.toLowerCase().includes('vinho') ||
                productName.toLowerCase().includes('refrigerante')) {
              
              if (!bebidasMap.has(productName)) {
                bebidasMap.set(productName, 0);
              }
              bebidasMap.set(productName, bebidasMap.get(productName)! + quantity);
              
            } else {
              // Considerar como prato/comida
              if (!pratosMap.has(productName)) {
                pratosMap.set(productName, 0);
              }
              pratosMap.set(productName, pratosMap.get(productName)! + quantity);
            }
          });
        }
      });

      // Converter Maps para arrays e ordenar
      const bebidas = Array.from(bebidasMap.entries())
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10); // Top 10

      const pratos = Array.from(pratosMap.entries())
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10); // Top 10

      console.log('[REPORTS] Dados processados:', {
        totalItems,
        totalBebidas: bebidas.length,
        totalPratos: pratos.length,
        bebidas: bebidas.slice(0, 3),
        pratos: pratos.slice(0, 3)
      });

      setDetailedData({
        totalItems,
        bebidas,
        pratos,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('[REPORTS] Erro ao processar relatório:', error);
      setDetailedData(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Erro ao processar relatório detalhado' 
      }));
    }
  };

  // Buscar dados de vendas por artigo
  const fetchVendasPorArtigo = async () => {
    if (!startDate || !endDate) {
      alert('Por favor, selecione Data Início e Data Fim');
      return;
    }
    
    setShowVendasPorArtigo(true);
    setVendasPorArtigoData(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      console.log('[REPORTS] Buscando vendas por artigo:', { startDate, endDate });
      
      // Converter datas para formato ISO
      const startOfDay = new Date(startDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Buscar order_items com products para cruzar dados
      const { data: orderItemsData, error: orderItemsError } = await supabase
        .from('order_items')
        .select(`
          product_id,
          quantity,
          unit_price,
          created_at,
          orders!inner(
            created_at,
            status
          )
        `)
        .eq('orders.status', 'FECHADO')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());

      if (orderItemsError) {
        console.error('[REPORTS] Erro ao buscar order_items:', orderItemsError);
        setVendasPorArtigoData(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Erro ao buscar dados das vendas' 
        }));
        return;
      }

      if (!orderItemsData || orderItemsData.length === 0) {
        console.log('[REPORTS] Nenhuma venda encontrada no período');
        setVendasPorArtigoData(prev => ({ 
          ...prev, 
          loading: false, 
          items: [],
          totalGeral: 0
        }));
        return;
      }

      // Buscar produtos para obter nomes
      const productIds = [...new Set(orderItemsData.map(item => item.product_id))];
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, price')
        .in('id', productIds);

      if (productsError) {
        console.error('[REPORTS] Erro ao buscar produtos:', productsError);
        setVendasPorArtigoData(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Erro ao buscar dados dos produtos' 
        }));
        return;
      }

      // Agrupar vendas por product_id
      const vendasMap = new Map<string, {
        product_id: string;
        product_name: string;
        quantity: number;
        unit_price: number;
        subtotal: number;
      }>();

      orderItemsData.forEach(item => {
        const product = productsData?.find(p => p.id === item.product_id);
        const productName = product?.name || 'Produto Desconhecido';
        const unitPrice = item.unit_price || 0;
        const quantity = item.quantity || 0;
        const subtotal = unitPrice * quantity;

        if (!vendasMap.has(item.product_id)) {
          vendasMap.set(item.product_id, {
            product_id: item.product_id,
            product_name: productName,
            quantity: 0,
            unit_price: unitPrice,
            subtotal: 0
          });
        }

        const existing = vendasMap.get(item.product_id)!;
        existing.quantity += quantity;
        existing.subtotal += subtotal;
      });

      // Converter para array e calcular total geral
      const items = Array.from(vendasMap.values());
      const totalGeral = items.reduce((sum, item) => sum + item.subtotal, 0);

      console.log('[REPORTS] Vendas por artigo processadas:', {
        totalItems: items.length,
        totalGeral,
        items: items.slice(0, 3)
      });

      setVendasPorArtigoData({
        items,
        loading: false,
        error: null,
        totalGeral
      });

    } catch (error) {
      console.error('[REPORTS] Erro ao processar vendas por artigo:', error);
      setVendasPorArtigoData(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Erro ao processar vendas por artigo' 
      }));
    }
  };

  // Gerar relatório detalhado
  const generateDetailedReport = () => {
    if (!selectedDate) {
      alert('Por favor, selecione uma data primeiro');
      return;
    }
    setShowDetailedReport(true);
    fetchDetailedReport(selectedDate);
  };

  // Gerar relatório de análise de menu
  const generateMenuAnalysis = () => {
    if (!selectedDate) {
      alert('Por favor, selecione uma data primeiro');
      return;
    }
    setShowMenuAnalysis(true);
    fetchMenuAnalysis(selectedDate);
  };

  // Gerar relatório de pagamentos
  const generatePaymentReport = () => {
    if (!selectedDate) {
      alert('Por favor, selecione uma data primeiro');
      return;
    }
    setShowPaymentReport(true);
    fetchPaymentReport(selectedDate);
  };

  const generatePDF = (reportName: string) => {
    console.log('[REPORTS] Gerando PDF:', reportName);
    
    switch(reportName) {
      case 'Relatório de Vendas':
        generateSalesReport();
        break;
      case 'Relatório de Compras':
        generatePurchaseReport();
        break;
      case 'Relatório de Lucros':
        generateSalesReport(); // Por enquanto usa o mesmo de vendas
        break;
      case 'Análise de Performance de Menu':
        generateMenuAnalysis();
        break;
      case 'Inventário Atual':
        generatePurchaseReport(); // Por enquanto usa o mesmo de compras
        break;
      case 'Movimentação':
        generatePurchaseReport(); // Por enquanto usa o mesmo de compras
        break;
      case 'Produtos Mais Vendidos':
        generateSalesReport(); // Por enquanto usa o mesmo de vendas
        break;
      case 'Folha de Pagamento':
        generateSalesReport(); // Por enquanto usa o mesmo de vendas
        break;
      case 'Horas Trabalhadas':
        generateSalesReport(); // Por enquanto usa o mesmo de vendas
        break;
      case 'Desempenho':
        generateSalesReport(); // Por enquanto usa o mesmo de vendas
        break;
      default:
        console.log('[REPORTS] Relatório não implementado:', reportName);
    }
  };

  const reportCategories = [
    {
      name: 'Financeiro',
      icon: <DollarSign className="w-5 h-5" />,
      color: '#06b6d4',
      reports: [
        { name: 'Relatório de Vendas', description: 'Vendas diárias e totais do período' },
        { name: 'Relatório de Lucros', description: 'Análise de margens e rentabilidade' },
        { name: 'Fluxo de Caixa', description: 'Entradas e saídas detalhadas' },
        { name: 'Meios de Pagamento', description: 'Análise por método de pagamento (Fecho de Caixa)' },
        { name: 'Vendas por Artigo', description: 'Análise detalhada por produto' },
        { name: 'Análise de Performance de Menu', description: 'Engenharia de menu - margens vs volume' }
      ]
    },
    {
      name: 'Stock',
      icon: <ShoppingCart className="w-5 h-5" />,
      color: '#10b981',
      reports: [
        { name: 'Inventário Atual', description: 'Stock disponível por produto' },
        { name: 'Movimentação', description: 'Entradas e saídas de stock' },
        { name: 'Produtos Mais Vendidos', description: 'Ranking de vendas por período' }
      ]
    },
    {
      name: 'RH',
      icon: <Users className="w-5 h-5" />,
      color: '#f59e0b',
      reports: [
        { name: 'Folha de Pagamento', description: 'Salários e comissões' },
        { name: 'Horas Trabalhadas', description: 'Controlo de ponto e escalas' },
        { name: 'Desempenho', description: 'Métricas por funcionário' }
      ]
    }
  ];

  return (
    <div className="p-8 h-full overflow-y-auto bg-background text-slate-200 no-scrollbar">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight italic uppercase">Relatórios</h2>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Exportação e Análise</p>
        </div>
        
        <div className="flex items-center gap-4">
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm"
            title="Selecionar período"
          >
            <option>Hoje</option>
            <option>Últimos 7 dias</option>
            <option>Últimos 30 dias</option>
            <option>Mês Atual</option>
            <option>Personalizado</option>
          </select>
          
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm"
            title="Data Início"
            placeholder="Data Início"
          />
          
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm"
            title="Data Fim"
            placeholder="Data Fim"
          />
          
          <button 
            onClick={generateDetailedReport}
            className="px-4 py-2 bg-primary text-black rounded-xl text-sm font-black uppercase hover:brightness-110 transition-all flex items-center gap-2"
            title="Gerar relatório detalhado"
          >
            <BarChart3 size={16} />
            Relatório Detalhado
          </button>
          
          <button 
            onClick={fetchVendasPorArtigo}
            className="px-4 py-2 bg-[#10b981] text-white rounded-xl text-sm font-black uppercase hover:brightness-110 transition-all flex items-center gap-2"
            title="Gerar relatório de vendas por artigo"
          >
            <Download size={16} />
            Gerar Relatório
          </button>
          
          <button className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm" title="Filtros avançados">
            <Filter size={16} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {reportCategories.map((category, catIndex) => (
          <div key={catIndex} className="glass-panel p-8 rounded-2xl border border-white/5">
            <div className="flex items-center gap-4 mb-6">
              <div 
                className="p-3 rounded-xl text-white"
                style={{ backgroundColor: category.color }}
              >
                {category.icon}
              </div>
              <h3 className="text-xl font-bold text-white">{category.name}</h3>
            </div>
            
            <div className="space-y-4">
              {category.reports.map((report, reportIndex) => (
                <div key={reportIndex} className="p-4 bg-white/5 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-white font-bold mb-1">{report.name}</h4>
                      <p className="text-xs text-slate-500">{report.description}</p>
                    </div>
                  </div>
                   
                  <button
                    onClick={() => generatePDF(report.name)}
                    className="w-full mt-3 px-4 py-2 bg-[#06b6d4] text-black rounded-xl text-sm font-black uppercase hover:brightness-110 transition-all flex items-center justify-center gap-2"
                    title={`Gerar PDF de ${report.name}`}
                  >
                    <Download size={16} />
                    Gerar PDF
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Análise de Performance de Menu (Engenharia de Menu) */}
      {showMenuAnalysis && (
        <div className="mt-8 glass-panel p-8 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <BarChart3 size={20} className="text-primary" />
              Análise de Performance de Menu - {selectedDate || 'Data não selecionada'}
            </h3>
            <button
              onClick={() => setShowMenuAnalysis(false)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm"
              title="Fechar análise de menu"
            >
              Fechar
            </button>
          </div>

          {menuAnalysisData.loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-slate-400 mt-4">Analisando performance do menu...</p>
            </div>
          )}

          {menuAnalysisData.error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <AlertCircle size={20} className="text-red-500" />
                <p className="text-red-500">{menuAnalysisData.error}</p>
              </div>
            </div>
          )}

          {!menuAnalysisData.loading && !menuAnalysisData.error && (
            <div className="space-y-6">
              {/* Resumo de Análise */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-primary mb-2">Produtos Analisados</h4>
                  <p className="text-2xl font-black text-white">{menuAnalysisData.products.length}</p>
                </div>
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-green-400 mb-2">Margem Média</h4>
                  <p className="text-2xl font-black text-white">
                    {menuAnalysisData.products.length > 0 
                      ? new Intl.NumberFormat('pt-AO', { 
                          style: 'currency', 
                          currency: 'AOA', 
                          maximumFractionDigits: 0 
                        }).format(
                          menuAnalysisData.products.reduce((sum, p) => sum + p.margin, 0) / menuAnalysisData.products.length
                        )
                      : '0 Kz'
                    }
                  </p>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-orange-400 mb-2">Volume Total</h4>
                  <p className="text-2xl font-black text-white">
                    {menuAnalysisData.products.reduce((sum, p) => sum + p.volume, 0)} unidades
                  </p>
                </div>
              </div>

              {/* Gráfico de Dispersão */}
              {menuAnalysisData.products.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <h4 className="text-lg font-bold text-white mb-4">Margem vs Volume (Scatter Chart)</h4>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart
                        margin={{
                          top: 20,
                          right: 20,
                          bottom: 60,
                          left: 60,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="volume" 
                          type="number" 
                          name="Volume"
                          stroke="#9CA3AF"
                          label={{ value: 'Volume (Unidades Vendidas)', position: 'insideBottom', offset: -10, fill: '#9CA3AF' }}
                        />
                        <YAxis 
                          dataKey="margin" 
                          type="number" 
                          name="Margem"
                          stroke="#9CA3AF"
                          label={{ value: 'Margem Bruta (Kz)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
                        />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload as any;
                              return (
                                <div className="bg-slate-800 border border-slate-600 rounded-lg p-3">
                                  <p className="text-white font-medium">{data.name}</p>
                                  <p className="text-cyan-400 text-sm">
                                    Margem: {new Intl.NumberFormat('pt-AO', { 
                                      style: 'currency', 
                                      currency: 'AOA', 
                                      maximumFractionDigits: 0 
                                    }).format(data.margin)}
                                  </p>
                                  <p className="text-green-400 text-sm">
                                    Vendas: {data.volume} unidades
                                  </p>
                                  <p className="text-orange-400 text-sm">
                                    Preço: {new Intl.NumberFormat('pt-AO', { 
                                      style: 'currency', 
                                      currency: 'AOA', 
                                      maximumFractionDigits: 0 
                                    }).format(data.price)}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Scatter 
                          name="Produtos" 
                          data={menuAnalysisData.products} 
                          fill="#06b6d4"
                        >
                          {menuAnalysisData.products.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={
                                entry.margin > entry.price * 0.5 ? '#10b981' : // Alta margem (>50%)
                                entry.margin > entry.price * 0.3 ? '#f59e0b' : // Média margem (30-50%)
                                '#ef4444' // Baixa margem (<30%)
                              } 
                            />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Legenda de Cores */}
                  <div className="flex justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-slate-400 text-sm">Alta Performance (&gt;50% margem)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                      <span className="text-slate-400 text-sm">Performance Média (30-50% margem)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-slate-400 text-sm">Baixa Performance (&lt;30% margem)</span>
                    </div>
                  </div>
                </div>
              )}

              {menuAnalysisData.products.length === 0 && (
                <div className="text-center py-8">
                  <BarChart3 size={48} className="text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">Nenhum produto com vendas encontrado para esta data</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Relatório de Meios de Pagamento */}
      {showPaymentReport && (
        <div className="mt-8 glass-panel p-8 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <CreditCard size={20} className="text-primary" />
              Relatório de Meios de Pagamento - {selectedDate || 'Data não selecionada'}
            </h3>
            <button
              onClick={() => setShowPaymentReport(false)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm"
              title="Fechar relatório de pagamentos"
            >
              Fechar
            </button>
          </div>

          {paymentData.loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-slate-400 mt-4">Carregando dados de pagamento...</p>
            </div>
          )}

          {paymentData.error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <AlertCircle size={20} className="text-red-500" />
                <p className="text-red-500">{paymentData.error}</p>
              </div>
            </div>
          )}

          {!paymentData.loading && !paymentData.error && (
            <div className="space-y-6">
              {/* Resumo de Conciliação */}
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-primary mb-2">Total Bruto (Fecho de Caixa)</h4>
                    <p className="text-3xl font-black text-white">
                      {new Intl.NumberFormat('pt-AO', { 
                        style: 'currency', 
                        currency: 'AOA', 
                        maximumFractionDigits: 0 
                      }).format(paymentData.totalAmount)}
                    </p>
                  </div>
                  <Wallet size={32} className="text-primary" />
                </div>
              </div>

              {/* Lista de Métodos de Pagamento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentData.methods.map((method, index) => (
                  <div key={index} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getPaymentIcon(method.name)}
                        <span className="text-white font-medium">{method.name}</span>
                      </div>
                      <span className="text-primary font-bold">
                        {method.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-xl font-bold text-white">
                      {new Intl.NumberFormat('pt-AO', { 
                        style: 'currency', 
                        currency: 'AOA', 
                        maximumFractionDigits: 0 
                      }).format(method.amount)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Gráfico de Pizza */}
              {paymentData.methods.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <h4 className="text-lg font-bold text-white mb-4">Distribuição por Método de Pagamento</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentData.methods}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="amount"
                        >
                          {paymentData.methods.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [
                            new Intl.NumberFormat('pt-AO', { 
                              style: 'currency', 
                              currency: 'AOA', 
                              maximumFractionDigits: 0 
                            }).format(value),
                            'Valor'
                          ]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {paymentData.methods.length === 0 && (
                <div className="text-center py-8">
                  <CreditCard size={48} className="text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">Nenhum pagamento encontrado para esta data</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Relatório Detalhado por Data */}
      {showDetailedReport && (
        <div className="mt-8 glass-panel p-8 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <Calendar size={20} className="text-primary" />
              Relatório Detalhado - {selectedDate || 'Data não selecionada'}
            </h3>
            <button
              onClick={() => setShowDetailedReport(false)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm"
              title="Fechar relatório detalhado"
            >
              Fechar
            </button>
          </div>

          {detailedData.loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-slate-400 mt-4">Carregando dados detalhados...</p>
            </div>
          )}

          {detailedData.error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <AlertCircle size={20} className="text-red-500" />
                <p className="text-red-500">{detailedData.error}</p>
              </div>
            </div>
          )}

          {!detailedData.loading && !detailedData.error && (
            <div className="space-y-6">
              {/* Resumo Geral */}
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-primary mb-2">Total de Itens Vendidos</h4>
                    <p className="text-3xl font-black text-white">{detailedData.totalItems}</p>
                  </div>
                  <BarChart3 size={32} className="text-primary" />
                </div>
              </div>

              {/* Bebidas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-panel p-6 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3 mb-4">
                    <Beer size={20} className="text-blue-500" />
                    <h4 className="text-lg font-bold text-white">Top Bebidas</h4>
                  </div>
                  {detailedData.bebidas.length > 0 ? (
                    <div className="space-y-3">
                      {detailedData.bebidas.map((bebida, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                          <span className="text-white font-medium">{bebida.name}</span>
                          <span className="text-blue-500 font-bold">{bebida.quantity} unidades</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400">Nenhuma bebida encontrada</p>
                  )}
                </div>

                {/* Pratos */}
                <div className="glass-panel p-6 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3 mb-4">
                    <Utensils size={20} className="text-green-500" />
                    <h4 className="text-lg font-bold text-white">Top Pratos</h4>
                  </div>
                  {detailedData.pratos.length > 0 ? (
                    <div className="space-y-3">
                      {detailedData.pratos.map((prato, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                          <span className="text-white font-medium">{prato.name}</span>
                          <span className="text-green-500 font-bold">{prato.quantity} unidades</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400">Nenhum prato encontrado</p>
                  )}
                </div>
              </div>

              {detailedData.totalItems === 0 && (
                <div className="text-center py-8">
                  <AlertCircle size={48} className="text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">Sem registos para este dia</p>
                  <p className="text-slate-500 text-sm mt-2">Não foram encontradas vendas na data selecionada</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Relatório de Vendas por Artigo */}
      {showVendasPorArtigo && (
        <div className="mt-8 glass-panel p-8 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <BarChart3 size={20} className="text-primary" />
              Vendas por Artigo - {startDate || 'Início'} a {endDate || 'Fim'}
            </h3>
            <button
              onClick={() => setShowVendasPorArtigo(false)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm"
              title="Fechar relatório de vendas por artigo"
            >
              Fechar
            </button>
          </div>

          {vendasPorArtigoData.loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-slate-400 mt-4">Carregando dados de vendas por artigo...</p>
            </div>
          )}

          {vendasPorArtigoData.error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <AlertCircle size={20} className="text-red-500" />
                <p className="text-red-500">{vendasPorArtigoData.error}</p>
              </div>
            </div>
          )}

          {!vendasPorArtigoData.loading && !vendasPorArtigoData.error && (
            <div className="space-y-6">
              {/* Resumo Geral */}
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-primary mb-2">Valor Total Geral</h4>
                    <p className="text-3xl font-black text-white">
                      {new Intl.NumberFormat('pt-AO', { 
                        style: 'currency', 
                        currency: 'AOA', 
                        maximumFractionDigits: 0 
                      }).format(vendasPorArtigoData.totalGeral)}
                    </p>
                  </div>
                  <BarChart3 size={32} className="text-primary" />
                </div>
              </div>

              {/* Tabela de Vendas por Artigo */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h4 className="text-lg font-bold text-white mb-4">Detalhamento por Produto</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-white text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4">Nome do Produto</th>
                        <th className="text-right py-3 px-4">Quantidade</th>
                        <th className="text-right py-3 px-4">Valor Unitário (Kz)</th>
                        <th className="text-right py-3 px-4">Subtotal (Kz)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendasPorArtigoData.items.map((item, index) => (
                        <tr key={index} className="border-b border-white/5 hover:bg-white/10">
                          <td className="py-3 px-4 font-medium">{item.product_name}</td>
                          <td className="py-3 px-4 text-right">{item.quantity}</td>
                          <td className="py-3 px-4 text-right">
                            {new Intl.NumberFormat('pt-AO', { 
                              style: 'currency', 
                              currency: 'AOA', 
                              maximumFractionDigits: 0 
                            }).format(item.unit_price)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-primary">
                            {new Intl.NumberFormat('pt-AO', { 
                              style: 'currency', 
                              currency: 'AOA', 
                              maximumFractionDigits: 0 
                            }).format(item.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {vendasPorArtigoData.items.length === 0 && (
                <div className="text-center py-8">
                  <AlertCircle size={48} className="text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">Sem vendas encontradas</p>
                  <p className="text-slate-500 text-sm mt-2">Não foram encontradas vendas no período selecionado</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Relatórios Recentes */}
      <div className="mt-8 glass-panel p-8 rounded-2xl border border-white/5">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
          <FileText size={20} className="text-[#06b6d4]" />
          Relatórios Gerados Recentemente
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
            <div>
              <p className="text-white font-bold">Relatório de Vendas</p>
              <p className="text-xs text-slate-500">Dados reais do Supabase</p>
            </div>
            <button 
              onClick={generateSalesReport}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm hover:bg-white/20 transition-colors"
              title="Download Relatório de Vendas"
            >
              <Download size={16} />
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
            <div>
              <p className="text-white font-bold">Inventário Atual</p>
              <p className="text-xs text-slate-500">Dados reais do Supabase</p>
            </div>
            <button 
              onClick={generatePurchaseReport}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm hover:bg-white/20 transition-colors"
              title="Download Relatório de Compras"
            >
              <Download size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
