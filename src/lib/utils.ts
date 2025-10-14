import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatSTX(amount: number): string {
  return (amount / 1000000).toFixed(6) + " STX"
}

export function formatSTXCompact(amount: number): string {
  const stxAmount = amount / 1000000
  
  if (stxAmount >= 1000000) {
    return `${(stxAmount / 1000000).toFixed(2)}M STX`
  } else if (stxAmount >= 1000) {
    return `${(stxAmount / 1000).toFixed(2)}K STX`
  } else if (stxAmount >= 1) {
    return `${stxAmount.toFixed(2)} STX`
  } else {
    return `${stxAmount.toFixed(6)} STX`
  }
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(2)}K`
  } else if (num >= 1) {
    return num.toFixed(2)
  } else {
    return num.toFixed(6)
  }
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString()
}

export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}