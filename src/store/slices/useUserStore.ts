import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, PermissionTemplate, Employee, AttendanceRecord, WorkShift } from '../../../types';
import { MOCK_USERS } from '../../../constants';
import { supabase } from '../../supabase_standalone';

interface UserState {
  // Estado
  users: User[];
  currentUser: User | null;
  permissionTemplates: PermissionTemplate[];
  employees: Employee[];
  attendance: AttendanceRecord[];
  workShifts: WorkShift[];

  // Ações de auth
  login: (pin: string, userId?: string) => boolean;
  logout: () => void;

  // Ações de usuários
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  removeUser: (id: string) => void;

  // Ações de permissões
  addPermissionTemplate: (template: PermissionTemplate) => void;
  updatePermissionTemplate: (template: PermissionTemplate) => void;
  removePermissionTemplate: (id: string) => void;

  // Ações de funcionários
  addEmployee: (e: Employee) => void;
  addEmployeeWithPersistence: (e: Employee) => Promise<void>;
  updateEmployee: (e: Employee) => void;
  updateEmployeeWithPersistence: (e: Employee) => Promise<boolean>;
  removeEmployee: (id: string) => void;
  loadEmployees: () => Promise<void>;

  // Ações de ponto
  clockIn: (employeeId: string) => void;
  clockOut: (employeeId: string) => void;
  externalClockSync: (bioId: string) => void;

  // Ações de turnos
  addWorkShift: (shift: WorkShift) => void;
  updateWorkShift: (shift: WorkShift) => void;
  removeWorkShift: (id: string) => void;
}

export const useUserStore = create<UserState>()(
  // persist(
    (set, get) => ({
      // Estado inicial
      users: [
        ...MOCK_USERS,
        {
          id: '5',
          name: 'Proprietário',
          role: 'OWNER',
          pin: '0000',
          permissions: [
            'POS_SALES', 'POS_VOID', 'POS_DISCOUNT', 'FINANCE_VIEW',
            'STOCK_MANAGE', 'STAFF_MANAGE', 'SYSTEM_CONFIG', 'OWNER_ACCESS', 'AGT_CONFIG'
          ],
          status: 'ATIVO'
        }
      ],
      currentUser: null,
      permissionTemplates: [
        { id: 'tp-waiter', name: 'Perfil Garçom', description: 'Permissões básicas para atendimento de mesas.', permissions: ['POS_SALES'] },
        { id: 'tp-cashier', name: 'Perfil Caixa', description: 'Acesso a vendas e descontos.', permissions: ['POS_SALES', 'POS_DISCOUNT'] },
        { id: 'tp-manager', name: 'Perfil Gerente', description: 'Acesso total operativo e financeiro.', permissions: ['POS_SALES', 'POS_VOID', 'POS_DISCOUNT', 'FINANCE_VIEW', 'STOCK_MANAGE', 'STAFF_MANAGE'] },
        { id: 'tp-owner', name: 'Perfil Proprietário', description: 'Controlo total e acesso ao Owner Hub.', permissions: ['POS_SALES', 'POS_VOID', 'POS_DISCOUNT', 'FINANCE_VIEW', 'STOCK_MANAGE', 'STAFF_MANAGE', 'SYSTEM_CONFIG', 'OWNER_ACCESS', 'AGT_CONFIG'] }
      ],
      employees: [],
      attendance: [],
      workShifts: [],

      // Auth
      login: (pin, userId) => {
        const user = get().users.find((u) => (userId ? u.id === userId : true) && u.pin === pin);
        if (user) {
          set({ currentUser: user });
          return true;
        }
        return false;
      },

      logout: () => {
        localStorage.clear();
        set({ currentUser: null });
      },

      // Usuários
      addUser: (user) =>
        set((state) => ({ users: [...state.users, user] })),

      updateUser: (user) =>
        set((state) => ({
          users: state.users.map((u) => (u.id === user.id ? user : u))
        })),

      removeUser: (id) =>
        set((state) => ({
          users: state.users.filter((u) => u.id !== id)
        })),

      // Permissões
      addPermissionTemplate: (t) =>
        set((state) => ({ permissionTemplates: [...state.permissionTemplates, t] })),

      updatePermissionTemplate: (t) =>
        set((state) => ({
          permissionTemplates: state.permissionTemplates.map((x) => (x.id === t.id ? t : x))
        })),

      removePermissionTemplate: (id) =>
        set((state) => ({
          permissionTemplates: state.permissionTemplates.filter((x) => x.id !== id)
        })),

      // Funcionários
      addEmployee: (e) =>
        set((state) => ({ employees: [...state.employees, e] })),

      addEmployeeWithPersistence: async (e) => {
        try {
          const { error } = await supabase.from('staff').insert(e);
          if (error) throw error;
          get().addEmployee(e);
        } catch (error) {
          console.error('[addEmployeeWithPersistence] Erro:', error);
          throw error;
        }
      },

      updateEmployee: (e) =>
        set((state) => ({
          employees: state.employees.map((emp) => (emp.id === e.id ? e : emp))
        })),

      updateEmployeeWithPersistence: async (e) => {
        try {
          const { error } = await supabase.from('staff').update(e).eq('id', e.id);
          if (error) throw error;
          get().updateEmployee(e);
          return true;
        } catch (error) {
          console.error('[updateEmployeeWithPersistence] Erro:', error);
          return false;
        }
      },

      removeEmployee: (id) =>
        set((state) => ({
          employees: state.employees.filter((e) => e.id !== id)
        })),

      loadEmployees: async () => {
        try {
          const { data, error } = await supabase
            .from('staff')
            .select('id, name, role, pin, permissions, status, email, phone, bio_id')
            .eq('status', 'active');
          if (error) throw error;
          if (data) set({ employees: data as unknown as Employee[] });
        } catch (error) {
          console.error('[loadEmployees] Erro:', error);
        }
      },

      // Ponto
      clockIn: (employeeId) => {
        const record: AttendanceRecord = {
          id: `att-${Date.now()}`,
          employeeId,
          date: new Date().toISOString().split('T')[0],
          clockIn: new Date().toISOString(),
          clockOut: null as any
        };
        set((state) => ({ attendance: [...state.attendance, record] }));
      },

      clockOut: (employeeId) => {
        set((state) => ({
          attendance: state.attendance.map((a) =>
            a.employeeId === employeeId && !a.clockOut
              ? { ...a, clockOut: new Date().toISOString() }
              : a
          )
        }));
      },

      externalClockSync: (bioId) => {
        // Integração com relógio de ponto externo
        console.log('[externalClockSync] BioID:', bioId);
      },

      // Turnos
      addWorkShift: (shift) =>
        set((state) => ({ workShifts: [...state.workShifts, shift] })),

      updateWorkShift: (shift) =>
        set((state) => ({
          workShifts: state.workShifts.map((s) => (s.id === shift.id ? shift : s))
        })),

      removeWorkShift: (id) =>
        set((state) => ({
          workShifts: state.workShifts.filter((s) => s.id !== id)
        }))
    })
  // ),
  // {
  //   name: 'user-storage',
  //   partialize: (state) => ({
  //     users: state.users,
  //     permissionTemplates: state.permissionTemplates,
  //     employees: state.employees,
  //     workShifts: state.workShifts
  //   })
  // }
);
