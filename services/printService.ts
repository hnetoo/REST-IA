
import { Order, Dish, SystemSettings, Customer } from '../types';

const formatKz = (val: number) => 
  new Intl.NumberFormat('pt-AO', { 
    style: 'currency', 
    currency: 'AOA', 
    maximumFractionDigits: 0 
  }).format(val);

const thermalStyles = `
  @page { margin: 0; }
  body { 
    font-family: 'JetBrains Mono', 'Courier New', Courier, monospace; 
    width: 72mm; 
    padding: 4mm; 
    font-size: 11px; 
    color: #000; 
    line-height: 1.4;
    background: #fff;
    -webkit-print-color-adjust: exact;
  }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .bold { font-weight: 900; }
  .divider { border-top: 1px dashed #000; margin: 10px 0; }
  .header-title { font-size: 16px; font-weight: 900; margin-bottom: 2px; text-transform: uppercase; }
  .items-table { width: 100%; margin: 10px 0; border-collapse: collapse; }
  .items-table td { padding: 4px 0; vertical-align: top; }
  .qr-container { margin: 15px 0; display: flex; justify-content: center; }
  .hash-box { 
    font-size: 9px; 
    margin-top: 10px; 
    word-break: break-all; 
    text-align: center; 
    line-height: 1.4; 
    background: #f0f0f0; 
    padding: 6px; 
    border: 1px solid #000;
  }
  .tax-table { width: 100%; font-size: 9px; margin-top: 5px; border-collapse: collapse; }
  .tax-table th { text-align: left; border-bottom: 1px solid #000; padding: 2px 0; }
  .legal-footer { font-size: 8px; margin-top: 15px; border-top: 1px solid #000; padding-top: 8px; text-align: center; font-weight: bold; }
  .non-fiscal { border: 2px solid #000; padding: 6px; margin: 10px 0; text-align: center; font-weight: 900; text-transform: uppercase; font-size: 12px; }
  .customer-box { border: 1px solid #000; padding: 5px; margin: 5px 0; }
`;

/**
 * Função utilitária para disparar a impressão usando um IFRAME oculto.
 * Isso é mais robusto em ambientes Tauri/WebView do que window.open.
 */
const executePrint = (html: string) => {
  const frameId = 'print-frame';
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
    
    // Pequeno atraso para garantir renderização antes de disparar a impressão
    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
    }, 500);
  }
};

export const printThermalInvoice = (
  order: Order,
  menu: Dish[],
  settings: SystemSettings,
  customer?: Customer
) => {
  console.log(`[PRINT] Iniciando impressão de Fatura: ${order.invoiceNumber}`, {
    orderId: order.id,
    items: order.items.length,
    total: order.total
  });

  const isFR = order.paymentMethod !== 'PAGAR_DEPOIS';
  const docType = isFR ? 'Fatura-Recibo' : 'Fatura';
  
  const taxRate = settings.taxRate || 14;
  const netTotal = order.total - order.taxTotal;

  const qrData = `AGT;${settings.nif};${order.invoiceNumber};${order.total.toFixed(2)};${new Date(order.timestamp).toISOString()};${order.hash}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${order.invoiceNumber}</title>
        <style>${thermalStyles}</style>
      </head>
      <body>
        <div class="text-center">
          <div class="header-title">${settings.restaurantName}</div>
          <div class="bold">${settings.address}</div>
          <div>NIF: ${settings.nif}</div>
          <div>TEL: ${settings.phone}</div>
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
          <div>NOME: ${customer?.name || 'CONSUMIDOR FINAL'}</div>
          <div>NIF: ${customer?.nif || '999999999'}</div>
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
          <img src="${qrUrl}" width="150" height="150" />
        </div>

        <div class="hash-box">
          ${order.hash?.substring(0, 4)}-${order.hash?.substring(order.hash.length - 4)} 
          <br/> Processado por programa validado n.º ${settings.agtCertificate}/AGT
        </div>

        <div class="legal-footer">
          OS BENS/SERVIÇOS FORAM POSTOS À DISPOSIÇÃO DO ADQUIRENTE NA DATA E LOCAL DO DOCUMENTO.
          <br/><br/>
          OBRIGADO PELA PREFERÊNCIA!
          <br/>
          <b>VEREDA OS v1.0.6</b>
        </div>
      </body>
    </html>
  `;

  executePrint(html);
};

export const printCashClosing = (closedToday: Order[], settings: SystemSettings, user: string) => {
  const total = closedToday.reduce((acc, o) => acc + o.total, 0);
  const byMethod = closedToday.reduce((acc: any, o) => {
    const method = o.paymentMethod || 'OUTRO';
    acc[method] = (acc[method] || 0) + o.total;
    return acc;
  }, {});

  console.log(`[PRINT] Gerando HTML para Fecho de Caixa`, {
    total,
    pedidos: closedToday.length,
    operador: user
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
          <div class="non-fiscal">FECHO DE CAIXA DIÁRIO</div>
          <div class="divider"></div>
        </div>
        
        <div style="margin-bottom: 10px;">
          <div>OPERADOR: ${user}</div>
          <div>DATA: ${new Date().toLocaleDateString('pt-AO')}</div>
          <div>HORA: ${new Date().toLocaleTimeString('pt-AO')}</div>
          <div>PEDIDOS: ${closedToday.length}</div>
        </div>

        <div class="divider"></div>
        <div class="bold">RESUMO POR PAGAMENTO:</div>
        <table class="items-table">
          ${Object.entries(byMethod).map(([method, val]) => `
            <tr>
              <td>${method}</td>
              <td class="text-right">${formatKz(val as number)}</td>
            </tr>
          `).join('')}
        </table>

        <div class="divider"></div>
        <div class="text-right bold" style="font-size: 16px;">
          TOTAL GERAL: ${formatKz(total)}
        </div>

        <div class="legal-footer">
          RELATÓRIO DE USO INTERNO
          <br/>
          <b>VEREDA OS v1.0.6</b>
        </div>
      </body>
    </html>
  `;

  executePrint(html);
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
  
  executePrint(html);
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
  
  executePrint(html);
};

export const printPayroll = (employees: any[], settings: any) => {
  const total = employees.reduce((acc, e) => acc + e.salary, 0);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Folha de Salários</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 40px; color: #334155; }
          h1 { color: #000; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
          th { background: #f8fafc; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; }
          .total-row { background: #f1f5f9; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Folha de Pagamento - ${settings.restaurantName}</h1>
        <p>Referência: ${new Date().toLocaleDateString('pt-AO', { month: 'long', year: 'numeric' })}</p>
        <table>
          <thead>
            <tr>
              <th>Funcionário</th>
              <th>Cargo</th>
              <th>Salário Base</th>
            </tr>
          </thead>
          <tbody>
            ${employees.map(e => `
              <tr>
                <td>${e.name}</td>
                <td>${e.role}</td>
                <td>${formatKz(e.salary)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="2">TOTAL A PAGAR</td>
              <td>${formatKz(total)}</td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  `;
  
  executePrint(html);
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
  
  executePrint(html);
};
