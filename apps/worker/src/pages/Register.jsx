// apps/worker/src/pages/Register.jsx
import React, { useState } from 'react';
import { apiClient } from '../services/api';

export default function Register({ onLogin }) {
  const [step, setStep] = useState(1); // 1: Phone, 2: OTP, 3: Profile
  const [formData, setFormData] = useState({
    phone: '',
    otp: '',
    name: '',
    platform: 'ZOMATO',
    zone_id: 'zone_01',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const ZONES = [
    { id: 'zone_01', name: 'Koramangala' },
    { id: 'zone_02', name: 'Whitefield' },
    { id: 'zone_03', name: 'Indiranagar' },
    { id: 'zone_04', name: 'HSR Layout' },
    { id: 'zone_05', name: 'Bommanahalli' },
  ];

  const PLATFORMS = ['ZOMATO', 'SWIGGY', 'ZEPTO', 'AMAZON'];

  const handleNext = async (e) => {
    e.preventDefault();
    setError('');

    if (step === 1) {
      // Validate phone
      if (!formData.phone || formData.phone.length < 10) {
        setError('Enter a valid 10-digit phone number');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Verify OTP
      if (!formData.otp || formData.otp.length < 6) {
        setError('Enter a valid 6-digit OTP');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      // Register
      try {
        setLoading(true);
        const response = await apiClient.post('/auth/register', {
          phone: formData.phone,
          name: formData.name,
          platform: formData.platform,
          zone_id: formData.zone_id,
        });

        const { token, worker } = response.data.data;
        onLogin(worker, token);
      } catch (err) {
        setError(err.response?.data?.error || 'Registration failed');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="text-sm text-gray-600 mb-2">Step {step} of 3</div>
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  s <= step ? 'bg-teal-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {step === 1 && 'Enter Your Phone'}
          {step === 2 && 'Verify OTP'}
          {step === 3 && 'Complete Profile'}
        </h1>

        {/* Form */}
        <form onSubmit={handleNext} className="space-y-4">
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="9876543210"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 mt-4">
                We'll send you a one-time password to verify your number.
              </p>
            </>
          )}

          {step === 2 && (
            <>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-2xl tracking-widest"
                />
              </div>
              <p className="text-xs text-gray-500 mt-4">
                Demo: Use <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">123456</span>
              </p>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platform
                </label>
                <select
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operating Zone
                </label>
                <select
                  value={formData.zone_id}
                  onChange={(e) => setFormData({ ...formData, zone_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  {ZONES.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            {step > 1 && (
              <button
                type="button"
                onClick={handleGoBack}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
                disabled={loading}
              >
                Back
              </button>
            )}
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-teal-600 rounded-lg text-white font-medium hover:bg-teal-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Loading...' : step === 3 ? 'Complete' : 'Next'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
