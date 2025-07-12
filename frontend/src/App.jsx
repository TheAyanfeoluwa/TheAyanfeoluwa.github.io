// frontend/src/App.jsx - EDITED FINAL VERSION

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// Import ToastContainer and its CSS for notifications
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import all your existing pages
import Landing from './pages/Landing'; // Keeping your Landing page as the root
import Dashboard from './pages/Dashboard';
import Pomodoro from './pages/Pomodoro';
import Tasks from './pages/Tasks';
import Store from './pages/Store';
import Login from './pages/Login';
import Register from './pages/Register';
import ComingSoon from './pages/ComingSoon';
import Feedback from './pages/Feedback';

// Import your PrivateRoute and AuthProvider
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider } from './context/AuthContext';

import './App.css'; // Ensure this is still imported

// NEW: Import the Community page
import Community from './pages/Community';


function App() {
  return (
    <Router>
      {/* Wrap your entire application (or at least your Routes) with AuthProvider */}
      <AuthProvider>
        <div className="min-h-screen bg-[#121212] text-white">
          <Routes>
            <Route path="/" element={<Landing />} />

            {/* Public Routes - Accessible without login */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/coming-soon" element={<ComingSoon />} />
            <Route path="/feedback" element={<Feedback />} />

            {/* Protected Routes - Require Authentication via PrivateRoute */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/pomodoro"
              element={
                <PrivateRoute>
                  <Pomodoro />
                </PrivateRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <PrivateRoute>
                  <Tasks />
                </PrivateRoute>
              }
            />
            {/* MODIFIED: Store page moved to PrivateRoute as it often requires authentication for features like coins/purchases */}
            <Route
              path="/store"
              element={
                <PrivateRoute>
                  <Store />
                </PrivateRoute>
              }
            />
            {/* NEW: Route for the Community page, protected by PrivateRoute */}
            <Route
              path="/community"
              element={
                <PrivateRoute>
                  <Community />
                </PrivateRoute>
              }
            />
          </Routes>
        </div>
      </AuthProvider> {/* Close AuthProvider */}
      {/* ToastContainer for notifications - typically placed outside AuthProvider but within Router */}
      <ToastContainer position="bottom-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
    </Router>
  );
}

export default App;