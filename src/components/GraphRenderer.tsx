'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, PieChart, TrendingUp, Activity } from 'lucide-react'
import { GraphData } from '@/types/stacks'

interface GraphRendererProps {
  data: GraphData
  isCompact?: boolean
  onClick?: () => void
}

export default function GraphRenderer({ data, isCompact = false, onClick }: GraphRendererProps) {
  const [animationComplete, setAnimationComplete] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Validate data to prevent NaN errors
  const safeData = {
    ...data,
    x_axis_data: data.x_axis_data || [],
    y_axis_data: data.y_axis_data?.map(val => isNaN(val) ? 0 : val) || [],
    tooltip_data: data.tooltip_data
  }
  const [tooltip, setTooltip] = useState<{
    visible: boolean
    x: number
    y: number
    content: {
      label: string
      value: number
      percentage?: number
      color: string
      additionalInfo?: string
    }
  }>({
    visible: false,
    x: 0,
    y: 0,
    content: { label: '', value: 0, color: '' }
  })

  useEffect(() => {
    const timer = setTimeout(() => setAnimationComplete(true), 500)
    return () => clearTimeout(timer)
  }, [])

  const showTooltip = (event: React.MouseEvent, label: string, value: number, color: string, additionalInfo?: string) => {
    const element = event.currentTarget
    const rect = element.getBoundingClientRect()
    const containerRect = containerRef.current?.getBoundingClientRect()
    
    if (!containerRect) return
    
    const total = safeData.y_axis_data.reduce((sum, val) => sum + val, 0)
    const percentage = total > 0 ? (value / total) * 100 : 0
    
    // Get enhanced tooltip data if available
    const tooltipData = safeData.tooltip_data?.[label]
    const enhancedInfo = tooltipData?.info || additionalInfo
    
    // Calculate position relative to the element center
    const elementCenterX = rect.left + rect.width / 2
    
    // Position tooltip above the element by default
    let x = elementCenterX
    let y = rect.top - 15
    
    // If tooltip would go above the container, position it below
    if (y < containerRect.top + 10) {
      y = rect.bottom + 15
    }
    
    // Keep tooltip within horizontal bounds relative to container
    const tooltipWidth = 256 // w-64 = 16rem = 256px
    const containerLeft = containerRect.left
    const containerRight = containerRect.right
    
    // Adjust horizontal position to stay within container bounds
    if (x + tooltipWidth / 2 > containerRight - 10) {
      x = containerRight - tooltipWidth / 2 - 10
    } else if (x - tooltipWidth / 2 < containerLeft + 10) {
      x = containerLeft + tooltipWidth / 2 + 10
    }
    
    setTooltip({
      visible: true,
      x: x,
      y: y,
      content: {
        label,
        value,
        percentage,
        color,
        additionalInfo: enhancedInfo
      }
    })
  }

  const hideTooltip = () => {
    setTooltip(prev => ({ ...prev, visible: false }))
  }

  const defaultColors = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b',
    '#ef4444', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
  ]

  const colors = data.colors || defaultColors

  const renderHorizontalBarChart = () => {
    const maxValue = Math.max(...safeData.y_axis_data) || 1
    
    return (
      <div className="space-y-3">
        {safeData.x_axis_data.map((label, index) => {
          const value = safeData.y_axis_data[index] || 0
          const percentage = (value / maxValue) * 100
          const color = colors[index % colors.length]
          
          return (
            <div key={index} className="flex items-center space-x-3">
              <div className="w-24 text-sm text-gray-300 text-right truncate">
                {label}
              </div>
              <div className="flex-1 bg-gray-800/50 rounded-full h-8 relative overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: animationComplete ? `${percentage}%` : 0 }}
                  transition={{ duration: 1, delay: index * 0.1 }}
                  className="h-full rounded-full flex items-center justify-end pr-3 cursor-pointer hover:brightness-110 transition-all"
                  style={{ backgroundColor: color }}
                  onMouseEnter={(e) => showTooltip(e, label, value, color, `Rank: #${index + 1}`)}
                  onMouseLeave={hideTooltip}
                >
                  <span className="text-white text-sm font-medium">
                    {value.toLocaleString()}
                  </span>
                </motion.div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderVerticalBarChart = () => {
    const maxValue = Math.max(...safeData.y_axis_data) || 1
    
    return (
      <div className="flex items-end justify-center space-x-2 h-64">
        {safeData.x_axis_data.map((label, index) => {
          const value = safeData.y_axis_data[index] || 0
          const height = (value / maxValue) * 200
          const color = colors[index % colors.length]
          
          return (
            <div key={index} className="flex flex-col items-center space-y-2">
              <div className="relative">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: animationComplete ? height : 0 }}
                  transition={{ duration: 1, delay: index * 0.1 }}
                  className="w-12 rounded-t-lg flex items-end justify-center pb-1 cursor-pointer hover:brightness-110 transition-all"
                  style={{ backgroundColor: color, minHeight: '20px' }}
                  onMouseEnter={(e) => showTooltip(e, label, value, color, `Position: ${index + 1} of ${data.x_axis_data.length}`)}
                  onMouseLeave={hideTooltip}
                >
                  <span className="text-white text-xs font-medium">
                    {value}
                  </span>
                </motion.div>
              </div>
              <div className="text-xs text-gray-400 text-center w-16 truncate">
                {label}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderPieChart = () => {
    const total = safeData.y_axis_data.reduce((sum, val) => sum + val, 0) || 1
    let currentAngle = 0
    
    return (
      <div className="flex items-center justify-center">
        <div className="relative">
          <svg width="200" height="200" className="transform -rotate-90">
            {safeData.y_axis_data.map((value, index) => {
              // const percentage = (value / total) * 100
              const angle = (value / total) * 360
              const color = colors[index % colors.length]
              
              const startAngle = currentAngle
              const endAngle = currentAngle + angle
              currentAngle += angle
              
              const startX = 100 + 80 * Math.cos((startAngle * Math.PI) / 180)
              const startY = 100 + 80 * Math.sin((startAngle * Math.PI) / 180)
              const endX = 100 + 80 * Math.cos((endAngle * Math.PI) / 180)
              const endY = 100 + 80 * Math.sin((endAngle * Math.PI) / 180)
              
              const largeArcFlag = angle > 180 ? 1 : 0
              
              return (
                <motion.path
                  key={index}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: animationComplete ? 1 : 0 }}
                  transition={{ duration: 1, delay: index * 0.2 }}
                  d={`M 100 100 L ${startX} ${startY} A 80 80 0 ${largeArcFlag} 1 ${endX} ${endY} Z`}
                  fill={color}
                  stroke="#1f2937"
                  strokeWidth="2"
                  className="cursor-pointer hover:brightness-110 transition-all"
                  onMouseEnter={(e) => {
                    showTooltip(e, data.x_axis_data[index], value, color, `Segment ${index + 1} of ${data.x_axis_data.length}`)
                  }}
                  onMouseLeave={hideTooltip}
                />
              )
            })}
          </svg>
          
          {/* Legend */}
          <div className="absolute -right-32 top-0 space-y-2">
            {data.x_axis_data.map((label, index) => {
              const value = data.y_axis_data[index]
              const percentage = ((value / total) * 100).toFixed(1)
              const color = colors[index % colors.length]
              
              return (
                <div key={index} className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs text-gray-300">
                    {label}: {percentage}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const renderLineChart = () => {
    const maxValue = Math.max(...safeData.y_axis_data) || 1
    const minValue = Math.min(...safeData.y_axis_data) || 0
    const range = maxValue - minValue || 1
    const dataLength = safeData.y_axis_data.length
    
    const points = safeData.y_axis_data.map((value, index) => {
      const x = dataLength > 1 ? (index / (dataLength - 1)) * 300 : 150 // Center if single point
      const y = 150 - ((value - minValue) / range) * 120
      return `${x},${y}`
    }).join(' ')
    
    return (
      <div className="flex flex-col items-center">
        <svg width="320" height="180" className="mb-4">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors[0]} />
              <stop offset="100%" stopColor={colors[1] || colors[0]} />
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map(i => (
            <line
              key={i}
              x1="0"
              y1={30 + i * 30}
              x2="300"
              y2={30 + i * 30}
              stroke="#374151"
              strokeWidth="1"
              opacity="0.3"
            />
          ))}
          
          {/* Line */}
          <motion.polyline
            initial={{ pathLength: 0 }}
            animate={{ pathLength: animationComplete ? 1 : 0 }}
            transition={{ duration: 2 }}
            points={points}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          
          {/* Points */}
          {safeData.y_axis_data.map((value, index) => {
            const dataLength = safeData.y_axis_data.length
            const x = dataLength > 1 ? (index / (dataLength - 1)) * 300 : 150 // Center if single point
            const y = 150 - ((value - minValue) / range) * 120
            
            // Ensure x and y are valid numbers
            const safeX = isNaN(x) ? 150 : x
            const safeY = isNaN(y) ? 75 : y
            
            return (
              <motion.circle
                key={index}
                initial={{ scale: 0 }}
                animate={{ scale: animationComplete ? 1 : 0 }}
                transition={{ duration: 0.5, delay: 1 + index * 0.1 }}
                cx={safeX}
                cy={safeY}
                r="4"
                fill={colors[0]}
                stroke="#1f2937"
                strokeWidth="2"
                className="cursor-pointer hover:r-6 transition-all"
                onMouseEnter={(e) => {
                  showTooltip(e, safeData.x_axis_data[index], value, colors[0], `Data point ${index + 1}`)
                }}
                onMouseLeave={hideTooltip}
              />
            )
          })}
        </svg>
        
        {/* X-axis labels */}
        <div className="flex justify-between w-80 text-xs text-gray-400">
          {data.x_axis_data.map((label, index) => (
            <span key={index} className="text-center">
              {label}
            </span>
          ))}
        </div>
      </div>
    )
  }

  const renderAreaChart = () => {
    const maxValue = Math.max(...safeData.y_axis_data) || 1
    const minValue = Math.min(...safeData.y_axis_data) || 0
    const range = maxValue - minValue || 1
    const dataLength = safeData.y_axis_data.length
    
    const points = safeData.y_axis_data.map((value, index) => {
      const x = dataLength > 1 ? (index / (dataLength - 1)) * 300 : 150 // Center if single point
      const y = 150 - ((value - minValue) / range) * 120
      return `${x},${y}`
    }).join(' ')
    
    const areaPoints = `0,150 ${points} 300,150`
    
    return (
      <div className="flex flex-col items-center">
        <svg width="320" height="180" className="mb-4">
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors[0]} stopOpacity="0.8" />
              <stop offset="100%" stopColor={colors[0]} stopOpacity="0.1" />
            </linearGradient>
          </defs>
          
          {/* Area */}
          <motion.polygon
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: animationComplete ? 1 : 0, opacity: animationComplete ? 1 : 0 }}
            transition={{ duration: 2 }}
            points={areaPoints}
            fill="url(#areaGradient)"
          />
          
          {/* Line */}
          <motion.polyline
            initial={{ pathLength: 0 }}
            animate={{ pathLength: animationComplete ? 1 : 0 }}
            transition={{ duration: 2 }}
            points={points}
            fill="none"
            stroke={colors[0]}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        
        {/* X-axis labels */}
        <div className="flex justify-between w-80 text-xs text-gray-400">
          {data.x_axis_data.map((label, index) => (
            <span key={index} className="text-center">
              {label}
            </span>
          ))}
        </div>
      </div>
    )
  }

  const renderDonutChart = () => {
    const total = data.y_axis_data.reduce((sum, val) => sum + val, 0)
    let currentAngle = 0
    const radius = 80
    const innerRadius = 50
    
    return (
      <div className="flex items-center justify-center">
        <div className="relative">
          <svg width="200" height="200" className="transform -rotate-90">
            {data.y_axis_data.map((value, index) => {
              // const percentage = (value / total) * 100
              const angle = (value / total) * 360
              const color = colors[index % colors.length]
              
              const startAngle = currentAngle
              const endAngle = currentAngle + angle
              currentAngle += angle
              
              const startX1 = 100 + radius * Math.cos((startAngle * Math.PI) / 180)
              const startY1 = 100 + radius * Math.sin((startAngle * Math.PI) / 180)
              const endX1 = 100 + radius * Math.cos((endAngle * Math.PI) / 180)
              const endY1 = 100 + radius * Math.sin((endAngle * Math.PI) / 180)
              
              const startX2 = 100 + innerRadius * Math.cos((startAngle * Math.PI) / 180)
              const startY2 = 100 + innerRadius * Math.sin((startAngle * Math.PI) / 180)
              const endX2 = 100 + innerRadius * Math.cos((endAngle * Math.PI) / 180)
              const endY2 = 100 + innerRadius * Math.sin((endAngle * Math.PI) / 180)
              
              const largeArcFlag = angle > 180 ? 1 : 0
              
              return (
                <motion.path
                  key={index}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: animationComplete ? 1 : 0 }}
                  transition={{ duration: 1, delay: index * 0.2 }}
                  d={`M ${startX1} ${startY1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX1} ${endY1} L ${endX2} ${endY2} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${startX2} ${startY2} Z`}
                  fill={color}
                  stroke="#1f2937"
                  strokeWidth="2"
                  className="cursor-pointer hover:brightness-110 transition-all"
                  onMouseEnter={(e) => {
                    showTooltip(e, data.x_axis_data[index], value, color, `Donut segment ${index + 1}`)
                  }}
                  onMouseLeave={hideTooltip}
                />
              )
            })}
          </svg>
          
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{total}</div>
              <div className="text-xs text-gray-400">Total</div>
            </div>
          </div>
          
          {/* Legend */}
          <div className="absolute -right-32 top-0 space-y-2">
            {data.x_axis_data.map((label, index) => {
              const value = data.y_axis_data[index]
              const percentage = ((value / total) * 100).toFixed(1)
              const color = colors[index % colors.length]
              
              return (
                <div key={index} className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs text-gray-300">
                    {label}: {percentage}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const getGraphIcon = () => {
    switch (data.graph) {
      case 'HBC': return <BarChart3 className="w-5 h-5" />
      case 'VBC': return <BarChart3 className="w-5 h-5 transform rotate-90" />
      case 'PG': return <PieChart className="w-5 h-5" />
      case 'LC': return <TrendingUp className="w-5 h-5" />
      case 'AC': return <Activity className="w-5 h-5" />
      case 'DG': return <PieChart className="w-5 h-5" />
      default: return <BarChart3 className="w-5 h-5" />
    }
  }

  const renderGraph = () => {
    switch (data.graph) {
      case 'HBC': return renderHorizontalBarChart()
      case 'VBC': return renderVerticalBarChart()
      case 'PG': return renderPieChart()
      case 'LC': return renderLineChart()
      case 'AC': return renderAreaChart()
      case 'DG': return renderDonutChart()
      default: return renderVerticalBarChart()
    }
  }

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 my-4 relative ${
        isCompact 
          ? 'p-3 cursor-pointer hover:bg-gray-800/50 transition-colors' 
          : 'p-6'
      } ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className={`flex items-center space-x-3 ${isCompact ? 'mb-3' : 'mb-6'}`}>
        <div className={`${isCompact ? 'p-1' : 'p-2'} bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg`}>
          {getGraphIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`${isCompact ? 'text-sm' : 'text-lg'} font-semibold text-white truncate`}>
            {data.title}
          </h3>
          {data.subtitle && !isCompact && (
            <p className="text-sm text-gray-400">{data.subtitle}</p>
          )}
        </div>
        {isCompact && onClick && (
          <div className="text-xs text-blue-400 hover:text-blue-300">
            Click to expand
          </div>
        )}
      </div>

      {/* Graph */}
      <div className={`flex justify-center ${isCompact ? 'mb-2' : 'mb-4'}`}>
        <div className={isCompact ? 'transform scale-75 origin-center' : ''}>
          {renderGraph()}
        </div>
      </div>

      {/* Text content if provided */}
      {data.text && !isCompact && (
        <div className="mt-6 p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
          <p className="text-sm text-gray-300 leading-relaxed">
            {data.text}
          </p>
        </div>
      )}

      {/* Interactive Tooltip */}
      {tooltip.visible && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-lg p-3 shadow-xl w-64 relative"
          >
            {/* Tooltip Arrow */}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-700/50"></div>
              <div className="w-0 h-0 border-l-3 border-r-3 border-t-3 border-l-transparent border-r-transparent border-t-gray-900/95 absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-px"></div>
            </div>
            <div className="flex items-center space-x-2 mb-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: tooltip.content.color }}
              />
              <span className="text-sm font-medium text-white">
                {tooltip.content.label}
              </span>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">
                  {safeData.value_label || 'Value'}:
                </span>
                <span className="text-sm font-mono text-white">
                  {tooltip.content.value.toLocaleString()}
                </span>
              </div>
              
              {tooltip.content.percentage !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Share:</span>
                  <span className="text-sm font-mono text-blue-400">
                    {tooltip.content.percentage.toFixed(1)}%
                  </span>
                </div>
              )}

              {/* Progress bar for percentage */}
              {tooltip.content.percentage !== undefined && (
                <div className="mt-2">
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: `${tooltip.content.percentage}%`,
                        backgroundColor: tooltip.content.color
                      }}
                    />
                  </div>
                </div>
              )}
              
              {tooltip.content.additionalInfo && (
                <div className="pt-2 border-t border-gray-700/50">
                  <span className="text-xs text-gray-300">
                    {tooltip.content.additionalInfo}
                  </span>
                </div>
              )}

              {/* Enhanced data from tooltip_data */}
              {data.tooltip_data?.[tooltip.content.label]?.additionalMetrics && (
                <div className="pt-2 border-t border-gray-700/50 space-y-1">
                  {Object.entries(data.tooltip_data[tooltip.content.label].additionalMetrics || {}).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-xs text-gray-400 capitalize">{key}:</span>
                      <span className="text-xs font-mono text-gray-200">
                        {typeof value === 'number' ? value.toLocaleString() : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}