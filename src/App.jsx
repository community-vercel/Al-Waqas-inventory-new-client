// App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Colors from './components/Colors';
import Products from './components/Products';
import Inventory from './components/Inventory';
import Expenses from './components/Expenses';
import Purchases from './components/Purchases';
import Sales from './components/Sales';
import  DashboardStats  from './components/DashboardStats';
import SuppliersAndCustomers from './components/SuppliersAndCustomers';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Public Route Component (redirect to dashboard if already authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  return !isAuthenticated ? children : <Navigate to="/" />;
};

function AppContent() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        
        {/* Protected Routes */}
        <Route 
          path="/*" 
          element={
            <ProtectedRoute>
              <div className="flex h-screen bg-gray-100">
                <Dashboard />
                <div className="flex-1 overflow-auto">
                  <Routes>
                    <Route path="/" element={<DashboardStats />} />
                    <Route path="/colors" element={<Colors />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/expenses" element={<Expenses />} />
                    <Route path="/purchases" element={<Purchases />} />
                    <Route path="/sales" element={<Sales />} />
                    <Route path="/suppliers-and-customers" element={<SuppliersAndCustomers />} />

                  </Routes>
                </div>
              </div>
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;