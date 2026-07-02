
import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { printStaffSchedules, printPayroll } from '../lib/printService';
import { calculatePayroll } from '../lib/payroll/payrollCalculator';
import type { PayrollResult } from '../lib/payroll/payrollCalculator';
import { Employee, UserRole, WorkShift } from '../../types';
import { 
  Users, UserPlus, Calendar, Clock, Phone, DollarSign, Trash2, 
  X, Plus, Fingerprint, ChefHat, Wallet, Utensils,
  ShieldCheck, Timer, Download, Printer, CheckCircle, Package, Sparkles, Backpack
} from 'lucide-react';

const Employees = () => {
  const { 
    employees, workShifts, updateEmployee, removeEmployee, 
    addWorkShift, updateWorkShift, removeWorkShift,
    attendance, addNotification, settings,
    loadEmployees, loadWorkShifts
  } = useStore();
  
  // useEffect para carregar dados da tabela staff e escalas
  useEffect(() => {
    loadEmployees();
    loadWorkShifts();
  }, [loadEmployees, loadWorkShifts]);

  // useEffect para carregar logo como base64 (para recibos)
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const response = await fetch('/logo.png');
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => setLogoBase64(reader.result as string);
        reader.readAsDataURL(blob);
      } catch (e) {
        console.warn('[LOGO] Não foi possível carregar o logo:', e);
      }
    };
    loadLogo();
  }, []);

  
  const [activeTab, setActiveTab] = useState<'LIST' | 'SCHEDULE' | 'ATTENDANCE' | 'PAYROLL'>('LIST');

  const handleExportSchedules = () => {
    if (workShifts.length === 0) {
      addNotification('warning', 'Nenhuma escala para exportar.');
      return;
    }
    const days = ['Domingo', 'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado'];
    const daysOrder = [1, 2, 3, 4, 5, 6, 0];
    const companyName = (settings as any)?.restaurantName || 'Tasca do Vereda';
    const today = new Date().toLocaleDateString('pt-AO');

    const tableRows = daysOrder.map(dayId => {
      const dayShifts = workShifts.filter(s => s.dayOfWeek === dayId);
      if (dayShifts.length === 0) return '';
      return dayShifts.map((s, i) => {
        const emp = employees.find(e => e.id === s.employeeId);
        return `<tr>
          ${i === 0 ? `<td rowspan="${dayShifts.length}" style="font-weight:900;color:#1a2e26;background:#f8fafc;vertical-align:middle;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">${days[dayId]}</td>` : ''}
          <td style="font-weight:700;color:#1e293b;">${emp?.name || 'N/A'}</td>
          <td style="color:#64748b;font-size:11px;text-transform:uppercase;">${emp?.role || ''}</td>
          <td style="font-family:monospace;font-weight:700;color:#059669;">${s.startTime}</td>
          <td style="font-family:monospace;font-weight:700;color:#dc2626;">${s.endTime}</td>
          <td style="font-family:monospace;font-size:11px;color:#64748b;">${
            (() => { const [sh, sm] = s.startTime.split(':').map(Number); const [eh, em] = s.endTime.split(':').map(Number); const mins = (eh * 60 + em) - (sh * 60 + sm); return mins > 0 ? `${Math.floor(mins/60)}h${mins%60 > 0 ? String(mins%60).padStart(2,'0') : ''}` : '-'; })()
          }</td>
        </tr>`;
      }).join('');
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Escalas de Trabalho</title>
    <style>
      @page { size: A4; margin: 15mm; }
      body { font-family: 'Segoe UI', system-ui, sans-serif; color: #334155; padding: 20px; }
      .header { border-bottom: 3px solid #1a2e26; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
      .header h1 { margin: 0; font-size: 20px; font-weight: 900; color: #1a2e26; text-transform: uppercase; letter-spacing: 1px; }
      .header p { margin: 4px 0 0; font-size: 10px; color: #64748b; }
      .meta { font-size: 10px; color: #64748b; text-align: right; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th { background: #1a2e26; color: #fff; font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; padding: 10px 12px; text-align: left; font-weight: 900; }
      td { border-bottom: 1px solid #e2e8f0; padding: 9px 12px; font-size: 12px; }
      tr:last-child td { border-bottom: none; }
      tr:hover td { background: #f8fafc; }
      .footer { margin-top: 30px; font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
      @media print { body { padding: 0; } }
    </style></head><body>
    <div class="header">
      <div><h1>${companyName}</h1><p>Escalas de Trabalho Semanal</p></div>
      <div class="meta">Emitido em: ${today}<br>Total de escalas: ${workShifts.length}</div>
    </div>
    <table>
      <thead><tr><th>Dia</th><th>Funcionário</th><th>Cargo</th><th>Entrada</th><th>Saída</th><th>Duração</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <div class="footer">REST IA OS — Gestão de Capital Humano — ${companyName}</div>
    </body></html>`;

    setPrintHtml(html);
    setPrintTitle('Escalas de Trabalho');
    setIsPrintOpen(true);
  };

  const handleExportPayroll = () => {
    if (employees.length === 0) {
      addNotification('warning', 'Nenhum funcionário para exportar folha.');
      return;
    }
    const safeSettings = settings || {};
    printPayroll(employees, safeSettings);
    addNotification('success', 'Folha de pagamento exportada.');
  };

  const handleOpenPayrollPreview = () => {
    if (employees.length === 0) {
      addNotification('warning', 'Nenhum funcionário na folha salarial.');
      return;
    }
    setIsPayrollPreviewOpen(true);
  };

  const handlePrintPayrollA4 = () => {
    const previewContent = document.getElementById('payroll-preview-content');
    if (!previewContent) { addNotification('error', 'Não foi possível gerar a folha.'); return; }
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Folha de Pagamento</title><style>
      @page { size: A4; margin: 15mm; } body { font-family: system-ui, sans-serif; color: #334155; padding: 20px; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px; }
      th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
      th { background: #f1f5f9; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
      .footer { margin-top: 30px; font-size: 8px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
      @media print { body { padding: 0; } }
    </style></head><body>${previewContent.innerHTML}</body></html>`;
    setPrintHtml(htmlContent);
    setPrintTitle('Folha de Pagamento A4');
    setIsPrintOpen(true);
  };
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay() || 1);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<WorkShift | null>(null);
  
  // ESTADOS DO MÓDULO DE PROCESSAMENTO DE FOLHA
  const [isProcessingMode, setIsProcessingMode] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [payrollAdjustments, setPayrollAdjustments] = useState<Record<string, { discounts: number; overtime: number }>>({});
  const [isPayrollPreviewOpen, setIsPayrollPreviewOpen] = useState(false);
  // Estados para impressão via iframe (funciona no Electron)
  const [printHtml, setPrintHtml] = useState('');
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printTitle, setPrintTitle] = useState('');
  // Estados para confirmação de processamento
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{ totalGross: number; totalINSS: number; totalIRT: number; totalNet: number; count: number; alreadyProcessed: boolean } | null>(null);
  // Logo do recibo em base64 (carregado do icon.png)
  const [logoBase64, setLogoBase64] = useState<string>('');

  // Form States
  const [empForm, setEmpForm] = useState<Partial<Employee>>({
    name: '', role: 'GARCOM', phone: '', salary: 0, status: 'ATIVO', color: '#06b6d4', workDaysPerMonth: 22, dailyWorkHours: 8, externalBioId: '',
    foodAllowance: 0,
    transportAllowance: 0,
    bonus: 0,
    overtimeHourlyRate: 0,
    // NOVOS CAMPOS FISCAIS
    nif: '',
    admissionDate: new Date().toISOString().split('T')[0],
    contractType: 'INDEFINIDO',
    irtExempt: false,
    autoCalculateTax: true
  });

  const [shiftForm, setShiftForm] = useState<Partial<WorkShift>>({
    employeeId: '', dayOfWeek: 1, startTime: '08:00', endTime: '16:00'
  });

  // FUNÇÕES DO MÓDULO DE PROCESSAMENTO DE FOLHA
  const handleStartProcessing = () => {
    setIsProcessingMode(true);
    addNotification('info', 'Modo de processamento ativado. Ajuste os valores de descontos e horas extras.');
  };

  const handleAdjustmentChange = (empId: string, field: 'discounts' | 'overtime', value: number) => {
    setPayrollAdjustments(prev => ({
      ...prev,
      [empId]: {
        discounts: prev[empId]?.discounts ?? 0,
        overtime: prev[empId]?.overtime ?? 0,
        [field]: value
      }
    }));
  };

  const handleConfirmProcess = async () => {
    try {
      const monthYear = selectedMonth.slice(5, 7) + '-' + selectedMonth.slice(0, 4); // MM-YYYY
      const { supabase } = await import('../supabase_standalone');
      const { calculatePayroll, generateReceiptNumber, generateReceiptHash } = await import('../lib/payroll/payrollCalculator');
      let receiptSeq = 1;
      let processedCount = 0;

      for (const emp of employees) {
        const adjustments = payrollAdjustments[emp.id] || { discounts: 0, overtime: 0 };
        const payroll = calculatePayroll({
          baseSalary: emp.salary || 0,
          foodAllowance: emp.foodAllowance || 0,
          transportAllowance: emp.transportAllowance || 0,
          bonus: emp.bonus || 0,
          overtimeAmount: adjustments.overtime,
          otherDiscounts: adjustments.discounts,
          irtExempt: emp.irtExempt || false
        });

        const receiptNumber = generateReceiptNumber(emp.id, selectedMonth, receiptSeq++);
        const receiptHash = generateReceiptHash({
          staffId: emp.id, monthYear, grossSalary: payroll.grossSalary,
          netSalary: payroll.netSalary, timestamp: new Date().toISOString()
        });

        // 1. Gravar em salary_payments
        const paymentData = {
          staff_id: emp.id, month_year: monthYear, base_salary: emp.salary,
          total_subsidies: payroll.grossSalary - emp.salary - adjustments.overtime,
          overtime_bonus: adjustments.overtime,
          total_discounts: payroll.totalDeductions + adjustments.discounts,
          net_salary: payroll.netSalary, gross_salary: payroll.grossSalary,
          inss_worker: payroll.inssWorker, inss_employer: payroll.inssEmployer,
          irt_amount: payroll.irtAmount, taxable_income: payroll.taxableIncome,
          irt_bracket: payroll.irtBracket, irt_rate: payroll.irtRate,
          receipt_number: receiptNumber, receipt_hash: receiptHash,
          status: 'PROCESSED', processed_at: new Date().toISOString()
        };
        const { error: spError } = await supabase
          .from('salary_payments')
          .upsert(paymentData, { onConflict: 'staff_id,month_year' });
        if (spError) { addNotification('error', `Erro ao gravar pagamento de ${emp.name}`); continue; }

        // 2. Gravar recibo em payroll_receipts
        const receiptHtml = generateReceiptHtml(emp, payroll, adjustments, receiptNumber, logoBase64);
        const { error: prError } = await supabase.from('payroll_receipts').upsert({
          staff_id: emp.id, month_year: monthYear, receipt_number: receiptNumber,
          receipt_hash: receiptHash, html_content: receiptHtml, generated_at: new Date().toISOString()
        }, { onConflict: 'staff_id,month_year' });
        if (prError) console.error('[RECEIPT] Erro ao gravar recibo:', prError);

        processedCount++;
      }

      addNotification('success', `Folha processada! ${processedCount} funcionários arquivados.`);
      setIsProcessingMode(false);
      setPayrollAdjustments({});
      setIsConfirmOpen(false);
      setConfirmData(null);
    } catch (error: unknown) {
      console.error('Erro ao processar folha:', error);
      addNotification('error', 'Erro ao processar folha de salário.');
    }
  };

  const generateReceiptHtml = (emp: Employee, payroll: any, adjustments: any, receiptNumber: string, logoImg: string): string => {
    const periodStart = selectedMonth + '-01';
    const periodEnd = selectedMonth + '-30';
    const today = new Date().toLocaleDateString('pt-AO');
    const companyNif = (settings as any)?.nif || '5000123456';
    const companyName = (settings as any)?.restaurantName || 'RESTAURANTE TASCA DO VEREDA';
    const companyAddress = (settings as any)?.address || 'Luanda, Angola';
    const hash = payroll.receiptHash || 'N/A';
    const inssBase = formatKz(payroll.baseINSS || emp.salary);
    const taxableIncome = formatKz(payroll.taxableIncome);

    // Todos os subsídios sempre visíveis (0 Kz se não houver)
    const subsRows = [
      { label: 'Subsídio de Alimentação', val: emp.foodAllowance || 0 },
      { label: 'Subsídio de Transporte', val: emp.transportAllowance || 0 },
      { label: 'Bónus / Prémios', val: emp.bonus || 0 },
      { label: 'Horas Extras', val: adjustments.overtime || 0 },
    ].map((s: any) =>
      `<tr><td style="padding:6px 10px;font-size:12px;color:#334155;">${s.label}</td><td style="padding:6px 10px;text-align:right;font-size:12px;color:${s.val > 0 ? '#059669' : '#94a3b8'};font-weight:600;">${s.val > 0 ? '+' : ''}${formatKz(s.val)}</td></tr>`
    ).join('');

    // Todos os descontos sempre visíveis
    const discountsRows = [
      { label: 'Outros Descontos', val: adjustments.discounts || 0, alwaysShow: true },
      { label: `INSS (3% sobre ${inssBase})`, val: payroll.inssWorker || 0, alwaysShow: true },
      { label: payroll.irtAmount > 0 ? `IRT (${(payroll.irtRate * 100).toFixed(0)}% — Escalão ${payroll.irtBracket}, Mat. Colet. ${taxableIncome})` : 'IRT (Isento — salário até 100.000 Kz)', val: payroll.irtAmount || 0, alwaysShow: true },
    ].map((d: any) =>
      `<tr><td style="padding:6px 10px;font-size:12px;color:#334155;">${d.label}</td><td style="padding:6px 10px;text-align:right;font-size:12px;color:${d.val > 0 ? '#dc2626' : '#94a3b8'};font-weight:600;">${d.val > 0 ? '-' : ''}${formatKz(d.val)}</td></tr>`
    ).join('');

    // Logo: usar imagem base64 se disponível, senão texto
    const logoHtml = logoImg
      ? `<img src="${logoImg}" alt="Tasca do Vereda" style="width:90px;height:auto;margin:0 auto 12px;display:block;border-radius:8px;" />`
      : `<div style="text-align:center;margin-bottom:12px;"><h1 style="margin:0;font-size:22px;font-weight:900;color:#1a2e26;letter-spacing:2px;">TASCA DO VEREDA</h1><p style="margin:3px 0 0;font-size:9px;color:#c9a84c;font-weight:700;letter-spacing:4px;">RESTAURANTE</p></div>`;

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { size: A4; margin: 18mm; }
      body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a1a; padding: 20px; max-width: 720px; margin: 0 auto; background: #fff; }
      .doc-border { border: 2px solid #1a2e26; padding: 25px; }
      .doc-header { text-align: center; border-bottom: 2px solid #1a2e26; padding-bottom: 15px; margin-bottom: 20px; }
      .doc-header h1 { margin: 0; font-size: 18px; font-weight: 900; letter-spacing: 1px; color: #1a2e26; text-transform: uppercase; }
      .doc-header h2 { margin: 6px 0 0; font-size: 11px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 2px; }
      .doc-header .nif { margin: 4px 0 0; font-size: 10px; color: #555; font-weight: 600; }
      .doc-header .addr { margin: 2px 0 0; font-size: 9px; color: #777; }
      .info-grid { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; }
      .info-col { flex: 1; }
      .info-col p { margin: 3px 0; font-size: 10px; color: #555; }
      .info-col p strong { color: #1a2e26; font-size: 11px; }
      .info-col.right { text-align: right; }
      .section-title { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #1a2e26; background: #e2e8f0; padding: 6px 10px; margin: 0; border-top: 2px solid #1a2e26; }
      table { width: 100%; border-collapse: collapse; }
      td, th { border-bottom: 1px solid #e2e8f0; }
      .total-row td { font-weight: 900; font-size: 13px; color: #1a2e26; border-top: 2px solid #1a2e26; border-bottom: 2px solid #1a2e26; background: #f8fafc; padding: 10px; }
      .net-row td { font-weight: 900; font-size: 15px; color: #fff; background: #1a2e26; padding: 12px; }
      .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; border-top: 1px dashed #cbd5e1; }
      .sign-box { width: 45%; text-align: center; }
      .sign-box .line { border-top: 1px solid #1a2e26; margin-top: 50px; padding-top: 6px; font-size: 9px; color: #555; }
      .decl { margin-top: 25px; font-size: 10px; color: #555; text-align: center; font-style: italic; }
      .hash { margin-top: 15px; font-size: 8px; color: #94a3b8; text-align: center; font-family: monospace; }
      @media print { body { padding: 0; } .doc-border { border: 2px solid #1a2e26; } }
    </style></head><body>
      <div class="doc-border">
        <div class="doc-header">
          ${logoHtml}
          <h1>${companyName}</h1>
          <h2>RECIBO DE VENCIMENTO</h2>
          <p class="nif">NIF: ${companyNif}</p>
          <p class="addr">${companyAddress}</p>
        </div>

        <div class="info-grid">
          <div class="info-col">
            <p><strong>Funcionário:</strong> ${emp.name}</p>
            <p><strong>Cargo:</strong> ${emp.role}</p>
            <p><strong>NIF:</strong> ${emp.nif || 'N/A'}</p>
          </div>
          <div class="info-col right">
            <p><strong>Período:</strong> ${periodStart} — ${periodEnd}</p>
            <p><strong>Data de Emissão:</strong> ${today}</p>
            <p><strong>Recibo Nº:</strong> ${receiptNumber}</p>
          </div>
        </div>

        <p class="section-title">Discriminação</p>
        <table>
          <tr><td style="padding:6px 10px;font-size:12px;color:#334155;font-weight:700;">SALÁRIO BASE</td><td style="padding:6px 10px;text-align:right;font-size:12px;font-weight:700;">${formatKz(emp.salary)}</td></tr>
          ${subsRows}
          <tr class="total-row"><td>TOTAL VENCIMENTOS (BRUTO)</td><td style="text-align:right;">${formatKz(payroll.grossSalary)}</td></tr>
        </table>

        <p class="section-title" style="margin-top:15px;">Descontos Obrigatórios</p>
        <table>
          ${discountsRows}
          <tr class="total-row"><td>TOTAL DESCONTOS</td><td style="text-align:right;color:#dc2626;">-${formatKz(payroll.totalDeductions + adjustments.discounts)}</td></tr>
          <tr class="net-row"><td>SALÁRIO LÍQUIDO A RECEBER</td><td style="text-align:right;">${formatKz(payroll.netSalary - adjustments.discounts)}</td></tr>
        </table>

        <p class="decl">Declaro que recebi a importância supra referida.</p>

        <div class="signatures">
          <div class="sign-box"><div class="line">Assinatura do Funcionário</div></div>
          <div class="sign-box"><div class="line">Assinatura do Empregador</div></div>
        </div>

        <p class="hash">Hash de validação: ${hash}</p>
      </div>
    </body></html>`;
  };

  const handleClosePayroll = async () => {
    const { supabase } = await import('../supabase_standalone');
    const { calculatePayroll } = await import('../lib/payroll/payrollCalculator');
    const monthYear = selectedMonth.slice(5, 7) + '-' + selectedMonth.slice(0, 4);

    // Verificar se já foi processado
    const { data: existing } = await supabase
      .from('salary_payments')
      .select('id')
      .eq('month_year', monthYear)
      .limit(1);
    const alreadyProcessed = !!(existing && existing.length > 0);

    // Calcular totais para confirmação
    let totalGross = 0, totalINSS = 0, totalIRT = 0, totalNet = 0;
    employees.forEach(emp => {
      const adj = payrollAdjustments[emp.id] || { discounts: 0, overtime: 0 };
      const p = calculatePayroll({ baseSalary: emp.salary || 0, foodAllowance: emp.foodAllowance || 0, transportAllowance: emp.transportAllowance || 0, bonus: emp.bonus || 0, overtimeAmount: adj.overtime, otherDiscounts: adj.discounts, irtExempt: emp.irtExempt || false });
      totalGross += p.grossSalary; totalINSS += p.inssWorker; totalIRT += p.irtAmount; totalNet += p.netSalary;
    });

    setConfirmData({ totalGross, totalINSS, totalIRT, totalNet, count: employees.length, alreadyProcessed });
    setIsConfirmOpen(true);
  };

  const generatePayslipPDF = (emp: Employee) => {
    const adjustments = payrollAdjustments[emp.id] || { discounts: 0, overtime: 0 };
    const payroll = calculatePayroll({
      baseSalary: emp.salary || 0, foodAllowance: emp.foodAllowance || 0,
      transportAllowance: emp.transportAllowance || 0, bonus: emp.bonus || 0,
      overtimeAmount: adjustments.overtime, otherDiscounts: adjustments.discounts,
      irtExempt: emp.irtExempt || false
    });
    const html = generateReceiptHtml(emp, payroll, adjustments, 'INDIVIDUAL', logoBase64);
    setPrintHtml(html);
    setPrintTitle(`Recibo - ${emp.name}`);
    setIsPrintOpen(true);
  };

  const formatKz = (val: number) => new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(val);

  const totalPayroll = useMemo(() => employees.reduce((acc, emp) => acc + emp.salary, 0), [employees]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || hasSubmitted) return; // Prevenir double submit
    
    setIsSubmitting(true);
    setHasSubmitted(true);
    
    try {
      if (editingEmp) {
        // EDITAR FUNCIONÁRIO - Usar updateEmployeeWithPersistence
        const updatedEmployee = { ...editingEmp, ...empForm } as Employee;
        const { updateEmployeeWithPersistence } = useStore.getState();
        
        console.log('[STAFF] Tentando atualizar funcionário no Supabase:', updatedEmployee);
        
        const success = await updateEmployeeWithPersistence(updatedEmployee);
        
        if (success) {
          // Fechar modal apenas se gravou com sucesso
          setIsEmpModalOpen(false);
          setEditingEmp(null);
          setEmpForm({
            name: '',
            role: 'GARCOM',
            phone: '',
            salary: 0,
            workDaysPerMonth: 22,
            dailyWorkHours: 8,
            color: '#06b6d4',
            externalBioId: '',
            foodAllowance: 0,
            transportAllowance: 0,
            bonus: 0,
            overtimeHourlyRate: 0
          });
        }
        
        setIsSubmitting(false);
        setHasSubmitted(false);
      } else {
        const newEmployeeData = {
          id: `emp-${Date.now()}`,
          name: empForm.name || '',
          role: empForm.role as UserRole,
          phone: empForm.phone || '',
          salary: Number(empForm.salary) || 0,
          status: 'ATIVO' as const,
          color: empForm.color || '#06b6d4',
          workDaysPerMonth: Number(empForm.workDaysPerMonth) || 22,
          dailyWorkHours: Number(empForm.dailyWorkHours) || 8,
          externalBioId: empForm.externalBioId || `${Math.floor(Math.random() * 9999)}`,
          // NOVOS CAMPOS DE SUBSÍDIOS
          foodAllowance: Number(empForm.foodAllowance) || 0,
          transportAllowance: Number(empForm.transportAllowance) || 0,
          bonus: Number(empForm.bonus) || 0,
          overtimeHourlyRate: Number(empForm.overtimeHourlyRate) || 0
        };
        
        // SUPABASE FIRST - Usar addEmployeeWithPersistence em vez de addEmployee
        const { addEmployeeWithPersistence } = useStore.getState();
        
        // BLOQUEIO DE SEGURANÇA - Só mostrar sucesso se gravar no Supabase
        console.log('[STAFF] Tentando gravar funcionário no Supabase:', newEmployeeData);
        
        await addEmployeeWithPersistence(newEmployeeData);
        
        // Reabilitar botão após adicionar
        setIsSubmitting(false);
        setHasSubmitted(false);
        setEmpForm({
          name: '',
          role: 'GARCOM',
          phone: '',
          salary: 0,
          workDaysPerMonth: 22,
          dailyWorkHours: 8,
          color: '#06b6d4',
          externalBioId: '',
          // RESETAR NOVOS CAMPOS DE SUBSÍDIOS
          foodAllowance: 0,
          transportAllowance: 0,
          bonus: 0,
          overtimeHourlyRate: 0
        });
        setIsEmpModalOpen(false);
        setEditingEmp(null);
        
        // CONFIRMAÇÃO VISUAL - Só mostra sucesso se realmente gravou
        console.log('[STAFF] Processo de gravação concluído - verificar logs acima para confirmação');
      }
    } catch (error) {
      console.error('[STAFF] Erro ao adicionar funcionário:', error);
      addNotification('error', 'Falha ao adicionar funcionário. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftForm.employeeId) return;
    if (editingShift) {
      updateWorkShift({ ...editingShift, ...shiftForm } as WorkShift);
    } else {
      addWorkShift({
        id: `shift-${Date.now()}`,
        employeeId: shiftForm.employeeId!,
        dayOfWeek: shiftForm.dayOfWeek!,
        startTime: shiftForm.startTime!,
        endTime: shiftForm.endTime!
      });
    }
    setIsShiftModalOpen(false);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN': return { icon: ShieldCheck, color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'Gerente' };
      case 'COZINHA': return { icon: ChefHat, color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Chef' };
      case 'CAIXA': return { icon: Wallet, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Caixa' };
      case 'GARCOM': return { icon: Utensils, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Garçom' };
      case 'AUXILIAR_COZINHA': return { icon: Package, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Auxiliar de Cozinha' };
      case 'LIMPEZA': return { icon: Sparkles, color: 'text-cyan-500', bg: 'bg-cyan-500/10', label: 'Limpeza' };
      case 'ESTAFETA': return { icon: Backpack, color: 'text-pink-500', bg: 'bg-pink-500/10', label: 'Estafeta' };
      default: return { icon: Users, color: 'text-slate-500', bg: 'bg-slate-500/10', label: role };
    }
  };

  
  const filteredEmployees = useMemo(() => {
  // LIMPEZA DE LISTA - REMOVER IDs REPETIDOS
  const uniqueStaff = employees.filter((v: any, i: number, a: any[]) => a.findIndex((t: any) => t.id === v.id) === i);
  return uniqueStaff;
}, [employees]);
  const filteredShifts = workShifts.filter(s => s.dayOfWeek === selectedDay);

  const daysOfWeek = [
    { id: 1, label: 'Seg' }, { id: 2, label: 'Ter' }, { id: 3, label: 'Qua' }, 
    { id: 4, label: 'Qui' }, { id: 5, label: 'Sex' }, { id: 6, label: 'Sáb' }, { id: 0, label: 'Dom' }
  ];

  return (
    <div className="p-4 h-full overflow-y-auto bg-background text-slate-200 no-scrollbar text-sm">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
             <Fingerprint size={18} className="animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-[0.4em]">Gestão de Capital Humano</span>
          </div>
          <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none">Hub da Equipa</h2>
        </div>
        
        <div className="flex bg-white/5 p-1.5 rounded-xl border border-white/5">
          <div className="px-4 py-1.5 border-r border-white/5">
             <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Staff</p>
             <p className="text-lg font-mono font-bold text-white">{employees.length}</p>
          </div>
          <div className="px-6 py-2">
             <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Encargo Mensal</p>
             <p className="text-lg font-mono font-bold text-primary">{formatKz(totalPayroll)}</p>
          </div>
        </div>
      </header>

      <div className="flex justify-between items-center mb-8">
        <div className="flex gap-4 border-b border-white/5 overflow-x-auto no-scrollbar">
          {[
            { id: 'LIST', label: 'Funcionários', icon: Users, count: employees.length },
            { id: 'SCHEDULE', label: 'Escalas de Turno', icon: Calendar, count: workShifts.length },
            { id: 'ATTENDANCE', label: 'Ponto & Picagem', icon: Clock, count: null },
            { id: 'PAYROLL', label: 'Folha de Salário', icon: DollarSign, count: null }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`pb-4 px-6 font-black uppercase text-[10px] tracking-[0.2em] transition-all relative flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}>
              <tab.icon size={16} /> {tab.label}
              {tab.count !== null && <span className="px-1.5 py-0.5 bg-white/10 rounded text-[8px] font-bold">{tab.count}</span>}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full shadow-glow"></div>}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          {activeTab === 'LIST' && (
            <div className="flex gap-2">
              <button 
                  onClick={() => { setEditingEmp(null); setIsEmpModalOpen(true); }}
                  className="px-6 py-3 rounded-xl bg-primary text-black font-black text-[10px] uppercase tracking-widest shadow-glow hover:brightness-110 transition-all flex items-center gap-2"
              >
                  <UserPlus size={18} /> Novo Staff
              </button>
            </div>
          )}
          {activeTab === 'SCHEDULE' && (
            <div className="flex gap-2">
               <button 
                  onClick={handleExportSchedules}
                  className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest"
                  title="Imprimir Escalas"
               >
                  <Printer size={13} /> Imprimir
               </button>
               <button 
                  onClick={() => { setEditingShift(null); setShiftForm({employeeId: employees[0]?.id, dayOfWeek: selectedDay, startTime: '08:00', endTime: '16:00'}); setIsShiftModalOpen(true); }}
                  className="px-4 py-2 rounded-xl bg-primary text-black font-black text-[9px] uppercase tracking-widest shadow-glow hover:brightness-110 transition-all flex items-center gap-1.5"
               >
                  <Plus size={13} /> Nova Escala
               </button>
            </div>
          )}
        </div>
      </div>

      <div className="animate-in fade-in duration-500 pb-20">
        {activeTab === 'LIST' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {filteredEmployees.map(emp => {
              const roleInfo = getRoleBadge(emp.role);
              const RoleIcon = roleInfo.icon;
              return (
                <div key={emp.id} className="glass-panel p-8 rounded-[3rem] border border-white/5 group hover:border-primary/40 transition-all relative flex flex-col">
                  <div className="absolute top-0 right-0 p-6 opacity-5 text-white group-hover:scale-110 transition-transform"><RoleIcon size={64} /></div>
                  <div className="flex items-center gap-5 mb-8">
                    <div className="w-16 h-16 rounded-[1.8rem] flex items-center justify-center text-white shadow-2xl text-2xl font-black shrink-0 bg-dynamic" ref={(el) => { if (el) (el as HTMLElement).style.setProperty('--dynamic-color', emp.color); }}>
                        {emp.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-white text-lg tracking-tight truncate">{emp.name}</h3>
                        <div className={`mt-1 px-3 py-1 rounded-full ${roleInfo.bg} ${roleInfo.color} text-[8px] font-black uppercase tracking-widest w-fit`}>
                            {roleInfo.label}
                        </div>
                    </div>
                  </div>
                  <div className="space-y-4 mb-10 flex-1">
                    <div className="flex items-center gap-3 text-slate-400">
                        <Phone size={14} className="text-primary" />
                        <span className="text-xs font-bold uppercase tracking-tight">{emp.phone}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400">
                        <DollarSign size={14} className="text-emerald-500" />
                        <span className="text-xs font-mono font-bold text-white">{formatKz(emp.salary)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingEmp(emp); setEmpForm(emp); setHasSubmitted(false); setIsSubmitting(false); setIsEmpModalOpen(true); }} className="flex-1 py-4 rounded-2xl bg-white/5 text-slate-400 hover:text-white text-[9px] font-black uppercase tracking-widest">Editar</button>
                    <button onClick={() => removeEmployee(emp.id)} className="px-5 py-4 rounded-2xl border border-red-500/10 text-red-500/50 hover:bg-red-500 hover:text-white transition-all" aria-label="Remover funcionário"><Trash2 size={16} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'SCHEDULE' && (
          <div className="space-y-8">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4">
              {daysOfWeek.map(day => (
                <button 
                  key={day.id} 
                  onClick={() => setSelectedDay(day.id)}
                  className={`px-8 py-4 rounded-2xl border font-black uppercase text-[10px] tracking-widest transition-all ${selectedDay === day.id ? 'bg-primary border-primary text-black shadow-glow' : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'}`}
                >
                  {day.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               {filteredShifts.map(shift => {
                 const emp = employees.find(e => e.id === shift.employeeId);
                 return (
                   <div key={shift.id} className="glass-panel p-6 rounded-[2.5rem] border border-white/5 hover:border-primary/20 transition-all group">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary"><Clock size={20}/></div>
                        <div className="min-w-0">
                          <h4 className="text-white font-bold text-sm truncate uppercase">{emp?.name || 'Desconhecido'}</h4>
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{emp?.role}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/5 mb-6">
                        <span className="text-xs font-mono font-bold text-primary">{shift.startTime}</span>
                        <div className="w-4 h-0.5 bg-slate-800"></div>
                        <span className="text-xs font-mono font-bold text-orange-500">{shift.endTime}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingShift(shift); setShiftForm(shift); setIsShiftModalOpen(true); }} className="flex-1 py-3 bg-white/5 text-[9px] font-black text-slate-400 uppercase rounded-xl hover:text-white transition-colors">Ajustar</button>
                        <button onClick={() => removeWorkShift(shift.id)} className="p-3 text-red-500/50 hover:text-red-500 transition-colors" aria-label="Remover escala"><Trash2 size={16}/></button>
                      </div>
                   </div>
                 )
               })}
            </div>
          </div>
        )}

        {activeTab === 'ATTENDANCE' && (
          <div className="glass-panel rounded-[2rem] border border-white/5 overflow-hidden">
             <table className="w-full text-left">
                <thead className="bg-white/5 border-b border-white/5">
                   <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <th className="px-8 py-6">Funcionário</th>
                      <th className="px-8 py-6 text-center">Data</th>
                      <th className="px-8 py-6 text-center">Entrada</th>
                      <th className="px-8 py-6 text-center">Saída</th>
                      <th className="px-8 py-6 text-right">Estado Real</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                   {attendance.slice(-20).map((record, i) => {
                     const emp = employees.find(e => e.id === record.employeeId);
                     return (
                       <tr key={i} className="hover:bg-white/5 transition-colors">
                          <td className="px-8 py-6 font-bold text-white uppercase text-xs">{emp?.name}</td>
                          <td className="px-8 py-6 text-center text-xs font-mono text-slate-400">{record.date}</td>
                          <td className="px-8 py-6 text-center font-mono text-emerald-500">{record.clockIn ? new Date(record.clockIn).toLocaleTimeString() : '--:--'}</td>
                          <td className="px-8 py-6 text-center font-mono text-orange-500">{record.clockOut ? new Date(record.clockOut).toLocaleTimeString() : '--:--'}</td>
                          <td className="px-8 py-6 text-right">
                             <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${record.clockOut ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                {record.clockOut ? 'Finalizado' : 'Em Turno'}
                             </span>
                          </td>
                       </tr>
                     )
                   })}
                </tbody>
             </table>
          </div>
        )}

        {activeTab === 'PAYROLL' && (
          <div className="glass-panel rounded-[2.5rem] p-8 border border-white/5">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-white">Folha de Salário</h3>
              <div className="flex gap-4">
                {!isProcessingMode ? (
                  <button 
                    onClick={handleStartProcessing}
                    className="px-6 py-3 rounded-xl bg-primary text-black font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"
                  >
                    <Timer size={18} /> Iniciar Processamento do Mês
                  </button>
                ) : (
                  <button 
                    onClick={handleClosePayroll}
                    className="px-6 py-3 rounded-xl bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"
                  >
                    <CheckCircle size={18} /> Fechar e Processar Folha
                  </button>
                )}
                <button 
                  onClick={handleOpenPayrollPreview}
                  className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                >
                  <Printer size={18} /> Ver Folha Completa
                </button>
              </div>
            </div>
            
            {/* Seletor de Mês */}
            {isProcessingMode && (
              <div className="mb-6 p-4 bg-primary/10 rounded-2xl border border-primary/20">
                <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-2">Mês de Processamento</label>
                <div className="flex gap-2">
                  <select 
                    value={selectedMonth.slice(5, 7)}
                    onChange={(e) => setSelectedMonth(`${selectedMonth.slice(0, 4)}-${e.target.value.padStart(2, '0')}`)}
                    className="px-4 py-2 bg-slate-800 border border-white/20 rounded-xl text-white outline-none focus:border-primary font-bold"
                    title="Selecione o mês"
                  >
                    <option value="01">Janeiro</option>
                    <option value="02">Fevereiro</option>
                    <option value="03">Março</option>
                    <option value="04">Abril</option>
                    <option value="05">Maio</option>
                    <option value="06">Junho</option>
                    <option value="07">Julho</option>
                    <option value="08">Agosto</option>
                    <option value="09">Setembro</option>
                    <option value="10">Outubro</option>
                    <option value="11">Novembro</option>
                    <option value="12">Dezembro</option>
                  </select>
                  <select 
                    value={selectedMonth.slice(0, 4)}
                    onChange={(e) => setSelectedMonth(`${e.target.value}-${selectedMonth.slice(5, 7)}`)}
                    className="px-4 py-2 bg-slate-800 border border-white/20 rounded-xl text-white outline-none focus:border-primary font-bold"
                    title="Selecione o ano"
                  >
                    {[...Array(5)].map((_, i) => {
                      const year = new Date().getFullYear() - i;
                      return <option key={year} value={year}>{year}</option>;
                    })}
                  </select>
                </div>
              </div>
            )}
            
            {/* Cartão de Resumo Fiscal */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {(() => {
                let totalGross = 0, totalINSS = 0, totalIRT = 0, totalNet = 0, totalEmployer = 0;
                employees.forEach(emp => {
                  const adj = payrollAdjustments[emp.id] || { discounts: 0, overtime: 0 };
                  const p = calculatePayroll({
                    baseSalary: emp.salary || 0,
                    foodAllowance: emp.foodAllowance || 0,
                    transportAllowance: emp.transportAllowance || 0,
                    bonus: emp.bonus || 0,
                    overtimeAmount: adj.overtime,
                    otherDiscounts: adj.discounts,
                    irtExempt: emp.irtExempt || false
                  });
                  totalGross += p.grossSalary;
                  totalINSS += p.inssWorker;
                  totalIRT += p.irtAmount;
                  totalNet += p.netSalary;
                  totalEmployer += p.inssEmployer;
                });
                return (
                  <>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Bruto</p>
                      <p className="text-xl font-mono font-bold text-emerald-400">{formatKz(totalGross)}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">INSS Trab. (3%)</p>
                      <p className="text-xl font-mono font-bold text-orange-400">{formatKz(totalINSS)}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">IRT</p>
                      <p className="text-xl font-mono font-bold text-orange-400">{formatKz(totalIRT)}</p>
                    </div>
                    <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20">
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest">Total Líquido</p>
                      <p className="text-xl font-mono font-bold text-primary">{formatKz(totalNet)}</p>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-3 text-white font-black uppercase text-xs">Nome</th>
                    <th className="text-left p-3 text-white font-black uppercase text-xs">Cargo</th>
                    <th className="text-left p-3 text-white font-black uppercase text-xs">Base</th>
                    <th className="text-left p-3 text-white font-black uppercase text-xs">Subsídios</th>
                    {isProcessingMode && (
                      <>
                        <th className="text-left p-3 text-white font-black uppercase text-xs">Extras</th>
                        <th className="text-left p-3 text-white font-black uppercase text-xs">Outros Desc.</th>
                      </>
                    )}
                    <th className="text-left p-3 text-white font-black uppercase text-xs">INSS (3%)</th>
                    <th className="text-left p-3 text-white font-black uppercase text-xs">IRT</th>
                    <th className="text-left p-3 text-white font-black uppercase text-xs">Líquido</th>
                    {isProcessingMode && (
                      <th className="text-left p-3 text-white font-black uppercase text-xs">Ações</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {employees.map(emp => {
                    const subsidies = (emp.foodAllowance || 0) + (emp.transportAllowance || 0) + (emp.bonus || 0);
                    const adjustments = payrollAdjustments[emp.id] || { discounts: 0, overtime: 0 };
                    const payroll = calculatePayroll({
                      baseSalary: emp.salary || 0,
                      foodAllowance: emp.foodAllowance || 0,
                      transportAllowance: emp.transportAllowance || 0,
                      bonus: emp.bonus || 0,
                      overtimeAmount: adjustments.overtime,
                      otherDiscounts: adjustments.discounts,
                      irtExempt: emp.irtExempt || false
                    });

                    return (
                      <tr key={emp.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 text-white font-bold">{emp.name}</td>
                        <td className="p-3 text-slate-400">{emp.role}</td>
                        <td className="p-3 text-white font-mono">{formatKz(emp.salary)}</td>
                        <td className="p-3 text-emerald-500 font-mono">{formatKz(subsidies)}</td>
                        {isProcessingMode && (
                          <>
                            <td className="p-3">
                              <input 
                                type="number" min="0" step="1000"
                                value={adjustments.overtime}
                                onChange={e => handleAdjustmentChange(emp.id, 'overtime', Number(e.target.value))}
                                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white outline-none focus:border-primary font-mono text-sm"
                                placeholder="0"
                                title="Horas extras ou bónus adicional"
                              />
                            </td>
                            <td className="p-3">
                              <input 
                                type="number" min="0" step="1000"
                                value={adjustments.discounts}
                                onChange={e => handleAdjustmentChange(emp.id, 'discounts', Number(e.target.value))}
                                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white outline-none focus:border-primary font-mono text-sm"
                                placeholder="0"
                                title="Descontos por faltas ou atrasos"
                              />
                            </td>
                          </>
                        )}
                        <td className="p-3 text-orange-400 font-mono">-{formatKz(payroll.inssWorker)}</td>
                        <td className="p-3 text-orange-400 font-mono">-{formatKz(payroll.irtAmount)} {payroll.irtBracket > 0 && <span className="text-[9px] text-slate-500">(E{payroll.irtBracket})</span>}</td>
                        <td className="p-3 text-primary font-mono font-bold">{formatKz(payroll.netSalary)}</td>
                        {isProcessingMode && (
                          <td className="p-3">
                            <button 
                              onClick={() => generatePayslipPDF(emp)}
                              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                              title="Gerar Recibo PDF"
                            >
                              <Printer size={16} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {(() => {
                    let totalGross = 0, totalINSS = 0, totalIRT = 0, totalNet = 0;
                    employees.forEach(emp => {
                      const adj = payrollAdjustments[emp.id] || { discounts: 0, overtime: 0 };
                      const p = calculatePayroll({
                        baseSalary: emp.salary || 0,
                        foodAllowance: emp.foodAllowance || 0,
                        transportAllowance: emp.transportAllowance || 0,
                        bonus: emp.bonus || 0,
                        overtimeAmount: adj.overtime,
                        otherDiscounts: adj.discounts,
                        irtExempt: emp.irtExempt || false
                      });
                      totalGross += p.grossSalary;
                      totalINSS += p.inssWorker;
                      totalIRT += p.irtAmount;
                      totalNet += p.netSalary;
                    });
                    const totalSubsidies = employees.reduce((acc, emp) =>
                      acc + (emp.foodAllowance || 0) + (emp.transportAllowance || 0) + (emp.bonus || 0), 0
                    );
                    return (
                      <tr className="border-t-2 border-primary/20">
                        <td colSpan={3} className="p-3 text-primary font-black">TOTAL</td>
                        <td className="p-3 text-emerald-400 font-mono font-bold">{formatKz(totalSubsidies)}</td>
                        {isProcessingMode && <td colSpan={2}></td>}
                        <td className="p-3 text-orange-400 font-mono font-bold">-{formatKz(totalINSS)}</td>
                        <td className="p-3 text-orange-400 font-mono font-bold">-{formatKz(totalIRT)}</td>
                        <td className="p-3 text-primary font-mono font-bold text-lg">{formatKz(totalNet)}</td>
                        {isProcessingMode && <td></td>}
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modais de Funcionário e Turno omitidos para brevidade */}
      {isEmpModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-[120] flex items-center justify-center p-6 backdrop-blur-xl animate-in fade-in">
          <div className="glass-panel rounded-[4rem] w-full max-w-2xl p-12 border border-white/10 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsEmpModalOpen(false)} className="absolute top-10 right-10 text-slate-500 hover:text-white" aria-label="Fechar modal"><X size={32} /></button>
            <div className="flex items-center gap-4 mb-12">
               <div className="w-16 h-16 bg-primary/20 rounded-3xl flex items-center justify-center text-primary shadow-glow"><UserPlus size={32} /></div>
               <div>
                  <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">{editingEmp ? 'Atualizar Staff' : 'Admissão de Staff'}</h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">REST IA OS Human Resources</p>
               </div>
            </div>
            <form onSubmit={handleSaveEmployee} className="grid grid-cols-2 gap-8">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Nome Completo</label>
                  <input required type="text" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary font-bold" value={empForm.name} onChange={e => setEmpForm({...empForm, name: e.target.value})} placeholder="Nome completo" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Papel</label>
                  <select className="w-full p-5 bg-slate-800 border border-white/10 rounded-2xl text-white outline-none font-bold appearance-none" value={empForm.role} onChange={e => setEmpForm({...empForm, role: e.target.value as UserRole})} title="Selecione o papel do funcionário">
                    <option value="GARCOM" className="bg-slate-800 text-white">Garçom</option>
                    <option value="COZINHA" className="bg-slate-800 text-white">Chef / Cozinha</option>
                    <option value="CAIXA" className="bg-slate-800 text-white">Caixa</option>
                    <option value="ADMIN" className="bg-slate-800 text-white">Administrador</option>
                    <option value="AUXILIAR_COZINHA" className="bg-slate-800 text-white">Auxiliar de Cozinha</option>
                    <option value="LIMPEZA" className="bg-slate-800 text-white">Limpeza</option>
                    <option value="ESTAFETA" className="bg-slate-800 text-white">Estafeta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Telefone</label>
                  <input type="tel" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary font-bold" value={empForm.phone} onChange={e => setEmpForm({...empForm, phone: e.target.value})} placeholder="Telefone" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Salário (Kz)</label>
                  <input required type="number" min="0" step="1000" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary font-bold" value={empForm.salary} onChange={e => setEmpForm({...empForm, salary: Number(e.target.value)})} placeholder="Salário em Kz" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Cor</label>
                  <input type="color" className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-primary" value={empForm.color} onChange={e => setEmpForm({...empForm, color: e.target.value})} title="Selecione uma cor" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Dias Trabalho/Mês</label>
                  <input required type="number" min="1" max="31" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary font-bold" value={empForm.workDaysPerMonth} onChange={e => setEmpForm({...empForm, workDaysPerMonth: Number(e.target.value)})} placeholder="Dias por mês" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Horas/Dia</label>
                  <input required type="number" min="1" max="12" step="0.5" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary font-bold" value={empForm.dailyWorkHours} onChange={e => setEmpForm({...empForm, dailyWorkHours: Number(e.target.value)})} placeholder="Horas por dia" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">NIF do Funcionário</label>
                  <input type="text" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary font-bold" value={empForm.nif || ''} onChange={e => setEmpForm({...empForm, nif: e.target.value})} placeholder="NIF do funcionário" maxLength={20} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Data de Admissão</label>
                  <input type="date" title="Data de admissão do funcionário" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary font-bold" value={empForm.admissionDate || ''} onChange={e => setEmpForm({...empForm, admissionDate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Tipo de Contrato</label>
                  <select className="w-full p-5 bg-slate-800 border border-white/10 rounded-2xl text-white outline-none font-bold appearance-none" value={empForm.contractType || 'INDEFINIDO'} onChange={e => setEmpForm({...empForm, contractType: e.target.value})} title="Tipo de contrato">
                    <option value="INDEFINIDO" className="bg-slate-800 text-white">Indefinido</option>
                    <option value="A_TERMO" className="bg-slate-800 text-white">A Termo</option>
                    <option value="A_TERMO_CERTO" className="bg-slate-800 text-white">A Termo Certo</option>
                    <option value="TRABALHO_OCASIONAL" className="bg-slate-800 text-white">Trabalho Ocasional</option>
                    <option value="ESTAGIO" className="bg-slate-800 text-white">Estágio</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">ID Bio (Externo)</label>
                  <input type="text" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary font-bold" value={empForm.externalBioId} onChange={e => setEmpForm({...empForm, externalBioId: e.target.value})} placeholder="ID Bio externo" />
                </div>

                {/* SUBSÍDIOS */}
                <div className="col-span-2 border-t border-white/10 pt-6">
                  <h4 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                    <DollarSign size={16} className="text-emerald-400" /> Subsídios e Remunerações
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Subsídio Alimentação (Kz)</label>
                      <input type="number" min="0" step="1000" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary font-bold" value={empForm.foodAllowance || 0} onChange={e => setEmpForm({...empForm, foodAllowance: Number(e.target.value)})} placeholder="Subsídio alimentação" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Subsídio Transporte (Kz)</label>
                      <input type="number" min="0" step="1000" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary font-bold" value={empForm.transportAllowance || 0} onChange={e => setEmpForm({...empForm, transportAllowance: Number(e.target.value)})} placeholder="Subsídio transporte" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Bónus/Prémios (Kz)</label>
                      <input type="number" min="0" step="1000" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary font-bold" value={empForm.bonus || 0} onChange={e => setEmpForm({...empForm, bonus: Number(e.target.value)})} placeholder="Bónus ou prémios" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Valor Hora Extra (Kz)</label>
                      <input type="number" min="0" step="100" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary font-bold" value={empForm.overtimeHourlyRate || 0} onChange={e => setEmpForm({...empForm, overtimeHourlyRate: Number(e.target.value)})} placeholder="Valor hora extra" />
                    </div>
                  </div>
                </div>

                {/* CONFIGURAÇÃO FISCAL */}
                <div className="col-span-2 border-t border-white/10 pt-6">
                  <h4 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-primary" /> Configuração Fiscal (Angola)
                  </h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                      <input type="checkbox" id="autoTax" className="w-5 h-5 accent-primary" checked={empForm.autoCalculateTax !== false} onChange={e => setEmpForm({...empForm, autoCalculateTax: e.target.checked})} />
                      <label htmlFor="autoTax" className="text-sm text-slate-300 cursor-pointer">Calcular INSS e IRT automaticamente</label>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                      <input type="checkbox" id="irtExempt" className="w-5 h-5 accent-emerald-500" checked={empForm.irtExempt || false} onChange={e => setEmpForm({...empForm, irtExempt: e.target.checked})} />
                      <label htmlFor="irtExempt" className="text-sm text-slate-300 cursor-pointer">Isento de IRT (deficiente/combatente)</label>
                    </div>
                  </div>

                  {/* PRÉVIA DO SALÁRIO */}
                  {(() => {
                    const preview = calculatePayroll({
                      baseSalary: Number(empForm.salary) || 0,
                      foodAllowance: Number(empForm.foodAllowance) || 0,
                      transportAllowance: Number(empForm.transportAllowance) || 0,
                      bonus: Number(empForm.bonus) || 0,
                      overtimeAmount: 0,
                      otherDiscounts: 0,
                      irtExempt: empForm.irtExempt || false
                    });
                    return (
                      <div className="p-6 bg-primary/5 rounded-2xl border border-primary/20 space-y-3">
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">Pré-visualização do Salário</p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-slate-400">Salário Base</span><span className="font-mono text-white">{formatKz(preview.grossSalary - preview.baseINSS + Number(empForm.bonus || 0) + Number(empForm.foodAllowance || 0) + Number(empForm.transportAllowance || 0))}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Bruto Total</span><span className="font-mono text-emerald-400 font-bold">{formatKz(preview.grossSalary)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">INSS (3%)</span><span className="font-mono text-orange-400">-{formatKz(preview.inssWorker)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">IRT {preview.irtRate > 0 ? `(${Math.round(preview.irtRate * 100)}%)` : '(Isento)'}</span><span className="font-mono text-orange-400">-{formatKz(preview.irtAmount)}</span></div>
                          <div className="col-span-2 border-t border-white/10 pt-2 flex justify-between">
                            <span className="text-white font-bold">SALÁRIO LÍQUIDO</span>
                            <span className="font-mono text-primary font-black text-lg">{formatKz(preview.netSalary)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="col-span-2 flex justify-between items-center gap-6 mt-8">
                  <button 
                    type="submit"
                    disabled={isSubmitting || hasSubmitted}
                    className="px-6 py-3 bg-primary text-black rounded-xl font-black uppercase text-[10px] tracking-widest shadow-glow flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Guardando...' : 'Guardar Staff'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsEmpModalOpen(false)}
                    className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
            </form>
          </div>
        </div>
      )}
      
      {isShiftModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-[120] flex items-center justify-center p-6 backdrop-blur-xl animate-in fade-in">
          <div className="glass-panel rounded-[4rem] w-full max-w-md p-12 border border-white/10 shadow-2xl relative">
            <button onClick={() => setIsShiftModalOpen(false)} className="absolute top-10 right-10 text-slate-500 hover:text-white" aria-label="Fechar modal de turno"><X size={32} /></button>
            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-10 flex items-center gap-3"><Timer className="text-primary"/> Configurar Turno</h3>
            <form onSubmit={handleSaveShift} className="space-y-6">
                 <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Selecionar Colaborador</label>
                    <select required className="w-full p-5 bg-slate-800 border border-white/10 rounded-2xl text-white outline-none font-bold" value={shiftForm.employeeId} onChange={e => setShiftForm({...shiftForm, employeeId: e.target.value})} title="Selecione o colaborador">
                       {employees.map(e => <option key={e.id} value={e.id} className="bg-slate-800 text-white">{e.name}</option>)}
                    </select>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Início</label>
                       <input type="time" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none font-mono" value={shiftForm.startTime} onChange={e => setShiftForm({...shiftForm, startTime: e.target.value})} placeholder="Hora início" />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Fim</label>
                       <input type="time" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none font-mono" value={shiftForm.endTime} onChange={e => setShiftForm({...shiftForm, endTime: e.target.value})} placeholder="Hora fim" />
                    </div>
                 </div>
                 <button type="submit" className="w-full py-6 bg-primary text-black rounded-[2rem] font-black uppercase text-xs shadow-glow">Confirmar Escala</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW FOLHA SALARIAL A4 */}
      {isPayrollPreviewOpen && (
        <div className="fixed inset-0 bg-black/90 z-[130] flex items-center justify-center p-6 backdrop-blur-xl">
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header do modal */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <Printer size={20} className="text-slate-700" />
                <h3 className="text-lg font-bold text-slate-800">Folha de Pagamento — Pré-visualização A4</h3>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handlePrintPayrollA4}
                  className="px-4 py-2 bg-primary text-black rounded-lg font-bold text-sm hover:scale-105 transition-all flex items-center gap-2"
                >
                  <Printer size={16} /> Imprimir / PDF
                </button>
                <button 
                  onClick={() => setIsPayrollPreviewOpen(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-300 transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>
            
            {/* Área de Preview A4 */}
            <div className="flex-1 overflow-auto bg-slate-200 p-4">
              <div id="payroll-preview-content" className="bg-white mx-auto payroll-a4">
                {/* Cabeçalho */}
                <div className="payroll-header">
                  <img src="/logo-vereda.svg" alt="Tasca do Vereda" className="payroll-logo" />
                  <div className="payroll-header-info">
                    <h1 className="payroll-h1">{(settings as any)?.restaurantName || 'Tasca do Vereda'}</h1>
                    <p className="payroll-subtitle">Folha de Pagamento Oficial</p>
                    <p className="payroll-meta">NIF: {(settings as any)?.nif || '5000000000'} | {(settings as any)?.address || 'Via AL 15, Talatona, Luanda'}</p>
                  </div>
                  <div className="payroll-ref">
                    <p className="payroll-ref-label">Referência</p>
                    <p className="payroll-ref-value">{new Date().toLocaleDateString('pt-AO', { month: 'long', year: 'numeric' })}</p>
                    <p className="payroll-ref-extra">OGE 2024 — Angola</p>
                  </div>
                </div>

                {/* Tabela */}
                <table className="payroll-table">
                  <thead className="payroll-thead">
                    <tr>
                      {['Funcionário', 'Cargo', 'Base', 'Subsídios', 'Bruto', 'INSS (3%)', 'IRT', 'Líquido'].map((h, i) => (
                        <th key={h} className={`payroll-th ${i >= 2 ? 'payroll-th-right' : 'payroll-th-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="payroll-tbody">
                    {(() => {
                      let totalGross = 0, totalINSS = 0, totalIRT = 0, totalNet = 0, totalSubs = 0;
                      return employees.map(emp => {
                        const subsidies = (emp.foodAllowance || 0) + (emp.transportAllowance || 0) + (emp.bonus || 0);
                        const adj = payrollAdjustments[emp.id] || { discounts: 0, overtime: 0 };
                        const p = calculatePayroll({
                          baseSalary: emp.salary || 0,
                          foodAllowance: emp.foodAllowance || 0,
                          transportAllowance: emp.transportAllowance || 0,
                          bonus: emp.bonus || 0,
                          overtimeAmount: adj.overtime,
                          otherDiscounts: adj.discounts,
                          irtExempt: emp.irtExempt || false
                        });
                        totalGross += p.grossSalary;
                        totalINSS += p.inssWorker;
                        totalIRT += p.irtAmount;
                        totalNet += p.netSalary;
                        totalSubs += subsidies;
                        return (
                          <tr key={emp.id}>
                            <td className="payroll-td payroll-td-name">{emp.name}</td>
                            <td className="payroll-td payroll-td-role">{emp.role}</td>
                            <td className="payroll-td payroll-td-right payroll-td-base">{formatKz(emp.salary)}</td>
                            <td className="payroll-td payroll-td-right payroll-td-subs">{subsidies > 0 ? '+' + formatKz(subsidies) : formatKz(0)}</td>
                            <td className="payroll-td payroll-td-right payroll-td-gross">{formatKz(p.grossSalary)}</td>
                            <td className="payroll-td payroll-td-right payroll-td-deduct">-{formatKz(p.inssWorker)}</td>
                            <td className="payroll-td payroll-td-right payroll-td-deduct">-{formatKz(p.irtAmount)} <span className="payroll-td-bracket">{p.irtBracket > 0 ? `(E${p.irtBracket})` : '(Isento)'}</span></td>
                            <td className="payroll-td payroll-td-right payroll-td-net">{formatKz(p.netSalary)}</td>
                          </tr>
                        );
                      }).concat(
                        <tr key="total" className="payroll-total-row">
                          <td colSpan={3} className="payroll-total-td payroll-total-label">TOTAL</td>
                          <td className="payroll-total-td payroll-total-subs">{formatKz(totalSubs)}</td>
                          <td className="payroll-total-td payroll-total-gross">{formatKz(totalGross)}</td>
                          <td className="payroll-total-td payroll-total-deduct">-{formatKz(totalINSS)}</td>
                          <td className="payroll-total-td payroll-total-deduct">-{formatKz(totalIRT)}</td>
                          <td className="payroll-total-td payroll-total-net">{formatKz(totalNet)}</td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>

                <div className="payroll-footer">
                  <p>
                    <strong>Nota:</strong> INSS calculado sobre base salarial + bónus (subsídios excluídos). IRT calculado por tabela progressiva conforme CIRT Angola 2024.
                    Salários até 100.000 Kz isentos de IRT. INSS trabalhador: 3% | INSS empregador: 8%.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL DE CONFIRMAÇÃO DE PROCESSAMENTO */}
      {isConfirmOpen && confirmData && (
        <div className="fixed inset-0 bg-black/90 z-[140] flex items-center justify-center p-6 backdrop-blur-xl">
          <div className="glass-panel rounded-[2.5rem] w-full max-w-lg p-10 border border-white/10 shadow-2xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400"><CheckCircle size={28} /></div>
              <div>
                <h3 className="text-2xl font-black text-white">Confirmar Processamento</h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{confirmData.alreadyProcessed ? '⚠️ Mês já processado — vai reprocessar' : 'Verifique os totais antes de confirmar'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-[10px] font-black text-slate-500 uppercase">Funcionários</p>
                <p className="text-xl font-mono font-bold text-white">{confirmData.count}</p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-[10px] font-black text-slate-500 uppercase">Total Bruto</p>
                <p className="text-xl font-mono font-bold text-emerald-400">{formatKz(confirmData.totalGross)}</p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-[10px] font-black text-slate-500 uppercase">INSS (3%)</p>
                <p className="text-xl font-mono font-bold text-orange-400">-{formatKz(confirmData.totalINSS)}</p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-[10px] font-black text-slate-500 uppercase">IRT</p>
                <p className="text-xl font-mono font-bold text-orange-400">-{formatKz(confirmData.totalIRT)}</p>
              </div>
              <div className="col-span-2 p-4 bg-primary/10 rounded-2xl border border-primary/20">
                <p className="text-[10px] font-black text-primary uppercase">Total Líquido a Pagar</p>
                <p className="text-2xl font-mono font-bold text-primary">{formatKz(confirmData.totalNet)}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleConfirmProcess} className="flex-1 px-6 py-4 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all flex items-center justify-center gap-2">
                <CheckCircle size={18} /> Confirmar e Processar
              </button>
              <button onClick={() => { setIsConfirmOpen(false); setConfirmData(null); }} className="px-6 py-4 bg-white/5 border border-white/10 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE IMPRESSÃO VIA IFRAME */}
      {isPrintOpen && (
        <div className="fixed inset-0 bg-black/90 z-[140] flex items-center justify-center p-4 backdrop-blur-xl">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[95vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <Printer size={20} className="text-slate-700" />
                <h3 className="text-lg font-bold text-slate-800">{printTitle}</h3>
              </div>
              <div className="flex gap-2">
                <button onClick={() => {
                  const iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
                  if (iframe?.contentWindow) iframe.contentWindow.print();
                }} className="px-4 py-2 bg-primary text-black rounded-lg font-bold text-sm hover:scale-105 transition-all flex items-center gap-2">
                  <Printer size={16} /> Imprimir / PDF
                </button>
                <button onClick={() => { setIsPrintOpen(false); setPrintHtml(''); }} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-300 transition-all">
                  Fechar
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 overflow-auto">
              <iframe id="print-iframe" srcDoc={printHtml} className="w-full h-full border-0" title="Print Preview" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;




