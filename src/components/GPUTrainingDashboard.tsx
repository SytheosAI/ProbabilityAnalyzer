'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface TrainingBatch {
  batch_id: string;
  sport: string;
  status: 'pending' | 'training' | 'completed' | 'failed';
  accuracy: string;
  created_at: string;
}

interface ModelPerformance {
  model_id: string;
  sport: string;
  accuracy: string;
  roi: string;
}

interface GPUInfo {
  model: string;
  memory: string;
  optimal_batch_size: number;
  max_features: number;
  status: string;
}

interface TrainingStatus {
  active: number;
  completed: number;
  failed: number;
  total: number;
}

export default function GPUTrainingDashboard() {
  const [gpuInfo, setGPUInfo] = useState<GPUInfo | null>(null);
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus | null>(null);
  const [recentBatches, setRecentBatches] = useState<TrainingBatch[]>([]);
  const [bestModels, setBestModels] = useState<ModelPerformance[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingResults, setTrainingResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/gpu-training');
      const data = await response.json();
      
      if (data.success) {
        setGPUInfo(data.gpu_info);
        setTrainingStatus(data.training_status);
        setRecentBatches(data.recent_batches);
        setBestModels(data.best_performing_models);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Start training for specific sport
  const startTraining = async (sport: string) => {
    setIsTraining(true);
    setTrainingResults(null);
    
    try {
      const response = await fetch('/api/gpu-training', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start_training',
          sport: sport
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTrainingResults(data);
        await fetchDashboardData(); // Refresh dashboard
      } else {
        alert(`Training failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Training failed:', error);
      alert('Training failed. Check console for details.');
    } finally {
      setIsTraining(false);
    }
  };

  // Get status color for training batches
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'training': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'training': return '🔄';
      case 'failed': return '❌';
      case 'pending': return '⏳';
      default: return '❓';
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg">Loading GPU Training Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">GPU Training Dashboard</h1>
        <Badge variant="outline" className="text-lg px-4 py-2">
          🎯 Target: 70%+ Accuracy
        </Badge>
      </div>

      {/* GPU Information */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ⚡ GPU Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          {gpuInfo && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Model</p>
                <p className="font-semibold">{gpuInfo.model}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Memory</p>
                <p className="font-semibold">{gpuInfo.memory}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Batch Size</p>
                <p className="font-semibold">{gpuInfo.optimal_batch_size}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Status</p>
                <p className="font-semibold text-green-600">{gpuInfo.status}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Controls */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 Start GPU Training</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'Tennis', 'ALL'].map((sport) => (
              <Button
                key={sport}
                onClick={() => startTraining(sport)}
                disabled={isTraining}
                className={sport === 'ALL' ? 'col-span-2 bg-purple-600 hover:bg-purple-700' : ''}
              >
                {isTraining ? '🔄 Training...' : `Train ${sport}`}
              </Button>
            ))}
          </div>
          
          {trainingResults && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Training Complete! 🎉</h4>
              {trainingResults.result ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Accuracy</p>
                    <p className="font-bold text-green-600">{trainingResults.result.accuracy}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Target</p>
                    <p className="font-bold">{trainingResults.result.target}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Time</p>
                    <p className="font-bold">{trainingResults.result.trainingTime}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Convergence</p>
                    <p className="font-bold">{trainingResults.result.convergence ? '✅ Yes' : '❌ No'}</p>
                  </div>
                </div>
              ) : trainingResults.results ? (
                <div className="space-y-2">
                  {trainingResults.results.map((result: any, index: number) => (
                    <div key={index} className="flex justify-between items-center bg-white rounded p-2">
                      <span className="font-medium">{result.sport}</span>
                      <span className="text-green-600 font-bold">{result.accuracy}</span>
                      <span className="text-xs text-gray-500">{result.trainingTime}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Training Status */}
        <Card>
          <CardHeader>
            <CardTitle>📊 Training Status</CardTitle>
          </CardHeader>
          <CardContent>
            {trainingStatus && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded">
                    <p className="text-2xl font-bold text-blue-600">{trainingStatus.active}</p>
                    <p className="text-sm text-gray-600">Active</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded">
                    <p className="text-2xl font-bold text-green-600">{trainingStatus.completed}</p>
                    <p className="text-sm text-gray-600">Completed</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-red-50 rounded">
                    <p className="text-2xl font-bold text-red-600">{trainingStatus.failed}</p>
                    <p className="text-sm text-gray-600">Failed</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <p className="text-2xl font-bold text-gray-600">{trainingStatus.total}</p>
                    <p className="text-sm text-gray-600">Total</p>
                  </div>
                </div>
                
                {trainingStatus.total > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Success Rate</span>
                      <span>{Math.round((trainingStatus.completed / trainingStatus.total) * 100)}%</span>
                    </div>
                    <Progress 
                      value={(trainingStatus.completed / trainingStatus.total) * 100} 
                      className="h-2"
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Training Batches */}
        <Card>
          <CardHeader>
            <CardTitle>🔄 Recent Training Batches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {recentBatches.map((batch) => (
                <div key={batch.batch_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{getStatusIcon(batch.status)}</span>
                    <div>
                      <p className="font-medium">{batch.sport}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(batch.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getStatusColor(batch.status)}>
                      {batch.status}
                    </Badge>
                    {batch.accuracy !== 'N/A' && (
                      <p className="text-sm font-bold mt-1">{batch.accuracy}</p>
                    )}
                  </div>
                </div>
              ))}
              
              {recentBatches.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  No training batches yet. Start your first training above!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Best Performing Models */}
      <Card>
        <CardHeader>
          <CardTitle>🏆 Best Performing Models</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Model ID</th>
                  <th className="text-left p-2">Sport</th>
                  <th className="text-left p-2">Accuracy</th>
                  <th className="text-left p-2">ROI</th>
                  <th className="text-left p-2">Performance</th>
                </tr>
              </thead>
              <tbody>
                {bestModels.map((model, index) => (
                  <tr key={model.model_id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-mono text-sm">{model.model_id.split('_')[0]}...</td>
                    <td className="p-2">
                      <Badge variant="outline">{model.sport}</Badge>
                    </td>
                    <td className="p-2">
                      <span className={`font-bold ${
                        parseFloat(model.accuracy) >= 70 ? 'text-green-600' : 
                        parseFloat(model.accuracy) >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {model.accuracy}
                      </span>
                    </td>
                    <td className="p-2">
                      <span className={`font-bold ${
                        parseFloat(model.roi) > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {model.roi}
                      </span>
                    </td>
                    <td className="p-2">
                      {index === 0 && <span className="text-yellow-500">👑 Best</span>}
                      {parseFloat(model.accuracy) >= 70 && <span className="text-green-500">✅ Target</span>}
                      {parseFloat(model.accuracy) < 60 && <span className="text-red-500">❌ Low</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {bestModels.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No models trained yet. Start training to see performance metrics!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}