import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { supabase } from '../supabase_standalone';
import { useStateLock } from '../hooks/useStateLock';
import { useAutoCashClose } from '../hooks/useAutoCashClose';
import { profiler } from '../hooks/usePerformanceProfiling';
import {
  Search, Plus, CreditCard, Printer,
  Banknote, X, ChevronRight, Grid3X3, Tag, ShoppingBasket,
  UserPlus, History, LogOut,
  Layout, LayoutGrid, ArrowRightLeft, Trash2, Check, DollarSign, QrCode,
  TrendingUp, Calendar, RefreshCw, Shield, Monitor, User,
  ChefHat, Clock,
  Menu, ShoppingCart, BarChart3, Settings, BookOpen, Split, Boxes, GitMerge
} from 'lucide-react';
import { Dish, PaymentMethod, Table, PaymentSplit } from '../../types';
import { printThermalInvoice, printTableReview, printCashClosing, printKitchenTicket, getKitchenPrintConfig, printSplitInvoices } from '../lib/printService';
import LazyImage from '../components/LazyImage';
import PaymentModal from '../components/PaymentModal';
import SplitPaymentModal from '../components/SplitPaymentModal';
import { markDayAsClosed } from '../lib/sync/pendingSyncOrders';
import { registerStockMovementsForSale } from '../lib/stockMovementService';
import { logInvoiceCreation } from '../lib/auditService';
import ShiftManager from '../components/ShiftManager';
import { EventService, EventPackageService } from '../services/eventService';
import { Sparkles, PartyPopper, TrendingUp as TrendingUpIcon } from 'lucide-react';

// 🖥️ Variável de módulo: sobrevive a remounts (Strict Mode / HMR)
let customerDisplayAutoOpened = false;

