const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const NewsItem = require('../models/NewsItem');
const User = require('../models/User');
const { sha256 } = require('../utils/hash');

// 40 News Items: Mixed classified and pending
const NEWS = [
  { s: 'National News', t: 'India successfully launches Chandrayaan-4 lunar sample return mission', d: 'ISRO confirmed the successful orbital insertion of Chandrayaan-4, marking India\'s first lunar sample return attempt. The spacecraft will collect regolith from the lunar south pole.', classified: true, label: 'Verified True', T: 45, F: 2, U: 3 },
  { s: 'JKLU Campus', t: 'JKLU BTech CSE students win Smart India Hackathon 2026 grand finale', d: 'A six-member team from JKLU\'s CSE department built a blockchain-based land registry verification system, winning the ₹1 lakh grand prize.', classified: true, label: 'Verified True', T: 38, F: 1, U: 4 },
  { s: 'Tech & Startup', t: 'WhatsApp launches UPI payments integration for 500 million Indian users', d: 'Meta completed NPCI compliance for full-scale UPI deployment, enabling in-chat payments and merchant QR scanning for all Indian users.', classified: true, label: 'Likely True', T: 30, F: 8, U: 5 },
  { s: 'Local Rajasthan', t: 'Jaipur Metro Phase-II extends to Mansarovar and Sitapura IT Park', d: 'JMRC approved the 23-km Phase-II extension connecting Mansarovar to Sitapura Industrial Area, reducing commute for 50,000+ IT professionals.', classified: true, label: 'Likely False', T: 5, F: 42, U: 7 },
  { s: 'Crime & Safety', t: 'Jaipur cyber cell busts ₹50 crore cryptocurrency fraud ring', d: 'Police arrested 12 individuals operating a fake crypto exchange that defrauded 3,000+ investors across Rajasthan.', classified: true, label: 'Verified True', T: 50, F: 0, U: 2 },
  { s: 'JKLU Campus', t: 'JKLU placement season records highest-ever average package of ₹12.5 LPA', d: 'The Training and Placement Cell reported 94% placement rate with top recruiters including TCS, Infosys, and Jio Platforms.', classified: false, T: 12, F: 2, U: 1 },
  { s: 'National News', t: 'Parliament passes Digital India Act 2026 replacing IT Act', d: 'The new legislation introduces algorithmic accountability for AI systems and mandatory data localization for sensitive personal data.', classified: false, T: 8, F: 1, U: 1 },
  { s: 'Events', t: 'TEDxJKLU 2026 explores theme of Decentralized Futures', d: 'Speakers discussed the future of decentralized governance, digital identity, and community-owned platforms at the JKLU campus.', classified: false, T: 5, F: 0, U: 0 },
  { s: 'Local Rajasthan', t: 'Water crisis deepens as Bisalpur Dam drops to 18% capacity', d: 'Jaipur Water Supply Department imposed strict rationing as Bisalpur Dam hit critical levels, supply reduced to alternate days.', classified: false, T: 3, F: 10, U: 2 },
  { s: 'Tech & Startup', t: 'Rajasthan launches state blockchain platform for land records', d: 'The DoIT&C deployed a permissioned blockchain network for tamper-proof land records across 33 districts.', classified: false, T: 6, F: 1, U: 1 },
  { s: 'National News', t: 'New National Highway connecting Jaipur and Gwalior approved', d: 'The Ministry of Road Transport and Highways sanctioned a 4-lane expressway to boost connectivity between Rajasthan and MP.', classified: true, label: 'Verified True', T: 25, F: 2, U: 3 },
  { s: 'JKLU Campus', t: 'JKLU hosts National Robotics Championship 2026', d: 'Over 100 teams from across India participated in the robot-war and obstacle-course challenges held at the Sabarmati grounds.', classified: true, label: 'Verified True', T: 32, F: 1, U: 5 },
  { s: 'Local Rajasthan', t: 'Rajasthan Renewable Energy Corp hits 25GW solar target', d: 'The state continues to lead India in solar power generation with major installations in Bhadla and Jaisalmer regions.', classified: true, label: 'Verified True', T: 40, F: 1, U: 2 },
  { s: 'Tech & Startup', t: 'Indian AI startup "Maitri" raises $50M for Indic LLMs', d: 'The Bangalore-based startup aims to build large language models optimized for 22 official Indian languages.', classified: true, label: 'Likely True', T: 22, F: 5, U: 4 },
  { s: 'Events', t: 'Jaipur Literature Festival 2026 to focus on Digital Narratives', d: 'The 19th edition of JLF will feature a dedicated track for AI-generated literature and decentralized publishing.', classified: false, T: 4, F: 0, U: 1 },
  { s: 'Crime & Safety', t: 'Rajasthan Police introduce drone surveillance in Jaipur old city', d: 'High-definition drones with night vision will monitor congested areas to prevent petty crimes and manage traffic flow.', classified: false, T: 7, F: 1, U: 2 },
  { s: 'National News', t: 'India signs strategic chip manufacturing pact with Taiwan', d: 'The agreement includes setting up a 28nm fabrication plant in Gujarat to strengthen India\'s semiconductor mission.', classified: true, label: 'Verified True', T: 35, F: 2, U: 4 },
  { s: 'JKLU Campus', t: 'JKLU launches Center for Web3 and Decentralized Systems', d: 'The new center will offer specialized certification programs and research opportunities in blockchain and dApps.', classified: true, label: 'Verified True', T: 28, F: 0, U: 2 },
  { s: 'Local Rajasthan', t: 'Jodhpur airport expansion to be completed by December 2026', d: 'The new terminal building will increase handling capacity to 2.5 million passengers annually.', classified: false, T: 1, F: 1, U: 1 },
  { s: 'Tech & Startup', t: 'Airtel and Jio start 6G trials in select Indian cities', d: 'The Department of Telecommunications authorized early-stage 6G research and spectrum testing in the THz band.', classified: false, T: 2, F: 5, U: 3 },
  { s: 'National News', t: 'India reaches $5 trillion economy milestone ahead of schedule', d: 'The World Bank report highlights strong growth in manufacturing and digital services as key drivers.', classified: false, T: 5, F: 8, U: 4 },
  { s: 'JKLU Campus', t: 'JKLU student startup "GreenScan" wins national sustainability award', d: 'The team developed a low-cost IoT device for real-time monitoring of industrial air pollution.', classified: true, label: 'Verified True', T: 22, F: 1, U: 3 },
  { s: 'Local Rajasthan', t: 'New wildlife sanctuary proposed in Pali district', d: 'The Rajasthan Forest Department submitted a proposal to conserve the habitat of endangered desert foxes.', classified: false, T: 2, F: 1, U: 0 },
  { s: 'Tech & Startup', t: 'Flipkart pilots drone delivery for medicines in remote Rajasthan', d: 'The pilot program in Barmer district reduced delivery times from 4 hours to 25 minutes.', classified: true, label: 'Likely True', T: 18, F: 4, U: 2 },
  { s: 'Events', t: 'Rajasthan IT Day 2026 to be held at JECC Jaipur', d: 'The event will showcase the state\'s progress in e-governance and the "Jan Kalyan" digital platform.', classified: true, label: 'Verified True', T: 25, F: 0, U: 1 },
  { s: 'National News', t: 'India becomes largest exporter of renewable energy equipment', d: 'Shipments of solar panels and wind turbine components reached record highs in the first quarter of 2026.', classified: false, T: 4, F: 3, U: 2 },
  { s: 'JKLU Campus', t: 'JKLU professor receives prestigious IEEE fellowship', d: 'Dr. Sharma was recognized for his contributions to privacy-preserving machine learning algorithms.', classified: true, label: 'Verified True', T: 15, F: 0, U: 1 },
  { s: 'Local Rajasthan', t: 'Udaipur records highest tourist footfall in 10 years', d: 'The "City of Lakes" saw over 2 million international and domestic visitors during the 2025-26 season.', classified: true, label: 'Verified True', T: 30, F: 1, U: 2 },
  { s: 'Tech & Startup', t: 'TCS to set up massive AI research lab in Jaipur', d: 'The facility will employ 2,000 engineers and focus on generative AI for enterprise solutions.', classified: false, T: 3, F: 2, U: 1 },
  { s: 'Crime & Safety', t: 'Rajasthan Cyber Cell launches WhatsApp helpline for fraud reporting', d: 'Citizens can now report suspicious links and messages directly to the state police via WhatsApp.', classified: true, label: 'Verified True', T: 20, F: 0, U: 1 },
  { s: 'National News', t: 'Central government mandates EVs for all official use by 2030', d: 'The new policy aims to reduce the government\'s carbon footprint and promote the domestic EV ecosystem.', classified: false, T: 6, F: 2, U: 1 },
  { s: 'JKLU Campus', t: 'JKLU cultural fest "Spardha" to feature international performers', d: 'The three-day extravaganza will host artists from five countries and showcase global folk traditions.', classified: false, T: 2, F: 1, U: 0 },
  { s: 'Local Rajasthan', t: 'New industrial park planned near Neemrana for Japanese firms', d: 'The Rajasthan State Industrial Development Corp (RIICO) allocated 500 acres for the project.', classified: true, label: 'Verified True', T: 18, F: 1, U: 2 },
  { s: 'Tech & Startup', t: 'Zomato starts AI-driven personalized dietary recommendations', d: 'The feature uses past order history and nutritional data to suggest healthy meal options.', classified: false, T: 4, F: 1, U: 1 },
  { s: 'Events', t: 'Jaipur to host International Yoga Day 2026 national event', d: 'Over 50,000 participants are expected to gather at the Albert Hall Museum for the mass session.', classified: true, label: 'Verified True', T: 28, F: 0, U: 2 },
  { s: 'National News', t: 'India launches first indigenously developed small modular reactor', d: 'The 220MW reactor in Karnataka marks a major milestone in India\'s clean energy transition.', classified: true, label: 'Verified True', T: 32, F: 2, U: 4 },
  { s: 'JKLU Campus', t: 'JKLU alumni network raises ₹5 crore for student scholarships', d: 'The fund will support meritorious students from economically weaker sections pursuing engineering.', classified: true, label: 'Verified True', T: 12, F: 0, U: 1 },
  { s: 'Local Rajasthan', t: 'Ajmer Sharif Dargah to get new digital museum', d: 'The museum will showcase the history of the Sufi shrine using AR and VR technologies.', classified: false, T: 3, F: 1, U: 1 },
  { s: 'Tech & Startup', t: 'PhonePe hits 1 trillion transaction volume in Rajasthan', d: 'The digital payment giant reported massive growth in rural Rajasthan over the last 12 months.', classified: true, label: 'Verified True', T: 24, F: 1, U: 3 },
  { s: 'National News', t: 'Indian Railways to introduce 50 more Vande Bharat trains by 2027', d: 'The new trains will connect tier-2 cities with state capitals using high-speed rail corridors.', classified: true, label: 'Verified True', T: 40, F: 1, U: 2 },
];

