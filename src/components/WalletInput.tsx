'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WalletInputProps {
  onSubmit: (address: string) => void
  loading: boolean
}

export default function WalletInput({ onSubmit, loading }: WalletInputProps) {
  const [address, setAddress] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (address.trim() && !loading) {
      onSubmit(address.trim())
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto"
    >
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter Stacks wallet address (e.g., ST1PQHQKV0RJXZFY...)"
            className={cn(
              "w-full px-6 py-4 pl-14 pr-16 bg-gray-900/50 border border-gray-700/50",
              "rounded-2xl text-white placeholder-gray-400 text-lg",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50",
              "backdrop-blur-sm transition-all duration-300",
              "hover:border-gray-600/50"
            )}
            disabled={loading}
          />
          <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <motion.button
            type="submit"
            disabled={!address.trim() || loading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "absolute right-3 top-1/2 transform -translate-y-1/2",
              "px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600",
              "text-white rounded-xl font-medium transition-all duration-300",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "hover:from-blue-700 hover:to-purple-700"
            )}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Analyze'
            )}
          </motion.button>
        </div>
      </form>
    </motion.div>
  )
}