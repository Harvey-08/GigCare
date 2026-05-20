import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import { setToken } from '../utils/auth';

const CITIES = [
  { id: 'BLR', name: 'Bengaluru', lat: 12.9716, lon: 77.5946 },
  { id: 'MUM', name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
  { id: 'DEL', name: 'Delhi NCR', lat: 28.6139, lon: 77.2090 },
  { id: 'CHN', name: 'Chennai', lat: 13.0827, lon: 80.2707 },
  { id: 'HYD', name: 'Hyderabad', lat: 17.3850, lon: 78.4867 },
  { id: 'PUN', name: 'Pune', lat: 18.5204, lon: 73.8567 },
  { id: 'KOL', name: 'Kolkata', lat: 22.5726, lon: 88.3639 },
  { id: 'AMD', name: 'Ahmedabad', lat: 23.0225, lon: 72.5714 },
  { id: 'JAI', name: 'Jaipur', lat: 26.9124, lon: 75.7873 },
  { id: 'KOC', name: 'Kochi', lat: 9.9312, lon: 76.2673 },
];

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Info, 2: Platform/Zone, 3: OTP Verify
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    platform: 'ZOMATO',
    zone_id: '',
    city_id: '',
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
  const [resendTimer, setResendTimer] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const PLATFORMS = ['ZOMATO', 'SWIGGY'];

  const handleCitySelect = (cityId) => {
    const city = CITIES.find(c => c.id === cityId);
    if (!city) return;

    setFormData(prev => ({ ...prev, city_id: cityId }));
    setIsLocating(true);
    setLocationStatus('detecting');
    setError('');
    setResolvedLocation(null);

    setCoords({ latitude: city.lat, longitude: city.lon });

    apiClient.get('/zones/resolve', { params: { lat: city.lat, lon: city.lon } })
      .then(({ data }) => {
        const resolved = data.data || {};
        setResolvedLocation(resolved);
        setFormData(prev => ({ ...prev, zone_id: resolved.zone_id || prev.zone_id }));
        setLocationName(`${resolved.city_name} • ${resolved.zone_name}`);
        setLocationStatus('success');
      })
      .catch((err) => {
        console.error('Zone resolve error:', err);
        setError(err.response?.data?.error || 'Unable to setup zone for this city.');
        setLocationStatus('error');
      })
      .finally(() => {
        setIsLocating(false);
      });
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationStatus('detecting');
    setError('');
    setResolvedLocation(null);
    setFormData(prev => ({ ...prev, city_id: '' }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ latitude, longitude });

        apiClient.get('/zones/resolve', { params: { lat: latitude, lon: longitude } })
          .then(({ data }) => {
            const resolved = data.data || {};
            setResolvedLocation(resolved);
            setFormData(prev => ({ ...prev, zone_id: resolved.zone_id || prev.zone_id }));

            if (resolved.mode === 'FALLBACK') {
              setLocationName(`${resolved.district || resolved.city} (Mapped to ${resolved.nearest_city_name})`);
            } else {
              setLocationName(`${resolved.city_name} • ${resolved.zone_name}`);
            }
            setLocationStatus('success');
          })
          .catch((err) => {
            console.error('Zone resolve error:', err);
            setError(err.response?.data?.error || 'Unable to resolve your location.');
            setLocationStatus('error');
          })
          .finally(() => {
            setIsLocating(false);
          });
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError('Location detection failed. Please enable GPS or select a city manually.');
        setLocationStatus('error');
        setIsLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
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
      setError('Please select an operating city to proceed.');
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
    setResendSuccess(false);

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

  const handleResendOtp = async () => {
    if (resendTimer > 0 || !formData.email) return;

    setError('');
    setResendSuccess(false);

    try {
      setLoading(true);
      await apiClient.post('/auth/register', {
        email: formData.email.trim().toLowerCase(),
        name: formData.name.trim(),
        phone: formData.phone.trim().startsWith('+91') ? formData.phone.trim() : `+91${formData.phone.trim()}`,
        platform: formData.platform,
        zone_id: formData.zone_id,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      });

      setResendSuccess(true);
      setResendTimer(30);
    } catch (err) {
      console.error('Resend registration OTP error:', err);
      setError(err.response?.data?.error || 'Failed to resend OTP. Please try again.');
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

            {resendSuccess && (
              <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-sm text-green-600 font-medium">
                OTP Resent successfully! Check your inbox.
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 bg-indigo-600 rounded-xl text-white font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg"
            >
              {loading ? 'Verifying OTP...' : 'Verify and Continue'}
            </button>

            <div className="flex flex-col space-y-3">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading || resendTimer > 0}
                className={`w-full text-center font-semibold transition-colors ${resendTimer > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-700'
                  }`}
              >
                {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
              </button>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full text-center text-gray-500 font-medium hover:text-indigo-600 transition-colors"
              >
                Back to details
              </button>
            </div>
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
                
                <div className="w-full p-4 bg-indigo-50 rounded-xl flex items-center justify-between mb-4 border border-indigo-100">
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-2.5 rounded-xl shadow-sm text-xl flex-shrink-0 flex items-center justify-center">
                      📍
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 leading-tight">Verify Operating Area</p>
                      <p className="text-xs text-gray-500 mt-1 leading-tight">Use GPS for precise city and zone detection</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={isLocating}
                    className="ml-2 px-5 py-2 bg-white text-indigo-700 font-bold text-sm rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors flex-shrink-0"
                  >
                    {isLocating ? '...' : 'Detect'}
                  </button>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="h-px bg-gray-200 flex-1"></div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">OR</span>
                  <div className="h-px bg-gray-200 flex-1"></div>
                </div>

                <select
                  value={formData.city_id || ''}
                  onChange={(e) => handleCitySelect(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                >
                  <option value="" disabled>Select city </option>
                  {CITIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                {locationStatus === 'detecting' && (
                  <p className="text-sm text-indigo-600 mt-2 flex items-center gap-2">
                    <span className="animate-spin text-lg">⏳</span> Setting up zone...
                  </p>
                )}

                {locationStatus === 'success' && resolvedLocation && (
                  <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center gap-3">
                    <div className="p-2 bg-green-100 text-green-600 rounded-lg text-xl">✅</div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Zone Configured: {locationName}</p>
                      <p className="text-xs text-indigo-600 mt-1 font-medium">Weekly Premium est. ₹{resolvedLocation.premium_estimate || (resolvedLocation.mode === 'FALLBACK' ? 120 : 162)}</p>
                    </div>
                  </div>
                )}
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
