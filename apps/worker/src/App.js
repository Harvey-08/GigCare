// apps/worker/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Splash from './pages/Splash';
import Register from './pages/Register';
import Login from './pages/Login';
import Home from './pages/Home';
import PoliciesList from './pages/PoliciesList';
import PolicyPurchase from './pages/PolicyPurchase';
import ClaimDetail from './pages/ClaimDetail';

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setSession(null);
      setProfile(null);
      setLoading(false);
    }
  };

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('Profile not found for session, logging out...');
          handleLogout();
          return;
        }
        throw error;
      }
      
      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err.message);
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
              {/* If logged in but no profile (trigger failed or registration incomplete), stay on a complete-profile screen or just Home */}
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
