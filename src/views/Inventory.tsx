import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { 
  Utensils, Tag, Box, Plus, QrCode, Eye, 
  Settings, Smartphone, Globe, Trash2
} from 'lucide-react';

const Inventory = () => {
  const { 
    menu, categories, settings, addNotification
  } = useStore();

  const [activeTab, setActiveTab] = useState<'menu' | 'categories' | 'stock' | 'qr'>('menu');
  const [qrSettings, setQrSettings] = useState({
    showPrices: true,
    allowOrders: false,
    menuVisible: true
  });

  const formatKz = (val: number) => new Intl.NumberFormat('pt-AO', { 
    style: 'currency', 
    currency: 'AOA', 
    maximumFractionDigits: 0 
  }).format(val);

  // URL do Menu Digital
  const digitalMenuUrl = useMemo(() => {
    return `${window.location.origin}/menu-digital?nif=${settings.nif}`;
  }, [settings.nif]);

  // QR Code URL
  const qrCodeUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(digitalMenuUrl)}&margin=20&bgcolor=ffffff&color=000000`;
  }, [digitalMenuUrl]);

  const tabs = [
    { id: 'menu', label: 'Produtos', icon: Utensils },
    { id: 'categories', label: 'Categorias', icon: Tag },
    { id: 'stock', label: 'Stock & Inventário', icon: Box },
    { id: 'qr', label: 'QR Menu / Digital', icon: QrCode }
  ];

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(digitalMenuUrl);
    addNotification('success', 'URL do menu copiada!');
  };

  const handlePrintQR = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Menu - ${settings.restaurantName}</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              margin: 0; 
              text-align: center;
              background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
            }
            .card { 
              background: white;
              border-radius: 24px; 
              padding: 48px; 
              box-shadow: 0 20px 40px rgba(0,0,0,0.1); 
              max-width: 420px;
              text-align: center;
            }
            .logo {
              width: 80px;
              height: 80px;
              margin: 0 auto 24px;
              border-radius: 16px;
              background: #f3f4f6;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            h1 { 
              margin: 0 0 8px 0; 
              text-transform: uppercase; 
              font-size: 28px; 
              font-weight: 800;
              color: #1f2937;
            }
            .subtitle {
              margin: 0 0 32px 0;
              color: #6b7280;
              font-size: 14px;
              font-weight: 600;
              letter-spacing: 0.05em;
            }
            img { 
              width: 200px; 
              height: 200px; 
              margin: 24px 0;
              border-radius: 16px;
            }
            .footer {
              margin-top: 32px;
              color: #374151;
              font-size: 12px;
              font-weight: 500;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">
              ${settings.appLogoUrl ? 
                `<img src="${settings.appLogoUrl}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 12px;" />` :
                `<div style="font-size: 32px; color: #06b6d4;">🍽️</div>`
              }
            </div>
            <h1>${settings.restaurantName}</h1>
            <p class="subtitle">MENU DIGITAL</p>
            <img src="${qrCodeUrl}" alt="QR Code" />
            <p class="footer">Aponte a câmara para aceder ao menu</p>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const toggleQrSetting = (key: keyof typeof qrSettings) => {
    setQrSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-background text-slate-200 no-scrollbar">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight italic uppercase">Catálogo & Inventário</h2>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Gestão Central de Mercadorias</p>
        </div>
        
        <div className="flex gap-3">
          {activeTab === 'menu' && (
            <button 
              onClick={() => {/* TODO: Implementar novo produto */}}
              className="bg-primary text-black px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-glow hover:brightness-110 transition-all font-black uppercase text-xs tracking-widest"
            >
              <Plus size={20} />
              Novo Produto
            </button>
          )}
          {activeTab === 'categories' && (
            <button 
              onClick={() => {/* TODO: Implementar nova categoria */}}
              className="bg-primary text-black px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-glow hover:brightness-110 transition-all font-black uppercase text-xs tracking-widest"
            >
              <Plus size={20} />
              Nova Categoria
            </button>
          )}
        </div>
      </header>

      <div className="flex gap-4 mb-8 border-b border-white/5 overflow-x-auto no-scrollbar">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-4 px-6 font-black uppercase text-[10px] tracking-[0.2em] transition-all relative flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Icon size={16} /> {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full shadow-glow"></div>}
            </button>
          );
        })}
      </div>

      <div className="animate-in fade-in duration-500">
        {activeTab === 'menu' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {menu.map(dish => {
              const cat = categories.find(c => c.id === dish.categoryId);
              return (
                <div key={dish.id} className="glass-panel rounded-[2rem] border border-white/5 overflow-hidden group hover:border-primary/50 transition-all duration-300">
                  <div className="aspect-video w-full overflow-hidden relative">
                    <img 
                      src={dish.image} 
                      alt={dish.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                    />
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-white/10 z-20">
                      {cat?.name || 'Sem Categoria'}
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-white text-sm truncate pr-2" title={dish.name}>{dish.name}</h3>
                      <span className="text-primary font-mono font-bold text-xs whitespace-nowrap">{formatKz(dish.price)}</span>
                    </div>
                    <p className="text-slate-400 text-[10px] line-clamp-2 italic mb-4 min-h-[30px]">{dish.description}</p>
                    <div className="flex gap-2">
                      <button 
                        className="flex-1 py-2 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest transition-all"
                        title="Editar produto"
                      >
                        Editar
                      </button>
                      <button 
                        className="w-10 py-2 rounded-lg border border-red-500/10 text-red-500/50 hover:bg-red-500 hover:text-white transition-all"
                        title="Remover produto"
                      >
                        <Trash2 size={14} className="mx-auto" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categories.map(cat => (
              <div key={cat.id} className="glass-panel p-6 rounded-[2rem] border border-white/5 flex items-center justify-between hover:border-primary/40 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Tag size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg tracking-tight leading-none">{cat.name}</h3>
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">
                      {menu.filter(d => d.categoryId === cat.id).length} Produtos
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                    title="Editar categoria"
                  >
                    <Tag size={14}/>
                  </button>
                  <button 
                    className="p-2 rounded-lg text-red-500/50 hover:text-red-500 hover:bg-red-500/10"
                    title="Remover categoria"
                  >
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'stock' && (
          <div className="glass-panel rounded-[2rem] border border-white/5 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-white/5 border-b border-white/5">
                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <th className="px-8 py-6">Item de Inventário</th>
                  <th className="px-8 py-6">Quantidade Actual</th>
                  <th className="px-8 py-6">Nível Crítico</th>
                  <th className="px-8 py-6 text-right">Ajuste</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="px-8 py-6 font-bold text-white">Exemplo Produto</td>
                  <td className="px-8 py-6 font-mono text-xs">
                    <span className="text-green-500">50 unidades</span>
                  </td>
                  <td className="px-8 py-6 text-slate-500 font-mono text-xs">10 unidades</td>
                  <td className="px-8 py-6 text-right">
                    <div className="inline-flex gap-2">
                      <button className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center">-</button>
                      <button className="w-8 h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-black flex items-center justify-center">+</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'qr' && (
          <div className="space-y-8">
            {/* QR Code Generator */}
            <div className="glass-panel p-8 rounded-[3rem] border border-white/5 bg-white/5">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center text-white shadow-lg">
                  <QrCode size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">QR Menu Digital</h3>
                  <p className="text-slate-400 text-sm">Gerador de código QR para o seu menu</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* QR Code Display */}
                <div className="flex flex-col items-center">
                  <div className="w-64 h-64 bg-white rounded-3xl p-6 shadow-glow mb-6 flex items-center justify-center">
                    <img 
                      src={qrCodeUrl} 
                      alt="QR Code" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400 mb-4">URL do Menu Digital</p>
                    <p className="text-sm font-mono text-primary mb-4 truncate max-w-[200px]">{digitalMenuUrl}</p>
                    <div className="flex gap-2 justify-center">
                      <button 
                        onClick={handleCopyUrl}
                        className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-black uppercase hover:bg-primary/20 transition-all"
                      >
                        Copiar URL
                      </button>
                      <button 
                        onClick={handlePrintQR}
                        className="px-4 py-2 bg-white/5 text-white rounded-xl text-xs font-black uppercase hover:bg-white/10 transition-all"
                      >
                        Imprimir QR
                      </button>
                    </div>
                  </div>
                </div>

                {/* Settings */}
                <div className="space-y-6">
                  <h4 className="text-lg font-bold text-white">Configurações Rápidas</h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                      <div className="flex items-center gap-3">
                        <Eye size={20} className="text-primary" />
                        <div>
                          <p className="text-sm font-bold text-white">Mostrar Preços</p>
                          <p className="text-xs text-slate-400">Exibe preços no menu digital</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleQrSetting('showPrices')}
                        className={`w-12 h-6 rounded-full transition-all ${qrSettings.showPrices ? 'bg-primary' : 'bg-white/20'}`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-all ${qrSettings.showPrices ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                      <div className="flex items-center gap-3">
                        <Smartphone size={20} className="text-primary" />
                        <div>
                          <p className="text-sm font-bold text-white">Permitir Pedidos via App</p>
                          <p className="text-xs text-slate-400">Ativa sistema de encomendas</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleQrSetting('allowOrders')}
                        className={`w-12 h-6 rounded-full transition-all ${qrSettings.allowOrders ? 'bg-primary' : 'bg-white/20'}`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-all ${qrSettings.allowOrders ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                      <div className="flex items-center gap-3">
                        <Globe size={20} className="text-primary" />
                        <div>
                          <p className="text-sm font-bold text-white">Menu Visível</p>
                          <p className="text-xs text-slate-400">Menu público acessível</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleQrSetting('menuVisible')}
                        className={`w-12 h-6 rounded-full transition-all ${qrSettings.menuVisible ? 'bg-primary' : 'bg-white/20'}`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-all ${qrSettings.menuVisible ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                    <div className="flex items-start gap-3">
                      <Settings size={18} className="text-blue-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-blue-500">Status do Sistema</p>
                        <p className="text-xs text-slate-300 mt-1">
                          Menu: {qrSettings.menuVisible ? '✅ Online' : '❌ Offline'} | 
                          Preços: {qrSettings.showPrices ? '✅ Visíveis' : '❌ Ocultos'} | 
                          Pedidos: {qrSettings.allowOrders ? '✅ Ativos' : '❌ Inativos'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-panel p-6 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <Utensils size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-black uppercase tracking-widest">Produtos</p>
                    <p className="text-2xl font-bold text-white">{menu.length}</p>
                  </div>
                </div>
              </div>

              <div className="glass-panel p-6 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500">
                    <Tag size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-black uppercase tracking-widest">Categorias</p>
                    <p className="text-2xl font-bold text-white">{categories.length}</p>
                  </div>
                </div>
              </div>

              <div className="glass-panel p-6 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500">
                    <QrCode size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-black uppercase tracking-widest">QR Status</p>
                    <p className="text-lg font-bold text-green-500">Ativo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inventory;
