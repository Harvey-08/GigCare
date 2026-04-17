// apps/worker/src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import { setToken } from '../utils/auth';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requestEmail, setRequestEmail] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const requestOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      await apiClient.post('/auth/login', { email: email.trim().toLowerCase() });
      setRequestEmail(email.trim().toLowerCase());
      setStep(2);
    } catch (err) {
      console.error('Login OTP error:', err);
      setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setResendSuccess(false);

    if (!otp) {
      setError('Enter the OTP sent to your email');
      return;
    }

    try {
      setLoading(true);
      const { data } = await apiClient.post('/auth/verify-otp', {
        email: requestEmail,
        otp: otp.trim(),
      });

      setToken(data.data.token);
      window.location.href = '/';
    } catch (err) {
      console.error('OTP verify error:', err);
      setError(err.response?.data?.error || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    
    setError('');
    setResendSuccess(false);
    
    try {
      setLoading(true);
      await apiClient.post('/auth/login', { email: requestEmail });
      setResendSuccess(true);
      setResendTimer(30);
    } catch (err) {
      console.error('Resend OTP error:', err);
      setError(err.response?.data?.error || 'Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-500">Sign in to your GigCare account with email OTP</p>
        </div>

        {step === 1 ? (
          <form onSubmit={requestOtp} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                placeholder="worker@example.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                required
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 bg-indigo-600 rounded-xl text-white font-bold text-lg hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/register')}
              className="w-full text-center text-gray-500 font-medium hover:text-indigo-600 transition-colors"
            >
              New to GigCare? <span className="text-indigo-600">Create Account</span>
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-6">
            <div>
              <p className="text-sm text-slate-600 mb-2">
                Enter the OTP sent to <span className="font-semibold text-slate-900">{requestEmail}</span>
              </p>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                maxLength={6}
                required
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">
                {error}
              </div>
            )}

            {resendSuccess && (
              <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-sm text-green-600 font-medium">
                OTP Resent successfully! Check your inbox.
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 bg-indigo-600 rounded-xl text-white font-bold text-lg hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg"
            >
              {loading ? 'Verifying OTP...' : 'Verify OTP'}
            </button>

            <div className="flex flex-col space-y-3">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading || resendTimer > 0}
                className={`w-full text-center font-semibold transition-colors ${
                  resendTimer > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-700'
                }`}
              >
                {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-center text-gray-500 font-medium hover:text-indigo-600 transition-colors"
              >
                Use another email
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
