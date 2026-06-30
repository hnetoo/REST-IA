
import { Order, Dish, SystemSettings, Customer } from '../../types';
import ThermalPrinterManager from './thermalPrinterConfig';
import QRCode from 'qrcode';
import { calculatePayroll } from './payroll/payrollCalculator';

const formatKz = (val: number) => 
  new Intl.NumberFormat('pt-AO', { 
    style: 'currency', 
    currency: 'AOA', 
    maximumFractionDigits: 0 
  }).format(val);

const thermalStyles = `
  @page { 
    margin: 0; 
    size: 80mm auto;
  }
  @media print {
    body { 
      font-family: 'Courier New', Courier, monospace; 
      width: 80mm; 
      min-height: 200mm;
      padding: 4mm; 
      font-size: 13px; 
      font-weight: 700;
      color: #000; 
      line-height: 1.5;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      margin: 0;
      box-sizing: border-box;
    }
  }
  body { 
    font-family: 'Courier New', Courier, monospace; 
    width: 80mm; 
    padding: 4mm; 
    font-size: 13px; 
    font-weight: 700;
    color: #000; 
    line-height: 1.5;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    margin: 0;
    box-sizing: border-box;
  }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .bold { font-weight: 900; letter-spacing: 0; }
  .divider { border-top: 1px dashed #000; margin: 10px 0; }
  .header-title { font-size: 16px; font-weight: 900; margin-bottom: 2px; text-transform: uppercase; }
  .items-table { width: 100%; margin: 10px 0; border-collapse: collapse; }
  .items-table td { padding: 5px 0; vertical-align: top; font-size: 12px; font-weight: 700; }
  .qr-container { margin: 15px 0; display: flex; justify-content: center; }
  .hash-box { 
    font-size: 10px; 
    font-weight: 700;
    margin-top: 10px; 
    word-break: break-all; 
    text-align: center; 
    line-height: 1.4; 
    background: #f0f0f0; 
    padding: 6px; 
    border: 1px solid #000;
  }
  .tax-table { width: 100%; font-size: 11px; font-weight: 700; margin-top: 5px; border-collapse: collapse; }
  .tax-table th { text-align: left; border-bottom: 1px solid #000; padding: 3px 0; font-weight: 900; }
  .legal-footer { font-size: 10px; margin-top: 15px; border-top: 1px solid #000; padding-top: 8px; text-align: center; font-weight: 900; }
  .non-fiscal { border: 2px solid #000; padding: 6px; margin: 10px 0; text-align: center; font-weight: 900; text-transform: uppercase; font-size: 12px; }
  .customer-box { border: 1px solid #000; padding: 5px; margin: 5px 0; }
`;

/**
 * Função utilitária para disparar a impressão usando um IFRAME oculto.
 * Isso é mais robusto em ambientes Tauri/WebView do que window.open.
 */
const executePrint = (html: string) => {
  console.log('[PRINT] 🚀 Iniciando executePrint...');
  
  const frameId = 'print-frame';
  let printFrame = document.getElementById(frameId) as HTMLIFrameElement;
  
  if (!printFrame) {
    console.log('[PRINT] Criando novo iframe para impressão');
    printFrame = document.createElement('iframe');
    printFrame.id = frameId;
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = 'none';
    document.body.appendChild(printFrame);
  } else {
    console.log('[PRINT] Reutilizando iframe existente');
  }

  const doc = printFrame.contentDocument || printFrame.contentWindow?.document;
  if (doc) {
    console.log('[PRINT] Escrevendo HTML no iframe');
    doc.open();
    doc.write(html);
    doc.close();
    
    // Obter configuração da impressora térmica
    const printerConfig = ThermalPrinterManager.getConfig();
    console.log('[PRINT] Configuração da impressora:', printerConfig);
    
    // Configurar CSS específico da impressora
    if (printerConfig) {
      const printerCSS = ThermalPrinterManager.getPrinterCSS(printerConfig);
      const styleElement = doc.createElement('style');
      styleElement.textContent = printerCSS;
      doc.head.appendChild(styleElement);
      console.log('[PRINT] CSS da impressora aplicado');
    }
    
    // Atraso garantido para renderização completa antes de disparar impressão
    setTimeout(() => {
      console.log('[PRINT] Tentando abrir modal de impressão...');
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        console.log('[PRINT] ✅ Modal de impressão aberto com sucesso');
      } catch (err) {
        console.error('[PRINT] ❌ Erro ao abrir modal de impressão:', err);
      }
    }, 1000); // Aumentado para 1 segundo para garantir renderização
  } else {
    console.error('[PRINT] ❌ Não foi possível acessar o documento do iframe');
  }
};

// 🔒 Função para mostrar preview em vez de imprimir direto
export const showPrintPreview = (html: string, isCashClosing?: boolean, closingDate?: string, hasExecuted?: boolean) => {
  console.log('[PRINT] 🖼️ Mostrando preview de impressão...');
  
  // Tentar disparar evento (funciona no POS)
  const event = new CustomEvent('showPrintPreview', { detail: { html, isCashClosing, closingDate, hasExecuted } });
  const dispatched = window.dispatchEvent(event);
  
  // Fallback: usar iframe oculto em vez de window.open (evita erro no Windows/Electron)
  setTimeout(() => {
    const frameId = 'print-preview-fallback';
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
      doc.write(html);
      doc.close();
    }
  }, 100);
};

