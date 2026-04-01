// apps/worker/src/pages/PolicyPurchase.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';

export default function PolicyPurchase({ worker }) {
  const navigate = useNavigate();
  const [premium, setPremium] = useState(null);
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(worker?.zone_id || 'zone_01');
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchZones();
  }, []);

  useEffect(() => {
    if (selectedZone) {
      fetchPremium();
    }
  }, [selectedZone]);

  const fetchZones = async () => {
    try {
      const res = await apiClient.get('/zones');
      setZones(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch zones:', err.message);
    }
  };

  const fetchPremium = async () => {
    try {
      setLoading(true);
      setError('');
      const now = new Date();
      const weekStart = new Date(now.getTime() - now.getDay() * 24 * 60 * 60 * 1000);
      
      const res = await apiClient.post('/premiums/calculate', {
        zone_id: selectedZone,
        week_start: weekStart.toISOString().split('T')[0],
      });

      setPremium(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to calculate premium');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!premium) return;

    try {
      setPurchasing(true);
      setError('');

      // Step 1: Create policy
      const policyRes = await apiClient.post('/policies', {
        quote_id: premium.quote_id,
        coverage_tier: premium.coverage_tier,
      });

      const policyId = policyRes.data.data.id;

      // Step 2: Simulate Razorpay payment
      await apiClient.post(`/policies/${policyId}/activate`);

      // Success
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to purchase policy');
    } finally {
      setPurchasing(false);
    }
  };

  const tierInfo = {
    SEED: { color: 'from-blue-500 to-blue-600', triggers: 1, maxPayout: 600 },
    STANDARD: { color: 'from-green-500 to-green-600', triggers: 2, maxPayout: 1200 },
    PREMIUM: { color: 'from-purple-500 to-purple-600', triggers: 3, maxPayout: 1800 },
  };

  const zone = zones.find((z) => z.zone_id === selectedZone);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <button onClick={() => navigate('/')} className="text-teal-600 font-medium mb-4">
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Get Insurance</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Zone Selector */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Select Your Zone
          </label>
          <div className="grid grid-cols-2 gap-3">
            {zones.map((z) => (
              <button
                key={z.zone_id}
                onClick={() => setSelectedZone(z.zone_id)}
                className={`p-3 rounded-lg border-2 transition-colors text-left ${
                  selectedZone === z.zone_id
                    ? 'border-teal-600 bg-teal-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <p className="font-semibold text-sm text-gray-900">{z.name}</p>
                <p className="text-xs text-gray-500">Risk: {z.zone_risk_score.toFixed(2)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Premium Display */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Calculating premium...</div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        ) : premium ? (
          <>
            {/* Zone Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Zone Risk Level</p>
              <p className="text-lg font-semibold text-gray-900">{premium.zone_risk_level}</p>
              <p className="text-xs text-gray-500 mt-1">
                Based on weather, AQI, and historical patterns
              </p>
            </div>

            {/* Coverage Tier */}
            <div className={`bg-gradient-to-r ${tierInfo[premium.coverage_tier]?.color} rounded-lg p-6 text-white`}>
              <p className="text-sm font-medium opacity-90 mb-2">Recommended Coverage</p>
              <p className="text-4xl font-bold">₹{premium.premium_rupees}</p>
              <p className="text-sm opacity-90 mt-2">{premium.coverage_tier}</p>
            </div>

            {/* Plan Details */}
            <div className="space-y-3">
              {['SEED', 'STANDARD', 'PREMIUM'].map((tier) => (
                <div
                  key={tier}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                    premium.coverage_tier === tier
                      ? 'border-teal-600 bg-teal-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{tier}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Covers: Heavy Rain, Extreme Heat, Poor AQI
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        ₹{tier === 'SEED' ? 80 : tier === 'STANDARD' ? 162 : 220}
                      </p>
                      <p className="text-xs text-gray-500">
                        Max: ₹{tier === 'SEED' ? 600 : tier === 'STANDARD' ? 1200 : 1800}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Breakdown */}
            <div className="bg-gray-100 rounded-lg p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Premium Breakdown</p>
              <div className="space-y-2 text-sm">
                {premium.breakdown && Object.entries(premium.breakdown).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-gray-700">
                    <span>{key.replace(/_/g, ' ')}:</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Purchase Button */}
            <button
              onClick={handlePurchase}
              disabled={purchasing}
              className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50"
            >
              {purchasing ? 'Processing...' : 'Buy Policy'}
            </button>

            {/* Simulation Note */}
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
              ℹ️ Demo mode: Payment is simulated. In production, you'll be redirected to Razorpay.
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
