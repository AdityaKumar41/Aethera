/**
 * Contract Event Indexer Service
 *
 * Polls for contract events using Soroban RPC getEvents() and stores them
 * in the database. Tracks investments, transfers, governance votes, and
 * yield distributions. Falls back to Horizon-based approach if Soroban RPC
 * is unavailable.
 */

import { prisma } from "@aethera/database";
import { StellarClient, getContractAddresses } from "@aethera/stellar";
import * as StellarSdk from "@stellar/stellar-sdk";

// ============================================
// Types
// ============================================

interface IndexedEvent {
  id: string;
  contractAddress: string;
  contractName: string;
  eventType: string;
  data: Record<string, any>;
  ledger: number;
  timestamp: Date;
  txHash: string;
}

interface IndexerState {
  lastIndexedLedger: number;
  isRunning: boolean;
  eventsProcessed: number;
  lastRunAt?: Date;
  errors: string[];
}

// ============================================
// Event Indexer Service
// ============================================

export class EventIndexerService {
  private static instance: EventIndexerService | null = null;

  private stellarClient: StellarClient;
  private state: IndexerState;
  private pollInterval: NodeJS.Timeout | null = null;
  private useSorobanRpc: boolean = true;

  private constructor() {
    this.stellarClient = new StellarClient();
    this.state = {
      lastIndexedLedger: 0,
      isRunning: false,
      eventsProcessed: 0,
      errors: [],
    };
  }

  static getInstance(): EventIndexerService {
    if (!EventIndexerService.instance) {
      EventIndexerService.instance = new EventIndexerService();
    }
    return EventIndexerService.instance;
  }

  // ============================================
  // Lifecycle
  // ============================================

  async start(pollIntervalMs: number = 5000): Promise<void> {
    if (this.state.isRunning) {
      console.log("Event indexer already running");
      return;
    }

    console.log("Starting Event Indexer...");
    this.state.isRunning = true;

    // Get current ledger as starting point
    try {
      const server = this.stellarClient.getHorizonServer();
      const ledgerResponse = await server
        .ledgers()
        .order("desc")
        .limit(1)
        .call();
      if (ledgerResponse.records.length > 0) {
        this.state.lastIndexedLedger = ledgerResponse.records[0].sequence;
      }
    } catch (error) {
      console.error("Failed to get current ledger:", error);
    }

    // Start polling
    this.pollInterval = setInterval(() => this.poll(), pollIntervalMs);
    console.log(`Event Indexer started, polling every ${pollIntervalMs}ms`);
  }

  async stop(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.state.isRunning = false;
    console.log("Event Indexer stopped");
  }

  // ============================================
  // Polling
  // ============================================

  private async poll(): Promise<void> {
    try {
      this.state.lastRunAt = new Date();

      if (this.useSorobanRpc) {
        await this.pollSorobanEvents();
      } else {
        await this.pollHorizonFallback();
      }
    } catch (error: any) {
      const errorMsg = `Poll error: ${error.message}`;
      this.state.errors.push(errorMsg);
      // Keep only last 10 errors
      if (this.state.errors.length > 10) {
        this.state.errors.shift();
      }
    }
  }

  private async pollSorobanEvents(): Promise<void> {
    try {
      const server = this.stellarClient.getRpcServer();
      const contracts = getContractAddresses();

      const contractIds = [
        { id: contracts.treasury, name: "Treasury" },
        { id: contracts.yieldDistributor, name: "Yield Distributor" },
        { id: contracts.governance, name: "Governance" },
        { id: contracts.oracle, name: "Oracle" },
      ].filter((c) => c.id);

      for (const contract of contractIds) {
        try {
          const eventsResponse = await server.getEvents({
            startLedger: this.state.lastIndexedLedger + 1,
            filters: [
              {
                type: "contract",
                contractIds: [contract.id!],
              },
            ],
            limit: 100,
          });

          if (eventsResponse.events && eventsResponse.events.length > 0) {
            for (const event of eventsResponse.events) {
              const eventType = this.parseEventType(event);
              const eventData = this.parseEventData(event);

              await this.recordEvent({
                contractAddress: contract.id!,
                contractName: contract.name,
                eventType,
                data: eventData,
                ledger: event.ledger,
                txHash: event.id,
              });

              // Track the latest ledger we've processed
              if (event.ledger > this.state.lastIndexedLedger) {
                this.state.lastIndexedLedger = event.ledger;
              }
            }
          }
        } catch (contractError: any) {
          // Individual contract query failure should not stop other contracts
          console.warn(
            `Failed to get events for ${contract.name}: ${contractError.message}`,
          );
        }
      }
    } catch (error: any) {
      console.warn(
        `Soroban RPC getEvents() unavailable, falling back to Horizon: ${error.message}`,
      );
      this.useSorobanRpc = false;
      await this.pollHorizonFallback();
    }
  }

  private async pollHorizonFallback(): Promise<void> {
    console.warn(
      "Using Horizon fallback for event indexing - Soroban RPC events unavailable",
    );

    const server = this.stellarClient.getHorizonServer();
    const ledgerResponse = await server
      .ledgers()
      .order("desc")
      .limit(10)
      .call();

    const newLedgers = ledgerResponse.records.filter(
      (l) => l.sequence > this.state.lastIndexedLedger,
    );

    for (const ledger of newLedgers.reverse()) {
      await this.processLedgerFallback(ledger.sequence);
      this.state.lastIndexedLedger = ledger.sequence;
    }
  }