// 20 Demo users - No admin
const DEMO_USERS = [
  { username: 'dp', email: 'dp@jklu.edu.in', reputation: 90, is_reviewer: true },
  { username: 'arjun_sharma', email: 'arjun@jklu.edu.in', reputation: 75, is_reviewer: false },
  { username: 'priya_meena', email: 'priya@jklu.edu.in', reputation: 68, is_reviewer: false },
  { username: 'rahul_verma', email: 'rahul@jklu.edu.in', reputation: 45, is_reviewer: false },
  { username: 'sneha_gupta', email: 'sneha@jklu.edu.in', reputation: 58, is_reviewer: false },
  { username: 'vikram_singh', email: 'vikram@jklu.edu.in', reputation: 33, is_reviewer: false },
  { username: 'ananya_joshi', email: 'ananya@jklu.edu.in', reputation: 88, is_reviewer: true },
  { username: 'karan_patel', email: 'karan@jklu.edu.in', reputation: 25, is_reviewer: false },
  { username: 'neha_sharma', email: 'neha@jklu.edu.in', reputation: 62, is_reviewer: false },
  { username: 'rohit_kumar', email: 'rohit@jklu.edu.in', reputation: 55, is_reviewer: false },
  { username: 'pooja_singh', email: 'pooja@jklu.edu.in', reputation: 48, is_reviewer: false },
  { username: 'manoj_rao', email: 'manoj@jklu.edu.in', reputation: 40, is_reviewer: false },
  { username: 'sanjay_nair', email: 'sanjay@jklu.edu.in', reputation: 35, is_reviewer: false },
  { username: 'deepa_iyer', email: 'deepa@jklu.edu.in', reputation: 30, is_reviewer: false },
  { username: 'amit_desai', email: 'amit@jklu.edu.in', reputation: 80, is_reviewer: true },
  { username: 'ritu_verma', email: 'ritu@jklu.edu.in', reputation: 70, is_reviewer: false },
  { username: 'sunil_gupta', email: 'sunil@jklu.edu.in', reputation: 50, is_reviewer: false },
  { username: 'jyoti_patel', email: 'jyoti@jklu.edu.in', reputation: 42, is_reviewer: false },
  { username: 'akash_singh', email: 'akash@jklu.edu.in', reputation: 28, is_reviewer: false },
  { username: 'megha_rao', email: 'megha@jklu.edu.in', reputation: 22, is_reviewer: false },
];

