// components/Purchases.jsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Download, Search, Upload, 
  CheckCircle, AlertCircle, Loader2, Printer, 
  ChevronLeft, ChevronRight, FileText, Edit, X,
  Calendar, Filter, RefreshCw
} from 'lucide-react';
import { purchasesAPI, productsAPI, contactsAPI, colorsAPI } from './../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Purchases = () => {
  const [purchases, setPurchases] = useState([]);
  const [filteredPurchases, setFilteredPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [colors, setColors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Multi-product purchase
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);

  // Edit purchase
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editFormData, setEditFormData] = useState({
    product: '',
    supplier: '',
    quantity: '',
    unitPrice: '',
    color: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Global search
  const [globalSearch, setGlobalSearch] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    supplier: '',
    product: ''
  });

  // Print modal
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedSupplierForPrint, setSelectedSupplierForPrint] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchPurchases();
    fetchProducts();
    fetchSuppliers();
    fetchColors();
  }, []);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.supplier) params.supplier = filters.supplier;
      if (filters.product) params.product = filters.product;

      const res = await purchasesAPI.getAll(params);
      console.log('Purchases data with codes:', res.data.data);
      setPurchases(res.data.data || []);
      setFilteredPurchases(res.data.data || []);
    } catch (err) {
      console.error('Fetch purchases error:', err);
      setError('Failed to load purchases');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await productsAPI.getAll();
      setProducts(res.data.data || []);
    } catch (err) {
      console.error('Fetch products error:', err);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await contactsAPI.getByType('supplier');
      setSuppliers(res.data.data || []);
    } catch (err) {
      console.error('Fetch suppliers error:', err);
    }
  };

  const fetchColors = async () => {
    try {
      const res = await colorsAPI.getAll();
      setColors(res.data.data || []);
    } catch (err) {
      console.error('Fetch colors error:', err);
    }
  };

  // GLOBAL SEARCH FUNCTION - searches across all pages
  const handleGlobalSearch = () => {
    if (!globalSearch.trim()) {
      setFilteredPurchases(purchases);
      setCurrentPage(1);
      return;
    }

    const searchTerm = globalSearch.toLowerCase().trim();
    const filtered = purchases.filter(purchase => {
      return (
        purchase.product?.name?.toLowerCase().includes(searchTerm) ||
        purchase.product?.code?.toLowerCase().includes(searchTerm) ||
        purchase.product?.type?.toLowerCase().includes(searchTerm) ||
        purchase.supplier?.toLowerCase().includes(searchTerm) ||
        purchase.color?.name?.toLowerCase().includes(searchTerm) ||
        purchase.color?.codeName?.toLowerCase().includes(searchTerm) ||
        purchase.quantity?.toString().includes(searchTerm) ||
        purchase.unitPrice?.toString().includes(searchTerm) ||
        purchase.totalAmount?.toString().includes(searchTerm) ||
        new Date(purchase.date).toLocaleDateString().toLowerCase().includes(searchTerm)
      );
    });

    setFilteredPurchases(filtered);
    setCurrentPage(1);
  };

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      handleGlobalSearch();
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [globalSearch, purchases]);

  // Apply advanced filters
  const applyFilters = () => {
    let filtered = [...purchases];

    if (filters.startDate) {
      filtered = filtered.filter(p => new Date(p.date) >= new Date(filters.startDate));
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(p => new Date(p.date) <= endDate);
    }

    if (filters.supplier) {
      filtered = filtered.filter(p => 
        p.supplier.toLowerCase().includes(filters.supplier.toLowerCase())
      );
    }

    if (filters.product) {
      filtered = filtered.filter(p => 
        p.product?._id === filters.product ||
        p.product?.name.toLowerCase().includes(filters.product.toLowerCase()) ||
        p.product?.code?.toLowerCase().includes(filters.product.toLowerCase())
      );
    }

    setFilteredPurchases(filtered);
    setCurrentPage(1);
    setShowAdvancedFilters(false);
  };

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      supplier: '',
      product: ''
    });
    setGlobalSearch('');
    setFilteredPurchases(purchases);
    setCurrentPage(1);
  };

  // Product search for adding purchases
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    p.type.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    (p.code && p.code.toLowerCase().includes(productSearchTerm.toLowerCase()))
  );

  const handleProductSelect = (product) => {
    const exists = purchaseItems.find(item => item.product === product._id);
    if (!exists) {
      setPurchaseItems([...purchaseItems, {
        product: product._id,
        name: product.name,
        code: product.code || '',
        type: product.type,
        purchasePrice: product.purchasePrice,
        quantity: 1,
        total: product.purchasePrice
      }]);
    }
    setProductSearchTerm('');
    setIsProductDropdownOpen(false);
  };

  const updateItemQuantity = (index, qty) => {
    if (qty < 1) qty = 1;
    const updated = [...purchaseItems];
    updated[index].quantity = qty;
    updated[index].total = qty * updated[index].purchasePrice;
    setPurchaseItems(updated);
  };

  const removeItem = (index) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const getTotalAmount = () => {
    return purchaseItems.reduce((sum, item) => sum + item.total, 0);
  };

  const handleSubmit = async () => {
    if (!selectedSupplier || purchaseItems.length === 0) {
      setError('Please select supplier and add products');
      return;
    }

    try {
      setSubmitting(true);
      const promises = purchaseItems.map(item =>
        purchasesAPI.create({
          product: item.product,
          supplier: selectedSupplier,
          quantity: item.quantity,
          unitPrice: item.purchasePrice,
          color: item.color || null
        })
      );

      await Promise.all(promises);
      setSuccess(`Purchase completed! ${purchaseItems.length} items from ${selectedSupplier}`);
      setPurchaseItems([]);
      setSelectedSupplier('');
      setTimeout(() => setSuccess(''), 4000);
      fetchPurchases();
      
      window.dispatchEvent(new Event('inventoryShouldUpdate'));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save purchase');
    } finally {
      setSubmitting(false);
    }
  };

  // EDIT PURCHASE FUNCTIONS
  const handleEdit = (purchase) => {
    setEditingPurchase(purchase);
    setEditFormData({
      product: purchase.product?._id || '',
      supplier: purchase.supplier || '',
      quantity: purchase.quantity || '',
      unitPrice: purchase.unitPrice || '',
      color: purchase.color?._id || '',
      date: purchase.date ? new Date(purchase.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setShowEditForm(true);
  };

  const handleUpdatePurchase = async () => {
    if (!editFormData.product || !editFormData.supplier || !editFormData.quantity || !editFormData.unitPrice) {
      setError('Please fill all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const res = await purchasesAPI.update(editingPurchase._id, editFormData);
      
      setSuccess('Purchase updated successfully!');
      setTimeout(() => {
        setSuccess('');
        setShowEditForm(false);
        setEditingPurchase(null);
      }, 2000);
      
      fetchPurchases();
      window.dispatchEvent(new Event('inventoryShouldUpdate'));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update purchase');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePurchase = async (id) => {
    if (!window.confirm('Are you sure you want to delete this purchase? This action cannot be undone.')) {
      return;
    }

    try {
      await purchasesAPI.delete(id);
      setSuccess('Purchase deleted successfully!');
      setTimeout(() => setSuccess(''), 2000);
      fetchPurchases();
      window.dispatchEvent(new Event('inventoryShouldUpdate'));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete purchase');
    }
  };

  // PAGINATION LOGIC
  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentPurchases = filteredPurchases.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // PRINT FUNCTIONS
  const printAllPurchases = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(20);
    doc.text('AL WAQAS PAINT AND HARDWARE SHOP', 148, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('www.alwaqaspaint.com', 148, 28, { align: 'center' });
    doc.setFontSize(16);
    doc.text('ALL PURCHASES REPORT', 148, 40, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()} • Total: ${filteredPurchases.length} purchases`, 14, 50);

    const tableData = filteredPurchases.map(p => [
      new Date(p.date).toLocaleDateString(),
      p.product?.name || '—',
      p.product?.code || '—',
      p.supplier,
      p.quantity,
      `Rs. ${p.unitPrice?.toLocaleString() || '0'}`,
      `Rs. ${p.totalAmount?.toLocaleString() || '0'}`
    ]);

    autoTable(doc, {
      head: [['Date', 'Product', 'Code', 'Supplier', 'Qty', 'Price', 'Total']],
      body: tableData,
      startY: 60,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });

    doc.save(`purchases_report_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const printSupplierInvoice = () => {
    if (!selectedSupplierForPrint) return;

    const supplierPurchases = filteredPurchases.filter(p => p.supplier === selectedSupplierForPrint);
    if (supplierPurchases.length === 0) {
      setError('No purchases found for this supplier');
      return;
    }

    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.text('AL WAQAS PAINT AND HARDWARE SHOP', 105, 25, { align: 'center' });
    doc.setFontSize(12);
    doc.text('www.alwaqaspaint.com', 105, 33, { align: 'center' });
    doc.setFontSize(10);
    doc.text('Nadir Plaza, Opposite Lignum Tower, DHA 2, Near Al Janat Mall', 105, 40, { align: 'center' });
    doc.text('GT Road, Islamabad', 105, 46, { align: 'center' });
    doc.text('Phone: +92 333 5093223', 105, 52, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(14, 58, 196, 58);

    doc.setFontSize(18);
    doc.text(`PURCHASE INVOICE - ${selectedSupplierForPrint.toUpperCase()}`, 105, 70, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 80);
    doc.text(`Total Items: ${supplierPurchases.reduce((s, p) => s + p.quantity, 0)}`, 14, 86);

    const tableData = supplierPurchases.map(p => [
      p.product?.name || '—',
      p.product?.code || '—',
      p.quantity,
      `Rs. ${p.unitPrice?.toLocaleString() || '0'}`,
      `Rs. ${p.totalAmount?.toLocaleString() || '0'}`
    ]);

    autoTable(doc, {
      head: [['Product', 'Code', 'Qty', 'Price', 'Total']],
      body: tableData,
      startY: 90,
      styles: { fontSize: 11 },
      headStyles: { fillColor: [52, 73, 94], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    const finalY = doc.lastAutoTable.finalY || 90;
    doc.setFontSize(14);
    doc.text(`GRAND TOTAL: Rs. ${supplierPurchases.reduce((s, p) => s + p.totalAmount, 0).toLocaleString()}`, 196, finalY + 20, { align: 'right' });

    doc.setFontSize(10);
    doc.text('Thank you for your business!', 105, finalY + 35, { align: 'center' });

    doc.save(`purchase_invoice_${selectedSupplierForPrint.replace(/\s+/g, '_')}.pdf`);
    setShowPrintModal(false);
    setSelectedSupplierForPrint('');
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="space-y-6">
            {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Purchase Management</h1>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowPrintModal(true)} 
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center gap-2"
          >
            <Printer size={18} />
            Print Supplier Invoice
          </button>
          <button 
            onClick={printAllPurchases} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2"
          >
            <Download size={18} />
            All Purchases PDF
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
          <CheckCircle size={20} /> {success}
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* GLOBAL SEARCH BAR */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search across all purchases (product name, code, supplier, color, amount, date...)"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2"
          >
            <Filter size={18} />
            Advanced Filters
          </button>
          <button
            onClick={resetFilters}
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2"
          >
            <RefreshCw size={18} />
            Reset All
          </button>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="mt-6 p-6 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <select
                  value={filters.supplier}
                  onChange={(e) => setFilters({...filters, supplier: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">All Suppliers</option>
                  {suppliers.map(s => (
                    <option key={s._id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                <select
                  value={filters.product}
                  onChange={(e) => setFilters({...filters, product: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">All Products</option>
                  {products.map(p => (
                    <option key={p._id} value={p._id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowAdvancedFilters(false)}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={applyFilters}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Purchase Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6">New Purchase</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block font-medium mb-2">Supplier *</label>
            <select 
              value={selectedSupplier} 
              onChange={e => setSelectedSupplier(e.target.value)} 
              className="w-full px-4 py-3 border rounded-lg"
            >
              <option value="">Select Supplier</option>
              {suppliers.map(s => (
                <option key={s._id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <label className="block font-medium mb-2">Search Product</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Type product name, code, or type..."
                value={productSearchTerm}
                onChange={e => {
                  setProductSearchTerm(e.target.value);
                  setIsProductDropdownOpen(true);
                }}
                onFocus={() => setIsProductDropdownOpen(true)}
                className="w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Selected Items */}
        {purchaseItems.length > 0 && (
          <div className="mb-6">
            <h3 className="font-bold mb-3">Selected Items ({purchaseItems.length})</h3>
            <div className="space-y-3">
              {purchaseItems.map((item, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-600">
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded mr-2">{item.code || 'No Code'}</span>
                      • {item.type}
                    </div>
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={e => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                    className="w-24 px-3 py-2 border rounded-lg text-center"
                  />
                  <div className="w-32 text-right font-bold text-blue-600">
                    Rs. {item.total.toLocaleString()}
                  </div>
                  <button 
                    onClick={() => removeItem(index)} 
                    className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg text-right">
              <p className="text-2xl font-bold text-blue-800">
                Grand Total: Rs. {getTotalAmount().toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Product Search Results */}
        {isProductDropdownOpen && productSearchTerm && (
          <div className="mt-2 max-h-96 overflow-y-auto border rounded-lg bg-white shadow-lg z-10">
            {filteredProducts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No products found</div>
            ) : (
              filteredProducts.map(p => (
                <button
                  key={p._id}
                  onClick={() => handleProductSelect(p)}
                  className="w-full text-left p-4 hover:bg-blue-50 border-b flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-gray-600">
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded mr-2">{p.code || 'No Code'}</span>
                      • {p.type} • Rs. {p.purchasePrice?.toLocaleString()}
                    </div>
                  </div>
                  <Plus size={20} className="text-blue-600" />
                </button>
              ))
            )}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting || purchaseItems.length === 0 || !selectedSupplier}
          className="mt-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-8 py-4 rounded-lg font-bold text-lg flex items-center gap-2 justify-center"
        >
          {submitting ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Processing...
            </>
          ) : (
            'Complete Purchase'
          )}
        </button>
      </div>

      {/* Edit Purchase Modal */}
      {showEditForm && editingPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Edit Purchase</h3>
                <button
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingPurchase(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block font-medium mb-2">Date *</label>
                  <input
                    type="date"
                    value={editFormData.date}
                    onChange={(e) => setEditFormData({...editFormData, date: e.target.value})}
                    className="w-full px-4 py-3 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-2">Product *</label>
                  <select
                    value={editFormData.product}
                    onChange={(e) => setEditFormData({...editFormData, product: e.target.value})}
                    className="w-full px-4 py-3 border rounded-lg"
                  >
                    <option value="">Select Product</option>
                    {products.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.code || 'No Code'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-2">Supplier *</label>
                  <input
                    type="text"
                    value={editFormData.supplier}
                    onChange={(e) => setEditFormData({...editFormData, supplier: e.target.value})}
                    className="w-full px-4 py-3 border rounded-lg"
                    placeholder="Supplier name"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block font-medium mb-2">Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      value={editFormData.quantity}
                      onChange={(e) => setEditFormData({...editFormData, quantity: e.target.value})}
                      className="w-full px-4 py-3 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-2">Unit Price *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editFormData.unitPrice}
                      onChange={(e) => setEditFormData({...editFormData, unitPrice: e.target.value})}
                      className="w-full px-4 py-3 border rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium mb-2">Color (Optional)</label>
                  <select
                    value={editFormData.color}
                    onChange={(e) => setEditFormData({...editFormData, color: e.target.value})}
                    className="w-full px-4 py-3 border rounded-lg"
                  >
                    <option value="">No Color</option>
                    {colors.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.codeName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="font-bold text-blue-800">
                    Total Amount: Rs. {(editFormData.quantity * editFormData.unitPrice).toLocaleString()}
                  </p>
                </div>

                <div className="flex gap-3 justify-end pt-6">
                  <button
                    onClick={() => {
                      setShowEditForm(false);
                      setEditingPurchase(null);
                    }}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdatePurchase}
                    disabled={submitting}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
                  >
                    {submitting && <Loader2 size={20} className="animate-spin" />}
                    {submitting ? 'Updating...' : 'Update Purchase'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Supplier Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8">
            <h3 className="text-2xl font-bold mb-6">Print Supplier Invoice</h3>
            <select
              value={selectedSupplierForPrint}
              onChange={e => setSelectedSupplierForPrint(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg mb-6"
            >
              <option value="">Select Supplier</option>
              {suppliers.map(s => (
                <option key={s._id} value={s.name}>{s.name}</option>
              ))}
            </select>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowPrintModal(false)} 
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={printSupplierInvoice}
                disabled={!selectedSupplierForPrint}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg flex items-center gap-2"
              >
                <Printer size={18} />
                Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchases Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-800">
              Purchase History ({filteredPurchases.length})
            </h3>
            {globalSearch && (
              <p className="text-sm text-gray-600 mt-1">
                Showing results for: "{globalSearch}"
              </p>
            )}
          </div>
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages} • Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredPurchases.length)} of {filteredPurchases.length}
          </div>
        </div>

        {filteredPurchases.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <FileText size={64} className="mx-auto mb-4 text-gray-300" />
            <p className="text-xl">No purchases found</p>
            {globalSearch && (
              <p className="text-gray-600">Try a different search term</p>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Product</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Code</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Supplier</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Color</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Qty</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Price</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Total</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentPurchases.map(p => (
                    <tr key={p._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm">
                        {new Date(p.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {p.product?.name || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono bg-gray-100 px-3 py-1 rounded text-sm font-bold">
                          {p.product?.code || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">{p.supplier}</td>
                      <td className="px-6 py-4">
                        {p.color ? (
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-6 h-6 rounded-full border"
                              style={{ backgroundColor: p.color.hexCode || '#ccc' }}
                            ></div>
                            <span className="text-sm">{p.color.codeName}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-center">{p.quantity}</td>
                      <td className="px-6 py-4 text-blue-600">
                        Rs. {p.unitPrice?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-bold text-green-600">
                        Rs. {p.totalAmount?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(p)}
                            className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeletePurchase(p._id)}
                            className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg"
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

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredPurchases.length)} of {filteredPurchases.length} purchases
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-100 disabled:opacity-50 flex items-center gap-2"
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          className={`px-3 py-1 rounded-lg ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-100 disabled:opacity-50 flex items-center gap-2"
                  >
                    Next
                    <ChevronRight size={16} />
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

export default Purchases;