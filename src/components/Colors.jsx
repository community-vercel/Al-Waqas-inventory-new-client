// components/Colors.jsx - WITH REAL-TIME HEX CODE DETECTION
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Upload, Download, FileText, ChevronLeft, ChevronRight, X, Search, AlertCircle, CheckCircle } from 'lucide-react';
import { colorsAPI } from './../../services/api';

const Colors = () => {
  const [colors, setColors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newColor, setNewColor] = useState({ name: '', codeName: '', hexCode: '' });
  const [submitting, setSubmitting] = useState(false);
  const [editingColor, setEditingColor] = useState(null);
  const [hexInput, setHexInput] = useState('');
  const [csvUploading, setCsvUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [hexStatus, setHexStatus] = useState(''); // 'valid', 'duplicate', 'invalid'
  const [existingColor, setExistingColor] = useState(null);
  const itemsPerPage = 12;

  useEffect(() => {
    fetchColors();
  }, []);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Check for duplicate hex code in real-time
  useEffect(() => {
    if (newColor.hexCode && validateHexCode(newColor.hexCode)) {
      const duplicate = colors.find(color => 
        color.hexCode.toLowerCase() === newColor.hexCode.toLowerCase()
      );
      
      if (duplicate) {
        setHexStatus('duplicate');
        setExistingColor(duplicate);
        setError(`Color with hex code ${newColor.hexCode.toUpperCase()} already exists! It's named "${duplicate.name}" (${duplicate.codeName})`);
      } else {
        setHexStatus('valid');
        setExistingColor(null);
        setError('');
      }
    } else if (newColor.hexCode && !validateHexCode(newColor.hexCode)) {
      setHexStatus('invalid');
      setExistingColor(null);
      setError('Please enter a valid hex code (e.g., #FF0000 or #F00)');
    } else {
      setHexStatus('');
      setExistingColor(null);
      setError('');
    }
  }, [newColor.hexCode, colors]);

  const fetchColors = async () => {
    try {
      setLoading(true);
      const response = await colorsAPI.getAll();
      setColors(response.data.data || []);
    } catch (error) {
      setError('Failed to fetch colors');
    } finally {
      setLoading(false);
    }
  };

  // Filter colors based on search term
  const filteredColors = colors.filter(color =>
    color.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    color.codeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    color.hexCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if hex code already exists (case insensitive)
  const isHexCodeDuplicate = (hexCode, excludeId = null) => {
    return colors.some(color => 
      color._id !== excludeId && 
      color.hexCode.toLowerCase() === hexCode.toLowerCase()
    );
  };

  const validateHexCode = (hex) => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);

  const handleHexInputChange = (value) => {
    let cleaned = value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
    if (cleaned) cleaned = '#' + cleaned;
    setHexInput(cleaned);
    
    // Update the newColor state with the cleaned hex code
    setNewColor(prev => ({ ...prev, hexCode: cleaned }));
  };

  const handleColorPickerChange = (value) => {
    setNewColor(prev => ({ ...prev, hexCode: value }));
    setHexInput(value.replace('#', ''));
  };

  const addColor = async () => {
  if (!newColor.name.trim() || !newColor.codeName.trim() || !validateHexCode(newColor.hexCode)) {
    setError('Please fill all fields correctly');
    return;
  }

  // ONLY check for duplicate hex code before submitting
  if (isHexCodeDuplicate(newColor.hexCode)) {
    const existing = colors.find(color => 
      color.hexCode.toLowerCase() === newColor.hexCode.toLowerCase()
    );
    
    if (existing) {
      setSearchTerm(existing.hexCode);
      setError(`Color with hex code ${newColor.hexCode.toUpperCase()} already exists! It's named "${existing.name}" (${existing.codeName})`);
    }
    return;
  }

  try {
    setSubmitting(true);
    setError('');
    await colorsAPI.create(newColor);
    setNewColor({ name: '', codeName: '', hexCode: '#000000' });
    setHexInput('');
    setHexStatus('');
    setExistingColor(null);
    setSuccess('Color added successfully!');
    setTimeout(() => setSuccess(''), 3000);
    fetchColors();
  } catch (error) {
    if (error.response?.data?.message?.includes('hex code')) {
      // Server-side duplicate check failed for hex code
      await fetchColors();
      const existingColor = colors.find(color => 
        color.hexCode.toLowerCase() === newColor.hexCode.toLowerCase()
      );
      
      if (existingColor) {
        setSearchTerm(existingColor.hexCode);
        setError(`Color with hex code ${newColor.hexCode.toUpperCase()} already exists! It's named "${existingColor.name}" (${existingColor.codeName})`);
      } else {
        setError('Color with this hex code already exists. Please use a different hex code.');
      }
    } else {
      setError(error.response?.data?.message || 'Failed to add color');
    }
  } finally {
    setSubmitting(false);
  }
};

const updateColor = async () => {
  if (!editingColor.name.trim() || !editingColor.codeName.trim() || !validateHexCode(editingColor.hexCode)) {
    setError('Please fill all fields correctly');
    return;
  }

  // ONLY check for duplicate hex code before updating (excluding current color)
  if (isHexCodeDuplicate(editingColor.hexCode, editingColor._id)) {
    setError(`Color with hex code ${editingColor.hexCode.toUpperCase()} already exists!`);
    return;
  }

  try {
    setSubmitting(true);
    setError('');
    await colorsAPI.update(editingColor._id, {
      name: editingColor.name,
      codeName: editingColor.codeName,
      hexCode: editingColor.hexCode
    });
    setEditingColor(null);
    setHexInput('');
    setHexStatus('');
    setSuccess('Color updated successfully!');
    setTimeout(() => setSuccess(''), 3000);
    fetchColors();
  } catch (error) {
    if (error.response?.data?.message?.includes('hex code')) {
      setError('Color with this hex code already exists. Please use a different hex code.');
    } else {
      setError(error.response?.data?.message || 'Failed to update color');
    }
  } finally {
    setSubmitting(false);
  }
};

 

  const deleteColor = async (id) => {
    if (!window.confirm('Are you sure you want to delete this color?')) return;
    try {
      await colorsAPI.delete(id);
      setSuccess('Color deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
      fetchColors();
    } catch (error) {
      setError('Failed to delete color');
    }
  };

  const handleCsvUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      setError('Please select a file');
      return;
    }

    const isValidCSV = file.name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel';
    if (!isValidCSV) {
      setError('Please upload a valid CSV file');
      return;
    }

    try {
      setCsvUploading(true);
      setError('');
      
      const formData = new FormData();
      formData.append('csvFile', file);
      
      const response = await colorsAPI.uploadCSV(formData);
      
      setSuccess(`Successfully imported ${response.data.summary.imported} colors!`);
      setShowUploadModal(false);
      fetchColors();
    } catch (error) {
      if (error.response?.data?.message) {
        setError(`Upload failed: ${error.response.data.message}`);
      } else if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map(err => `Row ${err.row}: ${err.error}`).join(', ');
        setError(`Validation errors: ${errorMessages}`);
      } else {
        setError('Upload failed. Please check the console for details.');
      }
    } finally {
      setCsvUploading(false);
      e.target.value = '';
    }
  };

  const downloadTemplate = () => {
    const csv = "name,codeName,hexCode\nFire Red,FR,#FF0000\nOcean Blue,OB,#0000FF\nForest Green,FG,#00FF00";
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'colors_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const startEditing = (color) => {
    setEditingColor({ ...color });
    setHexInput(color.hexCode.replace('#', ''));
    setHexStatus('');
    setExistingColor(null);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const navigateToExistingColor = () => {
    if (existingColor) {
      setSearchTerm(existingColor.hexCode);
      // Find which page the existing color is on
      const colorIndex = colors.findIndex(color => color._id === existingColor._id);
      const page = Math.floor(colorIndex / itemsPerPage) + 1;
      setCurrentPage(page);
    }
  };

  // Get status message and styling for hex code input
  const getHexStatusInfo = () => {
    switch (hexStatus) {
      case 'valid':
        return {
          message: 'Hex code is available',
          icon: <CheckCircle size={16} className="text-green-500" />,
          className: 'text-green-600'
        };
      case 'duplicate':
        return {
          message: `Color already exists: ${existingColor?.name} (${existingColor?.codeName})`,
          icon: <AlertCircle size={16} className="text-red-500" />,
          className: 'text-red-600'
        };
      case 'invalid':
        return {
          message: 'Invalid hex code format',
          icon: <AlertCircle size={16} className="text-red-500" />,
          className: 'text-red-600'
        };
      default:
        return {
          message: 'Enter a valid hex code (e.g., #FF0000)',
          icon: null,
          className: 'text-gray-500'
        };
    }
  };

  const statusInfo = getHexStatusInfo();

  // Pagination for filtered colors
  const totalPages = Math.ceil(filteredColors.length / itemsPerPage);
  const paginatedColors = filteredColors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="h-40 bg-gray-200 rounded-lg"></div>
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
        <h1 className="text-3xl font-bold text-gray-800">Colors Management</h1>
        <div className="flex gap-3">
          <button onClick={downloadTemplate} className="bg-gray-600 hover:bg-gray-700 text-white px-5 py-3 rounded-lg flex items-center gap-2">
            <Download size={18} /> Template
          </button>
          <button onClick={() => setShowUploadModal(true)} className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-lg flex items-center gap-2">
            <Upload size={18} /> Upload CSV
          </button>
        </div>
      </div>

      {/* Messages */}
      {success && <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>}
      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search colors by name, code, or hex code..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          )}
        </div>
        {searchTerm && (
          <div className="mt-2 text-sm text-gray-600">
            Found {filteredColors.length} colors matching "{searchTerm}"
          </div>
        )}
      </div>

      {/* Add/Edit Form */}
