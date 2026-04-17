// apps/admin/src/pages/AdminLogin.jsx
import React, { useState } from 'react';
import { apiClient } from '../services/api';
import { setAdminToken } from '../utils/auth';

export default function AdminLogin({ error: authError }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(authError || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter your admin credentials');
      return;
    }

    try {
      setLoading(true);
      const res = await apiClient.post('/admin/login', { email, password });
      
      const { token } = res.data.data;
      setAdminToken(token);
      
      // Force reload to apply session
      window.location.href = '/';
    } catch (err) {
      console.error('Admin login error:', err);
      setError(err.response?.data?.error || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-10">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-indigo-600/10 text-indigo-500 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">GigCare Control</h1>
          <p className="text-slate-400">Institutional Dashboard Access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Admin Email</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value.toLowerCase())}
              placeholder="gigcare@admin.com"
              className="w-full px-4 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
              required
            />
          </div>

          {(error || authError) && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 font-medium text-center">
              {error || authError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-4 bg-indigo-600 rounded-xl text-white font-bold text-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-900/20"
          >
            {loading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
            <p className="text-xs text-yellow-500/80 font-bold uppercase tracking-wider">
                Demo Authentication System
            </p>
        </div>
      </div>
    </div>
  );
}
