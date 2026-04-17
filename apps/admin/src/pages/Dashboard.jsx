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

function formatShortDate(dateValue) {
  if (!dateValue) return '--';
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return '--';
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(parsed);
}

function getAqiTone(category) {
  if (category === 'GOOD') return 'bg-emerald-100 text-emerald-700';
  if (category === 'MODERATE') return 'bg-lime-100 text-lime-700';
  if (category === 'UNHEALTHY_FOR_SENSITIVE') return 'bg-amber-100 text-amber-700';
  if (category === 'UNHEALTHY') return 'bg-orange-100 text-orange-700';
  if (category === 'VERY_UNHEALTHY') return 'bg-rose-100 text-rose-700';
  if (category === 'HAZARDOUS') return 'bg-fuchsia-100 text-fuchsia-700';
  return 'bg-slate-100 text-slate-700';
}

export default function Dashboard({ profile, onLogout }) {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [cityMetrics, setCityMetrics] = useState([]);
  const [fraudRings, setFraudRings] = useState([]);
  const [eligibilityStats, setEligibilityStats] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [weatherAqiWeek, setWeatherAqiWeek] = useState(null);
  const [heatmap, setHeatmap] = useState([]);
  const [selectedCityId, setSelectedCityId] = useState('BLR');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchWeatherAqiWeek(selectedCityId);
  }, [selectedCityId]);

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

  const fetchWeatherAqiWeek = async (cityId) => {
    try {
      const response = await apiClient.get('/admin/weather-aqi-week', {
        params: { city_id: cityId || 'BLR' },
      });
      setWeatherAqiWeek(response.data.data || null);
    } catch (err) {
      console.error('Weather AQI week fetch error:', err.message);
      setWeatherAqiWeek(null);
    }
  };

  const selectedCity = cityMetrics.find((city) => city.city_id === selectedCityId) || cityMetrics[0];
  const selectedHeat = heatmap
    .filter((zone) => zone.city_id === selectedCity?.city_id || zone.city === selectedCity?.city_name)
    .slice(0, 18);
  const claimsByStatus = dashboard?.claims_by_status || {};
  const largestRing = fraudRings.reduce((largest, ring) => (ring.ring_size > (largest?.ring_size || 0) ? ring : largest), null);
  const crossCityRings = fraudRings.filter((ring) => ring.is_cross_city).length;

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
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Fraud posture</p>
                  <h3 className="mt-2 text-2xl font-black text-slate-900">{fraudRings.length} active rings</h3>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-2xl bg-rose-50 px-3 py-4">
                      <p className="text-lg font-black text-rose-700">{fraudRings.length}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-rose-700">Total rings</p>
                    </div>
                    <div className="rounded-2xl bg-amber-50 px-3 py-4">
                      <p className="text-lg font-black text-amber-700">{crossCityRings}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">Cross-city</p>
                    </div>
                    <div className="rounded-2xl bg-indigo-50 px-3 py-4">
                      <p className="text-lg font-black text-indigo-700">{largestRing?.ring_size || 0}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-700">Largest ring</p>
                    </div>
                  </div>
                  <p className="mt-4 text-xs font-medium text-slate-500">Detailed ring intelligence is available in the dedicated section below.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[36px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Fraud intelligence</p>
                  <h3 className="text-2xl font-black tracking-tight text-slate-900">Ring detection and suspicious linkage</h3>
                </div>
                <div className="rounded-full bg-rose-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-rose-700">
                  {fraudRings.length} live rings
                </div>
              </div>

              {fraudRings.length === 0 ? (
                <div className="rounded-2xl bg-emerald-50 px-4 py-4 text-sm font-medium text-emerald-800">
                  No high-density fraud rings detected in current telemetry.
                </div>
              ) : (
                <div className="overflow-hidden rounded-[24px] border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-[920px] w-full text-left text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                          <th className="px-4 py-3">Ring</th>
                          <th className="px-4 py-3">Workers</th>
                          <th className="px-4 py-3">Scope</th>
                          <th className="px-4 py-3">Top Signals</th>
                          <th className="px-4 py-3">Sample Worker IDs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {fraudRings.slice(0, 8).map((ring, index) => (
                          <tr key={index} className="align-top hover:bg-slate-50">
                            <td className="px-4 py-4">
                              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Ring {index + 1}</p>
                              <p className="mt-1 text-xs font-medium text-slate-700 whitespace-normal">{ring.summary || 'Suspicious linked cluster'}</p>
                            </td>
                            <td className="px-4 py-4">
                              <p className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">
                                {ring.ring_size} workers
                              </p>
                            </td>
                            <td className="px-4 py-4 text-xs font-semibold text-slate-700 whitespace-normal">
                              {ring.is_cross_city
                                ? `Cross-city: ${(ring.cities_involved || []).join(', ') || 'Mixed'}`
                                : (ring.dominant_city_id || 'Single city')}
                            </td>
                            <td className="px-4 py-4 text-xs font-medium text-slate-700 whitespace-normal">
                              {(ring.suspicious_indicators || []).slice(0, 3).join(' • ') || 'Shared identifiers observed'}
                            </td>
                            <td className="px-4 py-4 text-xs font-medium text-slate-700 whitespace-normal break-all">
                              {(ring.worker_details || [])
                                .slice(0, 5)
                                .map((worker) => worker.worker_id || worker)
                                .join(', ')}
                              {(ring.worker_details || []).length > 5 ? ' ...' : ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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

            <div className="rounded-[36px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Weather + AQI outlook</p>
                  <h3 className="text-2xl font-black tracking-tight text-slate-900">
                    Next 7 days • {weatherAqiWeek?.city_name || selectedCity?.city_name || 'Selected city'}
                  </h3>
                </div>
              </div>

              {!weatherAqiWeek?.days?.length ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm font-medium text-slate-500">
                  Weekly weather and AQI data unavailable.
                </div>
              ) : (
                <div className="overflow-hidden rounded-[24px] border border-slate-200">
                  <div className="max-h-[420px] overflow-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-white">
                        <tr className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                          <th className="px-4 py-3">Day</th>
                          <th className="px-4 py-3">Temp</th>
                          <th className="px-4 py-3">Feels Like</th>
                          <th className="px-4 py-3">Rain</th>
                          <th className="px-4 py-3">Rain %</th>
                          <th className="px-4 py-3">Wind</th>
                          <th className="px-4 py-3">UV</th>
                          <th className="px-4 py-3">AQI</th>
                          <th className="px-4 py-3">PM2.5</th>
                          <th className="px-4 py-3">PM10</th>
                          <th className="px-4 py-3">Ozone</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {weatherAqiWeek.days.map((day) => (
                          <tr key={day.date} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-bold text-slate-900">{formatShortDate(day.date)}</td>
                            <td className="px-4 py-3 text-slate-700">
                              {day.temp_max_c ?? '--'}° / {day.temp_min_c ?? '--'}°
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {day.feels_like_max_c ?? '--'}° / {day.feels_like_min_c ?? '--'}°
                            </td>
                            <td className="px-4 py-3 text-slate-700">{day.rain_mm ?? '--'} mm</td>
                            <td className="px-4 py-3 text-slate-700">{day.rain_probability_pct ?? '--'}%</td>
                            <td className="px-4 py-3 text-slate-700">{day.wind_speed_kmh ?? '--'} km/h</td>
                            <td className="px-4 py-3 text-slate-700">{day.uv_index ?? '--'}</td>
                            <td className="px-4 py-3">
                              <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.15em] ${getAqiTone(day.aqi_category)}`}>
                                {day.aqi_max ?? '--'} {day.aqi_category || ''}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-700">{day.pm25_avg ?? '--'}</td>
                            <td className="px-4 py-3 text-slate-700">{day.pm10_avg ?? '--'}</td>
                            <td className="px-4 py-3 text-slate-700">{day.ozone_avg ?? '--'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}