// apps/worker/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { getToken, setToken, clearToken } from './utils/auth';
import Splash from './pages/Splash';
import Register from './pages/Register';
import Login from './pages/Login';
import Home from './pages/Home';
import PoliciesList from './pages/PoliciesList';
import PolicyPurchase from './pages/PolicyPurchase';
import ClaimDetail from './pages/ClaimDetail';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = getToken();
    if (token) {
      setIsAuthenticated(true);
      // Optionally fetch worker profile here
    }
    setLoading(false);
  }, []);

  const handleLogin = (workerData, token) => {
    setToken(token);
    setWorker(workerData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    clearToken();
    setWorker(null);
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
            <>
              <Route path="/" element={<Splash />} />
              <Route path="/register" element={<Register onLogin={handleLogin} />} />
              <Route path="/login" element={<Login onLogin={handleLogin} />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Home worker={worker} onLogout={handleLogout} />} />
              <Route path="/policies" element={<PoliciesList worker={worker} />} />
              <Route path="/buy-policy" element={<PolicyPurchase worker={worker} />} />
              <Route path="/claims/:claimId" element={<ClaimDetail />} />
            </>
          )}
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
