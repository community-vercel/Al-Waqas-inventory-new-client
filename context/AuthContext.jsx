// context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Check if user is authenticated on app load
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          // Verify token is still valid by making a API call
          const response = await authAPI.getMe();
          if (response.data.success) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
          } else {
            // Token is invalid, clear storage
            logout();
          }
        } catch (error) {
          console.error('Token validation failed:', error);
          // Token is invalid or expired, clear storage
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      
      if (response.data.success) {
        const { user: userData, token: userToken } = response.data;

        // Store token and user data in localStorage
        localStorage.setItem('token', userToken);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Update state
        setToken(userToken);
        setUser(userData);
        
        return { success: true, data: response.data };
      } else {
        return { 
          success: false, 
          message: response.data.message || 'Login failed' 
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed. Please try again.' 
      };
    }
  };

  // Logout function
  const logout = () => {
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Clear state
    setToken(null);
    setUser(null);
  };

  // Check if user is authenticated
  const isAuthenticated = !!token && !!user;

  // Get user role
  const getUserRole = () => {
    return user?.role || null;
  };

  // Check if user has specific role
  const hasRole = (role) => {
    return user?.role === role;
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roles) => {
    return roles.includes(user?.role);
  };

  // Update user data (useful when user updates their profile)
  const updateUser = (updatedUserData) => {
    const newUserData = { ...user, ...updatedUserData };
    setUser(newUserData);
    localStorage.setItem('user', JSON.stringify(newUserData));
  };

  // Refresh token (if implementing token refresh)
  const refreshToken = async () => {
    try {
      // This would call your refresh token endpoint
      // For now, we'll just validate the current token
      const response = await authAPI.getMe();
      if (response.data.success) {
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  };

  const value = {
    // State
    user,
    token,
    loading,
    
    // Actions
    login,
    logout,
    updateUser,
    refreshToken,
    
    // Getters
    isAuthenticated,
    getUserRole,
    hasRole,
    hasAnyRole,
    
    // User specific getters
    isSuperAdmin: user?.role === 'superadmin',
    isAdmin: user?.role === 'admin',
    isStaff: user?.role === 'staff',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;