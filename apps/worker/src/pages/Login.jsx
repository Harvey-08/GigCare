// apps/worker/src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    phone: '',
    otp: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.phone || formData.phone.length < 10) {
      setError('Enter a valid 10-digit phone number');
      return;
    }

    if (!formData.otp || formData.otp.length < 6) {
      setError('Enter a valid 6-digit OTP');
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.post('/auth/login', {
        phone: formData.phone.startsWith('+91') ? formData.phone : `+91${formData.phone}`,
        otp: formData.otp,
      });

      const { token, worker_id } = response.data.data;
      
      // Fetch profile to get name/details for handleLogin
      const profileRes = await apiClient.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      onLogin(profileRes.data.data, token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check phone and OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Worker Sign In</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="9876543210"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              One-Time Password
            </label>
            <input
              type="text"
              value={formData.otp}
              onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
              placeholder="123456"
              maxLength="6"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-2xl tracking-widest"
            />
            <p className="text-xs text-gray-500 mt-2">
              Demo: Use <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">123456</span>
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              className="w-full px-4 py-3 bg-teal-600 rounded-lg text-white font-bold hover:bg-teal-700 disabled:opacity-50 transition-colors"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="w-full px-4 py-2 text-teal-700 font-medium hover:underline"
              disabled={loading}
            >
              Don't have an account? Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
