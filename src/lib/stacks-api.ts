import { StacksBalance, StacksTransaction, WalletData } from '@/types/stacks'

const STACKS_API_BASE = 'https://api.testnet.hiro.so/extended/v1'

export async function fetchWalletBalance(address: string): Promise<StacksBalance> {
  const response = await fetch(`${STACKS_API_BASE}/address/${address}/balances`)
  if (!response.ok) {
    throw new Error(`Failed to fetch balance: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchWalletTransactions(address: string, limit = 20): Promise<{ transactions: StacksTransaction[], total: number }> {
  const response = await fetch(`${STACKS_API_BASE}/address/${address}/transactions?limit=${limit}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch transactions: ${response.statusText}`)
  }
  const data = await response.json()
  return {
    transactions: data.results,
    total: data.total || 0
  }
}

export async function fetchWalletData(address: string): Promise<WalletData> {
  try {
    const [balance, transactionData] = await Promise.all([
      fetchWalletBalance(address),
      fetchWalletTransactions(address)
    ])

    return {
      address,
      balance,
      transactions: transactionData.transactions,
      totalTransactions: transactionData.total
    }
  } catch (error) {
    throw new Error(`Failed to fetch wallet data: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}