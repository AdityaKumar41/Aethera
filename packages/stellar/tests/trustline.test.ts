import { describe, it, expect, vi } from "vitest";
import {
  getUSDCAsset,
  USDC_ASSET_TESTNET,
  USDC_ASSET_MAINNET,
} from "../src/trustline";

describe("Trustline Service", () => {
  describe("getUSDCAsset", () => {
    it("should return testnet USDC by default", () => {
      const asset = getUSDCAsset();
      expect(asset.code).toBe("USDC");
      expect(asset.issuer).toBe(USDC_ASSET_TESTNET.issuer);
    });

    it("should return mainnet USDC when env is mainnet", () => {
      const originalEnv = process.env.STELLAR_NETWORK;
      process.env.STELLAR_NETWORK = "mainnet";

      const asset = getUSDCAsset();
      expect(asset.code).toBe("USDC");
      expect(asset.issuer).toBe(USDC_ASSET_MAINNET.issuer);

      process.env.STELLAR_NETWORK = originalEnv;
    });
  });

  describe("USDC Assets", () => {
    it("should have correct testnet USDC issuer", () => {
      expect(USDC_ASSET_TESTNET.code).toBe("USDC");
      expect(USDC_ASSET_TESTNET.issuer).toBe(
        "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      );
    });

    it("should have correct mainnet USDC issuer", () => {
      expect(USDC_ASSET_MAINNET.code).toBe("USDC");
      expect(USDC_ASSET_MAINNET.issuer).toBe(
        "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      );
    });
  });
});
