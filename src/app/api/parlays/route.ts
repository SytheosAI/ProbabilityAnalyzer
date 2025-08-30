import { NextRequest, NextResponse } from 'next/server'

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000/api/main'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Ensure the request has the correct type for parlay optimization
    const parlayRequest = {
      type: 'parlays',
      ...body
    }
    
    const response = await fetch(PYTHON_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('authorization') || '',
      },
      body: JSON.stringify(parlayRequest),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `Parlay API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Parlay API Error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Parlay optimization failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}