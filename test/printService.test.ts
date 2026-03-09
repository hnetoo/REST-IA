import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { printThermalInvoice, printCashClosing, printTableReview } from '../services/printService';
import { Order, Dish, SystemSettings } from '../types';

describe('printService', () => {
  const mockSettings: SystemSettings = {
    restaurantName: 'Test Restaurant',
    address: 'Test Address',
    nif: '123456789',
    phone: '987654321',
    taxRate: 14,
    agtCertificate: '000',
    currency: 'AOA',
    appLogoUrl: '',
    taxRegime: 'GERAL',
    commercialReg: '',
    capitalSocial: '',
    conservatoria: '',
    invoiceSeries: '2024',
    kdsEnabled: false,
    isSidebarCollapsed: false,
    apiToken: '',
    supabaseUrl: '',
    supabaseKey: '',
    autoBackup: false
  };

  const mockMenu: Dish[] = [
    { 
      id: '1', 
      name: 'Dish 1', 
      price: 1000, 
      costPrice: 500,
      categoryId: '1', 
      image: '', 
      isVisibleDigital: true, 
      description: ''
    },
  ];

  const mockOrder: Order = {
    id: 'ord1',
    tableId: 1,
    items: [{ 
      dishId: '1', 
      quantity: 2, 
      unitPrice: 1000, 
      unitCost: 500,
      taxAmount: 280,
      notes: '', 
      status: 'ENTREGUE' 
    }],
    status: 'FECHADO',
    type: 'LOCAL',
    paymentMethod: 'NUMERARIO',
    timestamp: new Date(),
    total: 2280,
    taxTotal: 280,
    profit: 500,
    invoiceNumber: 'FR 2024/1',
    hash: 'abcd'
  };

  let mockIframe: any;
  let mockDoc: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // vi.useFakeTimers(); // REMOVED due to environment issues

    // Mock document methods used by executePrint
    mockDoc = {
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn(),
    };

    mockIframe = {
      id: '',
      style: {},
      contentDocument: mockDoc,
      contentWindow: {
        document: mockDoc,
        print: vi.fn(),
        focus: vi.fn(),
      },
    };

    vi.spyOn(document, 'getElementById').mockReturnValue(null);
    vi.spyOn(document, 'createElement').mockReturnValue(mockIframe);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockIframe);
  });

  afterEach(() => {
    // vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('printThermalInvoice should create iframe and write HTML', async () => {
    printThermalInvoice(mockOrder, mockMenu, mockSettings);

    // Verify iframe creation
    expect(document.createElement).toHaveBeenCalledWith('iframe');
    expect(document.body.appendChild).toHaveBeenCalled();

    // Verify content writing
    expect(mockDoc.open).toHaveBeenCalled();
    expect(mockDoc.write).toHaveBeenCalledWith(expect.stringContaining('Test Restaurant'));
    expect(mockDoc.write).toHaveBeenCalledWith(expect.stringContaining('FR 2024/1'));
    expect(mockDoc.close).toHaveBeenCalled();

    // Verify print triggering (needs timeout)
    await new Promise(r => setTimeout(r, 600));
    expect(mockIframe.contentWindow.print).toHaveBeenCalled();
  });

  it('printCashClosing should create iframe and write HTML', async () => {
    // Note: printCashClosing might have different arguments in updated service
    // Checking previous failure to align args
    printCashClosing([mockOrder], mockSettings, 'Admin');
    
    expect(mockDoc.write).toHaveBeenCalledWith(expect.stringContaining('FECHO DE CAIXA'));
    expect(mockDoc.write).toHaveBeenCalledWith(expect.stringContaining('Admin'));
    
    await new Promise(r => setTimeout(r, 600));
    expect(mockIframe.contentWindow.print).toHaveBeenCalled();
  });

  it('printTableReview should create iframe and write HTML', async () => {
    printTableReview(mockOrder, mockMenu, mockSettings);

    expect(mockDoc.write).toHaveBeenCalledWith(expect.stringContaining('CONSULTA DE MESA'));
    expect(mockDoc.write).toHaveBeenCalledWith(expect.stringContaining('MESA: 1'));
    
    await new Promise(r => setTimeout(r, 600));
    expect(mockIframe.contentWindow.print).toHaveBeenCalled();
  });
});
