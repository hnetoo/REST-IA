import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Lock, Eye, EyeOff } from 'lucide-react';

const OwnerMobileLogin = () => {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Credenciais fixas para o Owner Mobile (independente do sistema principal)
  const OWNER_CREDENTIALS = {
    pin: '0000',
    name: 'Proprietário',
    business: 'Tasca do Vereda'
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Simular delay de autenticação
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (pin === OWNER_CREDENTIALS.pin) {
        // Salvar sessão do Owner Mobile (independente)
        localStorage.setItem('ownerMobileSession', JSON.stringify({
          authenticated: true,
          timestamp: Date.now(),
          business: OWNER_CREDENTIALS.business,
          name: OWNER_CREDENTIALS.name
        }));

        navigate('/owner-mobile');
      } else {
        setError('PIN incorreto. Tente novamente.');
        setPin('');
      }
    } catch (error) {
      setError('Erro de autenticação. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinChange = (value: string) => {
    // Apenas permitir números
    const numericValue = value.replace(/\D/g, '');
    setPin(numericValue);
    setError('');
  };

  const handleKeyPress = (key: string) => {
    if (key === 'clear') {
      setPin('');
      setError('');
    } else if (key === 'backspace') {
      setPin(prev => prev.slice(0, -1));
      setError('');
    } else if (pin.length < 4) {
      setPin(prev => prev + key);
      setError('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col">
      {/* Header */}
      <div className="p-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#06b6d4] to-[#0891b2] rounded-2xl flex items-center justify-center shadow-lg">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Owner Mobile</h1>
        <p className="text-sm text-slate-400">{OWNER_CREDENTIALS.business}</p>
      </div>

      {/* Formulário de Login */}
      <div className="flex-1 px-6 flex flex-col justify-center">
        <form onSubmit={handleLogin} className="space-y-6">
          {/* PIN Display */}
          <div className="text-center">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              Código de Acesso
            </label>
            <div className="flex justify-center gap-2 mb-6">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-xl font-bold transition-all ${
                    pin[index] 
                      ? 'border-[#06b6d4] bg-[#06b6d4]/20 text-white' 
                      : 'border-white/20 bg-white/5 text-white/50'
                  }`}
                >
                  {showPin ? pin[index] : pin[index] ? '•' : ''}
                </div>
              ))}
            </div>
            
            {/* Botão mostrar/ocultar PIN */}
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
          <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handlePinChange(pin + num.toString())}
                className="h-14 rounded-xl bg-white/10 border border-white/20 text-lg font-bold hover:bg-white/20 transition-all active:scale-95"
                disabled={isLoading}
              >
                {num}
              </button>
            ))}
            
            <button
              type="button"
              onClick={() => handlePinChange('')}
              className="h-14 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-bold hover:bg-red-500/30 transition-all active:scale-95"
              disabled={isLoading}
            >
              Limpar
            </button>
            
            <button
              type="button"
              onClick={() => handlePinChange(pin + '0')}
              className="h-14 rounded-xl bg-white/10 border border-white/20 text-lg font-bold hover:bg-white/20 transition-all active:scale-95"
              disabled={isLoading}
            >
              0
            </button>
            
            <button
              type="button"
              onClick={() => setPin(prev => prev.slice(0, -1))}
              className="h-14 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-400 font-bold hover:bg-orange-500/30 transition-all active:scale-95 flex items-center justify-center"
              disabled={isLoading}
            >
              ←
            </button>
          </div>

          {/* Erro */}
          {error && (
            <div className="text-center">
              <p className="text-red-400 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Botão de Entrar */}
          <button
            type="submit"
            disabled={pin.length !== 4 || isLoading}
            className="w-full py-4 bg-gradient-to-r from-[#06b6d4] to-[#0891b2] text-black rounded-2xl font-black uppercase text-sm tracking-widest shadow-glow hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                Autenticando...
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        {/* Informações de Acesso */}
        <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded-2xl">
          <h3 className="text-sm font-bold text-white mb-2 text-center">🔐 Acesso Restrito</h3>
          <p className="text-xs text-slate-400 text-center leading-relaxed">
            Esta área é exclusiva para o proprietário do estabelecimento. 
            Use o código de 4 dígitos para acessar o dashboard mobile.
          </p>
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-xs text-slate-500 text-center">
              PIN padrão: <span className="text-[#06b6d4] font-mono">0000</span>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 text-center">
        <p className="text-xs text-slate-500">
          Vereda OS - Owner Mobile v1.0
        </p>
        <p className="text-xs text-slate-600 mt-1">
          Acesso independente do sistema principal
        </p>
      </div>
    </div>
  );
};

export default OwnerMobileLogin;
