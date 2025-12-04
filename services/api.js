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


// Sales API
export const salesAPI = {
  getAll: (filters = {}) => api.get('/sales', { params: filters }),
  create: (saleData) => api.post('/sales', saleData),
  delete: (id) => api.delete(`/sales/${id}`),
  getStats: (period = 'month') => api.get(`/sales/stats?period=${period}`),
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

export default api;