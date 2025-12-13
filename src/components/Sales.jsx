// components/Sales.jsx - WITH DECIMAL QUANTITY SUPPORT (0.5, 1.5, etc.)
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Printer, Search, CheckCircle, 
  AlertCircle, Loader2, ChevronLeft, ChevronRight, 
  FileText, Calendar, X, Clock
} from 'lucide-react';
import { salesAPI, productsAPI, inventoryAPI } from './../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [printing, setPrinting] = useState(false);

  const [saleItems, setSaleItems] = useState([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [salesSearchTerm, setSalesSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  const itemsPerPage = 10;

  const [dailySummary, setDailySummary] = useState({
    totalSales: 0, totalQuantity: 0, totalAmount: 0, totalDiscount: 0
  });

  const [saleSummary, setSaleSummary] = useState({
    items: 0, subtotal: 0, discount: 0, total: 0
  });

  // FETCH DATA ON MOUNT
  useEffect(() => { fetchInitialData(); }, []);

  // FETCH SALES WHEN DATE CHANGES
  useEffect(() => { 
    if (selectedDate) fetchSalesByDate(selectedDate); 
  }, [selectedDate]);

  // CALCULATE CART TOTAL
  useEffect(() => { calculateSaleSummary(); }, [saleItems]);

  // RESET TO PAGE 1 WHEN DATA OR SEARCH CHANGES
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredSales.length, salesSearchTerm]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchSalesByDate(selectedDate), fetchProducts(), fetchInventory()]);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesByDate = async (date) => {
    try {
      setLoading(true);
      const res = await salesAPI.getAllSalesForDate(date);
      const data = res.data.data || [];
      
      setSales(data);
      setFilteredSales(data);

      const summary = {
        totalSales: data.length,
        totalQuantity: data.reduce((s, i) => s + i.quantity, 0),
        totalAmount: data.reduce((s, i) => s + i.totalAmount, 0),
        totalDiscount: data.reduce((s, i) => s + (i.quantity * i.unitPrice * (i.discount || 0)) / 100, 0)
      };
      setDailySummary(summary);
    } catch (err) {
      setError('Failed to load sales');
      setSales([]);
      setFilteredSales([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await productsAPI.getAll();
      setProducts(res.data.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchInventory = async () => {
    try {
      const res = await inventoryAPI.getAll();
      setInventory(res.data.data || []);
    } catch (err) { console.error(err); }
  };

  const getStock = (productId) => {
    const item = inventory.find(i => String(i.product._id || i.product) === productId);
    return item ? parseFloat(item.quantity) : 0; // Ensure float for decimal support
  };

  const productsWithStock = products.filter(p => getStock(p._id) > 0);

  const calculateSaleSummary = () => {
    const summary = saleItems.reduce((acc, item) => ({
      items: acc.items + item.quantity,
      subtotal: acc.subtotal + (item.quantity * item.salePrice),
      discount: acc.discount + (item.quantity * item.salePrice * item.discount) / 100,
      total: acc.total + item.total
    }), { items: 0, subtotal: 0, discount: 0, total: 0 });
    
    setSaleSummary({
      items: parseFloat(summary.items.toFixed(2)),
      subtotal: parseFloat(summary.subtotal.toFixed(2)),
      discount: parseFloat(summary.discount.toFixed(2)),
      total: parseFloat(summary.total.toFixed(2))
    });
  };

  const filteredProducts = productsWithStock.filter(p =>
    p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    (p.code && p.code.toLowerCase().includes(productSearchTerm.toLowerCase()))
  );

  // SEARCH IN SALES
  const searchedSales = useMemo(() => {
    if (!salesSearchTerm.trim()) return filteredSales;
    
    const searchLower = salesSearchTerm.toLowerCase();
    return filteredSales.filter(sale =>
      (sale.product?.name || '').toLowerCase().includes(searchLower) ||
      (sale.product?.code || '').toLowerCase().includes(searchLower) ||
      (sale._id || '').toLowerCase().includes(searchLower)
    );
  }, [filteredSales, salesSearchTerm]);

  // PAGINATION LOGIC
  const totalPages = Math.max(1, Math.ceil(searchedSales.length / itemsPerPage));

  const currentSales = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return searchedSales.slice(start, end);
  }, [searchedSales, currentPage, itemsPerPage]);

  // FIXED: Pagination numbers generator
  const paginationNumbers = useMemo(() => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxVisible - 1);
      
      if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }, [currentPage, totalPages]);

  // ADD PRODUCT TO CART - UPDATED FOR DECIMAL SUPPORT
  const handleProductSelect = (product) => {
    const stock = getStock(product._id);
    if (stock <= 0) return setError(`"${product.name}" is out of stock`);

    const exists = saleItems.find(i => i.product === product._id);
    if (exists) {
      setError(`"${product.name}" already in cart. Adjust quantity if needed.`);
    } else {
      const productDiscount = product.discount || 0;
      const discountedPrice = product.salePrice * (1 - productDiscount / 100);

      setSaleItems([...saleItems, {
        product: product._id,
        name: product.name,
        code: product.code || '',
        salePrice: product.salePrice,
        discount: productDiscount,
        quantity: 1,
        maxQuantity: stock,
        total: discountedPrice
      }]);
    }

    setProductSearchTerm('');
    setIsProductDropdownOpen(false);
  };

  // UPDATED: Support decimal quantities (0.5, 1.5, etc.)
  const updateItem = (index, field, value) => {
    const updated = [...saleItems];
    
    if (field === 'quantity') {
      // Allow decimal values
      const floatValue = parseFloat(value);
      
      // Validate: must be positive, not more than stock, minimum 0.1
      if (isNaN(floatValue) || floatValue <= 0) {
        value = 0.1; // Minimum quantity
      } else if (floatValue > updated[index].maxQuantity) {
        value = updated[index].maxQuantity;
        setError(`Only ${updated[index].maxQuantity.toFixed(1)} in stock`);
      } else {
        value = floatValue;
      }
    }
    
    updated[index][field] = value;
    updated[index].total = updated[index].quantity * updated[index].salePrice * (1 - updated[index].discount / 100);
    setSaleItems(updated);
    
    if (field !== 'quantity') {
      setError('');
    }
  };

  const removeItem = (index) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
    setError('');
  };

  const clearAllItems = () => {
    if (saleItems.length && window.confirm('Clear all items?')) {
      setSaleItems([]);
      setSuccess('Cart cleared');
      setTimeout(() => setSuccess(''), 2000);
    }
  };

  // RECORD SALE - UPDATED FOR DECIMAL QUANTITIES
  const handleSubmit = async () => {
    if (!saleItems.length) return setError('Add items first');

    try {
      setSubmitting(true);
      
      // Validate all quantities
      const invalidItems = saleItems.filter(item => 
        item.quantity <= 0 || item.quantity > item.maxQuantity
      );
      
      if (invalidItems.length > 0) {
        setError(`Invalid quantity for ${invalidItems[0].name}`);
        return;
      }

      await Promise.all(saleItems.map(item =>
        salesAPI.create({
          product: item.product,
          quantity: parseFloat(item.quantity.toFixed(2)), // Ensure 2 decimal places
          unitPrice: item.salePrice,
          discount: item.discount,
          date: selectedDate
        })
      ));

      const totalItems = saleItems.reduce((sum, item) => sum + item.quantity, 0);
      setSuccess(`Sale recorded! ${totalItems.toFixed(1)} units sold`);
      setSaleItems([]);
      await fetchSalesByDate(selectedDate);
      await fetchInventory();
      window.dispatchEvent(new Event('inventoryShouldUpdate'));
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Sale failed');
    } finally {
      setSubmitting(false);
    }
  };

  // DELETE SALE
  const handleDeleteSale = async (id) => {
    if (!window.confirm('Delete this sale?')) return;
    try {
      await salesAPI.delete(id);
      await fetchSalesByDate(selectedDate);
      setSuccess('Sale deleted');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Delete failed');
    }
  };

  // PRINT DAILY REPORT
  const printDailyInvoice = async () => {
    if (printing || !filteredSales.length) return;
    setPrinting(true);
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('AL WAQAS PAINT & HARDWARE', 105, 15, { align: 'center' });
      doc.setFontSize(14);
      doc.text(`Daily Sales - ${new Date(selectedDate).toLocaleDateString('en-GB')}`, 105, 25, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, 14, 35);

      const tableData = filteredSales.map((s, i) => [
        i + 1,
        s.product?.name || '-',
        s.product?.code || '-',
        s.quantity.toFixed(1), // Show decimal quantities
        `PKR ${s.unitPrice.toLocaleString()}`,
        s.discount > 0 ? `${s.discount}%` : '-',
        `PKR ${s.totalAmount.toLocaleString()}`
      ]);

      autoTable(doc, {
        head: [['#', 'Product', 'Code', 'Qty', 'Price', 'Disc', 'Total']],
        body: tableData,
        startY: 45,
        theme: 'grid',
        headStyles: { fillColor: [41, 98, 255] },
      });

      doc.setFontSize(12);
      doc.text(`Grand Total: PKR ${dailySummary.totalAmount.toLocaleString()}`, 140, doc.lastAutoTable.finalY + 15);
      doc.save(`sales_${selectedDate}.pdf`);
      setSuccess('Report downloaded');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Print failed');
    } finally {
      setPrinting(false);
    }
  };

  if (loading && !sales.length) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-10 bg-gray-200 rounded w-64 animate-pulse"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-white rounded-lg shadow animate-pulse"></div>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sales Dashboard</h1>
              <p className="text-gray-600 text-sm mt-1">Record transactions • Track daily revenue • Generate reports</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" /> Today
              </button>
              <button onClick={printDailyInvoice} disabled={printing}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2 text-sm font-medium">
                {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                Print Report
              </button>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between text-sm">
            <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5" /> {success}</div>
            <button onClick={() => setSuccess('')}><X className="w-5 h-5" /></button>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between text-sm">
            <div className="flex items-center gap-2"><AlertCircle className="w-5 h-5" /> {error}</div>
            <button onClick={() => setError('')}><X className="w-5 h-5" /></button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-lg shadow-sm border">
            <p className="text-gray-600 text-xs">Transactions</p>
            <p className="text-xl font-bold text-gray-900">{dailySummary.totalSales}</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-sm border">
            <p className="text-gray-600 text-xs">Revenue</p>
            <p className="text-xl font-bold text-green-600">PKR {dailySummary.totalAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-sm border">
            <p className="text-gray-600 text-xs">Items Sold</p>
            <p className="text-xl font-bold text-blue-600">{dailySummary.totalQuantity.toFixed(1)}</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-sm border">
            <p className="text-gray-600 text-xs">Discount Given</p>
            <p className="text-xl font-bold text-orange-600">PKR {dailySummary.totalDiscount.toFixed(0)}</p>
          </div>
        </div>

        {/* Date Selector */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-600" />
              <input 
                type="date" 
                value={selectedDate} 
                onChange={e => setSelectedDate(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm" 
                max={new Date().toISOString().split('T')[0]} 
              />
              <span className="text-sm font-medium text-gray-700">
                {new Date(selectedDate).toLocaleDateString('en-GB')}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {filteredSales.length} sales recorded
            </div>
          </div>
        </div>

        {/* New Sale Form */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-5">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Plus className="w-6 h-6" /> Record New Sale
            </h2>
          </div>

          <div className="p-5 space-y-5">
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input
                type="text" 
                placeholder="Search product by name or code..."
                value={productSearchTerm}
                onChange={e => { setProductSearchTerm(e.target.value); setIsProductDropdownOpen(true); }}
                onFocus={() => setIsProductDropdownOpen(true)}
                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:border-blue-500 outline-none text-sm"
              />
            </div>

            {/* Product Dropdown */}
            {isProductDropdownOpen && productSearchTerm && (
              <div className="max-w-xl bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
                {filteredProducts.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-sm">No products found</div>
                ) : (
                  filteredProducts.map(p => (
                    <button 
                      key={p._id} 
                      onClick={() => handleProductSelect(p)}
                      className="w-full text-left p-4 hover:bg-gray-50 border-b text-sm"
                    >
                      <div className="flex justify-between">
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-gray-600">Code: {p.code || '—'}</div>
                          <div className="text-xs text-gray-500 mt-1">Stock: {getStock(p._id).toFixed(1)}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-blue-600">PKR {p.salePrice.toLocaleString()}</div>
                          {p.discount > 0 && (
                            <div className="text-xs text-green-600 font-medium">{p.discount}% off</div>
                          )}
                          <div className="text-xs text-gray-500">per unit</div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Cart with Decimal Quantity Support */}
            {saleItems.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold">Cart ({saleItems.length} item{saleItems.length !== 1 ? 's' : ''})</h3>
                  <button onClick={clearAllItems} className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1">
                    <Trash2 className="w-4 h-4" /> Clear All
                  </button>
                </div>

                <div className="space-y-3">
                  {saleItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-gray-600">
                          PKR {item.salePrice.toLocaleString()} per unit
                          {item.discount > 0 && ` • ${item.discount}% off`}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Max: {item.maxQuantity.toFixed(1)} in stock
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                          <input 
                            type="number" 
                            value={item.quantity} 
                            min="0.1" 
                            max={item.maxQuantity}
                            step="0.1" // Allows 0.1 increments (0.5, 1.5, etc.)
                            onChange={e => updateItem(i, 'quantity', e.target.value)}
                            className="w-20 px-2 py-1 border rounded text-center text-sm" 
                          />
                          <div className="text-xs text-gray-500 mt-1">Qty</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">PKR {item.total.toFixed(0)}</div>
                          <div className="text-xs text-gray-500">
                            {item.quantity.toFixed(1)} × PKR {item.salePrice.toLocaleString()}
                          </div>
                        </div>
                        <button onClick={() => removeItem(i)} className="text-red-600 hover:text-red-800">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 bg-gray-50 -m-5 p-5 rounded-b-lg">
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div className="text-gray-600">Total Items:</div>
                    <div className="text-right font-medium">{saleSummary.items.toFixed(1)} units</div>
                    
                    <div className="text-gray-600">Subtotal:</div>
                    <div className="text-right">PKR {saleSummary.subtotal.toFixed(0)}</div>
                    
                    {saleSummary.discount > 0 && (
                      <>
                        <div className="text-gray-600">Discount:</div>
                        <div className="text-right text-orange-600">-PKR {saleSummary.discount.toFixed(0)}</div>
                      </>
                    )}
                  </div>
                  
                  <div className="flex justify-between font-bold text-lg mb-4 pt-4 border-t">
                    <span>Grand Total</span>
                    <span className="text-green-600">PKR {saleSummary.total.toFixed(0)}</span>
                  </div>
                  
                  <button 
                    onClick={handleSubmit} 
                    disabled={submitting}
                    className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 font-medium flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                    {submitting ? 'Recording...' : 'Complete Sale'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sales History Table - Updated to show decimal quantities */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="font-bold text-gray-800">Today's Sales History</h3>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search sales..."
                  value={salesSearchTerm}
                  onChange={e => setSalesSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {searchedSales.length === 0 ? (
            <div className="p-16 text-center text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">{salesSearchTerm ? 'No matching sales' : 'No sales recorded yet'}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Product</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Price</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Disc</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Total</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {currentSales.map(s => (
                      <tr key={s._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {new Date(s.createdAt || s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{s.product?.name}</div>
                          <div className="text-xs text-gray-500">{s.product?.code || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-center font-medium">{s.quantity.toFixed(1)}</td>
                        <td className="px-4 py-3 text-right text-blue-600 font-medium">PKR {s.unitPrice.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          {s.discount > 0 ? <span className="text-orange-600 font-medium">{s.discount}%</span> : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-green-600">PKR {s.totalAmount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => handleDeleteSale(s._id)} className="text-red-600 hover:text-red-800">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              {totalPages > 1 && (
                <div className="border-t px-6 py-4 bg-gray-50">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-700">
                    <div>
                      Showing <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> to{' '}
                      <strong>{Math.min(currentPage * itemsPerPage, searchedSales.length)}</strong> of{' '}
                      <strong>{searchedSales.length}</strong> sales
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-center">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="px-3 py-2 rounded-lg border bg-white disabled:opacity-50 hover:bg-gray-100 text-xs sm:text-sm"
                      >
                        First
                      </button>

                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 rounded-lg border bg-white disabled:opacity-50 hover:bg-gray-100 flex items-center gap-1 text-xs sm:text-sm"
                      >
                        <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" /> Prev
                      </button>

                      {paginationNumbers.map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-2 min-w-8 sm:min-w-10 rounded-lg font-medium text-xs sm:text-sm ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}

                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 rounded-lg border bg-white disabled:opacity-50 hover:bg-gray-100 flex items-center gap-1 text-xs sm:text-sm"
                      >
                        Next <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>

                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 rounded-lg border bg-white disabled:opacity-50 hover:bg-gray-100 text-xs sm:text-sm"
                      >
                        Last
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sales;