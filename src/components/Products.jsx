// components/Products.jsx - FINAL 100% WORKING WITH MULTI COLOR SELECT + SEARCH
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Search, Upload, Download, FileText, ChevronLeft, ChevronRight, Palette, X, Edit, Check } from 'lucide-react';
import { productsAPI, colorsAPI } from './../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [colors, setColors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [csvUploading, setCsvUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProductColors, setSelectedProductColors] = useState(null);
  const [colorSearch, setColorSearch] = useState('');

  const itemsPerPage = 10;

  const [newProduct, setNewProduct] = useState({
    name: '',
    type: 'gallon',
    purchasePrice: '',
    salePrice: '',
    discount: '0',
    colors: []
  });

  const productTypes = [
    { value: 'gallon', label: 'Gallon' },
    { value: 'dibbi', label: 'Dibbi' },
    { value: 'quarter', label: 'Quarter' },
    { value: 'p', label: 'P' }
  ];

  useEffect(() => {
    fetchProducts();
    fetchColors();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getAll();
      setProducts(response.data.data || []);
    } catch (error) {
      setError('Failed to fetch products');
    } finally {
      setLoading(false);
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

  // Toggle color selection
  const handleColorToggle = (colorId) => {
    const currentColors = editingProduct ? editingProduct.colors : newProduct.colors;
    const updatedColors = currentColors.includes(colorId)
      ? currentColors.filter(id => id !== colorId)
      : [...currentColors, colorId];

    if (editingProduct) {
      setEditingProduct({ ...editingProduct, colors: updatedColors });
    } else {
      setNewProduct({ ...newProduct, colors: updatedColors });
    }
  };

  const addProduct = async () => {
    if (!newProduct.name || !newProduct.purchasePrice || !newProduct.salePrice || newProduct.colors.length === 0) {
      setError('Please fill all required fields');
      return;
    }
    try {
      setSubmitting(true);
      await productsAPI.create({
        ...newProduct,
        purchasePrice: parseFloat(newProduct.purchasePrice),
        salePrice: parseFloat(newProduct.salePrice),
        discount: parseFloat(newProduct.discount) || 0,
      });
      resetForm();
      setSuccess('Product added successfully!');
      setTimeout(() => setSuccess(''), 3000);
      fetchProducts();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to add product');
    } finally {
      setSubmitting(false);
    }
  };

  const updateProduct = async () => {
    if (!editingProduct.name || !editingProduct.purchasePrice || !editingProduct.salePrice || editingProduct.colors.length === 0) {
      setError('Please fill all required fields');
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
        colors: editingProduct.colors
      });
      setEditingProduct(null);
      setSuccess('Product updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
      fetchProducts();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update product');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await productsAPI.delete(id);
      setSuccess('Product deleted!');
      setTimeout(() => setSuccess(''), 3000);
      fetchProducts();
    } catch (error) {
      setError('Failed to delete');
    }
  };

  const startEditing = (product) => {
    setEditingProduct({
      ...product,
      purchasePrice: product.purchasePrice.toString(),
      salePrice: product.salePrice.toString(),
      discount: product.discount.toString(),
      colors: product.colors.map(c => c._id)
    });
    setShowForm(true);
    setColorSearch('');
  };

  const resetForm = () => {
    setNewProduct({ name: '', type: 'gallon', purchasePrice: '', salePrice: '', discount: '0', colors: [] });
    setEditingProduct(null);
    setShowForm(false);
    setColorSearch('');
  };

  const handleCsvUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || (!file.name.endsWith('.csv') && file.type !== 'text/csv')) {
      setError('Please upload a CSV file');
      return;
    }
    try {
      setCsvUploading(true);
      const formData = new FormData();
      formData.append('csvFile', file);
      const res = await productsAPI.uploadCSV(formData);
      setSuccess(`Imported ${res.data.summary.imported} products!`);
      setShowUploadModal(false);
      fetchProducts();
    } catch (error) {
      setError(error.response?.data?.message || 'Upload failed');
    } finally {
      setCsvUploading(false);
      e.target.value = '';
    }
  };

  const downloadTemplate = () => {
    const csv = "name,type,purchasePrice,salePrice,discount,colors\nNippon Enamel,gallon,2500,3200,5,White,Black,Red\nBerger Silk,dibbi,900,1200,0,Blue,Green";
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Type', 'Purchase', 'Sale', 'Discount (%)', 'Profit', 'Colors'];
    const rows = filteredProducts.map(p => [
      p.name,
      p.type.toUpperCase(),
      p.purchasePrice,
      p.salePrice,
      p.discount,
      (p.salePrice * (1 - p.discount / 100) - p.purchasePrice).toFixed(2),
      p.colors?.map(c => `${c.name} (${c.codeName})`).join(' | ') || ''
    ]);
    let csv = headers.join(',') + '\n' + rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(20);
    doc.text('ALWAQAS PAINT SHOP - Products Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

    const tableData = filteredProducts.map(p => [
      p.name,
      p.type.toUpperCase(),
      `Rs. ${p.purchasePrice}`,
      `Rs. ${p.salePrice}`,
      `${p.discount}%`,
      `Rs. ${(p.salePrice * (1 - p.discount / 100) - p.purchasePrice).toFixed(2)}`,
      p.colors?.map(c => c.name).join(', ') || '—'
    ]);

    autoTable(doc, {
      head: [['Product', 'Type', 'Purchase', 'Sale', 'Discount', 'Profit', 'Colors']],
      body: tableData,
      startY: 40,
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: { 6: { cellWidth: 60 } }
    });

    doc.save(`products_report_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.colors?.some(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const calculateProfit = (p, s, d = 0) => (s * (1 - d / 100) - p).toFixed(2);

  // Filter colors with search
  const filteredColorsForSelection = colors.filter(color =>
    color.name.toLowerCase().includes(colorSearch.toLowerCase()) ||
    color.codeName.toLowerCase().includes(colorSearch.toLowerCase())
  );

  const selectedColors = editingProduct ? editingProduct.colors : newProduct.colors;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
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
        <h1 className="text-3xl font-bold text-gray-800">Products Management</h1>
        <div className="flex gap-3">
          <button onClick={exportToCSV} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-lg flex items-center gap-2">
            <Download size={18} /> CSV
          </button>
          <button onClick={exportToPDF} className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-lg flex items-center gap-2">
            <FileText size={18} /> PDF
          </button>
          <button onClick={() => setShowUploadModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-lg flex items-center gap-2">
            <Upload size={18} /> Upload CSV
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2">
            <Plus size={22} /> Add Product
          </button>
        </div>
      </div>

      {success && <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>}
      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}

      {/* Search */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, type, or color..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
              <input type="text" value={editingProduct ? editingProduct.name : newProduct.name} onChange={e => editingProduct ? setEditingProduct({ ...editingProduct, name: e.target.value }) : setNewProduct({ ...newProduct, name: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., Nippon Q Enamel" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
              <select value={editingProduct ? editingProduct.type : newProduct.type} onChange={e => editingProduct ? setEditingProduct({ ...editingProduct, type: e.target.value }) : setNewProduct({ ...newProduct, type: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                {productTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-3">Colors *</label>
              {/* Color Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search colors..."
                    value={colorSearch}
                    onChange={e => setColorSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-3 max-h-64 overflow-y-auto p-4 bg-gray-50 rounded-lg border">
                {filteredColorsForSelection.map(color => {
                  const isSelected = selectedColors.includes(color._id);
                  return (
                    <div
                      key={color._id}
                      onClick={() => handleColorToggle(color._id)}
                      className={`relative flex flex-col items-center p-3 bg-white rounded-lg shadow cursor-pointer transition-all transform hover:scale-105 ${
                        isSelected ? 'ring-4 ring-blue-500 shadow-xl' : 'hover:shadow-md'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1">
                          <Check size={16} />
                        </div>
                      )}
                      <div className="w-12 h-12 rounded-full border-4 border-white shadow-lg mb-2" style={{ backgroundColor: color.hexCode }}></div>
                      <span className="text-xs font-bold text-gray-700">{color.codeName}</span>
                      <span className="text-xs text-gray-500">{color.name}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-sm font-medium text-gray-700">
                Selected: <span className="text-blue-600 font-bold">{selectedColors.length}</span> colors
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Price *</label>
              <input type="number" value={editingProduct ? editingProduct.purchasePrice : newProduct.purchasePrice} onChange={e => editingProduct ? setEditingProduct({ ...editingProduct, purchasePrice: e.target.value }) : setNewProduct({ ...newProduct, purchasePrice: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="2500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sale Price *</label>
              <input type="number" value={editingProduct ? editingProduct.salePrice : newProduct.salePrice} onChange={e => editingProduct ? setEditingProduct({ ...editingProduct, salePrice: e.target.value }) : setNewProduct({ ...newProduct, salePrice: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="3200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Discount (%)</label>
              <input type="number" min="0" max="100" value={editingProduct ? editingProduct.discount : newProduct.discount} onChange={e => editingProduct ? setEditingProduct({ ...editingProduct, discount: e.target.value }) : setNewProduct({ ...newProduct, discount: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button onClick={editingProduct ? updateProduct : addProduct} disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium">
              {submitting ? 'Saving...' : (editingProduct ? 'Update Product' : 'Add Product')}
            </button>
            <button onClick={resetForm} className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold text-gray-900">All Products ({filteredProducts.length})</h3>
        </div>

        {paginatedProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <Search size={48} className="mx-auto" />
            </div>
            <p className="text-gray-500 text-lg">No products found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Colors</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sale</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedProducts.map(product => (
                    <tr key={product._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {product.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedProductColors(product)}
                          className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        >
                          <Palette size={16} />
                          {product.colors?.length || 0} Colors
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Rs. {product.purchasePrice}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Rs. {product.salePrice}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.discount}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        Rs. {calculateProfit(product.purchasePrice, product.salePrice, product.discount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-3">
                          <button onClick={() => startEditing(product)} className="text-indigo-600 hover:text-indigo-900">
                            <Edit size={18} />
                          </button>
                          <button onClick={() => deleteProduct(product._id)} className="text-red-600 hover:text-red-900">
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
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} products
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Colors Modal */}
      {selectedProductColors && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                {selectedProductColors.name} - All Colors ({selectedProductColors.colors?.length || 0})
              </h2>
              <button onClick={() => setSelectedProductColors(null)} className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100">
                <X size={28} />
              </button>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {selectedProductColors.colors?.map(color => (
                  <div key={color._id} className="flex flex-col items-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-lg hover:shadow-2xl transition transform hover:scale-105">
                    <div className="w-24 h-24 rounded-full border-8 border-white shadow-2xl mb-4" style={{ backgroundColor: color.hexCode }}></div>
                    <div className="text-center">
                      <div className="font-bold text-lg text-gray-800">{color.codeName}</div>
                      <div className="text-sm text-gray-600 mt-1">{color.name}</div>
                      <div className="text-xs font-mono text-gray-500 mt-2 bg-white px-3 py-1 rounded-full">{color.hexCode}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
            <h3 className="text-2xl font-bold mb-6">Upload Products CSV</h3>
            <div className="border-4 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-500 transition">
              <FileText size={64} className="mx-auto text-gray-400 mb-4" />
              <p className="text-lg text-gray-600 mb-4">Drop your CSV file here or click to browse</p>
              <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" id="csv-input" />
              <label htmlFor="csv-input" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl cursor-pointer text-lg font-bold inline-block">
                {csvUploading ? 'Uploading...' : 'Choose File'}
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-4">
              <button onClick={downloadTemplate} className="text-blue-600 hover:text-blue-800 font-bold">
                Download Template
              </button>
              <button onClick={() => setShowUploadModal(false)} className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;