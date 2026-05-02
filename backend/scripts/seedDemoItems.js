/**
 * ERDS Demo Seed Script
 * ----------------------
 * Generates 50 demo news items:
 *   - 10 already "classified"
 *   - 10 "pending" (fresh, 0 votes)
 *   - 30 "pending_review" — each has 4 seed-user votes already cast (TRUE direction),
 *     so that ONE more vote by any demo user will push them over MIN_S=5 and auto-classify.
 *
 * Usage: node backend/scripts/seedDemoItems.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const User = require('../src/models/User');
const NewsItem = require('../src/models/NewsItem');
const Vote = require('../src/models/Vote');

const SECTIONS = ['National News', 'Local Rajasthan', 'JKLU Campus', 'Tech & Startup', 'Crime & Safety', 'Events'];
const CLASSIFICATIONS = ['Verified True', 'Likely True', 'Uncertain', 'Likely False', 'False'];

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

const TRUE_TITLES = [
  'JKLU Research Team Publishes Paper in IEEE Conference',
  'Jaipur Metro Phase II Gets Cabinet Approval',
  'Rajasthan Government Launches Free Wifi Scheme',
  'Tech Startup from JKLU Raises Seed Funding',
  'District Collector Inaugurates New Water Plant in Ajmer',
  'JKLU Wins Inter-University Hackathon for Third Consecutive Year',
  'State Government to Open 1000 New Schools in Rural Areas',
  'Indian Rover Team Qualifies for World Finals',
  'Rajasthan Police Busts Cyber Fraud Gang in Jaipur',
  'New Direct Train Between Jaipur and Mumbai Announced',
  'JKLU Student Wins National Innovation Award',
  'Solar Power Plant Inaugurated in Barmer District',
  'High Court Orders Cleanup of Mansagar Lake',
  'Government Scholarship for SC/ST Students Expanded',
  'JKLU Research Center Partners with ISRO',
  'Rajasthan Tourism Hits Record High This Season',
  'New EV Charging Stations Installed Across Jaipur',
  'JKLU Coding Club Hosts Biggest Hackathon in Rajasthan',
  'Municipal Corporation Rolls Out Smart Garbage Trucks',
  'Rajasthan Student Wins Gold at National Science Olympiad',
  'Government Announces Farmer Credit Waiver of Rs. 2000 Crore',
  'JKLU Launches Free Coding Bootcamp for Rural Youth',
  'District Administration Distributes 10,000 Solar Lamps',
  'Jaipur Tops Smart City Rankings in North India',
  'State Police Adopts AI-Based CCTV Surveillance System',
  'JKLU Innovation Lab Gets Rs. 5 Crore Research Grant',
  'National Highways Authority to Build Bypass Around Jaipur',
  'Rajasthan Becomes Top 5 State in Ease of Doing Business',
  'JKLU Alumni Foundation Donates Library to Village School',
  'Heritage Walk Programme Launched in Jaisalmer',
];

const FALSE_TITLES = [
  'Rajasthan Government to Shut Down All Private Universities',
  'JKLU Student Arrested for Running Fake Job Portal',
  'Chief Minister Resigns Amid Corruption Scandal: Sources',
  'Jaipur Airport to Be Relocated Outside City Limits Immediately',
  'Mass Water Contamination Crisis Hits Three Rajasthan Districts',
  'JKLU Campus to Close for Six Months Due to Structural Issues',
  'State Police Chief Suspended Over Bribery Allegation',
  'Fake Tender Scam Worth 500 Crore Uncovered at NHAI Office',
  'Rajasthan Tops Country in School Dropout Rate: New Report',
  'Local MLA Under Investigation for Land Encroachment',
];

function makeContentHash(title) {
  return sha256(`${title}${uuidv4()}`);
}

async function main() {
  const dbUri = process.env.MONGO_URI || 'mongodb://localhost:27017/newsverify';
  await mongoose.connect(dbUri);
  console.log('Connected to MongoDB:', dbUri);

  // Find seed users for pre-voting
  const seedUsers = await User.find({ is_seed: true }).limit(4);
  if (seedUsers.length < 4) {
    console.error('Need at least 4 seed users. Run the main app first to seed users.');
    process.exit(1);
  }

  // Find any submitter for items
  const submitter = seedUsers[0];

  let created = 0;
  let skipped = 0;

  // === 10 CLASSIFIED items ===
  for (let i = 0; i < 10; i++) {
    const isTrue = i % 2 === 0;
    const titles = isTrue ? TRUE_TITLES : FALSE_TITLES;
    const title = `[CLASSIFIED] ${titles[i % titles.length]}`;
    const contentHash = makeContentHash(title);
    const classLabel = isTrue ? 'Verified True' : 'False';
    try {
      await NewsItem.create({
        contentHash,
        metadataHash: sha256(contentHash + 'meta'),
        title,
        description: `Pre-classified demo item. Outcome: ${classLabel}`,
        section: SECTIONS[i % SECTIONS.length],
        submitterId: submitter._id,
        status: 'classified',
        classification: classLabel,
        polarity: isTrue ? 0.8 : -0.8,
        confidence: 0.85,
        uncertaintyRatio: 0.1,
        T: isTrue ? 4 : 0,
        F: isTrue ? 0 : 4,
        U: 0,
        S: 4,
        voteCount: 4,
        finalizedAt: new Date(),
      });
      created++;
    } catch { skipped++; }
  }

  // === 10 PENDING items (fresh, 0 votes) ===
  for (let i = 0; i < 10; i++) {
    const title = `[NEW] ${TRUE_TITLES[(i + 10) % TRUE_TITLES.length]}`;
    const contentHash = makeContentHash(title);
    try {
      await NewsItem.create({
        contentHash,
        metadataHash: sha256(contentHash + 'meta'),
        title,
        description: 'Fresh item awaiting its first vote.',
        section: SECTIONS[i % SECTIONS.length],
        submitterId: submitter._id,
        status: 'pending',
        T: 0, F: 0, U: 0, S: 0,
        voteCount: 0,
      });
      created++;
    } catch { skipped++; }
  }

  // === 30 PENDING_REVIEW items (4 seed votes already cast, 1 more = classified) ===
  for (let i = 0; i < 30; i++) {
    const isTrue = i < 20; // 20 lean-true, 10 lean-false
    const title = `[VOTE NOW] ${isTrue ? TRUE_TITLES[i % TRUE_TITLES.length] : FALSE_TITLES[i % FALSE_TITLES.length]} — Round ${Math.floor(i / 10) + 1}`;
    const contentHash = makeContentHash(title);

    let item;
    try {
      item = await NewsItem.create({
        contentHash,
        metadataHash: sha256(contentHash + 'meta'),
        title,
        description: isTrue
          ? 'This item has 4 supporting votes from verified users. One more TRUE vote will classify it as Verified True.'
          : 'This item has 4 false votes from verified users. One more FALSE vote will classify it as False.',
        section: SECTIONS[i % SECTIONS.length],
        submitterId: submitter._id,
        status: 'pending_review',
        polarity: isTrue ? 0.75 : -0.75,
        confidence: 0.82,
        uncertaintyRatio: 0.1,
        T: isTrue ? 4 : 0,
        F: isTrue ? 0 : 4,
        U: 0,
        S: 4,
        voteCount: 4,
      });
      created++;
    } catch { skipped++; continue; }

    // Record the 4 pre-cast votes from seed users (direction = true/false)
    for (let j = 0; j < 4; j++) {
      const voter = seedUsers[j];
      const direction = isTrue ? 1 : -1;
      try {
        await Vote.create({
          itemId: item._id,
          userId: voter._id,
          direction,
          confidence: 1.5,
          weight: 0.5 + voter.reputation / 100,
          voteHash: sha256(`${voter._id}${item._id}${direction}1.5${uuidv4()}`),
          nonce: uuidv4(),
        });
      } catch {
        // vote may already exist if re-running script
      }
    }
  }

  console.log(`\nSeeded: ${created} items created, ${skipped} skipped (already exist).`);
  console.log('\nBreakdown:');
  console.log('  10 Classified items');
  console.log('  10 Pending items (0 votes, open for first votes)');
  console.log('  30 Pending Review items (4 seed votes cast — ONE MORE VOTE CLASSIFIES)');
  console.log('\nTo demo reputation changes: log in as a demo user and vote on any [VOTE NOW] item.');
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
