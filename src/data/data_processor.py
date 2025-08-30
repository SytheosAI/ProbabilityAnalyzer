import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional, Union, Tuple
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler
from sklearn.decomposition import PCA
from sklearn.feature_selection import SelectKBest, f_classif, mutual_info_classif
import h5py
import pickle
import json
from pathlib import Path
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class DataProcessor:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.batch_size = config.get('batch_size', 32)
        self.validation_split = config.get('validation_split', 0.2)
        self.test_split = config.get('test_split', 0.1)
        self.cache_dir = Path(config.get('cache_dir', './data/cache'))
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        self.scalers = {}
        self.encoders = {}
        self.feature_selectors = {}
        
    def ingest_data(self, 
                   source: Union[str, pd.DataFrame, np.ndarray],
                   data_type: str = 'auto') -> pd.DataFrame:
        if isinstance(source, str):
            if source.endswith('.csv'):
                data = pd.read_csv(source)
            elif source.endswith('.json'):
                data = pd.read_json(source)
            elif source.endswith('.parquet'):
                data = pd.read_parquet(source)
            elif source.endswith('.h5') or source.endswith('.hdf5'):
                data = self._read_hdf5(source)
            else:
                raise ValueError(f"Unsupported file format: {source}")
        elif isinstance(source, pd.DataFrame):
            data = source
        elif isinstance(source, np.ndarray):
            data = pd.DataFrame(source)
        else:
            raise ValueError(f"Unsupported data type: {type(source)}")
        
        logger.info(f"Ingested data with shape: {data.shape}")
        return data
    
    def preprocess_data(self,
                       data: pd.DataFrame,
                       target_column: Optional[str] = None,
                       scaling_method: str = 'standard',
                       handle_missing: str = 'mean',
                       feature_selection: Optional[Dict[str, Any]] = None) -> Tuple[np.ndarray, Optional[np.ndarray]]:
        
        data = self._handle_missing_values(data, method=handle_missing)
        
        data = self._encode_categorical(data)
        
        if target_column:
            X = data.drop(columns=[target_column])
            y = data[target_column].values
        else:
            X = data
            y = None
        
        X_scaled = self._scale_features(X, method=scaling_method)
        
        if feature_selection:
            X_scaled = self._select_features(X_scaled, y, **feature_selection)
        
        return X_scaled, y
    
    def create_sequences(self,
                        data: np.ndarray,
                        sequence_length: int,
                        stride: int = 1,
                        target_offset: int = 1) -> Tuple[np.ndarray, np.ndarray]:
        sequences = []
        targets = []
        
        for i in range(0, len(data) - sequence_length - target_offset + 1, stride):
            seq = data[i:i + sequence_length]
            target = data[i + sequence_length:i + sequence_length + target_offset]
            sequences.append(seq)
            targets.append(target)
        
        return np.array(sequences), np.array(targets)
    
    def create_batches(self,
                      X: np.ndarray,
                      y: Optional[np.ndarray] = None,
                      batch_size: Optional[int] = None,
                      shuffle: bool = True) -> List[Tuple[np.ndarray, Optional[np.ndarray]]]:
        if batch_size is None:
            batch_size = self.batch_size
        
        n_samples = len(X)
        indices = np.arange(n_samples)
        
        if shuffle:
            np.random.shuffle(indices)
        
        batches = []
        for start_idx in range(0, n_samples, batch_size):
            end_idx = min(start_idx + batch_size, n_samples)
            batch_indices = indices[start_idx:end_idx]
            
            X_batch = X[batch_indices]
            y_batch = y[batch_indices] if y is not None else None
            
            batches.append((X_batch, y_batch))
        
        return batches
    
    def split_data(self,
                  X: np.ndarray,
                  y: Optional[np.ndarray] = None) -> Dict[str, Tuple[np.ndarray, Optional[np.ndarray]]]:
        n_samples = len(X)
        
        test_size = int(n_samples * self.test_split)
        val_size = int(n_samples * self.validation_split)
        train_size = n_samples - test_size - val_size
        
        indices = np.random.permutation(n_samples)
        
        train_idx = indices[:train_size]
        val_idx = indices[train_size:train_size + val_size]
        test_idx = indices[train_size + val_size:]
        
        splits = {
            'train': (X[train_idx], y[train_idx] if y is not None else None),
            'validation': (X[val_idx], y[val_idx] if y is not None else None),
            'test': (X[test_idx], y[test_idx] if y is not None else None)
        }
        
        return splits
    
    def augment_data(self,
                    X: np.ndarray,
                    augmentation_factor: float = 2.0,
                    noise_level: float = 0.01,
                    methods: List[str] = ['noise', 'scaling', 'rotation']) -> np.ndarray:
        augmented_data = [X]
        
        n_augmentations = int(augmentation_factor) - 1
        
        for _ in range(n_augmentations):
            aug_X = X.copy()
            
            if 'noise' in methods:
                noise = np.random.normal(0, noise_level, X.shape)
                aug_X += noise
            
            if 'scaling' in methods:
                scale_factor = np.random.uniform(0.9, 1.1)
                aug_X *= scale_factor
            
            if 'rotation' in methods and X.ndim >= 2:
                angle = np.random.uniform(-10, 10)
                aug_X = self._rotate_data(aug_X, angle)
            
            if 'shift' in methods:
                shift = np.random.randint(-5, 5)
                aug_X = np.roll(aug_X, shift, axis=0)
            
            augmented_data.append(aug_X)
        
        return np.vstack(augmented_data)
    
    def cache_data(self, data: Any, key: str) -> None:
        cache_path = self.cache_dir / f"{key}.pkl"
        with open(cache_path, 'wb') as f:
            pickle.dump(data, f)
        logger.info(f"Cached data to {cache_path}")
    
    def load_cached_data(self, key: str) -> Optional[Any]:
        cache_path = self.cache_dir / f"{key}.pkl"
        if cache_path.exists():
            with open(cache_path, 'rb') as f:
                data = pickle.load(f)
            logger.info(f"Loaded cached data from {cache_path}")
            return data
        return None
    
    def stream_data(self,
                   source: str,
                   chunk_size: int = 1000,
                   preprocessor: Optional[callable] = None):
        if source.endswith('.csv'):
            for chunk in pd.read_csv(source, chunksize=chunk_size):
                if preprocessor:
                    chunk = preprocessor(chunk)
                yield chunk
        else:
            raise ValueError(f"Streaming not supported for {source}")
    
    def merge_datasets(self,
                      datasets: List[pd.DataFrame],
                      merge_strategy: str = 'concat',
                      keys: Optional[List[str]] = None) -> pd.DataFrame:
        if merge_strategy == 'concat':
            return pd.concat(datasets, ignore_index=True)
        elif merge_strategy == 'join' and keys:
            result = datasets[0]
            for i in range(1, len(datasets)):
                result = pd.merge(result, datasets[i], on=keys[i-1], how='outer')
            return result
        else:
            raise ValueError(f"Unknown merge strategy: {merge_strategy}")
    
    def _handle_missing_values(self, data: pd.DataFrame, method: str) -> pd.DataFrame:
        if method == 'mean':
            return data.fillna(data.mean())
        elif method == 'median':
            return data.fillna(data.median())
        elif method == 'mode':
            return data.fillna(data.mode().iloc[0])
        elif method == 'forward_fill':
            return data.fillna(method='ffill')
        elif method == 'backward_fill':
            return data.fillna(method='bfill')
        elif method == 'interpolate':
            return data.interpolate()
        elif method == 'drop':
            return data.dropna()
        else:
            return data
    
    def _encode_categorical(self, data: pd.DataFrame) -> pd.DataFrame:
        categorical_columns = data.select_dtypes(include=['object']).columns
        
        for col in categorical_columns:
            if col not in self.encoders:
                unique_values = data[col].unique()
                self.encoders[col] = {val: i for i, val in enumerate(unique_values)}
            
            data[col] = data[col].map(self.encoders[col])
        
        return data
    
    def _scale_features(self, X: pd.DataFrame, method: str) -> np.ndarray:
        if method not in self.scalers:
            if method == 'standard':
                self.scalers[method] = StandardScaler()
            elif method == 'minmax':
                self.scalers[method] = MinMaxScaler()
            elif method == 'robust':
                self.scalers[method] = RobustScaler()
            else:
                raise ValueError(f"Unknown scaling method: {method}")
            
            X_scaled = self.scalers[method].fit_transform(X)
        else:
            X_scaled = self.scalers[method].transform(X)
        
        return X_scaled
    
    def _select_features(self,
                        X: np.ndarray,
                        y: Optional[np.ndarray],
                        method: str = 'kbest',
                        k: int = 10) -> np.ndarray:
        if y is None:
            return X
        
        key = f"{method}_{k}"
        
        if key not in self.feature_selectors:
            if method == 'kbest':
                self.feature_selectors[key] = SelectKBest(f_classif, k=k)
            elif method == 'mutual_info':
                self.feature_selectors[key] = SelectKBest(mutual_info_classif, k=k)
            elif method == 'pca':
                self.feature_selectors[key] = PCA(n_components=k)
            else:
                return X
            
            X_selected = self.feature_selectors[key].fit_transform(X, y)
        else:
            X_selected = self.feature_selectors[key].transform(X)
        
        return X_selected
    
    def _rotate_data(self, X: np.ndarray, angle: float) -> np.ndarray:
        if X.ndim < 2:
            return X
        
        angle_rad = np.radians(angle)
        cos_angle = np.cos(angle_rad)
        sin_angle = np.sin(angle_rad)
        
        rotation_matrix = np.array([
            [cos_angle, -sin_angle],
            [sin_angle, cos_angle]
        ])
        
        if X.shape[1] >= 2:
            X_rotated = X.copy()
            X_rotated[:, :2] = X[:, :2] @ rotation_matrix.T
            return X_rotated
        
        return X
    
    def _read_hdf5(self, filepath: str) -> pd.DataFrame:
        with h5py.File(filepath, 'r') as f:
            data_dict = {}
            for key in f.keys():
                data_dict[key] = f[key][()]
            return pd.DataFrame(data_dict)
    
    def validate_data(self, data: pd.DataFrame) -> Dict[str, Any]:
        validation_results = {
            'shape': data.shape,
            'dtypes': data.dtypes.to_dict(),
            'missing_values': data.isnull().sum().to_dict(),
            'duplicates': data.duplicated().sum(),
            'memory_usage': data.memory_usage(deep=True).sum() / 1024**2,
            'numeric_stats': data.describe().to_dict() if len(data.select_dtypes(include=[np.number]).columns) > 0 else {},
        }
        
        return validation_results