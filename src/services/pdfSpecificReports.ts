import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';

// Interface para dados de staff
interface Staff {
  id: string;
  created_at: string;
  full_name: string;
  base_salary_kz: number;
  position: string;
  status: string;
}

// Interface para dados de despesas
interface Expense {
  id: string;
  created_at: string;
  description: string;
  amount_kz: number;
  category: string;
  status: string;
}

// Interface para dados de produtos
interface Product {
  id: string;
  created_at: string;
  name: string;
  price: number;
  cost_price: number;
  stock_quantity: number;
  is_active: boolean;
}

// Interface para vendas por produto
interface ProductSale {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
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

// Gerar Relatório de RH/Staff
export const generateStaffReport = async () => {
  try {
    console.log('[PDF] Gerando relatório de RH/Staff...');
    
    // Buscar dados do Supabase da tabela staff
    const { data: staff, error } = await supabase
      .from('staff')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[PDF] Erro ao buscar staff:', error);
      throw new Error('Erro ao buscar dados de RH/Staff');
    }

    if (!staff || staff.length === 0) {
      console.log('[PDF] Nenhum funcionário encontrado');
      throw new Error('Nenhum funcionário encontrado para gerar relatório');
    }

    console.log(`[PDF] ${staff.length} funcionários encontrados`);

    // Criar documento PDF
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.text('Relatório de RH/Staff', 105, 20, { align: 'center' });
    
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
    const totalSalaries = staff.reduce((sum, emp) => sum + (emp.base_salary_kz || 0), 0);
    const activeStaff = staff.filter(s => s.status === 'ATIVO').length;
    const inactiveStaff = staff.filter(s => s.status === 'INATIVO').length;
    
    // Resumo
    doc.setFontSize(14);
    doc.text('Resumo de Staff', 20, 60);
    
    doc.setFontSize(10);
    doc.text(`Total de Salários: ${formatAKZ(totalSalaries)}`, 20, 70);
    doc.text(`Funcionários Ativos: ${activeStaff}`, 20, 80);
    doc.text(`Funcionários Inativos: ${inactiveStaff}`, 20, 90);
    doc.text(`Total de Funcionários: ${staff.length}`, 20, 100);
    
    // Tabela de staff
    const tableData = staff.map(emp => [
      emp.full_name || 'N/A',
      emp.position || 'N/A',
      emp.status || 'N/A',
      formatAKZ(emp.base_salary_kz || 0)
    ]);
    
    // Adicionar tabela
    autoTable(doc, {
      head: [['Nome Completo', 'Cargo', 'Status', 'Salário Base (Kz)']],
      body: tableData,
      startY: 110,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [251, 146, 60],
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
    link.download = `relatorio-rh-staff-${reportDate.replace(/\//g, '-')}.pdf`;
    
    // Adicionar ao DOM e clicar
    document.body.appendChild(link);
    link.click();
    
    // Limpar
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(pdfUrl);
    }, 100);
    
    console.log('[PDF] Relatório de RH/Staff gerado com sucesso!');
    
  } catch (error) {
    console.error('[PDF] Erro ao gerar relatório:', error);
    throw error;
  }
};

