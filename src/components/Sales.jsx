// components/Sales.jsx 
import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Download, Search, Upload, 
  CheckCircle, AlertCircle, Loader2, Printer, 
  ChevronLeft, ChevronRight, FileText, Edit, X,
  Filter, RefreshCw, UserPlus, Users
} from 'lucide-react';
import { salesAPI, productsAPI, contactsAPI, inventoryAPI } from './../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Multi-product sale
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [saleItems, setSaleItems] = useState([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);

  // Add new customer modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  // Edit sale
  const [editingSale, setEditingSale] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editFormData, setEditFormData] = useState({
    customerName: '',
    product: '',
    quantity: '',
    unitPrice: '',
    discount: 0,
    date: new Date().toISOString().split('T')[0]
  });

  // Global search
  const [globalSearch, setGlobalSearch] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    customer: '',
    product: ''
  });

  // Print modal
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedCustomerForPrint, setSelectedCustomerForPrint] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchSales();
    fetchProducts();
    fetchInventory();
    fetchCustomers();
  }, []);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const res = await salesAPI.getAll();
      setSales(res.data.data || []);
      setFilteredSales(res.data.data || []);
    } catch (err) {
      setError('Failed to load sales');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await productsAPI.getAll();
      setProducts(res.data.data || []);
    } catch (err) { }
  };

  const fetchInventory = async () => {
    try {
      const res = await inventoryAPI.getAll();
      setInventory(res.data.data || []);
    } catch (err) { }
  };

  const fetchCustomers = async () => {
    try {
      const res = await contactsAPI.getByType('customer');
      setCustomers(res.data.data || []);
    } catch (err) { }
  };

  const getStock = (productId) => {
    const item = inventory.find(i => String(i.product._id || i.product) === productId);
    return item ? item.quantity : 0;
  };

  const productsWithStock = products.filter(p => getStock(p._id) > 0);

  // GLOBAL SEARCH FUNCTION
  const handleGlobalSearch = () => {
    if (!globalSearch.trim()) {
      setFilteredSales(sales);
      setCurrentPage(1);
      return;
    }

    const searchTerm = globalSearch.toLowerCase().trim();
    const filtered = sales.filter(sale => {
      return (
        sale.customerName?.toLowerCase().includes(searchTerm) ||
        sale.product?.name?.toLowerCase().includes(searchTerm) ||
        sale.product?.code?.toLowerCase().includes(searchTerm) ||
        sale.product?.type?.toLowerCase().includes(searchTerm) ||
        sale.quantity?.toString().includes(searchTerm) ||
        sale.unitPrice?.toString().includes(searchTerm) ||
        sale.totalAmount?.toString().includes(searchTerm) ||
        sale.discount?.toString().includes(searchTerm) ||
        new Date(sale.date).toLocaleDateString().toLowerCase().includes(searchTerm)
      );
    });

    setFilteredSales(filtered);
    setCurrentPage(1);
  };

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      handleGlobalSearch();
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [globalSearch, sales]);

  // Apply advanced filters
  const applyFilters = () => {
    let filtered = [...sales];

    if (filters.startDate) {
      filtered = filtered.filter(s => new Date(s.date) >= new Date(filters.startDate));
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(s => new Date(s.date) <= endDate);
    }

    if (filters.customer) {
      filtered = filtered.filter(s => 
        s.customerName.toLowerCase().includes(filters.customer.toLowerCase())
      );
    }

    if (filters.product) {
      filtered = filtered.filter(s => 
        s.product?._id === filters.product ||
        s.product?.name.toLowerCase().includes(filters.product.toLowerCase()) ||
        s.product?.code?.toLowerCase().includes(filters.product.toLowerCase())
      );
    }

    setFilteredSales(filtered);
    setCurrentPage(1);
    setShowAdvancedFilters(false);
  };

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      customer: '',
      product: ''
    });
    setGlobalSearch('');
    setFilteredSales(sales);
    setCurrentPage(1);
  };

  // ADD NEW CUSTOMER FUNCTIONS
  const handleAddCustomer = async () => {
    if (!newCustomerData.name.trim()) {
      setError('Customer name is required');
      return;
    }

    try {
      setSubmitting(true);
      const response = await contactsAPI.create({
        ...newCustomerData,
        type: 'customer'
      });

      const newCustomer = response.data.data;
      setCustomers([newCustomer, ...customers]);
      setSelectedCustomer(newCustomer.name);
      setShowAddCustomerModal(false);
      setNewCustomerData({ name: '', phone: '', email: '', address: '' });
      setSuccess('Customer added successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add customer');
    } finally {
      setSubmitting(false);
    }
  };

  // Product search for adding sales
  const filteredProducts = productsWithStock.filter(p =>
    p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    p.type.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    (p.code && p.code.toLowerCase().includes(productSearchTerm.toLowerCase()))
  );

  const handleProductSelect = (product) => {
    const exists = saleItems.find(item => item.product === product._id);
    if (!exists) {
      const stock = getStock(product._id);
      setSaleItems([...saleItems, {
        product: product._id,
        name: product.name,
        code: product.code || '',
        type: product.type,
        salePrice: product.salePrice,
        quantity: 1,
        maxQuantity: stock,
        discount: 0,
        total: product.salePrice
      }]);
    }
    setProductSearchTerm('');
    setIsProductDropdownOpen(false);
  };

  const updateItem = (index, field, value) => {
    const updated = [...saleItems];
    
    if (field === 'quantity') {
      value = parseInt(value) || 1;
      if (value > updated[index].maxQuantity) {
        setError(`Only ${updated[index].maxQuantity} units available`);
        return;
      }
      if (value < 1) value = 1;
    }
    
    if (field === 'discount') {
      value = parseFloat(value) || 0;
      if (value < 0) value = 0;
      if (value > 100) value = 100;
    }
    
    updated[index][field] = value;
    updated[index].total = updated[index].quantity * updated[index].salePrice * (1 - updated[index].discount / 100);
    setSaleItems(updated);
    setError('');
  };

  const removeItem = (index) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const getGrandTotal = () => {
    return saleItems.reduce((sum, item) => sum + item.total, 0);
  };

  const handleSubmit = async () => {
    if (!selectedCustomer || saleItems.length === 0) {
      setError('Please select customer and add products');
      return;
    }

    try {
      setSubmitting(true);
      const promises = saleItems.map(item =>
        salesAPI.create({
          customerName: selectedCustomer,
          product: item.product,
          quantity: item.quantity,
          unitPrice: item.salePrice,
          discount: item.discount
        })
      );

      await Promise.all(promises);
      setSuccess(`Sale completed! ${saleItems.length} items sold to ${selectedCustomer}`);
      setSaleItems([]);
      setSelectedCustomer('');
      setTimeout(() => setSuccess(''), 4000);
      fetchSales();
      fetchInventory();
      window.dispatchEvent(new Event('inventoryShouldUpdate'));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save sale');
    } finally {
      setSubmitting(false);
    }
  };

  // EDIT SALE FUNCTIONS
  const handleEdit = (sale) => {
    setEditingSale(sale);
    setEditFormData({
      customerName: sale.customerName || '',
      product: sale.product?._id || '',
      quantity: sale.quantity || '',
      unitPrice: sale.unitPrice || '',
      discount: sale.discount || 0,
      date: sale.date ? new Date(sale.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setShowEditForm(true);
  };

  const handleUpdateSale = async () => {
    if (!editFormData.customerName || !editFormData.product || !editFormData.quantity || !editFormData.unitPrice) {
      setError('Please fill all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const res = await salesAPI.update(editingSale._id, editFormData);
      
      setSuccess('Sale updated successfully!');
      setTimeout(() => {
        setSuccess('');
        setShowEditForm(false);
        setEditingSale(null);
      }, 2000);
      
      fetchSales();
      fetchInventory();
      window.dispatchEvent(new Event('inventoryShouldUpdate'));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update sale');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSale = async (id) => {
    if (!window.confirm('Are you sure you want to delete this sale? This action cannot be undone.')) {
      return;
    }

    try {
      await salesAPI.delete(id);
      setSuccess('Sale deleted successfully!');
      setTimeout(() => setSuccess(''), 2000);
      fetchSales();
      fetchInventory();
      window.dispatchEvent(new Event('inventoryShouldUpdate'));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete sale');
    }
  };

  // PAGINATION LOGIC
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentSales = filteredSales.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // PRINT FUNCTIONS
  const printAllSales = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(20);
    doc.text('AL WAQAS PAINT AND HARDWARE SHOP', 148, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('www.alwaqaspaint.com', 148, 28, { align: 'center' });
    doc.setFontSize(16);
    doc.text('SALES REPORT', 148, 40, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()} • Total: ${filteredSales.length} sales`, 14, 50);

    const tableData = filteredSales.map(s => [
      new Date(s.date).toLocaleDateString(),
      s.customerName,
      s.product?.name || '—',
      s.product?.code || '—',
      s.quantity,
      `Rs. ${s.unitPrice?.toLocaleString() || '0'}`,
      `${s.discount || 0}%`,
      `Rs. ${s.totalAmount?.toLocaleString() || '0'}`
    ]);

    autoTable(doc, {
      head: [['Date', 'Customer', 'Product', 'Code', 'Qty', 'Price', 'Disc', 'Total']],
      body: tableData,
      startY: 60,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });

    doc.save(`sales_report_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const printCustomerInvoice = () => {
    if (!selectedCustomerForPrint) return;

    const customerSales = filteredSales.filter(s => s.customerName === selectedCustomerForPrint);
    if (customerSales.length === 0) {
      setError('No sales found for this customer');
      return;
    }

    const doc = new jsPDF();
    
    // Header
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

    // Customer Info
    doc.setFontSize(12);
    doc.text(`Customer: ${selectedCustomerForPrint}`, 14, 65);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 72);

    // Title
    doc.setFontSize(18);
    doc.text(`SALES INVOICE`, 105, 85, { align: 'center' });

    // Table
    const tableData = customerSales.map(s => [
      s.product?.name || '—',
      s.product?.code || '—',
      s.quantity,
      `Rs. ${s.unitPrice?.toLocaleString() || '0'}`,
      `${s.discount || 0}%`,
      `Rs. ${s.totalAmount?.toLocaleString() || '0'}`
    ]);

    autoTable(doc, {
      head: [['Product', 'Code', 'Qty', 'Price', 'Disc', 'Total']],
      body: tableData,
      startY: 95,
      styles: { fontSize: 11 },
      headStyles: { fillColor: [52, 73, 94], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    const finalY = doc.lastAutoTable.finalY || 95;
    const grandTotal = customerSales.reduce((s, p) => s + p.totalAmount, 0);
    
    doc.setFontSize(16);
    doc.text(`GRAND TOTAL: Rs. ${grandTotal.toLocaleString()}`, 196, finalY + 20, { align: 'right' });

    doc.setFontSize(11);
    doc.text('Thank you for shopping with us!', 105, finalY + 35, { align: 'center' });
    doc.text('Visit Again!', 105, finalY + 42, { align: 'center' });

    doc.save(`invoice_${selectedCustomerForPrint.replace(/\s+/g, '_')}.pdf`);
    setShowPrintModal(false);
    setSelectedCustomerForPrint('');
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="space-y-6">
            {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Sales Management</h1>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowPrintModal(true)} 
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center gap-2"
          >
            <Printer size={18} />
            Print Invoice
          </button>
          <button 
            onClick={printAllSales} 
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2"
          >
            <Download size={18} />
            All Sales PDF
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
              placeholder="Search across all sales (customer name, product, code, amount, date...)"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                <select
                  value={filters.customer}
                  onChange={(e) => setFilters({...filters, customer: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">All Customers</option>
                  {customers.map(c => (
                    <option key={c._id} value={c.name}>{c.name}</option>
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

      {/* New Sale Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6">New Sale</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block font-medium mb-2">Customer *</label>
              <div className="flex gap-2">
                <select 
                  value={selectedCustomer} 
                  onChange={e => setSelectedCustomer(e.target.value)} 
                  className="flex-1 px-4 py-3 border rounded-lg"
                >
                  <option value="">Select Customer</option>
                  {customers.map(c => (
                    <option key={c._id} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowAddCustomerModal(true)}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
                  title="Add New Customer"
                >
                  <UserPlus size={20} />
                </button>
              </div>
            </div>
            
            {selectedCustomer && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700">
                  <Users size={20} />
                  <span className="font-bold">Selected: {selectedCustomer}</span>
                </div>
              </div>
            )}
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
        {saleItems.length > 0 && (
          <div className="mb-6">
            <h3 className="font-bold mb-3">Selected Items ({saleItems.length})</h3>
            <div className="space-y-3">
              {saleItems.map((item, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-600">
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded mr-2">{item.code || 'No Code'}</span>
                      • {item.type} • Stock: {item.maxQuantity}
                    </div>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={item.maxQuantity}
                    value={item.quantity}
                    onChange={e => updateItem(index, 'quantity', e.target.value)}
                    className="w-20 px-3 py-2 border rounded-lg text-center"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="Disc %"
                    value={item.discount}
                    onChange={e => updateItem(index, 'discount', e.target.value)}
                    className="w-24 px-3 py-2 border rounded-lg text-center"
                  />
                  <div className="w-32 text-right font-bold text-green-600">
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
            <div className="mt-4 p-4 bg-green-50 rounded-lg text-right">
              <p className="text-2xl font-bold text-green-800">
                Grand Total: Rs. {getGrandTotal().toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Product Search Results */}
        {isProductDropdownOpen && productSearchTerm && (
          <div className="mt-2 max-h-96 overflow-y-auto border rounded-lg bg-white shadow-lg z-10">
            {filteredProducts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No products available</div>
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
                      • {p.type} • Rs. {p.salePrice?.toLocaleString()} • Stock: {getStock(p._id)}
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
          disabled={submitting || saleItems.length === 0 || !selectedCustomer}
          className="mt-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-8 py-4 rounded-lg font-bold text-lg flex items-center gap-2 justify-center"
        >
          {submitting ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Processing...
            </>
          ) : (
            'Complete Sale'
          )}
        </button>
      </div>

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <UserPlus size={24} />
                  Add New Customer
                </h3>
                <button
                  onClick={() => {
                    setShowAddCustomerModal(false);
                    setNewCustomerData({ name: '', phone: '', email: '', address: '' });
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block font-medium mb-2">Customer Name *</label>
                  <input
                    type="text"
                    value={newCustomerData.name}
                    onChange={(e) => setNewCustomerData({...newCustomerData, name: e.target.value})}
                    className="w-full px-4 py-3 border rounded-lg"
                    placeholder="Enter customer name"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-2">Phone Number</label>
                  <input
                    type="text"
                    value={newCustomerData.phone}
                    onChange={(e) => setNewCustomerData({...newCustomerData, phone: e.target.value})}
                    className="w-full px-4 py-3 border rounded-lg"
                    placeholder="0300-1234567"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-2">Email (Optional)</label>
                  <input
                    type="email"
                    value={newCustomerData.email}
                    onChange={(e) => setNewCustomerData({...newCustomerData, email: e.target.value})}
                    className="w-full px-4 py-3 border rounded-lg"
                    placeholder="customer@email.com"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-2">Address (Optional)</label>
                  <textarea
                    value={newCustomerData.address}
                    onChange={(e) => setNewCustomerData({...newCustomerData, address: e.target.value})}
                    className="w-full px-4 py-3 border rounded-lg"
                    placeholder="Customer address"
                    rows="3"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-6">
                  <button
                    onClick={() => {
                      setShowAddCustomerModal(false);
                      setNewCustomerData({ name: '', phone: '', email: '', address: '' });
                    }}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddCustomer}
                    disabled={submitting}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
                  >
                    {submitting && <Loader2 size={20} className="animate-spin" />}
                    {submitting ? 'Adding...' : 'Add Customer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sale Modal (similar to Add Customer Modal structure) */}
      {showEditForm && editingSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Edit Sale</h3>
                <button
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingSale(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Edit form fields similar to Add Customer modal */}
                <div>
                  <label className="block font-medium mb-2">Date *</label>
                  <input
                    type="date"
                    value={editFormData.date}
                    onChange={(e) => setEditFormData({...editFormData, date: e.target.value})}
                    className="w-full px-4 py-3 border rounded-lg"
                  />
                </div>

                {/* Add other edit fields here... */}
                
                <div className="flex gap-3 justify-end pt-6">
                  <button
                    onClick={() => {
                      setShowEditForm(false);
                      setEditingSale(null);
                    }}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateSale}
                    disabled={submitting}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
                  >
                    {submitting && <Loader2 size={20} className="animate-spin" />}
                    {submitting ? 'Updating...' : 'Update Sale'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8">
            <h3 className="text-2xl font-bold mb-6">Print Customer Invoice</h3>
            <select
              value={selectedCustomerForPrint}
              onChange={e => setSelectedCustomerForPrint(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg mb-6"
            >
              <option value="">Select Customer</option>
              {customers.map(c => (
                <option key={c._id} value={c.name}>{c.name}</option>
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
                onClick={printCustomerInvoice}
                disabled={!selectedCustomerForPrint}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg flex items-center gap-2"
              >
                <Printer size={18} />
                Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sales Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-800">
              Sales History ({filteredSales.length})
            </h3>
            {globalSearch && (
              <p className="text-sm text-gray-600 mt-1">
                Showing results for: "{globalSearch}"
              </p>
            )}
          </div>
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages} • Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredSales.length)} of {filteredSales.length}
          </div>
        </div>

        {filteredSales.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <FileText size={64} className="mx-auto mb-4 text-gray-300" />
            <p className="text-xl">No sales found</p>
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
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Customer</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Product</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Code</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Qty</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Price</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Disc</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Total</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentSales.map(s => (
                    <tr key={s._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm">
                        {new Date(s.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-medium">{s.customerName}</td>
                      <td className="px-6 py-4">{s.product?.name}</td>
                      <td className="px-6 py-4">
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs font-bold">
                          {s.product?.code || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-center">{s.quantity}</td>
                      <td className="px-6 py-4 text-blue-600">Rs. {s.unitPrice?.toLocaleString()}</td>
                      <td className="px-6 py-4 text-orange-600">{s.discount || 0}%</td>
                      <td className="px-6 py-4 font-bold text-green-600">
                        Rs. {s.totalAmount?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(s)}
                            className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteSale(s._id)}
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
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredSales.length)} of {filteredSales.length} sales
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

export default Sales;