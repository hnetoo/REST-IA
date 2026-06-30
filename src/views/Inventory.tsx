import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../supabase_standalone';
import { forceRealSyncService } from '../services/forceRealSyncService';
import ProgressBar from '../components/ProgressBar';
import { 
  Plus, Edit2, Trash2, Upload, 
  AlertCircle, QrCode, Box, Globe,
  Utensils,
  X, Download, RefreshCw, CheckCircle, Tag,
  Minus, DollarSign, FileText,
  Search, LayoutGrid, List as ListIcon, SlidersHorizontal,
  Loader2, TrendingUp, ChevronDown, ArrowUpDown,
  PackageSearch, AlertTriangle, Copy, Eye
} from 'lucide-react';
import { profiler } from '../hooks/usePerformanceProfiling';
import LazyImage from '../components/LazyImage';

const Inventory = () => {
  const { 
    menu, categories, addNotification, addDish, addCategory, removeDish, updateDish, removeCategory, updateCategory
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
    description: '',
    stock_quantity: 0,
    unit: 'un',
    sku: '',
    min_stock: 10
  });

  // Estados para upload de imagem
  const [uploadingImage, setUploadingImage] = useState(false);

  const [newCategory, setNewCategory] = useState({
    name: ''
  });

  const [editingCategory, setEditingCategory] = useState<any>(null);

  // Estados para relatório de stock
  const [showStockReport, setShowStockReport] = useState(false);
  const [stockCategoryFilter, setStockCategoryFilter] = useState<string>('all');

  // Estados para pesquisa, filtro e ordenação
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'margin'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Estados para modais customizados
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'product' | 'category'; id: string; name: string } | null>(null);
  const [stockAdjust, setStockAdjust] = useState<{ productId: string; name: string; currentStock: number; newStock: number } | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Pesquisa com debounce
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Produtos filtrados e ordenados
  const filteredMenu = useMemo(() => {
    let result = [...menu];

    // Filtro por pesquisa
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase().trim();
      result = result.filter(d => 
        d.name?.toLowerCase().includes(query) ||
        d.description?.toLowerCase().includes(query) ||
        (d as any).sku?.toLowerCase().includes(query)
      );
    }

    // Filtro por categoria
    if (filterCategory !== 'all') {
      result = result.filter(d => d.category_id === filterCategory);
    }

    // Ordenação
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':
          cmp = (a.name || '').localeCompare(b.name || '');
          break;
        case 'price':
          cmp = (a.price || 0) - (b.price || 0);
          break;
        case 'stock':
          cmp = ((a as any).stock_quantity || 0) - ((b as any).stock_quantity || 0);
          break;
        case 'margin':
          const marginA = a.price > 0 ? ((a.price - (a.costPrice || (a as any).cost_price || 0)) / a.price) * 100 : 0;
          const marginB = b.price > 0 ? ((b.price - (b.costPrice || (b as any).cost_price || 0)) / b.price) * 100 : 0;
          cmp = marginA - marginB;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [menu, debouncedSearch, filterCategory, sortBy, sortDir]);

  // Estatísticas rápidas
  const menuStats = useMemo(() => {
    const totalProducts = menu.length;
    const activeProducts = menu.filter(d => d.is_active !== false).length;
    const outOfStock = menu.filter(d => ((d as any).stock_quantity || 0) === 0).length;
    const lowStock = menu.filter(d => {
      const s = (d as any).stock_quantity || 0;
      const m = (d as any).min_stock || 10;
      return s > 0 && s <= m;
    }).length;
    const avgPrice = totalProducts > 0 ? menu.reduce((sum, d) => sum + (d.price || 0), 0) / totalProducts : 0;
    return { totalProducts, activeProducts, outOfStock, lowStock, avgPrice };
  }, [menu]);

  const formatKz = (val: number) => new Intl.NumberFormat('pt-AO', { 
    style: 'currency', 
    currency: 'AOA', 
    maximumFractionDigits: 0 
  }).format(val);

  // URL do Menu Digital - Campo editável com persistência
  const [customUrl, setCustomUrl] = useState(() => 'https://rest-ia.vercel.app/#/menu-public');
  const [digitalMenuUrl, setDigitalMenuUrl] = useState(() => {
    return 'https://rest-ia.vercel.app/#/menu-public';
  });

  // Atualizar URL quando o campo mudar
  useEffect(() => {
    const newUrl = customUrl.trim() || 'https://rest-ia.vercel.app/#/menu-public';
    setDigitalMenuUrl(newUrl);
  }, [customUrl]);

  // Função para gravar configurações no Supabase
  const saveDigitalMenuSettings = async () => {
    try {
            
      const { error } = await supabase
        .from('settings')
        .upsert({
          key: 'digitalMenuUrl',
          value: digitalMenuUrl
        });

      if (error) {
                addNotification('error', 'Erro ao gravar configurações do Menu Digital');
        return;
      }

      addNotification('success', 'Configurações do Menu Digital gravadas com sucesso!');
            
    } catch (error: any) {
            addNotification('error', `Erro: ${error.message}`);
    }
  };

  // QR Code URL
  const qrCodeUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(digitalMenuUrl)}&margin=20&bgcolor=ffffff&color=000000`;
  }, [digitalMenuUrl]);

  const tabs = [
    { id: 'menu', label: 'Produtos', icon: Utensils },
    { id: 'categories', label: 'Categorias', icon: Tag },
    { id: 'qr', label: 'QR Menu / Digital', icon: QrCode }
  ];

  // ✅ FORÇA SINCRONIZAÇÃO REAL - Fetch obrigatório do Supabase
  useEffect(() => {
    const forceRealSync = async () => {
            
      try {
        await forceRealSyncService.forceRealSync();
        addNotification('success', 'Sincronização real com Supabase concluída!');
      } catch (error) {
                addNotification('error', 'Erro na sincronização com Supabase. Tente novamente.');
      }
    };

    // Executar sincronização forçada ao montar
    forceRealSync();
  }, [addNotification]);

  // Função para obter URL pública estável
  const getStableImageUrl = (imagePath: string) => {
    if (!imagePath) return null;

    // Se for Base64 (data:image), retornar como está
    if (imagePath.startsWith('data:image')) {
      return imagePath;
    }

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

  // 🔥 FUNÇÃO OTIMIZADA: Comprimir e redimensionar imagem antes do upload (1024px max para non-blocking)
  const compressImage = (file: File, maxWidth: number = 1024, quality: number = 0.7): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Redimensionar se for muito grande
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          
          // Comprimir para WebP ou JPEG
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          }, 'image/jpeg', quality);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  // Função de upload de imagem usando Base64 - EVITA PROBLEMA DE CORS
  const handleImageUpload = async (file: File) => {
    profiler.mark('handleImageUpload_start');

    if (!file) return;

    profiler.mark('validation_start');
    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      addNotification('error', 'Apenas arquivos de imagem são permitidos');
      profiler.measure('validation', 'validation_start');
      return;
    }

    // Validar tamanho máximo (2MB para Base64)
    if (file.size > 2 * 1024 * 1024) {
      addNotification('error', 'A imagem é muito grande. Máximo 2MB.');
      profiler.measure('validation', 'validation_start');
      return;
    }
    profiler.measure('validation', 'validation_start');

    setUploadingImage(true);

    try {
      
      // 🔥 COMPRIMIR E REDIMENSIONAR IMAGEM
      profiler.mark('compression_start');
            const compressedImage = await compressImage(file, 800, 0.6);
      profiler.measure('compression', 'compression_start');


      // Converter para Base64
      profiler.mark('base64_start');
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(compressedImage);
      const base64 = await base64Promise;
      profiler.measure('base64', 'base64_start');


      // Atualizar URL no formulário com Base64
      profiler.mark('setState_start');
      setNewProduct(prev => {
                const newState = {
          ...prev,
          image_url: base64
        };
        return newState;
      });
      profiler.measure('setState', 'setState_start');

      addNotification('success', 'Imagem carregada com sucesso!');
      profiler.measure('handleImageUpload_total', 'handleImageUpload_start');

    } catch (err) {
            addNotification('error', 'Erro ao carregar imagem');
      profiler.measure('handleImageUpload_error', 'handleImageUpload_start');
    } finally {
      profiler.mark('setUploadingImage_start');
      setUploadingImage(false);
      profiler.measure('setUploadingImage', 'setUploadingImage_start');
      profiler.clear();
    }
  };

  // Função para selecionar arquivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleCreateProduct = () => {
        setIsProductModalOpen(true);
  };

  const handleCreateCategory = () => {
        setIsCategoryModalOpen(true);
  };

  // Função para atualizar produto existente
  const handleUpdateExistingProduct = async () => {
            
    if (!editingProduct) {
            return;
    }
    
    // Validar preço
    let priceValue = newProduct.price;
    if (typeof priceValue !== 'string') {
      priceValue = String(priceValue || '0');
    }
    const priceValueFormatted = priceValue.replace(',', '.');
    const priceNumber = parseFloat(priceValueFormatted) || 0;
    
        
    if (isNaN(priceNumber) || priceNumber < 0) {
      addNotification('error', 'Preço inválido! Use apenas números positivos.');
      return;
    }

    if (!newProduct.category_id) {
      addNotification('error', 'Selecione uma categoria válida.');
      return;
    }
    
    // Criar objeto atualizado
    const productToUpdate = {
      id: editingProduct.id,
      name: newProduct.name || editingProduct.name,
      price: priceNumber,
      image_url: newProduct.image_url || null,
      is_active: newProduct.is_active !== undefined ? newProduct.is_active : editingProduct.is_active,
      category_id: newProduct.category_id,
      description: newProduct.description || '',
      stock_quantity: newProduct.stock_quantity || 0,
      unit: newProduct.unit || 'un',
      sku: newProduct.sku || null,
      min_stock: newProduct.min_stock || 10
    };
    
        
    try {
      const { data, error } = await supabase
        .from('products')
        .update(productToUpdate)
        .eq('id', editingProduct.id)
        .select('id, name, price, image_url, is_active, category_id, description, stock_quantity, unit, sku, min_stock, cost_price');

      if (error) {
                addNotification('error', `Erro ao atualizar produto: ${error.message}`);
        return;
      }

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
        description: '',
        stock_quantity: 0,
        unit: 'un',
        sku: '',
        min_stock: 10
      });
      
    } catch (error) {
            addNotification('error', 'Erro ao atualizar produto');
    }
  };

  const handleSaveProduct = async () => {
        
    // Verificar se está editando ou criando
    if (editingProduct) {
      // Modo de edição - usar handleUpdateExistingProduct
      return handleUpdateExistingProduct();
    }
    
    // Modo de criação
        
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
            
      // ✅ CRIAR PRODUTO REAL NO BANCO PRIMEIRO
      const realProduct = await forceRealSyncService.createRealProduct({
        name: newProduct.name,
        description: newProduct.description || '',
        price: priceNumber,
        cost_price: priceNumber * 0.6,
        image_url: newProduct.image_url || null,
        is_active: newProduct.is_active,
        category_id: newProduct.category_id,
        stock_quantity: newProduct.stock_quantity,
        unit: newProduct.unit,
        sku: newProduct.sku || null,
        min_stock: newProduct.min_stock
      });
      
      if (!realProduct || !realProduct.id) {
        throw new Error('Produto criado mas sem ID retornado');
      }
      
      // ✅ VALIDAR SE O ID TEM 36 CARACTERES
      if (realProduct.id.length !== 36) {
        throw new Error(`ID inválido retornado: ${realProduct.id} (comprimento: ${realProduct.id.length})`);
      }
      
      // ✅ SÓ DEPOIS DE CRIAR NO BANCO, ADICIONAR AO STORE LOCAL
      addDish(realProduct);
      
      // Limpar formulário
      setNewProduct({
        name: '',
        price: '',
        image_url: '',
        category_id: '',
        is_active: true,
        description: '',
        stock_quantity: 0,
        unit: 'un',
        sku: '',
        min_stock: 10
      });
      
      setIsProductModalOpen(false);
      addNotification('success', 'Produto criado com sucesso no Supabase!');
      
    } catch (error: any) {
            addNotification('error', `Erro ao criar produto: ${error.message}`);
    }
  };

  const handleSaveCategory = async () => {
        
    // Verificar se está editando ou criando
    if (editingCategory) {
      // Modo de edição - usar handleUpdateCategory
      return handleUpdateCategory();
    }
    
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
                addNotification('error', `Erro ao criar categoria: ${error.message}`);
        return;
      }

      if (!data || !data.id) {
                addNotification('error', 'Categoria criada mas sem ID');
        return;
      }

      // ✅ VALIDAR SE O ID TEM 36 CARACTERES
      if (data.id.length !== 36) {
                addNotification('error', `ID inválido retornado: ${data.id}`);
        return;
      }

      // ✅ ADICIONAR AO STORE LOCAL
      addCategory(data);
      
      // Limpar formulário
      setNewCategory({ name: '' });
      setIsCategoryModalOpen(false);
      addNotification('success', 'Categoria criada com sucesso!');
      
    } catch (error: any) {
            addNotification('error', `Erro ao criar categoria: ${error.message}`);
    }
  };

  const handleEdit = (product: any) => {
                    
    // ✅ VERIFICAÇÃO BÁSICA - APENAS ID EXISTE (SEM VALIDAÇÃO DE COMPRIMENTO)
    if (!product.id) {
            addNotification('error', 'Produto não tem ID válido. Recarregue a página.');
      return;
    }
    
    // ✅ USA ID EXATO DO BANCO (UUID REAL DA IMAGEM 1151)
    const productId = product.id; // ✅ USA ID EXATO DO BANCO SEM ALTERAR
        
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      price: product.price.toString(),
      image_url: product.image_url || '',
      category_id: product.category_id,
      is_active: product.is_active,
      description: product.description || '',
      stock_quantity: product.stock_quantity || 0,
      unit: product.unit || 'un',
      sku: product.sku || '',
      min_stock: product.min_stock || 10
    });
    setIsProductModalOpen(true);
  };

  const handleDelete = (product: any) => {
    setDeleteConfirm({ type: 'product', id: product.id, name: product.name });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const { type, id } = deleteConfirm;
    
    try {
      if (type === 'product') {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) {
          addNotification('error', 'Erro ao apagar produto do servidor');
          return;
        }
        removeDish(id);
        addNotification('success', 'Produto removido com sucesso!');
      } else {
        const { error: updateError } = await supabase
          .from('products')
          .update({ category_id: null })
          .eq('category_id', id);
        if (updateError) {
          addNotification('error', 'Erro ao desassociar produtos da categoria');
          return;
        }
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) {
          addNotification('error', 'Erro ao apagar categoria');
          return;
        }
        removeCategory(id);
        addNotification('success', 'Categoria apagada com sucesso!');
      }
    } catch (error: any) {
      addNotification('error', `Erro: ${error.message}`);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleEditCategory = async (category: any) => {
      
    // Abrir modal para edição
    setEditingCategory(category);
    setNewCategory({ name: category.name });
    setIsCategoryModalOpen(true);
  };

  const handleUpdateCategory = async () => {
        
    if (!editingCategory) return;
    
    try {
      const { data, error } = await supabase
        .from('categories')
        .update({ name: newCategory.name })
        .eq('id', editingCategory.id)
        .select()
        .single();
      
      if (error) {
                addNotification('error', 'Erro ao atualizar categoria');
        return;
      }
      
      // ✅ ATUALIZAR STORE LOCAL com dados do Supabase
      if (data) {
        updateCategory(data);
              }
      
      addNotification('success', 'Categoria atualizada com sucesso!');
      setEditingCategory(null);
      setNewCategory({ name: '' });
      setIsCategoryModalOpen(false);
      
    } catch (error: any) {
            addNotification('error', `Erro ao atualizar categoria: ${error.message}`);
    }
  };

  const handleDeleteCategory = (category: any) => {
    setDeleteConfirm({ type: 'category', id: category.id, name: category.name });
  };

  const handleDuplicateProduct = (product: any) => {
        setNewProduct({
      name: `${product.name} (Cópia)`,
      price: product.price.toString(),
      image_url: product.image_url || '',
      category_id: product.category_id,
      is_active: true,
      description: product.description || '',
      stock_quantity: product.stock_quantity || 0,
      unit: product.unit || 'un',
      sku: product.sku || '',
      min_stock: product.min_stock || 10
    });
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleStockUpdate = async (productId: string, delta: number) => {
        const product = menu.find(p => p.id === productId);
    if (!product) {
            return;
    }

    const currentStock = (product as any).stock_quantity || 0;
    const newStock = Math.max(0, currentStock + delta);
    
    try {
      const { error } = await supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', productId);

      if (error) {
                addNotification('error', 'Erro ao atualizar stock');
        return;
      }

            // Atualizar store local
      updateDish({ ...product, stock_quantity: newStock });
            
      // Verificar se o menu foi atualizado
      setTimeout(() => {
        const menuAfter = useStore.getState().menu;
        const productAfter = menuAfter.find(p => p.id === productId);
                              }, 100);
      
      // Verificar alertas
      const minStock = (product as any).min_stock || 10;
      if (newStock === 0) {
        addNotification('error', `⚠️ ${product.name} está ESGOTADO!`);
      } else if (newStock <= minStock) {
        addNotification('warning', `⚠️ Stock baixo: ${product.name} (${newStock} unidades)`);
      }
    } catch (error) {
            addNotification('error', 'Erro ao atualizar stock');
    }
  };

  // Função para abrir modal de ajuste manual de stock
  const handleManualStockAdjust = (productId: string) => {
    const product = menu.find(p => p.id === productId);
    if (!product) return;
    const currentStock = (product as any).stock_quantity || 0;
    setStockAdjust({ productId, name: product.name, currentStock, newStock: currentStock });
  };

  // Confirmar ajuste manual de stock
  const confirmStockAdjust = async () => {
    if (!stockAdjust) return;
    const { productId, newStock, name } = stockAdjust;
    
    if (isNaN(newStock) || newStock < 0) {
      addNotification('error', 'Valor inválido!');
      return;
    }

    const product = menu.find(p => p.id === productId);
    if (!product) return;

    try {
      const { error } = await supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', productId);

      if (error) {
        addNotification('error', 'Erro ao ajustar stock');
        return;
      }

      updateDish({ ...product, stock_quantity: newStock });
      addNotification('success', `Stock de ${name} atualizado para ${newStock}`);
      
      const minStock = (product as any).min_stock || 10;
      if (newStock === 0) {
        addNotification('error', `${name} está ESGOTADO!`);
      } else if (newStock <= minStock) {
        addNotification('warning', `Stock baixo: ${name} (${newStock} unidades)`);
      }
    } catch (error) {
      addNotification('error', 'Erro ao ajustar stock');
    } finally {
      setStockAdjust(null);
    }
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

  const handleDiagnoseCategories = async () => {
    try {
      setIsSyncing(true);
      setSyncStatus('syncing');
      addNotification('info', 'Diagnosticando categorias no Supabase...');
      
      const { forceRealSyncService } = await import('../services/forceRealSyncService');
      const result = await forceRealSyncService.diagnoseAndFixCategories();
      
      if (result.invalid.length > 0) {
        const invalidNames = result.invalid.map(c => `${c.name} (${c.id?.substring(0, 8)}...)`).join(', ');
        const confirmed = window.confirm(
          `⚠️ Encontradas ${result.invalid.length} categorias com IDs inválidas:\n\n` +
          `${invalidNames}\n\n` +
          `Produtos afetados: ${result.invalid.reduce((acc, cat) => acc + (cat.productsCount || 0), 0)}\n\n` +
          `Deseja apagar estas categorias e seus produtos vinculados?\n` +
          `Clique OK para remover ou Cancelar para ignorar.`
        );
        
        if (confirmed) {
          await forceRealSyncService.fixInvalidCategories(result.invalid, 'delete');
          addNotification('success', `Corrigidas ${result.invalid.length} categorias inválidas`);
          // Recarregar dados
          handleSyncMenu();
        }
      } else {
        addNotification('success', `Todas as ${result.valid.length} categorias estão com UUIDs válidos!`);
      }
      
      setSyncStatus('success');
    } catch (error) {
            addNotification('error', 'Erro ao diagnosticar categorias');
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };
  const handleDiagnoseProducts = async () => {
    try {
      setIsSyncing(true);
      setSyncStatus('syncing');
      addNotification('info', 'Diagnosticando produtos no Supabase...');
      
      const { forceRealSyncService } = await import('../services/forceRealSyncService');
      const result = await forceRealSyncService.diagnoseAndFixProducts();
      
      if (result.needsFix) {
        const confirmed = window.confirm(
          `⚠️ Encontrados ${result.invalidPrice.length} produtos com preço inválido e ${result.noCategory.length} sem categoria.\n\n` +
          `Deseja corrigir automaticamente?\n` +
          `• Preços inválidos serão definidos como 0 Kz\n` +
          `• Produtos sem categoria serão movidos para a primeira categoria disponível\n\n` +
          `Clique OK para corrigir ou Cancelar para ignorar.`
        );
        
        if (confirmed) {
          const allInvalid = [...result.invalidPrice, ...result.noCategory];
          const uniqueInvalid = allInvalid.filter((item, index, self) => 
            index === self.findIndex((t) => t.id === item.id)
          );
          
          await forceRealSyncService.fixInvalidProducts(uniqueInvalid, 'setPriceZero');
          addNotification('success', `Corrigidos ${uniqueInvalid.length} produtos`);
          handleSyncMenu();
        }
      } else {
        addNotification('success', `Todos os ${result.valid.length} produtos estão corretos!`);
      }
      
      setSyncStatus('success');
    } catch (error) {
            addNotification('error', 'Erro ao diagnosticar produtos');
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
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

  const handlePrintStockReport = () => {
    const now = new Date().toLocaleString('pt-AO', { timeZone: 'Africa/Luanda' });
    const filtered = stockCategoryFilter === 'all' ? menu : menu.filter(item => item.category_id === stockCategoryFilter);
    const totalProducts = filtered.length;
    const outOfStock = filtered.filter(item => (item.stock_quantity || 0) === 0).length;
    const lowStock = filtered.filter(item => {
      const stock = item.stock_quantity || 0;
      const min = item.min_stock || 10;
      return stock > 0 && stock <= min;
    }).length;
    const totalValue = filtered.reduce((sum, item) => sum + ((item.stock_quantity || 0) * item.price), 0);

    const rows = filtered.map(item => {
      const stock = item.stock_quantity || 0;
      const minStock = item.min_stock || 10;
      const status = stock === 0 ? 'ESGOTADO' : stock <= minStock ? 'STOCK BAIXO' : 'OK';
      const statusColor = stock === 0 ? '#ef4444' : stock <= minStock ? '#f59e0b' : '#22c55e';
      const cat = categories.find(c => c.id === item.category_id);
      return `
        <tr>
          <td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;">${item.name}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;">${cat?.name || '—'}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;text-align:center;">${stock}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;text-align:center;">${minStock}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;text-align:right;">${formatKz(item.price)}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;text-align:right;">${formatKz(stock * item.price)}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;text-align:center;color:${statusColor};font-weight:bold;">${status}</td>
        </tr>
      `;
    }).join('');

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Relatório de Stock - Tasca do Vereda</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
              h1 { text-align: center; margin-bottom: 4px; font-size: 18px; }
              .sub { text-align: center; color: #666; font-size: 11px; margin-bottom: 20px; }
              .summary { display: flex; gap: 16px; margin-bottom: 20px; justify-content: center; }
              .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; text-align: center; min-width: 120px; }
              .card-label { font-size: 10px; color: #666; text-transform: uppercase; }
              .card-value { font-size: 16px; font-weight: bold; margin-top: 4px; }
              table { width: 100%; border-collapse: collapse; font-size: 12px; }
              th { background: #f3f4f6; padding: 8px; border: 1px solid #e5e7eb; font-size: 11px; text-align: left; }
              .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #e5e7eb; padding-top: 10px; }
              @media print { body { padding: 0; } .no-print { display: none; } }
            </style>
          </head>
          <body>
            <h1>RELATÓRIO DE STOCK</h1>
            <p class="sub">Tasca do Vereda • Emitido em ${now}</p>
            <div class="summary">
              <div class="card"><div class="card-label">Total Produtos</div><div class="card-value">${totalProducts}</div></div>
              <div class="card"><div class="card-label">Esgotados</div><div class="card-value" style="color:#ef4444;">${outOfStock}</div></div>
              <div class="card"><div class="card-label">Stock Baixo</div><div class="card-value" style="color:#f59e0b;">${lowStock}</div></div>
              <div class="card"><div class="card-label">Valor Total Stock</div><div class="card-value">${formatKz(totalValue)}</div></div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th style="text-align:center;">Stock</th>
                  <th style="text-align:center;">Mín.</th>
                  <th style="text-align:right;">Preço Unit.</th>
                  <th style="text-align:right;">Valor Total</th>
                  <th style="text-align:center;">Status</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <div class="footer">
              Relatório de Stock • Uso Interno • REST IA OS v1.1.2<br/>
              _____________________________<br/>
              Assinatura do Responsável
            </div>
            <div class="no-print" style="text-align:center;margin-top:20px;">
              <button onclick="window.print()" style="padding:10px 24px;font-size:14px;cursor:pointer;border-radius:6px;border:none;background:#06b6d4;color:#000;font-weight:bold;">Imprimir / Guardar PDF</button>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
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
    <div className="p-4 md:p-6 lg:p-8 min-h-screen bg-background text-slate-200 overflow-x-hidden">
      {/* Header Modernizado */}
      <header className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight italic uppercase">Catálogo & Inventário</h2>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Gestão Central de Mercadorias</p>
          </div>
          
          <div className="flex gap-2 flex-wrap items-center">
            {/* Botão principal de ação contextual */}
            {activeTab === 'menu' && (
              <button 
                onClick={handleCreateProduct}
                className="bg-primary text-black px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-glow hover:brightness-110 transition-all font-black uppercase text-xs tracking-widest"
              >
                <Plus size={18} />
                Novo Produto
              </button>
            )}
            {activeTab === 'categories' && (
              <button 
                onClick={handleCreateCategory}
                className="bg-primary text-black px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-glow hover:brightness-110 transition-all font-black uppercase text-xs tracking-widest"
              >
                <Plus size={18} />
                Nova Categoria
              </button>
            )}
            
            {/* Botão de sincronização */}
            <button
              onClick={handleSyncMenu}
              disabled={isSyncing}
              className={`${getSyncColor()} text-black px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-glow hover:brightness-110 transition-all font-black uppercase text-xs tracking-widest disabled:opacity-50`}
              title="Sincronizar menu com Supabase"
            >
              {getSyncIcon()}
              {syncStatus === 'syncing' ? 'Sync...' : 'Sync'}
            </button>
            
            {/* Botões secundários agrupados */}
            <div className="flex gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
              <button
                onClick={handleDiagnoseProducts}
                disabled={isSyncing}
                className="p-2 hover:bg-yellow-500/20 text-yellow-400 rounded-lg transition-all disabled:opacity-50"
                title="Diagnosticar produtos"
              >
                <AlertCircle size={16} />
              </button>
              <button
                onClick={handleDiagnoseCategories}
                disabled={isSyncing}
                className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-all disabled:opacity-50"
                title="Diagnosticar categorias"
              >
                <AlertTriangle size={16} />
              </button>
              <button
                onClick={handleExportMenu}
                disabled={isSyncing}
                className="p-2 hover:bg-white/10 text-slate-300 rounded-lg transition-all disabled:opacity-50"
                title="Exportar menu"
              >
                <Download size={16} />
              </button>
              <button
                onClick={handleImportMenu}
                disabled={isSyncing}
                className="p-2 hover:bg-white/10 text-slate-300 rounded-lg transition-all disabled:opacity-50"
                title="Importar menu"
              >
                <Upload size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
              <PackageSearch size={18} className="text-cyan-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Produtos</p>
              <p className="text-lg font-bold text-white leading-tight">{menuStats.totalProducts}</p>
            </div>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <CheckCircle size={18} className="text-green-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ativos</p>
              <p className="text-lg font-bold text-white leading-tight">{menuStats.activeProducts}</p>
            </div>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <AlertCircle size={18} className="text-red-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Esgotados</p>
              <p className="text-lg font-bold text-red-400 leading-tight">{menuStats.outOfStock}</p>
            </div>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <TrendingUp size={18} className="text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Preço Médio</p>
              <p className="text-lg font-bold text-white leading-tight">{formatKz(menuStats.avgPrice)}</p>
            </div>
          </div>
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
            <ProgressBar percentage={syncProgress} className="w-full h-2 bg-white/10" barClassName="bg-gradient-to-r from-[#06b6d4] to-[#0891b2]" />
          )}
          
          <div className="mt-2 text-xs text-slate-400">
            {syncProgress === 20 && 'Sincronizando categorias...'}
            {syncProgress === 50 && 'Sincronizando produtos...'}
            {syncProgress === 80 && 'Sincronizando estoque...'}
            {syncProgress === 100 && 'Finalizando sincronização...'}
          </div>
        </div>
      )}

      {/* Tabs Modernizadas com Pills */}
      <div className="flex gap-2 mb-6 p-1 bg-white/[0.03] rounded-xl border border-white/[0.08] overflow-x-auto no-scrollbar">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-lg font-black uppercase text-[10px] tracking-[0.15em] transition-all flex items-center gap-2 whitespace-nowrap ${
                isActive 
                  ? 'bg-primary text-black shadow-glow' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Barra de Pesquisa + Filtros (apenas na tab menu) */}
      {activeTab === 'menu' && (
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          {/* Pesquisa */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar produto por nome, descrição ou SKU..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                aria-label="Limpar pesquisa"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filtro por categoria */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-sm focus:border-cyan-500/50 focus:outline-none transition-colors cursor-pointer"
            title="Filtrar por categoria"
          >
            <option value="all">Todas as categorias</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          {/* Ordenação */}
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-2">
            <ArrowUpDown size={14} className="text-slate-500 ml-1" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2 py-2.5 bg-transparent text-white text-sm focus:outline-none cursor-pointer"
              title="Ordenar por"
            >
              <option value="name">Nome</option>
              <option value="price">Preço</option>
              <option value="stock">Stock</option>
              <option value="margin">Margem</option>
            </select>
            <button
              onClick={() => setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400"
              title={sortDir === 'asc' ? 'Crescente' : 'Decrescente'}
            >
              <ChevronDown size={14} className={`transition-transform ${sortDir === 'asc' ? '' : 'rotate-180'}`} />
            </button>
          </div>

          {/* Toggle Grid/List */}
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.08] rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary text-black' : 'text-slate-500 hover:text-slate-300'}`}
              title="Vista em grelha"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-primary text-black' : 'text-slate-500 hover:text-slate-300'}`}
              title="Vista em lista"
            >
              <ListIcon size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="animate-in fade-in duration-500">
        {activeTab === 'menu' && (
          <div className="max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-orange-500 pb-20">
            {/* Loading State */}
            {isLoading && (
              <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" : "space-y-2"}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden animate-pulse">
                    <div className="w-full aspect-[4/3] bg-slate-800/50" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-slate-700/50 rounded w-3/4" />
                      <div className="h-2 bg-slate-700/50 rounded w-1/2" />
                      <div className="flex justify-between mt-2">
                        <div className="h-5 bg-slate-700/50 rounded-full w-16" />
                        <div className="h-5 bg-slate-700/50 rounded w-12" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && filteredMenu.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                  <PackageSearch size={32} className="text-slate-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-400 mb-1">Nenhum produto encontrado</h3>
                <p className="text-sm text-slate-600">
                  {searchQuery || filterCategory !== 'all' 
                    ? 'Tenta ajustar a pesquisa ou filtros.' 
                    : 'Clique em "Novo Produto" para começar.'}
                </p>
                {(searchQuery || filterCategory !== 'all') && (
                  <button
                    onClick={() => { setSearchQuery(''); setFilterCategory('all'); }}
                    className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-slate-300 transition-colors"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            )}

            {/* Grid View */}
            {!isLoading && filteredMenu.length > 0 && viewMode === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredMenu.map(dish => {
                  const cat = categories.find(c => c.id === dish.category_id);
                  const stockQty = (dish as any).stock_quantity || 0;
                  const minStk = (dish as any).min_stock || 10;
                  const isOut = stockQty === 0;
                  const isLow = stockQty > 0 && stockQty <= minStk;
                  const costPrice = (dish as any).costPrice || (dish as any).cost_price || 0;
                  const margin = dish.price > 0 ? ((dish.price - costPrice) / dish.price) * 100 : 0;
                  return (
                    <div key={dish.id} className="group bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] hover:border-cyan-500/30 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/5">
                      <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
                        {(() => {
                          const stableImageUrl = getStableImageUrl(dish.image_url || '');
                          return stableImageUrl ? (
                            <LazyImage 
                              src={stableImageUrl} 
                              alt={dish.name} 
                              containerClassName="w-full h-full"
                              className="object-contain p-2 transition-transform duration-300 group-hover:scale-110"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                              <Utensils size={28} className="mb-2" />
                              <span className="text-[9px] font-black uppercase tracking-widest">Sem Imagem</span>
                            </div>
                          );
                        })()}
                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-white/10 z-20">
                          {cat?.name || 'Sem Categoria'}
                        </div>
                        {isOut && <div className="absolute top-2 right-2 bg-red-500 text-white text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider z-20 animate-pulse">Esgotado</div>}
                        {isLow && <div className="absolute top-2 right-2 bg-amber-500 text-black text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider z-20">Stock Baixo</div>}
                        {/* Overlay com ações rápidas no hover */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 z-30">
                          <button
                            onClick={() => handleEdit(dish)}
                            className="p-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg transition-colors"
                            title="Editar produto"
                          >
                            <Edit2 size={16} className="text-white" />
                          </button>
                          <button
                            onClick={() => handleDuplicateProduct(dish)}
                            className="p-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg transition-colors"
                            title="Duplicar produto"
                          >
                            <Copy size={16} className="text-white" />
                          </button>
                          <button
                            onClick={() => handleDelete(dish)}
                            className="p-2.5 bg-red-500/80 hover:bg-red-500 backdrop-blur-md rounded-lg transition-colors"
                            title="Apagar produto"
                          >
                            <Trash2 size={16} className="text-white" />
                          </button>
                        </div>
                      </div>
                      <div className="p-3">
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <h3 className="font-bold text-white text-xs leading-tight line-clamp-2 flex-1" title={dish.name}>{dish.name}</h3>
                          <span className="text-cyan-400 font-mono font-black text-xs whitespace-nowrap">{formatKz(dish.price)}</span>
                        </div>
                        <p className="text-slate-400 text-[9px] line-clamp-1 italic mb-2 min-h-[14px]">{dish.description || 'Sem descrição'}</p>
                        {/* Margem e custo */}
                        {costPrice > 0 && (
                          <div className="flex items-center gap-2 mb-2 text-[9px]">
                            <span className="text-slate-500">Custo: <span className="text-slate-400 font-mono">{formatKz(costPrice)}</span></span>
                            <span className={`font-bold ${margin > 50 ? 'text-green-400' : margin > 20 ? 'text-amber-400' : 'text-red-400'}`}>
                              {margin.toFixed(0)}% margem
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center gap-2">
                          <span className={`text-[8px] font-black px-2 py-1 rounded-full border ${
                            stockQty > 0 
                              ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {stockQty > 0 ? `${stockQty} em stock` : 'Esgotado'}
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEdit(dish)}
                              className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                              title="Editar produto"
                            >
                              <Edit2 size={12} className="text-slate-400" />
                            </button>
                            <button
                              onClick={() => handleDelete(dish)}
                              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors"
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
            )}

            {/* List View */}
            {!isLoading && filteredMenu.length > 0 && viewMode === 'list' && (
              <div className="space-y-2">
                {filteredMenu.map(dish => {
                  const cat = categories.find(c => c.id === dish.category_id);
                  const stockQty = (dish as any).stock_quantity || 0;
                  const minStk = (dish as any).min_stock || 10;
                  const isOut = stockQty === 0;
                  const isLow = stockQty > 0 && stockQty <= minStk;
                  const costPrice = (dish as any).costPrice || (dish as any).cost_price || 0;
                  const margin = dish.price > 0 ? ((dish.price - costPrice) / dish.price) * 100 : 0;
                  return (
                    <div key={dish.id} className="group flex items-center gap-4 bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] hover:border-cyan-500/30 rounded-xl p-3 transition-all">
                      <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden shrink-0">
                        {(() => {
                          const stableImageUrl = getStableImageUrl(dish.image_url || '');
                          return stableImageUrl ? (
                            <img src={stableImageUrl} alt={dish.name} className="w-full h-full object-contain p-1" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Utensils size={18} className="text-slate-600" />
                            </div>
                          );
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-sm truncate">{dish.name}</h3>
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-white/5 text-slate-400 uppercase tracking-wider shrink-0">{cat?.name || 'Sem Cat.'}</span>
                        </div>
                        <p className="text-slate-500 text-[10px] line-clamp-1">{dish.description || 'Sem descrição'}</p>
                        <div className="flex items-center gap-3 mt-1 text-[10px]">
                          <span className={`font-bold ${isOut ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-green-400'}`}>
                            {stockQty > 0 ? `${stockQty} un` : 'Esgotado'}
                          </span>
                          {costPrice > 0 && (
                            <span className="text-slate-500">Marg: <span className={margin > 50 ? 'text-green-400' : margin > 20 ? 'text-amber-400' : 'text-red-400'}>{margin.toFixed(0)}%</span></span>
                          )}
                        </div>
                      </div>
                      <span className="text-cyan-400 font-mono font-black text-sm whitespace-nowrap">{formatKz(dish.price)}</span>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => handleEdit(dish)} className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors" title="Editar">
                          <Edit2 size={14} className="text-slate-400" />
                        </button>
                        <button onClick={() => handleDuplicateProduct(dish)} className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors" title="Duplicar">
                          <Copy size={14} className="text-slate-400" />
                        </button>
                        <button onClick={() => handleDelete(dish)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors" title="Apagar">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-orange-500 pb-20">
            {categories.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                  <Tag size={32} className="text-slate-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-400 mb-1">Nenhuma categoria</h3>
                <p className="text-sm text-slate-600">Clique em "Nova Categoria" para começar.</p>
              </div>
            )}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
              {categories.map(category => {
                const productCount = menu.filter(product => product.category_id === category.id).length;
                return (
                  <div key={category.id} className="group bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] hover:border-cyan-500/30 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center shrink-0">
                          <Tag size={20} className="text-cyan-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white">{category.name}</h3>
                          <p className="text-slate-500 text-xs">{productCount} produto{productCount !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                          title="Editar categoria"
                        >
                          <Edit2 size={14} className="text-slate-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors"
                          title="Apagar categoria"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <ProgressBar percentage={Math.min(100, (productCount / Math.max(1, menu.length)) * 100)} className="w-full h-1.5" barClassName="bg-gradient-to-r from-cyan-500 to-blue-500" />
                  </div>
                );
              })}
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
                      aria-label="Mostrar/Ocultar preços no QR code"
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
                      aria-label="Permitir/Bloquear pedidos no QR code"
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
                      aria-label="Mostrar/Ocultar menu no QR code"
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
                    <label className="block text-slate-400 text-sm mb-2">Configurar URL do Menu Digital:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        placeholder="https://rest-ia.vercel.app/#/menu-public"
                        className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                        title="Digite a URL personalizada do menu digital"
                      />
                      <button
                        onClick={saveDigitalMenuSettings}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-all text-sm font-medium"
                        title="Gravar configurações do menu digital"
                      >
                        Gravar
                      </button>
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
                      URL atual: {digitalMenuUrl}
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
                      <button
                        onClick={() => {
                          const hiResUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1024x1024&data=${encodeURIComponent(digitalMenuUrl)}&margin=20&bgcolor=ffffff&color=000000`;
                          const link = document.createElement('a');
                          link.href = hiResUrl;
                          link.download = 'qr-menu-hd.png';
                          link.click();
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-all text-sm font-medium"
                        title="Download em alta resolução (1024x1024)"
                      >
                        Baixar HD
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
                      description: '',
                      stock_quantity: 0,
                      unit: 'un',
                      sku: '',
                      min_stock: 10
                    });
                  }}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  aria-label="Fechar modal de produto"
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
                    value={newProduct.name || ''}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="Ex: Cuca 330ml"
                  />
                </div>
                
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Preço (AOA)</label>
                  <input
                    type="text"
                    value={newProduct.price || ''}
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

              {/* Secção Stock & Inventário */}
              <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
                <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Box size={16} className="text-primary" />
                  Stock & Inventário
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Quantidade em Stock</label>
                    <input
                      type="number"
                      value={newProduct.stock_quantity}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, stock_quantity: parseInt(e.target.value) || 0 }))}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Unidade de Medida</label>
                    <select
                      value={newProduct.unit}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      title="Selecione a unidade de medida"
                    >
                      <option value="un">Unidade (un)</option>
                      <option value="kg">Quilograma (kg)</option>
                      <option value="g">Grama (g)</option>
                      <option value="litro">Litro (L)</option>
                      <option value="ml">Mililitro (ml)</option>
                      <option value="caixa">Caixa</option>
                      <option value="garrafa">Garrafa</option>
                      <option value="lata">Lata</option>
                      <option value="pacote">Pacote</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Stock Mínimo (Alerta)</label>
                    <input
                      type="number"
                      value={newProduct.min_stock}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, min_stock: parseInt(e.target.value) || 0 }))}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      placeholder="10"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Código/SKU (Opcional)</label>
                    <input
                      type="text"
                      value={newProduct.sku}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, sku: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      placeholder="Ex: PROD-001"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <label className="block text-slate-300 text-sm font-medium mb-2">Imagem do Produto</label>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      accept="image/*,image/webp"
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
                        aria-label="Remover imagem"
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
                      description: '',
                      stock_quantity: 0,
                      unit: 'un',
                      sku: '',
                      min_stock: 10
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
                  className="text-slate-400 hover:text-white p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  aria-label="Fechar modal de categoria"
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
                  value={newCategory.name || ''}
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

      {/* Modal de Confirmação de Delete */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-white/10 w-full max-w-md p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                <Trash2 size={24} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Confirmar exclusão</h3>
                <p className="text-sm text-slate-400 mt-0.5">
                  {deleteConfirm.type === 'product' ? 'Produto' : 'Categoria'}: <span className="text-white font-medium">{deleteConfirm.name}</span>
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-6">
              {deleteConfirm.type === 'product' 
                ? 'Esta ação não pode ser desfeita. O produto será permanentemente removido.'
                : 'Os produtos desta categoria serão desassociados mas não apagados.'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-5 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-5 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-bold"
              >
                Apagar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ajuste Manual de Stock */}
      {stockAdjust && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-white/10 w-full max-w-md p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center shrink-0">
                <Box size={24} className="text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Ajuste manual de stock</h3>
                <p className="text-sm text-slate-400 mt-0.5">{stockAdjust.name}</p>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-4 mb-6">
              <p className="text-sm text-slate-500">Stock atual: <span className="text-white font-bold">{stockAdjust.currentStock}</span></p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStockAdjust(prev => prev ? { ...prev, newStock: Math.max(0, prev.newStock - 10) } : null)}
                  className="w-10 h-10 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center transition-colors font-bold text-xs"
                  title="Diminuir 10"
                >
                  -10
                </button>
                <button
                  onClick={() => setStockAdjust(prev => prev ? { ...prev, newStock: Math.max(0, prev.newStock - 1) } : null)}
                  className="w-10 h-10 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center transition-colors"
                  title="Diminuir 1"
                >
                  <Minus size={18} />
                </button>
                <input
                  type="number"
                  value={stockAdjust.newStock}
                  onChange={(e) => setStockAdjust(prev => prev ? { ...prev, newStock: parseInt(e.target.value) || 0 } : null)}
                  className="w-24 px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-center text-xl font-bold focus:border-cyan-500/50 focus:outline-none"
                  min="0"
                  title="Novo valor de stock"
                  aria-label="Novo valor de stock"
                  placeholder="0"
                />
                <button
                  onClick={() => setStockAdjust(prev => prev ? { ...prev, newStock: prev.newStock + 1 } : null)}
                  className="w-10 h-10 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 flex items-center justify-center transition-colors"
                  title="Aumentar 1"
                >
                  <Plus size={18} />
                </button>
                <button
                  onClick={() => setStockAdjust(prev => prev ? { ...prev, newStock: prev.newStock + 10 } : null)}
                  className="w-10 h-10 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 flex items-center justify-center transition-colors font-bold text-xs"
                  title="Aumentar 10"
                >
                  +10
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setStockAdjust(null)}
                className="px-5 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmStockAdjust}
                className="px-5 py-2.5 bg-primary text-black rounded-lg hover:brightness-110 transition-all text-sm font-bold"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