// Gerar Relatório de Despesas
export const generateExpensesReport = async () => {
  try {
    console.log('[PDF] Gerando relatório de despesas...');
    
    // Buscar dados do Supabase da tabela expenses
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[PDF] Erro ao buscar despesas:', error);
      throw new Error('Erro ao buscar dados de despesas');
    }

    if (!expenses || expenses.length === 0) {
      console.log('[PDF] Nenhuma despesa encontrada');
      throw new Error('Nenhuma despesa encontrada para gerar relatório');
    }

    console.log(`[PDF] ${expenses.length} despesas encontradas`);

    // Criar documento PDF
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.text('Relatório de Despesas', 105, 20, { align: 'center' });
    
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
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount_kz || 0), 0);
    const paidExpenses = expenses.filter(e => e.status === 'PAGO').length;
    const pendingExpenses = expenses.filter(e => e.status === 'PENDENTE').length;
    
    // Resumo
    doc.setFontSize(14);
    doc.text('Resumo de Despesas', 20, 60);
    
    doc.setFontSize(10);
    doc.text(`Total de Despesas: ${formatAKZ(totalExpenses)}`, 20, 70);
    doc.text(`Despesas Pagas: ${paidExpenses}`, 20, 80);
    doc.text(`Despesas Pendentes: ${pendingExpenses}`, 20, 90);
    doc.text(`Total de Registros: ${expenses.length}`, 20, 100);
    
    // Tabela de despesas
    const tableData = expenses.map(exp => [
      formatDate(exp.created_at),
      exp.description || 'N/A',
      exp.category || 'N/A',
      exp.status || 'N/A',
      formatAKZ(exp.amount_kz || 0)
    ]);
    
    // Adicionar tabela
    autoTable(doc, {
      head: [['Data', 'Descrição', 'Categoria', 'Status', 'Valor (Kz)']],
      body: tableData,
      startY: 110,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [239, 68, 68],
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
    link.download = `relatorio-despesas-${reportDate.replace(/\//g, '-')}.pdf`;
    
    // Adicionar ao DOM e clicar
    document.body.appendChild(link);
    link.click();
    
    // Limpar
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(pdfUrl);
    }, 100);
    
    console.log('[PDF] Relatório de Despesas gerado com sucesso!');
    
  } catch (error) {
    console.error('[PDF] Erro ao gerar relatório:', error);
    throw error;
  }
};

// Gerar Relatório de Inventário/Stock
export const generateInventoryReport = async () => {
  try {
    console.log('[PDF] Gerando relatório de inventário/stock...');
    
    // Buscar dados do Supabase da tabela products
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('[PDF] Erro ao buscar produtos:', error);
      throw new Error('Erro ao buscar dados de inventário');
    }

    if (!products || products.length === 0) {
      console.log('[PDF] Nenhum produto encontrado');
      throw new Error('Nenhum produto encontrado para gerar relatório');
    }

    console.log(`[PDF] ${products.length} produtos encontrados`);

    // Criar documento PDF
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.text('Relatório de Inventário/Stock', 105, 20, { align: 'center' });
    
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
    const activeProducts = products.filter(p => p.is_active).length;
    const inactiveProducts = products.filter(p => !p.is_active).length;
    const totalStockValue = products.reduce((sum, p) => sum + ((p.stock_quantity || 0) * (p.price || 0)), 0);
    
    // Resumo
    doc.setFontSize(14);
    doc.text('Resumo de Inventário', 20, 60);
    
    doc.setFontSize(10);
    doc.text(`Valor Total do Stock: ${formatAKZ(totalStockValue)}`, 20, 70);
    doc.text(`Produtos Ativos: ${activeProducts}`, 20, 80);
    doc.text(`Produtos Inativos: ${inactiveProducts}`, 20, 90);
    doc.text(`Total de Produtos: ${products.length}`, 20, 100);
    
    // Tabela de produtos
    const tableData = products.map(product => [
      product.name || 'N/A',
      String(product.stock_quantity || 0),
      formatAKZ(product.price || 0),
      formatAKZ(product.cost_price || 0),
      product.is_active ? 'Ativo' : 'Inativo'
    ]);
    
    // Adicionar tabela
    autoTable(doc, {
      head: [['Produto', 'Stock', 'Preço Venda (Kz)', 'Preço Custo (Kz)', 'Status']],
      body: tableData,
      startY: 110,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [16, 185, 129],
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
    link.download = `relatorio-inventario-stock-${reportDate.replace(/\//g, '-')}.pdf`;
    
    // Adicionar ao DOM e clicar
    document.body.appendChild(link);
    link.click();
    
    // Limpar
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(pdfUrl);
    }, 100);
    
    console.log('[PDF] Relatório de Inventário/Stock gerado com sucesso!');
    
  } catch (error) {
    console.error('[PDF] Erro ao gerar relatório:', error);
    throw error;
  }
};

