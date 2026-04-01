// apps/admin/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { getAdminToken, setAdminToken, clearAdminToken } from './utils/auth';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import TriggerPanel from './pages/TriggerPanel';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAdminToken();
    if (token) {
      setIsAuthenticated(true);
      // In real app, would fetch admin profile here
    }
    setLoading(false);
  }, []);

  const handleLogin = (adminData, token) => {
    setAdminToken(token);
    setAdmin(adminData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    clearAdminToken();
    setAdmin(null);
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-xl font-semibold text-gray-700">Loading...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {!isAuthenticated ? (
            <Route path="/" element={<AdminLogin onLogin={handleLogin} />} />
          ) : (
            <>
              <Route path="/" element={<Dashboard admin={admin} onLogout={handleLogout} />} />
              <Route path="/trigger" element={<TriggerPanel />} />
            </>
          )}
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
