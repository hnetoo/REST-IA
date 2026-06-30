import { jsPDF } from 'jspdf';
import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { EventService, EventPackageService, ShowService } from '../services/eventService';
import ProgressBar from '../components/ProgressBar';
import { 
  Calendar, Clock, Users, MapPin, Plus, Search, Filter,
  ChevronRight, MoreVertical, Sparkles, Package, 
  PartyPopper, Music, Briefcase, Heart, Baby,
  Edit2, Trash2, CheckCircle2, AlertCircle,
  TrendingUp, DollarSign, Utensils, Wine, X, Bell, AlertTriangle, Check, FileText,
  Camera, Palette, BarChart3, PieChart as PieChartIcon
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

// Icone por tipo de evento
const getEventIcon = (type: string) => {
  switch (type) {
    case 'ANIVERSARIO': return <PartyPopper size={20} />;
    case 'CASAMENTO': return <Heart size={20} />;
    case 'CORPORATIVO': return <Briefcase size={20} />;
    case 'SHOW_INTIMISTA': return <Music size={20} />;
    case 'BATIZADO': return <Baby size={20} />;
    default: return <Calendar size={20} />;
  }
};

// Cor por status
const getStatusColor = (status: string) => {
  switch (status) {
    case 'PLANEADO': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    case 'CONFIRMADO': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'EM_ANDAMENTO': return 'bg-primary/20 text-primary border-primary/30';
    case 'CONCLUIDO': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'CANCELADO': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-slate-500/20 text-slate-400';
  }
};

// Verifica se evento está a menos de 48h
const isWithin48Hours = (eventDate: string) => {
  const now = new Date();
  const event = new Date(eventDate);
  const diffHours = (event.getTime() - now.getTime()) / (1000 * 60 * 60);
  return diffHours > 0 && diffHours <= 48;
};

const Events = () => {
  const [activeTab, setActiveTab] = useState<'events' | 'packages'>('events');
  const [events, setEvents] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showCharts, setShowCharts] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [showCreatePackageModal, setShowCreatePackageModal] = useState(false);
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [showEditPackageModal, setShowEditPackageModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [showUsePackageModal, setShowUsePackageModal] = useState(false);
  const { addNotification } = useStore();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventsData, packagesData] = await Promise.all([
        EventService.listEvents(),
        EventPackageService.listPackages()
      ]);
      setEvents(eventsData);
      setPackages(packagesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(filter.toLowerCase()) ||
                         e.customer_name.toLowerCase().includes(filter.toLowerCase());
    const matchesStatus = !statusFilter || e.status === statusFilter;
    const matchesType = !typeFilter || e.type === typeFilter;
    const eventDate = new Date(e.start_date);
    const matchesDateFrom = !dateFrom || eventDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || eventDate <= new Date(dateTo + 'T23:59:59');
    return matchesSearch && matchesStatus && matchesType && matchesDateFrom && matchesDateTo;
  });

  // Estatísticas do Dashboard
  const today = new Date().toDateString();
  const stats = {
    todayEvents: events.filter(e => new Date(e.start_date).toDateString() === today && e.status !== 'CANCELADO').length,
    next7Days: events.filter(e => {
      const eventDate = new Date(e.start_date);
      const diffDays = Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 7 && e.status !== 'CANCELADO' && e.status !== 'CONCLUIDO';
    }).length,
    pendingConfirmation: events.filter(e => e.status === 'PLANEADO').length,
    urgentEvents: events.filter(e => isWithin48Hours(e.start_date) && e.status !== 'CANCELADO' && e.status !== 'CONCLUIDO').length,
    confirmedEvents: events.filter(e => e.status === 'CONFIRMADO').length,
    concludedEvents: events.filter(e => e.status === 'CONCLUIDO').length,
    totalRevenue: events
      .filter(e => e.status === 'CONFIRMADO' || e.status === 'CONCLUIDO')
      .reduce((sum, e) => sum + (e.final_amount || e.base_amount || 0), 0),
    monthRevenue: events
      .filter(e => {
        const d = new Date(e.start_date);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && (e.status === 'CONFIRMADO' || e.status === 'CONCLUIDO');
      })
      .reduce((sum, e) => sum + (e.final_amount || e.base_amount || 0), 0)
  };

  // Dados para gráficos
  const monthlyChartData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleDateString('pt-AO', { month: 'short' });
      const count = events.filter(e => {
        const ed = new Date(e.start_date);
        return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear() && e.status !== 'CANCELADO';
      }).length;
      const revenue = events
        .filter(e => {
          const ed = new Date(e.start_date);
          return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear() && (e.status === 'CONFIRMADO' || e.status === 'CONCLUIDO');
        })
        .reduce((sum, e) => sum + (e.final_amount || e.base_amount || 0), 0);
      months.push({ name: monthName, eventos: count, receita: revenue });
    }
    return months;
  }, [events]);

  const eventTypeData = useMemo(() => {
    const types = ['ANIVERSARIO', 'CASAMENTO', 'CORPORATIVO', 'SHOW_INTIMISTA', 'ALUGUER_TOTAL', 'OUTRO'];
    const colors = ['#06b6d4', '#ec4899', '#8b5cf6', '#f59e0b', '#10b981', '#64748b'];
    return types.map((type, i) => ({
      name: type.replace('_', ' '),
      value: events.filter(e => e.type === type && e.status !== 'CANCELADO').length,
      fill: colors[i]
    })).filter(t => t.value > 0);
  }, [events]);

  return (
    <div className="p-8 h-full bg-background flex flex-col overflow-hidden animate-in slide-in-from-right duration-700">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <Sparkles size={18} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Gestão de Eventos</span>
          </div>
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Eventos & Pacotes</h2>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 bg-white/5 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('events')}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'events' 
                ? 'bg-primary text-black shadow-glow' 
                : 'text-slate-500 hover:text-white'
            }`}
          >
            Eventos
          </button>
          <button
            onClick={() => setActiveTab('packages')}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'packages' 
                ? 'bg-primary text-black shadow-glow' 
                : 'text-slate-500 hover:text-white'
            }`}
          >
            Pacotes
          </button>
        </div>
      </header>

      {/* Dashboard Stats Cards */}
      {activeTab === 'events' && !loading && (
        <div className="mb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            <div className="glass-panel p-4 rounded-2xl border-white/5 hover:border-primary/20 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Calendar size={18} />
                </div>
                <span className="text-[9px] uppercase tracking-widest text-slate-500">Hoje</span>
              </div>
              <p className="text-2xl font-black text-white">{stats.todayEvents}</p>
              <p className="text-[9px] text-slate-400 mt-1">agendados</p>
            </div>

            <div className="glass-panel p-4 rounded-2xl border-white/5 hover:border-primary/20 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Clock size={18} />
                </div>
                <span className="text-[9px] uppercase tracking-widest text-slate-500">7 Dias</span>
              </div>
              <p className="text-2xl font-black text-white">{stats.next7Days}</p>
              <p className="text-[9px] text-slate-400 mt-1">a decorrer</p>
            </div>

            <div className="glass-panel p-4 rounded-2xl border-white/5 hover:border-primary/20 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <AlertCircle size={18} />
                </div>
                <span className="text-[9px] uppercase tracking-widest text-slate-500">Pendentes</span>
              </div>
              <p className="text-2xl font-black text-white">{stats.pendingConfirmation}</p>
              <p className="text-[9px] text-slate-400 mt-1">aguardando</p>
            </div>

            <div className="glass-panel p-4 rounded-2xl border-white/5 hover:border-primary/20 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 size={18} />
                </div>
                <span className="text-[9px] uppercase tracking-widest text-slate-500">Confirmados</span>
              </div>
              <p className="text-2xl font-black text-white">{stats.confirmedEvents}</p>
              <p className="text-[9px] text-slate-400 mt-1">confirmados</p>
            </div>

            <div className="glass-panel p-4 rounded-2xl border-primary/20 bg-primary/5 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                  <DollarSign size={18} />
                </div>
                <span className="text-[9px] uppercase tracking-widest text-slate-500">Receita</span>
              </div>
              <p className="text-xl font-black text-primary">{stats.totalRevenue.toLocaleString()}</p>
              <p className="text-[9px] text-slate-400 mt-1">Kz total</p>
            </div>

            <div className={`glass-panel p-4 rounded-2xl border-white/5 transition-all ${stats.urgentEvents >= 1 ? 'border-red-500/30 bg-red-500/5' : 'hover:border-primary/20'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${stats.urgentEvents >= 1 ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-slate-500/10 border-slate-500/20 text-slate-400'}`}>
                  <Bell size={18} />
                </div>
                <span className="text-[9px] uppercase tracking-widest text-slate-500">Alertas</span>
              </div>
              <p className={`text-2xl font-black ${stats.urgentEvents >= 1 ? 'text-red-400' : 'text-white'}`}>{stats.urgentEvents}</p>
              <p className="text-[9px] text-slate-400 mt-1">48h</p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowCharts(!showCharts)}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <BarChart3 size={16} className={showCharts ? 'text-primary' : ''} />
              {showCharts ? 'Ocultar Graficos' : 'Mostrar Graficos'}
            </button>
            <span className="text-xs text-slate-400">
              Receita do mes: <span className="text-primary font-bold">{stats.monthRevenue.toLocaleString()} Kz</span>
            </span>
          </div>

          {showCharts && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <div className="glass-panel p-6 rounded-2xl border-white/5">
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                  <BarChart3 size={16} className="text-primary" /> Eventos por Mes
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} stroke="rgba(255,255,255,0.1)" />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} stroke="rgba(255,255,255,0.1)" />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                      formatter={(value: number) => [`${value} eventos`, 'Eventos']}
                    />
                    <Bar dataKey="eventos" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Eventos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="glass-panel p-6 rounded-2xl border-white/5">
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                  <PieChartIcon size={16} className="text-primary" /> Tipos de Evento
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={eventTypeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} stroke="rgba(255,255,255,0.1)" />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9 }} stroke="rgba(255,255,255,0.1)" width={100} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                      formatter={(value: number) => [`${value} eventos`, 'Quantidade']}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Quantidade">
                      {eventTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Conteúdo */}
      {activeTab === 'events' ? (
        <>
          {/* Filtros e Ações com Toggle de Visualização */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Pesquisar evento..."
                className="w-full pl-12 pr-6 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:border-primary outline-none transition-all"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:border-primary outline-none"
              aria-label="Filtrar por status"
              title="Filtrar por status"
            >
              <option value="">Todos os status</option>
              <option value="PLANEADO">Planeado</option>
              <option value="CONFIRMADO">Confirmado</option>
              <option value="EM_ANDAMENTO">Em Andamento</option>
              <option value="CONCLUIDO">Concluído</option>
              <option value="CANCELADO">Cancelado</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:border-primary outline-none"
              aria-label="Filtrar por tipo"
              title="Filtrar por tipo"
            >
              <option value="">Todos os tipos</option>
              <option value="ANIVERSARIO">Aniversário</option>
              <option value="CASAMENTO">Casamento</option>
              <option value="CORPORATIVO">Corporativo</option>
              <option value="SHOW_INTIMISTA">Show Intimista</option>
              <option value="ALUGUER_TOTAL">Aluguer Total</option>
              <option value="BATIZADO">Batizado</option>
              <option value="OUTRO">Outro</option>
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:border-primary outline-none"
              aria-label="Data inicial"
              title="Data inicial"
            />
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:border-primary outline-none"
              aria-label="Data final"
              title="Data final"
            />

            {/* Toggle View Mode */}
            <div className="flex gap-1 bg-white/5 p-1 rounded-2xl">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  viewMode === 'list' 
                    ? 'bg-primary/20 text-primary' 
                    : 'text-slate-500 hover:text-white'
                }`}
                aria-label="Ver lista de eventos"
                title="Ver lista"
              >
                <Users size={16} />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  viewMode === 'calendar' 
                    ? 'bg-primary/20 text-primary' 
                    : 'text-slate-500 hover:text-white'
                }`}
                aria-label="Ver calendário de eventos"
                title="Ver calendário"
              >
                <Calendar size={16} />
              </button>
            </div>

            <button 
              onClick={() => setShowCreateEventModal(true)}
              className="bg-primary text-black px-6 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-glow flex items-center gap-2 hover:scale-105 transition-all"
            >
              <Plus size={18} /> Novo Evento
            </button>
          </div>

          {/* Lista de Eventos ou Calendário */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-20">
                <Calendar size={100} className="mb-6" />
                <h3 className="text-2xl font-black uppercase italic tracking-widest">Sem Eventos</h3>
                <p className="text-sm mt-2">Crie um novo evento para começar</p>
              </div>
            ) : viewMode === 'list' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                {filteredEvents.map(event => (
                  <EventCard 
                    key={event.id} 
                    event={event} 
                    onRefresh={loadData}
                    onViewDetails={(e) => {
                      setSelectedEvent(e);
                      setShowEventDetailsModal(true);
                    }}
                    onEdit={(e) => {
                      setSelectedEvent(e);
                      setShowEditEventModal(true);
                    }}
                  />
                ))}
              </div>
            ) : (
              <SimpleCalendar 
                events={filteredEvents}
                onSelectEvent={(event) => {
                  setSelectedEvent(event);
                  setShowEventDetailsModal(true);
                }}
                onSelectDate={(date) => {
                  setShowCreateEventModal(true);
                }}
              />
            )}
          </div>
          {/* Create Event Modal */}
          {showCreateEventModal && (
            <CreateEventModal 
              onClose={() => setShowCreateEventModal(false)} 
              onSuccess={loadData}
              packages={packages}
            />
          )}
          
          {/* Create Package Modal */}
          {showCreatePackageModal && (
            <CreatePackageModal 
              onClose={() => setShowCreatePackageModal(false)} 
              onSuccess={loadData}
            />
          )}

          {/* Edit Package Modal */}
          {showEditPackageModal && selectedPackage && (
            <EditPackageModal 
              pkg={selectedPackage}
              onClose={() => setShowEditPackageModal(false)} 
              onSuccess={loadData}
            />
          )}

          {/* Use Package Modal */}
          {showUsePackageModal && selectedPackage && (
            <UsePackageModal 
              pkg={selectedPackage}
              onClose={() => setShowUsePackageModal(false)} 
              onSuccess={loadData}
            />
          )}

          {/* Edit Event Modal */}
          {showEditEventModal && selectedEvent && (
            <EditEventModal 
              event={selectedEvent}
              onClose={() => setShowEditEventModal(false)} 
              onSuccess={loadData}
              packages={packages}
            />
          )}
          {showEventDetailsModal && selectedEvent && (
            <EventDetailsModal 
              event={selectedEvent}
              onClose={() => setShowEventDetailsModal(false)} 
              onSuccess={loadData}
              allEvents={events}
            />
          )}
        </>
      ) : (
        <>
          {/* Pacotes */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Pesquisar pacote..."
                className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:border-primary outline-none transition-all"
              />
            </div>
            <button 
              onClick={() => setShowCreatePackageModal(true)}
              className="bg-primary text-black px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-glow flex items-center gap-3 hover:scale-105 transition-all"
            >
              <Plus size={20} /> Novo Pacote
            </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                {packages.map(pkg => (
                  <PackageCard 
                    key={pkg.id} 
                    pkg={pkg} 
                    onRefresh={loadData}
                    onEdit={(p) => {
                      setSelectedPackage(p);
                      setShowEditPackageModal(true);
                    }}
                    onUse={(p) => {
                      setSelectedPackage(p);
                      setShowUsePackageModal(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Create Package Modal */}
          {showCreatePackageModal && (
            <CreatePackageModal 
              onClose={() => setShowCreatePackageModal(false)} 
              onSuccess={loadData}
            />
          )}

          {/* Edit Package Modal */}
          {showEditPackageModal && selectedPackage && (
            <EditPackageModal 
              pkg={selectedPackage}
              onClose={() => setShowEditPackageModal(false)} 
              onSuccess={loadData}
            />
          )}

          {/* Use Package Modal */}
          {showUsePackageModal && selectedPackage && (
            <UsePackageModal 
              pkg={selectedPackage}
              onClose={() => setShowUsePackageModal(false)} 
              onSuccess={loadData}
            />
          )}
        </>
      )}
    </div>
  );
};

// Card de Evento
const EventCard = ({ event, onRefresh, onViewDetails, onEdit }: { event: any; onRefresh: () => void; onViewDetails?: (e: any) => void; onEdit?: (e: any) => void }) => {
  const eventDate = new Date(event.start_date);
  const isToday = new Date().toDateString() === eventDate.toDateString();
  const isUrgent = isWithin48Hours(event.start_date) && event.status !== 'CANCELADO' && event.status !== 'CONCLUIDO';
  const isLive = event.status === 'EM_ANDAMENTO' || (isToday && event.status === 'CONFIRMADO');
  const consumptionPercent = event.base_amount && event.base_amount > 0
    ? Math.min(100, Math.round(((event.extras_amount || 0) / event.base_amount) * 100))
    : 0;
  
  return (
    <div className={`glass-panel p-6 rounded-[2rem] border-white/5 hover:border-primary/30 transition-all group relative overflow-hidden ${isUrgent ? 'border-red-500/30 bg-red-500/5' : ''} ${isLive ? 'border-primary/40 bg-primary/5' : ''}`}>
      {/* Alert Badge */}
      {isUrgent && !isLive && (
        <div className="absolute top-4 right-4 z-10">
          <span className="px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
            <Bell size={10} className="inline mr-1" /> &lt; 48h
          </span>
        </div>
      )}
      
      {/* 🎉 Badge AO VIVO */}
      {isLive && (
        <div className="absolute top-4 right-4 z-10">
          <span className="px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-red-500 text-white border border-red-500 animate-pulse flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
            AO VIVO
          </span>
        </div>
      )}
      
      {/* Gradient accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            {getEventIcon(event.type)}
          </div>
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-tight">{event.name}</h3>
            <p className="text-xs text-slate-400">{event.customer_name}</p>
          </div>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${getStatusColor(event.status)}`}>
          {event.status}
        </span>
      </div>

      {/* Data Badge */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl">
          <Calendar size={14} className="text-primary" />
          <span className="text-xs font-bold">
            {eventDate.getDate()} {new Intl.DateTimeFormat('pt-AO', { month: 'short' }).format(eventDate)}
          </span>
          {isToday && <span className="text-[8px] bg-primary/20 text-primary px-2 py-0.5 rounded-full">HOJE</span>}
        </div>
        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl">
          <Clock size={14} className="text-primary" />
          <span className="text-xs font-bold">{event.start_time || '--:--'}</span>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-3 text-slate-400">
          <Users size={14} className="text-primary" />
          <span className="text-xs">{event.guests_count} convidados</span>
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <MapPin size={14} className="text-primary" />
          <span className="text-xs">{event.area || 'Área não definida'}</span>
        </div>
        {event.tables_reserved?.length > 0 && (
          <div className="flex items-center gap-3 text-slate-400">
            <Utensils size={14} className="text-primary" />
            <span className="text-xs">{event.tables_reserved.length} mesas reservadas</span>
          </div>
        )}
      </div>

      {/* Financeiro */}
      <div className="bg-white/5 rounded-2xl p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] uppercase tracking-widest text-slate-500">Total</span>
          <span className="text-lg font-black text-primary">{((event.final_amount || 0) + (event.extras_amount || 0)).toLocaleString()} Kz</span>
        </div>
        <div className="flex gap-4 text-[10px] mb-2">
          <span className="text-slate-400">Pacote: {(event.base_amount || 0).toLocaleString()} Kz</span>
          {event.extras_amount > 0 && (
            <span className="text-emerald-400">+Extras: {event.extras_amount.toLocaleString()} Kz</span>
          )}
        </div>
        {/* 🎉 Barra de progresso de consumo */}
        {(event.base_amount || 0) > 0 && (event.extras_amount || 0) > 0 && (
          <div className="mt-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[8px] uppercase tracking-widest text-slate-500">Consumo Extras</span>
              <span className={`text-[8px] font-black ${consumptionPercent > 80 ? 'text-red-400' : consumptionPercent > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>{consumptionPercent}%</span>
            </div>
            <ProgressBar percentage={consumptionPercent} className="h-1.5" barClassName={consumptionPercent > 80 ? 'bg-red-500' : consumptionPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'} />
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="flex gap-2">
        {event.status === 'CANCELADO' ? (
          <button 
            onClick={async () => {
              if (confirm('Tem certeza que deseja APAGAR permanentemente este evento cancelado?')) {
                try {
                  await EventService.deleteEvent(event.id);
                  onRefresh();
                } catch (error) {
                  console.error('Erro ao apagar evento:', error);
                  alert('Erro ao apagar evento');
                }
              }
            }}
            className="flex-1 py-3 bg-red-500/20 border border-red-500/30 rounded-2xl text-[9px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2">
            <Trash2 size={14} /> Apagar
          </button>
        ) : (
          <button 
            onClick={() => onEdit?.(event)}
            className="flex-1 py-3 bg-white/5 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2">
            <Edit2 size={14} /> Editar
          </button>
        )}
        <button 
          onClick={() => onViewDetails?.(event)}
          className="flex-1 py-3 bg-primary/10 border border-primary/20 rounded-2xl text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-black transition-all flex items-center justify-center gap-2">
          <CheckCircle2 size={14} /> Detalhes
        </button>
      </div>
    </div>
  );
};

// Card de Pacote
const PackageCard = ({ pkg, onRefresh, onEdit, onUse }: { pkg: any; onRefresh: () => void; onEdit?: (p: any) => void; onUse?: (p: any) => void }) => {
  return (
    <div className="glass-panel p-6 rounded-[2rem] border-white/5 hover:border-primary/30 transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          <Package size={20} />
        </div>
        {!pkg.is_active && (
          <span className="px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-slate-500/20 text-slate-400 border border-slate-500/30">
            Inativo
          </span>
        )}
      </div>

      <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">{pkg.name}</h3>
      <p className="text-xs text-slate-400 mb-4 line-clamp-2">{pkg.description}</p>

      {/* Configuração */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-3 text-slate-400">
          <Users size={14} className="text-primary" />
          <span className="text-xs">{pkg.min_guests}-{pkg.max_guests} pessoas</span>
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <Clock size={14} className="text-primary" />
          <span className="text-xs">{pkg.duration_hours}h duração</span>
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <Wine size={14} className="text-primary" />
          <span className="text-xs">{pkg.included_items?.length || 0} itens incluídos</span>
        </div>
      </div>

      {/* Preço */}
      <div className="bg-white/5 rounded-2xl p-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Base</span>
            <p className="text-lg font-black text-white">{pkg.base_price.toLocaleString()} Kz</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Por pessoa</span>
            <p className="text-lg font-black text-primary">+{pkg.price_per_person.toLocaleString()} Kz</p>
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-2">
        <button 
          onClick={() => onEdit?.(pkg)}
          className="flex-1 py-3 bg-white/5 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2">
          <Edit2 size={14} /> Editar
        </button>
        <button 
          onClick={async () => {
            if (confirm('Tem certeza que deseja APAGAR permanentemente este pacote?')) {
              try {
                await EventPackageService.deactivatePackage(pkg.id);
                onRefresh();
              } catch (error) {
                console.error('Erro ao apagar pacote:', error);
                alert('Erro ao apagar pacote');
              }
            }
          }}
          className="flex-1 py-3 bg-red-500/20 border border-red-500/30 rounded-2xl text-[9px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2">
          <Trash2 size={14} /> Apagar
        </button>
        <button 
          onClick={() => onUse?.(pkg)}
          className="flex-1 py-3 bg-primary/10 border border-primary/20 rounded-2xl text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-black transition-all flex items-center justify-center gap-2">
          <Plus size={14} /> Usar
        </button>
      </div>
    </div>
  );
};

// Calendário Mensal Simples
const SimpleCalendar = ({ events, onSelectEvent, onSelectDate }: { 
  events: any[]; 
  onSelectEvent?: (e: any) => void;
  onSelectDate?: (date: string) => void;
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startDayOfWeek = firstDayOfMonth.getDay();
  
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  // Get events for a specific day
  const getEventsForDay = (day: number) => {
    const dateStr = new Date(year, month, day).toDateString();
    return events.filter(e => new Date(e.start_date).toDateString() === dateStr && e.status !== 'CANCELADO');
  };
  
  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(year, month + direction, 1));
  };
  
  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };
  
  return (
    <div className="glass-panel rounded-[2rem] border-white/10 p-6">
      {/* Header do Calendário */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={() => navigateMonth(-1)}
          className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white"
          aria-label="Mês anterior"
        >
          <ChevronRight size={20} className="rotate-180" />
        </button>
        <h3 className="text-xl font-black text-white uppercase tracking-tight">
          {monthNames[month]} {year}
        </h3>
        <button 
          onClick={() => navigateMonth(1)}
          className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white"
          aria-label="Próximo mês"
        >
          <ChevronRight size={20} />
        </button>
      </div>
      
      {/* Dias da Semana */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {weekDays.map(day => (
          <div key={day} className="text-center text-[10px] uppercase tracking-widest text-slate-500 font-bold py-2">
            {day}
          </div>
        ))}
      </div>
      
      {/* Dias do Mês */}
      <div className="grid grid-cols-7 gap-2">
        {/* Empty cells for days before the first day */}
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        
        {/* Days */}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const dayEvents = getEventsForDay(day);
          const hasEvents = dayEvents.length > 0;
          const isTodayDate = isToday(day);
          
          return (
            <button
              key={day}
              onClick={() => {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                if (hasEvents && dayEvents.length === 1) {
                  onSelectEvent?.(dayEvents[0]);
                } else if (hasEvents) {
                  onSelectEvent?.(dayEvents[0]);
                } else {
                  onSelectDate?.(dateStr);
                }
              }}
              className={`
                aspect-square rounded-2xl p-2 flex flex-col items-center justify-start
                transition-all hover:scale-105 relative overflow-hidden
                ${isTodayDate 
                  ? 'bg-primary/20 border border-primary/40 text-primary' 
                  : hasEvents 
                    ? 'bg-white/10 border border-primary/30 text-white hover:bg-white/20' 
                    : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                }
              `}
            >
              <span className={`text-sm font-bold ${isTodayDate ? 'text-primary' : ''}`}>{day}</span>
              
              {/* Event indicators */}
              {hasEvents && (
                <div className="flex flex-col gap-1 mt-1 w-full px-1">
                  {dayEvents.slice(0, 2).map((event, idx) => (
                    <div 
                      key={idx}
                      className="text-[8px] truncate w-full text-left bg-primary/20 rounded px-1 py-0.5"
                    >
                      {event.name}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[8px] text-slate-400">+{dayEvents.length - 2}</div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Legenda */}
      <div className="flex gap-4 mt-6 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-primary/20 border border-primary/40"></div>
          <span className="text-[10px] text-slate-400">Hoje</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-white/10 border border-primary/30"></div>
          <span className="text-[10px] text-slate-400">Com eventos</span>
        </div>
      </div>
    </div>
  );
};

// Modal para criar/editar Evento
const CreateEventModal = ({ onClose, onSuccess, packages }: { onClose: () => void; onSuccess: () => void; packages: any[] }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'ANIVERSARIO',
    customer_name: '',
    customer_phone: '',
    start_date: '',
    start_time: '',
    guests_count: 10,
    package_id: '',
    base_amount: 0,
    notes: '',
    addons: {
      dj: { enabled: false, cost: 50000 },
      photographer: { enabled: false, cost: 75000 },
      decoration: { enabled: false, cost: 100000 }
    },
    // Campos específicos para shows
    artist_name: '',
    artist_fee: 0,
    ticket_price: 0,
    tickets_sold: 0,
    includes_standard_meal: false,
    standard_meal_cost_per_person: 0,
    show_setup_time: '',
    show_soundcheck_time: '',
    show_start_time: '',
    show_end_time: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const eventData: any = {
        ...formData,
        status: 'PLANEADO',
        tables_reserved: [],
        included_items: [],
        consumption_mode: 'PACOTE_FECHADO',
        area: 'SALA_PRINCIPAL',
        external_suppliers: [
          ...(formData.addons.dj.enabled ? [{ type: 'DJ', name: 'DJ Profissional', cost: formData.addons.dj.cost }] : []),
          ...(formData.addons.photographer.enabled ? [{ type: 'FOTOGRAFO', name: 'Fotógrafo Profissional', cost: formData.addons.photographer.cost }] : []),
          ...(formData.addons.decoration.enabled ? [{ type: 'DECORACAO', name: 'Decoração Especial', cost: formData.addons.decoration.cost }] : [])
        ]
      };

      // Adicionar campos específicos para shows
      if (formData.type === 'SHOW_INTIMISTA') {
        eventData.artist_name = formData.artist_name;
        eventData.artist_fee = formData.artist_fee;
        eventData.ticket_price = formData.ticket_price;
        eventData.tickets_sold = formData.tickets_sold;
        eventData.includes_standard_meal = formData.includes_standard_meal;
        eventData.standard_meal_cost_per_person = formData.standard_meal_cost_per_person;
        eventData.show_setup_time = formData.show_setup_time;
        eventData.show_soundcheck_time = formData.show_soundcheck_time;
        eventData.show_start_time = formData.show_start_time;
        eventData.show_end_time = formData.show_end_time;
      }

      await EventService.createEvent(eventData);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao criar evento:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] border border-white/10 p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Novo Evento</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Fechar modal"><X size={24} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Nome do Evento</label>
              <input 
                type="text" 
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Aniversário do João"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Tipo</label>
              <select 
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
                aria-label="Tipo de evento"
              >
                <option value="ANIVERSARIO">Aniversário</option>
                <option value="CASAMENTO">Casamento</option>
                <option value="CORPORATIVO">Corporativo</option>
                <option value="ALUGUER_TOTAL">Aluguer Total</option>
                <option value="SHOW_INTIMISTA">Show Intimista</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Nome do Cliente</label>
              <input 
                type="text" 
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.customer_name}
                onChange={e => setFormData({...formData, customer_name: e.target.value})}
                placeholder="Nome do cliente"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Telefone</label>
              <input 
                type="tel" 
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.customer_phone}
                onChange={e => setFormData({...formData, customer_phone: e.target.value})}
                placeholder="+244 xxx xxx xxx"
                aria-label="Telefone do cliente"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Data</label>
              <input 
                type="date" 
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.start_date}
                onChange={e => setFormData({...formData, start_date: e.target.value})}
                aria-label="Data do evento"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Hora</label>
              <input 
                type="time" 
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.start_time}
                onChange={e => setFormData({...formData, start_time: e.target.value})}
                aria-label="Hora de início do evento"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Convidados</label>
              <input 
                type="number" 
                min="1"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.guests_count}
                onChange={e => setFormData({...formData, guests_count: parseInt(e.target.value) || 0})}
                aria-label="Número de convidados"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Pacote</label>
            <select 
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
              value={formData.package_id}
              onChange={e => {
                const pkg = packages.find(p => p.id === e.target.value);
                setFormData({
                  ...formData, 
                  package_id: e.target.value,
                  base_amount: pkg ? pkg.base_price + (pkg.price_per_person * formData.guests_count) : 0
                });
              }}
              aria-label="Selecionar pacote"
            >
              <option value="">Selecionar pacote...</option>
              {packages.map(pkg => (
                <option key={pkg.id} value={pkg.id}>{pkg.name} - {pkg.base_price.toLocaleString()} Kz</option>
              ))}
            </select>
          </div>

          {/* Add-ons Section */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-3 block">Extras e Serviços Adicionais</label>
            <div className="grid grid-cols-3 gap-3">
              {/* DJ */}
              <div className={`p-3 rounded-xl border transition-all ${
                formData.addons.dj.enabled 
                  ? 'bg-primary/20 border-primary/40 text-white' 
                  : 'bg-white/5 border-white/10 text-slate-400'
              }`}>
                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    addons: {...formData.addons, dj: {...formData.addons.dj, enabled: !formData.addons.dj.enabled}}
                  })}
                  className="flex items-center gap-2 mb-2 w-full text-left"
                >
                  <Music size={16} className={formData.addons.dj.enabled ? 'text-primary' : 'text-slate-500'} />
                  <span className="text-xs font-bold">DJ</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-slate-400">+</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    className="w-20 px-2 py-1 bg-white/10 border border-white/10 rounded text-xs text-white"
                    value={formData.addons.dj.cost}
                    onChange={e => setFormData({
                      ...formData,
                      addons: {...formData.addons, dj: {...formData.addons.dj, cost: parseInt(e.target.value) || 0}}
                    })}
                    aria-label="Custo do DJ em Kwanzas"
                  />
                  <span className="text-[9px] text-slate-400">Kz</span>
                </div>
              </div>

              {/* Fotógrafo */}
              <div className={`p-3 rounded-xl border transition-all ${
                formData.addons.photographer.enabled 
                  ? 'bg-primary/20 border-primary/40 text-white' 
                  : 'bg-white/5 border-white/10 text-slate-400'
              }`}>
                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    addons: {...formData.addons, photographer: {...formData.addons.photographer, enabled: !formData.addons.photographer.enabled}}
                  })}
                  className="flex items-center gap-2 mb-2 w-full text-left"
                >
                  <Camera size={16} className={formData.addons.photographer.enabled ? 'text-primary' : 'text-slate-500'} />
                  <span className="text-xs font-bold">Fotógrafo</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-slate-400">+</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    className="w-20 px-2 py-1 bg-white/10 border border-white/10 rounded text-xs text-white"
                    value={formData.addons.photographer.cost}
                    onChange={e => setFormData({
                      ...formData,
                      addons: {...formData.addons, photographer: {...formData.addons.photographer, cost: parseInt(e.target.value) || 0}}
                    })}
                    aria-label="Custo do fotógrafo em Kwanzas"
                  />
                  <span className="text-[9px] text-slate-400">Kz</span>
                </div>
              </div>

              {/* Decoração */}
              <div className={`p-3 rounded-xl border transition-all ${
                formData.addons.decoration.enabled 
                  ? 'bg-primary/20 border-primary/40 text-white' 
                  : 'bg-white/5 border-white/10 text-slate-400'
              }`}>
                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    addons: {...formData.addons, decoration: {...formData.addons.decoration, enabled: !formData.addons.decoration.enabled}}
                  })}
                  className="flex items-center gap-2 mb-2 w-full text-left"
                >
                  <Palette size={16} className={formData.addons.decoration.enabled ? 'text-primary' : 'text-slate-500'} />
                  <span className="text-xs font-bold">Decoração</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-slate-400">+</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    className="w-20 px-2 py-1 bg-white/10 border border-white/10 rounded text-xs text-white"
                    value={formData.addons.decoration.cost}
                    onChange={e => setFormData({
                      ...formData,
                      addons: {...formData.addons, decoration: {...formData.addons.decoration, cost: parseInt(e.target.value) || 0}}
                    })}
                    aria-label="Custo da decoração em Kwanzas"
                  />
                  <span className="text-[9px] text-slate-400">Kz</span>
                </div>
              </div>
            </div>
          </div>

          {/* Campos específicos para shows de artistas */}
          {formData.type === 'SHOW_INTIMISTA' && (
            <div className="space-y-6 p-6 bg-primary/5 border border-primary/20 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <Music size={20} className="text-primary" />
                <h3 className="text-lg font-black text-primary uppercase tracking-tight">
                  Detalhes do Show
                </h3>
              </div>
              
              {/* Nome do Artista */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Nome do Artista</label>
                <input 
                  type="text"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                  value={formData.artist_name}
                  onChange={e => setFormData({...formData, artist_name: e.target.value})}
                  placeholder="Nome do artista ou banda"
                />
              </div>
              
              {/* Cachê */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Cachê (Kz)</label>
                <input 
                  type="number" 
                  min="0"
                  step="1000"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                  value={formData.artist_fee}
                  onChange={e => setFormData({...formData, artist_fee: parseInt(e.target.value) || 0})}
                  placeholder="0"
                  aria-label="Cachê do artista em Kwanzas"
                />
              </div>
              
              {/* Preço do Ingresso */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Preço do Ingresso (Kz)</label>
                <input 
                  type="number"
                  min="0"
                  step="100"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                  value={formData.ticket_price}
                  onChange={e => setFormData({...formData, ticket_price: parseInt(e.target.value) || 0})}
                  aria-label="Preço do ingresso em Kwanzas"
                />
              </div>
              
              {/* Ingressos Vendidos */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Ingressos Vendidos</label>
                <input 
                  type="number"
                  min="0"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                  value={formData.tickets_sold}
                  onChange={e => setFormData({...formData, tickets_sold: parseInt(e.target.value) || 0})}
                  aria-label="Número de ingressos vendidos"
                />
              </div>
              
              {/* Refeição Padrão */}
              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl">
                <input
                  type="checkbox"
                  checked={formData.includes_standard_meal}
                  onChange={e => setFormData({...formData, includes_standard_meal: e.target.checked})}
                  className="w-5 h-5 rounded bg-white/10 border-white/20 text-primary focus:ring-2 focus:ring-primary"
                  aria-label="Incluir refeição padrão para convidados"
                />
                <label className="text-sm text-slate-400">
                  Inclui refeição padrão para convidados
                </label>
              </div>
              
              {formData.includes_standard_meal && (
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Custo por pessoa (Kz)</label>
                  <input 
                    type="number"
                    min="0"
                    step="100"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                    value={formData.standard_meal_cost_per_person}
                    onChange={e => setFormData({...formData, standard_meal_cost_per_person: parseInt(e.target.value) || 0})}
                    placeholder="0"
                    aria-label="Custo da refeição por pessoa em Kwanzas"
                  />
                </div>
              )}
              
              {/* Horários do Show */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Setup</label>
                  <input 
                    type="time"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                    value={formData.show_setup_time}
                    onChange={e => setFormData({...formData, show_setup_time: e.target.value})}
                    aria-label="Horário de setup do show"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Soundcheck</label>
                  <input 
                    type="time"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                    value={formData.show_soundcheck_time}
                    onChange={e => setFormData({...formData, show_soundcheck_time: e.target.value})}
                    aria-label="Horário de soundcheck do show"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Início Show</label>
                  <input 
                    type="time"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                    value={formData.show_start_time}
                    onChange={e => setFormData({...formData, show_start_time: e.target.value})}
                    aria-label="Horário de início do show"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Encerramento</label>
                  <input 
                    type="time"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                    value={formData.show_end_time}
                    onChange={e => setFormData({...formData, show_end_time: e.target.value})}
                    aria-label="Horário de encerramento do show"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Valor Base (Kz)</label>
            <input 
              type="number" 
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
              value={formData.base_amount}
              onChange={e => setFormData({...formData, base_amount: parseInt(e.target.value) || 0})}
              aria-label="Valor base em Kwanzas"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Observações</label>
            <textarea 
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none resize-none"
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              placeholder="Notas adicionais..."
              aria-label="Observações do evento"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-white/5 rounded-2xl text-sm font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 py-4 bg-primary rounded-2xl text-sm font-bold uppercase tracking-widest text-black hover:scale-105 transition-all disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar Evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal para criar/editar Pacote
const CreatePackageModal = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    event_type: 'ANIVERSARIO',
    min_guests: 5,
    max_guests: 10,
    base_price: 0,
    price_per_person: 0,
    duration_hours: 4
  });
  const [loading, setLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<number | null>(null);
  const [customTemplates, setCustomTemplates] = useState(() => {
    const saved = localStorage.getItem('custom-package-templates');
    return saved ? JSON.parse(saved) : [];
  });

  // Templates de pacotes pré-definidos (editáveis)
  const [packageTemplates, setPackageTemplates] = useState([
    {
      name: 'Aniversário Standard',
      description: 'Pacote básico para aniversários com buffet completo, decoração simples e atendimento dedicado.',
      event_type: 'ANIVERSARIO',
      min_guests: 10,
      max_guests: 30,
      base_price: 150000,
      price_per_person: 5000,
      duration_hours: 4,
      included_items: ['Buffet Completo', 'Bolo de Aniversário', 'Decoração Básica', 'Garçom Dedicado']
    },
    {
      name: 'Casamento Premium',
      description: 'Experiência completa para casamentos com menu premium, decoração elegante e serviço personalizado.',
      event_type: 'CASAMENTO',
      min_guests: 50,
      max_guests: 150,
      base_price: 500000,
      price_per_person: 8000,
      duration_hours: 8,
      included_items: ['Menu Premium', 'Decoração Elegante', 'Mesa de Doces', 'Coordenador de Eventos', 'Garçons Exclusivos']
    },
    {
      name: 'Corporativo Business',
      description: 'Ideal para eventos empresariais, reuniões e confraternizações com infraestrutura profissional.',
      event_type: 'CORPORATIVO',
      min_guests: 20,
      max_guests: 100,
      base_price: 200000,
      price_per_person: 6000,
      duration_hours: 6,
      included_items: ['Coffee Break', 'Almoço/Jantar Executivo', 'Projetor e Tela', 'Wi-Fi Dedicado', 'Estacionamento']
    }
  ]);

  // Salvar templates customizados no localStorage
  useEffect(() => {
    localStorage.setItem('custom-package-templates', JSON.stringify(customTemplates));
  }, [customTemplates]);

  const applyTemplate = (template: typeof packageTemplates[0], index?: number) => {
    setFormData({
      name: template.name,
      description: template.description,
      event_type: template.event_type,
      min_guests: template.min_guests,
      max_guests: template.max_guests,
      base_price: template.base_price,
      price_per_person: template.price_per_person,
      duration_hours: template.duration_hours
    });
    if (index !== undefined) {
      setEditingTemplate(index);
    }
  };

  const saveCustomTemplate = () => {
    const newTemplate = {
      ...formData,
      included_items: [],
      is_custom: true
    };
    setCustomTemplates([...customTemplates, newTemplate]);
    setEditingTemplate(null);
  };

  const updateTemplateValue = (field: string, value: any) => {
    if (editingTemplate !== null && editingTemplate < packageTemplates.length) {
      const updated = [...packageTemplates];
      updated[editingTemplate] = { ...updated[editingTemplate], [field]: value };
      setPackageTemplates(updated);
    }
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await EventPackageService.createPackage({
        ...formData,
        included_items: [],
        allowed_areas: [],
        is_active: true
      } as any);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao criar pacote:', error);
    } finally {
      setLoading(false);
    }
  };

  const allTemplates = [...packageTemplates, ...customTemplates];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[2rem] border border-white/10 p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Novo Pacote</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Fechar modal"><X size={24} /></button>
        </div>
        
        {/* Templates de Pacotes */}
        <div className="mb-6">
          <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-3 block">Templates Rápidos (Clique para editar valores)</label>
          <div className="grid grid-cols-2 gap-3">
            {allTemplates.map((template, idx) => (
              <button
                key={idx}
                onClick={() => applyTemplate(template, idx < packageTemplates.length ? idx : undefined)}
                className={`p-3 bg-white/5 border rounded-xl hover:border-primary/30 hover:bg-white/10 transition-all text-left ${
                  editingTemplate === idx ? 'border-primary/50 bg-primary/10' : 'border-white/10'
                }`}
              >
                <div className="text-primary mb-1">
                  {template.event_type === 'ANIVERSARIO' && <PartyPopper size={16} />}
                  {template.event_type === 'CASAMENTO' && <Heart size={16} />}
                  {template.event_type === 'CORPORATIVO' && <Briefcase size={16} />}
                  {template.is_custom && <Sparkles size={16} />}
                </div>
                <p className="text-[10px] font-bold text-white truncate">{template.name}</p>
                <p className="text-[9px] text-slate-400">{template.base_price.toLocaleString()} Kz • {template.min_guests}-{template.max_guests} pessoas</p>
              </button>
            ))}
            <button
              onClick={() => {
                setEditingTemplate(null);
                setFormData({
                  name: '',
                  description: '',
                  event_type: 'ANIVERSARIO',
                  min_guests: 5,
                  max_guests: 10,
                  base_price: 0,
                  price_per_person: 0,
                  duration_hours: 4
                });
              }}
              className="p-3 bg-white/5 border border-dashed border-white/20 rounded-xl hover:border-primary/30 hover:bg-white/10 transition-all text-center"
            >
              <Plus size={16} className="text-primary mx-auto mb-1" />
              <p className="text-[10px] font-bold text-white">Novo Template</p>
              <p className="text-[9px] text-slate-400">Criar do zero</p>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Nome do Pacote</label>
            <input 
              type="text" 
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
              value={formData.name}
              onChange={e => updateTemplateValue('name', e.target.value)}
              placeholder="Ex: Pacote Aniversário Premium"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Descrição</label>
            <textarea 
              rows={2}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none resize-none"
              value={formData.description}
              onChange={e => updateTemplateValue('description', e.target.value)}
              placeholder="Descrição do pacote..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Tipo de Evento</label>
              <select 
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.event_type}
                onChange={e => updateTemplateValue('event_type', e.target.value)}
                aria-label="Tipo de evento do pacote"
              >
                <option value="ANIVERSARIO">Aniversário</option>
                <option value="CASAMENTO">Casamento</option>
                <option value="CORPORATIVO">Corporativo</option>
                <option value="ALUGUER_TOTAL">Aluguer Total</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Duração (horas)</label>
              <input 
                type="number" 
                min="1"
                max="24"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.duration_hours}
                onChange={e => updateTemplateValue('duration_hours', parseInt(e.target.value) || 4)}
                aria-label="Duração do evento em horas"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Min. Convidados</label>
              <input 
                type="number" 
                min="1"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.min_guests}
                onChange={e => updateTemplateValue('min_guests', parseInt(e.target.value) || 1)}
                aria-label="Número mínimo de convidados"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Max. Convidados</label>
              <input 
                type="number" 
                min="1"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.max_guests}
                onChange={e => updateTemplateValue('max_guests', parseInt(e.target.value) || 100)}
                aria-label="Número máximo de convidados"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Preço Base (Kz)</label>
              <input 
                type="number" 
                min="0"
                step="1000"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.base_price}
                onChange={e => updateTemplateValue('base_price', parseInt(e.target.value) || 0)}
                aria-label="Preço base do pacote em Kwanzas"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Preço/Pessoa (Kz)</label>
              <input 
                type="number" 
                min="0"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.price_per_person}
                onChange={e => updateTemplateValue('price_per_person', parseInt(e.target.value) || 0)}
                aria-label="Preço por pessoa do pacote em Kwanzas"
              />
            </div>
          </div>

          {editingTemplate !== null && editingTemplate < packageTemplates.length && (
            <button
              type="button"
              onClick={saveCustomTemplate}
              className="w-full py-3 bg-primary/20 border border-primary/30 rounded-xl text-sm font-bold text-primary hover:bg-primary hover:text-black transition-all"
            >
              Salvar como Template Personalizado
            </button>
          )}

          <div className="flex gap-4 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-white/5 rounded-2xl text-sm font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 py-4 bg-primary rounded-2xl text-sm font-bold uppercase tracking-widest text-black hover:scale-105 transition-all disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar Pacote'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal de Detalhes do Evento
const EventDetailsModal = ({ event, onClose, onSuccess, allEvents }: { event: any; onClose: () => void; onSuccess: () => void; allEvents: any[] }) => {
  const [loading, setLoading] = useState(false);
  const { addNotification } = useStore();
  
  // Estados para gestão financeira de shows
  const [showProfit, setShowProfit] = useState<any>(null);
  const [showExpenses, setShowExpenses] = useState<any[]>([]);
  const [showRevenues, setShowRevenues] = useState<any[]>([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddRevenue, setShowAddRevenue] = useState(false);
  const [newExpense, setNewExpense] = useState({ expense_type: 'ARTIST_FEE', description: '', amount: 0 });
  const [newRevenue, setNewRevenue] = useState({ revenue_type: 'TICKETS', description: '', amount: 0 });
  
  // Carregar dados do show quando o modal abre
  useEffect(() => {
    if (event?.type === 'SHOW_INTIMISTA') {
      loadShowData();
    }
  }, [event?.id]);
  
  const loadShowData = async () => {
    if (!event?.id) return;
    
    try {
      const [profit, expenses, revenues] = await Promise.all([
        ShowService.calculateProfit(event.id),
        ShowService.getExpenses(event.id),
        ShowService.getRevenues(event.id)
      ]);
      
      setShowProfit(profit);
      setShowExpenses(expenses);
      setShowRevenues(revenues);
    } catch (error) {
      console.error('Erro ao carregar dados do show:', error);
    }
  };
  
  // Adicionar gasto
  const handleAddExpense = async () => {
    if (!newExpense.amount || newExpense.amount <= 0) return;
    
    try {
      await ShowService.addExpense({
        event_id: event.id,
        expense_type: newExpense.expense_type as any,
        description: newExpense.description,
        amount: newExpense.amount,
        paid: false
      });
      
      addNotification('success', 'Gasto adicionado com sucesso!');
      setNewExpense({ expense_type: 'ARTIST_FEE', description: '', amount: 0 });
      setShowAddExpense(false);
      loadShowData();
    } catch (error) {
      console.error('Erro ao adicionar gasto:', error);
      addNotification('error', 'Erro ao adicionar gasto');
    }
  };
  
  // Adicionar receita
  const handleAddRevenue = async () => {
    if (!newRevenue.amount || newRevenue.amount <= 0) return;
    
    try {
      await ShowService.addRevenue({
        event_id: event.id,
        revenue_type: newRevenue.revenue_type as any,
        description: newRevenue.description,
        amount: newRevenue.amount
      });
      
      addNotification('success', 'Receita adicionada com sucesso!');
      setNewRevenue({ revenue_type: 'TICKETS', description: '', amount: 0 });
      setShowAddRevenue(false);
      loadShowData();
    } catch (error) {
      console.error('Erro ao adicionar receita:', error);
      addNotification('error', 'Erro ao adicionar receita');
    }
  };
  
  // Remover gasto
  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este gasto?')) return;
    
    try {
      await ShowService.deleteExpense(id);
      addNotification('success', 'Gasto removido com sucesso!');
      loadShowData();
    } catch (error) {
      console.error('Erro ao remover gasto:', error);
      addNotification('error', 'Erro ao remover gasto');
    }
  };
  
  // Remover receita
  const handleDeleteRevenue = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta receita?')) return;
    
    try {
      await ShowService.deleteRevenue(id);
      addNotification('success', 'Receita removida com sucesso!');
      loadShowData();
    } catch (error) {
      console.error('Erro ao remover receita:', error);
      addNotification('error', 'Erro ao remover receita');
    }
  };
  
  // Estado do checklist
  const [checklist, setChecklist] = useState(() => {
    const saved = localStorage.getItem(`event-checklist-${event.id}`);
    return saved ? JSON.parse(saved) : [
      { id: 1, text: 'Confirmar reserva com cliente', done: false },
      { id: 2, text: 'Verificar disponibilidade de mesas', done: false },
      { id: 3, text: 'Preparar decoração', done: false },
      { id: 4, text: 'Confirmar fornecedores externos', done: false },
      { id: 5, text: 'Preparar menu/buffet', done: false }
    ];
  });

  // Estado do Stock/Inventário do Evento
  const [stockItems, setStockItems] = useState(() => {
    const saved = localStorage.getItem(`event-stock-${event.id}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [showAddStock, setShowAddStock] = useState(false);
  const [newStockItem, setNewStockItem] = useState({ name: '', quantity: 1, unit: 'un', cost: 0 });
  
  // Salvar checklist e stock no localStorage
  useEffect(() => {
    localStorage.setItem(`event-checklist-${event.id}`, JSON.stringify(checklist));
  }, [checklist, event.id]);

  useEffect(() => {
    localStorage.setItem(`event-stock-${event.id}`, JSON.stringify(stockItems));
  }, [stockItems, event.id]);

  // Calcular total do stock
  const stockTotal = stockItems.reduce((sum: number, item: any) => sum + (item.quantity * item.cost), 0);

  // Adicionar item ao stock
  const addStockItem = () => {
    if (!newStockItem.name.trim()) return;
    const item = { ...newStockItem, id: Date.now() };
    setStockItems([...stockItems, item]);
    setNewStockItem({ name: '', quantity: 1, unit: 'un', cost: 0 });
    setShowAddStock(false);
    addNotification('success', 'Item adicionado ao stock!');
  };

  // Remover item do stock
  const removeStockItem = (id: number) => {
    setStockItems(stockItems.filter((item: any) => item.id !== id));
    addNotification('success', 'Item removido do stock!');
  };

  // Gerar Relatório Detalhado do Show em PDF
  const generateShowReportPDF = async () => {
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.text('RELATÓRIO DO SHOW', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Show: ${event.name}`, 20, 40);
    doc.text(`Artista: ${event.artist_name || 'N/A'}`, 20, 50);
    doc.text(`Data: ${new Date(event.start_date).toLocaleDateString('pt-AO')}`, 20, 60);
    
    // Horários do Show
    if (event.type === 'SHOW_INTIMISTA') {
      doc.setFontSize(14);
      doc.text('HORÁRIOS', 20, 80);
      doc.setFontSize(10);
      let y = 90;
      if (event.show_setup_time) doc.text(`Setup: ${event.show_setup_time}`, 20, y);
      if (event.show_soundcheck_time) doc.text(`Soundcheck: ${event.show_soundcheck_time}`, 20, y + 8);
      if (event.show_start_time) doc.text(`Início Show: ${event.show_start_time}`, 20, y + 16);
      if (event.show_end_time) doc.text(`Encerramento: ${event.show_end_time}`, 20, y + 24);
      y += 35;
      
      // Cachê e Ingressos
      doc.setFontSize(14);
      doc.text('INFORMAÇÕES FINANCEIRAS', 20, y);
      doc.setFontSize(10);
      y += 10;
      doc.text(`Cachê do Artista: ${event.artist_fee?.toLocaleString() || 0} Kz`, 20, y);
      y += 8;
      doc.text(`Preço do Ingresso: ${event.ticket_price?.toLocaleString() || 0} Kz`, 20, y);
      y += 8;
      doc.text(`Ingressos Vendidos: ${event.tickets_sold || 0}`, 20, y);
      y += 8;
      
      if (event.includes_standard_meal) {
        doc.text(`Refeição Padrão: Sim (${event.standard_meal_cost_per_person?.toLocaleString() || 0} Kz/pessoa)`, 20, y);
        y += 8;
      }
      y += 15;
      
      // Resumo Financeiro do Show
      if (showProfit) {
        doc.setFontSize(14);
        doc.text('RESUMO FINANCEIRO', 20, y);
        doc.setFontSize(10);
        y += 10;
        doc.text(`Receitas Totais: ${showProfit.totalRevenue.toLocaleString()} Kz`, 20, y);
        y += 8;
        doc.text(`Gastos Totais: ${showProfit.totalExpenses.toLocaleString()} Kz`, 20, y);
        y += 8;
        doc.text(`Lucro: ${showProfit.profit.toLocaleString()} Kz`, 20, y);
        y += 8;
        doc.text(`Margem: ${showProfit.profitMargin.toFixed(1)}%`, 20, y);
        y += 8;
        doc.text(`Breakpoint: ${showProfit.breakEvenPoint.toLocaleString()} Kz`, 20, y);
        y += 15;
        
        // Lista de Gastos
        if (showExpenses.length > 0) {
          doc.setFontSize(12);
          doc.text('GASTOS', 20, y);
          doc.setFontSize(9);
          y += 8;
          showExpenses.forEach((expense: any) => {
            doc.text(`• ${expense.expense_type}: ${expense.amount.toLocaleString()} Kz ${expense.description ? `(${expense.description})` : ''}`, 20, y);
            y += 6;
          });
          y += 10;
        }
        
        // Lista de Receitas
        if (showRevenues.length > 0) {
          doc.setFontSize(12);
          doc.text('RECEITAS', 20, y);
          doc.setFontSize(9);
          y += 8;
          showRevenues.forEach((revenue: any) => {
            doc.text(`• ${revenue.revenue_type}: ${revenue.amount.toLocaleString()} Kz ${revenue.description ? `(${revenue.description})` : ''}`, 20, y);
            y += 6;
          });
          y += 10;
        }
        
        // Alerta de Prejuízo
        if (!showProfit.isProfitable) {
          doc.setTextColor(255, 0, 0);
          doc.setFontSize(12);
          doc.text('⚠️ PREJUÍZO ESTIMADO', 20, y);
          doc.setTextColor(0, 0, 0);
        }
      }
    }
    
    // Rodapé
    doc.setFontSize(9);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-AO')}`, 20, 280);
    
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-show-${event.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    addNotification('success', 'Relatório PDF gerado com sucesso!');
  };

  // Gerar Contrato PDF
  const generateContractPDF = () => {
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.text('CONTRATO DE EVENTO', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Evento: ${event.name}`, 20, 40);
    doc.text(`Cliente: ${event.customer_name}`, 20, 50);
    doc.text(`Data: ${new Date(event.start_date).toLocaleDateString('pt-AO')}`, 20, 60);
    doc.text(`Horário: ${new Date(event.start_date).toLocaleTimeString('pt-AO', {hour: '2-digit', minute:'2-digit'})} - ${new Date(event.end_date).toLocaleTimeString('pt-AO', {hour: '2-digit', minute:'2-digit'})}`, 20, 70);
    doc.text(`Nº de Pessoas: ${event.guests_count || event.expected_people || 0}`, 20, 80);
    doc.text(`Área: ${event.area || 'SALA_PRINCIPAL'}`, 20, 90);
    
    // Valores
    doc.setFontSize(14);
    doc.text('RESUMO FINANCEIRO', 20, 110);
    
    doc.setFontSize(12);
    let y = 125;
    const baseAmount = event.base_amount || event.package?.base_price || 0;
    doc.text(`Pacote: ${baseAmount.toLocaleString()} Kz`, 20, y);
    y += 10;
    
    if (event.extras_amount > 0) {
      doc.text(`Extras: ${event.extras_amount?.toLocaleString()} Kz`, 20, y);
      y += 10;
    }
    
    // Stock/Inventário
    if (stockItems.length > 0) {
      doc.text('ITENS DO STOCK:', 20, y);
      y += 10;
      stockItems.forEach((item: any) => {
        const itemTotal = item.quantity * item.cost;
        doc.text(`${item.name}: ${item.quantity} ${item.unit} x ${item.cost.toLocaleString()} Kz = ${itemTotal.toLocaleString()} Kz`, 30, y);
        y += 8;
      });
      y += 5;
    }
    
    doc.setFontSize(14);
    const totalAmount = (event.base_amount || event.package?.base_price || 0) + (event.extras_amount || 0) + stockTotal;
    doc.text(`TOTAL: ${totalAmount.toLocaleString()} Kz`, 20, y + 10);
    
    // Termos
    doc.setFontSize(10);
    doc.text('Termos e Condições:', 20, y + 30);
    doc.setFontSize(9);
    const terms = [
      '1. O pagamento deve ser efetuado conforme acordo estabelecido.',
      '2. Cancelamentos devem ser comunicados com antecedência mínima de 48h.',
      '3. O restaurante não se responsabiliza por objetos deixados no local.',
      '4. Qualquer dano causado ao espaço será cobrado do cliente.'
    ];
    let termY = y + 40;
    terms.forEach(term => {
      doc.text(term, 20, termY);
      termY += 7;
    });
    
    // Assinaturas
    doc.setFontSize(12);
    doc.text('_'.repeat(40), 20, 250);
    doc.text('Assinatura do Cliente', 20, 260);
    
    doc.text('_'.repeat(40), 110, 250);
    doc.text('Assinatura do Representante', 110, 260);
    
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contrato-${event.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    addNotification('success', 'Contrato PDF gerado com sucesso!');
  };

  // Verificar conflitos de horário
  const conflicts = useMemo(() => {
    if (!allEvents || !Array.isArray(allEvents)) return [];
    
    const eventStart = new Date(event.start_date);
    const eventEnd = new Date(event.end_date);
    
    return allEvents.filter(e => {
      if (e.id === event.id || e.status === 'CANCELADO') return false;
      
      const otherStart = new Date(e.start_date);
      const otherEnd = new Date(e.end_date);
      
      // Verifica sobreposição de horário
      const hasTimeOverlap = (eventStart < otherEnd && eventEnd > otherStart);
      const sameArea = e.area === event.area;
      
      return hasTimeOverlap && sameArea;
    });
  }, [event, allEvents]);

  const toggleChecklistItem = (id: number) => {
    setChecklist((prev: any[]) => prev.map((item: any) => 
      item.id === id ? { ...item, done: !item.done } : item
    ));
    addNotification('success', 'Checklist atualizado!');
  };

  const handleStatusChange = async (newStatus: 'CONFIRMADO' | 'CANCELADO') => {
    setLoading(true);
    try {
      const { EventService } = await import('../services/eventService');
      await EventService.changeEventStatus(event.id, newStatus);
      addNotification('success', `Evento ${newStatus === 'CONFIRMADO' ? 'confirmado' : 'cancelado'} com sucesso!`);
      onSuccess();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      addNotification('error', 'Erro ao atualizar status do evento');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Tem certeza que deseja cancelar este evento?')) return;
    setLoading(true);
    try {
      const { EventService } = await import('../services/eventService');
      await EventService.changeEventStatus(event.id, 'CANCELADO');
      addNotification('success', 'Evento cancelado com sucesso!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao cancelar evento:', error);
      addNotification('error', 'Erro ao cancelar evento');
    } finally {
      setLoading(false);
    }
  };

  // 🎉 Fechar Evento: verificar mesas pendentes, libertar mesas, gerar relatório
  const handleCloseEvent = async () => {
    if (!confirm('Confirma o fechamento deste evento? As mesas reservadas serão libertadas e o status será alterado para CONCLUIDO.')) return;
    setLoading(true);
    try {
      const { EventService } = await import('../services/eventService');
      const { supabase } = await import('../supabase_standalone');

      // 1. Verificar mesas com pedidos pendentes
      const { data: pendingOrders } = await supabase
        .from('orders')
        .select('id, table_id, total_amount')
        .eq('event_id', event.id)
        .eq('status', 'ABERTO');

      if (pendingOrders && pendingOrders.length > 0) {
        const totalPendente = pendingOrders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);
        if (!confirm(`Atenção: Existem ${pendingOrders.length} pedido(s) em aberto neste evento (total: ${totalPendente.toLocaleString()} Kz). Deseja mesmo assim fechar o evento?`)) {
          setLoading(false);
          return;
        }
      }

      // 2. Buscar resumo financeiro final
      const summary = await EventService.getEventFinancialSummary(event.id);

      // 3. Actualizar final_amount do evento
      const finalAmount = (summary.baseAmount || 0) + (summary.extrasAmount || 0);
      await supabase
        .from('events')
        .update({ 
          status: 'CONCLUIDO',
          final_amount: finalAmount
        })
        .eq('id', event.id);

      // 4. Libertar mesas
      await EventService.releaseTablesFromEvent(event.id);

      // 5. Gerar relatório PDF
      generateEventClosingReport(summary, pendingOrders || []);

      addNotification('success', `Evento fechado! Total: ${finalAmount.toLocaleString()} Kz. Mesas libertadas.`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao fechar evento:', error);
      addNotification('error', 'Erro ao fechar evento');
    } finally {
      setLoading(false);
    }
  };

  // 🎉 Gerar Relatório de Fechamento do Evento em PDF
  const generateEventClosingReport = (summary: any, pendingOrders: any[]) => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('RELATÓRIO DE FECHAMENTO', 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text(event.name, 105, 30, { align: 'center' });
    
    doc.setFontSize(10);
    let y = 50;
    doc.text(`Data: ${new Date(event.start_date).toLocaleDateString('pt-AO')}`, 20, y); y += 8;
    doc.text(`Cliente: ${event.customer_name || 'N/A'}`, 20, y); y += 8;
    doc.text(`Convidados: ${event.guests_count || 0}`, 20, y); y += 8;
    doc.text(`Tipo: ${event.type || 'N/A'}`, 20, y); y += 15;

    doc.setFontSize(14);
    doc.text('RESUMO FINANCEIRO', 20, y); y += 10;
    doc.setFontSize(10);
    doc.text(`Valor do Pacote: ${summary.baseAmount?.toLocaleString() || 0} Kz`, 20, y); y += 8;
    doc.text(`Extras (POS): ${summary.extrasAmount?.toLocaleString() || 0} Kz`, 20, y); y += 8;
    if (summary.depositAmount) {
      doc.text(`Depósito: ${summary.depositAmount?.toLocaleString() || 0} Kz`, 20, y); y += 8;
    }
    y += 5;
    doc.setFontSize(14);
    const finalTotal = (summary.baseAmount || 0) + (summary.extrasAmount || 0);
    doc.text(`TOTAL FINAL: ${finalTotal.toLocaleString()} Kz`, 20, y); y += 15;

    if (pendingOrders.length > 0) {
      doc.setFontSize(12);
      doc.text('PEDIDOS PENDENTES', 20, y); y += 8;
      doc.setFontSize(9);
      pendingOrders.forEach((o: any) => {
        doc.text(`Mesa ${o.table_id} — ${o.total_amount?.toLocaleString() || 0} Kz`, 20, y); y += 6;
      });
      y += 5;
    }

    doc.setFontSize(8);
    doc.text(`Relatório gerado em ${new Date().toLocaleString('pt-AO')}`, 20, y + 10);
    doc.text('Tasca do Vereda — Sistema de Gestão', 20, y + 15);
    
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fechamento-evento-${event.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const eventDate = new Date(event.start_date);
  const endDate = new Date(event.end_date);
  const packageName = event.package?.name || 'Sem pacote';
  
  const completedTasks = checklist.filter((i: any) => i.done).length;
  const totalTasks = checklist.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[2rem] border border-white/10 p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">{event.name}</h2>
            <p className="text-sm text-slate-400 mt-1">{event.customer_name}</p>
          </div>
          <div className="flex gap-2">
            {event.type === 'SHOW_INTIMISTA' && (
              <button 
                onClick={generateShowReportPDF}
                className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-2"
              >
                <FileText size={16} /> Relatório
              </button>
            )}
            <button 
              onClick={generateContractPDF}
              className="px-4 py-2 bg-primary/20 border border-primary/30 rounded-xl text-xs font-bold text-primary hover:bg-primary hover:text-black transition-all flex items-center gap-2"
            >
              <FileText size={16} /> Contrato
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Fechar modal"><X size={24} /></button>
          </div>
        </div>

        {/* Alerta de Conflitos */}
        {conflicts.length > 0 && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle size={20} className="text-red-400" />
              <span className="text-sm font-bold text-red-400 uppercase tracking-widest">Conflito de Horário Detectado</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">Este evento sobrepõe-se com:</p>
            <div className="space-y-2">
              {conflicts.map((conflict: any) => (
                <div key={conflict.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-sm text-white font-medium">{conflict.name}</p>
                    <p className="text-xs text-slate-400">{new Date(conflict.start_date).toLocaleTimeString('pt-AO', {hour: '2-digit', minute:'2-digit'})} - {new Date(conflict.end_date).toLocaleTimeString('pt-AO', {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                  <span className="px-2 py-1 bg-red-500/20 text-red-400 text-[10px] uppercase rounded">{conflict.area}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 rounded-2xl">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Data</p>
              <p className="text-white font-bold">{eventDate.toLocaleDateString('pt-AO')}</p>
              <p className="text-slate-400 text-xs">{eventDate.toLocaleTimeString('pt-AO', {hour: '2-digit', minute:'2-digit'})} - {endDate.toLocaleTimeString('pt-AO', {hour: '2-digit', minute:'2-digit'})}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Pessoas</p>
              <p className="text-white font-bold text-xl">{event.guests_count || event.expected_people || 0}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Pacote</p>
              <p className="text-white font-bold">{packageName}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Status</p>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                event.status === 'CONFIRMADO' ? 'bg-emerald-500/20 text-emerald-400' :
                event.status === 'CANCELADO' ? 'bg-red-500/20 text-red-400' :
                'bg-amber-500/20 text-amber-400'
              }`}>{event.status}</span>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="p-6 bg-primary/5 border border-primary/20 rounded-2xl">
            <p className="text-[10px] uppercase tracking-widest text-primary mb-4">Resumo Financeiro</p>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-400">Pacote</p>
                <p className="text-white font-bold">{event.total_amount?.toLocaleString()} Kz</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Extras</p>
                <p className="text-emerald-400 font-bold">+{event.extras_amount?.toLocaleString() || 0} Kz</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Stock</p>
                <p className="text-blue-400 font-bold">+{stockTotal.toLocaleString()} Kz</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Total</p>
                <p className="text-primary font-bold text-lg">{((event.total_amount || 0) + (event.extras_amount || 0) + stockTotal).toLocaleString()} Kz</p>
              </div>
            </div>
          </div>

          {/* Seção Financeira para Shows */}
          {event.type === 'SHOW_INTIMISTA' && (
            <div className="space-y-6">
              {/* Resumo de Lucro */}
              <div className="p-6 bg-gradient-to-br from-emerald-500/10 to-primary/10 border border-emerald-500/20 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <DollarSign size={20} className="text-emerald-400" />
                  <h3 className="text-lg font-black text-emerald-400 uppercase tracking-tight">
                    Resumo do Show
                  </h3>
                </div>
                
                {showProfit && (
                  <>
                    {/* Gráfico Visual com Recharts */}
                    <div className="mb-4 p-4 bg-white/5 rounded-xl">
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={[
                          { name: 'Receitas', value: showProfit.totalRevenue, fill: '#10b981' },
                          { name: 'Gastos', value: showProfit.totalExpenses, fill: '#ef4444' },
                          { name: 'Lucro', value: showProfit.profit, fill: showProfit.profit >= 0 ? '#8b5cf6' : '#dc2626' }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                            stroke="rgba(255,255,255,0.2)"
                          />
                          <YAxis 
                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                            stroke="rgba(255,255,255,0.2)"
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              color: '#fff'
                            }}
                            formatter={(value: number) => `${value.toLocaleString()} Kz`}
                          />
                          <Legend 
                            wrapperStyle={{ paddingTop: '10px' }}
                            iconType="circle"
                          />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                      {/* Linha do Breakpoint */}
                      <div className="mt-2 pt-2 border-t border-white/10">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                          <span className="text-[9px] text-slate-400">Breakpoint: {showProfit.breakEvenPoint.toLocaleString()} Kz</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                        <span className="text-slate-400 text-sm">Receitas Totais</span>
                        <span className="text-white font-bold">{showProfit.totalRevenue.toLocaleString()} Kz</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                        <span className="text-slate-400 text-sm">Gastos Totais</span>
                        <span className="text-red-400 font-bold">{showProfit.totalExpenses.toLocaleString()} Kz</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white/10 rounded-xl border border-white/10">
                        <span className="text-slate-400 text-sm">Lucro</span>
                        <span className={`font-bold ${showProfit.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {showProfit.profit.toLocaleString()} Kz
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                        <span className="text-slate-400 text-sm">Margem</span>
                        <span className="text-white font-bold">{showProfit.profitMargin.toFixed(1)}%</span>
                      </div>
                      {!showProfit.isProfitable && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                          <span className="text-red-400 text-sm font-bold">⚠️ Prejuízo estimado</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Gastos */}
              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-red-400" />
                    <h3 className="text-sm font-black text-red-400 uppercase tracking-widest">
                      Gastos
                    </h3>
                    <span className="text-xs text-slate-400">({showExpenses.length})</span>
                  </div>
                  <button
                    onClick={() => setShowAddExpense(!showAddExpense)}
                    className="px-3 py-1.5 bg-red-500/20 rounded-lg text-xs font-bold text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center gap-1"
                  >
                    <Plus size={14} /> {showAddExpense ? 'Cancelar' : 'Adicionar'}
                  </button>
                </div>

                {showAddExpense && (
                  <div className="mb-4 p-3 bg-white/5 rounded-xl">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <select
                        className="px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-xs text-white"
                        value={newExpense.expense_type}
                        onChange={e => setNewExpense({...newExpense, expense_type: e.target.value})}
                        aria-label="Tipo de despesa"
                      >
                        <option value="ARTIST_FEE">Cachê do Artista</option>
                        <option value="TRANSPORT">Transporte</option>
                        <option value="EQUIPMENT">Equipamento</option>
                        <option value="STAFF">Staff</option>
                        <option value="MARKETING">Marketing</option>
                        <option value="OTHER">Outro</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        placeholder="Valor (Kz)"
                        className="px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-xs text-white"
                        value={newExpense.amount}
                        onChange={e => setNewExpense({...newExpense, amount: parseInt(e.target.value) || 0})}
                        aria-label="Valor da despesa em Kwanzas"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Descrição (opcional)"
                      className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-xs text-white mb-2"
                      value={newExpense.description}
                      onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                      aria-label="Descrição da despesa"
                    />
                    <button
                      onClick={handleAddExpense}
                      className="w-full py-2 bg-red-500/30 rounded-lg text-xs font-bold text-red-400 hover:bg-red-500 hover:text-white transition-all"
                    >
                      Confirmar Gasto
                    </button>
                  </div>
                )}

                {showExpenses.length > 0 ? (
                  <div className="space-y-2">
                    {showExpenses.map((expense: any) => (
                      <div key={expense.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <div>
                          <p className="text-sm text-white font-medium">{expense.expense_type}</p>
                          {expense.description && (
                            <p className="text-xs text-slate-400">{expense.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-red-400 font-bold">{expense.amount.toLocaleString()} Kz</span>
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="text-slate-400 hover:text-red-400 transition-colors"
                            aria-label="Remover despesa"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">Nenhum gasto registado</p>
                )}
              </div>

              {/* Receitas */}
              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-400" />
                    <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest">
                      Receitas
                    </h3>
                    <span className="text-xs text-slate-400">({showRevenues.length})</span>
                  </div>
                  <button
                    onClick={() => setShowAddRevenue(!showAddRevenue)}
                    className="px-3 py-1.5 bg-emerald-500/20 rounded-lg text-xs font-bold text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-1"
                  >
                    <Plus size={14} /> {showAddRevenue ? 'Cancelar' : 'Adicionar'}
                  </button>
                </div>

                {showAddRevenue && (
                  <div className="mb-4 p-3 bg-white/5 rounded-xl">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <select
                        className="px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-xs text-white"
                        value={newRevenue.revenue_type}
                        onChange={e => setNewRevenue({...newRevenue, revenue_type: e.target.value})}
                        aria-label="Tipo de receita"
                      >
                        <option value="TICKETS">Ingressos</option>
                        <option value="SPONSORSHIP">Patrocínio</option>
                        <option value="MERCHANDISE">Merchandise</option>
                        <option value="POS_SALES">Vendas POS</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        placeholder="Valor (Kz)"
                        className="px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-xs text-white"
                        value={newRevenue.amount}
                        onChange={e => setNewRevenue({...newRevenue, amount: parseInt(e.target.value) || 0})}
                        aria-label="Valor da receita em Kwanzas"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Descrição (opcional)"
                      className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-xs text-white mb-2"
                      value={newRevenue.description}
                      onChange={e => setNewRevenue({...newRevenue, description: e.target.value})}
                      aria-label="Descrição da receita"
                    />
                    <button
                      onClick={handleAddRevenue}
                      className="w-full py-2 bg-emerald-500/30 rounded-lg text-xs font-bold text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all"
                    >
                      Confirmar Receita
                    </button>
                  </div>
                )}

                {showRevenues.length > 0 ? (
                  <div className="space-y-2">
                    {showRevenues.map((revenue: any) => (
                      <div key={revenue.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <div>
                          <p className="text-sm text-white font-medium">{revenue.revenue_type}</p>
                          {revenue.description && (
                            <p className="text-xs text-slate-400">{revenue.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-emerald-400 font-bold">{revenue.amount.toLocaleString()} Kz</span>
                          <button
                            onClick={() => handleDeleteRevenue(revenue.id)}
                            className="text-slate-400 hover:text-red-400 transition-colors"
                            aria-label="Remover receita"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">Nenhuma receita registada</p>
                )}
              </div>
            </div>
          )}

          {/* Stock/Inventário do Evento */}
          <div className="p-4 bg-white/5 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-primary" />
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Stock do Evento</p>
                <span className="text-xs text-slate-400">({stockItems.length} itens)</span>
              </div>
              <button 
                onClick={() => setShowAddStock(!showAddStock)}
                className="px-3 py-1.5 bg-primary/20 rounded-lg text-xs font-bold text-primary hover:bg-primary hover:text-black transition-all flex items-center gap-1"
              >
                <Plus size={14} /> {showAddStock ? 'Cancelar' : 'Adicionar'}
              </button>
            </div>

            {showAddStock && (
              <div className="mb-4 p-3 bg-white/5 rounded-xl">
                <div className="grid grid-cols-4 gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Nome do item"
                    className="px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-xs text-white"
                    value={newStockItem.name}
                    onChange={e => setNewStockItem({...newStockItem, name: e.target.value})}
                    aria-label="Nome do item de stock"
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Qtd"
                    className="px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-xs text-white"
                    value={newStockItem.quantity}
                    onChange={e => setNewStockItem({...newStockItem, quantity: parseInt(e.target.value) || 1})}
                    aria-label="Quantidade do item"
                  />
                  <select
                    className="px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-xs text-white"
                    value={newStockItem.unit}
                    onChange={e => setNewStockItem({...newStockItem, unit: e.target.value})}
                    aria-label="Unidade de medida"
                  >
                    <option value="un">un</option>
                    <option value="kg">kg</option>
                    <option value="cx">cx</option>
                    <option value="lt">lt</option>
                    <option value="garrafa">garrafa</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="Custo unitário"
                    className="px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-xs text-white"
                    value={newStockItem.cost}
                    onChange={e => setNewStockItem({...newStockItem, cost: parseInt(e.target.value) || 0})}
                    aria-label="Custo unitário em Kwanzas"
                  />
                </div>
                <button
                  onClick={addStockItem}
                  className="w-full py-2 bg-primary/30 rounded-lg text-xs font-bold text-primary hover:bg-primary hover:text-black transition-all"
                >
                  Confirmar Adição
                </button>
              </div>
            )}

            {stockItems.length > 0 ? (
              <div className="space-y-2">
                {stockItems.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div className="flex-1">
                      <p className="text-sm text-white font-medium">{item.name}</p>
                      <p className="text-xs text-slate-400">{item.quantity} {item.unit} x {item.cost.toLocaleString()} Kz</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-primary font-bold">{(item.quantity * item.cost).toLocaleString()} Kz</span>
                      <button
                        onClick={() => removeStockItem(item.id)}
                        className="p-1.5 bg-red-500/20 rounded-lg text-red-400 hover:bg-red-500 hover:text-white transition-all"
                        aria-label="Remover item do stock"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-white/10 flex justify-between">
                  <span className="text-xs text-slate-400">Total Stock:</span>
                  <span className="text-sm text-primary font-bold">{stockTotal.toLocaleString()} Kz</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-4">Nenhum item no stock. Adicione itens para este evento.</p>
            )}
          </div>

          {/* Checklist de Tarefas */}
          <div className="p-4 bg-white/5 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Checklist do Evento</p>
              <span className="text-xs text-primary font-bold">{completedTasks}/{totalTasks}</span>
            </div>
            <div className="space-y-2">
              {checklist.map((item: any) => (
                <div 
                  key={item.id}
                  onClick={() => toggleChecklistItem(item.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    item.done ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    item.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'
                  }`}>
                    {item.done && <Check size={12} className="text-black" />}
                  </div>
                  <span className={`text-sm ${item.done ? 'text-slate-400 line-through' : 'text-white'}`}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact */}
          {event.contact_info && (
            <div className="p-4 bg-white/5 rounded-2xl">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Contacto</p>
              <p className="text-white">{event.contact_info}</p>
            </div>
          )}

          {/* Notes */}
          {event.notes && (
            <div className="p-4 bg-white/5 rounded-2xl">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Notas</p>
              <p className="text-white text-sm">{event.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            {event.status === 'PLANEADO' && (
              <button 
                onClick={() => handleStatusChange('CONFIRMADO')}
                disabled={loading}
                className="flex-1 py-4 bg-emerald-500/20 text-emerald-400 rounded-2xl text-sm font-bold uppercase tracking-widest hover:bg-emerald-500 hover:text-black transition-all"
              >
                Confirmar
              </button>
            )}
            {event.status !== 'CONCLUIDO' && event.status !== 'CANCELADO' && (
              <button 
                onClick={handleCloseEvent}
                disabled={loading}
                className="flex-1 py-4 bg-blue-500/20 text-blue-400 rounded-2xl text-sm font-bold uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all"
              >
                {loading ? 'A fechar...' : 'Fechar Evento'}
              </button>
            )}
            {event.status !== 'CANCELADO' && event.status !== 'CONCLUIDO' && (
              <button 
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 py-4 bg-red-500/20 text-red-400 rounded-2xl text-sm font-bold uppercase tracking-widest hover:bg-red-500 hover:text-black transition-all"
              >
                Cancelar Evento
              </button>
            )}
            <button 
              onClick={onClose}
              className="flex-1 py-4 bg-white/5 rounded-2xl text-sm font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-all"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal para editar Evento
const EditEventModal = ({ event, onClose, onSuccess, packages }: { event: any; onClose: () => void; onSuccess: () => void; packages: any[] }) => {
  const [formData, setFormData] = useState({
    name: event.name || '',
    type: event.type || 'ANIVERSARIO',
    customer_name: event.customer_name || '',
    customer_phone: event.customer_phone || '',
    start_date: event.start_date ? new Date(event.start_date).toISOString().split('T')[0] : '',
    start_time: event.start_time || '',
    guests_count: event.guests_count || 10,
    package_id: event.package_id || '',
    base_amount: event.base_amount || 0,
    notes: event.notes || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { EventService } = await import('../services/eventService');
      await EventService.updateEvent(event.id, {
        ...formData,
        start_date: new Date(formData.start_date).toISOString()
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar evento:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] border border-white/10 p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Editar Evento</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Fechar modal"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Nome do Evento</label>
              <input type="text" required className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} aria-label="Nome do evento" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Tipo</label>
              <select className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
                value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} aria-label="Tipo de evento">
                <option value="ANIVERSARIO">Aniversário</option>
                <option value="CASAMENTO">Casamento</option>
                <option value="CORPORATIVO">Corporativo</option>
                <option value="ALUGUER_TOTAL">Aluguer Total</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Cliente</label>
              <input type="text" required className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
                value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} aria-label="Nome do cliente" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Telefone</label>
              <input type="tel" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
                value={formData.customer_phone} onChange={e => setFormData({...formData, customer_phone: e.target.value})} aria-label="Telefone do cliente" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Data</label>
              <input type="date" required className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
                value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} aria-label="Data do evento" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Hora</label>
              <input type="time" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
                value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} aria-label="Hora de início do evento" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Convidados</label>
              <input type="number" min="1" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
                value={formData.guests_count} onChange={e => setFormData({...formData, guests_count: parseInt(e.target.value) || 1})} aria-label="Número de convidados" />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Observações</label>
            <textarea rows={3} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm resize-none"
              value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} aria-label="Observações do evento" />
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 bg-white/5 rounded-2xl text-sm font-bold text-slate-400 hover:text-white">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 py-4 bg-primary rounded-2xl text-sm font-bold text-black disabled:opacity-50">
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal para editar Pacote
const EditPackageModal = ({ pkg, onClose, onSuccess }: { pkg: any; onClose: () => void; onSuccess: () => void }) => {
  const [formData, setFormData] = useState({
    name: pkg.name || '',
    description: pkg.description || '',
    event_type: pkg.event_type || 'ANIVERSARIO',
    min_guests: pkg.min_guests || 5,
    max_guests: pkg.max_guests || 10,
    base_price: pkg.base_price || 0,
    price_per_person: pkg.price_per_person || 0,
    duration_hours: pkg.duration_hours || 4,
    is_active: pkg.is_active !== false
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await EventPackageService.updatePackage(pkg.id, formData);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar pacote:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[2rem] border border-white/10 p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Editar Pacote</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Fechar modal"><X size={24} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Nome do Pacote</label>
            <input 
              type="text" 
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="Ex: Pacote Aniversário Premium"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Descrição</label>
            <textarea 
              rows={2}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none resize-none"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Descrição do pacote..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Tipo de Evento</label>
              <select 
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.event_type}
                onChange={e => setFormData({...formData, event_type: e.target.value})}
                aria-label="Tipo de evento do pacote"
              >
                <option value="ANIVERSARIO">Aniversário</option>
                <option value="CASAMENTO">Casamento</option>
                <option value="CORPORATIVO">Corporativo</option>
                <option value="ALUGUER_TOTAL">Aluguer Total</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Duração (horas)</label>
              <input 
                type="number" 
                min="1"
                max="24"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.duration_hours}
                onChange={e => setFormData({...formData, duration_hours: parseInt(e.target.value) || 4})}
                aria-label="Duração do evento em horas"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Min. Convidados</label>
              <input 
                type="number" 
                min="1"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.min_guests}
                onChange={e => setFormData({...formData, min_guests: parseInt(e.target.value) || 1})}
                aria-label="Número mínimo de convidados"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Max. Convidados</label>
              <input 
                type="number" 
                min="1"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.max_guests}
                onChange={e => setFormData({...formData, max_guests: parseInt(e.target.value) || 100})}
                aria-label="Número máximo de convidados"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Preço Base (Kz)</label>
              <input 
                type="number" 
                min="0"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.base_price}
                onChange={e => setFormData({...formData, base_price: parseInt(e.target.value) || 0})}
                aria-label="Preço base do pacote em Kwanzas"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Preço/Pessoa (Kz)</label>
              <input 
                type="number" 
                min="0"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.price_per_person}
                onChange={e => setFormData({...formData, price_per_person: parseInt(e.target.value) || 0})}
                aria-label="Preço por pessoa do pacote em Kwanzas"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl">
            <input 
              type="checkbox" 
              id="is_active"
              checked={formData.is_active}
              onChange={e => setFormData({...formData, is_active: e.target.checked})}
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
              aria-label="Marcar pacote como ativo"
            />
            <label htmlFor="is_active" className="text-sm text-white">Pacote ativo</label>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-white/5 rounded-2xl text-sm font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 py-4 bg-primary rounded-2xl text-sm font-bold uppercase tracking-widest text-black hover:scale-105 transition-all disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal para usar Pacote (criar evento a partir do pacote)
const UsePackageModal = ({ pkg, onClose, onSuccess }: { pkg: any; onClose: () => void; onSuccess: () => void }) => {
  const [formData, setFormData] = useState({
    name: '',
    customer_name: '',
    customer_phone: '',
    start_date: '',
    start_time: '',
    guests_count: pkg.min_guests || 10,
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await EventService.createEvent({
        ...formData,
        type: pkg.event_type || 'ANIVERSARIO',
        package_id: pkg.id,
        base_amount: pkg.base_price + (pkg.price_per_person * formData.guests_count),
        status: 'PLANEADO',
        tables_reserved: [],
        included_items: pkg.included_items || [],
        consumption_mode: 'PACOTE_FECHADO',
        area: 'SALA_PRINCIPAL'
      } as any);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao criar evento:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] border border-white/10 p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Novo Evento</h2>
            <p className="text-sm text-slate-400 mt-1">Usando pacote: {pkg.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Fechar modal"><X size={24} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl mb-4">
            <p className="text-[10px] uppercase tracking-widest text-primary mb-2">Pacote Selecionado</p>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-white font-bold">{pkg.name}</p>
                <p className="text-slate-400 text-sm">{pkg.duration_hours}h • {pkg.min_guests}-{pkg.max_guests} pessoas</p>
              </div>
              <div className="text-right">
                <p className="text-primary font-bold">{(pkg.base_price + (pkg.price_per_person * formData.guests_count)).toLocaleString()} Kz</p>
                <p className="text-slate-400 text-xs">Base + {formData.guests_count} × {pkg.price_per_person} Kz</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Nome do Evento</label>
              <input 
                type="text" 
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Aniversário do João"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Nome do Cliente</label>
              <input 
                type="text" 
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.customer_name}
                onChange={e => setFormData({...formData, customer_name: e.target.value})}
                placeholder="Nome do cliente"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Data</label>
              <input 
                type="date" 
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.start_date}
                onChange={e => setFormData({...formData, start_date: e.target.value})}
                aria-label="Data do evento"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Hora</label>
              <input 
                type="time" 
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.start_time}
                onChange={e => setFormData({...formData, start_time: e.target.value})}
                aria-label="Hora de início do evento"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Convidados</label>
              <input 
                type="number" 
                min={pkg.min_guests}
                max={pkg.max_guests}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.guests_count}
                onChange={e => setFormData({...formData, guests_count: parseInt(e.target.value) || pkg.min_guests})}
                aria-label="Número de convidados"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Telefone</label>
            <input 
              type="tel" 
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
              value={formData.customer_phone}
              onChange={e => setFormData({...formData, customer_phone: e.target.value})}
              placeholder="+244 xxx xxx xxx"
              aria-label="Telefone do cliente"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Observações</label>
            <textarea 
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none resize-none"
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              placeholder="Notas adicionais..."
              aria-label="Observações do evento"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-white/5 rounded-2xl text-sm font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 py-4 bg-primary rounded-2xl text-sm font-bold uppercase tracking-widest text-black hover:scale-105 transition-all disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar Evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Events;
