// components/Inventory.jsx - UPDATED WITH FILTERS + PRINT OPTIONS
import React, { useState, useEffect } from 'react';
import { 
  Package, AlertTriangle, TrendingUp, TrendingDown, Search, 
  ChevronLeft, ChevronRight, Filter, Printer, Download,
  CheckCircle, X
} from 'lucide-react';
import { inventoryAPI } from './../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const itemsPerPage = 20;

  // Filters
  const [stockFilter, setStockFilter] = useState('all'); // 'all', 'low', 'out', 'in'
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [minStockFilter, setMinStockFilter] = useState('');
  
  // Print modal
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printOption, setPrintOption] = useState('all'); // 'all', 'low', 'out', 'in', 'specific'
  const [specificProduct, setSpecificProduct] = useState('');

  useEffect(() => {
    fetchInventory();
  }, []);

  // Real-time refresh from purchases/sales
  useEffect(() => {
    const handleUpdate = () => {
      fetchInventory();
    };
    window.addEventListener('inventoryShouldUpdate', handleUpdate);
    return () => window.removeEventListener('inventoryShouldUpdate', handleUpdate);
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await inventoryAPI.getAll();
      const data = response.data.data || [];

      // SHOW ALL PRODUCTS — EVEN IF QTY = 0
      setInventory(data);
      applyFilters(data, searchTerm, stockFilter, typeFilter, minStockFilter);
    } catch (err) {
      setError('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  // Apply all filters
  const applyFilters = (data, search, stock, type, minStock) => {
    let result = [...data];
    
    // Search filter
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(item =>
        item.product?.name?.toLowerCase().includes(term) ||
        item.product?.type?.toLowerCase().includes(term) ||
        item.product?.code?.toLowerCase().includes(term) ||
        item.color?.codeName?.toLowerCase().includes(term) ||
        item.color?.name?.toLowerCase().includes(term)
      );
    }
    
    // Stock filter
    if (stock === 'low') {
      result = result.filter(item => item.quantity > 0 && item.quantity <= (item.minStockLevel || 5));
    } else if (stock === 'out') {
      result = result.filter(item => item.quantity === 0);
    } else if (stock === 'in') {
      result = result.filter(item => item.quantity > (item.minStockLevel || 5));
    }
    
    // Type filter
    if (type !== 'all') {
      result = result.filter(item => item.product?.type?.toLowerCase() === type.toLowerCase());
    }
    
    // Min stock filter
    if (minStock) {
      const min = parseInt(minStock);
      if (!isNaN(min)) {
        result = result.filter(item => item.quantity <= min);
      }
    }
    
    setFiltered(result);
    setCurrentPage(1);
  };

  // Handle search
  useEffect(() => {
    applyFilters(inventory, searchTerm, stockFilter, typeFilter, minStockFilter);
  }, [searchTerm, stockFilter, typeFilter, minStockFilter, inventory]);

  const getStockStatus = (qty, min = 5) => {
    if (qty === 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-800', icon: TrendingDown };
    if (qty <= min) return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle };
    return { label: 'In Stock', color: 'bg-green-100 text-green-800', icon: TrendingUp };
  };

  // PAGINATION
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Get unique product types
  const productTypes = ['all', ...new Set(
    inventory
      .map(item => item.product?.type)
      .filter(Boolean)
      .map(type => type.toLowerCase())
  )];

  // Stats
  const totalItems = filtered.reduce((sum, i) => sum + i.quantity, 0);
  const totalValue = filtered.reduce((sum, i) => sum + (i.quantity * (i.product?.purchasePrice || 0)), 0);
  const lowStock = filtered.filter(i => i.quantity > 0 && i.quantity <= (i.minStockLevel || 5)).length;
  const outOfStock = filtered.filter(i => i.quantity === 0).length;
  const inStock = filtered.filter(i => i.quantity > (i.minStockLevel || 5)).length;

  // PRINT FUNCTIONS
// PRINT FUNCTIONS WITH ALL TYPES IN ONE LINE
const printInventory = (option = 'all', productId = '') => {
  let dataToPrint = [...filtered];
  let title = 'COMPLETE INVENTORY REPORT';
  
  if (option === 'low') {
    dataToPrint = filtered.filter(item => item.quantity > 0 && item.quantity <= (item.minStockLevel || 5));
    title = 'LOW STOCK INVENTORY REPORT (≤ 5 items)';
  } else if (option === 'out') {
    dataToPrint = filtered.filter(item => item.quantity === 0);
    title = 'OUT OF STOCK INVENTORY REPORT';
  } else if (option === 'in') {
    dataToPrint = filtered.filter(item => item.quantity > (item.minStockLevel || 5));
    title = 'IN STOCK INVENTORY REPORT';
  } else if (option === 'specific' && productId) {
    dataToPrint = filtered.filter(item => item.product?._id === productId);
    const productName = dataToPrint[0]?.product?.name || 'Product';
    title = `${productName.toUpperCase()} - STOCK REPORT`;
  }

  if (dataToPrint.length === 0) {
    setError(`No items found for ${option} stock report`);
    setShowPrintModal(false);
    return;
  }

  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Function to add header
  const addHeader = (isFirstPage = true, pageNumber = 1) => {
    if (isFirstPage) {
      // Main header only on first page
      doc.setFontSize(22);
      doc.text('AL WAQAS PAINT AND HARDWARE SHOP', pageWidth / 2, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.text('www.alwaqaspaint.com', pageWidth / 2, 28, { align: 'center' });
      doc.setFontSize(16);
      doc.text(title, pageWidth / 2, 40, { align: 'center' });
      
      // Report details
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 50);
      doc.text(`Total Items: ${dataToPrint.length}`, 14, 56);
      
      if (option === 'low') {
        doc.text(`Filter: Stock ≤ 5 items`, 14, 62);
      } else if (option === 'out') {
        doc.text(`Filter: Out of Stock`, 14, 62);
      } else if (option === 'in') {
        doc.text(`Filter: In Stock`, 14, 62);
      }
      
      return 66; // Start Y position for table
    } else {
      // Continuation pages header
      doc.setFontSize(16);
      doc.text(`${title} (Contd.)`, pageWidth / 2, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Page ${pageNumber}`, pageWidth / 2, 28, { align: 'center' });
      
      return 32; // Start Y position for table on continuation pages
    }
  };

  // Function to add footer
  const addFooter = (pageNumber) => {
    doc.setFontSize(9);
    doc.text(
      `Page ${pageNumber}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  };

  // Sort data by product name so same names appear together
  const sortedData = [...dataToPrint].sort((a, b) => {
    const nameA = a.product?.name || '';
    const nameB = b.product?.name || '';
    return nameA.localeCompare(nameB);
  });

  // Prepare table data - Each product entry separately
  const tableData = [];
  let totalQuantity = 0;
  let totalValue = 0;
  
  sortedData.forEach((item, index) => {
    const productName = item.product?.name || 'Unknown';
    const productCode = item.product?.code || '';
    const productType = item.product?.type?.toUpperCase() || 'OTHER';
    const quantity = item.quantity;
    const value = item.quantity * (item.product?.purchasePrice || 0);
    const status = getStockStatus(item.quantity, item.minStockLevel || 5).label;
    
    totalQuantity += quantity;
    totalValue += value;
    
    tableData.push([
      productName,
      productCode || '—',
      productType,
      quantity,
      status,
      `Rs. ${Math.round(value).toLocaleString()}`
    ]);
  });

  // Calculate how many pages we'll need
  const rowsPerPage = 30; // Adjust based on your font size
  const totalPages = Math.ceil(tableData.length / rowsPerPage);
  
  // Create a separate PDF for each page
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    if (pageNum > 1) {
      doc.addPage('l'); // Add new page for landscape
    }
    
    const isFirstPage = pageNum === 1;
    const startY = addHeader(isFirstPage, pageNum);
    
    // Get data for this page
    const startIndex = (pageNum - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, tableData.length);
    const pageData = tableData.slice(startIndex, endIndex);
    
    // Add table for this page
    autoTable(doc, {
      head: [['Product Name', 'Code', 'Type', 'Quantity', 'Status', 'Value']],
      body: pageData,
      startY: startY,
      margin: { left: 14, right: 14 },
      styles: { 
        fontSize: 9, 
        cellPadding: 2.5,
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      headStyles: { 
        fillColor: [41, 128, 185], 
        textColor: 255,
        fontSize: 10,
        cellPadding: 3,
        fontStyle: 'bold'
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { cellWidth: 70 }, // Product Name
        1: { cellWidth: 25, halign: 'center' }, // Code
        2: { cellWidth: 25, halign: 'center' }, // Type
        3: { cellWidth: 25, halign: 'center' }, // Quantity
        4: { cellWidth: 30, halign: 'center' }, // Status
        5: { cellWidth: 35, halign: 'right' }  // Value
      }
    });
    
    // Add footer
    addFooter(pageNum);
    
    // Add summary only on last page
    if (pageNum === totalPages) {
      const finalY = doc.lastAutoTable.finalY || startY + 50;
      const uniqueProducts = [...new Set(sortedData.map(item => item.product?.name))].length;
      
      // Footer with summary
      doc.setFontSize(11);
      doc.text(`Summary:`, 14, finalY + 15);
      doc.text(`• Total Products/Variants: ${sortedData.length}`, 14, finalY + 22);
      doc.text(`• Unique Product Names: ${uniqueProducts}`, 14, finalY + 29);
      doc.text(`• Total Quantity: ${totalQuantity}`, 14, finalY + 36);
      doc.text(`• Total Inventory Value: Rs. ${Math.round(totalValue).toLocaleString()}`, 14, finalY + 43);
    }
  }

  // Save PDF
  const filename = `inventory_${option}_${new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(filename);
  
  setShowPrintModal(false);
  setSuccess(`${sortedData.length} product entries printed successfully!`);
  setTimeout(() => setSuccess(''), 3000);
};
  const handlePrint = () => {
    if (printOption === 'specific' && !specificProduct) {
      setError('Please select a product for specific product report');
      return;
    }
    printInventory(printOption, specificProduct);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStockFilter('all');
    setTypeFilter('all');
    setMinStockFilter('');
    setShowFilters(false);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Current Stock</h1>
          <p className="text-gray-600">Real-time inventory — All products shown (including zero stock)</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowPrintModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2"
          >
            <Printer size={18} />
            Print Reports
          </button>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg flex items-center gap-2"
          >
            <Filter size={18} />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
          <CheckCircle size={20} /> {success}
        </div>
      )}
      {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}

      {/* Filters Section */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Filter size={20} />
            Filter Inventory
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Stock Filter */}
            <div>
              <label className="block font-medium mb-2">Stock Status</label>
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg"
              >
                <option value="all">All Stock Status</option>
                <option value="in">In Stock Only</option>
                <option value="low">Low Stock (≤ 5)</option>
                <option value="out">Out of Stock</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block font-medium mb-2">Product Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg"
              >
                <option value="all">All Types</option>
                {productTypes.filter(t => t !== 'all').map(type => (
                  <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Min Stock Filter */}
            <div>
              <label className="block font-medium mb-2">Stock ≤ (Quantity)</label>
              <input
                type="number"
                min="0"
                placeholder="e.g., 5"
                value={minStockFilter}
                onChange={(e) => setMinStockFilter(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Show items with stock less than or equal to</p>
            </div>

            {/* Reset Button */}
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
              >
                Reset All Filters
              </button>
            </div>
          </div>

          {/* Active Filters Display */}
          {(stockFilter !== 'all' || typeFilter !== 'all' || minStockFilter) && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Active Filters:</h4>
              <div className="flex flex-wrap gap-2">
                {stockFilter !== 'all' && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    Stock: {stockFilter === 'low' ? 'Low Stock (≤5)' : 
                           stockFilter === 'out' ? 'Out of Stock' : 'In Stock'}
                  </span>
                )}
                {typeFilter !== 'all' && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    Type: {typeFilter}
                  </span>
                )}
                {minStockFilter && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    Stock ≤ {minStockFilter}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by product, code, type, or color..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Total Items in Stock</p>
              <p className="text-3xl font-bold text-gray-800">{totalItems.toLocaleString()}</p>
            </div>
            <Package size={40} className="text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">In Stock</p>
              <p className="text-3xl font-bold text-gray-800">{inStock}</p>
            </div>
            <TrendingUp size={40} className="text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Low Stock (≤5)</p>
              <p className="text-3xl font-bold text-gray-800">{lowStock}</p>
            </div>
            <AlertTriangle size={40} className="text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Out of Stock</p>
              <p className="text-3xl font-bold text-gray-800">{outOfStock}</p>
            </div>
            <TrendingDown size={40} className="text-red-500" />
          </div>
        </div>
      </div>

      {/* Total Value */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg shadow-lg p-8 mb-8">
        <h2 className="text-2xl font-bold">Total Inventory Value</h2>
        <p className="text-5xl font-bold mt-2">Rs. {totalValue.toLocaleString()}</p>
        <p className="text-sm opacity-90 mt-2">
          {filtered.length} products • {stockFilter !== 'all' ? 'Filtered View' : 'Complete Inventory'}
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-800">
              Stock List ({filtered.length} entries)
            </h3>
            {stockFilter === 'low' && (
              <p className="text-sm text-gray-600 mt-1">Showing items with stock ≤ 5</p>
            )}
          </div>
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Package size={64} className="mx-auto mb-4 text-gray-300" />
            <p className="text-xl">No products match your filters</p>
            <button
              onClick={resetFilters}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Product</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Product Code</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Color</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Stock</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Min</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentItems.map(item => {
                    const status = getStockStatus(item.quantity, item.minStockLevel);
                    const value = item.quantity * (item.product?.purchasePrice || 0);
                    const Icon = status.icon;

                    return (
                      <tr key={item._id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{item.product?.name || '—'}</div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-mono text-sm bg-gray-100 px-3 py-1 rounded">
                            {item.product?.code || '—'}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          {item.color ? (
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-8 h-8 rounded-full border-2 border-white shadow"
                                style={{ backgroundColor: item.color.hexCode || '#ccc' }}
                              ></div>
                              <div>
                                <div className="font-bold text-gray-800">{item.color.codeName}</div>
                                <div className="text-xs text-gray-600">{item.color.name}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-sm">No Color</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs uppercase">
                            {item.product?.type || '—'}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className={`text-2xl font-bold ${item.quantity === 0 ? 'text-red-600' : 
                            item.quantity <= (item.minStockLevel || 5) ? 'text-yellow-600' : 'text-gray-800'}`}>
                            {item.quantity}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-gray-600">{item.minStockLevel || 5}</td>

                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${status.color}`}>
                            <Icon size={18} />
                            {status.label}
                          </div>
                        </td>

                        <td className="px-6 py-4 font-bold text-purple-600">
                          Rs. {value.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filtered.length)} of {filtered.length} products
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-100 disabled:opacity-50 flex items-center gap-2"
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <span className="px-4 py-2 font-medium">
                    Page {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-100 disabled:opacity-50 flex items-center gap-2"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Print Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Printer size={24} />
                Print Inventory Reports
              </h3>
              <button
                onClick={() => setShowPrintModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block font-medium mb-2">Select Report Type</label>
                <select
                  value={printOption}
                  onChange={(e) => {
                    setPrintOption(e.target.value);
                    if (e.target.value !== 'specific') setSpecificProduct('');
                  }}
                  className="w-full px-4 py-3 border rounded-lg"
                >
                  <option value="all">Complete Inventory (All Items)</option>
                  <option value="in">In Stock Items Only</option>
                  <option value="low">Low Stock Items (≤ 5)</option>
                  <option value="out">Out of Stock Items</option>
                  <option value="specific">Specific Product Report</option>
                </select>
              </div>

              {printOption === 'specific' && (
                <div>
                  <label className="block font-medium mb-2">Select Product</label>
                  <select
                    value={specificProduct}
                    onChange={(e) => setSpecificProduct(e.target.value)}
                    className="w-full px-4 py-3 border rounded-lg"
                  >
                    <option value="">Select a product</option>
                    {inventory.map(item => (
                      <option key={item._id} value={item.product?._id}>
                        {item.product?.name} ({item.product?.code || 'No Code'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-bold text-blue-800 mb-2">Report Details:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  {printOption === 'all' && (
                    <li>• Complete inventory report with all products</li>
                  )}
                  {printOption === 'in' && (
                    <li>• Only items with stock above minimum level</li>
                  )}
                  {printOption === 'low' && (
                    <li>• Items with stock ≤ 5 (Low stock items)</li>
                  )}
                  {printOption === 'out' && (
                    <li>• Items with zero stock</li>
                  )}
                  {printOption === 'specific' && specificProduct && (
                    <li>• Report for specific product only</li>
                  )}
                  <li>• Includes product details, stock levels, and values</li>
                  <li>• PDF format with shop header</li>
                </ul>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePrint}
                  disabled={printOption === 'specific' && !specificProduct}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg flex items-center gap-2"
                >
                  <Download size={18} />
                  Generate PDF Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;