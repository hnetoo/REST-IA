import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Eye, EyeOff } from 'lucide-react';

const OwnerLoginSimple = () => {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pin === '0000') {
      // Login SIMPLES - sem complexidade
      localStorage.setItem('owner_logged_in', 'true');
      navigate('/owner/dashboard');
    } else {
      setError('PIN incorreto');
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-md">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-[#06b6d4] to-[#0891b2] rounded-3xl flex items-center justify-center shadow-xl">
                <Smartphone className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Owner Access</h1>
            <p className="text-sm text-slate-400">Tasca do Vereda</p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* PIN Display */}
            <div className="text-center">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                Código de Acesso
              </label>
              <div className="flex justify-center gap-3 mb-6">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                      pin[index] 
                        ? 'border-[#06b6d4] bg-[#06b6d4]/20 text-white shadow-lg shadow-[#06b6d4]/25' 
                        : 'border-white/20 bg-white/5 text-white/50'
                    }`}
                  >
                    {showPin ? pin[index] : pin[index] ? '•' : ''}
                  </div>
                ))}
              </div>
              
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1 mx-auto"
              >
                {showPin ? <EyeOff size={12} /> : <Eye size={12} />}
                {showPin ? 'Ocultar' : 'Mostrar'} PIN
              </button>
            </div>

            {/* Teclado Numérico */}
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPin(prev => prev + num.toString())}
                  className="h-16 rounded-2xl bg-white/10 border border-white/20 text-lg font-bold hover:bg-white/20 transition-all active:scale-95"
                  disabled={pin.length >= 4}
                >
                  {num}
                </button>
              ))}
              
              <button
                type="button"
                onClick={() => { setPin(''); setError(''); }}
                className="h-16 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-400 font-bold hover:bg-red-500/30 transition-all active:scale-95"
              >
                Limpar
              </button>
              
              <button
                type="button"
                onClick={() => setPin((prev) => prev + '0')}
                className="h-16 rounded-2xl bg-white/10 border border-white/20 text-lg font-bold hover:bg-white/20 transition-all active:scale-95"
                disabled={pin.length >= 4}
              >
                0
              </button>
              
              <button
                type="button"
                onClick={() => setPin((prev) => prev.slice(0, -1))}
                className="h-16 rounded-2xl bg-orange-500/20 border border-orange-500/30 text-orange-400 font-bold hover:bg-orange-500/30 transition-all active:scale-95 flex items-center justify-center"
              >
                ←
              </button>
            </div>

            {/* Erro */}
            {error && (
              <div className="text-center">
                <p className="text-red-400 text-sm font-medium bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  {error}
                </p>
              </div>
            )}

            {/* Botão de Entrar */}
            <button
              type="submit"
              disabled={pin.length !== 4}
              className="w-full py-4 bg-gradient-to-r from-[#06b6d4] to-[#0891b2] text-black rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 disabled:scale-100"
            >
              Entrar
            </button>
          </form>

          {/* Informações */}
          <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded-2xl">
            <h3 className="text-sm font-bold text-white mb-2 text-center">🔐 Acesso Restrito</h3>
            <p className="text-xs text-slate-400 text-center leading-relaxed">
              Área exclusiva para o proprietário.
            </p>
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-xs text-slate-500 text-center">
                PIN padrão: <span className="text-[#06b6d4] font-mono">0000</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerLoginSimple;
