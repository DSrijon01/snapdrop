import { Keypair, PublicKey } from "@solana/web3.js";

export interface TokenPrice {
  symbol: string;
  price: number;
  change24h: number;
}

export interface AgentRule {
  id: string;
  type: "grid" | "twap" | "rebalance";
  symbol: string;
  isActive: boolean;
  params: {
    // Grid params
    gridBasePrice?: number;
    buyTriggerPct?: number; // e.g. 5 for -5%
    sellTriggerPct?: number; // e.g. 10 for +10%
    tradeAmount?: number; // amount of SOL/token per trade
    
    // TWAP params
    twapTotalAmount?: number;
    twapIntervalSec?: number;
    twapRemainingSlices?: number;
    twapSliceAmount?: number;
    twapIsBuy?: boolean;
    
    // Rebalance params
    targetWeights?: Record<string, number>; // e.g. { SOL: 50, USDC: 30, ssSOL: 20 }
    rebalanceIntervalMin?: number;
  };
}

export interface LogEntry {
  timestamp: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "trade";
}

export interface PortfolioPosition {
  symbol: string;
  balance: number;
  valueUsd: number;
}

// LocalStorage helpers
const SESSION_KEY = "openclaw_session_secret";

export class AgentExecutionEngine {
  private sessionKeypair: Keypair | null = null;
  private prices: Record<string, TokenPrice> = {
    SOL: { symbol: "SOL", price: 142.5, change24h: 2.45 },
    USDC: { symbol: "USDC", price: 1.0, change24h: 0.0 },
    ssSOL: { symbol: "ssSOL", price: 147.2, change24h: 3.12 },
    SNAP: { symbol: "SNAP", price: 0.045, change24h: -12.4 },
  };

  private balances: Record<string, number> = {
    SOL: 10.5,
    USDC: 500.0,
    ssSOL: 2.0,
    SNAP: 1500.0,
  };

  private rules: AgentRule[] = [];
  private logs: LogEntry[] = [];
  private isSimulatorMode = true;
  private onStateChange: () => void = () => {};
  private timerId: any = null;

  constructor() {
    this.initSessionWallet();
    this.loadRules();
    this.addLog("Agent System Initialized.", "info");
    this.addLog("Simulator Mode active. Transactions are simulated on local sandbox.", "info");
  }

  public setOnChange(callback: () => void) {
    this.onStateChange = callback;
  }

  private initSessionWallet() {
    if (typeof window === "undefined") return;
    let stored = localStorage.getItem(SESSION_KEY);
    if (!stored) {
      const kp = Keypair.generate();
      const secretArray = Array.from(kp.secretKey);
      localStorage.setItem(SESSION_KEY, JSON.stringify(secretArray));
      this.sessionKeypair = kp;
    } else {
      try {
        const secretArray = JSON.parse(stored);
        this.sessionKeypair = Keypair.fromSecretKey(new Uint8Array(secretArray));
      } catch (e) {
        const kp = Keypair.generate();
        localStorage.setItem(SESSION_KEY, JSON.stringify(Array.from(kp.secretKey)));
        this.sessionKeypair = kp;
      }
    }
  }

  public getSessionPublicKey(): string {
    return this.sessionKeypair ? this.sessionKeypair.publicKey.toBase58() : "";
  }

  public getPrices(): Record<string, TokenPrice> {
    return this.prices;
  }

  public getBalances(): Record<string, number> {
    return this.balances;
  }

  public getRules(): AgentRule[] {
    return this.rules;
  }

  public getLogs(): LogEntry[] {
    return this.logs;
  }

  public isSimulator(): boolean {
    return this.isSimulatorMode;
  }

  public setSimulator(mode: boolean) {
    this.isSimulatorMode = mode;
    this.addLog(`Switched network mode to ${mode ? "Simulator Sandbox" : "Solana Devnet"}.`, "warning");
    this.onStateChange();
  }

  public start() {
    if (this.timerId) return;
    this.timerId = setInterval(() => this.tick(), 4000);
    this.addLog("Autonomous Trading Loop Started.", "info");
    this.onStateChange();
  }

