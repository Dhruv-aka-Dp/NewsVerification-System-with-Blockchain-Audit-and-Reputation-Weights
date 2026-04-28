# NewsVerify

A decentralized news verification platform. It uses community voting and a confidence engine to verify local news, with everything logged on a local blockchain.

Our project proposes a hybrid decentralized news verification system combining reputation weighted
community review, evidence-based validation, adversarially-aware system design, and blockchain-based
audit logging. Unlike traditional voting systems, this model does not assume majority opinion equals
truth. Instead, it introduces a structured verification pipeline where user input is treated as probabilistic
signals, uncertainty is explicitly modeled, reputation is updated via delayed validation rather than
immediate consensus, and final decisions are supported by both community input and verification
layers. Blockchain is used selectively as an immutable audit layer, ensuring transparency and
tamper-proof record-keeping of submissions, voting activity (hashed), reputation snapshots, and final
decisions. The system is designed to operate under adversarial conditions, accounting for Sybil attacks,
coordinated voting, reputation manipulation, and early-stage system capture.

The pipeline has five layers. In the Submission Layer , users upload news content as images, video, or
text. The media is stored off-chain and a cryptographic hash H is written to the blockchain along with a
metadata hash covering timestamp, pseudonymous uploader ID, and device fingerprint.
In the Pre-Processing Layer , each submission passes through automated duplicate detection, basic
integrity checks, spam filtering, and rate validation before entering the review pool. In the Community
Review Layer , users vote with a direction and confidence level; each vote is weighted by reputation and
hashed on-chain. In the Adjudication Layer , items that meet confidence thresholds are classified
automatically. In the Finalization and Audit Layer , the final classification and its proof hash are
recorded on-chain and reputation updates are applied.


## Setup 
- just run the sh file

## Details
- **Main App:** http://localhost:5173 - Where users vote and submit news.
- **Explorer:** http://localhost:5174/explorer.html - View on-chain logs.
- **Dashboard:** http://localhost:5175/dashboard.html - View database stats.