export const generateInvoiceHtml = async (
  order: Order,
  menu: Dish[],
  settings: SystemSettings,
  customer?: Customer,
  customerName?: string,
  customerNif?: string
): Promise<string> => {
  console.log(`[PRINT] Gerando HTML de Fatura: ${order.invoiceNumber}`, {
    orderId: order.id,
    items: order.items.length,
    total: order.total
  });

  const isFR = order.paymentMethod !== 'PAGAR_DEPOIS';
  const docType = isFR ? 'Fatura-Recibo' : 'Fatura';
  
  const taxRate = settings.taxRate || 14;
  const netTotal = order.total - order.taxTotal;

  // Obter configuração da impressora térmica
  const printerConfig = ThermalPrinterManager.getConfig();
  
  // Gerar cabeçalho personalizado
  const headerLines = printerConfig?.headerLines || [
    settings.restaurantName || 'TASCA DO VEREDA',
    settings.nif || 'NIF: 123456789',
    settings.address || 'Rua Principal, 123',
    settings.phone || '+244 123 456 789'
  ];

  // Usar headerLines no HTML
  const headerHtml = headerLines.map(line => `<div class="bold">${line}</div>`).join('');

  // Gerar rodapé personalizado
  const footerLines = printerConfig?.footerLines || [
    'Obrigado pela sua visita!',
    'Volte sempre'
  ];

  // Usar footerLines no HTML
  const footerHtml = footerLines.map(line => `<div class="bold">${line}</div>`).join('');

  // 🔥 Gerar QR code localmente usando biblioteca qrcode
  const qrData = `AGT;${settings.nif};${order.invoiceNumber};${order.total.toFixed(2)};${new Date(order.timestamp).toISOString()};${order.hash}`;
  const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
    width: 150,
    margin: 1,
    errorCorrectionLevel: 'M'
  });

  return `
        <div class="text-center">
          ${headerHtml}
          <div class="divider"></div>
          <div class="bold" style="font-size: 14px; text-transform: uppercase;">${docType}</div>
          <div class="bold" style="font-size: 14px;">${order.invoiceNumber}</div>
          <div class="divider"></div>
        </div>

        <div style="display: flex; justify-content: space-between;">
          <span>DATA: ${new Date(order.timestamp).toLocaleDateString('pt-AO')}</span>
          <span>HORA: ${new Date(order.timestamp).toLocaleTimeString('pt-AO')}</span>
        </div>
        <div>MOEDA: AOA (Kwanza)</div>
        <div class="divider"></div>

        <div class="customer-box">
          <div class="bold">CLIENTE:</div>
          <div>NOME: ${customerName || customer?.name || 'CONSUMIDOR FINAL'}</div>
          <div>NIF: ${customerNif || customer?.nif || '999999999'}</div>
        </div>

        <table class="items-table">
          <thead>
            <tr class="bold">
              <td style="width: 60%">DESCRIÇÃO</td>
              <td class="text-right">TOTAL</td>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(item => {
              const dish = menu.find(d => d.id === item.dishId);
              return `
                <tr>
                  <td>${item.quantity}x ${dish?.name.substring(0, 30)}</td>
                  <td class="text-right">${(item.unitPrice * item.quantity).toFixed(0)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="divider"></div>

        <div class="text-right" style="font-size: 14px;">
          <div class="bold">TOTAL A PAGAR: ${formatKz(order.total)}</div>
        </div>

        <div style="margin-top: 15px;">
          <div class="bold" style="font-size: 9px; text-decoration: underline;">RESUMO DE IMPOSTOS:</div>
          <table class="tax-table">
            <thead>
              <tr>
                <th>DESCRIÇÃO</th>
                <th>TAXA</th>
                <th>INCID.</th>
                <th>VALOR</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>IVA</td>
                <td>${taxRate}%</td>
                <td>${netTotal.toFixed(2)}</td>
                <td>${order.taxTotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="qr-container">
          <img src="${qrCodeDataUrl}" width="150" height="150" />
        </div>

        <div class="hash-box">
          ${order.hash?.substring(0, 4)}-${order.hash?.substring(order.hash.length - 4)} 
          <br/> Processado por programa validado n.º ${settings.agtCertificate}/AGT
        </div>

        <div class="legal-footer">
          ${footerHtml}
          <br/>
          OS BENS/SERVIÇOS FORAM POSTOS À DISPOSIÇÃO DO ADQUIRENTE NA DATA E LOCAL DO DOCUMENTO.
          <br/><br/>
          OBRIGADO PELA PREFERÊNCIA!
          <br/>
          <b>VEREDA OS v1.1.2</b>
        </div>
  `;
};

export const printThermalInvoice = async (
  order: Order,
  menu: Dish[],
  settings: SystemSettings,
  customer?: Customer,
  customerName?: string,
  customerNif?: string
) => {
  const bodyHtml = await generateInvoiceHtml(order, menu, settings, customer, customerName, customerNif);
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${order.invoiceNumber}</title>
        <style>${thermalStyles}</style>
      </head>
      <body>${bodyHtml}</body>
    </html>
  `;
  showPrintPreview(html);
};

export const printSplitInvoices = async (
  orders: Order[],
  menu: Dish[],
  settings: SystemSettings,
  splitData: { customerName?: string; customerNif?: string }[]
) => {
  // 1. Gerar HTML de cada fatura
  const htmlParts: string[] = [];
  for (let i = 0; i < orders.length; i++) {
    const o = orders[i];
    const sd = splitData[i] || {};
    const partHtml = await generateInvoiceHtml(o, menu, settings, undefined, sd.customerName, sd.customerNif);
    const fullHtml = `<!DOCTYPE html><html><head><title>${o.invoiceNumber}</title><style>${thermalStyles}</style></head><body>${partHtml}</body></html>`;
    htmlParts.push(fullHtml);
  }

  // 2. Mostrar preview combinado (para verificação visual)
  const bodyParts = htmlParts.map(h => {
    const bodyMatch = h.match(/<body>([\s\S]*)<\/body>/);
    return `<div class="split-invoice-page">${bodyMatch ? bodyMatch[1] : h}</div>`;
  });
  const previewHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Faturas Divididas (${orders.length} parcelas)</title>
        <style>
          ${thermalStyles}
          .split-invoice-page { padding-bottom: 20px; border-bottom: 2px dashed #ccc; margin-bottom: 20px; }
          .split-invoice-page:last-child { border-bottom: none; }
        </style>
      </head>
      <body>
        ${bodyParts.join('')}
      </body>
    </html>
  `;
  showPrintPreview(previewHtml);

  // 3. Imprimir cada fatura separadamente via iframe oculto (para corte automático na térmica)
  for (let i = 0; i < htmlParts.length; i++) {
    const frameId = `print-split-${i}-${Date.now()}`;
    const printFrame = document.createElement('iframe');
    printFrame.id = frameId;
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = 'none';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlParts[i]);
      doc.close();
    }

    // Aguardar o iframe carregar antes de imprimir
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
    } catch (e) {
      console.error('[PRINT] Erro ao imprimir parcela', i + 1, e);
    }

    // Aguardar entre impressões para a térmica cortar
    await new Promise(resolve => setTimeout(resolve, 2000));
    document.body.removeChild(printFrame);
  }
};

export const printCashClosing = (
  closedToday: Order[], 
  settings: SystemSettings, 
  user: string,
  paymentBreakdown?: { [key: string]: { count: number; total: number } },
  closingDate?: string,
  soldProducts?: { name: string; quantity: number; total: number }[],
  hasExecuted?: boolean,
  shiftData?: {
    morning?: { shift?: any; sales: number; ordersCount: number; paymentBreakdown: { [key: string]: { count: number; total: number } }; soldProducts: { name: string; quantity: number; total: number }[] } | null;
    afternoon?: { shift?: any; sales: number; ordersCount: number; paymentBreakdown: { [key: string]: { count: number; total: number } }; soldProducts: { name: string; quantity: number; total: number }[] } | null;
  }
) => {
  const total = closedToday.reduce((acc, o) => acc + o.total, 0);
  
  // Usar paymentBreakdown fornecido ou calcular automaticamente
  const byMethod = paymentBreakdown || closedToday.reduce((acc: any, o) => {
    const method = o.paymentMethod || 'A CLASSIFICAR';
    if (!acc[method]) {
      acc[method] = { count: 0, total: 0 };
    }
    acc[method].count++;
    acc[method].total += o.total;
    return acc;
  }, {});

  console.log(`[PRINT] Gerando HTML para Fecho de Caixa`, {
    total,
    pedidos: closedToday.length,
    operador: user
  });

  const reportDate = closingDate ? new Date(closingDate).toLocaleDateString('pt-AO') : new Date().toLocaleDateString('pt-AO');
  const reportTime = new Date().toLocaleTimeString('pt-AO');

  const visualStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      margin: 0; padding: 40px;
      color: #1e293b; min-height: 100vh;
      display: flex; justify-content: center; align-items: flex-start;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .report-card {
      background: #fff; border-radius: 24px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.4);
      max-width: 720px; width: 100%; overflow: hidden;
    }
    .report-header {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      padding: 40px; text-align: center; color: #fff;
    }
    .shift-section {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .shift-section.morning { border-left: 4px solid #f59e0b; }
    .shift-section.afternoon { border-left: 4px solid #f97316; }
    .shift-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .shift-title { font-size: 14px; font-weight: 900; color: #0f172a; }
    .shift-title.morning { color: #b45309; }
    .shift-title.afternoon { color: #c2410c; }
    .shift-status {
      font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 20px; text-transform: uppercase;
    }
    .shift-status.closed { background: #ecfdf5; color: #047857; }
    .shift-status.open { background: #fef3c7; color: #b45309; }
    .shift-sales { font-size: 18px; font-weight: 900; color: #047857; margin-top: 8px; }
    .shift-products { margin-top: 12px; padding-top: 12px; border-top: 1px dashed #cbd5e1; }
    .shift-product-item { display: flex; justify-content: space-between; font-size: 13px; color: #475569; margin: 4px 0; }
    .shift-product-name { font-weight: 600; }
    .shift-product-value { font-weight: 700; color: #047857; }
    .report-header h1 { margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.5px; }
    .report-header .subtitle { margin: 8px 0 0; font-size: 14px; opacity: 0.9; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; }
    .report-body { padding: 32px; }
    .meta-grid {
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 28px;
    }
    .meta-item { background: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0; }
    .meta-item .label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
    .meta-item .value { font-size: 15px; font-weight: 700; color: #0f172a; }
    .stats-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px;
    }
    .stat-card {
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border: 1px solid #bbf7d0; border-radius: 16px;
      padding: 24px; text-align: center;
    }
    .stat-card.total { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-color: #6ee7b7; }
    .stat-card .stat-number { font-size: 26px; font-weight: 900; color: #047857; margin-bottom: 4px; }
    .stat-card .stat-label { font-size: 11px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 1px; }
    .section-title {
      font-size: 13px; font-weight: 900; color: #0f172a;
      text-transform: uppercase; letter-spacing: 1.5px;
      margin-bottom: 16px; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0;
    }
    .payment-table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
    .payment-table th { text-align: left; padding: 12px 16px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; background: #f8fafc; border-radius: 8px; }
    .payment-table td { padding: 14px 16px; background: #f8fafc; font-weight: 600; }
    .payment-table tr td:first-child { border-radius: 10px 0 0 10px; }
    .payment-table tr td:last-child { border-radius: 0 10px 10px 0; text-align: right; color: #047857; font-weight: 900; font-size: 15px; }
    .method-badge {
      display: inline-block; padding: 6px 14px; border-radius: 20px;
      font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
    }
    .badge-numerario { background: #ecfdf5; color: #047857; }
    .badge-multicaixa { background: #eff6ff; color: #0369a1; }
    .badge-transferencia { background: #fef3c7; color: #b45309; }
    .badge-default { background: #f3f4f6; color: #374151; }
    .products-table { width: 100%; border-collapse: separate; border-spacing: 0 6px; margin-bottom: 16px; }
    .products-table th { text-align: left; padding: 10px 16px; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; background: #f1f5f9; border-radius: 6px; }
    .products-table td { padding: 12px 16px; background: #f8fafc; font-weight: 600; font-size: 14px; }
    .products-table tr td:first-child { border-radius: 8px 0 0 8px; }
    .products-table tr td:last-child { border-radius: 0 8px 8px 0; text-align: right; color: #047857; font-weight: 900; font-size: 14px; }
    .products-table .qty-cell { text-align: center; font-weight: 700; color: #0369a1; }
    .products-table .price-cell { text-align: right; color: #64748b; font-size: 13px; }
    .products-summary {
      display: flex; justify-content: space-between; align-items: center;
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border: 1px solid #bbf7d0; border-radius: 12px;
      padding: 16px 20px; margin-bottom: 24px;
    }
    .products-summary .label { font-size: 12px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 1px; }
    .products-summary .value { font-size: 18px; font-weight: 900; color: #047857; }
    .grand-total {
      margin-top: 24px; padding: 24px;
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      border-radius: 16px; text-align: center; color: #fff;
    }
    .grand-total .label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; opacity: 0.9; margin-bottom: 8px; }
    .grand-total .value { font-size: 36px; font-weight: 900; letter-spacing: -1px; }
    .report-footer {
      text-align: center; padding: 24px 32px 32px;
      font-size: 11px; color: #94a3b8; font-weight: 600;
    }
    @media print {
      body { background: #fff; padding: 0; margin: 0; font-family: 'Courier New', monospace; font-size: 11px; }
      .report-card { box-shadow: none; border-radius: 0; max-width: 80mm; margin: 0 auto; }
      .report-header { background: #000; color: #fff; padding: 8px; text-align: center; }
      .report-header h1 { font-size: 14px; margin: 0; }
      .report-header .subtitle { font-size: 9px; margin: 2px 0 0; letter-spacing: 1px; }
      .report-body { padding: 6px; }
      .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 8px; }
      .meta-item { background: #fff; border: 1px solid #000; padding: 4px; border-radius: 0; }
      .meta-item .label { font-size: 8px; margin-bottom: 2px; }
      .meta-item .value { font-size: 10px; }
      .stats-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; margin-bottom: 8px; }
      .stat-card { background: #fff; border: 1px solid #000; padding: 6px; border-radius: 0; }
      .stat-card.total { border: 2px solid #000; }
      .stat-card .stat-number { font-size: 13px; margin-bottom: 2px; }
      .stat-card .stat-label { font-size: 7px; }
      .section-title { font-size: 10px; border-bottom: 1px solid #000; margin-top: 8px; margin-bottom: 4px; padding-bottom: 2px; }
      .payment-table { border-collapse: collapse; width: 100%; margin-bottom: 4px; }
      .payment-table th { background: #e0e0e0; border: 1px solid #000; padding: 3px; font-size: 8px; }
      .payment-table td { background: #fff; border: 1px solid #000; padding: 3px; font-size: 9px; }
      .method-badge { font-size: 8px; padding: 2px 6px; border-radius: 0; }
      .products-table { width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 4px; }
      .products-table th { background: #e0e0e0; border: 1px solid #000; padding: 3px; font-size: 8px; }
      .products-table td { background: #fff; border: 1px solid #000; padding: 3px; font-size: 9px; }
      .products-table .qty-cell { text-align: center; }
      .products-table .price-cell { text-align: right; }
      .products-summary { background: #fff; border: 1px solid #000; padding: 4px; margin: 4px 0; }
      .products-summary .label { font-size: 8px; }
      .products-summary .value { font-size: 11px; }
      .grand-total { background: #000; color: #fff; margin-top: 8px; padding: 10px; border-radius: 0; }
      .grand-total .label { font-size: 9px; }
      .grand-total .value { font-size: 18px; }
      .shift-section { background: #fff; border: 1px solid #000; padding: 6px; margin-bottom: 6px; }
      .shift-section.morning { border-left: 3px solid #000; }
      .shift-section.afternoon { border-left: 3px solid #333; }
      .shift-header { display: flex; justify-content: space-between; margin-bottom: 4px; }
      .shift-title { font-size: 10px; font-weight: 900; }
      .shift-status { font-size: 8px; padding: 2px 6px; }
      .shift-sales { font-size: 12px; font-weight: 900; margin-top: 4px; }
      .shift-products { margin-top: 4px; padding-top: 4px; border-top: 1px dashed #000; }
      .shift-product-item { display: flex; justify-content: space-between; font-size: 9px; margin: 2px 0; }
      .shift-product-name { font-weight: 600; }
      .shift-product-value { font-weight: 700; }
      .report-footer { padding: 6px; font-size: 8px; }
    }
  `;

  const getBadgeClass = (method: string) => {
    const m = method.toLowerCase();
    if (m.includes('numerario') || m.includes('dinheiro')) return 'badge-numerario';
    if (m.includes('multicaixa') || m.includes('cartao')) return 'badge-multicaixa';
    if (m.includes('transfer') || m.includes('banco')) return 'badge-transferencia';
    return 'badge-default';
  };

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>${visualStyles}</style>
      </head>
      <body>
        <div class="report-card">
          <div class="report-header">
            <h1>${settings.restaurantName || 'TASCA DO VEREDA'}</h1>
            <div class="subtitle">Fecho do Dia</div>
          </div>
          <div class="report-body">
            <div class="meta-grid">
              <div class="meta-item">
                <div class="label">Operador</div>
                <div class="value">${user}</div>
              </div>
              <div class="meta-item">
                <div class="label">Data do Fecho</div>
                <div class="value">${reportDate}</div>
              </div>
              <div class="meta-item">
                <div class="label">Hora</div>
                <div class="value">${reportTime}</div>
              </div>
              <div class="meta-item">
                <div class="label">Sistema</div>
                <div class="value">VEREDA OS v1.1.2</div>
              </div>
            </div>

            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-number">${closedToday.length}</div>
                <div class="stat-label">Vendas</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${Object.keys(byMethod).length}</div>
                <div class="stat-label">Modalidades</div>
              </div>
              <div class="stat-card total">
                <div class="stat-number">${formatKz(total)}</div>
                <div class="stat-label">Total Geral</div>
              </div>
            </div>

            ${shiftData?.morning || shiftData?.afternoon ? `
            <div class="section-title">Resumo por Turno</div>
            ${shiftData.morning ? `
            <div class="shift-section morning">
              <div class="shift-header">
                <span class="shift-title morning">Turno da Manhã</span>
                <span class="shift-status ${shiftData.morning.shift?.status === 'CLOSED' ? 'closed' : 'open'}">${shiftData.morning.shift?.status === 'CLOSED' ? 'FECHADO' : 'ABERTO'}</span>
              </div>
              <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">
                Aberto por: ${shiftData.morning.shift?.opened_by || '-'}${shiftData.morning.shift?.closed_by ? ` • Fechado por: ${shiftData.morning.shift.closed_by}` : ''}
              </div>
              <div class="shift-sales">${formatKz(shiftData.morning.sales)} <span style="font-size: 12px; font-weight: 600; color: #64748b;">(${shiftData.morning.ordersCount} venda${shiftData.morning.ordersCount !== 1 ? 's' : ''})</span></div>
              ${shiftData.morning.shift?.opening_amount != null ? `<div style="font-size: 11px; color: #64748b; margin-top: 4px;">Abertura caixa: ${formatKz(Number(shiftData.morning.shift.opening_amount))}</div>` : ''}
              ${shiftData.morning.shift?.closing_amount != null ? `<div style="font-size: 11px; color: #64748b;">Fecho caixa: ${formatKz(Number(shiftData.morning.shift.closing_amount))}</div>` : ''}
              ${shiftData.morning.shift?.expected_amount != null ? `<div style="font-size: 11px; color: #64748b;">Esperado: ${formatKz(Number(shiftData.morning.shift.expected_amount))}</div>` : ''}
              ${Object.entries(shiftData.morning.paymentBreakdown).length > 0 ? `
              <div style="margin-top: 8px;">
                ${Object.entries(shiftData.morning.paymentBreakdown).map(([m, d]: [string, any]) => `
                  <div style="display: flex; justify-content: space-between; font-size: 12px; color: #475569;">
                    <span>${m}:</span>
                    <span style="font-weight: 700; color: #047857;">${d.total.toLocaleString('pt-AO')} Kz (${d.count}x)</span>
                  </div>
                `).join('')}
              </div>
              ` : ''}
              ${shiftData.morning.soldProducts.length > 0 ? `
              <div class="shift-products">
                <p style="font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 6px;">Produtos Vendidos</p>
                ${shiftData.morning.soldProducts.map(p => `
                  <div class="shift-product-item">
                    <span class="shift-product-name">${p.name}</span>
                    <span class="shift-product-value">${p.quantity}x = ${p.total.toLocaleString('pt-AO')} Kz</span>
                  </div>
                `).join('')}
              </div>
              ` : ''}
            </div>
            ` : ''}
            ${shiftData.afternoon ? `
            <div class="shift-section afternoon">
              <div class="shift-header">
                <span class="shift-title afternoon">Turno da Tarde</span>
                <span class="shift-status ${shiftData.afternoon.shift?.status === 'CLOSED' ? 'closed' : 'open'}">${shiftData.afternoon.shift?.status === 'CLOSED' ? 'FECHADO' : 'ABERTO'}</span>
              </div>
              <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">
                Aberto por: ${shiftData.afternoon.shift?.opened_by || '-'}${shiftData.afternoon.shift?.closed_by ? ` • Fechado por: ${shiftData.afternoon.shift.closed_by}` : ''}
              </div>
              <div class="shift-sales">${formatKz(shiftData.afternoon.sales)} <span style="font-size: 12px; font-weight: 600; color: #64748b;">(${shiftData.afternoon.ordersCount} venda${shiftData.afternoon.ordersCount !== 1 ? 's' : ''})</span></div>
              ${shiftData.afternoon.shift?.opening_amount != null ? `<div style="font-size: 11px; color: #64748b; margin-top: 4px;">Abertura caixa: ${formatKz(Number(shiftData.afternoon.shift.opening_amount))}</div>` : ''}
              ${shiftData.afternoon.shift?.closing_amount != null ? `<div style="font-size: 11px; color: #64748b;">Fecho caixa: ${formatKz(Number(shiftData.afternoon.shift.closing_amount))}</div>` : ''}
              ${shiftData.afternoon.shift?.expected_amount != null ? `<div style="font-size: 11px; color: #64748b;">Esperado: ${formatKz(Number(shiftData.afternoon.shift.expected_amount))}</div>` : ''}
              ${Object.entries(shiftData.afternoon.paymentBreakdown).length > 0 ? `
              <div style="margin-top: 8px;">
                ${Object.entries(shiftData.afternoon.paymentBreakdown).map(([m, d]: [string, any]) => `
                  <div style="display: flex; justify-content: space-between; font-size: 12px; color: #475569;">
                    <span>${m}:</span>
                    <span style="font-weight: 700; color: #047857;">${d.total.toLocaleString('pt-AO')} Kz (${d.count}x)</span>
                  </div>
                `).join('')}
              </div>
              ` : ''}
              ${shiftData.afternoon.soldProducts.length > 0 ? `
              <div class="shift-products">
                <p style="font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 6px;">Produtos Vendidos</p>
                ${shiftData.afternoon.soldProducts.map(p => `
                  <div class="shift-product-item">
                    <span class="shift-product-name">${p.name}</span>
                    <span class="shift-product-value">${p.quantity}x = ${p.total.toLocaleString('pt-AO')} Kz</span>
                  </div>
                `).join('')}
              </div>
              ` : ''}
            </div>
            ` : ''}
            ` : ''}

            <div class="section-title">Resumo por Modalidade de Pagamento</div>
            <table class="payment-table">
              <thead>
                <tr>
                  <th>Modalidade</th>
                  <th>Quantidade</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(byMethod).map(([method, data]) => {
                  const t = typeof data === 'object' && data !== null ? (data as any).total : data;
                  const count = typeof data === 'object' && data !== null ? (data as any).count : 0;
                  return `
                  <tr>
                    <td><span class="method-badge ${getBadgeClass(method)}">${method}</span></td>
                    <td>${count} venda${count !== 1 ? 's' : ''}</td>
                    <td>${formatKz(t as number)}</td>
                  </tr>
                `}).join('')}
              </tbody>
            </table>

            ${soldProducts && soldProducts.length > 0 ? `
            <div class="section-title">Produtos Vendidos</div>
            <table class="products-table">
              <thead>
                <tr>
                  <th style="width: 40%;">Produto</th>
                  <th style="width: 20%; text-align: center;">Qtd. Vendida</th>
                  <th style="width: 20%; text-align: right;">Preço Unit.</th>
                  <th style="width: 20%; text-align: right;">Valor Total</th>
                </tr>
              </thead>
              <tbody>
                ${soldProducts.map(product => `
                  <tr>
                    <td><strong>${product.name}</strong></td>
                    <td class="qty-cell">${product.quantity}</td>
                    <td class="price-cell">${product.quantity > 0 ? formatKz(product.total / product.quantity) : formatKz(0)}</td>
                    <td style="text-align: right; font-weight: 900; color: #047857;">${formatKz(product.total)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="products-summary" style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 2px solid #6ee7b7;">
              <div style="text-align: left;">
                <span class="label" style="font-size: 11px; color: #059669;">Total de Produtos</span>
                <span style="display: block; font-size: 20px; font-weight: 900; color: #047857;">${soldProducts.reduce((sum, p) => sum + p.quantity, 0)} <small style="font-size: 12px; font-weight: 600;">unidades</small></span>
              </div>
              <div style="text-align: right;">
                <span class="label" style="font-size: 11px; color: #059669;">Valor Total dos Produtos</span>
                <span style="display: block; font-size: 20px; font-weight: 900; color: #047857;">${formatKz(soldProducts.reduce((sum, p) => sum + p.total, 0))}</span>
              </div>
            </div>
            ` : `
            <div class="section-title">Produtos Vendidos</div>
            <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <p style="color: #64748b; font-size: 14px; margin: 0;">Nenhum produto vendido registrado para este período.</p>
              <p style="color: #94a3b8; font-size: 12px; margin: 8px 0 0 0;">Os dados de produtos são extraídos dos pedidos fechados.</p>
            </div>
            `}

            <div class="grand-total">
              <div class="label">Total Arrecadado</div>
              <div class="value">${formatKz(total)}</div>
            </div>
          </div>
          <div class="report-footer">
            Relatório de Fecho do Dia • Uso Interno • VEREDA OS v1.1.2
          </div>
        </div>
      </body>
    </html>
  `;

  // 🔒 Usar preview em vez de imprimir direto
  showPrintPreview(html, true, closingDate, hasExecuted);
};

export const printTableReview = (order: Order, menu: Dish[], settings: SystemSettings) => {
  console.log(`[PRINT] Iniciando Consulta de Mesa: ${order.tableId}`, {
    orderId: order.id,
    total: order.total
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>${thermalStyles}</style>
      </head>
      <body>
        <div class="text-center">
          <div class="header-title">${settings.restaurantName}</div>
          <div class="non-fiscal">CONSULTA DE MESA</div>
          <div class="divider"></div>
        </div>
        <div>MESA: ${order.tableId}</div>
        <div>DATA: ${new Date().toLocaleString('pt-AO')}</div>
        <table class="items-table">
          <tbody>
            ${order.items.map(item => `
              <tr>
                <td>${item.quantity}x ${menu.find(d => d.id === item.dishId)?.name}</td>
                <td class="text-right">${(item.unitPrice * item.quantity).toFixed(0)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="divider"></div>
        <div class="text-right bold" style="font-size: 16px;">
          PRE-CONTA: ${formatKz(order.total)}
        </div>
        <div class="legal-footer" style="border: none;">
          ESTE DOCUMENTO NÃO SERVE DE FATURA.
        </div>
      </body>
    </html>
  `;
  
  // 🔒 Usar preview em vez de imprimir direto
  showPrintPreview(html);
};

export const printStaffSchedules = (employees: any[], shifts: any[], settings: any) => {
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Escalas de Staff</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 40px; color: #334155; }
          h1 { color: #000; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
          th { background: #f8fafc; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; }
          .staff-name { font-weight: bold; color: #000; }
        </style>
      </head>
      <body>
        <h1>Escalas de Trabalho - ${settings.restaurantName}</h1>
        <p>Gerado em: ${new Date().toLocaleString('pt-AO')}</p>
        <table>
          <thead>
            <tr>
              <th>Funcionário</th>
              <th>Dia da Semana</th>
              <th>Entrada</th>
              <th>Saída</th>
            </tr>
          </thead>
          <tbody>
            ${shifts.map(s => {
              const emp = employees.find(e => e.id === s.employeeId);
              return `
                <tr>
                  <td class="staff-name">${emp?.name || 'N/A'}</td>
                  <td>${days[s.dayOfWeek]}</td>
                  <td>${s.startTime}</td>
                  <td>${s.endTime}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;
  
  // 🔒 Usar preview em vez de imprimir direto
  showPrintPreview(html);
};

export const printPayroll = (employees: any[], settings: any) => {
  
  const rows = employees.map(e => {
    const p = calculatePayroll({
      baseSalary: e.salary || 0,
      foodAllowance: e.foodAllowance || 0,
      transportAllowance: e.transportAllowance || 0,
      bonus: e.bonus || 0,
      overtimeAmount: 0,
      otherDiscounts: 0,
      irtExempt: e.irtExempt || false
    });
    return { emp: e, payroll: p };
  });
  
  const totals = rows.reduce((acc, { payroll }) => ({
    gross: acc.gross + payroll.grossSalary,
    inss: acc.inss + payroll.inssWorker,
    irt: acc.irt + payroll.irtAmount,
    net: acc.net + payroll.netSalary
  }), { gross: 0, inss: 0, irt: 0, net: 0 });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Folha de Salários</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 40px; color: #334155; }
          h1 { color: #000; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
          th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
          th { background: #f8fafc; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; }
          .total-row { background: #f1f5f9; font-weight: bold; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .subtitle { color: #64748b; font-size: 12px; margin-top: 4px; }
        </style>
      </head>
      <body>
        <!-- CABECALHO COM LOGO -->
        <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 15px;">
          <img src="/logo-vereda.svg" alt="Tasca do Vereda" style="width: 70px; height: 70px; object-fit: contain; border-radius: 8px; border: 1px solid #e2e8f0; flex-shrink: 0;" />
          <div>
            <h1 style="margin: 0; font-size: 20px; color: #000; font-weight: 900;">${settings.restaurantName || 'Tasca do Vereda'}</h1>
            <p style="margin: 4px 0 0; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Folha de Pagamento Oficial</p>
            <p style="margin: 2px 0 0; font-size: 10px; color: #94a3b8;">NIF: ${settings.nif || '5000000000'} | ${settings.address || 'Via AL 15, Talatona, Luanda'}</p>
          </div>
          <div style="margin-left: auto; text-align: right;">
            <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700;">Referência</p>
            <p style="margin: 2px 0 0; font-size: 14px; font-weight: bold; color: #000;">${new Date().toLocaleDateString('pt-AO', { month: 'long', year: 'numeric' })}</p>
            <p style="margin: 2px 0 0; font-size: 9px; color: #94a3b8;">OGE 2024 — Angola</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Funcionário</th>
              <th>Cargo</th>
              <th class="text-right">Base</th>
              <th class="text-right">Subsídios</th>
              <th class="text-right">Bruto</th>
              <th class="text-right">INSS (3%)</th>
              <th class="text-right">IRT</th>
              <th class="text-right">Líquido</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(({ emp, payroll }) => `
              <tr>
                <td>${emp.name}</td>
                <td>${emp.role}</td>
                <td class="text-right">${formatKz(emp.salary)}</td>
                <td class="text-right">${formatKz((emp.foodAllowance || 0) + (emp.transportAllowance || 0) + (emp.bonus || 0))}</td>
                <td class="text-right">${formatKz(payroll.grossSalary)}</td>
                <td class="text-right">-${formatKz(payroll.inssWorker)}</td>
                <td class="text-right">-${formatKz(payroll.irtAmount)} ${payroll.irtBracket > 0 ? `(E${payroll.irtBracket})` : '(Isento)'}</td>
                <td class="text-right font-bold">${formatKz(payroll.netSalary)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="4">TOTAL</td>
              <td class="text-right">${formatKz(totals.gross)}</td>
              <td class="text-right">-${formatKz(totals.inss)}</td>
              <td class="text-right">-${formatKz(totals.irt)}</td>
              <td class="text-right">${formatKz(totals.net)}</td>
            </tr>
          </tbody>
        </table>
        <p style="margin-top: 20px; font-size: 10px; color: #94a3b8;">
          * INSS calculado sobre base salarial + bónus (subsídios excluídos). IRT calculado por tabela progressiva conforme CIRT Angola 2024.
        </p>
      </body>
    </html>
  `;
  
  showPrintPreview(html);
};

export const printFinanceReport = (title: string, data: any[], columns: string[], settings: any) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 40px; color: #334155; }
          h1 { color: #000; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
          th { background: #f8fafc; font-size: 10px; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <h1>${title} - ${settings.restaurantName}</h1>
        <p>Gerado em: ${new Date().toLocaleString('pt-AO')}</p>
        <table>
          <thead>
            <tr>
              ${columns.map(c => `<th>${c}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                ${row.map((cell: any) => `<td>${cell}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;
  
  // 🔒 Usar preview em vez de imprimir direto
  showPrintPreview(html);
};

// ═══════════════════════════════════════════════════════════════════
// 🍳 IMPRESSÃO DE TICKET DE COZINHA
// Imprime apenas items de comida na impressora térmica da cozinha
// ═══════════════════════════════════════════════════════════════════

export interface KitchenPrintConfig {
  enabled: boolean;
  kitchenCategories: string[]; // IDs das categorias que vão para a cozinha
  printerName?: string;
  connectionType: 'usb' | 'network' | 'browser'; // Tipo de ligação
  networkAddress?: string; // IP da impressora (ex: 192.168.1.100)
  networkPort?: string; // Porta (default: 9100)
  usbPrinterName?: string; // Nome da impressora USB no Windows
  autoPrint: boolean;
  showNotes: boolean;
  showTableNumber: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

export const DEFAULT_KITCHEN_PRINT_CONFIG: KitchenPrintConfig = {
  enabled: false,
  kitchenCategories: [],
  printerName: '',
  connectionType: 'browser',
  networkAddress: '',
  networkPort: '9100',
  usbPrinterName: '',
  autoPrint: true,
  showNotes: true,
  showTableNumber: true,
  fontSize: 'large'
};

export const getKitchenPrintConfig = (): KitchenPrintConfig => {
  try {
    const saved = localStorage.getItem('kitchen_print_config');
    if (saved) return { ...DEFAULT_KITCHEN_PRINT_CONFIG, ...JSON.parse(saved) };
  } catch (e) {
    console.error('[KITCHEN PRINT] Erro ao carregar config:', e);
  }
  return DEFAULT_KITCHEN_PRINT_CONFIG;
};

export const saveKitchenPrintConfig = (config: KitchenPrintConfig) => {
  localStorage.setItem('kitchen_print_config', JSON.stringify(config));
};

export const printKitchenTicket = (
  tableId: number | null,
  items: { name: string; quantity: number; notes?: string }[],
  orderNumber?: string
) => {
  if (items.length === 0) {
    console.log('[KITCHEN PRINT] Nenhum item de cozinha para imprimir');
    return;
  }

  const config = getKitchenPrintConfig();
  const now = new Date();
  const timeStr = now.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('pt-AO');

  const fontSizeMap = { small: '12px', medium: '14px', large: '16px' };
  const itemFontSize = fontSizeMap[config.fontSize] || '14px';

  const kitchenStyles = `
    @page { margin: 0; size: 80mm auto; }
    body { 
      font-family: 'Courier New', Courier, monospace; 
      width: 80mm; padding: 4mm; 
      font-size: 13px; font-weight: 700;
      color: #000; background: #fff;
      margin: 0; line-height: 1.4;
    }
    .header { text-align: center; margin-bottom: 8px; }
    .title { font-size: 20px; font-weight: 900; letter-spacing: 2px; }
    .mesa { font-size: 28px; font-weight: 900; text-align: center; margin: 8px 0; border: 2px solid #000; padding: 6px; }
    .divider { border-top: 2px dashed #000; margin: 8px 0; }
    .item { margin: 6px 0; padding: 4px 0; border-bottom: 1px dotted #999; }
    .item-row { display: flex; align-items: flex-start; }
    .item-qty { font-size: 18px; font-weight: 900; min-width: 35px; text-align: center; border: 1px solid #000; padding: 2px 6px; margin-right: 8px; }
    .item-name { font-size: ${itemFontSize}; font-weight: 900; flex: 1; text-transform: uppercase; }
    .item-notes { font-size: 11px; font-weight: 700; font-style: italic; margin-top: 2px; padding: 2px 4px; background: #eee; border-left: 3px solid #000; margin-left: 43px; }
    .footer { text-align: center; margin-top: 10px; font-size: 10px; }
    .order-num { font-size: 11px; text-align: center; margin-top: 4px; }
  `;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Ticket Cozinha</title>
        <style>${kitchenStyles}</style>
      </head>
      <body>
        <div class="header">
          <div class="title">*** COZINHA ***</div>
        </div>
        
        ${config.showTableNumber && tableId ? `<div class="mesa">MESA ${tableId}</div>` : '<div class="mesa">BALCAO</div>'}
        
        <div style="text-align: center; font-size: 11px;">
          ${dateStr} - ${timeStr}
        </div>
        ${orderNumber ? `<div class="order-num">#${orderNumber}</div>` : ''}
        
        <div class="divider"></div>
        
        ${items.map(item => `
          <div class="item">
            <div class="item-row">
              <div class="item-qty">${item.quantity}</div>
              <div class="item-name">${item.name}</div>
            </div>
            ${config.showNotes && item.notes ? `<div class="item-notes">OBS: ${item.notes}</div>` : ''}
          </div>
        `).join('')}
        
        <div class="divider"></div>
        
        <div class="footer">
          <strong>${items.length} item(s) - ${items.reduce((sum, i) => sum + i.quantity, 0)} unidade(s)</strong>
          <br/>VEREDA OS - Ticket de Cozinha
        </div>
      </body>
    </html>
  `;

  console.log('[KITCHEN PRINT] Imprimindo ticket de cozinha:', items.length, 'items, mesa:', tableId);
  executePrint(html);
};
