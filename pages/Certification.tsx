
import React from 'react';
import { ShieldCheck, FileText, Download, Printer, Lock, Database, Code, Shield } from 'lucide-react';
import { useStore } from '../store/useStore';

const Certification = () => {
  const { settings } = useStore();

  const handlePrintDocs = () => {
    window.print();
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-background no-scrollbar">
      <header className="flex justify-between items-center mb-10 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <ShieldCheck size={18} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">AGT Compliance Module</span>
          </div>
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Documentação Técnica</h2>
        </div>
        
        <button 
          onClick={handlePrintDocs}
          className="bg-primary text-black px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-glow flex items-center gap-3 hover:scale-105 transition-all"
        >
          <Printer size={20} /> Imprimir Dossier AGT
        </button>
      </header>

      <article className="glass-panel p-12 rounded-[3rem] border-white/5 bg-white shadow-2xl text-slate-900 print:shadow-none print:border-none print:p-0 print:m-0">
        {/* Cabeçalho do Documento */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-black uppercase mb-2">Dossier Técnico de Certificação de Software</h1>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Conforme Lei n.º 7/19 de 24 de Abril e Aviso n.º 1/19</p>
          <div className="w-24 h-1 bg-primary mx-auto mt-6"></div>
        </div>

        <section className="space-y-10">
          {/* 1. Identificação */}
          <div>
            <h3 className="flex items-center gap-3 text-xl font-black uppercase mb-4 border-b-2 border-slate-100 pb-2">
              <FileText className="text-primary" size={24} /> 1. Identificação do Produto e Produtor
            </h3>
            <div className="grid grid-cols-2 gap-6 text-sm">
              <p><strong>Nome Comercial:</strong> REST IA OS - Gestão Inteligente</p>
              <p><strong>Versão do Software:</strong> 1.0.5</p>
              <p><strong>Linguagem de Programação:</strong> TypeScript (React) / Rust (Tauri Core)</p>
              <p><strong>Base de Dados:</strong> SQLite (Local Imutable Store)</p>
              <p><strong>Produtor:</strong> Vereda Systems Angola</p>
              <p><strong>NIF Produtor:</strong> {settings.nif}</p>
            </div>
          </div>

          {/* 2. Arquitetura de Segurança */}
          <div>
            <h3 className="flex items-center gap-3 text-xl font-black uppercase mb-4 border-b-2 border-slate-100 pb-2">
              <Lock className="text-primary" size={24} /> 2. Arquitetura de Segurança e Integridade
            </h3>
            <div className="space-y-4 text-sm leading-relaxed">
              <p>
                O sistema utiliza uma arquitetura descentralizada com <strong>Hash Chaining</strong>. Cada fatura emitida gera um Hash único baseado nos campos críticos (Data, Número, Total, Hash anterior). 
              </p>
              <p>
                <strong>Algoritmo de Assinatura:</strong> RSA com SHA-256. A chave privada é armazenada de forma encriptada no núcleo nativo da aplicação (Rust Layer), inacessível ao utilizador final.
              </p>
              <p>
                <strong>Imutabilidade:</strong> O software não permite a eliminação física de registos de faturação. Qualquer correção é efetuada através de documentos retificativos (Notas de Crédito) com referência direta ao documento original, mantendo a integridade da sequência numérica.
              </p>
            </div>
          </div>

          {/* 3. Requisitos Funcionais AGT */}
          <div>
            <h3 className="flex items-center gap-3 text-xl font-black uppercase mb-4 border-b-2 border-slate-100 pb-2">
              <Shield className="text-primary" size={24} /> 3. Conformidade com Requisitos Funcionais
            </h3>
            <ul className="list-disc pl-6 space-y-2 text-sm">
              <li><strong>Numeração Sequencial:</strong> Séries de faturação anuais com numeração cronológica sem interrupções.</li>
              <li><strong>Gestão de Impostos:</strong> Cálculo automático de IVA (14%) e regimes de isenção conforme código de imposto (NOR, ISE, OUT).</li>
              <li><strong>Exportação SAF-T (AO):</strong> Geração de ficheiro XML conforme esquema 1.01 definido pela AGT, incluindo tabelas de clientes, produtos, impostos e documentos comerciais.</li>
              <li><strong>Cópia de Segurança:</strong> Sistema de backup automático diário para o diretório local do Windows e suporte a sincronização cloud segura.</li>
            </ul>
          </div>

          {/* 4. Especificações da Base de Dados */}
          <div>
            <h3 className="flex items-center gap-3 text-xl font-black uppercase mb-4 border-b-2 border-slate-100 pb-2">
              <Database className="text-primary" size={24} /> 4. Dicionário de Dados (Resumo)
            </h3>
            <div className="overflow-hidden border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3">Tabela</th>
                    <th className="p-3">Campos Críticos</th>
                    <th className="p-3">Finalidade Fiscal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-3 font-bold">Invoices</td>
                    <td className="p-3">InvoiceNo, Hash, GrossTotal, TaxPayable</td>
                    <td className="p-3">Registo de venda e assinatura digital</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold">AuditLog</td>
                    <td className="p-3">UserID, Action, Timestamp, OldValue, NewValue</td>
                    <td className="p-3">Rastreabilidade de operações sensíveis</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <footer className="mt-20 pt-10 border-t-2 border-slate-200 text-center text-[10px] text-slate-400 uppercase font-black">
          <p>Documento gerado eletronicamente por REST IA OS v1.0.5</p>
          <p>Assinatura Digital do Produtor: ________________________________________________</p>
        </footer>
      </article>

      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .glass-panel { background: white !important; border: none !important; color: black !important; }
          .text-white { color: black !important; }
          .text-slate-200 { color: black !important; }
          .text-primary { color: black !important; border-bottom: 1px solid black; }
        }
      `}</style>
    </div>
  );
};

export default Certification;
