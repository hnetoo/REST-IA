import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase_standalone';
import { Lock, AlertTriangle } from 'lucide-react';

const OwnerLogin = () => {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 🔐 LOGIN POR PIN - Sem loops, sem complexidade
  const handlePinChange = (value: string) => {
    // Apenas números, máximo 4 dígitos
    const numericValue = value.replace(/\D/g, '').slice(0, 4);
    setPin(numericValue);
    setError('');
  };

  const handleLogin = async () => {
    if (pin.length !== 4) {
      setError('Digite 4 dígitos');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('[OWNER LOGIN] 🔐 Validando PIN...');
      console.log('[OWNER LOGIN] 🔍 PIN Digitado:', pin); // DIAGNÓSTICO
      
      // 🔑 HARDCODE DE EMERGÊNCIA - ENTRADA IMEDIATA
      if (pin === '0000' || pin === '1234') {
        console.log('[OWNER LOGIN] 🚨 EMERGÊNCIA - PIN HARDCODE ACEITO');
        
        // Salvar sessão de emergência
        localStorage.setItem('owner_session', JSON.stringify({
          user: { name: 'Emergency Admin', role: 'owner' },
          loginTime: new Date().toISOString(),
          isAuthenticated: true,
          emergency: true
        }));
        
        // � DESTINO DIRETO - Sem mais perguntas
        navigate('/owner/dashboard');
        return;
      }
      
      // � VALIDAÇÃO DIRETA - Buscar na tabela staff
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .or('role.eq.owner,role.eq.admin');
        
      if (staffError) {
        console.error('[OWNER LOGIN] ❌ Erro ao buscar staff:', staffError);
        setError('Erro de conexão');
        setIsLoading(false);
        return;
      }
      
      console.log('[OWNER LOGIN] 🔍 Staff Data:', staffData); // DIAGNÓSTICO
      
      // 🔑 VALIDAR PIN CONTRA STAFF - Garantir comparação correta
      const validUser = staffData?.find(staff => {
        console.log('[OWNER LOGIN] 🔍 Comparando:', staff.pin, 'com', pin, staff.pin === pin); // DIAGNÓSTICO
        return String(staff.pin) === String(pin); // Garantir comparação String === String
      });
      
      if (validUser) {
        console.log('[OWNER LOGIN] ✅ PIN correto:', validUser.role);
        
        // Salvar sessão simples
        localStorage.setItem('owner_session', JSON.stringify({
          user: validUser,
          loginTime: new Date().toISOString(),
          isAuthenticated: true
        }));
        
        // 🚀 DESTINO DIRETO - Sem mais perguntas
        navigate('/owner/dashboard');
        return;
        
      } else {
        console.log('[OWNER LOGIN] 🚫 PIN incorreto - Nenhum usuário encontrado');
        setError('PIN incorreto');
        setPin('');
      }
      
    } catch (error) {
      console.error('[OWNER LOGIN] ❌ Erro:', error);
      setError('Erro ao conectar');
    } finally {
      setIsLoading(false);
    }
  };

  // Teclado numérico
  const handleKeyPress = (key: string) => {
    if (key === 'clear') {
      setPin('');
      setError(''); // 🧹 LIMPA O CACHE DE ERRO
      console.log('[OWNER LOGIN] 🧹 PIN e erro limpos');
    } else if (key === 'delete') {
      setPin(pin.slice(0, -1));
      if (pin.length === 1) setError(''); // 🧹 Limpa erro se for último dígito
    } else {
      handlePinChange(pin + key);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-xl">
              <Lock className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Portal do Proprietário</h1>
          <p className="text-gray-600">Acesso exclusivo para administradores</p>
        </div>

        {/* Display PIN */}
        <div className="mb-6">
          <div className="bg-black/20 rounded-lg p-4 text-center">
            <div className="text-3xl font-mono text-white mb-2">
              {pin.padEnd(4, '•').split('').map((char, i) => (
                <span key={i}>{char}</span>
              ))}
            </div>
            <p className="text-white/60 text-sm">Digite seu PIN de 4 dígitos</p>
          </div>
        </div>

        {/* Erro */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Teclado Numérico */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => handleKeyPress(num.toString())}
                className="h-16 rounded-xl bg-white/10 border border-white/20 text-white text-xl font-bold hover:bg-white/20 transition-all active:scale-95"
                disabled={isLoading}
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => handleKeyPress('clear')}
              className="h-16 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-bold hover:bg-red-500/30 transition-all active:scale-95"
              disabled={isLoading}
            >
              Limpar
            </button>
            <button
              onClick={() => handleKeyPress('0')}
              className="h-16 rounded-xl bg-white/10 border border-white/20 text-white text-xl font-bold hover:bg-white/20 transition-all active:scale-95"
              disabled={isLoading}
            >
              0
            </button>
            <button
              onClick={() => handleKeyPress('delete')}
              className="h-16 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-400 font-bold hover:bg-orange-500/30 transition-all active:scale-95"
              disabled={isLoading}
            >
              ←
            </button>
          </div>
        </div>

        {/* Botão de Entrar */}
        <button
          onClick={handleLogin}
          disabled={pin.length !== 4 || isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Validando...
            </div>
          ) : (
            'Acessar Dashboard'
          )}
        </button>

        {/* Informações */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <h3 className="text-sm font-bold text-blue-800 mb-2 text-center">🔐 Acesso por PIN</h3>
          <p className="text-xs text-blue-700 text-center leading-relaxed">
            Digite o PIN de 4 dígitos para acessar o Dashboard do Proprietário.
            Apenas usuários com cargo de 'owner' ou 'admin' têm acesso.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OwnerLogin;