// Gerar Relatório de Fluxo de Caixa
export const generateCashFlowReport = async () => {
  try {
    console.log('[PDF] Gerando relatório de fluxo de caixa...');
    
    // Buscar dados de vendas (entradas)
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('created_at, total, status')
      .eq('status', 'FECHADO')
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('[PDF] Erro ao buscar pedidos:', ordersError);
      throw new Error('Erro ao buscar dados de vendas');
    }

    // Buscar dados de despesas (saídas)
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('created_at, amount_kz, status')
      .order('created_at', { ascending: false });

    if (expensesError) {
      console.error('[PDF] Erro ao buscar despesas:', expensesError);
      throw new Error('Erro ao buscar dados de despesas');
    }

    const totalEntradas = orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
    const totalSaidas = expenses?.reduce((sum, exp) => sum + (exp.amount_kz || 0), 0) || 0;
    const saldo = totalEntradas - totalSaidas;

    // Criar documento PDF
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.text('Relatório de Fluxo de Caixa', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text('Tasca Do Vereda - Sistema de Gestão', 105, 30, { align: 'center' });
    
    // Data do relatório
    const reportDate = new Date().toLocaleDateString('pt-AO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    doc.text(`Data: ${reportDate}`, 105, 40, { align: 'center' });
    
    // Resumo
    doc.setFontSize(14);
    doc.text('Resumo de Fluxo de Caixa', 20, 60);
    
    doc.setFontSize(10);
    doc.text(`Total de Entradas: ${formatAKZ(totalEntradas)}`, 20, 70);
    doc.text(`Total de Saídas: ${formatAKZ(totalSaidas)}`, 20, 80);
    doc.text(`Saldo Líquido: ${formatAKZ(saldo)}`, 20, 90);
    doc.text(`Total de Pedidos: ${orders?.length || 0}`, 20, 100);
    doc.text(`Total de Despesas: ${expenses?.length || 0}`, 20, 110);
    
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
    link.download = `relatorio-fluxo-caixa-${reportDate.replace(/\//g, '-')}.pdf`;
    
    // Adicionar ao DOM e clicar
    document.body.appendChild(link);
    link.click();
    
    // Limpar
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(pdfUrl);
    }, 100);
    
    console.log('[PDF] Relatório de Fluxo de Caixa gerado com sucesso!');
    
  } catch (error) {
    console.error('[PDF] Erro ao gerar relatório:', error);
    throw error;
  }
};

// Gerar Relatório de Lucros
export const generateProfitReport = async () => {
  try {
    console.log('[PDF] Gerando relatório de lucros...');
    
    // Buscar dados de vendas
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('created_at, total, status')
      .eq('status', 'FECHADO')
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('[PDF] Erro ao buscar pedidos:', ordersError);
      throw new Error('Erro ao buscar dados de vendas');
    }

    // Buscar dados de despesas
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('created_at, amount_kz, status')
      .order('created_at', { ascending: false });

    if (expensesError) {
      console.error('[PDF] Erro ao buscar despesas:', expensesError);
      throw new Error('Erro ao buscar dados de despesas');
    }

    const totalVendas = orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
    const totalDespesas = expenses?.reduce((sum, exp) => sum + (exp.amount_kz || 0), 0) || 0;
    const lucroLiquido = totalVendas - totalDespesas;
    const margemLucro = totalVendas > 0 ? (lucroLiquido / totalVendas) * 100 : 0;

    // Criar documento PDF
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.text('Relatório de Lucros', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text('Tasca Do Vereda - Sistema de Gestão', 105, 30, { align: 'center' });
    
    // Data do relatório
    const reportDate = new Date().toLocaleDateString('pt-AO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    doc.text(`Data: ${reportDate}`, 105, 40, { align: 'center' });
    
    // Resumo
    doc.setFontSize(14);
    doc.text('Resumo de Lucros', 20, 60);
    
    doc.setFontSize(10);
    doc.text(`Total de Vendas: ${formatAKZ(totalVendas)}`, 20, 70);
    doc.text(`Total de Despesas: ${formatAKZ(totalDespesas)}`, 20, 80);
    doc.text(`Lucro Líquido: ${formatAKZ(lucroLiquido)}`, 20, 90);
    doc.text(`Margem de Lucro: ${margemLucro.toFixed(2)}%`, 20, 100);
    doc.text(`Total de Pedidos: ${orders?.length || 0}`, 20, 110);
    doc.text(`Total de Despesas: ${expenses?.length || 0}`, 20, 120);
    
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
    link.download = `relatorio-lucros-${reportDate.replace(/\//g, '-')}.pdf`;
    
    // Adicionar ao DOM e clicar
    document.body.appendChild(link);
    link.click();
    
    // Limpar
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(pdfUrl);
    }, 100);
    
    console.log('[PDF] Relatório de Lucros gerado com sucesso!');
    
  } catch (error) {
    console.error('[PDF] Erro ao gerar relatório:', error);
    throw error;
  }
};

