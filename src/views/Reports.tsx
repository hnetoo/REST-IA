import React, { useState } from 'react';
import { DollarSign, TrendingUp, Activity, Download, FileText, AlertCircle, ShoppingCart, Users, Filter } from 'lucide-react';
import { generateSalesReport, generatePurchaseReport } from '../services/pdfService';
import { useStore } from '../store/useStore';

const Reports = () => {
  const { settings } = useStore();
  const [dateRange, setDateRange] = useState('Hoje');

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
      case 'Fluxo de Caixa':
        generateSalesReport(); // Por enquanto usa o mesmo de vendas
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
        { name: 'Fluxo de Caixa', description: 'Entradas e saídas detalhadas' }
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
          >
            <option>Hoje</option>
            <option>Últimos 7 dias</option>
            <option>Últimos 30 dias</option>
            <option>Mês Atual</option>
            <option>Personalizado</option>
          </select>
          
          <button className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm">
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
