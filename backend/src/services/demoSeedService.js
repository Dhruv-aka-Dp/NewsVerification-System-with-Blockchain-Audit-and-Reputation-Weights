const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const Decision = require('../models/Decision');
const NewsItem = require('../models/NewsItem');
const ReputationEvent = require('../models/ReputationEvent');
const ReputationSnapshot = require('../models/ReputationSnapshot');
const User = require('../models/User');
const Vote = require('../models/Vote');
const { aggregateItem, computeCredibility } = require('./aggregationService');
const { seedInitialReputationEvent } = require('./reputationService');
const { sha256 } = require('../utils/hash');
const { computeWeight } = require('./weightService');

const SECTIONS = ['National News', 'Local Rajasthan', 'JKLU Campus', 'Tech & Startup', 'Crime & Safety', 'Events'];

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

const DEMO_USERS = [
  { username: 'dp', email: 'dp@jklu.edu.in', password: 'demo123', reputation: 90, is_reviewer: true, is_seed: true, totalSubmissions: 12, correctSubmissions: 10 },
  { username: 'arjun_sharma', email: 'arjun@jklu.edu.in', password: 'demo123', reputation: 75, is_reviewer: false, is_seed: false, totalSubmissions: 9, correctSubmissions: 7 },
  { username: 'priya_meena', email: 'priya@jklu.edu.in', password: 'demo123', reputation: 68, is_reviewer: false, is_seed: false, totalSubmissions: 8, correctSubmissions: 6 },
  { username: 'rahul_verma', email: 'rahul@jklu.edu.in', password: 'demo123', reputation: 45, is_reviewer: false, is_seed: false, totalSubmissions: 7, correctSubmissions: 4 },
  { username: 'sneha_gupta', email: 'sneha@jklu.edu.in', password: 'demo123', reputation: 58, is_reviewer: false, is_seed: false, totalSubmissions: 6, correctSubmissions: 4 },
  { username: 'vikram_singh', email: 'vikram@jklu.edu.in', password: 'demo123', reputation: 33, is_reviewer: false, is_seed: false, totalSubmissions: 5, correctSubmissions: 2 },
  { username: 'ananya_joshi', email: 'ananya@jklu.edu.in', password: 'demo123', reputation: 88, is_reviewer: true, is_seed: true, totalSubmissions: 11, correctSubmissions: 9 },
  { username: 'karan_patel', email: 'karan@jklu.edu.in', password: 'demo123', reputation: 25, is_reviewer: false, is_seed: false, totalSubmissions: 3, correctSubmissions: 1 },
  { username: 'neha_sharma', email: 'neha@jklu.edu.in', password: 'demo123', reputation: 62, is_reviewer: false, is_seed: false, totalSubmissions: 6, correctSubmissions: 5 },
  { username: 'rohit_kumar', email: 'rohit@jklu.edu.in', password: 'demo123', reputation: 55, is_reviewer: false, is_seed: false, totalSubmissions: 5, correctSubmissions: 3 },
  { username: 'pooja_singh', email: 'pooja@jklu.edu.in', password: 'demo123', reputation: 48, is_reviewer: false, is_seed: false, totalSubmissions: 4, correctSubmissions: 2 },
  { username: 'manoj_rao', email: 'manoj@jklu.edu.in', password: 'demo123', reputation: 40, is_reviewer: false, is_seed: false, totalSubmissions: 4, correctSubmissions: 2 },
  { username: 'sanjay_nair', email: 'sanjay@jklu.edu.in', password: 'demo123', reputation: 35, is_reviewer: false, is_seed: false, totalSubmissions: 4, correctSubmissions: 1 },
  { username: 'deepa_iyer', email: 'deepa@jklu.edu.in', password: 'demo123', reputation: 30, is_reviewer: false, is_seed: false, totalSubmissions: 4, correctSubmissions: 2 },
  { username: 'amit_desai', email: 'amit@jklu.edu.in', password: 'demo123', reputation: 80, is_reviewer: true, is_seed: true, totalSubmissions: 10, correctSubmissions: 8 },
  { username: 'ritu_verma', email: 'ritu@jklu.edu.in', password: 'demo123', reputation: 70, is_reviewer: false, is_seed: true, totalSubmissions: 7, correctSubmissions: 5 },
  { username: 'sunil_gupta', email: 'sunil@jklu.edu.in', password: 'demo123', reputation: 50, is_reviewer: false, is_seed: false, totalSubmissions: 5, correctSubmissions: 3 },
  { username: 'jyoti_patel', email: 'jyoti@jklu.edu.in', password: 'demo123', reputation: 42, is_reviewer: false, is_seed: false, totalSubmissions: 4, correctSubmissions: 2 },
  { username: 'akash_singh', email: 'akash@jklu.edu.in', password: 'demo123', reputation: 28, is_reviewer: false, is_seed: false, totalSubmissions: 3, correctSubmissions: 1 },
  { username: 'megha_rao', email: 'megha@jklu.edu.in', password: 'demo123', reputation: 22, is_reviewer: false, is_seed: false, totalSubmissions: 3, correctSubmissions: 1 },
  { username: 'admin', email: 'admin@newsverify.local', password: 'admin123', reputation: 95, is_reviewer: true, is_seed: true, totalSubmissions: 0, correctSubmissions: 0 },
];

