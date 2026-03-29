import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { 
  Calendar, Download, Users, Clock, DollarSign, TrendingUp,
  Filter, FileText
} from 'lucide-react';

const OvertimeReports = () => {
  const { employees, addNotification } = useStore();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Formatação de moeda
  const formatKz = (val: number) => new Intl.NumberFormat('pt-AO', { 
    style: 'currency', 
    currency: 'AOA', 
    maximumFractionDigits: 2 
  }).format(val);

  // Dados simulados de salary_payments (TODO: Integrar com Supabase)
  const salaryPayments = useMemo(() => {
    // Simulação - na implementação real, buscar da tabela salary_payments
    return [
      {
        staff_id: '1',
        month_year: selectedMonth.replace('-', '-'), // MM-YYYY format
        overtime_bonus: 150000,
        base_salary: 300000,
        status: 'PROCESSED'
      },
      {
        staff_id: '2', 
        month_year: selectedMonth.replace('-', '-'),
        overtime_bonus: 75000,
        base_salary: 250000,
        status: 'PROCESSED'
      },
      {
        staff_id: '3',
        month_year: selectedMonth.replace('-', '-'),
        overtime_bonus: 0,
        base_salary: 280000,
        status: 'PROCESSED'
      }
    ];
  }, [selectedMonth]);

  // Combinar dados de funcionários com pagamentos
  const overtimeData = useMemo(() => {
    return employees.map(employee => {
      const payment = salaryPayments.find(p => p.staff_id === employee.id && p.month_year === selectedMonth.replace('-', '-'));
      
      if (!payment || payment.overtime_bonus === 0) {
        return null;
      }

      // Calcular horas extras aproximadas (bonus / valor por hora)
      const hourlyRate = employee.overtimeHourlyRate || 0;
      const estimatedHours = hourlyRate > 0 ? payment.overtime_bonus / hourlyRate : 0;

      return {
        id: employee.id,
        name: employee.name,
        role: employee.role,
        baseSalary: payment.base_salary,
        overtimeBonus: payment.overtime_bonus,
        hourlyRate: hourlyRate,
        estimatedHours: estimatedHours,
        totalSalary: payment.base_salary + payment.overtime_bonus,
        status: payment.status
      };
    }).filter(Boolean); // Remover nulos
  }, [employees, salaryPayments, selectedMonth]);

  // Resumo
  const totalOvertimeInvestment = overtimeData.reduce((acc, emp) => acc + emp.overtimeBonus, 0);
  const totalEmployeesWithOvertime = overtimeData.length;
  const averageOvertimePerEmployee = totalEmployeesWithOvertime > 0 ? totalOvertimeInvestment / totalEmployeesWithOvertime : 0;

  // Exportar PDF
  const handleExportPDF = () => {
    // TODO: Implementar exportação PDF com jsPDF
    addNotification('info', 'Funcionalidade de exportação PDF em desenvolvimento');
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-background text-slate-200 no-scrollbar">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight italic uppercase">Relatório de Horas Extras</h2>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Análise de Investimento em Horas Extras</p>
        </div>
        
        <div className="flex items-center gap-4">
          <input 
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:border-[#06b6d4]"
          />
          
          <button 
            onClick={handleExportPDF}
            className="px-4 py-2 bg-[#06b6d4] text-black rounded-xl text-sm font-black uppercase hover:brightness-110 transition-all flex items-center gap-2"
          >
            <Download size={16} />
            Exportar PDF
          </button>
        </div>
      </header>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-panel p-6 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-orange-500/10">
              <DollarSign className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-black uppercase tracking-widest">Total Investido</p>
              <p className="text-2xl font-bold text-white">{formatKz(totalOvertimeInvestment)}</p>
            </div>
          </div>
        </div>
        
        <div className="glass-panel p-6 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-blue-500/10">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-black uppercase tracking-widest">Funcionários c/ Extras</p>
              <p className="text-2xl font-bold text-white">{totalEmployeesWithOvertime}</p>
            </div>
          </div>
        </div>
        
        <div className="glass-panel p-6 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-green-500/10">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-black uppercase tracking-widest">Média por Funcionário</p>
              <p className="text-2xl font-bold text-white">{formatKz(averageOvertimePerEmployee)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela Detalhada */}
      <div className="glass-panel p-8 rounded-2xl border border-white/5">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
          <Clock size={20} className="text-[#f59e0b]" />
          Detalhe das Horas Extras Processadas
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-3 text-white font-black uppercase text-xs">Funcionário</th>
                <th className="text-left p-3 text-white font-black uppercase text-xs">Cargo</th>
                <th className="text-left p-3 text-white font-black uppercase text-xs">Salário Base</th>
                <th className="text-left p-3 text-white font-black uppercase text-xs">Valor/Hora Extra</th>
                <th className="text-left p-3 text-white font-black uppercase text-xs">Bónus Extras</th>
                <th className="text-left p-3 text-white font-black uppercase text-xs">Horas Estimadas</th>
                <th className="text-left p-3 text-white font-black uppercase text-xs">Total Salário</th>
                <th className="text-left p-3 text-white font-black uppercase text-xs">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {overtimeData.map((employee) => (
                <tr key={employee.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-3">
                    <div>
                      <p className="text-white font-bold">{employee.name}</p>
                    </div>
                  </td>
                  <td className="p-3 text-slate-400">{employee.role}</td>
                  <td className="p-3 text-slate-400 font-mono">{formatKz(employee.baseSalary)}</td>
                  <td className="p-3 text-slate-400 font-mono">{formatKz(employee.hourlyRate)}</td>
                  <td className="p-3 text-orange-500 font-mono font-bold">{formatKz(employee.overtimeBonus)}</td>
                  <td className="p-3 text-blue-500 font-mono">{employee.estimatedHours.toFixed(1)}h</td>
                  <td className="p-3 text-emerald-500 font-mono font-bold">{formatKz(employee.totalSalary)}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 bg-green-500/20 text-green-500 text-xs font-black uppercase rounded-full">
                      {employee.status}
                    </span>
                  </td>
                </tr>
              ))}
              {overtimeData.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 italic">
                    Nenhuma hora extra processada no mês selecionado
                  </td>
                </tr>
              )}
              <tr className="border-t-2 border-primary/20">
                <td colSpan={4} className="p-3 text-primary font-black">TOTAL</td>
                <td className="p-3 text-orange-500 font-mono font-bold">{formatKz(totalOvertimeInvestment)}</td>
                <td className="p-3 text-blue-500 font-mono font-bold">
                  {overtimeData.reduce((acc, emp) => acc + emp.estimatedHours, 0).toFixed(1)}h
                </td>
                <td className="p-3 text-emerald-500 font-mono font-bold">
                  {formatKz(overtimeData.reduce((acc, emp) => acc + emp.totalSalary, 0))}
                </td>
                <td className="p-3"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Análise Adicional */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="glass-panel p-8 rounded-2xl border border-white/5">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
            <FileText size={20} className="text-[#06b6d4]" />
            Análise de Impacto
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
              <span className="text-white text-sm">Percentual do Salário Base</span>
              <span className="text-orange-500 font-bold">
                {totalOvertimeInvestment > 0 && overtimeData.length > 0 ? 
                  ((totalOvertimeInvestment / overtimeData.reduce((acc, emp) => acc + emp.baseSalary, 0)) * 100).toFixed(1) 
                  : '0.0'}%
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
              <span className="text-white text-sm">Média de Horas por Funcionário</span>
              <span className="text-blue-500 font-bold">
                {totalEmployeesWithOvertime > 0 ? 
                  (overtimeData.reduce((acc, emp) => acc + emp.estimatedHours, 0) / totalEmployeesWithOvertime).toFixed(1) 
                  : '0.0'}h
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
              <span className="text-white text-sm">Maior Bónus Individual</span>
              <span className="text-emerald-500 font-bold">
                {formatKz(Math.max(...overtimeData.map(emp => emp.overtimeBonus), 0))}
              </span>
            </div>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-2xl border border-white/5">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
            <TrendingUp size={20} className="text-[#10b981]" />
            Recomendações
          </h3>
          <div className="space-y-3">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <p className="text-blue-500 text-sm">
                {totalOvertimeInvestment > 500000 ? 
                  'Investimento elevado em horas extras. Considere otimizar escalas.' :
                  'Investimento em horas extras dentro dos limites esperados.'
                }
              </p>
            </div>
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
              <p className="text-green-500 text-sm">
                {totalEmployeesWithOvertime < employees.length * 0.3 ? 
                  'Baixa utilização de horas extras. Bom controle de custos.' :
                  'Utilização moderada de horas extras. Monitore os custos.'
                }
              </p>
            </div>
            <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
              <p className="text-orange-500 text-sm">
                Revise os valores por hora extra para garantir competitividade.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OvertimeReports;
