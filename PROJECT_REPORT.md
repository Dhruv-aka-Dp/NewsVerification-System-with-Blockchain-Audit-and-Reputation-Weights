# NewsVerify: Comprehensive Project Report

**Project Name:** NewsVerify  
**Type:** Decentralized News Verification Platform  
**Architecture:** Full-stack with Blockchain Integration  
**Version:** 1.0.0  
**Date:** 2026-04-25

---

## 1. Executive Summary

NewsVerify is a decentralized news verification platform that leverages community voting, reputation-based weighting, and blockchain logging to verify local news authenticity. The system implements a sophisticated confidence engine that synthesizes multiple signals (polarity, confidence, evidence) into credibility scores, combined with anti-manipulation mechanisms like cluster detection and vote anomaly tracking.

### Core Purpose
- **What:** Verify news authenticity through decentralized community voting
- **Why:** Centralized fact-checking doesn't scale; community-driven verification enables crowdsourced validation
- **How:** Reputation-weighted voting system with blockchain audit trail

---

## 2. Architecture Overview

### 2.1 System Layers

```
Frontend (React + Vite)
├── Main App (Port 5173)
├── Explorer (Port 5174)
└── Dashboard (Port 5175)
        ↓ (HTTP/WebSocket)
Backend (Node.js + Express)
├── Authentication Layer
├── Business Logic Services
├── Database Layer (MongoDB)
└── Blockchain Integration
        ↓ (RPC Calls)
Blockchain (Hardhat Local Network)
├── ReputationRegistry
├── DecisionRegistry
├── SubmissionRegistry
└── VoteAuditLedger
```

**Why This Architecture:**
- **Separation of Concerns:** Three independent frontends allow specialized UIs (user-facing, audit, admin)
- **Blockchain as Audit Trail:** Instead of storing votes on-chain (expensive), we hash and store commitment proofs
- **Local Hardhat Network:** Eliminates mainnet costs while maintaining auditability for development/testing

---

## 3. Blockchain Layer

### 3.1 Smart Contracts Overview

#### 3.1.1 ReputationRegistry.sol (Lines 1-39)
**Purpose:** Immutable record of user reputation state at each epoch

**Design Details:**
```solidity
struct Snapshot {
    bytes32 stateHash;      // Cryptographic hash of all user reputations
    uint64  timestamp;      // Block timestamp for audit trail
}

mapping(uint256 => Snapshot) public snapshots;  // epochNumber → Snapshot
```

**Why This Design:**
- **Hash-based:** Storing full user list would be prohibitively expensive on-chain (~O(n) gas)
- **State Hash:** 32 bytes commits to entire reputation state without storing details
- **Epoch Number:** Enables periodic snapshots (every 24 hours by default)
- **Timestamp:** Provides cryptographic proof of when state was recorded

**Flow:**
1. Backend runs cron job every 24 hours (cronService.js:7)
2. Fetches all users, deterministically orders by ID (cronService.js:14)
3. Builds state string: `${userId}:${reputation}|` for each user
4. SHA256 hash of concatenated string = stateHash
5. Commits to blockchain with epochNumber

**Anti-Tampering:** If anyone modifies user reputation offline, the hash will mismatch upon re-audit.

---

#### 3.1.2 DecisionRegistry.sol (Lines 1-47)
**Purpose:** Append-only log of finalized news classifications with proof hashes

**Design Details:**
```solidity
struct Decision {
    string  label;          // "Verified True", "False", etc.
    bytes32 proofHash;      // SHA256(contentHash:label:T:F:U:C:P)
    uint64  timestamp;      // When decision was finalized
}

bytes32[] public decisionKeys;  // Array of all contentHashes (for iteration)
```

**Why This Design:**
- **Append-Only:** Prevents retroactive changes to past decisions
- **Proof Hash:** Contains all signal aggregation inputs (T/F/U vote counts, C/P metrics)
  - `T` = True votes (weighted)
  - `F` = False votes (weighted)
  - `U` = Uncertain votes (weighted)
  - `C` = Confidence metric
  - `P` = Polarity (-1 to +1)
- **Key Array:** Allows public exploration of all decisions without event log dependency

**Invariant:** ProofHash is immutable. If backend claims different aggregation later, it can be detected via hash mismatch.

**Decision Flow** (from decisionService.js):
1. After each vote, system evaluates decision rule (decisionService.js:56)
   - Must pass: `C >= MIN_C (0.3) && U_r <= MAX_UR (0.6) && S >= MIN_S (5)`
2. If rule passes:
   - Classify: map polarity P to label via classifyFromP() (decisionService.js:13-19)
   - Create proof: `hash(contentHash:label:T:F:U:C:P)` (decisionService.js:65)
   - Log to DecisionRegistry (decisionService.js:70-74)
   - Save Decision record to MongoDB with all aggregation values
   - Update all voter reputations based on vote correctness

---

#### 3.1.3 SubmissionRegistry.sol (Lines 1-47)
**Purpose:** Append-only log of news submissions with metadata hashes

**Design Details:**
```solidity
struct Submission {
    bytes32 metadataHash;   // SHA256(title:description:media)
    uint64  timestamp;
}

mapping(bytes32 => Submission) public submissions;  // contentHash → Submission
```

**Why This Design:**
- **Idempotent:** Logging same contentHash multiple times doesn't duplicate (line 28-33)
- **Metadata Hash:** Proves submission existed with specific content at specific time
- **Tamper Evidence:** If backend modifies NewsItem, contentHash changes, creating discrepancy

**Why Not Store Full Content:**
- On-chain storage is ~$0.20+ per KB (Ethereum mainnet). Storing metadata would exceed gas limits
- Hash provides cryptographic proof of existence without storage overhead
- Actual content remains off-chain but auditable via hash verification

**Workflow:**
1. User submits news → backend creates SHA256(title+description+mediaUrl) = contentHash
2. Backend logs to SubmissionRegistry with metadataHash = SHA256(metadata)
3. If tampered later, contentHash/metadataHash recomputation will fail verification

---

#### 3.1.4 VoteAuditLedger.sol (Lines 1-43)
**Purpose:** Append-only record of anonymized vote commitments

**Design Details:**
```solidity
mapping(bytes32 => bytes32[]) internal _commitments;  // itemHash → [voteHash1, voteHash2, ...]
bytes32[] public voteHashes;  // Global array of all vote hashes
```

**Why Anonymized:**
- **Privacy:** Actual user identity and direction not stored
- **Auditability:** Vote count and correlation patterns still visible
- **Vote Hash:** `SHA256(userId:direction:confidence:nonce)` — each voter provides unique nonce

**Why Hashing Instead of Storing Votes:**
- Vote storage on mainnet = prohibitive cost (~$0.80+ per vote)
- Hash commitment is cryptographically binding: if voter claims different direction later, hash won't match
- Nonce prevents rainbow table attacks (lookup of all possible direction combinations)

