// services/trigger-engine/models/db.js
const supabase = require('./supabase');

// =====================================================
// REFACTORED EXPORTED QUERIES
// =====================================================

const getZones = async () => {
  return await supabase.from('zones').select('*').order('zone_risk_score', { ascending: true });
};

const getZone = async (zone_id) => {
  return await supabase.from('zones').select('*').eq('zone_id', zone_id).single();
};

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

const getActivePoliciesInZone = async (zone_id, current_date) => {
  const { data, error } = await supabase
    .from('policies')
    .select('*, profiles!inner(zone_id)')
    .eq('status', 'ACTIVE')
    .lte('week_start', current_date)
    .gte('week_end', current_date)
    .eq('profiles.zone_id', zone_id);
  
  return { data, error };
};

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
  getZones,
  getZone,
  createClaim,
  getActivePoliciesInZone,
  createTriggerEvent,
  supabase
};
