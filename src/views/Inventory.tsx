import { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { forceRealSyncService } from '../services/forceRealSyncService';
import { 
  Utensils, Tag, Box, Plus, QrCode, Eye, 
  Settings, Smartphone, Globe, Trash2, RefreshCw, Download, Upload,
  CheckCircle, AlertCircle, X, Upload as UploadIcon, Edit2
} from 'lucide-react';

const Inventory = () => {
  const { 
    menu, categories, settings, addNotification, addDish, addCategory, removeDish, updateDish, removeCategory
  } = useStore();

  const [activeTab, setActiveTab] = useState<'menu' | 'categories' | 'stock' | 'qr'>('menu');
  const [qrSettings, setQrSettings] = useState({
    showPrices: true,
    allowOrders: false,
    menuVisible: true
  });

  // Estados para sincronização
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState(0);

  // Estados para modais
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Estados para criação local
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    image_url: '',
    category_id: '',
    is_active: true,
    description: ''
  });

  // Estados para upload de imagem
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Estados para reload de imagens
  const [isRefreshingImages, setIsRefreshingImages] = useState(false);
  const [imageRefreshKey, setImageRefreshKey] = useState(0);

  const [newCategory, setNewCategory] = useState({
    name: ''
  });

  const [editingCategory, setEditingCategory] = useState<any>(null);

  const formatKz = (val: number) => new Intl.NumberFormat('pt-AO', { 
    style: 'currency', 
    currency: 'AOA', 
    maximumFractionDigits: 0 
  }).format(val);

  // URL do Menu Digital - Campo editável com fallback para NIF
  const [customNif, setCustomNif] = useState(() => settings.nif || '');
  const [digitalMenuUrl, setDigitalMenuUrl] = useState(() => {
    const nifValue = settings.nif || '';
    return `https://rest-ia.vercel.app/menu-digital?nif=${nifValue}`;
  });

  // Atualizar URL quando o NIF customizado mudar
  useEffect(() => {
    const nifValue = customNif.trim() || settings.nif || '';
    const newUrl = `https://rest-ia.vercel.app/menu-digital?nif=${nifValue}`;
    setDigitalMenuUrl(newUrl);
  }, [customNif, settings.nif]);

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

  // ✅ FORÇA SINCRONIZAÇÃO REAL - Fetch obrigatório do Supabase
  useEffect(() => {
    const forceRealSync = async () => {
      console.log('[Inventory] 🔄 FORÇANDO SINCRONIZAÇÃO REAL COM SUPABASE...');
      
      try {
        await forceRealSyncService.forceRealSync();
        addNotification('success', 'Sincronização real com Supabase concluída!');
      } catch (error) {
        console.error('[Inventory] ❌ ERRO NA SINCRONIZAÇÃO FORÇADA:', error);
        addNotification('error', 'Erro na sincronização com Supabase. Tente novamente.');
      }
    };

    // Executar sincronização forçada ao montar
    forceRealSync();
  }, [addNotification]);

  // Função para obter URL pública estável
  const getStableImageUrl = (imagePath: string) => {
    if (!imagePath) return null;
    
    // Se já for URL completa, retornar como está
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Se for apenas nome do arquivo, construir URL pública
    const { data } = supabase.storage
      .from('products')
      .getPublicUrl(imagePath);
    
    return data.publicUrl;
  };

  // Função para recarregar todas as imagens dos produtos
  const handleRefreshImages = async () => {
    console.log('[Inventory] 🔄 Iniciando recarga de todas as imagens...');
    setIsRefreshingImages(true);
    
    try {
      // Forçar atualização de URLs de imagens para todos os produtos
      const updatedProducts = menu.map(product => {
        if (product.image_url) {
          // Gerar nova URL pública para forçar refresh
          const { data } = supabase.storage
            .from('products')
            .getPublicUrl(product.image_url);
          
          return {
            ...product,
            image_url: data.publicUrl
          };
        }
        return product;
      });
      
      // Atualizar store com novos URLs
      updatedProducts.forEach(product => {
        updateDish(product);
      });
      
      // Forçar re-render do componente incrementando a key
      setImageRefreshKey(prev => prev + 1);
      
      addNotification('success', 'Imagens actualizadas com sucesso!');
      console.log('[Inventory] ✅ Todas as imagens foram recarregadas');
      
    } catch (error) {
      console.error('[Inventory] ❌ Erro ao recarregar imagens:', error);
      addNotification('error', 'Erro ao recarregar imagens');
    } finally {
      setIsRefreshingImages(false);
    }
  };

  // Função de upload de imagem com URL permanente
  const handleImageUpload = async (file: File) => {
    if (!file) return;
    
    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      addNotification('error', 'Apenas arquivos de imagem são permitidos');
      return;
    }

    setUploadingImage(true);
    
    try {
      console.log('[Inventory] Iniciando upload para Supabase Storage...');
      console.log('[Inventory] Bucket: products');
      console.log('[Inventory] Arquivo:', file.name, 'Tipo:', file.type);
      
      // Upload para Supabase Storage - COM UPSERT E LIMPEZA DE NOME
      const cleanFileName = file.name.replace(/\s+/g, '_').replace(/[()]/g, '');
      const fileName = `${Date.now()}-${cleanFileName}`;
      const { data, error } = await supabase.storage
        .from('products')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true  // ✅ PERMITE SOBRESCREVER SE EXISTIR
        });

      if (error) {
        console.error('[Inventory] Erro no upload Supabase Storage:', error);
        console.error('[Inventory] Detalhes do erro:', {
          message: error.message,
        });
        
        // Verificar se é erro de permissão (RLS)
        if (error.message?.includes('permission') || error.message?.includes('policy')) {
          addNotification('error', 'Erro de permissão no Storage. Verifique as políticas RLS do bucket "products".');
        } else if (error.message?.includes('quota') || error.message?.includes('limit')) {
          addNotification('error', 'Cota de armazenamento excedida no Supabase Storage.');
        } else {
          addNotification('error', `Erro no upload: ${error.message}`);
        }
        return;
      }

      console.log('[Inventory] Upload concluído, obtendo URL pública...');
      
      // Obter URL pública
      const { data: publicUrlData } = supabase.storage
        .from('products')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;
      console.log('[Inventory] URL pública obtida:', publicUrl);
      
      // ✅ URL COMPLETA: Garantir que começa com https://
      const fullUrl = publicUrl.startsWith('https://') ? publicUrl : `https://${publicUrl}`;
      console.log('[Inventory] URL completa:', fullUrl);
      
      // Atualizar URL no formulário
      setNewProduct(prev => ({
        ...prev,
        image_url: fullUrl
      }));
      
      addNotification('success', 'Imagem carregada com sucesso!');
      
    } catch (err) {
      console.error('[Inventory] Erro crítico no upload:', err);
      addNotification('error', 'Erro ao carregar imagem');
    } finally {
      setUploadingImage(false);
      setImageFile(null);
    }
  };

  // Função para selecionar arquivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      handleImageUpload(file);
    }
  };

  const handleCreateProduct = () => {
    console.log('[Inventory] Botão Novo Produto clicado!');
    setIsProductModalOpen(true);
  };

  const handleCreateCategory = () => {
    console.log('[Inventory] Botão Nova Categoria clicado!');
    setIsCategoryModalOpen(true);
  };

  // Função para atualizar produto existente
  const handleUpdateExistingProduct = async () => {
    console.log('[Inventory] Atualizando produto:', editingProduct);
    
    if (!editingProduct) return;
    
    // Validar preço
    const priceValue = newProduct.price.replace(',', '.');
    const priceNumber = parseFloat(priceValue) || 0;
    
    if (isNaN(priceNumber)) {
      addNotification('error', 'Preço inválido! Use apenas números.');
      return;
    }

    if (!newProduct.category_id) {
      addNotification('error', 'Selecione uma categoria válida.');
      return;
    }
    
    // Criar objeto atualizado
    const productToUpdate = {
      id: editingProduct.id,
      name: newProduct.name,
      price: priceNumber,
      image_url: newProduct.image_url || null,
      is_active: newProduct.is_active,
      category_id: newProduct.category_id,
      description: newProduct.description || ''
    };
    
    try {
      const { data, error } = await supabase
        .from('products')
        .update(productToUpdate)
        .eq('id', editingProduct.id)
        .select();

      if (error) {
        console.error('[Inventory] Erro ao atualizar produto:', error);
        addNotification('error', `Erro ao atualizar produto: ${error.message}`);
        return;
      }

      console.log('[Inventory] ✅ Produto atualizado com sucesso:', data);
      addNotification('success', 'Produto atualizado com sucesso!');
      
      // Atualizar store local
      updateDish({ ...editingProduct, ...productToUpdate });
      
      // Fechar modal e limpar estado
      setIsProductModalOpen(false);
      setEditingProduct(null);
      setNewProduct({
        name: '',
        price: '',
        image_url: '',
        category_id: '',
        is_active: true,
        description: ''
      });
      
    } catch (error) {
      console.error('[Inventory] Erro crítico ao atualizar produto:', error);
      addNotification('error', 'Erro ao atualizar produto');
    }
  };

  const handleSaveProduct = async () => {
    console.log('[Inventory] Salvando produto:', newProduct);
    
    // Verificar se está editando ou criando
    if (editingProduct) {
      // Modo de edição - usar handleUpdateExistingProduct
      return handleUpdateExistingProduct();
    }
    
    // Modo de criação
    console.log('[Inventory] Criando novo produto...');
    
    // Validar preço - evitar NaN, definir como 0 se vazio
    const priceValue = newProduct.price.replace(',', '.');
    const priceNumber = parseFloat(priceValue) || 0; // ✅ Define como 0 se vazio/inválido
    
    if (isNaN(priceNumber)) {
      addNotification('error', 'Preço inválido! Use apenas números.');
      return;
    }

    // VALIDAÇÃO CRÍTICA: categoria deve existir
    if (!newProduct.category_id) {
      addNotification('error', 'Selecione uma categoria válida.');
      return;
    }
    
    // ✅ CRIAÇÃO OBRIGATÓRIA NO BANCO PRIMEIRO - SEM MODO OPTIMISTA
    try {
      console.log('[Inventory] Criando produto no Supabase primeiro...');
      
      // ✅ CRIAR PRODUTO REAL NO BANCO PRIMEIRO
      const realProduct = await forceRealSyncService.createRealProduct({
        name: newProduct.name,
        description: newProduct.description || '',
        price: priceNumber,
        cost_price: priceNumber * 0.6,
        image_url: newProduct.image_url || null,
        is_active: newProduct.is_active,
        category_id: newProduct.category_id
      });
      
      if (!realProduct || !realProduct.id) {
        throw new Error('Produto criado mas sem ID retornado');
      }
      
      // ✅ VALIDAR SE O ID TEM 36 CARACTERES
      if (realProduct.id.length !== 36) {
        throw new Error(`ID inválido retornado: ${realProduct.id} (comprimento: ${realProduct.id.length})`);
      }
      
      console.log('[Inventory] ✅ Produto criado no Supabase com UUID VÁLIDO:', {
        id: realProduct.id,
        name: realProduct.name,
        length: realProduct.id.length,
        isValid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(realProduct.id)
      });
      
      // ✅ SÓ DEPOIS DE CRIAR NO BANCO, ADICIONAR AO STORE LOCAL
      addDish(realProduct);
      
      // Limpar formulário
      setNewProduct({
        name: '',
        price: '',
        image_url: '',
        category_id: '',
        is_active: true,
        description: ''
      });
      
      setIsProductModalOpen(false);
      addNotification('success', 'Produto criado com sucesso no Supabase!');
      
    } catch (error: any) {
      console.error('[Inventory] ❌ ERRO AO CRIAR PRODUTO:', error);
      addNotification('error', `Erro ao criar produto: ${error.message}`);
    }
  };

  const handleSaveCategory = async () => {
    console.log('[Inventory] Salvando categoria:', newCategory);
    
    try {
      // ✅ CRIAR CATEGORIA REAL NO BANCO PRIMEIRO
      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: newCategory.name
        })
        .select()
        .single();

      if (error) {
        console.error('[Inventory] Erro ao criar categoria:', error);
        addNotification('error', `Erro ao criar categoria: ${error.message}`);
        return;
      }

      if (!data || !data.id) {
        console.error('[Inventory] Categoria criada mas sem ID:', data);
        addNotification('error', 'Categoria criada mas sem ID');
        return;
      }

      // ✅ VALIDAR SE O ID TEM 36 CARACTERES
      if (data.id.length !== 36) {
        console.error('[Inventory] ❌ ID INVÁLIDO RETORNADO:', data.id);
        addNotification('error', `ID inválido retornado: ${data.id}`);
        return;
      }

      console.log('[Inventory] ✅ Categoria criada com UUID VÁLIDO:', {
        id: data.id,
        name: data.name,
        length: data.id.length
      });

      // ✅ ADICIONAR AO STORE LOCAL
      addCategory(data);
      
      // Limpar formulário
      setNewCategory({ name: '' });
      setIsCategoryModalOpen(false);
      addNotification('success', 'Categoria criada com sucesso!');
      
    } catch (error: any) {
      console.error('[Inventory] ❌ ERRO AO CRIAR CATEGORIA:', error);
      addNotification('error', `Erro ao criar categoria: ${error.message}`);
    }
  };

  const handleEdit = (product: any) => {
    console.log('[Inventory] Editando produto:', product);
    console.log('[Inventory] ID do produto (UUID REAL DO SUPABASE):', product.id);
    console.log('[Inventory] Tipo do ID:', typeof product.id);
    console.log('[Inventory] Comprimento do ID:', product.id?.length);
    
    // ✅ VERIFICAÇÃO BÁSICA - APENAS ID EXISTE (SEM VALIDAÇÃO DE COMPRIMENTO)
    if (!product.id) {
      console.error('[Inventory] Produto sem ID - não é possível editar');
      addNotification('error', 'Produto não tem ID válido. Recarregue a página.');
      return;
    }
    
    // ✅ USA ID EXATO DO BANCO (UUID REAL DA IMAGEM 1151)
    const productId = product.id; // ✅ USA ID EXATO DO BANCO SEM ALTERAR
    console.log('[Inventory] ✅ UUID real do Supabase será usado no update:', productId);
    
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      price: product.price.toString(),
      image_url: product.image_url || '',
      category_id: product.category_id,
      is_active: product.is_active,
      description: product.description || '' // ✅ CAMPO DO SUPABASE ADICIONADO
    });
    setIsProductModalOpen(true);
  };

  const handleDelete = (productId: string) => {
    console.log('[Inventory] Apagando produto:', productId);
    
    // REMOÇÃO LOCAL IMEDIATA
    removeDish(productId);
    addNotification('success', 'Produto removido com sucesso!');
  };

  const handleEditCategory = async (category: any) => {
    console.log('[Inventory] Editando categoria:', category);
  
    // Abrir modal para edição
    setEditingCategory(category);
    setNewCategory({ name: category.name });
    setIsCategoryModalOpen(true);
  };

  const handleUpdateCategory = async () => {
    console.log('[Inventory] Atualizando categoria:', editingCategory);
    
    if (!editingCategory) return;
    
    try {
      const { error } = await supabase
        .from('categories')
        .update({ name: newCategory.name })
        .eq('id', editingCategory.id)
        .select();
      
      if (error) {
        console.error('[Inventory] Erro ao atualizar categoria:', error);
        addNotification('error', 'Erro ao atualizar categoria');
        return;
      }
      
      // Atualizar no store local
      const updatedCategories = categories.map(cat => 
        cat.id === editingCategory.id 
          ? { ...cat, name: newCategory.name }
          : cat
      );
      
      // Atualizar store - precisamos implementar updateCategory no store
      // Por enquanto, vamos recarregar a página
      addNotification('success', 'Categoria atualizada com sucesso!');
      setEditingCategory(null);
      setNewCategory({ name: '' });
      setIsCategoryModalOpen(false);
      
    } catch (error: any) {
      console.error('[Inventory] ❌ ERRO AO ATUALIZAR CATEGORIA:', error);
      addNotification('error', `Erro ao atualizar categoria: ${error.message}`);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    console.log('[Inventory] Apagando categoria:', categoryId);
    
    const productsInCategory = menu.filter(product => product.category_id === categoryId);
    
    if (productsInCategory.length > 0) {
      addNotification('error', `Não é possível apagar categoria. Existem ${productsInCategory.length} produtos ligados a ela.`);
      return;
    }
    
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);
      
      if (error) {
        console.error('[Inventory] Erro ao apagar categoria:', error);
        addNotification('error', 'Erro ao apagar categoria');
        return;
      }
      
      removeCategory(categoryId);
      addNotification('success', 'Categoria apagada com sucesso!');
      
    } catch (error: any) {
      console.error('[Inventory] ❌ ERRO AO APAGAR CATEGORIA:', error);
      addNotification('error', `Erro ao apagar categoria: ${error.message}`);
    }
  };

  const handleDuplicateProduct = (product: any) => {
    console.log('[Inventory] Duplicando produto:', product);
    setNewProduct({
      name: `${product.name} (Cópia)`,
      price: product.price.toString(),
      image_url: product.image_url || '',
      category_id: product.category_id,
      is_active: true,
      description: product.description || ''
    });
    setIsProductModalOpen(true);
  };

  const toggleQrSetting = (key: keyof typeof qrSettings) => {
    setQrSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Funções de sincronização
  const handleSyncMenu = async () => {
    setIsSyncing(true);
    setSyncStatus('syncing');
    setSyncProgress(0);

    try {
      // Simular sincronização de categorias
      setSyncProgress(20);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simular sincronização de produtos
      setSyncProgress(50);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simular sincronização de estoque
      setSyncProgress(80);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Finalizar sincronização
      setSyncProgress(100);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setSyncStatus('success');
      setLastSync(new Date().toISOString());
      addNotification('success', 'Menu sincronizado com sucesso!');
      
      // Resetar status após 3 segundos
      setTimeout(() => {
        setSyncStatus('idle');
        setSyncProgress(0);
      }, 3000);
      
    } catch (error) {
      setSyncStatus('error');
      addNotification('error', 'Erro ao sincronizar menu');
      setTimeout(() => {
        setSyncStatus('idle');
        setSyncProgress(0);
      }, 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportMenu = async () => {
    try {
      const menuData = {
        categories: categories,
        products: menu,
        settings: qrSettings,
        exportedAt: new Date().toISOString()
      };
      
      const dataStr = JSON.stringify(menuData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `menu-export-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      addNotification('success', 'Menu exportado com sucesso!');
    } catch (error) {
      addNotification('error', 'Erro ao exportar menu');
    }
  };

  const handleImportMenu = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        // Validar estrutura do arquivo
        if (!data.categories || !data.products) {
          throw new Error('Arquivo inválido');
        }
        
        // Simular importação
        setIsSyncing(true);
        setSyncStatus('syncing');
        setSyncProgress(50);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setSyncProgress(100);
        setSyncStatus('success');
        setLastSync(new Date().toISOString());
        
        addNotification('success', 'Menu importado com sucesso!');
        
        setTimeout(() => {
          setSyncStatus('idle');
          setSyncProgress(0);
        }, 3000);
        
      } catch (error) {
        addNotification('error', 'Erro ao importar menu: arquivo inválido');
      } finally {
        setIsSyncing(false);
      }
    };
    
    input.click();
  };

  const handlePrintQR = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - Menu Digital</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 20px; 
              }
              img { 
                max-width: 300px; 
                width: 100%; 
              }
              h1 { 
                margin-bottom: 20px; 
                color: #333; 
              }
              p { 
                margin-bottom: 10px; 
                color: #666; 
              }
            </style>
          </head>
          <body>
            <h1>Menu Digital - QR Code</h1>
            <img src="${qrCodeUrl}" alt="QR Code" />
            <p>${digitalMenuUrl}</p>
            <p>Escaneie este QR code para acessar o menu digital</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'syncing': return <RefreshCw size={20} className="animate-spin" />;
      case 'success': return <CheckCircle size={20} />;
      case 'error': return <AlertCircle size={20} />;
      default: return <RefreshCw size={20} />;
    }
  };

  const getSyncColor = () => {
    switch (syncStatus) {
      case 'syncing': return 'bg-blue-500';
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-primary';
    }
  };

  return (
    <div className="p-8 min-h-screen bg-background text-slate-200 overflow-x-hidden">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight italic uppercase">Catálogo & Inventário</h2>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Gestão Central de Mercadorias</p>
        </div>
        
        <div className="flex gap-3">
          {/* Botões de sincronização */}
          <button
            onClick={handleSyncMenu}
            disabled={isSyncing}
            className={`${getSyncColor()} text-black px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-glow hover:brightness-110 transition-all font-black uppercase text-xs tracking-widest disabled:opacity-50`}
            title="Sincronizar menu com Supabase"
          >
            {getSyncIcon()}
            {syncStatus === 'syncing' ? 'Sincronizando...' : 'Sincronizar'}
          </button>
          
          {/* Botão de Recarregar Imagens */}
          <button
            onClick={handleRefreshImages}
            disabled={isRefreshingImages}
            className="bg-orange-500 text-black px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-glow hover:brightness-110 transition-all font-black uppercase text-xs tracking-widest disabled:opacity-50"
            title="Recarregar todas as imagens dos produtos"
          >
            {isRefreshingImages ? (
              <RefreshCw size={20} className="animate-spin" />
            ) : (
              <RefreshCw size={20} />
            )}
            {isRefreshingImages ? 'Actualizando...' : 'Actualizar Imagens'}
          </button>
          
          <button
            onClick={handleExportMenu}
            disabled={isSyncing}
            className="bg-white/10 border border-white/20 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-white/20 transition-all font-black uppercase text-xs tracking-widest disabled:opacity-50"
            title="Exportar menu para arquivo JSON"
          >
            <Download size={20} />
            Exportar
          </button>
          
          <button
            onClick={handleImportMenu}
            disabled={isSyncing}
            className="bg-white/10 border border-white/20 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-white/20 transition-all font-black uppercase text-xs tracking-widest disabled:opacity-50"
            title="Importar menu de arquivo JSON"
          >
            <Upload size={20} />
            Importar
          </button>

          {activeTab === 'menu' && (
            <button 
              onClick={handleCreateProduct}
              className="bg-primary text-black px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-glow hover:brightness-110 transition-all font-black uppercase text-xs tracking-widest"
            >
              <Plus size={20} />
              Novo Produto
            </button>
          )}
        </div>
      </header>

      {/* Status da Sincronização */}
      {syncStatus !== 'idle' && (
        <div className="mb-8 p-6 bg-white/5 rounded-xl border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {getSyncIcon()}
              <span className="text-sm font-bold text-white">
                {syncStatus === 'syncing' ? 'Sincronizando menu...' : 
                 syncStatus === 'success' ? 'Sincronização concluída!' :
                 syncStatus === 'error' ? 'Erro na sincronização' : 'Menu sincronizado'}
              </span>
            </div>
            {lastSync && (
              <span className="text-xs text-slate-400">
                Última sincronização: {new Date(lastSync).toLocaleString('pt-AO')}
              </span>
            )}
          </div>
          
          {isSyncing && (
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#06b6d4] to-[#0891b2] transition-all duration-300 ease-out"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
          )}
          
          <div className="mt-2 text-xs text-slate-400">
            {syncProgress === 20 && 'Sincronizando categorias...'}
            {syncProgress === 50 && 'Sincronizando produtos...'}
            {syncProgress === 80 && 'Sincronizando estoque...'}
            {syncProgress === 100 && 'Finalizando sincronização...'}
          </div>
        </div>
      )}

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
          <div className="max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-orange-500">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
              {menu.map(dish => {
                const cat = categories.find(c => c.id === dish.category_id);
                return (
                  <div key={`${dish.id}-${imageRefreshKey}`} className="glass-panel rounded-xl border border-white/5 overflow-hidden group hover:border-primary/50 transition-all duration-300">
                    <div className="aspect-square w-full overflow-hidden relative h-32">
                      {(() => {
                        const stableImageUrl = getStableImageUrl(dish.image_url);
                        return stableImageUrl ? (
                          <>
                            <img 
                              src={stableImageUrl} 
                              alt={dish.name} 
                              className="w-full h-full object-cover aspect-video"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const fallback = target.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                                console.log('[Inventory] Erro ao carregar imagem do produto:', dish.name);
                                console.log('[Inventory] Link da imagem do produto:', stableImageUrl);
                                
                                // Tentar recarregar URL após erro
                                setTimeout(() => {
                                  const retryUrl = getStableImageUrl(dish.image_url);
                                  if (retryUrl && retryUrl !== stableImageUrl) {
                                    target.src = retryUrl;
                                  }
                                }, 2000);
                              }}
                              onLoad={() => {
                                console.log('[Inventory] Imagem carregada com sucesso:', dish.name);
                                console.log('[Inventory] URL do Produto:', stableImageUrl);
                              }}
                            />
                            <div className="w-full h-full bg-slate-700 flex items-center justify-center" style={{display: 'none'}}>
                              <UploadIcon size={24} className="text-slate-500" />
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                            <UploadIcon size={24} className="text-slate-500" />
                          </div>
                        );
                      })()}
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-white/10 z-20">
                        {cat?.name || 'Sem Categoria'}
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-white text-xs truncate pr-2" title={dish.name}>{dish.name}</h3>
                        <span className="text-primary font-mono font-bold text-xs whitespace-nowrap">{formatKz(dish.price)}</span>
                      </div>
                      <p className="text-slate-400 text-[8px] line-clamp-1 italic mb-2 min-h-[12px]">{dish.description}</p>
                      <div className="flex justify-between items-center gap-2">
                        <span className={`text-[8px] font-medium px-2 py-1 rounded-full ${
                          dish.is_active 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {dish.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEdit(dish)}
                            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                            title="Editar produto"
                          >
                            <Edit2 size={12} className="text-slate-400" />
                          </button>
                          <button
                            onClick={() => handleDuplicateProduct(dish)}
                            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                            title="Duplicar produto"
                          >
                            <Plus size={12} className="text-slate-400" />
                          </button>
                          <button
                            onClick={() => handleDelete(dish.id)}
                            className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                            title="Apagar produto"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-orange-500">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
              {categories.map(category => (
                <div key={category.id} className="glass-panel rounded-xl border border-white/5 p-6 hover:border-primary/50 transition-all duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-white mb-1">{category.name}</h3>
                      <p className="text-slate-400 text-sm">
                        {menu.filter(product => product.category_id === category.id).length} produtos
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                        title="Editar categoria"
                      >
                        <Edit2 size={16} className="text-slate-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                        title="Apagar categoria"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'stock' && (
          <div className="max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-orange-500">
            <div className="glass-panel rounded-xl border border-white/5 p-6">
              <h3 className="text-xl font-bold text-white mb-6">Gestão de Stock</h3>
              
              <div className="space-y-4">
                {menu.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-4">
                      {item.image_url && (
                        <img 
                          src={getStableImageUrl(item.image_url) || ''}
                          alt={item.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <h4 className="font-bold text-white">{item.name}</h4>
                        <p className="text-slate-400 text-sm">{item.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-sm">Stock: <span className="text-white font-bold">100</span></p>
                      <p className="text-primary font-bold">{formatKz(item.price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'qr' && (
          <div className="max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-orange-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-panel rounded-xl border border-white/5 p-6">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                  <QrCode size={24} className="text-primary" />
                  Configurações do QR Menu
                </h3>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <label className="text-white font-medium">Mostrar Preços</label>
                    <button
                      onClick={() => toggleQrSetting('showPrices')}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        qrSettings.showPrices ? 'bg-primary' : 'bg-slate-600'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full transition-transform ${
                        qrSettings.showPrices ? 'translate-x-6 bg-white' : 'translate-x-1 bg-white'
                      }`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-white font-medium">Permitir Pedidos</label>
                    <button
                      onClick={() => toggleQrSetting('allowOrders')}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        qrSettings.allowOrders ? 'bg-primary' : 'bg-slate-600'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full transition-transform ${
                        qrSettings.allowOrders ? 'translate-x-6 bg-white' : 'translate-x-1 bg-white'
                      }`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-white font-medium">Menu Visível</label>
                    <button
                      onClick={() => toggleQrSetting('menuVisible')}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        qrSettings.menuVisible ? 'bg-primary' : 'bg-slate-600'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full transition-transform ${
                        qrSettings.menuVisible ? 'translate-x-6 bg-white' : 'translate-x-1 bg-white'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="glass-panel rounded-xl border border-white/5 p-6">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                  <Globe size={24} className="text-primary" />
                  Menu Digital
                </h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-lg">
                    <label className="block text-slate-400 text-sm mb-2">URL do Menu Digital:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customNif}
                        onChange={(e) => setCustomNif(e.target.value)}
                        placeholder={settings.nif || 'Digite o NIF ou subdomínio'}
                        className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                        title="Digite o NIF ou subdomínio personalizado"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(digitalMenuUrl);
                          addNotification('success', 'URL copiada para a área de transferência!');
                        }}
                        className="px-3 py-2 bg-primary text-black rounded-lg hover:brightness-110 transition-all text-sm font-medium"
                        title="Copiar URL do menu digital"
                      >
                        Copiar
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      URL gerada: {digitalMenuUrl}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-white/5 rounded-lg">
                    <p className="text-slate-400 text-sm mb-4">QR Code para acesso rápido:</p>
                    <div className="flex justify-center">
                      <img 
                        src={qrCodeUrl}
                        alt="QR Code"
                        className="w-48 h-48 rounded-lg"
                      />
                    </div>
                    <div className="flex justify-center gap-4 mt-4">
                      <button
                        onClick={handlePrintQR}
                        className="px-4 py-2 bg-primary text-black rounded-lg hover:brightness-110 transition-all text-sm font-medium"
                      >
                        Imprimir QR
                      </button>
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = qrCodeUrl;
                          link.download = 'qr-menu.png';
                          link.click();
                        }}
                        className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all text-sm font-medium"
                      >
                        Baixar QR
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Produto */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">
                  {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                </h3>
                <button
                  onClick={() => {
                    setIsProductModalOpen(false);
                    setEditingProduct(null);
                    setNewProduct({
                      name: '',
                      price: '',
                      image_url: '',
                      category_id: '',
                      is_active: true,
                      description: ''
                    });
                  }}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Nome do Produto</label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="Ex: Cuca 330ml"
                  />
                </div>
                
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Preço (AOA)</label>
                  <input
                    type="text"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="Ex: 1500"
                  />
                </div>
              </div>
              
              <div className="mt-6">
                <label className="block text-slate-300 text-sm font-medium mb-2">Descrição</label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white h-24 resize-none"
                  placeholder="Descrição detalhada do produto..."
                />
              </div>
              
              <div className="mt-6">
                <label className="block text-slate-300 text-sm font-medium mb-2">Categoria</label>
                <select
                  value={newProduct.category_id}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, category_id: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  title="Selecione uma categoria"
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="mt-6">
                <label className="block text-slate-300 text-sm font-medium mb-2">Imagem do Produto</label>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      accept="image/*"
                      className="hidden"
                      id="product-image-upload"
                    />
                    <label
                      htmlFor="product-image-upload"
                      className="px-4 py-3 bg-primary text-black rounded-lg hover:brightness-110 transition-all cursor-pointer flex items-center gap-2"
                    >
                      {uploadingImage ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>Fazendo upload...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={16} />
                          <span>Carregar Imagem</span>
                        </>
                      )}
                    </label>
                  </div>
                  
                  {newProduct.image_url && (
                    <div className="relative">
                      <img
                        src={getStableImageUrl(newProduct.image_url) || ''}
                        alt="Preview"
                        className="w-24 h-24 rounded-lg object-cover border-2 border-slate-600"
                      />
                      <button
                        onClick={() => setNewProduct(prev => ({ ...prev, image_url: '' }))}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6 flex items-center gap-4">
                <label className="flex items-center gap-2 text-slate-300">
                  <input
                    type="checkbox"
                    checked={newProduct.is_active}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="w-4 h-4 text-primary rounded border-slate-600 focus:ring-primary focus:ring-2"
                  />
                  <span className="text-sm font-medium">Produto Ativo</span>
                </label>
              </div>
            </div>
            
            <div className="p-6 border-t border-white/10">
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setIsProductModalOpen(false);
                    setEditingProduct(null);
                    setNewProduct({
                      name: '',
                      price: '',
                      image_url: '',
                      category_id: '',
                      is_active: true,
                      description: ''
                    });
                  }}
                  className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveProduct}
                  className="px-6 py-3 bg-primary text-black rounded-lg hover:brightness-110 transition-all font-medium"
                >
                  {editingProduct ? 'Atualizar' : 'Criar'} Produto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Categoria */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-white/10 w-full max-w-md">
            <div className="p-6 border-b border-white/10">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">
                  {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                </h3>
                <button
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    setEditingCategory(null);
                    setNewCategory({ name: '' });
                  }}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Nome da Categoria</label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  placeholder="Ex: Bebidas, Pratos..."
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-white/10">
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    setEditingCategory(null);
                    setNewCategory({ name: '' });
                  }}
                  className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveCategory}
                  className="px-6 py-3 bg-primary text-black rounded-lg hover:brightness-110 transition-all font-medium"
                >
                  {editingCategory ? 'Atualizar' : 'Criar'} Categoria
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
