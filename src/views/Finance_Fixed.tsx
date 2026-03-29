import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { 
  TrendingUp, DollarSign, Banknote, LayoutDashboard, History, PiggyBank,
  Printer, ShieldCheck, FileText, Download, 
  PieChart, Loader2,
  CreditCard, ArrowRightLeft, QrCode, Plus, Trash2, Edit2, Check
} from 'lucide-react';

// Definições de tipos simples
interface Expense {
  id: string;
  description: string;
  amount_kz: number;
  category: string;
  status: string;
  created_at: string;
}

interface PaymentConfig {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}

const formatKz = (val: number | undefined | null) => {
  const safeVal = val?.toString()?.replace(/[^\d.-]/g, '') || "0";
  const numVal = parseFloat(safeVal) || 0;
  return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(numVal);
};

const Finance = () => {
  const { addNotification } = useStore();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SALES' | 'EXPENSES'>('OVERVIEW');
  const [loading, setLoading] = useState(false);
  const [ordersData, setOrdersData] = useState<any[]>([]);
  const [expensesData, setExpensesData] = useState<Expense[]>([]);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [paymentConfigs, setPaymentConfigs] = useState<PaymentConfig[]>([]);

  // Carregar dados do Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Buscar orders de hoje
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('payment_method, total_amount, created_at')
          .eq('status', 'pending')
          .gte('created_at', today.toISOString())
          .lt('created_at', tomorrow.toISOString());

        if (!ordersError && orders) {
          setOrdersData(orders);
        }

        // Buscar despesas
        const { data: expenses, error: expensesError } = await supabase
          .from('expenses')
          .select('*')
          .order('created_at', { ascending: false });

        if (!expensesError && expenses) {
          setExpensesData(expenses);
          const total = expenses.reduce((sum, exp) => sum + (Number(exp.amount_kz) || 0), 0);
          setTotalExpenses(total);
        }

      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        addNotification('error', 'Falha ao carregar dados financeiros');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [addNotification]);

  // Calcular métricas
  const totalRevenue = ordersData.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  // Agrupar pagamentos por método
  const payments = ordersData.reduce((acc: any, order) => {
    const method = (order.payment_method || 'NUMERARIO').trim();
    const valor = Number(order.total_amount) || 0;
    acc[method] = (acc[method] || 0) + valor;
    return acc;
  }, {});

  return (
    <div className="p-6 h-full overflow-y-auto bg-background text-sm">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white">Finanças</h2>
          <p className="text-slate-400">Módulo Financeiro</p>
        </div>
        
        <div className="flex gap-2">
          {['OVERVIEW', 'SALES', 'EXPENSES'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab ? 'bg-primary text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab === 'OVERVIEW' && 'Visão Geral'}
              {tab === 'SALES' && 'Vendas'}
              {tab === 'EXPENSES' && 'Despesas'}
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-6">
        {activeTab === 'OVERVIEW' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Lucro Líquido</h3>
              {loading ? (
                <div className="flex items-center justify-center h-16">
                  <Loader2 className="animate-spin text-primary" size={24} />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-3xl font-bold text-white">{formatKz(netProfit)}</div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Faturamento:</span>
                      <div className="font-semibold text-white">{formatKz(totalRevenue)}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Despesas:</span>
                      <div className="font-semibold text-red-400">{formatKz(totalExpenses)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Fluxo por Modalidade</h3>
              <div className="space-y-3">
                {Object.entries(payments).map(([method, total]) => (
                  <div key={method} className="flex justify-between items-center">
                    <span className="text-slate-300">{method}</span>
                    <span className="font-semibold text-white">{formatKz(total as number)}</span>
                  </div>
                ))}
                {Object.keys(payments).length === 0 && (
                  <div className="text-slate-500 text-center py-4">Nenhuma venda hoje</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'SALES' && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr className="text-left">
                  <th className="px-4 py-3 text-slate-300">Método</th>
                  <th className="px-4 py-3 text-slate-300">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {Object.entries(payments).map(([method, total]) => (
                  <tr key={method}>
                    <td className="px-4 py-3 text-white">{method}</td>
                    <td className="px-4 py-3 text-white font-semibold">{formatKz(total as number)}</td>
                  </tr>
                ))}
                {Object.keys(payments).length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-slate-500">
                      Nenhuma venda registrada hoje
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'EXPENSES' && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr className="text-left">
                  <th className="px-4 py-3 text-slate-300">Descrição</th>
                  <th className="px-4 py-3 text-slate-300">Valor</th>
                  <th className="px-4 py-3 text-slate-300">Categoria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {expensesData.map((expense) => (
                  <tr key={expense.id}>
                    <td className="px-4 py-3 text-white">{expense.description}</td>
                    <td className="px-4 py-3 text-white font-semibold">{formatKz(expense.amount_kz)}</td>
                    <td className="px-4 py-3 text-slate-300">{expense.category}</td>
                  </tr>
                ))}
                {expensesData.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                      Nenhuma despesa registrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Finance;