// Gerar Relatório de Movimentação de Stock
export const generateStockMovementReport = async () => {
  try {
    console.log('[PDF] Gerando relatório de movimentação de stock...');
    
    // Buscar dados dos produtos
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('[PDF] Erro ao buscar produtos:', error);
      throw new Error('Erro ao buscar dados de movimentação');
    }

    if (!products || products.length === 0) {
      console.log('[PDF] Nenhum produto encontrado');
      throw new Error('Nenhum produto encontrado para gerar relatório');
    }

    console.log(`[PDF] ${products.length} produtos encontrados`);

    // Criar documento PDF
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.text('Relatório de Movimentação de Stock', 105, 20, { align: 'center' });
    
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
    const activeProducts = products.filter(p => p.is_active).length;
    const inactiveProducts = products.filter(p => !p.is_active).length;
    const totalStockValue = products.reduce((sum, p) => sum + ((p.stock_quantity || 0) * (p.price || 0)), 0);
    
    // Resumo
    doc.setFontSize(14);
    doc.text('Resumo de Movimentação', 20, 60);
    
    doc.setFontSize(10);
    doc.text(`Valor Total do Stock: ${formatAKZ(totalStockValue)}`, 20, 70);
    doc.text(`Produtos Ativos: ${activeProducts}`, 20, 80);
    doc.text(`Produtos Inativos: ${inactiveProducts}`, 20, 90);
    doc.text(`Total de Produtos: ${products.length}`, 20, 100);
    
    // Tabela de produtos
    const tableData = products.map(product => [
      product.name || 'N/A',
      String(product.stock_quantity || 0),
      formatAKZ(product.price || 0),
      formatAKZ(product.cost_price || 0),
      product.is_active ? 'Ativo' : 'Inativo'
    ]);
    
    // Adicionar tabela
    autoTable(doc, {
      head: [['Produto', 'Stock', 'Preço Venda (Kz)', 'Preço Custo (Kz)', 'Status']],
      body: tableData,
      startY: 110,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [16, 185, 129],
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
    link.download = `relatorio-movimentacao-stock-${reportDate.replace(/\//g, '-')}.pdf`;
    
    // Adicionar ao DOM e clicar
    document.body.appendChild(link);
    link.click();
    
    // Limpar
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(pdfUrl);
    }, 100);
    
    console.log('[PDF] Relatório de Movimentação de Stock gerado com sucesso!');
    
  } catch (error) {
    console.error('[PDF] Erro ao gerar relatório:', error);
    throw error;
  }
};

