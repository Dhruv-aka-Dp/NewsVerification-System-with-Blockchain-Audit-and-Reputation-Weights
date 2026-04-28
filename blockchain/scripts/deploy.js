const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);

  // Deploy SubmissionRegistry
  const SubmissionRegistry = await ethers.getContractFactory("SubmissionRegistry");
  const submissionRegistry = await SubmissionRegistry.deploy();
  await submissionRegistry.waitForDeployment();
  const subAddr = await submissionRegistry.getAddress();
  console.log("SubmissionRegistry deployed to:", subAddr);

  // Deploy VoteAuditLedger
  const VoteAuditLedger = await ethers.getContractFactory("VoteAuditLedger");
  const voteAuditLedger = await VoteAuditLedger.deploy();
  await voteAuditLedger.waitForDeployment();
  const voteAddr = await voteAuditLedger.getAddress();
  console.log("VoteAuditLedger deployed to:", voteAddr);

  // Deploy DecisionRegistry
  const DecisionRegistry = await ethers.getContractFactory("DecisionRegistry");
  const decisionRegistry = await DecisionRegistry.deploy();
  await decisionRegistry.waitForDeployment();
  const decAddr = await decisionRegistry.getAddress();
  console.log("DecisionRegistry deployed to:", decAddr);

  // Deploy ReputationRegistry
  const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
  const reputationRegistry = await ReputationRegistry.deploy();
  await reputationRegistry.waitForDeployment();
  const repAddr = await reputationRegistry.getAddress();
  console.log("ReputationRegistry deployed to:", repAddr);

  // Write addresses to backend/.env
  const backendEnvPath = path.resolve(__dirname, "../../backend/.env");

  let envContent = "";
  if (fs.existsSync(backendEnvPath)) {
    envContent = fs.readFileSync(backendEnvPath, "utf8");
  } else {
    // Copy from .env.example if .env doesn't exist
    const examplePath = path.resolve(__dirname, "../../backend/.env.example");
    if (fs.existsSync(examplePath)) {
      envContent = fs.readFileSync(examplePath, "utf8");
    }
  }

  function setEnvVar(content, key, value) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) {
      return content.replace(regex, `${key}=${value}`);
    }
    return content + `\n${key}=${value}`;
  }

  envContent = setEnvVar(envContent, "SUBMISSION_REGISTRY_ADDRESS", subAddr);
  envContent = setEnvVar(envContent, "VOTE_AUDIT_LEDGER_ADDRESS", voteAddr);
  envContent = setEnvVar(envContent, "DECISION_REGISTRY_ADDRESS", decAddr);
  envContent = setEnvVar(envContent, "REPUTATION_REGISTRY_ADDRESS", repAddr);

  fs.writeFileSync(backendEnvPath, envContent);
  console.log("Contract addresses written to backend/.env");

  // Export ABIs for frontend explorer
  const abiDir = path.resolve(__dirname, "../../frontend/src/abis");
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }

  const contracts = [
    { name: "SubmissionRegistry", address: subAddr },
    { name: "VoteAuditLedger", address: voteAddr },
    { name: "DecisionRegistry", address: decAddr },
    { name: "ReputationRegistry", address: repAddr },
  ];

  const deployInfo = {};

  for (const c of contracts) {
    const artifactPath = path.resolve(
      __dirname,
      `../artifacts/contracts/${c.name}.sol/${c.name}.json`
    );
    if (fs.existsSync(artifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
      fs.writeFileSync(
        path.join(abiDir, `${c.name}.json`),
        JSON.stringify({ abi: artifact.abi, address: c.address }, null, 2)
      );
      deployInfo[c.name] = c.address;
    }
  }

  // Write a combined deploy-info file
  fs.writeFileSync(
    path.join(abiDir, "deploy-info.json"),
    JSON.stringify({
      network: "localhost",
      chainId: 31337,
      rpcUrl: "http://127.0.0.1:8545",
      deployer: deployer.address,
      contracts: deployInfo,
      deployedAt: new Date().toISOString(),
    }, null, 2)
  );
  console.log("ABIs and deploy info exported to frontend/src/abis/");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
