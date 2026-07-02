import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Discover from './pages/Discover';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardOverview from './pages/DashboardOverview';
import PublicPortfolio from './pages/PublicPortfolio';
import VerifyEmail from './pages/VerifyEmail';
import { Sparkles, Terminal } from 'lucide-react';

// Private Route Guard Component
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="text-center my-8">Validating security sessions...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function Navigation() {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <div className="container nav-container">
        <Link to="/" className="logo">
          <img src="/logo.png" alt="ShowCase Logo" className="logo-image" />
          <span className="logo-text">ShowCase</span>
        </Link>
        <nav className="nav-links">
          <Link to="/" className="nav-link">Discover Directory</Link>
          {user ? (
            <>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <button 
                onClick={logout} 
                className="btn btn-secondary btn-sm" 
                style={{ padding: '6px 12px' }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Sign In</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div id="app-root-layout">
          <Navigation />
          <Routes>
            <Route path="/" element={<Discover />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            
            {/* Dashboard (Protected) */}
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute>
                  <DashboardOverview />
                </PrivateRoute>
              } 
            />
            
            {/* Public Portfolio (Dynamic username resolving) */}
            <Route path="/:username" element={<PublicPortfolio />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
