// apps/admin/src/pages/AdminLogin.jsx
import React, { useState } from 'react';
import { apiClient } from '../services/api';

export default function AdminLogin({ onLogin }) {
  const [formData, setFormData] = useState({
    phone: '9876543210',
    otp: '123456',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      
      // Call real admin login endpoint
      const response = await apiClient.post('/auth/admin-login', {
        phone: formData.phone,
        otp: formData.otp,
      });

      const { data: adminData, meta } = response.data;
      const { token, ...admin } = adminData;

      // Store token and login
      localStorage.setItem('admin_token', token);
      onLogin(admin, token);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Login failed';
      setError(errorMessage);
      
      // Show demo credentials hint
      if (errorMessage.includes('not found') || errorMessage.includes('Invalid')) {
        setError('Demo credentials: Phone: 9876543210, OTP: 123456');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚙️</div>
          <h1 className="text-2xl font-bold text-gray-900">GigCare Admin</h1>
          <p className="text-sm text-gray-600 mt-2">Dashboard Access</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="9876543210"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OTP
            </label>
            <input
              type="text"
              value={formData.otp}
              onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
              placeholder="123456"
              maxLength="6"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-600 focus:border-transparent text-2xl tracking-widest"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white font-medium hover:bg-slate-800 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Access Dashboard'}
          </button>
        </form>

        {/* Demo Note */}
        <p className="text-xs text-center text-gray-500 mt-6">
          Demo: Phone <span className="font-mono">9876543210</span>, OTP <span className="font-mono">123456</span>
        </p>
      </div>
    </div>
  );
}
