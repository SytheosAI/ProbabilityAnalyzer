'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Square, 
  RefreshCw, 
  Cpu, 
  Zap, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  BarChart3,
  Settings,
  Database,
  Gpu
} from 'lucide-react';

interface ModelStatus {
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

interface TrainingOverview {
  total_models: number;
  training_count: number;
  completed_count: number;
  idle_count: number;
  average_accuracy: number;
  gpu_memory_used: number;
  gpu_temperature: number;
  system_status: string;
}

export default function MLTrainingDashboard() {
  const [overview, setOverview] = useState<TrainingOverview | null>(null);
  const [modelStates, setModelStates] = useState<Record<string, ModelStatus>>({});
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchTrainingStatus();
    const interval = setInterval(fetchTrainingStatus, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchTrainingStatus = async () => {
    try {
      const response = await fetch('/api/ml/training?action=status');
      if (!response.ok) throw new Error('Failed to fetch status');
      
      const data = await response.json();
      setOverview(data.overview);
      setModelStates(data.models);
      setError(null);
    } catch (err) {
      setError('Failed to fetch training status');
      console.error('Training status error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformanceMetrics = async () => {
    try {
      const response = await fetch('/api/ml/training?action=performance');
      if (!response.ok) throw new Error('Failed to fetch performance');
      
      const data = await response.json();
      setPerformanceMetrics(data.performance_metrics);
    } catch (err) {
      console.error('Performance metrics error:', err);
    }
  };

  const startTraining = async (model: string) => {
    try {
      const response = await fetch('/api/ml/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_training',
          model,
          config: {
            epochs: 100,
            batch_size: 256,
            learning_rate: 0.001,
            use_gpu: true,
            mixed_precision: true
          }
        })
      });

      if (!response.ok) throw new Error('Failed to start training');
      
      fetchTrainingStatus();
    } catch (err) {
      setError(`Failed to start training for ${model}`);
      console.error('Start training error:', err);
    }
  };

  const stopTraining = async (model: string) => {
    try {
      const response = await fetch('/api/ml/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'stop_training',
          model
        })
      });

      if (!response.ok) throw new Error('Failed to stop training');
      
      fetchTrainingStatus();
    } catch (err) {
      setError(`Failed to stop training for ${model}`);
      console.error('Stop training error:', err);
    }
  };

  const retrainAll = async () => {
    try {
      const response = await fetch('/api/ml/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'retrain_all',
          config: {
            epochs: 75,
            batch_size: 512,
            learning_rate: 0.0005,
            use_gpu: true
          }
        })
      });

      if (!response.ok) throw new Error('Failed to start bulk training');
      
      fetchTrainingStatus();
    } catch (err) {
      setError('Failed to start bulk training');
      console.error('Bulk training error:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'training': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      case 'completed': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'error': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      case 'evaluating': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'training': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'error': return <AlertTriangle className="h-4 w-4" />;
      case 'evaluating': return <BarChart3 className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-gray-600 dark:text-gray-400">Loading training status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">ML Training Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400">NVIDIA RTX 5090 GPU Training System</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button onClick={fetchTrainingStatus} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={retrainAll} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
            <Zap className="h-4 w-4 mr-2" />
            Retrain All
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* System Overview */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Models Training</p>
                  <p className="text-2xl font-bold text-blue-600">{overview.training_count}</p>
                </div>
                <RefreshCw className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Accuracy</p>
                  <p className="text-2xl font-bold text-green-600">{(overview.average_accuracy * 100).toFixed(1)}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">GPU Memory</p>
                  <p className="text-2xl font-bold text-purple-600">{overview.gpu_memory_used.toFixed(1)}GB</p>
                </div>
                <Gpu className="h-8 w-8 text-purple-500" />
              </div>
              <Progress value={(overview.gpu_memory_used / 32) * 100} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">GPU Temp</p>
                  <p className="text-2xl font-bold text-orange-600">{overview.gpu_temperature}°C</p>
                </div>
                <Cpu className="h-8 w-8 text-orange-500" />
              </div>
              <Progress 
                value={((overview.gpu_temperature - 30) / 50) * 100} 
                className="mt-2"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Models Training Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Model Training Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {Object.entries(modelStates).map(([model, state]) => (
              <div key={model} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Badge className={getStatusColor(state.status)}>
                      {getStatusIcon(state.status)}
                      <span className="ml-1 capitalize">{state.status}</span>
                    </Badge>
                    <h3 className="text-lg font-semibold capitalize">{model}</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    {state.status === 'idle' || state.status === 'completed' || state.status === 'error' ? (
                      <Button onClick={() => startTraining(model)} size="sm">
                        <Play className="h-4 w-4 mr-1" />
                        Start
                      </Button>
                    ) : (
                      <Button onClick={() => stopTraining(model)} variant="destructive" size="sm">
                        <Square className="h-4 w-4 mr-1" />
                        Stop
                      </Button>
                    )}
                  </div>
                </div>

                {state.status === 'training' && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span>Epoch {state.epoch}/{state.total_epochs}</span>
                      <span>{state.progress.toFixed(1)}% complete</span>
                    </div>
                    <Progress value={state.progress} />
                    
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Accuracy</p>
                        <p className="font-semibold text-green-600">{(state.accuracy * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Loss</p>
                        <p className="font-semibold text-red-600">{state.loss.toFixed(3)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">GPU Usage</p>
                        <p className="font-semibold text-blue-600">{state.gpu_utilization.toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="text-gray-500">ETA</p>
                        <p className="font-semibold text-purple-600">
                          {formatTime(state.estimated_time_remaining)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {state.status === 'completed' && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-400">
                      Training completed with {(state.accuracy * 100).toFixed(1)}% accuracy
                    </p>
                  </div>
                )}

                {state.status === 'idle' && state.accuracy > 0 && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Last Accuracy</p>
                      <p className="font-semibold text-green-600">{(state.accuracy * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Last Loss</p>
                      <p className="font-semibold text-red-600">{state.loss.toFixed(3)}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      {performanceMetrics ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              System Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="models">Models</TabsTrigger>
                <TabsTrigger value="hardware">Hardware</TabsTrigger>
                <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {performanceMetrics.overall_system.total_predictions.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Predictions</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {(performanceMetrics.overall_system.success_rate * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">
                      {performanceMetrics.overall_system.response_time_avg.toFixed(0)}ms
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Avg Response</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">
                      {performanceMetrics.overall_system.uptime.toFixed(1)}h
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Uptime</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="models" className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span>Transformer Model</span>
                    <span className="font-semibold text-green-600">
                      {(performanceMetrics.model_performance.transformer.accuracy * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span>Ensemble Accuracy</span>
                    <span className="font-semibold text-green-600">
                      {(performanceMetrics.model_performance.ensemble.accuracy * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span>ROI Performance</span>
                    <span className="font-semibold text-blue-600">
                      {(performanceMetrics.model_performance.ensemble.roi * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchPerformanceMetrics} variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Load Performance Data
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}