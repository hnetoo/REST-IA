import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../supabase_standalone';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import {
  TrendingUp, Package, Calendar, ShoppingBag, AlertTriangle,
  RefreshCw, ChevronLeft, ChevronRight, Filter, Award, Utensils, Wine,
  Printer, FileDown, BarChart2, Zap, ArrowUp, ArrowDown, Info
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { showPrintPreview } from '../../lib/printService';

const formatKz = (v: number) =>
  new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(v);

const BAR_CATEGORY_IDS = [
  '47cd8e67-1376-4257-8be4-ce50e582785b', // Bebidas
  '830e48aa-73b4-4960-89ad-370f53b8b88e', // Bebidas não Alcoólicas
  '9a9edef6-f8e0-4ccc-b2eb-21b9bb158566', // Fino
  'edfe906b-6a39-4236-871d-f56aab98241d', // Vinhos
  '6776b07e-c678-4a2e-852a-ab5dfd1f4647', // Cafeteria
];

const COLORS = ['#22d3ee', '#a78bfa', '#34d399', '#f59e0b', '#f87171', '#60a5fa', '#fb923c', '#c084fc', '#4ade80', '#facc15'];

function getLuandaToday(): string {
  const now = new Date();
  const luanda = new Date(now.getTime() + 1 * 60 * 60 * 1000);
  if (luanda.getHours() < 5) {
    luanda.setDate(luanda.getDate() - 1);
  }
  return luanda.toISOString().split('T')[0];
}

