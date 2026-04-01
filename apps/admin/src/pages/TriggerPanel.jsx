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
    { id: 'zone_04', name: 'HSR Layout' },
    { id: 'zone_05', name: 'Bommanahalli' },
  ];

  const TRIGGERS = [
    { type: 'HEAVY_RAIN', label: '☔ Heavy Rain', unit: 'mm', defaultValue: 60 },
    { type: 'EXTREME_HEAT', label: '🔥 Extreme Heat', unit: '°C', defaultValue: 41 },
    { type: 'POOR_AQI', label: '😷 Poor AQI', unit: 'AQI Index', defaultValue: 320 },
    { type: 'CURFEW', label: '🚓 Curfew Alert', unit: 'hours', defaultValue: 3 },
    { type: 'APP_OUTAGE', label: '📱 App Outage', unit: 'minutes', defaultValue: 45 },
  ];

  const handleFire = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);

    try {
      setLoading(true);
      const response = await apiClient.post('/admin/trigger-event', formData);
      setResult(response.data.data);
      // Reset form
      setFormData({
        zone_id: 'zone_01',
        trigger_type: 'HEAVY_RAIN',
        trigger_value: 60,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fire trigger');
    } finally {
      setLoading(false);
    }
  };

  const currentTrigger = TRIGGERS.find((t) => t.type === formData.trigger_type);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button onClick={() => navigate('/')} className="text-teal-600 font-medium mb-4">
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Trigger Event Control</h1>
          <p className="text-gray-600 text-sm mt-1">Fire simulated events to test auto-claim generation</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Form */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <form onSubmit={handleFire} className="space-y-4">
              {/* Zone Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Target Zone
                </label>
                <select
                  value={formData.zone_id}
                  onChange={(e) => setFormData({ ...formData, zone_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600"
                >
                  {ZONES.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Trigger Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Trigger Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TRIGGERS.map((t) => (
                    <button
                      key={t.type}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          trigger_type: t.type,
                          trigger_value: t.defaultValue,
                        })
                      }
                      className={`p-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                        formData.trigger_type === t.type
                          ? 'border-teal-600 bg-teal-50 text-teal-900'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trigger Value */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Value ({currentTrigger?.unit || 'units'})
                </label>
                <input
                  type="number"
                  value={formData.trigger_value}
                  onChange={(e) =>
                    setFormData({ ...formData, trigger_value: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Fire Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 text-lg"
              >
                {loading ? 'Firing...' : '🔥 Fire Event'}
              </button>
            </form>
          </div>

          {/* Results */}
          <div className="space-y-4">
            {/* Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-900 mb-2">How it Works:</p>
              <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                <li>Select a zone and trigger type</li>
                <li>Click "Fire Event" to simulate the event</li>
                <li>System auto-creates claims for affected workers</li>
                <li>Claims appear in worker app and dashboard</li>
              </ol>
            </div>

            {/* Result */}
            {result && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <p className="text-sm font-bold text-green-900 mb-2">✅ Event Fired Successfully!</p>
                <div className="space-y-1 text-xs text-green-800">
                  <p><strong>Event ID:</strong> {result.event_id}</p>
                  <p><strong>Zone:</strong> {result.zone_id}</p>
                  <p><strong>Trigger Type:</strong> {result.trigger_type}</p>
                  <p className="text-lg font-bold text-green-600 mt-2">
                    Claims Created: {result.claims_created}
                  </p>
                </div>
              </div>
            )}

            {/* Recent Triggers */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-bold text-gray-900 mb-2">Trigger Guide</p>
              <div className="space-y-2 text-xs">
                <div className="bg-gray-50 p-2 rounded">
                  <p className="font-semibold">☔ Heavy Rain ≥ 50mm</p>
                  <p className="text-gray-600">Triggers flood disruption claims</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <p className="font-semibold">🔥 Extreme Heat ≥ 40°C</p>
                  <p className="text-gray-600">Triggers heat-related disruption</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <p className="font-semibold">😷 Poor AQI ≥ 300</p>
                  <p className="text-gray-600">Triggers air-quality disruption</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
