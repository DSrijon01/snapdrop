export type InflowCategory =
  | "nft_fee"
  | "token_fee"
  | "token_creation"
  | "subscription"
  | "stock_fee_coming_soon";

export type OutflowCategory =
  | "rent_storage"
  | "gas_execution"
  | "operational_transfer";

export type TransactionCategory = InflowCategory | OutflowCategory;

export type FlowDirection = "inflow" | "outflow";

export type TimeframePeriod = "daily" | "monthly" | "yearly";

export type TimeRangeFilter = "24h" | "7d" | "30d" | "ytd" | "custom";

export interface TreasuryTransaction {
  id: string;
  signature: string;
  slot: number;
  timestamp: number; // Unix timestamp in ms
  direction: FlowDirection;
  category: TransactionCategory;
  categoryLabel: string;
  amountSol: number;
  amountUsd: number;
  gasSpentSol: number;
  rentCostSol: number;
  netYieldSol: number;
  counterparty: string;
  programId?: string;
  memo?: string;
  status: "confirmed" | "finalized" | "failed";
  instructions: {
    program: string;
    type: string;
    details: string;
  }[];
  logs?: string[];
}

export interface AccountingSummary {
  grossInflowsSol: number;
  grossInflowsUsd: number;
  grossOutflowsSol: number;
  grossOutflowsUsd: number;
  netYieldSol: number;
  netYieldUsd: number;
  operatingMarginPercent: number;
  txCount: number;
  inflowsCount: number;
  outflowsCount: number;
  inflowBreakdown: {
    category: InflowCategory;
    label: string;
    amountSol: number;
    amountUsd: number;
    percentage: number;
    count: number;
  }[];
  outflowBreakdown: {
    category: OutflowCategory;
    label: string;
    amountSol: number;
    amountUsd: number;
    percentage: number;
    count: number;
  }[];
  timeSeriesData: {
    date: string;
    inflows: number;
    outflows: number;
    netYield: number;
    cumulativeNet: number;
  }[];
}
