'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Wallet, TrendingUp, TrendingDown, Activity, Copy, Check, Zap, RotateCcw, Sparkles, ArrowUpRight, ArrowDownLeft, Repeat, Crown, Star, Target, Clock, ExternalLink, CheckCircle, AlertCircle, XCircle, ArrowRight, Hash, Calendar, Timer, X } from 'lucide-react'
import { WalletData } from '@/types/stacks'
import { truncateAddress, formatNumber } from '@/lib/utils'

// Enhanced AI Insights renderer with professional icons and tooltips
const renderAIInsights = (text: string, walletData: WalletData, hoveredCard: number | null, setHoveredCard: (index: number | null) => void) => {

  // Extract key metrics for visual display
  const balance = parseInt(walletData.balance.stx.balance) / 1000000
  const totalSent = parseInt(walletData.balance.stx.total_sent) / 1000000
  const totalReceived = parseInt(walletData.balance.stx.total_received) / 1000000
  const txCount = walletData.transactions.length

  // Clean up the AI text and extract insights
  const cleanText = text
    .replace(/\*\*+/g, '') // Remove asterisks
    .replace(/\|+/g, '') // Remove table separators
    .replace(/---+/g, '') // Remove horizontal rules
    .replace(/#+/g, '') // Remove headers
    .trim()

  // Extract key insights from the text with professional icons
  const insights = []

  if (balance > 1000) {
    insights.push({
      icon: Crown,
      title: 'High Balance Holder',
      description: `Maintains ${formatNumber(balance)} STX tokens`,
      tooltip: `This wallet holds a significant amount of STX (${formatNumber(balance)} tokens), indicating it may be an institutional holder or long-term investor.`,
      color: 'from-yellow-500 to-orange-500',
      iconColor: 'text-yellow-400'
    })
  } else if (balance > 100) {
    insights.push({
      icon: Star,
      title: 'Active Holder',
      description: `Holds ${formatNumber(balance)} STX tokens`,
      tooltip: `With ${formatNumber(balance)} STX tokens, this wallet shows active participation in the Stacks ecosystem.`,
      color: 'from-blue-500 to-purple-500',
      iconColor: 'text-blue-400'
    })
  } else {
    insights.push({
      icon: Sparkles,
      title: 'Growing Wallet',
      description: `Building with ${formatNumber(balance)} STX`,
      tooltip: `This wallet is in its early stages with ${formatNumber(balance)} STX, showing potential for growth.`,
      color: 'from-green-500 to-teal-500',
      iconColor: 'text-green-400'
    })
  }

  if (txCount > 50) {
    insights.push({
      icon: Zap,
      title: 'Very Active',
      description: `${txCount} total transactions`,
      tooltip: `With ${txCount} transactions, this wallet shows very high activity levels on the Stacks blockchain.`,
      color: 'from-purple-500 to-pink-500',
      iconColor: 'text-purple-400'
    })
  } else if (txCount > 10) {
    insights.push({
      icon: RotateCcw,
      title: 'Regular Activity',
      description: `${txCount} transactions recorded`,
      tooltip: `This wallet has ${txCount} transactions, showing consistent but moderate blockchain activity.`,
      color: 'from-blue-500 to-cyan-500',
      iconColor: 'text-cyan-400'
    })
  } else {
    insights.push({
      icon: Target,
      title: 'New Activity',
      description: `${txCount} transactions so far`,
      tooltip: `With only ${txCount} transactions, this appears to be a newer wallet or one with limited activity.`,
      color: 'from-indigo-500 to-blue-500',
      iconColor: 'text-indigo-400'
    })
  }

  if (totalReceived > totalSent * 2) {
    insights.push({
      icon: ArrowDownLeft,
      title: 'Net Accumulator',
      description: 'Receiving more than sending',
      tooltip: `This wallet receives significantly more STX (${formatNumber(totalReceived)}) than it sends (${formatNumber(totalSent)}), indicating accumulation behavior.`,
      color: 'from-green-500 to-emerald-500',
      iconColor: 'text-green-400'
    })
  } else if (totalSent > totalReceived * 2) {
    insights.push({
      icon: ArrowUpRight,
      title: 'Active Sender',
      description: 'Frequently sends transactions',
      tooltip: `This wallet sends more STX (${formatNumber(totalSent)}) than it receives (${formatNumber(totalReceived)}), showing active distribution behavior.`,
      color: 'from-orange-500 to-red-500',
      iconColor: 'text-orange-400'
    })
  }

  // Recent activity pattern
  const recentTxs = walletData.transactions.slice(0, 5)
  const recentTypes = [...new Set(recentTxs.map(tx => tx.tx_type))]

  if (recentTypes.includes('token_transfer')) {
    insights.push({
      icon: Repeat,
      title: 'Token Transfers',
      description: 'Recent STX transfer activity',
      tooltip: 'This wallet has been actively transferring STX tokens in recent transactions, showing ongoing engagement.',
      color: 'from-cyan-500 to-blue-500',
      iconColor: 'text-cyan-400'
    })
  }

  return (
    <div className="space-y-4">
      {/* Insight Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {insights.map((insight, index) => {
          const IconComponent = insight.icon
          return (
            <div key={index} className="relative">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative overflow-hidden rounded-xl bg-gray-800/30 border border-gray-700/30 p-4 hover:bg-gray-800/50 transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${insight.color} opacity-5`} />
                <div className="relative flex items-center space-x-3">
                  <div className={`p-2 rounded-lg bg-gray-700/30 ${insight.iconColor}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-white">{insight.title}</h4>
                    <p className="text-xs text-gray-400">{insight.description}</p>
                  </div>
                </div>
              </motion.div>

              {/* Tooltip */}
              {hoveredCard === index && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute z-10 bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-64 p-3 bg-gray-900 border border-gray-600 rounded-lg shadow-xl"
                >
                  <div className="text-xs text-gray-200 leading-relaxed">
                    {insight.tooltip}
                  </div>
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                </motion.div>
              )}
            </div>
          )
        })}
      </div>

      {/* AI Summary Text - Full Text Display */}
      {cleanText && cleanText.length > 50 && (
        <div className="bg-gray-800/20 rounded-xl p-4 border border-gray-700/20">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-blue-400">AI Analysis</span>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            {cleanText}
          </p>
        </div>
      )}
    </div>
  )
}

