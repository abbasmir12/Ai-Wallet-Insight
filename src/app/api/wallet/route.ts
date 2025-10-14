import { NextRequest, NextResponse } from 'next/server'
import { fetchWalletData } from '@/lib/stacks-api'
import { generateWalletSummary } from '@/lib/ai-service'

export async function POST(request: NextRequest) {
  try {
    const { address, apiKey, modelName } = await request.json()

    if (!address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Fetch wallet data from Stacks API
    const walletData = await fetchWalletData(address)
    
    // Generate AI summary
    const aiSummary = await generateWalletSummary(walletData, apiKey, modelName)

    return NextResponse.json({
      walletData,
      aiSummary
    })
  } catch (error) {
    console.error('Wallet API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wallet data' },
      { status: 500 }
    )
  }
}