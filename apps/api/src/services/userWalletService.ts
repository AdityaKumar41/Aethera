import { prisma } from "@aethera/database";
import { Keypair } from "@stellar/stellar-sdk";
import {
  stellarClient,
  trustlineService,
  walletService,
} from "@aethera/stellar";

interface EnsureUserWalletOptions {
  fundOnTestnet?: boolean;
  ensureUsdcTrustline?: boolean;
}

interface EnsureUserWalletResult {
  publicKey: string;
  encryptedSecret: string | null;
  funded: boolean;
  fundingAttempted: boolean;
  hasUsdcTrustline: boolean;
  trustlineCreated: boolean;
}

const DEFAULT_OPTIONS: Required<EnsureUserWalletOptions> = {
  fundOnTestnet: false,
  ensureUsdcTrustline: false,
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForAccountFunding(
  publicKey: string,
  attempts = 5,
  delayMs = 1200,
) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const funded = await walletService.isAccountFunded(publicKey);
    if (funded) {
      return true;
    }

    if (attempt < attempts - 1) {
      await sleep(delayMs);
    }
  }

  return false;
}

async function ensureWalletRecord(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      stellarPubKey: true,
      stellarSecretEncrypted: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.stellarPubKey && user.stellarSecretEncrypted) {
    return user;
  }

  if (!user.stellarPubKey && user.stellarSecretEncrypted) {
    const secret = walletService.decryptSecret(user.stellarSecretEncrypted);
    const publicKey = Keypair.fromSecret(secret).publicKey();

    return await prisma.user.update({
      where: { id: userId },
      data: { stellarPubKey: publicKey },
      select: {
        stellarPubKey: true,
        stellarSecretEncrypted: true,
      },
    });
  }

  if (user.stellarPubKey && !user.stellarSecretEncrypted) {
    return user;
  }

  const wallet = await walletService.createWallet();

  return await prisma.user.update({
    where: { id: userId },
    data: {
      stellarPubKey: wallet.publicKey,
      stellarSecretEncrypted: wallet.encryptedSecret,
    },
    select: {
      stellarPubKey: true,
      stellarSecretEncrypted: true,
    },
  });
}

export async function ensureUserWallet(
  userId: string,
  options: EnsureUserWalletOptions = {},
): Promise<EnsureUserWalletResult> {
  const resolvedOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const wallet = await ensureWalletRecord(userId);

  if (!wallet.stellarPubKey) {
    throw new Error("Failed to initialize Stellar wallet");
  }

  let funded = await walletService.isAccountFunded(wallet.stellarPubKey);
  let fundingAttempted = false;

  if (
    !funded &&
    resolvedOptions.fundOnTestnet &&
    stellarClient.getNetwork() === "testnet"
  ) {
    fundingAttempted = true;

    try {
      await walletService.fundWithFriendbot(wallet.stellarPubKey);
    } catch (error) {
      console.error("[Wallet Bootstrap] Friendbot bootstrap failed:", error);
    }

    funded = await waitForAccountFunding(wallet.stellarPubKey);
  }

  let hasUsdcTrustline = false;
  let trustlineCreated = false;

  if (funded) {
    hasUsdcTrustline = await trustlineService.hasTrustline(wallet.stellarPubKey);

    if (
      !hasUsdcTrustline &&
      resolvedOptions.ensureUsdcTrustline &&
      wallet.stellarSecretEncrypted
    ) {
      const secret = walletService.decryptSecret(wallet.stellarSecretEncrypted);
      const keypair = Keypair.fromSecret(secret);

      await trustlineService.createTrustline(keypair);
      hasUsdcTrustline = true;
      trustlineCreated = true;
    }
  }

  return {
    publicKey: wallet.stellarPubKey,
    encryptedSecret: wallet.stellarSecretEncrypted,
    funded,
    fundingAttempted,
    hasUsdcTrustline,
    trustlineCreated,
  };
}
