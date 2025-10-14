import { NextRequest, NextResponse } from 'next/server'
import { askWalletQuestion } from '@/lib/ai-service'

export async function POST(request: NextRequest) {
  try {
    const { question, walletData, apiKey, modelName, agentMode, conversationHistory } = await request.json()

    if (!question || !walletData) {
      return NextResponse.json(
        { error: 'Question and wallet data are required' },
        { status: 400 }
      )
    }

    // Check if this is an agent execution request
    if (question.startsWith('AGENT_EXECUTE:')) {
      // Use a more robust parsing approach
      const executePrefix = 'AGENT_EXECUTE:'
      const content = question.substring(executePrefix.length)
      
      // Find the last occurrence of ':' to separate original question
      const lastColonIndex = content.lastIndexOf(':')
      if (lastColonIndex === -1) {
        throw new Error('Invalid agent execute format')
      }
      
      const agentResponse = content.substring(0, lastColonIndex)
      const originalQuestion = content.substring(lastColonIndex + 1)
      
      console.log('Parsed agent response:', agentResponse)
      console.log('Parsed original question:', originalQuestion)
      
      const { executeAgentAction } = await import('@/lib/ai-service')
      const answer = await executeAgentAction(agentResponse, originalQuestion, walletData, apiKey, modelName, conversationHistory)
      return NextResponse.json({ answer })
    }

    const answer = await askWalletQuestion(question, walletData, apiKey, modelName, agentMode, conversationHistory)

    return NextResponse.json({ answer })
  } catch (error) {
    console.error('Chat API Error:', error)
    return NextResponse.json(
      { error: 'Failed to process question' },
      { status: 500 }
    )
  }
}