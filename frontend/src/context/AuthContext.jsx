// frontend/src/context/AuthContext.jsx - MERGED VERSION

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify'; // For displaying toast notifications

// Create the AuthContext
const AuthContext = createContext(null);

// Custom hook to use the AuthContext easily in components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// AuthProvider component that will wrap your application
export const AuthProvider = ({ children }) => {
  // Your original accessToken state, initialized from localStorage
  const [accessToken, setAccessToken] = useState(() => {
    return localStorage.getItem('accessToken') || null;
  });

  // NEW: State to store user details (from AI's version, adapted)
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user'); // AI used 'user', we'll adopt this
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      console.error("Failed to parse user from localStorage:", e);
      localStorage.removeItem('user'); // Clear corrupted user data
      return null;
    }
  });

  // NEW: Loading state for initial authentication check (from AI's version)
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate(); // Hook for navigation

  // NEW/MODIFIED useEffect: Handles initial load, token verification, and localStorage sync
  useEffect(() => {
    const loadAndVerifyAuth = async () => {
      const storedToken = localStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('user'); // Get user from storage

      if (storedToken) {
        setAccessToken(storedToken);
        try {
          const parsedUser = storedUser ? JSON.parse(storedUser) : null;
          setUser(parsedUser); // Set user from storage initially

          // Verify token by calling /users/me endpoint
          // This ensures the token is still valid and gets fresh user data
          const response = await fetch('http://localhost:8001/api/v1/users/me', {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            // If the token is invalid or expired, force logout
            console.warn("Authentication token invalid or expired during verification.");
            logout(); // Use the logout function to clear all state and redirect
          } else {
            const userData = await response.json();
            setUser(userData); // Update user state with fresh data from backend
            localStorage.setItem('user', JSON.stringify(userData)); // Update localStorage with fresh user data
          }
        } catch (error) {
          console.error("Error during initial token verification or user data fetch:", error);
          logout(); // Force logout on verification/fetch error
        }
      } else {
        // No token found, ensure states are null
        setAccessToken(null);
        setUser(null);
      }
      setIsLoading(false); // Authentication check is complete
    };

    loadAndVerifyAuth(); // Run on component mount

    // Listen for changes in localStorage from other tabs/windows
    // This allows for cross-tab login/logout synchronization
    window.addEventListener('storage', loadAndVerifyAuth);

    // Cleanup: Remove the event listener when the component unmounts
    return () => {
      window.removeEventListener('storage', loadAndVerifyAuth);
      // Also clear intervalRef if you had one here, but for AuthContext, it's usually not needed
    };
  }, []); // Empty dependency array means this effect runs only once on mount

  // Your original login function, now also storing user data
  const login = useCallback(async (token) => {
    setAccessToken(token);
    localStorage.setItem('accessToken', token);

    try {
      // Fetch user details immediately after login
      const response = await fetch('http://localhost:8001/api/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user data after login');
      }
      const userData = await response.json();
      setUser(userData); // Set the fetched user data
      localStorage.setItem('user', JSON.stringify(userData)); // Store user data in localStorage

      toast.success("Login successful!"); // Show success message
      navigate('/dashboard'); // Redirect to the dashboard page
    } catch (error) {
      console.error("Login process error (fetching user data):", error);
      toast.error("Login successful, but failed to load user data. Please refresh.");
      // Even if user data fetch fails, the token is set, so we still navigate.
      navigate('/dashboard');
    }
  }, [navigate]); // navigate is a dependency

  // Your original logout function, now also clearing user data
  const logout = useCallback(() => {
    setAccessToken(null); // Clear accessToken state
    setUser(null); // Clear user state
    localStorage.removeItem('accessToken'); // Remove accessToken from localStorage
    localStorage.removeItem('user'); // Remove user from localStorage
    toast.info("You have been logged out."); // Show info message
    navigate('/login'); // Redirect to the login page
  }, [navigate]); // navigate is a dependency

  // The value that will be supplied to any components that use useAuth()
  const authContextValue = {
    accessToken,
    user, // NEW: Provide the user object
    isLoading, // NEW: Provide the loading state for initial auth check
    login,
    logout,
    isAuthenticated: !!accessToken, // Derived state for convenience
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};