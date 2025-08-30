"""
ML Model Persistence Layer
Handles saving, loading, and versioning of machine learning models
"""

import os
import pickle
import joblib
import json
import hashlib
import logging
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime
import numpy as np
import pandas as pd
from pathlib import Path
import torch
import tensorflow as tf
from dataclasses import dataclass, asdict
import boto3
from botocore.exceptions import NoCredentialsError
try:
    import xgboost as xgb
except ImportError:
    xgb = None
try:
    import lightgbm as lgb
except ImportError:
    lgb = None

# Import database connection
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database.connection import get_db_manager

logger = logging.getLogger(__name__)

@dataclass
class ModelMetadata:
    """Model metadata structure"""
    model_id: str
    model_name: str
    model_type: str  # 'sklearn', 'pytorch', 'tensorflow', 'xgboost'
    version: str
    created_at: datetime
    updated_at: datetime
    performance_metrics: Dict[str, float]
    training_params: Dict[str, Any]
    feature_names: List[str]
    target_name: str
    file_path: str
    checksum: str
    is_active: bool = True
    description: str = ""


class ModelPersistenceManager:
    """Manages ML model persistence and versioning"""
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.db = get_db_manager()
        
        # Storage settings
        self.local_path = Path(self.config.get('model_path', './models'))
        self.local_path.mkdir(parents=True, exist_ok=True)
        
        # S3 settings (optional)
        self.use_s3 = self.config.get('use_s3', False)
        if self.use_s3:
            self.s3_bucket = self.config.get('s3_bucket')
            self.s3_client = boto3.client('s3')
        
        # Initialize database tables
        self._init_database()
    
    def _init_database(self):
        """Initialize database tables for model tracking"""
        try:
            # Check if model_registry table exists
            check_query = """
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'model_registry'
                );
            """
            
            result = self.db.execute_query(check_query)
            
            if not result[0]['exists']:
                # Create model_registry table
                create_table = """
                    CREATE TABLE model_registry (
                        model_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        model_name VARCHAR(100) NOT NULL,
                        model_type VARCHAR(50) NOT NULL,
                        version VARCHAR(20) NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        performance_metrics JSONB,
                        training_params JSONB,
                        feature_names TEXT[],
                        target_name VARCHAR(100),
                        file_path TEXT,
                        checksum VARCHAR(64),
                        is_active BOOLEAN DEFAULT true,
                        description TEXT,
                        UNIQUE(model_name, version)
                    );
                    
                    CREATE INDEX idx_model_name ON model_registry(model_name);
                    CREATE INDEX idx_model_active ON model_registry(is_active);
                    CREATE INDEX idx_model_created ON model_registry(created_at DESC);
                """
                self.db.execute_update(create_table)
                
                # Create model_predictions table for tracking
                create_predictions = """
                    CREATE TABLE model_predictions (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        model_id UUID REFERENCES model_registry(model_id),
                        prediction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        input_data JSONB,
                        prediction JSONB,
                        actual_outcome JSONB,
                        confidence DECIMAL(5,4),
                        processing_time_ms INTEGER
                    );
                    
                    CREATE INDEX idx_predictions_model ON model_predictions(model_id);
                    CREATE INDEX idx_predictions_time ON model_predictions(prediction_time DESC);
                """
                self.db.execute_update(create_predictions)
                
                logger.info("Model persistence tables created")
        
        except Exception as e:
            logger.error(f"Failed to initialize model persistence tables: {e}")
            raise
    
    def _calculate_checksum(self, file_path: Path) -> str:
        """Calculate SHA256 checksum of model file"""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    
    def save_sklearn_model(self, 
                          model: Any,
                          model_name: str,
                          version: str = None,
                          metrics: Dict[str, float] = None,
                          params: Dict[str, Any] = None,
                          feature_names: List[str] = None,
                          target_name: str = None,
                          description: str = "") -> ModelMetadata:
        """Save scikit-learn model"""
        
        if version is None:
            version = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Create file path
        filename = f"{model_name}_{version}.joblib"
        file_path = self.local_path / filename
        
        # Save model
        joblib.dump(model, file_path)
        
        # Calculate checksum
        checksum = self._calculate_checksum(file_path)
        
        # Upload to S3 if configured
        if self.use_s3:
            self._upload_to_s3(file_path, f"models/{filename}")
        
        # Create metadata
        metadata = ModelMetadata(
            model_id=str(hashlib.md5(f"{model_name}_{version}".encode()).hexdigest()),
            model_name=model_name,
            model_type='sklearn',
            version=version,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            performance_metrics=metrics or {},
            training_params=params or {},
            feature_names=feature_names or [],
            target_name=target_name or '',
            file_path=str(file_path),
            checksum=checksum,
            is_active=True,
            description=description
        )
        
        # Save to database
        self._save_metadata_to_db(metadata)
        
        logger.info(f"Saved sklearn model: {model_name} v{version}")
        return metadata
    
    def save_pytorch_model(self,
                          model: torch.nn.Module,
                          model_name: str,
                          version: str = None,
                          metrics: Dict[str, float] = None,
                          params: Dict[str, Any] = None,
                          feature_names: List[str] = None,
                          target_name: str = None,
                          description: str = "",
                          save_entire_model: bool = False) -> ModelMetadata:
        """Save PyTorch model"""
        
        if version is None:
            version = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Create file path
        filename = f"{model_name}_{version}.pth"
        file_path = self.local_path / filename
        
        # Save model
        if save_entire_model:
            torch.save(model, file_path)
        else:
            torch.save(model.state_dict(), file_path)
        
        # Calculate checksum
        checksum = self._calculate_checksum(file_path)
        
        # Upload to S3 if configured
        if self.use_s3:
            self._upload_to_s3(file_path, f"models/{filename}")
        
        # Create metadata
        metadata = ModelMetadata(
            model_id=str(hashlib.md5(f"{model_name}_{version}".encode()).hexdigest()),
            model_name=model_name,
            model_type='pytorch',
            version=version,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            performance_metrics=metrics or {},
            training_params=params or {},
            feature_names=feature_names or [],
            target_name=target_name or '',
            file_path=str(file_path),
            checksum=checksum,
            is_active=True,
            description=description
        )
        
        # Save to database
        self._save_metadata_to_db(metadata)
        
        logger.info(f"Saved PyTorch model: {model_name} v{version}")
        return metadata
    
    def save_tensorflow_model(self,
                             model: tf.keras.Model,
                             model_name: str,
                             version: str = None,
                             metrics: Dict[str, float] = None,
                             params: Dict[str, Any] = None,
                             feature_names: List[str] = None,
                             target_name: str = None,
                             description: str = "") -> ModelMetadata:
        """Save TensorFlow/Keras model"""
        
        if version is None:
            version = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Create directory path for TF SavedModel format
        dir_name = f"{model_name}_{version}"
        dir_path = self.local_path / dir_name
        
        # Save model
        model.save(dir_path)
        
        # Calculate checksum (of the saved model directory)
        # For simplicity, we'll create a checksum of the model config
        model_config = model.to_json()
        checksum = hashlib.sha256(model_config.encode()).hexdigest()
        
        # Upload to S3 if configured
        if self.use_s3:
            # For TF models, we'd need to zip the directory first
            import zipfile
            zip_path = self.local_path / f"{dir_name}.zip"
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for root, dirs, files in os.walk(dir_path):
                    for file in files:
                        file_path = os.path.join(root, file)
                        zipf.write(file_path, os.path.relpath(file_path, self.local_path))
            self._upload_to_s3(zip_path, f"models/{dir_name}.zip")
        
        # Create metadata
        metadata = ModelMetadata(
            model_id=str(hashlib.md5(f"{model_name}_{version}".encode()).hexdigest()),
            model_name=model_name,
            model_type='tensorflow',
            version=version,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            performance_metrics=metrics or {},
            training_params=params or {},
            feature_names=feature_names or [],
            target_name=target_name or '',
            file_path=str(dir_path),
            checksum=checksum,
            is_active=True,
            description=description
        )
        
        # Save to database
        self._save_metadata_to_db(metadata)
        
        logger.info(f"Saved TensorFlow model: {model_name} v{version}")
        return metadata
    
    def load_sklearn_model(self, model_name: str, version: str = None) -> Tuple[Any, ModelMetadata]:
        """Load scikit-learn model"""
        metadata = self._get_model_metadata(model_name, version)
        
        if not metadata:
            raise ValueError(f"Model {model_name} v{version} not found")
        
        file_path = Path(metadata.file_path)
        
        # Download from S3 if needed
        if self.use_s3 and not file_path.exists():
            self._download_from_s3(f"models/{file_path.name}", file_path)
        
        # Load model
        model = joblib.load(file_path)
        
        logger.info(f"Loaded sklearn model: {model_name} v{metadata.version}")
        return model, metadata
    
    def load_pytorch_model(self, 
                          model_class: type,
                          model_name: str,
                          version: str = None,
                          **model_kwargs) -> Tuple[torch.nn.Module, ModelMetadata]:
        """Load PyTorch model"""
        metadata = self._get_model_metadata(model_name, version)
        
        if not metadata:
            raise ValueError(f"Model {model_name} v{version} not found")
        
        file_path = Path(metadata.file_path)
        
        # Download from S3 if needed
        if self.use_s3 and not file_path.exists():
            self._download_from_s3(f"models/{file_path.name}", file_path)
        
        # Load model
        model = model_class(**model_kwargs)
        model.load_state_dict(torch.load(file_path))
        model.eval()
        
        logger.info(f"Loaded PyTorch model: {model_name} v{metadata.version}")
        return model, metadata
    
    def load_tensorflow_model(self, model_name: str, version: str = None) -> Tuple[tf.keras.Model, ModelMetadata]:
        """Load TensorFlow/Keras model"""
        metadata = self._get_model_metadata(model_name, version)
        
        if not metadata:
            raise ValueError(f"Model {model_name} v{version} not found")
        
        dir_path = Path(metadata.file_path)
        
        # Download from S3 if needed
        if self.use_s3 and not dir_path.exists():
            zip_path = self.local_path / f"{dir_path.name}.zip"
            self._download_from_s3(f"models/{dir_path.name}.zip", zip_path)
            
            # Extract zip
            import zipfile
            with zipfile.ZipFile(zip_path, 'r') as zipf:
                zipf.extractall(self.local_path)
        
        # Load model
        model = tf.keras.models.load_model(dir_path)
        
        logger.info(f"Loaded TensorFlow model: {model_name} v{metadata.version}")
        return model, metadata
    
    def save_xgboost_model(self,
                          model,
                          model_name: str,
                          version: str = None,
                          metrics: Dict[str, float] = None,
                          params: Dict[str, Any] = None,
                          feature_names: List[str] = None,
                          target_name: str = None,
                          description: str = "") -> ModelMetadata:
        """Save XGBoost model"""
        
        if xgb is None:
            raise ImportError("XGBoost not installed")
        
        if version is None:
            version = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Create file path
        filename = f"{model_name}_{version}.json"
        file_path = self.local_path / filename
        
        # Save model
        model.save_model(str(file_path))
        
        # Calculate checksum
        checksum = self._calculate_checksum(file_path)
        
        # Upload to S3 if configured
        if self.use_s3:
            self._upload_to_s3(file_path, f"models/{filename}")
        
        # Create metadata
        metadata = ModelMetadata(
            model_id=str(hashlib.md5(f"{model_name}_{version}".encode()).hexdigest()),
            model_name=model_name,
            model_type='xgboost',
            version=version,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            performance_metrics=metrics or {},
            training_params=params or model.get_params() if hasattr(model, 'get_params') else {},
            feature_names=feature_names or [],
            target_name=target_name or '',
            file_path=str(file_path),
            checksum=checksum,
            is_active=True,
            description=description
        )
        
        # Save to database
        self._save_metadata_to_db(metadata)
        
        logger.info(f"Saved XGBoost model: {model_name} v{version}")
        return metadata
    
    def save_lightgbm_model(self,
                           model,
                           model_name: str,
                           version: str = None,
                           metrics: Dict[str, float] = None,
                           params: Dict[str, Any] = None,
                           feature_names: List[str] = None,
                           target_name: str = None,
                           description: str = "") -> ModelMetadata:
        """Save LightGBM model"""
        
        if lgb is None:
            raise ImportError("LightGBM not installed")
        
        if version is None:
            version = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Create file path
        filename = f"{model_name}_{version}.txt"
        file_path = self.local_path / filename
        
        # Save model
        model.save_model(str(file_path))
        
        # Calculate checksum
        checksum = self._calculate_checksum(file_path)
        
        # Upload to S3 if configured
        if self.use_s3:
            self._upload_to_s3(file_path, f"models/{filename}")
        
        # Create metadata
        metadata = ModelMetadata(
            model_id=str(hashlib.md5(f"{model_name}_{version}".encode()).hexdigest()),
            model_name=model_name,
            model_type='lightgbm',
            version=version,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            performance_metrics=metrics or {},
            training_params=params or model.get_params() if hasattr(model, 'get_params') else {},
            feature_names=feature_names or [],
            target_name=target_name or '',
            file_path=str(file_path),
            checksum=checksum,
            is_active=True,
            description=description
        )
        
        # Save to database
        self._save_metadata_to_db(metadata)
        
        logger.info(f"Saved LightGBM model: {model_name} v{version}")
        return metadata
    
    def load_xgboost_model(self, model_name: str, version: str = None) -> Tuple[Any, ModelMetadata]:
        """Load XGBoost model"""
        
        if xgb is None:
            raise ImportError("XGBoost not installed")
        
        metadata = self._get_model_metadata(model_name, version)
        
        if not metadata:
            raise ValueError(f"Model {model_name} v{version} not found")
        
        file_path = Path(metadata.file_path)
        
        # Download from S3 if needed
        if self.use_s3 and not file_path.exists():
            self._download_from_s3(f"models/{file_path.name}", file_path)
        
        # Load model
        model = xgb.Booster()
        model.load_model(str(file_path))
        
        logger.info(f"Loaded XGBoost model: {model_name} v{metadata.version}")
        return model, metadata
    
    def load_lightgbm_model(self, model_name: str, version: str = None) -> Tuple[Any, ModelMetadata]:
        """Load LightGBM model"""
        
        if lgb is None:
            raise ImportError("LightGBM not installed")
        
        metadata = self._get_model_metadata(model_name, version)
        
        if not metadata:
            raise ValueError(f"Model {model_name} v{version} not found")
        
        file_path = Path(metadata.file_path)
        
        # Download from S3 if needed
        if self.use_s3 and not file_path.exists():
            self._download_from_s3(f"models/{file_path.name}", file_path)
        
        # Load model
        model = lgb.Booster(model_file=str(file_path))
        
        logger.info(f"Loaded LightGBM model: {model_name} v{metadata.version}")
        return model, metadata
    
    def _save_metadata_to_db(self, metadata: ModelMetadata):
        """Save model metadata to database"""
        query = """
            INSERT INTO model_registry (
                model_id, model_name, model_type, version,
                created_at, updated_at, performance_metrics,
                training_params, feature_names, target_name,
                file_path, checksum, is_active, description
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (model_name, version) 
            DO UPDATE SET
                updated_at = EXCLUDED.updated_at,
                performance_metrics = EXCLUDED.performance_metrics,
                training_params = EXCLUDED.training_params,
                is_active = EXCLUDED.is_active
        """
        
        params = (
            metadata.model_id,
            metadata.model_name,
            metadata.model_type,
            metadata.version,
            metadata.created_at,
            metadata.updated_at,
            json.dumps(metadata.performance_metrics),
            json.dumps(metadata.training_params),
            metadata.feature_names,
            metadata.target_name,
            metadata.file_path,
            metadata.checksum,
            metadata.is_active,
            metadata.description
        )
        
        self.db.execute_update(query, params)
    
    def _get_model_metadata(self, model_name: str, version: str = None) -> Optional[ModelMetadata]:
        """Get model metadata from database"""
        if version:
            query = """
                SELECT * FROM model_registry 
                WHERE model_name = %s AND version = %s
            """
            params = (model_name, version)
        else:
            # Get latest active version
            query = """
                SELECT * FROM model_registry 
                WHERE model_name = %s AND is_active = true
                ORDER BY created_at DESC
                LIMIT 1
            """
            params = (model_name,)
        
        results = self.db.execute_query(query, params)
        
        if not results:
            return None
        
        row = results[0]
        return ModelMetadata(
            model_id=row['model_id'],
            model_name=row['model_name'],
            model_type=row['model_type'],
            version=row['version'],
            created_at=row['created_at'],
            updated_at=row['updated_at'],
            performance_metrics=row['performance_metrics'],
            training_params=row['training_params'],
            feature_names=row['feature_names'],
            target_name=row['target_name'],
            file_path=row['file_path'],
            checksum=row['checksum'],
            is_active=row['is_active'],
            description=row.get('description', '')
        )
    
    def list_models(self, model_name: str = None, active_only: bool = True) -> List[ModelMetadata]:
        """List available models"""
        if model_name:
            if active_only:
                query = "SELECT * FROM model_registry WHERE model_name = %s AND is_active = true ORDER BY created_at DESC"
                params = (model_name,)
            else:
                query = "SELECT * FROM model_registry WHERE model_name = %s ORDER BY created_at DESC"
                params = (model_name,)
        else:
            if active_only:
                query = "SELECT * FROM model_registry WHERE is_active = true ORDER BY model_name, created_at DESC"
                params = ()
            else:
                query = "SELECT * FROM model_registry ORDER BY model_name, created_at DESC"
                params = ()
        
        results = self.db.execute_query(query, params)
        
        models = []
        for row in results:
            models.append(ModelMetadata(
                model_id=row['model_id'],
                model_name=row['model_name'],
                model_type=row['model_type'],
                version=row['version'],
                created_at=row['created_at'],
                updated_at=row['updated_at'],
                performance_metrics=row['performance_metrics'],
                training_params=row['training_params'],
                feature_names=row['feature_names'],
                target_name=row['target_name'],
                file_path=row['file_path'],
                checksum=row['checksum'],
                is_active=row['is_active'],
                description=row.get('description', '')
            ))
        
        return models
    
    def track_prediction(self,
                        model_id: str,
                        input_data: Dict[str, Any],
                        prediction: Any,
                        confidence: float = None,
                        processing_time_ms: int = None):
        """Track model prediction for monitoring"""
        query = """
            INSERT INTO model_predictions (
                model_id, input_data, prediction, confidence, processing_time_ms
            ) VALUES (%s, %s, %s, %s, %s)
        """
        
        params = (
            model_id,
            json.dumps(input_data),
            json.dumps(prediction) if not isinstance(prediction, str) else prediction,
            confidence,
            processing_time_ms
        )
        
        self.db.execute_update(query, params)
    
    def update_prediction_outcome(self, prediction_id: str, actual_outcome: Any):
        """Update prediction with actual outcome for accuracy tracking"""
        query = """
            UPDATE model_predictions 
            SET actual_outcome = %s
            WHERE id = %s
        """
        
        params = (
            json.dumps(actual_outcome) if not isinstance(actual_outcome, str) else actual_outcome,
            prediction_id
        )
        
        self.db.execute_update(query, params)
    
    def _upload_to_s3(self, file_path: Path, s3_key: str):
        """Upload file to S3"""
        try:
            self.s3_client.upload_file(str(file_path), self.s3_bucket, s3_key)
            logger.info(f"Uploaded {file_path.name} to S3")
        except NoCredentialsError:
            logger.error("S3 credentials not available")
        except Exception as e:
            logger.error(f"Failed to upload to S3: {e}")
    
    def _download_from_s3(self, s3_key: str, file_path: Path):
        """Download file from S3"""
        try:
            self.s3_client.download_file(self.s3_bucket, s3_key, str(file_path))
            logger.info(f"Downloaded {s3_key} from S3")
        except NoCredentialsError:
            logger.error("S3 credentials not available")
        except Exception as e:
            logger.error(f"Failed to download from S3: {e}")


# Singleton instance
_model_manager = None

def get_model_manager() -> ModelPersistenceManager:
    """Get singleton model persistence manager"""
    global _model_manager
    if _model_manager is None:
        _model_manager = ModelPersistenceManager()
    return _model_manager