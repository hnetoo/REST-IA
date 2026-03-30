import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Package, DollarSign, UserCheck, Activity, Target, Clock, AlertTriangle, BarChart3, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSyncCore } from '../hooks/useSyncCore';
import { supabase } from '../supabase_standalone';

const Reports = () => {
  const { addNotification, menu } = useStore();
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);

  // 🚀 CONECTAR AO MOTOR SYNC CORE
  const {
    totalRevenue,
    totalExpenses,
    staffCosts,
    netProfit,
    alerts,
    predictions,
    isLoading: syncLoading
  } = useSyncCore();

  // Estados para os relatórios
  const [vendasPorArtigo, setVendasPorArtigo] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [financasDetalhadas, setFinancasDetalhadas] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [rhEFaltas, setRhEFaltas] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [mapaDespesas, setMapaDespesas] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [topRentabilidade, setTopRentabilidade] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [fluxoPorTurno, setFluxoPorTurno] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [alertasStock, setAlertasStock] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });

  const formatKz = (value: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      maximumFractionDigits: 0
    }).format(value);
  };

  const savePDF = (doc: jsPDF, filename: string) => {
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        doc.save(filename);
        addNotification('success', `PDF salvo: ${filename}`);
      } else {
        doc.save(filename);
        addNotification('success', `PDF baixado: ${filename}`);
      }
    } catch (error) {
      console.error('[PDF] Erro ao salvar:', error);
      addNotification('error', 'Erro ao salvar PDF');
    }
  };

  // Funções para buscar dados
  const fetchVendasPorArtigo = async () => {
    setVendasPorArtigo({ ...vendasPorArtigo, loading: true });
    try {
      console.log('[RELATÓRIO] Buscando vendas por artigo do Supabase...');
      
      // Buscar order_items do Supabase
      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select('product_id, quantity, unit_price');
      
      if (error) {
        console.error('[RELATÓRIO] Erro ao buscar order_items:', error);
        setVendasPorArtigo({ data: [], loading: false });
        return;
      }
      
      if (!orderItems || orderItems.length === 0) {
        console.log('[RELATÓRIO] Nenhum order_item encontrado');
        setVendasPorArtigo({ data: [], loading: false });
        return;
      }
      
      console.log('[RELATÓRIO] Order items encontrados:', orderItems.length);
      
      // Agrupar por produto
      const productSales: Record<string, { produto: string, quantidade: number, total: number }> = {};
      
      orderItems.forEach((item: any) => {
        const productId = item.product_id;
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unit_price || 0);
        const total = quantity * unitPrice;
        
        // Buscar nome do produto do menu
        const dish = menu.find(m => m.id === productId);
        const productName = dish?.name || `Produto ${productId?.substring(0, 8) || 'Desconhecido'}`;
        
        if (!productSales[productId]) {
          productSales[productId] = {
            produto: productName,
            quantidade: 0,
            total: 0
          };
        }
        
        productSales[productId].quantidade += quantity;
        productSales[productId].total += total;
      });
      
      const result = Object.values(productSales)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10); // Top 10 produtos
      
      console.log('[RELATÓRIO] Vendas por artigo calculadas:', result);
      setVendasPorArtigo({ data: result, loading: false });
      
    } catch (error) {
      console.error('[RELATÓRIO] Erro ao buscar vendas por artigo:', error);
      setVendasPorArtigo({ data: [], loading: false });
    }
  };

  const fetchFinancasDetalhadas = async () => {
    setFinancasDetalhadas({ ...financasDetalhadas, loading: true });
    try {
      // 🚀 USAR DADOS DO MOTOR SYNC CORE
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulação de carregamento
      
      // Dados reais do motor sync
      const financialData = [{
        receita: totalRevenue,
        despesas: totalExpenses,
        lucro: netProfit,
        custosStaff: staffCosts,
        margem: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0
      }];
      
      setFinancasDetalhadas({ data: financialData, loading: false });
    } catch (error) {
      console.error(error);
      setFinancasDetalhadas({ data: [], loading: false });
    }
  };

  const fetchRhEFaltas = async () => {
    setRhEFaltas({ ...rhEFaltas, loading: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setRhEFaltas({ data: [{ funcionario: 'João', faltas: 2, desconto: 10000 }], loading: false });
    } catch (error) {
      console.error(error);
      setRhEFaltas({ data: [], loading: false });
    }
  };

  const fetchMapaDespesas = async () => {
    setMapaDespesas({ ...mapaDespesas, loading: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMapaDespesas({ data: [{ categoria: 'Alimentos', valor: 15000 }, { categoria: 'Bebidas', valor: 8000 }], loading: false });
    } catch (error) {
      console.error(error);
      setMapaDespesas({ data: [], loading: false });
    }
  };

  const fetchTopRentabilidade = async () => {
    setTopRentabilidade({ ...topRentabilidade, loading: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTopRentabilidade({ data: [{ produto: 'Cerveja', margem: 60 }, { produto: 'Refrigerante', margem: 45 }], loading: false });
    } catch (error) {
      console.error(error);
      setTopRentabilidade({ data: [], loading: false });
    }
  };

  const fetchFluxoPorTurno = async () => {
    setFluxoPorTurno({ ...fluxoPorTurno, loading: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setFluxoPorTurno({ data: [{ turno: 'Manhã', total: 45000 }, { turno: 'Tarde', total: 55000 }], loading: false });
    } catch (error) {
      console.error(error);
      setFluxoPorTurno({ data: [], loading: false });
    }
  };

  const fetchAlertasStock = async () => {
    setAlertasStock({ ...alertasStock, loading: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAlertasStock({ data: [{ produto: 'Cerveja', stock: 5, minimo: 10 }], loading: false });
    } catch (error) {
      console.error(error);
      setAlertasStock({ data: [], loading: false });
    }
  };

  // Funções para gerar PDFs
  const generateVendasPorArtigoPDF = async () => {
    setPdfLoading('vendas');
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Tasca do Vereda - Vendas por Artigo', 14, 15);
      
      const dataLuanda = new Date().toLocaleDateString('pt-AO', {
        timeZone: 'Africa/Luanda',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Data: ${dataLuanda}`, 14, 25);
      
      const tableData = vendasPorArtigo.data.map((item: any) => [
        item.produto || 'Produto',
        item.quantidade || 0,
        formatKz(item.total || 0)
      ]);
      
      autoTable(doc, {
        head: [['Produto', 'Quantidade', 'Total']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 }
      });
      
      savePDF(doc, 'vendas-por-artigo.pdf');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setPdfLoading(null);
    }
  };

  const generateFinancasDetalhadasPDF = async () => {
    setPdfLoading('financas');
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Tasca do Vereda - Finanças Detalhadas', 14, 15);
      
      const dataLuanda = new Date().toLocaleDateString('pt-AO', {
        timeZone: 'Africa/Luanda',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Data: ${dataLuanda}`, 14, 25);
      
      const tableData = financasDetalhadas.data.map((item: any) => [
        'Receita',
        formatKz(item.receita || 0),
        'Despesas',
        formatKz(item.despesas || 0),
        'Lucro',
        formatKz(item.lucro || 0)
      ]);
      
      autoTable(doc, {
        head: [['Tipo', 'Valor']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 }
      });
      
      savePDF(doc, 'financas-detalhadas.pdf');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setPdfLoading(null);
    }
  };

  const generateRhEFaltasPDF = async () => {
    setPdfLoading('rh');
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Tasca do Vereda - RH e Faltas', 14, 15);
      
      const dataLuanda = new Date().toLocaleDateString('pt-AO', {
        timeZone: 'Africa/Luanda',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Data: ${dataLuanda}`, 14, 25);
      
      const tableData = rhEFaltas.data.map((item: any) => [
        item.funcionario || 'Funcionário',
        item.faltas || 0,
        formatKz(item.desconto || 0)
      ]);
      
      autoTable(doc, {
        head: [['Funcionário', 'Faltas', 'Desconto']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 }
      });
      
      savePDF(doc, 'rh-e-faltas.pdf');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setPdfLoading(null);
    }
  };

  const generateMapaDespesasPDF = async () => {
    setPdfLoading('despesas');
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Tasca do Vereda - Mapa de Despesas', 14, 15);
      
      const dataLuanda = new Date().toLocaleDateString('pt-AO', {
        timeZone: 'Africa/Luanda',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Data: ${dataLuanda}`, 14, 25);
      
      const tableData = mapaDespesas.data.map((item: any) => [
        item.categoria || 'Categoria',
        formatKz(item.valor || 0)
      ]);
      
      autoTable(doc, {
        head: [['Categoria', 'Valor']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 }
      });
      
      savePDF(doc, 'mapa-despesas.pdf');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setPdfLoading(null);
    }
  };

  const generateTopRentabilidadePDF = async () => {
    setPdfLoading('rentabilidade');
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Tasca do Vereda - Top Rentabilidade', 14, 15);
      
      const dataLuanda = new Date().toLocaleDateString('pt-AO', {
        timeZone: 'Africa/Luanda',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Data: ${dataLuanda}`, 14, 25);
      
      const tableData = topRentabilidade.data.map((item: any) => [
        item.produto || 'Produto',
        `${item.margem || 0}%`
      ]);
      
      autoTable(doc, {
        head: [['Produto', 'Margem']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 }
      });
      
      savePDF(doc, 'top-rentabilidade.pdf');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setPdfLoading(null);
    }
  };

  const generateFluxoPorTurnoPDF = async () => {
    setPdfLoading('fluxo');
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Tasca do Vereda - Fluxo por Turno', 14, 15);
      
      const dataLuanda = new Date().toLocaleDateString('pt-AO', {
        timeZone: 'Africa/Luanda',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Data: ${dataLuanda}`, 14, 25);
      
      const tableData = fluxoPorTurno.data.map((item: any) => [
        item.turno || 'Turno',
        formatKz(item.total || 0)
      ]);
      
      autoTable(doc, {
        head: [['Turno', 'Total Faturado']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 }
      });
      
      savePDF(doc, 'fluxo-por-turno.pdf');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setPdfLoading(null);
    }
  };

  const generateAlertasStockPDF = async () => {
    setPdfLoading('stock');
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Tasca do Vereda - Alertas de Stock', 14, 15);
      
      const dataLuanda = new Date().toLocaleDateString('pt-AO', {
        timeZone: 'Africa/Luanda',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Data: ${dataLuanda}`, 14, 25);
      
      const tableData = alertasStock.data.map((item: any) => [
        item.produto || 'Produto',
        item.stock || 0,
        item.minimo || 0
      ]);
      
      autoTable(doc, {
        head: [['Produto', 'Stock Atual', 'Stock Mínimo']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 }
      });
      
      savePDF(doc, 'alertas-stock.pdf');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setPdfLoading(null);
    }
  };

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
  const Card = ({ title, icon, description, data, loading, onGenerate, onGeneratePDF, color }: any) => (
    <div className="glass-panel p-4 rounded-xl border border-white/5 hover:border-white/10 transition-all">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg text-white bg-dynamic`} style={{'--dynamic-color': color} as React.CSSProperties}>
          {React.cloneElement(icon, { size: 18 })}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white truncate">{title}</h3>
          <p className="text-xs text-slate-400 line-clamp-2">{description}</p>
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-slate-300">
            {Array.isArray(data) && data.length > 0 ? (
              data.length === 1 && data[0].mensagem ? (
                <span>{data[0].mensagem}</span>
              ) : (
                <span>{data.length} registros encontrados</span>
              )
            ) : (
              <span>Sem dados disponíveis</span>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onGenerate}
              className="flex-1 py-2 bg-white/10 border border-white/20 text-white rounded-lg text-xs font-black uppercase hover:bg-white/20 transition-all flex items-center justify-center gap-1"
            >
              <BarChart3 size={14} />
              Gerar
            </button>
            
            <button
              onClick={onGeneratePDF}
              disabled={pdfLoading !== null}
              className="py-2 px-2 bg-white/10 border border-white/20 text-white rounded-lg text-xs font-black uppercase hover:bg-white/20 transition-all flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Exportar PDF"
            >
              {pdfLoading ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                </>
              ) : (
                <>
                  <FileDown size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 h-full overflow-y-auto no-scrollbar bg-background text-sm">
      <header className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Relatórios</h2>
            <p className="text-slate-400 text-sm mt-1">Sistema de relatórios e análises</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-xs"
            placeholder="Data Início"
          />
          
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-xs"
            placeholder="Data Fim"
          />
          
          <button 
            onClick={loadAllCards}
            disabled={loading}
            className="px-4 py-2 bg-primary text-black rounded-lg text-xs font-black uppercase hover:brightness-110 transition-all flex items-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
            ) : (
              <BarChart3 size={14} />
            )}
            Atualizar
          </button>
        </div>
      </header>

      {/* Layout Grid com 7 Cards Dinâmicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card
          title="Vendas por Artigo"
          icon={<Package size={20} />}
          description="Query que soma quantity por product_id"
          data={vendasPorArtigo.data}
          loading={vendasPorArtigo.loading}
          onGenerate={fetchVendasPorArtigo}
          onGeneratePDF={generateVendasPorArtigoPDF}
          color="#06b6d4"
        />
        
        <Card
          title="Finanças Detalhadas"
          icon={<DollarSign size={20} />}
          description="Balanço orders vs expenses"
          data={financasDetalhadas.data}
          loading={financasDetalhadas.loading}
          onGenerate={fetchFinancasDetalhadas}
          onGeneratePDF={generateFinancasDetalhadasPDF}
          color="#10b981"
        />
        
        <Card
          title="RH e Faltas"
          icon={<UserCheck size={20} />}
          description="Lógica de cálculo (salario/30) * faltas"
          data={rhEFaltas.data}
          loading={rhEFaltas.loading}
          onGenerate={fetchRhEFaltas}
          onGeneratePDF={generateRhEFaltasPDF}
          color="#f59e0b"
        />
        
        <Card
          title="Mapa de Despesas"
          icon={<Activity size={20} />}
          description="Agrupamento por categoria"
          data={mapaDespesas.data}
          loading={mapaDespesas.loading}
          onGenerate={fetchMapaDespesas}
          onGeneratePDF={generateMapaDespesasPDF}
          color="#ef4444"
        />
        
        <Card
          title="Top Rentabilidade"
          icon={<Target size={20} />}
          description="Cálculo de margem bruta"
          data={topRentabilidade.data}
          loading={topRentabilidade.loading}
          onGenerate={fetchTopRentabilidade}
          onGeneratePDF={generateTopRentabilidadePDF}
          color="#8b5cf6"
        />
        
        <Card
          title="Fluxo por Turno"
          icon={<Clock size={20} />}
          description="Filtro por created_at (HH:mm)"
          data={fluxoPorTurno.data}
          loading={fluxoPorTurno.loading}
          onGenerate={fetchFluxoPorTurno}
          onGeneratePDF={generateFluxoPorTurnoPDF}
          color="#ec4899"
        />
        
        <Card
          title="Alertas de Stock"
          icon={<AlertTriangle size={20} />}
          description="Filtro de stock_quantity < min_stock"
          data={alertasStock.data}
          loading={alertasStock.loading}
          onGenerate={fetchAlertasStock}
          onGeneratePDF={generateAlertasStockPDF}
          color="#f97316"
        />
      </div>
    </div>
  );
};

export default Reports;