function getLast7Days(): string[] {
  const days: string[] = [];
  const now = new Date();
  const luanda = new Date(now.getTime() + 1 * 60 * 60 * 1000);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(luanda);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

interface ProductSale {
  product_id: string;
  product_name: string;
  category_id: string;
  category_name: string;
  qty: number;
  total_kz: number;
  stock_quantity: number;
  min_stock: number;
  cost_price: number;
  price: number;
}

interface DailySale {
  date: string;
  qty: number;
  total_kz: number;
}

type Period = 'today' | 'week' | 'month' | 'custom';
type TabId = 'top' | 'daily' | 'barkit' | 'calendar' | 'stock';

const SalesControl = () => {
  const [activeTab, setActiveTab] = useState<TabId>('top');
  const [period, setPeriod] = useState<Period>('week');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [loading, setLoading] = useState(false);

  const [productSales, setProductSales] = useState<ProductSale[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductSale | null>(null);
  const [dailySales, setDailySales] = useState<DailySale[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [calendarDayDetail, setCalendarDayDetail] = useState<{ date: string; products: ProductSale[] } | null>(null);

  const today = getLuandaToday();

  const dateRange = useMemo(() => {
    if (period === 'today') return { from: today, to: today };
    if (period === 'week') {
      const days = getLast7Days();
      return { from: days[0], to: days[days.length - 1] };
    }
    if (period === 'month') {
      const now = new Date();
      const luanda = new Date(now.getTime() + 3600000);
      const y = luanda.getFullYear();
      const m = String(luanda.getMonth() + 1).padStart(2, '0');
      return { from: `${y}-${m}-01`, to: today };
    }
    return { from: customFrom || today, to: customTo || today };
  }, [period, customFrom, customTo, today]);

  const fetchProductSales = useCallback(async () => {
    setLoading(true);
    try {
      // Passo 1: buscar order_ids válidos no período
      const { data: orders, error: ordersErr } = await supabase
        .from('orders')
        .select('id')
        .in('status', ['closed', 'paid'])
        .gte('data_contabil', dateRange.from)
        .lte('data_contabil', dateRange.to);

      if (ordersErr) { console.error('[SALES_CONTROL] Erro orders:', ordersErr); return; }
      if (!orders || orders.length === 0) { setProductSales([]); return; }

      const orderIds = orders.map((o: any) => o.id);

      // Passo 2: buscar order_items desses orders
      const { data: items, error: itemsErr } = await supabase
        .from('order_items')
        .select('product_id, quantity, total_price')
        .in('order_id', orderIds);

      if (itemsErr) { console.error('[SALES_CONTROL] Erro items:', itemsErr); return; }

      // Passo 3: buscar produtos com categoria
      const { data: products, error: prodErr } = await supabase
        .from('products')
        .select('id, name, category_id, stock_quantity, min_stock, cost_price, price, categories(name)');

      if (prodErr) { console.error('[SALES_CONTROL] Erro products:', prodErr); return; }

      const prodMap = new Map<string, any>();
      for (const p of (products || [])) prodMap.set(p.id, p);

      const map = new Map<string, ProductSale>();
      for (const item of (items || [])) {
        const pid = item.product_id;
        const p = prodMap.get(pid);
        if (!pid) continue;
        const cat = (p as any)?.categories;
        const existing = map.get(pid);
        if (existing) {
          existing.qty += Number(item.quantity);
          existing.total_kz += Number(item.total_price);
        } else {
          map.set(pid, {
            product_id: pid,
            product_name: p?.name || 'Desconhecido',
            category_id: p?.category_id || '',
            category_name: cat?.name || 'Sem Categoria',
            qty: Number(item.quantity),
            total_kz: Number(item.total_price),
            stock_quantity: Number(p?.stock_quantity || 0),
            min_stock: Number(p?.min_stock || 10),
            cost_price: Number(p?.cost_price || 0),
            price: Number(p?.price || 0),
          });
        }
      }
      setProductSales(Array.from(map.values()).sort((a, b) => b.total_kz - a.total_kz));
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const fetchDailySales = useCallback(async (product: ProductSale) => {
    const days = getLast7Days();
    const from = days[0];

    // Passo 1: orders válidos
    const { data: orders } = await supabase
      .from('orders')
      .select('id, data_contabil')
      .in('status', ['closed', 'paid'])
      .gte('data_contabil', from)
      .lte('data_contabil', today);

    if (!orders || orders.length === 0) {
      setDailySales(days.map(d => ({ date: d, qty: 0, total_kz: 0 })));
      return;
    }
    const orderDateMap = new Map<string, string>();
    for (const o of orders) orderDateMap.set(o.id, o.data_contabil);
    const orderIds = orders.map(o => o.id);

    // Passo 2: items do produto
    const { data: items } = await supabase
      .from('order_items')
      .select('order_id, quantity, total_price')
      .eq('product_id', product.product_id)
      .in('order_id', orderIds);

    const map = new Map<string, DailySale>();
    for (const d of days) map.set(d, { date: d, qty: 0, total_kz: 0 });
    for (const item of (items || [])) {
      const date = orderDateMap.get(item.order_id);
      if (!date) continue;
      const existing = map.get(date);
      if (existing) {
        existing.qty += Number(item.quantity);
        existing.total_kz += Number(item.total_price);
      }
    }
    setDailySales(Array.from(map.values()));
  }, [today]);

  const fetchCalendarDayDetail = useCallback(async (date: string) => {
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .in('status', ['closed', 'paid'])
      .eq('data_contabil', date);

    if (!orders || orders.length === 0) { setCalendarDayDetail({ date, products: [] }); return; }
    const orderIds = orders.map(o => o.id);

    const { data: items } = await supabase
      .from('order_items')
      .select('product_id, quantity, total_price, order_id')
      .in('order_id', orderIds);

    const { data: products } = await supabase
      .from('products')
      .select('id, name, category_id, stock_quantity, min_stock, cost_price, price, categories(name)');

    const prodMap = new Map<string, any>();
    for (const p of (products || [])) prodMap.set(p.id, p);

    const map = new Map<string, ProductSale>();
    for (const item of (items || [])) {
      const pid = item.product_id;
      const p = prodMap.get(pid);
      if (!pid) continue;
      const cat = (p as any)?.categories;
      const ex = map.get(pid);
      if (ex) { ex.qty += Number(item.quantity); ex.total_kz += Number(item.total_price); }
      else map.set(pid, { product_id: pid, product_name: p?.name || 'Desconhecido', category_id: p?.category_id || '', category_name: cat?.name || '', qty: Number(item.quantity), total_kz: Number(item.total_price), stock_quantity: Number(p?.stock_quantity || 0), min_stock: Number(p?.min_stock || 10), cost_price: Number(p?.cost_price || 0), price: Number(p?.price || 0) });
    }
    setCalendarDayDetail({ date, products: Array.from(map.values()).sort((a, b) => b.total_kz - a.total_kz) });
  }, []);

  useEffect(() => { fetchProductSales(); }, [fetchProductSales]);
  useEffect(() => {
    if (selectedProduct && activeTab === 'daily') fetchDailySales(selectedProduct);
  }, [selectedProduct, activeTab, fetchDailySales]);

  const totalKz = useMemo(() => productSales.reduce((s, p) => s + p.total_kz, 0), [productSales]);
  const totalQty = useMemo(() => productSales.reduce((s, p) => s + p.qty, 0), [productSales]);

  const barProducts = useMemo(() => productSales.filter(p => BAR_CATEGORY_IDS.includes(p.category_id)), [productSales]);
  const kitchenProducts = useMemo(() => productSales.filter(p => !BAR_CATEGORY_IDS.includes(p.category_id)), [productSales]);
  const barTotal = useMemo(() => barProducts.reduce((s, p) => s + p.total_kz, 0), [barProducts]);
  const kitchenTotal = useMemo(() => kitchenProducts.reduce((s, p) => s + p.total_kz, 0), [kitchenProducts]);

  const stockAlerts = useMemo(() =>
    productSales.filter(p => p.stock_quantity <= p.min_stock).length,
    [productSales]);

  const top1 = productSales[0];

  const exportPDF = useCallback(() => {
    const doc = new jsPDF();
    const dataGerado = new Date().toLocaleString('pt-AO', { timeZone: 'Africa/Luanda' });

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('TASCA DO VEREDA — Controlo de Vendas', 14, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${dateRange.from} → ${dateRange.to}`, 14, 24);
    doc.text(`Gerado em: ${dataGerado}`, 14, 30);

    // KPIs sumário
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo', 14, 40);
    autoTable(doc, {
      startY: 44,
      head: [['KPI', 'Valor']],
      body: [
        ['Total Faturado', formatKz(totalKz)],
        ['Total Unidades Vendidas', String(totalQty)],
        ['Produtos Distintos', String(productSales.length)],
        ['Faturação Bar', formatKz(barTotal)],
        ['Faturação Cozinha', formatKz(kitchenTotal)],
        ['% Bar', `${totalKz > 0 ? ((barTotal / totalKz) * 100).toFixed(1) : 0}%`],
        ['% Cozinha', `${totalKz > 0 ? ((kitchenTotal / totalKz) * 100).toFixed(1) : 0}%`],
        ['Stock em Alerta', String(stockAlerts)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [6, 182, 212], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
    });

    const afterSummary = (doc as any).lastAutoTable.finalY + 10;

    // Tabela top produtos
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Top Produtos por Faturação', 14, afterSummary);
    autoTable(doc, {
      startY: afterSummary + 4,
      head: [['#', 'Produto', 'Categoria', 'Grupo', 'Qtd', 'Total Kz', '% Total']],
      body: productSales.map((p, i) => [
        String(i + 1),
        p.product_name,
        p.category_name,
        BAR_CATEGORY_IDS.includes(p.category_id) ? 'Bar' : 'Cozinha',
        String(p.qty),
        formatKz(p.total_kz),
        `${((p.total_kz / totalKz) * 100).toFixed(1)}%`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
    });

    // Stock vs Vendas (nova página se necessário)
    if (productSales.length > 0) {
      doc.addPage();
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Stock vs Vendas', 14, 16);
      const days = Math.max(1, (new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime()) / 86400000 + 1);
      autoTable(doc, {
        startY: 20,
        head: [['Produto', 'Stock Atual', 'Mínimo', 'Vendas (período)', 'Dias até esgotar', 'Estado']],
        body: productSales.map(p => {
          const avgPerDay = p.qty / days;
          const daysLeft = avgPerDay > 0 ? Math.round(p.stock_quantity / avgPerDay) : null;
          const isCritical = p.stock_quantity <= p.min_stock;
          const isWarning = !isCritical && daysLeft !== null && daysLeft < 7;
          return [
            p.product_name,
            String(p.stock_quantity),
            String(p.min_stock),
            `${p.qty} un`,
            daysLeft !== null ? `${daysLeft}d` : '∞',
            isCritical ? 'CRÍTICO' : isWarning ? 'ATENÇÃO' : 'OK',
          ];
        }),
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        didDrawCell: (data: any) => {
          if (data.column.index === 5 && data.section === 'body') {
            const val = data.cell.text[0];
            if (val === 'CRÍTICO') data.cell.styles.textColor = [220, 38, 38];
            else if (val === 'ATENÇÃO') data.cell.styles.textColor = [217, 119, 6];
            else data.cell.styles.textColor = [5, 150, 105];
          }
        },
      });
    }

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `controlo-vendas-${dateRange.from}-${dateRange.to}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [productSales, totalKz, totalQty, barTotal, kitchenTotal, stockAlerts, dateRange]);

  const printReport = useCallback(() => {
    const dataGerado = new Date().toLocaleString('pt-AO', { timeZone: 'Africa/Luanda' });
    const rows = productSales.map((p, i) => `
      <tr style="background:${i % 2 === 0 ? '#f8fafc' : '#fff'}">
        <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:700">${i + 1}</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0">${p.product_name}</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0">${p.category_name}</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:center">
          <span style="padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;background:${BAR_CATEGORY_IDS.includes(p.category_id) ? '#dbeafe' : '#ffedd5'};color:${BAR_CATEGORY_IDS.includes(p.category_id) ? '#1d4ed8' : '#c2410c'}">
            ${BAR_CATEGORY_IDS.includes(p.category_id) ? 'Bar' : 'Cozinha'}
          </span>
        </td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right">${p.qty}</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right;font-weight:700">${formatKz(p.total_kz)}</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right">${((p.total_kz / totalKz) * 100).toFixed(1)}%</td>
      </tr>
    `).join('');

    const days = Math.max(1, (new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime()) / 86400000 + 1);
    const stockRows = productSales.map((p, i) => {
      const avgPerDay = p.qty / days;
      const daysLeft = avgPerDay > 0 ? Math.round(p.stock_quantity / avgPerDay) : null;
      const isCritical = p.stock_quantity <= p.min_stock;
      const isWarning = !isCritical && daysLeft !== null && daysLeft < 7;
      const color = isCritical ? '#dc2626' : isWarning ? '#d97706' : '#059669';
      const label = isCritical ? 'CRÍTICO' : isWarning ? 'ATENÇÃO' : 'OK';
      return `
        <tr style="background:${i % 2 === 0 ? '#f8fafc' : '#fff'}">
          <td style="padding:8px 12px;border:1px solid #e2e8f0">${p.product_name}</td>
          <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right;font-weight:700;color:${isCritical ? '#dc2626' : 'inherit'}">${p.stock_quantity}</td>
          <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right">${p.min_stock}</td>
          <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right">${p.qty} un</td>
          <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right">${daysLeft !== null ? daysLeft + 'd' : '∞'}</td>
          <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:center;font-weight:700;color:${color}">${label}</td>
        </tr>
      `;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Controlo de Vendas — ${dateRange.from} → ${dateRange.to}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
        body{font-family:'Inter',sans-serif;padding:40px;color:#0f172a;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        h1{font-size:22px;font-weight:900;margin:0 0 4px}
        .sub{font-size:12px;color:#64748b;margin-bottom:24px}
        .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px}
        .kpi{background:#f1f5f9;border-radius:10px;padding:14px;border:1px solid #e2e8f0}
        .kpi .label{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}
        .kpi .val{font-size:16px;font-weight:900;color:#0f172a}
        .kpi.bar .val{color:#1d4ed8} .kpi.kitchen .val{color:#c2410c} .kpi.alert .val{color:#dc2626}
        h2{font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin:28px 0 12px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th{background:#0f172a;color:#fff;padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px}
        th:last-child,th:nth-child(5),th:nth-child(6),th:nth-child(7){text-align:right}
        .footer{margin-top:32px;font-size:10px;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0;padding-top:16px}
        @media print{body{padding:15px} .kpi-grid{grid-template-columns:repeat(4,1fr)}}
      </style></head><body>
      <h1>TASCA DO VEREDA — Controlo de Vendas</h1>
      <div class="sub">Período: ${dateRange.from} → ${dateRange.to} &nbsp;|&nbsp; Gerado em: ${dataGerado}</div>
      <div class="kpi-grid">
        <div class="kpi"><div class="label">Total Faturado</div><div class="val">${formatKz(totalKz)}</div></div>
        <div class="kpi"><div class="label">Unidades Vendidas</div><div class="val">${totalQty}</div></div>
        <div class="kpi bar"><div class="label">Bar</div><div class="val">${formatKz(barTotal)} (${totalKz > 0 ? ((barTotal / totalKz) * 100).toFixed(1) : 0}%)</div></div>
        <div class="kpi kitchen"><div class="label">Cozinha</div><div class="val">${formatKz(kitchenTotal)} (${totalKz > 0 ? ((kitchenTotal / totalKz) * 100).toFixed(1) : 0}%)</div></div>
      </div>
      <h2>Top Produtos por Faturação</h2>
      <table>
        <thead><tr><th>#</th><th>Produto</th><th>Categoria</th><th>Grupo</th><th>Qtd</th><th>Total Kz</th><th>% Total</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <h2>Stock vs Vendas</h2>
      <table>
        <thead><tr><th>Produto</th><th style="text-align:right">Stock</th><th style="text-align:right">Mínimo</th><th style="text-align:right">Vendas</th><th style="text-align:right">Dias até esgotar</th><th style="text-align:center">Estado</th></tr></thead>
        <tbody>${stockRows}</tbody>
      </table>
      <div class="footer">Controlo de Vendas · VEREDA OS · Uso Interno</div>
    </body></html>`;

    showPrintPreview(html);
  }, [productSales, totalKz, totalQty, barTotal, kitchenTotal, dateRange]);

  const calendarDays = useMemo(() => {
    const [y, m] = calendarMonth.split('-').map(Number);
    const first = new Date(y, m - 1, 1).getDay();
    const total = new Date(y, m, 0).getDate();
    return { first, total, y, m };
  }, [calendarMonth]);

  const [calendarData, setCalendarData] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    const fetchCalendar = async () => {
      const [y, m] = calendarMonth.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      const fromDate = `${calendarMonth}-01`;
      const toDate = `${calendarMonth}-${String(lastDay).padStart(2, '0')}`;
      const { data, error } = await supabase
        .from('orders')
        .select('data_contabil, total_amount')
        .in('status', ['closed', 'paid'])
        .gte('data_contabil', fromDate)
        .lte('data_contabil', toDate);
      if (error || !data) return;
      const map = new Map<string, number>();
      for (const o of data) {
        const key = o.data_contabil;
        map.set(key, (map.get(key) || 0) + Number(o.total_amount || 0));
      }
      setCalendarData(map);
    };
    fetchCalendar();
  }, [calendarMonth]);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'top', label: 'Top Produtos', icon: <Award size={16} /> },
    { id: 'daily', label: 'Produto por Dia', icon: <TrendingUp size={16} /> },
    { id: 'barkit', label: 'Bar vs Cozinha', icon: <Wine size={16} /> },
    { id: 'calendar', label: 'Calendário', icon: <Calendar size={16} /> },
    { id: 'stock', label: 'Stock vs Vendas', icon: <Package size={16} /> },
  ];

  const periodLabels: { id: Period; label: string }[] = [
    { id: 'today', label: 'Hoje' },
    { id: 'week', label: '7 Dias' },
    { id: 'month', label: 'Mês' },
    { id: 'custom', label: 'Período' },
  ];

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const periodBadge = { today: 'Hoje', week: 'Últimos 7 Dias', month: 'Este Mês', custom: `${dateRange.from} → ${dateRange.to}` };
  const avgTicket = totalQty > 0 ? totalKz / totalQty : 0;
  const estimatedMargin = totalKz * 0.32;

  return (
    <div className="h-full overflow-y-auto bg-slate-950 text-white p-6 space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
              <ShoppingBag className="text-cyan-400" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-tight">Controlo de Vendas</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-slate-500">Dia operacional 05:00–04:59</span>
                <span className="px-2 py-0.5 bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold rounded-full uppercase">{periodBadge[period]}</span>
                {!loading && productSales.length > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400"><Zap size={10} />{productSales.length} produtos</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={printReport}
            disabled={loading || productSales.length === 0}
            title="Imprimir relatório"
            aria-label="Imprimir relatório"
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xl text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Printer size={14} className="text-slate-400" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
          <button
            onClick={exportPDF}
            disabled={loading || productSales.length === 0}
            title="Exportar para PDF"
            aria-label="Exportar para PDF"
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileDown size={14} />
            PDF
          </button>
          <button
            onClick={fetchProductSales}
            disabled={loading}
            title="Atualizar dados"
            aria-label="Atualizar dados"
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xl text-sm transition-all"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-cyan-400' : 'text-slate-400'} />
          </button>
        </div>
      </div>

      {/* KPI CARDS TOPO */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Total Faturado */}
        <div className="bg-gradient-to-br from-cyan-600/20 to-cyan-700/10 border border-cyan-500/20 rounded-xl p-4 col-span-2 lg:col-span-1 xl:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-cyan-300 text-[10px] font-bold uppercase tracking-wider">Total Faturado</p>
            <BarChart2 size={14} className="text-cyan-500" />
          </div>
          <p className="text-white font-black text-2xl">{loading ? '…' : formatKz(totalKz)}</p>
          <p className="text-cyan-400/70 text-xs mt-1">{totalQty} unidades · {productSales.length} produtos</p>
        </div>
        {/* Produto #1 */}
        <div className="bg-slate-900 border border-white/5 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-yellow-400 text-[10px] font-bold uppercase tracking-wider">🥇 Nº 1</p>
            <Award size={13} className="text-yellow-500" />
          </div>
          <p className="text-white font-bold text-sm truncate">{top1?.product_name || '—'}</p>
          <p className="text-yellow-400/80 text-xs mt-1">{top1 ? formatKz(top1.total_kz) : '—'}</p>
        </div>
        {/* Ticket médio por unidade */}
        <div className="bg-slate-900 border border-white/5 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-violet-300 text-[10px] font-bold uppercase tracking-wider">Ticket/Un.</p>
            <TrendingUp size={13} className="text-violet-400" />
          </div>
          <p className="text-white font-black text-lg">{avgTicket > 0 ? formatKz(avgTicket) : '—'}</p>
          <p className="text-violet-400/70 text-xs mt-1">por unidade vendida</p>
        </div>
        {/* Bar vs Cozinha mini */}
        <div className="bg-slate-900 border border-white/5 rounded-xl p-4">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Bar / Cozinha</p>
          <div className="flex items-end gap-1 mb-1">
            <span className="text-blue-400 font-black text-sm">{totalKz > 0 ? ((barTotal / totalKz) * 100).toFixed(0) : 0}%</span>
            <span className="text-slate-600 text-xs">/</span>
            <span className="text-orange-400 font-black text-sm">{totalKz > 0 ? ((kitchenTotal / totalKz) * 100).toFixed(0) : 0}%</span>
          </div>
          <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5">
            <div className="bg-blue-500 rounded-full transition-all w-0" ref={(el) => { if (el) { el.style.width = `${totalKz > 0 ? (barTotal / totalKz) * 100 : 50}%`; } }} />
            <div className="bg-orange-500 rounded-full flex-1" />
          </div>
        </div>
        {/* Margem estimada */}
        <div className="bg-slate-900 border border-white/5 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-emerald-300 text-[10px] font-bold uppercase tracking-wider">Margem Est.</p>
            <ArrowUp size={13} className="text-emerald-400" />
          </div>
          <p className="text-white font-black text-lg">{estimatedMargin > 0 ? formatKz(estimatedMargin) : '—'}</p>
          <p className="text-emerald-400/70 text-xs mt-1">~32% do faturado</p>
        </div>
        {/* Stock crítico */}
        <div className={`rounded-xl p-4 border ${stockAlerts > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-900 border-white/5'}`}>
          <div className="flex items-center justify-between mb-2">
            <p className={`text-[10px] font-bold uppercase tracking-wider ${stockAlerts > 0 ? 'text-red-300' : 'text-slate-400'}`}>Stock Alerta</p>
            <AlertTriangle size={13} className={stockAlerts > 0 ? 'text-red-400' : 'text-slate-600'} />
          </div>
          <p className={`font-black text-2xl ${stockAlerts > 0 ? 'text-red-400' : 'text-slate-500'}`}>{stockAlerts}</p>
          <p className={`text-xs mt-1 ${stockAlerts > 0 ? 'text-red-400/70' : 'text-slate-600'}`}>{stockAlerts > 0 ? 'produtos críticos' : 'Tudo ok'}</p>
        </div>
      </div>

      {/* FILTRO PERÍODO */}
      <div className="flex items-center gap-3 flex-wrap bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3">
        <Filter size={13} className="text-slate-500" />
        <div className="flex gap-1.5">
          {periodLabels.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                period === p.id
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" title="Data início" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="px-3 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-xs text-white" />
            <span className="text-slate-500 text-xs">→</span>
            <input type="date" title="Data fim" value={customTo} onChange={e => setCustomTo(e.target.value)} className="px-3 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-xs text-white" />
          </div>
        )}
        <span className="text-slate-600 text-[11px] ml-auto font-mono">{dateRange.from} → {dateRange.to}</span>
      </div>

      {/* TABS */}
      <div className="flex gap-1 border-b border-white/10">
        {tabs.map(t => {
          const badge = t.id === 'top' ? productSales.length
            : t.id === 'barkit' ? null
            : t.id === 'stock' ? (stockAlerts > 0 ? stockAlerts : null)
            : null;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-all border-b-2 relative ${
                activeTab === t.id
                  ? 'border-cyan-400 text-cyan-400 bg-cyan-400/5'
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-white/20'
              }`}
            >
              {t.icon}{t.label}
              {badge !== null && badge !== undefined && badge > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                  t.id === 'stock' ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-slate-300'
                }`}>{badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* === TAB 1: TOP PRODUTOS === */}
      {activeTab === 'top' && (
        <div className="space-y-6">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-slate-900 rounded-xl p-4 border border-white/5 animate-pulse">
                  <div className="h-4 bg-slate-700 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-800 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : productSales.length === 0 ? (
            <div className="text-center py-24 text-slate-500">
              <ShoppingBag size={40} className="mx-auto mb-3 opacity-20" />
              <p className="font-bold">Sem vendas no período</p>
              <p className="text-xs mt-1">Tente outro período ou verifique a ligação ao Supabase</p>
            </div>
          ) : (
            <>
              {/* Gráfico top 10 */}
              <div className="bg-slate-900 rounded-xl p-4 border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white">Top 10 — Faturação (Kz)</h3>
                  <span className="text-xs text-slate-500">{formatKz(totalKz)} total</span>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productSales.slice(0, 10)} layout="vertical" margin={{ left: 4, right: 24, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                    <XAxis type="number" tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis type="category" dataKey="product_name" tick={{ fill: '#cbd5e1', fontSize: 10 }} width={150} tickFormatter={(v: string) => v.length > 20 ? v.slice(0, 19) + '…' : v} />
                    <Tooltip formatter={(v: number) => formatKz(v)} contentStyle={{ background: '#0f172a', border: '1px solid #22d3ee30', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="total_kz" radius={[0, 6, 6, 0]}>
                      {productSales.slice(0, 10).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Tabela completa */}
              <div className="bg-slate-900 rounded-xl border border-white/5 overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Todos os Produtos ({productSales.length})</h3>
                  <span className="text-xs text-slate-400">Total: {formatKz(totalKz)}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left px-4 py-3 text-slate-400 font-bold uppercase tracking-wider">#</th>
                        <th className="text-left px-4 py-3 text-slate-400 font-bold uppercase tracking-wider">Produto</th>
                        <th className="text-left px-4 py-3 text-slate-400 font-bold uppercase tracking-wider">Categoria</th>
                        <th className="text-right px-4 py-3 text-slate-400 font-bold uppercase tracking-wider">Qtd</th>
                        <th className="text-right px-4 py-3 text-slate-400 font-bold uppercase tracking-wider">Total Kz</th>
                        <th className="text-right px-4 py-3 text-slate-400 font-bold uppercase tracking-wider">% Total</th>
                        <th className="text-center px-4 py-3 text-slate-400 font-bold uppercase tracking-wider">Detalhe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productSales.map((p, i) => (
                        <tr key={p.product_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3">
                            <span className={`font-black ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                              {i + 1}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-white">{p.product_name}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${BAR_CATEGORY_IDS.includes(p.category_id) ? 'bg-blue-500/20 text-blue-300' : 'bg-orange-500/20 text-orange-300'}`}>
                              {BAR_CATEGORY_IDS.includes(p.category_id) ? '🍺 Bar' : '🍳 Cozinha'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-300">{p.qty}</td>
                          <td className="px-4 py-3 text-right font-bold text-white">{formatKz(p.total_kz)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-slate-700 rounded-full h-1.5">
                                <div className="bg-cyan-500 h-1.5 rounded-full w-0" ref={(el) => { if (el) { el.style.width = `${Math.min(100, (p.total_kz / totalKz) * 100).toFixed(1)}%`; } }} />
                              </div>
                              <span className="text-slate-400 w-10 text-right">{((p.total_kz / totalKz) * 100).toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => { setSelectedProduct(p); setActiveTab('daily'); }}
                              className="px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-400 rounded-lg text-[10px] font-bold transition-all"
                            >
                              Ver dias
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* --- SEPARAÇÃO BAR vs COZINHA --- */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* BAR */}
                <div className="bg-slate-900 rounded-xl border border-white/5 overflow-hidden">
                  <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wine size={14} className="text-blue-400" />
                      <h3 className="text-sm font-bold text-blue-300">Top Bar ({barProducts.length})</h3>
                    </div>
                    <span className="text-xs text-slate-400">{formatKz(barTotal)}</span>
                  </div>
                  {barProducts.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">Sem vendas de bar</div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={barProducts.slice(0, 8)} layout="vertical" margin={{ left: 4, right: 20, top: 8, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                          <XAxis type="number" tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                          <YAxis type="category" dataKey="product_name" tick={{ fill: '#93c5fd', fontSize: 10 }} width={140} tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 17) + '…' : v} />
                          <Tooltip formatter={(v: number) => formatKz(v)} contentStyle={{ background: '#0f172a', border: '1px solid #3b82f660', borderRadius: 8, fontSize: 11 }} />
                          <Bar dataKey="total_kz" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-t border-b border-white/5">
                            <th className="text-left px-4 py-2 text-slate-500 font-bold uppercase">#</th>
                            <th className="text-left px-4 py-2 text-slate-500 font-bold uppercase">Produto</th>
                            <th className="text-right px-4 py-2 text-slate-500 font-bold uppercase">Qtd</th>
                            <th className="text-right px-4 py-2 text-slate-500 font-bold uppercase">Kz</th>
                            <th className="text-right px-4 py-2 text-slate-500 font-bold uppercase">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {barProducts.map((p, i) => (
                            <tr key={p.product_id} className="border-b border-white/5 hover:bg-white/5">
                              <td className={`px-4 py-2 font-black ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-600'}`}>{i + 1}</td>
                              <td className="px-4 py-2 text-white font-semibold">{p.product_name}</td>
                              <td className="px-4 py-2 text-right text-slate-300">{p.qty}</td>
                              <td className="px-4 py-2 text-right font-bold text-white">{formatKz(p.total_kz)}</td>
                              <td className="px-4 py-2 text-right text-blue-400">{barTotal > 0 ? ((p.total_kz / barTotal) * 100).toFixed(1) : 0}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>

                {/* COZINHA */}
                <div className="bg-slate-900 rounded-xl border border-white/5 overflow-hidden">
                  <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Utensils size={14} className="text-orange-400" />
                      <h3 className="text-sm font-bold text-orange-300">Top Cozinha ({kitchenProducts.length})</h3>
                    </div>
                    <span className="text-xs text-slate-400">{formatKz(kitchenTotal)}</span>
                  </div>
                  {kitchenProducts.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">Sem vendas de cozinha</div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={kitchenProducts.slice(0, 8)} layout="vertical" margin={{ left: 4, right: 20, top: 8, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                          <XAxis type="number" tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                          <YAxis type="category" dataKey="product_name" tick={{ fill: '#fdba74', fontSize: 10 }} width={140} tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 17) + '…' : v} />
                          <Tooltip formatter={(v: number) => formatKz(v)} contentStyle={{ background: '#0f172a', border: '1px solid #f9731660', borderRadius: 8, fontSize: 11 }} />
                          <Bar dataKey="total_kz" fill="#f97316" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-t border-b border-white/5">
                            <th className="text-left px-4 py-2 text-slate-500 font-bold uppercase">#</th>
                            <th className="text-left px-4 py-2 text-slate-500 font-bold uppercase">Produto</th>
                            <th className="text-right px-4 py-2 text-slate-500 font-bold uppercase">Qtd</th>
                            <th className="text-right px-4 py-2 text-slate-500 font-bold uppercase">Kz</th>
                            <th className="text-right px-4 py-2 text-slate-500 font-bold uppercase">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {kitchenProducts.map((p, i) => (
                            <tr key={p.product_id} className="border-b border-white/5 hover:bg-white/5">
                              <td className={`px-4 py-2 font-black ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-600'}`}>{i + 1}</td>
                              <td className="px-4 py-2 text-white font-semibold">{p.product_name}</td>
                              <td className="px-4 py-2 text-right text-slate-300">{p.qty}</td>
                              <td className="px-4 py-2 text-right font-bold text-white">{formatKz(p.total_kz)}</td>
                              <td className="px-4 py-2 text-right text-orange-400">{kitchenTotal > 0 ? ((p.total_kz / kitchenTotal) * 100).toFixed(1) : 0}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* === TAB 2: PRODUTO POR DIA === */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Selector de produto */}
          <div className="bg-slate-900 rounded-xl p-4 border border-white/5">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Selecionar Produto</label>
            <select
              value={selectedProduct?.product_id || ''}
              onChange={e => {
                const p = productSales.find(x => x.product_id === e.target.value) || null;
                setSelectedProduct(p);
              }}
              className="w-full max-w-sm px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-white"
              title="Selecione um produto"
            >
              <option value="">— Escolha um produto —</option>
              {productSales.map(p => (
                <option key={p.product_id} value={p.product_id}>{p.product_name} ({p.category_name})</option>
              ))}
            </select>
          </div>

          {selectedProduct && dailySales.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900 rounded-xl p-4 border border-white/5 text-center">
                  <p className="text-slate-400 text-xs font-bold uppercase mb-1">Total 7 Dias</p>
                  <p className="text-white font-black text-lg">{formatKz(dailySales.reduce((s, d) => s + d.total_kz, 0))}</p>
                </div>
                <div className="bg-slate-900 rounded-xl p-4 border border-white/5 text-center">
                  <p className="text-slate-400 text-xs font-bold uppercase mb-1">Unidades</p>
                  <p className="text-white font-black text-lg">{dailySales.reduce((s, d) => s + d.qty, 0)}</p>
                </div>
                <div className="bg-slate-900 rounded-xl p-4 border border-white/5 text-center">
                  <p className="text-slate-400 text-xs font-bold uppercase mb-1">Melhor Dia</p>
                  <p className="text-white font-black text-sm">
                    {dailySales.reduce((best, d) => d.total_kz > best.total_kz ? d : best, dailySales[0])?.date || '—'}
                  </p>
                </div>
              </div>

              <div className="bg-slate-900 rounded-xl p-4 border border-white/5">
                <h3 className="text-sm font-bold text-white mb-4">
                  Vendas diárias — <span className="text-cyan-400">{selectedProduct.product_name}</span>
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={dailySales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="date" tickFormatter={d => d.slice(5)} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis yAxisId="kz" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis yAxisId="qty" orientation="right" tick={{ fill: '#a78bfa', fontSize: 11 }} />
                    <Tooltip
                      formatter={(v: number, name: string) => [name === 'total_kz' ? formatKz(v) : v, name === 'total_kz' ? 'Faturação' : 'Unidades']}
                      contentStyle={{ background: '#0f172a', border: '1px solid #ffffff20', borderRadius: 8, fontSize: 12 }}
                    />
                    <Legend formatter={v => v === 'total_kz' ? 'Faturação (Kz)' : 'Unidades'} />
                    <Line yAxisId="kz" type="monotone" dataKey="total_kz" stroke="#22d3ee" strokeWidth={2} dot={{ fill: '#22d3ee', r: 4 }} />
                    <Line yAxisId="qty" type="monotone" dataKey="qty" stroke="#a78bfa" strokeWidth={2} dot={{ fill: '#a78bfa', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-slate-900 rounded-xl border border-white/5 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left px-4 py-3 text-slate-400 font-bold uppercase">Data</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-bold uppercase">Dia Semana</th>
                      <th className="text-right px-4 py-3 text-slate-400 font-bold uppercase">Unidades</th>
                      <th className="text-right px-4 py-3 text-slate-400 font-bold uppercase">Total Kz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailySales.map(d => (
                      <tr key={d.date} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-3 text-white">{d.date}</td>
                        <td className="px-4 py-3 text-slate-400">{dayNames[new Date(d.date).getDay()]}</td>
                        <td className="px-4 py-3 text-right text-slate-300">{d.qty}</td>
                        <td className={`px-4 py-3 text-right font-bold ${d.total_kz > 0 ? 'text-white' : 'text-slate-600'}`}>{d.total_kz > 0 ? formatKz(d.total_kz) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {/* Tabela de todos os produtos — sempre visível */}
          <div className="bg-slate-900 rounded-xl border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Todos os Produtos no Período ({productSales.length})</h3>
              <span className="text-xs text-slate-400">Clique em "Ver dias" para detalhe por dia</span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-10"><RefreshCw className="animate-spin text-cyan-400" size={24} /></div>
            ) : productSales.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">Sem vendas no período</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left px-4 py-3 text-slate-400 font-bold uppercase">#</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-bold uppercase">Produto</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-bold uppercase">Grupo</th>
                      <th className="text-right px-4 py-3 text-slate-400 font-bold uppercase">Qtd Total</th>
                      <th className="text-right px-4 py-3 text-slate-400 font-bold uppercase">Total Kz</th>
                      <th className="text-center px-4 py-3 text-slate-400 font-bold uppercase">Detalhe/Dia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productSales.map((p, i) => (
                      <tr key={p.product_id} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${selectedProduct?.product_id === p.product_id ? 'bg-cyan-500/10' : ''}`}>
                        <td className="px-4 py-2 text-slate-500 font-bold">{i + 1}</td>
                        <td className="px-4 py-2 font-semibold text-white">{p.product_name}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${BAR_CATEGORY_IDS.includes(p.category_id) ? 'bg-blue-500/20 text-blue-300' : 'bg-orange-500/20 text-orange-300'}`}>
                            {BAR_CATEGORY_IDS.includes(p.category_id) ? '🍺 Bar' : '🍳 Cozinha'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-slate-300">{p.qty}</td>
                        <td className="px-4 py-2 text-right font-bold text-white">{formatKz(p.total_kz)}</td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => setSelectedProduct(p)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${selectedProduct?.product_id === p.product_id ? 'bg-cyan-500 text-black' : 'bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-400'}`}
                          >
                            {selectedProduct?.product_id === p.product_id ? '✓ Selecionado' : 'Ver dias'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === TAB 3: BAR vs COZINHA === */}
      {activeTab === 'barkit' && (
        <div className="space-y-6">
          {/* Barra comparativa visual */}
          <div className="bg-slate-900 border border-white/5 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Distribuição Bar vs Cozinha</h3>
              <span className="text-xs text-slate-500">{formatKz(totalKz)} total</span>
            </div>
            <div className="flex h-8 rounded-xl overflow-hidden mb-3 gap-0.5">
              <div
                className="flex items-center justify-center bg-blue-500 transition-all duration-700 rounded-l-xl w-0"
                ref={(el) => { if (el) { el.style.width = `${totalKz > 0 ? (barTotal / totalKz) * 100 : 50}%`; } }}
              >
                <span className="text-[11px] font-black text-white px-2">
                  {totalKz > 0 ? ((barTotal / totalKz) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-center bg-orange-500 flex-1 transition-all duration-700 rounded-r-xl">
                <span className="text-[11px] font-black text-white px-2">
                  {totalKz > 0 ? ((kitchenTotal / totalKz) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                <Wine size={20} className="text-blue-400 shrink-0" />
                <div>
                  <p className="text-blue-300 text-[10px] font-bold uppercase">🍺 Bar ({barProducts.length} produtos)</p>
                  <p className="text-white font-black text-lg">{formatKz(barTotal)}</p>
                  <p className="text-blue-400/70 text-xs">{barProducts.reduce((s, p) => s + p.qty, 0)} unidades</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
                <Utensils size={20} className="text-orange-400 shrink-0" />
                <div>
                  <p className="text-orange-300 text-[10px] font-bold uppercase">🍳 Cozinha ({kitchenProducts.length} produtos)</p>
                  <p className="text-white font-black text-lg">{formatKz(kitchenTotal)}</p>
                  <p className="text-orange-400/70 text-xs">{kitchenProducts.reduce((s, p) => s + p.qty, 0)} unidades</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Donut */}
            <div className="bg-slate-900 rounded-xl p-4 border border-white/5">
              <h3 className="text-sm font-bold text-white mb-4">Distribuição Bar vs Cozinha</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={[{ name: '🍺 Bar', value: barTotal }, { name: '🍳 Cozinha', value: kitchenTotal }]} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value">
                    <Cell fill="#3b82f6" />
                    <Cell fill="#f97316" />
                  </Pie>
                  <Tooltip formatter={(v: number) => formatKz(v)} contentStyle={{ background: '#0f172a', border: '1px solid #ffffff20', borderRadius: 8, fontSize: 12 }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Top 5 Bar */}
            <div className="bg-slate-900 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <Wine size={14} className="text-blue-400" />
                <h3 className="text-sm font-bold text-blue-300">Top Bar</h3>
                <span className="text-xs text-slate-500 ml-auto">{formatKz(barTotal)}</span>
              </div>
              <div className="space-y-2">
                {barProducts.slice(0, 5).map((p, i) => (
                  <div key={p.product_id} className="flex items-center gap-3">
                    <span className={`text-xs font-black w-4 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-500'}`}>{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-white truncate mr-2">{p.product_name}</span>
                        <span className="text-xs text-slate-400 shrink-0">{formatKz(p.total_kz)}</span>
                      </div>
                      <div className="bg-slate-700 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full w-0" ref={(el) => { if (el) { el.style.width = `${barTotal > 0 ? (p.total_kz / barTotal) * 100 : 0}%`; } }} />
                      </div>
                    </div>
                  </div>
                ))}
                {barProducts.length === 0 && <p className="text-slate-500 text-xs">Sem vendas de bar no período</p>}
              </div>
            </div>

            {/* Top 5 Cozinha */}
            <div className="bg-slate-900 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <Utensils size={14} className="text-orange-400" />
                <h3 className="text-sm font-bold text-orange-300">Top Cozinha</h3>
                <span className="text-xs text-slate-500 ml-auto">{formatKz(kitchenTotal)}</span>
              </div>
              <div className="space-y-2">
                {kitchenProducts.slice(0, 5).map((p, i) => (
                  <div key={p.product_id} className="flex items-center gap-3">
                    <span className={`text-xs font-black w-4 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-500'}`}>{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-white truncate mr-2">{p.product_name}</span>
                        <span className="text-xs text-slate-400 shrink-0">{formatKz(p.total_kz)}</span>
                      </div>
                      <div className="bg-slate-700 rounded-full h-1.5">
                        <div className="bg-orange-500 h-1.5 rounded-full w-0" ref={(el) => { if (el) { el.style.width = `${kitchenTotal > 0 ? (p.total_kz / kitchenTotal) * 100 : 0}%`; } }} />
                      </div>
                    </div>
                  </div>
                ))}
                {kitchenProducts.length === 0 && <p className="text-slate-500 text-xs">Sem vendas de cozinha no período</p>}
              </div>
            </div>
          </div>

          {/* Tabela completa BAR */}
          <div className="bg-slate-900 rounded-xl border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center gap-2">
              <Wine size={14} className="text-blue-400" />
              <h3 className="text-sm font-bold text-blue-300">Bar — Todos os Produtos ({barProducts.length})</h3>
            </div>
            {barProducts.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">Sem vendas de bar no período</div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-4 py-2 text-slate-400 font-bold uppercase">#</th>
                    <th className="text-left px-4 py-2 text-slate-400 font-bold uppercase">Produto</th>
                    <th className="text-left px-4 py-2 text-slate-400 font-bold uppercase">Categoria</th>
                    <th className="text-right px-4 py-2 text-slate-400 font-bold uppercase">Qtd</th>
                    <th className="text-right px-4 py-2 text-slate-400 font-bold uppercase">Total Kz</th>
                    <th className="text-right px-4 py-2 text-slate-400 font-bold uppercase">% Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {barProducts.map((p, i) => (
                    <tr key={p.product_id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-2 text-slate-500 font-bold">{i + 1}</td>
                      <td className="px-4 py-2 font-semibold text-white">{p.product_name}</td>
                      <td className="px-4 py-2 text-slate-400">{p.category_name}</td>
                      <td className="px-4 py-2 text-right text-slate-300">{p.qty}</td>
                      <td className="px-4 py-2 text-right font-bold text-white">{formatKz(p.total_kz)}</td>
                      <td className="px-4 py-2 text-right text-blue-400">{barTotal > 0 ? ((p.total_kz / barTotal) * 100).toFixed(1) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Tabela completa COZINHA */}
          <div className="bg-slate-900 rounded-xl border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center gap-2">
              <Utensils size={14} className="text-orange-400" />
              <h3 className="text-sm font-bold text-orange-300">Cozinha — Todos os Produtos ({kitchenProducts.length})</h3>
            </div>
            {kitchenProducts.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">Sem vendas de cozinha no período</div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-4 py-2 text-slate-400 font-bold uppercase">#</th>
                    <th className="text-left px-4 py-2 text-slate-400 font-bold uppercase">Produto</th>
                    <th className="text-left px-4 py-2 text-slate-400 font-bold uppercase">Categoria</th>
                    <th className="text-right px-4 py-2 text-slate-400 font-bold uppercase">Qtd</th>
                    <th className="text-right px-4 py-2 text-slate-400 font-bold uppercase">Total Kz</th>
                    <th className="text-right px-4 py-2 text-slate-400 font-bold uppercase">% Cozinha</th>
                  </tr>
                </thead>
                <tbody>
                  {kitchenProducts.map((p, i) => (
                    <tr key={p.product_id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-2 text-slate-500 font-bold">{i + 1}</td>
                      <td className="px-4 py-2 font-semibold text-white">{p.product_name}</td>
                      <td className="px-4 py-2 text-slate-400">{p.category_name}</td>
                      <td className="px-4 py-2 text-right text-slate-300">{p.qty}</td>
                      <td className="px-4 py-2 text-right font-bold text-white">{formatKz(p.total_kz)}</td>
                      <td className="px-4 py-2 text-right text-orange-400">{kitchenTotal > 0 ? ((p.total_kz / kitchenTotal) * 100).toFixed(1) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* === TAB 4: CALENDÁRIO === */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Calendário de Vendas</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Clique num dia a verde para ver detalhe</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => {
                const [y, m] = calendarMonth.split('-').map(Number);
                const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
                setCalendarMonth(prev);
              }} title="Mês anterior" aria-label="Mês anterior" className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"><ChevronLeft size={14} /></button>
              <span className="text-white font-bold text-sm min-w-[90px] text-center">
                {new Date(calendarMonth + '-15').toLocaleDateString('pt-AO', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => {
                const [y, m] = calendarMonth.split('-').map(Number);
                const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
                setCalendarMonth(next);
              }} title="Mês seguinte" aria-label="Mês seguinte" className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"><ChevronRight size={14} /></button>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl p-4 border border-white/5">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-slate-500 uppercase py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: calendarDays.first }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: calendarDays.total }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${calendarDays.y}-${String(calendarDays.m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const val = calendarData.get(dateStr) || 0;
                const isToday = dateStr === today;
                const hasData = val > 0;
                return (
                  <button
                    key={day}
                    onClick={() => hasData && fetchCalendarDayDetail(dateStr)}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all text-center p-1 ${isToday ? 'ring-2 ring-cyan-400' : ''} ${hasData ? 'bg-emerald-500/20 hover:bg-emerald-500/30 cursor-pointer' : 'bg-slate-800/50 cursor-default'}`}
                  >
                    <span className={`text-[10px] font-bold ${isToday ? 'text-cyan-400' : 'text-slate-300'}`}>{day}</span>
                    {hasData && <span className="text-[8px] text-emerald-400 font-bold leading-tight">{(val / 1000).toFixed(0)}k</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modal dia detalhe */}
          {calendarDayDetail && (() => {
            const dayBar = calendarDayDetail.products.filter(p => BAR_CATEGORY_IDS.includes(p.category_id));
            const dayKitchen = calendarDayDetail.products.filter(p => !BAR_CATEGORY_IDS.includes(p.category_id));
            const dayBarTotal = dayBar.reduce((s, p) => s + p.total_kz, 0);
            const dayKitchenTotal = dayKitchen.reduce((s, p) => s + p.total_kz, 0);
            const dayTotal = calendarDayDetail.products.reduce((s, p) => s + p.total_kz, 0);
            const dayQty = calendarDayDetail.products.reduce((s, p) => s + p.qty, 0);
            return (
              <div className="space-y-4">
                {/* Header do dia */}
                <div className="bg-slate-900 rounded-xl border border-white/10 overflow-hidden">
                  <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">📅 {calendarDayDetail.date} — Vendas do dia</h3>
                    <button onClick={() => setCalendarDayDetail(null)} className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800 rounded-lg">✕ Fechar</button>
                  </div>
                  {/* KPI resumo do dia */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-white/5">
                    <div className="p-4 text-center">
                      <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">Total Dia</p>
                      <p className="text-white font-black text-base">{formatKz(dayTotal)}</p>
                    </div>
                    <div className="p-4 text-center">
                      <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">Unidades</p>
                      <p className="text-white font-black text-base">{dayQty}</p>
                    </div>
                    <div className="p-4 text-center">
                      <p className="text-blue-400 text-[10px] font-bold uppercase mb-1">🍺 Bar</p>
                      <p className="text-blue-300 font-black text-base">{formatKz(dayBarTotal)}</p>
                      <p className="text-slate-500 text-[10px]">{dayTotal > 0 ? ((dayBarTotal / dayTotal) * 100).toFixed(1) : 0}%</p>
                    </div>
                    <div className="p-4 text-center">
                      <p className="text-orange-400 text-[10px] font-bold uppercase mb-1">🍳 Cozinha</p>
                      <p className="text-orange-300 font-black text-base">{formatKz(dayKitchenTotal)}</p>
                      <p className="text-slate-500 text-[10px]">{dayTotal > 0 ? ((dayKitchenTotal / dayTotal) * 100).toFixed(1) : 0}%</p>
                    </div>
                  </div>
                </div>

                {/* Bar e Cozinha lado a lado */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* TOP BAR do dia */}
                  <div className="bg-slate-900 rounded-xl border border-blue-500/20 overflow-hidden">
                    <div className="p-3 border-b border-white/5 flex items-center justify-between bg-blue-500/5">
                      <div className="flex items-center gap-2">
                        <Wine size={13} className="text-blue-400" />
                        <span className="text-xs font-bold text-blue-300">Top Bar ({dayBar.length})</span>
                      </div>
                      <span className="text-xs text-slate-400">{formatKz(dayBarTotal)}</span>
                    </div>
                    {dayBar.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-xs">Sem vendas de bar</div>
                    ) : (
                      <table className="w-full text-xs">
                        <tbody>
                          {dayBar.map((p, i) => (
                            <tr key={p.product_id} className="border-b border-white/5 hover:bg-white/5">
                              <td className={`px-3 py-2 font-black w-6 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-600'}`}>{i + 1}</td>
                              <td className="px-3 py-2 text-white">{p.product_name}</td>
                              <td className="px-3 py-2 text-right text-slate-400">{p.qty}x</td>
                              <td className="px-3 py-2 text-right font-bold text-blue-300">{formatKz(p.total_kz)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* TOP COZINHA do dia */}
                  <div className="bg-slate-900 rounded-xl border border-orange-500/20 overflow-hidden">
                    <div className="p-3 border-b border-white/5 flex items-center justify-between bg-orange-500/5">
                      <div className="flex items-center gap-2">
                        <Utensils size={13} className="text-orange-400" />
                        <span className="text-xs font-bold text-orange-300">Top Cozinha ({dayKitchen.length})</span>
                      </div>
                      <span className="text-xs text-slate-400">{formatKz(dayKitchenTotal)}</span>
                    </div>
                    {dayKitchen.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-xs">Sem vendas de cozinha</div>
                    ) : (
                      <table className="w-full text-xs">
                        <tbody>
                          {dayKitchen.map((p, i) => (
                            <tr key={p.product_id} className="border-b border-white/5 hover:bg-white/5">
                              <td className={`px-3 py-2 font-black w-6 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-600'}`}>{i + 1}</td>
                              <td className="px-3 py-2 text-white">{p.product_name}</td>
                              <td className="px-3 py-2 text-right text-slate-400">{p.qty}x</td>
                              <td className="px-3 py-2 text-right font-bold text-orange-300">{formatKz(p.total_kz)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Tabela completa do dia */}
                <div className="bg-slate-900 rounded-xl border border-white/10 overflow-hidden">
                  <div className="p-3 border-b border-white/5">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Todos os Produtos — {calendarDayDetail.date}</h3>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left px-4 py-2 text-slate-400 font-bold">#</th>
                        <th className="text-left px-4 py-2 text-slate-400 font-bold">Produto</th>
                        <th className="text-left px-4 py-2 text-slate-400 font-bold">Grupo</th>
                        <th className="text-right px-4 py-2 text-slate-400 font-bold">Qtd</th>
                        <th className="text-right px-4 py-2 text-slate-400 font-bold">Total Kz</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calendarDayDetail.products.map((p, i) => (
                        <tr key={p.product_id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="px-4 py-2 text-slate-500">{i + 1}</td>
                          <td className="px-4 py-2 text-white font-semibold">{p.product_name}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${BAR_CATEGORY_IDS.includes(p.category_id) ? 'bg-blue-500/20 text-blue-300' : 'bg-orange-500/20 text-orange-300'}`}>
                              {BAR_CATEGORY_IDS.includes(p.category_id) ? '🍺 Bar' : '🍳 Cozinha'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right text-slate-300">{p.qty}</td>
                          <td className="px-4 py-2 text-right font-bold text-white">{formatKz(p.total_kz)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* === TAB 5: STOCK vs VENDAS === */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          <div className="bg-slate-900 rounded-xl border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <h3 className="text-sm font-bold text-white">Stock vs Vendas — {dateRange.from} → {dateRange.to}</h3>
              <p className="text-xs text-slate-400 mt-1">Dias até esgotar = stock atual ÷ média de vendas/dia no período</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-4 py-3 text-slate-400 font-bold uppercase">Produto</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-bold uppercase">Stock Atual</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-bold uppercase">Mínimo</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-bold uppercase">Vendas (período)</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-bold uppercase">Dias até esgotar</th>
                    <th className="text-center px-4 py-3 text-slate-400 font-bold uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {productSales.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-slate-500">Sem dados</td></tr>
                  ) : (
                    productSales.map(p => {
                      const days = Math.max(1, (new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime()) / 86400000 + 1);
                      const avgPerDay = p.qty / days;
                      const daysLeft = avgPerDay > 0 ? Math.round(p.stock_quantity / avgPerDay) : null;
                      const isCritical = p.stock_quantity <= p.min_stock;
                      const isWarning = !isCritical && daysLeft !== null && daysLeft < 7;
                      return (
                        <tr key={p.product_id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="px-4 py-3 font-semibold text-white">{p.product_name}</td>
                          <td className={`px-4 py-3 text-right font-bold ${isCritical ? 'text-red-400' : 'text-white'}`}>{p.stock_quantity}</td>
                          <td className="px-4 py-3 text-right text-slate-400">{p.min_stock}</td>
                          <td className="px-4 py-3 text-right text-slate-300">{p.qty} un</td>
                          <td className={`px-4 py-3 text-right font-bold ${isCritical ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-emerald-400'}`}>
                            {daysLeft !== null ? `${daysLeft}d` : '∞'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isCritical
                              ? <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-[10px] font-bold">🔴 CRÍTICO</span>
                              : isWarning
                              ? <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-[10px] font-bold">🟡 ATENÇÃO</span>
                              : <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-bold">🟢 OK</span>
                            }
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesControl;
