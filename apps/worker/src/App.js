// apps/worker/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Splash from './pages/Splash';
import Register from './pages/Register';
import Login from './pages/Login';
import Home from './pages/Home';
import PoliciesList from './pages/PoliciesList';
import PolicyPurchase from './pages/PolicyPurchase';
import ClaimDetail from './pages/ClaimDetail';
import { apiClient } from './services/api';
import { getToken, clearToken } from './utils/auth';

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    fetchProfile();
  }, []);

  const handleLogout = async () => {
    clearToken();
    setSession(null);
    setProfile(null);
    setLoading(false);
  };

  const fetchProfile = async () => {
    try {
      const { data } = await apiClient.get('/auth/me');
      setProfile(data.data);
      setSession({ user: { id: data.data.id, email: data.data.email } });
    } catch (err) {
      console.error('Error fetching profile:', err);
      clearToken();
      setSession(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-indigo-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-white"></div>
        <span className="ml-4 text-xl">Initializing GigCare...</span>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {!session ? (
            <>
              <Route path="/" element={<Splash />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/" />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Home profile={profile} session={session} onLogout={handleLogout} />} />
              <Route path="/policies" element={<PoliciesList profile={profile} onLogout={handleLogout} />} />
              <Route path="/buy-policy" element={<PolicyPurchase profile={profile} onLogout={handleLogout} />} />
              <Route path="/claims/:claimId" element={<ClaimDetail onLogout={handleLogout} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </>
          )}
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