const POS = () => {
  // 🤖 Fecho automático de caixa (partilhado com OwnerDashboard)
  useAutoCashClose();
  const navigate = useNavigate();
  const {
    tables, activeTableId, setActiveTable,
    menu, categories, activeOrders, activeOrderId, setActiveOrder,
    createNewOrder, addToOrder, removeFromOrder, transferTable, closeTable,
    addSubAccount, removeSubAccount, mergeOrders,
    checkoutTable, splitCheckout, updateOrderPaymentMethod, settings, addNotification, customers, currentUser,
    paymentConfigs, customerDisplayMode, setCustomerDisplayMode, syncPendingOrdersToSupabase,
    events, loadEvents
  } = useStore();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [newSubAccountName, setNewSubAccountName] = useState('');
  const [transferTargetTableId, setTransferTargetTableId] = useState<number | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'METHOD' | 'CUSTOMER'>('METHOD');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);
  
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeTargetOrderId, setMergeTargetOrderId] = useState<string | null>(null);
  const [mergeSourceOrderId, setMergeSourceOrderId] = useState<string | null>(null);
  const [isSubaccountModalOpen, setIsSubaccountModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [closedOrders, setClosedOrders] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isShiftManagerOpen, setIsShiftManagerOpen] = useState(false);
  const [isFechoReprintOpen, setIsFechoReprintOpen] = useState(false);
  const [fechoReprintDate, setFechoReprintDate] = useState<string>(new Date().toLocaleDateString('en-CA'));
  const [fechoReprintLoading, setFechoReprintLoading] = useState(false);
  const [fechoReprintHtml, setFechoReprintHtml] = useState<string>('');
  const [isFechoPreviewOpen, setIsFechoPreviewOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isChangePaymentModalOpen, setIsChangePaymentModalOpen] = useState(false);
  const [lastAddedItemId, setLastAddedItemId] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [selectedSubAccount, setSelectedSubAccount] = useState<any>(null);

  // 🎉 EVENTOS: Carregar eventos activos para integração com POS
  useEffect(() => {
    loadEvents();
    const interval = setInterval(() => loadEvents(), 60000); // Refresh a cada 60s
    return () => clearInterval(interval);
  }, [loadEvents]);

  // 🎉 Detectar evento associado à mesa activa
  const activeTable = tables.find(t => t.id === activeTableId);
  const tableEvent = useMemo(() => {
    if (!activeTable) return null;
    if (activeTable.eventId) {
      return events.find(e => e.id === activeTable.eventId) || null;
    }
    return null;
  }, [activeTable, events]);

  // 🎉 Eventos activos hoje (para widget no POS)
  const todayEvents = useMemo(() => {
    const today = new Date().toDateString();
    return events.filter(e => {
      const eventDate = new Date(e.start_date).toDateString();
      return eventDate === today && e.status !== 'CANCELADO';
    });
  }, [events]);

  // 🎉 Estado para painel de consumo do evento
  const [showEventPanel, setShowEventPanel] = useState(false);
  const [eventOrders, setEventOrders] = useState<any[]>([]);
  const [eventOrdersLoading, setEventOrdersLoading] = useState(false);
  const [eventPackage, setEventPackage] = useState<any>(null);

  // 🎉 Carregar pacote do evento quando mesa de evento é aberta
  useEffect(() => {
    if (tableEvent?.package_id) {
      EventPackageService.getPackageById(tableEvent.package_id).then(pkg => {
        setEventPackage(pkg);
      }).catch(err => {
        console.error('[POS] Erro ao carregar pacote:', err);
        setEventPackage(null);
      });
    } else {
      setEventPackage(null);
    }
  }, [tableEvent]);

  const loadEventOrders = useCallback(async (eventId: string) => {
    setEventOrdersLoading(true);
    try {
      const orders = await EventService.getEventOrders(eventId);
      setEventOrders(orders);
    } catch (error) {
      console.error('[POS] Erro ao carregar pedidos do evento:', error);
      setEventOrders([]);
    } finally {
      setEventOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tableEvent) {
      loadEventOrders(tableEvent.id);
    } else {
      setEventOrders([]);
    }
  }, [tableEvent, loadEventOrders]);

  // 🎉 Calcular total consumido no evento (extras)
  const eventExtrasTotal = useMemo(() => {
    return eventOrders
      .filter(o => o.order_type === 'EXTRA')
      .reduce((sum, o) => sum + (o.order?.total_amount || 0), 0);
  }, [eventOrders]);

  // 🎉 Vincular pedido ao evento no checkout
  const linkOrderToEvent = useCallback(async (orderId: string, eventId: string, orderType: 'INCLUIDO' | 'EXTRA' = 'EXTRA') => {
    try {
      await EventService.addOrderToEvent(eventId, orderId, orderType as any);
      console.log('[POS] ✅ Pedido vinculado ao evento:', { orderId, eventId, orderType });
      loadEventOrders(eventId); // Actualizar pedidos do evento
    } catch (error) {
      console.error('[POS] ❌ Erro ao vincular pedido ao evento:', error);
    }
  }, [loadEventOrders]);
  const [sentToKitchenMap, setSentToKitchenMap] = useState<Record<string, { dishId: string; quantity: number; name: string }[]>>({});
  const [kitchenPreviewItems, setKitchenPreviewItems] = useState<{ dishId: string; name: string; quantity: number; notes?: string }[]>([]);
  const [isKitchenPreviewOpen, setIsKitchenPreviewOpen] = useState(false);

  const [orderToChangeId, setOrderToChangeId] = useState<string | null>(null);

  // 🔒 ESTADOS PARA PREVENÇÃO DE FECHO ACIDENTAL
  const [isCashClosingConfirmOpen, setIsCashClosingConfirmOpen] = useState(false);
  interface ShiftCloseData {
    shift: { id: string; shift_type: string; opened_by: string; closed_by?: string; status: string; opening_amount?: number; closing_amount?: number; expected_amount?: number } | null;
    sales: number;
    ordersCount: number;
    paymentBreakdown: { [key: string]: { count: number; total: number } };
    soldProducts: { name: string; quantity: number; total: number }[];
  }

  const [cashClosingData, setCashClosingData] = useState<{
    closingDate: string;
    totalGeral: number;
    todayOrdersCount: number;
    currentHour: number;
    existingFecho: any;
    paymentBreakdown: { [key: string]: { count: number; total: number } };
    soldProducts: { name: string; quantity: number; total: number }[];
    morning: ShiftCloseData;
    afternoon: ShiftCloseData;
  } | null>(null);

  // 🔒 ESTADOS PARA PREVIEW DE IMPRESSÃO
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [printPreviewHtml, setPrintPreviewHtml] = useState<string>('');

  // 🔒 ESTADOS PARA CONTROLO DE FECHO DE CAIXA NO PREVIEW
  const [isCashClosingPreview, setIsCashClosingPreview] = useState(false);
  const [cashClosingPreviewDate, setCashClosingPreviewDate] = useState<string | null>(null);
  // 🔒 ESTADO CRÍTICO: Controla se o fecho já foi executado ou está em preview
  const [hasCashClosingBeenExecuted, setHasCashClosingBeenExecuted] = useState(false);

  // 🔒 ESTADO: Indicador visual de fecho do dia
  const [dayCloseStatus, setDayCloseStatus] = useState<'loading' | 'closed' | 'pending'>('loading');

  // Estados para responsividade
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(window.innerWidth < 1024);
  
  // 🔥 NOVO: Estados para layout de 3 colunas
  const [isMenuSidebarOpen, setIsMenuSidebarOpen] = useState(false); // Menu escondido por padrão no POS
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(true); // Categorias visíveis por padrão
  
  // Relógio em tempo real
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 🔥 STATE LOCK: Evitar Race Conditions nas mesas (2.5s lock para evitar pisca)
  const tableStateLock = useStateLock<number>(2500);

  // 🔒 Event Listener para preview de impressão
  useEffect(() => {
    const handlePrintPreview = (event: CustomEvent) => {
      console.log('[PRINT] Evento de preview recebido');
      setPrintPreviewHtml(event.detail.html);
      setIsPrintPreviewOpen(true);
      // 🔒 Se for fecho de caixa, guardar a data para possível cancelamento
      if (event.detail.isCashClosing) {
        setIsCashClosingPreview(true);
        setCashClosingPreviewDate(event.detail.closingDate || null);
        // 🔒 Resetar estado: novo preview = fecho ainda não executado
        setHasCashClosingBeenExecuted(event.detail.hasExecuted || false);
      } else {
        setIsCashClosingPreview(false);
        setCashClosingPreviewDate(null);
        setHasCashClosingBeenExecuted(false);
      }
    };

    window.addEventListener('showPrintPreview', handlePrintPreview as EventListener);

    return () => {
      window.removeEventListener('showPrintPreview', handlePrintPreview as EventListener);
    };
  }, []);

  // 🔒 VERIFICAR ESTADO DO FECHO DO DIA + FECHO AUTOMÁTICO DE SEGURANÇA
  useEffect(() => {
    const checkDayCloseStatus = async () => {
      try {
        const now = new Date();
        const utcHour = now.getUTCHours();
        const currentHour = (utcHour + 1) % 24; // Luanda = UTC+1

        // Determinar dia operacional atual (05:00-04:59)
        let operationalDate: string;
        if (currentHour >= 5) {
          const luandaDate = new Date(now.getTime() + (1 * 60 * 60 * 1000));
          operationalDate = luandaDate.toISOString().split('T')[0];
        } else {
          const luandaYesterday = new Date(now.getTime() + (1 * 60 * 60 * 1000));
          luandaYesterday.setDate(luandaYesterday.getUTCDate() - 1);
          operationalDate = luandaYesterday.toISOString().split('T')[0];
        }

        // Verificar se já existe fecho para o dia operacional
        const { data: existingFecho } = await supabase
          .from('cash_flow')
          .select('id, amount')
          .eq('category', 'FECHO_CAIXA')
          .eq('data_contabil', operationalDate)
          .maybeSingle();

        if (existingFecho) {
          setDayCloseStatus('closed');
        } else {
          setDayCloseStatus('pending');
        }
      } catch (err) {
        console.error('[FECHO AUTO] Erro ao verificar estado do fecho:', err);
        setDayCloseStatus('pending');
      }
    };

    // Verificar ao carregar e a cada 5 minutos
    checkDayCloseStatus();
    const statusInterval = setInterval(checkDayCloseStatus, 5 * 60 * 1000);

    // 🔒 FECHO AUTOMÁTICO DE SEGURANÇA: às 04:55 Luanda (antes do turno acabar)
    const autoCloseSafety = setInterval(async () => {
      const now = new Date();
      const utcHour = now.getUTCHours();
      const utcMin = now.getUTCMinutes();
      const currentHour = (utcHour + 1) % 24; // Luanda = UTC+1

      // Só executa entre 04:55 e 04:59 (janela de 5 min antes do novo dia)
      if (currentHour === 4 && utcMin >= 55) {
        // Determinar o dia que está a acabar
        const luandaDate = new Date(now.getTime() + (1 * 60 * 60 * 1000));
        const closingDate = luandaDate.toISOString().split('T')[0];

        // Verificar se já existe fecho
        const { data: existing } = await supabase
          .from('cash_flow')
          .select('id')
          .eq('category', 'FECHO_CAIXA')
          .eq('data_contabil', closingDate)
          .maybeSingle();

        if (existing) {
          console.log('[FECHO AUTO] Dia já fechado, não é necessário fecho automático.');
          return;
        }

        console.log('[FECHO AUTO] 🤖 Iniciando fecho automático de segurança para', closingDate);

        // Buscar vendas do dia
        const { data: orders } = await supabase
          .from('orders')
          .select('id, total_amount, status')
          .eq('data_contabil', closingDate)
          .in('status', ['closed', 'paid']);

        const totalAmount = (orders || []).reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
        const ordersCount = orders?.length || 0;

        // Inserir fecho automático
        const { error: insertError } = await supabase
          .from('cash_flow')
          .insert({
            amount: totalAmount,
            category: 'FECHO_CAIXA',
            type: 'entrada',
            description: `Fecho Automático de Segurança - ${ordersCount} vendas`,
            data_contabil: closingDate,
            closed_by: 'Sistema (Auto-Fecho)',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('[FECHO AUTO] ❌ Erro ao inserir fecho automático:', insertError);
        } else {
          console.log('[FECHO AUTO] ✅ Fecho automático inserido:', totalAmount, 'Kz');
          // Marcar dia como fechado
          try {
            await supabase.rpc('mark_day_closed_safe', { p_date: closingDate });
          } catch (e) {
            console.error('[FECHO AUTO] Erro ao marcar dia fechado:', e);
          }
          setDayCloseStatus('closed');
        }
      }
    }, 60 * 1000); // Verificar a cada minuto

    return () => {
      clearInterval(statusInterval);
      clearInterval(autoCloseSafety);
    };
  }, []);

  // 🔒 Função para executar impressão após confirmar preview
  const executePrintAfterPreview = useCallback(() => {
    if (printPreviewHtml) {
      const frameId = 'print-frame';
      let printFrame = document.getElementById(frameId) as HTMLIFrameElement;
      
      if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = frameId;
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = 'none';
        document.body.appendChild(printFrame);
      }

      const doc = printFrame.contentDocument || printFrame.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(printPreviewHtml);
        doc.close();
        
        setTimeout(() => {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        }, 500);
      }
      
      setIsPrintPreviewOpen(false);
      setPrintPreviewHtml('');
      setIsCashClosingPreview(false);
      setCashClosingPreviewDate(null);
    }
  }, [printPreviewHtml]);

  // Detectar tamanho de tela
  useEffect(() => {
    const handleResize = () => {
      setIsSidebarCollapsed(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const currentOrder = activeOrders.find(o => o.id === activeOrderId);
  
  // 🔥 MEMOIZAR MESAS ORDENADAS - Numérico crescente, Takeaway no final
  const sortedTables = useMemo(() => {
    return [...tables].sort((a, b) => {
      const isTakeawayA = /takeaway|balc[ãa]o|counter|bar/i.test(a.name);
      const isTakeawayB = /takeaway|balc[ãa]o|counter|bar/i.test(b.name);
      // Takeaway sempre no final
      if (isTakeawayA && !isTakeawayB) return 1;
      if (!isTakeawayA && isTakeawayB) return -1;
      // Entre mesas normais, ordenar por número
      const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
      return numA - numB;
    });
  }, [tables]);
  
  // 🔥 MEMOIZAR FILTROS - Evita re-calculos e re-renders
  const filteredByCategory = useMemo(() => {
    return menu.filter(d => {
      const matchesCategory = selectedCategoryId === 'TODOS' || d.category_id === selectedCategoryId;
      return matchesCategory;
    });
  }, [menu, selectedCategoryId]);
  
  const filteredBySearch = useMemo(() => {
    return filteredByCategory.filter(d => 
      d.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [filteredByCategory, searchTerm]);
  
  // Função de impressão direta - SEM CONFIGURAÇÃO
  const handleDirectPrint = useCallback(async (order: any, customer?: any, customerName?: string, customerNif?: string) => {
    try {
      await printThermalInvoice(order, menu, settings, customer, customerName, customerNif);
      addNotification('success', 'Impressão disparada com sucesso!');
    } catch (printError) {
      console.error('[POS] ❌ Erro ao imprimir:', printError);
      addNotification('error', 'Erro ao imprimir. Verifique a impressora.');
    }
  }, [menu, settings, addNotification]);

  // Reimprimir pedido do histórico - busca dados completos do Supabase
  const handleReprintFromHistory = useCallback(async (historyOrder: any) => {
    try {
      addNotification('info', 'A preparar reimpressão...');
      
      // Buscar items do pedido
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('quantity, unit_price, total_price, product_id')
        .eq('order_id', historyOrder.id);

      if (itemsError) {
        console.error('[POS] ❌ Erro ao buscar items para reimpressão:', itemsError);
        addNotification('error', 'Erro ao carregar dados do pedido.');
        return;
      }

      // Reconstruir items no formato que printThermalInvoice espera
      const items = (itemsData || []).map((item: any) => ({
        dishId: item.product_id,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        unitCost: 0,
        taxAmount: (item.unit_price * (settings.taxRate / 100)) / (1 + settings.taxRate / 100),
      }));

      const total = historyOrder.total || 0;
      const taxRate = settings.taxRate || 14;
      const taxTotal = total - (total / (1 + taxRate / 100));

      // Reconstruir order completa
      const fullOrder = {
        id: historyOrder.id,
        tableId: historyOrder.tableId,
        items: items,
        total: total,
        taxTotal: taxTotal,
        profit: 0,
        status: historyOrder.status || 'closed',
        paymentMethod: historyOrder.paymentMethod || 'NUMERARIO',
        invoiceNumber: historyOrder.invoiceNumber || historyOrder.invoice_number || 'S/N',
        timestamp: historyOrder.timestamp || new Date().toISOString(),
        hash: historyOrder.hash || Math.random().toString(36).substring(2, 12).toUpperCase(),
        customerId: historyOrder.customerId || null,
        subAccountName: 'Principal'
      };

      const customer = historyOrder.customerId 
        ? customers.find(c => c.id === historyOrder.customerId) 
        : undefined;

      await printThermalInvoice(fullOrder as any, menu, settings, customer, historyOrder.customer_name);
      addNotification('success', 'Reimpressão enviada com sucesso!');
    } catch (err) {
      console.error('[POS] ❌ Erro ao reimprimir:', err);
      addNotification('error', 'Erro ao reimprimir factura.');
    }
  }, [menu, settings, customers, addNotification]);
  
  const closedToday = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const filtered = activeOrders.filter(o => {
      if (!['closed', 'paid'].includes(o.status)) return false;
      const orderDate = new Date(o.timestamp).toLocaleDateString('en-CA');
      return orderDate === todayStr;
    });
    console.log('[POS] Debug closedToday:', {
      todayStr,
      totalActiveOrders: activeOrders.length,
      closedTodayCount: filtered.length,
      closedOrders: filtered.map(o => ({ id: o.id, status: o.status, tableId: o.tableId, timestamp: o.timestamp }))
    });
    return filtered;
  }, [activeOrders]);

  // 🔥 BUSCAR PEDIDOS FECHADOS DO SUPABASE PARA O HISTÓRICO (últimos 7 dias, paginado)
  const fetchClosedOrders = useCallback(async () => {
    setIsLoadingHistory(true);
    setHistoryError(null);
    try {
      // Calcular data de 7 dias atrás
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toLocaleDateString('en-CA');

      // Buscar paginado para evitar limite de 1000 do Supabase
      let allData: any[] = [];
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('orders')
          .select('id, table_id, total_amount, status, payment_method, invoice_number, created_at, customer_name, data_contabil')
          .in('status', ['closed', 'paid'])
          .gte('created_at', sevenDaysAgoStr + 'T00:00:00')
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (error) {
          console.error('[POS] ❌ Erro ao buscar histórico:', error);
          setHistoryError('Erro ao carregar histórico');
          setClosedOrders([]);
          return;
        }

        if (!data || data.length === 0) {
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

      const mapped = allData.map((o: any) => ({
        id: o.id,
        tableId: o.table_id,
        total: o.total_amount,
        status: o.status,
        paymentMethod: o.payment_method,
        invoiceNumber: o.invoice_number,
        timestamp: o.created_at,
        dataContabil: o.data_contabil,
        customerId: null,
        customer_name: o.customer_name
      }));
      console.log('[POS] ✅ Histórico carregado (7 dias, paginado):', mapped.length);
      // Debug: mostrar timestamps reais como texto puro
      const tz = 'Africa/Luanda';
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });
      console.log('[POS] 📅 Hoje (Luanda):', todayStr);
      const fmtTs = (o: any) => `raw=${o.timestamp} | luanda=${new Date(o.timestamp).toLocaleDateString('en-CA', { timeZone: tz })} | time=${new Date(o.timestamp).toLocaleTimeString('pt-PT', { timeZone: tz })}`;
      console.log('[POS] 📋 Primeiros 5:\n' + mapped.slice(0, 5).map(fmtTs).join('\n'));
      console.log('[POS] 📋 Últimos 5:\n' + mapped.slice(-5).map(fmtTs).join('\n'));
      // Contar quantos têm data de hoje vs outros dias
      const dayCounts: Record<string, number> = {};
      mapped.forEach(o => {
        const d = new Date(o.timestamp).toLocaleDateString('en-CA', { timeZone: tz });
        dayCounts[d] = (dayCounts[d] || 0) + 1;
      });
      console.log('[POS] 📊 Contagem por dia (Luanda):', JSON.stringify(dayCounts, null, 2));
      setClosedOrders(mapped);
    } catch (err) {
      console.error('[POS] ❌ Erro inesperado no histórico:', err);
      setHistoryError('Erro inesperado');
      setClosedOrders([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Helper: etiqueta do dia (Hoje, Ontem, ou data por extenso)
  // Aceita uma data no formato YYYY-MM-DD (data_contabil) ou ISO string
  const getDayLabel = (dateStr: string): string => {
    const tz = 'Africa/Luanda';
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toLocaleDateString('en-CA', { timeZone: tz });
    
    // Se já está em formato YYYY-MM-DD (data_contabil), usar diretamente
    const orderDateStr = dateStr.length === 10 ? dateStr : new Date(dateStr).toLocaleDateString('en-CA', { timeZone: tz });
    
    if (orderDateStr === todayStr) return 'Hoje';
    if (orderDateStr === yesterdayStr) return 'Ontem';
    
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const [y, m, d] = orderDateStr.split('-');
    return `${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`;
  };

  // Agrupar pedidos por dia (descendente) — usa data_contabil (Dia Operacional IMUTÁVEL)
  const groupedClosedOrders = useMemo(() => {
    const tz = 'Africa/Luanda';
    const groups: { label: string; date: string; orders: any[] }[] = [];
    const seenDays = new Set<string>();
    
    for (const order of closedOrders) {
      // Usar data_contabil se disponível (imutável), senão fallback para created_at em timezone Luanda
      const orderDate = order.dataContabil || new Date(order.timestamp).toLocaleDateString('en-CA', { timeZone: tz });
      if (!seenDays.has(orderDate)) {
        seenDays.add(orderDate);
        groups.push({ label: getDayLabel(orderDate), date: orderDate, orders: [] });
      }
      const group = groups.find(g => g.date === orderDate);
      if (group) group.orders.push(order);
    }
    
    // Ordenar grupos por data descendente (mais recente primeiro)
    groups.sort((a, b) => b.date.localeCompare(a.date));
    return groups;
  }, [closedOrders]);

  // Carregar histórico quando abrir o modal
  useEffect(() => {
    if (isHistoryOpen) {
      fetchClosedOrders();
    }
  }, [isHistoryOpen, fetchClosedOrders]);

  const handleTableClick = useCallback((table: Table) => {
    profiler.mark('handleTableClick_start');
    
    // 🔥 STATE LOCK: Bloquear atualizações externas por 500ms após clique local
    profiler.mark('stateLock_start');
    tableStateLock.lock(table.id);
    profiler.measure('stateLock', 'stateLock_start');
    
    profiler.mark('setActiveTable_start');
    setActiveTable(table.id);
    profiler.measure('setActiveTable', 'setActiveTable_start');
    
    profiler.mark('findExistingOrder_start');
    const existingOrder = activeOrders.find(o => o.tableId === table.id && o.status === 'ABERTO');
    profiler.measure('findExistingOrder', 'findExistingOrder_start');
    
    if (existingOrder) {
      profiler.mark('setActiveOrder_existing_start');
      setActiveOrder(existingOrder.id);
      profiler.measure('setActiveOrder_existing', 'setActiveOrder_existing_start');
    } else {
      profiler.mark('createNewOrder_start');
      const newId = createNewOrder(table.id);
      profiler.measure('createNewOrder', 'createNewOrder_start');
      
      profiler.mark('setActiveOrder_new_start');
      setActiveOrder(newId);
      profiler.measure('setActiveOrder_new', 'setActiveOrder_new_start');

      // 🎉 Notificar se mesa é de evento
      const eventData = table.eventId ? events.find(e => e.id === table.eventId) : null;
      if (eventData) {
        addNotification('info', `🎉 Mesa de Evento: ${eventData.name}`);
        // Carregar pacote e mostrar itens incluídos
        if (eventData.package_id) {
          EventPackageService.getPackageById(eventData.package_id).then(pkg => {
            if (pkg && pkg.included_items && pkg.included_items.length > 0) {
              const itemsList = pkg.included_items.map(i => 
                `${i.name} (${i.unlimited ? 'ilimitado' : `${i.quantity_per_person}x/pessoa`})`
              ).join(', ');
              addNotification('info', `Pacote: ${pkg.name} — ${itemsList}`);
            }
          }).catch(err => console.error('[POS] Erro ao carregar pacote:', err));
        }
      }
    }
    
    profiler.measure('handleTableClick_total', 'handleTableClick_start');
    profiler.clear();
  }, [activeOrders, setActiveTable, setActiveOrder, createNewOrder, tableStateLock, events, addNotification]);

  // 🖨️ Reimprimir Fecho do Dia para qualquer data
  const handleReprintFechoDia = useCallback(async (targetDate: string) => {
    if (!targetDate) {
      addNotification('warning', 'Selecione uma data válida.');
      return;
    }
    setFechoReprintLoading(true);
    try {
      addNotification('info', `A preparar relatório de fecho de ${targetDate}...`);
      console.log('[REPRINT FECHO] Data seleccionada:', targetDate);

      // 1. Buscar fecho do dia
      const { data: fecho, error: fechoError } = await supabase
        .from('cash_flow')
        .select('id, amount, description, closed_by, created_at')
        .eq('category', 'FECHO_CAIXA')
        .eq('data_contabil', targetDate)
        .maybeSingle();

      console.log('[REPRINT FECHO] Fecho encontrado:', fecho, 'Erro:', fechoError);

      if (!fecho) {
        addNotification('warning', `Não existe fecho registado para ${targetDate}.`);
        setFechoReprintLoading(false);
        return;
      }

      // 2. Buscar turnos do dia
      const { data: shiftsData } = await supabase
        .from('pos_shift_records')
        .select('*')
        .eq('data_contabil', targetDate)
        .order('opened_at', { ascending: true });

      console.log('[REPRINT FECHO] Turnos encontrados:', shiftsData?.length || 0);
      const shifts = shiftsData || [];

      // 3. Buscar todas as vendas do dia
      let allOrders: any[] = [];
      const { data: ordersByDataContabil } = await supabase
        .from('orders')
        .select('id, total_amount, payment_method, status, created_at, table_id, invoice_number, shift_id')
        .eq('data_contabil', targetDate)
        .in('status', ['closed', 'paid'])
        .order('created_at', { ascending: false });

      if (ordersByDataContabil && ordersByDataContabil.length > 0) {
        allOrders = ordersByDataContabil;
      } else {
        const { data: ordersByDate } = await supabase
          .from('orders')
          .select('id, total_amount, payment_method, status, created_at, table_id, invoice_number, shift_id')
          .in('status', ['closed', 'paid'])
          .gte('created_at', targetDate + 'T00:00:00')
          .lte('created_at', targetDate + 'T23:59:59')
          .order('created_at', { ascending: false });
        allOrders = ordersByDate || [];
      }

      console.log('[REPRINT FECHO] Total vendas:', allOrders.length);

      // 4. Buscar produtos vendidos
      const orderIds = allOrders.map((o: any) => o.id);
      let allProductsMap: Record<string, { name: string; quantity: number; total: number }> = {};
      if (orderIds.length > 0) {
        const { data: oiData } = await supabase
          .from('order_items')
          .select('quantity, total_price, products!fk_order_items_product(name)')
          .in('order_id', orderIds);
        if (oiData && oiData.length > 0) {
          oiData.forEach((item: any) => {
            const name = item.products?.name || 'Produto';
            if (!allProductsMap[name]) allProductsMap[name] = { name, quantity: 0, total: 0 };
            allProductsMap[name].quantity += Number(item.quantity) || 0;
            allProductsMap[name].total += Number(item.total_price) || 0;
          });
        }
      }
      const allProductsSold = Object.values(allProductsMap).sort((a, b) => b.total - a.total);

      // 5. Função auxiliar: breakdown de vendas
      const getBreakdown = (orders: any[]) => {
        const bd: Record<string, { count: number; total: number }> = {};
        orders.forEach((o: any) => {
          const m = o.payment_method || 'OUTROS';
          if (!bd[m]) bd[m] = { count: 0, total: 0 };
          bd[m].count++;
          bd[m].total += Number(o.total_amount) || 0;
        });
        return bd;
      };

      // 5b. Função auxiliar: produtos vendidos de um conjunto de orders
      const getProductsForOrders = async (orderIds: string[]): Promise<{ name: string; quantity: number; total: number }[]> => {
        if (orderIds.length === 0) return [];
        const { data: oiData } = await supabase
          .from('order_items')
          .select('quantity, total_price, products!fk_order_items_product(name)')
          .in('order_id', orderIds);
        if (!oiData || oiData.length === 0) return [];
        const agg: Record<string, { name: string; quantity: number; total: number }> = {};
        oiData.forEach((item: any) => {
          const name = item.products?.name || 'Produto';
          if (!agg[name]) agg[name] = { name, quantity: 0, total: 0 };
          agg[name].quantity += Number(item.quantity) || 0;
          agg[name].total += Number(item.total_price) || 0;
        });
        return Object.values(agg).sort((a, b) => b.total - a.total);
      };

      // 6. Gerar secção HTML por turno (com produtos)
      const shiftSectionsHtml: string[] = [];
      for (const shift of shifts) {
        const shiftOrders = allOrders.filter((o: any) => o.shift_id === shift.id);
        const shiftTotal = shiftOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
        const shiftBd = getBreakdown(shiftOrders);
        const shiftBdEntries = Object.entries(shiftBd);
        const shiftLabel = shift.shift_type === 'MORNING' ? 'TURNO DA MANHÃ' : 'TURNO DA TARDE';
        const shiftStatus = shift.status === 'CLOSED' ? 'FECHADO' : 'ABERTO';
        const shiftProductIds = shiftOrders.map((o: any) => o.id);
        const shiftProducts = await getProductsForOrders(shiftProductIds);

        shiftSectionsHtml.push(`
          <p style="margin: 6px 0 2px; font-size: 11px; font-weight: bold; text-decoration: underline;">${shiftLabel} (${shiftStatus})</p>
          <p style="margin: 1px 0; font-size: 10px;">Aberto por: ${shift.opened_by || '-'}</p>
          ${shift.closed_by ? `<p style="margin: 1px 0; font-size: 10px;">Fechado por: ${shift.closed_by}</p>` : ''}
          <p style="margin: 1px 0; font-size: 10px;">Vendas: ${shiftOrders.length} • Total: <strong>${shiftTotal.toLocaleString('pt-AO')} Kz</strong></p>
          ${shiftBdEntries.length > 0 ? `
            <p style="margin: 2px 0 1px; font-size: 10px; font-weight: bold;">Modalidades:</p>
            ${shiftBdEntries.map(([m, d]) => `<p style="margin: 1px 0; font-size: 10px;">  ${m}: ${d.total.toLocaleString('pt-AO')} Kz (${d.count}x)</p>`).join('')}
          ` : '<p style="margin: 1px 0; font-size: 10px;">Sem vendas neste turno</p>'}
          ${shift.opening_amount != null ? `<p style="margin: 1px 0; font-size: 10px;">Abertura caixa: ${Number(shift.opening_amount).toLocaleString('pt-AO')} Kz</p>` : ''}
          ${shift.closing_amount != null ? `<p style="margin: 1px 0; font-size: 10px;">Fecho caixa: ${Number(shift.closing_amount).toLocaleString('pt-AO')} Kz</p>` : ''}
          ${shift.expected_amount != null ? `<p style="margin: 1px 0; font-size: 10px;">Esperado: ${Number(shift.expected_amount).toLocaleString('pt-AO')} Kz</p>` : ''}
          ${shiftProducts.length > 0 ? `
            <p style="margin: 2px 0 1px; font-size: 10px; font-weight: bold;">Produtos vendidos:</p>
            ${shiftProducts.map(p => `<p style="margin: 1px 0; font-size: 10px;">  ${p.name}: ${p.quantity}x = ${p.total.toLocaleString('pt-AO')} Kz</p>`).join('')}
          ` : ''}
        `);
      }
      const shiftSections = shiftSectionsHtml.join('<hr style="border: 1px dotted #999; margin: 6px 0;">');

      // 7. Breakdown geral
      const totalBd = getBreakdown(allOrders);
      const totalBdEntries = Object.entries(totalBd);
      const totalAmount = allOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

      // 8. HTML final
      const html = `
        <html>
          <head><title>Reimpressão - Fecho do Dia ${targetDate}</title></head>
          <body style="font-family: monospace; padding: 20px; max-width: 320px; margin: 0 auto; color: #000; background: #fff;">
            <h2 style="text-align: center; margin-bottom: 2px; font-size: 16px;">TASCA DO VEREDA</h2>
            <h3 style="text-align: center; margin-top: 0; font-size: 13px;">FECHO DO DIA (REIMPRESSÃO)</h3>
            <hr style="border: 1px dashed #000; margin: 8px 0;">
            <p style="margin: 2px 0; font-size: 11px;"><strong>Data:</strong> ${targetDate}</p>
            <p style="margin: 2px 0; font-size: 11px;"><strong>Operador Fecho:</strong> ${fecho.closed_by || 'Sistema'}</p>
            <p style="margin: 2px 0; font-size: 11px;"><strong>Total Vendas:</strong> ${allOrders.length}</p>
            <hr style="border: 1px dashed #000; margin: 8px 0;">

            ${shifts.length > 0 ? `
              <p style="margin: 4px 0 2px; font-size: 12px; font-weight: bold;">RESUMO POR TURNO</p>
              ${shiftSections}
              <hr style="border: 1px dashed #000; margin: 8px 0;">
            ` : ''}

            <p style="margin: 4px 0; font-size: 11px; font-weight: bold;">RESUMO GERAL — MODALIDADES</p>
            ${totalBdEntries.length === 0 ? '<p style="margin: 2px 0; font-size: 11px;">Sem vendas</p>' : totalBdEntries.map(([m, d]) => `
              <p style="margin: 2px 0; font-size: 11px;">${m}: <strong>${d.total.toLocaleString('pt-AO')} Kz</strong> (${d.count}x)</p>
            `).join('')}
            <hr style="border: 1px dashed #000; margin: 8px 0;">
            <p style="margin: 4px 0; font-size: 11px; font-weight: bold;">TOTAL DO DIA</p>
            <p style="margin: 2px 0; font-size: 14px; font-weight: bold;">${totalAmount.toLocaleString('pt-AO')} Kz</p>

            ${allProductsSold.length > 0 ? `
              <hr style="border: 1px dashed #000; margin: 8px 0;">
              <p style="margin: 4px 0; font-size: 11px; font-weight: bold;">PRODUTOS VENDIDOS (TOTAL)</p>
              ${allProductsSold.map(p => `
                <p style="margin: 2px 0; font-size: 11px;">${p.name}: ${p.quantity}x = <strong>${p.total.toLocaleString('pt-AO')} Kz</strong></p>
              `).join('')}
            ` : ''}

            <hr style="border: 1px dashed #000; margin: 8px 0;">
            <p style="text-align: center; margin-top: 16px; font-size: 11px;">__________________________<br>Assinatura Admin</p>
            <p style="text-align: center; font-size: 9px; margin-top: 12px;">Reimpresso em ${new Date().toLocaleString('pt-AO')} • Tasca do Vereda POS</p>
          </body>
        </html>
      `;

      console.log('[REPRINT FECHO] HTML gerado, tamanho:', html.length);

      setFechoReprintHtml(html);
      setIsFechoPreviewOpen(true);
      setIsFechoReprintOpen(false);
      addNotification('success', `Relatório de fecho de ${targetDate} pronto para impressão!`);
    } catch (err) {
      console.error('[POS] Erro ao reimprimir fecho:', err);
      addNotification('error', 'Erro ao gerar relatório de fecho.');
    } finally {
      setFechoReprintLoading(false);
    }
  }, [addNotification]);

  // 🖥️ AUTO-ABRIR ECRÃ DO CLIENTE no Electron ao carregar o POS
  // (movido para depois de handleOpenCustomerDisplay)

  const handleOpenCustomerDisplay = async (targetTableId?: number | any) => {
    console.log('[CUSTOMER-DISPLAY] handleOpenCustomerDisplay chamado, targetTableId:', targetTableId);
    const target = typeof targetTableId === 'number' ? targetTableId : (activeTableId || 0);
    const baseUrl = window.location.origin + window.location.pathname;
    
    // Enviar config via BroadcastChannel
    const establishmentId = localStorage.getItem('establishment_id') || localStorage.getItem('tasca_vered_id') || '';
    const supabaseUrl = localStorage.getItem('SUPABASE_URL') || '';
    const supabaseKey = localStorage.getItem('SUPABASE_ANON_KEY') || '';
    
    const channel = new BroadcastChannel('customer_display_config');
    channel.postMessage({ establishmentId, supabaseUrl, supabaseKey });
    channel.close();
    
    const url = `${baseUrl}?v=${Date.now()}#/customer-display/${target}`;
    
    // Tentar detectar segundo ecrã via Screen Details API (Chrome 100+)
    let windowLeft = 0;
    let windowTop = 0;
    let windowWidth = screen.availWidth;
    let windowHeight = screen.availHeight;
    
    try {
      if ('getScreenDetails' in window) {
        const screenDetails = await (window as any).getScreenDetails();
        const screens = screenDetails.screens || [];
        // Procurar ecrã diferente do actual
        const secondScreen = screens.find((s: any) => !s.isPrimary) || screens.find((s: any) => s.left !== 0 || s.top !== 0);
        if (secondScreen) {
          windowLeft = secondScreen.left || secondScreen.availLeft || 0;
          windowTop = secondScreen.top || secondScreen.availTop || 0;
          windowWidth = secondScreen.width || secondScreen.availWidth || screen.availWidth;
          windowHeight = secondScreen.height || secondScreen.availHeight || screen.availHeight;
        }
      } else {
        // Fallback: mover para a direita do ecrã principal (onde tipicamente está o 2º monitor)
        windowLeft = screen.availWidth;
        windowTop = 0;
      }
    } catch (e) {
      // Se a API falhar ou for negada, fallback para posição à direita
      windowLeft = screen.availWidth;
      windowTop = 0;
    }
    
    const features = `width=${windowWidth},height=${windowHeight},left=${windowLeft},top=${windowTop},menubar=no,toolbar=no,location=no,status=no,scrollbars=no`;
    const winName = `VeredaCustomerDisplay_${Date.now()}`;
    const newWindow = window.open(url, winName, features);
    
    if (newWindow) {
      // Tentar mover a janela (funciona na maioria dos browsers para popups)
      try {
        newWindow.moveTo(windowLeft, windowTop);
        newWindow.resizeTo(windowWidth, windowHeight);
      } catch (e) { /* permissões podem bloquear */ }
    }
    
    addNotification('info', `Monitor do Cliente para Mesa ${target} ativo no 2º ecrã.`);
  };

  // 🖥️ AUTO-ABRIR ECRÃ DO CLIENTE no Electron ao carregar o POS
  useEffect(() => {
    const isElectron = typeof window !== 'undefined' && (
      (window as any).electronAPI ||
      navigator.userAgent.toLowerCase().includes('electron')
    );
    if (!isElectron) return;
    if (customerDisplayAutoOpened) return;

    const timer = setTimeout(() => {
      if (customerDisplayAutoOpened) return;
      customerDisplayAutoOpened = true;
      console.log('[AUTO-DISPLAY] A chamar handleOpenCustomerDisplay(0)...');
      handleOpenCustomerDisplay(0);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleCashClosingClick = useCallback(async () => {
    try {
      console.log('[FECHO CAIXA] 🚀 Iniciando handleCashClosingClick...');
      
      // 🔥 Corrigido: usar UTC + offset Luanda para evitar double-offset
      // Antes: new Date() já é local (UTC+1) + adiciona +1h = double-offset
      // Agora: getUTCHours() é sempre UTC, depois adiciona offset Luanda
      const now = new Date();
      const utcHour = now.getUTCHours();
      const currentHour = (utcHour + 1) % 24; // Luanda = UTC+1
      
      // 🔥 Determinar o dia comercial a fechar baseado no horário
      // Turno: 05:00 às 04:59 (24h)
      let closingDate;
      if (currentHour >= 5) {
        // Depois das 05:00 = fecha o dia de HOJE (em Luanda)
        const luandaDate = new Date(now.getTime() + (1 * 60 * 60 * 1000));
        closingDate = luandaDate.toISOString().split('T')[0];
        console.log('[FECHO CAIXA] 📅 Fechando o dia de HOJE:', closingDate);
      } else {
        // Antes das 05:00 = fecha o dia de ONTEM (em Luanda)
        const luandaYesterday = new Date(now.getTime() + (1 * 60 * 60 * 1000));
        luandaYesterday.setDate(luandaYesterday.getUTCDate() - 1);
        closingDate = luandaYesterday.toISOString().split('T')[0];
        console.log('[FECHO CAIXA] 📅 Fechando o dia de ONTEM:', closingDate);
      }
      
      console.log('[FECHO CAIXA] Horário atual:', currentHour, 'h');
      
      const { data: allOrders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('data_contabil', closingDate)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[FECHO CAIXA] ❌ Erro ao buscar vendas:', error);
        addNotification('error', 'Erro ao buscar dados do fecho.');
        return;
      }

      console.log('[FECHO CAIXA] Total de vendas encontradas:', allOrders?.length || 0);

      const validStatuses = ['closed', 'paid'];
      const todayOrders = (allOrders ?? []).filter((o: any) => validStatuses.includes(o.status));

      console.log('[FECHO CAIXA] Vendas fechadas (closed/paid):', todayOrders.length);

      // � SOLUÇÃO 3: Aviso se não houver vendas fechadas
      if (todayOrders.length === 0) {
        console.log('[FECHO CAIXA] ⚠️  Nenhuma venda fechada encontrada');
        addNotification('warning', 'Nenhuma venda fechada encontrada para esta data. Verifique se há vendas pendentes antes de fechar o caixa.');
        // Não retorna, permite fecho mesmo assim mas com aviso
      }

      let formattedOrders = todayOrders.map((order: any) => ({
        id: order.id,
        invoiceNumber: order.invoice_number || `INV-${order.id?.slice(-6)}`,
        tableId: order.table_id,
        total: parseFloat(order.total_amount ?? order.total ?? 0) || 0,
        paymentMethod: order.payment_method,
        timestamp: order.created_at,
        items: [],
        status: order.status || 'closed',
        type: order.type || 'NORMAL',
        taxTotal: order.tax_total || 0,
        profit: order.profit || 0
      }));

      let totalGeral = formattedOrders.reduce((sum, o) => sum + o.total, 0);
      
      // Verificar se há vendas no localStorage não sincronizadas
      console.log('[DEBUG] activeOrders count:', activeOrders.length);
      let localClosedOrders = activeOrders.filter((order: any) => {
        const orderDate = new Date(order.created_at || order.timestamp);
        const orderDateStr = orderDate.toISOString().split('T')[0];
        const isSameDate = orderDateStr === closingDate;
        const isClosed = ['closed', 'paid'].includes(order.status);
        console.log('[DEBUG] local order:', order.id, 'date:', orderDateStr, 'closing:', closingDate, 'same:', isSameDate, 'status:', order.status, 'total:', order.total);
        return isSameDate && isClosed;
      });
      
      // Se activeOrders vazio, tentar backup de vendas fechadas
      if (localClosedOrders.length === 0) {
        try {
          const closedOrdersBackup = JSON.parse(localStorage.getItem('vereda_closed_orders_backup') || '[]');
          console.log('[DEBUG] Backup closed orders:', closedOrdersBackup.length);
          localClosedOrders = closedOrdersBackup.filter((order: any) => {
            const orderDate = new Date(order.created_at || order.timestamp || order.closed_at);
            const orderDateStr = orderDate.toISOString().split('T')[0];
            return orderDateStr === closingDate;
          });
          console.log('[DEBUG] Backup filtered:', localClosedOrders.length);
        } catch (e) {
          console.error('[DEBUG] Erro ao ler backup:', e);
        }
      }
      
      // Se há vendas locais com total maior, usar localStorage
      const localTotal = localClosedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      console.log('[DEBUG] localTotal:', localTotal, 'supabaseTotal:', totalGeral);
      if (localTotal > totalGeral) {
        console.log('[FECHO CAIXA] Usando vendas do localStorage:', localTotal, 'vs Supabase:', totalGeral);
        formattedOrders = localClosedOrders.map((order: any) => ({
          id: order.id,
          invoiceNumber: order.invoiceNumber || `INV-${order.id?.slice(-6)}`,
          tableId: order.tableId,
          total: order.total || 0,
          paymentMethod: order.paymentMethod || 'NUMERARIO',
          timestamp: order.created_at || order.timestamp,
          items: [],
          status: order.status,
          type: order.type || 'NORMAL',
          taxTotal: order.taxTotal || 0,
          profit: order.profit || 0
        }));
        totalGeral = localTotal;
        
      }
      
      // Calcular paymentBreakdown com formattedOrders final (depois do fallback)
      const paymentBreakdown: { [key: string]: { count: number; total: number } } = {};
      formattedOrders.forEach(order => {
        const method = order.paymentMethod || 'OUTROS';
        if (!paymentBreakdown[method]) paymentBreakdown[method] = { count: 0, total: 0 };
        paymentBreakdown[method].count++;
        paymentBreakdown[method].total += order.total;
      });
      console.log('[FECHO CAIXA] Breakdown final:', paymentBreakdown);
      
      console.log('[FECHO CAIXA] Total geral calculado:', totalGeral, 'Kz');
      console.log('[FECHO CAIXA] Settings:', settings);
      console.log('[FECHO CAIXA] Operador:', currentUser?.name || 'Operador');

      // 🔒 SOLUÇÃO 2: Verificar se já existe fecho para a data
      const { data: existingFecho, error: checkError } = await supabase
        .from('cash_flow')
        .select('id, amount, created_at')
        .eq('category', 'FECHO_CAIXA')
        .eq('data_contabil', closingDate)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('[FECHO CAIXA] Erro ao verificar fecho existente:', checkError);
      }

      // 🔒 Buscar items do Supabase com JOIN nos products
      let finalSoldProducts: any[] = [];
      const orderIds = todayOrders.map((o: any) => o.id);
      if (orderIds.length > 0) {
        const { data: itemsData } = await supabase
          .from('order_items')
          .select(`quantity, unit_price, total_price, products:product_id (name)`)
          .in('order_id', orderIds);
        if (itemsData && itemsData.length > 0) {
          const productMap = new Map<string, { name: string; quantity: number; total: number }>();
          itemsData.forEach((item: any) => {
            const name = item.products?.name || 'Produto';
            const qty = item.quantity || 1;
            const total = parseFloat(item.total_price || (item.unit_price * qty) || 0);
            if (name !== 'Produto' && qty > 0) {
              if (productMap.has(name)) {
                const p = productMap.get(name)!;
                p.quantity += qty;
                p.total += total;
              } else {
                productMap.set(name, { name, quantity: qty, total });
              }
            }
          });
          finalSoldProducts = Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity);
        }
      }
      
      // Fallback: se Supabase não retornou nada, usar activeOrders ou backup (dev/teste)
      if (finalSoldProducts.length === 0) {
        const productMap = new Map<string, { name: string; quantity: number; total: number }>();
        let ordersToProcess = activeOrders.filter((order: any) => {
          const orderDate = new Date(order.created_at || order.timestamp);
          const orderDateStr = orderDate.toISOString().split('T')[0];
          return orderDateStr === closingDate && ['closed', 'paid'].includes(order.status);
        });
        
        // Se activeOrders vazio, usar backup de vendas fechadas
        if (ordersToProcess.length === 0) {
          try {
            const closedOrdersBackup = JSON.parse(localStorage.getItem('vereda_closed_orders_backup') || '[]');
            ordersToProcess = closedOrdersBackup.filter((order: any) => {
              const orderDate = new Date(order.created_at || order.timestamp || order.closed_at);
              const orderDateStr = orderDate.toISOString().split('T')[0];
              return orderDateStr === closingDate;
            });
            console.log('[DEBUG] Produtos - usando backup:', ordersToProcess.length);
          } catch (e) {
            console.error('[DEBUG] Erro ao ler backup para produtos:', e);
          }
        }
        
        ordersToProcess.forEach((order: any) => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
              const name = item.dish?.name || item.dish?.nome || item.name || item.product_name || item.productName || item.dish_name || item.dishName || item.title || 'Produto';
              const qty = item.quantity || item.qty || 1;
              const price = item.unit_price || item.unitPrice || item.price || 0;
              if (name !== 'Produto') {
                if (productMap.has(name)) {
                  const p = productMap.get(name)!;
                  p.quantity += qty;
                  p.total += qty * price;
                } else {
                  productMap.set(name, { name, quantity: qty, total: qty * price });
                }
              }
            });
          }
        });
        finalSoldProducts = Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity);
      }

      // 🔒 Buscar turnos do dia para breakdown por turno
      const { data: dayShifts } = await supabase
        .from('pos_shift_records')
        .select('id, shift_type, opened_by, closed_by, status, opening_amount, closing_amount, expected_amount')
        .eq('data_contabil', closingDate);

      const morningShift = (dayShifts || []).find((s: any) => s.shift_type === 'MORNING');
      const afternoonShift = (dayShifts || []).find((s: any) => s.shift_type === 'AFTERNOON');

      async function getShiftData(shift: any): Promise<ShiftCloseData> {
        if (!shift) return { shift: null, sales: 0, ordersCount: 0, paymentBreakdown: {}, soldProducts: [] };
        const { data: shiftOrders } = await supabase
          .from('orders')
          .select('id, total_amount, payment_method')
          .eq('shift_id', shift.id)
          .in('status', ['closed', 'paid']);
        const orders = shiftOrders || [];
        const sales = orders.reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0);
        const bd: { [key: string]: { count: number; total: number } } = {};
        orders.forEach((o: any) => {
          const m = o.payment_method || 'OUTROS';
          if (!bd[m]) bd[m] = { count: 0, total: 0 };
          bd[m].count++;
          bd[m].total += Number(o.total_amount) || 0;
        });
        const sOrderIds = orders.map((o: any) => o.id);
        let sProducts: { name: string; quantity: number; total: number }[] = [];
        if (sOrderIds.length > 0) {
          const { data: sItems } = await supabase
            .from('order_items')
            .select('quantity, total_price, products!fk_order_items_product(name)')
            .in('order_id', sOrderIds);
          if (sItems && sItems.length > 0) {
            const pMap = new Map<string, { name: string; quantity: number; total: number }>();
            sItems.forEach((item: any) => {
              const name = item.products?.name || 'Produto';
              const qty = Number(item.quantity) || 0;
              const tot = Number(item.total_price) || 0;
              if (pMap.has(name)) {
                const p = pMap.get(name)!;
                p.quantity += qty;
                p.total += tot;
              } else {
                pMap.set(name, { name, quantity: qty, total: tot });
              }
            });
            sProducts = Array.from(pMap.values()).sort((a, b) => b.quantity - a.quantity);
          }
        }
        return { shift, sales, ordersCount: orders.length, paymentBreakdown: bd, soldProducts: sProducts };
      }

      const morningData = await getShiftData(morningShift);
      const afternoonData = await getShiftData(afternoonShift);

      // 🔒 SOLUÇÃO 1: Modal de confirmação antes de executar
      setCashClosingData({
        closingDate,
        totalGeral,
        todayOrdersCount: todayOrders.length,
        currentHour,
        existingFecho,
        paymentBreakdown,
        soldProducts: finalSoldProducts,
        morning: morningData,
        afternoon: afternoonData
      });
      setIsCashClosingConfirmOpen(true);
      
    } catch (err) {
      addNotification('error', 'Falha ao preparar fecho. Tente novamente.');
    }
  }, [settings, currentUser, addNotification]);

  // 🔥 FUNÇÃO DE LOG REMOTO para diagnóstico
  const logFechoDiagnostico = async (step: string, data: any, error?: any) => {
    try {
      await supabase.from('fecho_diagnostico_logs').insert({
        step,
        data: JSON.stringify(data),
        error: error ? JSON.stringify(error) : null,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      // Silencioso - não queremos que o log falhe a operação
    }
  };

  // 🔒 Função que executa o fecho após confirmação
  const executeCashClosing = useCallback(async () => {
    if (!cashClosingData) {
      await logFechoDiagnostico('CASH_CLOSING_NO_DATA', { cashClosingData });
      return;
    }

    try {
      const { closingDate } = cashClosingData;

      console.log('[FECHO CAIXA] Executando fecho após confirmação...');
      await logFechoDiagnostico('CASH_CLOSING_START', { closingDate, cashClosingData });
      
      // Buscar orders novamente para ter dados atualizados
      const { data: allOrders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('data_contabil', closingDate)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[FECHO CAIXA] ❌ Erro ao buscar vendas:', error);
        await logFechoDiagnostico('ORDERS_FETCH_ERROR', { closingDate }, error);
        addNotification('error', 'Erro ao buscar dados do fecho.');
        return;
      }

      await logFechoDiagnostico('ORDERS_FETCH_SUCCESS', { closingDate, count: allOrders?.length || 0 });

      const validStatuses = ['closed', 'paid'];
      const todayOrders = (allOrders ?? []).filter((o: any) => validStatuses.includes(o.status));
      
      await logFechoDiagnostico('ORDERS_FILTERED', { closingDate, total: todayOrders.length, finalTotal: todayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0) });

      let formattedOrders = todayOrders.map((order: any) => ({
        id: order.id,
        invoiceNumber: order.invoice_number || `INV-${order.id?.slice(-6)}`,
        tableId: order.table_id,
        total: parseFloat(order.total_amount ?? order.total ?? 0) || 0,
        paymentMethod: order.payment_method,
        timestamp: order.created_at,
        items: [],
        status: order.status || 'closed',
        type: order.type || 'NORMAL',
        taxTotal: order.tax_total || 0,
        profit: order.profit || 0
      }));

      let finalTotal = formattedOrders.reduce((sum, o) => sum + o.total, 0);
      
      // Fallback para localStorage se total for menor
      const localClosedOrders = activeOrders.filter((order: any) => {
        const orderDate = new Date(order.created_at || order.timestamp);
        const orderDateStr = orderDate.toISOString().split('T')[0];
        return orderDateStr === closingDate && ['closed', 'paid'].includes(order.status);
      });
      const localTotal = localClosedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      if (localTotal > finalTotal) {
        console.log('[FECHO CAIXA] execute - Usando localStorage:', localTotal, 'vs Supabase:', finalTotal);
        formattedOrders = localClosedOrders.map((order: any) => ({
          id: order.id,
          invoiceNumber: order.invoiceNumber || `INV-${order.id?.slice(-6)}`,
          tableId: order.tableId,
          total: order.total || 0,
          paymentMethod: order.paymentMethod || 'NUMERARIO',
          timestamp: order.created_at || order.timestamp,
          items: [],
          status: order.status,
          type: order.type || 'NORMAL',
          taxTotal: order.taxTotal || 0,
          profit: order.profit || 0
        }));
        finalTotal = localTotal;
      }
      
      // 🔒 Calcular breakdown por modalidade de pagamento para impressão
      const paymentBreakdown: { [key: string]: { count: number; total: number } } = {};
      formattedOrders.forEach(order => {
        const method = order.paymentMethod || 'OUTROS';
        if (!paymentBreakdown[method]) {
          paymentBreakdown[method] = { count: 0, total: 0 };
        }
        paymentBreakdown[method].count++;
        paymentBreakdown[method].total += order.total;
      });
      
      // 🔒 Buscar items do Supabase com JOIN nos products
      let soldProducts: any[] = [];
      const orderIds = todayOrders.map((o: any) => o.id);
      if (orderIds.length > 0) {
        const { data: itemsData } = await supabase
          .from('order_items')
          .select(`quantity, unit_price, total_price, products:product_id (name)`)
          .in('order_id', orderIds);
        if (itemsData && itemsData.length > 0) {
          const productMap = new Map<string, { name: string; quantity: number; total: number }>();
          itemsData.forEach((item: any) => {
            const name = item.products?.name || 'Produto';
            const qty = item.quantity || 1;
            const total = parseFloat(item.total_price || (item.unit_price * qty) || 0);
            if (name !== 'Produto' && qty > 0) {
              if (productMap.has(name)) {
                const p = productMap.get(name)!;
                p.quantity += qty;
                p.total += total;
              } else {
                productMap.set(name, { name, quantity: qty, total });
              }
            }
          });
          soldProducts = Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity);
        }
      }
      // Fallback para activeOrders ou backup (dev/teste)
      if (soldProducts.length === 0) {
        const productMap = new Map<string, { name: string; quantity: number; total: number }>();
        let ordersToProcess = activeOrders.filter((order: any) => {
          const orderDate = new Date(order.created_at || order.timestamp);
          const orderDateStr = orderDate.toISOString().split('T')[0];
          return orderDateStr === closingDate && ['closed', 'paid'].includes(order.status);
        });
        
        if (ordersToProcess.length === 0) {
          try {
            const closedOrdersBackup = JSON.parse(localStorage.getItem('vereda_closed_orders_backup') || '[]');
            ordersToProcess = closedOrdersBackup.filter((order: any) => {
              const orderDate = new Date(order.created_at || order.timestamp || order.closed_at);
              const orderDateStr = orderDate.toISOString().split('T')[0];
              return orderDateStr === closingDate;
            });
            console.log('[DEBUG] Execute - usando backup:', ordersToProcess.length);
          } catch (e) {
            console.error('[DEBUG] Execute - erro ao ler backup:', e);
          }
        }
        
        ordersToProcess.forEach((order: any) => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
              const name = item.dish?.name || item.dish?.nome || item.name || item.product_name || item.productName || item.dish_name || item.dishName || item.title || 'Produto';
              const qty = item.quantity || item.qty || 1;
              const price = item.unit_price || item.unitPrice || item.price || 0;
              if (name !== 'Produto') {
                if (productMap.has(name)) {
                  const p = productMap.get(name)!;
                  p.quantity += qty;
                  p.total += qty * price;
                } else {
                  productMap.set(name, { name, quantity: qty, total: qty * price });
                }
              }
            });
          }
        });
        soldProducts = Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity);
      }

      console.log('[FECHO CAIXA] Chamando printCashClosing com', soldProducts.length, 'produtos...');
      // 🔒 Passar true para hasExecuted pois este é o fecho real
      printCashClosing(formattedOrders, settings, currentUser?.name || 'Operador', paymentBreakdown, closingDate, soldProducts, true, {
        morning: cashClosingData?.morning || null,
        afternoon: cashClosingData?.afternoon || null
      });
      console.log('[FECHO CAIXA] printCashClosing chamado com sucesso');

      // 🔥 REGISTRAR FECHO DE CAIXA NA TABELA CASH_FLOW
      console.log('[FECHO CAIXA] Registrando fecho na tabela cash_flow...');
      await logFechoDiagnostico('CASHFLOW_INSERT_START', { closingDate, finalTotal, ordersCount: todayOrders.length });
      try {
        // 🔒 VERIFICAÇÃO ROBUSTA: Buscar TODOS os fechos para a data
        const { data: allFechos, error: checkError } = await supabase
          .from('cash_flow')
          .select('id, amount, created_at')
          .eq('category', 'FECHO_CAIXA')
          .eq('data_contabil', closingDate);

        if (checkError) {
          console.error('[FECHO CAIXA] Erro ao verificar fechos existentes:', checkError);
        }

        // 🔒 DETECTAR DUPLICAÇÕES
        if (allFechos && allFechos.length > 1) {
          console.error('[FECHO CAIXA] ❌ DUPLICAÇÃO DETECTADA! Encontrados', allFechos.length, 'fechos para', closingDate);
          await logFechoDiagnostico('CASHFLOW_DUPLICATE_DETECTED', { closingDate, fechos: allFechos });
          allFechos.forEach(fecho => {
            console.error(`   - ID: ${fecho.id} | Valor: ${fecho.amount} Kz | Criado em: ${fecho.created_at}`);
          });
          addNotification('error', `Erro: Já existem ${allFechos.length} fechos para esta data. Contacte o administrador.`);
          return;
        }

        if (allFechos && allFechos.length === 1) {
          console.log('[FECHO CAIXA] Atualizando fecho existente:', allFechos[0].id);
          const { error: updateError } = await supabase
            .from('cash_flow')
            .update({
              amount: finalTotal,
              description: `Fecho do Dia atualizado - ${todayOrders.length} vendas`,
              data_contabil: closingDate,
              closed_by: currentUser?.name || 'Operador',
              updated_at: new Date().toISOString()
            })
            .eq('id', allFechos[0].id);

          if (updateError) {
            console.error('[FECHO CAIXA] ❌ Erro ao atualizar fecho:', updateError);
            await logFechoDiagnostico('CASHFLOW_UPDATE_ERROR', { closingDate, finalTotal, fechoId: allFechos[0].id }, updateError);
            addNotification('error', 'Erro ao atualizar fecho do dia.');
          } else {
            console.log('[FECHO CAIXA] ✅ Fecho atualizado com sucesso:', finalTotal);
            await logFechoDiagnostico('CASHFLOW_UPDATE_SUCCESS', { closingDate, finalTotal, fechoId: allFechos[0].id });
          }
        } else {
          console.log('[FECHO CAIXA] Criando novo fecho do dia');
          const { error: insertError } = await supabase
            .from('cash_flow')
            .insert({
              amount: finalTotal,
              category: 'FECHO_CAIXA',
              type: 'entrada',
              description: `Fecho do Dia - ${todayOrders.length} vendas`,
              data_contabil: closingDate,
              closed_by: currentUser?.name || 'Operador',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (insertError) {
            console.error('[FECHO CAIXA] ❌ Erro ao inserir fecho:', insertError);
            await logFechoDiagnostico('CASHFLOW_INSERT_ERROR', { closingDate, finalTotal }, insertError);
            if (insertError.code === '23505' || insertError.message?.includes('unique')) {
              console.error('[FECHO CAIXA] ❌ Erro de duplicação no banco - constraint UNIQUE funcionou!');
              addNotification('error', 'Erro: Já existe um fecho do dia para esta data.');
            } else {
              addNotification('error', 'Erro ao criar fecho do dia.');
            }
          } else {
            console.log('[FECHO CAIXA] ✅ Fecho criado com sucesso:', finalTotal);
            await logFechoDiagnostico('CASHFLOW_INSERT_SUCCESS', { closingDate, finalTotal });
          }
        }
      } catch (cashFlowErr) {
        console.error('[FECHO CAIXA] ❌ Erro ao registrar fecho no cash_flow:', cashFlowErr);
        await logFechoDiagnostico('CASHFLOW_CATCH_ERROR', { closingDate, finalTotal }, cashFlowErr);
        addNotification('error', 'Erro ao registrar fecho do dia.');
      }

      await markDayAsClosed(closingDate);
      
      localStorage.setItem(`yesterdayRevenue_${closingDate}`, String(finalTotal));
      localStorage.setItem(`yesterdayRevenueOfficial_${closingDate}`, 'true');
      console.log('[FECHO CAIXA] ✅ Fecho oficial registrado no localStorage:', { date: closingDate, total: finalTotal });
      
      // 🔒 MARCAR FECHO COMO EXECUTADO - permite cancelamento posterior
      setHasCashClosingBeenExecuted(true);
      setDayCloseStatus('closed');
      
      addNotification('success', `Fecho do Dia registado com sucesso! ${todayOrders.length} vendas.`);
      
      // Fechar modal de confirmação (se estiver aberto)
      setIsCashClosingConfirmOpen(false);
      setCashClosingData(null);
      
    } catch (err) {
      const errorDate = cashClosingData?.closingDate || 'unknown';
      console.error('[FECHO CAIXA] ❌ Erro geral no fecho:', err);
      await logFechoDiagnostico('CASH_CLOSING_GENERAL_ERROR', { closingDate: errorDate }, err);
      addNotification('error', 'Falha ao processar fecho. Tente novamente.');
    }
  }, [cashClosingData, settings, currentUser, addNotification]);

  // 🔒 previewCashClosing REMOVIDO — fecho unificado: confirma + grava + imprime num só passo

  // 🔒 Função para CANCELAR um fecho de caixa já efetuado
  const cancelCashClosing = useCallback(async (closingDate: string) => {
    try {
      console.log('[FECHO CAIXA] 🔄 Cancelando fecho do dia:', closingDate);

      // 1. Apagar do cash_flow
      const { error: deleteError } = await supabase
        .from('cash_flow')
        .delete()
        .eq('category', 'FECHO_CAIXA')
        .eq('data_contabil', closingDate);

      if (deleteError) {
        console.error('[FECHO CAIXA] ❌ Erro ao apagar registo do cash_flow:', deleteError);
        addNotification('error', 'Erro ao cancelar fecho de caixa no servidor.');
        return;
      }

      // 2. Limpar localStorage
      localStorage.removeItem(`yesterdayRevenue_${closingDate}`);
      localStorage.removeItem(`yesterdayRevenueOfficial_${closingDate}`);

      // 3. Fechar modal de preview
      setIsPrintPreviewOpen(false);
      setPrintPreviewHtml('');
      setIsCashClosingPreview(false);
      setCashClosingPreviewDate(null);

      addNotification('success', `Fecho do Dia ${closingDate} foi cancelado com sucesso.`);
      console.log('[FECHO CAIXA] ✅ Fecho cancelado:', closingDate);
      setDayCloseStatus('pending');
    } catch (err) {
      console.error('[FECHO CAIXA] ❌ Erro ao cancelar fecho:', err);
      addNotification('error', 'Falha ao cancelar fecho do dia.');
    }
  }, [addNotification]);

  const handleChangePayment = async (method: PaymentMethod) => {
    if (!orderToChangeId) return;
    try {
      // Atualizar diretamente no Supabase (pedidos fechados não estão em activeOrders)
      const { error } = await supabase
        .from('orders')
        .update({ payment_method: method })
        .eq('id', orderToChangeId);

      if (error) {
        console.error('[POS] ❌ Erro ao atualizar pagamento no Supabase:', error);
        addNotification('error', 'Erro ao atualizar método de pagamento.');
        return;
      }

      // Também atualizar localmente caso exista em activeOrders
      updateOrderPaymentMethod(orderToChangeId, method);

      // Refrescar a lista do histórico para mostrar a alteração
      await fetchClosedOrders();

      addNotification('success', 'Método de pagamento atualizado com sucesso.');
    } catch (err) {
      console.error('[POS] ❌ Erro inesperado ao mudar pagamento:', err);
      addNotification('error', 'Erro inesperado ao atualizar pagamento.');
    } finally {
      setIsChangePaymentModalOpen(false);
      setOrderToChangeId(null);
    }
  };

  const handleAddSubAccount = () => {
    const trimmedName = newSubAccountName.trim();
    console.log('[POS] Criando subconta:', { activeTableId, name: trimmedName });
    
    if (!activeTableId || !trimmedName) {
      console.log('[POS] ❌ Dados inválidos para subconta');
      return;
    }
    
    // Criar subconta e obter o ID retornado
    const newOrderId = addSubAccount(activeTableId, trimmedName);
    
    // Ativar a subconta criada imediatamente
    if (newOrderId) {
      setActiveOrder(newOrderId);
    }
    
    // Limpar e fechar modal
    setNewSubAccountName('');
    setIsSubaccountModalOpen(false);
    
    // Notificar sucesso
    addNotification('success', `Subconta "${trimmedName}" criada!`);
    
    console.log('[POS] ✅ Subconta criada com nome:', trimmedName, 'ID:', newOrderId);
  };

  // 🛡️ FUNÇÕES BLINDADAS DE GESTÃO DE SUBCONTAS
  const handleDeleteSubAccount = async (subAccountId: string) => {
    if (!confirm('Tem certeza que deseja apagar esta subconta? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      console.log('[POS] Apagando subconta:', subAccountId);
      setIsFinalizing(true); // Prevenir múltiplos cliques
      
      // 🧹 Remover todos os itens da subconta primeiro para permitir apagar
      let order = useStore.getState().activeOrders.find(o => o.id === subAccountId);
      while (order && order.items.length > 0) {
        removeFromOrder(subAccountId, 0);
        order = useStore.getState().activeOrders.find(o => o.id === subAccountId);
      }

      // 🛡️ SEGURANÇA: Apenas marcar a ordem como cancelada (preservar itens para Dashboard)
      const { error } = await supabase
        .from('orders')
        .update({ status: 'canceled' })
        .eq('id', subAccountId);

      if (error) {
        console.error('[POS] Erro ao cancelar ordem da subconta:', error);
        addNotification('error', 'Erro ao apagar subconta');
        return;
      }

      // Remover subconta da visualização E atualizar estado
      removeSubAccount(subAccountId);
      
      // 🔄 FORÇAR ATUALIZAÇÃO DE ESTADO
      if (activeOrderId === subAccountId) {
        setActiveOrder(null); // Limpar seleção se era a subconta ativa
      }
      
      addNotification('success', 'Subconta apagada com sucesso');
      
    } catch (error) {
      console.error('[POS] Erro ao apagar subconta:', error);
      addNotification('error', 'Erro ao apagar subconta');
    } finally {
      setIsFinalizing(false); // Liberar cliques
    }
  };

  const handleCloseSubAccount = (subAccount: any) => {
    console.log('[POS] Fechando subconta:', subAccount);
    setSelectedSubAccount(subAccount);
    setIsPaymentModalOpen(true);
  };

  const handleTransferTable = () => {
    if (!activeTableId || !transferTargetTableId) return;
    transferTable(activeTableId, transferTargetTableId);
    setIsTransferModalOpen(false);
    setTransferTargetTableId(null);
    setActiveTable(null);
    setActiveOrder(null);
  };

  const handleMergeTables = () => {
    const sourceId = mergeSourceOrderId || activeOrderId;
    if (!sourceId || !mergeTargetOrderId) return;
    if (sourceId === mergeTargetOrderId) return;
    console.log('[MERGE] Juntando order:', sourceId, '→', mergeTargetOrderId);
    mergeOrders(sourceId, mergeTargetOrderId);
    setIsMergeModalOpen(false);
    setMergeTargetOrderId(null);
    setMergeSourceOrderId(null);
    setActiveTable(null);
    setActiveOrder(null);
  };

  const handleAddToOrder = useCallback((dish: Dish, quantity: number = 1) => {
    // 🔥 PEGAR ESTADO ATUAL DO STORE (evita problemas de closure/delay)
    const { activeTableId: currentTableId, activeOrderId: currentOrderId } = useStore.getState();
    
    if (!currentTableId || !dish) {
      console.log('[POS] ❌ Sem mesa ativa ou dish inválido');
      return;
    }
    
    // Se não tem ordem ativa, criar uma nova IMEDIATAMENTE
    if (!currentOrderId) {
      const newOrderId = createNewOrder(currentTableId);
      // Adicionar item IMEDIATAMENTE (sem timeout)
      addToOrder(currentTableId, dish, quantity, '', newOrderId);
    } else {
      // Adicionar à ordem existente
      addToOrder(currentTableId, dish, quantity);
    }
    
    setLastAddedItemId(dish.id);
    setTimeout(() => setLastAddedItemId(null), 500);
  }, [addToOrder, createNewOrder]);

  // 🍳 ENVIAR PEDIDO PARA COZINHA (mostra preview primeiro)
  const handleSendToKitchen = useCallback(() => {
    if (!currentOrder || !currentOrder.items.length) return;

    const kitchenConfig = getKitchenPrintConfig();
    const orderId = currentOrder.id;
    const alreadySent = sentToKitchenMap[orderId] || [];

    // Se as categorias de cozinha não estiverem definidas ou o config estiver desligado,
    // usamos uma aproximação inteligente: incluímos TODOS os produtos no envio para não bloquear o utilizador!
    const kitchenItems = currentOrder.items
      .filter(item => {
        const dish = menu.find(d => d.id === item.dishId) || item.dish;
        if (!dish) return false;
        
        // Se a impressora não estiver ativada, permite o envio de todos os pratos por padrão!
        if (kitchenConfig.kitchenCategories.length > 0) {
          const isKitchenCategory = kitchenConfig.kitchenCategories.includes(dish.category_id || dish.categoryId || '');
          if (!isKitchenCategory) return false;
        }
        
        const prevSent = alreadySent.find(s => s.dishId === item.dishId);
        if (prevSent && prevSent.quantity >= item.quantity) return false;
        return true;
      })
      .map(item => {
        const dish = menu.find(d => d.id === item.dishId) || item.dish!;
        const prevSent = alreadySent.find(s => s.dishId === item.dishId);
        const newQty = prevSent ? item.quantity - prevSent.quantity : item.quantity;
        return {
          dishId: item.dishId,
          name: dish.name,
          quantity: newQty,
          notes: item.notes
        };
      })
      .filter(item => item.quantity > 0);

    if (kitchenItems.length === 0) {
      addNotification('info', 'Todos os items de cozinha já foram enviados.');
      return;
    }

    // Mostrar preview em vez de imprimir directamente
    setKitchenPreviewItems(kitchenItems);
    setIsKitchenPreviewOpen(true);
  }, [currentOrder, menu, sentToKitchenMap, addNotification]);

  // 🍳 CONFIRMAR ENVIO PARA COZINHA (após preview)
  const confirmSendToKitchen = useCallback(() => {
    if (!currentOrder || kitchenPreviewItems.length === 0) return;

    const orderId = currentOrder.id;
    const alreadySent = sentToKitchenMap[orderId] || [];

    // Imprimir ticket
    printKitchenTicket(
      currentOrder.tableId,
      kitchenPreviewItems.map(i => ({ name: i.name, quantity: i.quantity, notes: i.notes })),
      currentOrder.id.slice(-6)
    );

    // Actualizar tracking
    const updatedSent = [...alreadySent];
    kitchenPreviewItems.forEach(item => {
      const existing = updatedSent.find(s => s.dishId === item.dishId);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        updatedSent.push({ dishId: item.dishId, quantity: item.quantity, name: item.name });
      }
    });

    setSentToKitchenMap(prev => ({ ...prev, [orderId]: updatedSent }));
    setIsKitchenPreviewOpen(false);
    setKitchenPreviewItems([]);
    addNotification('success', `🍳 ${kitchenPreviewItems.length} item(s) enviado(s) para a cozinha!`);
    console.log('[POS] 🍳 Enviado para cozinha:', kitchenPreviewItems);
  }, [currentOrder, kitchenPreviewItems, sentToKitchenMap, addNotification]);

  // 🍳 CANCELAR ITEM JÁ ENVIADO PARA COZINHA (imprime ticket de cancelamento)
  const handleRemoveWithKitchenCancel = useCallback((orderId: string, itemIndex: number) => {
    const order = activeOrders.find(o => o.id === orderId);
    if (!order) return;

    const item = order.items[itemIndex];
    if (!item) return;

    const alreadySent = sentToKitchenMap[orderId] || [];
    const sentItem = alreadySent.find(s => s.dishId === item.dishId);
    const dish = menu.find(d => d.id === item.dishId) || item.dish;

    // Remover do carrinho
    removeFromOrder(orderId, itemIndex);

    // Se item já foi enviado para cozinha → imprimir ticket de CANCELAMENTO
    if (sentItem && sentItem.quantity > 0 && dish) {
      const kitchenConfig = getKitchenPrintConfig();
      // Sempre imprime cancelamento se o item já existia na cozinha
      const cancelHtml = `
        <!DOCTYPE html><html><head><title>CANCELAMENTO</title>
          <style>
            @page { margin: 0; size: 80mm auto; }
            body { font-family: 'Courier New', monospace; width: 80mm; padding: 4mm; font-size: 14px; font-weight: 900; color: #000; background: #fff; margin: 0; text-align: center; }
            .cancel-header { font-size: 22px; border: 3px solid #000; padding: 8px; margin: 8px 0; }
            .cancel-item { font-size: 18px; margin: 12px 0; padding: 8px; border: 2px dashed #000; }
            .mesa { font-size: 16px; margin: 8px 0; }
            .footer { font-size: 10px; margin-top: 12px; }
          </style></head><body>
            <div class="cancel-header">*** CANCELAMENTO ***</div>
            <div class="mesa">MESA ${order.tableId || 'BALCAO'}</div>
            <div class="cancel-item">CANCELAR: ${item.quantity}x ${dish.name}</div>
            <div class="footer">${new Date().toLocaleTimeString('pt-AO')} - VEREDA OS</div>
          </body></html>
        `;

        // Imprimir cancelamento via iframe
        const frameId = 'print-frame';
        let printFrame = document.getElementById(frameId) as HTMLIFrameElement;
        if (!printFrame) {
          printFrame = document.createElement('iframe');
          printFrame.id = frameId;
          printFrame.style.position = 'fixed';
          printFrame.style.right = '0';
          printFrame.style.bottom = '0';
          printFrame.style.width = '0';
          printFrame.style.height = '0';
          printFrame.style.border = 'none';
          document.body.appendChild(printFrame);
        }
        const doc = printFrame.contentDocument || printFrame.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(cancelHtml);
          doc.close();
          setTimeout(() => {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
          }, 500);
        }

        addNotification('warning', `🚫 Cancelamento enviado à cozinha: ${item.quantity}x ${dish.name}`);
        console.log('[POS] 🚫 Cancelamento cozinha:', item.quantity, 'x', dish.name);
      }

      // Actualizar tracking
      const updatedSent = alreadySent.filter(s => s.dishId !== item.dishId);
      setSentToKitchenMap(prev => ({ ...prev, [orderId]: updatedSent }));
  }, [activeOrders, menu, sentToKitchenMap, removeFromOrder, addNotification]);

  // 🍳 CANCELAR TODOS OS ITENS JÁ ENVIADOS PARA COZINHA (botão "Cancelar Enviar para Cozinha")
  const handleCancelAllKitchenSends = useCallback((orderId: string) => {
    const order = activeOrders.find(o => o.id === orderId);
    if (!order) return;

    const alreadySent = sentToKitchenMap[orderId] || [];
    if (alreadySent.length === 0) {
      addNotification('info', 'Nenhum item enviado para cozinha.');
      return;
    }

    if (!window.confirm('Cancelar todos os itens enviados para a cozinha?')) return;

    alreadySent.forEach(sent => {
      const item = order.items.find(it => it.dishId === sent.dishId);
      const dish = menu.find(d => d.id === sent.dishId) || item?.dish;
      if (!item || !dish || sent.quantity <= 0) return;

      const cancelHtml = `
        <!DOCTYPE html><html><head><title>CANCELAMENTO</title>
          <style>
            @page { margin: 0; size: 80mm auto; }
            body { font-family: 'Courier New', monospace; width: 80mm; padding: 4mm; font-size: 14px; font-weight: 900; color: #000; background: #fff; margin: 0; text-align: center; }
            .cancel-header { font-size: 22px; border: 3px solid #000; padding: 8px; margin: 8px 0; }
            .cancel-item { font-size: 18px; margin: 12px 0; padding: 8px; border: 2px dashed #000; }
            .mesa { font-size: 16px; margin: 8px 0; }
            .footer { font-size: 10px; margin-top: 12px; }
          </style></head><body>
            <div class="cancel-header">*** CANCELAMENTO ***</div>
            <div class="mesa">MESA ${order.tableId || 'BALCAO'}</div>
            <div class="cancel-item">CANCELAR: ${sent.quantity}x ${dish.name}</div>
            <div class="footer">${new Date().toLocaleTimeString('pt-AO')} - VEREDA OS</div>
          </body></html>
        `;

      const frameId = 'print-frame';
      let printFrame = document.getElementById(frameId) as HTMLIFrameElement;
      if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = frameId;
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = 'none';
        document.body.appendChild(printFrame);
      }
      const doc = printFrame.contentDocument || printFrame.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(cancelHtml);
        doc.close();
        setTimeout(() => {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        }, 500);
      }
      addNotification('warning', `🚫 Cancelamento enviado à cozinha: ${sent.quantity}x ${dish.name}`);
    });

    setSentToKitchenMap(prev => ({ ...prev, [orderId]: [] }));
  }, [activeOrders, menu, sentToKitchenMap, addNotification]);

  const tableSubAccounts = useMemo(() => {
    if (!activeTableId) return [];
    return activeOrders.filter(o => o.tableId === activeTableId && o.status === 'ABERTO');
  }, [activeOrders, activeTableId]);

  const handleCheckoutFinal = useCallback(async (method: PaymentMethod, customerId?: string, customerNif?: string, customerName?: string, documentType?: string) => {
    setIsFinalizing(true);
    
    if (!currentOrder) {
      setIsFinalizing(false);
      return;
    }

    // 🔒 P6: Verificar se há turno aberto antes de checkout (anti-roubo)
    // ADMIN e OWNER podem contornar esta verificação
    if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'OWNER') {
      try {
        const { supabase } = await import('../supabase_standalone');
        const dataContabil = new Date().toLocaleDateString('sv-SE', { timeZone: 'Africa/Luanda' });
        const { data: activeShift } = await supabase
          .from('pos_shift_records')
          .select('id')
          .eq('data_contabil', dataContabil)
          .eq('status', 'OPEN')
          .limit(1);

        if (!activeShift || activeShift.length === 0) {
          addNotification('error', 'Não é possível fechar vendas sem um turno de caixa aberto. Peça a um gerente para abrir um turno.');
          setIsFinalizing(false);
          return;
        }
      } catch (err) {
        console.warn('[POS] Aviso: não foi possível verificar turno ativo, permitindo checkout:', err);
      }
    }
    
    if (method === 'PAGAR_DEPOIS' && !customerId && checkoutStep === 'METHOD') {
      setSelectedPaymentMethod(method);
      setCheckoutStep('CUSTOMER');
      setIsFinalizing(false);
      return;
    }

    const orderToPrintId = currentOrder.id;
    const orderData = currentOrder;
    const customerData = customers.find(c => c.id === orderData.customerId);
    
    try {
      console.log('[POS] 🚀 Chamando checkoutTable:', { orderId: currentOrder.id, method, total: currentOrder.total });
      const result = await checkoutTable(currentOrder.id, method, customerId, customerNif, documentType || 'FR');
      console.log('[POS] ✅ Resultado checkoutTable:', result);
      if (result?.success) {
        addNotification('success', 'Venda registada com sucesso!');

        // 🎉 Vincular pedido ao evento se a mesa tem evento associado
        if (tableEvent) {
          await linkOrderToEvent(currentOrder.id, tableEvent.id, 'EXTRA');
          addNotification('info', `Pedido vinculado ao evento: ${tableEvent.name}`);
        }

        // Guardar venda fechada no localStorage para fallback do fecho de caixa
        try {
          const closedOrdersBackup = JSON.parse(localStorage.getItem('vereda_closed_orders_backup') || '[]');
          const orderToSave = {
            ...currentOrder,
            status: 'closed' as const,
            paymentMethod: method,
            closed_at: new Date().toISOString()
          };
          // Evitar duplicatas
          const existingIndex = closedOrdersBackup.findIndex((o: any) => o.id === currentOrder.id);
          if (existingIndex >= 0) {
            closedOrdersBackup[existingIndex] = orderToSave;
          } else {
            closedOrdersBackup.push(orderToSave);
          }
          localStorage.setItem('vereda_closed_orders_backup', JSON.stringify(closedOrdersBackup));
          console.log('[CHECKOUT] 💾 Venda fechada guardada no backup local:', currentOrder.id, 'Total:', currentOrder.total);
        } catch (e) {
          console.error('[CHECKOUT] Erro ao guardar backup:', e);
        }
        
        // Registar movimentos de stock para conformidade AGT
        if (currentOrder.items && currentOrder.items.length > 0) {
          const invoiceNumber = currentOrder.invoice_number || currentOrder.invoiceNumber || 'PENDENTE';
          await registerStockMovementsForSale(
            currentOrder.items,
            invoiceNumber,
            currentUser?.name || 'SYSTEM'
          );
        }
        
        // Registrar auditoria da fatura
        await logInvoiceCreation(
          currentOrder.id,
          currentOrder,
          currentUser?.id,
          currentUser?.name
        );
      } else if (result?.savedLocally) {
        addNotification('error', 'Venda guardada localmente (Sem Internet)');
      }
    } catch (dbError) {
      addNotification('error', 'Erro ao salvar pedido.');
    }
    
    setIsFinalizing(false);
    setIsCheckoutModalOpen(false);
    setCheckoutStep('METHOD');
    setSelectedPaymentMethod(null);
    setSelectedCustomerId(undefined);
    
    // 🔥 IMPRESSÃO ASSÍNCRONA - não bloqueia o modal
    const doPrint = async () => {
      try {
        const state = useStore.getState();
        const updatedOrder = state.activeOrders.find(o => o.id === orderToPrintId);
        const orderToPrint = updatedOrder || orderData;
        const customerToPrint = updatedOrder 
          ? state.customers.find(c => c.id === updatedOrder.customerId)
          : customerData;
        
        // Chamar impressão sem await para não bloquear
        handleDirectPrint(orderToPrint, customerToPrint, customerName, customerNif);
        
        setActiveOrder(null);
        setActiveTable(null);
        setIsHistoryOpen(false);
        
        addNotification('success', 'Impressão disparada!');
      } catch (printError) {
        addNotification('error', 'Falha na impressão.');
      }
    };
    
    // Executar imediatamente sem delay
    doPrint();
  }, [currentOrder, checkoutStep, checkoutTable, customers, addNotification, handleDirectPrint, setActiveOrder, setActiveTable, tableEvent, linkOrderToEvent]);

  const handleSplitCheckout = useCallback(async (splits: PaymentSplit[], documentType: string) => {
    if (!currentOrder) return;
    setIsFinalizing(true);
    setIsSplitModalOpen(false);
    try {
      console.log('[POS] 🚀 Chamando splitCheckout:', { orderId: currentOrder.id, splitsCount: splits.length });
      const result = await splitCheckout(currentOrder.id, splits, documentType);
      console.log('[POS] ✅ Resultado splitCheckout:', result);
      if (result?.success) {
        addNotification('success', `${splits.length} faturas emitidas com sucesso!`);
        
        try {
          const closedOrdersBackup = JSON.parse(localStorage.getItem('vereda_closed_orders_backup') || '[]');
          closedOrdersBackup.push({
            ...currentOrder,
            status: 'closed' as const,
            closed_at: new Date().toISOString(),
            splitInvoices: result.invoices
          });
          localStorage.setItem('vereda_closed_orders_backup', JSON.stringify(closedOrdersBackup));
        } catch (e) {
          console.error('[SPLIT] Erro ao guardar backup:', e);
        }

        if (currentOrder.items && currentOrder.items.length > 0) {
          await registerStockMovementsForSale(
            currentOrder.items,
            result.invoices?.[0] || 'PENDENTE',
            currentUser?.name || 'SYSTEM'
          );
        }

        // Imprimir todas as faturas num único preview
        if (result.invoices && result.invoices.length > 0) {
          const splitOrders: any[] = [];
          const splitData: { customerName?: string; customerNif?: string }[] = [];
          for (let i = 0; i < splits.length; i++) {
            const split = splits[i];
            const invoiceNum = result.invoices[i];
            const ratio = split.amount / currentOrder.total;
            splitOrders.push({
              ...currentOrder,
              id: `${currentOrder.id}-split-${i + 1}`,
              total: split.amount,
              taxTotal: (currentOrder.taxTotal || 0) * ratio,
              profit: (currentOrder.profit || 0) * ratio,
              items: (currentOrder.items || []).map(item => ({
                ...item,
                quantity: item.quantity,
                unitPrice: (item.dish?.price || item.unitPrice || 0) * ratio,
                dish: item.dish ? {
                  ...item.dish,
                  price: (item.dish.price || 0) * ratio
                } : item.dish
              })),
              invoiceNumber: invoiceNum,
              paymentMethod: split.paymentMethod,
              status: 'closed' as const,
              timestamp: new Date(),
              hash: `SPLIT${Date.now()}${i}`,
              subAccountName: `Parcela ${i + 1}/${splits.length}`
            });
            splitData.push({
              customerName: split.customerName,
              customerNif: split.customerNif
            });
          }
          try {
            console.log('[SPLIT] Imprimindo', splitOrders.length, 'faturas num único preview');
            addNotification('info', `A preparar ${splits.length} faturas para impressão...`);
            await printSplitInvoices(splitOrders, menu, settings, splitData);
            addNotification('success', `${splits.length} faturas enviadas para impressão!`);
          } catch (printErr) {
            console.error('[SPLIT] Erro ao imprimir faturas:', printErr);
            addNotification('error', 'Erro ao imprimir faturas.');
          }
        }
      } else {
        addNotification('error', 'Erro ao processar divisão de pagamento.');
      }
    } catch (err) {
      console.error('[POS] ❌ Erro no split checkout:', err);
      addNotification('error', 'Erro inesperado na divisão de pagamento.');
    } finally {
      setIsFinalizing(false);
      setActiveOrder(null);
      setActiveTable(null);
    }
  }, [currentOrder, splitCheckout, addNotification, currentUser, setActiveOrder, setActiveTable, menu, settings]);

  const formatKz = (val: number) => new Intl.NumberFormat('pt-AO', { 
    style: 'currency', currency: 'AOA', maximumFractionDigits: 0 
  }).format(val);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f172a] font-sans select-none text-sm">
      
      {/* 🔥 MENU SIDEBAR PRINCIPAL (overlay slide-in) */}
      {isMenuSidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[9997]" onClick={() => setIsMenuSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-slate-950 border-r border-white/10 z-[9998] flex flex-col py-6 transition-all duration-300 shadow-2xl">
            {/* Botão fechar */}
            <button 
              onClick={() => setIsMenuSidebarOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-all"
              title="Esconder Menu"
              aria-label="Esconder Menu"
            >
              <X size={16} />
            </button>
            
            <div className="flex-1 flex flex-col gap-2 px-4 mt-12 overflow-y-auto no-scrollbar">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Navegação Principal</p>
              
              {/* Menus visíveis para TODOS os utilizadores */}
              <button onClick={() => { navigate('/'); setIsMenuSidebarOpen(false); }} className="flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all text-left">
                <Layout size={18} className="text-slate-400" />
                <span className="text-sm font-medium">Dashboard</span>
              </button>
              
              <button className="flex items-center gap-3 px-4 py-3 bg-primary/20 border border-primary/30 rounded-xl text-primary transition-all text-left">
                <DollarSign size={18} />
                <span className="text-sm font-bold">Terminal POS</span>
              </button>

              <button onClick={() => { navigate('/reservations'); setIsMenuSidebarOpen(false); }} className="flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all text-left">
                <Calendar size={18} className="text-slate-400" />
                <span className="text-sm font-medium">Reservas</span>
              </button>
              
              <button onClick={() => { navigate('/finance'); setIsMenuSidebarOpen(false); }} className="flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all text-left">
                <Banknote size={18} className="text-slate-400" />
                <span className="text-sm font-medium">Despesas</span>
              </button>

              <button onClick={() => { navigate('/manual'); setIsMenuSidebarOpen(false); }} className="flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all text-left">
                <BookOpen size={18} className="text-slate-400" />
                <span className="text-sm font-medium">Manual</span>
              </button>

              {/* Menus exclusivos para ADMIN / OWNER */}
              {(currentUser?.role === 'ADMIN' || currentUser?.role === 'OWNER') && (
                <>
                  <div className="h-px bg-white/10 my-2" />
                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-1">Gestão</p>

                  <button onClick={() => { navigate('/profit-center'); setIsMenuSidebarOpen(false); }} className="flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all text-left">
                    <TrendingUp size={18} className="text-slate-400" />
                    <span className="text-sm font-medium">Centro de Lucro</span>
                  </button>

                  <button onClick={() => { navigate('/events'); setIsMenuSidebarOpen(false); }} className="flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all text-left">
                    <Calendar size={18} className="text-slate-400" />
                    <span className="text-sm font-medium">Eventos</span>
                  </button>

                  <button onClick={() => { navigate('/inventory'); setIsMenuSidebarOpen(false); }} className="flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all text-left">
                    <ShoppingBasket size={18} className="text-slate-400" />
                    <span className="text-sm font-medium">Produtos & Categorias</span>
                  </button>

                  <button onClick={() => { navigate('/stock-management'); setIsMenuSidebarOpen(false); }} className="flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all text-left">
                    <Boxes size={18} className="text-slate-400" />
                    <span className="text-sm font-medium">Gestão de Stock</span>
                  </button>

                  <button onClick={() => { navigate('/compras'); setIsMenuSidebarOpen(false); }} className="flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all text-left">
                    <ShoppingCart size={18} className="text-slate-400" />
                    <span className="text-sm font-medium">Compras</span>
                  </button>

                  <button onClick={() => { navigate('/analytics'); setIsMenuSidebarOpen(false); }} className="flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all text-left">
                    <BarChart3 size={18} className="text-slate-400" />
                    <span className="text-sm font-medium">Análises</span>
                  </button>

                  <button onClick={() => { navigate('/settings'); setIsMenuSidebarOpen(false); }} className="flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all text-left">
                    <Settings size={18} className="text-slate-400" />
                    <span className="text-sm font-medium">Configurações</span>
                  </button>

                  <button onClick={() => { navigate('/tables-layout'); setIsMenuSidebarOpen(false); }} className="flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all text-left">
                    <Grid3X3 size={18} className="text-slate-400" />
                    <span className="text-sm font-medium">Mesa Layout</span>
                  </button>
                </>
              )}
              
            </div>
          </div>
        </>
      )}

      {/* 🔥 COLUNA 1 - CATEGORIAS (vertical com ícones e emojis, exactamente como mockup) */}
      <div className="w-[90px] bg-[#0b1120] border-r border-white/5 flex flex-col py-3 gap-2 shrink-0">
        <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.15em] text-center mb-1">Categorias</p>
        <div className="flex-1 flex flex-col items-center gap-2 overflow-y-auto thin-scrollbar px-1.5">
          <button 
            onClick={() => setSelectedCategoryId('TODOS')} 
            className={`w-[72px] aspect-square shrink-0 rounded-[14px] flex flex-col items-center justify-center gap-1 transition-all border ${selectedCategoryId === 'TODOS' ? 'bg-cyan-500 text-black border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.25)]' : 'bg-white/[0.04] text-slate-400 border-transparent hover:bg-white/[0.08] hover:text-white'}`}
            title="Ver todos os produtos"
          >
            <span className="text-lg leading-none">⊞</span>
            <span className="text-[9px] font-extrabold uppercase tracking-wide">Todos</span>
          </button>
          {categories.map(cat => {
            const emoji = cat.name.toLowerCase().includes('bebida') 
              ? '🍺' 
              : cat.name.toLowerCase().includes('prato') 
                ? '🍽️' 
                : cat.name.toLowerCase().includes('entrada') 
                  ? '🥗' 
                  : cat.name.toLowerCase().includes('sobremesa') 
                    ? '🍰' 
                    : cat.name.toLowerCase().includes('cafet') || cat.name.toLowerCase().includes('café')
                      ? '☕' 
                      : cat.name.toLowerCase().includes('grelh') 
                        ? '🔥' 
                        : cat.name.toLowerCase().includes('alcool') || cat.name.toLowerCase().includes('vinho') || cat.name.toLowerCase().includes('cerve')
                          ? '🍷' 
                          : '🍽️';
            return (
              <button 
                key={cat.id} 
                onClick={() => setSelectedCategoryId(cat.id)} 
                className={`w-[72px] aspect-square shrink-0 rounded-[14px] flex flex-col items-center justify-center gap-1 transition-all border ${selectedCategoryId === cat.id ? 'bg-cyan-500 text-black border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.25)]' : 'bg-white/[0.04] text-slate-400 border-transparent hover:bg-white/[0.08] hover:text-white'}`}
                title={`Categoria: ${cat.name}`}
              >
                <span className="text-lg leading-none">{emoji}</span>
                <span className="text-[8px] font-extrabold uppercase tracking-wide truncate w-full text-center px-1 leading-tight">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 🔥 COLUNA 2 - MESAS (exactamente como mockup) */}
      <div className="w-[170px] bg-[#0b1120] border-r border-white/5 flex flex-col py-3 gap-2 shrink-0">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] text-center mb-1">Mesas</p>
        
        <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto thin-scrollbar px-2">
          {sortedTables.map((table) => {
            const tableOrder = activeOrders.find(o => o.tableId === table.id && o.status === 'ABERTO');
            const isOccupied = !!tableOrder;
            const itemCount = tableOrder?.items?.reduce((sum: number, it: any) => sum + (it.quantity || 0), 0) || 0;
            let minutes = 0;
            let timeLabel = '';
            let isUrgent = false;
            if (tableOrder?.timestamp) {
              const orderTime = new Date(tableOrder.timestamp).getTime();
              const now = Date.now();
              minutes = Math.floor((now - orderTime) / 60000);
              if (minutes < 60) timeLabel = `${minutes} min`;
              else timeLabel = `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
              isUrgent = minutes > 30;
            }
            const isActive = activeTableId === table.id;
            const tableEventData = table.eventId ? events.find(e => e.id === table.eventId) : null;
            return (
              <button
                key={table.id}
                onClick={() => handleTableClick(table)}
                className={`w-full px-3 py-2.5 rounded-xl border transition-all text-left relative ${
                  isActive
                    ? 'bg-[#06b6d4] text-black border-[#06b6d4] shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                    : tableEventData
                      ? 'bg-purple-500/[0.08] border-purple-500/40 hover:bg-purple-500/[0.12]'
                      : isUrgent
                        ? 'bg-red-500/[0.08] border-red-500/30 hover:bg-red-500/[0.12] animate-pulse'
                        : isOccupied
                          ? 'bg-[#f59e0b]/[0.06] border-[#f59e0b]/20 hover:bg-[#f59e0b]/[0.1]'
                          : 'bg-white/[0.03] border-[#10b981]/15 hover:bg-white/[0.06] hover:border-[#10b981]/30'
                }`}
                title={isOccupied ? `Mesa ocupada${minutes > 0 ? ` • ${timeLabel}` : ''}${tableEventData ? ` • EVENTO: ${tableEventData.name}` : ''}` : tableEventData ? `Mesa reservada • EVENTO: ${tableEventData.name}` : 'Mesa livre'}
                aria-label={`${table.name} - ${isOccupied ? 'Ocupada' : 'Livre'}`}
              >
                {/* Badge de itens */}
                {itemCount > 0 && (
                  <span className={`absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full text-[9px] font-black flex items-center justify-center ${
                    isActive ? 'bg-black text-[#06b6d4]' : 'bg-[#06b6d4] text-black'
                  }`}>
                    {itemCount}
                  </span>
                )}
                {/* 🎉 Badge de Evento */}
                {tableEventData && (
                  <span className={`absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full flex items-center justify-center ${isActive ? 'bg-black text-purple-400' : 'bg-purple-500 text-white'}`} title={`Evento: ${tableEventData.name}`}>
                    <Sparkles size={10} />
                  </span>
                )}
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-[13px] font-extrabold uppercase tracking-tight truncate ${
                    isActive ? 'text-black' : isOccupied ? (isUrgent ? 'text-red-400' : 'text-white') : 'text-white'
                  }`}>
                    {table.name === 'Mesa NaN' || table.name === 'MESA NAN' ? `Mesa ${table.id}` : table.name}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                    isActive ? 'bg-black/20 text-black' : isUrgent ? 'text-red-400 bg-red-500/10' : isOccupied ? 'text-[#fbbf24] bg-[#f59e0b]/10' : 'text-[#34d399] bg-black/10'
                  }`}>
                    {isUrgent ? timeLabel : isOccupied ? timeLabel : 'LIVRE'}
                  </span>
                </div>
                <div className="text-[10px] text-white/40 font-semibold truncate">
                  {isOccupied ? `${itemCount} ${itemCount === 1 ? 'item' : 'itens'}` : tableEventData ? '🎉 Evento' : 'Interior'}
                </div>
              </button>
            );
          })}
        </div>
        
        {/* Botões administrativos embaixo das mesas */}
        <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-white/10 px-2">
          <button 
            onClick={() => setIsHistoryOpen(true)}
            className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all flex items-center justify-center gap-2 text-[10px] font-medium"
            title="Histórico"
          >
            <History size={14} />
            <span>Histórico</span>
          </button>
          
          <button 
            onClick={() => setIsShiftManagerOpen(true)}
            className="w-full py-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg text-primary hover:text-primary/80 transition-all flex items-center justify-center gap-2 text-[10px] font-bold"
            title="Turno de Caixa"
          >
            <Clock size={14} />
            <span>Turno</span>
          </button>
          
          {/* Fecho de Dia — apenas Gerente, Subgerente, Admin Master */}
          {['ADMIN', 'GERENTE', 'SUBGERENTE'].includes(currentUser?.role || '') && (
            <button 
              onClick={handleCashClosingClick}
              className={`w-full py-2 border rounded-lg transition-all flex items-center justify-center gap-2 text-[10px] font-bold relative ${
                dayCloseStatus === 'closed'
                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400 hover:text-emerald-300'
                  : dayCloseStatus === 'pending'
                    ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400 hover:text-red-300 animate-pulse'
                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400 hover:text-emerald-300'
              }`}
              title={dayCloseStatus === 'closed' ? 'Dia fechado' : dayCloseStatus === 'pending' ? 'Dia por fechar!' : 'Fecho de Dia'}
            >
              <LogOut size={14} />
              <span>Fecho de Dia</span>
              {dayCloseStatus === 'closed' && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
              )}
              {dayCloseStatus === 'pending' && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900 animate-ping" />
              )}
            </button>
          )}

          {/* Reimprimir Fecho do Dia — apenas Gerente, Subgerente, Admin Master */}
          {['ADMIN', 'GERENTE', 'SUBGERENTE'].includes(currentUser?.role || '') && (
            <button
              onClick={() => setIsFechoReprintOpen(true)}
              className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg text-amber-400 hover:text-amber-300 transition-all flex items-center justify-center gap-2 text-[10px] font-bold"
              title="Reimprimir Fecho do Dia"
            >
              <Printer size={14} />
              <span>Reimprimir Fecho</span>
            </button>
          )}

          {/* Suspender — movido do rodapé do carrinho */}
          <button 
            onClick={() => setActiveOrder(null)}
            className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg text-amber-400 hover:text-amber-300 transition-all flex items-center justify-center gap-2 text-[10px] font-bold"
            title="Suspender pedido atual"
          >
            <Clock size={14} />
            <span>Suspender</span>
          </button>
        </div>
      </div>

      <div className={`flex-1 flex flex-col overflow-hidden relative transition-all duration-500 pl-0 ${activeOrderId ? 'pr-[320px]' : ''}`}>
        {/* Header exactamente igual ao mockup */}
        <header className="h-[52px] bg-[#0f172a]/80 border-b border-white/5 flex items-center px-4 gap-3 shrink-0">
          {/* Hamburger */}
          <button 
            onClick={() => setIsMenuSidebarOpen(true)}
            className="w-9 h-9 bg-white/[0.06] border border-white/10 rounded-[10px] flex items-center justify-center text-white hover:bg-white/10 transition-all"
            title="Menu Principal"
          >
            <Menu size={18} />
          </button>

          {/* Grupo central: Mesas, Sincronizar, Info Mesa, Ações */}
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => { setActiveTable(null); setActiveOrder(null); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.05] border border-white/10 rounded-[10px] text-[10px] font-black uppercase tracking-[0.08em] text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <LayoutGrid size={14} />
              <span>Mesas</span>
            </button>
            
            <button 
              onClick={async () => {
                addNotification('info', 'Sincronizando vendas pendentes...');
                const result = await syncPendingOrdersToSupabase();
                if (result.synced > 0) {
                  addNotification('success', `${result.synced} venda(s) sincronizada(s)!`);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500/[0.08] border border-red-500/20 rounded-[10px] text-[10px] font-black uppercase tracking-[0.08em] text-red-400 hover:bg-red-500/15 transition-all"
              title="Sincronizar vendas pendentes"
            >
              <RefreshCw size={14} />
              <span>Sincronizar</span>
            </button>

            {activeTableId && (
              <>
                {/* Info da Mesa */}
                <div className="flex items-center gap-2 pl-3 border-l border-white/10 shrink-0 min-w-fit overflow-visible">
                  <div className="w-[3px] h-6 bg-cyan-500 rounded-[3px] shrink-0"></div>
                  <div className="flex flex-col justify-center shrink-0 overflow-visible">
                    <div className="text-[13px] font-black uppercase tracking-tight text-white leading-snug whitespace-nowrap">
                      {tables.find(t => t.id === activeTableId)?.name || `Mesa ${activeTableId}`}
                    </div>
                    <div className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.1em] leading-snug whitespace-nowrap">
                      ● {currentOrder?.subAccountName || 'Principal'}
                    </div>
                  </div>
                </div>

                {/* Ícones de ação */}
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setIsSubaccountModalOpen(true)}
                    className="w-8 h-8 bg-white/[0.05] border border-white/10 rounded-lg flex items-center justify-center text-slate-400 hover:text-cyan-500 hover:bg-white/10 transition-all text-xs"
                    title="Nova Subconta"
                  >
                    <UserPlus size={14} />
                  </button>
                  <button 
                    onClick={() => setIsTransferModalOpen(true)}
                    className="w-8 h-8 bg-white/[0.05] border border-white/10 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-white/10 transition-all text-xs"
                    title="Transferir Mesa"
                  >
                    <ArrowRightLeft size={14} />
                  </button>
                  {activeOrderId && (
                  <button 
                    onClick={() => {
                      console.log('[MERGE] Abrindo modal - sourceOrder:', activeOrderId, 'subAccount:', currentOrder?.subAccountName);
                      setMergeSourceOrderId(activeOrderId);
                      setMergeTargetOrderId(null);
                      setIsMergeModalOpen(true);
                    }}
                    className="w-8 h-8 bg-white/[0.05] border border-white/10 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-white/10 transition-all text-xs"
                    title="Juntar esta subconta a outra conta"
                  >
                    <GitMerge size={14} />
                  </button>
                  )}
                  <button 
                    onClick={() => {
                      if (activeTableId) {
                        closeTable(activeTableId);
                        setActiveTable(null);
                        setActiveOrder(null);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-500/[0.08] border border-red-500/20 rounded-[10px] text-[10px] font-black uppercase tracking-[0.08em] text-red-400 hover:bg-red-500/15 hover:text-white transition-all"
                    title="Fechar Mesa"
                  >
                    <X size={14} />
                    <span className="hidden lg:inline">Fechar</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Espaçador */}
          <div className="flex-1"></div>

          {/* 🎉 Widget de Eventos Hoje */}
          {todayEvents.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-[10px]" title={`${todayEvents.length} evento(s) hoje`}>
              <PartyPopper size={14} className="text-purple-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.08em] text-purple-400">
                {todayEvents.length} {todayEvents.length === 1 ? 'Evento' : 'Eventos'}
              </span>
              <div className="flex items-center gap-1 ml-1">
                {todayEvents.slice(0, 3).map(e => (
                  <button
                    key={e.id}
                    onClick={() => {
                      const eventTable = tables.find(t => t.eventId === e.id);
                      if (eventTable) {
                        handleTableClick(eventTable);
                      } else {
                        addNotification('info', `Evento: ${e.name} — sem mesa reservada`);
                      }
                    }}
                    className="text-[8px] font-bold text-purple-300 hover:text-purple-200 bg-purple-500/10 hover:bg-purple-500/20 px-1.5 py-0.5 rounded transition-all truncate max-w-[80px]"
                    title={e.name}
                  >
                    {e.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Botões direitos: 2º Ecrã + Pagamento */}
          <div className="flex items-center gap-2">
            <button 
              onClick={handleOpenCustomerDisplay}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.05] border border-white/10 rounded-[12px] text-[10px] font-black uppercase tracking-[0.06em] text-slate-400 hover:bg-white/10 hover:text-white transition-all"
            >
              <Monitor size={14} />
              <span className="hidden lg:inline">2.º Ecrã</span>
            </button>
            
            {activeTableId && (
              <button 
                onClick={() => {
                  const currentMode = customerDisplayMode[activeTableId] || 'MARKETING';
                  const newMode = currentMode === 'MARKETING' ? 'ORDER_SUMMARY' : 'MARKETING';
                  setCustomerDisplayMode(activeTableId, newMode);
                  addNotification('info', `2.º Ecrã: Modo ${newMode === 'ORDER_SUMMARY' ? 'Pagamento' : 'Marketing'}`);
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-[12px] text-[10px] font-black uppercase tracking-[0.06em] transition-all ${
                  customerDisplayMode[activeTableId] === 'ORDER_SUMMARY'
                    ? 'bg-cyan-500 text-black border border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                    : 'bg-white/[0.05] border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <CreditCard size={14} />
                {customerDisplayMode[activeTableId] === 'ORDER_SUMMARY' ? 'Mostrar Marketing' : 'Enviar p/ Pagamento'}
              </button>
            )}
          </div>

          {/* Relógio */}
          <div className="text-right text-[11px] text-slate-400 font-semibold border-l border-white/10 pl-3 leading-tight shrink-0">
            <div>
              {currentTime.toLocaleDateString('pt-AO', { day: 'numeric', month: 'short', year: 'numeric' })} — <span className="text-cyan-500 font-bold">{currentTime.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="text-[10px] text-cyan-500 font-bold mt-0.5 uppercase tracking-wide">
              Turno: {currentTime.getHours() >= 5 && currentTime.getHours() < 16 ? 'Manhã' : 'Tarde/Noite'}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 no-scrollbar bg-[#0f172a]">
           <div className="flex items-center justify-between mb-4">
             <div>
               <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">Explorar Itens</p>
               <h3 className="text-base font-black text-white tracking-tight mt-1">Selecione produtos para adicionar ao pedido</h3>
             </div>
             <div className="relative w-full max-w-xs md:max-w-sm lg:max-w-md group">
               <div className="absolute inset-0 rounded-xl bg-cyan-500/20 opacity-0 group-hover:opacity-40 transition-opacity pointer-events-none"></div>
               <div className="relative flex items-center gap-2 px-3 py-2 bg-white/[0.06] border border-cyan-500/40 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                 <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-cyan-500 text-black shrink-0">
                   <Search size={14} />
                 </div>
                 <input 
                   type="text" 
                   placeholder="Pesquisar item por nome…" 
                   className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder:text-slate-400" 
                   value={searchTerm} 
                   onChange={e => setSearchTerm(e.target.value)} 
                   autoComplete="off"
                   autoCapitalize="off"
                   spellCheck="false"
                 />
               </div>
             </div>
           </div>

           {!activeTableId ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Grid3X3 size={40} className="text-slate-500" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2">Escolha uma mesa</h3>
                    <p className="text-slate-500 text-sm">Selecione uma mesa na lista lateral para iniciar o pedido</p>
                  </div>
                </div>
           ) : (
              <div className="grid grid-cols-4 gap-3 animate-in fade-in zoom-in duration-700">
                 {filteredBySearch.map((dish) => (
                    <button 
                      key={dish.id} 
                      onClick={() => {
                        console.log('[POS] 🖱️ CLIQUE NO PRODUTO:', dish?.name, dish?.id, 'Mesa ativa:', activeTableId);
                        if (!dish) {
                          console.error('[POS] ❌ Dish está undefined!');
                          return;
                        }
                        handleAddToOrder(dish);
                      }} 
                      className={`group bg-white/[0.05] rounded-2xl border overflow-hidden flex flex-col transition-all active:scale-95 relative hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-500/10 ${lastAddedItemId === dish.id ? 'border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.3)] scale-[1.02]' : 'border-white/[0.08] hover:border-cyan-500/40'}`}
                    >
                       {/* Imagem */}
                       <div className="aspect-square w-full overflow-hidden relative bg-gradient-to-br from-slate-800 to-slate-900">
                          <LazyImage src={dish.image_url} alt={dish.name} containerClassName="w-full h-full" className="object-cover group-hover:scale-105 transition-all duration-500 ease-out" />
                          
                          {lastAddedItemId === dish.id && (
                            <div className="absolute inset-0 bg-cyan-500/20 flex items-center justify-center backdrop-blur-[2px] animate-in fade-in zoom-in duration-300">
                               <div className="bg-cyan-500 text-black p-2 rounded-full shadow-2xl scale-110">
                                  <Plus size={22} strokeWidth={4} />
                               </div>
                            </div>
                          )}
                       </div>
                       
                       {/* Info (preço + nome) ABAIXO da imagem */}
                       <div className="px-2.5 py-2 text-left min-h-[60px] flex flex-col">
                          <p className="text-[11px] font-black text-cyan-500 uppercase tracking-wide mb-0.5">{formatKz(dish.price)}</p>
                          <h4 className="text-white font-bold text-[11px] leading-tight line-clamp-2">{dish.name}</h4>
                       </div>
                    </button>
                 ))}
              </div>
           )}
        </div>
      </div>

      {/* Painel Lateral do Pedido - FIXO à direita (viewport) */}
      <div className={`w-[320px] border-l border-white/5 bg-[#0b1120] flex flex-col h-[calc(100vh-52px)] transition-all duration-500 shadow-2xl z-50 fixed right-0 top-[52px] ${!activeOrderId ? 'translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}`}>
         {activeOrderId && (
           <>
             <div className="p-3 border-b border-white/5 bg-slate-900/20 shrink-0">
                {/* Header com botões de ação no topo */}
                <div className="flex items-center gap-2 mb-2">
                  <button 
                    onClick={() => printTableReview(currentOrder!, menu, settings)}
                    className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-primary hover:bg-white/10 transition-all flex items-center justify-center"
                    title="Imprimir Consulta"
                  >
                    <Printer size={14}/>
                  </button>
                  <button
                    onClick={() => { setActiveOrder(null); setActiveTable(null); }}
                    className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
                    title="Voltar para Mesas"
                  >
                    <X size={14}/>
                  </button>
                </div>
                
                {/* Título do pedido e status */}
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-white uppercase tracking-tight">Pedido #{activeOrderId.slice(-4)}</h3>
                  <span className="flex items-center gap-1 text-[10px] text-green-400 font-bold">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                    Em Curso
                  </span>
                </div>
                
                {/* 🎉 Badge de Evento no header do pedido */}
                {tableEvent && (
                  <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <Sparkles size={12} className="text-purple-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-black text-purple-400 uppercase tracking-tight truncate block">{tableEvent.name}</span>
                      <span className="text-[8px] text-purple-300/70 font-medium">
                        {tableEvent.type === 'SHOW_INTIMISTA' ? 'Show' : tableEvent.type === 'ANIVERSARIO' ? 'Aniversário' : tableEvent.type === 'CASAMENTO' ? 'Casamento' : tableEvent.type === 'CORPORATIVO' ? 'Corporativo' : 'Evento'}
                        {' • '}
                        {tableEvent.guests_count || 0} convidados
                        {' • '}
                        Extras: {formatKz(eventExtrasTotal)}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowEventPanel(!showEventPanel)}
                      className="text-[8px] font-bold text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 px-2 py-1 rounded transition-all"
                      title="Ver consumo do evento"
                    >
                      {showEventPanel ? 'Ocultar' : 'Detalhes'}
                    </button>
                  </div>
                )}

                {/* 🎉 Painel de Consumo do Evento */}
                {tableEvent && showEventPanel && (
                  <div className="mb-2 p-2 bg-purple-500/[0.05] border border-purple-500/20 rounded-lg max-h-[200px] overflow-y-auto thin-scrollbar">
                    {/* Pacote incluído */}
                    {eventPackage && eventPackage.included_items && eventPackage.included_items.length > 0 && (
                      <div className="mb-2 pb-2 border-b border-purple-500/20">
                        <div className="text-[9px] font-black text-green-400 uppercase tracking-wider mb-1">Pacote Incluído</div>
                        <div className="space-y-0.5">
                          {eventPackage.included_items.map((item: any, i: number) => (
                            <div key={i} className="flex items-center justify-between text-[10px] py-0.5 px-1.5 bg-green-500/[0.03] rounded">
                              <span className="text-green-300 font-medium truncate">✓ {item.name}</span>
                              <span className="text-green-400/70 font-bold text-[9px] shrink-0 ml-1">
                                {item.unlimited ? '∞ ilimitado' : `${item.quantity_per_person}x/pax`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Pedidos do evento */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-black text-purple-400 uppercase tracking-wider">Consumo do Evento</span>
                      <span className="text-[9px] font-bold text-purple-300">{eventOrders.length} pedidos</span>
                    </div>
                    {eventOrdersLoading ? (
                      <div className="text-[10px] text-slate-500 text-center py-2">Carregando...</div>
                    ) : eventOrders.length === 0 ? (
                      <div className="text-[10px] text-slate-500 text-center py-2">Nenhum pedido vinculado ainda</div>
                    ) : (
                      <div className="space-y-1">
                        {eventOrders.map((eo, i) => (
                          <div key={i} className="flex items-center justify-between text-[10px] py-1 px-1.5 bg-white/[0.02] rounded">
                            <span className="text-slate-400 font-medium">
                              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${eo.order_type === 'EXTRA' ? 'bg-amber-400' : 'bg-green-400'}`} />
                              #{eo.order_id?.slice(-4) || 'N/A'}
                            </span>
                            <span className="text-slate-500">{eo.table_number ? `Mesa ${eo.table_number}` : '—'}</span>
                            <span className={`font-bold ${eo.order_type === 'EXTRA' ? 'text-amber-400' : 'text-green-400'}`}>
                              {formatKz(eo.order?.total_amount || 0)}
                            </span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-purple-500/20">
                          <span className="text-[10px] font-black text-purple-400 uppercase">Total Extras</span>
                          <span className="text-xs font-black text-purple-400">{formatKz(eventExtrasTotal)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Subcontas - Layout igual ao mockup */}
                {tableSubAccounts.length > 1 && (
                  <div className="max-h-[110px] overflow-y-auto thin-scrollbar pr-1 space-y-1">
                    {tableSubAccounts.map(sa => (
                      <div key={sa.id} className="flex items-center gap-1">
                        <button
                          onClick={() => setActiveOrder(sa.id)}
                          className={`flex-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border text-left ${sa.id === activeOrderId ? 'bg-primary text-black border-primary' : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'}`}
                        >
                          {sa.subAccountName || 'Principal'}
                        </button>
                        {(sa.subAccountName && sa.subAccountName !== 'Principal') && (
                          <>
                            <button
                              onClick={() => handleCloseSubAccount(sa)}
                              className="w-5 h-5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 flex items-center justify-center transition-colors"
                              title="Fechar Subconta"
                            >
                              <Check size={10} />
                            </button>
                            {['ADMIN', 'OWNER', 'GERENTE', 'SUBGERENTE'].includes(currentUser?.role || '') && (
                              <button
                                onClick={() => handleDeleteSubAccount(sa.id)}
                                className="w-5 h-5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                                title="Apagar Subconta"
                              >
                                <Trash2 size={10} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
             </div>

             {/* Itens do carrinho - Layout exacto do mockup */}
             <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar bg-[#0b1120]/50">
                {currentOrder?.items.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-600 gap-3 opacity-40 min-h-[200px]">
                    <ShoppingBasket size={48} strokeWidth={1} />
                    <p className="text-[11px] font-black uppercase tracking-[0.2em]">Carrinho Vazio</p>
                  </div>
                ) : (
                  currentOrder?.items.map((item, idx) => {
                    const dish = menu.find(d => d.id === item.dishId) || item.dish;
                    const isSentToKitchen = currentOrder?.id && (sentToKitchenMap[currentOrder.id] || []).some(s => s.dishId === item.dishId);
                    const cat = categories.find(c => c.id === dish?.category_id);
                    const emoji = cat?.name.toLowerCase().includes('bebida') 
                      ? '🍺' 
                      : cat?.name.toLowerCase().includes('prato') 
                        ? '🍽️' 
                        : cat?.name.toLowerCase().includes('entrada') 
                          ? '🥗' 
                          : cat?.name.toLowerCase().includes('sobremesa') 
                            ? '🍰' 
                            : cat?.name.toLowerCase().includes('cafet') || cat?.name.toLowerCase().includes('café')
                              ? '☕' 
                              : cat?.name.toLowerCase().includes('grelh') 
                                ? '🔥' 
                                : cat?.name.toLowerCase().includes('alcool') || cat?.name.toLowerCase().includes('vinho') || cat?.name.toLowerCase().includes('cerve')
                                  ? '🍷' 
                                  : '🍽️';

                    return (
                      <div key={idx} className="flex items-start gap-2 p-2 bg-white/[0.03] border border-white/[0.05] rounded-[11px] mb-1.5 transition-all hover:bg-white/[0.05]">
                        {/* Imagem/Emoji da Categoria */}
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-base shrink-0 mt-0.5">
                          {emoji}
                        </div>
                        
                        {/* Info: nome + preço + badge */}
                        <div className="flex-1 min-w-0 flex flex-col pt-0.5">
                          <div className="text-xs font-bold text-white leading-snug line-clamp-2 pr-1" title={dish?.name || item.name}>
                            {dish?.name || item.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <div className="text-[10px] font-bold text-cyan-400 font-mono">
                              {formatKz(item.unitPrice)}
                            </div>
                            {isSentToKitchen && (
                              <span className="inline-flex items-center text-[8px] font-black text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded uppercase tracking-wider" title="Enviado para Cozinha">
                                ✓ Cozinha
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Coluna direita: ações + quantidade */}
                        <div className="flex items-start gap-1.5 shrink-0 mt-0.5">
                          {/* Botões de ação empilhados verticalmente - apenas ADMIN/OWNER podem apagar */}
                          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'OWNER') && (
                          <div className="flex flex-col gap-1">
                            {/* Cancelar na cozinha - pequeno botão X ambar */}
                            {isSentToKitchen && (
                              <button 
                                onClick={() => {
                                  if (!currentOrder?.id) return;
                                  if (window.confirm(`Cancelar "${dish?.name}" na cozinha?`)) {
                                    handleRemoveWithKitchenCancel(currentOrder.id, idx);
                                  }
                                }}
                                className="w-[22px] h-[22px] rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 flex items-center justify-center border border-amber-500/20 transition-all"
                                title="Cancelar na Cozinha"
                              >
                                <X size={10} />
                              </button>
                            )}
                            {/* Remover item - pequeno botão lixo vermelho */}
                            <button 
                              onClick={() => {
                                if (!currentOrder?.id) return;
                                handleRemoveWithKitchenCancel(currentOrder.id, idx);
                              }}
                              className="w-[22px] h-[22px] rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center border border-red-500/20 transition-all"
                              title="Remover item"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                          )}
                          
                          {/* Ajuste quantidade */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button 
                              onClick={() => {
                                if (item.quantity > 1) {
                                  const { activeTableId: currentTableId } = useStore.getState();
                                  if (currentTableId && dish) {
                                    addToOrder(currentTableId, dish, -1);
                                  }
                                }
                              }} 
                              disabled={item.quantity <= 1}
                              className="w-[22px] h-[22px] rounded-md bg-white/[0.05] text-slate-400 hover:text-white flex items-center justify-center text-xs font-black disabled:opacity-30 transition-all"
                            >
                              -
                            </button>
                            <span className="w-4 text-center text-[10px] font-bold text-white font-mono">
                              {item.quantity}
                            </span>
                            <button 
                              onClick={() => handleAddToOrder(dish!, 1)} 
                              className="w-[22px] h-[22px] rounded-md bg-[#06b6d4] text-black hover:bg-[#0891b2] flex items-center justify-center text-xs font-black transition-all"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
             </div>

             {/* Rodapé - Totais e botões igual ao mockup */}
             <div className="p-3 bg-slate-900/40 border-t border-white/5 shrink-0">
                {/* Totais */}
                <div className="mb-3">
                   <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Subtotal</span>
                      <span className="text-xs font-bold font-mono text-slate-400">{formatKz(currentOrder?.total || 0)}</span>
                   </div>
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Taxas (Incluso)</span>
                      <span className="text-xs font-bold font-mono text-slate-400">{formatKz(0)}</span>
                   </div>
                   <div className="flex justify-between items-center pt-2 border-t border-white/10">
                      <span className="text-[10px] font-black uppercase tracking-wider text-white">Total</span>
                      <span className="text-xl font-black font-mono text-primary">{formatKz(currentOrder?.total || 0)}</span>
                   </div>
                </div>
                
                {/* Botões de ação */}
                <div className="flex flex-col gap-2 mt-2">
                  <button 
                    onClick={() => {
                      if (isFinalizing) return;
                      if (!currentOrder?.items.length) return;
                      setIsPaymentModalOpen(true);
                    }} 
                    disabled={!currentOrder?.items.length || isFinalizing} 
                    className="w-full py-3.5 bg-gradient-to-br from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 text-black rounded-2xl font-bold uppercase text-[11px] tracking-wider shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/40 active:scale-[0.97] disabled:opacity-10 disabled:shadow-none transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <CreditCard size={16} />
                    {isFinalizing ? 'Finalizando...' : 'Finalizar Pagamento'}
                  </button>
                  <div className="flex gap-2.5">
                    <button 
                      onClick={handleSendToKitchen}
                      disabled={!currentOrder?.items.length}
                      className="flex-1 py-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-[10px] font-bold uppercase tracking-wider text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50 hover:shadow-[0_4px_16px_rgba(245,158,11,0.15)] disabled:opacity-20 transition-all duration-200 flex items-center justify-center gap-2"
                      title="Enviar pedido para a cozinha"
                    >
                      <ChefHat size={16} />
                      Enviar p/ Cozinha
                    </button>
                    <button 
                      onClick={() => {
                        if (isFinalizing) return;
                        if (!currentOrder?.items.length) return;
                        setIsSplitModalOpen(true);
                      }} 
                      disabled={!currentOrder?.items.length || isFinalizing} 
                      className="flex-1 py-3.5 bg-gradient-to-br from-cyan-400 to-cyan-600 hover:from-cyan-500 hover:to-cyan-700 text-black rounded-2xl font-bold uppercase text-[10px] tracking-wider shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/40 active:scale-[0.97] disabled:opacity-10 disabled:shadow-none transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <Split size={16} />
                      Dividir
                    </button>
                  </div>
                </div>
             </div>
           </>
         )}
      </div>

      {/* 🍳 Modal Preview Ticket Cozinha */}
      {isKitchenPreviewOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
          <div className="max-w-sm w-full bg-slate-900 border-2 border-orange-500/30 rounded-[2rem] overflow-hidden animate-in zoom-in duration-200 shadow-2xl">
            {/* Header */}
            <div className="bg-orange-500/10 border-b border-orange-500/20 p-5 text-center">
              <ChefHat size={32} className="text-orange-400 mx-auto mb-2" />
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Ticket de Cozinha</h3>
              <p className="text-[10px] text-slate-400 mt-1">
                Mesa {currentOrder?.tableId || 'BALCÃO'} • #{currentOrder?.id.slice(-6)}
              </p>
            </div>

            {/* Items Preview */}
            <div className="p-5 max-h-[300px] overflow-y-auto space-y-2">
              {kitchenPreviewItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/5">
                  <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center text-orange-400 font-black text-sm shrink-0">
                    {item.quantity}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-xs uppercase truncate">{item.name}</p>
                    {item.notes && (
                      <p className="text-[9px] text-orange-300/70 italic mt-0.5">OBS: {item.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-white/5 bg-white/[0.02]">
              <div className="text-center mb-4">
                <span className="text-[10px] text-slate-500 font-bold uppercase">
                  {kitchenPreviewItems.length} item(s) • {kitchenPreviewItems.reduce((sum, i) => sum + i.quantity, 0)} unidade(s)
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setIsKitchenPreviewOpen(false); setKitchenPreviewItems([]); }}
                  className="flex-1 py-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmSendToKitchen}
                  className="flex-[2] py-4 bg-orange-500 text-black rounded-xl font-black uppercase text-[10px] tracking-wider flex items-center justify-center gap-2 shadow-lg hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  <Printer size={16} />
                  Enviar para Cozinha
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Subcontas */}
      {isSubaccountModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-6">
          <div className="max-w-md w-full glass-panel p-8 rounded-[2.5rem] border border-white/10 animate-in zoom-in duration-300">
            <h3 className="text-2xl font-black text-white italic uppercase mb-6">Nova Subconta</h3>
            <p className="text-slate-400 text-sm mb-6">Atribua um nome personalizado para identificar este grupo na Mesa {activeTableId}.</p>
            
            <input 
              type="text" 
              value={newSubAccountName}
              onChange={e => setNewSubAccountName(e.target.value)}
              placeholder="Ex: Grupo Amigos, Família Silva..."
              className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-primary mb-8"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleAddSubAccount()}
            />

            <div className="flex gap-4">
              <button 
                onClick={() => setIsSubaccountModalOpen(false)}
                className="flex-1 py-4 bg-white/5 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAddSubAccount}
                className="flex-1 py-4 bg-primary text-black rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-glow"
              >
                Criar Subconta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Transferência de Mesa */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-6">
          <div className="max-w-2xl w-full glass-panel p-10 rounded-[2.5rem] border border-white/10 animate-in zoom-in duration-300">
            <h3 className="text-2xl font-black text-white italic uppercase mb-2">Transferir Mesa {activeTableId}</h3>
            <p className="text-slate-400 text-sm mb-8">Selecione a mesa de destino. Todos os itens e subcontas serão movidos.</p>
            
            <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 mb-10 max-h-[40vh] overflow-y-auto p-2 no-scrollbar">
              {tables.filter(t => t.id !== activeTableId).map(table => {
                const isOccupied = activeOrders.some(o => o.tableId === table.id && o.status === 'ABERTO');
                return (
                  <button 
                    key={table.id}
                    onClick={() => setTransferTargetTableId(table.id)}
                    className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center transition-all ${transferTargetTableId === table.id ? 'border-primary bg-primary/20 scale-110 shadow-glow' : isOccupied ? 'border-orange-500/30 bg-orange-500/5 opacity-60 cursor-not-allowed' : 'border-white/5 bg-white/5 hover:border-white/20'}`}
                    disabled={isOccupied}
                  >
                    <span className="text-[10px] font-black text-white">{table.id}</span>
                    {isOccupied && <span className="text-[7px] font-black text-orange-500 uppercase">Ocupada</span>}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => { setIsTransferModalOpen(false); setTransferTargetTableId(null); }}
                className="flex-1 py-4 bg-white/5 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest"
              >
                Cancelar
              </button>
              <button 
                onClick={handleTransferTable}
                disabled={!transferTargetTableId}
                className="flex-[2] py-4 bg-orange-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-500/20 disabled:opacity-20"
              >
                Confirmar Transferência
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Juntar Contas */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-6">
          <div className="max-w-2xl w-full glass-panel p-10 rounded-[2.5rem] border border-white/10 animate-in zoom-in duration-300">
            <h3 className="text-2xl font-black text-white italic uppercase mb-2">Juntar Subconta</h3>
            <p className="text-slate-400 text-sm mb-2">Subconta a juntar: <span className="text-emerald-400 font-bold">{activeOrders.find(o => o.id === mergeSourceOrderId)?.subAccountName || 'Principal'}</span> · {formatKz(activeOrders.find(o => o.id === mergeSourceOrderId)?.total || 0)}</p>
            <p className="text-slate-400 text-xs mb-2">Selecione a conta ou subconta de destino. Apenas esta subconta será juntada à escolhida.</p>
            <p className="text-emerald-400/70 text-xs mb-8 font-bold">Os itens serão transferidos para a conta escolhida.</p>
            
            <div className="space-y-2 mb-10 max-h-[40vh] overflow-y-auto p-2 no-scrollbar">
              {/* Subcontas da mesma mesa */}
              {(() => {
                const sameTableOrders = activeOrders.filter(o => o.tableId === activeTableId && o.status === 'ABERTO' && o.id !== mergeSourceOrderId);
                if (sameTableOrders.length === 0) return null;
                return (
                  <div className="mb-2">
                    <div className="text-[10px] font-black text-cyan-400 uppercase tracking-wider mb-1 px-1">Mesma Mesa {activeTableId}</div>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
                      {sameTableOrders.map(order => (
                        <button 
                          key={order.id}
                          onClick={() => setMergeTargetOrderId(order.id)}
                          className={`px-3 py-3 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${mergeTargetOrderId === order.id ? 'border-emerald-500 bg-emerald-500/20 scale-105 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'border-white/5 bg-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/5'}`}
                        >
                          <span className="text-[11px] font-black text-white">{order.subAccountName || 'Principal'}</span>
                          <span className="text-[9px] font-bold text-cyan-400 mt-1">{formatKz(order.total)}</span>
                          <span className="text-[8px] text-slate-500 mt-0.5">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {/* Subcontas de outras mesas */}
              {tables.filter(t => t.id !== activeTableId).map(table => {
                const tableOrders = activeOrders.filter(o => o.tableId === table.id && o.status === 'ABERTO');
                if (tableOrders.length === 0) return null;
                return (
                  <div key={table.id} className="mb-2">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 px-1">Mesa {table.id} · {tableOrders.length} conta{tableOrders.length > 1 ? 's' : ''}</div>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
                      {tableOrders.map(order => (
                        <button 
                          key={order.id}
                          onClick={() => setMergeTargetOrderId(order.id)}
                          className={`px-3 py-3 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${mergeTargetOrderId === order.id ? 'border-emerald-500 bg-emerald-500/20 scale-105 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'border-white/5 bg-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/5'}`}
                        >
                          <span className="text-[11px] font-black text-white">{order.subAccountName || 'Principal'}</span>
                          <span className="text-[9px] font-bold text-cyan-400 mt-1">{formatKz(order.total)}</span>
                          <span className="text-[8px] text-slate-500 mt-0.5">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {tables.filter(t => t.id !== activeTableId).every(t => activeOrders.filter(o => o.tableId === t.id && o.status === 'ABERTO').length === 0) && activeOrders.filter(o => o.tableId === activeTableId && o.status === 'ABERTO' && o.id !== mergeSourceOrderId).length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <p className="text-sm font-bold">Nenhuma conta disponível</p>
                  <p className="text-xs mt-1">Não há outras contas ou subcontas abertas</p>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => { setIsMergeModalOpen(false); setMergeTargetOrderId(null); setMergeSourceOrderId(null); }}
                className="flex-1 py-4 bg-white/5 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest"
              >
                Cancelar
              </button>
              <button 
                onClick={handleMergeTables}
                disabled={!mergeTargetOrderId}
                className="flex-[2] py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20 disabled:opacity-20"
              >
                Juntar Subconta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Histórico e Modal de Alteração de Pagamento */}
      {isHistoryOpen && (
        <div className="fixed inset-y-0 right-0 w-[500px] bg-slate-950/95 backdrop-blur-2xl border-l border-white/10 z-[400] p-12 animate-in slide-in-from-right duration-500 shadow-2xl">
           <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">Histórico</h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Hoje • Ontem • Últimos 7 dias • {closedOrders.length} vendas</p>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="p-4 bg-white/5 rounded-xl text-slate-500 hover:text-white"
                title="Fechar"
                aria-label="Fechar"
              >
                <X size={24}/>
              </button>
           </div>
           <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] no-scrollbar pr-2">
              {isLoadingHistory && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <RefreshCw size={32} className="animate-spin mb-4" />
                  <p className="text-sm font-medium">A carregar histórico...</p>
                </div>
              )}

              {historyError && (
                <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center">
                  <p className="text-sm font-medium">{historyError}</p>
                  <button onClick={fetchClosedOrders} className="mt-3 px-4 py-2 bg-red-500/20 rounded-lg text-xs font-bold uppercase hover:bg-red-500/30 transition-all">Tentar Novamente</button>
                </div>
              )}

              {!isLoadingHistory && !historyError && closedOrders.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                  <History size={48} className="mb-4 opacity-30" />
                  <p className="text-sm font-medium">Sem vendas nos últimos 7 dias</p>
                </div>
              )}

              {groupedClosedOrders.map((group, idx) => (
                <div key={group.date} className={idx > 0 ? 'mt-8 pt-6 border-t-2 border-white/10' : ''}>
                  {/* Separador claro depois do "Hoje" */}
                  {idx > 0 && groupedClosedOrders[idx - 1].label === 'Hoje' && (
                    <div className="flex items-center gap-3 mb-6 -mt-6 pt-4">
                      <div className="flex-1 h-px bg-white/10"></div>
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Dias Anteriores</span>
                      <div className="flex-1 h-px bg-white/10"></div>
                    </div>
                  )}
                  {/* Label do dia */}
                  <div className="flex items-center gap-3 mb-3 py-2">
                    <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${group.label === 'Hoje' ? 'bg-primary text-black' : group.label === 'Ontem' ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-400'}`}>
                      {group.label}
                    </div>
                    <div className="flex-1 h-px bg-white/5"></div>
                    <span className="text-[10px] text-slate-600 font-bold">{group.orders.length} {group.orders.length === 1 ? 'venda' : 'vendas'}</span>
                  </div>
                  
                  {/* Pedidos do dia */}
                  <div className="space-y-3">
                    {group.orders.map(order => (
                      <div key={order.id} className="p-5 bg-white/[0.03] rounded-2xl border border-white/5 flex items-center justify-between group hover:border-primary/40 transition-all">
                         <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <p className="text-[10px] font-black text-primary uppercase tracking-widest">{order.invoiceNumber || order.invoice_number || 'S/N'}</p>
                              <span className="text-[9px] text-slate-600 font-mono">
                                {new Date(order.timestamp).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <h4 className="text-white font-bold text-base italic tracking-tighter truncate">Mesa {order.tableId} • {formatKz(order.total)}</h4>
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full mt-1.5 inline-block">{order.paymentMethod?.replace('_', ' ')}</span>
                         </div>
                         <div className="flex gap-2 shrink-0">
                            <button onClick={() => { setOrderToChangeId(order.id); setIsChangePaymentModalOpen(true); }} className="p-3 bg-white/5 rounded-xl text-slate-400 hover:text-primary transition-all" title="Mudar Pagamento" aria-label="Mudar Pagamento"><ArrowRightLeft size={18}/></button>
                            <button
                                onClick={() => {
                                    console.log(`[POS] Solicitando reimpressão do pedido ${order.invoiceNumber}`);
                                    handleReprintFromHistory(order);
                                }}
                                className="p-3 bg-white/5 rounded-xl text-slate-400 hover:text-primary transition-all border border-white/5"
                                title="Reimprimir"
                                aria-label="Reimprimir"
                            >
                                <Printer size={16}/>
                            </button>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* Modal Alterar Pagamento - Puramente Administrativo */}
      {isChangePaymentModalOpen && (
        <div className="fixed inset-0 bg-black/95 z-[300] flex items-center justify-center p-8 backdrop-blur-xl animate-in zoom-in duration-300">
           <div className="glass-panel p-12 rounded-[3rem] w-full max-w-4xl border border-white/10 text-center">
              <div className="flex items-center justify-center gap-4 text-orange-500 mb-6 font-black uppercase text-xs tracking-widest bg-orange-500/10 w-fit mx-auto px-6 py-2 rounded-full border border-orange-500/20">
                 <Shield size={16}/> Atualização no Histórico de Fecho
              </div>
              <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-10">Mudar Forma de Pagamento</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                 {[
                   { id: 'NUMERARIO', label: 'Dinheiro', icon: Banknote },
                   { id: 'TPA', label: 'Multicaixa', icon: CreditCard },
                   { id: 'QR_CODE', label: 'Express', icon: QrCode },
                   { id: 'TRANSFERENCIA', label: 'Transf.', icon: ArrowRightLeft }
                 ].map(method => (
                   <button 
                     key={method.id} 
                     onClick={() => handleChangePayment(method.id as PaymentMethod)}
                     className="p-10 bg-white/5 border border-white/10 rounded-[2rem] flex flex-col items-center gap-4 hover:border-primary hover:bg-primary/10 transition-all transform active:scale-95"
                   >
                      <method.icon size={40} className="text-slate-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{method.label}</span>
                   </button>
                 ))}
              </div>
              <button onClick={() => setIsChangePaymentModalOpen(false)} className="mt-10 text-slate-500 font-black uppercase text-xs tracking-widest hover:text-white transition-all">Cancelar</button>
           </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-8 backdrop-blur-xl animate-in zoom-in duration-300">
           <div className="glass-panel p-12 rounded-[3rem] w-full max-w-4xl border border-white/10 shadow-2xl animate-in zoom-in duration-500">
              
              {checkoutStep === 'METHOD' ? (
                <>
                  <div className="text-center mb-10">
                     <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">Escolha o Meio de Pagamento</h3>
                     <p className="text-sm text-primary font-mono font-bold mt-2">Pagar: {formatKz(currentOrder?.total || 0)}</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                     {paymentConfigs.filter(c => c.isActive).map(method => (
                       <button 
                         key={method.id} 
                         onClick={() => handleCheckoutFinal(method.type)}
                         className="p-8 bg-white/5 border border-white/10 rounded-[2rem] flex flex-col items-center gap-4 hover:border-primary hover:bg-primary/5 transition-all transform active:scale-95"
                       >
                          <Banknote size={32} className="text-slate-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{method.name}</span>
                       </button>
                     ))}
                     {/* Fallback para Pagar Depois se não estiver configurado explicitamente */}
                     {!paymentConfigs.some(c => c.type === 'PAGAR_DEPOIS' && c.isActive) && (
                       <button 
                         onClick={() => handleCheckoutFinal('PAGAR_DEPOIS')}
                         className="p-8 bg-white/5 border border-white/10 rounded-[2rem] flex flex-col items-center gap-4 hover:border-purple-500 hover:bg-purple-500/5 transition-all transform active:scale-95"
                       >
                          <User size={32} className="text-slate-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Pagar Depois</span>
                       </button>
                     )}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center mb-10">
                     <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">Selecionar Cliente</h3>
                     <p className="text-sm text-purple-500 font-mono font-bold mt-2">Venda a Crédito: {formatKz(currentOrder?.total || 0)}</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto pr-2 no-scrollbar">
                     {customers.map(customer => (
                       <button 
                         key={customer.id} 
                         onClick={() => handleCheckoutFinal(selectedPaymentMethod!, customer.id)}
                         className="p-6 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-start gap-2 hover:border-primary hover:bg-primary/5 transition-all text-left"
                       >
                          <span className="text-white font-bold text-sm uppercase">{customer.name}</span>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Saldo: {formatKz(customer.balance)}</span>
                       </button>
                     ))}
                  </div>
                  <button 
                    onClick={() => setCheckoutStep('METHOD')}
                    className="w-full mt-6 py-4 bg-white/5 border border-white/10 rounded-xl text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-white"
                  >
                    Voltar aos Métodos
                  </button>
                </>
              )}

              <button 
                onClick={() => {
                  setIsCheckoutModalOpen(false);
                  setCheckoutStep('METHOD');
                }} 
                className="w-full mt-10 py-5 bg-white/5 border border-white/10 rounded-xl text-slate-500 font-black uppercase text-xs tracking-widest hover:text-white transition-all"
              >
                Cancelar Venda
              </button>
           </div>
        </div>
      )}

      {/* Modal de Gestão de Turnos */}
      {isShiftManagerOpen && (
        <div className="fixed inset-y-0 right-0 w-[420px] bg-slate-950/95 backdrop-blur-2xl border-l border-white/10 z-[400] p-6 animate-in slide-in-from-right duration-500 shadow-2xl overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Turno de Caixa</h3>
            <button
              onClick={() => setIsShiftManagerOpen(false)}
              className="p-3 bg-white/5 rounded-xl text-slate-500 hover:text-white"
              title="Fechar"
            >
              <X size={20}/>
            </button>
          </div>
          <ShiftManager
            currentUserName={currentUser?.name || 'Operador'}
            onNotification={(type, message) => addNotification(type, message)}
          />
        </div>
      )}

      {/* Modal Reimprimir Fecho do Dia — selector de data */}
      {isFechoReprintOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[450] flex items-center justify-center p-6">
          <div className="max-w-sm w-full glass-panel p-8 rounded-[2.5rem] border border-white/10 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Reimprimir Fecho</h3>
              <button
                onClick={() => setIsFechoReprintOpen(false)}
                className="p-3 bg-white/5 rounded-xl text-slate-500 hover:text-white"
                title="Fechar"
                aria-label="Fechar"
              >
                <X size={20}/>
              </button>
            </div>
            
            <p className="text-slate-400 text-sm mb-6">Selecione a data do fecho que pretende reimprimir.</p>
            
            <div className="mb-6">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Data do Fecho</label>
              <input
                type="date"
                value={fechoReprintDate}
                onChange={e => setFechoReprintDate(e.target.value)}
                max={new Date().toLocaleDateString('en-CA')}
                className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm outline-none focus:border-primary"
                autoFocus
                aria-label="Data do Fecho"
                title="Data do Fecho"
              />
            </div>

            {/* Atalhos rápidos */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setFechoReprintDate(new Date().toLocaleDateString('en-CA'))}
                className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                Hoje
              </button>
              <button
                onClick={() => { const d = new Date(); d.setDate(d.getDate() - 1); setFechoReprintDate(d.toLocaleDateString('en-CA')); }}
                className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                Ontem
              </button>
              <button
                onClick={() => { const d = new Date(); d.setDate(d.getDate() - 7); setFechoReprintDate(d.toLocaleDateString('en-CA')); }}
                className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                -7 dias
              </button>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setIsFechoReprintOpen(false)}
                className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleReprintFechoDia(fechoReprintDate)}
                disabled={fechoReprintLoading}
                className="flex-1 py-4 bg-amber-500 text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                <Printer size={16} />
                {fechoReprintLoading ? 'A carregar...' : 'Reimprimir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview Fecho do Dia — próprio, com iframe */}
      {isFechoPreviewOpen && fechoReprintHtml && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[500] flex items-center justify-center p-6">
          <div className="bg-white rounded-lg w-full max-w-sm max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-3 border-b bg-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Pré-visualização — Fecho do Dia</h3>
              <button
                onClick={() => { setIsFechoPreviewOpen(false); setFechoReprintHtml(''); }}
                className="p-1 text-slate-500 hover:text-slate-800"
                title="Fechar"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-white">
              <div
                className="text-black"
                dangerouslySetInnerHTML={{ __html: fechoReprintHtml.replace(/<html>|<\/html>|<head>.*?<\/head>|<body[^>]*>|<\/body>/gs, '') }}
              />
            </div>
            <div className="p-3 border-t bg-slate-100 flex gap-2">
              <button
                onClick={() => { setIsFechoPreviewOpen(false); setFechoReprintHtml(''); }}
                className="flex-1 py-2 bg-white border border-slate-300 rounded text-slate-700 text-xs font-bold hover:bg-slate-50"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  const iframe = document.createElement('iframe');
                  iframe.style.position = 'absolute';
                  iframe.style.left = '-9999px';
                  iframe.style.top = '-9999px';
                  iframe.style.width = '0';
                  iframe.style.height = '0';
                  iframe.style.border = 'none';
                  document.body.appendChild(iframe);
                  const doc = iframe.contentWindow?.document;
                  if (doc) {
                    doc.open();
                    doc.write(fechoReprintHtml);
                    doc.close();
                    setTimeout(() => {
                      iframe.contentWindow?.focus();
                      iframe.contentWindow?.print();
                      setTimeout(() => document.body.removeChild(iframe), 2000);
                    }, 500);
                  } else {
                    document.body.removeChild(iframe);
                  }
                }}
                className="flex-1 py-2 bg-amber-500 rounded text-black text-xs font-bold hover:brightness-110 flex items-center justify-center gap-1"
              >
                <Printer size={12} />
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

    {/* Modal de Pagamento */}
    <PaymentModal
      isOpen={isPaymentModalOpen}
      onClose={() => {
        setIsPaymentModalOpen(false);
        setIsFinalizing(false); // Resetar estado de finalização
        setSelectedSubAccount(null);
      }}
      onConfirm={async (paymentMethod: string, customerName?: string, customerNif?: string, documentType?: string) => {
        try {
          setIsFinalizing(true);
          setIsPaymentModalOpen(false);
          
          if (selectedSubAccount) {
              // 🛡️ Fechar subconta SEM depender de existir no Supabase
              // O checkoutTable persiste (ou salva pendente offline) e atualiza o estado local.
              console.log('[POS] Fechando subconta (via checkoutTable):', selectedSubAccount);

              const prevActiveTableId = activeTableId;
              const prevActiveOrderId = activeOrderId;

              const result = await checkoutTable(selectedSubAccount.id, paymentMethod as any, undefined, customerNif, documentType || 'FR');
              if (result?.success) {
                addNotification('success', 'Subconta fechada com sucesso');
                // 🎉 Vincular subconta ao evento se a mesa tem evento
                if (tableEvent) {
                  await linkOrderToEvent(selectedSubAccount.id, tableEvent.id, 'EXTRA');
                }
              } else if (result?.savedLocally) {
                addNotification('error', 'Venda guardada localmente (Sem Internet)');
              } else {
                addNotification('error', 'Erro ao fechar subconta. Tente novamente.');
              }

              // Recarregar estado para imprimir e restaurar seleção (checkoutTable limpa active selection).
              const state = useStore.getState();
              const updatedSubAccount = state.activeOrders.find(o => o.id === selectedSubAccount.id);

              if (updatedSubAccount) {
                handleDirectPrint(updatedSubAccount, state.customers.find(c => c.id === updatedSubAccount.customerId), customerName, customerNif);
              }

              // Restaurar seleção na principal (para não fechar a conta principal).
              if (prevActiveTableId != null) {
                const principalOpen = state.activeOrders.find(
                  o => o.tableId === prevActiveTableId && o.subAccountName === 'Principal' && o.status === 'ABERTO'
                );
                setActiveTable(prevActiveTableId);
                setActiveOrder(principalOpen ? principalOpen.id : (prevActiveOrderId ?? null));
              }
            
          } else {
            // 🛡️ FECHAMENTO DE PEDIDO NORMAL (EXISTENTE) - VALIDAÇÃO OBRIGATÓRIA
            if (!currentOrder) {
              console.error('[POS] Erro: Nenhum pedido atual encontrado');
              addNotification('error', 'Nenhum pedido selecionado para finalizar!');
              setIsFinalizing(false); // DESBLOQUEAR BOTÃO IMEDIATAMENTE
              return;
            }
            
            // VALIDAÇÃO: Método de pagamento é OBRIGATÓRIO (vem do PaymentModal)
            if (!paymentMethod) {
              console.error('[POS] Erro: Método de pagamento não selecionado');
              addNotification('error', 'Selecione um método de pagamento antes de finalizar!');
              setIsFinalizing(false); // DESBLOQUEAR BOTÃO IMEDIATAMENTE
              return;
            }
              
              const { error } = await supabase
                .from('orders')
                .update({ 
                  payment_method: paymentMethod, // NUNCA NULL - sempre definido
                  status: 'closed'
                })
                .eq('id', currentOrder.id);
                
              if (error) {
                console.error('Erro ao atualizar método de pagamento:', error);
                throw error;
              }
            
            // Chamar função de impressão existente
            await handleCheckoutFinal(paymentMethod as any, selectedCustomerId, customerNif, customerName, documentType || 'FR');
          }
          
        } catch (error) {
          console.error('Erro ao finalizar pedido:', error);
          addNotification('error', 'Erro ao finalizar pedido. Tente novamente.');
        } finally {
          setIsFinalizing(false);
          setSelectedSubAccount(null);
        }
      }}
      orderNumber={selectedSubAccount?.id || currentOrder?.id || 'N/A'}
      totalAmount={selectedSubAccount?.total || currentOrder?.total || 0}
    />

    {/* Modal de Divisão de Conta (Split Payment) */}
    <SplitPaymentModal
      isOpen={isSplitModalOpen}
      onClose={() => setIsSplitModalOpen(false)}
      onConfirm={handleSplitCheckout}
      orderNumber={currentOrder?.id || 'N/A'}
      totalAmount={currentOrder?.total || 0}
      orderItems={currentOrder?.items?.map(item => ({
        name: item.dish?.name || '',
        quantity: item.quantity,
        unitPrice: item.dish?.price || item.unitPrice || 0,
        totalPrice: (item.dish?.price || item.unitPrice || 0) * item.quantity
      }))}
    />

    {/* 🔒 Modal de Preview de Impressão */}
    {isPrintPreviewOpen && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-5xl mx-auto p-6 max-h-[95vh] flex flex-col">
          <div className="text-center mb-4 flex-shrink-0">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isCashClosingPreview ? 'bg-emerald-500/10' : 'bg-blue-500/10'}`}>
              {isCashClosingPreview ? <DollarSign size={32} className="text-emerald-400" /> : <Printer size={32} className="text-blue-400" />}
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {isCashClosingPreview ? 'Relatório de Fecho do Dia' : 'Preview de Impressão'}
            </h2>
            <p className="text-slate-400 text-sm">
              {isCashClosingPreview
                ? 'Fecho registado com sucesso'
                : 'Revise o documento antes de imprimir'}
            </p>
          </div>


          {/* Preview HTML - Ajustado para melhor visualização */}
          <div className="flex-1 overflow-y-auto bg-white rounded-lg p-4 mb-4 min-h-[200px] max-h-[60vh]">
            <div
              className="print-preview-scaler"
              dangerouslySetInnerHTML={{ __html: printPreviewHtml.replace(/<html>|<\/html>|<head>.*?<\/head>|<body[^>]*>|<\/body>/gs, '') }}
            />
          </div>

          {/* 🔒 BOTÕES - Sempre visíveis no final */}
          <div className="flex flex-col gap-3 flex-shrink-0 border-t border-white/10 pt-4">
            {/* 🔒 BOTÕES PARA FECHO DE CAIXA JÁ EXECUTADO (modo pós-fecho) */}
            {isCashClosingPreview && hasCashClosingBeenExecuted && cashClosingPreviewDate && (
              <>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setIsPrintPreviewOpen(false);
                      setPrintPreviewHtml('');
                      setIsCashClosingPreview(false);
                      setCashClosingPreviewDate(null);
                    }}
                    className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-all"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={executePrintAfterPreview}
                    className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition-all"
                  >
                    🖨️ Imprimir Novamente
                  </button>
                </div>
                <button
                  onClick={() => cancelCashClosing(cashClosingPreviewDate)}
                  className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition-all"
                >
                  🗑️ Cancelar Fecho de Caixa (Desfazer)
                </button>
              </>
            )}

            {/* 🔒 BOTÕES PARA IMPRESSÃO NORMAL (não é fecho de caixa) */}
            {!isCashClosingPreview && (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsPrintPreviewOpen(false);
                    setPrintPreviewHtml('');
                    setIsCashClosingPreview(false);
                    setCashClosingPreviewDate(null);
                  }}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-all"
                >
                  Fechar
                </button>
                <button
                  onClick={executePrintAfterPreview}
                  className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition-all"
                >
                  Imprimir
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* 🔒 Modal de Confirmação de Fecho de Caixa */}
    {isCashClosingConfirmOpen && cashClosingData && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto mx-4 p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign size={32} className="text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Fecho do Dia</h2>
            <p className="text-slate-400 text-sm">Confirme os dados abaixo</p>
          </div>

          {/* 🔒 SOLUÇÃO 4: Indicador visual de horário e data */}
          <div className="bg-slate-800/50 rounded-lg p-4 mb-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Operador:</span>
              <span className="text-white font-bold">{currentUser?.name || 'Operador'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Data do Fecho:</span>
              <span className="text-white font-bold">{cashClosingData.closingDate}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Horário Atual:</span>
              <span className="text-white font-bold">{cashClosingData.currentHour}:00</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Total do Fecho:</span>
              <span className="text-emerald-400 font-bold text-lg">{Number(cashClosingData.totalGeral).toLocaleString('pt-AO')} Kz</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Vendas Fechadas:</span>
              <span className="text-white font-bold">{cashClosingData.todayOrdersCount}</span>
            </div>
          </div>

          {/* 🔒 Turnos separados */}
          {cashClosingData.morning.shift && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-amber-400 font-bold text-sm">Turno da Manhã</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${cashClosingData.morning.shift.status === 'CLOSED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {cashClosingData.morning.shift.status === 'CLOSED' ? 'FECHADO' : 'ABERTO'}
                </span>
              </div>
              <p className="text-slate-400 text-xs mb-2">{cashClosingData.morning.shift.opened_by}</p>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Vendas:</span>
                <span className="text-white font-bold">{cashClosingData.morning.sales.toLocaleString('pt-AO')} Kz ({cashClosingData.morning.ordersCount} venda{cashClosingData.morning.ordersCount !== 1 ? 's' : ''})</span>
              </div>
              {Object.entries(cashClosingData.morning.paymentBreakdown).length > 0 && (
                <div className="mt-2 space-y-1">
                  {Object.entries(cashClosingData.morning.paymentBreakdown).map(([m, d]: [string, any]) => (
                    <div key={m} className="flex justify-between text-xs text-slate-400">
                      <span>{m}:</span>
                      <span className="text-white">{d.total.toLocaleString('pt-AO')} Kz ({d.count}x)</span>
                    </div>
                  ))}
                </div>
              )}
              {cashClosingData.morning.soldProducts.length > 0 && (
                <div className="mt-2 pt-2 border-t border-amber-500/20 space-y-1 max-h-32 overflow-y-auto">
                  <p className="text-[10px] font-bold text-amber-500/60 uppercase">Produtos</p>
                  {cashClosingData.morning.soldProducts.map((p) => (
                    <div key={p.name} className="flex justify-between text-xs text-slate-400">
                      <span>{p.name}:</span>
                      <span className="text-white">{p.quantity}x = {p.total.toLocaleString('pt-AO')} Kz</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {cashClosingData.afternoon.shift && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-orange-400 font-bold text-sm">Turno da Tarde</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${cashClosingData.afternoon.shift.status === 'CLOSED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {cashClosingData.afternoon.shift.status === 'CLOSED' ? 'FECHADO' : 'ABERTO'}
                </span>
              </div>
              <p className="text-slate-400 text-xs mb-2">{cashClosingData.afternoon.shift.opened_by}</p>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Vendas:</span>
                <span className="text-white font-bold">{cashClosingData.afternoon.sales.toLocaleString('pt-AO')} Kz ({cashClosingData.afternoon.ordersCount} venda{cashClosingData.afternoon.ordersCount !== 1 ? 's' : ''})</span>
              </div>
              {Object.entries(cashClosingData.afternoon.paymentBreakdown).length > 0 && (
                <div className="mt-2 space-y-1">
                  {Object.entries(cashClosingData.afternoon.paymentBreakdown).map(([m, d]: [string, any]) => (
                    <div key={m} className="flex justify-between text-xs text-slate-400">
                      <span>{m}:</span>
                      <span className="text-white">{d.total.toLocaleString('pt-AO')} Kz ({d.count}x)</span>
                    </div>
                  ))}
                </div>
              )}
              {cashClosingData.afternoon.soldProducts.length > 0 && (
                <div className="mt-2 pt-2 border-t border-orange-500/20 space-y-1 max-h-32 overflow-y-auto">
                  <p className="text-[10px] font-bold text-orange-500/60 uppercase">Produtos</p>
                  {cashClosingData.afternoon.soldProducts.map((p) => (
                    <div key={p.name} className="flex justify-between text-xs text-slate-400">
                      <span>{p.name}:</span>
                      <span className="text-white">{p.quantity}x = {p.total.toLocaleString('pt-AO')} Kz</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 🔒 Breakdown por Modalidade de Pagamento (total) */}
          <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
            <h3 className="text-white font-bold text-sm mb-3">Vendas por Modalidade (Total do Dia)</h3>
            <div className="space-y-2">
              {Object.entries(cashClosingData.paymentBreakdown).map(([method, data]) => (
                <div key={method} className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">{method}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{data.count}x</span>
                    <span className="text-emerald-400 font-bold">{Number(data.total).toLocaleString('pt-AO')} Kz</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 🔒 Produtos Vendidos */}
          {cashClosingData.soldProducts && cashClosingData.soldProducts.length > 0 && (
            <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
              <h3 className="text-white font-bold text-sm mb-3">Produtos Vendidos</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {cashClosingData.soldProducts.map((product) => (
                  <div key={product.name} className="flex justify-between items-center text-sm">
                    <span className="text-slate-300 truncate flex-1">{product.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium">{product.quantity}x</span>
                      <span className="text-emerald-400 font-bold">{Number(product.total).toLocaleString('pt-AO')} Kz</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between items-center">
                <span className="text-slate-400 text-sm">Total de Produtos:</span>
                <span className="text-emerald-400 font-bold">
                  {cashClosingData.soldProducts.reduce((sum, p) => sum + p.quantity, 0)} unidades
                </span>
              </div>
            </div>
          )}

          {/* 🔒 SOLUÇÃO 2: Alerta se já existe fecho */}
          {cashClosingData.existingFecho && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
              <p className="text-amber-400 text-sm text-center">
                ⚠️ Já existe um fecho para esta data ({Number(cashClosingData.existingFecho.amount).toLocaleString('pt-AO')} Kz).
                Deseja atualizar?
              </p>
            </div>
          )}

          {/* 🔒 SOLUÇÃO 3: Aviso se sem vendas */}
          {cashClosingData.todayOrdersCount === 0 && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mb-4">
              <p className="text-orange-400 text-sm text-center">
                ⚠️ Não há vendas fechadas para esta data.
                Deseja fechar mesmo assim?
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-2">
              <p className="text-blue-400 text-xs text-center">
                ℹ️ O fecho será gravado no Supabase e o relatório será impresso automaticamente.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsCashClosingConfirmOpen(false);
                  setCashClosingData(null);
                }}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={executeCashClosing}
                className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold transition-all text-base animate-pulse shadow-lg shadow-emerald-500/30"
              >
                ✅ Confirmar e Imprimir Fecho
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

  </div>
);
};

export default POS;