// Gerar Relatório de Horas Trabalhadas
export const generateWorkHoursReport = async () => {
  try {
    console.log('[PDF] Gerando relatório de horas trabalhadas...');
    
    // Buscar dados do staff
    const { data: staff, error } = await supabase
      .from('staff')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[PDF] Erro ao buscar staff:', error);
      throw new Error('Erro ao buscar dados de RH/Staff');
    }

    if (!staff || staff.length === 0) {
      console.log('[PDF] Nenhum funcionário encontrado');
      throw new Error('Nenhum funcionário encontrado para gerar relatório');
    }

    console.log(`[PDF] ${staff.length} funcionários encontrados`);

    // Criar documento PDF
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.text('Relatório de Horas Trabalhadas', 105, 20, { align: 'center' });
    
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
    const totalSalaries = staff.reduce((sum, emp) => sum + (emp.base_salary_kz || 0), 0);
    const activeStaff = staff.filter(s => s.status === 'ATIVO').length;
    const inactiveStaff = staff.filter(s => s.status === 'INATIVO').length;
    
    // Resumo
    doc.setFontSize(14);
    doc.text('Resumo de Horas Trabalhadas', 20, 60);
    
    doc.setFontSize(10);
    doc.text(`Total de Salários: ${formatAKZ(totalSalaries)}`, 20, 70);
    doc.text(`Funcionários Ativos: ${activeStaff}`, 20, 80);
    doc.text(`Funcionários Inativos: ${inactiveStaff}`, 20, 90);
    doc.text(`Total de Funcionários: ${staff.length}`, 20, 100);
    
    // Tabela de staff
    const tableData = staff.map(emp => [
      emp.full_name || 'N/A',
      emp.position || 'N/A',
      emp.status || 'N/A',
      formatAKZ(emp.base_salary_kz || 0)
    ]);
    
    // Adicionar tabela
    autoTable(doc, {
      head: [['Nome Completo', 'Cargo', 'Status', 'Salário Base (Kz)']],
      body: tableData,
      startY: 110,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [251, 146, 60],
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
    link.download = `relatorio-horas-trabalhadas-${reportDate.replace(/\//g, '-')}.pdf`;
    
    // Adicionar ao DOM e clicar
    document.body.appendChild(link);
    link.click();
    
    // Limpar
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(pdfUrl);
    }, 100);
    
    console.log('[PDF] Relatório de Horas Trabalhadas gerado com sucesso!');
    
  } catch (error) {
    console.error('[PDF] Erro ao gerar relatório:', error);
    throw error;
  }
};

