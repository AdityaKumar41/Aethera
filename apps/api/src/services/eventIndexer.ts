/**
 * Contract Event Indexer Service
 * 
 * Polls for contract events and stores them for querying.
 * Tracks investments, transfers, governance votes, and yield distributions.
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
  private events: IndexedEvent[] = []; // In-memory for demo
  
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
    
    console.log("🔍 Starting Event Indexer...");
    this.state.isRunning = true;
    
    // Get current ledger as starting point
    try {
      const server = this.stellarClient.getHorizonServer();
      const ledgerResponse = await server.ledgers().order("desc").limit(1).call();
      if (ledgerResponse.records.length > 0) {
        this.state.lastIndexedLedger = ledgerResponse.records[0].sequence;
      }
    } catch (error) {
      console.error("Failed to get current ledger:", error);
    }
    
    // Start polling
    this.pollInterval = setInterval(() => this.poll(), pollIntervalMs);
    console.log(`📊 Event Indexer started, polling every ${pollIntervalMs}ms`);
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
      const contracts = getContractAddresses();
      
      // In production, use Soroban RPC to get contract events
      // For demo, we'll simulate event detection
      
      // Check for new ledgers
      const server = this.stellarClient.getHorizonServer();
      const ledgerResponse = await server
        .ledgers()
        .order("desc")
        .limit(10)
        .call();
      
      const newLedgers = ledgerResponse.records.filter(
        l => l.sequence > this.state.lastIndexedLedger
      );
      
      for (const ledger of newLedgers.reverse()) {
        await this.processLedger(ledger.sequence);
        this.state.lastIndexedLedger = ledger.sequence;
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
  
  private async processLedger(ledgerSequence: number): Promise<void> {
    // In production: Query contract events from this ledger
    // using Soroban RPC getEvents
    
    // For demo, we'll parse transactions looking for contract invocations
    try {
      const server = this.stellarClient.getHorizonServer();
      const txResponse = await server
        .transactions()
        .forLedger(ledgerSequence)
        .limit(100)
        .call();
      
      for (const tx of txResponse.records) {
        await this.processTransaction(tx, ledgerSequence);
      }
    } catch (error) {
      // Ledger might not have transactions
    }
  }
  
  private async processTransaction(tx: any, ledger: number): Promise<void> {
    const contracts = getContractAddresses();
    
    // Check if transaction involves our contracts
    // In production, this would parse Soroban contract invocations
    
    // For demo, create synthetic events based on transaction memo
    if (tx.memo_type !== "none" && tx.memo) {
      const memoText = tx.memo as string;
      
      // Detect event types from memo patterns
      if (memoText.includes("invest")) {
        await this.recordEvent({
          contractAddress: contracts.treasury,
          contractName: "Treasury",
          eventType: "investment_received",
          data: { txHash: tx.hash },
          ledger,
          txHash: tx.hash,
        });
      } else if (memoText.includes("yield")) {
        await this.recordEvent({
          contractAddress: contracts.yieldDistributor || "",
          contractName: "Yield Distributor",
          eventType: "yield_distributed",
          data: { txHash: tx.hash },
          ledger,
          txHash: tx.hash,
        });
      }
    }
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
    const event: IndexedEvent = {
      id: `${params.txHash}-${params.eventType}`,
      ...params,
      timestamp: new Date(),
    };
    
    this.events.unshift(event);
    this.state.eventsProcessed++;
    
    // Keep only last 1000 events in memory
    if (this.events.length > 1000) {
      this.events.pop();
    }
    
    console.log(`📌 Event: ${params.eventType} on ${params.contractName}`);
    
    // In production, store in database
    // await prisma.contractEvent.create({ data: event });
  }
  
  // ============================================
  // Queries
  // ============================================
  
  getState(): IndexerState {
    return { ...this.state };
  }
  
  getEvents(options?: {
    contractName?: string;
    eventType?: string;
    limit?: number;
  }): IndexedEvent[] {
    let filtered = [...this.events];
    
    if (options?.contractName) {
      filtered = filtered.filter(e => e.contractName === options.contractName);
    }
    
    if (options?.eventType) {
      filtered = filtered.filter(e => e.eventType === options.eventType);
    }
    
    return filtered.slice(0, options?.limit || 50);
  }
  
  getEventsByContract(contractAddress: string, limit: number = 20): IndexedEvent[] {
    return this.events
      .filter(e => e.contractAddress === contractAddress)
      .slice(0, limit);
  }
  
  getEventStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    for (const event of this.events) {
      const key = `${event.contractName}:${event.eventType}`;
      stats[key] = (stats[key] || 0) + 1;
    }
    
    return stats;
  }
}

export const eventIndexer = EventIndexerService.getInstance();
export default EventIndexerService;
