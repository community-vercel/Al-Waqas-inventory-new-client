// components/Expenses.jsx - FINAL PROFESSIONAL & CLEAN VERSION
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Edit, Filter, TrendingDown, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { expensesAPI } from './../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    category: 'all'
  });

  const [newExpense, setNewExpense] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    category: 'other'
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const itemsPerPage = 10;

  const categories = [
    { value: 'rent', label: 'Rent', color: 'bg-red-100 text-red-800' },
    { value: 'utilities', label: 'Utilities', color: 'bg-blue-100 text-blue-800' },
    { value: 'salary', label: 'Salary', color: 'bg-green-100 text-green-800' },
    { value: 'maintenance', label: 'Maintenance', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-800' }
  ];

  useEffect(() => {
    fetchAllExpenses();
    fetchFilteredExpenses();
  }, [filters, currentPage]);

  const fetchAllExpenses = async () => {
    try {
      const response = await expensesAPI.getAll({});
      setAllExpenses(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch all expenses');
    }
  };

  const fetchFilteredExpenses = async () => {
    try {
      setLoading(true);
      const response = await expensesAPI.getAll(filters);
      setExpenses(response.data.data || []);
    } catch (error) {
      setError('Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  const addExpense = async () => {
    if (!newExpense.description.trim() || !newExpense.amount || parseFloat(newExpense.amount) <= 0) {
      setError('Please fill all required fields');
      return;
    }

    try {
      setSubmitting(true);
      await expensesAPI.create({
        ...newExpense,
        amount: parseFloat(newExpense.amount)
      });

      setNewExpense({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: '',
        category: 'other'
      });

      setSuccess('Expense added successfully!');
      setTimeout(() => setSuccess(''), 3000);
      fetchAllExpenses();
      fetchFilteredExpenses();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  const updateExpense = async () => {
    if (!editingExpense.description.trim() || !editingExpense.amount || parseFloat(editingExpense.amount) <= 0) {
      setError('Please fill all fields correctly');
      return;
    }

    try {
      setSubmitting(true);
      await expensesAPI.update(editingExpense._id, {
        date: editingExpense.date,
        description: editingExpense.description,
        amount: parseFloat(editingExpense.amount),
        category: editingExpense.category
      });

      setEditingExpense(null);
      setSuccess('Expense updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
      fetchAllExpenses();
      fetchFilteredExpenses();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update expense');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteExpense = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await expensesAPI.delete(id);
      setSuccess('Expense deleted!');
      setTimeout(() => setSuccess(''), 3000);
      fetchAllExpenses();
      fetchFilteredExpenses();
    } catch (error) {
      setError('Failed to delete');
    }
  };

  const startEditing = (expense) => {
    setEditingExpense({
      ...expense,
      amount: expense.amount.toString()
    });
  };

  const cancelEditing = () => {
    setEditingExpense(null);
  };

  const applyFilters = () => {
    setCurrentPage(1);
    setSearchParams({ page: '1' });
  };

  const clearFilters = () => {
    setFilters({ startDate: '', endDate: '', category: 'all' });
    setCurrentPage(1);
    setSearchParams({});
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const getCategoryTotal = () => {
    const totals = {};
    categories.forEach(c => totals[c.value] = 0);
    expenses.forEach(e => totals[e.category] += e.amount);
    return totals;
  };

  const categoryTotals = getCategoryTotal();

  // Pagination
  const totalPages = Math.ceil(expenses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedExpenses = expenses.slice(startIndex, endIndex);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setSearchParams({ page: page.toString() });
    }
  };

  // PDF DOWNLOAD - ALL EXPENSES
  const exportToPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFontSize(18);
    doc.text('ALWAQAS PAINT SHOP - Expense Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Total: Rs. ${allExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}`, 14, 38);

    const tableData = allExpenses.map(e => [
      new Date(e.date).toLocaleDateString(),
      e.description || '—',
      categories.find(c => c.value === e.category)?.label || 'Other',
      `Rs. ${e.amount.toLocaleString()}`
    ]);

    autoTable(doc, {
      head: [['Date', 'Description', 'Category', 'Amount']],
      body: tableData,
      startY: 48,
      styles: { fontSize: 10, cellPadding: 5 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [249, 250, 251] }
    });

    doc.save(`expenses_report_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-40 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
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
          <h1 className="text-2xl font-bold text-gray-800">Daily Expenses Tracker</h1>
          <p className="text-gray-600">Track and manage all business expenses</p>
        </div>
        <button
          onClick={exportToPDF}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg flex items-center gap-2 shadow"
        >
          <Download size={18} /> Download PDF
        </button>
      </div>

      {success && <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>}
      {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-gray-400">
          <TrendingDown size={36} className="text-gray-500 mb-3" />
          <p className="text-gray-600 text-sm">Total Expenses</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">Rs. {totalExpenses.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">By Category</h2>
          <div className="space-y-3">
            {categories.map(cat => (
              <div key={cat.value} className="flex justify-between items-center">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${cat.color}`}>
                  {cat.label}
                </span>
                <span className="text-gray-800 font-medium">
                  Rs. {categoryTotals[cat.value].toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Filters</h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <Filter size={18} />
            {showFilters ? 'Hide' : 'Show'} Filters
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="all">All Categories</option>
                {categories.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={applyFilters} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium">
                Apply
              </button>
              <button onClick={clearFilters} className="bg-gray-500 hover:bg-gray-600 text-white px-5 py-2 rounded-lg font-medium">
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">{editingExpense ? 'Edit Expense' : 'Add New Expense'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
            <input type="date" value={editingExpense ? editingExpense.date : newExpense.date} onChange={e => editingExpense ? setEditingExpense({ ...editingExpense, date: e.target.value }) : setNewExpense({ ...newExpense, date: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
            <textarea
              rows="2"
              placeholder="Enter expense details..."
              value={editingExpense ? editingExpense.description : newExpense.description}
              onChange={e => editingExpense ? setEditingExpense({ ...editingExpense, description: e.target.value }) : setNewExpense({ ...newExpense, description: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount (Rs.) *</label>
            <input type="number" placeholder="0.00" value={editingExpense ? editingExpense.amount : newExpense.amount} onChange={e => editingExpense ? setEditingExpense({ ...editingExpense, amount: e.target.value }) : setNewExpense({ ...newExpense, amount: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select value={editingExpense ? editingExpense.category : newExpense.category} onChange={e => editingExpense ? setEditingExpense({ ...editingExpense, category: e.target.value }) : setNewExpense({ ...newExpense, category: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
              {categories.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={editingExpense ? updateExpense : addExpense}
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
          >
            {submitting ? 'Saving...' : (editingExpense ? 'Update Expense' : 'Add Expense')}
          </button>
          {editingExpense && (
            <button onClick={cancelEditing} className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Expense History ({expenses.length} entries)
          </h3>
          <p className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </p>
        </div>

        {expenses.length === 0 ? (
          <div className="text-center py-16">
            <TrendingDown size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-lg text-gray-500">No expenses found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedExpenses.map((expense) => {
                    const category = categories.find(c => c.value === expense.category);
                    return (
                      <tr key={expense._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {new Date(expense.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                          <div className="truncate" title={expense.description}>
                            {expense.description || '—'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${category?.color || 'bg-gray-100 text-gray-800'}`}>
                            {category?.label || 'Other'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-800">
                          Rs. {expense.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => startEditing(expense)}
                              className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => deleteExpense(expense._id)}
                              className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, expenses.length)} of {expenses.length} expenses
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-5 py-2 bg-white border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    Previous
                  </button>

                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`w-10 h-10 rounded-lg font-medium transition ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-5 py-2 bg-white border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Expenses;