// Gerar Relatório de Desempenho
export const generatePerformanceReport = async () => {
  try {
    console.log('[PDF] Gerando relatório de desempenho...');
    
    // Buscar dados do staff
    const { data: staff, error } = await supabase
      .from('staff')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[PDF] Erro ao buscar staff:', error);
      throw new Error('Erro ao buscar dados de RH/Staff');
    }

    if (!staff || staff.length === 0) {
      console.log('[PDF] Nenhum funcionário encontrado');
      throw new Error('Nenhum funcionário encontrado para gerar relatório');
    }

    console.log(`[PDF] ${staff.length} funcionários encontrados`);

    // Criar documento PDF
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.text('Relatório de Desempenho', 105, 20, { align: 'center' });
    
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
    const totalSalaries = staff.reduce((sum, emp) => sum + (emp.base_salary_kz || 0), 0);
    const activeStaff = staff.filter(s => s.status === 'ATIVO').length;
    const inactiveStaff = staff.filter(s => s.status === 'INATIVO').length;
    
    // Resumo
    doc.setFontSize(14);
    doc.text('Resumo de Desempenho', 20, 60);
    
    doc.setFontSize(10);
    doc.text(`Total de Salários: ${formatAKZ(totalSalaries)}`, 20, 70);
    doc.text(`Funcionários Ativos: ${activeStaff}`, 20, 80);
    doc.text(`Funcionários Inativos: ${inactiveStaff}`, 20, 90);
    doc.text(`Total de Funcionários: ${staff.length}`, 20, 100);
    
    // Tabela de staff
    const tableData = staff.map(emp => [
      emp.full_name || 'N/A',
      emp.position || 'N/A',
      emp.status || 'N/A',
      formatAKZ(emp.base_salary_kz || 0)
    ]);
    
    // Adicionar tabela
    autoTable(doc, {
      head: [['Nome Completo', 'Cargo', 'Status', 'Salário Base (Kz)']],
      body: tableData,
      startY: 110,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [251, 146, 60],
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
    link.download = `relatorio-desempenho-${reportDate.replace(/\//g, '-')}.pdf`;
    
    // Adicionar ao DOM e clicar
    document.body.appendChild(link);
    link.click();
    
    // Limpar
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(pdfUrl);
    }, 100);
    
    console.log('[PDF] Relatório de Desempenho gerado com sucesso!');
    
  } catch (error) {
    console.error('[PDF] Erro ao gerar relatório:', error);
    throw error;
  }
};
export const generateProductSalesReport = async (startDate?: string, endDate?: string) => {
  try {
    console.log('[PDF] Gerando relatório de vendas por artigo...');
    
    // Converter datas para formato ISO
    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);
    
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    
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
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (orderItemsError) {
      console.error('[PDF] Erro ao buscar order_items:', orderItemsError);
      throw new Error('Erro ao buscar dados das vendas');
    }

    if (!orderItemsData || orderItemsData.length === 0) {
      console.log('[PDF] Nenhuma venda encontrada no período');
      throw new Error('Nenhuma venda encontrada no período selecionado');
    }

    // Buscar produtos para obter nomes
    const productIds = [...new Set(orderItemsData.map(item => item.product_id))];
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('id, name, price')
      .in('id', productIds);

    if (productsError) {
      console.error('[PDF] Erro ao buscar produtos:', productsError);
      throw new Error('Erro ao buscar dados dos produtos');
    }

    // Agrupar vendas por product_id
    const vendasMap = new Map<string, ProductSale>();

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

    console.log(`[PDF] ${items.length} produtos encontrados, total: ${totalGeral}`);

    // Criar documento PDF
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.text('Relatório de Vendas por Artigo', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text('Tasca Do Vereda - Sistema de Gestão', 105, 30, { align: 'center' });
    
    // Data do relatório
    const reportDate = new Date().toLocaleDateString('pt-AO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    doc.text(`Data: ${reportDate}`, 105, 40, { align: 'center' });
    
    // Período
    doc.text(`Período: ${startDate || 'Início'} a ${endDate || 'Fim'}`, 105, 50, { align: 'center' });
    
    // Resumo
    doc.setFontSize(14);
    doc.text('Resumo de Vendas por Artigo', 20, 70);
    
    doc.setFontSize(10);
    doc.text(`Valor Total Geral: ${formatAKZ(totalGeral)}`, 20, 80);
    doc.text(`Total de Produtos Vendidos: ${items.length}`, 20, 90);
    doc.text(`Período: ${startDate || 'Início'} a ${endDate || 'Fim'}`, 20, 100);
    
    // Tabela de vendas por artigo
    const tableData = items.map(item => [
      item.product_name,
      String(item.quantity),
      formatAKZ(item.unit_price),
      formatAKZ(item.subtotal)
    ]);
    
    // Adicionar tabela
    autoTable(doc, {
      head: [['Nome do Produto', 'Qtd Vendida', 'Preço Unitário (Kz)', 'Total (Kz)']],
      body: tableData,
      startY: 110,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [6, 182, 212],
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
    link.download = `relatorio-vendas-por-artigo-${reportDate.replace(/\//g, '-')}.pdf`;
    
    // Adicionar ao DOM e clicar
    document.body.appendChild(link);
    link.click();
    
    // Limpar
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(pdfUrl);
    }, 100);
    
    console.log('[PDF] Relatório de Vendas por Artigo gerado com sucesso!');
    
  } catch (error) {
    console.error('[PDF] Erro ao gerar relatório:', error);
    throw error;
  }
};
