// components/Inventory.jsx - WITH SEARCH & PAGINATION
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, AlertTriangle, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { inventoryAPI } from './../../services/api';

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  // Get current page and search term from URL
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const searchTerm = searchParams.get('search') || '';
  const itemsPerPage = 10;

  useEffect(() => {
    fetchInventory();
  }, []);

  useEffect(() => {
    // Filter inventory whenever search term changes
    if (searchTerm) {
      const filtered = inventory.filter(item => 
        item.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product?.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.color?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.color?.codeName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredInventory(filtered);
    } else {
      setFilteredInventory(inventory);
    }
  }, [searchTerm, inventory]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await inventoryAPI.getAll();
      setInventory(response.data.data || []);
      setFilteredInventory(response.data.data || []);
    } catch (error) {
      setError('Failed to fetch inventory');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (quantity, minStockLevel) => {
    if (quantity === 0) return { status: 'Out of Stock', color: 'bg-red-100 text-red-800', icon: TrendingDown };
    if (quantity <= minStockLevel) return { status: 'Low Stock', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle };
    return { status: 'In Stock', color: 'bg-green-100 text-green-800', icon: TrendingUp };
  };

  const handleSearch = (term) => {
    const params = {};
    if (term) params.search = term;
    if (currentPage > 1) params.page = '1'; // Reset to page 1 when searching
    setSearchParams(params);
  };

  const clearSearch = () => {
    const params = {};
    if (currentPage > 1) params.page = currentPage.toString();
    setSearchParams(params);
  };

  const totalItems = filteredInventory.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = filteredInventory.reduce((sum, item) => sum + (item.quantity * (item.product?.purchasePrice || 0)), 0);
  const lowStockCount = filteredInventory.filter(i => i.quantity > 0 && i.quantity <= i.minStockLevel).length;
  const outOfStockCount = filteredInventory.filter(i => i.quantity === 0).length;

  // Pagination logic for filtered results
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInventory = filteredInventory.slice(startIndex, endIndex);

  const goToPage = (page) => {
    const params = {};
    if (searchTerm) params.search = searchTerm;
    if (page > 1) params.page = page.toString();
    setSearchParams(params);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-200 rounded-lg"></div>
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Current Stock</h1>
        <p className="text-gray-600">Real-time inventory by product and color</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={20} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search products, types, colors..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </div>
        {searchTerm && (
          <p className="mt-2 text-sm text-gray-600">
            Found {filteredInventory.length} results for "{searchTerm}"
          </p>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{totalItems}</p>
            </div>
            <Package size={36} className="text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Stock</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {filteredInventory.filter(i => i.quantity > i.minStockLevel).length}
              </p>
            </div>
            <TrendingUp size={36} className="text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{lowStockCount}</p>
            </div>
            <AlertTriangle size={36} className="text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{outOfStockCount}</p>
            </div>
            <TrendingDown size={36} className="text-red-500" />
          </div>
        </div>
      </div>

      {/* Total Value */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Total Inventory Value</h2>
            <p className="text-2xl font-bold text-purple-600 mt-1">Rs. {totalValue.toLocaleString()}</p>
          </div>
          <p className="text-sm text-gray-500">Based on purchase price</p>
        </div>
      </div>

      {/* Stock List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Stock by Product & Color ({filteredInventory.length} entries)
            {searchTerm && <span className="text-blue-600 ml-2">(Filtered)</span>}
          </h3>
          <p className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </p>
        </div>

        {filteredInventory.length === 0 ? (
          <div className="text-center py-16">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-lg text-gray-500">
              {searchTerm ? 'No matching products found' : 'No stock available'}
            </p>
            <p className="text-gray-400 mt-2">
              {searchTerm ? 'Try a different search term' : 'Start making purchases to track inventory'}
            </p>
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">In Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Level</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedInventory.map((item) => {
                    const status = getStockStatus(item.quantity, item.minStockLevel);
                    const value = item.quantity * (item.product?.purchasePrice || 0);
                    const Icon = status.icon;

                    return (
                      <tr key={item._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{item.product?.name || '—'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 uppercase">
                            {item.product?.type || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {item.color ? (
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full border-2 border-white shadow" style={{ backgroundColor: item.color.hexCode }}></div>
                              <div>
                                <div className="font-medium text-gray-800">{item.color.codeName}</div>
                                <div className="text-xs text-gray-500">{item.color.name}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-sm">No Color</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xl font-bold text-gray-800">{item.quantity}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{item.minStockLevel}</td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            <Icon size={14} />
                            {status.status}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-purple-600">Rs. {value.toLocaleString()}</div>
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
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredInventory.length)} of {filteredInventory.length} entries
                  {searchTerm && <span className="text-blue-600"> (Filtered)</span>}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>

                  {/* Page Numbers */}
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
                    className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    Next <ChevronRight size={16} />
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

export default Inventory;