import { describe, it, expect, vi, beforeEach } from "vitest";
import { SorobanContractService } from "../src/soroban.js";
import { rpc } from "@stellar/stellar-sdk";

describe("SorobanContractService", () => {
  let service: SorobanContractService;
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      getNetwork: vi.fn().mockReturnValue("testnet"),
      getHorizonServer: vi.fn().mockReturnValue({
        loadAccount: vi.fn(),
      }),
    };

    service = new SorobanContractService(mockClient);
  });

  describe("getContractIds", () => {
    it("should return contract IDs for testnet", () => {
      const ids = service.getContractIds();

      expect(ids.assetToken).toBe(
        "CBRCDA3COGVNJJEM22MC7V5KZCF3OTNJ2CYHT4OFDJO5SRHFNVDSQJ3N",
      );
      expect(ids.treasury).toBe(
        "CAZ2XELSAAX2SSFWK67KCSPJTB7NU6BREDBMVGJXR4FCA7SENR6PTZCE",
      );
    });
  });

  describe("waitForTransaction", () => {
    it("should poll until transaction succeeds", async () => {
      const mockRpcServer = {
        getTransaction: vi
          .fn()
          .mockResolvedValueOnce({ status: "NOT_FOUND" })
          .mockResolvedValueOnce({ status: "SUCCESS" }),
      };

      // Replace the rpcServer instance
      (service as any).rpcServer = mockRpcServer;

      await expect(
        service["waitForTransaction"]("tx_hash_123", 2),
      ).resolves.not.toThrow();

      expect(mockRpcServer.getTransaction).toHaveBeenCalledTimes(2);
    });

    it("should timeout after specified duration", async () => {
      const mockRpcServer = {
        getTransaction: vi.fn().mockRejectedValue(new Error("Not found")),
      };

      (service as any).rpcServer = mockRpcServer;

      // Test with very short timeout
      await expect(
        service["waitForTransaction"]("tx_hash_123", 0.05),
      ).rejects.toThrow("Transaction timeout");
    }, 5000);
  });
});
