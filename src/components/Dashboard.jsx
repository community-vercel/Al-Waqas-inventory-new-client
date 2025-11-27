const LOGO_URL = "https://alwaqaspaint.com/AlWaqas%20Paint%20&%20Hardware.svg";
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Palette, 
  Package, 
  Warehouse, 
  DollarSign, 
  ShoppingCart, 
  TrendingUp,
  Users,
  Home,
  LogOut,
  Sun,
  Moon,
  User,
  Mail
} from 'lucide-react';

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState(null);

  const menuItems = [
    { path: '/colors', icon: Palette, label: 'Colors' },
    { path: '/products', icon: Package, label: 'Products' },
    { path: '/inventory', icon: Warehouse, label: 'Stock' },
    { path: '/expenses', icon: DollarSign, label: 'Expenses' },
    { path: '/purchases', icon: ShoppingCart, label: 'Purchases' },
    { path: '/sales', icon: TrendingUp, label: 'Sales' },
    { path: '/suppliers-and-customers', icon: Users, label: 'Suppliers & Customers' }, 
  ];

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);



  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="w-64 bg-blue-900 text-white min-h-screen flex flex-col">
      {/* Top Header Section */}
      <div className="p-4 border-b border-blue-800">
        <div className="flex items-center justify-between">
          {/* User Info */}
          {user && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {user.name || 'User'}
                </div>
                <div className="text-xs text-blue-200 truncate">
                  {user.email || 'user@example.com'}
                </div>
              </div>
            </div>
          )}
          
          
        </div>
      </div>

      {/* Logo Section */}
      <div className="p-4">
        <div className="flex items-center justify-center">
          <img 
            src={LOGO_URL} 
            alt="Al Waqas Paint & Hardware" 
            className="h-12 w-auto max-w-full object-contain"
          />
        </div>
        <p className="text-blue-200 text-xs text-center mt-2">Inventory Management System</p>
      </div>
      
      {/* Navigation Menu */}
      <nav className="mt-2 flex-1">
        <Link
          to="/"
          className={`flex items-center px-4 py-3 text-white ${
            isActive('/') ? 'bg-blue-800 border-r-4 border-yellow-400' : 'hover:bg-blue-800'
          }`}
        >
          <Home size={18} className="mr-3" />
          Dashboard
        </Link>
        
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center px-4 py-3 text-white text-sm ${
              isActive(item.path) ? 'bg-blue-800 border-r-4 border-yellow-400' : 'hover:bg-blue-800'
            }`}
          >
            <item.icon size={18} className="mr-3" />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="border-t border-blue-800 p-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-4 py-3 text-white bg-red-600 hover:bg-red-700 rounded transition text-sm"
        >
          <LogOut size={18} className="mr-3" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Dashboard;