// services/trigger-engine/scheduler.js
// Cron job scheduler - Person C

const cron = require('node-cron');
require('dotenv').config();

// =====================================================
// IMPORT EVALUATOR
// =====================================================
const { evaluateAllTriggers } = require('./evaluator');

// =====================================================
// SCHEDULE: Every 30 minutes
// =====================================================
cron.schedule('*/30 * * * *', async () => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] ⏰ Running trigger evaluation...`);
  
  try {
    const events = await evaluateAllTriggers();
    console.log(`✅ Trigger check complete. ${events.length} events fired.`);
    
    events.forEach(ev => {
      console.log(`  • ${ev.trigger_type} in ${ev.zone_id}: value=${ev.trigger_value}`);
    });
  } catch (err) {
    console.error(`❌ Trigger evaluation failed: ${err.message}`);
    // NEVER let trigger engine crash - just log and continue
  }
});

// =====================================================
// MANUAL TEST: Fire trigger immediately on startup (for demo)
// =====================================================
if (process.env.FIRE_ON_START === 'true') {
  setTimeout(async () => {
    console.log('\n🔥 FIRING TEST TRIGGER ON START...');
    try {
      const events = await evaluateAllTriggers();
      console.log(`Test trigger fired, ${events.length} events created`);
    } catch (err) {
      console.error('Test trigger failed:', err.message);
    }
  }, 3000);
}

console.log('🚀 Trigger Engine started. Running every 30 minutes.');
console.log('   Next check: in ~30 minutes');
console.log('   To fire immediately for demo: set FIRE_ON_START=true in .env');
