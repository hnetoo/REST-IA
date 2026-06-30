import React from 'react';
import { FileText, Receipt, Smartphone } from 'lucide-react';
import type { AGTDocumentType } from '../types/agt';

interface DocumentTypeSelectorProps {
  value: AGTDocumentType;
  onChange: (type: AGTDocumentType) => void;
  disabled?: boolean;
}

const documentTypes: Array<{
  type: AGTDocumentType;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  borderColor: string;
  bgHover: string;
}> = [
  {
    type: 'FR',
    label: 'Fatura-Recibo',
    description: 'Pagamento imediato — mais comum',
    icon: Receipt,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    bgHover: 'hover:bg-emerald-500/5'
  },
  {
    type: 'FT',
    label: 'Fatura',
    description: 'Cliente com NIF / pagamento diferido',
    icon: FileText,
    color: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    bgHover: 'hover:bg-blue-500/5'
  },
  {
    type: 'TV',
    label: 'Talão de Venda',
    description: 'Balcão B2C sem NIF',
    icon: Smartphone,
    color: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    bgHover: 'hover:bg-purple-500/5'
  }
];

const DocumentTypeSelector: React.FC<DocumentTypeSelectorProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  return (
    <div className="grid grid-cols-3 gap-3">
      {documentTypes.map((doc) => {
        const Icon = doc.icon;
        const isSelected = value === doc.type;
        return (
          <button
            key={doc.type}
            type="button"
            onClick={() => !disabled && onChange(doc.type)}
            disabled={disabled}
            className={`
              relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
              ${isSelected
                ? `${doc.borderColor} bg-white/10`
                : 'border-slate-700 bg-slate-800/50'
              }
              ${!disabled ? `${doc.bgHover} hover:border-slate-500 cursor-pointer` : 'opacity-50 cursor-not-allowed'}
            `}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-white/10' : 'bg-slate-700/50'}`}>
              <Icon size={20} className={isSelected ? doc.color : 'text-slate-400'} />
            </div>
            <div className="text-center">
              <p className={`text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                {doc.type}
              </p>
              <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                {doc.label}
              </p>
            </div>
            {isSelected && (
              <div className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center`}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default DocumentTypeSelector;
