const supabase = require('../models/supabase');

function getFinancialYearStart(now = new Date()) {
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return new Date(year, 3, 1);
}

async function checkSSCodeEligibility(workerId) {
  const { data: worker, error } = await supabase
    .from('workers')
    .select('worker_id, engagement_days_this_fy, multi_platform, ss_code_eligible')
    .eq('worker_id', workerId)
    .maybeSingle();

  if (error && error.code !== 'PGRST205') {
    throw error;
  }

  // Legacy/profile-only schema fallback.
  if (error && error.code === 'PGRST205') {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, created_at')
      .eq('id', workerId)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!profile) {
      const notFoundError = new Error('Worker not found');
      notFoundError.status = 404;
      notFoundError.code = 'WORKER_NOT_FOUND';
      throw notFoundError;
    }

    const createdAt = profile.created_at ? new Date(profile.created_at) : new Date();
    const daysWorked = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
    const threshold = 90;
    const eligible = daysWorked >= threshold;

    return {
      eligible,
      days_worked: daysWorked,
      threshold,
      days_remaining: Math.max(0, threshold - daysWorked),
      fy_start: getFinancialYearStart().toISOString().split('T')[0],
      message: eligible
        ? `Eligible: ${daysWorked} days active in profile history (threshold: ${threshold})`
        : `Not yet eligible: ${daysWorked}/${threshold} days active. ${Math.max(0, threshold - daysWorked)} more days needed.`,
    };
  }

  if (!worker) {
    const notFoundError = new Error('Worker not found');
    notFoundError.status = 404;
    notFoundError.code = 'WORKER_NOT_FOUND';
    throw notFoundError;
  }

  const threshold = worker.multi_platform ? 120 : 90;
  const daysWorked = Number(worker.engagement_days_this_fy || 0);
  const eligible = daysWorked >= threshold;

  const { error: updateError } = await supabase
    .from('workers')
    .update({
      ss_code_eligible: eligible,
      eligibility_last_checked: new Date().toISOString(),
    })
    .eq('worker_id', workerId);

  if (updateError && updateError.code !== 'PGRST205') {
    throw updateError;
  }

  return {
    eligible,
    days_worked: daysWorked,
    threshold,
    days_remaining: Math.max(0, threshold - daysWorked),
    fy_start: getFinancialYearStart().toISOString().split('T')[0],
    message: eligible
      ? `Eligible: ${daysWorked} days worked this FY (threshold: ${threshold})`
      : `Not yet eligible: ${daysWorked}/${threshold} days worked this FY. ${Math.max(0, threshold - daysWorked)} more days needed.`,
  };
}

module.exports = {
  checkSSCodeEligibility,
  getFinancialYearStart,
};