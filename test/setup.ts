import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.open
window.open = vi.fn().mockReturnValue({
  document: {
    write: vi.fn(),
    close: vi.fn(),
  },
  print: vi.fn(),
  close: vi.fn(),
});

// Fix Intl mock to be a constructor using traditional function
const MockNumberFormat = function(this: any) {
  this.format = (val: number) => `Kz ${val.toLocaleString('pt-AO')}`;
};

// @ts-ignore
global.Intl = {
  ...Intl,
  NumberFormat: MockNumberFormat,
};