function getDemoUserFixture(identifier) {
  return DEMO_USERS.find(
    (user) => user.email === identifier || user.username === identifier
  ) || null;
}

function buildContentHash(label, index) {
  return sha256(`${label}:${index}:${uuidv4()}`);
}

function buildPastDate(daysAgo, hourOffset = 0) {
  return new Date(Date.now() - (daysAgo * 24 + hourOffset) * 60 * 60 * 1000);
}

async function ensureDemoUsers() {
  const users = [];

  for (const fixture of DEMO_USERS) {
    let user = await User.findOne({ email: fixture.email });
    const passwordHash = await bcrypt.hash(fixture.password, 12);
    const lastValidatedActivity = new Date();

    if (!user) {
      user = new User({
        username: fixture.username,
        email: fixture.email,
        passwordHash,
        authMethod: 'email',
        isVerified: true,
        verificationNote: 'Demo account',
        reputation: fixture.reputation,
        is_seed: fixture.is_seed,
        is_reviewer: fixture.is_reviewer,
        totalSubmissions: fixture.totalSubmissions,
        correctSubmissions: fixture.correctSubmissions,
        lastValidatedActivity,
      });
    } else {
      user.username = fixture.username;
      user.email = fixture.email;
      user.passwordHash = passwordHash;
      user.authMethod = 'email';
      user.isVerified = true;
      user.verificationNote = 'Demo account';
      user.reputation = fixture.reputation;
      user.is_seed = fixture.is_seed;
      user.is_reviewer = fixture.is_reviewer;
      user.totalSubmissions = fixture.totalSubmissions;
      user.correctSubmissions = fixture.correctSubmissions;
      user.lastValidatedActivity = lastValidatedActivity;
      user.anomalyEta = 1.0;
      user.lastAnomalyDetected = null;
    }

    await user.save();
    users.push(user);
  }

  return users;
}

async function createVotesForItem(item, voters, direction, confidence, createdAt) {
  for (const voter of voters) {
    await Vote.create({
      itemId: item._id,
      userId: voter._id,
      direction,
      confidence,
      weight: computeWeight(voter, confidence),
      voteHash: sha256(`${voter._id}:${item._id}:${direction}:${confidence}:${uuidv4()}`),
      nonce: uuidv4(),
      createdAt,
    });
  }
}

async function syncAggregateMetrics(item, submitter) {
  const { T, F, U, S, P, U_r, C } = await aggregateItem(item._id);
  const submitterReliability = submitter
    ? submitter.correctSubmissions / Math.max(submitter.totalSubmissions || 1, 1)
    : 0;

  item.T = T;
  item.F = F;
  item.U = U;
  item.S = S;
  item.polarity = P;
  item.confidence = C;
  item.uncertaintyRatio = U_r;
  item.credibilityScore = computeCredibility(P, C, item.evidenceScore || 0, submitterReliability, U_r);
  item.voteCount = await Vote.countDocuments({ itemId: item._id });
  await item.save();
}

async function createClassifiedItems(submitter, voters) {
  const items = [];

  for (let i = 0; i < 5; i++) {
    const isTrue = i % 2 === 0;
    const direction = isTrue ? 1 : -1;
    const titlePool = isTrue ? TRUE_TITLES : FALSE_TITLES;
    const title = `[CLASSIFIED] ${titlePool[i % titlePool.length]}`;
    const createdAt = buildPastDate(5 - (i % 3), i + 1);
    const contentHash = buildContentHash('classified', i);

    const item = await NewsItem.create({
      contentHash,
      metadataHash: sha256(`${contentHash}:meta`),
      title,
      description: isTrue
        ? 'Pre-classified demo item with completed voting data.'
        : 'Pre-classified demo item showing a completed false classification.',
      section: SECTIONS[i % SECTIONS.length],
      submitterId: submitter._id,
      status: 'classified',
      classification: isTrue ? 'Verified True' : 'False',
      createdAt,
      finalizedAt: new Date(createdAt.getTime() + 4 * 60 * 60 * 1000),
    });

    const itemVoters = voters.slice(i % 3, i % 3 + 4);
    await createVotesForItem(item, itemVoters, direction, 1.5, new Date(createdAt.getTime() + 60 * 60 * 1000));
    await syncAggregateMetrics(item, submitter);

    const proofHash = sha256(`${item.contentHash}:${item.classification}:${item.T}:${item.F}:${item.U}:${item.confidence}:${item.polarity}`);
    await Decision.create({
      itemId: item._id,
      classification: item.classification,
      credibilityScore: item.credibilityScore,
      polarity: item.polarity,
      confidence: item.confidence,
      uncertaintyRatio: item.uncertaintyRatio,
      T: item.T,
      F: item.F,
      U: item.U,
      S: item.S,
      decisionProofHash: proofHash,
      decidedBy: 'system',
      createdAt: item.finalizedAt,
    });

    items.push(item);
  }

  return items;
}