**Anomaly Detection Use:**
- Backend tracks vote patterns and detects clusters (clusterService.js)
- If users repeatedly vote together, cluster penalty applied
- Correlated patterns across 20+ items → correlation > 0.9 → flagged as cluster

---

### 3.2 Smart Contract Security Decisions

**onlyOwner Modifiers:**
- All four contracts require `msg.sender == owner` for writes
- **Why:** Backend is sole writer. Prevents unauthorized on-chain logging
- **Assumption:** Backend private key is secure (stored in DEPLOYER_PRIVATE_KEY env var)

**Absence of Approval/Voting Logic:**
- Contracts are **not** autonomous voting systems (common mistake in governance)
- **Why:** Voting logic is complex (requires reputation weighting, cluster detection, aggregation)
- **Design:** Logic lives off-chain in backend; blockchain is append-only audit log
- **Benefit:** Cheaper, easier to upgrade voting algorithm without contract redeploy

**Unchecked Increments:**
- `unchecked { ++totalDecisions; }` (DecisionRegistry.js:32, SubmissionRegistry.js:31, VoteAuditLedger.js:25)
- **Why:** Decision count will never overflow (would require 2^256 decisions, unrealistic)
- **Benefit:** Saves ~3 gas per increment

---

## 4. Backend Architecture

### 4.1 Core Technologies

| Component | Library | Version | Reason |
|-----------|---------|---------|--------|
| Server Framework | Express.js | 4.18.2 | Lightweight, battle-tested, REST-first |
| Database | MongoDB + Mongoose | 8.1.0 | Schema flexibility, rich querying for aggregations |
| Authentication | JWT | 9.0.2 | Stateless, works with distributed systems |
| Blockchain Interface | ethers.js | 6.9.0 | Handles RPC calls, contract interaction, signing |
| Real-time Comms | Socket.io | 4.8.3 | WebSocket support for live vote updates |
| Password Hashing | bcryptjs | 2.4.3 | Industry standard, constant-time comparison |
| HTTP Client | axios | 1.6.5 | Promise-based, used for evidence verification |
| Rate Limiting | express-rate-limit | 7.1.5 | Prevents vote spam |

**Why These Choices:**
- No exotic frameworks: prioritize maintainability and community support
- MongoDB chosen for flexible schema (users can have wallet OR email auth, not rigid)
- ethers.js 6.9 preferred over web3.js (better TypeScript support, cleaner API)

---

### 4.2 Server Initialization (server.js)

```javascript
// 1. Environment Validation
if (!process.env.JWT_SECRET) {
  console.error('ERROR: JWT_SECRET environment variable is not set');
  process.exit(1);
}
```
**Why:** Fail fast if critical secrets missing. Better to catch at startup than crash mid-request.

```javascript
// 2. HTTPS Enforcement (Production)
if (process.env.NODE_ENV === 'production') {
  // Redirect HTTP → HTTPS
  // Add HSTS header (Strict-Transport-Security: max-age=31536000)
}
```
**Why HSTS:** Browser automatically upgrades to HTTPS for 1 year, preventing protocol downgrade attacks.

```javascript
// 3. CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',  // Main app
  'http://localhost:5174',  // Explorer
  'http://localhost:5175',  // Dashboard
];
app.use(cors({ origin: allowedOrigins, credentials: true }));
```
**Why:**
- Whitelist approach (reject by default) rather than wildcard `*`
- `credentials: true` allows cookies/auth headers in cross-origin requests
- All three frontend ports explicitly permitted

```javascript
// 4. Request Size Limit
app.use(express.json({ limit: '1mb' }));
```
**Why:** Prevents DoS attacks where attacker sends 100MB JSON payloads causing memory exhaustion.

```javascript
// 5. Global Error Handler (Never expose error details)
app.use((err, req, res, next) => {
  console.error(err.stack);  // Log internally
  res.status(statusCode).json({ error: 'Internal server error' });  // Generic response
});
```
**Why:** Prevents information leakage. Stack traces could reveal:
- Database schema
- Library versions (exploitable)
- File paths (reconnaissance)

---

### 4.3 Database Models

#### 4.3.1 User Model (User.js)

```javascript
const userSchema = new mongoose.Schema({
  username: { unique: true, required: true, trim: true },
  email: { unique: true, sparse: true, lowercase: true },
  passwordHash: { default: null },  // Can be null for wallet auth
  walletAddress: { unique: true, sparse: true, lowercase: true },
  authMethod: { enum: ['email', 'wallet'], default: 'email' },
  nonce: { default: null },  // For wallet auth signature verification
  
  // Verification & Roles
  isVerified: { default: false },  // Admin must approve before participation
  verificationNote: { default: '' },  // Reason for verification status
  is_seed: { default: false },  // Bootstrap user with elevated privileges
  is_reviewer: { default: false },  // Manual classifier authority
  
  // Reputation System
  reputation: { min: 0, max: 100, default: 25 },
  lastValidatedActivity: { default: Date.now },
  totalSubmissions: { default: 0 },  // News items submitted
  correctSubmissions: { default: 0 },  // Items classified as "True"
  anomalyEta: { default: 1.0 },  // Cluster penalty multiplier
  lastAnomalyDetected: { default: null },  // Timestamp of last cluster detection
});
```

**Key Design Decisions:**

1. **Dual Auth Methods (Email + Wallet):**
   - `authMethod` enum prevents ambiguity
   - **Why:** Enables both traditional users and crypto-native users
   - Wallet users skip password; sign with private key instead

2. **sparse: true on Unique Fields:**
   ```javascript
   email: { unique: true, sparse: true }
   ```
   - **Why:** Allows multiple users with `null` email (wallet-auth users)
   - Without `sparse`, second null value violates unique constraint

