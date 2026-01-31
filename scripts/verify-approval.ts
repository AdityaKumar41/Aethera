import { prisma } from "@aethera/database";
import { contractDeploymentService, getContractAddresses, walletService, getNetworkConfig } from "@aethera/stellar";
import { Keypair } from "@stellar/stellar-sdk";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../apps/api/.env") });

async function main() {
  const projectId = "cml1v0udg0000wzv0w7o7dia9";
  console.log(`🚀 Verifying real on-chain approval for project: ${projectId}`);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { installer: true },
  });

  if (!project) throw new Error("Project not found");
  
  console.log("Project Details:", {
    id: project.id,
    name: project.name,
    capacity: project.capacity,
    expectedYield: project.expectedYield,
    totalTokens: project.totalTokens,
    tokenSymbol: project.tokenSymbol,
  });

  const encryptedSecret = process.env.ADMIN_RELAYER_SECRET_ENCRYPTED;
  if (!encryptedSecret) throw new Error("Admin relayer secret not configured");
  
  const adminSecret = walletService.decryptSecret(encryptedSecret);
  const adminKeypair = Keypair.fromSecret(adminSecret);

  const contracts = getContractAddresses();
  console.log("Using Treasury:", contracts.treasury);

  console.log("[Verification] Deploying asset token...");
  const deploymentResult = await contractDeploymentService.deployAssetToken(
    adminKeypair, 
    {
      projectId: project.id,
      name: project.name,
      symbol: project.tokenSymbol || `SOL${project.name.substring(0, 3).toUpperCase()}`,
      capacityKw: project.capacity,
      expectedYieldBps: Math.round(project.expectedYield * 100),
      totalSupply: BigInt(project.totalTokens || 0),
    }
  );

  console.log(`[Verification] Token deployed: ${deploymentResult.contractId}. Registering with Treasury...`);

  // Create escrow in Treasury
  await contractDeploymentService.createProjectEscrow(
    contracts.treasury,
    adminKeypair,
    project.id,
    deploymentResult.contractId,
    project.installer?.stellarPubKey || "",
    BigInt(Math.round(Number(project.fundingTarget) * 10_000_000)), // USDC 7 decimals
    250, // 2.5% platform fee
    BigInt(Math.round(Number(project.pricePerToken) * 10_000_000)) // price per token
  );

  console.log(`[Verification] Project registered with Treasury.`);

  // Update DB
  await prisma.project.update({
    where: { id: projectId },
    data: { 
      status: "FUNDING",
      tokenContractId: deploymentResult.contractId,
    },
  });

  console.log("✅ Verification complete! Project is now FUNDING with real on-chain contract.");
}

main()
  .catch((error) => {
    if (error.response?.data) {
      console.error("Horizon Error:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error);
    }
  })
  .finally(() => prisma.$disconnect());