async function createPendingItems(submitter) {
  const items = [];

  for (let i = 0; i < 10; i++) {
    const title = `[PENDING] ${TRUE_TITLES[(i + 10) % TRUE_TITLES.length]}`;
    const createdAt = buildPastDate(2, i);
    const contentHash = buildContentHash('pending', i);

    items.push(await NewsItem.create({
      contentHash,
      metadataHash: sha256(`${contentHash}:meta`),
      title,
      description: 'Fresh demo item. Voting refreshes activity time, but reputation waits until classification.',
      section: SECTIONS[i % SECTIONS.length],
      submitterId: submitter._id,
      status: 'pending',
      T: 0,
      F: 0,
      U: 0,
      S: 0,
      voteCount: 0,
      createdAt,
    }));
  }

  return items;
}

async function createPendingReviewItems(submitter, voters) {
  const items = [];

  for (let i = 0; i < 10; i++) {
    const isTrue = i < 20;
    const direction = isTrue ? 1 : -1;
    const titlePool = isTrue ? TRUE_TITLES : FALSE_TITLES;
    const title = `[READY FOR FINAL VOTE] ${titlePool[i % titlePool.length]} (${i + 1})`;
    const createdAt = buildPastDate(1, i % 8);
    const contentHash = buildContentHash('pending-review', i);

    const item = await NewsItem.create({
      contentHash,
      metadataHash: sha256(`${contentHash}:meta`),
      title,
      description: isTrue
        ? 'Three aligned votes are already present. One more TRUE vote classifies this item.'
        : 'Three aligned votes are already present. One more FALSE vote classifies this item.',
      section: SECTIONS[i % SECTIONS.length],
      submitterId: submitter._id,
      status: 'pending_review',
      createdAt,
    });

    const voterOffset = i % (voters.length - 2);
    const itemVoters = voters.slice(voterOffset, voterOffset + 3);
    await createVotesForItem(item, itemVoters, direction, 1.5, new Date(createdAt.getTime() + 30 * 60 * 1000));
    await syncAggregateMetrics(item, submitter);
    item.status = 'pending_review';
    item.classification = null;
    await item.save();
    items.push(item);
  }

  return items;
}

async function seedInitialLedger(users) {
  const existingEvents = await ReputationEvent.countDocuments();
  if (existingEvents > 0) return;

  for (const user of users) {
    await seedInitialReputationEvent(user, {
      eventTime: user.createdAt || new Date(),
    });
  }
}

async function needsDatasetReset() {
  const total = await NewsItem.countDocuments();
  if (total !== 25) return true;

  const [pending, pendingReview, classified, decisions, votes] = await Promise.all([
    NewsItem.countDocuments({ status: 'pending' }),
    NewsItem.countDocuments({ status: 'pending_review' }),
    NewsItem.countDocuments({ status: 'classified' }),
    Decision.countDocuments(),
    Vote.countDocuments(),
  ]);

  return pending !== 10 || pendingReview !== 10 || classified !== 5 || decisions !== 5 || votes !== 50;
}

async function clearDemoDataset() {
  await Vote.deleteMany({});
  await Decision.deleteMany({});
  await NewsItem.deleteMany({});
  await ReputationEvent.deleteMany({});
  await ReputationSnapshot.deleteMany({});
}

async function seedDemoDataset({ forceReset = false } = {}) {
  const users = await ensureDemoUsers();
  const shouldReset = forceReset || await needsDatasetReset();

  if (shouldReset) {
    await clearDemoDataset();

    const submitter = users.find((user) => user.username === 'dp') || users[0];
    const generalVotePool = users.filter(
      (user) => user.username !== 'dp' && user.email !== 'admin@newsverify.local'
    );
    const nonSeedVotePool = generalVotePool.filter((user) => !user.is_seed);

    await createClassifiedItems(submitter, generalVotePool);
    await createPendingItems(submitter);
    await createPendingReviewItems(submitter, nonSeedVotePool);
  }

  await seedInitialLedger(users);

  return {
    users: users.length,
    items: await NewsItem.countDocuments(),
    votes: await Vote.countDocuments(),
    decisions: await Decision.countDocuments(),
    reputationEvents: await ReputationEvent.countDocuments(),
    resetApplied: shouldReset,
  };
}

module.exports = {
  DEMO_USERS,
  getDemoUserFixture,
  seedDemoDataset,
};
