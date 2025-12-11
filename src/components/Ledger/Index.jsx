// components/Ledger/LedgerIndex.jsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Download, Printer, Calendar, 
  ChevronLeft, ChevronRight, Eye, Edit, Trash2, 
  User, DollarSign, FileText, CreditCard, RefreshCw,
  TrendingUp, TrendingDown, CheckCircle, AlertCircle
} from 'lucide-react';
import { ledgerAPI } from './../../../services/api';
import LedgerForm from './LedgerForm';
import LedgerDetails from './LedgerDetails';

const Index = () => {
  const [ledgers, setLedgers] = useState([]);
  const [filteredLedgers, setFilteredLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [dateFilter, setDateFilter] = useState('all');
  const [balanceFilter, setBalanceFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [summary, setSummary] = useState({
    totalCustomers: 0,
    totalDebit: 0,
    totalCredit: 0,
    netBalance: 0
  });

  useEffect(() => {
    fetchLedgers();
  }, []);

  useEffect(() => {
    filterLedgers();
  }, [ledgers, searchTerm, dateFilter, balanceFilter, startDate, endDate]);

  const fetchLedgers = async () => {
    try {
      setLoading(true);
      const response = await ledgerAPI.getAll();
      const ledgersData = response.data.data || [];
      setLedgers(ledgersData);
      calculateSummary(ledgersData);
    } catch (error) {
      console.error('Failed to fetch ledgers:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (data) => {
    const totalCustomers = data.length;
    const totalDebit = data.reduce((sum, ledger) => sum + (ledger.totalDebit || 0), 0);
    const totalCredit = data.reduce((sum, ledger) => sum + (ledger.totalCredit || 0), 0);
    const netBalance = data.reduce((sum, ledger) => sum + (ledger.currentBalance || 0), 0);
    
    setSummary({
      totalCustomers,
      totalDebit,
      totalCredit,
      netBalance
    });
  };

  const filterLedgers = () => {
    let filtered = [...ledgers];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(ledger =>
        ledger.customerName?.toLowerCase().includes(term) ||
        ledger.customerPhone?.includes(term) ||
        ledger.customerCode?.toLowerCase().includes(term)
      );
    }

    // Balance filter
    if (balanceFilter !== 'all') {
      if (balanceFilter === 'positive') {
        filtered = filtered.filter(ledger => (ledger.currentBalance || 0) > 0);
      } else if (balanceFilter === 'negative') {
        filtered = filtered.filter(ledger => (ledger.currentBalance || 0) < 0);
      } else if (balanceFilter === 'zero') {
        filtered = filtered.filter(ledger => (ledger.currentBalance || 0) === 0);
      }
    }

    setFilteredLedgers(filtered);
    setCurrentPage(1);
  };

  const handleAddLedger = () => {
    setSelectedLedger(null);
    setShowForm(true);
  };

  const handleEditLedger = (ledger) => {
    setSelectedLedger(ledger);
    setShowForm(true);
  };

  const handleViewDetails = (ledger) => {
    setSelectedLedger(ledger);
    setShowDetails(true);
  };

  const handleDeleteLedger = async (id) => {
    if (!window.confirm('Are you sure you want to delete this ledger? All transactions will be lost.')) return;
    
    try {
      await ledgerAPI.delete(id);
      fetchLedgers();
    } catch (error) {
      console.error('Failed to delete ledger:', error);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setDateFilter('all');
    setBalanceFilter('all');
    setStartDate('');
    setEndDate('');
  };

  // Pagination
  const totalPages = Math.ceil(filteredLedgers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLedgers = filteredLedgers.slice(startIndex, endIndex);

  const downloadPDF = () => {
    // PDF download implementation
    console.log('Downloading PDF...');
  };

  const printReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Customer Ledgers</h1>
          <p className="text-gray-600">Track customer balances and transactions</p>
        </div>
        <button
          onClick={handleAddLedger}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2"
        >
          <Plus size={20} /> New Ledger
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Customers</p>
              <p className="text-2xl font-bold text-gray-800">{summary.totalCustomers}</p>
            </div>
            <User size={32} className="text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Receivable</p>
              <p className="text-2xl font-bold text-gray-800">Rs. {summary.totalDebit.toLocaleString()}</p>
            </div>
            <TrendingUp size={32} className="text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Payable</p>
              <p className="text-2xl font-bold text-gray-800">Rs. {summary.totalCredit.toLocaleString()}</p>
            </div>
            <TrendingDown size={32} className="text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Net Balance</p>
              <p className={`text-2xl font-bold ${summary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Rs. {Math.abs(summary.netBalance).toLocaleString()}
                <span className="text-sm font-normal ml-2">
                  ({summary.netBalance >= 0 ? 'Due from customers' : 'Due to customers'})
                </span>
              </p>
            </div>
            <DollarSign size={32} className="text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by customer name, phone, or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex gap-4">
            <select
              value={balanceFilter}
              onChange={(e) => setBalanceFilter(e.target.value)}
              className="px-4 py-3 border rounded-lg"
            >
              <option value="all">All Balances</option>
              <option value="positive">Receivable (Positive)</option>
              <option value="negative">Payable (Negative)</option>
              <option value="zero">Zero Balance</option>
            </select>

            <button
              onClick={resetFilters}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={downloadPDF}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2"
          >
            <Download size={18} /> Export PDF
          </button>
          <button
            onClick={printReport}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Printer size={18} /> Print Report
          </button>
          <button
            onClick={fetchLedgers}
            className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2"
          >
            <RefreshCw size={18} /> Refresh
          </button>
        </div>
      </div>

      {/* Ledgers Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold">
            Customer Ledgers ({filteredLedgers.length})
          </h3>
        </div>

        {currentLedgers.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={64} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">No ledgers found</p>
            <p className="text-gray-400">Create your first customer ledger</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opening Balance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Balance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Transaction</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentLedgers.map((ledger) => (
                    <tr key={ledger._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{ledger.customerName}</div>
                        <div className="text-sm text-gray-500">{ledger.customerAddress}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{ledger.customerPhone}</div>
                        <div className="text-sm text-gray-500">{ledger.customerEmail || '—'}</div>
                      </td>
                      <td className="px-6 py-4 font-mono">{ledger.customerCode || '—'}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                          Rs. {(ledger.openingBalance || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                          (ledger.currentBalance || 0) > 0 
                            ? 'bg-green-100 text-green-800'
                            : (ledger.currentBalance || 0) < 0
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          Rs. {Math.abs(ledger.currentBalance || 0).toLocaleString()}
                          <span className="ml-2 text-xs">
                            {(ledger.currentBalance || 0) > 0 ? '(Receivable)' : 
                             (ledger.currentBalance || 0) < 0 ? '(Payable)' : '(Settled)'}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {ledger.lastTransactionDate ? (
                          <div>
                            <div className="text-sm">{new Date(ledger.lastTransactionDate).toLocaleDateString()}</div>
                            <div className="text-xs text-gray-500">Rs. {(ledger.lastTransactionAmount || 0).toLocaleString()}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">No transactions</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                          (ledger.currentBalance || 0) === 0
                            ? 'bg-green-100 text-green-800'
                            : (Math.abs(ledger.currentBalance || 0) > 10000)
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {(ledger.currentBalance || 0) === 0
                            ? <><CheckCircle size={14} className="mr-1" /> Settled</>
                            : (Math.abs(ledger.currentBalance || 0) > 10000)
                            ? <><AlertCircle size={14} className="mr-1" /> Overdue</>
                            : 'Active'
                          }
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewDetails(ledger)}
                            className="text-blue-600 hover:text-blue-900 p-2"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleEditLedger(ledger)}
                            className="text-green-600 hover:text-green-900 p-2"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteLedger(ledger._id)}
                            className="text-red-600 hover:text-red-900 p-2"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredLedgers.length)} of {filteredLedgers.length} ledgers
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 bg-white border rounded-lg hover:bg-gray-100 disabled:opacity-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-3 text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 bg-white border rounded-lg hover:bg-gray-100 disabled:opacity-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Ledger Form Modal */}
      {showForm && (
        <LedgerForm
          ledger={selectedLedger}
          onClose={() => {
            setShowForm(false);
            setSelectedLedger(null);
          }}
          onSave={() => {
            setShowForm(false);
            fetchLedgers();
          }}
        />
      )}

      {/* Ledger Details Modal */}
      {showDetails && (
        <LedgerDetails
          ledger={selectedLedger}
          onClose={() => {
            setShowDetails(false);
            setSelectedLedger(null);
          }}
        />
      )}
    </div>
  );
};

export default Index;