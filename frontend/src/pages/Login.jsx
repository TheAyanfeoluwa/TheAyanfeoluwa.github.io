// frontend/src/pages/Login.jsx - EDITED VERSION

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import axios from 'axios';
import { toast } from 'react-toastify'; // Keep toast for error messages
import { useAuth } from '../context/AuthContext'; // NEW: Import useAuth

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  // const [success, setSuccess] = useState(''); // REMOVED: Success state is now handled by AuthContext via toast
  const navigate = useNavigate();
  const { login } = useAuth(); // NEW: Get the login function from AuthContext

  const handleSubmit = async (e) => {
    console.log('handleSubmit called!');
    e.preventDefault();

    setError('');
    // setSuccess(''); // REMOVED

    try {
      const response = await axios.post('http://127.0.0.1:8001/api/v1/auth/login', {
        email,
        password,
      });

      if (response.data.access_token) {
        // REMOVED: setSuccess('Login successful! Redirecting...');
        // REMOVED: localStorage.setItem('accessToken', response.data.access_token);
        // REMOVED: localStorage.setItem('userEmail', email); // AuthContext now fetches full user object

        // MODIFIED: Call the centralized login function from AuthContext.
        // This function now handles:
        // 1. Storing the accessToken in state and localStorage.
        // 2. Fetching the full user object and storing it in state and localStorage.
        // 3. Displaying a success toast notification.
        // 4. Navigating to the dashboard.
        await login(response.data.access_token);
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response) {
          // Keep toast.error for login failures
          toast.error(err.response.data.detail || 'Login failed. Please check your credentials.');
          setError(err.response.data.detail || 'Login failed. Please check your credentials.');
        } else if (err.request) {
          toast.error('No response from server. Please try again later.');
          setError('No response from server. Please try again later.');
        } else {
          toast.error('An unexpected error occurred. Please try again.');
          setError('An unexpected error occurred. Please try again.');
        }
      } else {
        toast.error('An unknown error occurred.');
        setError('An unknown error occurred.');
      }
      console.error('Login error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212]">
      <Navbar />

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto bg-[#1A1A1A] p-8 rounded-lg">
          <h1 className="text-3xl font-bold mb-6">Welcome Back</h1>

          {/* Displaying local error state is fine */}
          {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
          {/* REMOVED: Success message from local state */}
          {/* {success && <p className="text-green-500 mb-4 text-center">{success}</p>} */}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                className="w-full p-3 bg-[#242424] rounded-md focus:outline-none focus:ring-2 focus:ring-white/20"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  className="w-full p-3 bg-[#242424] rounded-md focus:outline-none focus:ring-2 focus:ring-white/20"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-white text-black border border-transparent rounded-md font-bold hover:bg-gray-200 transition-colors"
            >
              Sign In
            </button>
          </form>

          <p className="mt-4 text-center text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-white hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Login;