import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple, Union
from ultralytics import YOLO
import cv2
from pathlib import Path
import json
import logging
from datetime import datetime
import mlflow
import wandb
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
import optuna
from collections import deque
import threading
import time

logger = logging.getLogger(__name__)

class AdaptiveYOLOModel(nn.Module):
    def __init__(self, input_dim: int, hidden_dims: List[int], output_dim: int):
        super(AdaptiveYOLOModel, self).__init__()
        
        layers = []
        prev_dim = input_dim
        
        for hidden_dim in hidden_dims:
            layers.extend([
                nn.Linear(prev_dim, hidden_dim),
                nn.BatchNorm1d(hidden_dim),
                nn.ReLU(),
                nn.Dropout(0.2)
            ])
            prev_dim = hidden_dim
        
        layers.append(nn.Linear(prev_dim, output_dim))
        
        self.network = nn.Sequential(*layers)
        self.attention = nn.MultiheadAttention(embed_dim=input_dim, num_heads=4)
        
    def forward(self, x):
        attn_output, _ = self.attention(x, x, x)
        x = x + attn_output
        return self.network(x)

class YOLOFeedbackLoop:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.model_type = config.get('model_type', 'yolov8n')
        self.confidence_threshold = config.get('confidence_threshold', 0.5)
        self.iou_threshold = config.get('iou_threshold', 0.45)
        self.device = config.get('device', 'cuda' if torch.cuda.is_available() else 'cpu')
        
        self.learning_rate = config.get('learning_rate', 0.001)
        self.batch_size = config.get('batch_size', 16)
        self.epochs = config.get('epochs', 10)
        self.patience = config.get('patience', 5)
        self.min_delta = config.get('min_delta', 0.001)
        
        self.yolo_model = None
        self.adaptive_model = None
        self.optimizer = None
        
        self.feedback_buffer = deque(maxlen=1000)
        self.performance_history = []
        self.model_versions = []
        
        self.is_training = False
        self.training_thread = None
        
        self._initialize_models()
        
    def _initialize_models(self):
        try:
            self.yolo_model = YOLO(f'{self.model_type}.pt')
            logger.info(f"Initialized YOLO model: {self.model_type}")
        except Exception as e:
            logger.error(f"Error initializing YOLO model: {e}")
            self.yolo_model = None
        
        self.adaptive_model = AdaptiveYOLOModel(
            input_dim=512,
            hidden_dims=[256, 128, 64],
            output_dim=10
        ).to(self.device)
        
        self.optimizer = optim.AdamW(
            self.adaptive_model.parameters(),
            lr=self.learning_rate,
            weight_decay=0.01
        )
        
        self.scheduler = optim.lr_scheduler.ReduceLROnPlateau(
            self.optimizer,
            mode='min',
            factor=0.5,
            patience=3
        )
    
    def process_data(self, 
                    data: Union[np.ndarray, torch.Tensor, str],
                    task_type: str = 'detection') -> Dict[str, Any]:
        if self.yolo_model is None:
            return self._process_without_yolo(data)
        
        if isinstance(data, str):
            if task_type == 'detection':
                results = self.yolo_model(data, conf=self.confidence_threshold, iou=self.iou_threshold)
            else:
                results = self.yolo_model.predict(data, task=task_type)
        elif isinstance(data, np.ndarray):
            if len(data.shape) == 2:
                data = cv2.cvtColor(data, cv2.COLOR_GRAY2BGR)
            results = self.yolo_model(data)
        else:
            results = self.yolo_model(data)
        
        processed_results = self._process_yolo_results(results)
        
        features = self._extract_features(processed_results)
        
        enhanced_results = self._apply_adaptive_model(features)
        
        self._collect_feedback(processed_results, enhanced_results)
        
        return {
            'yolo_results': processed_results,
            'enhanced_results': enhanced_results,
            'confidence_scores': self._calculate_confidence_scores(enhanced_results),
            'metadata': {
                'timestamp': datetime.now().isoformat(),
                'model_version': len(self.model_versions),
                'task_type': task_type
            }
        }
    
    def train_feedback_loop(self,
                           training_data: List[Tuple[np.ndarray, np.ndarray]],
                           validation_data: Optional[List[Tuple[np.ndarray, np.ndarray]]] = None):
        if self.is_training:
            logger.warning("Training already in progress")
            return
        
        self.is_training = True
        self.training_thread = threading.Thread(
            target=self._training_loop,
            args=(training_data, validation_data)
        )
        self.training_thread.start()
    
    def _training_loop(self,
                      training_data: List[Tuple[np.ndarray, np.ndarray]],
                      validation_data: Optional[List[Tuple[np.ndarray, np.ndarray]]]):
        try:
            X_train = torch.FloatTensor(np.array([x for x, _ in training_data])).to(self.device)
            y_train = torch.FloatTensor(np.array([y for _, y in training_data])).to(self.device)
            
            if validation_data:
                X_val = torch.FloatTensor(np.array([x for x, _ in validation_data])).to(self.device)
                y_val = torch.FloatTensor(np.array([y for _, y in validation_data])).to(self.device)
            
            train_dataset = TensorDataset(X_train, y_train)
            train_loader = DataLoader(train_dataset, batch_size=self.batch_size, shuffle=True)
            
            criterion = nn.MSELoss()
            
            best_loss = float('inf')
            patience_counter = 0
            
            for epoch in range(self.epochs):
                self.adaptive_model.train()
                epoch_loss = 0
                
                for batch_X, batch_y in train_loader:
                    self.optimizer.zero_grad()
                    
                    outputs = self.adaptive_model(batch_X)
                    loss = criterion(outputs, batch_y)
                    
                    loss.backward()
                    torch.nn.utils.clip_grad_norm_(self.adaptive_model.parameters(), max_norm=1.0)
                    self.optimizer.step()
                    
                    epoch_loss += loss.item()
                
                avg_loss = epoch_loss / len(train_loader)
                
                if validation_data:
                    self.adaptive_model.eval()
                    with torch.no_grad():
                        val_outputs = self.adaptive_model(X_val)
                        val_loss = criterion(val_outputs, y_val).item()
                    
                    self.scheduler.step(val_loss)
                    
                    if val_loss < best_loss - self.min_delta:
                        best_loss = val_loss
                        patience_counter = 0
                        self._save_model_checkpoint()
                    else:
                        patience_counter += 1
                else:
                    self.scheduler.step(avg_loss)
                    
                    if avg_loss < best_loss - self.min_delta:
                        best_loss = avg_loss
                        patience_counter = 0
                        self._save_model_checkpoint()
                    else:
                        patience_counter += 1
                
                self.performance_history.append({
                    'epoch': epoch,
                    'train_loss': avg_loss,
                    'val_loss': val_loss if validation_data else None,
                    'learning_rate': self.optimizer.param_groups[0]['lr']
                })
                
                if patience_counter >= self.patience:
                    logger.info(f"Early stopping at epoch {epoch}")
                    break
                
                logger.info(f"Epoch {epoch}: Train Loss = {avg_loss:.4f}, Val Loss = {val_loss:.4f if validation_data else 'N/A'}")
            
        except Exception as e:
            logger.error(f"Error in training loop: {e}")
        finally:
            self.is_training = False
    
    def optimize_hyperparameters(self,
                                data: List[Tuple[np.ndarray, np.ndarray]],
                                n_trials: int = 50) -> Dict[str, Any]:
        def objective(trial):
            lr = trial.suggest_loguniform('learning_rate', 1e-5, 1e-1)
            batch_size = trial.suggest_categorical('batch_size', [8, 16, 32, 64])
            hidden_dims = [
                trial.suggest_int('hidden_1', 32, 512),
                trial.suggest_int('hidden_2', 16, 256),
                trial.suggest_int('hidden_3', 8, 128)
            ]
            dropout = trial.suggest_uniform('dropout', 0.1, 0.5)
            
            model = AdaptiveYOLOModel(
                input_dim=512,
                hidden_dims=hidden_dims,
                output_dim=10
            ).to(self.device)
            
            optimizer = optim.AdamW(model.parameters(), lr=lr)
            
            X = torch.FloatTensor(np.array([x for x, _ in data])).to(self.device)
            y = torch.FloatTensor(np.array([y for _, y in data])).to(self.device)
            
            dataset = TensorDataset(X, y)
            loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
            
            criterion = nn.MSELoss()
            
            model.train()
            total_loss = 0
            
            for _ in range(5):
                for batch_X, batch_y in loader:
                    optimizer.zero_grad()
                    outputs = model(batch_X)
                    loss = criterion(outputs, batch_y)
                    loss.backward()
                    optimizer.step()
                    total_loss += loss.item()
            
            return total_loss / (5 * len(loader))
        
        study = optuna.create_study(direction='minimize')
        study.optimize(objective, n_trials=n_trials)
        
        best_params = study.best_params
        logger.info(f"Best hyperparameters: {best_params}")
        
        return best_params
    
    def apply_continuous_learning(self,
                                 new_data: Tuple[np.ndarray, np.ndarray],
                                 learning_rate_decay: float = 0.95):
        X_new = torch.FloatTensor(new_data[0]).unsqueeze(0).to(self.device)
        y_new = torch.FloatTensor(new_data[1]).unsqueeze(0).to(self.device)
        
        for param_group in self.optimizer.param_groups:
            param_group['lr'] *= learning_rate_decay
        
        self.adaptive_model.train()
        
        self.optimizer.zero_grad()
        output = self.adaptive_model(X_new)
        loss = nn.MSELoss()(output, y_new)
        loss.backward()
        self.optimizer.step()
        
        self.feedback_buffer.append({
            'input': new_data[0].tolist(),
            'target': new_data[1].tolist(),
            'prediction': output.detach().cpu().numpy().tolist(),
            'loss': loss.item(),
            'timestamp': datetime.now().isoformat()
        })
        
        if len(self.feedback_buffer) >= self.batch_size:
            self._batch_update()
    
    def get_pattern_probabilities(self,
                                 patterns: List[np.ndarray]) -> Dict[str, float]:
        self.adaptive_model.eval()
        probabilities = {}
        
        with torch.no_grad():
            for i, pattern in enumerate(patterns):
                pattern_tensor = torch.FloatTensor(pattern).unsqueeze(0).to(self.device)
                output = self.adaptive_model(pattern_tensor)
                
                prob = torch.sigmoid(output).cpu().numpy()[0]
                probabilities[f"pattern_{i}"] = float(np.mean(prob))
        
        return probabilities
    
    def _process_yolo_results(self, results) -> Dict[str, Any]:
        processed = {
            'detections': [],
            'confidence_scores': [],
            'classes': [],
            'boxes': []
        }
        
        if results and len(results) > 0:
            result = results[0]
            
            if hasattr(result, 'boxes') and result.boxes is not None:
                boxes = result.boxes
                processed['boxes'] = boxes.xyxy.cpu().numpy().tolist() if hasattr(boxes, 'xyxy') else []
                processed['confidence_scores'] = boxes.conf.cpu().numpy().tolist() if hasattr(boxes, 'conf') else []
                processed['classes'] = boxes.cls.cpu().numpy().tolist() if hasattr(boxes, 'cls') else []
                
                for i in range(len(processed['boxes'])):
                    processed['detections'].append({
                        'box': processed['boxes'][i] if i < len(processed['boxes']) else [],
                        'confidence': processed['confidence_scores'][i] if i < len(processed['confidence_scores']) else 0,
                        'class': int(processed['classes'][i]) if i < len(processed['classes']) else -1
                    })
        
        return processed
    
    def _process_without_yolo(self, data: Union[np.ndarray, torch.Tensor]) -> Dict[str, Any]:
        if isinstance(data, torch.Tensor):
            data = data.cpu().numpy()
        
        features = self._extract_basic_features(data)
        
        return {
            'features': features,
            'shape': data.shape,
            'statistics': {
                'mean': float(np.mean(data)),
                'std': float(np.std(data)),
                'min': float(np.min(data)),
                'max': float(np.max(data))
            }
        }
    
    def _extract_features(self, yolo_results: Dict[str, Any]) -> np.ndarray:
        features = []
        
        features.append(len(yolo_results.get('detections', [])))
        
        confidence_scores = yolo_results.get('confidence_scores', [])
        features.extend([
            np.mean(confidence_scores) if confidence_scores else 0,
            np.std(confidence_scores) if confidence_scores else 0,
            np.max(confidence_scores) if confidence_scores else 0,
            np.min(confidence_scores) if confidence_scores else 0
        ])
        
        classes = yolo_results.get('classes', [])
        unique_classes = len(set(classes))
        features.append(unique_classes)
        
        for i in range(80):
            features.append(classes.count(i) if classes else 0)
        
        boxes = yolo_results.get('boxes', [])
        if boxes:
            boxes_array = np.array(boxes)
            if boxes_array.size > 0:
                features.extend([
                    np.mean(boxes_array[:, 2] - boxes_array[:, 0]),
                    np.mean(boxes_array[:, 3] - boxes_array[:, 1]),
                    np.std(boxes_array[:, 2] - boxes_array[:, 0]),
                    np.std(boxes_array[:, 3] - boxes_array[:, 1])
                ])
            else:
                features.extend([0, 0, 0, 0])
        else:
            features.extend([0, 0, 0, 0])
        
        while len(features) < 512:
            features.append(0)
        
        return np.array(features[:512])
    
    def _extract_basic_features(self, data: np.ndarray) -> np.ndarray:
        features = []
        
        features.extend([
            np.mean(data),
            np.std(data),
            np.min(data),
            np.max(data),
            np.median(data)
        ])
        
        hist, _ = np.histogram(data.flatten(), bins=50)
        features.extend(hist.tolist())
        
        if len(data.shape) > 1:
            features.extend([
                np.mean(np.gradient(data)),
                np.std(np.gradient(data))
            ])
        
        while len(features) < 512:
            features.append(0)
        
        return np.array(features[:512])
    
    def _apply_adaptive_model(self, features: np.ndarray) -> Dict[str, Any]:
        self.adaptive_model.eval()
        
        with torch.no_grad():
            features_tensor = torch.FloatTensor(features).unsqueeze(0).to(self.device)
            output = self.adaptive_model(features_tensor)
            
            probabilities = torch.softmax(output, dim=-1).cpu().numpy()[0]
            
        return {
            'probabilities': probabilities.tolist(),
            'max_probability': float(np.max(probabilities)),
            'predicted_class': int(np.argmax(probabilities)),
            'entropy': float(-np.sum(probabilities * np.log(probabilities + 1e-10)))
        }
    
    def _calculate_confidence_scores(self, results: Dict[str, Any]) -> Dict[str, float]:
        return {
            'overall_confidence': results.get('max_probability', 0),
            'uncertainty': 1 - results.get('max_probability', 0),
            'entropy': results.get('entropy', 0),
            'prediction_variance': float(np.var(results.get('probabilities', [0])))
        }
    
    def _collect_feedback(self, yolo_results: Dict[str, Any], enhanced_results: Dict[str, Any]):
        feedback = {
            'timestamp': datetime.now().isoformat(),
            'yolo_detections': len(yolo_results.get('detections', [])),
            'enhanced_prediction': enhanced_results.get('predicted_class'),
            'confidence': enhanced_results.get('max_probability'),
            'entropy': enhanced_results.get('entropy')
        }
        
        self.feedback_buffer.append(feedback)
    
    def _batch_update(self):
        if len(self.feedback_buffer) < self.batch_size:
            return
        
        batch = list(self.feedback_buffer)[:self.batch_size]
        
        logger.info(f"Performing batch update with {len(batch)} samples")
    
    def _save_model_checkpoint(self):
        checkpoint = {
            'model_state_dict': self.adaptive_model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'performance_history': self.performance_history,
            'timestamp': datetime.now().isoformat()
        }
        
        checkpoint_path = Path(f"./models/checkpoints/adaptive_model_{len(self.model_versions)}.pt")
        checkpoint_path.parent.mkdir(parents=True, exist_ok=True)
        
        torch.save(checkpoint, checkpoint_path)
        self.model_versions.append(checkpoint_path)
        
        logger.info(f"Saved model checkpoint to {checkpoint_path}")
    
    def load_checkpoint(self, checkpoint_path: str):
        checkpoint = torch.load(checkpoint_path, map_location=self.device)
        
        self.adaptive_model.load_state_dict(checkpoint['model_state_dict'])
        self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        self.performance_history = checkpoint.get('performance_history', [])
        
        logger.info(f"Loaded checkpoint from {checkpoint_path}")