<div className="bg-white rounded-lg shadow-md p-6 mb-6">
  <h2 className="text-xl font-semibold mb-6">{editingColor ? 'Edit Color' : 'Add New Color'}</h2>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {/* Color Name Input */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Color Name *</label>
      <input
        type="text"
        placeholder="e.g., Fire Red"
        value={editingColor ? editingColor.name : newColor.name}
        onChange={e => editingColor ? setEditingColor({ ...editingColor, name: e.target.value }) : setNewColor({ ...newColor, name: e.target.value })}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>

    {/* Code Name Input */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Code Name *</label>
      <input
        type="text"
        placeholder="e.g., FR"
        value={editingColor ? editingColor.codeName : newColor.codeName}
        onChange={e => {
          const val = e.target.value.toUpperCase().slice(0, 6);
          editingColor ? setEditingColor({ ...editingColor, codeName: val }) : setNewColor({ ...newColor, codeName: val });
        }}
        className="w-full px-4 py-3 text-center font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        maxLength={6}
      />
    </div>

    {/* Hex Code Input */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Hex Code *</label>
      <div className="flex items-center gap-3">
        {/* Hex Input Field */}
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-mono">#</span>
          <input
            type="text"
            placeholder="FF0000"
            value={hexInput}
            onChange={e => handleHexInputChange(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 font-mono text-center border rounded-lg focus:outline-none focus:ring-2 ${
              hexStatus === 'valid' 
                ? 'border-green-500 focus:ring-green-500 focus:border-green-500' 
                : hexStatus === 'duplicate' || hexStatus === 'invalid' 
                ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            }`}
            maxLength={6}
          />
        </div>
        
        {/* Color Picker */}
        <div className="flex flex-col items-center gap-2">
          <input
            type="color"
            value={editingColor ? editingColor.hexCode : newColor.hexCode}
            onChange={e => editingColor ? setEditingColor({ ...editingColor, hexCode: e.target.value }) : handleColorPickerChange(e.target.value)}
            className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-300"
          />
        </div>
      </div>
      
      {/* Real-time hex code status */}
      <div className={`mt-2 text-xs flex items-center gap-1 ${statusInfo.className}`}>
        {statusInfo.icon}
        <span>{statusInfo.message}</span>
        {hexStatus === 'duplicate' && (
          <button
            onClick={navigateToExistingColor}
            className="ml-2 text-blue-600 hover:text-blue-800 underline text-xs"
          >
            View existing color
          </button>
        )}
      </div>
    </div>
  </div>

  {/* Preview Section */}
  <div className="mt-6 p-4 bg-gray-50 rounded-lg flex items-center gap-6">
    <div 
      className="w-20 h-20 rounded-lg shadow-lg border-4 border-white flex-shrink-0" 
      style={{ backgroundColor: editingColor ? editingColor.hexCode : newColor.hexCode }}
    ></div>
    <div>
      <p className="text-sm font-medium text-gray-600">Preview</p>
      <p className="text-lg font-mono font-semibold text-gray-800">
        {(editingColor ? editingColor.hexCode : newColor.hexCode).toUpperCase()}
      </p>
      <p className="text-sm text-gray-500">
        {editingColor 
          ? `${editingColor.name} (${editingColor.codeName})` 
          : newColor.name 
            ? `${newColor.name} (${newColor.codeName})` 
            : 'Enter color details above'
        }
      </p>
    </div>
  </div>

  {/* Action Buttons */}
  <div className="mt-6 flex gap-3">
    {editingColor ? (
      <>
        <button 
          onClick={updateColor} 
          disabled={submitting || hexStatus === 'duplicate' || hexStatus === 'invalid'}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
        >
          {submitting ? 'Updating...' : 'Update Color'}
        </button>
        <button 
          onClick={() => setEditingColor(null)} 
          className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
        >
          Cancel
        </button>
      </>
    ) : (
      <button 
        onClick={addColor} 
        disabled={submitting || hexStatus === 'duplicate' || hexStatus === 'invalid' || !newColor.name.trim() || !newColor.codeName.trim()}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
      >
        {submitting ? 'Adding...' : 'Add Color'}
      </button>
    )}
  </div>
</div>

      {/* Colors Grid */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            {searchTerm ? `Search Results (${filteredColors.length})` : `All Colors (${colors.length})`}
          </h3>
          {totalPages > 1 && (
            <p className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </p>
          )}
        </div>

        {filteredColors.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <Search size={48} className="mx-auto" />
            </div>
            <p className="text-gray-500 text-lg">
              {searchTerm ? 'No colors found matching your search' : 'No colors found'}
            </p>
            <p className="text-gray-400">
              {searchTerm ? 'Try a different search term' : 'Add your first color using the form above'}
            </p>
          </div>
        ) : (
          <>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {paginatedColors.map(color => (
                  <div
                    key={color._id}
                    className="group relative bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer border border-gray-200 overflow-hidden"
                    onClick={() => startEditing(color)}
                  >
                    {/* Color Swatch */}
                    <div className="h-32" style={{ backgroundColor: color.hexCode }}></div>
                    
                    {/* Details */}
                    <div className="p-4 text-center">
                      <div className="font-bold text-gray-800">{color.codeName}</div>
                      <div className="text-sm text-gray-600 mt-1">{color.name}</div>
                      <div className="text-xs font-mono text-gray-500 mt-2 bg-gray-100 px-3 py-1 rounded-full">
                        {color.hexCode.toUpperCase()}
                      </div>
                    </div>

                    {/* Delete Button - Only on Hover */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteColor(color._id);
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-center gap-4">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-5 py-2 bg-white border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <span className="text-sm font-medium">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-5 py-2 bg-white border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Upload Colors CSV</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <FileText size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">Drop your CSV file here or click to browse</p>
              <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" id="csv-upload" />
              <label htmlFor="csv-upload" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg cursor-pointer inline-block">
                {csvUploading ? 'Uploading...' : 'Choose File'}
              </label>
            </div>
            <div className="mt-6 text-center">
              <button onClick={downloadTemplate} className="text-blue-600 hover:underline">
                Download Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Colors;