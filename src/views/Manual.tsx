import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BookOpen, Loader2, ChevronUp, AlertCircle, FileDown, MessageCircle, X, Send, User, Bot, Search } from 'lucide-react';
import { getBotResponse } from '../lib/botKnowledge';

const QUICK_QUESTIONS = [
  'Como abrir mesa?',
  'Como fazer fecho do dia?',
  'O que é Break-Even?',
  'Como adicionar funcionário?',
  'Como configurar impressora?',
  'Menu público QR Code',
  'Owner Dashboard',
  'Compliance AGT',
  'Fecho automático',
  'Como exportar relatórios?',
];

const Manual = () => {
  const [activeTab, setActiveTab] = useState<'USER' | 'ADMIN'>('USER');
  const [userHtml, setUserHtml] = useState<string>('');
  const [adminHtml, setAdminHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Chat Bot states
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user'|'bot', text: string}[]>([
    { role: 'bot', text: 'Olá! Sou o assistente do REST IA OS. Posso ajudar com perguntas sobre o sistema. O que precisa?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{id: string, title: string, tab: 'USER'|'ADMIN'}[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  // Extract headings from HTML for search
  const extractHeadings = useMemo(() => {
    const results: {id: string, title: string, tab: 'USER'|'ADMIN'}[] = [];
    const extractFrom = (html: string, tab: 'USER'|'ADMIN') => {
      if (!html) return;
      const bodyContent = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || html;
      const headingRegex = /<h[23][^>]*id="([^"]+)"[^>]*>(.*?)<\/h[23]>/gi;
      let match;
      while ((match = headingRegex.exec(bodyContent)) !== null) {
        const id = match[1];
        const title = match[2].replace(/<[^>]+>/g, '').trim();
        if (id && title) results.push({ id, title, tab });
      }
    };
    extractFrom(userHtml, 'USER');
    extractFrom(adminHtml, 'ADMIN');
    return results;
  }, [userHtml, adminHtml]);

  // Search filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearch(false);
      return;
    }
    const lower = searchQuery.toLowerCase();
    const filtered = extractHeadings.filter(h => h.title.toLowerCase().includes(lower)).slice(0, 10);
    setSearchResults(filtered);
    setShowSearch(true);
  }, [searchQuery, extractHeadings]);

  const scrollToHeading = (id: string, tab: 'USER'|'ADMIN') => {
    if (activeTab !== tab) {
      setActiveTab(tab);
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setShowSearch(false);
    setSearchQuery('');
  };

  useEffect(() => {
    const loadManuals = async () => {
      try {
        setLoading(true);
        const [userRes, adminRes] = await Promise.all([
          fetch('/docs/manual-utilizador.html'),
          fetch('/docs/manual-admin.html')
        ]);

        if (!userRes.ok || !adminRes.ok) {
          throw new Error('Erro ao carregar manuais');
        }

        const [userText, adminText] = await Promise.all([
          userRes.text(),
          adminRes.text()
        ]);

        setUserHtml(userText);
        setAdminHtml(adminText);
      } catch (err) {
        console.error('[MANUAL] Erro ao carregar:', err);
        setError('Erro ao carregar manuais. Verifique se os ficheiros existem em /docs/');
      } finally {
        setLoading(false);
      }
    };

    loadManuals();
  }, []);

  // Scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        setShowScrollTop(scrollRef.current.scrollTop > 300);
      }
    };

    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll);
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const extractBodyContent = (html: string) => {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    return bodyMatch ? bodyMatch[1] : html;
  };

  // Exportar PDF usando iframe invisível (evita popup blocker e erro Windows)
  const exportPDF = () => {
    const content = activeTab === 'USER' ? extractBodyContent(userHtml) : extractBodyContent(adminHtml);
    const title = activeTab === 'USER' ? 'Manual do Utilizador' : 'Manual do Administrador';
    
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }
    
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="pt">
      <head>
        <meta charset="UTF-8">
        <title>${title} - REST IA OS</title>
        <style>
          @page { margin: 20mm; size: A4; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Inter', -apple-system, sans-serif; 
            color: #1e293b; 
            line-height: 1.7; 
            padding: 40px;
            font-size: 11pt;
          }
          h1 { font-size: 24pt; font-weight: 900; color: #ea580c; margin-bottom: 8px; text-transform: uppercase; }
          .version { font-size: 9pt; color: #64748b; margin-bottom: 30px; }
          h2 { font-size: 13pt; font-weight: 800; color: #ea580c; margin: 25px 0 12px; padding: 8px 12px; background: #fff7ed; border-radius: 8px; border-left: 4px solid #ea580c; text-transform: uppercase; }
          h3 { font-size: 11pt; font-weight: 700; color: #0f172a; margin: 18px 0 8px; padding-left: 12px; border-left: 2px solid #ea580c; }
          p { margin-bottom: 10px; color: #475569; }
          ul { margin: 10px 0 15px 20px; }
          li { margin-bottom: 6px; color: #475569; }
          strong { color: #0f172a; font-weight: 600; }
          .warning, .tip, .danger { border-radius: 12px; padding: 12px 16px; margin: 15px 0; }
          .warning { background: #fefce8; border: 1px solid #fde047; }
          .warning strong { color: #ca8a04; }
          .tip { background: #f0fdf4; border: 1px solid #86efac; }
          .tip strong { color: #16a34a; }
          .danger { background: #fef2f2; border: 1px solid #fca5a5; }
          .danger strong { color: #dc2626; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 9pt; }
          th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
          th { background: #fff7ed; color: #ea580c; font-weight: 700; text-transform: uppercase; font-size: 8pt; }
          tr:nth-child(even) { background: #f8fafc; }
          .header-icon, .section-number { display: none; }
          code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 9pt; color: #ea580c; }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `);
    doc.close();
    
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 800);
  };

  // Chat Bot usa getBotResponse de ../lib/botKnowledge (conhecimento completo)

  const sendMessage = (msg?: string) => {
    const userMsg = (msg || inputValue).trim();
    if (!userMsg) return;
    
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInputValue('');
    setIsTyping(true);
    
    setTimeout(() => {
      const response = getBotResponse(userMsg);
      setMessages(prev => [...prev, { role: 'bot', text: response }]);
      setIsTyping(false);
    }, 600 + Math.random() * 400);
  };

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden">
      {/* HEADER FIXO */}
      <div className="shrink-0 px-8 pt-6 pb-4 bg-slate-950/95 backdrop-blur-sm z-10 border-b border-white/5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/30 to-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-lg shadow-primary/10">
              <BookOpen size={26} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Manual do Sistema</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">REST IA OS v1.1.2</p>
            </div>
          </div>

          {/* TABS + SEARCH + EXPORTAR PDF */}
          <div className="flex items-center gap-3">
            {/* SEARCH */}
            <div className="relative">
              <div className="flex items-center bg-slate-900/80 rounded-2xl border border-white/10 focus-within:border-primary/30 transition-colors">
                <Search size={16} className="ml-3 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery && setShowSearch(true)}
                  onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                  placeholder="Buscar..."
                  className="px-3 py-2.5 bg-transparent text-white text-xs outline-none placeholder:text-slate-600 w-32"
                />
              </div>
              {showSearch && searchResults.length > 0 && (
                <div className="absolute top-full mt-2 left-0 w-72 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 max-h-80 overflow-y-auto">
                  {searchResults.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => scrollToHeading(r.id, r.tab)}
                      className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                    >
                      <span className={`text-[9px] font-black uppercase tracking-wider mr-2 ${r.tab === 'USER' ? 'text-orange-400' : 'text-purple-400'}`}>
                        {r.tab === 'USER' ? 'USER' : 'ADMIN'}
                      </span>
                      <span className="text-xs text-slate-300">{r.title}</span>
                    </button>
                  ))}
                </div>
              )}
              {showSearch && searchQuery && searchResults.length === 0 && (
                <div className="absolute top-full mt-2 left-0 w-72 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 p-4">
                  <span className="text-xs text-slate-500">Nenhum resultado para "{searchQuery}"</span>
                </div>
              )}
            </div>

            <div className="flex bg-slate-900/80 rounded-2xl p-1 border border-white/10">
              <button
                onClick={() => { setActiveTab('USER'); scrollToTop(); }}
                className={`relative px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${
                  activeTab === 'USER' 
                    ? 'bg-primary text-black shadow-lg shadow-primary/25' 
                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  Utilizador
                </span>
              </button>
              <button
                onClick={() => { setActiveTab('ADMIN'); scrollToTop(); }}
                className={`relative px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${
                  activeTab === 'ADMIN' 
                    ? 'bg-primary text-black shadow-lg shadow-primary/25' 
                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  Administrador
                </span>
              </button>
            </div>
            
            <button
              onClick={exportPDF}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/30 rounded-xl text-slate-400 hover:text-primary transition-all text-[11px] font-black uppercase tracking-widest"
              title="Exportar para PDF"
            >
              <FileDown size={16} />
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* CONTEÚDO COM SCROLL */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-8 py-6 scroll-smooth thin-scrollbar"
      >
        <div className="max-w-5xl mx-auto pb-20">
          {/* LOADING */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-32">
              <Loader2 size={48} className="text-primary animate-spin mb-4" />
              <span className="text-slate-400 font-bold text-sm">A carregar manuais...</span>
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div className="glass-panel rounded-3xl p-10 border border-red-500/20 text-center max-w-lg mx-auto mt-12">
              <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
              <p className="text-red-400 font-bold mb-3 text-lg">{error}</p>
              <p className="text-slate-500 text-sm">Verifique se os ficheiros existem em <code className="bg-white/10 px-2 py-1 rounded text-orange-400">public/docs/</code></p>
            </div>
          )}

          {/* CONTEÚDO */}
          {!loading && !error && (
            <div className="manual-render">
              {activeTab === 'USER' && userHtml && (
                <article 
                  className="manual-article"
                  dangerouslySetInnerHTML={{ __html: extractBodyContent(userHtml) }}
                />
              )}
              {activeTab === 'ADMIN' && adminHtml && (
                <article 
                  className="manual-article"
                  dangerouslySetInnerHTML={{ __html: extractBodyContent(adminHtml) }}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* BOTÃO VOLTAR AO TOPO */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 w-12 h-12 bg-primary text-black rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-110 transition-transform z-50"
          title="Voltar ao topo"
        >
          <ChevronUp size={24} />
        </button>
      )}

      {/* CHAT BOT FLUTUANTE */}
      <div className="fixed bottom-6 right-6 z-50">
        {!chatOpen ? (
          <button
            onClick={() => { setChatOpen(true); setTimeout(() => chatInputRef.current?.focus(), 300); }}
            className="w-14 h-14 bg-primary text-black rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-110 transition-transform"
            title="Assistente Virtual"
          >
            <MessageCircle size={26} />
          </button>
        ) : (
          <div className="w-80 h-96 bg-slate-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header do Chat */}
            <div className="shrink-0 px-4 py-3 bg-gradient-to-r from-primary/20 to-primary/5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                  <Bot size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-wider">Assistente IA</p>
                  <p className="text-[9px] text-slate-500">REST IA OS Helper</p>
                </div>
              </div>
              <button 
                onClick={() => setChatOpen(false)}
                className="text-slate-500 hover:text-white p-1"
                title="Fechar chat"
                aria-label="Fechar chat"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user' ? 'bg-primary/20' : 'bg-purple-500/20'
                  }`}>
                    {msg.role === 'user' ? <User size={14} className="text-primary" /> : <Bot size={14} className="text-purple-400" />}
                  </div>
                  <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                    msg.role === 'user' 
                      ? 'bg-primary/15 text-white' 
                      : 'bg-white/5 text-slate-300'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Bot size={14} className="text-purple-400" />
                  </div>
                  <div className="bg-white/5 px-3 py-2 rounded-2xl">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                    </div>
                  </div>
                </div>
              )}
              {/* Quick suggestions when only initial message */}
              {messages.length === 1 && !isTyping && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {QUICK_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="px-2.5 py-1.5 bg-white/5 hover:bg-primary/15 border border-white/10 hover:border-primary/30 rounded-xl text-[10px] text-slate-400 hover:text-primary transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input */}
            <div className="shrink-0 p-3 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  ref={chatInputRef}
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  onInput={() => {}}
                  placeholder="Pergunte algo..."
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-primary placeholder:text-slate-600"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!inputValue.trim()}
                  className="w-9 h-9 bg-primary text-black rounded-xl flex items-center justify-center hover:brightness-110 transition-all disabled:opacity-30"
                  title="Enviar mensagem"
                  aria-label="Enviar mensagem"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ESTILOS INJECTADOS PARA O MANUAL */}
      <style>{`
        .manual-render {
          animation: fadeIn 0.4s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .manual-article .container {
          max-width: 100% !important;
          padding: 0 !important;
        }
        .manual-article {
          color: #e2e8f0;
          font-size: 15px;
          line-height: 1.8;
        }
        .manual-article h1 {
          font-size: 2.2rem;
          font-weight: 900;
          color: #f97316;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: -0.02em;
        }
        .manual-article h2 {
          font-size: 1.15rem;
          font-weight: 800;
          color: #f97316;
          margin: 2.5rem 0 1rem;
          padding: 0.75rem 1.25rem;
          background: rgba(249, 115, 22, 0.08);
          border-radius: 12px;
          border-left: 4px solid #f97316;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .manual-article h3 {
          font-size: 1.05rem;
          font-weight: 700;
          color: #fff;
          margin: 1.5rem 0 0.75rem;
          padding-left: 1rem;
          border-left: 2px solid rgba(249, 115, 22, 0.4);
        }
        .manual-article p {
          margin-bottom: 1rem;
          color: #94a3b8;
        }
        .manual-article ul {
          margin: 1rem 0 1.5rem 1.5rem;
          list-style: none;
        }
        .manual-article li {
          margin-bottom: 0.6rem;
          color: #94a3b8;
          position: relative;
          padding-left: 1.5rem;
        }
        .manual-article li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0.6rem;
          width: 6px;
          height: 6px;
          background: #f97316;
          border-radius: 50%;
          opacity: 0.7;
        }
        .manual-article strong {
          color: #fff;
          font-weight: 600;
        }
        .manual-article .warning, .manual-article .tip, .manual-article .danger {
          border-radius: 16px;
          padding: 1.25rem 1.5rem;
          margin: 1.5rem 0;
          position: relative;
        }
        .manual-article .warning {
          background: rgba(234, 179, 8, 0.06);
          border: 1px solid rgba(234, 179, 8, 0.2);
        }
        .manual-article .warning strong { color: #eab308; }
        .manual-article .tip {
          background: rgba(34, 197, 94, 0.06);
          border: 1px solid rgba(34, 197, 94, 0.2);
        }
        .manual-article .tip strong { color: #22c55e; }
        .manual-article .danger {
          background: rgba(239, 68, 68, 0.06);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .manual-article .danger strong { color: #ef4444; }
        .manual-article table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
          font-size: 0.875rem;
          border-radius: 12px;
          overflow: hidden;
        }
        .manual-article th {
          background: rgba(249, 115, 22, 0.12);
          color: #f97316;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 0.7rem;
          letter-spacing: 0.08em;
          padding: 1rem;
          text-align: left;
        }
        .manual-article td {
          padding: 0.875rem 1rem;
          color: #94a3b8;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .manual-article tr:hover td {
          background: rgba(255,255,255,0.02);
        }
        .manual-article code {
          background: rgba(255,255,255,0.08);
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.8rem;
          color: #f97316;
        }
        .manual-article .header-icon {
          display: none;
        }
        .manual-article .version {
          color: #64748b;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin-bottom: 2rem;
        }
        .manual-article .section-number {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: rgba(249, 115, 22, 0.15);
          color: #f97316;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 800;
          flex-shrink: 0;
        }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
      `}</style>
    </div>
  );
};

export default Manual;
