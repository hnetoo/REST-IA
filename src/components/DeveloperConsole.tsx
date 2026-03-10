import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { versionControlService } from '../services/versionControlService';
import { Terminal, Send, History, RotateCcw, Activity, ShieldCheck } from 'lucide-react';

const DeveloperConsole = () => {
  const { addNotification } = useStore();
  const [command, setCommand] = useState('');
  const [logs, setLogs] = useState<{ type: 'cmd' | 'res' | 'err', text: string }[]>([]);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    const cmd = command.trim();
    setLogs(prev => [...prev, { type: 'cmd', text: cmd }]);
    setCommand('');

    try {
      if (cmd.startsWith('/salvar-ponto')) {
        const desc = cmd.replace('/salvar-ponto', '').trim() || 'Ponto de restauração manual';
        const state = useStore.getState();
        await versionControlService.createRestorePoint(desc, state);
        setLogs(prev => [...prev, { type: 'res', text: `Sucesso: Ponto de restauração "${desc}" criado.` }]);
        addNotification('success', 'Ponto de restauração criado.');
      } 
      else if (cmd === '/listar-versoes') {
        const points = versionControlService.getRestorePoints();
        if (points.length === 0) {
          setLogs(prev => [...prev, { type: 'res', text: 'Nenhum ponto de restauração encontrado.' }]);
        } else {
          points.forEach(p => {
            setLogs(prev => [...prev, { type: 'res', text: `[${p.id}] ${p.timestamp}: ${p.description}` }]);
          });
        }
      }
      else if (cmd.startsWith('/reverter')) {
        const id = cmd.replace('/reverter', '').trim();
        if (!id) {
          setLogs(prev => [...prev, { type: 'err', text: 'Erro: ID da versão é obrigatório. Use /reverter [ID]' }]);
          return;
        }
        const success = await versionControlService.revertTo(id);
        if (success) {
          setLogs(prev => [...prev, { type: 'res', text: `Sucesso: Sistema revertido para ${id}. Reiniciando estado...` }]);
          addNotification('success', 'Sistema restaurado com sucesso.');
          window.location.reload();
        } else {
          setLogs(prev => [...prev, { type: 'err', text: `Erro: Versão ${id} não encontrada.` }]);
        }
      }
      else if (cmd.startsWith('/comparar')) {
        const parts = cmd.split(' ');
        if (parts.length < 3) {
          setLogs(prev => [...prev, { type: 'err', text: 'Erro: Use /comparar [ID1] [ID2]' }]);
        } else {
          const diff = versionControlService.compare(parts[1], parts[2]);
          setLogs(prev => [...prev, { type: 'res', text: diff }]);
        }
      }
      else if (cmd === '/status') {
        const last = await versionControlService.status();
        const points = versionControlService.getRestorePoints();
        const statusMsg = last 
          ? `Sistema Operacional. Total de pontos: ${points.length}. Último: ${last.description} (${last.id})`
          : 'Sistema Operacional. Nenhum ponto de restauração encontrado.';
        setLogs(prev => [...prev, { type: 'res', text: statusMsg }]);
      }
      else if (cmd === '/ajuda' || cmd === '/help') {
        const help = [
          'Comandos disponíveis:',
          '/salvar-ponto [desc] - Cria um ponto de restauração',
          '/listar-versoes - Lista todo o histórico',
          '/reverter [ID] - Restaura uma versão específica',
          '/comparar [ID1] [ID2] - Compara duas versões',
          '/status - Verifica o estado atual do versionamento',
          '/limpar - Limpa o log da consola'
        ];
        help.forEach(h => setLogs(prev => [...prev, { type: 'res', text: h }]));
      }
      else if (cmd === '/limpar') {
        setLogs([]);
      }
      else {
        setLogs(prev => [...prev, { type: 'err', text: `Comando desconhecido: ${cmd}` }]);
      }
    } catch (err: any) {
      setLogs(prev => [...prev, { type: 'err', text: `Erro na operação: ${err.message}` }]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 p-6 font-mono text-xs">
      <div className="flex items-center gap-3 mb-6 text-primary">
        <Terminal size={18} />
        <h3 className="font-black uppercase tracking-widest italic">Consola do Desenvolvedor</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 mb-4 no-scrollbar bg-black/40 rounded-2xl p-4 border border-white/5">
        {logs.map((log, i) => (
          <div key={i} className={`${log.type === 'cmd' ? 'text-white' : log.type === 'err' ? 'text-red-400' : 'text-emerald-400'}`}>
            <span className="opacity-50 mr-2">{log.type === 'cmd' ? '>' : log.type === 'res' ? '√' : '×'}</span>
            {log.text}
          </div>
        ))}
      </div>

      <form onSubmit={handleCommand} className="relative">
        <input 
          type="text" 
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Digite um comando (ex: /salvar-ponto Nova Funcionalidade)..."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
        />
        <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:scale-110 transition-transform">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default DeveloperConsole;
