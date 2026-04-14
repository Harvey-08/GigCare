// apps/admin/src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import { supabase } from '../supabaseClient';

export default function Dashboard({ profile, onLogout }) {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    // Real-time claims subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'claims' }, () => fetchData())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchData = async () => {
    try {
      // 1. Fetch Metrics from API (complex logic preserved in backend)
      const dashRes = await apiClient.get('/admin/dashboard');
      setDashboard(dashRes.data.data);

      // 2. Fetch Claims directly from Supabase (faster, join with profiles)
      const { data: claimsData } = await supabase
        .from('claims')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(20);
      
      setClaims(claimsData || []);
    } catch (err) {
      console.error('Dashboard data fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = {
    APPROVED: 'bg-emerald-100 text-emerald-700',
    PARTIAL: 'bg-amber-100 text-amber-700',
    FLAGGED: 'bg-rose-100 text-rose-700',
    PAID: 'bg-indigo-100 text-indigo-700',
    AUTO_CREATED: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <nav className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-20 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-2xl">🛡️</span>
            <div>
              <h1 className="text-lg font-black tracking-tighter uppercase">GigCare Admin</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Institutional Console</p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold">{profile?.full_name}</p>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">System Administrator</p>
            </div>
            <button onClick={onLogout} className="px-4 py-2 bg-slate-800 hover:bg-rose-600 rounded-lg text-xs font-bold transition-all border border-slate-700 hover:border-rose-500">
              SECURE LOGOUT
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading && !dashboard ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Compiling Metrics...</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500 space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: 'Loss Ratio', val: `${dashboard?.loss_ratio_percent}%`, desc: 'Payouts vs Premiums', color: 'text-indigo-600' },
                { label: 'Total Premiums', val: `₹${dashboard?.total_premiums_collected?.toLocaleString()}`, desc: 'Active Revenue', color: 'text-emerald-600' },
                { label: 'Total Payouts', val: `₹${dashboard?.total_payouts?.toLocaleString()}`, desc: 'Disbursed Capital', color: 'text-rose-600' },
                { label: 'Live Claims', val: claims.length, desc: 'Currently in queue', color: 'text-blue-600' },
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className={`text-3xl font-black ${stat.color} mb-1`}>{stat.val}</p>
                  <p className="text-[10px] font-medium text-slate-500">{stat.desc}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Claims Tracking */}
              <div className="lg:col-span-2 bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-black text-slate-900 uppercase tracking-tight">Recent Activity</h2>
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Live Updates</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Worker</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Event</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Payout</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {claims.map((claim) => (
                        <tr key={claim.claim_id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-8 py-5">
                            <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase text-xs">{claim.profiles?.full_name || 'Anonymous'}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{claim.claim_id.slice(0, 8)}</p>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{claim.trigger_type === 'HEAVY_RAIN' ? '⛈️' : '🔥'}</span>
                              <span className="text-xs font-bold text-slate-600">{claim.trigger_type.replace('_', ' ')}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-right font-black text-slate-900 text-sm">₹{claim.final_payout}</td>
                          <td className="px-8 py-5 text-center">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${statusBadge[claim.status]}`}>
                              {claim.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sidebar Actions */}
              <div className="space-y-6">
                <div className="bg-indigo-600 rounded-[32px] p-8 text-white shadow-xl shadow-indigo-200">
                  <h3 className="text-xl font-black mb-2 leading-none uppercase tracking-tight">System Controls</h3>
                  <p className="text-indigo-100 text-xs mb-8">Execute platform-wide triggers and manual event overrides.</p>
                  <button onClick={() => navigate('/trigger')} className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 transition-all shadow-lg active:scale-[0.98]">
                    🚀 Launch Trigger Panel
                  </button>
                </div>
                
                <div className="bg-white rounded-[32px] border border-slate-200 p-8">
                  <h3 className="font-black text-slate-900 uppercase tracking-tight mb-4">Fraud Indicators</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Rings</span>
                      <span className="text-lg font-black text-slate-900">0</span>
                    </div>
                    <div className="p-4 bg-rose-50 rounded-2xl flex items-center justify-between border border-rose-100">
                      <span className="text-xs font-bold text-rose-600 uppercase tracking-widest">Flagged Claims</span>
                      <span className="text-lg font-black text-rose-700">{dashboard?.claims_by_status?.['FLAGGED'] || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
