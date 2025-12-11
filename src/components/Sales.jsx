// components/Sales.jsx - FINAL: AUTO DISCOUNT FROM PRODUCT + ALL FEATURES
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Printer, Search, CheckCircle, 
  AlertCircle, Loader2, ChevronLeft, ChevronRight, 
  FileText, Calendar, X, Filter, Clock, Package
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
  const [showDateRange, setShowDateRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [salesSearchTerm, setSalesSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // CHANGED TO 5 ITEMS PER PAGE

  const [dailySummary, setDailySummary] = useState({
    totalSales: 0, totalQuantity: 0, totalAmount: 0, totalDiscount: 0
  });

  const [saleSummary, setSaleSummary] = useState({
    items: 0, subtotal: 0, discount: 0, total: 0
  });

  useEffect(() => { fetchInitialData(); }, []);
  useEffect(() => { 
    if (selectedDate) fetchSalesByDate(selectedDate); 
  }, [selectedDate]);
  useEffect(() => { calculateSaleSummary(); }, [saleItems]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchSalesByDate(selectedDate), fetchProducts(), fetchInventory()]);
    } catch (err) { setError('Failed to load data'); } finally { setLoading(false); }
  };

  const fetchSalesByDate = async (date) => {
    try {
      setLoading(true);
      const res = await salesAPI.getAll({ startDate: date, endDate: date });
      const data = res.data.data || [];
      setSales(data);
      setFilteredSales(data);
      setCurrentPage(1); // Reset to first page when date changes

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
      setCurrentPage(1);
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
    return item ? item.quantity : 0;
  };

  const productsWithStock = products.filter(p => getStock(p._id) > 0);

  const calculateSaleSummary = () => {
    const summary = saleItems.reduce((acc, item) => ({
      items: acc.items + item.quantity,
      subtotal: acc.subtotal + (item.quantity * item.salePrice),
      discount: acc.discount + (item.quantity * item.salePrice * item.discount) / 100,
      total: acc.total + item.total
    }), { items: 0, subtotal: 0, discount: 0, total: 0 });
    setSaleSummary(summary);
  };

  const filteredProducts = productsWithStock.filter(p =>
    p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    (p.code && p.code.toLowerCase().includes(productSearchTerm.toLowerCase()))
  );

  // Search in Sales History
  const searchedSales = useMemo(() => {
    if (!salesSearchTerm.trim()) return filteredSales;
    return filteredSales.filter(sale =>
      (sale.product?.name || '').toLowerCase().includes(salesSearchTerm.toLowerCase()) ||
      (sale.product?.code || '').toLowerCase().includes(salesSearchTerm.toLowerCase())
    );
  }, [filteredSales, salesSearchTerm]);

  // Reset current page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [salesSearchTerm]);

  // Reset current page when filtered sales changes (date change)
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredSales]);

  const totalPages = Math.ceil(searchedSales.length / itemsPerPage);
  const currentSales = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return searchedSales.slice(startIndex, endIndex);
  }, [searchedSales, currentPage, itemsPerPage]);

  // Calculate pagination numbers to display - SHOW ONLY 5 PAGE BUTTONS
  const paginationNumbers = useMemo(() => {
    const maxPagesToShow = 5; // CHANGED TO SHOW ONLY 5 PAGE BUTTONS
    
    if (totalPages <= maxPagesToShow) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    const half = Math.floor(maxPagesToShow / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxPagesToShow - 1);
    
    // Adjust if we're near the end
    if (end - start + 1 < maxPagesToShow) {
      start = Math.max(1, end - maxPagesToShow + 1);
    }
    
    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages]);

  // AUTO APPLY DISCOUNT FROM PRODUCT
  const handleProductSelect = (product) => {
    const stock = getStock(product._id);
    if (stock <= 0) return setError(`"${product.name}" is out of stock`);

    const exists = saleItems.find(i => i.product === product._id);
    if (exists) {
      if (exists.quantity < exists.maxQuantity) {
        updateItem(saleItems.indexOf(exists), 'quantity', exists.quantity + 1);
      } else {
        setError(`Only ${exists.maxQuantity} in stock`);
      }
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

  const updateItem = (index, field, value) => {
    const updated = [...saleItems];
    if (field === 'quantity') {
      value = Math.max(1, Math.min(parseInt(value) || 1, updated[index].maxQuantity));
    }
    updated[index][field] = value;
    updated[index].total = updated[index].quantity * updated[index].salePrice * (1 - updated[index].discount / 100);
    setSaleItems(updated);
    setError('');
  };

  const removeItem = (index) => setSaleItems(saleItems.filter((_, i) => i !== index));

  const clearAllItems = () => {
    if (saleItems.length && window.confirm('Clear all items?')) {
      setSaleItems([]);
      setSuccess('Cart cleared');
      setTimeout(() => setSuccess(''), 2000);
    }
  };

  const handleSubmit = async () => {
    if (!saleItems.length) return setError('Add items first');

    try {
      setSubmitting(true);
      await Promise.all(saleItems.map(item =>
        salesAPI.create({
          product: item.product,
          quantity: item.quantity,
          unitPrice: item.salePrice,
          discount: item.discount,
          date: selectedDate
        })
      ));

      setSuccess(`Sale recorded! ${saleItems.length} items`);
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

  const handleDeleteSale = async (id) => {
    if (!window.confirm('Delete this sale?')) return;
    try {
      await salesAPI.delete(id);
      setSuccess('Sale deleted');
      await fetchSalesByDate(selectedDate);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Delete failed');
    }
  };

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
        s.quantity,
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
          <div className="h-10 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-white rounded-lg shadow"></div>)}
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
                Print Today
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
            <p className="text-xl font-bold text-blue-600">{dailySummary.totalQuantity}</p>
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
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm" max={new Date().toISOString().split('T')[0]} />
              <span className="text-sm font-medium text-gray-700">
                {new Date(selectedDate).toLocaleDateString('en-GB')}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {filteredSales.length} sales recorded
            </div>
          </div>
        </div>

        {/* New Sale Section */}
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
                type="text" placeholder="Search product by name or code..."
                value={productSearchTerm}
                onChange={e => { setProductSearchTerm(e.target.value); setIsProductDropdownOpen(true); }}
                onFocus={() => setIsProductDropdownOpen(true)}
                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:border-blue-500 outline-none text-sm"
              />
            </div>

            {isProductDropdownOpen && productSearchTerm && (
              <div className="max-w-xl bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
                {filteredProducts.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-sm">No products found</div>
                ) : (
                  filteredProducts.map(p => (
                    <button key={p._id} onClick={() => handleProductSelect(p)}
                      className="w-full text-left p-4 hover:bg-gray-50 border-b text-sm">
                      <div className="flex justify-between">
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-gray-600">Code: {p.code || '—'}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-blue-600">PKR {p.salePrice.toLocaleString()}</div>
                          {p.discount > 0 && (
                            <div className="text-xs text-green-600 font-medium">{p.discount}% off</div>
                          )}
                          <div className="text-xs text-gray-500">Stock: {getStock(p._id)}</div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {saleItems.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-900">Cart ({saleItems.length} items)</h3>
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
                          PKR {item.salePrice.toLocaleString()}
                          {item.discount > 0 && ` • ${item.discount}% discount applied`}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <input type="number" value={item.quantity} min="1" max={item.maxQuantity}
                          onChange={e => updateItem(i, 'quantity', e.target.value)}
                          className="w-16 px-2 py-1 border rounded text-center text-sm" />
                        <div className="font-bold text-green-600">PKR {item.total.toFixed(0)}</div>
                        <button onClick={() => removeItem(i)} className="text-red-600 hover:text-red-800">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 bg-gray-50 -m-5 p-5 rounded-b-lg">
                  <div className="flex justify-between font-bold mb-3">
                    <span>Grand Total</span>
                    <span className="text-green-600">PKR {saleSummary.total.toFixed(0)}</span>
                  </div>
                  <button onClick={handleSubmit} disabled={submitting}
                    className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 font-medium text-sm flex items-center justify-center gap-2">
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                    {submitting ? 'Recording...' : 'Complete Sale'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sales History with Search + Pagination */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="font-bold text-gray-800">Today's Sales History</h3>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search in sales..."
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
              <p className="text-lg">{salesSearchTerm ? 'No matching sales found' : 'No sales recorded yet'}</p>
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
                  <tbody className="divide-y" key={`sales-${selectedDate}-${currentPage}`}>
                    {currentSales.map(s => (
                      <tr key={s._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {new Date(s.createdAt || s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{s.product?.name}</div>
                          <div className="text-xs text-gray-500">{s.product?.code || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-center font-medium">{s.quantity}</td>
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

              {totalPages > 1 && (
                <div className="border-t px-4 py-3 bg-gray-50 flex flex-col sm:flex-row items-center justify-between text-sm">
                  <p className="text-gray-600">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, searchedSales.length)} of {searchedSales.length} entries
                    <span className="ml-2">(Page {currentPage} of {totalPages})</span>
                  </p>
                  <div className="flex items-center gap-2 mt-3 sm:mt-0">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 border rounded hover:bg-gray-100 disabled:opacity-50 flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" /> Prev
                    </button>
                    
                    {/* Show First Page Button if not in first set */}
                    {paginationNumbers[0] > 1 && (
                      <>
                        <button 
                          onClick={() => setCurrentPage(1)}
                          className="px-3 py-1.5 border rounded hover:bg-gray-100"
                        >
                          1
                        </button>
                        {paginationNumbers[0] > 2 && (
                          <span className="px-2">...</span>
                        )}
                      </>
                    )}
                    
                    {/* Show Page Numbers */}
                    {paginationNumbers.map(pageNum => (
                      <button 
                        key={pageNum} 
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1.5 rounded min-w-[40px] ${
                          currentPage === pageNum 
                            ? 'bg-blue-600 text-white' 
                            : 'border hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                    
                    {/* Show Last Page Button if not in last set */}
                    {paginationNumbers[paginationNumbers.length - 1] < totalPages && (
                      <>
                        {paginationNumbers[paginationNumbers.length - 1] < totalPages - 1 && (
                          <span className="px-2">...</span>
                        )}
                        <button 
                          onClick={() => setCurrentPage(totalPages)}
                          className="px-3 py-1.5 border rounded hover:bg-gray-100"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                    
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 border rounded hover:bg-gray-100 disabled:opacity-50 flex items-center gap-1"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
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