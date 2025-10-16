import { WalletData } from '@/types/stacks'

// Flash Agent response types
interface FlashAgentMetadata {
  matchOffset?: number
  pattern: string
  totalSearched: number
  searchCompleted?: boolean
  noMatchFound?: boolean
}

interface FlashAgentResponse {
  _flashAgent: FlashAgentMetadata
  [key: string]: unknown
}

// Pro Agent response types
interface ProAgentMetadata {
  success?: boolean
  error?: boolean
  errorMessage?: string
  stderr?: string
  result?: unknown
  totalBatches: number
  fileName: string
  needsCodeFix?: boolean
  originalCode?: string
  attempt?: number
  maxRetries?: number
  dataStructure?: {
    format: string
    batchStructure: string
    transactionStructure: string
    example: string
  }
}

interface ProAgentResponse {
  _proAgent: ProAgentMetadata
  [key: string]: unknown
}

// Extended transaction types for better type safety
interface ExtendedTransaction {
  tx_id: string
  tx_type: string
  tx_status: string
  block_height: number
  burn_block_time: number
  sender_address: string
  fee_rate: string
  contract_call?: {
    contract_id: string
    function_name: string
    function_args?: Array<{
      hex: string
      repr: string
      name: string
      type: string
    }>
  }
  smart_contract?: {
    contract_id: string
    clarity_version: number
    source_code: string
  }
  token_transfer?: {
    recipient_address: string
    amount: string
    memo: string
  }
  nonce?: number
  canonical?: boolean
  execution_cost_runtime?: number
  vm_error?: string | null
  events?: Array<{
    event_type?: string
    stx_transfer_event?: {
      recipient?: string
      amount?: string
    }
  }>
}

// Direct API query function using the exact format that works
interface HuggingFaceRequest {
  messages: Array<{
    role: string
    content: string
  }>
  model: string
  max_tokens?: number
  temperature?: number
}

async function queryHuggingFace(data: HuggingFaceRequest, apiKey: string) {
  const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify(data),
  })

  const result = await response.json()
  return result
}

