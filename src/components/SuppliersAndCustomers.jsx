// components/SuppliersAndCustomers.jsx - WITH TABS
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { contactsAPI } from './../../services/api';

const SuppliersAndCustomers = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState('customer'); // 'customer' or 'supplier'

  const [newContact, setNewContact] = useState({
    name: '',
    type: 'customer',
    phone: '',
    address: '',
    email: ''
  });

  useEffect(() => {
    fetchContacts();
  }, []);

  // Reset to page 1 when search term changes or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await contactsAPI.getAll();
      console.log('Contacts API response:', response);
      // Ensure we have an array, even if response structure is different
      const contactsData = response.data?.data || response.data || [];
      setContacts(Array.isArray(contactsData) ? contactsData : []);
    } catch (error) {
      setError('Failed to load contacts');
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newContact.name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      let response;
      if (editingId) {
        response = await contactsAPI.update(editingId, newContact);
        setSuccess('Contact updated successfully!');
      } else {
        response = await contactsAPI.create(newContact);
        setSuccess('Contact added successfully!');
      }
      
      // Immediately update the contacts list with the new/updated contact
      if (response.data && response.data.data) {
        const updatedContact = response.data.data;
        
        if (editingId) {
          // Update existing contact in the list
          setContacts(prevContacts => 
            prevContacts.map(contact => 
              contact._id === editingId ? updatedContact : contact
            )
          );
        } else {
          // Add new contact to the beginning of the list
          setContacts(prevContacts => [updatedContact, ...prevContacts]);
          // Reset to page 1 to show the newly added contact
          setCurrentPage(1);
        }
      } else {
        // Fallback: refetch all contacts
        fetchContacts();
      }

      setTimeout(() => setSuccess(''), 3000);
      resetForm();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save contact');
      console.error('Error saving contact:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewContact({ 
      name: '', 
      type: activeTab, // Set default type to active tab
      phone: '', 
      address: '', 
      email: '' 
    });
    setEditingId(null);
  };

  const editContact = (contact) => {
    setNewContact({
      name: contact.name,
      type: contact.type,
      phone: contact.phone || '',
      address: contact.address || '',
      email: contact.email || ''
    });
    setEditingId(contact._id);
    // Switch to the appropriate tab when editing
    setActiveTab(contact.type);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteContact = async (id) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return;
    
    try {
      await contactsAPI.delete(id);
      // Remove contact from local state immediately
      setContacts(prevContacts => prevContacts.filter(contact => contact._id !== id));
      setSuccess('Contact deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
      
      // Adjust current page if needed after deletion
      const remainingContacts = contacts.filter(contact => contact._id !== id);
      const filteredRemaining = getFilteredContacts(remainingContacts);
      const newTotalPages = Math.ceil(filteredRemaining.length / itemsPerPage);
      
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }
    } catch (error) {
      setError('Failed to delete contact');
      console.error('Error deleting contact:', error);
    }
  };

  // Filter contacts based on active tab and search term
  const getFilteredContacts = (contactList = contacts) => {
    return contactList.filter(c =>
      c.type === activeTab && (
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone && c.phone.includes(searchTerm)) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    );
  };

  const filteredContacts = getFilteredContacts();

  // Calculate pagination
  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentContacts = filteredContacts.slice(indexOfFirstItem, indexOfLastItem);

  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Generate page numbers with limits to avoid too many buttons
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
    }
    
    return pageNumbers;
  };

  // Update newContact type when tab changes
  useEffect(() => {
    if (!editingId) {
      setNewContact(prev => ({ ...prev, type: activeTab }));
    }
  }, [activeTab, editingId]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
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
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Suppliers & Customers</h1>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Add/Edit Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6">
          {editingId ? 'Edit Contact' : 'Add New Contact'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
            <input
              type="text"
              value={newContact.name}
              onChange={e => setNewContact({ ...newContact, name: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={newContact.type}
              onChange={e => setNewContact({ ...newContact, type: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="customer">Customer</option>
              <option value="supplier">Supplier</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
            <input
              type="text"
              value={newContact.phone}
              onChange={e => setNewContact({ ...newContact, phone: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0300-1234567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={newContact.email}
              onChange={e => setNewContact({ ...newContact, email: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="contact@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
            <input
              type="text"
              value={newContact.address}
              onChange={e => setNewContact({ ...newContact, address: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Full address"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            <Plus size={20} />
            {submitting ? 'Saving...' : (editingId ? 'Update' : 'Add')} Contact
          </button>
          {editingId && (
            <button 
              onClick={resetForm} 
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('customer')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'customer'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Customers
              <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                {contacts.filter(c => c.type === 'customer').length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('supplier')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'supplier'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Suppliers
              <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                {contacts.filter(c => c.type === 'supplier').length}
              </span>
            </button>
          </nav>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={`Search ${activeTab === 'customer' ? 'customers' : 'suppliers'} by name, phone, or email...`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {activeTab === 'customer' ? 'Customers' : 'Suppliers'} ({filteredContacts.length}) {totalPages > 1 && `- Page ${currentPage} of ${totalPages}`}
          </h3>
        </div>

        {currentContacts.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            {contacts.filter(c => c.type === activeTab).length === 0 
              ? `No ${activeTab === 'customer' ? 'customers' : 'suppliers'} found. Add your first ${activeTab === 'customer' ? 'customer' : 'supplier'} above.`
              : 'No contacts match your search.'
            }
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentContacts.map((contact) => (
                    <tr key={contact._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{contact.name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          contact.type === 'customer' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {contact.type === 'customer' ? 'Customer' : 'Supplier'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{contact.phone || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{contact.email || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{contact.address || '—'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => editContact(contact)} 
                            className="text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50 transition-colors"
                            title="Edit contact"
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            onClick={() => deleteContact(contact._id)} 
                            className="text-red-600 hover:text-red-800 p-2 rounded hover:bg-red-50 transition-colors"
                            title="Delete contact"
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredContacts.length)} of {filteredContacts.length} {activeTab === 'customer' ? 'customers' : 'suppliers'}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={goToPrevPage}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </button>
                  
                  {/* Page Numbers */}
                  <div className="flex gap-1">
                    {getPageNumbers().map(page => (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium min-w-[40px] transition-colors ${
                          currentPage === page
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
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

export default SuppliersAndCustomers;