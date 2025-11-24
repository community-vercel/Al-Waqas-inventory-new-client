// components/DashboardStats.jsx - WITH COMPREHENSIVE CHARTS
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Package, AlertTriangle, DollarSign, Calendar, ShoppingCart, CreditCard } from 'lucide-react';
import { salesAPI, purchasesAPI, inventoryAPI } from './../../services/api';

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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);

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
          salesAPI.getAll({ period: 'day' }),
          purchasesAPI.getAll({ period: 'day' }),
          salesAPI.getAll({ period: 'week' }),
          purchasesAPI.getAll({ period: 'week' }),
          salesAPI.getAll({ period: 'month' }),
          purchasesAPI.getAll({ period: 'month' }),
          salesAPI.getAll({ period: 'year' }),
          purchasesAPI.getAll({ period: 'year' }),
          inventoryAPI.getLowStock(),
          inventoryAPI.getAll()
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

        setStats({
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
          totalItemsInStock: inventoryRes.data.data?.reduce((sum, item) => sum + item.quantity, 0) || 0
        });
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

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
  const PROFIT_COLORS = {
    positive: '#10b981',
    negative: '#ef4444'
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
              <div className="h-7 bg-gray-200 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
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

        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium mb-1">Net Profit</p>
              <p className="text-xl font-semibold text-gray-800">Rs. {stats.totalProfit.toLocaleString()}</p>
            </div>
            <DollarSign size={32} className="text-blue-500" />
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

      {/* Quick Stats with Mini Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Today's Activity with Mini Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-700">Today's Activity</h4>
            <Calendar size={20} className="text-gray-400" />
          </div>
          <div className="h-32 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{name: 'Sales', value: stats.todaySales}, {name: 'Purchases', value: stats.todayPurchases}]}>
                <XAxis dataKey="name" />
                <YAxis hide />
                <Tooltip formatter={(value) => `Rs. ${value.toLocaleString()}`} />
                <Bar dataKey="value" fill="#8884d8" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Sales</span>
              <span className="font-medium text-gray-800">Rs. {stats.todaySales.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Purchases</span>
              <span className="font-medium text-gray-800">Rs. {stats.todayPurchases.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Weekly Summary with Mini Line Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-700">Weekly Summary</h4>
            <ShoppingCart size={20} className="text-gray-400" />
          </div>
          <div className="h-32 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[{day: 'Mon', sales: stats.weekSales/5}, {day: 'Tue', sales: stats.weekSales/4}, {day: 'Wed', sales: stats.weekSales/3}, {day: 'Thu', sales: stats.weekSales/2}, {day: 'Fri', sales: stats.weekSales}]}>
                <XAxis dataKey="day" />
                <YAxis hide />
                <Tooltip formatter={(value) => `Rs. ${Math.round(value).toLocaleString()}`} />
                <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Sales</span>
              <span className="font-medium text-gray-800">Rs. {stats.weekSales.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Purchases</span>
              <span className="font-medium text-gray-800">Rs. {stats.weekPurchases.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;