// apps/admin/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import TriggerPanel from './pages/TriggerPanel';

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthChange(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthChange = async (newSession) => {
    setSession(newSession);
    if (newSession) {
      await fetchAdminProfile(newSession.user.id);
    } else {
      setProfile(null);
      setLoading(false);
    }
  };

  const fetchAdminProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      if (data.role !== 'admin') {
        setAuthError('Access Denied: You do not have administrator privileges.');
        await supabase.auth.signOut();
      } else {
        setProfile(data);
        setAuthError(null);
      }
    } catch (err) {
      console.error('Error fetching admin profile:', err.message);
      setAuthError('Could not verify administrator profile.');
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-white"></div>
        <span className="ml-4 text-xl font-medium">Verifying Admin Access...</span>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <Routes>
          {!session ? (
            <Route path="*" element={<AdminLogin error={authError} />} />
          ) : (
            <>
              <Route path="/" element={<Dashboard profile={profile} onLogout={() => supabase.auth.signOut()} />} />
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
