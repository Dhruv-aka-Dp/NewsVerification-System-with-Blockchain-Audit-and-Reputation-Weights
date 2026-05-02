const { seedDemoDataset } = require('../services/demoSeedService');

async function seedData() {
  try {
    const result = await seedDemoDataset();
    const action = result.resetApplied ? 'reset and reseeded' : 'verified';
    console.log(`[Seed] Demo dataset ${action}: ${result.items} items, ${result.votes} votes, ${result.reputationEvents} reputation events.`);
  } catch (err) {
    console.error('[Seed] Failed:', err);
  }
}

module.exports = seedData;
