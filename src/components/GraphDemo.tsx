'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, PieChart, TrendingUp, Zap, ChevronDown, ChevronUp } from 'lucide-react'
import GraphRenderer from './GraphRenderer'
import { GraphData } from '@/types/stacks'

const demoGraphs = [
  {
    graph: 'VBC',
    x_axis_data: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    y_axis_data: [45, 67, 23, 89, 34],
    title: 'Monthly Transaction Activity',
    subtitle: 'Transactions per month',
    colors: ['#3b82f6', '#1d4ed8', '#60a5fa', '#93c5fd', '#dbeafe'],
    text: 'Peak activity was in April with 89 transactions. Overall trend shows variable monthly usage pattern.'
  },
  {
    graph: 'PG',
    x_axis_data: ['Token Transfer', 'Contract Call', 'Smart Contract'],
    y_axis_data: [150, 45, 5],
    title: 'Transaction Type Distribution',
    colors: ['#10b981', '#f59e0b', '#ef4444'],
    text: 'Token transfers dominate at 75% of all transactions, indicating active STX movement and trading activity.'
  },
  {
    graph: 'HBC',
    x_axis_data: ['ST1ABC...DEF', 'ST2GHI...JKL', 'ST3MNO...PQR', 'ST4STU...VWX'],
    y_axis_data: [25, 18, 12, 8],
    title: 'Top STX Recipients',
    subtitle: 'By transaction count',
    colors: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'],
    text: 'ST1ABC...DEF received the most transactions (25), suggesting it might be an exchange or service address.'
  },
  {
    graph: 'LC',
    x_axis_data: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    y_axis_data: [1000, 1200, 950, 1100],
    title: 'STX Balance Trend',
    subtitle: 'Balance over time',
    colors: ['#06b6d4', '#0891b2'],
    text: 'Balance shows volatility with a dip in week 3, possibly due to a large transaction or contract interaction.'
  }
]

interface GraphDemoProps {
  expandedGraph?: GraphData | null
}

export default function GraphDemo({ expandedGraph }: GraphDemoProps) {
  const [showDemo, setShowDemo] = useState(false)
  const [currentGraph, setCurrentGraph] = useState(0)

  const exampleQuestions = [
    "Show me a chart of monthly transaction activity",
    "Create a pie chart of transaction types", 
    "Draw a bar chart of top recipients",
    "Display balance trend over time",
    "Generate a visual breakdown of contract interactions",
    "Show me October activities with a diagram",
    "Chart the daily activity for last month",
    "Pie chart of STX amounts sent to different addresses",
    "Bar graph of most active days",
    "Line chart showing balance changes over time"
  ]

  return (
    <div className="bg-gray-900/30 backdrop-blur-sm rounded-2xl border border-gray-700/30 p-6 mb-6" style={{marginTop: "20px"}}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Visual Analytics</h3>
            <p className="text-sm text-gray-400">Ask for charts, graphs, and diagrams</p>
          </div>
        </div>
        <button
          onClick={() => setShowDemo(!showDemo)}
          className="flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-colors"
        >
          <span className="text-sm">Examples</span>
          {showDemo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {showDemo && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4"
        >
          {/* Example Questions */}
          <div>
            <h4 className="text-sm font-medium text-white mb-3">Try asking:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {exampleQuestions.map((question, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/30 text-sm text-gray-300 hover:bg-gray-800/70 transition-colors cursor-pointer"
                >
                  &quot;{question}&quot;
                </div>
              ))}
            </div>
          </div>

          {/* Graph Type Selector */}
          <div>
            <h4 className="text-sm font-medium text-white mb-3">Available Graph Types:</h4>
            <div className="flex flex-wrap gap-2 mb-4">
              {demoGraphs.map((graph, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentGraph(index)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentGraph === index
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800/50 text-gray-300 hover:bg-gray-800/70'
                  }`}
                >
                  {graph.graph} - {graph.title}
                </button>
              ))}
            </div>
          </div>

          {/* Demo Graph or Expanded Graph */}
          <div className="border border-gray-700/50 rounded-xl overflow-hidden">
            <GraphRenderer data={expandedGraph || demoGraphs[currentGraph]} />
          </div>
          
          {expandedGraph && (
            <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-sm font-medium text-blue-400">Live Graph from Chat</span>
              </div>
              <p className="text-xs text-gray-300">
                This graph was generated from your conversation. You can continue asking questions about this data.
              </p>
            </div>
          )}

          {/* Graph Types Info */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
            <div className="p-3 bg-gray-800/30 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-white">HBC / VBC</span>
              </div>
              <p className="text-xs text-gray-400">Bar charts for comparing categories and values</p>
            </div>
            
            <div className="p-3 bg-gray-800/30 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <PieChart className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-white">PG / DG</span>
              </div>
              <p className="text-xs text-gray-400">Pie and donut charts for proportions</p>
            </div>
            
            <div className="p-3 bg-gray-800/30 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-white">LC / AC</span>
              </div>
              <p className="text-xs text-gray-400">Line and area charts for trends</p>
            </div>
          </div>

          {/* Instructions */}
          <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-400">How to Use</span>
            </div>
            <div className="text-xs text-gray-300 space-y-1">
              <p>• Enable Agent Mode for advanced graph capabilities</p>
              <p>• Ask for &quot;chart&quot;, &quot;graph&quot;, &quot;diagram&quot;, or &quot;visual&quot; in your questions</p>
              <p>• AI will automatically choose the best graph type for your data</p>
              <p>• Graphs include interactive animations and detailed explanations</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}