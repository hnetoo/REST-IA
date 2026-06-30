/**
 * EventService - Gestão completa de Eventos e Pacotes
 * Backend service para operações CRUD de eventos, pacotes e consumo
 */

import { supabase } from '../supabase_standalone';

// ============================================
// TIPOS
// ============================================

export type EventType = 'ANIVERSARIO' | 'CASAMENTO' | 'ALUGUER_TOTAL' | 'ALUGUER_PARCIAL' | 
                        'SHOW_INTIMISTA' | 'CORPORATIVO' | 'BATIZADO' | 'OUTRO';

export type EventStatus = 'PLANEADO' | 'CONFIRMADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';

export type EventArea = 'SALA_PRINCIPAL' | 'TERRACO' | 'SALAO_PRIVADO' | 'RESTAURANTE_INTEIRO';

export type ConsumptionType = 'ILIMITADO' | 'LIMITADO' | 'PACOTE_FECHADO' | 'CONSUMO_POS';

export type EventOrderType = 'INCLUIDO' | 'EXTRA';

export interface PackageItem {
  product_id?: string;
  name: string;
  quantity_per_person: number;
  unlimited: boolean;
}

export interface EventPackage {
  id: string;
  name: string;
  description?: string;
  event_type?: EventType;
  min_guests?: number;
  max_guests?: number;
  included_items: PackageItem[];
  base_price: number;
  price_per_person: number;
  allowed_areas: EventArea[];
  is_active: boolean;
  duration_hours: number;
  created_at: string;
  updated_at: string;
}

export interface ExternalSupplier {
  name: string;
  type: string;
  phone: string;
  cost?: number;
}

export interface EventSchedule {
  time: string;
  activity: string;
  responsible?: string;
}

export interface Event {
  id: string;
  name: string;
  type: EventType;
  status: EventStatus;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  start_date: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  area?: EventArea;
  tables_reserved: number[];
  guests_count: number;
  guests_confirmed?: number;
  package_id?: string;
  package?: EventPackage;
  included_items: PackageItem[];
  consumption_mode: ConsumptionType;
  base_amount: number;
  extras_amount: number;
  deposit_amount: number;
  final_amount: number;
  notes?: string;
  special_requests?: string;
  assigned_staff: string[];
  external_suppliers: ExternalSupplier[];
  schedule: EventSchedule[];
  created_at: string;
  updated_at: string;
  created_by?: string;
  
  // Campos específicos para shows de artistas
  artist_name?: string;
  artist_fee?: number;
  ticket_price?: number;
  tickets_sold?: number;
  includes_standard_meal?: boolean;
  standard_meal_cost_per_person?: number;
  show_setup_time?: string;
  show_soundcheck_time?: string;
  show_start_time?: string;
  show_end_time?: string;
  estimated_profit?: number;
  break_even_point?: number;
}

export interface EventOrder {
  id: string;
  event_id: string;
  order_id: string;
  order_type: EventOrderType;
  table_number?: number;
  is_unlimited: boolean;
  unlimited_type?: string;
  created_at: string;
  updated_at: string;
  // Campos do pedido original
  total_amount?: number;
  items?: any[];
}

// ============================================
// GESTÃO DE SHOWS DE ARTISTAS
// ============================================

