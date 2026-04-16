import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';

function MetricCard({ label, value, note, accent }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-black ${accent}`}>{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{note}</p>
    </div>
  );
}

export default function Home({ profile, session, onLogout }) {
  const navigate = useNavigate();
  const [policies, setPolicies] = useState([]);
  const [claims, setClaims] = useState([]);
  const [incomeRecovery, setIncomeRecovery] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [zoneStatus, setZoneStatus] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const workerId = profile?.id || session?.user?.id;

      const [policiesRes, claimsRes] = await Promise.all([
        apiClient.get(`/policies/worker/${workerId}`),
        apiClient.get(`/claims/worker/${workerId}`),
      ]);

      const policiesData = policiesRes.data.data || [];
      const activePolicy = policiesData.find((policy) => policy.status === 'ACTIVE');
      const zoneId = profile?.zone_id || activePolicy?.zone_id || policiesData[0]?.zone_id;

      const [recoveryRes, eligibilityRes, zoneStatusRes, forecastRes] = await Promise.all([
        apiClient.get(`/workers/${workerId}/income-recovery`),
        apiClient.get(`/workers/${workerId}/eligibility`),
        zoneId ? apiClient.get(`/zones/${zoneId}/status`) : Promise.resolve({ data: { data: null } }),
        zoneId ? apiClient.get(`/zones/${zoneId}/forecast`) : Promise.resolve({ data: { data: null } }),
      ]);

      setPolicies(policiesData);
      setClaims(claimsRes.data.data || []);
      setIncomeRecovery(recoveryRes.data.data || null);
      setEligibility(eligibilityRes.data.data || null);
      setZoneStatus(zoneStatusRes.data.data || null);
      setForecast(forecastRes.data.data || null);
    } catch (err) {
      console.error('Failed to fetch data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const activePolicy = policies.find((policy) => policy.status === 'ACTIVE');
  const recentClaims = claims.slice(0, 5);
  const daysRemaining = activePolicy
    ? Math.max(0, Math.ceil((new Date(activePolicy.week_end) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  const statusBadge = {
    APPROVED: 'bg-emerald-100 text-emerald-700',
    PARTIAL: 'bg-amber-100 text-amber-700',
    FLAGGED: 'bg-rose-100 text-rose-700',
    PAID: 'bg-indigo-100 text-indigo-700',
    AUTO_CREATED: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <div className="sticky top-0 z-10 border-b border-white/60 bg-white/90 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-black tracking-tight text-indigo-700">GIGCARE</h1>
            <p className="text-sm font-medium text-slate-500">{profile?.full_name || session?.user?.email}</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/policies')}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-slate-600 transition-colors hover:border-indigo-200 hover:text-indigo-700"
            >
              Policies
            </button>
            <button
              onClick={onLogout}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-rose-600"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        {zoneStatus?.locked && (
          <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-700">Enrollment lock active</p>
            <p className="mt-2 text-sm font-medium">{zoneStatus.reason}</p>
          </div>
        )}

        {activePolicy ? (
          <div className="rounded-[36px] bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-8 text-white shadow-xl shadow-indigo-100">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-indigo-100 text-[10px] font-black uppercase tracking-[0.35em] mb-2">Active Coverage</p>
                <p className="text-4xl font-black">₹{activePolicy.premium_paid}<span className="text-lg font-normal opacity-60">/wk</span></p>
                <p className="mt-3 max-w-xl text-sm text-indigo-100/90">{daysRemaining !== null ? `${daysRemaining} days left on your current protection.` : 'Your current weekly protection is active.'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 rounded-[28px] bg-white/10 p-5 backdrop-blur-sm">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-100/70">Max payout</p>
                  <p className="mt-1 text-xl font-black">₹{activePolicy.max_payout}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-100/70">Zone</p>
                  <p className="mt-1 text-xl font-black">{profile?.zone_id || activePolicy.zone_id || 'Live'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-100/70">Status</p>
                  <p className="mt-1 text-xl font-black">{activePolicy.status}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-100/70">Valid until</p>
                  <p className="mt-1 text-xl font-black">{new Date(activePolicy.week_end).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[36px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-2xl">🛡️</div>
            <h3 className="text-lg font-bold text-slate-900">No active coverage</h3>
            <p className="mt-2 text-sm text-slate-500">Protect your earnings from weather disruptions.</p>
            <button
              onClick={() => navigate('/buy-policy')}
              className="mt-6 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-indigo-700"
            >
              Get Covered Now
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Recovered This Month"
            value={`₹${incomeRecovery?.total_paid?.toLocaleString?.() || 0}`}
            note={`${incomeRecovery?.claims_count || 0} paid claims this month`}
            accent="text-emerald-600"
          />
          <MetricCard
            label="SS Code Progress"
            value={`${eligibility?.days_worked || 0}/${eligibility?.threshold || 90}`}
            note={eligibility?.eligible ? 'Eligible for policy purchase' : `${eligibility?.days_remaining || 0} days remaining`}
            accent={eligibility?.eligible ? 'text-emerald-600' : 'text-amber-600'}
          />
          <MetricCard
            label="Zone Status"
            value={zoneStatus?.locked ? 'Paused' : 'Active'}
            note={zoneStatus?.locked ? 'Enrollment is temporarily locked' : `Rain ${zoneStatus?.expected_rain_mm || 0}mm expected`}
            accent={zoneStatus?.locked ? 'text-amber-600' : 'text-indigo-600'}
          />
          <MetricCard
            label="Forecast Premium"
            value={`₹${forecast?.premium_estimate || 0}`}
            note={forecast?.forecast_message || 'Forecast data unavailable'}
            accent="text-sky-600"
          />
        </div>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[36px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Claims history</p>
                <h2 className="text-2xl font-black tracking-tight text-slate-900">Recent claim activity</h2>
              </div>
              <button
                onClick={() => navigate('/buy-policy')}
                className="rounded-xl bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-white transition-colors hover:bg-indigo-700"
              >
                Renew Now
              </button>
            </div>

            {loading ? (
              <div className="py-10 text-center text-sm font-medium text-slate-400">Loading claim activity...</div>
            ) : recentClaims.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                No claims reported yet.
              </div>
            ) : (
              <div className="space-y-4">
                {recentClaims.map((claim) => (
                  <div
                    key={claim.claim_id}
                    onClick={() => navigate(`/claims/${claim.claim_id}`)}
                    className="cursor-pointer rounded-[28px] border border-slate-100 bg-slate-50 p-5 transition-all hover:border-indigo-200 hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl shadow-sm border border-slate-100">
                          {claim.trigger_type === 'HEAVY_RAIN' ? '⛈️' : claim.trigger_type === 'EXTREME_HEAT' ? '🔥' : '😷'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{claim.trigger_type.replace(/_/g, ' ')}</p>
                          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                            {new Date(claim.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </p>
                          {claim.fraud_reason && (
                            <p className="mt-2 max-w-xl text-xs text-slate-500">{claim.fraud_reason}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${statusBadge[claim.status]}`}>
                          {claim.status.replace('_', ' ')}
                        </span>
                        <p className="mt-2 text-lg font-black text-slate-900">₹{claim.final_payout}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-[36px] bg-slate-950 p-8 text-white shadow-xl shadow-slate-200">
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Live zone status</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight">{zoneStatus?.zone_name || 'Current zone'}</h3>
              <p className="mt-3 text-sm text-slate-300">{zoneStatus?.reason || 'No current lock. Coverage remains open.'}</p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Rain</p>
                  <p className="mt-2 text-2xl font-black">{zoneStatus?.expected_rain_mm || 0}mm</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Risk</p>
                  <p className="mt-2 text-2xl font-black">{zoneStatus?.zone_risk_score?.toFixed?.(2) || '0.00'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[36px] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Why GigCare</p>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">Higher trust means faster payouts.</div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">Live weather and city risk determine your weekly price.</div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">Claims are auto-scored, auto-approved, and auto-paid when safe.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}