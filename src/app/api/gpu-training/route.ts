// API endpoint for GPU training operations
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // Vercel timeout

// Lazy load to avoid build issues
let GPUTrainingPipeline: any;
let TrainingManager: any;

async function loadGPUModules() {
  if (!GPUTrainingPipeline || !TrainingManager) {
    try {
      const module = await import('@/lib/gpuTraining');
      GPUTrainingPipeline = module.GPUTrainingPipeline;
      TrainingManager = module.TrainingManager;
    } catch (error) {
      console.error('Failed to load GPU training modules:', error);
      throw new Error('GPU training modules not available');
    }
  }
}

// POST - Start GPU training
export async function POST(req: NextRequest) {
  try {
    await loadGPUModules();
    const { action, sport } = await req.json();
    
    if (action === 'start_training') {
      if (sport === 'ALL') {
        // Train all sports
        const results = await TrainingManager.trainAllSports();
        return NextResponse.json({
          success: true,
          message: `GPU training started for all sports`,
          results: results.map(r => ({
            sport: r.batchId.split('_')[2],
            accuracy: `${(r.accuracy * 100).toFixed(1)}%`,
            convergence: r.convergenceAchieved,
            trainingTime: `${r.trainingTime}s`
          }))
        });
      } else {
        // Train specific sport
        const config = GPUTrainingPipeline.createNVIDIA5090Config(sport);
        const pipeline = new GPUTrainingPipeline(config);
        const result = await pipeline.startTraining();
        
        return NextResponse.json({
          success: true,
          message: `GPU training completed for ${sport}`,
          result: {
            accuracy: `${(result.accuracy * 100).toFixed(1)}%`,
            convergence: result.convergenceAchieved,
            trainingTime: `${result.trainingTime}s`,
            target: result.accuracy >= 0.70 ? 'Target Achieved ✅' : 'Below Target ⚠️'
          }
        });
      }
    }

    if (action === 'get_status') {
      const status = await TrainingManager.getTrainingStatus();
      return NextResponse.json({
        success: true,
        training_batches: status,
        active_trainings: status.filter(s => s.status === 'training').length,
        completed_trainings: status.filter(s => s.status === 'completed').length
      });
    }

    if (action === 'best_models') {
      const models = await TrainingManager.getBestModels();
      return NextResponse.json({
        success: true,
        best_models: models.map(m => ({
          model_id: m.model_id,
          sport: m.sport,
          accuracy: `${(m.accuracy * 100).toFixed(1)}%`,
          roi: `${(m.roi * 100).toFixed(1)}%`,
          sample_size: m.sample_size
        }))
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 });

  } catch (error) {
    console.error('GPU Training API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Training failed'
    }, { status: 500 });
  }
}

// GET - Get training status
export async function GET() {
  try {
    await loadGPUModules();
    
    const [status, bestModels] = await Promise.all([
      TrainingManager.getTrainingStatus(),
      TrainingManager.getBestModels(5)
    ]);

    return NextResponse.json({
      success: true,
      gpu_info: {
        model: 'NVIDIA RTX 5090',
        memory: '24GB GDDR7',
        optimal_batch_size: 1024,
        max_features: 250,
        status: 'Ready for Training 🚀'
      },
      training_status: {
        active: status.filter(s => s.status === 'training').length,
        completed: status.filter(s => s.status === 'completed').length,
        failed: status.filter(s => s.status === 'failed').length,
        total: status.length
      },
      recent_batches: status.slice(0, 5).map(s => ({
        batch_id: s.batch_id,
        sport: s.sport,
        status: s.status,
        accuracy: s.best_validation_accuracy ? `${(s.best_validation_accuracy * 100).toFixed(1)}%` : 'N/A',
        created_at: s.created_at
      })),
      best_performing_models: bestModels.map(m => ({
        model_id: m.model_id,
        sport: m.sport,
        accuracy: `${(m.accuracy * 100).toFixed(1)}%`,
        roi: `${(m.roi * 100).toFixed(1)}%`
      }))
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to get training status'
    }, { status: 500 });
  }
}