interface WalletSummaryProps {
  walletData: WalletData
  aiSummary?: string
}

export default function WalletSummary({ walletData, aiSummary }: WalletSummaryProps) {
  const [copied, setCopied] = useState(false)
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)
  const [showAllTransactions, setShowAllTransactions] = useState(false)

  const balance = parseInt(walletData.balance.stx.balance) / 1000000
  const totalSent = parseInt(walletData.balance.stx.total_sent) / 1000000
  const totalReceived = parseInt(walletData.balance.stx.total_received) / 1000000

  const copyAddress = async () => {
    await navigator.clipboard.writeText(walletData.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Function to render a single transaction
  const renderTransaction = (tx: typeof walletData.transactions[0], index: number, isModal = false) => {
    // Get transaction type icon and color
    const getTransactionIcon = (type: string) => {
      switch (type) {
        case 'token_transfer':
          return { icon: ArrowRight, color: 'from-blue-500 to-cyan-500', bgColor: 'bg-blue-500/10', textColor: 'text-blue-400' }
        case 'contract_call':
          return { icon: Zap, color: 'from-purple-500 to-pink-500', bgColor: 'bg-purple-500/10', textColor: 'text-purple-400' }
        case 'smart_contract':
          return { icon: Star, color: 'from-yellow-500 to-orange-500', bgColor: 'bg-yellow-500/10', textColor: 'text-yellow-400' }
        default:
          return { icon: Hash, color: 'from-gray-500 to-gray-600', bgColor: 'bg-gray-500/10', textColor: 'text-gray-400' }
      }
    }

    // Get status icon and color
    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'success':
          return { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10' }
        case 'abort_by_response':
          return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' }
        case 'abort_by_post_condition':
          return { icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-400/10' }
        default:
          return { icon: AlertCircle, color: 'text-gray-400', bg: 'bg-gray-400/10' }
      }
    }

    const txIcon = getTransactionIcon(tx.tx_type)
    const statusIcon = getStatusIcon(tx.tx_status)
    const TxIcon = txIcon.icon
    const StatusIcon = statusIcon.icon

    return (
      <motion.div
        key={tx.tx_id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: isModal ? index * 0.05 : index * 0.1 }}
        whileHover={{ scale: 1.02, x: 4 }}
        className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-gray-800/30 to-gray-800/10 border border-gray-700/30 p-4 hover:border-gray-600/50 transition-all duration-300 cursor-pointer"
      >
        {/* Animated background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-r ${txIcon.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

        {/* Main content */}
        <div className="relative flex items-center space-x-4">
          {/* Transaction Icon */}
          <div className={`relative p-3 rounded-xl ${txIcon.bgColor} border border-gray-700/30`}>
            <TxIcon className={`w-5 h-5 ${txIcon.textColor}`} />
            {/* Pulse animation for recent transactions */}
            {!isModal && index === 0 && (
              <div className={`absolute inset-0 rounded-xl ${txIcon.bgColor} animate-ping opacity-20`} />
            )}
          </div>

          {/* Transaction Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="text-white font-semibold capitalize truncate">
                {tx.tx_type.replace('_', ' ')}
              </h4>
              <div className={`px-2 py-1 rounded-full ${statusIcon.bg} flex items-center space-x-1`}>
                <StatusIcon className={`w-3 h-3 ${statusIcon.color}`} />
                <span className={`text-xs font-medium ${statusIcon.color} capitalize`}>
                  {tx.tx_status.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>{new Date(tx.burn_block_time * 1000).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Hash className="w-3 h-3" />
                <span>Block {tx.block_height}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Timer className="w-3 h-3" />
                <span>{new Date(tx.burn_block_time * 1000).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center space-x-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-lg bg-gray-700/30 hover:bg-gray-600/30 transition-colors group-hover:bg-gray-600/50"
              onClick={() => window.open(`https://explorer.stacks.co/txid/${tx.tx_id}?chain=testnet`, '_blank')}
            >
              <ExternalLink className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
            </motion.button>
          </div>
        </div>

        {/* Progress bar for recent transactions */}
        {!isModal && index < 3 && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-800">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ delay: index * 0.2, duration: 1 }}
              className={`h-full bg-gradient-to-r ${txIcon.color}`}
            />
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      {/* Wallet Header */}
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Wallet Analysis</h2>
              <p className="text-gray-400">Stacks Testnet</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 mb-4">
          <code className="text-sm text-gray-300 bg-gray-800 px-3 py-1 rounded-lg">
            {truncateAddress(walletData.address)}
          </code>
          <button
            onClick={copyAddress}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>
      </div>



      <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/30 min-w-0"
          >
            <div className="flex items-center space-x-2 mb-2">
              <Wallet className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span className="text-sm text-gray-400 truncate">Balance</span>
            </div>
            <div className="overflow-hidden">
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-white leading-tight break-words">
                {formatNumber(balance)}
                <span className="text-sm ml-1">STX</span>
              </p>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/30 min-w-0"
          >
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span className="text-sm text-gray-400 truncate">Received</span>
            </div>
            <div className="overflow-hidden">
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-400 leading-tight break-words">
                {formatNumber(totalReceived)}
                <span className="text-sm ml-1">STX</span>
              </p>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/30 min-w-0"
          >
            <div className="flex items-center space-x-2 mb-2">
              <TrendingDown className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-sm text-gray-400 truncate">Sent</span>
            </div>
            <div className="overflow-hidden">
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-400 leading-tight break-words">
                {formatNumber(totalSent)}
                <span className="text-sm ml-1">STX</span>
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* AI Summary */}
      {aiSummary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20" style={{ background: '#00000000' }}
        >
          <div className="flex items-center space-x-2 mb-4">
            <Activity className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">AI Insights</h3>
          </div>
          {renderAIInsights(aiSummary, walletData, hoveredCard, setHoveredCard)}
        </motion.div>
      )}

      {/* Enhanced Recent Activity */}
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
              <p className="text-sm text-gray-400">Latest {walletData.transactions.length} transactions</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span>Live</span>
          </div>
        </div>

        <div className="space-y-4">
          {walletData.transactions.slice(0, 5).map((tx, index) => renderTransaction(tx, index))}
        </div>

        {/* View All Button */}
        {walletData.transactions.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-center"
          >
            <button
              onClick={() => {
                console.log('View All button clicked')
                setShowAllTransactions(true)
              }}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-300 flex items-center space-x-2 mx-auto"
            >
              <span>View All {walletData.transactions.length} Transactions</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </div>

      {/* All Transactions Modal */}
      <AnimatePresence>
        {showAllTransactions && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => setShowAllTransactions(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">All Transactions</h2>
                      <p className="text-sm text-gray-400">{walletData.transactions.length} total transactions</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAllTransactions(false)}
                    className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800/50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {walletData.transactions.map((tx, index) => renderTransaction(tx, index, true))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}