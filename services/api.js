import axios from 'axios';

const API_URL = import.meta.env.VITE_APP_API_URL || 'https://al-waqas-inventory-new-server.vercel.app/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 900000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isLoginPage = window.location.pathname === '/login';
      
      if (!isLoginPage) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login?session=expired';
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
  register: (userData) => api.post('/auth/register', userData),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
};

// Colors API
export const colorsAPI = {
  getAll: () => api.get('/colors'),
  create: (colorData) => api.post('/colors', colorData),
  update: (id, colorData) => api.put(`/colors/${id}`, colorData),
  delete: (id) => api.delete(`/colors/${id}`),
  uploadCSV: (formData) => api.post('/colors/upload-csv', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),
};

// Products API
export const productsAPI = {
  getAll: () => api.get('/products'),
  bulkDeleteAll: () => api.delete('/products/bulk-delete-all'),
  create: (productData) => api.post('/products', productData),
  update: (id, productData) => api.put(`/products/${id}`, productData),
  delete: (id) => api.delete(`/products/${id}`),
  uploadCSV: (formData) => api.post('/products/upload-csv', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),
};

// Inventory API
export const inventoryAPI = {
  getAll: () => api.get('/inventory'),
  getLowStock: () => api.get('/inventory/low-stock'),
  update: (id, inventoryData) => api.put(`/inventory/${id}`, inventoryData),
};

// Expenses API
export const expensesAPI = {
  getAll: (filters = {}) => api.get('/expenses', { params: filters }),
  create: (expenseData) => api.post('/expenses', expenseData),
  update: (id, expenseData) => api.put(`/expenses/${id}`, expenseData),
  delete: (id) => api.delete(`/expenses/${id}`),
};

// Purchases API
export const purchasesAPI = {
  getAll: (filters = {}) => api.get('/purchases', { params: filters }),
  create: (purchaseData) => api.post('/purchases', purchaseData),
  update: (id, purchaseData) => api.put(`/purchases/${id}`, purchaseData),
  delete: (id) => api.delete(`/purchases/${id}`),
  getStats: (period = 'month') => api.get(`/purchases/stats?period=${period}`),
};


// Sales API - UPDATED to match backend routes
export const salesAPI = {
  // Get all sales with filters (default: today's sales)
  getAll: (params = {}) => api.get('/sales', { params }),
  
  // Get sales for specific date (YYYY-MM-DD format)
  getByDate: (date) => {
    // Format date to YYYY-MM-DD if needed
    const formattedDate = new Date(date).toISOString().split('T')[0];
    return api.get(`/sales/daily/${formattedDate}`);
  },
  
  // Get daily summary statistics
  getDailySummary: (date) => {
    const formattedDate = new Date(date).toISOString().split('T')[0];
    return api.get(`/sales/summary/${formattedDate}`);
  },
  
  // Get sales by date range
  getByDateRange: (startDate, endDate) => 
    api.get('/sales/date-range', { 
      params: { 
        startDate: new Date(startDate).toISOString().split('T')[0],
        endDate: new Date(endDate).toISOString().split('T')[0]
      } 
    }),
  
  // Create single sale (no customer name needed)
  create: (saleData) => api.post('/sales', saleData),
  
  // Create multiple sales at once
  createBulk: (saleItems) => api.post('/sales/bulk', saleItems),
  
  // Delete sale
  delete: (id) => api.delete(`/sales/${id}`),
  
  // Get sales statistics
  getStats: (period = 'today') => api.get('/sales/stats', { params: { period } }),
  
  // Utility method to get today's sales specifically
  getTodaySales: () => {
    const today = new Date().toISOString().split('T')[0];
    return api.get(`/sales/daily/${today}`);
  },
  
  // Utility method to get yesterday's sales
  getYesterdaySales: () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    return api.get(`/sales/daily/${dateStr}`);
  },
  
  // Simple get sales with default params (for backward compatibility)
  getSales: (params = {}) => api.get('/sales', { params })
};
// contact API -- customer and suppliers
export const contactsAPI = {
  getAll: (filters = {}) => api.get('/contacts', { params: filters }),
  get: (id) => api.get(`/contacts/${id}`),
  create: (contactData) => api.post('/contacts', contactData),
  update: (id, contactData) => api.put(`/contacts/${id}`, contactData),
  delete: (id) => api.delete(`/contacts/${id}`),
  getByType: (type) => api.get(`/contacts/type/${type}`),
  search: (query) => api.get(`/contacts/search/${query}`),
  uploadCSV: (formData) => api.post('/contacts/upload-csv', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),
};
// Health check
export const healthCheck = () => api.get('/health');
export const ledgerAPI = {
  getAll: (filters = {}) => api.get('/ledgers', { params: filters }),
  get: (id) => api.get(`/ledgers/${id}`),
}
export default api;