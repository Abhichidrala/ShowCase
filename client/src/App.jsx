import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Discover from './pages/Discover';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardOverview from './pages/DashboardOverview';
import PublicPortfolio from './pages/PublicPortfolio';
import VerifyEmail from './pages/VerifyEmail';

// Private Route Guard Component
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner"></div>
        <span>Loading your session...</span>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function Navigation() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link';

  return (
    <header className="app-header">
      <div className="container nav-container">
        <Link to="/" className="logo">
          <img src="/logo.png" alt="ShowCase Logo" className="logo-image" onError={(e) => { e.target.style.display = 'none'; }} />
          <span className="logo-text">ShowCase</span>
        </Link>
        <nav className="nav-links">
          <Link to="/" className={isActive('/')}>Discover</Link>
          {user ? (
            <>
              <Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
              <Link to={`/${user.username}`} className="nav-link" target="_blank" rel="noopener noreferrer">
                My Portfolio
              </Link>
              <button 
                onClick={logout} 
                className="btn btn-secondary btn-sm"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={isActive('/login')}>Sign In</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="app-footer">
      <div className="container">
        <p>© {new Date().getFullYear()} <strong style={{ color: 'var(--accent-color)' }}>ShowCase</strong> — Build your developer identity.</p>
        <p style={{ marginTop: '6px', fontSize: '0.8rem', opacity: 0.6 }}>
          <Link to="/" style={{ marginRight: '16px' }}>Home</Link>
          <Link to="/register" style={{ marginRight: '16px' }}>Sign Up</Link>
          <Link to="/login">Sign In</Link>
        </p>
      </div>
    </footer>
  );
}

function AppLayout() {
  return (
    <>
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
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div id="app-root-layout">
          <AppLayout />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