  public stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.addLog("Autonomous Trading Loop Halted.", "warning");
    this.onStateChange();
  }

  public isRunning(): boolean {
    return this.timerId !== null;
  }

  public addLog(message: string, type: LogEntry["type"] = "info") {
    const timestamp = new Date().toLocaleTimeString();
    this.logs.unshift({ timestamp, message, type });
    if (this.logs.length > 100) this.logs.pop();
  }

  public addRule(rule: Omit<AgentRule, "id" | "isActive">) {
    const newRule: AgentRule = {
      ...rule,
      id: Math.random().toString(36).substring(2, 9),
      isActive: true,
    };
    this.rules.push(newRule);
    this.saveRules();
    this.addLog(`Added ${rule.type.toUpperCase()} agent rule for ${rule.symbol}.`, "success");
    this.onStateChange();
  }

  public toggleRule(id: string) {
    this.rules = this.rules.map((r) => {
      if (r.id === id) {
        const nextState = !r.isActive;
        this.addLog(`Rule ${id} (${r.type.toUpperCase()}) ${nextState ? "activated" : "deactivated"}.`, "info");
        return { ...r, isActive: nextState };
      }
      return r;
    });
    this.saveRules();
    this.onStateChange();
  }

  public deleteRule(id: string) {
    this.rules = this.rules.filter((r) => r.id !== id);
    this.saveRules();
    this.addLog(`Deleted rule ${id}.`, "info");
    this.onStateChange();
  }

  public listNuke() {
    this.addLog("NUKE EVENT TRIGGERED! Closing all non-SOL positions.", "error");
    
    // Convert all non-SOL tokens back into SOL
    let totalNukedUsd = 0;
    const solPrice = this.prices["SOL"].price;

    Object.keys(this.balances).forEach((symbol) => {
      if (symbol !== "SOL" && this.balances[symbol] > 0) {
        const balance = this.balances[symbol];
        const tokenPrice = this.prices[symbol].price;
        const valUsd = balance * tokenPrice;
        totalNukedUsd += valUsd;
        
        // Convert to SOL
        const solReceived = valUsd / solPrice;
        this.balances["SOL"] += solReceived;
        this.balances[symbol] = 0;

        this.addLog(`Nuked ${balance.toFixed(2)} ${symbol} -> Received ${solReceived.toFixed(4)} SOL (Value: $${valUsd.toFixed(2)})`, "trade");
      }
    });

    // Cancel all rules
    const activeRulesCount = this.rules.filter(r => r.isActive).length;
    this.rules = this.rules.map(r => ({ ...r, isActive: false }));
    this.saveRules();

    if (activeRulesCount > 0) {
      this.addLog(`Deactivated ${activeRulesCount} active agent rules.`, "warning");
    }

    this.addLog(`NUKE Completed! Total portfolio re-routed to SOL: $${totalNukedUsd.toFixed(2)}`, "success");
    this.onStateChange();
  }

  public executeTrade(isBuy: boolean, symbol: string, amount: number) {
    const tokenPrice = this.prices[symbol].price;
    const totalCostUsd = amount * tokenPrice;
    
    if (symbol === "SOL") return; // Can't buy SOL with SOL directly in this simplified model
    
    if (isBuy) {
      // Swapping SOL -> Token
      const solCost = totalCostUsd / this.prices["SOL"].price;
      if (this.balances["SOL"] < solCost) {
        this.addLog(`Trade failed: Insufficient SOL balance to buy ${amount} ${symbol}`, "error");
        return false;
      }
      this.balances["SOL"] -= solCost;
      this.balances[symbol] += amount;
      this.addLog(`Bought ${amount.toFixed(2)} ${symbol} @ $${tokenPrice} using ${solCost.toFixed(4)} SOL`, "trade");
    } else {
      // Swapping Token -> SOL
      if (this.balances[symbol] < amount) {
        this.addLog(`Trade failed: Insufficient ${symbol} balance to sell ${amount}`, "error");
        return false;
      }
      const solGained = totalCostUsd / this.prices["SOL"].price;
      this.balances[symbol] -= amount;
      this.balances["SOL"] += solGained;
      this.addLog(`Sold ${amount.toFixed(2)} ${symbol} @ $${tokenPrice} for ${solGained.toFixed(4)} SOL`, "trade");
    }
    this.onStateChange();
    return true;
  }

  private tick() {
    this.simulatePrices();
    this.evaluateRules();
    this.onStateChange();
  }

  private simulatePrices() {
    Object.keys(this.prices).forEach((symbol) => {
      if (symbol === "USDC") return;
      const current = this.prices[symbol];
      // Random walk: -1% to +1%
      const pct = (Math.random() * 2 - 1) * 0.006;
      const nextPrice = Math.max(0.001, current.price * (1 + pct));
      current.price = Number(nextPrice.toFixed(symbol === "SNAP" ? 4 : 2));
      current.change24h += pct * 100;
    });
  }

  private evaluateRules() {
    let saveNeeded = false;
    this.rules.forEach((rule) => {
      if (!rule.isActive) return;

      const symbol = rule.symbol;
      const currentPrice = this.prices[symbol].price;

      if (rule.type === "grid") {
        const base = rule.params.gridBasePrice || currentPrice;
        const buyTrigger = rule.params.buyTriggerPct || 5;
        const sellTrigger = rule.params.sellTriggerPct || 5;
        const tradeAmount = rule.params.tradeAmount || 1;

        const buyPrice = base * (1 - buyTrigger / 100);
        const sellPrice = base * (1 + sellTrigger / 100);

        if (currentPrice <= buyPrice) {
          this.addLog(`[Grid Agent ${rule.id}] Price target reached ($${currentPrice} <= $${buyPrice.toFixed(2)}). Triggering BUY.`, "info");
          const ok = this.executeTrade(true, symbol, tradeAmount);
          if (ok) {
            // Shift grid base price to current price
            rule.params.gridBasePrice = currentPrice;
            saveNeeded = true;
          }
        } else if (currentPrice >= sellPrice) {
          this.addLog(`[Grid Agent ${rule.id}] Price target reached ($${currentPrice} >= $${sellPrice.toFixed(2)}). Triggering SELL.`, "info");
          const ok = this.executeTrade(false, symbol, tradeAmount);
          if (ok) {
            rule.params.gridBasePrice = currentPrice;
            saveNeeded = true;
          }
        }
      }

      else if (rule.type === "twap") {
        const remaining = rule.params.twapRemainingSlices || 0;
        const slice = rule.params.twapSliceAmount || 0;
        const isBuy = rule.params.twapIsBuy ?? true;

        if (remaining > 0) {
          this.addLog(`[TWAP Agent ${rule.id}] Executing slice order. Slices remaining: ${remaining}.`, "info");
          const ok = this.executeTrade(isBuy, symbol, slice);
          if (ok) {
            rule.params.twapRemainingSlices = remaining - 1;
            saveNeeded = true;
            if (rule.params.twapRemainingSlices === 0) {
              rule.isActive = false;
              this.addLog(`[TWAP Agent ${rule.id}] Execution fully completed.`, "success");
            }
          }
        }
      }

      else if (rule.type === "rebalance") {
        // Calculate portfolio values
        const weights = rule.params.targetWeights || {};
        const totalValue = Object.keys(this.balances).reduce((acc, sym) => {
          return acc + this.balances[sym] * this.prices[sym].price;
        }, 0);

        if (totalValue <= 0) return;

        this.addLog(`[Rebalancer Agent ${rule.id}] Running portfolio rebalance check.`, "info");
        
        let needsRebalance = false;
        const currentWeights: Record<string, number> = {};
        
        Object.keys(this.balances).forEach(sym => {
          const val = this.balances[sym] * this.prices[sym].price;
          currentWeights[sym] = (val / totalValue) * 100;
          const target = weights[sym] || 0;
          if (Math.abs(currentWeights[sym] - target) > 3) {
            needsRebalance = true; // Rebalance if weight shifts more than 3%
          }
        });

        if (needsRebalance) {
          this.addLog(`[Rebalancer Agent ${rule.id}] Deviation detected. Executing trades to align portfolio.`, "warning");
          
          // Rebalance logic: convert everything back to Sol first, then allocate.
          // In real DEX, this is multiple swaps. In simulator:
          Object.keys(weights).forEach(sym => {
            const targetWeight = weights[sym];
            const targetValUsd = totalValue * (targetWeight / 100);
            const targetBalance = targetValUsd / this.prices[sym].price;
            this.balances[sym] = Number(targetBalance.toFixed(sym === "SNAP" ? 2 : 4));
          });
          
          this.addLog(`[Rebalancer Agent ${rule.id}] Portfolio successfully rebalanced.`, "success");
        } else {
          this.addLog(`[Rebalancer Agent ${rule.id}] Portfolio is aligned. No swap needed.`, "info");
        }
      }
    });

    if (saveNeeded) {
      this.saveRules();
    }
  }

  private saveRules() {
    if (typeof window === "undefined") return;
    localStorage.setItem("openclaw_agent_rules", JSON.stringify(this.rules));
  }

  private loadRules() {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("openclaw_agent_rules");
    if (stored) {
      try {
        this.rules = JSON.parse(stored);
      } catch (e) {
        this.rules = [];
      }
    }
  }
}
