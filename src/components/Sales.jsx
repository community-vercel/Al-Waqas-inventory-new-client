// components/Sales.jsx - WITH CUSTOMER DROPDOWN FEATURE
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Edit, Download, ChevronLeft, ChevronRight, AlertCircle, MessageCircle, UserPlus } from 'lucide-react';
import { salesAPI, productsAPI, colorsAPI, inventoryAPI, contactsAPI } from './../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [allSales, setAllSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [colors, setColors] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filteredColors, setFilteredColors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [whatsappModal, setWhatsappModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    address: ''
  });

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    customerName: '',
    product: ''
  });

  const [newSale, setNewSale] = useState({
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    product: '',
    color: '',
    quantity: '',
    unitPrice: '',
    discount: '0'
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchAllSales();
    fetchFilteredSales();
    fetchProducts();
    fetchColors();
    fetchInventory();
    fetchCustomers();
  }, [filters, currentPage]);

  const fetchAllSales = async () => {
    try {
      const response = await salesAPI.getAll({});
      setAllSales(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch all sales');
    }
  };

  const fetchFilteredSales = async () => {
    try {
      setLoading(true);
      const response = await salesAPI.getAll(filters);
      setSales(response.data.data || []);
    } catch (error) {
      setError('Failed to fetch sales');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      setProducts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchColors = async () => {
    try {
      const response = await colorsAPI.getAll();
      setColors(response.data.data || []);
    } catch (error) {
      console.error('Error fetching colors:', error);
    }
  };

  const fetchInventory = async () => {
    try {
      const response = await inventoryAPI.getAll();
      setInventory(response.data.data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await contactsAPI.getByType('customer');
      setCustomers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  // Create new customer
  const createNewCustomer = async () => {
    if (!newCustomer.name.trim()) {
      setError('Customer name is required');
      return;
    }

    try {
      setSubmitting(true);
      const customerData = {
        name: newCustomer.name,
        type: 'customer',
        phone: newCustomer.phone,
        address: newCustomer.address
      };

      await contactsAPI.create(customerData);
      setSuccess('Customer added successfully!');
      setNewCustomer({ name: '', phone: '', address: '' });
      setShowNewCustomerForm(false);
      fetchCustomers(); // Refresh customers list
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  };

  // Get available stock for selected product + color
  const getAvailableStock = () => {
    if (!newSale.product || !newSale.color) return 0;

    const item = inventory.find(i =>
      String(i.product._id || i.product) === newSale.product &&
      String(i.color._id || i.color) === newSale.color
    );

    return item ? item.quantity : 0;
  };

  const availableStock = getAvailableStock();

  useEffect(() => {
    if (newSale.product) {
      const selectedProduct = products.find(p => p._id === newSale.product);
      if (selectedProduct && selectedProduct.colors?.length > 0) {
        setFilteredColors(selectedProduct.colors);
      } else {
        setFilteredColors(colors);
      }
      setNewSale(prev => ({ ...prev, color: '', unitPrice: '' }));
      const product = products.find(p => p._id === newSale.product);
      if (product) {
        setNewSale(prev => ({ ...prev, unitPrice: product.salePrice?.toString() || '' }));
      }
    } else {
      setFilteredColors([]);
    }
  }, [newSale.product, products, colors]);

  const handleSubmit = async () => {
    if (!newSale.customerName.trim() || !newSale.product || !newSale.color || !newSale.quantity || !newSale.unitPrice) {
      setError('Please fill all required fields');
      return;
    }

    const qty = parseInt(newSale.quantity);
    const price = parseFloat(newSale.unitPrice);

    if (qty <= 0 || price <= 0) {
      setError('Quantity and price must be greater than 0');
      return;
    }

    if (qty > availableStock) {
      setError(`Only ${availableStock} units available in stock`);
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const saleData = {
        customerName: newSale.customerName.trim(),
        product: newSale.product,
        color: newSale.color,
        quantity: qty,
        unitPrice: price,
        discount: parseFloat(newSale.discount) || 0
      };

      if (editingSale) {
        await salesAPI.update(editingSale._id, saleData);
        setSuccess('Sale updated successfully!');
        setEditingSale(null);
      } else {
        await salesAPI.create(saleData);
        setSuccess('Sale completed successfully!');
      }

      setNewSale({
        date: new Date().toISOString().split('T')[0],
        customerName: '',
        product: '',
        color: '',
        quantity: '',
        unitPrice: '',
        discount: '0'
      });

      setTimeout(() => setSuccess(''), 3000);
      fetchAllSales();
      fetchFilteredSales();
      fetchInventory();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save sale');
    } finally {
      setSubmitting(false);
    }
  };

  const editSale = (sale) => {
    setEditingSale(sale);
    setNewSale({
      date: new Date(sale.date).toISOString().split('T')[0],
      customerName: sale.customerName,
      product: sale.product._id,
      color: sale.color._id,
      quantity: sale.quantity.toString(),
      unitPrice: sale.unitPrice.toString(),
      discount: sale.discount.toString()
    });
  };

  const deleteSale = async (id) => {
    if (!window.confirm('Delete this sale?')) return;
    try {
      await salesAPI.delete(id);
      setSuccess('Sale deleted!');
      setTimeout(() => setSuccess(''), 3000);
      fetchAllSales();
      fetchFilteredSales();
      fetchInventory();
    } catch (error) {
      setError('Failed to delete');
    }
  };

  // WhatsApp Invoice Functionality
  const openWhatsappModal = (sale) => {
    setSelectedSale(sale);
    setWhatsappNumber('');
    setWhatsappModal(true);
  };

  const sendWhatsappInvoice = () => {
    if (!whatsappNumber.trim()) {
      setError('Please enter WhatsApp number');
      return;
    }

    // Validate phone number (basic validation)
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    if (cleanNumber.length < 10) {
      setError('Please enter a valid WhatsApp number');
      return;
    }

    const productName = selectedSale.product?.name || 'Product';
    const colorName = selectedSale.color?.name || 'No Color';
    const quantity = selectedSale.quantity;
    const total = selectedSale.totalAmount.toLocaleString();

    const message = `Thank You! 
AL-WAQAS PAINT & HARDWARE

Product: ${productName}
Color: ${colorName}
Quantity: ${quantity}
Total: Rs. ${total}

Visit Again!
📞 Phone: +92 333 5093223
📍 Location: Nadir Plaza, Opposite Lignum Tower, DHA 2, Near Al Janat Mall, GT Road, Islamabad`;

    const whatsappURL = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappURL, '_blank');
    
    setWhatsappModal(false);
    setSuccess('WhatsApp invoice opened!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const applyFilters = () => {
    setCurrentPage(1);
    setSearchParams({ page: '1' });
  };

  const clearFilters = () => {
    setFilters({ startDate: '', endDate: '', customerName: '', product: '' });
    setCurrentPage(1);
    setSearchParams({});
  };

  // PDF Download
  const generateAllSalesPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFontSize(20);
    doc.text('ALWAQAS PAINT SHOP - Sales Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

    const tableData = allSales.map(s => [
      new Date(s.date).toLocaleDateString(),
      s.customerName,
      s.product?.name || '—',
      s.color?.name || 'No Color',
      s.quantity,
      `Rs. ${s.unitPrice.toLocaleString()}`,
      `${s.discount}%`,
      `Rs. ${s.totalAmount.toLocaleString()}`
    ]);

    autoTable(doc, {
      head: [['Date', 'Customer', 'Product', 'Color', 'Qty', 'Price', 'Discount', 'Total']],
      body: tableData,
      startY: 40,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`all_sales_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  // Pagination
  const totalPages = Math.ceil(sales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSales = sales.slice(startIndex, endIndex);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setSearchParams({ page: page.toString() });
    }
  };

  const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalItemsSold = sales.reduce((sum, s) => sum + s.quantity, 0);

  if (loading && sales.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="space-y-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* WhatsApp Modal */}
      {whatsappModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Send WhatsApp Invoice</h3>
            
            {selectedSale && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold">Sale Details:</p>
                <p className="text-sm">Customer: {selectedSale.customerName}</p>
                <p className="text-sm">Product: {selectedSale.product?.name}</p>
                <p className="text-sm">Total: Rs. {selectedSale.totalAmount.toLocaleString()}</p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WhatsApp Number
              </label>
              <input
                type="tel"
                placeholder="Enter customer's WhatsApp number"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter number with country code (e.g., 923001234567)
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setWhatsappModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={sendWhatsappInvoice}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2"
              >
                <MessageCircle size={18} />
                Send Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Sales Management</h1>
          <p className="text-gray-600 mt-1">Process sales with live stock check</p>
        </div>
        <button
          onClick={generateAllSalesPDF}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-3 shadow-lg font-medium"
        >
          <Download size={20} /> Download All PDF
        </button>
      </div>

      {success && <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>}
      {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <p className="text-sm text-gray-600">Total Sales</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{sales.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <p className="text-sm text-gray-600">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">Rs. {totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <p className="text-sm text-gray-600">Items Sold</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{totalItemsSold}</p>
        </div>
      </div>

      {/* Add/Edit Sale Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6">{editingSale ? 'Edit Sale' : 'Process New Sale'}</h2>
        
        {/* Customer Selection */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">Customer *</label>
            <button
              type="button"
              onClick={() => setShowNewCustomerForm(!showNewCustomerForm)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
            >
              <UserPlus size={16} />
              {showNewCustomerForm ? 'Cancel' : 'Add New Customer'}
            </button>
          </div>

          {/* New Customer Form */}
          {showNewCustomerForm && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-3">Add New Customer</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Customer Name *"
                  value={newCustomer.name}
                  onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Phone Number"
                  value={newCustomer.phone}
                  onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Address"
                  value={newCustomer.address}
                  onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={createNewCustomer}
                  disabled={submitting || !newCustomer.name.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  {submitting ? 'Adding...' : 'Add Customer'}
                </button>
                <button
                  onClick={() => setShowNewCustomerForm(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Customer Dropdown */}
          <div className="flex gap-2">
            <select
              value={newSale.customerName}
              onChange={e => setNewSale({ ...newSale, customerName: e.target.value })}
              className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Customer</option>
              {customers.map(customer => (
                <option key={customer._id} value={customer.name}>
                  {customer.name} {customer.phone ? `- ${customer.phone}` : ''}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Or enter customer name"
              value={newSale.customerName}
              onChange={e => setNewSale({ ...newSale, customerName: e.target.value })}
              className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Product Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <input type="date" value={newSale.date} onChange={e => setNewSale({ ...newSale, date: e.target.value })} className="px-4 py-3 border rounded-lg" />
          <select value={newSale.product} onChange={e => setNewSale({ ...newSale, product: e.target.value, color: '', unitPrice: products.find(p => p._id === e.target.value)?.salePrice || '' })} className="px-4 py-3 border rounded-lg">
            <option value="">Select Product</option>
            {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          <select value={newSale.color} onChange={e => setNewSale({ ...newSale, color: e.target.value })} className="px-4 py-3 border rounded-lg" disabled={!newSale.product}>
            <option value="">Select Color</option>
            {filteredColors.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <input type="number" placeholder="Qty" min="1" value={newSale.quantity} onChange={e => setNewSale({ ...newSale, quantity: e.target.value })} className="px-4 py-3 border rounded-lg" />
          <input type="number" placeholder="Price" step="0.01" value={newSale.unitPrice} onChange={e => setNewSale({ ...newSale, unitPrice: e.target.value })} className="px-4 py-3 border rounded-lg" />
          <input type="number" placeholder="Discount %" min="0" max="100" value={newSale.discount} onChange={e => setNewSale({ ...newSale, discount: e.target.value })} className="px-4 py-3 border rounded-lg" />
        </div>

        {/* Stock Status */}
        {newSale.product && newSale.color && (
          <div className="mt-4 p-4 rounded-lg flex items-center gap-3">
            {availableStock > 0 ? (
              <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium">Available: {availableStock} units</span>
              </div>
            ) : (
              <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg flex items-center gap-2">
                <AlertCircle size={20} />
                <span className="font-bold">OUT OF STOCK</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={submitting || availableStock === 0}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
          >
            {submitting ? 'Processing...' : (editingSale ? 'Update' : 'Process')} Sale
          </button>
          {editingSale && (
            <button onClick={() => setEditingSale(null)} className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Rest of the component remains exactly the same */}
      {/* Sales Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Sales History ({sales.length} entries)
          </h3>
          <p className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </p>
        </div>

        {sales.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-gray-500">No sales found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Color</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedSales.map((sale) => (
                    <tr key={sale._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(sale.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{sale.customerName}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{sale.product?.name}</div>
                        <div className="text-xs text-gray-500 uppercase">{sale.product?.type}</div>
                      </td>
                      <td className="px-6 py-4">
                        {sale.color ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: sale.color.hexCode }}></div>
                            <span className="text-sm">{sale.color.name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm italic">No Color</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-800">{sale.quantity}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">Rs. {sale.unitPrice.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{sale.discount}%</td>
                      <td className="px-6 py-4 text-sm font-bold text-green-600">Rs. {sale.totalAmount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => openWhatsappModal(sale)} 
                            className="text-green-600 hover:text-green-800 p-2 rounded hover:bg-green-50"
                            title="Send WhatsApp Invoice"
                          >
                            <MessageCircle size={18} />
                          </button>
                          <button onClick={() => editSale(sale)} className="text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50">
                            <Edit size={18} />
                          </button>
                          <button onClick={() => deleteSale(sale._id)} className="text-red-600 hover:text-red-800 p-2 rounded hover:bg-red-50">
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
              <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, sales.length)} of {sales.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-5 py-2 bg-white border rounded-lg hover:bg-gray-100 disabled:opacity-50 flex items-center gap-2"
                  >
                    Previous
                  </button>

                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`w-10 h-10 rounded-lg font-medium ${
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
                    className="px-5 py-2 bg-white border rounded-lg hover:bg-gray-100 disabled:opacity-50 flex items-center gap-2"
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

export default Sales;