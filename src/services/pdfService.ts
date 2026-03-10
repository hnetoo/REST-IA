import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';

// Interface para dados de pedidos
interface Order {
  id: string;
  created_at: string;
  table_id: string | null;
  status: string;
  total_amount_kz: number;
  closed_at: string | null;
}

// Interface para dados de purchase requests
interface PurchaseRequest {
  id: string;
  created_at: string;
  description: string;
  amount_kz: number;
  provider: string;
  status: 'pendente' | 'pago' | 'cancelado';
}

// Função para formatar moeda AKZ
const formatAKZ = (value: number): string => {
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value).replace('AOA', 'AKZ');
};

// Função para formatar data
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('pt-AO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Gerar Relatório de Vendas
export const generateSalesReport = async () => {
  try {
    console.log('[PDF] Gerando relatório de vendas...');
    
    // Buscar dados do Supabase
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[PDF] Erro ao buscar pedidos:', error);
      throw new Error('Erro ao buscar dados de vendas');
    }

    if (!orders || orders.length === 0) {
      console.log('[PDF] Nenhum pedido encontrado');
      throw new Error('Nenhuma venda encontrada para gerar relatório');
    }

    console.log(`[PDF] ${orders.length} pedidos encontrados`);

    // Criar documento PDF
    const doc = new jsPDF();
    
    // Configurar fonte para suporte a caracteres especiais
    doc.setFont('helvetica');
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.text('Relatório de Vendas', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text('Tasca Do Vereda - Sistema de Gestão', 105, 30, { align: 'center' });
    
    // Data do relatório
    const reportDate = new Date().toLocaleDateString('pt-AO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    doc.text(`Data: ${reportDate}`, 105, 40, { align: 'center' });
    
    // Estatísticas
    const totalSales = orders.reduce((sum, order) => sum + (order.total_amount_kz || 0), 0);
    const closedOrders = orders.filter(order => order.status === 'closed').length;
    const averageTicket = closedOrders > 0 ? totalSales / closedOrders : 0;
    
    // Resumo
    doc.setFontSize(14);
    doc.text('Resumo de Vendas', 20, 60);
    
    doc.setFontSize(10);
    doc.text(`Total de Vendas: ${formatAKZ(totalSales)}`, 20, 70);
    doc.text(`Pedidos Fechados: ${closedOrders}`, 20, 80);
    doc.text(`Ticket Médio: ${formatAKZ(averageTicket)}`, 20, 90);
    doc.text(`Total de Pedidos: ${orders.length}`, 20, 100);
    
    // Tabela de vendas
    const tableData = orders.map(order => [
      formatDate(order.created_at),
      order.table_id || 'N/A',
      order.status,
      formatAKZ(order.total_amount_kz || 0)
    ]);
    
    // Adicionar tabela
    autoTable(doc, {
      head: [['Data', 'Mesa', 'Status', 'Valor']],
      body: tableData,
      startY: 110,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });
    
    // Rodapé
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Página ${i} de ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    // Gerar blob e download
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    // Criar link de download
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `relatorio-vendas-${reportDate.replace(/\//g, '-')}.pdf`;
    
    // Adicionar ao DOM e clicar
    document.body.appendChild(link);
    link.click();
    
    // Limpar
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(pdfUrl);
    }, 100);
    
    console.log('[PDF] Relatório de vendas gerado com sucesso!');
    
  } catch (error) {
    console.error('[PDF] Erro ao gerar relatório:', error);
    throw error;
  }
};

// Gerar Relatório de Compras
export const generatePurchaseReport = async () => {
  try {
    console.log('[PDF] Gerando relatório de compras...');
    
    // Buscar dados do Supabase
    const { data: purchases, error } = await supabase
      .from('purchase_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[PDF] Erro ao buscar compras:', error);
      throw new Error('Erro ao buscar dados de compras');
    }

    if (!purchases || purchases.length === 0) {
      console.log('[PDF] Nenhuma compra encontrada');
      throw new Error('Nenhuma compra encontrada para gerar relatório');
    }

    console.log(`[PDF] ${purchases.length} compras encontradas`);

    // Criar documento PDF
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.text('Relatório de Compras', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text('Tasca Do Vereda - Sistema de Gestão', 105, 30, { align: 'center' });
    
    // Data do relatório
    const reportDate = new Date().toLocaleDateString('pt-AO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    doc.text(`Data: ${reportDate}`, 105, 40, { align: 'center' });
    
    // Estatísticas
    const totalPurchases = purchases.reduce((sum, purchase) => sum + (purchase.amount_kz || 0), 0);
    const pendingPurchases = purchases.filter(p => p.status === 'pendente').length;
    const paidPurchases = purchases.filter(p => p.status === 'pago').length;
    const cancelledPurchases = purchases.filter(p => p.status === 'cancelado').length;
    
    // Resumo
    doc.setFontSize(14);
    doc.text('Resumo de Compras', 20, 60);
    
    doc.setFontSize(10);
    doc.text(`Total de Compras: ${formatAKZ(totalPurchases)}`, 20, 70);
    doc.text(`Pedidos Pendentes: ${pendingPurchases}`, 20, 80);
    doc.text(`Pedidos Pagos: ${paidPurchases}`, 20, 90);
    doc.text(`Pedidos Cancelados: ${cancelledPurchases}`, 20, 100);
    
    // Tabela de compras
    const tableData = purchases.map(purchase => [
      formatDate(purchase.created_at),
      purchase.description,
      purchase.provider,
      purchase.status,
      formatAKZ(purchase.amount_kz || 0)
    ]);
    
    // Adicionar tabela
    autoTable(doc, {
      head: [['Data', 'Descrição', 'Fornecedor', 'Status', 'Valor']],
      body: tableData,
      startY: 110,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [34, 197, 94],
        textColor: 255
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });
    
    // Rodapé
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Página ${i} de ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    // Gerar blob e download
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    // Criar link de download
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `relatorio-compras-${reportDate.replace(/\//g, '-')}.pdf`;
    
    // Adicionar ao DOM e clicar
    document.body.appendChild(link);
    link.click();
    
    // Limpar
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(pdfUrl);
    }, 100);
    
    console.log('[PDF] Relatório de compras gerado com sucesso!');
    
  } catch (error) {
    console.error('[PDF] Erro ao gerar relatório:', error);
    throw error;
  }
};
