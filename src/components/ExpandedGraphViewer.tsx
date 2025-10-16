'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, Share2, BarChart3 } from 'lucide-react'
import GraphRenderer from './GraphRenderer'
import { GraphData } from '@/types/stacks'

interface ExpandedGraphViewerProps {
  graphData: GraphData | null
  onClose: () => void
}

export default function ExpandedGraphViewer({ graphData, onClose }: ExpandedGraphViewerProps) {
  if (!graphData) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{graphData.title}</h2>
                {graphData.subtitle && (
                  <p className="text-gray-400">{graphData.subtitle}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                className="p-2 text-gray-400 hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-800/50"
                title="Download Graph"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                className="p-2 text-gray-400 hover:text-green-400 transition-colors rounded-lg hover:bg-gray-800/50"
                title="Share Graph"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-gray-800/50"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Expanded Graph */}
          <div className="mb-6">
            <GraphRenderer data={graphData} />
          </div>

          {/* Additional Analysis */}
          {graphData.text && (
            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/30">
              <h3 className="text-lg font-semibold text-white mb-3">Analysis</h3>
              <p className="text-gray-300 leading-relaxed">
                {graphData.text}
              </p>
            </div>
          )}

          {/* Graph Details */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Graph Type</h4>
              <p className="text-white font-semibold">
                {graphData.graph === 'VBC' && 'Vertical Bar Chart'}
                {graphData.graph === 'HBC' && 'Horizontal Bar Chart'}
                {graphData.graph === 'PG' && 'Pie Chart'}
                {graphData.graph === 'LC' && 'Line Chart'}
                {graphData.graph === 'AC' && 'Area Chart'}
                {graphData.graph === 'DG' && 'Donut Chart'}
              </p>
            </div>
            
            <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Data Points</h4>
              <p className="text-white font-semibold">{graphData.x_axis_data.length} items</p>
            </div>
            
            <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Total Value</h4>
              <p className="text-white font-semibold">
                {graphData.y_axis_data.reduce((sum, val) => sum + val, 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Data Table */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-white mb-3">Raw Data</h3>
            <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Label</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">Value</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {graphData.x_axis_data.map((label, index) => {
                      const value = graphData.y_axis_data[index]
                      const total = graphData.y_axis_data.reduce((sum, val) => sum + val, 0)
                      const percentage = ((value / total) * 100).toFixed(1)
                      
                      return (
                        <tr key={index} className="hover:bg-gray-700/30 transition-colors">
                          <td className="px-4 py-3 text-sm text-white">{label}</td>
                          <td className="px-4 py-3 text-sm text-white text-right font-mono">
                            {value.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300 text-right">
                            {percentage}%
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}