
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStore } from '../store/useStore';
import { sqliteService } from '../services/sqliteService';

// Mock dependencies
vi.mock('../services/sqliteService', () => ({
  sqliteService: {
    saveState: vi.fn(),
    loadState: vi.fn().mockResolvedValue(null),
    init: vi.fn().mockResolvedValue(true)
  }
}));

vi.mock('../services/supabaseService', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null })
        }))
      }))
    }))
  }
}));

describe('Settings Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({ 
      settings: {
        restaurantName: 'Original Name',
        address: '',
        nif: '',
        phone: '',
        taxRate: 14,
        agtCertificate: '',
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
      }
    });
  });

  it('updateSettings should update state and trigger saveState', async () => {
    const newSettings = { restaurantName: 'Updated Name' };
    
    // Act
    useStore.getState().updateSettings(newSettings);
    
    // Assert State Update
    const currentSettings = useStore.getState().settings;
    expect(currentSettings.restaurantName).toBe('Updated Name');
    
    // Assert Persistence Call
    // Note: Zustand persist middleware might be async or debounced depending on config.
    // In the provided code, it uses customPersistenceStorage which calls sqliteService.saveState
    
    // Wait a tick for async storage operations
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(sqliteService.saveState).toHaveBeenCalled();
    const calls = (sqliteService.saveState as any).mock.calls;
    const lastCallArgs = calls[calls.length - 1][0];
    expect(lastCallArgs.settings.restaurantName).toBe('Updated Name');
  });

  it('updateSettings should merge partial updates', () => {
    useStore.getState().updateSettings({ 
      restaurantName: 'New Name',
      nif: '999999999' 
    });
    
    const s = useStore.getState().settings;
    expect(s.restaurantName).toBe('New Name');
    expect(s.nif).toBe('999999999');
    expect(s.taxRate).toBe(14); // Should remain unchanged
  });
});
