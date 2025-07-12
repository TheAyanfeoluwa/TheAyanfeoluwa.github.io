import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, User, MessageCircle } from 'lucide-react';

const CommunityLogin = () => {
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('password');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const result = await login(email, password);
    
    if (result.success) {
      navigate('/community');
    } else {
      setError(result.error || 'Login failed');
    }
    
    setIsLoading(false);
  };

  const quickLogin = (userType) => {
    switch (userType) {
      case 'admin':
        setEmail('admin@example.com');
        setPassword('admin123');
        break;
      case 'user':
        setEmail('user@example.com');
        setPassword('user123');
        break;
      case 'demo':
        setEmail('demo@example.com');
        setPassword('password');
        break;
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-neutral-900 rounded-2xl shadow-2xl border-2 border-white p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-full mb-4 border-2 border-white">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Community Chat</h1>
          <p className="text-gray-400 mt-2">Sign in to join the conversation</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-black border-2 border-white rounded-lg focus:ring-2 focus:ring-white focus:border-white transition-colors text-white placeholder-gray-400"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-black border-2 border-white rounded-lg focus:ring-2 focus:ring-white focus:border-white transition-colors text-white placeholder-gray-400"
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-black text-white py-3 px-4 rounded-lg border-2 border-white hover:bg-neutral-900 focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-neutral-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="mt-6">
          <div className="text-center mb-4">
            <p className="text-sm text-gray-400">Quick Login Options</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => quickLogin('admin')}
              className="bg-black text-white py-2 px-3 rounded-lg border-2 border-white hover:bg-neutral-900 transition-colors text-xs"
            >
              Admin
            </button>
            <button
              onClick={() => quickLogin('user')}
              className="bg-black text-white py-2 px-3 rounded-lg border-2 border-white hover:bg-neutral-900 transition-colors text-xs"
            >
              User
            </button>
            <button
              onClick={() => quickLogin('demo')}
              className="bg-black text-white py-2 px-3 rounded-lg border-2 border-white hover:bg-neutral-900 transition-colors text-xs"
            >
              Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityLogin;