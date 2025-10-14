'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Loader2, Zap, ToggleLeft, ToggleRight } from 'lucide-react'
import { ChatMessage } from '@/types/stacks'
import { cn } from '@/lib/utils'

// Simple markdown renderer for chat messages
const renderChatMessage = (content: string) => {
  // Clean up the content and split into lines
  const lines = content.split('\n').filter(line => line.trim())
  
  return lines.map((line, index) => {
    // Handle headers (### or ##)
    if (line.startsWith('### ')) {
      return (
        <h4 key={index} className="font-semibold text-white mb-2 text-sm">
          {line.replace('### ', '')}
        </h4>
      )
    }
    if (line.startsWith('## ')) {
      return (
        <h3 key={index} className="font-bold text-white mb-2">
          {line.replace('## ', '')}
        </h3>
      )
    }
    
    // Handle bullet points
    if (line.startsWith('• ') || line.startsWith('- ')) {
      return (
        <div key={index} className="flex items-start space-x-2 mb-1">
          <span className="text-blue-400 mt-1 text-xs">•</span>
          <span className="text-sm">{line.replace(/^[•-]\s/, '')}</span>
        </div>
      )
    }
    
    // Handle bold text (**text**)
    if (line.includes('**')) {
      const parts = line.split(/(\*\*.*?\*\*)/)
      return (
        <p key={index} className="mb-2 text-sm leading-relaxed">
          {parts.map((part, partIndex) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={partIndex} className="font-semibold text-white">
                  {part.slice(2, -2)}
                </strong>
              )
            }
            return part
          })}
        </p>
      )
    }
    
    // Handle table-like content (clean it up)
    if (line.includes('|')) {
      const cleanLine = line.replace(/\|+/g, ' • ').replace(/---+/g, '').trim()
      if (cleanLine) {
        return (
          <p key={index} className="mb-2 text-sm leading-relaxed">
            {cleanLine}
          </p>
        )
      }
      return null
    }
    
    // Regular text
    return (
      <p key={index} className="mb-2 text-sm leading-relaxed">
        {line}
      </p>
    )
  }).filter(Boolean)
}

interface ChatInterfaceProps {
  onSendMessage: (message: string, agentMode?: boolean) => Promise<string>
  disabled?: boolean
  messages: ChatMessage[]
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
}

export default function ChatInterface({ onSendMessage, disabled, messages, setMessages }: ChatInterfaceProps) {
  // Initialize with welcome message if no messages exist
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: 'Hello! I\'m your AI assistant. Ask me anything about this wallet - transaction history, balance patterns, or any other insights you\'d like to know!',
        timestamp: Date.now()
      }])
    }
  }, [messages.length, setMessages])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [agentMode, setAgentMode] = useState(false)
  const [agentLoading, setAgentLoading] = useState(false)
  const [flashAgentMode, setFlashAgentMode] = useState(false)
  const [proAgentMode, setProAgentMode] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading || disabled) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await onSendMessage(input.trim(), agentMode)
      
      // Check if response is an agent action
      if (agentMode && (response.includes('"action"') || response.includes('use_agent'))) {
        console.log('Agent response detected:', response)
        
        // Check if it's Flash Agent Mode (recursive) or Pro Agent Mode (recursive + code)
        const isFlashAgent = response.includes('"recursive"') && response.includes('true')
        const isProAgent = isFlashAgent && response.includes('"code"')
        setFlashAgentMode(isFlashAgent && !isProAgent)
        setProAgentMode(isProAgent)
        setAgentLoading(true)
        setLoading(false)
        
        try {
          // Parse and execute agent action
          const agentResponse = await onSendMessage(`AGENT_EXECUTE:${response}:${input.trim()}`, true)
          const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: agentResponse,
            timestamp: Date.now()
          }
          setMessages(prev => [...prev, assistantMessage])
        } catch (error) {
          console.error('Agent execution error:', error)
          const errorMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Agent Mode encountered an error. Please try again with a different question.',
            timestamp: Date.now()
          }
          setMessages(prev => [...prev, errorMessage])
        } finally {
          setAgentLoading(false)
          setFlashAgentMode(false)
          setProAgentMode(false)
        }
      } else {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response,
          timestamp: Date.now()
        }
        setMessages(prev => [...prev, assistantMessage])
      }
    } catch {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col h-full max-h-full bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50"
    >
      {/* Chat Header */}
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">AI Assistant</h3>
              <p className="text-sm text-gray-400">Ask questions about this wallet</p>
            </div>
          </div>
          
          {/* Agent Mode Toggle */}
          <div className="flex items-center space-x-2">
            <div className={cn(
              "flex items-center space-x-2 rounded-lg p-2 border transition-all duration-300",
              agentMode 
                ? "bg-orange-900/20 border-orange-500/30" 
                : "bg-gray-800/50 border-gray-700/30"
            )}>
              <Zap className={cn("w-4 h-4 transition-colors", agentMode ? "text-orange-400" : "text-gray-500")} />
              <span className={cn("text-xs font-medium transition-colors", agentMode ? "text-orange-400" : "text-gray-400")}>
                Agent Mode
              </span>
              <button
                onClick={() => setAgentMode(!agentMode)}
                className={cn(
                  "flex items-center space-x-1 transition-colors",
                  agentMode ? "text-orange-400 hover:text-orange-300" : "text-gray-400 hover:text-blue-300"
                )}
              >
                {agentMode ? (
                  <ToggleRight className="w-5 h-5" />
                ) : (
                  <ToggleLeft className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Agent Mode Description
        {agentMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 bg-orange-900/20 border border-orange-500/30 rounded-lg"
          >
            <div className="flex items-center space-x-2 mb-1">
              <Zap className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-medium text-orange-400">Agent Mode Active</span>
            </div>
            <p className="text-xs text-gray-300">
              AI can now fetch additional blockchain data automatically when needed to answer your questions.
            </p>
          </motion.div>
        )} */}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4 min-h-0">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                "flex space-x-3 w-full",
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              
              <div className={cn(
                "max-w-[280px] lg:max-w-sm px-4 py-3 rounded-2xl break-words overflow-hidden",
                message.role === 'user'
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                  : "bg-gray-800/50 text-gray-100 border border-gray-700/30"
              )}>
                <div className="text-sm leading-relaxed">
                  {message.role === 'assistant' ? renderChatMessage(message.content) : message.content}
                </div>
                <p className="text-xs opacity-70 mt-2">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {(loading || agentLoading) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex space-x-3"
          >
            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-800/50 border border-gray-700/30 rounded-2xl px-4 py-3">
              <div className="flex items-center space-x-2">
                {agentLoading ? (
                  <>
                    <Zap className="w-4 h-4 animate-pulse text-orange-400" />
                    <span className="text-sm text-orange-400">
                      {proAgentMode ? 'Using Pro Agent Mode...' : flashAgentMode ? 'Using Flash Agent Mode...' : 'Using Agent Mode...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    <span className="text-sm text-gray-400">Thinking...</span>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 border-t border-gray-700/50">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={disabled ? "Load a wallet first..." : "Ask about this wallet..."}
            disabled={disabled || loading}
            className={cn(
              "flex-1 px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl",
              "text-white placeholder-gray-400 focus:outline-none focus:ring-2",
              "focus:ring-blue-500/50 focus:border-blue-500/50 transition-all",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />
          <motion.button
            type="submit"
            disabled={!input.trim() || loading || disabled}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600",
              "text-white rounded-xl transition-all duration-300",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "hover:from-blue-700 hover:to-purple-700"
            )}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </motion.button>
        </form>
      </div>
    </motion.div>
  )
}