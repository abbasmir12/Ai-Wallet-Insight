'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Zap, Github, ExternalLink, Settings, X, Key, Check, Eye, EyeOff, Brain, ToggleLeft, ToggleRight, HelpCircle, Info } from 'lucide-react'
import WalletInput from '@/components/WalletInput'
import WalletSummary from '@/components/WalletSummary'
import ChatInterface from '@/components/ChatInterface'
// Settings functionality will be inline
import { WalletData } from '@/types/stacks'

export default function Home() {
  const [walletData, setWalletData] = useState<WalletData | null>(null)
  const [aiSummary, setAiSummary] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [conversationHistory, setConversationHistory] = useState<Array<{role: 'user' | 'assistant', content: string}>>([])
  const [chatMessages, setChatMessages] = useState<Array<{id: string, role: 'user' | 'assistant', content: string, timestamp: number}>>([])

  
  // Update conversation history when chat messages change
  useEffect(() => {
    const history = chatMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
    setConversationHistory(history)
  }, [chatMessages])
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [savedKey, setSavedKey] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [isLoadingSettings, setIsLoadingSettings] = useState(false)
  const [isTestingApi, setIsTestingApi] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [manualModel, setManualModel] = useState(false)
  const [customModel, setCustomModel] = useState('')
  const [savedModel, setSavedModel] = useState('openai/gpt-oss-120b')
  const [showTooltip, setShowTooltip] = useState<string | null>(null)

  // Load saved API key and model settings when settings modal opens
  const handleOpenSettings = () => {
    setShowSettings(true)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('huggingface_api_key')
      if (saved) {
        setSavedKey(saved)
        setApiKey(saved)
      }

      const savedModelName = localStorage.getItem('ai_model_name')
      if (savedModelName) {
        setSavedModel(savedModelName)
        setCustomModel(savedModelName)
      }

      const isManual = localStorage.getItem('manual_model') === 'true'
      setManualModel(isManual)
      if (isManual && savedModelName) {
        setCustomModel(savedModelName)
      }
    }
  }

  const handleTestApi = async () => {
    if (!apiKey.trim()) return

    setIsTestingApi(true)
    setTestResult(null)

    try {
      const modelToTest = manualModel && customModel.trim() ? customModel.trim() : savedModel

      // First try the chat completions API
      let response = await fetch('https://router.huggingface.co/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: 'Hi'
            }
          ],
          model: modelToTest,
          stream: false,
          max_tokens: 5
        })
      })

      // If chat completions fails, try the inference API as fallback
      if (!response.ok) {
        console.log('Chat completions failed, trying inference API...')
        response = await fetch(`https://api-inference.huggingface.co/models/${modelToTest}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey.trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: 'Test',
            parameters: { max_new_tokens: 1 }
          })
        })
      }

      if (response.ok || response.status === 503) {
        // 503 means model is loading, which is still a valid API key
        setTestResult('success')
      } else {
        const errorText = await response.text()
        console.error('API Test failed:', response.status, errorText)
        setTestResult('error')
      }
    } catch (error) {
      console.error('API Test error:', error)
      setTestResult('error')
    } finally {
      setIsTestingApi(false)
      setTimeout(() => setTestResult(null), 5000)
    }
  }

  const handleSaveSettings = async () => {
    if (!apiKey.trim()) return

    setIsLoadingSettings(true)

    try {
      localStorage.setItem('huggingface_api_key', apiKey.trim())
      setSavedKey(apiKey.trim())

      // Save model settings
      localStorage.setItem('manual_model', manualModel.toString())
      if (manualModel && customModel.trim()) {
        localStorage.setItem('ai_model_name', customModel.trim())
        setSavedModel(customModel.trim())
      } else {
        localStorage.setItem('ai_model_name', 'openai/gpt-oss-120b')
        setSavedModel('openai/gpt-oss-120b')
      }

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setIsLoadingSettings(false)
    }
  }

  const handleClearSettings = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('huggingface_api_key')
      localStorage.removeItem('ai_model_name')
      localStorage.removeItem('manual_model')
      setApiKey('')
      setSavedKey('')
      setCustomModel('')
      setSavedModel('openai/gpt-oss-120b')
      setManualModel(false)
      setShowSuccess(false)
      setTestResult(null)
    }
  }

  const handleWalletSubmit = async (address: string) => {
    setLoading(true)
    setError('')

    try {
      const apiKey = localStorage.getItem('huggingface_api_key')
      const modelName = localStorage.getItem('ai_model_name') || 'openai/gpt-oss-120b'

      const response = await fetch('/api/wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address, apiKey, modelName }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch wallet data')
      }

      const data = await response.json()
      setWalletData(data.walletData)
      setAiSummary(data.aiSummary)
      
      // Start background transaction preloading for Pro Agent Mode
      startBackgroundPreload(data.walletData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const startBackgroundPreload = async (walletData: WalletData) => {
    if (!walletData) return
    
    try {
      console.log('🚀 Starting background transaction preload...')
      
      const response = await fetch('/api/preload-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletData }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Background preload completed:', result)
      } else {
        console.error('Background preload failed:', response.statusText)
      }
    } catch (error) {
      console.error('Background preload error:', error)
    }
  }

  const handleChatMessage = async (message: string, agentMode: boolean = false): Promise<string> => {
    if (!walletData) {
      return 'Please load a wallet first to ask questions about it.'
    }

    try {
      const apiKey = localStorage.getItem('huggingface_api_key')
      const modelName = localStorage.getItem('ai_model_name') || 'openai/gpt-oss-120b'

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: message,
          walletData,
          apiKey,
          modelName,
          agentMode,
          conversationHistory,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      return data.answer
    } catch {
      return 'Sorry, I encountered an error processing your question. Please try again.'
    }
  }

  return (
    <div className="min-h-screen relative">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 p-6"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AI Wallet Insights</h1>
              <p className="text-gray-400 text-sm">Stacks Blockchain Analytics</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={handleOpenSettings}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800/50"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800/50"
              title="GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
            <a
              href="https://docs.stacks.co"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800/50"
              title="Stacks Documentation"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative z-10 px-6 pb-6">
        <div className="max-w-7xl mx-auto">
          {!walletData ? (
            /* Welcome Screen */
            <div className="text-center py-20">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12"
              >
                <h2 className="text-5xl font-bold text-white mb-6">
                  Unlock Wallet
                  <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    {' '}Insights
                  </span>
                </h2>
                <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
                  Enter any Stacks wallet address to get AI-powered analytics, transaction insights,
                  and interactive assistance for blockchain data exploration.
                </p>
              </motion.div>

              <WalletInput onSubmit={handleWalletSubmit} loading={loading} />

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 max-w-2xl mx-auto"
                >
                  {error}
                </motion.div>
              )}

              {/* Features */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
              >
                <div className="bg-gray-900/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Real-time Analytics</h3>
                  <p className="text-gray-400">Get instant insights into wallet balance, transaction history, and activity patterns.</p>
                </div>

                <div className="bg-gray-900/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">AI-Powered Insights</h3>
                  <p className="text-gray-400">Advanced AI analysis provides contextual summaries and pattern recognition.</p>
                </div>

                <div className="bg-gray-900/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-blue-600 rounded-xl flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Interactive Chat</h3>
                  <p className="text-gray-400">Ask natural language questions about any wallet and get intelligent responses.</p>
                </div>
              </motion.div>
            </div>
          ) : (
            /* Dashboard */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)] max-h-[calc(100vh-200px)]">
              {/* Left Panel - Wallet Summary */}
              <div className="lg:col-span-2 overflow-y-auto" style={{ minHeight: '532px', padding: '0 20px 10px' }}>
                <WalletSummary walletData={walletData} aiSummary={aiSummary} />
              </div>

              {/* Right Panel - Chat Interface */}
              <div className="h-full max-h-[500px]">
                <ChatInterface
                  onSendMessage={handleChatMessage}
                  disabled={!walletData}
                  messages={chatMessages}
                  setMessages={setChatMessages}
                />
              </div>
            </div>
          )}
        </div>
      </main>


      {/* Settings Modal */}
      {showSettings && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setShowSettings(false)}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-5 w-full max-w-md">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Settings</h2>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800/50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* API Key Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Key className="w-4 h-4 text-blue-400" />
                  <h3 className="text-lg font-medium text-white">Hugging Face API Key</h3>
                  <div className="relative">
                    <button
                      onMouseEnter={() => setShowTooltip('apiKey')}
                      onMouseLeave={() => setShowTooltip(null)}
                      className="text-gray-400 hover:text-blue-400 transition-colors"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                    {showTooltip === 'apiKey' && (
                      <div className="absolute left-6 top-0 z-10 w-80 p-3 bg-gray-800 border border-gray-600 rounded-lg shadow-lg text-xs text-gray-200">
                        <p className="font-medium mb-2 text-blue-300">How to get your API key:</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Go to <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">huggingface.co/settings/tokens</a></li>
                          <li>Sign up or login to your account</li>
                          <li>Click &quot;New token&quot;</li>
                          <li>Give it a name and select &quot;Read&quot; role</li>
                          <li>Copy the token and paste it below</li>
                        </ol>
                      </div>
                    )}
                  </div>
                </div>

                {/* API Key Input */}
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-4 py-3 pr-12 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveSettings}
                      disabled={!apiKey.trim() || isLoadingSettings}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-700 hover:to-purple-700 flex items-center justify-center space-x-2" style={{ background: 'transparent', border: '.1px solid white' }}
                    >
                      {isLoadingSettings ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Save</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleTestApi}
                      disabled={!apiKey.trim() || isTestingApi}
                      className="px-4 py-2 bg-green-600/20 border border-green-500/30 text-white-400 rounded-lg font-medium hover:bg-green-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2" style={{ background: 'transparent', border: '.1px solid white' }}
                    >
                      {isTestingApi ? (
                        <div className="w-4 h-4 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Test</span>
                        </>
                      )}
                    </button>

                    {savedKey && (
                      <button
                        onClick={handleClearSettings}
                        className="px-4 py-2 bg-red-600/20 border border-red-500/30 text-white-400 rounded-lg font-medium hover:bg-red-600/30 transition-colors" style={{ background: 'transparent', border: '.1px solid white' }}
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Test Result */}
                  {testResult === 'success' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center space-x-2 text-green-400 text-sm border border-none rounded-lg p-3"
                    >
                      <Check className="w-4 h-4" />
                      <span>API key test successful!</span>
                    </motion.div>
                  )}

                  {testResult === 'error' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center space-x-2 text-red-400 text-sm bg-red-900/20 border border-red-500/30 rounded-lg p-3"
                    >
                      <X className="w-4 h-4" />
                      <span>API key test failed. Please check your key.</span>
                    </motion.div>
                  )}

                  {/* Success Message */}
                  {showSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center space-x-2 text-green-400 text-sm bg-green-900/20 border border-green-500/30 rounded-lg p-3"
                    >
                      <Check className="w-4 h-4" />
                      <span>Settings saved successfully!</span>
                    </motion.div>
                  )}

                  {/* Status Indicator */}
                  {savedKey && !showSuccess && !testResult && (
                    <div className="flex items-center space-x-2 text-green-400 text-sm">
                      <Check className="w-4 h-4" />
                      <span>API key is configured</span>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Model Selection */}
              <div className="mt-4 pt-4 border-t border-gray-700/50">
                <div className="flex items-center space-x-2 mb-3">
                  <Brain className="w-4 h-4 text-purple-400" />
                  <h3 className="text-lg font-medium text-white">AI Model Selection</h3>
                  <div className="relative">
                    <button
                      onMouseEnter={() => setShowTooltip('model')}
                      onMouseLeave={() => setShowTooltip(null)}
                      className="text-gray-400 hover:text-purple-400 transition-colors"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                    {showTooltip === 'model' && (
                      <div className="absolute left-6 top-0 z-10 w-72 p-3 bg-gray-800 border border-gray-600 rounded-lg shadow-lg text-xs text-gray-200">
                        <p className="font-medium mb-2 text-purple-300">Model Selection:</p>
                        <p className="mb-2">• <strong>Default:</strong> Uses openai/gpt-oss-120b (recommended)</p>
                        <p className="mb-2">• <strong>Manual:</strong> Choose any Hugging Face text generation model</p>
                        <p className="text-gray-400">Examples: microsoft/DialoGPT-medium, google/flan-t5-base</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Manual Toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="text-sm">
                      <p className="text-white font-medium">Manual Model Selection</p>
                      <p className="text-gray-400 text-xs">Choose your own Hugging Face model</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setManualModel(!manualModel)}
                    className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {manualModel ? (
                      <ToggleRight className="w-6 h-6" />
                    ) : (
                      <ToggleLeft className="w-6 h-6" />
                    )}
                  </button>
                </div>

                {/* Custom Model Input */}
                {manualModel && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-3"
                  >
                    <input
                      type="text"
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      placeholder="e.g., microsoft/DialoGPT-medium"
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all text-sm"
                    />
                  </motion.div>
                )}

                {/* Current Model Display */}
                <div className="bg-gray-800/30 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <Info className="w-3 h-3 text-gray-400" />
                    <h4 className="text-sm font-medium text-white">Current Configuration</h4>
                  </div>
                  <div className="space-y-1 text-xs text-gray-300">
                    <p><span className="font-medium">Model:</span> {manualModel && customModel.trim() ? customModel : savedModel}</p>
                    <p><span className="font-medium">Mode:</span> {manualModel ? 'Manual' : 'Default'}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  )
}