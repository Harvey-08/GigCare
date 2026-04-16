import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import { setToken } from '../utils/auth';

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Info, 2: Platform/Zone, 3: OTP Verify
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    platform: 'ZOMATO',
    zone_id: '',
  });
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState('idle'); // idle, detecting, success, error
  const [coords, setCoords] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [resolvedLocation, setResolvedLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [requestEmail, setRequestEmail] = useState('');

  const PLATFORMS = ['ZOMATO', 'SWIGGY'];

  const handleDetectLocation = () => {
    setIsLocating(true);
    setLocationStatus('detecting');
    setError('');
    setResolvedLocation(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLocationStatus('error');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ latitude, longitude });
        apiClient.get('/zones/resolve', { params: { lat: latitude, lon: longitude } })
          .then(({ data }) => {
            const resolved = data.data || {};
            setResolvedLocation(resolved);
            setFormData(prev => ({ ...prev, zone_id: resolved.zone_id || prev.zone_id }));
            setLocationName(
              resolved.mode === 'SUPPORTED_CITY'
                ? `${resolved.city_name} • ${resolved.zone_name}`
                : `${resolved.nearest_city_name || resolved.city || 'Fallback region'} • Fallback`
            );
            setLocationStatus('success');
          })
          .catch((err) => {
            console.error('Location resolve error:', err);
            setError(err.response?.data?.error || 'Unable to resolve your location. Please try again.');
            setLocationStatus('error');
          })
          .finally(() => {
            setIsLocating(false);
          });
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError('Location access denied. Please enable location permissions to continue.');
        setLocationStatus('error');
        setIsLocating(false);
      },
      { timeout: 10000 }
    );
  };

  const handleNext = () => {
    if (!formData.name || !formData.email || !formData.phone) {
      setError('Please fill in all identity fields');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (locationStatus !== 'success' || !formData.zone_id) {
      setError('Live location is required to proceed. Please click Detect.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/register', {
        email: formData.email.trim().toLowerCase(),
        name: formData.name.trim(),
        phone: formData.phone.trim().startsWith('+91') ? formData.phone.trim() : `+91${formData.phone.trim()}`,
        platform: formData.platform,
        zone_id: formData.zone_id,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      });

      setRequestEmail(formData.email.trim().toLowerCase());
      setStep(3);
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (!otp) {
      setError('Please enter the OTP sent to your email.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await apiClient.post('/auth/verify-otp', {
        email: requestEmail,
        otp: otp.trim(),
      });

      setToken(data.data.token);
      window.location.href = '/';
    } catch (err) {
      console.error('OTP verification error:', err);
      setError(err.response?.data?.error || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 3) {
    return (
      <div className="min-h-screen bg-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-10">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
            <p className="text-gray-500">
              Enter the OTP sent to <span className="font-semibold text-indigo-600">{requestEmail}</span>
            </p>
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">OTP Code</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                required
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 bg-indigo-600 rounded-xl text-white font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg"
            >
              {loading ? 'Verifying OTP...' : 'Verify and Continue'}
            </button>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full text-center text-gray-500 font-medium hover:text-indigo-600 transition-colors"
            >
              Back to details
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500">Step {step} of 2</p>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          {step === 1 ? (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="9876543210"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Delivery Platform</label>
                <select
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Live Location Status</label>
                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      locationStatus === 'success' ? 'bg-green-100 text-green-600' : 
                      locationStatus === 'error' ? 'bg-amber-100 text-amber-600' : 'bg-white text-indigo-600'
                    }`}>
                      <span className="text-xl">
                        {locationStatus === 'success' ? '✅' : 
                         locationStatus === 'error' ? '⚠️' : 
                         locationStatus === 'detecting' ? '⏳' : '📍'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {locationStatus === 'success' ? 'Location Verified' : 
                         locationStatus === 'error' ? 'Location Required' : 
                         locationStatus === 'detecting' ? 'Locating...' : 'Verify Operating Area'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {locationStatus === 'success' && coords ? (locationName || `Lat: ${coords.latitude.toFixed(5)}, Lng: ${coords.longitude.toFixed(5)}`) :
                         locationStatus === 'error' ? 'Please allow GPS access' :
                         'Use GPS for precise city and zone detection'}
                      </p>
                      {resolvedLocation && locationStatus === 'success' && (
                        <p className="text-[11px] text-indigo-500 font-semibold mt-1">
                          {resolvedLocation.mode === 'SUPPORTED_CITY'
                            ? `Supported city mode • Premium est. ₹${resolvedLocation.premium_estimate}`
                            : `Fallback mode • Nearest city: ${resolvedLocation.nearest_city_name} • Premium est. ₹${resolvedLocation.premium_estimate}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={isLocating}
                    className="px-4 py-2 bg-white border border-indigo-200 rounded-lg text-sm font-bold text-indigo-600 hover:bg-indigo-50 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {locationStatus === 'success' ? 'Update' : 'Detect'}
                  </button>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 px-4 py-4 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition-all"
              >
                Back
              </button>
            )}
            <button
              onClick={step === 1 ? handleNext : handleSubmit}
              disabled={loading}
              className="flex-[2] px-6 py-4 bg-indigo-600 rounded-xl text-white font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              {loading ? 'Processing...' : step === 1 ? 'Next' : 'Create Account'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full text-center text-gray-500 font-medium hover:text-indigo-600 transition-colors"
          >
            Already have an account? <span className="text-indigo-600">Sign In</span>
          </button>
        </form>
      </div>
    </div>
  );
}
