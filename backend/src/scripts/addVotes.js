require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const NewsItem = require('../models/NewsItem');
const Vote = require('../models/Vote');
const User = require('../models/User');
const { computeWeight } = require('../services/weightService');
const { sha256 } = require('../utils/hash');
const seedData = require('./seed');

/**
 * Script to generate votes for classified news items
 * Creates actual Vote documents based on T, F, U values from seed
 * Ensures each classified item has 10+ votes
 */

async function generateVotesForNews() {
  try {
    await connectDB();
    console.log('✓ Database connected\n');

    // Run seed first
    await seedData();

    // Get all classified news items
    const classifiedNews = await NewsItem.find({
      classification: { $ne: null },
      status: 'classified'
    }).sort({ _id: 1 });

    console.log(`\nFound ${classifiedNews.length} classified news items\n`);

    if (classifiedNews.length === 0) {
      console.log('No classified news items found');
      process.exit(0);
    }

    // Get all users
    const users = await User.find().sort({ _id: 1 });
    console.log(`Using ${users.length} users for voting\n`);

    let totalVotesAdded = 0;

    // For each classified news item
    for (const newsItem of classifiedNews) {
      const title = newsItem.title.length > 50 ? newsItem.title.substring(0, 50) + '...' : newsItem.title;
      console.log(`\n📰 "${title}"`);
      console.log(`   Classification: ${newsItem.classification}`);
      console.log(`   Seed values: T=${newsItem.T}, F=${newsItem.F}, U=${newsItem.U}`);

      // Check existing votes
      const existingVotes = await Vote.find({ itemId: newsItem._id });
      const existingCount = existingVotes.length;

      if (existingCount >= 10) {
        console.log(`   ✓ Already has ${existingCount} votes (enough!)`);
        continue;
      }

      // Generate votes to reach at least 10
      const votesNeeded = 10 - existingCount;
      console.log(`   Adding ${votesNeeded} votes (currently ${existingCount})...`);

      // Get voters who haven't voted yet
      const existingVoters = new Set(existingVotes.map(v => v.userId.toString()));
      const availableVoters = users.filter(u => !existingVoters.has(u._id.toString()));

      if (availableVoters.length === 0) {
        console.log(`   ⚠️ No more voters available`);
        continue;
      }

      // Determine vote distribution based on T, F, U
      const totalSignal = newsItem.T + newsItem.F + newsItem.U;
      const ratioT = totalSignal > 0 ? newsItem.T / totalSignal : 0;
      const ratioF = totalSignal > 0 ? newsItem.F / totalSignal : 0;
      const ratioU = totalSignal > 0 ? newsItem.U / totalSignal : 0;

      // Create votes based on ratios
      const votesToAdd = availableVoters.slice(0, votesNeeded);
      const confidenceLevels = [0.5, 1.0, 1.5];

      for (let i = 0; i < votesToAdd.length; i++) {
        const user = votesToAdd[i];
        const rand = Math.random();

        // Determine direction based on ratio
        let direction;
        if (rand < ratioT) {
          direction = 1;  // True
        } else if (rand < ratioT + ratioF) {
          direction = -1;  // False
        } else {
          direction = 0;  // Uncertain
        }

        // Assign confidence
        const confidence = confidenceLevels[i % 3];

        // Compute weight using reputation decay
        const weight = computeWeight(user, confidence);

        // Create vote hash
        const nonce = Math.random().toString(36).substring(2, 15);
        const voteHashString = `${user._id}:${direction}:${confidence}:${nonce}`;
        const voteHash = sha256(voteHashString);

        // Mock IP hash
        const voterIpHash = sha256(`192.168.${Math.floor(i / 256)}.${i % 256}`);

        const vote = new Vote({
          itemId: newsItem._id,
          userId: user._id,
          direction,
          confidence,
          weight,
          voteHash,
          nonce,
          voterIpHash,
          createdAt: new Date(Date.now() - Math.random() * 3600000),  // Random time in last hour
        });

        await vote.save();

        const directionStr = direction === 1 ? '✓ True' : direction === -1 ? '✗ False' : '? Uncertain';
        console.log(`      ${i + 1}. ${user.username.padEnd(20)} - ${directionStr} (conf: ${confidence})`);
        totalVotesAdded++;
      }

      // Update vote count
      const finalVoteCount = await Vote.countDocuments({ itemId: newsItem._id });
      console.log(`   ✓ Total votes now: ${finalVoteCount}`);
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ VOTING COMPLETE!\n');
    console.log(`Total votes added: ${totalVotesAdded}\n`);

    console.log('📊 Final Status:\n');
    const allClassified = await NewsItem.find({ classification: { $ne: null } }).sort({ title: 1 });

    for (const item of allClassified) {
      const voteCount = await Vote.countDocuments({ itemId: item._id });
      const status = voteCount >= 10 ? '✓' : '⚠';
      const title = item.title.length > 40 ? item.title.substring(0, 40) + '...' : item.title;
      console.log(`${status} ${title.padEnd(45)} [${voteCount} votes] - ${item.classification}`);
    }

    console.log(`\n${'='.repeat(60)}\n`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

generateVotesForNews();
