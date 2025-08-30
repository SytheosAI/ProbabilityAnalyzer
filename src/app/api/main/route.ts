import { NextRequest, NextResponse } from 'next/server'

// Python API endpoint URL - adjust based on your deployment
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000/api/main'

export async function GET(request: NextRequest) {
  try {
    // Health check endpoint
    const response = await fetch(PYTHON_API_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Python API responded with status: ${response.status}`)
    }

    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      message: 'Sports Probability Analyzer API is running',
      python_api_status: data,
      features: [
        'Moneyline Predictions',
        'Parlay Optimization', 
        'Comprehensive Analysis',
        'Real-time Odds Integration',
        'Machine Learning Models',
        'Kelly Criterion Staking',
        'Arbitrage Detection'
      ]
    })
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to connect to Python API',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Forward request to Python API
    const response = await fetch(PYTHON_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('authorization') || '',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `Python API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('API Error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'API request failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}