export async function generateWalletSummary(walletData: WalletData, apiKey?: string, modelName?: string): Promise<string> {
  // Analyze transaction patterns for summary
  const txTypes = walletData.transactions.reduce((acc: Record<string, number>, tx) => {
    acc[tx.tx_type] = (acc[tx.tx_type] || 0) + 1
    return acc
  }, {})

  const contractInteractions = walletData.transactions
    .filter(tx => tx.tx_type === 'contract_call')
    .map(tx => (tx as ExtendedTransaction).contract_call?.contract_id)
    .filter(Boolean)

  const deployedContracts = walletData.transactions
    .filter(tx => tx.tx_type === 'smart_contract')
    .map(tx => (tx as ExtendedTransaction).smart_contract?.contract_id)
    .filter(Boolean)

  const totalFees = walletData.transactions.reduce((sum, tx) => {
    return sum + parseInt(tx.fee_rate || '0')
  }, 0)

  const statusBreakdown = walletData.transactions.reduce((acc: Record<string, number>, tx) => {
    acc[tx.tx_status] = (acc[tx.tx_status] || 0) + 1
    return acc
  }, {})

  const prompt = `Analyze this Stacks wallet and provide comprehensive insights about 200-250 words:

WALLET: ${walletData.address}

FINANCIAL OVERVIEW:
- Current Balance: ${(parseInt(walletData.balance.stx.balance) / 1000000).toFixed(6)} STX
- Total Sent: ${(parseInt(walletData.balance.stx.total_sent) / 1000000).toFixed(6)} STX
- Total Received: ${(parseInt(walletData.balance.stx.total_received) / 1000000).toFixed(6)} STX
- Net Change: ${((parseInt(walletData.balance.stx.total_received) - parseInt(walletData.balance.stx.total_sent)) / 1000000).toFixed(6)} STX
- Total Fees Paid: ${(totalFees / 1000000).toFixed(6)} STX

ACTIVITY BREAKDOWN:
- Total Transactions: ${walletData.transactions.length}
- Transaction Types: ${Object.entries(txTypes).map(([type, count]) => `${type}(${count})`).join(', ')}
- Success Rate: ${Math.round((statusBreakdown.success || 0) / walletData.transactions.length * 100)}%
- Failed/Aborted: ${(statusBreakdown.abort_by_response || 0) + (statusBreakdown.abort_by_post_condition || 0)}

SMART CONTRACT ENGAGEMENT:
- Contracts Interacted: ${[...new Set(contractInteractions)].length}
- Contracts Deployed: ${deployedContracts.length}
- Recent Activity: ${walletData.transactions.slice(0, 5).map(tx => tx.tx_type).join(', ')}

NOTABLE PATTERNS:
${walletData.transactions.some(tx => (tx as ExtendedTransaction).contract_call?.function_name?.includes('score')) ? '- Gaming/Quiz activity detected' : ''}
${walletData.transactions.some(tx => tx.tx_type === 'token_transfer') ? '- Active in STX transfers' : ''}
${deployedContracts.length > 0 ? '- Smart contract developer' : ''}

Provide a detailed analysis covering wallet behavior, usage patterns, activity assessment, transaction characteristics, and overall profile classification. Write in natural flowing paragraphs without bullet points or tables.`

  const authKey = apiKey || process.env.HUGGINGFACE_API_KEY
  const model = modelName || 'openai/gpt-oss-120b'

  if (!authKey) {
    return 'Please configure your Hugging Face API key in settings to enable AI analysis.'
  }

  try {
    const response = await queryHuggingFace({
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      model: model
    }, authKey)

    const content = response.choices?.[0]?.message?.content

    if (!content) {
      return 'Unable to generate summary at this time.'
    }

    // Clean up excessive markdown formatting and table syntax
    const cleanContent = content
      .replace(/\*\*\*+/g, '**') // Remove triple+ asterisks
      .replace(/---+/g, '') // Remove horizontal rules
      .replace(/#{4,}/g, '###') // Limit header levels
      .replace(/\|+/g, '') // Remove table separators
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()

    return cleanContent
  } catch (error) {
    console.error('AI Summary Error:', error)
    return 'AI summary temporarily unavailable. Please try again later.'
  }
}

interface ConversationMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function askWalletQuestion(question: string, walletData: WalletData, apiKey?: string, modelName?: string, agentMode: boolean = false, conversationHistory: ConversationMessage[] = []): Promise<string> {
  // Create comprehensive transaction context with all available data
  const detailedTransactions = walletData.transactions.map((tx, index) => {
    const date = new Date(tx.burn_block_time * 1000).toLocaleDateString()
    const time = new Date(tx.burn_block_time * 1000).toLocaleTimeString()
    const extendedTx = tx as ExtendedTransaction

    // Extract receiver info and amounts from different transaction types
    let transferDetails = ''
    let contractDetails = ''
    let additionalInfo = ''

    // For token_transfer transactions
    if (tx.tx_type === 'token_transfer' && extendedTx.token_transfer) {
      const recipient = extendedTx.token_transfer.recipient_address
      const amount = extendedTx.token_transfer.amount
      const memo = extendedTx.token_transfer.memo

      transferDetails = `\n    - Recipient: ${recipient}`
      if (amount) {
        const amountSTX = (parseInt(amount) / 1000000).toFixed(6)
        transferDetails += `\n    - Amount Transferred: ${amountSTX} STX`
      }
      if (memo && memo !== '0x00000000000000000000000000000000000000000000000000000000000000000000') {
        try {
          const memoText = Buffer.from(memo.slice(2), 'hex').toString('utf8').replace(/\0/g, '')
          if (memoText) transferDetails += `\n    - Memo: "${memoText}"`
        } catch {
          transferDetails += `\n    - Memo: ${memo}`
        }
      }
    }

    // For contract_call transactions
    if (tx.tx_type === 'contract_call' && extendedTx.contract_call) {
      const contractId = extendedTx.contract_call.contract_id
      const functionName = extendedTx.contract_call.function_name
      const functionArgs = extendedTx.contract_call.function_args || []

      contractDetails = `\n    - Contract: ${contractId}`
      contractDetails += `\n    - Function: ${functionName}`
      if (functionArgs.length > 0) {
        const args = functionArgs.map((arg) => `${arg.name}: ${arg.repr}`).join(', ')
        contractDetails += `\n    - Arguments: ${args}`
      }
    }

    // For smart_contract transactions
    if (tx.tx_type === 'smart_contract' && extendedTx.smart_contract) {
      const contractId = extendedTx.smart_contract.contract_id
      const clarityVersion = extendedTx.smart_contract.clarity_version

      contractDetails = `\n    - Deployed Contract: ${contractId}`
      contractDetails += `\n    - Clarity Version: ${clarityVersion}`

      // Include first few lines of source code for context
      if (extendedTx.smart_contract.source_code) {
        const sourceLines = extendedTx.smart_contract.source_code.split('\n').slice(0, 3)
        contractDetails += `\n    - Contract Purpose: ${sourceLines.join(' ').substring(0, 100)}...`
      }
    }

    // Additional transaction metadata
    additionalInfo += `\n    - Nonce: ${extendedTx.nonce || 'N/A'}`
    additionalInfo += `\n    - Fee Rate: ${tx.fee_rate} microSTX`

    if (extendedTx.execution_cost_runtime) {
      additionalInfo += `\n    - Execution Cost: ${extendedTx.execution_cost_runtime} runtime units`
    }

    if (extendedTx.vm_error) {
      additionalInfo += `\n    - VM Error: ${extendedTx.vm_error}`
    }

    // Event information
    if (extendedTx.events && extendedTx.events.length > 0) {
      const tokenTransferEvents = extendedTx.events.filter((event) => {
        return event.event_type === 'stx_transfer_event'
      })
      if (tokenTransferEvents.length > 0) {
        const eventReceivers = tokenTransferEvents.map((event) => {
          if (event.stx_transfer_event?.recipient) {
            let info = event.stx_transfer_event.recipient
            if (event.stx_transfer_event.amount) {
              const amountSTX = (parseInt(event.stx_transfer_event.amount) / 1000000).toFixed(6)
              info += ` (${amountSTX} STX)`
            }
            return info
          }
          return null
        }).filter(Boolean)
        if (eventReceivers.length > 0) {
          additionalInfo += `\n    - Event Recipients: ${eventReceivers.join(', ')}`
        }
      }
      additionalInfo += `\n    - Total Events: ${extendedTx.events.length}`
    }

    return `TRANSACTION #${index + 1}: ${tx.tx_type.toUpperCase()}
    - TX ID: ${tx.tx_id}
    - Date & Time: ${date} at ${time}
    - Status: ${tx.tx_status}
    - Sender: ${tx.sender_address}${transferDetails}${contractDetails}${additionalInfo}
    - Block Height: ${tx.block_height}
    - Canonical: ${extendedTx.canonical ? 'Yes' : 'No'}`
  }).join('\n\n')

  // Get unique addresses that interacted with this wallet (senders and receivers)
  const allSenders = walletData.transactions.map(tx => tx.sender_address)
  const allReceivers: string[] = []

  // Extract receivers from token_transfer transactions
  walletData.transactions.forEach(tx => {
    const extendedTx = tx as ExtendedTransaction
    if (tx.tx_type === 'token_transfer') {
      if (extendedTx.token_transfer?.recipient_address) {
        allReceivers.push(extendedTx.token_transfer.recipient_address)
      }
    }

    // Extract receivers from transaction events
    if (extendedTx.events && extendedTx.events.length > 0) {
      extendedTx.events.forEach((event) => {
        if (event.event_type === 'stx_transfer_event' && event.stx_transfer_event?.recipient) {
          allReceivers.push(event.stx_transfer_event.recipient)
        }
      })
    }
  })

  const uniqueSenders = [...new Set(allSenders)].filter(addr => addr !== walletData.address)
  const uniqueReceivers = [...new Set(allReceivers)].filter(addr => addr !== walletData.address)

  // Analyze transaction patterns
  const txTypes = walletData.transactions.reduce((acc: Record<string, number>, tx) => {
    acc[tx.tx_type] = (acc[tx.tx_type] || 0) + 1
    return acc
  }, {})

  const contractInteractions = walletData.transactions
    .filter(tx => tx.tx_type === 'contract_call')
    .map(tx => (tx as ExtendedTransaction).contract_call?.contract_id)
    .filter(Boolean)

  const uniqueContracts = [...new Set(contractInteractions)]

  const deployedContracts = walletData.transactions
    .filter(tx => tx.tx_type === 'smart_contract')
    .map(tx => (tx as ExtendedTransaction).smart_contract?.contract_id)
    .filter(Boolean)

  // Calculate total fees paid
  const totalFees = walletData.transactions.reduce((sum, tx) => {
    return sum + parseInt(tx.fee_rate || '0')
  }, 0)

  // Get transaction status breakdown
  const statusBreakdown = walletData.transactions.reduce((acc: Record<string, number>, tx) => {
    acc[tx.tx_status] = (acc[tx.tx_status] || 0) + 1
    return acc
  }, {})

  const context = `COMPREHENSIVE WALLET ANALYSIS FOR: ${walletData.address}

BALANCE & FINANCIAL SUMMARY:
- Current STX Balance: ${(parseInt(walletData.balance.stx.balance) / 1000000).toFixed(6)} STX
- Total Amount Sent: ${(parseInt(walletData.balance.stx.total_sent) / 1000000).toFixed(6)} STX  
- Total Amount Received: ${(parseInt(walletData.balance.stx.total_received) / 1000000).toFixed(6)} STX
- Net Balance Change: ${((parseInt(walletData.balance.stx.total_received) - parseInt(walletData.balance.stx.total_sent)) / 1000000).toFixed(6)} STX
- Total Fees Paid: ${(totalFees / 1000000).toFixed(6)} STX

TRANSACTION OVERVIEW:
- Currently Loaded: ${walletData.transactions.length} transactions (most recent)
- Total Transactions Available: ${walletData.totalTransactions || 'Unknown'} transactions in complete history
- Data Limitation: Current context only shows the ${walletData.transactions.length} most recent transactions
- Missing Transactions: ${walletData.totalTransactions ? (walletData.totalTransactions - walletData.transactions.length) : 'Many'} older transactions not shown

TRANSACTION TYPE BREAKDOWN:
${Object.entries(txTypes).map(([type, count]) => `- ${type}: ${count} transactions`).join('\n')}

TRANSACTION STATUS SUMMARY:
${Object.entries(statusBreakdown).map(([status, count]) => `- ${status}: ${count} transactions`).join('\n')}

SMART CONTRACT ACTIVITY:
- Contracts Interacted With: ${uniqueContracts.length}
${uniqueContracts.length > 0 ? uniqueContracts.slice(0, 5).map(contract => `  • ${contract}`).join('\n') : '  • No contract interactions'}

- Contracts Deployed: ${deployedContracts.length}
${deployedContracts.length > 0 ? deployedContracts.map(contract => `  • ${contract}`).join('\n') : '  • No contracts deployed'}

SENDER ADDRESSES (who sent STX to this wallet):
${uniqueSenders.length > 0 ? uniqueSenders.slice(0, 8).map((addr, i) => `${i + 1}. ${addr}`).join('\n') : 'No incoming transactions from other addresses'}

RECIPIENT ADDRESSES (who received STX from this wallet):
${uniqueReceivers.length > 0 ? uniqueReceivers.slice(0, 8).map((addr, i) => `${i + 1}. ${addr}`).join('\n') : 'No outgoing transactions to other addresses'}

DETAILED TRANSACTION HISTORY (most recent first):
${detailedTransactions.slice(0, 15)}`

  const agentInstructions = agentMode ? `

🤖 AGENT MODE - YOU CONTROL DATA FETCHING & VISUAL ANALYTICS:

CURRENT CONTEXT: You have ${walletData.transactions.length} recent transactions out of ${walletData.totalTransactions || 'many'} total transactions.

THE LOGIC: When you can't answer from current context OR need more data, choose the right mode:

**REGULAR MODE** (single request):
{"action": "use_agent", "uri": "<full_url>", "uri_data": <json_data_if_needed>}

**FLASH AGENT MODE** (recursive search through ALL transactions):
{"action": "use_agent", "uri": "<base_url_without_limit_offset>", "uri_data": <json_data_if_needed>, "recursive": true, "regex": "/pattern_to_search/"}

**PRO AGENT MODE** (recursive search + code execution on aggregated data):
{"action": "use_agent", "uri": "<base_url_without_limit_offset>", "uri_data": <json_data_if_needed>, "recursive": true, "code": "<javascript_code_to_execute>"}

IMPORTANT: Always use TESTNET base URL: https://api.testnet.hiro.so/extended/v1
NOT mainnet (api.mainnet.hiro.so) - we are working with TESTNET data only.

HOW IT WORKS: Our agent program listens for your JSON response and fetches data from ANY URL you specify - APIs, endpoints, even external sites like Google or YouTube if needed.

YOUR CONTROL: You decide what data to fetch:

**REGULAR MODE** (when you know specific offset or need single request):
- Need older transactions? Use higher offset: ?offset=100, ?offset=500
- Need specific transaction? Use limit=1&offset=500 (gets transaction #500)
- Need address details? Use different endpoint

**FLASH AGENT MODE** (when you need to search through ALL transactions):
- Use when answer requires searching entire transaction history
- Don't add limit/offset parameters - our agent adds them automatically
- Provide regex pattern to match what you're looking for
- Agent will search asynchronously through all transactions until match found

**PRO AGENT MODE** (when you need to process ALL transaction data with custom code):
- Use when you need to aggregate, analyze, or extract specific data from ALL transactions
- Don't add limit/offset parameters - our agent adds them automatically
- Provide JavaScript code to process the aggregated transaction data
- Agent will fetch ALL transactions, save to 'aggregated_transactions.json', then execute your code
- CRITICAL: Triple-check your code for syntax errors - the system will auto-retry with fixes if errors occur

FILE FORMAT (aggregated_transactions.json):
- New format: {_metadata: {address, totalTransactions, fetchedAt, batches}, data: [batch objects]}
- Legacy format: Array of batch objects directly
- Each batch: {limit: 50, offset: 0, total: 15595, results: [transactions...]}
- Each transaction: {tx_id, tx_type, sender_address, token_transfer?: {recipient_address, amount, memo}, ...}

CODE TEMPLATE FOR GRAPHS (copy this EXACTLY - pay attention to || operators):
const fs = require('fs');
const fileData = JSON.parse(fs.readFileSync('aggregated_transactions.json', 'utf8'));
const data = fileData.data || fileData;
const allTransactions = data.flatMap(batch => batch.results || []);
// Your analysis logic here to prepare graph data
const graphResult = {
  graph: "VBC", // or HBC, PG, LC, AC, DG
  x_axis_data: ["Label1", "Label2", "Label3"],
  y_axis_data: [100, 200, 150],
  title: "Chart Title",
  subtitle: "Optional subtitle",
  colors: ["#3b82f6", "#8b5cf6", "#ec4899"],
  text: "Explanation of the data and insights"
};
console.log(JSON.stringify(graphResult));

CRITICAL SYNTAX RULES:
- Always use || (double pipe) for OR operations
- Always use || (double pipe) for default values
- Never write "fileData.data fileData" - must be "fileData.data || fileData"
- Never write "batch.results []" - must be "batch.results || []"
- Never write "(acc 0)" - must be "(acc || 0)"

COMMON PATTERNS:
- Get all receivers: allTransactions.filter(tx => tx.token_transfer).map(tx => tx.token_transfer.recipient_address)
- Get unique receivers: [...new Set(receivers)]
- Count by address: receivers.reduce((acc, addr) => {acc[addr] = (acc[addr] || 0) + 1; return acc;}, {})

TESTNET API ENDPOINTS (always use these):
- Transactions: https://api.testnet.hiro.so/extended/v1/address/${walletData.address}/transactions
- Address info: https://api.testnet.hiro.so/extended/v1/address/${walletData.address}

EXAMPLES:
**Regular Mode:**
- For "transaction #500": {"action": "use_agent", "uri": "https://api.testnet.hiro.so/extended/v1/address/${walletData.address}/transactions?limit=1&offset=500", "uri_data": null}
- For "more details": {"action": "use_agent", "uri": "https://api.testnet.hiro.so/extended/v1/address/${walletData.address}", "uri_data": null}

**Flash Agent Mode:**
- For searching specific addresses: Use recursive mode with regex pattern to find transactions
- For finding specific transaction patterns: Use regex to match transaction characteristics

**Pro Agent Mode for Graphs:**
- Monthly activity chart: Use Pro Agent Mode with code to process all transactions by month
- Transaction type pie chart: Use Pro Agent Mode with code to count transaction types  
- Top recipients bar chart: Use Pro Agent Mode with code to analyze recipient addresses
- Balance trend line chart: Use Pro Agent Mode with code to calculate balance over time

**Graph Code Examples:**
For monthly activity: Process transactions by month, create VBC with months as x_axis_data
For transaction types: Count tx_type values, create PG with types as x_axis_data
For top recipients: Count recipient addresses, create HBC with top addresses as x_axis_data
For balance trends: Calculate cumulative balance changes, create LC with dates as x_axis_data

WHEN TO USE FLASH AGENT MODE:
- Questions about specific addresses that aren't in current context (like "how much did ADDRESS receive")
- Searching for transactions with specific patterns across entire history
- Questions that require scanning all transactions to find matches
- When you're 100% sure the answer won't be in a single API response

WHEN TO USE PRO AGENT MODE:
- Questions requiring analysis of ALL transactions (like "list all receiver addresses")
- Complex data aggregation, counting, or statistical analysis
- When you need to process entire transaction history with custom logic
- Questions like "total amounts sent to each address", "transaction patterns", "unique recipients"

📊 VISUAL ANALYTICS - GRAPH & DIAGRAM SYSTEM:

When users ask for graphs, diagrams, charts, or visual analytics, you can create beautiful visualizations using our graph system.

AVAILABLE GRAPH TYPES:
- **HBC** (Horizontal Bar Chart): Perfect for comparing categories, top addresses, contract usage
- **VBC** (Vertical Bar Chart): Great for time series, monthly data, transaction counts
- **PG** (Pie Chart): Ideal for showing proportions, transaction type breakdown, percentage distributions
- **LC** (Line Chart): Best for trends over time, balance changes, activity patterns
- **AC** (Area Chart): Similar to line chart but with filled area, good for cumulative data
- **DG** (Donut Chart): Like pie chart but with center space, modern look for proportions

GRAPH PROTOCOL FORMAT:
{
  "graph": "HBC|VBC|PG|LC|AC|DG",
  "x_axis_data": ["Label1", "Label2", "Label3"],
  "y_axis_data": [100, 200, 150],
  "title": "Chart Title",
  "subtitle": "Optional subtitle",
  "colors": ["#3b82f6", "#8b5cf6", "#ec4899"],
  "value_label": "Transactions", // Dynamic label: "Transactions", "Amount", "STX", "Count", etc.
  "text": "Optional explanation text to show below the graph",
  "tooltip_data": {
    "Label1": {"value": 100, "info": "Additional context for Label1"},
    "Label2": {"value": 200, "info": "Additional context for Label2"},
    "Label3": {"value": 150, "info": "Additional context for Label3"}
  }
}

GRAPH PROTOCOL RULES:
1. **x_axis_data**: Array of labels (strings) - categories, dates, addresses, etc.
2. **y_axis_data**: Array of numbers - values corresponding to each x_axis label
3. **title**: Clear, descriptive title for the graph
4. **subtitle**: Optional additional context
5. **colors**: Optional array of hex colors. If not provided, uses default gradient colors
6. **value_label**: Dynamic label for tooltip values - "Transactions", "STX", "Amount", "Count", etc.
7. **text**: Optional text explanation to accompany the graph

COLOR SUGGESTIONS:
- Blue theme: ["#3b82f6", "#1d4ed8", "#60a5fa"]
- Purple theme: ["#8b5cf6", "#7c3aed", "#a78bfa"]
- Multi-color: ["#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b"]
- Stacks theme: ["#5546ff", "#00d4ff", "#ff6b35"]

WHEN TO USE GRAPHS:
- User asks for "chart", "graph", "diagram", "visual", "show me"
- Questions about trends, comparisons, distributions, patterns
- Time-based analysis (monthly, daily, etc.)
- Top/bottom lists (most active addresses, highest amounts)
- Breakdown analysis (transaction types, contract usage)

CRITICAL GRAPH WORKFLOW - FOLLOW THIS EXACTLY:

**STEP 1 - DATA COLLECTION (ALWAYS FIRST):**
When user asks for graphs/charts/diagrams, you MUST ALWAYS use Pro Agent Mode FIRST to collect comprehensive data:

{"action": "use_agent", "uri": "https://api.testnet.hiro.so/extended/v1/address/WALLET_ADDRESS/transactions", "uri_data": null, "recursive": true, "code": "JAVASCRIPT_CODE_TO_PROCESS_DATA_AND_PREPARE_GRAPH_DATA"}

**STEP 2 - GRAPH GENERATION (ONLY AFTER STEP 1):**
ONLY after Pro Agent Mode completes and you have the processed data, THEN respond with graph protocol:

{
  "graph": "VBC|HBC|PG|LC|AC|DG",
  "x_axis_data": ["Label1", "Label2"],
  "y_axis_data": [100, 200],
  "title": "Chart Title",
  "text": "Explanation text"
}

**NEVER SKIP STEP 1 - ALWAYS USE PRO AGENT MODE FIRST FOR GRAPHS**

**IMPORTANT: DO NOT RESPOND WITH GRAPH PROTOCOL IMMEDIATELY**
When user asks for graphs/charts/diagrams, you MUST respond with Pro Agent Mode JSON ONLY. The system will then execute your code and call you again with the results, at which point you can generate the graph protocol.

Example Complete Workflow:
User: "Show me October activities with a chart"

Your FIRST Response (Pro Agent Mode ONLY):
Use Pro Agent Mode with recursive code execution to process all transaction data and generate graph result object. The code should filter transactions by date range, aggregate the data, and create a complete graph object with all required fields including graph type, axis data, title, colors, and explanatory text.

GRAPH EXAMPLES:

**Monthly Transaction Count (VBC):**
{
  "graph": "VBC",
  "x_axis_data": ["Jan", "Feb", "Mar", "Apr", "May"],
  "y_axis_data": [45, 67, 23, 89, 34],
  "title": "Monthly Transaction Activity",
  "value_label": "Transactions",
  "colors": ["#3b82f6", "#1d4ed8", "#60a5fa", "#93c5fd", "#dbeafe"],
  "text": "Peak activity was in April with 89 transactions. Overall trend shows variable monthly usage."
}

**Transaction Type Breakdown (PG):**
{
  "graph": "PG",
  "x_axis_data": ["Token Transfer", "Contract Call", "Smart Contract"],
  "y_axis_data": [150, 45, 5],
  "title": "Transaction Type Distribution",
  "value_label": "Transactions",
  "colors": ["#10b981", "#f59e0b", "#ef4444"],
  "text": "Token transfers dominate at 75% of all transactions, indicating active STX movement.",
  "tooltip_data": {
    "Token Transfer": {"value": 150, "info": "Standard STX transfers between addresses", "additionalMetrics": {"avg_amount": "1.2M STX", "success_rate": "98.7%"}},
    "Contract Call": {"value": 45, "info": "Smart contract function calls", "additionalMetrics": {"gas_used": "45K", "success_rate": "95.6%"}},
    "Smart Contract": {"value": 5, "info": "Contract deployments", "additionalMetrics": {"contracts_deployed": 5, "success_rate": "100%"}}
  }
}

**Top Recipients (HBC):**
{
  "graph": "HBC",
  "x_axis_data": ["ST1ABC...DEF", "ST2GHI...JKL", "ST3MNO...PQR"],
  "y_axis_data": [25, 18, 12],
  "title": "Top STX Recipients",
  "subtitle": "By transaction count",
  "colors": ["#8b5cf6", "#a78bfa", "#c4b5fd"],
  "text": "ST1ABC...DEF received the most transactions (25), suggesting it might be an exchange or service address."
}

**Balance Trend (LC):**
{
  "graph": "LC",
  "x_axis_data": ["Week 1", "Week 2", "Week 3", "Week 4"],
  "y_axis_data": [1000, 1200, 950, 1100],
  "title": "STX Balance Over Time",
  "value_label": "STX",
  "colors": ["#06b6d4", "#0891b2"],
  "text": "Balance shows volatility with a dip in week 3, possibly due to a large transaction or contract interaction."
}

IMPORTANT GRAPH RULES:
- Arrays must have same length: x_axis_data.length === y_axis_data.length
- Use meaningful, short labels for x_axis_data
- Round numbers appropriately for y_axis_data
- Choose appropriate graph type for the data
- Always include descriptive title
- Use "text" field to provide insights about the data
- For addresses, truncate to first 6 and last 3 characters: "ST1ABC...XYZ"

VALUE LABEL GUIDELINES:
- For transaction counts: "Transactions"
- For STX amounts: "STX" 
- For USD values: "USD"
- For percentages: "Percentage"
- For generic counts: "Count"
- For time periods: "Days", "Hours", "Minutes"
- For addresses: "Addresses"
- For contracts: "Contracts"

**CRITICAL WORKFLOW REMINDER:**
1. User asks for graph/chart/diagram
2. You respond with Pro Agent Mode JSON (with graph data in the result)
3. System executes your code and gets the graph data
4. System automatically returns the graph protocol to display the chart
5. User sees beautiful animated graph with your analysis

**DO NOT RESPOND WITH GRAPH PROTOCOL DIRECTLY - ALWAYS USE PRO AGENT MODE FIRST**

REMEMBER: Return ONLY the JSON, no other text. The decision is yours - use our agent to get better data and serve users better.` : ''

  const prompt = agentMode
    ? `WALLET: ${walletData.address}
CURRENT CONTEXT: ${walletData.transactions.length} recent transactions (out of ${walletData.totalTransactions || 'many'} total)

${context}

USER QUESTION: "${question}"

${agentInstructions}

ANALYZE: Can you answer "${question}" with the current ${walletData.transactions.length} transactions? If not, or if you need more data, return the JSON format to fetch what you need.`
    : `Based on this Stacks wallet data:
${context}

Question: ${question}

Give straight forward answer`

  const authKey = apiKey || process.env.HUGGINGFACE_API_KEY
  const model = modelName || 'openai/gpt-oss-120b'

  if (!authKey) {
    return 'Please configure your Hugging Face API key in settings to enable AI chat.'
  }

  try {
    const systemContent = agentMode
      ? 'You are in AGENT MODE. When you need more data to answer properly, respond with ONLY the JSON format - no other text. When you can answer with current data, be direct and concise - if asked for specific info, provide only that.'
      : 'You are a helpful assistant that analyzes Stacks blockchain wallet data. Be direct and concise - if the user asks for specific information (like "receiver address" etc), provide ONLY that information. Only give detailed explanations when explicitly asked.'

    console.log('=== AI REQUEST DEBUG ===')
    console.log('Agent Mode:', agentMode)
    console.log('Question:', question)
    console.log('System prompt:', systemContent)
    console.log('User prompt (first 500 chars):', prompt.substring(0, 500))
    console.log('========================')

    // Build conversation messages with history
    const messages = [
      {
        role: 'system' as const,
        content: systemContent
      },
      ...conversationHistory,
      {
        role: 'user' as const,
        content: prompt
      }
    ]

    const response = await queryHuggingFace({
      messages: messages,
      model: model
    }, authKey)

    const content = response.choices?.[0]?.message?.content

    console.log('=== AI RESPONSE DEBUG ===')
    console.log('Raw AI response:', content)
    console.log('Response length:', content?.length)
    console.log('Contains "action":', content?.includes('"action"'))
    console.log('Contains "use_agent":', content?.includes('use_agent'))
    console.log('=========================')

    if (!content) {
      return 'I apologize, but I cannot answer that question right now.'
    }

    // Clean up excessive markdown formatting and table syntax for chat
    const cleanContent = content
      .replace(/\*\*\*+/g, '**') // Remove triple+ asterisks
      .replace(/---+/g, '') // Remove horizontal rules
      .replace(/#{4,}/g, '###') // Limit header levels
      .replace(/\|+/g, '') // Remove table separators
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()

    // Check if the response is a graph protocol
    if (cleanContent.includes('"graph"') && cleanContent.includes('"x_axis_data"') && cleanContent.includes('"y_axis_data"')) {
      try {
        // Validate that it's proper JSON
        const graphData = JSON.parse(cleanContent)
        if (graphData.graph && graphData.x_axis_data && graphData.y_axis_data && graphData.title) {
          console.log('Graph protocol detected:', graphData)
          return cleanContent // Return the JSON as-is for the frontend to parse
        }
      } catch (error) {
        console.log('Graph protocol parsing failed:', error)
        // Continue with normal processing
      }
    }

    // If agent mode is on and the AI says it can't answer, try to provide a helpful response
    if (agentMode && (cleanContent.includes("cannot answer") || cleanContent.includes("apologize"))) {
      // Check if this is a question about recipients/senders that we might be able to answer
      if (question.toLowerCase().includes('first') && question.toLowerCase().includes('receive')) {
        // Find the chronologically first recipient from current transactions
        const outgoingTransactions = walletData.transactions
          .filter(tx => tx.tx_type === 'token_transfer' && tx.sender_address === walletData.address)
          .sort((a, b) => a.burn_block_time - b.burn_block_time)

        if (outgoingTransactions.length > 0) {
          const firstTx = outgoingTransactions[0] as ExtendedTransaction
          const firstRecipient = firstTx.token_transfer?.recipient_address
          if (firstRecipient) {
            const date = new Date(firstTx.burn_block_time * 1000).toLocaleDateString()
            return `Based on the available transaction history, the first address that received STX from this wallet was: **${firstRecipient}** on ${date}. This was transaction ${firstTx.tx_id}.`
          }
        }

        return `I can see ${uniqueReceivers.length} addresses that received STX from this wallet in the current transaction history: ${uniqueReceivers.slice(0, 3).join(', ')}${uniqueReceivers.length > 3 ? '...' : ''}. However, to find the very first recipient, I would need to access older transaction history.`
      }
    }

    return cleanContent
  } catch (error) {
    console.error('AI Question Error:', error)
    return 'AI assistant temporarily unavailable. Please try again later.'
  }
}

// Simple in-memory cache for API responses
const apiCache = new Map<string, unknown>()

// Global preloading state to sync background and Pro Agent requests
const preloadingState = new Map<string, Promise<{ totalBatches: number, totalTransactions: number, cached: boolean }>>()

// Background transaction data preloading for Pro Agent Mode
export async function preloadTransactionData(walletData: WalletData): Promise<{ totalBatches: number, totalTransactions: number, cached: boolean }> {
  const address = walletData.address

  // Check if preloading is already in progress for this address
  if (preloadingState.has(address)) {
    console.log('🔄 Preloading already in progress for:', address)
    return await preloadingState.get(address)!
  }

  console.log('🚀 Starting background transaction preload for:', address)

  // Create and store the preloading promise
  const preloadPromise = (async () => {
    const baseUri = `https://api.testnet.hiro.so/extended/v1/address/${walletData.address}/transactions`
    const totalTransactions = walletData.totalTransactions || 1000

    const fs = await import('fs')
    const aggregatedFilePath = 'aggregated_transactions.json'

    // Check if we already have complete data for this address
    if (fs.existsSync(aggregatedFilePath)) {
      try {
        const existingDataRaw = fs.readFileSync(aggregatedFilePath, 'utf8')
        const existingData = JSON.parse(existingDataRaw)

        // Check if data has metadata (new format) or is legacy format
        if (existingData._metadata && existingData.data) {
          // New format with metadata
          const metadata = existingData._metadata
          if (metadata.address === walletData.address && metadata.totalTransactions === totalTransactions) {
            console.log(`✅ Complete cached data already exists for ${walletData.address}`)
            return {
              totalBatches: metadata.batches,
              totalTransactions: metadata.totalTransactions,
              cached: true
            }
          }
        }
      } catch (error) {
        console.log('⚠️ Error reading existing data, will fetch fresh:', error)
      }
    }

    // Fetch all transactions in background
    console.log('📡 Background fetching ALL transactions...')

    const limit = 50
    const maxConcurrent = 5
    let offset = 0
    const allTransactionData: unknown[] = []

    // Fetch all transactions in batches
    while (offset < totalTransactions) {
      const batch = []
      for (let i = 0; i < maxConcurrent && offset + (i * limit) < totalTransactions; i++) {
        const currentOffset = offset + (i * limit)
        const url = `${baseUri}?limit=${limit}&offset=${currentOffset}`

        batch.push(
          fetch(url)
            .then(response => response.json())
            .then(data => data)
            .catch(error => {
              console.error(`Error fetching offset ${currentOffset}:`, error)
              return null
            })
        )
      }

      const results = await Promise.all(batch)
      allTransactionData.push(...results.filter(Boolean))

      offset += maxConcurrent * limit

      // Add small delay to avoid overwhelming the API
      if (offset < totalTransactions) {
        await new Promise(resolve => setTimeout(resolve, 200)) // Increased delay to avoid rate limits
      }

      // Log progress
      const progress = Math.min(100, (offset / totalTransactions) * 100)
      console.log(`📊 Background preload progress: ${progress.toFixed(1)}% (${offset}/${totalTransactions})`)
    }

    console.log(`✅ Background preload complete: ${allTransactionData.length} batches`)

    // Save aggregated data with metadata
    const dataWithMetadata = {
      _metadata: {
        address: walletData.address,
        totalTransactions: totalTransactions,
        fetchedAt: new Date().toISOString(),
        batches: allTransactionData.length
      },
      data: allTransactionData
    }

    // Clean the file first
    if (fs.existsSync(aggregatedFilePath)) {
      fs.unlinkSync(aggregatedFilePath)
    }

    // Write aggregated data
    fs.writeFileSync(aggregatedFilePath, JSON.stringify(dataWithMetadata, null, 2))
    console.log(`💾 Background preload saved to ${aggregatedFilePath}`)

    return {
      totalBatches: allTransactionData.length,
      totalTransactions: totalTransactions,
      cached: false
    }
  })()

  // Store the promise in global state
  preloadingState.set(address, preloadPromise)

  try {
    const result = await preloadPromise
    return result
  } finally {
    // Clean up the promise from global state when done
    preloadingState.delete(address)
  }
}

// Pro Agent Mode - Fetch all transactions, aggregate to file, execute code with error recovery
async function executeProAgentMode(baseUri: string, code: string, totalTransactions: number, maxRetries: number = 10, currentAttempt: number = 1): Promise<unknown> {
  console.log('🔥 Starting Pro Agent Mode...')

  const fs = await import('fs')
  const aggregatedFilePath = 'aggregated_transactions.json'

  // Extract address from URI for cache validation
  const addressMatch = baseUri.match(/address\/([A-Z0-9]+)\//)
  const currentAddress = addressMatch ? addressMatch[1] : null

  // Check if background preloading is in progress for this address
  if (currentAddress && preloadingState.has(currentAddress)) {
    console.log('⏳ Background preloading in progress, waiting for completion...')
    try {
      await preloadingState.get(currentAddress)
      console.log('✅ Background preloading completed, using cached data')

      // After background preload completes, we should have the data cached
      // Skip the manual fetching and go straight to code execution
      let totalBatches = 0
      try {
        const existingDataRaw = fs.readFileSync(aggregatedFilePath, 'utf8')
        const existingData = JSON.parse(existingDataRaw)

        if (existingData._metadata && existingData.data) {
          totalBatches = existingData._metadata.batches
        } else if (Array.isArray(existingData)) {
          totalBatches = existingData.length
        }

        console.log('🚀 Using background preloaded data, skipping fetch')

        // Execute the provided code directly
        console.log('⚡ Executing user code...')
        const { exec } = await import('child_process')

        const scriptPath = 'temp_analysis_script.js'
        fs.writeFileSync(scriptPath, code)

        return new Promise((resolve) => {
          exec(`node ${scriptPath}`, (error: Error | null, stdout: string, stderr: string) => {
            if (fs.existsSync(scriptPath)) {
              fs.unlinkSync(scriptPath)
            }

            if (error) {
              console.error(`Code execution error (attempt ${currentAttempt}/${maxRetries}):`, error)

              if (currentAttempt < maxRetries) {
                console.log('🔄 Attempting to fix code with AI...')
                resolve({
                  _proAgent: {
                    needsCodeFix: true,
                    error: true,
                    errorMessage: error.message,
                    stderr: stderr,
                    originalCode: code,
                    attempt: currentAttempt,
                    maxRetries: maxRetries,
                    totalBatches: totalBatches,
                    fileName: aggregatedFilePath,
                    dataStructure: {
                      format: "Array of batch objects",
                      batchStructure: "{ limit: number, offset: number, total: number, results: Transaction[] }",
                      transactionStructure: "{ tx_id, tx_type, sender_address, token_transfer?: { recipient_address, amount, memo }, ... }",
                      example: "data[0].results[0].token_transfer?.recipient_address"
                    }
                  }
                })
              } else {
                resolve({
                  _proAgent: {
                    error: true,
                    errorMessage: `Max retries (${maxRetries}) reached. Final error: ${error.message}`,
                    stderr: stderr,
                    totalBatches: totalBatches,
                    fileName: aggregatedFilePath
                  }
                })
              }
            } else {
              console.log('✅ Code executed successfully')
              let result
              try {
                result = JSON.parse(stdout)
              } catch {
                result = stdout
              }

              resolve({
                _proAgent: {
                  success: true,
                  result: result,
                  totalBatches: totalBatches,
                  fileName: aggregatedFilePath
                }
              })
            }
          })
        })

      } catch (fileError) {
        console.log('⚠️ Could not read cached data after background preload:', fileError)
      }
    } catch (error) {
      console.log('⚠️ Background preloading failed, will fetch fresh data:', error)
    }
  }

  // Check if we already have complete data for this address
  let useExistingData = false

  // If background preloading was in progress, we should now have cached data
  if (fs.existsSync(aggregatedFilePath) && currentAddress) {
    try {
      const existingDataRaw = fs.readFileSync(aggregatedFilePath, 'utf8')
      const existingData = JSON.parse(existingDataRaw)

      // Check if data has metadata (new format) or is legacy format
      if (existingData._metadata && existingData.data) {
        // New format with metadata
        const metadata = existingData._metadata
        if (metadata.address === currentAddress && metadata.totalTransactions === totalTransactions) {
          console.log(`✅ Found complete cached data for address ${currentAddress}`)
          console.log(`📊 Cached: ${metadata.batches} batches, ${metadata.totalTransactions} transactions`)
          console.log(`🕒 Cached at: ${metadata.fetchedAt}`)
          useExistingData = true
        } else {
          console.log(`⚠️ Cached data is for different address or transaction count`)
          console.log(`   Cached: ${metadata.address} (${metadata.totalTransactions} txs)`)
          console.log(`   Current: ${currentAddress} (${totalTransactions} txs)`)
        }
      } else if (Array.isArray(existingData) && existingData.length > 0) {
        // Legacy format - check if data is complete
        const firstBatch = existingData[0]
        const lastBatch = existingData[existingData.length - 1]

        if (firstBatch?.total && lastBatch?.offset !== undefined) {
          const totalInFile = firstBatch.total
          const lastOffset = lastBatch.offset
          const lastBatchSize = lastBatch.results?.length || 0
          const totalFetched = lastOffset + lastBatchSize

          // Check if we have complete data for the same address
          if (totalInFile === totalTransactions && totalFetched >= totalTransactions) {
            console.log(`✅ Found complete cached data (legacy format)`)
            console.log(`📊 Cached: ${totalFetched}/${totalTransactions} transactions`)
            useExistingData = true
          } else {
            console.log(`⚠️ Cached data incomplete: ${totalFetched}/${totalTransactions} transactions`)
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Error reading existing data, will re-fetch:', error)
    }
  }

  let totalBatches = 0

  // If we don't have complete data, fetch it (but only if background preload isn't handling it)
  if (!useExistingData) {
    // Double-check if background preload is still running
    if (currentAddress && preloadingState.has(currentAddress)) {
      console.log('🛑 Background preload still in progress, aborting Pro Agent fetch to avoid conflicts')
      return {
        _proAgent: {
          error: true,
          errorMessage: 'Background preload in progress, please wait and try again',
          totalBatches: 0,
          fileName: aggregatedFilePath
        }
      }
    }

    console.log('🔄 Fetching ALL transactions...')

    const limit = 50
    const maxConcurrent = 5
    let offset = 0
    const allTransactionData: unknown[] = []

    // Fetch all transactions in batches
    while (offset < totalTransactions) {
      const batch = []
      for (let i = 0; i < maxConcurrent && offset + (i * limit) < totalTransactions; i++) {
        const currentOffset = offset + (i * limit)
        const url = `${baseUri}?limit=${limit}&offset=${currentOffset}`

        console.log(`📡 Fetching batch: ${url}`)

        batch.push(
          fetch(url)
            .then(response => response.json())
            .then(data => data)
            .catch(error => {
              console.error(`Error fetching offset ${currentOffset}:`, error)
              return null
            })
        )
      }

      const results = await Promise.all(batch)
      allTransactionData.push(...results.filter(Boolean))

      offset += maxConcurrent * limit

      // Add small delay to avoid overwhelming the API
      if (offset < totalTransactions) {
        await new Promise(resolve => setTimeout(resolve, 200)) // Increased delay to avoid rate limits
      }
    }

    console.log(`📊 Aggregated ${allTransactionData.length} transaction batches`)
    totalBatches = allTransactionData.length

    // Clean the file first
    if (fs.existsSync(aggregatedFilePath)) {
      fs.unlinkSync(aggregatedFilePath)
    }

    // Write aggregated data with metadata
    const dataWithMetadata = {
      _metadata: {
        address: currentAddress,
        totalTransactions: totalTransactions,
        fetchedAt: new Date().toISOString(),
        batches: allTransactionData.length
      },
      data: allTransactionData
    }
    fs.writeFileSync(aggregatedFilePath, JSON.stringify(dataWithMetadata, null, 2))
    console.log(`💾 Saved aggregated data to ${aggregatedFilePath}`)
  } else {
    console.log(`🚀 Using cached data from ${aggregatedFilePath}`)
    // Count batches from existing file
    try {
      const existingDataRaw = fs.readFileSync(aggregatedFilePath, 'utf8')
      const existingData = JSON.parse(existingDataRaw)

      if (existingData._metadata && existingData.data) {
        // New format with metadata
        totalBatches = existingData._metadata.batches
      } else if (Array.isArray(existingData)) {
        // Legacy format
        totalBatches = existingData.length
      } else {
        totalBatches = 0
      }
    } catch {
      totalBatches = 0
    }
  }

  try {

    // Execute the provided code (works for both cached and fresh data)
    console.log('⚡ Executing user code...')
    const { exec } = await import('child_process')

    // Create a temporary script file
    const scriptPath = 'temp_analysis_script.js'
    fs.writeFileSync(scriptPath, code)

    return new Promise((resolve) => {
      exec(`node ${scriptPath}`, (error: Error | null, stdout: string, stderr: string) => {
        // Clean up temp script
        if (fs.existsSync(scriptPath)) {
          fs.unlinkSync(scriptPath)
        }

        if (error) {
          console.error(`Code execution error (attempt ${currentAttempt}/${maxRetries}):`, error)

          // If we have retries left, ask AI to fix the code
          if (currentAttempt < maxRetries) {
            console.log('🔄 Attempting to fix code with AI...')
            resolve({
              _proAgent: {
                needsCodeFix: true,
                error: true,
                errorMessage: error.message,
                stderr: stderr,
                originalCode: code,
                attempt: currentAttempt,
                maxRetries: maxRetries,
                totalBatches: totalBatches,
                fileName: aggregatedFilePath,
                dataStructure: {
                  format: "Array of batch objects",
                  batchStructure: "{ limit: number, offset: number, total: number, results: Transaction[] }",
                  transactionStructure: "{ tx_id, tx_type, sender_address, token_transfer?: { recipient_address, amount, memo }, ... }",
                  example: "data[0].results[0].token_transfer?.recipient_address"
                }
              }
            })
          } else {
            // Max retries reached
            resolve({
              _proAgent: {
                error: true,
                errorMessage: `Max retries (${maxRetries}) reached. Final error: ${error.message}`,
                stderr: stderr,
                totalBatches: totalBatches,
                fileName: aggregatedFilePath
              }
            })
          }
        } else {
          console.log('✅ Code executed successfully')
          let result
          try {
            result = JSON.parse(stdout)
          } catch {
            result = stdout
          }

          resolve({
            _proAgent: {
              success: true,
              result: result,
              totalBatches: totalBatches,
              fileName: aggregatedFilePath
            }
          })
        }
      })
    })

  } catch (error) {
    console.error('Pro Agent Mode error:', error)
    return {
      _proAgent: {
        error: true,
        errorMessage: (error as Error).message,
        totalBatches: totalBatches,
        fileName: aggregatedFilePath
      }
    }
  }
}

// Flash Agent Mode - Recursive search through all transactions
async function executeFlashAgentSearch(baseUri: string, regexPattern: string, totalTransactions: number): Promise<unknown> {
  console.log('🔍 Starting Flash Agent recursive search...')

  // Parse the regex pattern (remove the /.../ wrapper if present)
  const cleanPattern = regexPattern.replace(/^\/|\/$/g, '')
  const regex = new RegExp(cleanPattern, 'i') // Case insensitive

  const limit = 50 // Fetch 50 transactions per request
  const maxConcurrent = 5 // Maximum concurrent requests
  let offset = 0
  let matchFound = false
  let matchedData: unknown = null

  // Create batches of requests
  const createBatch = (startOffset: number, batchSize: number) => {
    const promises = []
    for (let i = 0; i < batchSize && startOffset + (i * limit) < totalTransactions; i++) {
      const currentOffset = startOffset + (i * limit)
      const url = `${baseUri}?limit=${limit}&offset=${currentOffset}`

      console.log(`📡 Fetching batch: ${url}`)

      promises.push(
        fetch(url)
          .then(response => response.json())
          .then(data => ({ data, offset: currentOffset }))
          .catch(error => {
            console.error(`Error fetching offset ${currentOffset}:`, error)
            return null
          })
      )
    }
    return promises
  }

  // Process batches until match found or all transactions searched
  while (offset < totalTransactions && !matchFound) {
    const batch = createBatch(offset, maxConcurrent)
    const results = await Promise.all(batch)

    // Check each result for matches
    for (const result of results) {
      if (!result || matchFound) continue

      const { data, offset: currentOffset } = result
      const jsonString = JSON.stringify(data)

      console.log(`🔍 Searching offset ${currentOffset}, data length: ${jsonString.length}`)

      if (regex.test(jsonString)) {
        console.log(`✅ MATCH FOUND at offset ${currentOffset}!`)
        matchFound = true
        matchedData = {
          ...data,
          _flashAgent: {
            matchOffset: currentOffset,
            pattern: regexPattern,
            totalSearched: currentOffset + limit
          }
        }
        break
      }
    }

    offset += maxConcurrent * limit

    // Add small delay to avoid overwhelming the API
    if (!matchFound && offset < totalTransactions) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  if (matchFound) {
    console.log('🎉 Flash Agent search completed successfully!')
    return matchedData
  } else {
    console.log('❌ Flash Agent search completed - no matches found')
    return {
      _flashAgent: {
        searchCompleted: true,
        totalSearched: Math.min(offset, totalTransactions),
        pattern: regexPattern,
        noMatchFound: true
      }
    }
  }
}

// Recursive Pro Agent Mode - handles code fixes
async function executeProAgentWithRetry(agentAction: { uri: string, code: string, recursive: boolean }, originalQuestion: string, walletData: WalletData, apiKey?: string, modelName?: string, conversationHistory: ConversationMessage[] = []): Promise<unknown> {
  let currentCode = agentAction.code
  let attempt = 1
  const maxRetries = 10

  while (attempt <= maxRetries) {
    console.log(`🔥 Pro Agent attempt ${attempt}/${maxRetries}`)

    const result = await executeProAgentMode(agentAction.uri, currentCode, walletData.totalTransactions || 1000, maxRetries, attempt)
    const proResult = result as ProAgentResponse

    // If successful, return result
    if (proResult._proAgent?.success) {
      return result
    }

    // If needs code fix and we have retries left
    if (proResult._proAgent?.needsCodeFix && attempt < maxRetries) {
      console.log('🤖 Asking AI to fix the code...')

      // Create error context for AI to fix the code
      const errorContext = `URGENT: Pro Agent Mode code execution failed. You need to fix the JavaScript code.

ORIGINAL QUESTION: "${originalQuestion}"
ATTEMPT: ${attempt}/${maxRetries}

ERROR DETAILS:
- Error Message: ${proResult._proAgent.errorMessage}
- Stderr: ${proResult._proAgent.stderr}

ORIGINAL CODE THAT FAILED:
\`\`\`javascript
${proResult._proAgent.originalCode}
\`\`\`

DATA STRUCTURE (aggregated_transactions.json):
- Format: ${proResult._proAgent.dataStructure?.format || 'Array of batch objects'}
- Batch Structure: ${proResult._proAgent.dataStructure?.batchStructure || '{ limit, offset, total, results: Transaction[] }'}
- Transaction Structure: ${proResult._proAgent.dataStructure?.transactionStructure || '{ tx_id, tx_type, token_transfer?: { recipient_address, amount } }'}
- Example Access: ${proResult._proAgent.dataStructure?.example || 'data[0].results[0].token_transfer?.recipient_address'}

REQUIREMENTS:
1. Fix the JavaScript code to work with the exact data structure above
2. Use proper error handling and null checks
3. CRITICAL SYNTAX RULES:
   - Use || (double pipe) for OR operations, never single words
   - Write "fileData.data || fileData" NOT "fileData.data fileData"
   - Write "batch.results || []" NOT "batch.results []"
   - Write "(acc || 0)" NOT "(acc 0)"
   - Write "Number(amount) || 0" NOT "Number(amount) 0"
4. Output result using: console.log(JSON.stringify(yourResult))
5. Test your logic mentally before responding

RESPOND WITH ONLY THE CORRECTED JAVASCRIPT CODE - NO EXPLANATIONS, NO MARKDOWN BLOCKS, JUST THE RAW CODE.`

      try {
        const authKey = apiKey || process.env.HUGGINGFACE_API_KEY
        const model = modelName || 'openai/gpt-oss-120b'

        if (!authKey) {
          throw new Error('No API key available')
        }

        const fixMessages = [
          {
            role: 'system' as const,
            content: 'You are a JavaScript expert. Fix the provided code to work with the given data structure. Respond with ONLY the corrected JavaScript code, no explanations or markdown.'
          },
          ...conversationHistory,
          {
            role: 'user' as const,
            content: errorContext
          }
        ]

        const fixResponse = await queryHuggingFace({
          messages: fixMessages,
          model: model
        }, authKey)

        const fixedCode = fixResponse.choices?.[0]?.message?.content?.trim()

        if (fixedCode) {
          console.log('✅ AI provided fixed code:', fixedCode.substring(0, 100) + '...')
          currentCode = fixedCode
          attempt++
        } else {
          throw new Error('AI did not provide fixed code')
        }

      } catch (fixError) {
        console.error('Failed to get code fix from AI:', fixError)
        return {
          _proAgent: {
            error: true,
            errorMessage: `Failed to fix code automatically: ${fixError}`,
            totalBatches: proResult._proAgent.totalBatches,
            fileName: proResult._proAgent.fileName
          }
        }
      }
    } else {
      // No more retries or not fixable
      return result
    }
  }

  return {
    _proAgent: {
      error: true,
      errorMessage: 'Max retries reached without successful execution',
      totalBatches: 0,
      fileName: 'aggregated_transactions.json'
    }
  }
}

// Agent Mode handler - executes API calls requested by AI
export async function executeAgentAction(agentResponse: string, originalQuestion: string, walletData: WalletData, apiKey?: string, modelName?: string, conversationHistory: ConversationMessage[] = []): Promise<string> {
  try {
    console.log('Raw agent response:', agentResponse)

    // Since the AI is returning valid JSON, try direct parsing first
    let agentAction
    try {
      agentAction = JSON.parse(agentResponse.trim())
      console.log('Direct JSON parse successful:', agentAction)
    } catch (directParseError) {
      console.log('Direct parse failed, trying cleanup...', directParseError)

      // Fallback: try to extract and clean JSON
      let jsonStr = agentResponse.trim()

      // Find JSON object that contains "action"
      const startIndex = jsonStr.indexOf('{"action"')
      if (startIndex !== -1) {
        // Find the matching closing brace
        let braceCount = 0
        let endIndex = startIndex
        for (let i = startIndex; i < jsonStr.length; i++) {
          if (jsonStr[i] === '{') braceCount++
          if (jsonStr[i] === '}') braceCount--
          if (braceCount === 0) {
            endIndex = i
            break
          }
        }
        jsonStr = jsonStr.substring(startIndex, endIndex + 1)
      }

      console.log('Extracted JSON string:', jsonStr)
      agentAction = JSON.parse(jsonStr)
    }

    if (agentAction.action !== 'use_agent' || !agentAction.uri) {
      throw new Error('Invalid agent response format')
    }

    let apiData: unknown

    // Check if this is Flash Agent Mode (recursive search) or Pro Agent Mode (recursive + code)
    if (agentAction.recursive && agentAction.code) {
      console.log('🔥 PRO AGENT MODE ACTIVATED WITH AUTO-RETRY')
      console.log('Base URI:', agentAction.uri)
      console.log('Code to execute:', agentAction.code)

      apiData = await executeProAgentWithRetry(agentAction, originalQuestion, walletData, apiKey, modelName, conversationHistory)
    } else if (agentAction.recursive && agentAction.regex) {
      console.log('🚀 FLASH AGENT MODE ACTIVATED')
      console.log('Base URI:', agentAction.uri)
      console.log('Search Pattern:', agentAction.regex)

      apiData = await executeFlashAgentSearch(agentAction.uri, agentAction.regex, walletData.totalTransactions || 1000)
    } else {
      // Regular mode - single API call
      const cacheKey = `${agentAction.uri}${agentAction.uri_data ? JSON.stringify(agentAction.uri_data) : ''}`

      // Check cache first
      apiData = apiCache.get(cacheKey)

      if (!apiData) {
        // Execute the API call
        const response = await fetch(agentAction.uri, {
          method: agentAction.uri_data ? 'POST' : 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          body: agentAction.uri_data ? JSON.stringify(agentAction.uri_data) : undefined
        })

        if (!response.ok) {
          throw new Error(`API call failed: ${response.status} ${response.statusText}`)
        }

        apiData = await response.json()

        // Cache the response (with 5 minute expiry)
        apiCache.set(cacheKey, apiData)
        setTimeout(() => apiCache.delete(cacheKey), 5 * 60 * 1000)
      }
    }

    console.log('API Data fetched successfully:', apiData)

    // Create enhanced context with the new data
    const isProAgent = agentAction.recursive && (apiData as ProAgentResponse)?._proAgent
    const proAgentInfo = isProAgent ? (apiData as ProAgentResponse)._proAgent : null
    const isFlashAgent = agentAction.recursive && (apiData as FlashAgentResponse)?._flashAgent && !isProAgent
    const flashAgentInfo = isFlashAgent ? (apiData as FlashAgentResponse)._flashAgent : null

    const enhancedContext = `You are analyzing Stacks blockchain wallet data. Here is the information:

WALLET ADDRESS: ${walletData.address}

ORIGINAL WALLET SUMMARY:
- Current Balance: ${(parseInt(walletData.balance.stx.balance) / 1000000).toFixed(6)} STX
- Total Sent: ${(parseInt(walletData.balance.stx.total_sent) / 1000000).toFixed(6)} STX
- Total Received: ${(parseInt(walletData.balance.stx.total_received) / 1000000).toFixed(6)} STX
- Transaction Count: ${walletData.transactions.length}

${isProAgent && proAgentInfo ? `🔥 PRO AGENT EXECUTION RESULTS:
- Total Transaction Batches Processed: ${proAgentInfo.totalBatches}
- Aggregated Data File: ${proAgentInfo.fileName}
- Code Execution: ${proAgentInfo.success ? 'SUCCESS' : proAgentInfo.needsCodeFix ? 'AUTO-FIXING' : 'ERROR'}
${proAgentInfo.error && !proAgentInfo.needsCodeFix ? `- Final Error: ${proAgentInfo.errorMessage}` : ''}
${proAgentInfo.result ? `- Result: ${JSON.stringify(proAgentInfo.result)}` : ''}
${proAgentInfo.needsCodeFix ? `- Status: Code error detected, AI is fixing automatically (attempt ${proAgentInfo.attempt}/${proAgentInfo.maxRetries})` : ''}

` : isFlashAgent && flashAgentInfo ? `🚀 FLASH AGENT SEARCH RESULTS:
- Search Pattern: ${flashAgentInfo.pattern}
- Transactions Searched: ${flashAgentInfo.totalSearched}
- Match Found: ${flashAgentInfo.noMatchFound ? 'NO' : 'YES' + (flashAgentInfo.matchOffset !== undefined ? ` at offset ${flashAgentInfo.matchOffset}` : '')}

` : ''}ADDITIONAL FETCHED DATA FROM ${agentAction.uri}:
${typeof apiData === 'object' ? JSON.stringify(apiData, null, 2) : apiData}

USER QUESTION: "${originalQuestion}"

Answer the user's question directly and concisely. If they ask for a specific piece of information (like "receiver address"), provide ONLY that information without extra details unless explicitly requested.${isFlashAgent && flashAgentInfo?.noMatchFound ? ' If no match was found in the search, clearly state that the requested information was not found in the transaction history.' : ''}`

    console.log('Enhanced context created:', enhancedContext.substring(0, 500) + '...')

    // Ask AI again with the enhanced context
    const authKey = apiKey || process.env.HUGGINGFACE_API_KEY
    const model = modelName || 'openai/gpt-oss-120b'

    if (!authKey) {
      return 'Please configure your Hugging Face API key in settings to enable AI chat.'
    }

    console.log('Making second AI call with enhanced context...')

    // Build conversation messages with history for agent execution
    const agentMessages = [
      {
        role: 'system' as const,
        content: 'You are a helpful assistant that analyzes Stacks blockchain data. Be direct and concise - if the user asks for specific information (like "receiver address" or "transaction amount"), provide ONLY that information. Only give detailed explanations when explicitly asked for more details.'
      },
      ...conversationHistory,
      {
        role: 'user' as const,
        content: enhancedContext
      }
    ]

    const response2 = await queryHuggingFace({
      messages: agentMessages,
      model: model
    }, authKey)

    console.log('Second AI response received:', response2)

    const content = response2.choices?.[0]?.message?.content

    if (!content) {
      console.error('No content in second AI response')
      return `I successfully fetched additional data from the API, but encountered an issue processing it. Here's what I found: The API returned data about ${walletData.address}. You can try asking a more specific question about this address.`
    }

    console.log('Final AI content:', content)

    const cleanContent = content.replace(/\*\*\*+/g, '**').replace(/---+/g, '').replace(/#{4,}/g, '###').replace(/\|+/g, '').replace(/\s+/g, ' ').trim()

    // Check if Pro Agent result contains graph data and return it as graph protocol
    if (isProAgent && proAgentInfo?.success && proAgentInfo.result) {
      const result = proAgentInfo.result as Record<string, unknown>

      // Check if the result contains graph protocol data
      if (result.graph && result.x_axis_data && result.y_axis_data && result.title) {
        console.log('🎨 Pro Agent result contains graph data, returning graph protocol')
        return JSON.stringify(result)
      }
    }

    // If the AI still says it can't answer, provide a manual analysis
    if (cleanContent.includes('cannot') || cleanContent.includes('apologize') || cleanContent.includes('unable') || cleanContent.length < 50) {
      console.log('AI response inadequate, providing manual analysis')
      console.log('API Data type:', typeof apiData)
      console.log('API Data keys:', apiData && typeof apiData === 'object' ? Object.keys(apiData) : 'N/A')

      // Check if this is Pro Agent data with successful result
      if (apiData && typeof apiData === 'object') {
        const proData = apiData as ProAgentResponse
        if (proData._proAgent?.success && proData._proAgent.result) {
          console.log('Pro Agent has successful result, retrying AI with clearer context...')

          // Retry with AI using a much clearer context about the Pro Agent result
          const retryContext = `IMPORTANT: Pro Agent Mode successfully analyzed ALL transaction data and found the answer.

ORIGINAL QUESTION: "${originalQuestion}"

PRO AGENT ANALYSIS RESULT:
${JSON.stringify(proData._proAgent.result, null, 2)}

INSTRUCTIONS:
1. The Pro Agent has successfully processed ALL ${proData._proAgent.totalBatches} transaction batches
2. The result above contains the exact answer to the user's question
3. Interpret this result and provide a clear, human-readable answer
4. Do NOT say you cannot answer - the data is right there in the result
5. Be direct and specific based on the result data

Please provide a clear answer to "${originalQuestion}" based on the Pro Agent result above.`

          try {
            console.log('🔄 Retrying AI with Pro Agent result context...')

            const retryMessages = [
              {
                role: 'system' as const,
                content: 'You are a helpful assistant. The Pro Agent has successfully found the answer. Interpret the result data and provide a clear, human-readable response to the user\'s question.'
              },
              ...conversationHistory,
              {
                role: 'user' as const,
                content: retryContext
              }
            ]

            const retryResponse = await queryHuggingFace({
              messages: retryMessages,
              model: model
            }, authKey)

            const retryContent = retryResponse.choices?.[0]?.message?.content?.trim()

            if (retryContent && retryContent.length > 50 && !retryContent.includes('cannot') && !retryContent.includes('unable')) {
              console.log('✅ AI retry successful with Pro Agent context')
              return retryContent.replace(/\*\*\*+/g, '**').replace(/---+/g, '').replace(/#{4,}/g, '###').replace(/\|+/g, '').replace(/\s+/g, ' ').trim()
            } else {
              console.log('⚠️ AI retry still inadequate, falling back to manual interpretation')
            }
          } catch (retryError) {
            console.error('AI retry failed:', retryError)
          }

          // If AI retry failed, fall back to manual interpretation
          const result = proData._proAgent.result as Record<string, unknown>

          // Handle different types of Pro Agent results
          if (originalQuestion.toLowerCase().includes('most') && (originalQuestion.toLowerCase().includes('receive') || originalQuestion.toLowerCase().includes('stx'))) {
            if (result.topRecipient && result.totalAmountSTX) {
              return `The address that received the most STX from this wallet is:\n\n**${result.topRecipient}**\n\nTotal amount: **${result.totalAmountSTX.toLocaleString()} STX**`
            }
          }

          if (originalQuestion.toLowerCase().includes('lowest') && (originalQuestion.toLowerCase().includes('receive') || originalQuestion.toLowerCase().includes('stx'))) {
            if (result.address && result.total_amount) {
              const amountSTX = (result.total_amount as number) / 1000000
              return `The address that received the lowest amount of STX from this wallet is:\n\n**${result.address}**\n\nTotal amount: **${amountSTX.toLocaleString()} STX**`
            }
          }

          if (originalQuestion.toLowerCase().includes('list') && originalQuestion.toLowerCase().includes('receiver')) {
            if (result.receivers && Array.isArray(result.receivers)) {
              return `Found ${result.count || result.receivers.length} unique receiver addresses:\n\n${result.receivers.slice(0, 20).join('\n')}${result.receivers.length > 20 ? `\n\n... and ${result.receivers.length - 20} more addresses` : ''}`
            }
          }

          if (originalQuestion.toLowerCase().includes('count') && originalQuestion.toLowerCase().includes('transaction')) {
            if (typeof result === 'object' && !Array.isArray(result)) {
              const entries = Object.entries(result).sort(([, a], [, b]) => (b as number) - (a as number))
              const top10 = entries.slice(0, 10)
              return `Transaction counts per address (top 10):\n\n${top10.map(([addr, count]) => `${addr}: ${count} transactions`).join('\n')}`
            }
          }

          // Generic result display
          if (typeof result === 'object') {
            return `Pro Agent analysis complete:\n\n${JSON.stringify(result, null, 2)}`
          } else {
            return `Result: ${result}`
          }
        }
      }

      // Check if this is transaction data
      if (apiData && typeof apiData === 'object') {
        const transactionData = apiData as {
          results?: Array<{
            tx_id?: string
            token_transfer?: {
              recipient_address?: string
              amount?: string
            }
            tx_type?: string
            sender_address?: string
          }>
          balance?: string
          total_sent?: string
          total_received?: string
          total_fees_sent?: string
          total_miner_rewards_received?: string
          type?: string
        }

        // Handle transaction data (when fetching specific transactions)
        if (transactionData.results && transactionData.results.length > 0) {
          const tx = transactionData.results[0]

          // If user asked for receiver/recipient address
          if (originalQuestion.toLowerCase().includes('receiver') || originalQuestion.toLowerCase().includes('recipient')) {
            if (tx.token_transfer?.recipient_address) {
              return `The receiver address is ${tx.token_transfer.recipient_address}`
            }
            return `This transaction doesn't have a receiver address (it's not a token transfer)`
          }

          // If user asked for transaction details
          if (originalQuestion.toLowerCase().includes('transaction') && originalQuestion.toLowerCase().includes('detail')) {
            let details = `**Transaction Details:**\n`
            details += `- TX ID: ${tx.tx_id}\n`
            details += `- Type: ${tx.tx_type}\n`
            details += `- Sender: ${tx.sender_address}\n`
            if (tx.token_transfer) {
              details += `- Receiver: ${tx.token_transfer.recipient_address}\n`
              details += `- Amount: ${tx.token_transfer.amount ? (parseInt(tx.token_transfer.amount) / 1000000).toFixed(6) + ' STX' : 'N/A'}\n`
            }
            return details
          }

          return `Found transaction ${tx.tx_id} of type ${tx.tx_type}`
        }

        // Handle address data (when fetching address info)
        if (originalQuestion.toLowerCase().includes('details') || originalQuestion.toLowerCase().includes('more')) {
          let details = `**Additional Details for ${walletData.address}:**\n\n`

          if (transactionData.balance) {
            details += `💰 **Current Balance**: ${(parseInt(transactionData.balance) / 1000000).toFixed(6)} STX\n`
          }

          if (transactionData.total_sent) {
            details += `📤 **Total Sent**: ${(parseInt(transactionData.total_sent) / 1000000).toFixed(6)} STX\n`
          }

          if (transactionData.total_received) {
            details += `📥 **Total Received**: ${(parseInt(transactionData.total_received) / 1000000).toFixed(6)} STX\n`
          }

          if (transactionData.total_fees_sent) {
            details += `💸 **Total Fees**: ${(parseInt(transactionData.total_fees_sent) / 1000000).toFixed(6)} STX\n`
          }

          if (transactionData.total_miner_rewards_received) {
            details += `⛏️ **Miner Rewards**: ${(parseInt(transactionData.total_miner_rewards_received) / 1000000).toFixed(6)} STX\n`
          }

          details += `\n🔍 **Address Type**: ${transactionData.type || 'Standard wallet address'}\n`
          details += `📊 **Activity Level**: ${transactionData.total_sent && parseInt(transactionData.total_sent) > 1000000000 ? 'Very High' : 'Moderate'}`

          return details
        }
      }

      return `I fetched the data but couldn't process your specific question. The API returned: ${JSON.stringify(apiData).substring(0, 200)}...`
    }

    return cleanContent

  } catch (error) {
    console.error('Agent Mode Error:', error)

    // If JSON parsing failed, try to answer the question with a fallback API call
    if (error instanceof SyntaxError && originalQuestion.toLowerCase().includes('first')) {
      try {
        // For "first" questions, try to get older transactions
        const fallbackUrl = `https://api.testnet.hiro.so/extended/v1/address/${walletData.address}/transactions?limit=50&offset=20`
        const response = await fetch(fallbackUrl)

        if (response.ok) {
          const data = await response.json()

          // Find the first recipient from all transactions
          const allTransactions = [...walletData.transactions, ...(data.results || [])]
          const firstRecipient = allTransactions
            .filter(tx => tx.tx_type === 'token_transfer' && tx.sender_address === walletData.address)
            .sort((a, b) => a.burn_block_time - b.burn_block_time)
            .map(tx => (tx as ExtendedTransaction).token_transfer?.recipient_address)
            .filter(Boolean)[0]

          if (firstRecipient) {
            return `Based on the available transaction history, the first address that received STX from this wallet was: ${firstRecipient}`
          }
        }
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError)
      }
    }

    return 'I need more transaction history to answer that question accurately. The current data shows limited transactions. You could try asking about the recipients visible in the current transaction list.'
  }
}