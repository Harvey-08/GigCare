import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import IndiaCityMap from '../components/IndiaCityMap';

function StatCard({ label, value, note, accent }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className={`mt-3 text-3xl font-black ${accent}`}>{value}</p>
      <p className="mt-2 text-xs font-medium text-slate-500">{note}</p>
    </div>
  );
}

function Donut({ claimsByStatus }) {
  const entries = Object.entries(claimsByStatus || {});
  const total = entries.reduce((sum, [, count]) => sum + count, 0) || 1;
  const palette = ['#2563EB', '#1A7F4B', '#E8960C', '#B91C1C', '#64748B'];
  let cursor = 0;

  const segments = entries.map(([status, count], index) => {
    const percentage = (count / total) * 100;
    const start = cursor;
    cursor += percentage;
    return `${palette[index % palette.length]} ${start}% ${cursor}%`;
  });

  return (
    <div className="flex flex-col items-center rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="h-40 w-40 rounded-full" style={{ background: `conic-gradient(${segments.join(', ')})` }} />
      <div className="mt-4 text-center">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Claims by Status</p>
        <p className="text-2xl font-black text-slate-900">{total} total</p>
      </div>
    </div>
  );
}

export default function Dashboard({ profile, onLogout }) {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [cityMetrics, setCityMetrics] = useState([]);
  const [fraudRings, setFraudRings] = useState([]);
  const [eligibilityStats, setEligibilityStats] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [heatmap, setHeatmap] = useState([]);
  const [selectedCityId, setSelectedCityId] = useState('BLR');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [dashRes, cityRes, ringsRes, eligibilityRes, forecastRes, heatmapRes] = await Promise.allSettled([
        apiClient.get('/admin/dashboard'),
        apiClient.get('/admin/cities/metrics'),
        apiClient.get('/admin/fraud-rings'),
        apiClient.get('/admin/eligibility-stats'),
        apiClient.get('/admin/forecast'),
        apiClient.get('/zones/heatmap'),
      ]);

      const nextDashboard = dashRes.status === 'fulfilled' ? (dashRes.value.data.data || null) : null;
      const nextCityMetrics = cityRes.status === 'fulfilled' ? (cityRes.value.data.data || []) : [];
      const nextFraudRings = ringsRes.status === 'fulfilled' ? (ringsRes.value.data.data || []) : [];
      const nextEligibility = eligibilityRes.status === 'fulfilled' ? (eligibilityRes.value.data.data || null) : null;
      const nextForecast = forecastRes.status === 'fulfilled' ? (forecastRes.value.data.data || null) : null;
      const nextHeatmap = heatmapRes.status === 'fulfilled' ? (heatmapRes.value.data.data || []) : [];

      setDashboard(nextDashboard);
      setCityMetrics(nextCityMetrics);
      setFraudRings(nextFraudRings);
      setEligibilityStats(nextEligibility);
      setForecast(nextForecast);
      setHeatmap(nextHeatmap);

      if (!selectedCityId && nextCityMetrics.length > 0) {
        setSelectedCityId(nextCityMetrics[0].city_id);
      }
    } catch (err) {
      console.error('Dashboard data fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedCity = cityMetrics.find((city) => city.city_id === selectedCityId) || cityMetrics[0];
  const selectedHeat = heatmap
    .filter((zone) => zone.city_id === selectedCity?.city_id || zone.city === selectedCity?.city_name)
    .slice(0, 18);
  const claimsByStatus = dashboard?.claims_by_status || {};

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900">
      <nav className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950 text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl">🛡️</div>
            <div>
              <h1 className="text-lg font-black tracking-tight">GigCare Admin</h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-400">Multi-city control room</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/trigger')}
              className="rounded-xl border border-indigo-500/40 bg-indigo-600/20 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-indigo-200 transition-all hover:bg-indigo-600/40"
            >
              Trigger Panel
            </button>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold">{profile?.full_name}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-300">System Administrator</p>
            </div>
            <button
              onClick={onLogout}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] transition-all hover:border-rose-500 hover:bg-rose-600"
            >
              Secure Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {loading && !dashboard ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">Compiling metrics...</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
              <StatCard label="Loss Ratio" value={`${dashboard?.loss_ratio_percent || 0}%`} note="Payouts vs premiums" accent="text-indigo-600" />
              <StatCard label="Reserve Pool" value={`₹${(dashboard?.reserve_pool || 0).toLocaleString()}`} note="Unspent protection capital" accent="text-emerald-600" />
              <StatCard label="Total Premiums" value={`₹${(dashboard?.total_premiums_collected || 0).toLocaleString()}`} note="Active revenue" accent="text-sky-600" />
              <StatCard label="Total Payouts" value={`₹${(dashboard?.total_payouts || 0).toLocaleString()}`} note="Disbursed capital" accent="text-rose-600" />
            </div>

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[36px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">India city overview</p>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900">10-city loss map</h2>
                  </div>
                  <div className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-700">
                    {cityMetrics.length} cities live
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
                  <IndiaCityMap cityMetrics={cityMetrics} selectedCityId={selectedCityId} onCityClick={setSelectedCityId} />

                  <div className="space-y-4">
                    <div className="rounded-[28px] bg-slate-50 p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Selected city</p>
                      <div className="mt-2 flex items-end justify-between">
                        <div>
                          <h3 className="text-3xl font-black text-slate-900">{selectedCity?.city_name || 'Bengaluru'}</h3>
                          <p className="text-sm font-medium text-slate-500">{selectedCity?.state || 'Karnataka'} • {selectedCity?.climate_zone || 'tropical_savanna'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Loss ratio</p>
                          <p className="text-2xl font-black text-slate-900">{selectedCity?.loss_ratio?.toFixed?.(2) || '0.00'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-[28px] border border-slate-200">
                      <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">City comparison</p>
                      </div>
                      <div className="max-h-[420px] overflow-y-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="sticky top-0 bg-white">
                            <tr className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">
                              <th className="px-5 py-4">City</th>
                              <th className="px-5 py-4">Premium</th>
                              <th className="px-5 py-4">Claims</th>
                              <th className="px-5 py-4 text-right">LR</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {cityMetrics.map((city) => (
                              <tr
                                key={city.city_id}
                                onClick={() => setSelectedCityId(city.city_id)}
                                className={`cursor-pointer transition-colors ${selectedCityId === city.city_id ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}`}
                              >
                                <td className="px-5 py-4">
                                  <p className="font-bold text-slate-900">{city.city_name}</p>
                                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">{city.city_id}</p>
                                </td>
                                <td className="px-5 py-4 text-slate-600">{city.premium_range}</td>
                                <td className="px-5 py-4 text-slate-600">{city.this_week_claims} / {city.total_claims}</td>
                                <td className="px-5 py-4 text-right font-black">{city.loss_ratio.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <Donut claimsByStatus={claimsByStatus} />

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Fraud rings</p>
                  <h3 className="mt-2 text-2xl font-black text-slate-900">{fraudRings.length} active rings</h3>
                  <div className="mt-4 space-y-3">
                    {fraudRings.length === 0 ? (
                      <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">No active rings detected.</div>
                    ) : (
                      fraudRings.slice(0, 4).map((ring, index) => (
                        <div key={index} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">Ring {index + 1}</p>
                            <p className="text-xs font-black text-rose-600">{ring.ring_size} workers</p>
                          </div>
                          <p className="mt-2 text-sm font-medium text-slate-700">{ring.is_cross_city ? 'Cross-city network' : 'Single-city cluster'}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Eligibility pool</p>
                <p className="mt-2 text-3xl font-black text-slate-900">{eligibilityStats?.eligible || 0}</p>
                <p className="text-sm text-slate-500">Eligible workers</p>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                  <div className="rounded-2xl bg-emerald-50 px-3 py-4 text-emerald-700">{eligibilityStats?.eligible || 0}</div>
                  <div className="rounded-2xl bg-amber-50 px-3 py-4 text-amber-700">{eligibilityStats?.near_threshold || 0}</div>
                  <div className="rounded-2xl bg-rose-50 px-3 py-4 text-rose-700">{eligibilityStats?.ineligible || 0}</div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Next week forecast</p>
                <p className="mt-2 text-3xl font-black text-slate-900">₹{forecast?.expected_claims_next_week?.toLocaleString() || 0}</p>
                <p className="text-sm text-slate-500">Projected claims outflow</p>
                <div className="mt-4 rounded-2xl bg-indigo-50 px-4 py-3 text-xs font-medium text-indigo-800">
                  ± ₹{forecast?.forecast_delta?.toLocaleString() || 0} based on 7-day payout trend
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Zone heatmap</p>
                <div className="mt-4 grid grid-cols-6 gap-2">
                  {selectedHeat.slice(0, 18).map((zone) => (
                    <div
                      key={zone.zone_id}
                      className="aspect-square rounded-xl border border-white shadow-sm"
                      style={{
                        backgroundColor: zone.zone_risk_score >= 2 ? '#B91C1C' : zone.zone_risk_score >= 1.4 ? '#E8960C' : '#1A7F4B',
                      }}
                      title={`${zone.name} • ${zone.zone_risk_score}`}
                    />
                  ))}
                </div>
                <p className="mt-4 text-xs font-medium text-slate-500">Selected city zones only. Click another city on the map to update.</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}