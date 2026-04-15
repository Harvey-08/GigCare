// services/api/models/db.js
const supabase = require('./supabase');

// =====================================================
// QUERY HELPER (Compatibility Layer)
// =====================================================
async function query(table, action, data = {}) {
  // This is a simplified helper to mimic the old query style if needed
  // But it's better to use Supabase client directly
  console.log(`[SUPABASE ${action}] on ${table}`);
  return null; 
}

// =====================================================
// REFACTORED EXPORTED QUERIES
// =====================================================

// PROFILES (Replaces Workers/Admins)
const getProfile = async (id) => {
  return await supabase.from('profiles').select('*').eq('id', id).single();
};

const getProfileByEmail = async (email) => {
  const { data, error } = await supabase.from('profiles').select('*').eq('email', email).maybeSingle();
  return data;
};

const getProfileByEmailOrPhone = async (email, phone) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`email.eq.${email},phone.eq.${phone}`)
    .maybeSingle();
  return data;
};

const createProfile = async (profile) => {
  return await supabase.from('profiles').insert(profile).select().single();
};

const updateProfile = async (id, updates) => {
  return await supabase.from('profiles').update(updates).eq('id', id).select().single();
};

// ZONES
const getZones = async () => {
  return await supabase.from('zones').select('*').order('zone_risk_score', { ascending: true });
};

const getZone = async (zone_id) => {
  return await supabase.from('zones').select('*').eq('zone_id', zone_id).single();
};

// POLICIES
const createPolicy = async (user_id, tier, premium, max_payout, week_start, week_end) => {
  return await supabase.from('policies').insert({
    user_id,
    coverage_tier: tier,
    premium_paid: premium,
    max_payout: max_payout,
    week_start,
    week_end,
    status: 'PENDING_PAYMENT'
  }).select().single();
};

const activatePolicy = async (policy_id, payment_id) => {
  return await supabase.from('policies').update({
    status: 'ACTIVE',
    razorpay_payment_id: payment_id
  }).eq('policy_id', policy_id).select().single();
};

const getPoliciesForUser = async (user_id) => {
  return await supabase.from('policies').select('*').eq('user_id', user_id).order('created_at', { ascending: false });
};

// CLAIMS
const createClaim = async (policy_id, user_id, event_id, trigger_type, payout, trust_score, status) => {
  return await supabase.from('claims').insert({
    policy_id,
    user_id,
    trigger_event_id: event_id,
    trigger_type,
    final_payout: payout,
    trust_score,
    status
  }).select().single();
};

const getClaimsForUser = async (user_id) => {
  return await supabase.from('claims').select('*').eq('user_id', user_id).order('created_at', { ascending: false });
};

const getActivePoliciesInZone = async (zone_id, current_date) => {
  // Complex join: policies for workers in a specific zone
  const { data, error } = await supabase
    .from('policies')
    .select('*, profiles!inner(zone_id)')
    .eq('status', 'ACTIVE')
    .lte('week_start', current_date)
    .gte('week_end', current_date)
    .eq('profiles.zone_id', zone_id);
  
  return { data, error };
};

// TRIGGER EVENTS
const createTriggerEvent = async (zone_id, trigger_type, trigger_value, severity) => {
  return await supabase.from('trigger_events').insert({
    zone_id,
    trigger_type,
    trigger_value,
    severity_factor: severity,
    event_status: 'ACTIVE'
  }).select().single();
};

module.exports = {
  getProfile,
  getProfileByEmail,
  getProfileByEmailOrPhone,
  createProfile,
  updateProfile,
  getZones,
  getZone,
  createPolicy,
  getPoliciesForUser,
  createClaim,
  getClaimsForUser,
  getActivePoliciesInZone,
  createTriggerEvent,
  supabase // Export client for direct use
};
