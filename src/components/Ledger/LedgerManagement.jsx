import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Search, Filter, DollarSign, TrendingUp, TrendingDown, X, Edit2, Trash2, Eye, FileText, Users, RefreshCw, Building, Phone, Mail, User, Hash, Wallet, CreditCard, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { ledgerAPI } from '../../../services/api';

const LedgerManagement = () => {
  const [activeTab, setActiveTab] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [daySummary, setDaySummary] = useState([]);
  const [vendorLedger, setVendorLedger] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [error, setError] = useState(null);
  
  // New state for vendors list search and stats
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorStats, setVendorStats] = useState({});
  
  // State for daily totals
  const [dailyTotals, setDailyTotals] = useState({
    totalOpening: 0,
    totalClosing: 0,
    totalReceivables: 0,
    totalPayables: 0,
    netChange: 0
  });

  // Form state
  const [formData, setFormData] = useState({
    vendor: '',
    transactionType: 'receivable',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadVendors();
  }, []);

  useEffect(() => {
    if (activeTab === 'daily') {
      loadDailyLedger();
    } else if (activeTab === 'summary') {
      loadDayEndSummary();
    } else if (activeTab === 'vendors-list') {
      calculateVendorStats();
    }
  }, [activeTab, selectedDate, vendors]);

  const loadVendors = async () => {
    try {
      const response = await ledgerAPI.getAllVendors();
      if (response.data.success) {
        setVendors(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading vendors:', error);
      setError('Failed to load vendors');
    }
  };

  const loadDailyLedger = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ledgerAPI.getDailyLedger(selectedDate);
      if (response.data.success) {
        const data = response.data.data || [];
        setTransactions(data);
        
        // Calculate daily totals
        calculateDailyTotals(data);
      }
    } catch (error) {
      console.error('Error loading daily ledger:', error);
      setError('Failed to load daily ledger');
      setTransactions([]);
      setDailyTotals({
        totalOpening: 0,
        totalClosing: 0,
        totalReceivables: 0,
        totalPayables: 0,
        netChange: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDayEndSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ledgerAPI.getDayEndSummary(selectedDate);
      if (response.data.success) {
        const data = response.data.data || [];
        setDaySummary(data);
        
        // Calculate summary totals
        calculateSummaryTotals(data);
      }
    } catch (error) {
      console.error('Error loading summary:', error);
      setError('Failed to load day end summary');
      setDaySummary([]);
    } finally {
      setLoading(false);
    }
  };

  const loadVendorLedger = async () => {
    if (!selectedVendor) {
      alert('Please select a vendor');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await ledgerAPI.getVendorLedger(
        selectedVendor,
        dateRange.start || null,
        dateRange.end || null
      );
      if (response.data.success) {
        setVendorLedger(response.data);
        setShowVendorModal(true);
      }
    } catch (error) {
      console.error('Error loading vendor ledger:', error);
      if (error.response?.status === 404) {
        alert('No transactions found for this vendor');
      } else {
        setError('Failed to load vendor ledger');
      }
    } finally {
      setLoading(false);
    }
  };

  // Calculate daily totals from transactions
  const calculateDailyTotals = (transactionsData) => {
    if (!transactionsData.length) {
      setDailyTotals({
        totalOpening: 0,
        totalClosing: 0,
        totalReceivables: 0,
        totalPayables: 0,
        netChange: 0
      });
      return;
    }

    const totals = transactionsData.reduce((acc, transaction) => {
      // For the first transaction of each vendor, add opening balance
      // For simplicity, we'll use the last transaction's closing balance
      // and calculate receivables/payables from transaction amounts
      
      if (transaction.transactionType === 'receivable') {
        acc.totalReceivables += transaction.amount || 0;
      } else if (transaction.transactionType === 'payable') {
        acc.totalPayables += transaction.amount || 0;
      }
      
      return acc;
    }, {
      totalOpening: 0,
      totalClosing: 0,
      totalReceivables: 0,
      totalPayables: 0,
      netChange: 0
    });

    // Use the first transaction's opening balance and last transaction's closing balance
    if (transactionsData.length > 0) {
      const firstTransaction = transactionsData[0];
      const lastTransaction = transactionsData[transactionsData.length - 1];
      
      totals.totalOpening = firstTransaction.openingBalance || 0;
      totals.totalClosing = lastTransaction.closingBalance || 0;
      totals.netChange = totals.totalClosing - totals.totalOpening;
    }

    setDailyTotals(totals);
  };

  // Calculate summary totals from daySummary
  const calculateSummaryTotals = (summaryData) => {
    if (!summaryData.length) {
      setDailyTotals({
        totalOpening: 0,
        totalClosing: 0,
        totalReceivables: 0,
        totalPayables: 0,
        netChange: 0
      });
      return;
    }

    const totals = summaryData.reduce((acc, vendor) => {
      acc.totalOpening += vendor.openingBalance || 0;
      acc.totalClosing += vendor.closingBalance || 0;
      acc.totalReceivables += vendor.totalReceivable || 0;
      acc.totalPayables += vendor.totalPayable || 0;
      return acc;
    }, {
      totalOpening: 0,
      totalClosing: 0,
      totalReceivables: 0,
      totalPayables: 0,
      netChange: 0
    });

    totals.netChange = totals.totalClosing - totals.totalOpening;
    setDailyTotals(totals);
  };

  const handleAddTransaction = async () => {
    if (!formData.vendor || !formData.amount || formData.amount <= 0) {
      alert('Please fill in all required fields with valid values');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await ledgerAPI.addTransaction({
        vendor: formData.vendor,
        transactionType: formData.transactionType,
        amount: parseFloat(formData.amount),
        description: formData.description,
        date: formData.date
      });
      
      if (response.data.success) {
        setShowAddModal(false);
        setFormData({
          vendor: '',
          transactionType: 'receivable',
          amount: '',
          description: '',
          date: new Date().toISOString().split('T')[0]
        });
        
        // Reload data
        await loadDailyLedger();
        await loadVendors();
        
        alert('Transaction added successfully!');
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert(error.response?.data?.message || 'Failed to add transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    
    setLoading(true);
    try {
      const response = await ledgerAPI.deleteTransaction(id);
      if (response.data.success) {
        await loadDailyLedger();
        alert('Transaction deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert(error.response?.data?.message || 'Failed to delete transaction');
    } finally {
      setLoading(false);
    }
  };

  // Calculate vendor statistics
  const calculateVendorStats = () => {
    if (!vendors.length) return;
    
    const stats = {
      totalVendors: vendors.length,
      totalReceivables: 0,
      totalPayables: 0,
      activeVendors: 0,
      topVendors: [],
      recentActivity: []
    };
    
    // You can add more sophisticated calculations here based on your data structure
    // For now, we'll just count vendors
    
    setVendorStats(stats);
  };

  // Filter vendors based on search query
  const filteredVendors = vendors.filter(vendor => {
    if (typeof vendor === 'string') {
      return vendor.toLowerCase().includes(searchQuery.toLowerCase());
    } else if (vendor && typeof vendor === 'object') {
      // If vendor is an object with name property
      return vendor.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             vendor.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             vendor.phone?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return false;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount).replace('PKR', 'Rs.');
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Ledger Management</h1>
              <p className="text-gray-600 mt-1">Track payables and receivables</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
              Add Transaction
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 border-b">
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-4 py-2 font-medium transition ${
                activeTab === 'daily'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Daily Ledger
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-4 py-2 font-medium transition ${
                activeTab === 'summary'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Day End Summary
            </button>
            <button
              onClick={() => setActiveTab('vendor')}
              className={`px-4 py-2 font-medium transition ${
                activeTab === 'vendor'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Vendor Ledger
            </button>
            <button
              onClick={() => setActiveTab('vendors-list')}
              className={`px-4 py-2 font-medium transition ${
                activeTab === 'vendors-list'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Vendors List
            </button>
          </div>
        </div>

        {/* Date Selector - Only show for tabs that need it */}
        {(activeTab === 'daily' || activeTab === 'summary') && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center gap-4">
              <Calendar className="w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Today
              </button>
              <button
                onClick={() => {
                  if (activeTab === 'daily') loadDailyLedger();
                  else if (activeTab === 'summary') loadDayEndSummary();
                }}
                className="ml-auto flex items-center gap-2 text-gray-600 hover:text-gray-900"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        )}

        {/* Daily Summary Cards - Show for daily and summary tabs */}
        {(activeTab === 'daily' || activeTab === 'summary') && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {/* Total Opening Balance */}
            <div className="bg-white rounded-lg shadow-sm p-4 border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Opening Balance</p>
                  <p className="text-2xl font-bold mt-1 text-gray-900">
                    {formatCurrency(dailyTotals.totalOpening)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Start of day balance</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-full">
                  <Wallet className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Total Receivables */}
            <div className="bg-white rounded-lg shadow-sm p-4 border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Receivables</p>
                  <p className="text-2xl font-bold mt-1 text-green-600">
                    +{formatCurrency(dailyTotals.totalReceivables)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Money received today</p>
                </div>
                <div className="p-3 bg-green-50 rounded-full">
                  <ArrowUpCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Total Payables */}
            <div className="bg-white rounded-lg shadow-sm p-4 border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Payables</p>
                  <p className="text-2xl font-bold mt-1 text-red-600">
                    -{formatCurrency(dailyTotals.totalPayables)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Money paid today</p>
                </div>
                <div className="p-3 bg-red-50 rounded-full">
                  <ArrowDownCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>

            {/* Net Change */}
            <div className="bg-white rounded-lg shadow-sm p-4 border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Net Change</p>
                  <p className={`text-2xl font-bold mt-1 ${
                    dailyTotals.netChange >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {dailyTotals.netChange >= 0 ? '+' : ''}{formatCurrency(dailyTotals.netChange)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Today's net change</p>
                </div>
                <div className={`p-3 rounded-full ${
                  dailyTotals.netChange >= 0 ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  {dailyTotals.netChange >= 0 ? (
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  ) : (
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  )}
                </div>
              </div>
            </div>

            {/* Total Closing Balance */}
            <div className="bg-white rounded-lg shadow-sm p-4 border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Closing Balance</p>
                  <p className="text-2xl font-bold mt-1 text-gray-900">
                    {formatCurrency(dailyTotals.totalClosing)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">End of day balance</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-full">
                  <CreditCard className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Daily Ledger Tab */}
        {activeTab === 'daily' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold">Transactions for {formatDate(selectedDate)}</h2>
              <p className="text-gray-600 text-sm">Total: {transactions.length} transactions</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Opening</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Closing</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Loading...
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                        No transactions found for this date
                      </td>
                    </tr>
                  ) : (
                    transactions.map((txn) => (
                      <tr key={txn._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div>{formatDate(txn.date)}</div>
                          <div className="text-xs text-gray-500">{formatTime(txn.date)}</div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {txn.vendor}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            txn.transactionType === 'receivable'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {txn.transactionType === 'receivable' ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {txn.transactionType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {txn.description || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-medium">
                          <span className={txn.transactionType === 'receivable' ? 'text-green-600' : 'text-red-600'}>
                            {txn.transactionType === 'receivable' ? '+' : '-'}{formatCurrency(txn.amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-gray-600">
                          {formatCurrency(txn.openingBalance)}
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                          {formatCurrency(txn.closingBalance)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            txn.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : txn.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {txn.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          <button
                            onClick={() => handleDeleteTransaction(txn._id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete transaction"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Day End Summary Tab */}
        {activeTab === 'summary' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold">Day End Summary - {formatDate(selectedDate)}</h2>
              <p className="text-gray-600 text-sm">{daySummary.length} vendors</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Opening</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Receivable</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Payable</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Closing</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Transactions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Loading...
                      </td>
                    </tr>
                  ) : daySummary.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        No transactions found for this date
                      </td>
                    </tr>
                  ) : (
                    daySummary.map((vendor, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {vendor.vendor}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-gray-600">
                          {formatCurrency(vendor.openingBalance)}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-green-600">
                          +{formatCurrency(vendor.totalReceivable)}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-red-600">
                          -{formatCurrency(vendor.totalPayable)}
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                          {formatCurrency(vendor.closingBalance)}
                        </td>
                        <td className="px-6 py-4 text-sm text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-medium">
                            {vendor.transactionCount}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Vendor Ledger Tab */}
        {activeTab === 'vendor' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Vendor Ledger</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <select
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor} value={vendor}>{vendor}</option>
                ))}
              </select>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                placeholder="Start Date"
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                placeholder="End Date"
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={loadVendorLedger}
                disabled={!selectedVendor || loading}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                View Ledger
              </button>
            </div>
          </div>
        )}

        {/* Vendors List Tab */}
        {activeTab === 'vendors-list' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">All Vendors</h2>
                  <p className="text-gray-600 text-sm">{vendors.length} total vendors</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search vendors..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 w-64"
                    />
                  </div>
                  <button
                    onClick={loadVendors}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>
            </div>
            
            {/* Vendor Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border-b bg-gray-50">
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Vendors</p>
                    <p className="text-2xl font-bold mt-1">{vendors.length}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Vendors</p>
                    <p className="text-2xl font-bold mt-1">{vendors.length}</p>
                  </div>
                  <User className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Receivables</p>
                    <p className="text-2xl font-bold mt-1 text-green-600">
                      {formatCurrency(0)} {/* You can add actual calculation */}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Payables</p>
                    <p className="text-2xl font-bold mt-1 text-red-600">
                      {formatCurrency(0)} {/* You can add actual calculation */}
                    </p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-red-500" />
                </div>
              </div>
            </div>

            {/* Vendors Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Transactions</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Current Balance</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Receivables</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Payables</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Loading vendors...
                      </td>
                    </tr>
                  ) : filteredVendors.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                        {searchQuery ? 'No vendors found matching your search' : 'No vendors found'}
                      </td>
                    </tr>
                  ) : (
                    filteredVendors.map((vendor, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <Hash className="w-4 h-4 inline mr-2" />
                          {index + 1}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Building className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {typeof vendor === 'string' ? vendor : vendor.name || vendor.vendor || 'Unknown'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {typeof vendor === 'object' && (vendor.email || vendor.phone) ? (
                                  <>
                                    {vendor.email && <div><Mail className="w-3 h-3 inline mr-1" /> {vendor.email}</div>}
                                    {vendor.phone && <div><Phone className="w-3 h-3 inline mr-1" /> {vendor.phone}</div>}
                                  </>
                                ) : (
                                  'No contact info'
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-center text-gray-600">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-medium">
                            0 {/* Replace with actual transaction count */}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-medium">
                          <span className="text-gray-900">
                            {formatCurrency(0)} {/* Replace with actual balance */}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          <span className="text-green-600 font-medium">
                            +{formatCurrency(0)} {/* Replace with actual receivables */}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          <span className="text-red-600 font-medium">
                            -{formatCurrency(0)} {/* Replace with actual payables */}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          <button
                            onClick={() => {
                              setSelectedVendor(typeof vendor === 'string' ? vendor : vendor.name || vendor.vendor);
                              setActiveTab('vendor');
                            }}
                            className="text-blue-600 hover:text-blue-800 mr-3"
                            title="View Ledger"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              // Add edit vendor functionality
                              alert('Edit vendor functionality coming soon!');
                            }}
                            className="text-gray-600 hover:text-gray-800 mr-3"
                            title="Edit Vendor"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Transaction Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-xl font-semibold">Add Transaction</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor *
                  </label>
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    list="vendors-list"
                    placeholder="Enter or select vendor"
                  />
                  <datalist id="vendors-list">
                    {vendors.map((vendor) => (
                      <option key={vendor} value={vendor} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction Type *
                  </label>
                  <select
                    value={formData.transactionType}
                    onChange={(e) => setFormData({ ...formData, transactionType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="receivable">Receivable (Money In)</option>
                    <option value="payable">Payable (Money Out)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter transaction details..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddTransaction}
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition"
                  >
                    {loading ? 'Adding...' : 'Add Transaction'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vendor Ledger Modal */}
        {showVendorModal && vendorLedger && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h3 className="text-xl font-semibold">{selectedVendor} Ledger</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Opening: {formatCurrency(vendorLedger.openingBalance)} | 
                    Closing: {formatCurrency(vendorLedger.closingBalance)} | 
                    Total Transactions: {vendorLedger.totalTransactions}
                  </p>
                </div>
                <button
                  onClick={() => setShowVendorModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {vendorLedger.data.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                          No transactions found
                        </td>
                      </tr>
                    ) : (
                      vendorLedger.data.map((txn) => (
                        <tr key={txn._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div>{formatDate(txn.date)}</div>
                            <div className="text-xs text-gray-500">{formatTime(txn.date)}</div>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              txn.transactionType === 'receivable'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {txn.transactionType}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {txn.description || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-right font-medium">
                            <span className={txn.transactionType === 'receivable' ? 'text-green-600' : 'text-red-600'}>
                              {txn.transactionType === 'receivable' ? '+' : '-'}{formatCurrency(txn.amount)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                            {formatCurrency(txn.closingBalance)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              txn.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : txn.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {txn.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LedgerManagement;