// components/SuppliersAndCustomers.jsx - UPDATED TO USE BACKEND API
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Search } from 'lucide-react';
import { contactsAPI } from './../../services/api'; // Import the API

const SuppliersAndCustomers = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await contactsAPI.getAll();
      console.log('Contacts API response:', response);
      setContacts(response.data.data || []);
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

      if (editingId) {
        // Update existing contact
        await contactsAPI.update(editingId, newContact);
        setSuccess('Contact updated successfully!');
      } else {
        // Create new contact
        await contactsAPI.create(newContact);
        setSuccess('Contact added successfully!');
      }
      
      setTimeout(() => setSuccess(''), 3000);
      resetForm();
      fetchContacts(); // Refresh the list
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
      type: 'customer', 
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteContact = async (id) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return;
    
    try {
      await contactsAPI.delete(id);
      setSuccess('Contact deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
      fetchContacts(); // Refresh the list
    } catch (error) {
      setError('Failed to delete contact');
      console.error('Error deleting contact:', error);
    }
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm)) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={newContact.type}
              onChange={e => setNewContact({ ...newContact, type: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="0300-1234567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={newContact.email}
              onChange={e => setNewContact({ ...newContact, email: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="contact@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
            <input
              type="text"
              value={newContact.address}
              onChange={e => setNewContact({ ...newContact, address: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Full address"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : (editingId ? 'Update' : 'Add')} Contact
          </button>
          {editingId && (
            <button 
              onClick={resetForm} 
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            All Contacts ({filteredContacts.length})
          </h3>
        </div>

        {filteredContacts.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            {contacts.length === 0 ? 'No contacts found. Add your first contact above.' : 'No contacts match your search.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContacts.map((contact) => (
                  <tr key={contact._id} className="hover:bg-gray-50">
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
                    <td className="px-6 py-4 text-sm text-gray-600">{contact.address || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => editContact(contact)} 
                          className="text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => deleteContact(contact._id)} 
                          className="text-red-600 hover:text-red-800 p-2 rounded hover:bg-red-50"
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
        )}
      </div>
    </div>
  );
};

export default SuppliersAndCustomers;