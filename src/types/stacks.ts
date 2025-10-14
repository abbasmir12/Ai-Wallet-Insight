export interface StacksTransaction {
  tx_id: string
  tx_type: string
  tx_status: string
  block_height: number
  burn_block_time: number
  sender_address: string
  fee_rate: string
  sponsored: boolean
  post_condition_mode: string
  post_conditions: unknown[]
  anchor_mode: string
  is_unanchored: boolean
  block_hash: string
  parent_block_hash: string
  block_time: number
  block_time_iso: string
  tx_index: number
  tx_result: {
    hex: string
    repr: string
  }
  microblock_hash: string
  microblock_sequence: number
  microblock_canonical: boolean
  execution_cost_read_count: number
  execution_cost_read_length: number
  execution_cost_runtime: number
  execution_cost_write_count: number
  execution_cost_write_length: number
  events: unknown[]
  nonce?: number
  canonical?: boolean
  event_count?: number
  vm_error?: string | null
  // Token transfer specific fields
  token_transfer?: {
    recipient_address: string
    amount: string
    memo: string
  }
  // Contract call specific fields
  contract_call?: {
    contract_id: string
    function_name: string
    function_signature?: string
    function_args?: Array<{
      hex: string
      repr: string
      name: string
      type: string
    }>
  }
  // Smart contract deployment fields
  smart_contract?: {
    clarity_version: number
    contract_id: string
    source_code: string
  }
}

export interface StacksBalance {
  stx: {
    balance: string
    total_sent: string
    total_received: string
    lock_tx_id: string
    locked: string
    lock_height: number
    burnchain_lock_height: number
    burnchain_unlock_height: number
  }
  fungible_tokens: Record<string, {
    balance: string
    total_sent: string
    total_received: string
  }>
  non_fungible_tokens: Record<string, {
    count: string
    total_sent: string
    total_received: string
  }>
}

export interface WalletData {
  address: string
  balance: StacksBalance
  transactions: StacksTransaction[]
  totalTransactions?: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}