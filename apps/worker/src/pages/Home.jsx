// apps/worker/src/pages/Home.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Home({ profile, session, onLogout }) {
  const navigate = useNavigate();
  const [policies, setPolicies] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) fetchData();
  }, [session]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch Policies
      const { data: policiesData } = await supabase
        .from('policies')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      // Fetch Claims
      const { data: claimsData } = await supabase
        .from('claims')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      setPolicies(policiesData || []);
      setClaims(claimsData || []);
    } catch (err) {
      console.error('Failed to fetch data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const activePolicy = policies.find((p) => p.status === 'ACTIVE');
  const recentClaims = claims.slice(0, 3);

  const statusColor = {
    APPROVED: 'bg-emerald-50 border-emerald-100 text-emerald-900',
    PARTIAL: 'bg-amber-50 border-amber-100 text-amber-900',
    FLAGGED: 'bg-rose-50 border-rose-100 text-rose-900',
    PAID: 'bg-indigo-50 border-indigo-100 text-indigo-900',
    AUTO_CREATED: 'bg-slate-50 border-slate-100 text-slate-900',
  };

  const statusBadge = {
    APPROVED: 'px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded',
    PARTIAL: 'px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase rounded',
    FLAGGED: 'px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold uppercase rounded',
    PAID: 'px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase rounded',
    AUTO_CREATED: 'px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold uppercase rounded',
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-indigo-600 tracking-tight">GIGCARE</h1>
            <p className="text-sm font-medium text-slate-500">
              {profile?.full_name || session?.user?.email}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-wider"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        {/* Active Policy */}
        {activePolicy ? (
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-white shadow-xl shadow-indigo-100">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mb-1">Active Coverage</p>
                <p className="text-4xl font-black">₹{activePolicy.premium_paid}<span className="text-lg font-normal opacity-60">/wk</span></p>
              </div>
              <div className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest">
                {activePolicy.coverage_tier}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10 text-sm">
              <div>
                <p className="text-white/60 text-[10px] font-bold uppercase mb-1">Max Payout</p>
                <p className="font-bold">₹{activePolicy.max_payout}</p>
              </div>
              <div>
                <p className="text-white/60 text-[10px] font-bold uppercase mb-1">Valid Until</p>
                <p className="font-bold">{new Date(activePolicy.week_end).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-10 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">🛡️</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">No active coverage</h3>
              <p className="text-sm text-slate-500">Protect your earnings from extreme weather.</p>
            </div>
            <button
              onClick={() => navigate('/buy-policy')}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              Get Covered Now
            </button>
          </div>
        )}

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => navigate('/policies')} className="bg-white p-6 rounded-3xl border border-slate-100 hover:border-indigo-200 transition-all text-left shadow-sm">
            <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center mb-4 text-xl">📋</div>
            <p className="font-bold text-slate-900 mb-1">Policies</p>
            <p className="text-xs text-slate-400 font-medium">{policies.length} Total</p>
          </button>
          <button onClick={() => navigate('/buy-policy')} className="bg-white p-6 rounded-3xl border border-slate-100 hover:border-indigo-200 transition-all text-left shadow-sm">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center mb-4 text-xl">✨</div>
            <p className="font-bold text-slate-900 mb-1">Purchase</p>
            <p className="text-xs text-slate-400 font-medium">New Protection</p>
          </button>
        </div>

        {/* Claims Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Recent Claims</h2>
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>
          ) : claims.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
              <p className="text-slate-400 font-medium">No claims reported yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentClaims.map((claim) => (
                <div
                  key={claim.claim_id}
                  onClick={() => navigate(`/claims/${claim.claim_id}`)}
                  className={`group bg-white border border-slate-100 rounded-3xl p-5 cursor-pointer hover:border-indigo-200 transition-all shadow-sm ${statusColor[claim.status]}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm border border-slate-50">
                        {claim.trigger_type === 'HEAVY_RAIN' ? '⛈️' : claim.trigger_type === 'EXTREME_HEAT' ? '🔥' : '😷'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{claim.trigger_type.replace(/_/g, ' ')}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {new Date(claim.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={statusBadge[claim.status]}>{claim.status.replace('_', ' ')}</span>
                      <p className="text-lg font-black text-slate-900 mt-1">₹{claim.final_payout}</p>
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
