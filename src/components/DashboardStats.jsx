// components/DashboardStats.jsx - WITH IMPROVED DATA LOADING
import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Package, AlertTriangle, DollarSign, Calendar, ShoppingCart, CreditCard, RefreshCw } from 'lucide-react';
import { salesAPI, purchasesAPI, inventoryAPI } from './../../services/api';
import { useLocation } from 'react-router-dom';

const DashboardStats = () => {
  const [stats, setStats] = useState({
    todaySales: 0,
    todayPurchases: 0,
    weekSales: 0,
    weekPurchases: 0,
    monthSales: 0,
    monthPurchases: 0,
    yearSales: 0,
    yearPurchases: 0,
    totalRevenue: 0,
    totalProfit: 0,
    lowStock: 0,
    totalItemsInStock: 0
  });
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const location = useLocation();

  // Memoized fetch function to prevent unnecessary re-renders
  const fetchStats = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      console.log('Fetching dashboard stats...', { forceRefresh });

      // Add cache busting for force refresh
      const cacheBuster = forceRefresh ? `?t=${Date.now()}` : '';
      
      const [
        todaySalesRes,
        todayPurchasesRes,
        weekSalesRes,
        weekPurchasesRes,
        monthSalesRes,
        monthPurchasesRes,
        yearSalesRes,
        yearPurchasesRes,
        lowStockRes,
        inventoryRes
      ] = await Promise.all([
        salesAPI.getAll({ period: 'day', cacheBuster }),
        purchasesAPI.getAll({ period: 'day', cacheBuster }),
        salesAPI.getAll({ period: 'week', cacheBuster }),
        purchasesAPI.getAll({ period: 'week', cacheBuster }),
        salesAPI.getAll({ period: 'month', cacheBuster }),
        purchasesAPI.getAll({ period: 'month', cacheBuster }),
        salesAPI.getAll({ period: 'year', cacheBuster }),
        purchasesAPI.getAll({ period: 'year', cacheBuster }),
        inventoryAPI.getLowStock(cacheBuster),
        inventoryAPI.getAll(cacheBuster)
      ]);

      const calcTotal = (res) => res.data.data?.reduce((sum, item) => sum + (item.totalAmount || item.amount || 0), 0) || 0;

      const todaySales = calcTotal(todaySalesRes);
      const todayPurchases = calcTotal(todayPurchasesRes);
      const weekSales = calcTotal(weekSalesRes);
      const weekPurchases = calcTotal(weekPurchasesRes);
      const monthSales = calcTotal(monthSalesRes);
      const monthPurchases = calcTotal(monthPurchasesRes);
      const yearSales = calcTotal(yearSalesRes);
      const yearPurchases = calcTotal(yearPurchasesRes);

      const newStats = {
        todaySales,
        todayPurchases,
        weekSales,
        weekPurchases,
        monthSales,
        monthPurchases,
        yearSales,
        yearPurchases,
        totalRevenue: yearSales,
        totalProfit: yearSales - yearPurchases,
        lowStock: lowStockRes.data.count || 0,
        totalItemsInStock: inventoryRes.data.data?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
      };

      setStats(newStats);
      setLastRefreshed(new Date());
      
      // Store in localStorage for quick retrieval
      localStorage.setItem('dashboardStats', JSON.stringify({
        data: newStats,
        timestamp: Date.now()
      }));
      
      console.log('Dashboard stats loaded successfully');
    } catch (error) {
      console.error('Failed to load stats:', error);
      
      // Try to load from localStorage if API fails
      try {
        const cached = localStorage.getItem('dashboardStats');
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          // Use cached data if less than 5 minutes old
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            setStats(data);
            console.log('Loaded stats from cache');
          }
        }
      } catch (cacheError) {
        console.error('Failed to load from cache:', cacheError);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check if we need to load fresh data
    const cached = localStorage.getItem('dashboardStats');
    let shouldFetch = true;
    
    if (cached) {
      const { timestamp } = JSON.parse(cached);
      // Don't fetch if data is less than 2 minutes old
      if (Date.now() - timestamp < 2 * 60 * 1000) {
        shouldFetch = false;
        const { data } = JSON.parse(cached);
        setStats(data);
        setLoading(false);
        console.log('Using cached dashboard data');
      }
    }
    
    if (shouldFetch) {
      fetchStats();
    }

    // Set up visibility change listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // User switched back to this tab, refresh data
        const lastRefresh = localStorage.getItem('dashboardLastFetch');
        if (lastRefresh && Date.now() - parseInt(lastRefresh) > 60000) {
          fetchStats(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Auto-refresh every 2 minutes
    const interval = setInterval(() => {
      fetchStats(true);
    }, 2 * 60 * 1000);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchStats]);

  // Add manual refresh function
  const handleManualRefresh = () => {
    fetchStats(true);
  };

  // Listen for custom events to refresh dashboard
  useEffect(() => {
    const handleRefreshEvent = () => {
      console.log('Received refresh event for dashboard');
      fetchStats(true);
    };

    // Listen for custom events from other components
    window.addEventListener('refresh-dashboard', handleRefreshEvent);
    
    // Listen for storage events (other tabs)
    const handleStorageChange = (e) => {
      if (e.key === 'dashboard-needs-refresh') {
        fetchStats(true);
        localStorage.removeItem('dashboard-needs-refresh');
      }
    };
    
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('refresh-dashboard', handleRefreshEvent);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [fetchStats]);

  // Chart Data
  const performanceData = [
    { period: 'Today', Sales: stats.todaySales, Purchases: stats.todayPurchases },
    { period: 'This Week', Sales: stats.weekSales, Purchases: stats.weekPurchases },
    { period: 'This Month', Sales: stats.monthSales, Purchases: stats.monthPurchases }
  ];

  const annualData = [
    { name: 'Sales', value: stats.yearSales },
    { name: 'Purchases', value: stats.yearPurchases },
    { name: 'Profit', value: stats.yearSales - stats.yearPurchases }
  ];

  const dailyComparisonData = [
    { name: 'Sales', today: stats.todaySales, week: stats.weekSales },
    { name: 'Purchases', today: stats.todayPurchases, week: stats.weekPurchases }
  ];

  const profitTrendData = [
    { period: 'Today', profit: stats.todaySales - stats.todayPurchases },
    { period: 'Week', profit: stats.weekSales - stats.weekPurchases },
    { period: 'Month', profit: stats.monthSales - stats.monthPurchases },
    { period: 'Year', profit: stats.yearSales - stats.yearPurchases }
  ];

  const COLORS = ['#10b981', '#ef4444', '#3b82f6'];

  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <div className="animate-spin text-gray-400">
            <RefreshCw size={20} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
              <div className="h-7 bg-gray-200 rounded w-20"></div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
          <div className="h-80 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header with Refresh Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          {lastRefreshed && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <button
          onClick={handleManualRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          title="Refresh Dashboard"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium mb-1">Total Revenue</p>
              <p className="text-xl font-semibold text-gray-800">Rs. {stats.totalRevenue.toLocaleString()}</p>
            </div>
            <TrendingUp size={32} className="text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium mb-1">Items in Stock</p>
              <p className="text-xl font-semibold text-gray-800">{stats.totalItemsInStock.toLocaleString()}</p>
            </div>
            <Package size={32} className="text-purple-500" />
          </div>
        </div>

        <div className={`bg-white rounded-xl shadow-sm p-5 border-l-4 ${stats.lowStock > 0 ? 'border-red-500' : 'border-gray-300'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium mb-1">Low Stock</p>
              <p className={`text-xl font-semibold ${stats.lowStock > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                {stats.lowStock} Items
              </p>
            </div>
            <AlertTriangle size={32} className={stats.lowStock > 0 ? 'text-red-500' : 'text-gray-400'} />
          </div>
        </div>
      </div>

      {/* Main Performance Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Sales & Purchases Overview</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={performanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip 
                formatter={(value) => [`Rs. ${value.toLocaleString()}`, '']}
                labelFormatter={(label) => `${label}`}
              />
              <Bar dataKey="Sales" name="Sales" fill="#10b981" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Purchases" name="Purchases" fill="#ef4444" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row - Today vs Week & Annual Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today vs Week Comparison */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Today vs Week Comparison</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`Rs. ${value.toLocaleString()}`, '']} />
                <Bar dataKey="today" name="Today" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="week" name="This Week" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Annual Performance Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Annual Performance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={annualData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: Rs. ${value.toLocaleString()}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {annualData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `Rs. ${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-green-50 rounded">
              <p className="text-sm text-gray-600">Sales</p>
              <p className="font-semibold text-gray-800">Rs. {stats.yearSales.toLocaleString()}</p>
            </div>
            <div className="p-2 bg-red-50 rounded">
              <p className="text-sm text-gray-600">Purchases</p>
              <p className="font-semibold text-gray-800">Rs. {stats.yearPurchases.toLocaleString()}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded">
              <p className="text-sm text-gray-600">Profit</p>
              <p className="font-semibold text-blue-700">
                Rs. {(stats.yearSales - stats.yearPurchases).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Profit Trend Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Profit Trend</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={profitTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip formatter={(value) => [`Rs. ${value.toLocaleString()}`, 'Profit']} />
              <Line 
                type="monotone" 
                dataKey="profit" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// Export a helper function to trigger refresh from other components
export const refreshDashboardData = () => {
  // Dispatch custom event
  window.dispatchEvent(new Event('refresh-dashboard'));
  
  // Set flag in localStorage for other tabs
  localStorage.setItem('dashboard-needs-refresh', Date.now().toString());
};

export default DashboardStats;