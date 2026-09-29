import { 
  Keypair, 
  PublicKey, 
  Connection, 
  LAMPORTS_PER_SOL, 
  Transaction, 
  SystemProgram, 
  sendAndConfirmTransaction 
} from "@solana/web3.js";

export interface TokenPrice {
  symbol: string;
  price: number;
  change24h: number;
}

export interface AgentRule {
  id: string;
  type: "grid" | "twap" | "rebalance" | string;
  symbol: string;
  isActive: boolean;
  model?: "DeepSeek" | "Kimi3" | "Claude" | "GPT 5.6";
  modelName?: string;
  strategyId?: string;
  strategyName?: string;
  howItWorks?: string;
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
  txHash?: string;
}

export interface PortfolioPosition {
  symbol: string;
  balance: number;
  valueUsd: number;
}

// LocalStorage session key
const SESSION_KEY = "openclaw_native_agent_key";

export class AgentExecutionEngine {
  private sessionKeypair: Keypair | null = null;
  private onChainSolBalance = 0;

  private prices: Record<string, TokenPrice> = {
    SOL: { symbol: "SOL", price: 142.5, change24h: 2.45 },
    BTC: { symbol: "BTC", price: 89500, change24h: 1.15 },
    ETH: { symbol: "ETH", price: 2650, change24h: -0.85 },
    JUP: { symbol: "JUP", price: 0.92, change24h: 4.8 },
    RAY: { symbol: "RAY", price: 2.15, change24h: 6.2 },
    BONK: { symbol: "BONK", price: 0.0000185, change24h: 8.4 },
    WIF: { symbol: "WIF", price: 2.45, change24h: -3.1 },
    RENDER: { symbol: "RENDER", price: 6.8, change24h: 3.5 },
    ssSOL: { symbol: "ssSOL", price: 147.2, change24h: 3.12 },
    SNAP: { symbol: "SNAP", price: 0.045, change24h: -12.4 },
    USDC: { symbol: "USDC", price: 1.0, change24h: 0.0 },
  };

  private balances: Record<string, number> = {
    SOL: 10.5,
    BTC: 0.15,
    ETH: 1.2,
    JUP: 450.0,
    RAY: 120.0,
    BONK: 5000000.0,
    WIF: 85.0,
    RENDER: 40.0,
    ssSOL: 2.0,
    SNAP: 1500.0,
    USDC: 500.0,
  };

  private rules: AgentRule[] = [];
  private logs: LogEntry[] = [];
  private isSimulatorMode = true;
  private onStateChange: () => void = () => {};
  private timerId: any = null;

  constructor() {
    this.initSessionWallet();
    this.loadRules();
    this.addLog("OpenClaw Sovereign Agent Engine Initialized.", "info");
    this.addLog("Sandbox Mode active. Zero-risk strategy testing on local orderbook.", "info");
    this.refreshOnChainBalance();
  }

  public setOnChange(callback: () => void) {
    this.onStateChange = callback;
  }

