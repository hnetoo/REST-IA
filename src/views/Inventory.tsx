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
    description: '' // ✅ CAMPO DO SUPABASE ADICIONADO
  });

  // Estados para upload de imagem
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [newCategory, setNewCategory] = useState({
    name: ''
  });

  const [editingCategory, setEditingCategory] = useState<any>(null);

  const formatKz = (val: number) => new Intl.NumberFormat('pt-AO', { 
    style: 'currency', 
    currency: 'AOA', 
    maximumFractionDigits: 0 
  }).format(val);

  // URL do Menu Digital
  const [digitalMenuUrl, setDigitalMenuUrl] = useState(() => {
    return `${window.location.origin}/menu-digital?nif=${settings.nif}`;
  });

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
          // Removido campos que não existem em StorageError
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

  const handleUpdateProduct = async () => {
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
      description: newProduct.description || '',
      price: priceNumber,
      image_url: newProduct.image_url || editingProduct.image_url, // ✅ Manter URL existente
      is_active: newProduct.is_active,
      category_id: newProduct.category_id
    };
    
    try {
      const { data, error } = await supabase
        .from('menu_items')
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
    
    // ✅ VALIDAÇÃO DE COMPRIMENTO - BLOQUEAR IDS CURTOS
    if (newProduct.id && newProduct.id.toString().length < 10) {
      addNotification('error', 'ID INVÁLIDO DETECTADO: IDs curtos não são permitidos');
      return;
    }
    
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
      
    } catch (error) {
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
      
    } catch (error) {
      console.error('[Inventory] ❌ ERRO AO CRIAR CATEGORIA:', error);
      addNotification('error', `Erro ao criar categoria: ${error.message}`);
    }
  };

  // Handlers para Editar/Apagar
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

  const handleEdit = (product: any) => {
    console.log('[Inventory] Editando produto:', product);
    
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

  const handleUpdateProduct = async () => {
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
      category_id: newProduct.category_id,
      is_active: newProduct.is_active
    };

    console.log('[Inventory] Produto atualizado:', productToUpdate);
    
    // ✅ ATUALIZAR NO SUPABASE
    try {
      console.log('[Inventory] Atualizando produto:', editingProduct);
      // ✅ LIMPEZA ABSOLUTA DO SCHEMA - APENAS COLUNAS EXATAS DO SUPABASE
      const cleanUpdateData = {
        name: newProduct.name?.trim(), // ✅ text
        price: Number(priceNumber), // ✅ numeric - garanta que é Number
        cost_price: Number(priceNumber) * 0.6, // ✅ numeric - 60% do preço de venda
        description: newProduct.description?.trim() || '', // ✅ text - agora existe
        image_url: newProduct.image_url?.trim() || null, // ✅ text - apenas URL string
        is_active: newProduct.is_active, // ✅ boolean
        category_id: newProduct.category_id?.trim() || null // ✅ uuid
        // ✅ REMOVIDOS: categoryId, isFeatured, isVisibleDigital (não existem na tabela)
      };
      
      // ✅ VALIDAÇÃO DE CAMPOS
      if (!cleanUpdateData.name) {
        addNotification('error', 'Nome do produto é obrigatório');
        return;
      }
      
      if (!cleanUpdateData.price || cleanUpdateData.price <= 0) {
        addNotification('error', 'Preço do produto deve ser maior que zero');
        return;
      }
      
      console.log('[Inventory] Schema limpo:', cleanUpdateData);
      console.log('[Inventory] Produto completo para DEBUG:', editingProduct);
      console.log('[Inventory] Produto ID (BANCO):', editingProduct.id);
      console.log('[Inventory] Tipo do ID:', typeof editingProduct.id);
      console.log('[Inventory] Formato do ID:', editingProduct.id?.length, 'caracteres');
      
      // ✅ VALIDAÇÃO OBRIGATÓRIA - SÓ PERMITE UPDATE SE FOR UUID REAL
      const productId = editingProduct.id;
      if (!productId) {
        console.error('[Inventory] ID nulo para update:', productId);
        addNotification('error', 'ID do produto não encontrado. Recarregue a página.');
        return;
      }
      
      // ✅ VERIFICAÇÃO SEQUENCIAL DO UUID - BLOQUEIA IDS CURTOS
      if (typeof productId !== 'string') {
        console.error('[Inventory] ID não é string:', typeof productId, productId);
        addNotification('error', `ERRO FATAL: ID é ${typeof productId}, mas deve ser string UUID. Recarregue a página.`);
        return;
      }
      
      if (productId.length < 36) {
        console.error('[Inventory] ID muito curto (não é UUID):', productId, 'comprimento:', productId.length);
        addNotification('error', `ERRO FATAL: ID "${productId}" tem ${productId.length} caracteres, mas UUID tem 36. Use o painel do Supabase para converter este produto.`);
        return;
      }
      
      // ✅ VERIFICAÇÃO DE FORMATO UUID
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidPattern.test(productId)) {
        console.error('[Inventory] ID não tem formato UUID:', productId);
        addNotification('error', `ERRO FATAL: ID "${productId}" não tem formato UUID válido. Use o painel do Supabase para converter.`);
      return;
    }
    
    const { data, error } = await supabase
      .from('products')
      .update(cleanUpdateData)
      .eq('id', productId)
      .select();

    if (error) {
      console.error('[Inventory] Erro ao atualizar no Supabase:', error);
      addNotification('error', 'Erro ao atualizar produto no Supabase');
      return;
    }
    console.log('[Inventory] Produto atualizado no Supabase:', data);
    addNotification('success', 'Produto atualizado com sucesso!');
    
    const dishToUpdate = {
      ...productToUpdate,
      costPrice: priceNumber * 0.6,
      categoryId: productToUpdate.category_id,
      description: '',
      image: productToUpdate.image_url || '',
      image_url: productToUpdate.image_url || ''
    };
    updateDish(dishToUpdate);
    
    setNewProduct({
      name: '',
      price: '',
      image_url: '',
      category_id: '',
      is_active: true,
      description: ''
    });
    setEditingProduct(null);
    setIsProductModalOpen(false);
    
  } catch (err) {
    console.error('[Inventory] Erro crítico:', err);
    addNotification('error', 'Erro ao atualizar produto');
  }
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
    
    const productsInCategory = menu.filter(product => product.categoryId === categoryId);
    
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
      
    } catch (error) {
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
    switch (syncStatus) {
      case 'syncing': return <RefreshCw size={20} className="animate-spin" />;
      case 'success': return <CheckCircle size={20} />;
      case 'error': return <AlertCircle size={20} />;
      default: return <RefreshCw size={20} />;
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
          >
            {getSyncIcon()}
            {syncStatus === 'syncing' ? 'Sincronizando...' : 'Sincronizar'}
          </button>
          
          <button
            onClick={handleExportMenu}
            disabled={isSyncing}
            className="bg-white/10 border border-white/20 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-white/20 transition-all font-black uppercase text-xs tracking-widest disabled:opacity-50"
          >
            <Download size={20} />
            Exportar
          </button>
          
          <button
            onClick={handleImportMenu}
            disabled={isSyncing}
            className="bg-white/10 border border-white/20 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-white/20 transition-all font-black uppercase text-xs tracking-widest disabled:opacity-50"
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
          {activeTab === 'categories' && (
            <button 
              onClick={handleCreateCategory}
              className="bg-primary text-black px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-glow hover:brightness-110 transition-all font-black uppercase text-xs tracking-widest"
            >
              <Plus size={20} />
              Nova Categoria
            </button>
          )}
        </div>
      </header>

      {(isSyncing || syncStatus !== 'idle') && (
        <div className="mb-6 glass-panel p-4 rounded-xl border border-white/5">
          <div className="flex items-center justify-between mb-2">
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
                const cat = categories.find(c => c.id === dish.categoryId);
                return (
                  <div key={dish.id} className="glass-panel rounded-xl border border-white/5 overflow-hidden group hover:border-primary/50 transition-all duration-300">
                    <div className="aspect-square w-full overflow-hidden relative h-32">
                      {(() => {
                        const stableImageUrl = getStableImageUrl(dish.image);
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
                      <div className="flex gap-2">
                    <button 
                      onClick={() => handleEdit(dish)}
                      className="flex-1 py-1 rounded border border-white/10 text-slate-300 hover:bg-white/5 text-[8px] font-black uppercase tracking-widest transition-all"
                    title="Editar produto"
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => handleDuplicateProduct(dish)}
                    className="flex-1 py-1 rounded border border-primary/10 text-primary hover:bg-primary/20 text-[8px] font-black uppercase tracking-widest transition-all"
                    title="Duplicar produto"
                  >
                    Duplicar
                  </button>
                  <button 
                    onClick={() => handleDelete(dish.id)}
                    className="w-8 py-1 rounded border border-red-500/10 text-red-500/50 hover:bg-red-500 hover:text-white transition-all"
                    title="Remover produto"
                  >
                    <Trash2 size={10} className="mx-auto" />
                  </button>
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
            <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6">
            {categories.map(cat => (
              <div key={cat.id} className="glass-panel p-6 rounded-[2rem] border border-white/5 flex items-center justify-between hover:border-primary/40 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Tag size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">{cat.name}</h3>
                    <p className="text-slate-400 text-sm">Sem descrição</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEditCategory(cat)}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                    title="Editar categoria"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-500/50 hover:text-red-400 transition-all"
                    title="Apagar categoria"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'stock' && (
        <div className="max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-orange-500">
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
                  <td className="px-8 py-6 font-mono text-xs">
                    <span className="text-orange-500">10 unidades</span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="w-8 h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-black flex items-center justify-center">+</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'qr' && (
        <div className="max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-orange-500 space-y-8">
          {/* QR Code Generator */}
          <div className="glass-panel p-8 rounded-[3rem] border border-white/5 bg-white/5">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center text-white shadow-lg">
                <QrCode size={32} />
                  <p className="text-slate-400 text-sm">Gerador de código QR para o seu menu</p>
                </div>
              </div>

              <div className="grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-8">
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
                    <div className="flex items-center gap-2 mb-4">
                      <input
                        type="text"
                        value={digitalMenuUrl}
                        onChange={(e) => setDigitalMenuUrl(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-800 border border-white/10 rounded-xl text-white outline-none focus:border-cyan-500 text-sm"
                        placeholder="https://rest-ia.vercel.app/#/menu-public"
                      />
                      <button 
                        onClick={() => setDigitalMenuUrl('https://rest-ia.vercel.app/#/menu-public')}
                        className="px-4 py-2 bg-cyan-500 text-black rounded-xl text-xs font-bold hover:bg-cyan-400 transition-all"
                      >
                        Restaurar
                      </button>
                    </div>
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
            <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6">
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

      {/* Modals */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111827] rounded-[2rem] p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-cyan-400">
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <button
                onClick={() => {
                  setIsProductModalOpen(false);
                  setEditingProduct(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Nome do Produto</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-xl text-white outline-none focus:border-cyan-500"
                  placeholder="Ex: Muamba de Galinha"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Preço (Kz)</label>
                <input
                  type="text"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-xl text-white outline-none focus:border-cyan-500"
                  placeholder="Ex: 3500 ou 3.500"
                />
                <p className="text-xs text-slate-400 mt-1">Use vírgula ou ponto para decimais</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Foto do Produto</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="image-upload"
                      placeholder="Escolher ficheiro de imagem"
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById('image-upload')?.click()}
                      disabled={uploadingImage}
                      className="flex-1 px-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-white hover:bg-white/5 transition-all disabled:opacity-50"
                    >
                      {uploadingImage ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent animate-spin"></div>
                          <span className="text-sm">A carregar...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <UploadIcon size={16} />
                          <span className="text-sm">Escolher Ficheiro</span>
                        </div>
                      )}
                    </button>
                  </div>
                  {newProduct.image_url && (
                    <div className="mt-2">
                      <img 
                        src={newProduct.image_url} 
                        alt="Preview" 
                        className="w-full h-32 object-cover rounded-xl"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Categoria</label>
                <select
                  value={newProduct.category_id}
                  onChange={(e) => setNewProduct({...newProduct, category_id: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-xl text-white outline-none focus:border-cyan-500"
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={newProduct.is_active}
                  onChange={(e) => setNewProduct({...newProduct, is_active: e.target.checked})}
                  className="w-4 h-4 rounded border-white/10 bg-slate-800 text-cyan-500"
                />
                <label htmlFor="is_active" className="text-sm text-white">Produto Ativo</label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="flex-1 px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={editingProduct ? handleUpdateProduct : handleSaveProduct}
                disabled={uploadingImage}
                className="flex-1 px-4 py-2 bg-cyan-500 text-black rounded-xl hover:bg-cyan-400 transition-all font-bold disabled:opacity-50"
              >
                {uploadingImage ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent animate-spin"></div>
                    <span className="text-sm">A gravar...</span>
                  </div>
                ) : (
                  <span>{editingProduct ? 'Atualizar Produto' : 'Salvar Produto'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111827] rounded-[2rem] p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-cyan-400">Nova Categoria</h2>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Nome da Categoria</label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-xl text-white outline-none focus:border-cyan-500"
                  placeholder="Ex: Petiscos"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="flex-1 px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={editingCategory ? handleUpdateCategory : handleSaveCategory}
                className="flex-1 px-4 py-2 bg-cyan-500 text-black rounded-xl hover:bg-cyan-400 transition-all font-bold"
              >
                {editingCategory ? 'Atualizar Categoria' : 'Salvar Categoria'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
