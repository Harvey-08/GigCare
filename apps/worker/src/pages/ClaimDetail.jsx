// apps/worker/src/pages/ClaimDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';

export default function ClaimDetail() {
  const { claimId } = useParams();
  const navigate = useNavigate();
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchClaim();
  }, [claimId]);

  const fetchClaim = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/claims/${claimId}`);
      setClaim(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load claim');
    } finally {
      setLoading(false);
    }
  };

  const statusColor = {
    APPROVED: 'from-green-500 to-green-600',
    PARTIAL: 'from-yellow-500 to-yellow-600',
    FLAGGED: 'from-red-500 to-red-600',
    PAID: 'from-blue-500 to-blue-600',
  };

  const statusIcon = {
    APPROVED: '✅',
    PARTIAL: '⚠️',
    FLAGGED: '❌',
    PAID: '💰',
  };

  const triggerIcon = {
    HEAVY_RAIN: '☔',
    EXTREME_HEAT: '🔥',
    POOR_AQI: '😷',
    CURFEW: '🚓',
    APP_OUTAGE: '📱',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <button onClick={() => navigate('/')} className="text-teal-600 font-medium mb-4">
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Claim Details</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        ) : claim ? (
          <div className="space-y-6">
            {/* Status Card */}
            <div className={`bg-gradient-to-r ${statusColor[claim.status]} rounded-lg p-8 text-white text-center`}>
              <p className="text-5xl mb-3">{statusIcon[claim.status]}</p>
              <p className="text-lg font-semibold mb-1">{claim.status}</p>
              <p className="text-sm opacity-90">
                {claim.status === 'APPROVED' && 'Your claim has been approved'}
                {claim.status === 'PARTIAL' && 'Your claim has been partially approved'}
                {claim.status === 'FLAGGED' && 'Your claim is under review'}
                {claim.status === 'PAID' && 'Your claim has been paid'}
              </p>
            </div>

            {/* Payout Amount - CRITICAL FOR 4-STAR */}
            <div className="bg-white rounded-lg p-6 border-2 border-green-200">
              <p className="text-sm font-medium text-gray-600 mb-2">Payout Amount</p>
              <p className="text-5xl font-bold text-green-600">₹{claim.final_payout}</p>
              <p className="text-xs text-gray-500 mt-2">
                Based on disruption hours ({claim.disruption_hours}h), zone risk, and trust score ({(claim.trust_score * 100).toFixed(0)}%)
              </p>
            </div>

            {/* Trigger Event */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-4">Trigger Event</p>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{triggerIcon[claim.trigger_type]}</span>
                <div>
                  <p className="font-semibold text-gray-900">{claim.trigger_type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-500">
                    Disruption: {claim.disruption_hours} hours
                  </p>
                </div>
              </div>
            </div>

            {/* Trust Score */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <p className="text-sm font-semibold text-gray-700 mb-3">Trust Score Analysis</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Your Trust Score:</span>
                  <span className={`text-lg font-bold ${
                    claim.trust_score >= 0.85 ? 'text-green-600' :
                    claim.trust_score >= 0.60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {(claim.trust_score * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      claim.trust_score >= 0.85 ? 'bg-green-600' :
                      claim.trust_score >= 0.60 ? 'bg-yellow-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${claim.trust_score * 100}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-3">
                Trust score is calculated based on GPS accuracy, claim timing, and your history.
              </p>
            </div>

            {/* Claim Details */}
            <div className="bg-white rounded-lg p-6 border border-gray-200 space-y-3">
              <p className="text-sm font-semibold text-gray-700 mb-3">Claim Information</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">Claim ID</p>
                  <p className="font-mono text-gray-900">{claim.claim_id}</p>
                </div>
                <div>
                  <p className="text-gray-600">Date</p>
                  <p className="text-gray-900">{new Date(claim.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Policy ID</p>
                  <p className="text-gray-900">{claim.policy_id}</p>
                </div>
                <div>
                  <p className="text-gray-600">Worker ID</p>
                  <p className="text-gray-900">{claim.worker_id}</p>
                </div>
              </div>
            </div>

            {/* Payment Status */}
            {claim.status === 'PAID' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-green-900 font-semibold">✓ Payout Processed</p>
                <p className="text-xs text-green-800 mt-1">Amount transferred to your account</p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
