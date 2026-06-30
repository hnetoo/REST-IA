
import { generateInvoiceHash } from './validation/hashService';
import { logSAFTUpload } from './agt/agtComplianceLogService';

/**
 * Gera o ficheiro SAF-T AO (Angola) Versão 1.01 conforme as normas da AGT
 */
export const generateSAFT = async (
  orders: any[], // Usar any[] para evitar erros de tipo
  customers: any[], // Usar any[] para evitar erros de tipo
  menu: any[], // Usar any[] para evitar erros de tipo
  settings: any, // Usar any para evitar erros de tipo
  period: { month: number; year: number }
) => {
  const closedOrders = orders.filter((o: any) => 
    (o.status === 'closed' || o.status === 'FECHADO') && 
    (o.invoice_number || o.invoiceNumber) &&
    new Date(o.created_at || o.timestamp).getMonth() === period.month &&
    new Date(o.created_at || o.timestamp).getFullYear() === period.year
  );

  console.log('[SAFT] Debug - Orders filtradas:', {
    total: orders.length,
    closed: closedOrders.length,
    period: period,
    sample: closedOrders.slice(0, 3).map(o => ({
      id: o.id,
      status: o.status,
      invoice: o.invoice_number || o.invoiceNumber,
      date: o.created_at || o.timestamp,
      total: o.total_amount || o.total
    }))
  });

  const lastDay = new Date(period.year, period.month + 1, 0).getDate();
  const startDate = `${period.year}-${(period.month + 1).toString().padStart(2, '0')}-01`;
  const endDate = `${period.year}-${(period.month + 1).toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

  const customerIdsInPeriod = new Set(closedOrders.map((o: any) => o.customerId || o.customer_id || 'CONSUMIDOR_FINAL'));
  const activeCustomers = customers.filter((c: any) => customerIdsInPeriod.has(c.id));

  // Gerar hashes para todas as faturas
  const ordersWithHash = await Promise.all(closedOrders.map(async (o: any) => {
    const invoiceNumber = o.invoice_number || o.invoiceNumber;
    const invoiceDate = new Date(o.created_at || o.timestamp).toISOString().split('T')[0];
    const nifEmitente = settings.nif;
    const nifCliente = o.customerId || o.customer_id || 'CONSUMIDOR_FINAL';
    const total = o.total_amount || o.total || 0;
    const items = o.items || [];
    
    const hash = await generateInvoiceHash(
      invoiceNumber,
      invoiceDate,
      nifEmitente,
      nifCliente,
      total,
      items
    );
    
    return { ...o, hash };
  }));

  // Registar log de geração de SAFT
  await logSAFTUpload(
    { period, orderCount: ordersWithHash.length },
    { status: 'GENERATED' },
    'SUCCESS'
  );

  // Estrutura simplificada mas válida para 1.01
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:AO:1.01">
  <Header>
    <AuditFileVersion>1.01_01</AuditFileVersion>
    <CompanyID>${settings.nif}</CompanyID>
    <TaxRegistrationNumber>${settings.nif}</TaxRegistrationNumber>
    <TaxAccountingBasis>F</TaxAccountingBasis>
    <CompanyName>${settings.restaurantName}</CompanyName>
    <BusinessName>${settings.restaurantName}</BusinessName>
    <CompanyAddress>
      <AddressDetail>${settings.address}</AddressDetail>
      <City>Luanda</City>
      <Country>AO</Country>
    </CompanyAddress>
    <FiscalYear>${period.year}</FiscalYear>
    <StartDate>${startDate}</StartDate>
    <EndDate>${endDate}</EndDate>
    <CurrencyCode>AOA</CurrencyCode>
    <DateCreated>${new Date().toISOString().split('T')[0]}</DateCreated>
    <TaxEntity>Global</TaxEntity>
    <ProductCompanyID>VEREDA_SYSTEMS</ProductCompanyID>
    <SoftwareCertificateNumber>${settings.agtCertificate}</SoftwareCertificateNumber>
  </Header>
  <MasterFiles>
    ${activeCustomers.map((c: any) => `
    <Customer>
      <CustomerID>${c.id}</CustomerID>
      <AccountID>Desconhecido</AccountID>
      <CustomerTaxID>${c.nif || '999999999'}</CustomerTaxID>
      <CompanyName>${c.name}</CompanyName>
      <BillingAddress><AddressDetail>Angola</AddressDetail><City>Luanda</City><Country>AO</Country></BillingAddress>
      <SelfBillingIndicator>0</SelfBillingIndicator>
    </Customer>`).join('')}
    ${menu.map((d: any) => `
    <Product>
      <ProductType>S</ProductType>
      <ProductCode>${d.id}</ProductCode>
      <ProductDescription>${d.name}</ProductDescription>
    </Product>`).join('')}
    <TaxTable>
      <TaxTableEntry>
        <TaxType>IVA</TaxType>
        <TaxCountryRegion>AO</TaxCountryRegion>
        <TaxCode>NOR</TaxCode>
        <Description>Taxa Normal</Description>
        <TaxPercentage>${settings.taxRate.toFixed(2)}</TaxPercentage>
      </TaxTableEntry>
    </TaxTable>
  </MasterFiles>
  <SourceDocuments>
    <SalesInvoices>
      <NumberOfEntries>${ordersWithHash.length}</NumberOfEntries>
      <TotalDebit>0.00</TotalDebit>
      <TotalCredit>${ordersWithHash.reduce((acc: number, o: any) => acc + (o.total_amount || o.total || 0), 0).toFixed(2)}</TotalCredit>
      ${ordersWithHash.map((o: any) => `
      <Invoice>
        <InvoiceNo>${o.invoice_number || o.invoiceNumber}</InvoiceNo>
        <DocumentStatus><InvoiceStatus>N</InvoiceStatus><InvoiceStatusDate>${new Date(o.created_at || o.timestamp).toISOString()}</InvoiceStatusDate><SourceID>1</SourceID><SourceBilling>P</SourceBilling></DocumentStatus>
        <Hash>${o.hash}</Hash>
        <Period>${period.month + 1}</Period>
        <InvoiceDate>${new Date(o.created_at || o.timestamp).toISOString().split('T')[0]}</InvoiceDate>
        <InvoiceType>${(o.invoice_number || o.invoiceNumber)?.startsWith('FR') ? 'FR' : 'FT'}</InvoiceType>
        <SourceID>1</SourceID>
        <CustomerID>${o.customerId || o.customer_id || 'CONSUMIDOR_FINAL'}</CustomerID>
        ${(o.items || []).map((item: any, idx: number) => `
        <Line>
          <LineNumber>${idx + 1}</LineNumber>
          <ProductCode>${item.dishId || item.dish_id}</ProductCode>
          <ProductDescription>${item.name || 'Item'}</ProductDescription>
          <Quantity>${item.quantity}</Quantity>
          <UnitPrice>${(item.unitPrice || item.unit_price).toFixed(2)}</UnitPrice>
          <TaxPointDate>${new Date(o.created_at || o.timestamp).toISOString().split('T')[0]}</TaxPointDate>
          <CreditAmount>${(item.quantity * (item.unitPrice || item.unit_price)).toFixed(2)}</CreditAmount>
          <Tax><TaxType>IVA</TaxType><TaxCountryRegion>AO</TaxCountryRegion><TaxCode>NOR</TaxCode><TaxPercentage>${settings.taxRate.toFixed(2)}</TaxPercentage></Tax>
        </Line>`).join('')}
        <DocumentTotals>
          <TaxPayable>${((o.total_amount || o.total || 0) * (settings.taxRate / 100)).toFixed(2)}</TaxPayable>
          <NetTotal>${((o.total_amount || o.total || 0) - ((o.total_amount || o.total || 0) * (settings.taxRate / 100))).toFixed(2)}</NetTotal>
          <GrossTotal>${(o.total_amount || o.total || 0).toFixed(2)}</GrossTotal>
        </DocumentTotals>
      </Invoice>`).join('')}
    </SalesInvoices>
  </SourceDocuments>
</AuditFile>`;

  return xml;
};

export const downloadSAFT = (xml: string, filename: string) => {
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

