// components/Products.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, Search, Upload, Download, Edit, X, 
  CheckCircle, AlertCircle, Loader2, ChevronLeft, ChevronRight, 
  FileText, ChevronFirst, ChevronLast, ListFilter, RefreshCw
} from 'lucide-react';
import { productsAPI } from './../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [pageInput, setPageInput] = useState('');

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');

  // Upload Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [uploadMessage, setUploadMessage] = useState('');

  const [newProduct, setNewProduct] = useState({
    name: '', type: 'gallon', purchasePrice: '', salePrice: '', discount: '0', qty: '', code: ''
  });

  const productTypes = [
    { value: 'gallon', label: 'Gallon' },
    { value: 'dibbi', label: 'Dibbi' },
    { value: 'quarter', label: 'Quarter' },
    { value: 'p', label: 'P' },
    { value: 'drum', label: 'Drum' },
    { value: 'other', label: 'Other' }
  ];

  const itemsPerPageOptions = [10, 20, 50, 100];

  const pageInputRef = useRef(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getAll();
      const productsData = response.data.data || [];
      setProducts(productsData);
      setFilteredProducts(productsData);
    } catch (err) {
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...products];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.type.toLowerCase().includes(term) ||
        (p.code && p.code.toLowerCase().includes(term))
      );
    }
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(p => p.type.toLowerCase() === typeFilter.toLowerCase());
    }
    
    if (stockFilter !== 'all') {
      if (stockFilter === 'in') {
        filtered = filtered.filter(p => (p.initialStock || 0) > 10);
      } else if (stockFilter === 'low') {
        filtered = filtered.filter(p => (p.initialStock || 0) > 0 && (p.initialStock || 0) <= 10);
      } else if (stockFilter === 'out') {
        filtered = filtered.filter(p => (p.initialStock || 0) === 0);
      }
    }
    
    setFilteredProducts(filtered);
    setCurrentPage(1);
  }, [searchTerm, typeFilter, stockFilter, products]);

  const addProduct = async () => {
    if (!newProduct.name || !newProduct.purchasePrice || !newProduct.salePrice) {
      setError('Name, Purchase Price, and Sale Price are required');
      return;
    }

    try {
      setSubmitting(true);
      await productsAPI.create({
        ...newProduct,
        purchasePrice: parseFloat(newProduct.purchasePrice),
        salePrice: parseFloat(newProduct.salePrice),
        discount: parseFloat(newProduct.discount) || 0,
        qty: newProduct.qty ? parseInt(newProduct.qty) : 0,
        code: newProduct.code.trim() || undefined
      });

      setSuccess('Product added successfully!');
      setTimeout(() => {
        resetForm();
        setSuccess('');
      }, 1500);
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add product');
    } finally {
      setSubmitting(false);
    }
  };

  const updateProduct = async () => {
    if (!editingProduct.name || !editingProduct.purchasePrice || !editingProduct.salePrice) {
      setError('Name, Purchase Price, and Sale Price are required');
      return;
    }

    try {
      setSubmitting(true);
      await productsAPI.update(editingProduct._id, {
        name: editingProduct.name,
        type: editingProduct.type,
        purchasePrice: parseFloat(editingProduct.purchasePrice),
        salePrice: parseFloat(editingProduct.salePrice),
        discount: parseFloat(editingProduct.discount) || 0,
        code: editingProduct.code?.trim() || null
      });
      setSuccess('Product updated successfully!');
      setTimeout(() => {
        setEditingProduct(null);
        setSuccess('');
      }, 1500);
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Delete this product permanently?')) return;
    try {
      await productsAPI.delete(id);
      setSuccess('Product deleted');
      setTimeout(() => setSuccess(''), 2000);
      fetchProducts();
    } catch (err) {
      setError('Failed to delete');
    }
  };

  const startEditing = (product) => {
    setEditingProduct({
      ...product,
      purchasePrice: product.purchasePrice.toString(),
      salePrice: product.salePrice.toString(),
      discount: product.discount?.toString() || '0',
      code: product.code || ''
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setNewProduct({ name: '', type: 'gallon', purchasePrice: '', salePrice: '', discount: '0', qty: '', code: '' });
    setEditingProduct(null);
    setShowForm(false);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setStockFilter('all');
    setShowFilters(false);
  };

  // FIXED UPLOAD HANDLER
  const handleCsvUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Close modal immediately before upload starts
    setShowUploadModal(false);
    
    // Show loading state in the main upload button
    setUploadStatus('uploading');
    setUploadMessage('Uploading CSV file...');

    const formData = new FormData();
    formData.append('csvFile', file);

    try {
      const response = await productsAPI.uploadCSV(formData);
      const imported = response.data.imported || 0;
      
      setSuccess(`Successfully imported ${imported} products!`);
      fetchProducts();
      
    } catch (err) {
      // Set detailed error message
      let errorMessage = 'Upload failed. Please try again.';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.errors) {
        // Handle validation errors
        const errorMessages = err.response.data.errors
          .map(err => `Row ${err.row}: ${err.error}`)
          .join(', ');
        errorMessage = `Validation errors: ${errorMessages}`;
      } else if (err.message === 'Network Error') {
        errorMessage = 'Network error. Please check your connection.';
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Upload timeout. Please try again with a smaller file.';
      }
      
      setError(errorMessage);
    } finally {
      // Reset upload status
      setUploadStatus('idle');
      setUploadMessage('');
      e.target.value = ''; // Clear file input
    }
  };

  const downloadTemplate = () => {
    const csv = `name,type,purchasePrice,salePrice,discount,qty,code
Nippon Spot-less Q,quarter,19172490,1821400,18,50,NIP-Q
Nippon Spot-less G,gallon,68928950,1821400,18,100,NIP-G
Asian Paints Apex,dibbi,2582633540,3200000,15,,APEX-001`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // PAGINATION CALCULATIONS
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredProducts.length);
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // PAGINATION FUNCTIONS
  const goToPage = (page) => {
    const pageNum = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(pageNum);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToNextPage = () => goToPage(currentPage + 1);
  const goToPrevPage = () => goToPage(currentPage - 1);

  const handlePageInput = (e) => {
    if (e.key === 'Enter') {
      const pageNum = parseInt(pageInput);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        goToPage(pageNum);
        setPageInput('');
      }
    }
  };

  const handlePageInputBlur = () => {
    if (pageInput) {
      const pageNum = parseInt(pageInput);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        goToPage(pageNum);
      }
      setPageInput('');
    }
  };

  // Generate page numbers for display
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
    }
    
    return pageNumbers;
  };

  // DOWNLOAD FILTERED PDF
  const downloadFilteredPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(22);
    doc.text('AL WAQAS PAINT AND HARDWARE SHOP', 148, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('www.alwaqaspaint.com', 148, 28, { align: 'center' });
    
    let title = 'PRODUCT LIST';
    if (searchTerm || typeFilter !== 'all' || stockFilter !== 'all') {
      title = 'PRODUCT LIST (FILTERED)';
    }
    
    doc.setFontSize(16);
    doc.text(title, 148, 40, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()} • Total: ${filteredProducts.length} products`, 14, 50);
    
    if (searchTerm) {
      doc.text(`Search: "${searchTerm}"`, 14, 56);
    }
    if (typeFilter !== 'all') {
      doc.text(`Type: ${typeFilter}`, 14, 62);
    }

    const tableData = filteredProducts.map(p => [
      p.name,
      p.type.toUpperCase(),
      p.code || '—',
      `Rs. ${p.purchasePrice.toLocaleString()}`,
      `Rs. ${p.salePrice.toLocaleString()}`,
      `${p.discount}%`,
      `Rs. ${((p.salePrice * (1 - p.discount/100)) - p.purchasePrice).toLocaleString()}`
    ]);

    autoTable(doc, {
      head: [['Product Name', 'Type', 'Code', 'Purchase', 'Sale', 'Discount', 'Profit']],
      body: tableData,
      startY: 70,
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 250, 255] }
    });

    const filename = searchTerm || typeFilter !== 'all' || stockFilter !== 'all' 
      ? `products_filtered_${new Date().toISOString().slice(0,10)}.pdf`
      : `all_products_${new Date().toISOString().slice(0,10)}.pdf`;
    
    doc.save(filename);
  };

  // DOWNLOAD ALL PDF
  const downloadAllPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(22);
    doc.text('AL WAQAS PAINT AND HARDWARE SHOP', 148, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('www.alwaqaspaint.com', 148, 28, { align: 'center' });
    doc.setFontSize(16);
    doc.text('COMPLETE PRODUCT CATALOG', 148, 40, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()} • Total: ${products.length} products`, 14, 50);

    const tableData = products.map(p => [
      p.name,
      p.type.toUpperCase(),
      p.code || '—',
      `Rs. ${p.purchasePrice.toLocaleString()}`,
      `Rs. ${p.salePrice.toLocaleString()}`,
      `${p.discount}%`,
      `Rs. ${((p.salePrice * (1 - p.discount/100)) - p.purchasePrice).toLocaleString()}`
    ]);

    autoTable(doc, {
      head: [['Product Name', 'Type', 'Code', 'Purchase', 'Sale', 'Discount', 'Profit']],
      body: tableData,
      startY: 60,
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 250, 255] }
    });

    doc.save(`all_products_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Products</h1>
        <div className="flex gap-3 flex-wrap">
          <button onClick={downloadFilteredPDF} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-lg flex items-center gap-2">
            <Download size={18} /> Filtered PDF
          </button>
          <button onClick={downloadAllPDF} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg flex items-center gap-2">
            <Download size={18} /> All Products PDF
          </button>
          <button 
            onClick={() => setShowUploadModal(true)} 
            disabled={uploadStatus === 'uploading'}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-5 py-3 rounded-lg flex items-center gap-2"
          >
            {uploadStatus === 'uploading' ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={18} /> Upload CSV
              </>
            )}
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2">
            <Plus size={22} /> Add Product
          </button>
        </div>
      </div>

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
          <CheckCircle size={20} /> {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, type, or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2"
          >
            <ListFilter size={18} />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          {(searchTerm || typeFilter !== 'all' || stockFilter !== 'all') && (
            <button
              onClick={resetFilters}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-6 p-6 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block font-medium mb-2">Product Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg"
                >
                  <option value="all">All Types</option>
                  {productTypes.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block font-medium mb-2">Items Per Page</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-3 border rounded-lg"
                >
                  {itemsPerPageOptions.map(option => (
                    <option key={option} value={option}>{option} items</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold mb-6">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block font-medium mb-2">Product Name *</label>
              <input 
                value={editingProduct?.name || newProduct.name} 
                onChange={e => editingProduct ? setEditingProduct({...editingProduct, name: e.target.value}) : setNewProduct({...newProduct, name: e.target.value})} 
                className="w-full px-4 py-3 border rounded-lg" 
                placeholder="Nippon Enamel" 
              />
            </div>
            <div>
              <label className="block font-medium mb-2">Type *</label>
              <select 
                value={editingProduct?.type || newProduct.type} 
                onChange={e => editingProduct ? setEditingProduct({...editingProduct, type: e.target.value}) : setNewProduct({...newProduct, type: e.target.value})} 
                className="w-full px-4 py-3 border rounded-lg"
              >
                {productTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-medium mb-2">Code (Optional)</label>
              <input 
                value={editingProduct?.code || newProduct.code} 
                onChange={e => editingProduct ? setEditingProduct({...editingProduct, code: e.target.value}) : setNewProduct({...newProduct, code: e.target.value})} 
                className="w-full px-4 py-3 border rounded-lg" 
                placeholder="NIP-001" 
              />
            </div>
            <div>
              <label className="block font-medium mb-2">Purchase Price *</label>
              <input 
                type="number" 
                value={editingProduct?.purchasePrice || newProduct.purchasePrice} 
                onChange={e => editingProduct ? setEditingProduct({...editingProduct, purchasePrice: e.target.value}) : setNewProduct({...newProduct, purchasePrice: e.target.value})} 
                className="w-full px-4 py-3 border rounded-lg" 
                placeholder="2500" 
              />
            </div>
            <div>
              <label className="block font-medium mb-2">Sale Price *</label>
              <input 
                type="number" 
                value={editingProduct?.salePrice || newProduct.salePrice} 
                onChange={e => editingProduct ? setEditingProduct({...editingProduct, salePrice: e.target.value}) : setNewProduct({...newProduct, salePrice: e.target.value})} 
                className="w-full px-4 py-3 border rounded-lg" 
                placeholder="3200" 
              />
            </div>
            <div>
              <label className="block font-medium mb-2">Discount (%)</label>
              <input 
                type="number" 
                min="0" 
                max="100" 
                value={editingProduct?.discount || newProduct.discount} 
                onChange={e => editingProduct ? setEditingProduct({...editingProduct, discount: e.target.value}) : setNewProduct({...newProduct, discount: e.target.value})} 
                className="w-full px-4 py-3 border rounded-lg" 
                placeholder="0" 
              />
            </div>
            {!editingProduct && (
              <div>
                <label className="block font-medium mb-2">Initial Qty (Optional)</label>
                <input 
                  type="number" 
                  value={newProduct.qty} 
                  onChange={e => setNewProduct({...newProduct, qty: e.target.value})} 
                  className="w-full px-4 py-3 border rounded-lg" 
                  placeholder="50" 
                />
                <p className="text-xs text-gray-500 mt-1">Stock will be added as "Initial Stock"</p>
              </div>
            )}
          </div>
          <div className="mt-8 flex gap-4">
            <button 
              onClick={editingProduct ? updateProduct : addProduct} 
              disabled={submitting} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2"
            >
              {submitting && <Loader2 size={20} className="animate-spin" />}
              {submitting ? 'Saving...' : (editingProduct ? 'Update Product' : 'Add Product')}
            </button>
            <button 
              onClick={resetForm} 
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold">
              {searchTerm ? `Search Results (${filteredProducts.length})` : `All Products (${products.length})`}
            </h3>
            {(searchTerm || typeFilter !== 'all') && (
              <p className="text-sm text-gray-600 mt-1">
                {searchTerm && `Searching: "${searchTerm}"`}
                {searchTerm && typeFilter !== 'all' && ' • '}
                {typeFilter !== 'all' && `Type: ${typeFilter}`}
              </p>
            )}
          </div>
          <div className="text-sm text-gray-600 text-right">
            <div>Page {currentPage} of {totalPages}</div>
            <div>Showing {startIndex + 1}-{endIndex} of {filteredProducts.length} products</div>
          </div>
        </div>

        {currentProducts.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-xl mb-2">No products found</p>
            {(searchTerm || typeFilter !== 'all') && (
              <button
                onClick={resetFilters}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentProducts.map(p => (
                    <tr key={p._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{p.name}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {p.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono">
                        {p.code || '—'}
                      </td>
                      <td className="px-6 py-4">
                        Rs. {p.purchasePrice.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-bold">
                        Rs. {p.salePrice.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">{p.discount}%</td>
                      <td className="px-6 py-4 font-bold text-green-600">
                        Rs. {((p.salePrice * (1 - p.discount/100)) - p.purchasePrice).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => startEditing(p)} 
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => deleteProduct(p._id)} 
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {endIndex} of {filteredProducts.length} products
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Show:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(parseInt(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-3 py-1 border rounded-lg text-sm"
                    >
                      {itemsPerPageOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    <span className="text-sm text-gray-600">per page</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={goToFirstPage}
                      disabled={currentPage === 1}
                      className="p-2 bg-white border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="First page"
                    >
                      <ChevronFirst size={16} />
                    </button>
                    
                    <button
                      onClick={goToPrevPage}
                      disabled={currentPage === 1}
                      className="p-2 bg-white border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <ChevronLeft size={16} />
                      <span className="hidden sm:inline">Prev</span>
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {getPageNumbers().map(page => (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`px-3 py-1 rounded-lg min-w-[40px] ${
                            currentPage === page
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white border text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <input
                        ref={pageInputRef}
                        type="number"
                        min="1"
                        max={totalPages}
                        value={pageInput}
                        onChange={(e) => setPageInput(e.target.value)}
                        onKeyPress={handlePageInput}
                        onBlur={handlePageInputBlur}
                        placeholder="Page"
                        className="w-20 px-3 py-1 border rounded-lg text-center text-sm"
                      />
                      <span className="text-sm text-gray-600">of {totalPages}</span>
                    </div>
                    
                    <button
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className="p-2 bg-white border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight size={16} />
                    </button>
                    
                    <button
                      onClick={goToLastPage}
                      disabled={currentPage === totalPages}
                      className="p-2 bg-white border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Last page"
                    >
                      <ChevronLast size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-center flex-1">Upload Products CSV</h3>
              <button 
                onClick={() => setShowUploadModal(false)} 
                className="text-gray-500 hover:text-gray-700 p-2"
                disabled={uploadStatus === 'uploading'}
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="border-4 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-500 transition cursor-pointer">
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleCsvUpload} 
                  className="hidden" 
                  id="csv-upload" 
                  disabled={uploadStatus === 'uploading'}
                />
                <label htmlFor="csv-upload" className="cursor-pointer block">
                  <FileText size={64} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-xl font-bold text-blue-600">Click to upload CSV</p>
                  <p className="text-sm text-gray-500 mt-2">or drag and drop</p>
                  <p className="text-xs text-gray-400 mt-4">
                    Required columns: name, type, purchasePrice, salePrice, discount, qty, code
                  </p>
                </label>
              </div>
              <div className="flex justify-between">
                <button 
                  onClick={downloadTemplate} 
                  className="text-blue-600 font-bold hover:underline"
                  disabled={uploadStatus === 'uploading'}
                >
                  Download Template
                </button>
                <button 
                  onClick={() => setShowUploadModal(false)} 
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg"
                  disabled={uploadStatus === 'uploading'}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;