  private async processLedgerFallback(ledgerSequence: number): Promise<void> {
    try {
      const server = this.stellarClient.getHorizonServer();
      const txResponse = await server
        .transactions()
        .forLedger(ledgerSequence)
        .limit(100)
        .call();

      const contracts = getContractAddresses();

      for (const tx of txResponse.records) {
        // Only process transactions that reference our contract addresses
        if (tx.memo_type !== "none" && tx.memo) {
          const memoText = tx.memo as string;

          if (memoText.includes("invest") && contracts.treasury) {
            await this.recordEvent({
              contractAddress: contracts.treasury,
              contractName: "Treasury",
              eventType: "investment_received",
              data: { txHash: tx.hash, source: "horizon_fallback" },
              ledger: ledgerSequence,
              txHash: tx.hash,
            });
          } else if (memoText.includes("yield") && contracts.yieldDistributor) {
            await this.recordEvent({
              contractAddress: contracts.yieldDistributor,
              contractName: "Yield Distributor",
              eventType: "yield_distributed",
              data: { txHash: tx.hash, source: "horizon_fallback" },
              ledger: ledgerSequence,
              txHash: tx.hash,
            });
          }
        }
      }
    } catch (error) {
      // Ledger might not have transactions
    }
  }

  // ============================================
  // Event Parsing
  // ============================================

  private parseEventType(event: any): string {
    try {
      if (event.topic && event.topic.length > 0) {
        // First topic is typically the event name as a Symbol
        const firstTopic = event.topic[0];
        if (typeof firstTopic === "string") {
          return firstTopic;
        }
        // xdr value - try to extract symbol
        if (firstTopic?.value) {
          return String(firstTopic.value);
        }
      }
    } catch {
      // Fall through
    }
    return "unknown_event";
  }

  private parseEventData(event: any): Record<string, any> {
    const data: Record<string, any> = {
      ledger: event.ledger,
      ledgerClosedAt: event.ledgerClosedAt,
    };

    try {
      if (event.topic) {
        data.topics = event.topic.map((t: any) => {
          if (typeof t === "string") return t;
          return t?.value ?? String(t);
        });
      }

      if (event.value) {
        data.value =
          typeof event.value === "string"
            ? event.value
            : (event.value?.value ?? String(event.value));
      }
    } catch {
      data.parseError = true;
    }

    return data;
  }

  // ============================================
  // Event Recording
  // ============================================

  private async recordEvent(params: {
    contractAddress: string;
    contractName: string;
    eventType: string;
    data: Record<string, any>;
    ledger: number;
    txHash: string;
  }): Promise<void> {
    const eventId = `${params.txHash}-${params.eventType}`;

    this.state.eventsProcessed++;

    console.log(
      `Event indexed: ${params.eventType} on ${params.contractName} (ledger ${params.ledger})`,
    );

    // Store in database
    try {
      await prisma.transactionLog.create({
        data: {
          type: `CONTRACT_EVENT:${params.eventType}`,
          txHash: eventId,
          status: "CONFIRMED",
          sourceAccount: params.contractAddress,
          metadata: {
            contractName: params.contractName,
            eventType: params.eventType,
            ledger: params.ledger,
            ...params.data,
          },
        },
      });
    } catch (error: any) {
      // Unique constraint violation means we already indexed this event
      if (error.code === "P2002") {
        return;
      }
      console.error(`Failed to store event ${eventId}:`, error.message);
    }
  }

  // ============================================
  // Queries
  // ============================================

  getState(): IndexerState {
    return { ...this.state };
  }

  async getEvents(options?: {
    contractName?: string;
    eventType?: string;
    limit?: number;
  }): Promise<any[]> {
    const where: any = {
      type: { startsWith: "CONTRACT_EVENT:" },
    };

    if (options?.eventType) {
      where.type = `CONTRACT_EVENT:${options.eventType}`;
    }

    if (options?.contractName) {
      where.metadata = { path: ["contractName"], equals: options.contractName };
    }

    return prisma.transactionLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options?.limit || 50,
    });
  }

  async getEventsByContract(
    contractAddress: string,
    limit: number = 20,
  ): Promise<any[]> {
    return prisma.transactionLog.findMany({
      where: {
        type: { startsWith: "CONTRACT_EVENT:" },
        sourceAccount: contractAddress,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async getEventStats(): Promise<Record<string, number>> {
    const events = await prisma.transactionLog.findMany({
      where: { type: { startsWith: "CONTRACT_EVENT:" } },
      select: { type: true, metadata: true },
    });

    const stats: Record<string, number> = {};
    for (const event of events) {
      const meta = event.metadata as any;
      const key = `${meta?.contractName || "Unknown"}:${meta?.eventType || event.type}`;
      stats[key] = (stats[key] || 0) + 1;
    }

    return stats;
  }
}

export const eventIndexer = EventIndexerService.getInstance();
export default EventIndexerService;
