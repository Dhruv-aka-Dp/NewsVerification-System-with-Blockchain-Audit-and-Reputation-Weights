const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Vote = require('../models/Vote');
const { authMiddleware } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const { STARTING_REPUTATION_PUBLIC } = require('../config/constants');

const router = express.Router();
const JWT_EXPIRY = '7d';

function signToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      username: user.username,
      is_reviewer: user.is_reviewer,
      is_seed: user.is_seed,
      isVerified: user.isVerified,
    },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

// POST /api/auth/register — email/password registration
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, and password are required' });
    }

    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(409).json({ error: 'Username or email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = new User({
      username,
      email,
      passwordHash,
      authMethod: 'email',
      reputation: STARTING_REPUTATION_PUBLIC,
      isVerified: false,
    });
    await user.save();

    const token = signToken(user);
    res.status(201).json({ token, user: { id: user._id, username, email, reputation: user.reputation, isVerified: false } });
  } catch (e) {
    console.error('Register error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login — email/password login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.passwordHash) return res.status(401).json({ error: 'This account uses wallet login' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        reputation: user.reputation,
        is_reviewer: user.is_reviewer,
        is_seed: user.is_seed,
        isVerified: user.isVerified,
        walletAddress: user.walletAddress,
        authMethod: user.authMethod,
      },
    });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/nonce/:address — generate nonce for MetaMask signing
router.get('/nonce/:address', async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    let user = await User.findOne({ walletAddress: address });
    const nonce = uuidv4();

    if (user) {
      user.nonce = nonce;
      await user.save();
    }
    // Return nonce even for unregistered addresses (they'll need to register)
    res.json({ nonce, isRegistered: !!user });
  } catch (e) {
    console.error('Nonce error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/wallet-register — register with MetaMask
router.post('/wallet-register', authLimiter, async (req, res) => {
  try {
    const { address, signature, username } = req.body;
    if (!address || !signature || !username) {
      return res.status(400).json({ error: 'address, signature, and username required' });
    }

    const cleanAddress = address.toLowerCase();
    if (!ethers.isAddress(cleanAddress)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    const existing = await User.findOne({ $or: [{ walletAddress: cleanAddress }, { username }] });
    if (existing) {
      return res.status(409).json({ error: 'Wallet or username already registered' });
    }

    // Verify signature — the message format must match frontend
    const message = `NewsVerify Registration\nWallet: ${cleanAddress}\nUsername: ${username}`;
    let recovered;
    try {
      recovered = ethers.verifyMessage(message, signature).toLowerCase();
    } catch {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    if (recovered !== cleanAddress) {
      return res.status(401).json({ error: 'Signature does not match address' });
    }

    const user = new User({
      username,
      walletAddress: cleanAddress,
      authMethod: 'wallet',
      reputation: STARTING_REPUTATION_PUBLIC,
      isVerified: false,
    });
    await user.save();

    const token = signToken(user);
    res.status(201).json({
      token,
      user: {
        id: user._id,
        username,
        walletAddress: cleanAddress,
        reputation: user.reputation,
        isVerified: false,
        authMethod: 'wallet',
      },
    });
  } catch (e) {
    console.error('Wallet register error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/wallet-login — login with MetaMask signature
router.post('/wallet-login', authLimiter, async (req, res) => {
  try {
    const { address, signature, nonce } = req.body;
    if (!address || !signature || !nonce) {
      return res.status(400).json({ error: 'address, signature, and nonce required' });
    }

    const cleanAddress = address.toLowerCase();
    const user = await User.findOne({ walletAddress: cleanAddress });
    if (!user) return res.status(401).json({ error: 'Wallet not registered' });
    if (user.nonce !== nonce) return res.status(401).json({ error: 'Invalid nonce' });

    // Verify signature
    const message = `NewsVerify Login\nNonce: ${nonce}`;
    let recovered;
    try {
      recovered = ethers.verifyMessage(message, signature).toLowerCase();
    } catch {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    if (recovered !== cleanAddress) {
      return res.status(401).json({ error: 'Signature does not match address' });
    }

    // Rotate nonce after successful login
    user.nonce = uuidv4();
    await user.save();

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        walletAddress: user.walletAddress,
        reputation: user.reputation,
        is_reviewer: user.is_reviewer,
        is_seed: user.is_seed,
        isVerified: user.isVerified,
        authMethod: user.authMethod,
      },
    });
  } catch (e) {
    console.error('Wallet login error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-passwordHash -nonce');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) {
    console.error('Auth /me error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/votes — current user's vote history
router.get('/votes', authMiddleware, async (req, res) => {
  try {
    const votes = await Vote.find({ userId: req.user.userId })
      .populate('itemId', 'title status classification')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(votes);
  } catch (e) {
    console.error('Auth /votes error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
