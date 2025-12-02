// components/Login.jsx - REDESIGNED WITH LEFT IMAGE RIGHT LOGIN
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Loader, AlertCircle, CheckCircle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const { login } = useAuth();

  const LOGO_URL = "https://alwaqaspaint.com/AlWaqas%20Paint%20&%20Hardware.svg";
  const SIDE_IMAGE_URL = "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
const handleSubmit = async (e) => {
  e.preventDefault(); // ← This MUST be the very first line

  setMessage('');
  setMessageType('');

  // Client-side validation
  if (!email.trim() || !password) {
    setMessage('Please fill in all fields');
    setMessageType('error');
    return;
  }

  setLoading(true);

  try {
    const result = await login(email, password);

    if (!result.success) {
      setMessage(result.message || 'Invalid credentials');
      setMessageType('error');
    } else {
      setMessage('Login successful! Redirecting...');
      setMessageType('success');
    }
  } catch (err) {
    setMessage('Something went wrong. Please try again.');
    setMessageType('error');
    console.error(err);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-900 relative">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${SIDE_IMAGE_URL})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-blue-900/20"></div>
        </div>
        
        {/* Branding on image */}
        <div className="relative z-10 p-12 flex flex-col justify-between h-full">
          <div className="flex items-center gap-3">
            <img 
              src={LOGO_URL} 
              alt="Al Waqas Paint & Hardware" 
              className="h-12 w-auto"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="text-white">
              <h1 className="text-3xl font-bold">Al Waqas Paint</h1>
              <p className="text-white text-sm">Inventory Management System</p>
            </div>
          </div>
          
          
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <img 
              src={LOGO_URL} 
              alt="Al Waqas Paint & Hardware" 
              className="h-24 w-auto mx-auto mb-4"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'block';
              }}
            />
            <div style={{ display: 'none' }} className="text-3xl font-bold text-gray-800">
              Al Waqas Paint
            </div>
            <p className="text-gray-600">POS & Inventory System</p>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800">Welcome Back</h2>
              <p className="text-gray-600 mt-2">Sign in to your account</p>
            </div>

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

<form onSubmit={handleSubmit} className="space-y-6" noValidate>              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="superadmin@paintshop.com"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-lg font-bold text-lg transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
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

            {/* Additional Info */}
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;