import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/services/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const predictions = await db.getRecentPredictions(limit);
    
    return NextResponse.json({
      success: true,
      data: predictions
    });
  } catch (error) {
    console.error('Get predictions API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch predictions',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const prediction = await request.json();
    await db.savePrediction(prediction);
    
    return NextResponse.json({
      success: true,
      message: 'Prediction saved successfully'
    });
  } catch (error) {
    console.error('Save prediction API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to save prediction',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}