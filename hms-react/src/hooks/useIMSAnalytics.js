// hms-react/src/hooks/useIMSAnalytics.js
import { useState, useEffect, useCallback } from 'react';
import API from '../utils/api';

export function useIMSAnalytics(clinicId) {
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    outOfStock: 0,
    totalSales: 0,
    totalPurchases: 0,
    totalProfit: 0,
    recentOrders: [],
    topProducts: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    if (!clinicId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // ── FIX: Correct IMS API paths ──
      // IMS routes are mounted at /api/v1/ims in server.js
      // So the full path is /api/v1/ims/products
      const baseUrl = '/api/v1/ims';
      
      const [productsRes, salesRes, purchasesRes] = await Promise.all([
        API.get(`${baseUrl}/products?clinicId=${clinicId}`).catch(() => ({ data: { products: [] } })),
        API.get(`${baseUrl}/sales?clinicId=${clinicId}`).catch(() => ({ data: { sales: [] } })),
        API.get(`${baseUrl}/purchases?clinicId=${clinicId}`).catch(() => ({ data: { purchases: [] } })),
      ]);

      const products = productsRes.data?.products || [];
      const sales = salesRes.data?.sales || [];
      const purchases = purchasesRes.data?.purchases || [];

      // Calculate stats
      const totalProducts = products.length;
      const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= (p.reorderLevel || 5)).length;
      const outOfStock = products.filter(p => p.quantity === 0 || p.quantity <= 0).length;
      
      const totalSales = sales.reduce((sum, s) => sum + (s.total || 0), 0);
      const totalPurchases = purchases.reduce((sum, p) => sum + (p.total || 0), 0);
      const totalProfit = totalSales - totalPurchases;

      // Get top selling products
      const topProducts = sales
        .flatMap(s => s.items || [])
        .reduce((acc, item) => {
          const existing = acc.find(p => p.productId === item.productId);
          if (existing) {
            existing.quantity += item.quantity || 0;
            existing.total += item.total || 0;
          } else {
            acc.push({
              productId: item.productId || item.product?._id,
              productName: item.productName || item.name || 'Unknown',
              quantity: item.quantity || 0,
              total: item.total || 0,
            });
          }
          return acc;
        }, [])
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      setStats({
        totalProducts,
        lowStock,
        outOfStock,
        totalSales,
        totalPurchases,
        totalProfit,
        recentOrders: sales.slice(0, 10),
        topProducts,
      });
      
    } catch (err) {
      console.error('Failed to fetch IMS analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  return { stats, loading, error, refresh: fetchAnalytics };
}