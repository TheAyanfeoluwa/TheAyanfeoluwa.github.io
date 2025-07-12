// frontend/src/components/PrivateRoute.jsx - FINAL EDITED VERSION

import React from 'react';
import { Navigate } from 'react-router-dom';
// The toast import and its usage for session expiry messages are now handled
// directly within AuthContext.jsx. You can safely remove this import from here.
// import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext'; // Import your updated AuthContext

const PrivateRoute = ({ children }) => {
  // Destructure accessToken and the new 'isLoading' state from useAuth().
  // The 'user' object is also available but not strictly needed for the logic here.
  const { accessToken, isLoading } = useAuth(); // MODIFIED: Added isLoading

  // NEW LOGIC: If the authentication status is still being determined (i.e., AuthContext is loading),
  // display a temporary loading message or spinner. This prevents a brief flash of unauthenticated
  // content or an immediate redirect before the actual token status is known.
  if (isLoading) {
    return <div>Loading authentication...</div>; // Consider a more elaborate spinner/loader component here
  }

  // After the loading is complete (isLoading is false):
  // If there is no accessToken (meaning the user is not logged in or their session expired),
  // redirect them to the login page. The 'replace' prop ensures they can't go back with the browser's back button.
  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  // If isLoading is false and an accessToken IS present, the user is authenticated.
  // Render the child components, which is the actual content of the protected route (e.g., Dashboard, Tasks).
  return children;
};

export default PrivateRoute;