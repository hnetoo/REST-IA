
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { 
  Users, Zap, Clock, Maximize2, Move, AlertTriangle, 
  MapPin, CheckCircle2, MoreVertical, Plus, Edit3, Save, X, RotateCcw
} from 'lucide-react';
import { Table, TableZone } from '../types';

const TableLayout = () => {
  const { tables, activeOrders, setActiveTable, updateTablePosition, addNotification } = useStore();
  const [activeZone, setActiveZone] = useState<TableZone>('INTERIOR');
  const [isDesignMode, setIsDesignMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Atualiza o relógio para calcular tempo de permanência
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const getTableStats = (tableId: number) => {
    const order = activeOrders.find(o => o.tableId === tableId && o.status === 'ABERTO');
    if (!order) return null;
    const elapsedMs = currentTime.getTime() - new Date(order.timestamp).getTime();
    const minutes = Math.floor(elapsedMs / 60000);
    return { minutes, total: order.total };
  };

  const handleTableMove = (id: number, direction: 'up' | 'down' | 'left' | 'right') => {
    const table = tables.find(t => t.id === id);
    if (!table) return;
    
    let { x, y } = table;
    const step = 1;
    if (direction === 'up') y = Math.max(0, y - step);
    if (direction === 'down') y = y + step;
    if (direction === 'left') x = Math.max(0, x - step);
    if (direction === 'right') x = x + step;
    
    updateTablePosition(id, x, y);
  };

  const filteredTables = tables.filter(t => t.zone === activeZone);

  return (
    <div className="p-8 h-full bg-background flex flex-col overflow-hidden animate-in fade-in duration-700">
      <header className="flex justify-between items-start mb-10 shrink-0">
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <Zap size={18} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Floor Control System</span>
          </div>
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Gestão de Sala</h2>
        </div>

        <div className="flex gap-4 items-center">
          <div className="flex gap-2 glass-panel p-1.5 rounded-2xl border border-white/5">
            {['INTERIOR', 'EXTERIOR', 'BALCAO'].map(zone => (
              <button 
                key={zone}
                onClick={() => setActiveZone(zone as TableZone)}
                className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeZone === zone ? 'bg-primary text-black shadow-glow' : 'text-slate-500 hover:text-white'}`}
              >
                {zone}
              </button>
            ))}
          </div>

          <button 
            onClick={() => {
              setIsDesignMode(!isDesignMode);
              addNotification('info', isDesignMode ? 'Modo de Operação' : 'Modo de Design Ativado');
            }}
            className={`px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 transition-all ${isDesignMode ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20' : 'bg-white/5 border border-white/10 text-slate-400'}`}
          >
            {isDesignMode ? <Save size={16} /> : <Edit3 size={16} />}
            {isDesignMode ? 'Salvar Layout' : 'Editar Layout'}
          </button>
        </div>
      </header>

      <div 
        ref={containerRef}
        className="flex-1 glass-panel rounded-[3rem] p-12 relative overflow-hidden shadow-2xl border border-white/5"
      >
        {/* Grid Visual de Fundo */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#06b6d4 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>

        {/* Desenho da Planta (Simbolizado por Áreas) */}
        {activeZone === 'INTERIOR' && (
          <div className="absolute top-10 left-10 p-4 border border-dashed border-white/10 rounded-3xl opacity-20 pointer-events-none">
            <span className="text-[10px] font-black uppercase text-slate-500">Zona de Cozinha</span>
          </div>
        )}

        {filteredTables.map(table => {
          const stats = getTableStats(table.id);
          const isCritical = stats && stats.minutes > 45;
          const isOccupied = table.status === 'OCUPADO';

          // Posicionamento baseado em grid (x * 240px, y * 240px)
          const style: React.CSSProperties = {
            position: 'absolute',
            left: `${table.x * 240 + 60}px`,
            top: `${table.y * 240 + 60}px`,
            transition: isDesignMode ? 'none' : 'all 0.5s ease'
          };

          return (
            <div
              key={table.id}
              style={style}
              className={`
                w-44 h-44 rounded-[2.5rem] border-2 flex flex-col items-center justify-center group
                ${isDesignMode ? 'border-orange-500/50 bg-orange-500/5 cursor-move' : 
                  !isOccupied ? 'border-white/10 bg-white/5 hover:border-primary/50' : 
                  isCritical ? 'border-red-500 bg-red-500/10 animate-glow' : 'border-primary bg-primary/10 shadow-glow'}
              `}
            >
              <button 
                onClick={() => !isDesignMode && setActiveTable(table.id)}
                className="w-full h-full flex flex-col items-center justify-center p-4 outline-none"
              >
                <div className="absolute top-4 left-0 right-0 text-center text-[9px] font-black text-slate-500 uppercase tracking-widest">{table.name}</div>
                
                {isOccupied && !isDesignMode ? (
                  <div className="flex flex-col items-center gap-2">
                     <div className={`flex items-center gap-2 ${isCritical ? 'text-red-500' : 'text-primary'}`}>
                        <Clock size={16} />
                        <span className="text-xl font-black font-mono">{stats.minutes}m</span>
                     </div>
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ativo</p>
                  </div>
                ) : !isDesignMode ? (
                  <div className="flex flex-col items-center gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
                     <Users size={28} className="text-slate-500 group-hover:text-primary" />
                     <span className="text-[8px] font-black uppercase text-slate-500">Livre</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Move size={24} className="text-orange-500" />
                    <span className="text-[8px] font-black uppercase text-orange-500">Mover Mesa</span>
                  </div>
                )}

                {/* Status Indicator Dot */}
                <div className={`absolute bottom-6 w-1.5 h-1.5 rounded-full ${!isOccupied ? 'bg-slate-700' : isCritical ? 'bg-red-500' : 'bg-primary'}`}></div>
              </button>

              {/* Controlos de Movimento em Modo Design */}
              {isDesignMode && (
                <div className="absolute -bottom-12 flex gap-2 animate-in zoom-in">
                   <button onClick={() => handleTableMove(table.id, 'left')} className="p-2 bg-slate-800 rounded-lg text-white hover:bg-orange-500"><ChevronLeft size={12}/></button>
                   <div className="flex flex-col gap-1">
                      <button onClick={() => handleTableMove(table.id, 'up')} className="p-2 bg-slate-800 rounded-lg text-white hover:bg-orange-500"><ChevronUp size={12}/></button>
                      <button onClick={() => handleTableMove(table.id, 'down')} className="p-2 bg-slate-800 rounded-lg text-white hover:bg-orange-500"><ChevronDown size={12}/></button>
                   </div>
                   <button onClick={() => handleTableMove(table.id, 'right')} className="p-2 bg-slate-800 rounded-lg text-white hover:bg-orange-500"><ChevronRight size={12}/></button>
                </div>
              )}
            </div>
          );
        })}

        {!isDesignMode && (
          <button 
            style={{ 
              position: 'absolute', 
              right: '60px', 
              bottom: '60px' 
            }}
            className="w-44 h-44 rounded-[2.5rem] border-2 border-dashed border-white/5 hover:border-white/20 hover:bg-white/5 transition-all flex flex-col items-center justify-center text-slate-600 hover:text-white group"
          >
             <Plus size={32} className="mb-2 group-hover:scale-110 transition-transform" />
             <span className="text-[9px] font-black uppercase tracking-widest">Nova Mesa</span>
          </button>
        )}
      </div>
      
      <footer className="mt-8 flex gap-6 shrink-0">
          <div className="flex-1 glass-panel p-6 rounded-3xl flex items-center justify-between border-primary/20">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Users size={20}/></div>
                <div>
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Clientes</p>
                   <p className="text-xl font-black text-white">42 Presentes</p>
                </div>
             </div>
             <div className="h-10 w-px bg-white/10"></div>
             <div className="text-right">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Taxa Ocupação</p>
                <p className="text-xl font-black text-primary">68%</p>
             </div>
          </div>
          <div className="glass-panel p-6 rounded-3xl flex items-center gap-4 border-red-500/20">
             <div className="p-3 bg-red-500/10 rounded-2xl text-red-500"><AlertTriangle size={20}/></div>
             <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Atenção Necessária</p>
                <p className="text-xl font-black text-white">2 Mesas Críticas</p>
             </div>
          </div>
      </footer>
    </div>
  );
};

// Sub-ícones auxiliares para o layout
const ChevronLeft = ({size}: {size: number}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
const ChevronRight = ({size}: {size: number}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
const ChevronUp = ({size}: {size: number}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
const ChevronDown = ({size}: {size: number}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>

export default TableLayout;
