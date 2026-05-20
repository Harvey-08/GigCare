// Cron job scheduler

const cron = require('node-cron');
require('dotenv').config();

// IMPORT EVALUATOR
const { evaluateAllTriggers } = require('./evaluator');

// SCHEDULE: Every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] Running trigger evaluation...`);

  try {
    const events = await evaluateAllTriggers();
    console.log(`Trigger check complete. ${events.length} events fired.`);

    events.forEach((ev) => {
      console.log(`  • ${ev.trigger_type} in ${ev.zone_id}: value=${ev.trigger_value}`);
    });
  } catch (err) {
    console.error(`Trigger evaluation failed: ${err.message}`);
    // NEVER let trigger engine crash - just log and continue
  }
});

if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_TRIGGER_CRON !== 'true') {
  setInterval(() => { }, 60 * 60 * 1000);
}

// MANUAL TEST: Disabled to prevent unexpected claims

console.log('Trigger Engine started.');
console.log('   Running every 30 minutes.');