export interface ShowExpense {
  id: string;
  event_id: string;
  expense_type: 'ARTIST_FEE' | 'TRANSPORT' | 'EQUIPMENT' | 'STAFF' | 'MARKETING' | 'OTHER';
  description?: string;
  amount: number;
  paid: boolean;
  paid_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ShowRevenue {
  id: string;
  event_id: string;
  revenue_type: 'TICKETS' | 'SPONSORSHIP' | 'MERCHANDISE' | 'POS_SALES';
  description?: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface ShowProfitCalculation {
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  profitMargin: number;
  breakEvenPoint: number;
  isProfitable: boolean;
}

// ============================================
// SERVIÇO DE PACOTES
// ============================================

export const EventPackageService = {
  /**
   * Listar todos os pacotes ativos
   */
  async listPackages(): Promise<EventPackage[]> {
    const { data, error } = await supabase
      .from('event_packages')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('[EventPackageService] Erro ao listar pacotes:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Buscar pacotes por tipo de evento
   */
  async getPackagesByType(eventType: EventType): Promise<EventPackage[]> {
    const { data, error } = await supabase
      .from('event_packages')
      .select('*')
      .eq('is_active', true)
      .or(`event_type.eq.${eventType},event_type.is.null`)
      .order('name');

    if (error) {
      console.error('[EventPackageService] Erro ao buscar pacotes por tipo:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Buscar pacote por ID
   */
  async getPackageById(id: string): Promise<EventPackage | null> {
    const { data, error } = await supabase
      .from('event_packages')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('[EventPackageService] Erro ao buscar pacote:', error);
      throw error;
    }

    return data;
  },

  /**
   * Criar novo pacote
   */
  async createPackage(pkg: Omit<EventPackage, 'id' | 'created_at' | 'updated_at'>): Promise<EventPackage> {
    const { data, error } = await supabase
      .from('event_packages')
      .insert({
        ...pkg,
        included_items: pkg.included_items || [],
        allowed_areas: pkg.allowed_areas || []
      })
      .select()
      .single();

    if (error) {
      console.error('[EventPackageService] Erro ao criar pacote:', error);
      throw error;
    }

    console.log('[EventPackageService] Pacote criado:', data.id);
    return data;
  },

  /**
   * Atualizar pacote
   */
  async updatePackage(id: string, updates: Partial<EventPackage>): Promise<EventPackage> {
    const { data, error } = await supabase
      .from('event_packages')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[EventPackageService] Erro ao atualizar pacote:', error);
      throw error;
    }

    return data;
  },

  /**
   * Desativar pacote (soft delete)
   */
  async deactivatePackage(id: string): Promise<void> {
    const { error } = await supabase
      .from('event_packages')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('[EventPackageService] Erro ao desativar pacote:', error);
      throw error;
    }
  },

  /**
   * Calcular preço estimado de um pacote
   */
  calculatePackagePrice(pkg: EventPackage, guests: number): number {
    if (guests < (pkg.min_guests || 1)) {
      throw new Error(`Mínimo de ${pkg.min_guests} convidados para este pacote`);
    }
    if (pkg.max_guests && guests > pkg.max_guests) {
      throw new Error(`Máximo de ${pkg.max_guests} convidados para este pacote`);
    }

    return (pkg.base_price || 0) + (guests * (pkg.price_per_person || 0));
  }
};

// ============================================
// SERVIÇO DE EVENTOS
// ============================================

export const EventService = {
  /**
   * Listar todos os eventos (com filtro opcional)
   */
  async listEvents(filters?: {
    status?: EventStatus;
    type?: EventType;
    startDate?: string;
    endDate?: string;
  }): Promise<Event[]> {
    let query = supabase
      .from('events')
      .select('*, package:event_packages(*)')
      .order('start_date', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    if (filters?.startDate) {
      query = query.gte('start_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('start_date', filters.endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[EventService] Erro ao listar eventos:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Buscar evento por ID (com detalhes completos)
   */
  async getEventById(id: string): Promise<Event | null> {
    const { data, error } = await supabase
      .from('events')
      .select('*, package:event_packages(*), event_orders(*)')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('[EventService] Erro ao buscar evento:', error);
      throw error;
    }

    return data;
  },

  /**
   * Buscar eventos de uma data específica
   */
  async getEventsByDate(date: string): Promise<Event[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*, package:event_packages(*)')
      .eq('start_date', date)
      .order('start_time');

    if (error) {
      console.error('[EventService] Erro ao buscar eventos por data:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Buscar eventos ativos (em andamento ou confirmados para hoje)
   */
  async getActiveEvents(): Promise<Event[]> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('events')
      .select('*, package:event_packages(*)')
      .or(`status.eq.EM_ANDAMENTO,and(status.eq.CONFIRMADO,start_date.eq.${today})`)
      .order('start_time');

    if (error) {
      console.error('[EventService] Erro ao buscar eventos ativos:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Criar novo evento
   */
  async createEvent(event: Omit<Event, 'id' | 'created_at' | 'updated_at' | 'final_amount'>): Promise<Event> {
    // Calcular final_amount
    const finalAmount = (event.base_amount || 0) + (event.extras_amount || 0);

    // Se tiver pacote, buscar itens padrão
    let includedItems = event.included_items || [];
    if (event.package_id && !includedItems.length) {
      const pkg = await EventPackageService.getPackageById(event.package_id);
      if (pkg) {
        includedItems = pkg.included_items;
      }
    }

    const { data, error } = await supabase
      .from('events')
      .insert({
        ...event,
        included_items: includedItems,
        final_amount: finalAmount,
        status: event.status || 'PLANEADO'
      })
      .select('*, package:event_packages(*)')
      .single();

    if (error) {
      console.error('[EventService] Erro ao criar evento:', error);
      throw error;
    }

    // Reservar mesas se especificado
    if (event.tables_reserved?.length > 0) {
      await this.reserveTablesForEvent(data.id, event.tables_reserved);
    }

    console.log('[EventService] Evento criado:', data.id);
    return data;
  },

  /**
   * Atualizar evento
   */
  async updateEvent(id: string, updates: Partial<Event>): Promise<Event> {
    // Recalcular final_amount se valores mudaram
    if (updates.base_amount !== undefined || updates.extras_amount !== undefined) {
      const current = await this.getEventById(id);
      if (current) {
        updates.final_amount = 
          (updates.base_amount ?? current.base_amount) + 
          (updates.extras_amount ?? current.extras_amount);
      }
    }

    const { data, error } = await supabase
      .from('events')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*, package:event_packages(*)')
      .single();

    if (error) {
      console.error('[EventService] Erro ao atualizar evento:', error);
      throw error;
    }

    // Atualizar reserva de mesas se mudou
    if (updates.tables_reserved !== undefined) {
      // Liberar mesas antigas
      await supabase
        .from('pos_tables')
        .update({ event_id: null, event_reserved: false })
        .eq('event_id', id);

      // Reservar novas mesas
      if (updates.tables_reserved.length > 0) {
        await this.reserveTablesForEvent(id, updates.tables_reserved);
      }
    }

    return data;
  },

  /**
   * Mudar status do evento
   */
  async changeEventStatus(id: string, status: EventStatus): Promise<void> {
    const { error } = await supabase
      .from('events')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('[EventService] Erro ao mudar status:', error);
      throw error;
    }

    // Se concluído ou cancelado, liberar mesas
    if (status === 'CONCLUIDO' || status === 'CANCELADO') {
      await supabase
        .from('pos_tables')
        .update({ event_id: null, event_reserved: false })
        .eq('event_id', id);
    }
  },

  /**
   * Reservar mesas para evento
   */
  async reserveTablesForEvent(eventId: string, tableIds: number[]): Promise<void> {
    const { error } = await supabase
      .from('pos_tables')
      .update({ 
        event_id: eventId, 
        event_reserved: true,
        status: 'RESERVADO'
      })
      .in('id', tableIds);

    if (error) {
      console.error('[EventService] Erro ao reservar mesas:', error);
      throw error;
    }
  },

  /**
   * Libertar mesas de um evento (após fechamento)
   */
  async releaseTablesFromEvent(eventId: string): Promise<void> {
    const { error } = await supabase
      .from('pos_tables')
      .update({ 
        event_id: null, 
        event_reserved: false,
        status: 'LIVRE'
      })
      .eq('event_id', eventId);

    if (error) {
      console.error('[EventService] Erro ao libertar mesas:', error);
      throw error;
    }
    console.log('[EventService] Mesas libertadas do evento:', eventId);
  },

  /**
   * Verificar mesas disponíveis para uma data
   */
  async getAvailableTables(date: string, excludeEventId?: string): Promise<number[]> {
    // Buscar mesas já reservadas para essa data
    let query = supabase
      .from('events')
      .select('tables_reserved')
      .eq('start_date', date)
      .not('status', 'in', '(CANCELADO,CONCLUIDO)');

    if (excludeEventId) {
      query = query.neq('id', excludeEventId);
    }

    const { data: reservedEvents, error } = await query;

    if (error) {
      console.error('[EventService] Erro ao buscar mesas reservadas:', error);
      throw error;
    }

    // Mesas reservadas
    const reservedTables = new Set<number>();
    reservedEvents?.forEach(event => {
      event.tables_reserved?.forEach((tableId: number) => reservedTables.add(tableId));
    });

    // Buscar todas as mesas
    const { data: allTables } = await supabase
      .from('pos_tables')
      .select('id');

    // Retornar mesas disponíveis
    return (allTables || [])
      .map(t => t.id)
      .filter(id => !reservedTables.has(id));
  },

  /**
   * Adicionar consumo extra ao evento (via POS)
   */
  async addOrderToEvent(
    eventId: string, 
    orderId: string, 
    orderType: EventOrderType = 'EXTRA',
    options?: {
      tableNumber?: number;
      isUnlimited?: boolean;
      unlimitedType?: string;
    }
  ): Promise<EventOrder> {
    // Criar vínculo
    const { data, error } = await supabase
      .from('event_orders')
      .insert({
        event_id: eventId,
        order_id: orderId,
        order_type: orderType,
        table_number: options?.tableNumber,
        is_unlimited: options?.isUnlimited || false,
        unlimited_type: options?.unlimitedType
      })
      .select()
      .single();

    if (error) {
      console.error('[EventService] Erro ao vincular pedido:', error);
      throw error;
    }

    // Atualizar pedido original
    await supabase
      .from('orders')
      .update({
        event_id: eventId,
        is_event_order: true,
        event_order_type: orderType
      })
      .eq('id', orderId);

    // Se for EXTRA, atualizar extras_amount do evento
    if (orderType === 'EXTRA') {
      const { data: order } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('id', orderId)
        .single();

      if (order?.total_amount) {
        await supabase.rpc('increment_event_extras', {
          event_id: eventId,
          amount: order.total_amount
        });
      }
    }

    return data;
  },

  /**
   * Buscar pedidos de um evento
   */
  async getEventOrders(eventId: string): Promise<EventOrder[]> {
    const { data, error } = await supabase
      .from('event_orders')
      .select(`
        *,
        order:orders(*)
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[EventService] Erro ao buscar pedidos:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Remover pedido do evento
   */
  async removeOrderFromEvent(eventOrderId: string): Promise<void> {
    // Buscar dados antes de remover
    const { data: eventOrder } = await supabase
      .from('event_orders')
      .select('*, order:orders(total_amount, event_id)')
      .eq('id', eventOrderId)
      .single();

    if (!eventOrder) return;

    // Se era EXTRA, subtrair do extras_amount
    if (eventOrder.order_type === 'EXTRA' && eventOrder.order?.total_amount) {
      await supabase.rpc('increment_event_extras', {
        event_id: eventOrder.order.event_id,
        amount: -eventOrder.order.total_amount
      });
    }

    // Remover vinculo
    await supabase
      .from('event_orders')
      .delete()
      .eq('id', eventOrderId);

    // Limpar flags do pedido original
    await supabase
      .from('orders')
      .update({
        event_id: null,
        is_event_order: false,
        event_order_type: null
      })
      .eq('id', eventOrder.order_id);
  },

  /**
   * Calcular resumo financeiro do evento
   */
  async getEventFinancialSummary(eventId: string): Promise<{
    baseAmount: number;
    extrasAmount: number;
    depositAmount: number;
    totalAmount: number;
    remainingAmount: number;
    unlimitedConsumption: { type: string; estimated: number }[];
  }> {
    const event = await this.getEventById(eventId);
    if (!event) throw new Error('Evento não encontrado');

    // Buscar pedidos para calcular consumo ilimitado
    const { data: eventOrders } = await supabase
      .from('event_orders')
      .select('*, order:orders(*)')
      .eq('event_id', eventId)
      .eq('is_unlimited', true);

    const unlimitedConsumption: { type: string; estimated: number }[] = [];
    
    if (eventOrders) {
      const unlimitedByType = eventOrders.reduce((acc, eo) => {
        const type = eo.unlimited_type || 'GERAL';
        acc[type] = (acc[type] || 0) + (eo.order?.total_amount || 0);
        return acc;
      }, {} as Record<string, number>);

      Object.entries(unlimitedByType).forEach(([type, amount]) => {
        unlimitedConsumption.push({ type, estimated: amount as number });
      });
    }

    return {
      baseAmount: event.base_amount || 0,
      extrasAmount: event.extras_amount || 0,
      depositAmount: event.deposit_amount || 0,
      totalAmount: event.final_amount || 0,
      remainingAmount: (event.final_amount || 0) - (event.deposit_amount || 0),
      unlimitedConsumption
    };
  },

  /**
   * Gerar cronograma padrão baseado no tipo de evento
   */
  generateDefaultSchedule(eventType: EventType, startTime: string): EventSchedule[] {
    const [hours, minutes] = startTime.split(':').map(Number);
    const schedules: Record<EventType, EventSchedule[]> = {
      'ANIVERSARIO': [
        { time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`, activity: 'Chegada dos convidados', responsible: 'Recepção' },
        { time: `${(hours + 1).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`, activity: 'Jantar/Buffet', responsible: 'Cozinha' },
        { time: `${(hours + 3).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`, activity: 'Bolo e Parabéns', responsible: 'Garçom' },
      ],
      'CASAMENTO': [
        { time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`, activity: 'Cerimónia/Chegada', responsible: 'Recepção' },
        { time: `${(hours + 1).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`, activity: 'Jantar', responsible: 'Cozinha' },
        { time: `${(hours + 3).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`, activity: 'Discursos e Brindes', responsible: 'Cerimonial' },
        { time: `${(hours + 4).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`, activity: 'Dança/Festa', responsible: 'DJ' },
      ],
      'CORPORATIVO': [
        { time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`, activity: 'Recepção e Coffee Break', responsible: 'Recepção' },
        { time: `${(hours + 2).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`, activity: 'Almoço/Jantar', responsible: 'Cozinha' },
      ],
      'ALUGUER_TOTAL': [
        { time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`, activity: 'Entrega do espaço', responsible: 'Gestão' },
        { time: `${(hours + 6).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`, activity: 'Encerramento e Limpeza', responsible: 'Equipe' },
      ],
      'ALUGUER_PARCIAL': [
        { time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`, activity: 'Início do evento', responsible: 'Recepção' },
        { time: `${(hours + 4).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`, activity: 'Encerramento', responsible: 'Recepção' },
      ],
      'SHOW_INTIMISTA': [
        { time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`, activity: 'Abertura de portas', responsible: 'Recepção' },
        { time: `${(hours + 1).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`, activity: 'Início do Show', responsible: 'Artista' },
        { time: `${(hours + 3).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`, activity: 'Encerramento', responsible: 'Artista' },
      ],
      'BATIZADO': [
        { time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`, activity: 'Cerimónia Religiosa', responsible: 'Família' },
        { time: `${(hours + 2).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`, activity: 'Recepção e Almoço', responsible: 'Cozinha' },
        { time: `${(hours + 4).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`, activity: 'Bolo e Festa', responsible: 'Garçom' },
      ],
      'OUTRO': [
        { time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`, activity: 'Início do evento', responsible: 'Recepção' },
      ]
    };

    return schedules[eventType] || schedules['OUTRO'];
  },

  /**
   * Apagar evento permanentemente
   */
  async deleteEvent(id: string): Promise<void> {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[EventService] Erro ao apagar evento:', error);
      throw error;
    }

    // Liberar mesas associadas
    await supabase
      .from('pos_tables')
      .update({ event_id: null, event_reserved: false })
      .eq('event_id', id);

    console.log('[EventService] Evento apagado:', id);
  },
  async checkScheduleConflict(
    date: string, 
    startTime: string, 
    durationHours: number,
    excludeEventId?: string
  ): Promise<{ hasConflict: boolean; conflictingEvents?: Event[] }> {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = startMinutes + (durationHours * 60);

    // Buscar eventos na mesma data
    let query = supabase
      .from('events')
      .select('*')
      .eq('start_date', date)
      .not('status', 'in', '(CANCELADO,CONCLUIDO)');

    if (excludeEventId) {
      query = query.neq('id', excludeEventId);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error('[EventService] Erro ao verificar conflitos:', error);
      throw error;
    }

    // Verificar sobreposição de horários
    const conflicts = (events || []).filter(event => {
      if (!event.start_time || !event.end_time) return false;

      const [eStartHour, eStartMin] = event.start_time.split(':').map(Number);
      const [eEndHour, eEndMin] = event.end_time.split(':').map(Number);
      
      const eStartMinutes = eStartHour * 60 + eStartMin;
      const eEndMinutes = eEndHour * 60 + eEndMin;

      // Verificar sobreposição
      return (startMinutes < eEndMinutes && endMinutes > eStartMinutes);
    });

    return {
      hasConflict: conflicts.length > 0,
      conflictingEvents: conflicts.length > 0 ? conflicts : undefined
    };
  }
};

// ============================================
// SERVIÇO DE GESTÃO DE SHOWS
// ============================================

export const ShowService = {
  /**
   * Calcular lucro estimado do show
   */
  async calculateProfit(eventId: string): Promise<ShowProfitCalculation> {
    console.log('[ShowService] Calculando lucro para evento:', eventId);
    
    // Buscar gastos
    const { data: expenses, error: expensesError } = await supabase
      .from('show_expenses')
      .select('expense_type, amount')
      .eq('event_id', eventId);
    
    if (expensesError) {
      console.error('[ShowService] Erro ao buscar gastos:', expensesError);
      throw expensesError;
    }
    
    const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
    
    // Buscar receitas
    const { data: revenues, error: revenuesError } = await supabase
      .from('show_revenue')
      .select('amount')
      .eq('event_id', eventId);
    
    if (revenuesError) {
      console.error('[ShowService] Erro ao buscar receitas:', revenuesError);
      throw revenuesError;
    }
    
    const totalRevenue = revenues?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
    
    // Buscar dados do evento para incluir vendas do POS
    const event = await EventService.getEventById(eventId);
    if (!event) {
      throw new Error('Evento não encontrado');
    }
    
    // Adicionar vendas do POS (extras) às receitas
    const posRevenue = event.extras_amount || 0;
    const finalRevenue = totalRevenue + posRevenue;
    
    // Adicionar cachê do artista se não estiver nos gastos
    let finalExpenses = totalExpenses;
    if (event.artist_fee && event.artist_fee > 0) {
      // Verificar se já existe gasto de artista
      const artistExpenseExists = expenses?.some(
        e => e.expense_type === 'ARTIST_FEE'
      );
      
      if (!artistExpenseExists) {
        finalExpenses += event.artist_fee;
      }
    }
    
    // Adicionar custo de refeição padrão se aplicável
    if (event.includes_standard_meal && event.standard_meal_cost_per_person) {
      const mealCost = (event.standard_meal_cost_per_person || 0) * event.guests_count;
      finalExpenses += mealCost;
    }
    
    // Cálculos
    const profit = finalRevenue - finalExpenses;
    const profitMargin = finalRevenue > 0 ? (profit / finalRevenue) * 100 : 0;
    const breakEvenPoint = finalExpenses;
    const isProfitable = profit >= 0;
    
    console.log('[ShowService] Cálculo de lucro:', {
      totalRevenue: finalRevenue,
      totalExpenses: finalExpenses,
      profit,
      profitMargin,
      breakEvenPoint,
      isProfitable
    });
    
    return {
      totalRevenue: finalRevenue,
      totalExpenses,
      profit,
      profitMargin,
      breakEvenPoint,
      isProfitable
    };
  },

  /**
   * Adicionar gasto ao show
   */
  async addExpense(expense: Omit<ShowExpense, 'id' | 'created_at' | 'updated_at'>): Promise<ShowExpense> {
    console.log('[ShowService] Adicionando gasto:', expense);
    
    const { data, error } = await supabase
      .from('show_expenses')
      .insert(expense)
      .select()
      .single();
    
    if (error) {
      console.error('[ShowService] Erro ao adicionar gasto:', error);
      throw error;
    }
    
    // Atualizar cálculo de lucro no evento
    await this.updateProfitCalculation(expense.event_id);
    
    console.log('[ShowService] Gasto adicionado:', data.id);
    return data;
  },

  /**
   * Atualizar gasto existente
   */
  async updateExpense(id: string, updates: Partial<ShowExpense>): Promise<ShowExpense> {
    console.log('[ShowService] Atualizando gasto:', id);
    
    const { data, error } = await supabase
      .from('show_expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('[ShowService] Erro ao atualizar gasto:', error);
      throw error;
    }
    
    // Atualizar cálculo de lucro no evento
    if (data?.event_id) {
      await this.updateProfitCalculation(data.event_id);
    }
    
    return data;
  },

  /**
   * Remover gasto
   */
  async deleteExpense(id: string): Promise<void> {
    console.log('[ShowService] Removendo gasto:', id);
    
    // Buscar event_id antes de remover
    const { data: expense } = await supabase
      .from('show_expenses')
      .select('event_id')
      .eq('id', id)
      .single();
    
    const { error } = await supabase
      .from('show_expenses')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('[ShowService] Erro ao remover gasto:', error);
      throw error;
    }
    
    // Atualizar cálculo de lucro no evento
    if (expense?.event_id) {
      await this.updateProfitCalculation(expense.event_id);
    }
    
    console.log('[ShowService] Gasto removido:', id);
  },

  /**
   * Buscar gastos de um evento
   */
  async getExpenses(eventId: string): Promise<ShowExpense[]> {
    console.log('[ShowService] Buscando gastos do evento:', eventId);
    
    const { data, error } = await supabase
      .from('show_expenses')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[ShowService] Erro ao buscar gastos:', error);
      throw error;
    }
    
    return data || [];
  },

  /**
   * Adicionar receita ao show
   */
  async addRevenue(revenue: Omit<ShowRevenue, 'id' | 'created_at' | 'updated_at'>): Promise<ShowRevenue> {
    console.log('[ShowService] Adicionando receita:', revenue);
    
    const { data, error } = await supabase
      .from('show_revenue')
      .insert(revenue)
      .select()
      .single();
    
    if (error) {
      console.error('[ShowService] Erro ao adicionar receita:', error);
      throw error;
    }
    
    // Atualizar cálculo de lucro no evento
    await this.updateProfitCalculation(revenue.event_id);
    
    console.log('[ShowService] Receita adicionada:', data.id);
    return data;
  },

  /**
   * Atualizar receita existente
   */
  async updateRevenue(id: string, updates: Partial<ShowRevenue>): Promise<ShowRevenue> {
    console.log('[ShowService] Atualizando receita:', id);
    
    const { data, error } = await supabase
      .from('show_revenue')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('[ShowService] Erro ao atualizar receita:', error);
      throw error;
    }
    
    // Atualizar cálculo de lucro no evento
    if (data?.event_id) {
      await this.updateProfitCalculation(data.event_id);
    }
    
    return data;
  },

  /**
   * Remover receita
   */
  async deleteRevenue(id: string): Promise<void> {
    console.log('[ShowService] Removendo receita:', id);
    
    // Buscar event_id antes de remover
    const { data: revenue } = await supabase
      .from('show_revenue')
      .select('event_id')
      .eq('id', id)
      .single();
    
    const { error } = await supabase
      .from('show_revenue')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('[ShowService] Erro ao remover receita:', error);
      throw error;
    }
    
    // Atualizar cálculo de lucro no evento
    if (revenue?.event_id) {
      await this.updateProfitCalculation(revenue.event_id);
    }
    
    console.log('[ShowService] Receita removida:', id);
  },

  /**
   * Buscar receitas de um evento
   */
  async getRevenues(eventId: string): Promise<ShowRevenue[]> {
    console.log('[ShowService] Buscando receitas do evento:', eventId);
    
    const { data, error } = await supabase
      .from('show_revenue')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[ShowService] Erro ao buscar receitas:', error);
      throw error;
    }
    
    return data || [];
  },

  /**
   * Atualizar cálculo de lucro no evento
   */
  async updateProfitCalculation(eventId: string): Promise<void> {
    console.log('[ShowService] Atualizando cálculo de lucro para evento:', eventId);
    
    try {
      const profit = await this.calculateProfit(eventId);
      
      const { error } = await supabase
        .from('events')
        .update({
          estimated_profit: profit.profit,
          break_even_point: profit.breakEvenPoint,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);
      
      if (error) {
        console.error('[ShowService] Erro ao atualizar cálculo de lucro:', error);
        throw error;
      }
      
      console.log('[ShowService] Cálculo de lucro atualizado:', profit);
    } catch (error) {
      console.error('[ShowService] Erro ao atualizar cálculo de lucro:', error);
      throw error;
    }
  },

  /**
   * Obter resumo completo do show
   */
  async getShowSummary(eventId: string): Promise<{
    event: Event;
    profit: ShowProfitCalculation;
    expenses: ShowExpense[];
    revenues: ShowRevenue[];
    posOrders: EventOrder[];
  }> {
    console.log('[ShowService] Buscando resumo completo do show:', eventId);
    
    const [event, profit, expenses, revenues, posOrders] = await Promise.all([
      EventService.getEventById(eventId),
      this.calculateProfit(eventId),
      this.getExpenses(eventId),
      this.getRevenues(eventId),
      EventService.getEventOrders(eventId)
    ]);
    
    if (!event) {
      throw new Error('Evento não encontrado');
    }
    
    return {
      event,
      profit,
      expenses,
      revenues,
      posOrders
    };
  }
};

// Exportar serviço completo
export default EventService;
