// components/Purchases.jsx - WITH HORIZONTAL PRODUCT SEARCH CARDS
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Edit, Download, ChevronLeft, ChevronRight, Calendar, Search, X } from 'lucide-react';
import { purchasesAPI, productsAPI, colorsAPI, contactsAPI } from './../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Purchases = () => {
  const [purchases, setPurchases] = useState([]);
  const [allPurchases, setAllPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [colors, setColors] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [filteredColors, setFilteredColors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);

  // New state for product search
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    supplier: '',
    product: ''
  });

  const [newPurchase, setNewPurchase] = useState({
    date: new Date().toISOString().split('T')[0],
    product: '',
    color: '',
    supplier: '',
    quantity: '',
    unitPrice: ''
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchAllPurchases();
    fetchFilteredPurchases();
  }, [filters, currentPage]);

  const fetchAllPurchases = async () => {
    try {
      const response = await purchasesAPI.getAll({});
      setAllPurchases(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch all purchases for PDF');
    }
  };

  const fetchFilteredPurchases = async () => {
    try {
      setLoading(true);
      const response = await purchasesAPI.getAll(filters);
      setPurchases(response.data.data || []);
    } catch (error) {
      setError('Failed to fetch purchases');
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

  const fetchSuppliers = async () => {
    try {
      console.log('Fetching suppliers...');
      const response = await contactsAPI.getByType('supplier');
      console.log('Suppliers API response:', response);
      console.log('Suppliers data:', response.data);
      
      if (response.data && response.data.data) {
        setSuppliers(response.data.data);
        console.log('Suppliers set:', response.data.data);
      } else if (response.data) {
        setSuppliers(response.data);
      } else {
        console.error('Unexpected response structure:', response);
        setSuppliers([]);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      console.error('Error response:', error.response);
      setSuppliers([]);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchColors();
    fetchSuppliers();
  }, []);

  // AUTO FILL PURCHASE PRICE FROM PRODUCT
  useEffect(() => {
    if (newPurchase.product) {
      const selectedProduct = products.find(p => p._id === newPurchase.product);
      
      if (selectedProduct) {
        setNewPurchase(prev => ({ 
          ...prev, 
          unitPrice: selectedProduct.purchasePrice?.toString() || '',
          color: ''
        }));

        if (selectedProduct.colors && selectedProduct.colors.length > 0) {
          setFilteredColors(selectedProduct.colors);
        } else {
          setFilteredColors([]);
        }
      }
    } else {
      setFilteredColors([]);
      setNewPurchase(prev => ({ ...prev, unitPrice: '', color: '' }));
    }
  }, [newPurchase.product, products]);

  // Filter products based on search term
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    (product.type && product.type.toLowerCase().includes(productSearchTerm.toLowerCase()))
  );

  const handleProductSelect = (productId) => {
    setNewPurchase(prev => ({ ...prev, product: productId }));
    setProductSearchTerm('');
    setIsProductDropdownOpen(false);
  };

  const handleProductSearchChange = (e) => {
    setProductSearchTerm(e.target.value);
    setIsProductDropdownOpen(true);
  };

  const clearProductSearch = () => {
    setProductSearchTerm('');
    setNewPurchase(prev => ({ ...prev, product: '' }));
    setIsProductDropdownOpen(false);
  };

  const handleSubmit = async () => {
    if (!newPurchase.product || !newPurchase.supplier || !newPurchase.quantity || !newPurchase.unitPrice) {
      setError('Please fill all required fields');
      return;
    }

    if (parseInt(newPurchase.quantity) <= 0 || parseFloat(newPurchase.unitPrice) <= 0) {
      setError('Quantity and price must be greater than 0');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const purchaseData = {
        product: newPurchase.product,
        supplier: newPurchase.supplier.trim(),
        quantity: parseInt(newPurchase.quantity),
        unitPrice: parseFloat(newPurchase.unitPrice),
        color: newPurchase.color || null
      };

      if (editingPurchase) {
        await purchasesAPI.update(editingPurchase._id, purchaseData);
        setSuccess('Purchase updated successfully!');
        setEditingPurchase(null);
      } else {
        await purchasesAPI.create(purchaseData);
        setSuccess('Purchase added successfully!');
      }

      resetForm();
      setTimeout(() => setSuccess(''), 3000);
      fetchAllPurchases();
      fetchFilteredPurchases();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save purchase');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewPurchase({
      date: new Date().toISOString().split('T')[0],
      product: '',
      color: '',
      supplier: '',
      quantity: '',
      unitPrice: ''
    });
    setProductSearchTerm('');
    setIsProductDropdownOpen(false);
    setEditingPurchase(null);
  };

  const editPurchase = (purchase) => {
    setEditingPurchase(purchase);
    const selectedProduct = products.find(p => p._id === purchase.product._id);
    setNewPurchase({
      date: new Date(purchase.date).toISOString().split('T')[0],
      product: purchase.product._id,
      color: purchase.color?._id || '',
      supplier: purchase.supplier,
      quantity: purchase.quantity.toString(),
      unitPrice: purchase.unitPrice.toString()
    });
    setProductSearchTerm(selectedProduct ? selectedProduct.name : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deletePurchase = async (id) => {
    if (!window.confirm('Delete this purchase?')) return;
    try {
      await purchasesAPI.delete(id);
      setSuccess('Purchase deleted!');
      setTimeout(() => setSuccess(''), 3000);
      fetchAllPurchases();
      fetchFilteredPurchases();
    } catch (error) {
      setError('Failed to delete');
    }
  };

  const applyFilters = () => {
    setSearchParams({ page: '1' });
  };

  const clearFilters = () => {
    setFilters({ startDate: '', endDate: '', supplier: '', product: '' });
    setSearchParams({});
  };

  // Generate PDF
  const generateAllPurchasesPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFontSize(20);
    doc.text('ALWAQAS PAINT SHOP - All Purchases Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

    const tableData = allPurchases.map(p => [
      new Date(p.date).toLocaleDateString(),
      p.product?.name || '—',
      p.color?.name || 'No Color',
      p.supplier,
      p.quantity,
      `Rs. ${p.unitPrice.toLocaleString()}`,
      `Rs. ${p.totalAmount.toLocaleString()}`
    ]);

    autoTable(doc, {
      head: [['Date', 'Product', 'Color', 'Supplier', 'Qty', 'Price', 'Total']],
      body: tableData,
      startY: 40,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`all_purchases_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  // Pagination
  const totalPages = Math.ceil(purchases.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPurchases = purchases.slice(startIndex, endIndex);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setSearchParams({ page: page.toString() });
    }
  };

  const totalPurchases = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalItems = purchases.reduce((sum, p) => sum + p.quantity, 0);

  if (loading && purchases.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Purchase Management</h1>
          <p className="text-gray-600 mt-1">Track all your purchases</p>
        </div>
        <button
          onClick={generateAllPurchasesPDF}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-3 shadow-lg font-medium"
        >
          <Download size={20} /> Download All PDF
        </button>
      </div>

      {success && <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>}
      {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <p className="text-sm text-gray-600">Total Purchases</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{purchases.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <p className="text-sm text-gray-600">Total Amount</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">Rs. {totalPurchases.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <p className="text-sm text-gray-600">Total Items</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{totalItems}</p>
        </div>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
          <Calendar size={24} />
          Filter by Date Range
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={e => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={e => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end gap-3">
            <button
              onClick={applyFilters}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              Apply Filter
            </button>
            <button
              onClick={clearFilters}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6">{editingPurchase ? 'Edit Purchase' : 'Add New Purchase'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <input 
            type="date" 
            value={newPurchase.date} 
            onChange={e => setNewPurchase({ ...newPurchase, date: e.target.value })} 
            className="px-4 py-3 border rounded-lg" 
          />
          
          {/* Product Search Dropdown */}
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search product..."
                value={productSearchTerm}
                onChange={handleProductSearchChange}
                onFocus={() => setIsProductDropdownOpen(true)}
                className="w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {productSearchTerm && (
                <button
                  onClick={clearProductSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            
            {/* Selected Product Display */}
            {newPurchase.product && !isProductDropdownOpen && (
              <div className="mt-1 p-2 bg-blue-50 rounded border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-800">
                    {products.find(p => p._id === newPurchase.product)?.name}
                  </span>
                  <button
                    onClick={clearProductSearch}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <select 
            value={newPurchase.color} 
            onChange={e => setNewPurchase({ ...newPurchase, color: e.target.value })} 
            className="px-4 py-3 border rounded-lg" 
            disabled={!newPurchase.product}
          >
            <option value="">No Color</option>
            {filteredColors.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          
          <select 
            value={newPurchase.supplier} 
            onChange={e => setNewPurchase({ ...newPurchase, supplier: e.target.value })}
            className="px-4 py-3 border rounded-lg"
          >
            <option value="">Select Supplier</option>
            {suppliers.map(supplier => (
              <option key={supplier._id} value={supplier.name}>
                {supplier.name}
              </option>
            ))}
          </select>
          
          <input 
            type="number" 
            placeholder="Qty" 
            min="1" 
            value={newPurchase.quantity} 
            onChange={e => setNewPurchase({ ...newPurchase, quantity: e.target.value })} 
            className="px-4 py-3 border rounded-lg" 
          />
          
          <input 
            type="number" 
            placeholder="Price" 
            step="0.01" 
            value={newPurchase.unitPrice} 
            onChange={e => setNewPurchase({ ...newPurchase, unitPrice: e.target.value })} 
            className="px-4 py-3 border rounded-lg bg-gray-50 font-medium"
            readOnly={!!newPurchase.product}
          />
        </div>

        {/* Horizontal Product Search Results */}
        {isProductDropdownOpen && filteredProducts.length > 0 && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-gray-700">
                Search Results ({filteredProducts.length} products)
              </h3>
              <button
                onClick={() => setIsProductDropdownOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
              >
                <X size={14} /> Close
              </button>
            </div>
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
                {filteredProducts.map(product => (
                  <button
                    key={product._id}
                    onClick={() => handleProductSelect(product._id)}
                    className="flex-shrink-0 w-64 bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all duration-200 text-left"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-sm truncate">
                          {product.name}
                        </h4>
                        <p className="text-xs text-gray-500 uppercase mt-1">
                          {product.type}
                        </p>
                      </div>
                      <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold ml-2">
                        Rs. {product.purchasePrice?.toLocaleString() || '0'}
                      </div>
                    </div>
                    
                    {product.colors && product.colors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-600 mb-1">Available Colors:</p>
                        <div className="flex gap-1 flex-wrap">
                          {product.colors.slice(0, 3).map(color => (
                            <div
                              key={color._id}
                              className="w-4 h-4 rounded-full border border-gray-300"
                              style={{ backgroundColor: color.hexCode }}
                              title={color.name}
                            />
                          ))}
                          {product.colors.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{product.colors.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-3 pt-2 border-t border-gray-100">
                      <span className="text-xs text-green-600 font-medium">
                        Click to select
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {isProductDropdownOpen && filteredProducts.length === 0 && productSearchTerm && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500 text-center">
              No products found for "<span className="font-medium">{productSearchTerm}</span>"
            </p>
          </div>
        )}

        {newPurchase.quantity && newPurchase.unitPrice && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="font-medium text-blue-800">
              Total: Rs. {(parseInt(newPurchase.quantity) * parseFloat(newPurchase.unitPrice)).toLocaleString()}
            </p>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
          >
            {submitting ? 'Saving...' : (editingPurchase ? 'Update' : 'Add')} Purchase
          </button>
          {editingPurchase && (
            <button onClick={resetForm} className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Purchase History ({purchases.length} entries)
          </h3>
          <p className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </p>
        </div>

        {purchases.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-gray-500">No purchases found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Color</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedPurchases.map((purchase) => (
                    <tr key={purchase._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(purchase.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{purchase.product?.name}</div>
                        <div className="text-xs text-gray-500 uppercase">{purchase.product?.type}</div>
                      </td>
                      <td className="px-6 py-4">
                        {purchase.color ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: purchase.color.hexCode }}></div>
                            <span className="text-sm">{purchase.color.name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm italic">No Color</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{purchase.supplier}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-800">{purchase.quantity}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">Rs. {purchase.unitPrice.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm font-bold text-green-600">Rs. {purchase.totalAmount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => editPurchase(purchase)} className="text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50">
                            <Edit size={18} />
                          </button>
                          <button onClick={() => deletePurchase(purchase._id)} className="text-red-600 hover:text-red-800 p-2 rounded hover:bg-red-50">
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
                  Showing {startIndex + 1} to {Math.min(endIndex, purchases.length)} of {purchases.length}
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

export default Purchases;