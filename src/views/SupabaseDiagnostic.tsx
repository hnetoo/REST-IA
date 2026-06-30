import { useEffect, useState } from 'react';
import { supabase } from '../supabase_standalone';

const SupabaseDiagnostic = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const diagnose = async () => {
      try {
        // Buscar produtos
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .limit(10);

        if (productsError) {
          setError(`Erro ao buscar produtos: ${productsError.message}`);
          return;
        }

        setProducts(productsData || []);

        // Buscar categorias
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*');

        if (categoriesError) {
          setError(`Erro ao buscar categorias: ${categoriesError.message}`);
          return;
        }

        setCategories(categoriesData || []);
        setLoading(false);

      } catch (err) {
        setError(`Erro crítico: ${err}`);
        setLoading(false);
      }
    };

    diagnose();
  }, []);

  if (loading) {
    return (
      <div className="p-10 text-center font-bold text-white">
        Investigando Supabase...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center text-red-400">
        Erro: {error}
      </div>
    );
  }

  return (
    <div className="p-10 bg-slate-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Diagnóstico do Supabase</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Categorias ({categories.length})</h2>
        <div className="grid gap-2">
          {categories.map(cat => (
            <div key={cat.id} className="bg-slate-800 p-4 rounded">
              <p><strong>ID:</strong> {cat.id}</p>
              <p><strong>Nome:</strong> {cat.name}</p>
            </div>
          ))}
        </div>
      </div>
      
      <div>
        <h2 className="text-xl font-bold mb-4">Produtos ({products.length})</h2>
        <div className="grid gap-2">
          {products.map(prod => (
            <div key={prod.id} className={`p-4 rounded ${prod.category_id ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
              <p><strong>ID:</strong> {prod.id}</p>
              <p><strong>Nome:</strong> {prod.name}</p>
              <p><strong>Preço:</strong> {prod.price}</p>
              <p><strong>Category ID:</strong> {prod.category_id || 'SEM CATEGORIA'}</p>
              <p><strong>Imagem:</strong> {prod.image_url ? 'SIM' : 'NÃO'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SupabaseDiagnostic;
