import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStore } from '../store/useStore';
import {
  ProductStockInfo,
  classifyABC,
  calculateProductStockInfo,
  fetchSalesDataForStock,
  checkStockAlerts,
  Supplier,
  StockPurchase,
  StockInventory,
  fetchSuppliers,
  fetchPurchases,
  fetchInventories,
} from '../lib/stockAdvancedService';

export const useStockAdvanced = () => {
  const { menu, categories } = useStore();
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<StockPurchase[]>([]);
  const [inventories, setInventories] = useState<StockInventory[]>([]);
  const [salesData, setSalesData] = useState<{ product_id: string; total_qty: number; days: number }[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [suppliersData, purchasesData, inventoriesData, salesDataData] = await Promise.all([
      fetchSuppliers(),
      fetchPurchases(),
      fetchInventories(),
      fetchSalesDataForStock(30),
    ]);
    setSuppliers(suppliersData);
    setPurchases(purchasesData);
    setInventories(inventoriesData);
    setSalesData(salesDataData);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const productsWithStockInfo: ProductStockInfo[] = useMemo(() => {
    if (!menu || menu.length === 0) return [];
    const products = menu.map((product: any) => {
      const cat = categories.find((c: any) => c.id === product.category_id);
      return calculateProductStockInfo(product, cat?.name || 'Sem Categoria', salesData);
    });
    return classifyABC(products);
  }, [menu, categories, salesData]);

  const alerts = useMemo(() => checkStockAlerts(productsWithStockInfo), [productsWithStockInfo]);

  const stats = useMemo(() => {
    const totalProducts = productsWithStockInfo.length;
    const outOfStock = productsWithStockInfo.filter(p => p.status === 'OUT').length;
    const lowStock = productsWithStockInfo.filter(p => p.status === 'LOW').length;
    const okStock = productsWithStockInfo.filter(p => p.status === 'OK').length;
    const totalValueCost = productsWithStockInfo.reduce((s, p) => s + p.stock_value_cost, 0);
    const totalValueSale = productsWithStockInfo.reduce((s, p) => s + p.stock_value_sale, 0);
    const potentialProfit = productsWithStockInfo.reduce((s, p) => s + p.potential_profit, 0);
    const criticalProducts = productsWithStockInfo.filter(p => p.status === 'OUT' || p.status === 'LOW');
    const classA = productsWithStockInfo.filter(p => p.abc_class === 'A');
    const classB = productsWithStockInfo.filter(p => p.abc_class === 'B');
    const classC = productsWithStockInfo.filter(p => p.abc_class === 'C');

    return {
      totalProducts,
      outOfStock,
      lowStock,
      okStock,
      totalValueCost,
      totalValueSale,
      potentialProfit,
      criticalProducts,
      classA,
      classB,
      classC,
    };
  }, [productsWithStockInfo]);

  return {
    loading,
    productsWithStockInfo,
    alerts,
    stats,
    suppliers,
    purchases,
    inventories,
    refresh: loadData,
  };
};
