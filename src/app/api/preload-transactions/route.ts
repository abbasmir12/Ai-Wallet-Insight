import { NextRequest, NextResponse } from 'next/server'

// Background transaction preloading for Pro Agent Mode
export async function POST(request: NextRequest) {
  try {
    const { walletData } = await request.json()

    if (!walletData || !walletData.address) {
      return NextResponse.json(
        { error: 'Wallet data is required' },
        { status: 400 }
      )
    }

    // Import the Pro Agent function
    const { preloadTransactionData } = await import('@/lib/ai-service')
    
    // Start background preloading
    const result = await preloadTransactionData(walletData)

    return NextResponse.json({ 
      success: true, 
      message: 'Transaction data preloaded successfully',
      ...result
    })
  } catch (error) {
    console.error('Preload API Error:', error)
    return NextResponse.json(
      { error: 'Failed to preload transaction data' },
      { status: 500 }
    )
  }
}