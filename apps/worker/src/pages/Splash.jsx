// apps/worker/src/pages/Splash.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Splash() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 via-teal-800 to-teal-700 flex items-center justify-center">
      <div className="text-center px-6">
        {/* Logo */}
        <div className="mb-8">
          <div className="text-6xl font-bold text-white mb-2">🛡️</div>
          <h1 className="text-5xl font-bold text-white mb-2">GigCare</h1>
          <p className="text-xl text-teal-100">Insurance for India's Gig Workers</p>
        </div>

        {/* Value Props */}
        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-8 mb-8 max-w-md mx-auto">
          <div className="space-y-4 text-left">
            <div className="flex items-start">
              <span className="text-2xl mr-3">⚡</span>
              <div>
                <p className="font-semibold text-white">Real-time Protection</p>
                <p className="text-sm text-teal-100">Automatic payouts when bad weather hits</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-2xl mr-3">💰</span>
              <div>
                <p className="font-semibold text-white">Flexible Plans</p>
                <p className="text-sm text-teal-100">₹60-280/week based on your zone</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-2xl mr-3">🚀</span>
              <div>
                <p className="font-semibold text-white">Instant Claims</p>
                <p className="text-sm text-teal-100">No paperwork. Payouts in minutes.</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => navigate('/register')}
          className="w-full bg-white text-teal-900 font-bold py-4 rounded-lg hover:bg-gray-100 transition-colors mb-4"
        >
          Get Started
        </button>

        {/* Demo Info */}
        <p className="text-sm text-teal-200">
          Demo OTP: <span className="font-mono font-bold">123456</span>
        </p>
      </div>
    </div>
  );
}
