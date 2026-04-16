const supabase = require('../models/supabase');

function getConsentText(consentType) {
  const consentTexts = {
    GPS_LOCATION: 'GigCare requests access to your device location only when you submit a claim, to verify you are in the affected zone. Your location is not tracked continuously. Location data is stored for 90 days and then deleted.',
    BANK_UPI: 'Your UPI ID is used only to transfer your insurance payout. GigCare does not store full bank details. UPI ID is encrypted at rest and may be updated or removed at any time.',
    PLATFORM_ACTIVITY: 'With your consent, GigCare uses your self-reported delivery days to verify SS Code 2020 eligibility. No individual order logs are accessed. You may update this count monthly.',
  };

  return consentTexts[consentType] || null;
}

function requireConsent(consentType) {
  return async (req, res, next) => {
    try {
      const workerId = req.user?.user_id || req.params.id;

      if (!workerId) {
        return res.status(400).json({ error: 'Worker context required', code: 'WORKER_REQUIRED' });
      }

      const { data: consent, error } = await supabase
        .from('consent_records')
        .select('consent_granted, revoked_at')
        .eq('worker_id', workerId)
        .eq('consent_type', consentType)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!consent || !consent.consent_granted || consent.revoked_at) {
        return res.status(403).json({
          error: 'Consent required',
          code: 'CONSENT_REQUIRED',
          consent_type: consentType,
          consent_text: getConsentText(consentType),
        });
      }

      next();
    } catch (err) {
      console.error('Consent middleware error:', err);
      res.status(500).json({ error: 'Consent check failed', code: 'CONSENT_CHECK_FAILED' });
    }
  };
}

module.exports = {
  requireConsent,
  getConsentText,
};