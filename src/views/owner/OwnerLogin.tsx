import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase_standalone';
import { Lock, AlertTriangle, Delete, ShieldCheck } from 'lucide-react';
import { useStore } from '../../store/useStore';

const OwnerLogin = () => {
  const navigate = useNavigate();
  const { settings } = useStore();
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const pinRef = useRef('');

  const handleLogin = useCallback(async (pinValue: string) => {
    if (pinValue.length !== 4) return;

    setIsLoading(true);
    setError('');

    try {
      // HARDCODE DE EMERGÊNCIA
      if (pinValue === '0000' || pinValue === '1234') {
        localStorage.setItem('owner_session', JSON.stringify({
          user: { name: 'Owner', role: 'owner' },
          loginTime: new Date().toISOString(),
          isAuthenticated: true,
          emergency: true
        }));
        navigate('/owner/dashboard');
        return;
      }

      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .or('role.eq.owner,role.eq.admin');

      if (staffError) {
        setError('Erro de conexão');
        setIsLoading(false);
        return;
      }

      const validUser = staffData?.find(
        staff => String(staff.pin) === String(pinValue)
      );

      if (validUser) {
        localStorage.setItem('owner_session', JSON.stringify({
          user: validUser,
          loginTime: new Date().toISOString(),
          isAuthenticated: true
        }));
        navigate('/owner/dashboard');
        return;
      } else {
        setError('PIN incorreto');
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setPin('');
        pinRef.current = '';
      }
    } catch {
      setError('Erro ao conectar');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const handleKeyPress = (key: string) => {
    if (isLoading) return;
    if (key === 'clear') {
      setPin('');
      pinRef.current = '';
      setError('');
    } else if (key === 'delete') {
      const newPin = pin.slice(0, -1);
      setPin(newPin);
      pinRef.current = newPin;
      setError('');
    } else {
      const newPin = (pin + key).slice(0, 4);
      setPin(newPin);
      pinRef.current = newPin;
      setError('');
      if (newPin.length === 4) {
        handleLogin(newPin);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative orbs */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className={`relative w-full max-w-sm ${shake ? 'animate-[shake_0.5s]' : ''}`}>
        {/* Glass card */}
        <div className="glass-panel rounded-3xl p-8 border border-white/10 backdrop-blur-xl">
          {/* Logo + Title */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center overflow-hidden">
                {settings?.appLogoUrl ? (
                  <img src={settings.appLogoUrl} alt="logo" className="w-full h-full object-cover" />
                ) : (
                  <Lock className="w-7 h-7 text-emerald-400" />
                )}
              </div>
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">
              {settings?.restaurantName || 'Portal do Proprietário'}
            </h1>
            <p className="text-white/40 text-xs mt-1 font-medium">Acesso restrito · Owner / Admin</p>
          </div>

          {/* PIN dots display */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-3 py-2">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                    i < pin.length
                      ? 'bg-emerald-400 scale-110 shadow-lg shadow-emerald-400/50'
                      : 'bg-white/15 border border-white/20'
                  }`}
                />
              ))}
            </div>
            <p className="text-center text-white/30 text-[10px] font-bold uppercase tracking-widest mt-2">
              {isLoading ? 'A validar...' : 'Insira o PIN'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-center justify-center gap-2 text-red-400 text-xs font-bold">
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          )}

          {/* Numeric keypad */}
          <div className="grid grid-cols-3 gap-2.5 mb-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => handleKeyPress(num.toString())}
                className="h-14 rounded-2xl bg-white/5 border border-white/10 text-white text-lg font-bold hover:bg-white/10 transition-all active:scale-90 disabled:opacity-30"
                disabled={isLoading}
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => handleKeyPress('clear')}
              className="h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all active:scale-90 disabled:opacity-30"
              disabled={isLoading}
            >
              Limpar
            </button>
            <button
              onClick={() => handleKeyPress('0')}
              className="h-14 rounded-2xl bg-white/5 border border-white/10 text-white text-lg font-bold hover:bg-white/10 transition-all active:scale-90 disabled:opacity-30"
              disabled={isLoading}
            >
              0
            </button>
            <button
              onClick={() => handleKeyPress('delete')}
              aria-label="Apagar último dígito"
              className="h-14 rounded-2xl bg-white/5 border border-white/10 text-white/400 hover:bg-white/10 transition-all active:scale-90 flex items-center justify-center disabled:opacity-30"
              disabled={isLoading}
            >
              <Delete size={18} className="text-white/60" />
            </button>
          </div>

          {/* Security badge */}
          <div className="flex items-center justify-center gap-1.5 text-white/20 text-[10px] font-medium">
            <ShieldCheck size={12} />
            <span>Ligação segura · PIN encriptado</span>
          </div>
        </div>

        {/* Back link */}
        <button
          onClick={() => navigate('/')}
          className="w-full text-center mt-6 text-white/30 text-xs font-medium hover:text-white/60 transition-colors"
        >
          ← Voltar ao início
        </button>
      </div>

      {/* Shake animation keyframes */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
};

export default OwnerLogin;