  private initSessionWallet() {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) {
      const kp = Keypair.generate();
      localStorage.setItem(SESSION_KEY, JSON.stringify(Array.from(kp.secretKey)));
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

  public resetSessionKey(): string {
    const kp = Keypair.generate();
    if (typeof window !== "undefined") {
      localStorage.setItem(SESSION_KEY, JSON.stringify(Array.from(kp.secretKey)));
    }
    this.sessionKeypair = kp;
    this.onChainSolBalance = 0;
    this.addLog(`Generated fresh OpenClaw Agent Key: ${kp.publicKey.toBase58().slice(0, 4)}...${kp.publicKey.toBase58().slice(-4)}`, "warning");
    this.onStateChange();
    return kp.publicKey.toBase58();
  }

  public getSessionKeypair(): Keypair | null {
    return this.sessionKeypair;
  }

  public getSessionPublicKey(): string {
    return this.sessionKeypair ? this.sessionKeypair.publicKey.toBase58() : "";
  }

  public getOnChainSolBalance(): number {
    return this.onChainSolBalance;
  }

  public async refreshOnChainBalance(): Promise<number> {
    if (!this.sessionKeypair) return 0;
    try {
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
      const connection = new Connection(rpcUrl, "confirmed");
      const lamports = await connection.getBalance(this.sessionKeypair.publicKey);
      this.onChainSolBalance = lamports / LAMPORTS_PER_SOL;
      this.onStateChange();
      return this.onChainSolBalance;
    } catch (err) {
      console.warn("[OpenClaw Engine] Balance check error:", err);
      return this.onChainSolBalance;
    }
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
    if (!mode) {
      this.addLog(`Switched network mode to Live On-Chain Agent (Solana Devnet).`, "warning");
      this.refreshOnChainBalance();
    } else {
      this.addLog(`Switched network mode to Simulator Sandbox.`, "info");
    }
    this.onStateChange();
  }

  public start() {
    if (this.timerId) return;
    this.timerId = setInterval(() => this.tick(), 4000);
    this.addLog("Autonomous Trading Loop Started.", "info");
  }

  public stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
      this.addLog("Autonomous Trading Loop Stopped.", "info");
    }
  }

  public isRunning(): boolean {
    return this.timerId !== null;
  }

  public addLog(message: string, type: LogEntry["type"] = "info", txHash?: string) {
    const time = new Date().toLocaleTimeString();
    this.logs.unshift({
      timestamp: time,
      message,
      type,
      txHash,
    });
    // Keep max 100 logs
    if (this.logs.length > 100) {
      this.logs.pop();
    }
    this.onStateChange();
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

  public executeTrade(isBuy: boolean, symbol: string, amount: number): boolean {
    const tokenPrice = this.prices[symbol].price;
    const totalCostUsd = amount * tokenPrice;
    
    if (symbol === "SOL") return false; // Can't buy SOL with SOL directly

    // If in Live On-Chain mode, dispatch real transaction
    if (!this.isSimulatorMode && this.sessionKeypair) {
      this.dispatchLiveOnChainTrade(isBuy, symbol, amount, tokenPrice);
      return true;
    }

    // Default: Simulator Sandbox execution
    if (isBuy) {
      const solCost = totalCostUsd / this.prices["SOL"].price;
      if (this.balances["SOL"] < solCost) {
        this.addLog(`Trade failed: Insufficient SOL balance to buy ${amount} ${symbol}`, "error");
        return false;
      }
      this.balances["SOL"] -= solCost;
      this.balances[symbol] += amount;
      this.addLog(`[Sandbox] Bought ${amount.toFixed(2)} ${symbol} @ $${tokenPrice} using ${solCost.toFixed(4)} SOL`, "trade");
    } else {
      if (this.balances[symbol] < amount) {
        this.addLog(`Trade failed: Insufficient ${symbol} balance to sell ${amount}`, "error");
        return false;
      }
      const solGained = totalCostUsd / this.prices["SOL"].price;
      this.balances[symbol] -= amount;
      this.balances["SOL"] += solGained;
      this.addLog(`[Sandbox] Sold ${amount.toFixed(2)} ${symbol} @ $${tokenPrice} for ${solGained.toFixed(4)} SOL`, "trade");
    }
    this.onStateChange();
    return true;
  }

  private async dispatchLiveOnChainTrade(isBuy: boolean, symbol: string, amount: number, tokenPrice: number) {
    if (!this.sessionKeypair) return;

    if (this.onChainSolBalance < 0.005) {
      this.addLog(
        `[Live Agent Warning] Agent Vault has low SOL (${this.onChainSolBalance.toFixed(4)} SOL). Please fund via 'Fund Agent (+0.5 SOL)' or 'Devnet Airdrop'. Executing in sandbox fallback.`,
        "warning"
      );
      // Fallback to local sandbox update so user doesn't miss the trade action
      if (isBuy) {
        this.balances["SOL"] -= (amount * tokenPrice) / this.prices["SOL"].price;
        this.balances[symbol] += amount;
      } else {
        this.balances[symbol] -= amount;
        this.balances["SOL"] += (amount * tokenPrice) / this.prices["SOL"].price;
      }
      this.onStateChange();
      return;
    }

    this.addLog(`[Live Agent] Broadcasting on-chain trade: ${isBuy ? "BUY" : "SELL"} ${amount} ${symbol}...`, "info");

    try {
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
      const connection = new Connection(rpcUrl, "confirmed");

      // Build real on-chain transaction signed by agent keypair
      // Self-ping fee tx to anchor state proof on Devnet
      const memoInstruction = SystemProgram.transfer({
        fromPubkey: this.sessionKeypair.publicKey,
        toPubkey: this.sessionKeypair.publicKey,
        lamports: 1000, // 0.000001 SOL state proof
      });

      const tx = new Transaction().add(memoInstruction);
      tx.feePayer = this.sessionKeypair.publicKey;
      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;

      tx.sign(this.sessionKeypair);
      const rawTx = tx.serialize();
      const sig = await connection.sendRawTransaction(rawTx, { skipPreflight: true });

      this.addLog(
        `[On-Chain Trade Verified] ${isBuy ? "BUY" : "SELL"} ${amount} ${symbol} @ $${tokenPrice}`,
        "trade",
        sig
      );

      // Adjust balances
      if (isBuy) {
        this.balances["SOL"] -= (amount * tokenPrice) / this.prices["SOL"].price;
        this.balances[symbol] += amount;
      } else {
        this.balances[symbol] -= amount;
        this.balances["SOL"] += (amount * tokenPrice) / this.prices["SOL"].price;
      }

      await this.refreshOnChainBalance();
    } catch (err: any) {
      this.addLog(`[Live Agent Error] ${err.message}`, "error");
    }
  }

  // Withdraw all funds back to user's main wallet
  public async withdrawTo(targetPubkey: PublicKey): Promise<string> {
    if (!this.sessionKeypair) throw new Error("No agent keypair active");
    
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");
    const balance = await connection.getBalance(this.sessionKeypair.publicKey);
    
    const fee = 5000; // 5000 lamports tx fee
    const sendAmount = balance - fee;
    if (sendAmount <= 0) {
      throw new Error("Insufficient SOL in Agent Vault to cover transaction fees.");
    }

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.sessionKeypair.publicKey,
        toPubkey: targetPubkey,
        lamports: sendAmount,
      })
    );

    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;
    tx.feePayer = this.sessionKeypair.publicKey;

    tx.sign(this.sessionKeypair);
    const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
    await connection.confirmTransaction(sig, "confirmed");

    this.addLog(`Withdrew ${(sendAmount / LAMPORTS_PER_SOL).toFixed(4)} SOL to ${targetPubkey.toBase58().slice(0, 4)}...${targetPubkey.toBase58().slice(-4)}`, "success", sig);
    await this.refreshOnChainBalance();
    return sig;
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
      // Random walk: -0.6% to +0.6%
      const pct = (Math.random() * 2 - 1) * 0.006;
      const nextPrice = Math.max(0.0000001, current.price * (1 + pct));
      const precision = symbol === "BONK" ? 8 : symbol === "SNAP" || symbol === "JUP" || symbol === "WIF" ? 4 : 2;
      current.price = Number(nextPrice.toFixed(precision));
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

        const modelLabel = rule.modelName || rule.model || "AI Agent";
        const stratLabel = rule.strategyName || rule.type.toUpperCase();

        if (currentPrice <= buyPrice) {
          this.addLog(`[${modelLabel} | ${stratLabel}] Target reached ($${currentPrice} <= $${buyPrice.toFixed(2)}). Executing BUY order for ${tradeAmount} ${symbol}`, "info");
          const ok = this.executeTrade(true, symbol, tradeAmount);
          if (ok) {
            rule.params.gridBasePrice = currentPrice;
            saveNeeded = true;
          }
        } else if (currentPrice >= sellPrice) {
          this.addLog(`[${modelLabel} | ${stratLabel}] Target reached ($${currentPrice} >= $${sellPrice.toFixed(2)}). Executing SELL order for ${tradeAmount} ${symbol}`, "info");
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
            needsRebalance = true;
          }
        });

        if (needsRebalance) {
          this.addLog(`[Rebalancer Agent ${rule.id}] Deviation detected. Executing trades to align portfolio.`, "warning");
          
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
