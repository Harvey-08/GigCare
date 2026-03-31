// apps/worker/src/pages/Home.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';

export default function Home({ worker, onLogout }) {
  const navigate = useNavigate();
  const [policies, setPolicies] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [policiesRes, claimsRes] = await Promise.all([
        apiClient.get(`/policies/worker/${worker?.id}`),
        apiClient.get(`/claims/worker/${worker?.id}`),
      ]);
      setPolicies(policiesRes.data.data || []);
      setClaims(claimsRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const activePolicy = policies.find((p) => p.status === 'ACTIVE');
  const recentClaims = claims.slice(0, 3);

  const statusColor = {
    APPROVED: 'bg-green-50 border-green-200 text-green-900',
    PARTIAL: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    FLAGGED: 'bg-red-50 border-red-200 text-red-900',
    PAID: 'bg-blue-50 border-blue-200 text-blue-900',
  };

  const statusBadge = {
    APPROVED: 'inline-block px-2 py-1 bg-green-200 text-green-800 text-xs font-semibold rounded',
    PARTIAL: 'inline-block px-2 py-1 bg-yellow-200 text-yellow-800 text-xs font-semibold rounded',
    FLAGGED: 'inline-block px-2 py-1 bg-red-200 text-red-800 text-xs font-semibold rounded',
    PAID: 'inline-block px-2 py-1 bg-blue-200 text-blue-800 text-xs font-semibold rounded',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">GigCare</h1>
            <p className="text-sm text-gray-600">Welcome, {worker?.name}</p>
          </div>
          <button
            onClick={onLogout}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Active Policy Card */}
        {activePolicy ? (
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-lg p-6 text-white">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium opacity-90">Active Policy</p>
                <p className="text-2xl font-bold">₹{activePolicy.weekly_premium_rupees}/week</p>
              </div>
              <span className="inline-block px-3 py-1 bg-white bg-opacity-20 text-sm font-semibold rounded">
                {activePolicy.coverage_tier}
              </span>
            </div>
            <div className="text-sm space-y-1">
              <p>Max Payout: ₹{activePolicy.max_payout_rupees}</p>
              <p>Zone: {activePolicy.zone_id}</p>
              <p>Expires: {new Date(activePolicy.expiry_date).toLocaleDateString()}</p>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <p className="text-blue-900 font-semibold mb-4">No active policy</p>
            <button
              onClick={() => navigate('/buy-policy')}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              Get Started
            </button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/policies')}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <span className="text-2xl mb-2 block">📋</span>
            <p className="text-sm font-medium text-gray-900">My Policies</p>
            <p className="text-xs text-gray-500">{policies.length} total</p>
          </button>

          <button
            onClick={() => navigate('/buy-policy')}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <span className="text-2xl mb-2 block">➕</span>
            <p className="text-sm font-medium text-gray-900">New Policy</p>
            <p className="text-xs text-gray-500">Get coverage</p>
          </button>
        </div>

        {/* Recent Claims */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Claims</h2>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : recentClaims.length === 0 ? (
            <div className="bg-gray-100 rounded-lg p-6 text-center text-gray-600">
              No claims yet. Your first claim will appear here.
            </div>
          ) : (
            <div className="space-y-3">
              {recentClaims.map((claim) => (
                <div
                  key={claim.id}
                  onClick={() => navigate(`/claims/${claim.id}`)}
                  className={`border-2 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${statusColor[claim.status]}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold mb-1">{claim.trigger_type.replace(/_/g, ' ')}</p>
                      <p className="text-sm opacity-75">
                        {new Date(claim.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={statusBadge[claim.status]}>
                        {claim.status}
                      </span>
                      <p className="text-lg font-bold mt-1">₹{claim.payout_amount}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
