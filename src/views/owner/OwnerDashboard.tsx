import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Package, 
  Target, 
  AlertTriangle,
  RefreshCw,
  X,
  Calendar,
  Zap,
  Receipt,
  ArrowDown,
  ArrowUp,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
  ShoppingCart
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatKz } from '../../lib/dateUtils';
import { useNavigate } from 'react-router-dom';
import { useSyncCore } from '../../hooks/useSyncCore';
import { supabase } from '../../supabase_standalone';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { useAutoCashClose } from '../../hooks/useAutoCashClose';

const OwnerDashboard = () => {
  // 🎯 DECLARAÇÕES DE HOOKS - TOPO ABSOLUTO
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState<any>(null);

  // 📱 Tab ativa (mobile-first)
  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'purchases'>('overview');

  // 🤖 Fecho automático de caixa (partilhado com POS)
  useAutoCashClose();
  const [isLoading, setIsLoading] = useState(true);
  const { addNotification, settings, activeOrders } = useStore();
  const [taxRate, setTaxRate] = useState(settings?.taxRate || 7);
  
  // 🔄 Recarregar taxRate quando settings mudarem
  useEffect(() => {
    console.log('[OWNER DASHBOARD] Settings atualizadas, taxRate:', settings?.taxRate);
    setTaxRate(settings?.taxRate || 7);
  }, [settings?.taxRate]);
  
  // 🚀 INTEGRAR MOTOR SYNC CORE - USAR DIRETAMENTE OS VALORES
  const {
    totalRevenue,
    todayRevenue,
    totalExpenses,
    todayExpenses, // 🔥 ADICIONADO: Despesas de hoje
    externalHistory, // 🔥 ADICIONADO: Histórico externo
    staffCosts,
    recalculate // 🔥 ADICIONADO: Função para recalcular
  } = useSyncCore();
  
  // 🔥 ADICIONADO: Buscar todas as vendas sem filtro de data (MOVIDO PARA ANTES DOS USEMEMO)
  const [allSalesTotal, setAllSalesTotal] = useState(0);

  // 🔒 Vendas por operador (anti-roubo)
  const [operatorSales, setOperatorSales] = useState<{ name: string; count: number; total: number; avgTicket: number }[]>([]);
  // 🔒 Secção de vendas por operador dispensada pelo owner (persiste com assinatura dos dados)
  const [operatorSalesDismissedSig, setOperatorSalesDismissedSig] = useState<string>(() => {
    try { return localStorage.getItem('operatorSalesDismissedSig') || ''; } catch { return ''; }
  });
  // Assinatura actual dos dados: se mudar (novas vendas), a secção volta a aparecer
  const operatorSalesSig = useMemo(() => {
    return operatorSales.map(o => `${o.name}:${o.count}:${o.total}`).join('|');
  }, [operatorSales]);
  const operatorSalesVisible = operatorSales.length > 0 && operatorSalesSig !== operatorSalesDismissedSig;
  const dismissOperatorSales = useCallback(() => {
    setOperatorSalesDismissedSig(operatorSalesSig);
    localStorage.setItem('operatorSalesDismissedSig', operatorSalesSig);
  }, [operatorSalesSig]);

  // 🔒 Alertas de padrões anormais (anti-roubo)
  const [anomalyAlerts, setAnomalyAlerts] = useState<{ type: string; severity: 'high' | 'medium' | 'low'; message: string; operator?: string }[]>([]);
  // 🔒 Alertas ignorados/apagados pelo owner (persistem em localStorage)
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('dismissedAlerts') || '[]'); } catch { return []; }
  });

  const dismissAlert = useCallback((alertKey: string) => {
    setDismissedAlerts(prev => {
      const next = [...prev, alertKey];
      localStorage.setItem('dismissedAlerts', JSON.stringify(next));
      return next;
    });
  }, []);

  // Alertas visíveis = todos menos os apagados
  const visibleAlerts = useMemo(() => {
    return anomalyAlerts.filter(a => !dismissedAlerts.includes(`${a.type}:${a.operator || ''}:${a.message}`));
  }, [anomalyAlerts, dismissedAlerts]);

  const clearAllAlerts = useCallback(() => {
    const keys = visibleAlerts.map(a => `${a.type}:${a.operator || ''}:${a.message}`);
    setDismissedAlerts(prev => {
      const next = [...prev, ...keys];
      localStorage.setItem('dismissedAlerts', JSON.stringify(next));
      return next;
    });
  }, [visibleAlerts]);
  
  // 🔥 ADICIONADO: Faturação de ontem (total do dia operacional)
  const [yesterdayRevenue, setYesterdayRevenue] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    const cached = localStorage.getItem(`yesterdayRevenueV2_${today}`);
    return cached ? Number(cached) : 0;
  });
  
  // 🔥 NOVO: Valor do fecho de caixa (snapshot no momento do fecho)
  const [yesterdayClosing, setYesterdayClosing] = useState(0);
  const [hasClosing, setHasClosing] = useState(false);
  // 🔥 NOVO: Indica se o dia operacional de ontem já acabou (>= 05:00 Luanda)
  const [isYesterdayOfficial, setIsYesterdayOfficial] = useState(() => {
    const now = new Date();
    const UTC_OFFSET_LUANDA = 1 * 60 * 60 * 1000;
    const luandaTime = new Date(now.getTime() + UTC_OFFSET_LUANDA);
    return luandaTime.getHours() >= 5;
  });

  // 🔥 ADICIONADO: Orders do Supabase para o gráfico (igual ao DashboardV2)
  const [supabaseOrders, setSupabaseOrders] = useState<any[]>([]);
  
  // 🔥 RESERVA FISCAL (AGT) - Projeção Anual baseada nas vendas totais
  const reservaFiscal = useMemo(() => {
    const lucroTotal = (allSalesTotal || 0) - (totalExpenses || 0) - (staffCosts || 0);
    const faturacaoTotal = allSalesTotal || 0;
    const taxaRetencao = (settings?.taxRate || 7) / 100;
    
    // Cálculos diários baseados na média
    const diasOperacionais = 365; // Ano fiscal completo
    const faturacaoMediaDiaria = faturacaoTotal / diasOperacionais;
    const lucroMedioDiario = lucroTotal / diasOperacionais;
    
    // Impostos diários médios
    const impostoIndustrialDiario = lucroMedioDiario > 0 ? lucroMedioDiario * 0.25 : 0;
    const retencaoFonteDiaria = faturacaoMediaDiaria * taxaRetencao;
    const reservaDiaria = impostoIndustrialDiario + retencaoFonteDiaria;
    
    // Projeção anual (baseada nas vendas totais acumuladas)
    const impostoIndustrialAnual = lucroTotal > 0 ? lucroTotal * 0.25 : 0;
    const retencaoFonteAnual = faturacaoTotal * taxaRetencao;
    const reservaAnualProjetada = impostoIndustrialAnual + retencaoFonteAnual;
    
    // Dias restantes no ano
    const hoje = new Date();
    const fimAno = new Date(hoje.getFullYear(), 11, 31);
    const diasRestantes = Math.ceil((fimAno.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      diaria: {
        total: reservaDiaria,
        impostoIndustrial: impostoIndustrialDiario,
        retencaoFonte: retencaoFonteDiaria
      },
      anual: {
        total: reservaAnualProjetada,
        impostoIndustrial: impostoIndustrialAnual,
        retencaoFonte: retencaoFonteAnual,
        diasRestantes
      },
      percentual: faturacaoTotal > 0 ? ((reservaAnualProjetada / faturacaoTotal) * 100) : 0
    };
  }, [allSalesTotal, totalExpenses, staffCosts, settings?.taxRate]);
  
  // 🔥 ADICIONADO: useEffect para buscar todas as vendas
  const fetchAllSales = useCallback(async () => {
    try {
      console.log('[OWNER DASHBOARD] 📊 Buscando TODAS as vendas sem filtro de data (paginado)...');
      let total = 0;
      let count = 0;
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('orders')
          .select('total_amount, status')
          .order('created_at', { ascending: true })
          .range(offset, offset + pageSize - 1);

        if (error || !data || data.length === 0) {
          hasMore = false;
          break;
        }

        const validStatuses = ['closed', 'paid'];
        const filteredData = data.filter((o: any) => validStatuses.includes(o.status));
        total += filteredData.reduce((sum: number, order: any) => sum + Number(order.total_amount || 0), 0);
        count += filteredData.length;

        if (data.length < pageSize) {
          hasMore = false;
        } else {
          offset += pageSize;
        }
      }

      setAllSalesTotal(total);
      console.log('[OWNER DASHBOARD] ✅ Total de vendas sem filtro:', total, 'Count:', count);
    } catch (err) {
      console.error('[OWNER DASHBOARD] ❌ Erro crítico:', err);
    }
  }, []);
  
  useEffect(() => {
    fetchAllSales();
  }, [fetchAllSales]);

  // 🔒 Buscar vendas agrupadas por operador (anti-roubo) + detetar padrões anormais
  const fetchOperatorSales = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('closed_by, total_amount, created_at')
        .not('closed_by', 'is', null)
        .in('status', ['closed', 'paid', 'FECHADO']);

      if (error) {
        console.error('[OWNER DASHBOARD] Erro ao buscar vendas por operador:', error);
        return;
      }

      const agg: Record<string, { count: number; total: number }> = {};
      (data || []).forEach((o: any) => {
        const name = o.closed_by || 'Desconhecido';
        if (!agg[name]) agg[name] = { count: 0, total: 0 };
        agg[name].count++;
        agg[name].total += Number(o.total_amount) || 0;
      });

      const result = Object.entries(agg)
        .map(([name, d]) => ({ name, count: d.count, total: d.total, avgTicket: d.count > 0 ? d.total / d.count : 0 }))
        .sort((a, b) => b.total - a.total);

      setOperatorSales(result);

      // 🔒 P7: Detecção de padrões anormais
      const alerts: { type: string; severity: 'high' | 'medium' | 'low'; message: string; operator?: string }[] = [];

      // 1. Valores idênticos repetidos por operador (possível short-ringing)
      // 🔒 LÓGICA INTELIGENTE: Só alertar se o valor repetido representa >60% das vendas
      //    com volume mínimo de 15 vendas — vender 500 pães a 200 Kz é normal
      const operatorValues: Record<string, Record<number, number>> = {};
      const operatorTotalSales: Record<string, number> = {};
      (data || []).forEach((o: any) => {
        const name = o.closed_by || 'Desconhecido';
        const val = Math.round(Number(o.total_amount) || 0);
        if (val <= 0) return;
        if (!operatorValues[name]) operatorValues[name] = {};
        operatorValues[name][val] = (operatorValues[name][val] || 0) + 1;
        operatorTotalSales[name] = (operatorTotalSales[name] || 0) + 1;
      });

      Object.entries(operatorValues).forEach(([name, values]) => {
        const totalSales = operatorTotalSales[name] || 1;
        Object.entries(values).forEach(([val, count]) => {
          const pct = (count / totalSales) * 100;
          // Só alertar se: 15+ vendas do mesmo valor E representa >60% do total
          if (count >= 15 && pct > 60) {
            alerts.push({
              type: 'REPEATED_VALUE',
              severity: count >= 30 && pct > 80 ? 'high' : 'medium',
              message: `${name} tem ${count} vendas idênticas de ${Number(val).toLocaleString('pt-AO')} Kz (${pct.toFixed(0)}% das suas vendas) — possível manipulação de valores`,
              operator: name
            });
          }
        });
      });

      // 2. Ticket médio anormalmente baixo vs média geral
      // 🔒 Aumentar mínimo para 10 vendas e baixar threshold para 30% (mais restritivo)
      if (result.length > 1) {
        const avgAll = result.reduce((s, o) => s + o.avgTicket, 0) / result.length;
        result.forEach(op => {
          if (op.count >= 10 && op.avgTicket < avgAll * 0.3) {
            alerts.push({
              type: 'LOW_TICKET',
              severity: 'medium',
              message: `Ticket médio de ${op.name} (${formatKz(op.avgTicket)}) é muito abaixo da média (${formatKz(avgAll)}) — possível sub-relato de vendas`,
              operator: op.name
            });
          }
        });
      }

      // 3. Buscar logs de anulação/desconto do audit_logs
      try {
        const { data: auditData } = await supabase
          .from('audit_logs')
          .select('user_name, action')
          .in('action', ['VOID_SALE', 'DISCOUNT_APPLIED', 'SHIFT_DISCREPANCY']);

        if (auditData && auditData.length > 0) {
          const auditAgg: Record<string, { voids: number; discounts: number; discrepancies: number }> = {};
          auditData.forEach((a: any) => {
            const name = a.user_name || 'Desconhecido';
            if (!auditAgg[name]) auditAgg[name] = { voids: 0, discounts: 0, discrepancies: 0 };
            if (a.action === 'VOID_SALE') auditAgg[name].voids++;
            if (a.action === 'DISCOUNT_APPLIED') auditAgg[name].discounts++;
            if (a.action === 'SHIFT_DISCREPANCY') auditAgg[name].discrepancies++;
          });

          Object.entries(auditAgg).forEach(([name, counts]) => {
            if (counts.voids >= 3) {
              alerts.push({
                type: 'HIGH_VOIDS',
                severity: counts.voids >= 5 ? 'high' : 'medium',
                message: `${name} tem ${counts.voids} anulações de venda registadas`,
                operator: name
              });
            }
            if (counts.discounts >= 5) {
              alerts.push({
                type: 'HIGH_DISCOUNTS',
                severity: counts.discounts >= 10 ? 'high' : 'medium',
                message: `${name} aplicou ${counts.discounts} descontos`,
                operator: name
              });
            }
            if (counts.discrepancies >= 1) {
              alerts.push({
                type: 'SHIFT_DISCREPANCY',
                severity: 'high',
                message: `${name} tem ${counts.discrepancies} discrepância(s) de caixa registada(s)`,
                operator: name
              });
            }
          });
        }
      } catch (auditErr) {
        console.warn('[OWNER DASHBOARD] Tabela audit_logs pode não existir ainda:', auditErr);
      }

      // Ordenar por severidade (high > medium > low)
      const severityOrder = { high: 0, medium: 1, low: 2 };
      alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
      setAnomalyAlerts(alerts);
    } catch (err) {
      console.error('[OWNER DASHBOARD] Erro crítico ao buscar vendas por operador:', err);
    }
  }, []);

  useEffect(() => {
    fetchOperatorSales();
  }, [fetchOperatorSales]);
  
  // 🔥 NOVO: Função para buscar faturação de ontem (total do dia operacional)
  // Inclui TODAS as vendas do dia, mesmo após o fecho de caixa
  const fetchYesterdayRevenue = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      // 🔑 NOVO: Usar chave V2 para invalidar cache antigo do sistema anterior
      const cached = localStorage.getItem(`yesterdayRevenueV2_${today}`);
      const cachedOfficial = localStorage.getItem(`yesterdayRevenueOfficialV2_${today}`);
      // ✅ Só usar cache se for OFICIAL (após 05:00). Se for parcial, buscar novamente.
      if (cached && cachedOfficial === 'true') {
        setYesterdayRevenue(Number(cached));
        setIsYesterdayOfficial(true);
        return;
      }

      const UTC_OFFSET_LUANDA = 1 * 60 * 60 * 1000;
      const now = new Date();
      const luandaTime = new Date(now.getTime() + UTC_OFFSET_LUANDA);
      const yesterdayLuanda = new Date(luandaTime);
      yesterdayLuanda.setDate(yesterdayLuanda.getDate() - 1);
      const yesterdayStr = yesterdayLuanda.toISOString().split('T')[0];

      // 🔑 BUSCAR DE ORDERS (total completo do dia operacional)
      const { data, error } = await supabase
        .from('orders')
        .select('total_amount, status')
        .eq('data_contabil', yesterdayStr);

      if (!error && data) {
        const validStatuses = ['closed', 'paid'];
        const filteredData = data.filter((o: any) => validStatuses.includes(o.status));
        const total = filteredData.reduce((sum: number, order: any) => sum + Number(order.total_amount || 0), 0);
        setYesterdayRevenue(total);

        // 🔥 OFICIAL = dia operacional acabou (>= 05:00 Luanda)
        const isOfficial = luandaTime.getHours() >= 5;
        setIsYesterdayOfficial(isOfficial);

        localStorage.setItem(`yesterdayRevenueV2_${today}`, String(total));
        localStorage.setItem(`yesterdayRevenueOfficialV2_${today}`, String(isOfficial));
      } else {
        setYesterdayRevenue(0);
        setIsYesterdayOfficial(false);
        localStorage.setItem(`yesterdayRevenueV2_${today}`, '0');
        localStorage.setItem(`yesterdayRevenueOfficialV2_${today}`, 'false');
      }
    } catch (err) {
      setYesterdayRevenue(0);
      setIsYesterdayOfficial(false);
    }
  }, []);

  // 🔥 NOVO: Função para buscar o valor do fecho de caixa (snapshot)
  const fetchYesterdayClosing = useCallback(async () => {
    try {
      const UTC_OFFSET_LUANDA = 1 * 60 * 60 * 1000;
      const now = new Date();
      const luandaTime = new Date(now.getTime() + UTC_OFFSET_LUANDA);
      const yesterdayLuanda = new Date(luandaTime);
      yesterdayLuanda.setDate(yesterdayLuanda.getDate() - 1);
      const yesterdayStr = yesterdayLuanda.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('cash_flow')
        .select('amount')
        .eq('data_contabil', yesterdayStr)
        .eq('category', 'FECHO_CAIXA')
        .maybeSingle();

      if (!error && data) {
        setYesterdayClosing(Number(data.amount || 0));
        setHasClosing(true);
      } else {
        setYesterdayClosing(0);
        setHasClosing(false);
      }
    } catch (err) {
      setYesterdayClosing(0);
      setHasClosing(false);
    }
  }, []);

  // 🔥 CHAMAR ambas as funções
  useEffect(() => {
    fetchYesterdayRevenue();
    fetchYesterdayClosing();

    // 🤖 Fecho retroativo: se ontem não tem fecho e já passou das 05:00, criar agora
    const retroactiveClose = async () => {
      try {
        const UTC_OFFSET_LUANDA = 1 * 60 * 60 * 1000;
        const now = new Date();
        const luandaTime = new Date(now.getTime() + UTC_OFFSET_LUANDA);
        const currentHour = luandaTime.getHours();

        // Só executa depois das 05:00 (dia operacional já acabou)
        if (currentHour < 5) return;

        const yesterdayLuanda = new Date(luandaTime);
        yesterdayLuanda.setDate(yesterdayLuanda.getDate() - 1);
        const yesterdayStr = yesterdayLuanda.toISOString().split('T')[0];

        // Verificar se já existe fecho para ontem
        const { data: existing } = await supabase
          .from('cash_flow')
          .select('id')
          .eq('category', 'FECHO_CAIXA')
          .eq('data_contabil', yesterdayStr)
          .maybeSingle();

        if (existing) return; // Já tem fecho

        console.log('[FECHO RETROATIVO] 🤖 Criando fecho para', yesterdayStr);

        // Buscar vendas do dia
        const { data: orders } = await supabase
          .from('orders')
          .select('id, total_amount, status')
          .eq('data_contabil', yesterdayStr)
          .in('status', ['closed', 'paid']);

        const totalAmount = (orders || []).reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
        const ordersCount = orders?.length || 0;

        const { error: insertError } = await supabase
          .from('cash_flow')
          .insert({
            amount: totalAmount,
            category: 'FECHO_CAIXA',
            type: 'entrada',
            description: `Fecho Automático Retroativo - ${ordersCount} vendas`,
            data_contabil: yesterdayStr,
            closed_by: 'Sistema (Auto-Fecho)',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (!insertError) {
          console.log('[FECHO RETROATIVO] ✅ Fecho criado:', totalAmount, 'Kz');
          // Recarregar dados do fecho
          fetchYesterdayClosing();
        }
      } catch (err) {
        console.error('[FECHO RETROATIVO] Erro:', err);
      }
    };

    retroactiveClose();
  }, [fetchYesterdayRevenue, fetchYesterdayClosing]);
  
  // �🔄 Estado de loading para o botão
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // � ADICIONADO: Buscar orders do Supabase para o gráfico
  const fetchSupabaseOrders = useCallback(async () => {
    try {
      console.log('[OWNER DASHBOARD] 📊 Buscando orders do Supabase (paginado)...');
      let allData: any[] = [];
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .in('status', ['closed', 'paid'])
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (error || !data || data.length === 0) {
          hasMore = false;
          break;
        }

        allData.push(...data);

        if (data.length < pageSize) {
          hasMore = false;
        } else {
          offset += pageSize;
        }
      }

      setSupabaseOrders(allData);
      console.log('[OWNER DASHBOARD] ✅ Orders carregados (paginado):', allData.length);
    } catch (err) {
      console.error('[OWNER DASHBOARD] ❌ Erro fetchSupabaseOrders:', err);
    }
  }, []);
  
  useEffect(() => {
    fetchSupabaseOrders();
  }, [fetchSupabaseOrders]);
  
  // 📊 Dados do gráfico - usando mesma lógica UTC+1 Luanda dos cards
  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const chartData = useMemo(() => {
    // 🔥 CORRIGIDO: Usar UTC+1 Luanda igual aos cards (05:00-04:59)
    const now = new Date();
    const UTC_OFFSET_LUANDA = 1 * 60 * 60 * 1000; // +1 hora
    const luandaTime = new Date(now.getTime() + UTC_OFFSET_LUANDA);

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(luandaTime);
      date.setDate(luandaTime.getDate() - i);
      last7Days.push(date.toISOString().split('T')[0]);
    }

    console.log('[OWNER DASHBOARD] 📅 Gráfico - Últimos 7 dias (UTC+1 Luanda):', last7Days);

    const raw = last7Days.map((dateStr, index) => {
      const dayTotal = supabaseOrders
        .filter(o => {
          // 🔑 Usar data_contabil específica (igual ao Motor Sync Core)
          const orderDateStr = (o.data_contabil || o.created_at || '').split('T')[0];
          return orderDateStr === dateStr;
        })
        .reduce((acc, o) => acc + Number(o.total_amount || o.total || 0), 0);
      const dayName = daysOfWeek[new Date(dateStr).getDay()];

      // Log para debug dos valores do gráfico
      if (index === 6 || index === 0) { // Apenas logar ontem e hoje
        console.log(`[OWNER DASHBOARD] 📊 Gráfico ${dayName} (${dateStr}):`, dayTotal);
      }

      return { name: dayName, vendas: dayTotal, faturacao: dayTotal };
    });

    // Calcular média dos 7 dias para a linha de tendência
    const avg = raw.reduce((acc, d) => acc + d.vendas, 0) / (raw.length || 1);
    return raw.map(d => ({ ...d, media: Math.round(avg) }));
  }, [supabaseOrders]);

  // 🔥 NOVO: Faturação de ontem calculada a partir de supabaseOrders (mesma fonte que o gráfico)
  const yesterdayRevenueFromChart = useMemo(() => {
    const now = new Date();
    const UTC_OFFSET_LUANDA = 1 * 60 * 60 * 1000;
    const luandaTime = new Date(now.getTime() + UTC_OFFSET_LUANDA);
    const yesterday = new Date(luandaTime);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const total = supabaseOrders
      .filter(o => {
        const orderDateStr = (o.data_contabil || o.created_at || '').split('T')[0];
        return orderDateStr === yesterdayStr;
      })
      .reduce((acc, o) => acc + Number(o.total_amount || o.total || 0), 0);

    console.log('[OWNER DASHBOARD] 📊 Faturação Ontem (de supabaseOrders):', total);
    return total;
  }, [supabaseOrders]);

  // 🔐 VERIFICAR SESSÃO DO USUÁRIO
  useEffect(() => {
    const ownerSession = localStorage.getItem('owner_session');
    
    if (!ownerSession) {
      console.log('[OWNER DASHBOARD] 🚫 Sem sessão - Redirecionando para login');
      navigate('/owner/login');
      return;
    }
    
    setSession(JSON.parse(ownerSession));
    setIsLoading(false);
    console.log('[OWNER DASHBOARD] ✅ Sessão OK - Dashboard com motor sync');
  }, [navigate]);

  // 🔥 CORREÇÃO RETROATIVA: Preencher data_contabil nulo das vendas de hoje
  useEffect(() => {
    const fixMissingDataContabil = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        console.log('[OWNER DASHBOARD] 🔍 Verificando orders sem data_contabil de hoje:', today);

        const { data: brokenOrders, error } = await supabase
          .from('orders')
          .select('id, created_at')
          .is('data_contabil', null)
          .gte('created_at', `${today}T00:00:00Z`)
          .lt('created_at', `${today}T23:59:59Z`);

        if (error) {
          console.error('[OWNER DASHBOARD] ❌ Erro ao buscar orders sem data_contabil:', error);
          return;
        }

        if (!brokenOrders || brokenOrders.length === 0) {
          console.log('[OWNER DASHBOARD] ✅ Nenhuma order sem data_contabil encontrada');
          return;
        }

        console.log(`[OWNER DASHBOARD] 🚨 ${brokenOrders.length} orders sem data_contabil encontradas. Corrigindo...`);

        const { calculateDataContabil } = await import('../../lib/dateUtils');
        let fixed = 0;

        for (const order of brokenOrders) {
          const orderDate = new Date(order.created_at);
          const correctDataContabil = calculateDataContabil(orderDate);

          const { error: updateError } = await supabase
            .from('orders')
            .update({ data_contabil: correctDataContabil })
            .eq('id', order.id);

          if (!updateError) {
            fixed++;
            console.log(`[OWNER DASHBOARD] ✅ Order ${order.id} corrigida: data_contabil = ${correctDataContabil}`);
          } else {
            console.error(`[OWNER DASHBOARD] ❌ Erro ao corrigir order ${order.id}:`, updateError);
          }
        }

        console.log(`[OWNER DASHBOARD] 🎉 Correção concluída: ${fixed}/${brokenOrders.length} orders corrigidas`);

        // Recarregar dados após correção
        if (fixed > 0) {
          await fetchSupabaseOrders();
          await recalculate();
        }
      } catch (err) {
        console.error('[OWNER DASHBOARD] ❌ Erro na correção retroativa:', err);
      }
    };

    fixMissingDataContabil();
  }, []);




  // 🛒 PEDIDOS DE COMPRA PENDENTES
  const [pendingPurchases, setPendingPurchases] = useState<any[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [purchaseProcessing, setPurchaseProcessing] = useState<string | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null);

  // 🔍 Parse das notes: podem ser JSON com metadata ou texto simples
  const parsePurchaseNotes = (notes: any): { text: string; category?: string; quantity?: number; unit?: string; expected_date?: string } => {
    if (!notes) return { text: '' };
    if (typeof notes === 'string') {
      try {
        const parsed = JSON.parse(notes);
        return parsed;
      } catch {
        return { text: notes };
      }
    }
    if (typeof notes === 'object') return notes;
    return { text: String(notes) };
  };
  const [approvedPurchasesTotal, setApprovedPurchasesTotal] = useState(0);
  const [approvedPurchasesCount, setApprovedPurchasesCount] = useState(0);

  const fetchPendingPurchases = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('purchase_requests')
        .select('*')
        .in('status', ['pendente', 'parcial'])
        .order('created_at', { ascending: false });
      if (!error && data) {
        setPendingPurchases(data);
      }
      // Buscar histórico recente (últimos 5)
      const { data: histData, error: histError } = await supabase
        .from('purchase_requests')
        .select('*')
        .in('status', ['aprovado', 'rejeitado', 'pago'])
        .order('approved_at', { ascending: false })
        .limit(5);
      if (!histError && histData) {
        setPurchaseHistory(histData);
      }
      // Buscar total de compras aprovadas
      const { data: approvedData, error: approvedError } = await supabase
        .from('purchase_requests')
        .select('amount')
        .eq('status', 'aprovado');
      if (!approvedError && approvedData) {
        const total = approvedData.reduce((sum, p) => sum + Number(p.amount), 0);
        setApprovedPurchasesTotal(total);
        setApprovedPurchasesCount(approvedData.length);
      }
    } catch (err) {
      console.error('[OWNER DASHBOARD] Erro ao buscar compras:', err);
    }
  }, []);

  useEffect(() => {
    fetchPendingPurchases();
  }, [fetchPendingPurchases]);

  // Supabase Realtime para purchase_requests
  useEffect(() => {
    const channel = supabase
      .channel('purchase_requests_realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'purchase_requests' },
        () => {
          console.log('[OWNER DASHBOARD] 🔄 Mudança em purchase_requests (realtime), recarregando...');
          fetchPendingPurchases();
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        () => {
          console.log('[OWNER DASHBOARD] 🔄 Nova order (realtime), recarregando vendas...');
          fetchAllSales();
          fetchSupabaseOrders();
          recalculate();
        }
      )
      .subscribe((status: string) => {
        console.log('[OWNER DASHBOARD] Realtime status:', status);
        if (status !== 'SUBSCRIBED') {
          console.warn('[OWNER DASHBOARD] Realtime não conectou, usando polling fallback');
        }
      });
    
    // Polling fallback a cada 10 segundos (caso Realtime não funcione)
    const pollInterval = setInterval(() => {
      fetchPendingPurchases();
    }, 10000);

    // Refresh vendas totais a cada 10 segundos (mais responsivo)
    const salesInterval = setInterval(() => {
      fetchAllSales();
      fetchSupabaseOrders();
      recalculate();
    }, 10000);

    // Event listener for order-completed (same as DashboardV2)
    const handleOrderCompleted = () => {
      console.log('[OWNER DASHBOARD] 🔄 Evento order-completed recebido');
      fetchAllSales();
      fetchSupabaseOrders();
      recalculate();
    };
    window.addEventListener('order-completed', handleOrderCompleted);
    
    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
      clearInterval(salesInterval);
      window.removeEventListener('order-completed', handleOrderCompleted);
    };
  }, [fetchPendingPurchases, fetchAllSales, fetchSupabaseOrders, recalculate]);

  const handleApprovePurchase = async (purchaseId: string, amount: number) => {
    console.log('[OWNER DASHBOARD] 🛒 handleApprovePurchase chamado:', purchaseId, amount);
    try {
      setPurchaseProcessing(purchaseId);
      const rulesStr = localStorage.getItem('purchaseApprovalRules');
      const rules = rulesStr ? JSON.parse(rulesStr) : { autoApproveLimit: 0, singleApproveLimit: 50000 };
      const required = amount <= rules.autoApproveLimit && rules.autoApproveLimit > 0 ? 0 : (amount <= rules.singleApproveLimit ? 1 : 2);

      const purchase = pendingPurchases.find(p => p.id === purchaseId);
      const currentCount = purchase?.approval_count || 0;
      const newCount = currentCount + 1;
      const agora = new Date();
      const luandaOffset = 1 * 60 * 60 * 1000;
      const dataLuanda = new Date(agora.getTime() + luandaOffset).toISOString();
      const ownerSession = localStorage.getItem('owner_session');
      const ownerName = ownerSession ? (JSON.parse(ownerSession).name || 'Owner') : 'Owner';
      const ownerId = (ownerSession && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(JSON.parse(ownerSession).id || '')) ? JSON.parse(ownerSession).id : null;

      console.log('[OWNER DASHBOARD] Regras:', { required, currentCount, newCount, ownerName, ownerId });

      if (required <= 1 || newCount >= required) {
        // Aprovação completa
        const updateData = {
          status: 'aprovado',
          approved_at: dataLuanda,
          approved_by: ownerId,
          approval_count: newCount
        };
        console.log('[OWNER DASHBOARD] Update data:', updateData);
        const { error } = await supabase
          .from('purchase_requests')
          .update(updateData)
          .eq('id', purchaseId);
        if (error) {
          console.error('[OWNER DASHBOARD] Erro Supabase (aprovar):', error);
          throw error;
        }
        console.log('[OWNER DASHBOARD] ✅ Status atualizado para aprovado');

        // Criar despesas
        const { error: expError } = await supabase.from('expenses').insert({
          description: `Compra Aprovada: ${purchase?.description || ''} - ${purchase?.provider || ''}`,
          amount_kz: amount,
          category: 'COMPRAS',
          status: 'PENDING',
          created_at: dataLuanda
        });
        if (expError) console.error('[OWNER DASHBOARD] Erro expenses:', expError);

        const { error: cfError } = await supabase.from('cash_flow').insert({
          amount: amount,
          type: 'saida',
          category: 'Compras',
          description: `Compra Aprovada: ${purchase?.description || ''} - ${purchase?.provider || ''}`
        });
        if (cfError) console.error('[OWNER DASHBOARD] Erro cash_flow:', cfError);

        if (addNotification) addNotification('success', 'Compra aprovada com sucesso!');
      } else {
        // Aprovação parcial
        const { error } = await supabase
          .from('purchase_requests')
          .update({
            status: 'parcial',
            approval_count: newCount,
            approved_by: ownerId
          })
          .eq('id', purchaseId);
        if (error) {
          console.error('[OWNER DASHBOARD] Erro Supabase (parcial):', error);
          throw error;
        }
        console.log('[OWNER DASHBOARD] ✅ Status atualizado para parcial');

        if (addNotification) addNotification('success', 'Aprovação parcial (1 de 2). Aguardando 2º owner.');
      }

      fetchPendingPurchases();
      recalculate();
    } catch (err) {
      console.error('[OWNER DASHBOARD] Erro ao aprovar compra:', err);
      if (addNotification) addNotification('error', 'Erro ao aprovar compra');
    } finally {
      setPurchaseProcessing(null);
    }
  };

  const handleRejectPurchase = async (purchaseId: string) => {
    console.log('[OWNER DASHBOARD] 🛒 handleRejectPurchase chamado:', purchaseId);
    try {
      setPurchaseProcessing(purchaseId);
      const agora = new Date();
      const luandaOffset = 1 * 60 * 60 * 1000;
      const dataLuanda = new Date(agora.getTime() + luandaOffset).toISOString();
      const ownerSession = localStorage.getItem('owner_session');
      const ownerName = ownerSession ? (JSON.parse(ownerSession).name || 'Owner') : 'Owner';
      const ownerId = (ownerSession && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(JSON.parse(ownerSession).id || '')) ? JSON.parse(ownerSession).id : null;

      const { error } = await supabase
        .from('purchase_requests')
        .update({
          status: 'rejeitado',
          approved_at: dataLuanda,
          approved_by: ownerId
        })
        .eq('id', purchaseId);
      if (error) {
        console.error('[OWNER DASHBOARD] Erro Supabase (rejeitar):', error);
        throw error;
      }
      console.log('[OWNER DASHBOARD] ✅ Status atualizado para rejeitado');

      if (addNotification) addNotification('success', 'Compra rejeitada.');
      fetchPendingPurchases();
    } catch (err) {
      console.error('[OWNER DASHBOARD] Erro ao rejeitar compra:', err);
      if (addNotification) addNotification('error', 'Erro ao rejeitar compra');
    } finally {
      setPurchaseProcessing(null);
    }
  };

  const getRequiredApprovals = (amount: number): number => {
    const rulesStr = localStorage.getItem('purchaseApprovalRules');
    const rules = rulesStr ? JSON.parse(rulesStr) : { autoApproveLimit: 0, singleApproveLimit: 50000 };
    if (amount <= rules.autoApproveLimit && rules.autoApproveLimit > 0) return 0;
    if (amount <= rules.singleApproveLimit) return 1;
    return 2;
  };

  // 🔄 PRIORIDADE AO BOTÃO MANUAL COM FEEDBACK VISUAL
  const handleManualRefresh = async () => {
    console.log('[OWNER DASHBOARD] 🔄 Refresh manual solicitado...');
    
    // 🔄 Ativar loading visual
    setIsRefreshing(true);
    
    try {
      // � Recarregar dados do motor sync
      await Promise.all([
        recalculate(),
        fetchAllSales(),
        fetchSupabaseOrders(),
        fetchOperatorSales(),
        fetchPendingPurchases(),
      ]);
      
      // � Obter timestamp de Luanda
      const luandaTime = new Date();
      const luandaOffset = 1; // WAT is UTC+1
      const luandaTimestamp = new Date(luandaTime.getTime() + (luandaOffset * 60 * 60 * 1000));
      const timeString = luandaTimestamp.toLocaleString('pt-AO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Africa/Luanda'
      });
      
      // 📢 FEEDBACK DE SUCESSO
      setLastSyncTime(timeString);
      console.log('[OWNER DASHBOARD] ✅ Dados sincronizados via motor sync:', timeString);
      
      // 🎉 Notificação visual de sucesso
      if (addNotification) {
        addNotification('success', `Dados Sincronizados: Atualizado às ${timeString} (WAT)`);
      }
      
    } catch (error) {
      console.error('[OWNER DASHBOARD] ❌ Erro no refresh manual:', error);
      
      if (addNotification) {
        addNotification('error', 'Erro na Sincronização: Tente novamente em alguns segundos');
      }
    } finally {
      // 🔄 Desativar loading
      setIsRefreshing(false);
    }
  };

  // 📱 PULL TO REFRESH - Hook para mobile
  const { isPulling, pullDistance, isRefreshing: isPullRefreshing } = usePullToRefresh(
    containerRef as React.RefObject<HTMLElement>,
    {
      onRefresh: handleManualRefresh,
      threshold: 80,
      maxPullDistance: 120
    }
  );

  const handleLogout = () => {
    navigate('/owner/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
          <h2 className="text-2xl font-bold text-white text-center">Carregando Dashboard...</h2>
          <p className="text-white/80 text-center mt-2">Buscando dados consolidados</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-3 sm:p-6 overflow-y-auto pb-24 relative"
    >
      {/* INDICADOR DE PULL TO REFRESH - Mobile */}
      <div 
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center transition-all duration-200 md:hidden pointer-events-none ${
          isPulling || isPullRefreshing ? 'opacity-100' : 'opacity-0'
        }`}
        ref={(el) => { if (el) el.style.transform = `translateY(${Math.min(pullDistance, 120)}px)`; }}
      >
        <div className="bg-white/90 backdrop-blur-lg rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
          <ArrowDown 
            className={`h-5 w-5 text-blue-600 transition-transform duration-300 ${
              isPullRefreshing ? 'animate-spin' : pullDistance >= 80 ? 'rotate-180' : ''
            }`}
          />
          <span className="text-sm font-medium text-blue-900">
            {isPullRefreshing ? 'Atualizando...' : pullDistance >= 80 ? 'Solte para atualizar' : 'Puxe para atualizar'}
          </span>
        </div>
      </div>

      {/* Header com logo + nome do restaurante */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
            {settings?.appLogoUrl ? (
              <img src={settings.appLogoUrl} alt="logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm sm:text-base font-black text-primary">
                {(settings?.restaurantName || 'R').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent leading-tight">
              {settings?.restaurantName || 'Owner Dashboard'}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1 text-[10px] text-green-400 font-bold">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                ONLINE
              </span>
              <span className="text-white/40 text-[10px]">
                {new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })} · {new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-600/80 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all text-xs font-bold active:scale-95 shrink-0"
        >
          <X size={16} />
          Sair
        </button>
      </div>

      {/* 📱 Tab Navigation — Mobile First com indicador deslizante */}
      <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-lg border-b border-white/10 -mx-3 sm:-mx-6 px-3 sm:px-4 py-2.5 mb-6">
        <div className="relative flex gap-1">
          {/* Indicador deslizante */}
          <div
            className={`absolute top-0 bottom-0 w-1/3 rounded-lg transition-all duration-300 ease-out ${
              activeTab === 'overview' ? 'left-0 bg-primary/20 border border-primary/40' :
              activeTab === 'security' ? 'left-1/3 bg-red-500/20 border border-red-500/40' :
              'left-2/3 bg-orange-500/20 border border-orange-500/40'
            }`}
          />
          <button
            onClick={() => setActiveTab('overview')}
            className={`relative flex-1 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
              activeTab === 'overview'
                ? 'text-primary'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <TrendingUp size={14} />
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`relative flex-1 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
              activeTab === 'security'
                ? 'text-red-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <AlertTriangle size={14} />
            Segurança
            {visibleAlerts.length > 0 && (
              <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                activeTab === 'security' ? 'bg-red-500/30 text-red-300' : 'bg-red-500/20 text-red-400'
              }`}>
                {visibleAlerts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`relative flex-1 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
              activeTab === 'purchases'
                ? 'text-orange-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <ShoppingCart size={14} />
            Compras
            {pendingPurchases.length > 0 && (
              <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                activeTab === 'purchases' ? 'bg-orange-500/30 text-orange-300' : 'bg-orange-500/20 text-orange-400'
              }`}>
                {pendingPurchases.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 📱 TAB: VISÃO GERAL */}
      <div className={activeTab !== 'overview' ? 'hidden' : ''}>

      {/* 🔥 BARRA DE SUMÁRIO RÁPIDO — Hoje vs Ontem */}
      <div className="glass-panel rounded-xl p-3 sm:p-4 mb-4 border border-white/10">
        <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3 sm:gap-3 text-center">
          {/* Faturação */}
          <div className="flex flex-row sm:flex-col items-center sm:items-center justify-between sm:justify-center min-w-0 gap-2">
            <span className="text-[9px] sm:text-[10px] text-white/50 uppercase tracking-wider mb-0 sm:mb-1 shrink-0">Faturação</span>
            <span className="text-base sm:text-2xl font-black text-cyan-400">{formatKz(todayRevenue)}</span>
            {yesterdayRevenue > 0 && todayRevenue > 0 && (
              <span className={`text-[9px] sm:text-[10px] font-bold flex items-center gap-0.5 mt-1 ${
                todayRevenue > yesterdayRevenue ? 'text-green-400' : todayRevenue < yesterdayRevenue ? 'text-red-400' : 'text-slate-400'
              }`}>
                {todayRevenue > yesterdayRevenue ? <ArrowUp size={10} /> : todayRevenue < yesterdayRevenue ? <ArrowDown size={10} /> : <ArrowRight size={10} />}
                {Math.abs(Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100))}% vs ontem
              </span>
            )}
          </div>
          {/* Lucro */}
          <div className="flex flex-row sm:flex-col items-center sm:items-center justify-between sm:justify-center min-w-0 gap-2 border-t sm:border-t-0 sm:border-x border-white/10 pt-3 sm:pt-0">
            <span className="text-[9px] sm:text-[10px] text-white/50 uppercase tracking-wider mb-0 sm:mb-1 shrink-0">Lucro Hoje</span>
            <span className="text-base sm:text-2xl font-black text-pink-400">{formatKz(todayRevenue - (staffCosts + totalExpenses))}</span>
            <span className="text-[9px] sm:text-[10px] text-white/40 mt-0 sm:mt-1 hidden sm:block">Rendimento - Custos</span>
          </div>
          {/* Despesas */}
          <div className="flex flex-row sm:flex-col items-center sm:items-center justify-between sm:justify-center min-w-0 gap-2 border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0">
            <span className="text-[9px] sm:text-[10px] text-white/50 uppercase tracking-wider mb-0 sm:mb-1 shrink-0">Despesas</span>
            <span className="text-base sm:text-2xl font-black text-amber-400">{formatKz(todayExpenses || 0)}</span>
            <span className="text-[9px] sm:text-[10px] text-white/40 mt-0 sm:mt-1 hidden sm:block">Registadas hoje</span>
          </div>
        </div>
      </div>

      {/* Cards Principais - Os 5 Pilares (estilo DashboardV2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4">
        {/* Lucro Real */}
        <div className="glass-panel p-3 sm:p-4 rounded-xl relative overflow-hidden group border-l-4 border-l-emerald-500 transition-all duration-200 active:scale-[0.98]">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-1">Lucro Real</p>
              <p className="text-lg sm:text-xl font-mono font-bold text-white">{formatKz(totalRevenue - (staffCosts + totalExpenses))}</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                {yesterdayRevenue > 0 && todayRevenue > 0 ? (
                  <span className={`text-[9px] font-bold flex items-center gap-0.5 ${
                    todayRevenue > yesterdayRevenue ? 'text-emerald-400' : todayRevenue < yesterdayRevenue ? 'text-red-400' : 'text-slate-400'
                  }`}>
                    {todayRevenue > yesterdayRevenue ? <ArrowUp size={10} /> : todayRevenue < yesterdayRevenue ? <ArrowDown size={10} /> : <ArrowRight size={10} />}
                    {Math.abs(Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100))}% vs ontem
                  </span>
                ) : (
                  <span className="text-[9px] text-emerald-400/60 font-bold">Rendimento - Custos</span>
                )}
              </div>
              <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ '--bar-w': `${totalRevenue > 0 ? Math.min(((totalRevenue - (staffCosts + totalExpenses)) / totalRevenue) * 100, 100) : 0}%`, width: 'var(--bar-w)' } as React.CSSProperties} />
              </div>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center mt-2 sm:mt-0 sm:ml-3 shrink-0 self-end sm:self-start">
              <TrendingUp size={18} className="text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Rendimento Global */}
        <div className="glass-panel p-3 sm:p-4 rounded-xl relative overflow-hidden group border-l-4 border-l-violet-500">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-400 mb-1">Rendimento Global</p>
              <p className="text-lg sm:text-xl font-mono font-bold text-white">{formatKz(totalRevenue)}</p>
              <div className="mt-1.5">
                <span className="text-[9px] text-violet-400/80 font-bold">Histórico + Vendas</span>
              </div>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-violet-500/15 flex items-center justify-center mt-2 sm:mt-0 sm:ml-3 shrink-0 self-end sm:self-start">
              <Package size={18} className="text-violet-400" />
            </div>
          </div>
        </div>

        {/* Impostos */}
        <div className="glass-panel p-3 sm:p-4 rounded-xl relative overflow-hidden group border-l-4 border-l-yellow-500">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-400 mb-1">Impostos ({taxRate}%)</p>
              <p className="text-lg sm:text-xl font-mono font-bold text-white">{formatKz(todayRevenue * (taxRate / 100))}</p>
              <div className="mt-1.5">
                <span className="text-[9px] text-yellow-400/80 font-bold">{taxRate}% sobre Faturação Hoje</span>
              </div>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-yellow-500/15 flex items-center justify-center mt-2 sm:mt-0 sm:ml-3 shrink-0 self-end sm:self-start">
              <DollarSign size={18} className="text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Custos Totais */}
        <div className="glass-panel p-3 sm:p-4 rounded-xl relative overflow-hidden group border-l-4 border-l-amber-500">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400 mb-1">Custos Totais</p>
              <p className="text-lg sm:text-xl font-mono font-bold text-white">{formatKz(staffCosts + totalExpenses)}</p>
              <div className="mt-1.5">
                <span className="text-[9px] text-amber-400/80 font-bold">Staff + Despesas</span>
              </div>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-500/15 flex items-center justify-center mt-2 sm:mt-0 sm:ml-3 shrink-0 self-end sm:self-start">
              <Target size={18} className="text-amber-400" />
            </div>
          </div>
        </div>

        {/* Despesas Hoje */}
        <div className="glass-panel p-3 sm:p-4 rounded-xl relative overflow-hidden group border-l-4 border-l-orange-500">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-400 mb-1">Despesas Hoje</p>
              <p className="text-lg sm:text-xl font-mono font-bold text-white">{formatKz(todayExpenses || 0)}</p>
              <div className="mt-1.5">
                <span className="text-[9px] text-orange-400/80 font-bold">Registadas hoje</span>
              </div>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-orange-500/15 flex items-center justify-center mt-2 sm:mt-0 sm:ml-3 shrink-0 self-end sm:self-start">
              <AlertTriangle size={18} className="text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Segunda linha de cards (estilo DashboardV2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
        {/* Faturação Hoje */}
        <div className="glass-panel p-3 sm:p-4 rounded-xl relative overflow-hidden group border-l-4 border-l-cyan-400 transition-all duration-200 active:scale-[0.98]">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400 mb-1">Faturação Hoje</p>
              <p className="text-lg sm:text-xl font-mono font-bold text-white">
                {formatKz(todayRevenue)}
                {todayRevenue > 0 && <span className="ml-2 text-[8px] bg-cyan-500 px-1.5 py-0.5 rounded-full animate-pulse">LIVE</span>}
              </p>
              <div className="mt-1.5">
                <span className="text-[9px] text-cyan-400/80 font-bold">Motor Sync Core</span>
              </div>
              <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-500" style={{ '--bar-w': `${yesterdayRevenue > 0 ? Math.min((todayRevenue / yesterdayRevenue) * 100, 100) : 0}%`, width: 'var(--bar-w)' } as React.CSSProperties} />
              </div>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-cyan-400/15 flex items-center justify-center mt-2 sm:mt-0 sm:ml-3 shrink-0 self-end sm:self-start">
              <TrendingUp size={18} className="text-cyan-400" />
            </div>
          </div>
        </div>

        {/* Faturação Ontem */}
        <div className={`glass-panel p-3 sm:p-4 rounded-xl relative overflow-hidden group border-l-4 ${
          isYesterdayOfficial ? 'border-l-orange-500' : 'border-l-yellow-500'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 min-w-0">
              <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${
                isYesterdayOfficial ? 'text-orange-400' : 'text-yellow-400'
              }`}>Faturação Ontem</p>
              <p className="text-lg sm:text-xl font-mono font-bold text-white">{formatKz(yesterdayRevenue)}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  isYesterdayOfficial ? 'bg-orange-500/15 text-orange-400' : 'bg-yellow-500/15 text-yellow-400'
                }`}>
                  {isYesterdayOfficial ? 'OFICIAL' : 'EM ANDAMENTO'}
                </span>
              </div>
              <p className={`text-[8px] mt-1.5 leading-tight ${
                isYesterdayOfficial ? 'text-orange-400/50' : 'text-yellow-400/50'
              }`}>
                {isYesterdayOfficial
                  ? 'Valor oficial — inclui vendas após fecho do dia'
                  : 'Valor parcial — trava às 05:00'
                }
              </p>
            </div>
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center mt-2 sm:mt-0 sm:ml-3 shrink-0 self-end sm:self-start ${
              isYesterdayOfficial ? 'bg-orange-500/15' : 'bg-yellow-500/15'
            }`}>
              <Receipt size={18} className={isYesterdayOfficial ? 'text-orange-400' : 'text-yellow-400'} />
            </div>
          </div>
        </div>

        {/* Fecho do Dia */}
        <div className={`glass-panel p-3 sm:p-4 rounded-xl relative overflow-hidden group border-l-4 ${
          hasClosing ? 'border-l-blue-500' : 'border-l-slate-500'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 min-w-0">
              <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${
                hasClosing ? 'text-blue-400' : 'text-slate-400'
              }`}>Fecho do Dia</p>
              <p className="text-lg sm:text-xl font-mono font-bold text-white">
                {hasClosing ? formatKz(yesterdayClosing) : '—'}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  hasClosing ? 'bg-blue-500/15 text-blue-400' : 'bg-slate-500/15 text-slate-400'
                }`}>
                  {hasClosing ? 'SNAPSHOT' : 'SEM FECHO'}
                </span>
              </div>
              <p className={`text-[8px] mt-1.5 leading-tight ${
                hasClosing ? 'text-blue-400/50' : 'text-slate-400/50'
              }`}>
                {hasClosing
                  ? 'Valor no momento exato do fecho do dia'
                  : 'Nenhum fecho foi realizado para este dia'
                }
              </p>
            </div>
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center mt-2 sm:mt-0 sm:ml-3 shrink-0 self-end sm:self-start ${
              hasClosing ? 'bg-blue-500/15' : 'bg-slate-500/15'
            }`}>
              <Receipt size={18} className={hasClosing ? 'text-blue-400' : 'text-slate-400'} />
            </div>
          </div>
        </div>

        {/* Despesas Totais */}
        <div className="glass-panel p-3 sm:p-4 rounded-xl relative overflow-hidden group border-l-4 border-l-red-500">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-400 mb-1">Despesas Totais</p>
              <p className="text-lg sm:text-xl font-mono font-bold text-white">{formatKz(totalExpenses)}</p>
              <div className="mt-1.5">
                <span className="text-[9px] text-red-400/80 font-bold">Todas as saídas</span>
              </div>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-red-500/15 flex items-center justify-center mt-2 sm:mt-0 sm:ml-3 shrink-0 self-end sm:self-start">
              <AlertTriangle size={18} className="text-red-400" />
            </div>
          </div>
        </div>

        {/* Custos Staff */}
        <div className="glass-panel p-3 sm:p-4 rounded-xl relative overflow-hidden group border-l-4 border-l-blue-500">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400 mb-1">Custos Staff</p>
              <p className="text-lg sm:text-xl font-mono font-bold text-white">{formatKz(staffCosts)}</p>
              <div className="mt-1.5">
                <span className="text-[9px] text-blue-400/80 font-bold">Salários + Encargos</span>
              </div>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-500/15 flex items-center justify-center mt-2 sm:mt-0 sm:ml-3 shrink-0 self-end sm:self-start">
              <Users size={18} className="text-blue-400" />
            </div>
          </div>
        </div>

        {/* Vendas Totais */}
        <div className="glass-panel p-3 sm:p-4 rounded-xl relative overflow-hidden group border-l-4 border-l-indigo-500">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">Vendas Totais</p>
              <p className="text-lg sm:text-xl font-mono font-bold text-white">{formatKz(allSalesTotal)}</p>
              <div className="mt-1.5">
                <span className="text-[9px] text-indigo-400/80 font-bold">Sem filtro de data</span>
              </div>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-indigo-500/15 flex items-center justify-center mt-2 sm:mt-0 sm:ml-3 shrink-0 self-end sm:self-start">
              <DollarSign size={18} className="text-indigo-400" />
            </div>
          </div>
        </div>

        {/* Reserva Fiscal Anual */}
        <div className="glass-panel p-3 sm:p-4 rounded-xl relative overflow-hidden group border-l-4 border-l-rose-500">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-400 mb-1">Reserva Fiscal Anual</p>
              <p className="text-lg sm:text-xl font-mono font-bold text-white">{formatKz(reservaFiscal.anual.total)}</p>
              <div className="mt-1">
                <span className="text-[8px] text-rose-400/60 font-bold">II: {formatKz(reservaFiscal.anual.impostoIndustrial)} | Ret: {formatKz(reservaFiscal.anual.retencaoFonte)}</span>
              </div>
              <div className="mt-0.5">
                <span className="text-[7px] text-slate-500">Hoje: {formatKz(reservaFiscal.diaria.total)} | {reservaFiscal.anual.diasRestantes} dias restantes</span>
              </div>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-rose-500/15 flex items-center justify-center mt-2 sm:mt-0 sm:ml-3 shrink-0 self-end sm:self-start">
              <Receipt size={18} className="text-rose-400" />
            </div>
          </div>
        </div>
      </div>

      </div>

      {/* 📱 TAB: SEGURANÇA */}
      <div className={activeTab !== 'security' ? 'hidden' : ''}>
      {/* VENDAS POR OPERADOR (Anti-Roubo) */}
      {operatorSalesVisible && (
      <div className="glass-panel p-4 sm:p-6 rounded-xl border-l-4 border-l-red-500 mb-4 relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
            <Users size={20} className="text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-black text-white uppercase tracking-tight">Vendas por Operador</h3>
            <p className="text-[9px] text-red-400/60 font-bold uppercase tracking-wider">Controlo anti-roubo</p>
          </div>
          <button type="button" onClick={dismissOperatorSales}
            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-full text-[10px] font-bold transition-colors"
            title="Apagar vendas por operador">
            Limpar
          </button>
        </div>

        {operatorSales.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
              <Users className="w-8 h-8 text-white/20" />
            </div>
            <p className="text-white/50 text-sm font-bold">Sem dados de operador</p>
            <p className="text-white/30 text-[10px] mt-1">As vendas futuras registarão automaticamente o operador</p>
          </div>
        ) : (
          <div className="space-y-3">
            {operatorSales.map((op, idx) => {
              const maxTotal = operatorSales[0]?.total || 1;
              const barWidth = (op.total / maxTotal) * 100;
              return (
                <div key={op.name} className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black w-5 text-center ${idx === 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                        {idx + 1}
                      </span>
                      <span className="text-sm font-bold text-white">{op.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-slate-400">{op.count} vendas</span>
                      <span className="text-slate-400">Ticket: {formatKz(op.avgTicket)}</span>
                      <span className="text-white font-bold">{formatKz(op.total)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${idx === 0 ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gradient-to-r from-primary/60 to-primary'}`}
                      style={{ '--bar-w': `${barWidth}%`, width: 'var(--bar-w)' } as React.CSSProperties}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* ALERTAS DE SEGURANÇA */}
      {visibleAlerts.length > 0 && (
        <div className="glass-panel p-4 sm:p-6 rounded-xl border-l-4 border-l-amber-500 mb-4 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} className="text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black text-white uppercase tracking-tight">Alertas de Segurança</h3>
              <p className="text-[9px] text-amber-400/60 font-bold uppercase tracking-wider">Padrões anormais detectados</p>
            </div>
            <button type="button" onClick={clearAllAlerts}
              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-full text-[10px] font-bold transition-colors"
              title="Apagar todos os alertas">
              Limpar todos
            </button>
            <span className="px-2.5 py-1 bg-red-500/20 text-red-400 rounded-full text-[10px] font-black">
              {visibleAlerts.length} {visibleAlerts.length === 1 ? 'alerta' : 'alertas'}
            </span>
          </div>

          <div className="space-y-3">
            {visibleAlerts.map((alert, idx) => {
              const alertKey = `${alert.type}:${alert.operator || ''}:${alert.message}`;
              return (
              <div
                key={idx}
                className={`p-3 rounded-lg border flex items-start gap-3 ${
                  alert.severity === 'high'
                    ? 'bg-red-500/10 border-red-500/30'
                    : alert.severity === 'medium'
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-white/5 border-white/10'
                }`}
              >
                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                  alert.severity === 'high' ? 'bg-red-400' : alert.severity === 'medium' ? 'bg-amber-400' : 'bg-slate-400'
                }`} />
                <div className="flex-1">
                  <p className={`text-sm font-bold ${
                    alert.severity === 'high' ? 'text-red-300' : alert.severity === 'medium' ? 'text-amber-300' : 'text-slate-300'
                  }`}>
                    {alert.message}
                  </p>
                  <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-wider">
                    {alert.type.replace(/_/g, ' ')} · Severidade: {alert.severity}
                  </p>
                </div>
                <button type="button" onClick={() => dismissAlert(alertKey)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors shrink-0"
                  title="Apagar este alerta">
                  <X size={14} />
                </button>
              </div>
              );
            })}
          </div>
        </div>
      )}

      </div>

      {/* 📱 TAB: COMPRAS */}
      <div className={activeTab !== 'purchases' ? 'hidden' : ''}>

      <div className="glass-panel p-4 sm:p-6 rounded-xl border-l-4 border-l-orange-500 mb-4 relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-orange-500/15 flex items-center justify-center shrink-0">
            <ShoppingCart size={20} className="text-orange-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-black text-white uppercase tracking-tight">Pedidos de Compra Pendentes</h3>
            <p className="text-[9px] text-orange-400/60 font-bold uppercase tracking-wider">Aguarda aprovação</p>
          </div>
          {pendingPurchases.length > 0 && (
            <span className="px-2.5 py-1 bg-orange-500/20 text-orange-400 rounded-full text-[10px] font-black">
              {pendingPurchases.length} {pendingPurchases.length === 1 ? 'pendente' : 'pendentes'}
            </span>
          )}
        </div>

        {pendingPurchases.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-8 h-8 text-green-400/60" />
            </div>
            <p className="text-white/50 text-sm font-bold">Tudo em dia</p>
            <p className="text-white/30 text-[10px] mt-1">Não há pedidos de compra pendentes</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingPurchases.map((purchase) => {
              const required = getRequiredApprovals(purchase.amount);
              const currentCount = purchase.approval_count || 0;
              const isPartial = purchase.status === 'parcial';
              const notes = parsePurchaseNotes(purchase.notes);
              return (
                <div key={purchase.id} className={`bg-white/5 border rounded-2xl p-5 transition-all cursor-pointer hover:border-white/20 ${
                  isPartial ? 'border-orange-500/30 bg-orange-500/5' : 'border-white/10'
                }`}
                onClick={() => setSelectedPurchase(purchase)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                          isPartial ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {isPartial ? `PARCIAL (${currentCount}/${required})` : 'PENDENTE'}
                        </span>
                        <span className="text-2xl font-black text-cyan-400">{formatKz(purchase.amount)}</span>
                      </div>
                      <p className="text-white font-semibold text-sm mb-1">{purchase.description}</p>
                      <p className="text-white/60 text-xs">
                        Fornecedor: {purchase.provider} • Criado: {new Date(purchase.created_at).toLocaleDateString('pt-AO')}
                      </p>
                      {(notes.category || notes.quantity || notes.expected_date) && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {notes.category && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/60 font-bold">{notes.category}</span>
                          )}
                          {notes.quantity && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/60 font-bold">{notes.quantity} {notes.unit || 'un'}</span>
                          )}
                          {notes.expected_date && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/60 font-bold">Entrega: {new Date(notes.expected_date).toLocaleDateString('pt-AO')}</span>
                          )}
                        </div>
                      )}
                      {notes.text && (
                        <p className="text-white/50 text-xs mt-2 italic line-clamp-2">{notes.text}</p>
                      )}
                      {required === 2 && (
                        <p className={`text-xs mt-2 ${isPartial ? 'text-orange-400' : 'text-yellow-400'}`}>
                          ⚠️ Requer aprovação de ambos os owners ({currentCount}/{required} aprovado{currentCount !== 1 ? 's' : ''})
                        </p>
                      )}
                      {required === 0 && (
                        <p className="text-xs mt-2 text-green-400">✅ Auto-aprovável (valor abaixo do limite)</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3 mt-3" onClick={(e) => e.stopPropagation()}>
                    {purchase.proforma_url && (
                      <a href={purchase.proforma_url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/20 transition-all">
                        Ver Proforma
                      </a>
                    )}
                    <button
                      onClick={() => handleRejectPurchase(purchase.id)}
                      disabled={purchaseProcessing === purchase.id}
                      className="flex-1 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-red-500/20 transition-all disabled:opacity-50"
                    >
                      <XCircle size={16} className="inline mr-1" />
                      {purchaseProcessing === purchase.id ? '...' : 'Rejeitar'}
                    </button>
                    <button
                      onClick={() => handleApprovePurchase(purchase.id, purchase.amount)}
                      disabled={purchaseProcessing === purchase.id}
                      className="flex-1 py-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-green-500/20 transition-all disabled:opacity-50"
                    >
                      <CheckCircle size={16} className="inline mr-1" />
                      {purchaseProcessing === purchase.id ? '...' : 'Aprovar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Histórico Recente */}
        {purchaseHistory.length > 0 && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <h4 className="text-sm font-bold text-white/80 mb-3">Histórico Recente</h4>
            <div className="space-y-2">
              {purchaseHistory.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs py-2 px-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    {item.status === 'aprovado' && <CheckCircle size={14} className="text-green-400" />}
                    {item.status === 'rejeitado' && <XCircle size={14} className="text-red-400" />}
                    {item.status === 'pago' && <DollarSign size={14} className="text-blue-400" />}
                    <span className="text-white/80">{item.description}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-cyan-400 font-bold">{formatKz(item.amount)}</span>
                    <span className="text-white/40">{item.approved_by || '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 💰 CARD: TOTAL DE COMPRAS APROVADAS */}
      <div className="glass-panel p-4 sm:p-6 rounded-xl border-l-4 border-l-emerald-500 mb-4 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
              <CheckCircle size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-1">Compras Aprovadas</p>
              <p className="text-[9px] text-emerald-400/60 font-bold">{approvedPurchasesCount} {approvedPurchasesCount === 1 ? 'compra' : 'compras'} pelos owners</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl sm:text-2xl font-mono font-black text-emerald-400">
              {formatKz(approvedPurchasesTotal)}
            </p>
          </div>
        </div>
      </div>

      </div>

      {/* 📱 TAB: VISÃO GERAL (continuação) */}
      <div className={activeTab !== 'overview' ? 'hidden' : ''}>
      {/* Gráfico de Tendência - Últimos 7 dias (DADOS REAIS) */}
      <div className="glass-panel p-4 sm:p-6 rounded-xl border-l-4 border-l-cyan-400 mb-4 relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-cyan-400/15 flex items-center justify-center shrink-0">
            <TrendingUp size={20} className="text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-tight">Tendência de Faturação</h3>
            <p className="text-[9px] text-cyan-400/60 font-bold uppercase tracking-wider">Últimos 7 dias</p>
          </div>
        </div>
        
        {/* Fallback de Segurança - Try/Catch para gráfico */}
        {(() => {
          try {
            return (
              <div className="h-64 sm:h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <defs>
                      <linearGradient id="barGradientOwner" x1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.9}/>
                        <stop offset="100%" stopColor="#0891b2" stopOpacity={0.4}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#1e293b' }}
                    />
                    <YAxis 
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#1e293b' }}
                      tickFormatter={(value) => formatKz(value)}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                        border: '1px solid rgba(6, 182, 212, 0.3)',
                        borderRadius: '12px',
                        color: '#F3F4F6',
                        backdropFilter: 'blur(10px)',
                        fontSize: '12px'
                      }}
                      formatter={(value: number, name: string) => [
                        formatKz(value), 
                        name === 'vendas' ? 'Faturação' : 'Média 7 dias'
                      ]}
                      labelStyle={{ color: '#06b6d4', fontWeight: 'bold' }}
                    />
                    <Bar 
                      dataKey="vendas" 
                      fill="url(#barGradientOwner)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="media" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            );
          } catch (error) {
            console.error('[OWNER DASHBOARD] ❌ Erro no gráfico:', error);
            return (
              <div className="h-80 flex items-center justify-center bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="text-center">
                  <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                  <p className="text-red-400 text-sm">Gráfico indisponível</p>
                  <p className="text-red-300 text-xs mt-1">Os dados dos cards continuam funcionando</p>
                </div>
              </div>
            );
          }
        })()}
        
        <p className="text-white/60 text-sm mt-4 text-center">
          📈 Análise de tendência para identificar crescimento do negócio
        </p>
      </div>

      {/* Card Único — Margem de Lucro */}
      <div className="glass-panel p-4 sm:p-6 rounded-xl border-l-4 border-l-emerald-500 mb-4 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
              <TrendingUp size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-1">Margem de Lucro</p>
              <p className="text-[9px] text-emerald-400/60 font-bold">Lucro / Rendimento Total</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-xl sm:text-2xl font-mono font-black ${
              totalRevenue > 0 && ((totalRevenue - (staffCosts + totalExpenses)) / totalRevenue * 100) >= 0
                ? 'text-emerald-400'
                : 'text-red-400'
            }`}>
              {totalRevenue > 0 
                ? `${((totalRevenue - (staffCosts + totalExpenses)) / totalRevenue * 100).toFixed(1)}%`
                : '—'
              }
            </p>
            <p className="text-[9px] text-white/40 mt-0.5">
              {formatKz(totalRevenue - (staffCosts + totalExpenses))} de {formatKz(totalRevenue)}
            </p>
          </div>
        </div>
      </div>

      {/* Botão de Refresh com Loading Visual */}
      <div className="flex justify-center">
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className={`bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors ${
            isRefreshing ? 'opacity-75 cursor-not-allowed' : ''
          }`}
        >
          <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Atualizando...' : 'Atualizar Dados'}
        </button>
      </div>

      {/* Feedback de Sincronização */}
      {lastSyncTime && (
        <div className="flex justify-center mt-4">
          <div className="bg-green-600/20 border border-green-400/30 text-green-300 px-4 py-2 rounded-lg text-sm">
            ✅ Dados Sincronizados: {lastSyncTime} (WAT)
          </div>
        </div>
      )}

      {/* Informações do Sistema */}
      <div className="mt-8 text-center text-white/60">
        <p className="text-sm">
          <strong>Fonte:</strong> final_business_summary (Super View)
        </p>
        <p className="text-sm">
          <strong>Fuso Horário:</strong> Africa/Luanda (UTC+1)
        </p>
        <p className="text-sm">
          <strong>Última Atualização:</strong> {new Date().toLocaleString('pt-AO')}
        </p>
      </div>

      </div>

      {/* 🔍 MODAL: DETALHES DO PEDIDO DE COMPRA */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setSelectedPurchase(null)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black text-white">Detalhes do Pedido</h3>
              <button onClick={() => setSelectedPurchase(null)} title="Fechar" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {(() => {
              const purchase = selectedPurchase;
              const required = getRequiredApprovals(purchase.amount);
              const currentCount = purchase.approval_count || 0;
              const isPartial = purchase.status === 'parcial';
              const notes = parsePurchaseNotes(purchase.notes);
              return (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`text-xs px-3 py-1 rounded-full font-bold ${isPartial ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {isPartial ? `PARCIAL (${currentCount}/${required})` : 'PENDENTE'}
                    </span>
                    <span className="text-3xl font-black text-cyan-400">{formatKz(purchase.amount)}</span>
                  </div>

                  <div className="space-y-3 mb-5">
                    <div>
                      <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1">Descrição</p>
                      <p className="text-white font-semibold text-sm">{purchase.description}</p>
                    </div>

                    <div>
                      <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1">Fornecedor</p>
                      <p className="text-white/80 text-sm">{purchase.provider}</p>
                    </div>

                    {notes.category && (
                      <div>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1">Categoria</p>
                        <p className="text-white/80 text-sm">{notes.category}</p>
                      </div>
                    )}

                    {notes.quantity && (
                      <div>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1">Quantidade</p>
                        <p className="text-white/80 text-sm">{notes.quantity} {notes.unit || 'un'}</p>
                      </div>
                    )}

                    {notes.expected_date && (
                      <div>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1">Data Prevista de Entrega</p>
                        <p className="text-white/80 text-sm">{new Date(notes.expected_date).toLocaleDateString('pt-AO')}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1">Criado em</p>
                      <p className="text-white/80 text-sm">{new Date(purchase.created_at).toLocaleString('pt-AO')}</p>
                    </div>

                    {notes.text && (
                      <div>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1">Notas / Detalhes</p>
                        <p className="text-white/70 text-sm bg-white/5 rounded-lg p-3 whitespace-pre-wrap">{notes.text}</p>
                      </div>
                    )}

                    {purchase.proforma_url && (
                      <div>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1">Proforma</p>
                        <a href={purchase.proforma_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/20 transition-all">
                          <Receipt size={14} /> Ver Proforma
                        </a>
                      </div>
                    )}

                    {required === 2 && (
                      <p className={`text-xs ${isPartial ? 'text-orange-400' : 'text-yellow-400'}`}>
                        ⚠️ Requer aprovação de ambos os owners ({currentCount}/{required} aprovado{currentCount !== 1 ? 's' : ''})
                      </p>
                    )}
                    {required === 0 && (
                      <p className="text-xs text-green-400">✅ Auto-aprovável (valor abaixo do limite)</p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-white/10">
                    <button
                      onClick={() => { handleRejectPurchase(purchase.id); setSelectedPurchase(null); }}
                      disabled={purchaseProcessing === purchase.id}
                      className="flex-1 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-red-500/20 transition-all disabled:opacity-50"
                    >
                      <XCircle size={16} className="inline mr-1" />
                      {purchaseProcessing === purchase.id ? '...' : 'Rejeitar'}
                    </button>
                    <button
                      onClick={() => { handleApprovePurchase(purchase.id, purchase.amount); setSelectedPurchase(null); }}
                      disabled={purchaseProcessing === purchase.id}
                      className="flex-1 py-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-green-500/20 transition-all disabled:opacity-50"
                    >
                      <CheckCircle size={16} className="inline mr-1" />
                      {purchaseProcessing === purchase.id ? '...' : 'Aprovar'}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
};

export default OwnerDashboard;
