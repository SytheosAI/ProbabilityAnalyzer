import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple, Optional, Union
from scipy.signal import find_peaks, correlate
from scipy.spatial.distance import euclidean, cosine
from sklearn.cluster import DBSCAN, KMeans
from sklearn.decomposition import PCA
from dtaidistance import dtw
import stumpy
from collections import defaultdict, Counter
import logging
from dataclasses import dataclass
import hashlib

logger = logging.getLogger(__name__)

@dataclass
class Pattern:
    pattern_id: str
    sequence: np.ndarray
    start_index: int
    end_index: int
    frequency: int
    confidence: float
    metadata: Dict[str, Any]

class PatternRecognitionEngine:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.window_size = config.get('window_size', 100)
        self.stride = config.get('stride', 10)
        self.min_pattern_length = config.get('min_pattern_length', 3)
        self.max_pattern_length = config.get('max_pattern_length', 50)
        self.similarity_threshold = config.get('similarity_threshold', 0.85)
        
        self.discovered_patterns = {}
        self.pattern_index = defaultdict(list)
        self.pattern_frequencies = Counter()
        self.pattern_cache = {}
        
    def discover_patterns(self,
                         time_series: np.ndarray,
                         method: str = 'matrix_profile') -> List[Pattern]:
        if method == 'matrix_profile':
            patterns = self._matrix_profile_discovery(time_series)
        elif method == 'sliding_window':
            patterns = self._sliding_window_discovery(time_series)
        elif method == 'peak_based':
            patterns = self._peak_based_discovery(time_series)
        elif method == 'clustering':
            patterns = self._clustering_discovery(time_series)
        else:
            patterns = self._ensemble_discovery(time_series)
        
        for pattern in patterns:
            self._store_pattern(pattern)
        
        return patterns
    
    def find_similar_patterns(self,
                             query_pattern: np.ndarray,
                             search_space: np.ndarray,
                             top_k: int = 5) -> List[Dict[str, Any]]:
        similarities = []
        
        for i in range(0, len(search_space) - len(query_pattern) + 1, self.stride):
            window = search_space[i:i + len(query_pattern)]
            
            similarity = self._calculate_similarity(query_pattern, window)
            
            if similarity >= self.similarity_threshold:
                similarities.append({
                    'index': i,
                    'similarity': similarity,
                    'window': window,
                    'distance': self._calculate_distance(query_pattern, window)
                })
        
        similarities.sort(key=lambda x: x['similarity'], reverse=True)
        return similarities[:top_k]
    
    def predict_next_pattern(self,
                            current_sequence: np.ndarray,
                            pattern_history: Optional[List[Pattern]] = None) -> Dict[str, Any]:
        matching_patterns = self._find_matching_patterns(current_sequence)
        
        if not matching_patterns:
            return {
                'predicted_pattern': None,
                'confidence': 0.0,
                'alternatives': []
            }
        
        predictions = []
        
        for pattern in matching_patterns:
            extended_pattern = self._get_extended_pattern(pattern)
            if extended_pattern is not None:
                next_values = extended_pattern[len(current_sequence):]
                predictions.append({
                    'pattern': pattern,
                    'next_values': next_values,
                    'confidence': pattern.confidence * self._calculate_match_score(current_sequence, pattern.sequence)
                })
        
        predictions.sort(key=lambda x: x['confidence'], reverse=True)
        
        if predictions:
            best_prediction = predictions[0]
            return {
                'predicted_pattern': best_prediction['next_values'],
                'confidence': best_prediction['confidence'],
                'alternatives': predictions[1:min(4, len(predictions))]
            }
        
        return {
            'predicted_pattern': None,
            'confidence': 0.0,
            'alternatives': []
        }
    
    def analyze_pattern_probability(self,
                                  pattern: np.ndarray,
                                  historical_data: np.ndarray) -> Dict[str, float]:
        occurrences = self._count_pattern_occurrences(pattern, historical_data)
        total_windows = (len(historical_data) - len(pattern) + 1) // self.stride
        
        base_probability = occurrences / max(total_windows, 1)
        
        pattern_transitions = self._analyze_transitions(pattern, historical_data)
        
        temporal_probability = self._calculate_temporal_probability(pattern, historical_data)
        
        context_probability = self._calculate_context_probability(pattern, historical_data)
        
        combined_probability = (
            0.4 * base_probability +
            0.3 * temporal_probability +
            0.3 * context_probability
        )
        
        return {
            'base_probability': base_probability,
            'temporal_probability': temporal_probability,
            'context_probability': context_probability,
            'combined_probability': combined_probability,
            'occurrences': occurrences,
            'transitions': pattern_transitions
        }
    
    def extract_features_from_patterns(self,
                                      patterns: List[Pattern]) -> np.ndarray:
        features = []
        
        for pattern in patterns:
            pattern_features = []
            
            pattern_features.extend([
                np.mean(pattern.sequence),
                np.std(pattern.sequence),
                np.min(pattern.sequence),
                np.max(pattern.sequence),
                len(pattern.sequence),
                pattern.frequency,
                pattern.confidence
            ])
            
            fft = np.fft.fft(pattern.sequence)
            pattern_features.extend([
                np.mean(np.abs(fft)),
                np.std(np.abs(fft)),
                np.argmax(np.abs(fft))
            ])
            
            if len(pattern.sequence) > 1:
                diff = np.diff(pattern.sequence)
                pattern_features.extend([
                    np.mean(diff),
                    np.std(diff),
                    np.sum(np.abs(diff))
                ])
            else:
                pattern_features.extend([0, 0, 0])
            
            autocorr = np.correlate(pattern.sequence, pattern.sequence, mode='same')
            pattern_features.extend([
                np.max(autocorr),
                np.argmax(autocorr),
                np.mean(autocorr)
            ])
            
            features.append(pattern_features)
        
        return np.array(features)
    
    def cluster_patterns(self,
                        patterns: List[Pattern],
                        n_clusters: Optional[int] = None) -> Dict[int, List[Pattern]]:
        if len(patterns) < 2:
            return {0: patterns}
        
        features = self.extract_features_from_patterns(patterns)
        
        features_normalized = (features - np.mean(features, axis=0)) / (np.std(features, axis=0) + 1e-8)
        
        if n_clusters is None:
            clusterer = DBSCAN(eps=0.5, min_samples=2)
            labels = clusterer.fit_predict(features_normalized)
        else:
            clusterer = KMeans(n_clusters=n_clusters, random_state=42)
            labels = clusterer.fit_predict(features_normalized)
        
        clusters = defaultdict(list)
        for i, label in enumerate(labels):
            clusters[label].append(patterns[i])
        
        return dict(clusters)
    
    def calculate_pattern_entropy(self, pattern: np.ndarray) -> float:
        if len(pattern) == 0:
            return 0.0
        
        hist, _ = np.histogram(pattern, bins='auto')
        hist = hist[hist > 0]
        
        if len(hist) == 0:
            return 0.0
        
        probabilities = hist / np.sum(hist)
        entropy = -np.sum(probabilities * np.log2(probabilities + 1e-10))
        
        return entropy
    
    def _matrix_profile_discovery(self, time_series: np.ndarray) -> List[Pattern]:
        patterns = []
        
        for pattern_length in range(self.min_pattern_length, 
                                   min(self.max_pattern_length, len(time_series) // 2)):
            try:
                mp = stumpy.stump(time_series, m=pattern_length)
                
                motif_idx = np.argmin(mp[:, 0])
                motif_distance = mp[motif_idx, 0]
                
                if motif_distance < 2.0:
                    pattern_seq = time_series[motif_idx:motif_idx + pattern_length]
                    
                    pattern = Pattern(
                        pattern_id=self._generate_pattern_id(pattern_seq),
                        sequence=pattern_seq,
                        start_index=motif_idx,
                        end_index=motif_idx + pattern_length,
                        frequency=1,
                        confidence=1.0 / (1.0 + motif_distance),
                        metadata={'method': 'matrix_profile', 'distance': motif_distance}
                    )
                    patterns.append(pattern)
                    
            except Exception as e:
                logger.debug(f"Matrix profile failed for length {pattern_length}: {e}")
        
        return patterns
    
    def _sliding_window_discovery(self, time_series: np.ndarray) -> List[Pattern]:
        patterns = []
        pattern_dict = defaultdict(list)
        
        for window_start in range(0, len(time_series) - self.window_size + 1, self.stride):
            window = time_series[window_start:window_start + self.window_size]
            
            for pattern_length in range(self.min_pattern_length, 
                                       min(self.max_pattern_length, self.window_size)):
                for i in range(len(window) - pattern_length + 1):
                    subpattern = window[i:i + pattern_length]
                    pattern_hash = self._hash_pattern(subpattern)
                    pattern_dict[pattern_hash].append({
                        'sequence': subpattern,
                        'global_index': window_start + i,
                        'length': pattern_length
                    })
        
        for pattern_hash, occurrences in pattern_dict.items():
            if len(occurrences) >= 2:
                representative = occurrences[0]
                pattern = Pattern(
                    pattern_id=pattern_hash,
                    sequence=representative['sequence'],
                    start_index=representative['global_index'],
                    end_index=representative['global_index'] + representative['length'],
                    frequency=len(occurrences),
                    confidence=min(1.0, len(occurrences) / 10.0),
                    metadata={'method': 'sliding_window', 'occurrences': len(occurrences)}
                )
                patterns.append(pattern)
        
        return patterns
    
    def _peak_based_discovery(self, time_series: np.ndarray) -> List[Pattern]:
        patterns = []
        
        peaks, properties = find_peaks(time_series, distance=self.min_pattern_length)
        
        if len(peaks) < 2:
            return patterns
        
        for i in range(len(peaks) - 1):
            pattern_seq = time_series[peaks[i]:peaks[i + 1]]
            
            if self.min_pattern_length <= len(pattern_seq) <= self.max_pattern_length:
                pattern = Pattern(
                    pattern_id=self._generate_pattern_id(pattern_seq),
                    sequence=pattern_seq,
                    start_index=peaks[i],
                    end_index=peaks[i + 1],
                    frequency=1,
                    confidence=properties.get('prominences', [0.5])[i] if i < len(properties.get('prominences', [])) else 0.5,
                    metadata={'method': 'peak_based', 'peak_indices': [peaks[i], peaks[i + 1]]}
                )
                patterns.append(pattern)
        
        return patterns
    
    def _clustering_discovery(self, time_series: np.ndarray) -> List[Pattern]:
        patterns = []
        
        segments = []
        indices = []
        
        for i in range(0, len(time_series) - self.window_size + 1, self.stride):
            segment = time_series[i:i + self.window_size]
            segments.append(segment)
            indices.append(i)
        
        if len(segments) < 2:
            return patterns
        
        segments_array = np.array(segments)
        
        pca = PCA(n_components=min(10, segments_array.shape[1]))
        segments_reduced = pca.fit_transform(segments_array)
        
        clusterer = DBSCAN(eps=0.5, min_samples=2)
        labels = clusterer.fit_predict(segments_reduced)
        
        for label in set(labels):
            if label == -1:
                continue
            
            cluster_indices = np.where(labels == label)[0]
            if len(cluster_indices) >= 2:
                representative_idx = cluster_indices[0]
                pattern_seq = segments[representative_idx]
                
                pattern = Pattern(
                    pattern_id=self._generate_pattern_id(pattern_seq),
                    sequence=pattern_seq,
                    start_index=indices[representative_idx],
                    end_index=indices[representative_idx] + self.window_size,
                    frequency=len(cluster_indices),
                    confidence=len(cluster_indices) / len(segments),
                    metadata={'method': 'clustering', 'cluster_size': len(cluster_indices)}
                )
                patterns.append(pattern)
        
        return patterns
    
    def _ensemble_discovery(self, time_series: np.ndarray) -> List[Pattern]:
        all_patterns = []
        
        methods = [
            self._sliding_window_discovery,
            self._peak_based_discovery,
            self._clustering_discovery
        ]
        
        for method in methods:
            try:
                patterns = method(time_series)
                all_patterns.extend(patterns)
            except Exception as e:
                logger.debug(f"Method {method.__name__} failed: {e}")
        
        unique_patterns = self._deduplicate_patterns(all_patterns)
        
        return unique_patterns
    
    def _calculate_similarity(self, pattern1: np.ndarray, pattern2: np.ndarray) -> float:
        if len(pattern1) != len(pattern2):
            return 0.0
        
        pattern1_norm = (pattern1 - np.mean(pattern1)) / (np.std(pattern1) + 1e-8)
        pattern2_norm = (pattern2 - np.mean(pattern2)) / (np.std(pattern2) + 1e-8)
        
        correlation = np.corrcoef(pattern1_norm, pattern2_norm)[0, 1]
        
        cosine_sim = 1 - cosine(pattern1_norm, pattern2_norm)
        
        euclidean_sim = 1 / (1 + euclidean(pattern1_norm, pattern2_norm))
        
        similarity = 0.5 * correlation + 0.3 * cosine_sim + 0.2 * euclidean_sim
        
        return max(0, min(1, similarity))
    
    def _calculate_distance(self, pattern1: np.ndarray, pattern2: np.ndarray) -> float:
        try:
            distance = dtw.distance(pattern1, pattern2)
            return distance
        except:
            return euclidean(pattern1, pattern2)
    
    def _find_matching_patterns(self, sequence: np.ndarray) -> List[Pattern]:
        matching = []
        
        for pattern_id, pattern in self.discovered_patterns.items():
            if len(pattern.sequence) >= len(sequence):
                similarity = self._calculate_similarity(
                    sequence,
                    pattern.sequence[:len(sequence)]
                )
                
                if similarity >= self.similarity_threshold:
                    matching.append(pattern)
        
        return matching
    
    def _get_extended_pattern(self, pattern: Pattern) -> Optional[np.ndarray]:
        if pattern.end_index < len(pattern.sequence) + 10:
            return None
        
        return pattern.sequence
    
    def _calculate_match_score(self, sequence: np.ndarray, pattern: np.ndarray) -> float:
        min_len = min(len(sequence), len(pattern))
        return self._calculate_similarity(sequence[:min_len], pattern[:min_len])
    
    def _count_pattern_occurrences(self, pattern: np.ndarray, data: np.ndarray) -> int:
        count = 0
        
        for i in range(len(data) - len(pattern) + 1):
            window = data[i:i + len(pattern)]
            similarity = self._calculate_similarity(pattern, window)
            
            if similarity >= self.similarity_threshold:
                count += 1
        
        return count
    
    def _analyze_transitions(self, pattern: np.ndarray, data: np.ndarray) -> Dict[str, float]:
        transitions = {
            'to_higher': 0,
            'to_lower': 0,
            'to_similar': 0
        }
        
        pattern_mean = np.mean(pattern)
        
        for i in range(len(data) - len(pattern) - 1):
            window = data[i:i + len(pattern)]
            next_value = data[i + len(pattern)]
            
            similarity = self._calculate_similarity(pattern, window)
            
            if similarity >= self.similarity_threshold:
                if next_value > pattern_mean * 1.1:
                    transitions['to_higher'] += 1
                elif next_value < pattern_mean * 0.9:
                    transitions['to_lower'] += 1
                else:
                    transitions['to_similar'] += 1
        
        total = sum(transitions.values())
        if total > 0:
            for key in transitions:
                transitions[key] /= total
        
        return transitions
    
    def _calculate_temporal_probability(self, pattern: np.ndarray, data: np.ndarray) -> float:
        occurrences = []
        
        for i in range(len(data) - len(pattern) + 1):
            window = data[i:i + len(pattern)]
            similarity = self._calculate_similarity(pattern, window)
            
            if similarity >= self.similarity_threshold:
                occurrences.append(i)
        
        if len(occurrences) < 2:
            return 0.0
        
        intervals = np.diff(occurrences)
        
        if len(intervals) == 0:
            return 0.0
        
        regularity = 1.0 / (1.0 + np.std(intervals) / (np.mean(intervals) + 1e-8))
        
        return regularity
    
    def _calculate_context_probability(self, pattern: np.ndarray, data: np.ndarray) -> float:
        context_scores = []
        
        for i in range(max(1, len(pattern)), len(data) - len(pattern) + 1):
            window = data[i:i + len(pattern)]
            similarity = self._calculate_similarity(pattern, window)
            
            if similarity >= self.similarity_threshold:
                prev_context = data[max(0, i - len(pattern)):i]
                context_similarity = self._calculate_similarity(
                    prev_context[-len(pattern):] if len(prev_context) >= len(pattern) else prev_context,
                    pattern[:len(prev_context)]
                )
                context_scores.append(context_similarity)
        
        return np.mean(context_scores) if context_scores else 0.0
    
    def _store_pattern(self, pattern: Pattern):
        self.discovered_patterns[pattern.pattern_id] = pattern
        self.pattern_index[len(pattern.sequence)].append(pattern.pattern_id)
        self.pattern_frequencies[pattern.pattern_id] += pattern.frequency
    
    def _generate_pattern_id(self, pattern: np.ndarray) -> str:
        pattern_bytes = pattern.tobytes()
        return hashlib.md5(pattern_bytes).hexdigest()[:16]
    
    def _hash_pattern(self, pattern: np.ndarray, precision: int = 2) -> str:
        rounded = np.round(pattern, precision)
        return self._generate_pattern_id(rounded)
    
    def _deduplicate_patterns(self, patterns: List[Pattern]) -> List[Pattern]:
        unique = {}
        
        for pattern in patterns:
            pattern_hash = self._hash_pattern(pattern.sequence)
            
            if pattern_hash not in unique:
                unique[pattern_hash] = pattern
            else:
                unique[pattern_hash].frequency += pattern.frequency
                unique[pattern_hash].confidence = max(
                    unique[pattern_hash].confidence,
                    pattern.confidence
                )
        
        return list(unique.values())