async function seedData() {
  try {
    const count = await NewsItem.countDocuments();
    if (count > 0) {
      console.log(`[Seed] Database already has ${count} items. Skipping.`);
      return;
    }

    console.log('[Seed] Seeding 40 news items and 20 users...');
    const demoUsers = await ensureDemoUsers();
    const submitters = demoUsers;

    const items = [];
    for (let i = 0; i < NEWS.length; i++) {
      const n = NEWS[i];
      const contentHash = sha256(`${n.t}-${i}-${Date.now()}`);
      const submitter = submitters[i % submitters.length];
      const S = n.T + n.F + n.U;

      items.push({
        contentHash,
        metadataHash: sha256(contentHash + i),
        title: n.t,
        description: n.d,
        section: n.s,
        status: n.classified ? 'classified' : (S > 0 ? 'pending_review' : 'pending'),
        classification: n.classified ? n.label : null,
        T: n.T, F: n.F, U: n.U, S,
        polarity: S > 0 ? (n.T - n.F) / S : 0,
        confidence: S > 0 ? Math.abs(n.T - n.F) / S : 0,
        submitterId: submitter._id,
        finalizedAt: n.classified ? new Date() : null,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 86400000)),
      });
    }

    await NewsItem.insertMany(items);
    console.log(`[Seed] Seeded ${NEWS.length} news items.`);
  } catch (err) {
    console.error('[Seed] Failed:', err);
  }
}

async function ensureDemoUsers() {
  const created = [];
  const hash = await bcrypt.hash('demo123', 12);
  for (const u of DEMO_USERS) {
    let existing = await User.findOne({ username: u.username });
    if (!existing) {
      existing = new User({
        ...u, passwordHash: hash, authMethod: 'email',
        isVerified: true,
        totalSubmissions: Math.floor(Math.random() * 10) + 2,
        correctSubmissions: Math.floor(Math.random() * 8) + 1,
      });
      await existing.save();
      console.log(`[Seed] Created user: ${u.username} (demo123)`);
    }
    created.push(existing);
  }
  return created;
}

module.exports = seedData;
