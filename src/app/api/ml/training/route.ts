import { NextRequest, NextResponse } from 'next/server';

interface TrainingStatus {
  status: 'idle' | 'training' | 'evaluating' | 'completed' | 'error';
  model: string;
  progress: number;
  epoch: number;
  total_epochs: number;
  accuracy: number;
  loss: number;
  gpu_utilization: number;
  estimated_time_remaining: number;
  last_updated: string;
}

// In-memory training status (in production, this would be in a database)
let trainingStates: Record<string, TrainingStatus> = {};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const model = searchParams.get('model');
    const action = searchParams.get('action') || 'status';

    if (action === 'status') {
      if (model) {
        const status = trainingStates[model] || {
          status: 'idle',
          model,
          progress: 0,
          epoch: 0,
          total_epochs: 100,
          accuracy: 0,
          loss: 0,
          gpu_utilization: 0,
          estimated_time_remaining: 0,
          last_updated: new Date().toISOString()
        };

        return NextResponse.json({
          success: true,
          training_status: status,
          timestamp: new Date().toISOString()
        });
      } else {
        // Return status for all models
        const allStatuses = {
          transformer: trainingStates['transformer'] || createIdleStatus('transformer'),
          lstm: trainingStates['lstm'] || createIdleStatus('lstm'),
          gnn: trainingStates['gnn'] || createIdleStatus('gnn'),
          xgboost: trainingStates['xgboost'] || createIdleStatus('xgboost'),
          lightgbm: trainingStates['lightgbm'] || createIdleStatus('lightgbm'),
          catboost: trainingStates['catboost'] || createIdleStatus('catboost')
        };

        const overallStatus = {
          total_models: Object.keys(allStatuses).length,
          training_count: Object.values(allStatuses).filter(s => s.status === 'training').length,
          completed_count: Object.values(allStatuses).filter(s => s.status === 'completed').length,
          idle_count: Object.values(allStatuses).filter(s => s.status === 'idle').length,
          average_accuracy: Object.values(allStatuses).reduce((sum, s) => sum + s.accuracy, 0) / Object.keys(allStatuses).length,
          gpu_memory_used: Math.random() * 28 + 2, // 2-30GB for RTX 5090
          gpu_temperature: Math.floor(Math.random() * 20) + 65, // 65-85°C
          system_status: 'operational'
        };

        return NextResponse.json({
          success: true,
          overview: overallStatus,
          models: allStatuses,
          timestamp: new Date().toISOString()
        });
      }
    }

    if (action === 'history') {
      const model_name = searchParams.get('model') || 'ensemble';
      const days = parseInt(searchParams.get('days') || '7');
      
      const history = generateTrainingHistory(model_name, days);
      
      return NextResponse.json({
        success: true,
        model: model_name,
        days_requested: days,
        training_history: history,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'performance') {
      const performance_metrics = generatePerformanceMetrics();
      
      return NextResponse.json({
        success: true,
        performance_metrics,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: status, history, or performance' },
      { status: 400 }
    );

  } catch (error) {
    console.error('ML Training API GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch training status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, model, config } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    if (action === 'start_training') {
      if (!model) {
        return NextResponse.json(
          { error: 'Model name is required for training' },
          { status: 400 }
        );
      }

      // Check if model is already training
      if (trainingStates[model]?.status === 'training') {
        return NextResponse.json(
          { error: `Model ${model} is already training` },
          { status: 409 }
        );
      }

      // Start training simulation
      const trainingConfig = {
        epochs: config?.epochs || 100,
        batch_size: config?.batch_size || 256,
        learning_rate: config?.learning_rate || 0.001,
        use_gpu: config?.use_gpu !== false,
        mixed_precision: config?.mixed_precision !== false
      };

      trainingStates[model] = {
        status: 'training',
        model,
        progress: 0,
        epoch: 0,
        total_epochs: trainingConfig.epochs,
        accuracy: 0.5,
        loss: 2.0,
        gpu_utilization: 85 + Math.random() * 10,
        estimated_time_remaining: trainingConfig.epochs * 2, // 2 minutes per epoch estimate
        last_updated: new Date().toISOString()
      };

      // Start training simulation (in production, this would trigger actual training)
      simulateTraining(model);

      return NextResponse.json({
        success: true,
        message: `Training started for ${model}`,
        config: trainingConfig,
        status: trainingStates[model],
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'stop_training') {
      if (!model || !trainingStates[model]) {
        return NextResponse.json(
          { error: 'Model not found or not training' },
          { status: 404 }
        );
      }

      trainingStates[model].status = 'idle';
      trainingStates[model].last_updated = new Date().toISOString();

      return NextResponse.json({
        success: true,
        message: `Training stopped for ${model}`,
        final_status: trainingStates[model],
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'retrain_all') {
      const models = ['transformer', 'lstm', 'gnn', 'xgboost', 'lightgbm'];
      const results = [];

      for (const modelName of models) {
        if (!trainingStates[modelName] || trainingStates[modelName].status !== 'training') {
          trainingStates[modelName] = {
            status: 'training',
            model: modelName,
            progress: 0,
            epoch: 0,
            total_epochs: config?.epochs || 50, // Shorter for bulk training
            accuracy: 0.5,
            loss: 2.0,
            gpu_utilization: 75 + Math.random() * 15,
            estimated_time_remaining: (config?.epochs || 50) * 1.5,
            last_updated: new Date().toISOString()
          };

          simulateTraining(modelName);
          results.push(modelName);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Bulk training initiated',
        models_started: results,
        total_models: results.length,
        estimated_total_time: Math.max(...Object.values(trainingStates).map(s => s.estimated_time_remaining)),
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: start_training, stop_training, or retrain_all' },
      { status: 400 }
    );

  } catch (error) {
    console.error('ML Training API POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to process training request' },
      { status: 500 }
    );
  }
}

function createIdleStatus(model: string): TrainingStatus {
  return {
    status: 'idle',
    model,
    progress: 0,
    epoch: 0,
    total_epochs: 100,
    accuracy: 0.68 + Math.random() * 0.12, // 68-80% baseline
    loss: 0.3 + Math.random() * 0.4, // 0.3-0.7
    gpu_utilization: 0,
    estimated_time_remaining: 0,
    last_updated: new Date().toISOString()
  };
}

function simulateTraining(model: string) {
  const updateInterval = setInterval(() => {
    const state = trainingStates[model];
    if (!state || state.status !== 'training') {
      clearInterval(updateInterval);
      return;
    }

    // Update progress
    state.epoch += 1;
    state.progress = (state.epoch / state.total_epochs) * 100;
    
    // Simulate improving accuracy and decreasing loss
    const epochProgress = state.epoch / state.total_epochs;
    state.accuracy = Math.min(0.95, 0.5 + epochProgress * 0.3 + Math.random() * 0.1);
    state.loss = Math.max(0.1, 2.0 - epochProgress * 1.7 + (Math.random() - 0.5) * 0.2);
    
    // Update GPU utilization
    state.gpu_utilization = 80 + Math.random() * 15;
    
    // Update time remaining
    state.estimated_time_remaining = (state.total_epochs - state.epoch) * 2;
    
    state.last_updated = new Date().toISOString();

    // Complete training
    if (state.epoch >= state.total_epochs) {
      state.status = 'completed';
      state.progress = 100;
      state.gpu_utilization = 0;
      state.estimated_time_remaining = 0;
      clearInterval(updateInterval);
    }
  }, 2000); // Update every 2 seconds for demo purposes
}

function generateTrainingHistory(model: string, days: number) {
  const history = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayData = {
      date: date.toISOString().split('T')[0],
      sessions: Math.floor(Math.random() * 3) + 1, // 1-3 sessions per day
      total_epochs: Math.floor(Math.random() * 50) + 20, // 20-70 epochs
      best_accuracy: 0.65 + Math.random() * 0.15, // 65-80%
      final_loss: 0.2 + Math.random() * 0.3, // 0.2-0.5
      gpu_hours: Math.random() * 8 + 2, // 2-10 hours
      data_processed: Math.floor(Math.random() * 50000) + 10000, // 10k-60k samples
      improvements: Math.random() > 0.7 ? ['accuracy', 'loss'] : Math.random() > 0.5 ? ['accuracy'] : ['loss']
    };
    
    history.push(dayData);
  }
  
  return history;
}

function generatePerformanceMetrics() {
  return {
    overall_system: {
      uptime: Math.random() * 100, // hours
      total_predictions: Math.floor(Math.random() * 10000) + 5000,
      accuracy_trend: 'improving',
      success_rate: 0.72 + Math.random() * 0.08, // 72-80%
      response_time_avg: Math.random() * 200 + 50, // 50-250ms
    },
    model_performance: {
      transformer: {
        accuracy: 0.74 + Math.random() * 0.06,
        precision: 0.73 + Math.random() * 0.07,
        recall: 0.71 + Math.random() * 0.08,
        f1_score: 0.72 + Math.random() * 0.07,
        inference_time: Math.random() * 30 + 10, // 10-40ms
      },
      ensemble: {
        accuracy: 0.76 + Math.random() * 0.05,
        roi: 0.08 + Math.random() * 0.07, // 8-15% ROI
        sharpe_ratio: 0.9 + Math.random() * 0.4,
        max_drawdown: Math.random() * 0.12, // 0-12%
        win_rate: 0.68 + Math.random() * 0.08, // 68-76%
      }
    },
    hardware_stats: {
      gpu_model: 'NVIDIA RTX 5090',
      gpu_memory_total: 32768, // MB
      gpu_memory_used: Math.floor(Math.random() * 20000) + 5000, // 5-25GB used
      gpu_temperature: Math.floor(Math.random() * 20) + 65, // 65-85°C
      gpu_utilization: Math.random() * 30 + 5, // 5-35% when idle
      cpu_usage: Math.random() * 40 + 10, // 10-50%
      ram_usage: Math.random() * 60 + 20, // 20-80%
    },
    data_pipeline: {
      sources_connected: 8,
      data_freshness: Math.random() * 10 + 5, // 5-15 minutes old
      processing_speed: Math.floor(Math.random() * 1000) + 500, // 500-1500 records/sec
      error_rate: Math.random() * 0.02, // 0-2% error rate
      queue_size: Math.floor(Math.random() * 100), // pending jobs
    }
  };
}