// components/Dashboard.jsx - FINAL WITH SUPPLIERS & CUSTOMERS
import React from 'react';
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
  LogOut
} from 'lucide-react';

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/colors', icon: Palette, label: 'Colors' },
    { path: '/products', icon: Package, label: 'Products' },
    { path: '/inventory', icon: Warehouse, label: 'Stock' },
    { path: '/expenses', icon: DollarSign, label: 'Expenses' },
    { path: '/purchases', icon: ShoppingCart, label: 'Purchases' },
    { path: '/sales', icon: TrendingUp, label: 'Sales' },
    { path: '/suppliers-and-customers', icon: Users, label: 'Suppliers & Customers' }, 
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="w-64 bg-blue-900 text-white min-h-screen flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold">Al Waqas Paint</h1>
        <p className="text-blue-200 text-sm">Inventory Management</p>
      </div>
      
      <nav className="mt-6 flex-1">
        <Link
          to="/"
          className={`flex items-center px-6 py-3 text-white ${
            isActive('/') ? 'bg-blue-800 border-r-4 border-yellow-400' : 'hover:bg-blue-800'
          }`}
        >
          <Home size={20} className="mr-3" />
          Dashboard
        </Link>
        
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center px-6 py-3 text-white ${
              isActive(item.path) ? 'bg-blue-800 border-r-4 border-yellow-400' : 'hover:bg-blue-800'
            }`}
          >
            <item.icon size={20} className="mr-3" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-blue-800 p-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-6 py-3 text-white bg-red-600 hover:bg-red-700 rounded transition"
        >
          <LogOut size={20} className="mr-3" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Dashboard;