
import { Order, Customer, Dish, SystemSettings } from '../types';

/**
 * Gera o ficheiro SAF-T AO (Angola) Versão 1.01 conforme as normas da AGT
 */
export const generateSAFT = (
  orders: Order[],
  customers: Customer[],
  menu: Dish[],
  settings: SystemSettings,
  period: { month: number; year: number }
) => {
  const closedOrders = orders.filter(o => 
    o.status === 'FECHADO' && 
    o.invoiceNumber &&
    new Date(o.timestamp).getMonth() === period.month &&
    new Date(o.timestamp).getFullYear() === period.year
  );

  const lastDay = new Date(period.year, period.month + 1, 0).getDate();
  const startDate = `${period.year}-${(period.month + 1).toString().padStart(2, '0')}-01`;
  const endDate = `${period.year}-${(period.month + 1).toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

  const customerIdsInPeriod = new Set(closedOrders.map(o => o.customerId || 'CONSUMIDOR_FINAL'));
  const activeCustomers = customers.filter(c => customerIdsInPeriod.has(c.id));

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
    ${activeCustomers.map(c => `
    <Customer>
      <CustomerID>${c.id}</CustomerID>
      <AccountID>Desconhecido</AccountID>
      <CustomerTaxID>${c.nif || '999999999'}</CustomerTaxID>
      <CompanyName>${c.name}</CompanyName>
      <BillingAddress><AddressDetail>Angola</AddressDetail><City>Luanda</City><Country>AO</Country></BillingAddress>
      <SelfBillingIndicator>0</SelfBillingIndicator>
    </Customer>`).join('')}
    ${menu.map(d => `
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
      <NumberOfEntries>${closedOrders.length}</NumberOfEntries>
      <TotalDebit>0.00</TotalDebit>
      <TotalCredit>${closedOrders.reduce((acc, o) => acc + o.total, 0).toFixed(2)}</TotalCredit>
      ${closedOrders.map(o => `
      <Invoice>
        <InvoiceNo>${o.invoiceNumber}</InvoiceNo>
        <DocumentStatus><InvoiceStatus>N</InvoiceStatus><InvoiceStatusDate>${new Date(o.timestamp).toISOString()}</InvoiceStatusDate><SourceID>1</SourceID><SourceBilling>P</SourceBilling></DocumentStatus>
        <Hash>${o.hash || 'SimulatedHash'}</Hash>
        <Period>${period.month + 1}</Period>
        <InvoiceDate>${new Date(o.timestamp).toISOString().split('T')[0]}</InvoiceDate>
        <InvoiceType>${o.invoiceNumber?.startsWith('FR') ? 'FR' : 'FT'}</InvoiceType>
        <SourceID>1</SourceID>
        <CustomerID>${o.customerId || 'CONSUMIDOR_FINAL'}</CustomerID>
        ${o.items.map((item, idx) => `
        <Line>
          <LineNumber>${idx + 1}</LineNumber>
          <ProductCode>${item.dishId}</ProductCode>
          <ProductDescription>${menu.find(m => m.id === item.dishId)?.name || 'Item'}</ProductDescription>
          <Quantity>${item.quantity}</Quantity>
          <UnitPrice>${item.unitPrice.toFixed(2)}</UnitPrice>
          <TaxPointDate>${new Date(o.timestamp).toISOString().split('T')[0]}</TaxPointDate>
          <CreditAmount>${(item.quantity * item.unitPrice).toFixed(2)}</CreditAmount>
          <Tax><TaxType>IVA</TaxType><TaxCountryRegion>AO</TaxCountryRegion><TaxCode>NOR</TaxCode><TaxPercentage>${settings.taxRate.toFixed(2)}</TaxPercentage></Tax>
        </Line>`).join('')}
        <DocumentTotals>
          <TaxPayable>${o.taxTotal.toFixed(2)}</TaxPayable>
          <NetTotal>${(o.total - o.taxTotal).toFixed(2)}</NetTotal>
          <GrossTotal>${o.total.toFixed(2)}</GrossTotal>
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
