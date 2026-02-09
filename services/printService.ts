
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

export const printThermalInvoice = (
  order: Order,
  menu: Dish[],
  settings: SystemSettings,
  customer?: Customer
) => {
  const printWindow = window.open('', '_blank', 'width=450,height=800');
  if (!printWindow) return;

  const isFR = order.paymentMethod !== 'PAGAR_DEPOIS';
  const docType = isFR ? 'Fatura-Recibo' : 'Fatura';
  
  // Lógica de Impostos Detalhada
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

        <script>
          window.onload = () => {
            window.print();
            setTimeout(() => window.close(), 1000);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

export const printTableReview = (order: Order, menu: Dish[], settings: SystemSettings) => {
  const printWindow = window.open('', '_blank', 'width=450,height=800');
  if (!printWindow) return;

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
        <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 1000); }</script>
      </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
};

export const printCashClosing = (
  orders: Order[],
  settings: SystemSettings,
  operatorName: string,
  printWindow: Window
) => {
  const total = orders.reduce((acc, o) => acc + o.total, 0);
  const totalTax = orders.reduce((acc, o) => acc + o.taxTotal, 0);
  const byMethod = orders.reduce((acc: Record<string, number>, o) => {
    const method = o.paymentMethod || 'OUTRO';
    acc[method] = (acc[method] || 0) + o.total;
    return acc;
  }, {});

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>FECHO DE CAIXA</title>
        <style>${thermalStyles}</style>
      </head>
      <body>
        <div class="text-center">
          <div class="header-title">${settings.restaurantName}</div>
          <div class="bold" style="margin-top: 10px; font-size: 14px;">RELATÓRIO DE FECHO</div>
          <div class="divider"></div>
        </div>
        <div>OPERADOR: ${operatorName}</div>
        <div>FECHO EM: ${new Date().toLocaleString('pt-AO')}</div>
        <div>DOCUMENTOS: ${orders.length}</div>
        <div class="divider"></div>
        <div class="bold" style="text-decoration: underline;">RESUMO POR PAGAMENTO:</div>
        <table class="items-table">
          <tbody>
            ${Object.entries(byMethod).map(([m, v]) => `
              <tr>
                <td class="bold">${m.replace('_', ' ')}</td>
                <td class="text-right">${formatKz(v as number)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="divider"></div>
        <div class="text-right">
          <div>TOTAL BRUTO: ${formatKz(total)}</div>
          <div>TOTAL IVA: ${formatKz(totalTax)}</div>
          <div class="bold" style="font-size: 14px; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px;">
            TOTAL LÍQUIDO: ${formatKz(total - totalTax)}
          </div>
        </div>
        <div class="legal-footer">
          RELATÓRIO OPERACIONAL PARA USO INTERNO.
          <br/> <b>VEREDA OS - KERNEL v1.0.6</b>
        </div>
        <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 1000); }</script>
      </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
};
