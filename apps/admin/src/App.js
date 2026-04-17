// apps/admin/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getAdminToken, clearAdminToken } from './utils/auth';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import TriggerPanel from './pages/TriggerPanel';

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verifySession();
  }, []);

  const verifySession = () => {
    const token = getAdminToken();
    if (!token) {
      handleAuthChange(null);
      return;
    }

    try {
      // Decode JWT payload without verifying signature (backend verifies it)
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      // Check expiration
      if (payload.exp * 1000 < Date.now()) {
        clearAdminToken();
        handleAuthChange(null);
        return;
      }
      
      handleAuthChange({
        token,
        user: { id: payload.user_id, email: payload.email, role: payload.role },
      });
    } catch (e) {
      console.error("Invalid token:", e);
      clearAdminToken();
      handleAuthChange(null);
    }
  };

  const handleAuthChange = (newSession) => {
    setSession(newSession);
    if (newSession) {
      setProfile(newSession.user);
    } else {
      setProfile(null);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    clearAdminToken();
    handleAuthChange(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-white"></div>
        <span className="ml-4 text-xl font-medium">Initializing Admin Interface...</span>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <Routes>
          {!session ? (
            <Route path="*" element={<AdminLogin />} />
          ) : (
            <>
              <Route path="/" element={<Dashboard profile={profile} onLogout={handleLogout} />} />
              <Route path="/trigger" element={<TriggerPanel />} />
              <Route path="*" element={<Navigate to="/" />} />
            </>
          )}
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
