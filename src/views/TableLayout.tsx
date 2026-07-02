
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '../store/useStore';
import ProgressBar from '../components/ProgressBar';
import { 
  Users, Zap, Clock, Trash2, Edit3, Save, Move, Plus, AlertTriangle, X, Grid3x3,
  Search, Home, Sun, Coffee, ZoomIn, ZoomOut, Armchair, Circle, Square, Minus
} from 'lucide-react';
import { Table, TableZone } from '../../types';
import { supabase } from '../supabase_standalone';

const TableLayout = () => {
  const { tables, activeOrders, setActiveTable, updateTablePosition, addNotification, removeTable, closeTable, addTable, updateTable } = useStore();
  
  
  const [activeZone, setActiveZone] = useState<TableZone>('INTERIOR');
  const [isDesignMode, setIsDesignMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tableToDelete, setTableToDelete] = useState<Table | null>(null);
  const [tableToEdit, setTableToEdit] = useState<Table | null>(null);
  const [editName, setEditName] = useState('');
  const [editSeats, setEditSeats] = useState(4);
  const [editShape, setEditShape] = useState<'SQUARE' | 'ROUND'>('SQUARE');
  
  // Estados para drag and drop fluido
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTable, setDraggedTable] = useState<Table | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Estados para pesquisa e zoom
  const [searchQuery, setSearchQuery] = useState('');
  const [zoom, setZoom] = useState(1);
  
  // Zona config com ícones e cores
  const zoneConfig: Record<TableZone, { icon: any; gradient: string; accent: string }> = {
    INTERIOR: { icon: Home, gradient: 'from-blue-950/30 to-slate-950/10', accent: 'blue' },
    EXTERIOR: { icon: Sun, gradient: 'from-green-950/30 to-slate-950/10', accent: 'green' },
    BALCAO: { icon: Coffee, gradient: 'from-amber-950/30 to-slate-950/10', accent: 'amber' }
  };
  
  // Função para adicionar nova mesa
  const handleAddTable = async () => {
    try {
      // Gerar número sequencial automático - CORRIGIDO para evitar NaN
      const maxTableNumber = tables.reduce((max, t) => {
        const num = parseInt(t.name.replace(/\D/g, ''));
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      const newTableNumber = maxTableNumber + 1;
      
      // Calcular próximo ID sequencial baseado no maior ID existente
      const maxId = tables.reduce((max, t) => (t.id > max ? t.id : max), 0);
      const newId = maxId + 1;
      
      const newTable: Table = {
        id: newId, // ID sequencial explícito
        name: `MESA ${newTableNumber}`,
        zone: activeZone,
        x: 50 + (newTableNumber - 1) * 30, // Posição automática
        y: 50 + ((newTableNumber - 1) % 3) * 30, // Posição automática
        seats: 4,
        status: 'LIVRE',
        shape: 'SQUARE',
        rotation: 0
      };
      
      // Adicionar no Supabase - USANDO TABELA CORRETA pos_tables
      let success = false;
      let tableName = 'pos_tables'; // TABELA CORRETA
      
      try {
        const result = await supabase
          .from(tableName)
          .insert([{
            id: newTable.id, // ID sequencial explícito
            name: newTable.name,
            zone: newTable.zone,
            x: newTable.x,
            y: newTable.y,
            seats: newTable.seats,
            status: newTable.status
          }])
          .select();
        
        if (result.error) {
                    addNotification('error', 'Erro ao adicionar mesa. Tente novamente.');
          return;
        }
        
        if (result.data) {
                    addTable(newTable);
          addNotification('success', `Mesa ${newTableNumber} adicionada com sucesso!`);
          success = true;
        }
      } catch (error) {
                addNotification('error', 'Erro crítico ao adicionar mesa. Contacte suporte.');
        return;
      }
      
            
    } catch (error) {
            addNotification('error', 'Erro crítico ao adicionar mesa. Contacte suporte.');
    }
  };
  
  // Função para organizar mesas automaticamente
  const handleOrganizeTables = async () => {
    try {
      // ORDENAR MESAS POR NÚMERO CRESCENTE PRIMEIRO
      const sortedTables = [...tables].sort((a, b) => {
        const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
        return numA - numB;
      });
      
            
      // Organizar mesas em grid 3x3 após ordenação
      const organizedTables = sortedTables.map((table, index) => {
        const row = Math.floor(index / 3);
        const col = index % 3;
        
        return {
          ...table,
          x: 50 + col * 120, // Espaçamento horizontal
          y: 50 + row * 100, // Espaçamento vertical
        };
      });
      
            
      // Atualizar posições no Supabase - USANDO TABELA CORRETA pos_tables
      const updatePromises = organizedTables.map(table => 
        supabase
          .from('pos_tables') // TABELA CORRETA
          .update({ x: table.x, y: table.y })
          .eq('id', table.id)
      );
      
      await Promise.all(updatePromises);
      
      // Atualizar estado local
      organizedTables.forEach(table => {
        updateTablePosition(table.id, table.x, table.y);
      });
      
            addNotification('success', 'Mesas organizadas em grid com sucesso!');
      
    } catch (error) {
            addNotification('error', 'Erro ao organizar mesas. Tente novamente.');
    }
  };
  
  const containerRef = useRef<HTMLDivElement>(null);
  const autoOrgDoneRef = useRef(false);

  // Atualiza o relógio para calcular tempo de permanência
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Auto-organizar mesas ao abrir — reorganiza qualquer zona cujas mesas estejam fora do canvas visível
  useEffect(() => {
    if (tables.length === 0) return;
    if (autoOrgDoneRef.current) return;
    autoOrgDoneRef.current = true;

    const CANVAS_W = 860;
    const CANVAS_H = 560;
    const TABLE_SIZE = 112;

    const zones: TableZone[] = ['INTERIOR', 'EXTERIOR', 'BALCAO'];
    zones.forEach(zone => {
      const zoneTables = [...tables].filter(t => t.zone === zone);
      if (zoneTables.length === 0) return;

      // Critério 1: alguma mesa fora dos limites visíveis do canvas
      const hasOutOfBounds = zoneTables.some(
        t => t.x < 0 || t.y < 0 || t.x + TABLE_SIZE > CANVAS_W || t.y + TABLE_SIZE > CANVAS_H
      );

      // Critério 2: mesas sobrepostas (distância < 30px)
      let hasOverlap = false;
      for (let i = 0; i < zoneTables.length && !hasOverlap; i++) {
        for (let j = i + 1; j < zoneTables.length && !hasOverlap; j++) {
          if (Math.abs(zoneTables[i].x - zoneTables[j].x) < 30 &&
              Math.abs(zoneTables[i].y - zoneTables[j].y) < 30) hasOverlap = true;
        }
      }

      // Critério 3: maioria das mesas concentradas abaixo de 50% do canvas
      // (indicativo de mesas salvas com posições erradas, não de layout intencional)
      const deepCount = zoneTables.filter(t => t.y > CANVAS_H * 0.5).length;
      const yValues = zoneTables.map(t => t.y);
      const yRange = Math.max(...yValues) - Math.min(...yValues);
      // Só considerar "aglomerado" se estiverem no fundo E num range vertical < 250px (compacto)
      const isClustered = deepCount >= Math.ceil(zoneTables.length * 0.6) && yRange < 250;

      if (!hasOutOfBounds && !hasOverlap && !isClustered) return;

      const sorted = [...zoneTables].sort((a, b) => {
        const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
        return numA - numB;
      });
      sorted.forEach((table, index) => {
        const newX = 60 + (index % 4) * 150;
        const newY = 60 + Math.floor(index / 4) * 140;
        updateTablePosition(table.id, newX, newY);
        supabase.from('pos_tables').update({ x: newX, y: newY }).eq('id', table.id).then(() => {});
      });
    });
  }, [tables.length]);

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
    const step = 2.0; // Aumentar velocidade de movimento
    if (direction === 'up') y = Math.max(0, y - step);
    if (direction === 'down') y = y + step;
    if (direction === 'left') x = Math.max(0, x - step);
    if (direction === 'right') x = x + step;
    
    updateTablePosition(id, x, y);
  };

  const handleMouseDown = (e: React.MouseEvent, table: Table) => {
    if (!isDesignMode) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    
    if (containerRect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setDraggedTable(table);
      setIsDragging(true);
      document.body.style.cursor = 'grabbing';
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !draggedTable || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const newX = e.clientX - containerRect.left - dragOffset.x;
    const newY = e.clientY - containerRect.top - dragOffset.y;
    
    const maxX = containerRect.width - 120;
    const maxY = containerRect.height - 80;
    
    const constrainedX = Math.max(0, Math.min(newX, maxX));
    const constrainedY = Math.max(0, Math.min(newY, maxY));
    
    updateTablePosition(draggedTable.id, constrainedX, constrainedY);
  };

  const handleMouseUp = async () => {
    if (!isDragging || !draggedTable) return;
    
    setIsDragging(false);
    setDraggedTable(null);
    setDragOffset({ x: 0, y: 0 });
    document.body.style.cursor = 'default';
    
    try {
      const table = tables.find(t => t.id === draggedTable.id);
      if (table) {
        // TENTAR SALVAR POSIÇÃO - USANDO TABELA CORRETA pos_tables
        try {
          const result = await supabase
            .from('pos_tables')
            .update({ x: table.x, y: table.y })
            .eq('id', draggedTable.id);
          
          if (result.error) {
                      } else {
                      }
        } catch (error) {
                  }
      }
    } catch (error) {
          }
  };

  useEffect(() => {
    if (isDesignMode) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDesignMode, isDragging, draggedTable, dragOffset]);

  const confirmDeleteTable = async () => {
    if (tableToDelete) {
      try {
        // Apagar do Supabase primeiro
        const result = await supabase
          .from('pos_tables')
          .delete()
          .eq('id', tableToDelete.id);
        
        if (result.error) {
                    addNotification('error', 'Erro ao apagar mesa. Tente novamente.');
          return;
        }
        
                
        // Remover do estado local
        removeTable(tableToDelete.id);
        addNotification('success', `${tableToDelete.name} apagada com sucesso!`);
        
      } catch (error) {
                addNotification('error', 'Erro crítico ao apagar mesa.');
      } finally {
        setTableToDelete(null);
      }
    }
  };

  // FILTRAGEM POR ZONA + PESQUISA - COM ORDENAÇÃO NUMÉRICA
  const filteredTables = useMemo(() => {
    let result = tables
      .filter(table => table.zone === activeZone)
      .sort((a, b) => {
        const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
        return numA - numB;
      });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(t => t.name.toLowerCase().includes(q));
    }

    return result;
  }, [tables, activeZone, searchQuery]);

  // Stats dinâmicas calculadas
  const stats = useMemo(() => {
    const zoneTables = tables.filter(t => t.zone === activeZone);
    const totalTables = zoneTables.length;
    const occupiedTables = zoneTables.filter(t => t.status === 'OCUPADO').length;
    const freeTables = zoneTables.filter(t => t.status === 'LIVRE').length;
    
    let totalClients = 0;
    let criticalCount = 0;
    
    zoneTables.forEach(t => {
      const order = activeOrders.find(o => o.tableId === t.id && o.status === 'ABERTO');
      if (order) {
        totalClients += t.seats;
        const elapsedMs = currentTime.getTime() - new Date(order.timestamp).getTime();
        const minutes = Math.floor(elapsedMs / 60000);
        if (minutes > 45) criticalCount++;
      }
    });

    const occupancyRate = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

    return { totalTables, occupiedTables, freeTables, totalClients, criticalCount, occupancyRate };
  }, [tables, activeOrders, activeZone, currentTime]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'd' || e.key === 'D') {
        setIsDesignMode(prev => !prev);
        addNotification('info', isDesignMode ? 'Modo de Operação' : 'Modo de Design Ativado');
      }
      if (e.key === 'n' || e.key === 'N') {
        handleAddTable();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isDesignMode]);

  return (
    <div className="p-6 h-full bg-background flex flex-col overflow-hidden animate-in fade-in duration-700">
      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      {/* Header Modernizado */}
      <header className="flex flex-col gap-4 mb-6 shrink-0">
        <div className="flex justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary mb-1">
              <Zap size={16} className="animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">Floor Control System</span>
            </div>
            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Gestão de Sala</h2>
          </div>

          <div className="flex gap-2 items-center flex-wrap">
            {/* Pesquisa */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar mesa..."
                className="pl-9 pr-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none transition-colors w-40"
                title="Pesquisar mesa por nome"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  aria-label="Limpar pesquisa"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Zoom controls */}
            <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.08] rounded-xl p-1">
              <button
                onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 transition-colors"
                title="Diminuir zoom"
                aria-label="Diminuir zoom"
              >
                <ZoomOut size={16} />
              </button>
              <span className="text-[10px] font-bold text-slate-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(z => Math.min(2, z + 0.1))}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 transition-colors"
                title="Aumentar zoom"
                aria-label="Aumentar zoom"
              >
                <ZoomIn size={16} />
              </button>
            </div>

            {/* Botões de ação rápida */}
            <div className="flex gap-1">
              <button
                onClick={handleAddTable}
                className="px-3 py-2.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all"
                title="Adicionar Nova Mesa (N)"
              >
                <Plus size={14} />
                Mesa
              </button>
              
              <button
                onClick={handleOrganizeTables}
                className="px-3 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all"
                title="Organizar Automaticamente"
              >
                <Grid3x3 size={14} />
                Organizar
              </button>
            </div>

            <button 
              onClick={() => {
                setIsDesignMode(!isDesignMode);
                addNotification('info', isDesignMode ? 'Modo de Operação' : 'Modo de Design Ativado');
              }}
              className={`px-4 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 transition-all ${isDesignMode ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20' : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'}`}
              title="Modo Design (D)"
            >
              {isDesignMode ? <Save size={14} /> : <Edit3 size={14} />}
              {isDesignMode ? 'Salvar' : 'Design'}
            </button>
          </div>
        </div>

        {/* Zone Tabs Modernizadas + Stats Rápidas */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/[0.08]">
            {(['INTERIOR', 'EXTERIOR', 'BALCAO'] as TableZone[]).map(zone => {
              const ZoneIcon = zoneConfig[zone].icon;
              const count = tables.filter(t => t.zone === zone).length;
              const isActive = activeZone === zone;
              return (
                <button 
                  key={zone}
                  onClick={() => setActiveZone(zone)}
                  className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                    isActive ? 'bg-primary text-black shadow-glow' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <ZoneIcon size={14} />
                  {zone}
                  <span className={`px-1.5 py-0.5 rounded-full text-[8px] ${isActive ? 'bg-black/20' : 'bg-white/10'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Stats rápidas inline */}
          <div className="flex gap-2">
            <div className="px-3 py-1.5 bg-white/[0.03] border border-white/[0.08] rounded-lg flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-[10px] font-bold text-slate-400">{stats.freeTables} Livres</span>
            </div>
            <div className="px-3 py-1.5 bg-white/[0.03] border border-white/[0.08] rounded-lg flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-[10px] font-bold text-slate-400">{stats.occupiedTables} Ocupadas</span>
            </div>
            {stats.criticalCount > 0 && (
              <div className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 animate-pulse">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[10px] font-bold text-red-400">{stats.criticalCount} Críticas</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div 
        ref={containerRef}
        className={`flex-1 glass-panel rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl border border-white/5 overflow-y-auto bg-gradient-to-br ${zoneConfig[activeZone].gradient}`}
      >
        {/* Grid Visual de Fundo */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-grid-pattern bg-grid"></div>

        {/* Label da zona */}
        <div className="absolute top-4 left-4 flex items-center gap-2 text-slate-600 pointer-events-none">
          {React.createElement(zoneConfig[activeZone].icon, { size: 14 })}
          <span className="text-[10px] font-black uppercase tracking-widest">{activeZone}</span>
        </div>

        {/* Zoom controls hint */}
        {zoom !== 1 && (
          <button
            onClick={() => setZoom(1)}
            className="absolute top-4 right-4 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold text-slate-400 hover:text-white transition-colors z-50"
            title="Reset zoom"
          >
            Reset {Math.round(zoom * 100)}%
          </button>
        )}

        {/* Desenho da Planta (Simbolizado por Áreas) */}
        {activeZone === 'INTERIOR' && (
          <div className="absolute top-10 left-10 p-4 border border-dashed border-white/10 rounded-3xl opacity-20 pointer-events-none">
            <span className="text-[10px] font-black uppercase text-slate-500">Zona de Cozinha</span>
          </div>
        )}

        {/* Empty State */}
        {filteredTables.length === 0 && !isDesignMode && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-4">
              <Armchair size={36} className="text-slate-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-400 mb-1">
              {searchQuery ? 'Nenhuma mesa encontrada' : `Sem mesas em ${activeZone}`}
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              {searchQuery ? 'Tenta ajustar a pesquisa.' : 'Adicione mesas para começar a gerir a sala.'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleAddTable}
                className="px-4 py-2.5 bg-primary text-black rounded-xl font-black uppercase text-xs tracking-widest flex items-center gap-2 hover:brightness-110 transition-all"
              >
                <Plus size={16} />
                Adicionar Mesa
              </button>
            )}
          </div>
        )}

        {/* Mapa de Mesas com Zoom */}
        <div
          ref={(el) => {
            if (el) {
              el.style.transform = `scale(${zoom})`;
              el.style.transformOrigin = 'top left';
            }
          }}
          style={{ position: 'relative', minWidth: '900px', minHeight: '600px' }}
        >
          {filteredTables.map((table, index) => {
            const stats = getTableStats(table.id);
            const isCritical = stats !== null && stats.minutes > 45;
            const isOccupied = table.status === 'OCUPADO';
            const isRound = table.shape === 'ROUND';

            const setTableStyle = (el: HTMLDivElement | null) => {
              if (!el) return;
              el.style.position = 'absolute';
              el.style.left = `${table.x}px`;
              el.style.top = `${table.y}px`;
              el.style.transition = isDragging && draggedTable?.id === table.id ? 'none' : 'all 0.075s ease';
              el.style.transform = isDragging && draggedTable?.id === table.id ? 'scale(1.05)' : 'scale(1)';
              el.style.zIndex = isDragging && draggedTable?.id === table.id ? '1000' : '1';
              el.style.cursor = isDesignMode ? 'grab' : 'pointer';
              el.style.animation = `fadeInUp 0.3s ease ${index * 0.03}s both`;
            };

            return (
              <div
                key={table.id}
                ref={setTableStyle}
                onMouseDown={(e) => handleMouseDown(e, table)}
                className={`
                  w-28 h-28 ${isRound ? 'rounded-full' : 'rounded-2xl'} border-2 flex flex-col items-center justify-center group relative
                  transition-all duration-300
                  ${isDesignMode ? 'border-orange-500/50 bg-orange-500/5 hover:scale-105 hover:shadow-lg' : 
                    !isOccupied ? 'border-slate-600/50 bg-gradient-to-br from-slate-700/40 to-slate-800/20 hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-400/10' : 
                      isCritical ? 'border-red-500/80 bg-gradient-to-br from-red-500/20 to-red-600/10 shadow-lg shadow-red-500/30 animate-pulse' :
                      'border-emerald-500/80 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 shadow-lg shadow-emerald-500/20'
                  }
                `}
              >
                {/* Tooltip no hover */}
                {!isDesignMode && (
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
                    <div className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 shadow-xl">
                      <p className="text-xs font-bold text-white">{table.name}</p>
                      <p className="text-[10px] text-slate-400">{table.seats} lugares • {isOccupied ? 'Ocupada' : 'Livre'}</p>
                      {stats && (
                        <p className="text-[10px] text-cyan-400">{stats.minutes}min • {stats.total.toFixed(0)} Kz</p>
                      )}
                    </div>
                    <div className="w-2 h-2 bg-slate-900 border-r border-b border-white/10 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
                  </div>
                )}

                {/* Botão de Editar (Apenas em Modo Design) */}
                {isDesignMode && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setTableToEdit(table);
                      setEditName(table.name);
                      setEditSeats(table.seats);
                      setEditShape(table.shape);
                    }}
                    className="absolute -top-2 -left-2 w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors z-10"
                    title="Editar mesa"
                  >
                    <Edit3 size={14} />
                  </button>
                )}

                {/* Botão de Apagar (Apenas em Modo Design) */}
                {isDesignMode && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setTableToDelete(table);
                    }}
                    className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors z-10"
                    aria-label="Apagar mesa"
                  >
                    <Trash2 size={14} />
                  </button>
                )}

                <button 
                  onClick={() => !isDesignMode && setActiveTable(table.id)}
                  className="w-full h-full flex flex-col items-center justify-center p-2 outline-none"
                >
                  <div className="absolute top-2 left-0 right-0 text-center text-[8px] font-black text-slate-500 uppercase tracking-widest">{table.name}</div>
                  
                  {isOccupied && !isDesignMode && stats ? (
                    <div className="flex flex-col items-center gap-1">
                       {/* Indicador circular de tempo */}
                       <div className={`relative w-10 h-10 rounded-full flex items-center justify-center ${isCritical ? 'bg-red-500/20' : 'bg-primary/20'}`}>
                         <Clock size={14} className={isCritical ? 'text-red-400' : 'text-primary'} />
                         <span className={`absolute -bottom-1 -right-1 text-[8px] font-black font-mono px-1 rounded ${isCritical ? 'bg-red-500 text-white' : 'bg-primary text-black'}`}>
                           {stats.minutes}m
                         </span>
                       </div>
                       <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Ativo</p>
                    </div>
                  ) : !isDesignMode ? (
                    <div className="flex flex-col items-center gap-1 opacity-30 group-hover:opacity-100 transition-opacity">
                       <Users size={18} className="text-slate-500 group-hover:text-primary" />
                       <span className="text-[7px] font-black uppercase text-slate-500">{table.seats} Lugares</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Move size={16} className="text-orange-500" />
                      <span className="text-[7px] font-black uppercase text-orange-500">Mover</span>
                    </div>
                  )}

                  {/* Botão Fechar Mesa (apenas se ocupada e não em modo design) */}
                  {isOccupied && !isDesignMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTable(table.id);
                      }}
                      className="absolute bottom-2 px-3 py-1 bg-primary/20 text-primary rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-primary/30 transition-colors flex items-center gap-1"
                    >
                      <X size={10} /> Fechar
                    </button>
                  )}

                  {/* Status Indicator Dot */}
                  <div className={`absolute bottom-3 w-1.5 h-1.5 rounded-full ${!isOccupied ? 'bg-slate-700' : isCritical ? 'bg-red-500 animate-pulse' : 'bg-primary'}`}></div>
                </button>

                {/* Controlos de Movimento em Modo Design */}
                {isDesignMode && (
                  <div className="absolute -bottom-12 flex gap-2">
                     <button onClick={() => handleTableMove(table.id, 'left')} className="p-2 bg-slate-800 rounded-lg text-white hover:bg-orange-500 transition-colors" aria-label="Mover mesa para esquerda"><ChevronLeft size={12}/></button>
                     <div className="flex flex-col gap-1">
                        <button onClick={() => handleTableMove(table.id, 'up')} className="p-2 bg-slate-800 rounded-lg text-white hover:bg-orange-500 transition-colors" aria-label="Mover mesa para cima"><ChevronUp size={12}/></button>
                        <button onClick={() => handleTableMove(table.id, 'down')} className="p-2 bg-slate-800 rounded-lg text-white hover:bg-orange-500 transition-colors" aria-label="Mover mesa para baixo"><ChevronDown size={12}/></button>
                     </div>
                     <button onClick={() => handleTableMove(table.id, 'right')} className="p-2 bg-slate-800 rounded-lg text-white hover:bg-orange-500 transition-colors" aria-label="Mover mesa para direita"><ChevronRight size={12}/></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Botão flutuante Nova Mesa (quando não há mesas em design mode) */}
        {isDesignMode && filteredTables.length === 0 && (
          <button 
            onClick={handleAddTable}
            className="w-28 h-28 rounded-2xl border-2 border-dashed border-white/10 hover:border-white/30 hover:bg-white/5 transition-all flex flex-col items-center justify-center text-slate-600 hover:text-white group absolute right-10 bottom-10"
          >
             <Plus size={24} className="mb-1 group-hover:scale-110 transition-transform" />
             <span className="text-[8px] font-black uppercase tracking-widest">Nova Mesa</span>
          </button>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {tableToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full glass-panel p-8 rounded-[2.5rem] border border-red-500/20 animate-in zoom-in duration-300">
            <div className="flex items-center gap-4 text-red-500 mb-6">
              <div className="p-3 bg-red-500/10 rounded-2xl">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-xl font-black italic uppercase">Confirmar Exclusão</h3>
            </div>
            
            <p className="text-slate-300 text-sm mb-8 leading-relaxed">
              Deseja realmente apagar a <span className="text-white font-bold">{tableToDelete.name}</span>? Esta ação não pode ser desfeita e removerá a mesa permanentemente do mapa de sala.
            </p>

            <div className="flex gap-4">
              <button 
                onClick={() => setTableToDelete(null)}
                className="flex-1 py-4 bg-white/5 border border-white/10 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDeleteTable}
                className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={16} /> Apagar Mesa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Mesa */}
      {tableToEdit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-800 rounded-2xl border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Edit3 size={20} className="text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Editar Mesa</h3>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Nome da Mesa
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-blue-500/50 transition-all"
                  placeholder="Digite o nome..."
                  title="Nome da mesa"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Número de Lugares
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditSeats(s => Math.max(1, s - 1))}
                    className="w-10 h-10 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center transition-colors"
                    title="Diminuir lugares"
                    aria-label="Diminuir lugares"
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    value={editSeats}
                    onChange={(e) => setEditSeats(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white text-center font-bold focus:outline-none focus:border-blue-500/50 transition-all"
                    min="1"
                    title="Número de lugares"
                    aria-label="Número de lugares"
                  />
                  <button
                    onClick={() => setEditSeats(s => s + 1)}
                    className="w-10 h-10 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 flex items-center justify-center transition-colors"
                    title="Aumentar lugares"
                    aria-label="Aumentar lugares"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Forma da Mesa
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditShape('SQUARE')}
                    className={`flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${editShape === 'SQUARE' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-white/10 text-slate-500 hover:text-white'}`}
                    title="Forma quadrada"
                  >
                    <Square size={18} />
                    <span className="text-xs font-bold">Quadrada</span>
                  </button>
                  <button
                    onClick={() => setEditShape('ROUND')}
                    className={`flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${editShape === 'ROUND' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-white/10 text-slate-500 hover:text-white'}`}
                    title="Forma redonda"
                  >
                    <Circle size={18} />
                    <span className="text-xs font-bold">Redonda</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setTableToEdit(null)}
                className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-bold text-sm hover:bg-slate-600 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={async () => {
                  if (editName.trim() && tableToEdit) {
                    try {
                      const result = await supabase
                        .from('pos_tables')
                        .update({ name: editName.trim(), seats: editSeats, shape: editShape })
                        .eq('id', tableToEdit.id);
                      
                      if (result.error) {
                        addNotification('error', 'Erro ao atualizar mesa.');
                      } else {
                        updateTable({ ...tableToEdit, name: editName.trim(), seats: editSeats, shape: editShape });
                        addNotification('success', `Mesa "${editName.trim()}" atualizada!`);
                        setTableToEdit(null);
                      }
                    } catch (error) {
                      addNotification('error', 'Erro ao salvar alteração.');
                    }
                  }
                }}
                className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold text-sm hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
              >
                <Save size={16} /> Salvar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Footer com Stats Reais */}
      <footer className="mt-4 flex gap-3 shrink-0 flex-wrap">
          <div className="flex-1 min-w-[200px] bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Users size={18} />
                </div>
                <div>
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Clientes Presentes</p>
                   <p className="text-lg font-black text-white">{stats.totalClients}</p>
                </div>
             </div>
             <div className="h-8 w-px bg-white/10"></div>
             <div className="text-right">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Ocupação</p>
                <div className="flex items-center gap-2">
                  <ProgressBar percentage={stats.occupancyRate} className="w-20 h-1.5" barClassName="bg-gradient-to-r from-primary to-cyan-400" />
                  <p className="text-lg font-black text-primary">{stats.occupancyRate}%</p>
                </div>
             </div>
          </div>
          
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
               <Armchair size={18} />
             </div>
             <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Mesas Livres</p>
                <p className="text-lg font-black text-green-400">{stats.freeTables}</p>
             </div>
          </div>

          {stats.criticalCount > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
               <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400">
                 <AlertTriangle size={18} />
               </div>
               <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Atenção</p>
                  <p className="text-lg font-black text-red-400">{stats.criticalCount} Críticas</p>
               </div>
            </div>
          )}
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




