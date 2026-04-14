// apps/admin/src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';

export default function Dashboard({ admin, onLogout }) {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchDashboard();
    const interval = autoRefresh ? setInterval(fetchDashboard, 5000) : null;
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchDashboard = async () => {
    try {
      const [dashRes, claimsRes] = await Promise.all([
        apiClient.get('/admin/dashboard'),
        apiClient.get('/admin/claims'),
      ]);
      setDashboard(dashRes.data.data);
      setClaims(claimsRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = {
    APPROVED: 'bg-green-100 text-green-800',
    PARTIAL: 'bg-yellow-100 text-yellow-800',
    FLAGGED: 'bg-red-100 text-red-800',
    PAID: 'bg-blue-100 text-blue-800',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-600">GigCare Operations</p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-gray-700">Auto-refresh</span>
            </label>
            <button
              onClick={onLogout}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading && !dashboard ? (
          <div className="text-center py-12 text-gray-500">Loading dashboard...</div>
        ) : dashboard ? (
          <>
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <p className="text-gray-600 text-sm font-medium">Loss Ratio</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{dashboard?.loss_ratio_percent || 0}%</p>
                <p className="text-xs text-gray-500 mt-1">Payouts vs Premiums</p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <p className="text-gray-600 text-sm font-medium">Total Premiums</p>
                <p className="text-3xl font-bold text-teal-600 mt-2">₹{dashboard?.total_premiums_collected || 0}</p>
                <p className="text-xs text-gray-500 mt-1">All active policies</p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <p className="text-gray-600 text-sm font-medium">Total Payouts</p>
                <p className="text-3xl font-bold text-green-600 mt-2">₹{dashboard?.total_payouts || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Claim disbursements</p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <p className="text-gray-600 text-sm font-medium">Claims Today</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{dashboard?.claims_today || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Last 24 hours</p>
              </div>
            </div>

            {/* Trigger & Claims Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Claims by Status */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <p className="text-lg font-bold text-gray-900 mb-4">Claims by Status</p>
                <div className="space-y-3">
                  {dashboard.claims_by_status && Object.entries(dashboard.claims_by_status).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${statusBadge[status]}`}>
                          {status}
                        </span>
                      </div>
                      <span className="text-xl font-bold text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <p className="text-lg font-bold text-gray-900 mb-4">Quick Actions</p>
                <button
                  onClick={() => navigate('/trigger')}
                  className="w-full bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 font-semibold mb-3"
                >
                  🚀 Fire Trigger Event
                </button>
                <button
                  onClick={fetchDashboard}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold"
                >
                  🔄 Refresh Now
                </button>
              </div>
            </div>

            {/* Recent Claims */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <p className="text-lg font-bold text-gray-900">Recent Claims ({claims.length})</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Claim ID</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Worker</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Trigger</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Payout</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Trust</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {claims.slice(0, 10).map((claim) => (
                      <tr key={claim.claim_id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm font-mono text-gray-600">{claim.claim_id?.slice(0, 8) || 'N/A'}...</td>
                        <td className="px-6 py-3 text-sm text-gray-900">{claim.worker_id || '—'}</td>
                        <td className="px-6 py-3 text-sm text-gray-900">{claim.trigger_type}</td>
                        <td className="px-6 py-3 text-sm font-bold text-green-600">₹{claim.final_payout}</td>
                        <td className="px-6 py-3 text-sm">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${statusBadge[claim.status]}`}>
                            {claim.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 bg-teal-600 rounded-full"
                              style={{ width: `${(claim.trust_score || 0.5) * 100}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
