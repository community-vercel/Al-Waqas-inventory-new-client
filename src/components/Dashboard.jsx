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
  Mail,
  ChevronLeft,
  Wallet,
  ChevronRight,BookOpenCheck 
} from 'lucide-react';

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { path: '/colors', icon: Palette, label: 'Colors' },
    { path: '/products', icon: Package, label: 'Products' },
    { path: '/inventory', icon: Warehouse, label: 'Stock' },
    { path: '/expenses', icon: Wallet, label: 'Shop Expenses' },
    { path: '/purchases', icon: ShoppingCart, label: 'Purchases' },
    { path: '/sales', icon: TrendingUp, label: 'Sales' },
    { path: '/suppliers-and-customers', icon: Users, label: 'Suppliers' }, 
    { path: '/ledger', icon: BookOpenCheck, label: 'Ledger' }, 

  ];

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    // Check for saved theme preference
    // const savedTheme = localStorage.getItem('theme');
    // if (savedTheme === 'dark') {
    //   setDarkMode(true);
    //   document.documentElement.classList.add('dark');
    // }
  }, []);

  // const toggleDarkMode = () => {
  //   setDarkMode(!darkMode);
  //   if (!darkMode) {
  //     document.documentElement.classList.add('dark');
  //     localStorage.setItem('theme', 'dark');
  //   } else {
  //     document.documentElement.classList.remove('dark');
  //     localStorage.setItem('theme', 'light');
  //   }
  // };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-blue-900 text-white min-h-screen flex flex-col transition-all duration-300`}>
      {/* Top Header Section */}
      <div className="p-4 border-b border-blue-800">
        <div className="flex items-center justify-between">
          {/* User Info - Hidden when collapsed */}
          {!isCollapsed && user && (
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
          
          <div className="flex items-center space-x-2">
            
            
            {/* Collapse Toggle Button */}
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg bg-blue-800 hover:bg-blue-700 transition-colors"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight size={16} className="text-blue-200" />
              ) : (
                <ChevronLeft size={16} className="text-blue-200" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Logo Section - Hidden when collapsed */}
      {!isCollapsed && (
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
      )}

      {/* Navigation Menu */}
      <nav className="mt-2 flex-1">
        <Link
          to="/"
          className={`flex items-center ${isCollapsed ? 'justify-center px-3' : 'px-4'} py-3 text-white ${
            isActive('/') ? 'bg-blue-800 border-r-4 border-yellow-400' : 'hover:bg-blue-800'
          }`}
          title={isCollapsed ? 'Dashboard' : ''}
        >
          <Home size={18} className={isCollapsed ? '' : 'mr-3'} />
          {!isCollapsed && 'Dashboard'}
        </Link>
        
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center ${isCollapsed ? 'justify-center px-3' : 'px-4'} py-3 text-white text-sm ${
              isActive(item.path) ? 'bg-blue-800 border-r-4 border-yellow-400' : 'hover:bg-blue-800'
            }`}
            title={isCollapsed ? item.label : ''}
          >
            <item.icon size={18} className={isCollapsed ? '' : 'mr-3'} />
            {!isCollapsed && item.label}
          </Link>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="border-t border-blue-800 p-4">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center px-3' : 'px-4'} py-3 text-white bg-red-600 hover:bg-red-700 rounded transition text-sm`}
          title={isCollapsed ? 'Logout' : ''}
        >
          <LogOut size={18} className={isCollapsed ? '' : 'mr-3'} />
          {!isCollapsed && 'Logout'}
        </button>
      </div>
    </div>
  );
};

export default Dashboard;