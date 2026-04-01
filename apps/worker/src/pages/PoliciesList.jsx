// apps/worker/src/pages/PoliciesList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';

export default function PoliciesList({ worker }) {
  const navigate = useNavigate();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/policies/worker/${worker?.worker_id}`);
      setPolicies(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch policies:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = {
    ACTIVE: 'bg-green-50 border-green-200',
    PENDING_PAYMENT: 'bg-yellow-50 border-yellow-200',
    EXPIRED: 'bg-gray-50 border-gray-200',
  };

  const statusBadge = {
    ACTIVE: 'bg-green-200 text-green-800',
    PENDING_PAYMENT: 'bg-yellow-200 text-yellow-800',
    EXPIRED: 'bg-gray-200 text-gray-800',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <button onClick={() => navigate('/')} className="text-teal-600 font-medium mb-4">
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">My Policies</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading policies...</div>
        ) : policies.length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <p className="text-gray-700 mb-4">No policies yet</p>
            <button
              onClick={() => navigate('/buy-policy')}
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              Get Started
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {policies.map((policy) => (
              <div
                key={policy.policy_id}
                className={`border-2 rounded-lg p-4 ${statusColor[policy.status]}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{policy.coverage_tier}</p>
                    <p className="text-sm text-gray-600">
                      Premium: ₹{policy.premium_paid}
                    </p>
                  </div>
                  <span className={`inline-block px-3 py-1 rounded text-xs font-semibold ${statusBadge[policy.status]}`}>
                    {policy.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-600">Week Start</p>
                    <p className="text-sm font-semibold text-gray-900">{new Date(policy.week_start).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Max Payout</p>
                    <p className="text-lg font-bold text-gray-900">₹{policy.max_payout}</p>
                  </div>
                </div>

                <div className="text-xs text-gray-600 space-y-1 border-t border-gray-200 pt-3">
                  <p>Created: {new Date(policy.created_at).toLocaleDateString()}</p>
                  <p>Expires: {new Date(policy.week_end).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
