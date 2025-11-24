// components/Login.jsx - UPDATED WITHOUT AUTO-SETUP
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Loader, AlertCircle, CheckCircle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('superadmin@inventory.alwaqaspaint.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const { login } = useAuth();

  const LOGO_URL = "https://alwaqaspaint.com/AlWaqas%20Paint%20&%20Hardware.svg";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage('Please enter email and password');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await login(email, password);
      if (!result.success) {
        setMessage(result.message || 'Invalid credentials');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Login failed. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src={LOGO_URL} 
            alt="Al Waqas Paint & Hardware" 
            className="h-32 w-auto mx-auto mb-4"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextElementSibling.style.display = 'block';
            }}
          />
          <div style={{ display: 'none' }} className="text-4xl font-bold text-gray-800">
            Al Waqas Paint
          </div>
          <p className="text-gray-600 text-lg">POS & Inventory System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">Sign In</h2>

          {message && (
            <div className={`mb-6 p-4 rounded-lg border flex items-center gap-2 ${
              messageType === 'error' 
                ? 'bg-red-50 border-red-200 text-red-700' 
                : 'bg-green-50 border-green-200 text-green-700'
            }`}>
              {messageType === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
              <span className="text-sm">{message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="superadmin@paintshop.com"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-lg font-bold text-lg transition flex items-center justify-center gap-3 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={24} />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

         
        </div>
      </div>
    </div>
  );
};

export default Login;