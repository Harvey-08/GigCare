import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { apiClient } from '../services/api';

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Info, 2: Platform/Zone, 3: Success
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    platform: 'ZOMATO',
    zone_id: '', // Initialize empty to force selection/detection
  });
  const [zones, setZones] = useState([]);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState('idle'); // idle, detecting, success, error
  const [coords, setCoords] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const PLATFORMS = ['ZOMATO', 'SWIGGY', 'ZEPTO', 'AMAZON'];

  // Fetch zones on mount
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const { data } = await apiClient.get('/zones');
        setZones(data.data || []);
        if (data.data?.length > 0 && !formData.zone_id) {
          setFormData(prev => ({ ...prev, zone_id: data.data[0].zone_id }));
        }
      } catch (err) {
        console.error('Failed to fetch zones:', err);
      }
    };
    fetchZones();
  }, [formData.zone_id]);

  const handleDetectLocation = () => {
    setIsLocating(true);
    setLocationStatus('detecting');
    setError('');

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
        setLocationStatus('success');
        setIsLocating(false);
        
        // Snap to nearest zone
        if (zones.length > 0) {
          let nearest = zones[0].zone_id;
          let minDistance = Infinity;
          for (const z of zones) {
            if (z.lat && z.lon) {
              const d = Math.pow(z.lat - latitude, 2) + Math.pow(z.lon - longitude, 2);
              if (d < minDistance) {
                minDistance = d;
                nearest = z.zone_id;
              }
            }
          }
          setFormData(prev => ({ ...prev, zone_id: nearest }));
        }

        // Reverse GeoCode to get actual city/area name
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
          .then(res => res.json())
          .then(data => {
            if (data && data.address) {
              const area = data.address.city || data.address.town || data.address.suburb || data.address.village || data.address.county || 'Unknown Area';
              setLocationName(area);
            }
          })
          .catch(err => console.error('Reverse geocode error:', err));
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
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          emailRedirectTo: 'http://localhost:3010',
          data: {
            full_name: formData.name,
            name: formData.name,
            phone: formData.phone.startsWith('+91') ? formData.phone : `+91${formData.phone}`,
            phone_number: formData.phone.startsWith('+91') ? formData.phone : `+91${formData.phone}`,
            role: 'WORKER',
            platform: formData.platform,
            zone_id: formData.zone_id,
            latitude: coords?.latitude,
            longitude: coords?.longitude,
            locationVerified: locationStatus === 'success'
          }
        },
      });

      if (authError) throw authError;
      setStep(3);
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (step === 3) {
    return (
      <div className="min-h-screen bg-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email!</h2>
          <p className="text-gray-600 mb-6">
            We've sent a magic link to <span className="font-semibold text-indigo-600">{formData.email}</span>. 
            Click the link to complete your registration.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="text-indigo-600 font-medium hover:underline"
          >
            Ready to log in?
          </button>
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
                         'Use GPS for precise zone detection'}
                      </p>
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
