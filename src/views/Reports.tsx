import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { 
  FileDown, FileText, DollarSign, Users, ShoppingCart, 
  Calendar, Filter, Download, TrendingUp, Activity
} from 'lucide-react';

const Reports = () => {
  const { settings } = useStore();
  const [dateRange, setDateRange] = useState('Hoje');

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

  const generatePDF = (reportName: string) => {
    // Placeholder para implementação com jspdf/html2canvas
    console.log(`Gerando PDF: ${reportName}`);
    // TODO: Implementar geração de PDF
  };

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
              <p className="text-white font-bold">Relatório de Vendas - Dezembro 2025</p>
              <p className="text-xs text-slate-500">Gerado em 31/12/2025 às 23:59</p>
            </div>
            <button className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm">
              <Download size={16} />
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
            <div>
              <p className="text-white font-bold">Inventário Atual - 30/12/2025</p>
              <p className="text-xs text-slate-500">Gerado em 30/12/2025 às 18:00</p>
            </div>
            <button className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm">
              <Download size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
