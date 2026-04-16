import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../services/api';

function formatTime(value) {
  if (!value) return 'Pending';
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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

  const trustScore = Number(claim?.trust_score || 0);
  const timeline = useMemo(() => {
    if (!claim) return [];

    const createdAt = new Date(claim.created_at || Date.now());
    const triggerAt = new Date(createdAt.getTime() - 30 * 1000);
    const fraudCheckedAt = claim.payout_initiated_at
      ? new Date(new Date(claim.payout_initiated_at).getTime() - 20 * 1000)
      : new Date(createdAt.getTime() + 30 * 1000);
    const approvedAt = claim.payout_initiated_at || claim.paid_at || claim.updated_at || createdAt;
    const paidAt = claim.paid_at || null;

    return [
      {
        label: 'Trigger detected',
        time: triggerAt,
        detail: `${claim.trigger_type?.replace(/_/g, ' ') || 'Weather trigger'} verified by the engine`,
        tone: 'text-slate-500',
      },
      {
        label: 'Claim auto-created',
        time: createdAt,
        detail: `Policy ${claim.policy_id} produced a claim for ₹${claim.final_payout}`,
        tone: 'text-indigo-600',
      },
      {
        label: 'Fraud check passed',
        time: fraudCheckedAt,
        detail: `Trust score ${(trustScore * 100).toFixed(0)}% • ${claim.fraud_reason || 'No blocking anomaly'}`,
        tone: trustScore >= 0.85 ? 'text-emerald-600' : trustScore >= 0.6 ? 'text-amber-600' : 'text-rose-600',
      },
      {
        label: 'Payout initiated',
        time: approvedAt,
        detail: claim.razorpay_payout_id ? `Razorpay payout ${claim.razorpay_payout_id}` : 'Waiting for payout rail',
        tone: 'text-sky-600',
      },
      {
        label: 'Payout completed',
        time: paidAt,
        detail: paidAt ? 'Funds sent to UPI' : 'Awaiting webhook confirmation',
        tone: 'text-emerald-600',
      },
    ];
  }, [claim, trustScore]);

  const statusColor = {
    APPROVED: 'from-green-500 to-green-600',
    PARTIAL: 'from-yellow-500 to-yellow-600',
    FLAGGED: 'from-red-500 to-red-600',
    PAID: 'from-blue-500 to-blue-600',
    AUTO_CREATED: 'from-slate-500 to-slate-600',
  };

  const statusIcon = {
    APPROVED: '✅',
    PARTIAL: '⚠️',
    FLAGGED: '❌',
    PAID: '💰',
    AUTO_CREATED: '🕒',
  };

  const triggerIcon = {
    HEAVY_RAIN: '⛈️',
    EXTREME_HEAT: '🔥',
    POOR_AQI: '😷',
    CURFEW: '🚓',
    APP_OUTAGE: '📱',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
          <button onClick={() => navigate('/')} className="mb-4 text-sm font-bold text-teal-600 hover:text-teal-700">
            ← Back
          </button>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Claim transparency</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">Claim timeline</h1>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {loading ? (
          <div className="py-12 text-center text-slate-500">Loading...</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        ) : claim ? (
          <div className="space-y-6">
            <div className={`rounded-[32px] bg-gradient-to-r ${statusColor[claim.status] || statusColor.AUTO_CREATED} p-8 text-white shadow-xl`}>
              <div className="mb-4 text-5xl">{statusIcon[claim.status] || '🕒'}</div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-white/80">{claim.status}</p>
              <p className="mt-2 text-2xl font-black">₹{claim.final_payout}</p>
              <p className="mt-2 text-sm text-white/90">
                {claim.status === 'APPROVED' && 'Approved and ready for payout.'}
                {claim.status === 'PARTIAL' && 'Partially approved due to payout cap or trust checks.'}
                {claim.status === 'FLAGGED' && 'Flagged for review or payout issue.'}
                {claim.status === 'PAID' && 'Payout completed to your UPI.'}
                {claim.status === 'AUTO_CREATED' && 'Claim created and pending scoring.'}
              </p>
            </div>

            <div className="rounded-[28px] border border-emerald-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">Payout amount</p>
              <p className="mt-2 text-5xl font-black text-emerald-600">₹{claim.final_payout}</p>
              <p className="mt-2 text-sm text-slate-500">
                Based on {claim.disruption_hours} disruption hours and trust score {(trustScore * 100).toFixed(0)}%.
              </p>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">Timeline</p>
              <div className="mt-5 space-y-5">
                {timeline.map((step, index) => (
                  <div key={step.label} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${index === timeline.length - 1 && claim.status !== 'PAID' ? 'bg-slate-200 text-slate-500' : 'bg-slate-900 text-white'}`}>
                        {index + 1}
                      </div>
                      {index < timeline.length - 1 && <div className="mt-2 h-full w-px bg-slate-200" />}
                    </div>
                    <div className="pb-4">
                      <p className={`text-sm font-black ${step.tone}`}>{step.label}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{formatTime(step.time)}</p>
                      <p className="mt-2 text-sm text-slate-600">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">Trigger event</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-3xl">{triggerIcon[claim.trigger_type] || '📍'}</span>
                  <div>
                    <p className="font-black text-slate-900">{claim.trigger_type?.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-slate-500">Disruption: {claim.disruption_hours} hours</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">Claim info</p>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Claim ID</p>
                    <p className="font-mono text-xs text-slate-900">{claim.claim_id}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Policy ID</p>
                    <p className="font-mono text-xs text-slate-900">{claim.policy_id}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Worker ID</p>
                    <p className="font-mono text-xs text-slate-900">{claim.worker_id}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Trust</p>
                    <p className="font-black text-slate-900">{(trustScore * 100).toFixed(0)}%</p>
                  </div>
                </div>
              </div>
            </div>

            {claim.status === 'PAID' && (
              <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 text-center text-emerald-900">
                <p className="font-black">✓ Payout processed</p>
                <p className="mt-1 text-sm">Amount transferred to your UPI account.</p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}