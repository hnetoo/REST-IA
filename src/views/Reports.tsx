import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Activity, Download, FileText, AlertCircle, ShoppingCart, Users, Filter, Calendar, BarChart3, Utensils, Beer, CreditCard, Wallet, Smartphone } from 'lucide-react';
import { generateSalesReport, generatePurchaseReport } from '../services/pdfService';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const Reports = () => {
  const { settings } = useStore();
  const [dateRange, setDateRange] = useState('Hoje');
  const [selectedDate, setSelectedDate] = useState('');
  const [showDetailedReport, setShowDetailedReport] = useState(false);
  const [showPaymentReport, setShowPaymentReport] = useState(false);
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
      
      // Buscar pedidos fechados na data selecionada
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, created_at, total_amount, payment_method, status')
        .eq('status', 'closed')
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
        const amount = order.total_amount || 0;
        
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
      
      // Buscar pedidos fechados na data selecionada
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, created_at, total_amount, items, status')
        .eq('status', 'closed')
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

  // Gerar relatório detalhado
  const generateDetailedReport = () => {
    if (!selectedDate) {
      alert('Por favor, selecione uma data primeiro');
      return;
    }
    setShowDetailedReport(true);
    fetchDetailedReport(selectedDate);
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
      case 'Meios de Pagamento':
        generatePaymentReport();
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
        { name: 'Meios de Pagamento', description: 'Análise por método de pagamento (Fecho de Caixa)' }
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
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm"
            title="Selecionar data específica"
          />
          
          <button 
            onClick={generateDetailedReport}
            className="px-4 py-2 bg-primary text-black rounded-xl text-sm font-black uppercase hover:brightness-110 transition-all flex items-center gap-2"
            title="Gerar relatório detalhado"
          >
            <BarChart3 size={16} />
            Relatório Detalhado
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