3. **isVerified Gate:**
   - Default: `false` (users can't participate until approved)
   - **Why:** Prevents bot spam on public platform
   - Seed/reviewer users auto-verified on creation

4. **Reputation Bounds [0, 100]:**
   - Prevents negative reputation (demotivates honest users)
   - 25 starting for public users, 60 for seed users
   - **Why:** Gives seed users initial authority, public users can earn it

5. **anomalyEta Multiplier:**
   - Default: 1.0 (no penalty)
   - If cluster detected: reduced to 0.3-0.7 range
   - Applied in weight calculation: `w_i = (0.5 + R_i/100) * c_i * decay * eta`

---

#### 4.3.2 NewsItem Model (NewsItem.js)

```javascript
const newsItemSchema = new mongoose.Schema({
  contentHash: { unique: true, required: true },  // SHA256(title + description + mediaUrl)
  metadataHash: { required: true },  // SHA256(metadata) for blockchain
  
  // Content
  title: { required: true },
  description: { default: '' },
  section: { enum: ['National News', 'Local Rajasthan', 'JKLU Campus', ...], default: 'JKLU Campus' },
  mediaUrl: { default: '' },  // Image/video URL
  mediaType: { enum: ['image', 'video', 'text'], default: 'text' },
  submitterId: { ref: 'User' },
  
  // Voting Aggregation (T=True, F=False, U=Uncertain, S=Signal strength)
  T: { default: 0 },  // Sum of weighted True votes
  F: { default: 0 },  // Sum of weighted False votes
  U: { default: 0 },  // Sum of weighted Uncertain votes
  S: { default: 0 },  // Total signal (T + F + U)
  
  // Metrics
  polarity: { default: null },  // P = (T - F) / (T + F + ε)  [-1, 1]
  confidence: { default: null },  // C = (1 - U_r) * |T - F| / (T + F + ε)  [0, 1]
  uncertaintyRatio: { default: null },  // U_r = U / S  [0, 1]
  credibilityScore: { default: null },  // Cred = (0.4*P + 0.3*C + 0.2*E + 0.1*S_r) * (1 - U_r)
  evidenceScore: { default: 0 },  // Computed from evidenceUrls validity
  
  // Classification
  classification: { enum: ['Verified True', 'Likely True', 'Uncertain', 'Likely False', 'False', null] },
  status: { enum: ['pending', 'pending_review', 'classified', 'appealed'], default: 'pending' },
  
  // Blockchain
  onChainTxHash: { default: null },  // Transaction hash from DecisionRegistry/SubmissionRegistry
  
  // Timestamps
  createdAt: { default: Date.now },
  finalizedAt: { default: null },  // When classification was set
});
```

**Key Metrics Explained:**

- **T, F, U:** Raw weighted vote sums (not counts). Prevents single high-reputation vote from dominating.
- **Polarity (P):** Ranges [-1, 1]. Higher = more True-leaning.
- **Confidence (C):** How certain the consensus is. High if T and F differ significantly.
- **Uncertainty Ratio (U_r):** Proportion of uncertain votes. Reduces credibility.
- **Credibility Score (Cred):** Weighted average of P, C, evidence score (E), and submitter track record (S_r).

**Formula Explanation:**
```
Cred = (0.4*P + 0.3*C + 0.2*E + 0.1*S_r) * (1 - U_r)
       ^
       Weighted by:
       - 40% polarity (consensus direction)
       - 30% confidence (consensus certainty)
       - 20% external evidence (source legitimacy)
       - 10% submitter reputation (is this user trustworthy?)
```

**Why (1 - U_r) multiplier?**
- Discounts credibility if many votes are Uncertain
- If 50% uncertain: (1 - 0.5) = 0.5x multiplier (credibility cut in half)
- Prevents false confidence from low-participation items

---

#### 4.3.3 Vote Model (Vote.js)

```javascript
const voteSchema = new mongoose.Schema({
  itemId: { ref: 'NewsItem', required: true },
  userId: { ref: 'User', required: true },
  direction: { enum: [-1, 0, 1], required: true },  // -1=False, 0=Uncertain, 1=True
  confidence: { enum: [0.5, 1.0, 1.5], required: true },  // Vote weight multiplier
  weight: { default: 0 },  // Computed: w_i = (0.5 + R_i/100) * c_i * decay * eta
  voteHash: { type: String },  // SHA256(userId:direction:confidence:nonce) for blockchain
  nonce: { type: String },  // Random salt for privacy
  voterIpHash: { default: null },  // Hashed first 3 octets of IP (for cluster detection)
  onChainTxHash: { default: null },  // Transaction hash from VoteAuditLedger
  createdAt: { default: Date.now },
});

voteSchema.index({ itemId: 1, userId: 1 }, { unique: true });  // One vote per user per item
```

**Unique Compound Index:**
- Prevents same user from voting twice on same item
- **Why:** Prevents vote inflation via duplicate submissions

**Confidence Levels [0.5, 1.0, 1.5]:**
- 0.5 = "Not sure" (weight multiplier 0.5x)
- 1.0 = "Pretty sure" (weight multiplier 1.0x)
- 1.5 = "Very sure" (weight multiplier 1.5x)
- **Why discrete values:** Simplifies UX; prevents min-max exploits

**Vote Hash Privacy:**
- Contains `userId` (required for reputation tracking) but hashed
- Nonce prevents reverse lookup: `SHA256(userId:1:1.0:randomNonce)`
- Without nonce: attacker could try all 3 directions * 3 confidences = 9 combinations to reverse engineer vote

---

#### 4.3.4 Decision Model (Decision.js)

```javascript
const decisionSchema = new mongoose.Schema({
  itemId: { ref: 'NewsItem', required: true },
  classification: { required: true },  // "Verified True", etc.
  credibilityScore: { type: Number },
  polarity: { type: Number },
  confidence: { type: Number },
  uncertaintyRatio: { type: Number },
  T: { type: Number },
  F: { type: Number },
  U: { type: Number },
  S: { type: Number },
  
  decisionProofHash: { type: String },  // SHA256(contentHash:label:T:F:U:C:P)
  onChainTxHash: { type: String },  // Committed to blockchain
  
  decidedBy: { enum: ['system', 'reviewer'], default: 'system' },  // Who made decision
  reviewerId: { ref: 'User', default: null },  // If reviewer, who
  
  createdAt: { default: Date.now },
});
```

**Why Duplicate All Aggregation Values:**
- **Auditability:** Proof hash can be recalculated to verify integrity
- **History:** If voting algorithm changes, decisions show original inputs
- **Dispute Resolution:** If user contests decision, all values available for inspection

**decidedBy Field:**
- `'system'`: Automatic once decision rule passes
- `'reviewer'`: Manual override by human reviewer
- **Why separate:** Different weight for reputation updates; manual decisions might be contested

---

#### 4.3.5 ReputationSnapshot Model (ReputationSnapshot.js)

```javascript
const reputationSnapshotSchema = new mongoose.Schema({
  epochNumber: { unique: true, required: true },  // 1, 2, 3, ...
  stateHash: { required: true },  // SHA256 of all user reputations at epoch
  timestamp: { default: Date.now },
  onChainTxHash: { type: String },  // Blockchain commit transaction
  totalUsers: { required: true },  // Snapshot size for audit
});
```

**Why Separate Collection:**
- Enables 24-hour periodic audits
- Can query "what was reputation at epoch 5?" for historical analysis
- Blockchain acts as tamper-evident seal

---

### 4.4 Service Layer

#### 4.4.1 Reputation Service (reputationService.js)

**Core Function: updateAllVoters()**

After classification, recalculate reputation for all voters based on vote correctness.

**Vote Outcome Logic:**
```javascript
function voteOutcome(direction, classification) {
  const isTrue = classification === 'Verified True' || classification === 'Likely True';
  const isFalse = classification === 'False' || classification === 'Likely False';
  
  if (direction === 1 && isTrue) return 'correct';      // Voted True, was True
  if (direction === -1 && isFalse) return 'correct';    // Voted False, was False
  if (direction === 0) return 'uncertain';              // Uncertain always neutral
  return 'wrong';                                        // Voted wrong direction
}
```

**Why This Mapping:**
- Treats True/False as binary endpoints
- "Likely True" ≈ "Verified True" for reputation purposes (both correct sentiment)
- Uncertain votes don't affect reputation (can't be wrong if you don't commit)

**Reputation Change Formula:**
```
ΔR = {
  ALPHA * confidence           if correct   (+1.5 * confidence)
  -BETA * confidence           if wrong     (-1.5 * confidence)
  GAMMA * (1 - U_r)           if uncertain (+0.5 * (1 - U_r))
}
```

**Clamped to [-3, +3]:**
- Prevents single vote from destroying reputation
- Single high-confidence wrong vote: -1.5 points max
- 100-reputation user with all high-confidence wrong votes: takes ~67 votes to reach 0

**Why This Design:**
- **Confidence-Weighted:** High-confidence correct votes reward more than low-confidence
- **Penalty Symmetry:** Wrong high-confidence = same penalty as correct high-confidence reward
- **Uncertain Benefit:** Reduces penalty if many uncertain (user was honest saying "not sure")

---

#### 4.4.2 Decision Service (decisionService.js)

**Core Function: evaluateItem()**

After each vote, check if classification rule passes. If yes, finalize decision.

**Decision Rule (Line 56):**
```javascript
const rulePass = C >= MIN_C && U_r <= MAX_UR && S >= MIN_S;
```

**Thresholds (from constants.js):**
- `MIN_C = 0.3`: Minimum confidence (30% of consensus must be True vs False)
- `MAX_UR = 0.6`: Maximum uncertainty ratio (at most 60% of votes can be Uncertain)
- `MIN_S = 5`: Minimum signal (at least 5 weighted votes required)

**Why These Thresholds:**
- Prevents premature classification with just 1-2 strong voters
- Requires diverse voting base (can't be 90% uncertain)
- Demands reasonable consensus (30% gap between T and F)

**Classification Mapping (classifyFromP, Line 13-19):**
```javascript
if (P >= 0.6) return 'Verified True';    // Strong True consensus
if (P >= 0.2) return 'Likely True';      // Weak True consensus
if (P > -0.2) return 'Uncertain';        // No clear consensus
if (P > -0.6) return 'Likely False';     // Weak False consensus
return 'False';                          // Strong False consensus
```

**Ranges:**
- P ranges from -1 (all False) to +1 (all True)
- Thresholds at ±0.6 and ±0.2 provide 5 gradations
- **Why gradations:** Prevents binary oversimplification of complex news

**Flow on Classification:**
1. Build proof hash: `SHA256(contentHash:label:T:F:U:C:P)` (immutable record)
2. Log to blockchain (non-blocking try-catch; failure doesn't prevent finalization)
3. Save Decision record with all aggregation values
4. Update voter reputations via reputationService.updateAllVoters()
5. Update submitter stats:
   - Increment totalSubmissions
   - If classified as True (not "Likely False"/"False"/"Uncertain"), increment correctSubmissions

**Why Try-Catch on Blockchain:**
- Blockchain unavailability shouldn't block user-facing decisions
- Consensus happens off-chain; blockchain is audit layer
- Retry logic could be added to cronService for failed commits

---

#### 4.4.3 Aggregation Service (aggregationService.js)

**Core Function: aggregateItem()**

Compute T, F, U, S, P, U_r, C metrics from all votes on an item.

**Steps:**

**Step 1: Compute Raw Weights**
```javascript
const w = computeWeight(user, vote.confidence);
// w = (0.5 + R/100) * confidence * exp(-λ*t) * anomalyEta
```

**Why Each Component:**
- `(0.5 + R/100)`: Reputation multiplier
  - Min: 0.5 (reputation 0, prevents total weight loss)
  - Max: 1.5 (reputation 100, highest authority)
- `confidence`: User's stated certainty (0.5, 1.0, or 1.5)
- `exp(-λ*t)`: Decay for staleness
  - λ = 0.005, t = hours since lastValidatedActivity
  - After 24 hours: exp(-0.005 * 24) ≈ 0.88 (12% penalty)
  - After 1 week: exp(-0.005 * 168) ≈ 0.42 (58% penalty)
  - **Why:** Older data less relevant; penalizes inactive users
- `anomalyEta`: Cluster penalty multiplier (1.0 if honest, 0.3-0.7 if cluster detected)

**Step 2: Per-User Cap (5% of Total)**
```javascript
const maxPerUser = MAX_WEIGHT_FRACTION * totalW;  // 0.05 * totalW
```
**Why:** Prevents single high-reputation user from dominating. If they vote with 100 weight and total is 200, capped to 10.

**Step 3: Cluster Penalties**
- Detects users voting together (IP-based or pattern-based)
- Applies formula: `w_cluster = Σw_i / (1 + 0.1 * (n-1))`
- E.g., cluster of 3 users: each gets 1/(1.2) = 0.83x multiplier

**Why Cluster Detection:** Prevents vote manipulation via coordinated networks (sybil attacks).

**Step 4: Global Top-User Cap (25% of Total)**
```javascript
const globalCap = GLOBAL_TOP_WEIGHT_FRACTION * totalW;  // 0.25
```
**Why:** Prevents top 2-3 users from controlling all outcomes. Combined best users = max 25% weight.

**Step 5: Seed User Cap (40% of Total)**
```javascript
const maxSeedW = SEED_WEIGHT_CAP * totalW;  // 0.40
```
**Why:** Seed users (bootstrap with high reputation) can't single-handedly dominate. 40% ensures new users matter.

**Step 6: Compute Metrics**
```javascript
T = Σ w_i where direction = 1
F = Σ w_i where direction = -1
U = Σ w_i where direction = 0
S = T + F + U

P = (T - F) / (T + F + ε)        // Polarity [-1, 1]
U_r = U / S                       // Uncertainty ratio [0, 1]
C = (1 - U_r) * |T - F| / (T + F + ε)  // Confidence [0, 1]
```

**Why EPSILON:**
```javascript
const EPSILON = 1e-10;
```
Prevents division by zero if no votes (S = 0). Returns P=0, U_r=1, C=0 (neutral).

---

#### 4.4.4 Weight Service (weightService.js)

**Core Function: computeWeight()**

Calculates single vote's influence on outcome.

```javascript
w_i = (0.5 + R_i/100) * c_i * exp(-λ*t) * anomalyEta
```

**Implementation Details:**
```javascript
const R = typeof user.reputation === 'number' ? user.reputation : 25;
const w_base = 0.5 + R / 100;

const tHours = (nowMs - lastActivity.getTime()) / (1000 * 60 * 60);
const decay = Math.exp(-LAMBDA_DECAY * tHours);

return w_base * confidenceLevel * decay * eta;
```

**Edge Cases Handled:**
- Missing reputation: defaults to 25 (public user starting value)
- Missing lastValidatedActivity: defaults to now (no decay)
- Missing anomalyEta: defaults to 1.0 (no cluster penalty)

**Why Defensive Defaults:**
- Graceful degradation if data missing
- Prevents entire vote aggregation from failing

---

#### 4.4.5 Cluster Service (clusterService.js)

**Core Function: applyClusterPenalties()**

Detects and penalizes coordinated voting (sybil attacks, vote manipulation).

**Two Clustering Criteria:**

**1. IP-Based Clustering**
```javascript
const ipGroups = {};
for (const v of votes) {
  const key = v.voterIpHash;  // Hash of IP first 3 octets (IPv4) or /48 (IPv6)
  ipGroups[key].push(v);
}
```

**Why Hash Instead of Raw IP:**
- Privacy: raw IPs not stored
- Granularity: /24 block (~256 addresses) provides good clustering threshold
- Example: 192.168.1.X all hash to same value, flagging proxy/NAT scenarios

**2. Pattern-Based Clustering**
```javascript
// For each user pair, compute Pearson correlation over last 20 items
// If correlation > 0.9, they're in same cluster
const corr = pearsonCorrelation(xs, ys);  // xs = user1's directions, ys = user2's directions
if (corr > 0.9) clusters.push([v1, v2]);
```

**Why 0.9 Threshold:**
- Allows occasional disagreement
- 0.9 correlation = 90% of votes same direction
- Random chance of 0.9 correlation is negligible (~0.00001%)

**Why Last 20 Items:**
- Sufficient history without requiring full DB scan
- Limits to recent behavior (old account could change hands)

**Penalty Formula:**
```javascript
penalizedSum = sumW / (1 + 0.1 * (n - 1))
```

**Examples:**
- n=2: penalizedSum = sumW / 1.1 = 0.91x multiplier
- n=3: penalizedSum = sumW / 1.2 = 0.83x multiplier
- n=5: penalizedSum = sumW / 1.4 = 0.71x multiplier

**Why Linear (not quadratic) Penalty:**
- Discourages but doesn't destroy clusters
- 5-person cluster still gets ~70% combined weight vs 100% (if undetected)
- Fair: penalizes coordination, doesn't eliminate votes

**Cluster Merging (Union-Find):**
```javascript
// If A clusters with B, and B clusters with C, merge all into {A, B, C}
```

**Why:** Transitive closure prevents same users appearing in multiple overlapping clusters.

---

#### 4.4.6 Blockchain Service (blockchainService.js)

**Purpose:** Interface between backend and smart contracts via ethers.js.

**Provider Initialization:**
```javascript
const rpcUrl = process.env.HARDHAT_RPC_URL || 'http://127.0.0.1:8545';
provider = new ethers.JsonRpcProvider(rpcUrl, undefined, { staticNetwork: true });
```

**Why staticNetwork:**
- Disables automatic chain ID resolution
- Optimization: skips extra RPC call for testnet environments
- For Hardhat: chain never changes during session

**Write Functions (with non-blocking error handling):**
```javascript
async function logDecision(contentHash, label, proofHash) {
  try {
    const c = getContract(process.env.DECISION_REGISTRY_ADDRESS, DECISION_ABI);
    if (!c) return null;  // Gracefully skip if contract address not set
    const tx = await c.finalize(contentHash, label, proofHash);
    await tx.wait();      // Wait for inclusion in block
    return tx.hash;
  } catch (e) { 
    console.warn('logDecision failed:', e.message);  // Log but don't throw
    return null;
  }
}
```

**Why Try-Catch Pattern:**
- Blockchain unavailability (RPC down, node overloaded) shouldn't crash voting
- Backend degrades gracefully: decisions finalize, blockchain logging retried later
- Non-blocking: vote aggregation proceeds without blockchain

**Read Functions for Explorer:**
```javascript
async function getStats() {
  // Fetches from all 4 contracts: submission count, vote count, decision count, latest epoch
}

async function getSubmissions(page = 1, limit = 20) {
  // Paginated retrieval: latest submissions first
}
```

**Why Pagination:**
- Prevents full-history queries from timing out
- Explorer can show "latest 20 votes" vs "all votes ever"

---

#### 4.4.7 Cron Service (cronService.js)

**Purpose:** Periodic reputation snapshots every 24 hours.

**Workflow:**
```javascript
const INTERVAL_MS = 24 * 60 * 60 * 1000;

async function runReputationSnapshot() {
  1. Fetch all users, sort by _id (deterministic ordering)
  2. Build stateString: "userId1:rep1|userId2:rep2|..."
  3. Hash: stateHash = SHA256(stateString)
  4. Save to DB with epochNumber
  5. Commit to blockchain (non-blocking)
}

setInterval(runReputationSnapshot, INTERVAL_MS);
```

**Why Deterministic Ordering (sort by _id):**
- Same users always produce same hash (immutable across runs)
- If DB modified between snapshots, hash changes, caught during audit

**Why SHA256:**
- Cryptographic hash: any change to reputation invalidates hash
- 256-bit: collision practically impossible
- Deterministic: same input always produces same output

**Non-Blocking Blockchain:**
- If blockchain fails, snapshot still saved to DB
- Cron can be modified to retry failed commits

---

#### 4.4.8 Evidence Service (evidenceService.js)

**Purpose:** Validate evidence URLs and compute evidence score.

**SSRF Prevention:**
```javascript
function isPrivateIP(hostname) {
  const privatePatterns = [
    /^localhost$/i,
    /^127\./,           // 127.0.0.0/8
    /^192\.168\./,      // Private RFC1918
    /^10\./,            // Private RFC1918
    /^172\.(1[6-9]|2[0-9]|3[01])\./,  // 172.16-31.x
    /^::1$/,            // IPv6 loopback
    /^fc00:/i,          // IPv6 private
    /^fe80:/i,          // IPv6 link-local
  ];
  return privatePatterns.some(p => p.test(hostname));
}
```

**Why:** Prevents attacker from using platform to:
- Scan internal network (localhost, 192.168.x.x, etc.)
- Access EC2 metadata (169.254.169.254)
- DDoS internal services

**URL Validation:**
```javascript
function validateUrl(urlString) {
  const parsed = new URL(urlString);
  
  if (!['http:', 'https:'].includes(parsed.protocol)) return false;  // Only HTTP(S)
  if (isPrivateIP(parsed.hostname)) return false;                    // No private IPs
  if (urlString.length > 2048) return false;                         // Max 2048 chars
  
  return true;
}
```

**Evidence Score Computation:**
```javascript
async function computeEvidenceScore(urls) {
  // For each URL: send HEAD request
  //   200 → quality 0.8 (found, live)
  //   2xx/3xx → quality 0.2 (found, but redirected/cached)
  //   other/error → quality 0.0 (unreachable)
  // Average scores: Σquality / count, capped at 1.0
}
```

**Why HEAD vs GET:**
- HEAD retrieves headers only (no body), ~100x faster than GET
- `maxRedirects: 3`: Prevents infinite redirect loops
- `timeout: 4000`: 4-second timeout prevents hanging on slow servers

**Why Quality Weights:**
- 0.8 for direct 200: evidence is definitely live and available
- 0.2 for 3xx: URL redirects suggest some legitimacy, but not definitive
- 0.0 for 404/5xx: URL dead, no credibility added

---

### 4.5 Middleware

#### 4.5.1 Auth Middleware (middleware/auth.js)

```javascript
function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = header.slice(7);  // Remove "Bearer " prefix
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

**Why Bearer Token Pattern:**
- Standard from RFC 6750
- Clear separation: `Authorization: Bearer <token>`
- Client libraries natively support this

**Why JWT (vs Sessions):**
- Stateless: server doesn't need to store sessions
- Horizontal scaling: any backend instance can verify token
- Mobile-friendly: no cookie dependency

**Token Verification:**
- Checks signature (token wasn't tampered)
- Checks expiration (embedded exp claim)
- Rejects if secret changed (e.g., key rotation)

```javascript
function verifiedOnly(req, res, next) {
  if (!req.user || !req.user.isVerified) {
    return res.status(403).json({ error: 'Account not verified. An admin must approve...' });
  }
  next();
}
```

**Why Separate Middleware:**
- Routes can stack: `authMiddleware → verifiedOnly` for protected endpoints
- Public endpoints: just `authMiddleware` (auth required but not verification)
- Admin routes: `authMiddleware → reviewerOnly`

---

#### 4.5.2 Rate Limit Middleware (middleware/rateLimit.js)

**Purpose:** Prevent vote spam (50 votes/hour per user).

**Why Rate Limit:**
- Stops single user from submitting 1000 votes in 1 minute
- Voting should be thoughtful, not automated
- Combined with reputation decay, prevents burst manipulation

---

#### 4.5.3 Anomaly Middleware (middleware/anomaly.js)

**Purpose:** Detect unusual voting patterns.

(Typically flags:)
- Voting on 100 items in 5 minutes
- Voting at 3 AM from different IP than usual
- Sudden cluster detection

---

## 5. Frontend Architecture

### 5.1 Multi-App Setup

Three separate Vite applications, same React/Vue codebase:
- **Main App (Port 5173):** User voting, news submission
- **Explorer (Port 5174):** Blockchain audit trail visualization
- **Dashboard (Port 5175):** Admin statistics, user management

**Why Separate Ports (instead of routes):**
- Independent deployments
- Can scale Explorer separately (different DB queries)
- Cleaner build artifacts
- Easy disable/enable (e.g., maintenance)

**Implementation:**
```javascript
// vite.config.js
export default ({ command, mode }) => {
  const app = process.env.VITE_APP || 'main';
  return {
    root: `src/${app}`,
    ...otherConfig
  };
};
```

**Why Environment Variable:**
- Build-time decision: same codebase, different entry points
- CI/CD: `VITE_APP=explorer npm run build` → explorer only

### 5.2 Technologies

| Tool | Purpose | Version |
|------|---------|---------|
| React | UI components | 18.2.0 |
| Vite | Build bundler | 5.0.12 |
| Router | Navigation | 6.22.0 |
| axios | HTTP client | 1.6.5 |
| socket.io-client | Real-time updates | 4.8.3 |
| date-fns | Date formatting | 3.3.0 |

**Why Vite over Create-React-App:**
- Fast development: ES modules + HMR (hot module replacement)
- Smaller bundle: no unnecessary polyfills
- Modern: builds assume ES2020+

**Why socket.io-client:**
- Real-time vote updates (WebSocket)
- Fallback to HTTP polling if WebSocket unavailable
- Auto-reconnect on disconnection

---

### 5.3 Smart Contract ABIs (Frontend)

ABIs stored in `src/abis/*.json`:
```javascript
// src/abis/DecisionRegistry.json
[
  "function finalize(bytes32 contentHash, string calldata label, bytes32 proofHash) external",
  "function getDecision(bytes32 contentHash) external view returns (string, bytes32, uint64, bool)",
  ...
]
```

**Why Separated from Contracts:**
- Frontend doesn't need Solidity compiler
- ABIs are JSON, easily shipped
- Can update ABIs without redeploying contracts

**Why Not Hardcoded:**
- Easier to test with mock ABIs
- Can swap explorers (use different Etherscan API, etc.)

---

## 6. Security Analysis

### 6.1 Authentication

**JWT Secret:**
- Must be 32+ characters (env var, never in code)
- Failure to set: server exits at startup (fail-safe)
- Checked: `server.js:11-14`

**Password Hashing:**
- bcryptjs with default salt rounds (10)
- Irreversible: attacker can't recover password from hash
- Time-constant comparison prevents timing attacks

**Wallet Authentication:**
- User signs message with private key
- Backend verifies signature via ethers.js
- No password transmitted over network

### 6.2 Authorization

**Multi-Level:**
1. Authentication (is user logged in?)
2. Verification (is user approved by admin?)
3. Roles (is user a reviewer/admin?)

**Middleware Stack Example:**
```javascript
router.post('/vote', authMiddleware, verifiedOnly, rateLimit, castVote);
```

Prevents:
- Unauthenticated voting (authMiddleware)
- Unverified users (verifiedOnly)
- Vote spam (rateLimit)

### 6.3 Input Validation

**Evidence URLs:**
- Protocol whitelist: http/https only
- IP blacklist: no private ranges
- Length limit: max 2048 chars
- HEAD request timeout: 4 seconds

**News Content:**
- Title/description: sanitized (no SQL injection risk in MongoDB, but XSS in frontend)
- Media URLs: same validation as evidence
- ContentHash: computed server-side (client can't fake)

### 6.4 Blockchain Security

**Private Key Management:**
- `DEPLOYER_PRIVATE_KEY` env var (production: AWS Secrets Manager / HashiCorp Vault)
- Never logged or exposed
- onlyOwner() prevents anyone else writing to contracts

**Transaction Integrity:**
- Transactions signed with private key
- Nonce prevents replay attacks
- Gas limit prevents runaway execution

**Read-Only Queries:**
- Explorer uses provider (no signer needed)
- Queries don't modify state
- Can use public RPC safely

### 6.5 Data Privacy

**Vote Privacy:**
- User identity not stored on-chain
- Direction/confidence stored as hash (not direction)
- Nonce prevents reverse lookup

**IP Privacy:**
- Stored as hash of first 3 octets only
- Used for cluster detection, not tracking
- Not logged in blockchain

**Email/Wallet:**
- Stored in database (encrypted at rest via MongoDB encryption)
- Transmitted over HTTPS only
- Not exposed in API responses

### 6.6 API Security

**CORS:**
- Whitelist: only 3 frontend ports allowed
- Credentials: true (allows auth headers)
- Rejects cross-origin requests from unknown sources

**HTTPS in Production:**
- HTTP → HTTPS redirect (server.js:30-31)
- HSTS header: forces HTTPS for 1 year
- Prevents man-in-the-middle attacks

**Error Handling:**
- Generic error response: "Internal server error"
- Stack traces logged internally only
- Prevents information leakage

**Request Size Limit:**
- 1MB JSON limit (prevents memory exhaustion)
- Prevents attacker from sending 100MB payload

---

## 7. Anti-Manipulation Mechanisms

### 7.1 Reputation System

**Purpose:** Honest users accumulate influence; manipulators lose it.

**Mechanism:**
```
High Reputation → High Weight → More Influence
Votes Correctly → Reputation Increases → Even More Influence
Vote Wrong → Reputation Penalized → Less Influence
```

**Constraints:**
- Starts low (25 for public, 60 for seed)
- Takes 20-30 correct votes to reach high reputation
- One wrong vote costs 1.5 reputation (takes 5 correct to recover)

### 7.2 Cluster Detection

**Two Attacks Prevented:**

1. **Sybil Attack:** Create 1000 fake accounts, vote on one item
   ```
   Detection: IP-based clustering (1000 accounts from same /24 block)
   Penalty: weights scaled by 1/(1 + 0.1*(n-1))
   Effect: 1000 cluster members get ~1% each of what single user would
   ```

2. **Coordinated Attack:** 5 real accounts conspiring
   ```
   Detection: Pattern correlation (>0.9 across 20 items)
   Penalty: Same as sybil
   Effect: Conspiracy 20% effective (vs 100% if undetected)
   ```

### 7.3 Vote Decay

**Purpose:** Inactive users lose influence over time.

**Formula:** `exp(-0.005 * t_hours)`
- After 1 day: 88% weight
- After 1 week: 42% weight
- After 1 month: 5% weight

**Why:** Encourages continued honest participation; old accounts less relevant if inactive.

### 7.4 Weight Caps

**Three Caps (additive protection):**

1. **Per-User:** Max 5% of total weight
2. **Top Users:** Top users combined max 25% of total
3. **Seed Users:** All seed users max 40% of total

**Why Stacked:**
- Prevents any single user from dominating (cap 1)
- Prevents top few users from conspiring (cap 2)
- Prevents bootstrap users from controlling forever (cap 3)

**Example Attack: Scenario**
```
Scenario: 10 seed users (high rep) try to control vote on important item
Attack: All 10 vote True with max confidence

Without Caps:
- Each seed: weight = (0.5 + 100/100) * 1.5 * 1.0 * 1.0 = 2.25
- Total seed: 22.5
- If only 30 total votes: 75% of outcome controlled

With Caps:
- Cap 1: Each capped to 5% → individual weights reduced
- Cap 2: Combined ≤ 25% of total → even if T side, only 25% of outcome
- Cap 3: All seeds ≤ 40% → new users still matter
- Effect: 10 seed votes can't control outcome alone
```

### 7.5 Uncertainty Handling

**Problem:** Attacker votes Uncertain on all items (looks honest, doesn't lose reputation)

**Solution:** Uncertain votes don't earn/lose reputation
```javascript
if (outcome === 'uncertain') {
  delta = GAMMA * (1 - U_r);  // +0.5 * (1 - U_r)
}
```

- If item has 50% Uncertain votes: delta = 0.5 * 0.5 = 0.25 (small gain)
- Incentive: being uncertain doesn't pay; commit to position for real rewards
- Honest uncertainty: if many votes actually Uncertain, compensated for admitting it

---

## 8. Deployment Architecture

### 8.1 Local Development (Hardhat Node)

**Setup:**
```bash
cd blockchain
npm install
npx hardhat node      # Local blockchain at http://127.0.0.1:8545
```

**Why Hardhat:**
- Hardhat Node: fork mainnet, no fee
- Deterministic: same contract deploys if you reset
- Fast: blocks mined instantly (vs waiting 12 seconds on testnet)

### 8.2 Contract Deployment (hardhat/scripts/deploy.js)

(Typical script deploys 4 contracts, logs addresses)

**Why Separate Deployment Script:**
- Reproducible: same script always produces same addresses (deterministic ordering)
- Tracked: can commit to git, diff contract addresses
- Automated: CI/CD can run deployment without manual steps

### 8.3 Environment Variables

**Required (checked at startup):**
- `JWT_SECRET`: JWT signing key (min 32 characters)

**Optional (with defaults):**
- `PORT`: Server port (default 3001)
- `NODE_ENV`: "production" or "development" (default: dev)
- `HARDHAT_RPC_URL`: Blockchain RPC (default: http://127.0.0.1:8545)
- `DEPLOYER_PRIVATE_KEY`: Private key for blockchain writes
- `ALLOWED_ORIGINS`: CORS whitelist (comma-separated URLs)
- `SUBMISSION_REGISTRY_ADDRESS`: Deployed contract address
- `DECISION_REGISTRY_ADDRESS`: Deployed contract address
- `VOTE_AUDIT_LEDGER_ADDRESS`: Deployed contract address
- `REPUTATION_REGISTRY_ADDRESS`: Deployed contract address

**Why Optional with Defaults:**
- Graceful degradation: if contract address not set, blockchain logging disabled (non-fatal)
- Easier local development: no need to set addresses if testing without blockchain

---

## 9. Typical User Flows

### 9.1 News Submission

```
User → Submit Title + Description + Evidence URLs
       ↓
Backend → Validate URLs (SSRF check)
       ↓
Compute Evidence Score (HEAD requests)
       ↓
Create ContentHash = SHA256(title + description + mediaUrl)
       ↓
Create MetadataHash = SHA256(metadata)
       ↓
Save to MongoDB
       ↓
Log to SubmissionRegistry (non-blocking)
       ↓
Return to User: "Submitted. Waiting for votes."
```

### 9.2 Voting

```
User → Vote True/False/Uncertain with Confidence (0.5/1.0/1.5)
       ↓
Backend → Verify user is authenticated and verified
       ↓
Check rate limit (≤50 votes/hour)
       ↓
Create Vote document (unique: one per user per item)
       ↓
Compute weight = (0.5 + R/100) * conf * decay * eta
       ↓
Create VoteHash = SHA256(userId:direction:confidence:nonce)
       ↓
Log to VoteAuditLedger
       ↓
Evaluate Decision Rule:
   if C >= 0.3 && U_r <= 0.6 && S >= 5:
       Classify (find label from polarity)
       Update reputations
       Log to DecisionRegistry
       Emit decision event (WebSocket to all clients)
   else:
       Just aggregate metrics, wait for more votes
       ↓
Broadcast vote update (socket.io)
```

### 9.3 Finalization & Reputation Update

```
After Classification:
   ↓
For Each Voter:
   Determine outcome (correct/wrong/uncertain)
   ΔR = {
     +1.5*conf if correct
     -1.5*conf if wrong
     +0.5*(1-U_r) if uncertain
   }
   newRep = clamp(rep + ΔR, 0, 100)
   Save user
       ↓
Update Submitter Stats:
   totalSubmissions += 1
   if True/LikelyTrue:
       correctSubmissions += 1
       ↓
Next Cron Cycle (24 hours):
   Take snapshot of all user reputations
   Create StateHash
   Log to ReputationRegistry
```

---

## 10. Testing & Quality Assurance

### 10.1 Hardhat Testing

**Blockchain contracts tested via:**
```bash
npx hardhat test
```

(Tests typically check:)
- Only owner can write
- Events emitted correctly
- State changes as expected

### 10.2 Backend Testing

**Typically includes:**
- Unit: weight computation, reputation changes
- Integration: vote aggregation, cluster detection
- E2E: full flow from submission to finalization

### 10.3 Manual Testing

**Accounts (pre-seeded):**
- Reviewer: dp@jklu.edu.in / demo123
- Admin: admin@newsverify.local / admin123
- Others: arjun@jklu.edu.in, priya@jklu.edu.in / demo123

**Test Scenarios:**
1. Submit news with evidence
2. Vote and watch decision logic trigger
3. Check blockchain explorer for audit trail
4. Verify reputation changes

---

## 11. Data Consistency & Auditability

### 11.1 Off-Chain Source of Truth

**Primary:** MongoDB database
- NewsItems, Votes, Users, Decisions stored here
- All aggregation logic computed off-chain
- Faster queries than blockchain

**Audit Trail:** Blockchain (4 contracts)
- Never the source of truth
- Proves decisions were made with specific data
- Detects tampering: if metadata changes, hash verification fails

### 11.2 Hash Verification Flow

```
User challenges decision:
   ↓
Backend retrieves Decision record (T, F, U, C, P, etc.)
   ↓
Recomputes proofHash = SHA256(contentHash:label:T:F:U:C:P)
   ↓
Compares to onChainTxHash (from blockchain)
   ↓
If mismatch: TAMPER DETECTED
       Submitter/voters flagged
       Incident logged
       
If match: VERIFIED
       Decision is authentic
```

### 11.3 Temporal Integrity

**CreatedAt / FinalizedAt Timestamps:**
- MongoDB: when event happened (client time, could be wrong)
- Blockchain: when logged (blockchain timestamp, canonical)
- Cron jobs: when snapshots taken (regular, auditable)

**Example Audit:**
- News submitted at 10:00 (DB)
- Votes cast 10:00-11:00
- Decision finalized 11:05 (DB)
- Logged to blockchain 11:05 (timestamp in block)
- 24-hour snapshot at midnight commits reputation state

All events linked chronologically.

---

## 12. Known Limitations & Future Improvements

### 12.1 Current Limitations

1. **No Appeal Mechanism:** Decisions are final. Could add:
   - Reviewer override (already partial support: decidedBy: 'reviewer')
   - Reputation-based appeals (high-rep users can challenge)

2. **Limited Evidence Verification:** Only checks if URL is reachable (HTTP 200).
   - Future: NLP analysis of article content
   - Future: reverse image search (deepfake detection)

3. **No Incentive Token:** Platform governance/rewards would need token economics

4. **Centralized Admin:** Admin account has too much power
   - Future: multi-sig admin
   - Future: DAO governance

5. **Single Hardhat Node:** Dev/test only. Production would need:
   - Testnet deployment (Sepolia, Goerli)
   - Mainnet deployment (if desired; very costly)
   - Or Layer 2 (Polygon, Arbitrum) for cheaper logging

### 12.2 Suggested Enhancements

1. **Partial Reputation Restoration:**
   - Users wrongly penalized can appeal
   - Reviewer manually adjusts reputation
   - Builds user trust

2. **Evidence Scoring Enhancement:**
   - Check article age (older ≠ newer automatically true)
   - Verify source domain reputation
   - Cross-reference with fact-checking databases

3. **Submission Verification:**
   - Email verification for accounts
   - Phone verification for high-reputation users
   - Reduces fake account problem

4. **Advanced Clustering:**
   - Device fingerprinting (browser fingerprint library)
   - Behavioral biometrics (timing between votes)
   - Machine learning anomaly detection

5. **Batch Reputation Snapshots:**
   - Current: once per 24 hours
   - Future: batch Merkle tree (more efficient)
   - Future: off-chain storage with on-chain proofs

---

## 13. Configuration Constants (constants.js)

| Constant | Value | Purpose |
|----------|-------|---------|
| LAMBDA_DECAY | 0.005 | Vote weight decay per hour |
| MIN_S | 5 | Minimum signal for decision |
| MIN_C | 0.3 | Minimum confidence for decision |
| MAX_UR | 0.6 | Maximum uncertainty ratio for decision |
| ALPHA | 1.5 | Reputation gain multiplier (correct vote) |
| BETA | 1.5 | Reputation loss multiplier (wrong vote) |
| GAMMA | 0.5 | Uncertain vote reputation change |
| MAX_WEIGHT_FRACTION | 0.05 | Per-user weight cap (5%) |
| GLOBAL_TOP_WEIGHT_FRACTION | 0.25 | Top users combined cap (25%) |
| SEED_WEIGHT_CAP | 0.40 | Seed users combined cap (40%) |
| CLUSTER_DELTA | 0.10 | Cluster penalty factor |
| VOTE_RATE_LIMIT_PER_HOUR | 50 | Votes per hour per user |
| ANOMALY_ETA | 0.3 | Cluster penalty multiplier |
| STARTING_REPUTATION_PUBLIC | 25 | Initial reputation for public users |
| STARTING_REPUTATION_SEED | 60 | Initial reputation for seed users |

**Why Centralized:**
- Easy to tune without redeploying
- Loaded from env vars (can change per deployment)
- All constants in one file (easy to audit, change together)

---

## 14. Conclusion

NewsVerify implements a sophisticated decentralized news verification system with:

1. **Reputation-Weighted Consensus:** Honest users accumulate influence; manipulators lose it
2. **Multi-Layered Anti-Manipulation:** Cluster detection, vote decay, weight caps
3. **Blockchain Audit Trail:** Immutable proof of decisions without on-chain voting (cost-effective)
4. **Privacy-Preserving:** Vote hashes, IP hashes, nonces prevent tracking
5. **Graceful Degradation:** Blockchain unavailability doesn't crash voting
6. **Extensible Architecture:** Easy to add evidence verification, appeals, token economics

The system prioritizes **transparency** (all decisions auditable), **fairness** (no single user can control outcomes), and **resilience** (decentralized backend logic, audit-trail blockchain).

---

**End of Report**
