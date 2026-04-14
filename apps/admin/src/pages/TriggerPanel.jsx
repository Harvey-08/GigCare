// apps/admin/src/pages/TriggerPanel.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';

export default function TriggerPanel() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    zone_id: 'zone_01',
    trigger_type: 'HEAVY_RAIN',
    trigger_value: 60,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const ZONES = [
    { id: 'zone_01', name: 'Koramangala' },
    { id: 'zone_02', name: 'Whitefield' },
    { id: 'zone_03', name: 'Indiranagar' },
  ];

  const TRIGGERS = [
    { type: 'HEAVY_RAIN', label: '☔ Heavy Rain', unit: 'mm', defaultValue: 60, color: 'border-blue-200 bg-blue-50 text-blue-700' },
    { type: 'EXTREME_HEAT', label: '🔥 Extreme Heat', unit: '°C', defaultValue: 41, color: 'border-orange-200 bg-orange-50 text-orange-700' },
    { type: 'POOR_AQI', label: '😷 Poor AQI', unit: 'AQI Index', defaultValue: 320, color: 'border-slate-200 bg-slate-50 text-slate-700' },
  ];

  const handleFire = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const response = await apiClient.post('/admin/trigger-event', formData);
      setResult(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Authorization failed. Ensure you are an active Admin.');
    } finally {
      setLoading(false);
    }
  };

  const currentTrigger = TRIGGERS.find((t) => t.type === formData.trigger_type);

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-8 py-6 flex items-center justify-between">
          <div>
            <button onClick={() => navigate('/')} className="text-indigo-600 font-bold text-xs uppercase tracking-widest mb-2 flex items-center hover:translate-x-[-4px] transition-transform">
              <span className="mr-2">←</span> Back to Dashboard
            </button>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Event Control Center</h1>
          </div>
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-rose-100">🚀</div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form Side */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm">
              <form onSubmit={handleFire} className="space-y-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Select Target Jurisdiction</label>
                  <div className="grid grid-cols-1 gap-3">
                    {ZONES.map((z) => (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, zone_id: z.id })}
                        className={`px-5 py-4 rounded-2xl border-2 text-left transition-all ${
                          formData.zone_id === z.id 
                            ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700' 
                            : 'border-slate-50 bg-slate-50/50 text-slate-500 hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold">{z.name}</span>
                          {formData.zone_id === z.id && <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Disruption Parameters</label>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      {TRIGGERS.map((t) => (
                        <button
                          key={t.type}
                          type="button"
                          onClick={() => setFormData({ ...formData, trigger_type: t.type, trigger_value: t.defaultValue })}
                          className={`flex-1 p-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-tight transition-all ${
                            formData.trigger_type === t.type ? t.color : 'border-slate-50 text-slate-400 opacity-50'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.trigger_value}
                        onChange={(e) => setFormData({ ...formData, trigger_value: parseInt(e.target.value) })}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-2xl text-slate-900 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                      />
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {currentTrigger?.unit}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-5 bg-rose-600 hover:bg-rose-700 text-white rounded-[32px] font-black text-xl shadow-xl shadow-rose-200 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? 'Executing...' : 'EXECUTE TRIGGER'}
                </button>
              </form>
            </div>
          </div>

          {/* Info/Result Side */}
          <div className="lg:col-span-2 space-y-6">
            {error && (
              <div className="bg-rose-50 border border-rose-100 p-6 rounded-3xl animate-in slide-in-from-top duration-300">
                <p className="text-xs font-black text-rose-600 uppercase tracking-widest mb-2">Execution Error</p>
                <p className="text-sm font-medium text-rose-900">{error}</p>
              </div>
            )}

            {result ? (
              <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[32px] shadow-sm animate-in zoom-in duration-500">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl mb-6 shadow-sm">✅</div>
                <h3 className="text-xl font-black text-emerald-900 mb-2 leading-none uppercase tracking-tight">Success</h3>
                <p className="text-emerald-700 text-xs mb-6 font-medium">Event was registered and claims were dispatched successfully.</p>
                
                <div className="bg-white/50 rounded-2xl p-4 space-y-2 text-[10px] font-bold uppercase tracking-widest text-emerald-800">
                  <div className="flex justify-between"><span>Impact Index</span><span>{result.claims_created} CLAIMS</span></div>
                  <div className="flex justify-between"><span>Authority</span><span>Verified</span></div>
                </div>
              </div>
            ) : (
              <div className="bg-indigo-900 rounded-[32px] p-8 text-white shadow-xl shadow-indigo-200">
                <h3 className="text-xl font-black mb-4 uppercase tracking-tight">Protocol Note</h3>
                <ul className="space-y-4 text-xs text-indigo-100 font-medium">
                  <li className="flex items-start"><span className="mr-3 opacity-50">01</span><span>Simulated triggers immediately scan all active policies in the target zone.</span></li>
                  <li className="flex items-start"><span className="mr-3 opacity-50">02</span><span>Claim generation is performed by the regional processing engine.</span></li>
                  <li className="flex items-start"><span className="mr-3 opacity-50">03</span><span>Disruption payouts are calculated based on disruption hours and severity.</span></li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
