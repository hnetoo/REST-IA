
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { supabase } from '../supabase_standalone';
import { ChefHat, Delete, User, Shield, Wallet, Utensils, ArrowLeft, ChevronRight, Check } from 'lucide-react';
import { User as UserType } from '../../types';
import appLogo from '/logo.png';

const Login = () => {
  const { login, users, settings } = useStore();
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [pin, setPin] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState(false);

  // Carregar operadores do Supabase ao abrir login (silencioso)
  useEffect(() => {
    if (users && users.length > 0) return; // já temos dados
    const loadFromSupabase = async () => {
      try {
        const { data, error } = await supabase
          .from('pos_operators')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(100);
        if (data && data.length > 0) {
          const mapped = data
            .filter((op: any) => op.role !== 'OWNER')
            .map((op: any) => ({
              id: op.id,
              name: op.name,
              role: op.role,
              pin: op.pin,
              permissions: op.permissions || [],
              status: op.status || 'ATIVO'
            }));
          useStore.setState({ users: mapped });
          localStorage.setItem('pos_operators_cache', JSON.stringify(mapped));
          console.log('[Login] ✅ Operadores carregados do Supabase:', mapped.length);
        }
      } catch (e) {
        console.log('[Login] ⚠️ Supabase offline, usando fallback embutido');
      }
    };
    loadFromSupabase();
  }, []);

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setError(false);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || pin.length < 4) return;
    
    // Limpar notificações de erro anteriores antes de tentar login
    const { removeNotification, notifications } = useStore.getState();
    notifications.forEach(n => removeNotification(n.id));
    
    try {
      // VERIFICAÇÃO ESTRITA: o PIN digitado TEM de corresponder ao PIN do utilizador selecionado
      const selectedPin = String(selectedUser.pin || '').trim();
      if (String(pin).trim() !== selectedPin) {
        console.log('[LOGIN] ❌ PIN incorreto para', selectedUser.name, '- esperado:', selectedPin, ', digitado:', pin);
        setError(true);
        setPin('');
        return;
      }
      
      // PIN correto para este utilizador — fazer login
      const success = login(pin, selectedUser.id);
      if (success) {
        navigate('/dashboard');
      } else {
        setError(true);
        setPin('');
      }
    } catch (e) {
      console.error("Erro crítico no login:", e);
      setError(true);
      setPin('');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN': return <Shield size={24} />;
      case 'CAIXA': return <Wallet size={24} />;
      case 'COZINHA': return <ChefHat size={24} />;
      case 'GARCOM': return <Utensils size={24} />;
      default: return <User size={24} />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'from-purple-500 to-indigo-600';
      case 'CAIXA': return 'from-blue-500 to-cyan-600';
      case 'COZINHA': return 'from-orange-500 to-red-600';
      case 'GARCOM': return 'from-green-500 to-emerald-600';
      default: return 'from-slate-500 to-slate-700';
    }
  };

  const renderLogo = () => {
    return (
      <img 
        src={appLogo} 
        alt="Tasca do Vereda" 
        className="w-auto h-16 mx-auto mb-4 object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500"
      />
    );
  };

  // Fallback: se state vazio, mostrar utilizadores embutidos (offline/Sem Supabase)
  const embeddedUsers: UserType[] = users?.length > 0 ? users : [
    { id: '1', name: 'Gerente', role: 'ADMIN' as any, pin: '1234', permissions: ['POS_SALES', 'POS_VOID', 'POS_DISCOUNT', 'FINANCE_VIEW', 'STOCK_MANAGE', 'STAFF_MANAGE', 'SYSTEM_CONFIG', 'AGT_CONFIG'] as any, status: 'ATIVO' as any },
    { id: '2', name: 'Operador de Caixa', role: 'CAIXA' as any, pin: '1111', permissions: ['POS_SALES', 'POS_DISCOUNT'] as any, status: 'ATIVO' as any },
    { id: '3', name: 'Chefe de Cozinha', role: 'COZINHA' as any, pin: '2222', permissions: [] as any, status: 'ATIVO' as any },
    { id: '4', name: 'Garçom', role: 'GARCOM' as any, pin: '3333', permissions: ['POS_SALES'] as any, status: 'ATIVO' as any },
  ];

  // Sempre incluir Admin Master no topo (emergência, não aparece no Supabase)
  const rawUserList = [
    { id: 'emergency-master', name: 'Admin Master', role: 'ADMIN' as any, pin: '0011', permissions: ['POS_SALES', 'POS_VOID', 'POS_DISCOUNT', 'FINANCE_VIEW', 'STOCK_MANAGE', 'STAFF_MANAGE', 'SYSTEM_CONFIG', 'AGT_CONFIG', 'OWNER_ACCESS'] as any, status: 'ATIVO' as any },
    ...embeddedUsers
  ];

  // Nunca mostrar OWNER na app principal
  const userList = rawUserList.filter(u => u.role !== 'OWNER');

  return (
    <div className="h-screen w-full bg-background flex items-center justify-center relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary rounded-full blur-[120px] animate-pulse"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[120px] animate-pulse [animation-delay:2s]"></div>
      </div>

      <div className="w-full max-w-xl z-10 px-6">
        <div className="text-center mb-6 animate-in fade-in slide-in-from-top-4 duration-700">
          {renderLogo()}
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
            {settings?.restaurantName || 'Tasca do Vereda'}
          </h1>
          <p className="text-slate-400 mt-2 font-medium tracking-widest text-xs uppercase">Sistema de Gestão Inteligente</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-white/5 shadow-2xl relative overflow-hidden min-h-[320px] flex flex-col justify-center">
            {!selectedUser ? (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="mb-8 text-center">
                        <h2 className="text-2xl font-bold text-white mb-1">Quem está a entrar?</h2>
                        <p className="text-slate-400 text-sm">Selecione o seu perfil de operador</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {userList.map((user) => (
                            <button
                                key={user.id}
                                onClick={() => setSelectedUser(user)}
                                className="group relative p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/50 hover:bg-white/10 transition-all duration-300 text-left overflow-hidden flex flex-col gap-2"
                            >
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getRoleColor(user.role)} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                    {getRoleIcon(user.role)}
                                </div>
                                <div>
                                    <p className="font-bold text-white group-hover:text-primary transition-colors">{user.name}</p>
                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">{user.role}</p>
                                </div>
                                <ChevronRight className="absolute right-3 bottom-3 text-slate-700 group-hover:text-primary group-hover:translate-x-1 transition-all" size={16} />
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                    <button 
                        onClick={() => { setSelectedUser(null); setPin(''); setError(false); }}
                        className="absolute top-6 left-6 p-2 rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                        aria-label="Voltar"
                    >
                        <ArrowLeft size={20} />
                    </button>

                    <div className="text-center mb-4 pt-2">
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getRoleColor(selectedUser.role)} flex items-center justify-center text-white shadow-xl mx-auto mb-2 border-4 border-background`}>
                            {getRoleIcon(selectedUser.role)}
                        </div>
                        <h2 className="text-2xl font-bold text-white">{selectedUser.name}</h2>
                        <p className="text-primary text-[10px] font-black tracking-[0.2em] uppercase mt-1">{selectedUser.role}</p>
                    </div>

                    <div className="mb-4">
                        <div className={`flex justify-center gap-4 mb-4 ${error ? 'animate-shake' : ''}`}>
                            {[0, 1, 2, 3].map(i => (
                            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${pin.length > i ? 'bg-primary border-primary shadow-glow' : 'border-slate-700'}`}></div>
                            ))}
                        </div>
                        {error && <p className="text-center text-red-500 text-xs font-bold uppercase tracking-tighter animate-pulse">PIN Incorreto</p>}
                        {!error && <p className="text-center text-slate-500 text-[10px] font-bold uppercase tracking-widest h-5">Introduza o seu PIN</p>}
                    </div>

                    <div className="flex justify-center mb-4">
                        <label className="flex items-center gap-3 cursor-pointer group select-none">
                            <div className="relative">
                                <input 
                                    type="checkbox" 
                                    className="sr-only" 
                                    checked={rememberMe}
                                    onChange={() => setRememberMe(!rememberMe)}
                                />
                                <div className={`w-6 h-6 rounded-lg border-2 transition-all duration-300 flex items-center justify-center ${rememberMe ? 'bg-primary border-primary shadow-glow' : 'border-slate-700 bg-white/5 group-hover:border-slate-500'}`}>
                                    {rememberMe && <Check size={16} className="text-black stroke-[4px]" />}
                                </div>
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${rememberMe ? 'text-primary' : 'text-slate-500 group-hover:text-slate-400'}`}>
                                Lembrar-me neste dispositivo
                            </span>
                        </label>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-4 px-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                            <button 
                            key={num} 
                            onClick={() => handleNumberClick(num.toString())}
                            className="h-12 rounded-xl bg-white/5 hover:bg-primary hover:text-black text-lg font-bold text-slate-300 transition-all active:scale-95 border border-white/5"
                            >
                            {num}
                            </button>
                        ))}
                        <div className="h-12"></div>
                        <button 
                            onClick={() => handleNumberClick('0')}
                            className="h-12 rounded-xl bg-white/5 hover:bg-primary hover:text-black text-lg font-bold text-slate-300 transition-all active:scale-95 border border-white/5"
                        >
                            0
                        </button>
                        <button 
                            onClick={handleDelete}
                            className="h-12 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition-all active:scale-95 border border-red-500/20"
                            aria-label="Apagar dígito"
                        >
                            <Delete size={18} />
                        </button>
                    </div>

                    <button 
                        onClick={(e) => handleLogin(e)}
                        disabled={pin.length !== 4}
                        className="w-full py-3 bg-primary text-black rounded-xl font-black text-sm uppercase tracking-[0.2em] shadow-glow disabled:opacity-30 hover:brightness-110 active:scale-[0.98] transition-all"
                    >
                        AUTENTICAR
                    </button>
                </div>
            )}
        </div>
        <p className="text-center text-slate-600 text-[10px] mt-4 uppercase font-bold tracking-widest cursor-help hover:text-slate-400 transition-colors">
            Vereda Systems Angola © 2025
        </p>
      </div>
    </div>
  );
};

export default Login;




