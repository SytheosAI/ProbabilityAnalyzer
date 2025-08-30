import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple, Optional, Union
from scipy import stats
from scipy.special import comb
import itertools
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class AnalysisType(Enum):
    BAYESIAN = "bayesian"
    FREQUENTIST = "frequentist"
    MONTE_CARLO = "monte_carlo"
    MARKOV_CHAIN = "markov_chain"
    ENSEMBLE = "ensemble"

@dataclass
class ProbabilityResult:
    probability: float
    confidence_interval: Tuple[float, float]
    method: str
    metadata: Dict[str, Any]
    
@dataclass
class SequentialEvent:
    event_id: str
    probability: float
    dependencies: List[str]
    conditions: Dict[str, Any]

class ProbabilityAnalyzer:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.monte_carlo_sims = config.get('monte_carlo_simulations', 10000)
        self.confidence_levels = config.get('confidence_intervals', [0.95])
        self.prior_weight = config.get('bayesian_prior_weight', 0.3)
        self.markov_order = config.get('markov_chain_order', 3)
        
    def analyze_single_event(self, 
                            data: np.ndarray, 
                            method: AnalysisType = AnalysisType.ENSEMBLE) -> ProbabilityResult:
        if method == AnalysisType.BAYESIAN:
            return self._bayesian_analysis(data)
        elif method == AnalysisType.FREQUENTIST:
            return self._frequentist_analysis(data)
        elif method == AnalysisType.MONTE_CARLO:
            return self._monte_carlo_analysis(data)
        elif method == AnalysisType.MARKOV_CHAIN:
            return self._markov_chain_analysis(data)
        else:
            return self._ensemble_analysis(data)
    
    def analyze_multiple_datasets(self, 
                                datasets: List[np.ndarray],
                                weights: Optional[List[float]] = None) -> ProbabilityResult:
        if weights is None:
            weights = [1.0 / len(datasets)] * len(datasets)
        
        results = []
        for dataset, weight in zip(datasets, weights):
            result = self.analyze_single_event(dataset)
            results.append((result, weight))
        
        combined_prob = sum(r.probability * w for r, w in results)
        
        ci_lower = np.percentile([r.confidence_interval[0] for r, _ in results], 2.5)
        ci_upper = np.percentile([r.confidence_interval[1] for r, _ in results], 97.5)
        
        return ProbabilityResult(
            probability=combined_prob,
            confidence_interval=(ci_lower, ci_upper),
            method="weighted_ensemble",
            metadata={
                "n_datasets": len(datasets),
                "weights": weights,
                "individual_results": results
            }
        )
    
    def calculate_joint_probability(self,
                                  events: List[SequentialEvent],
                                  correlation_matrix: Optional[np.ndarray] = None) -> float:
        n = len(events)
        
        if correlation_matrix is None:
            joint_prob = np.prod([e.probability for e in events])
        else:
            base_probs = np.array([e.probability for e in events])
            
            copula_adjustment = self._gaussian_copula(base_probs, correlation_matrix)
            joint_prob = copula_adjustment
            
        return joint_prob
    
    def calculate_sequential_probability(self,
                                       events: List[SequentialEvent],
                                       transition_matrix: Optional[np.ndarray] = None) -> Dict[str, Any]:
        n = len(events)
        
        if transition_matrix is None:
            transition_matrix = np.ones((n, n)) / n
        
        path_probability = events[0].probability
        path = [events[0].event_id]
        
        for i in range(1, n):
            conditional_prob = self._calculate_conditional_probability(
                events[i], 
                events[:i],
                transition_matrix[i-1, i]
            )
            path_probability *= conditional_prob
            path.append(events[i].event_id)
        
        alternative_paths = self._generate_alternative_paths(events)
        path_probabilities = {}
        
        for alt_path in alternative_paths[:100]:
            alt_prob = self._calculate_path_probability(alt_path, transition_matrix)
            path_probabilities[str(alt_path)] = alt_prob
        
        return {
            "sequential_probability": path_probability,
            "path": path,
            "alternative_paths": path_probabilities,
            "most_likely_path": max(path_probabilities.items(), key=lambda x: x[1]) if path_probabilities else None
        }
    
    def cross_reference_with_conditions(self,
                                      probability: float,
                                      conditions: Dict[str, Any]) -> float:
        adjustment_factor = 1.0
        
        for condition, value in conditions.items():
            if condition == "weather":
                adjustment_factor *= self._weather_adjustment(value)
            elif condition == "time":
                adjustment_factor *= self._temporal_adjustment(value)
            elif condition == "historical":
                adjustment_factor *= self._historical_adjustment(value)
            else:
                adjustment_factor *= self._generic_adjustment(condition, value)
        
        return min(1.0, max(0.0, probability * adjustment_factor))
    
    def _bayesian_analysis(self, data: np.ndarray) -> ProbabilityResult:
        prior = stats.beta(1, 1)
        
        successes = np.sum(data > 0)
        failures = len(data) - successes
        
        posterior = stats.beta(1 + successes, 1 + failures)
        
        probability = posterior.mean()
        ci = posterior.interval(self.confidence_levels[0])
        
        return ProbabilityResult(
            probability=probability,
            confidence_interval=ci,
            method="bayesian",
            metadata={
                "prior": "uniform",
                "posterior_alpha": 1 + successes,
                "posterior_beta": 1 + failures
            }
        )
    
    def _frequentist_analysis(self, data: np.ndarray) -> ProbabilityResult:
        probability = np.mean(data > 0)
        
        se = np.sqrt(probability * (1 - probability) / len(data))
        z_score = stats.norm.ppf((1 + self.confidence_levels[0]) / 2)
        ci = (probability - z_score * se, probability + z_score * se)
        
        return ProbabilityResult(
            probability=probability,
            confidence_interval=ci,
            method="frequentist",
            metadata={
                "sample_size": len(data),
                "standard_error": se
            }
        )
    
    def _monte_carlo_analysis(self, data: np.ndarray) -> ProbabilityResult:
        simulations = []
        
        for _ in range(self.monte_carlo_sims):
            sample = np.random.choice(data, size=len(data), replace=True)
            simulations.append(np.mean(sample > 0))
        
        probability = np.mean(simulations)
        ci = np.percentile(simulations, [2.5, 97.5])
        
        return ProbabilityResult(
            probability=probability,
            confidence_interval=tuple(ci),
            method="monte_carlo",
            metadata={
                "n_simulations": self.monte_carlo_sims,
                "simulation_std": np.std(simulations)
            }
        )
    
    def _markov_chain_analysis(self, data: np.ndarray) -> ProbabilityResult:
        states = np.unique(data)
        n_states = len(states)
        
        transition_matrix = np.zeros((n_states, n_states))
        
        for i in range(len(data) - 1):
            current_state = np.where(states == data[i])[0][0]
            next_state = np.where(states == data[i + 1])[0][0]
            transition_matrix[current_state, next_state] += 1
        
        transition_matrix = transition_matrix / transition_matrix.sum(axis=1, keepdims=True)
        
        eigenvalues, eigenvectors = np.linalg.eig(transition_matrix.T)
        stationary_index = np.argmax(np.abs(eigenvalues))
        stationary_distribution = np.abs(eigenvectors[:, stationary_index])
        stationary_distribution = stationary_distribution / stationary_distribution.sum()
        
        target_state = np.where(states > 0)[0]
        probability = np.sum(stationary_distribution[target_state]) if len(target_state) > 0 else 0
        
        bootstrap_probs = []
        for _ in range(1000):
            boot_data = np.random.choice(data, size=len(data), replace=True)
            boot_prob = np.mean(boot_data > 0)
            bootstrap_probs.append(boot_prob)
        
        ci = np.percentile(bootstrap_probs, [2.5, 97.5])
        
        return ProbabilityResult(
            probability=probability,
            confidence_interval=tuple(ci),
            method="markov_chain",
            metadata={
                "n_states": n_states,
                "stationary_distribution": stationary_distribution.tolist(),
                "transition_matrix": transition_matrix.tolist()
            }
        )
    
    def _ensemble_analysis(self, data: np.ndarray) -> ProbabilityResult:
        methods = [
            self._bayesian_analysis,
            self._frequentist_analysis,
            self._monte_carlo_analysis,
            self._markov_chain_analysis
        ]
        
        results = [method(data) for method in methods]
        
        ensemble_prob = np.mean([r.probability for r in results])
        
        ci_lower = np.min([r.confidence_interval[0] for r in results])
        ci_upper = np.max([r.confidence_interval[1] for r in results])
        
        return ProbabilityResult(
            probability=ensemble_prob,
            confidence_interval=(ci_lower, ci_upper),
            method="ensemble",
            metadata={
                "methods_used": [r.method for r in results],
                "individual_probabilities": {r.method: r.probability for r in results}
            }
        )
    
    def _gaussian_copula(self, marginals: np.ndarray, correlation: np.ndarray) -> float:
        normal_quantiles = stats.norm.ppf(marginals)
        
        mvn = stats.multivariate_normal(mean=np.zeros(len(marginals)), cov=correlation)
        joint_cdf = mvn.cdf(normal_quantiles)
        
        return joint_cdf
    
    def _calculate_conditional_probability(self,
                                         event: SequentialEvent,
                                         previous_events: List[SequentialEvent],
                                         transition_prob: float) -> float:
        base_prob = event.probability
        
        dependency_adjustment = 1.0
        for dep in event.dependencies:
            for prev_event in previous_events:
                if prev_event.event_id == dep:
                    dependency_adjustment *= (1 + 0.2)
        
        return base_prob * transition_prob * dependency_adjustment
    
    def _generate_alternative_paths(self, events: List[SequentialEvent]) -> List[List[SequentialEvent]]:
        n = len(events)
        alternative_paths = []
        
        for r in range(2, min(n + 1, 6)):
            for combo in itertools.permutations(events, r):
                alternative_paths.append(list(combo))
        
        return alternative_paths
    
    def _calculate_path_probability(self,
                                  path: List[SequentialEvent],
                                  transition_matrix: np.ndarray) -> float:
        if not path:
            return 0.0
        
        prob = path[0].probability
        for i in range(1, len(path)):
            prob *= path[i].probability
        
        return prob
    
    def _weather_adjustment(self, weather_data: Dict[str, Any]) -> float:
        temp = weather_data.get('temperature', 20)
        humidity = weather_data.get('humidity', 50)
        pressure = weather_data.get('pressure', 1013)
        
        temp_factor = 1.0 + (temp - 20) * 0.001
        humidity_factor = 1.0 - abs(humidity - 50) * 0.002
        pressure_factor = 1.0 + (pressure - 1013) * 0.0001
        
        return temp_factor * humidity_factor * pressure_factor
    
    def _temporal_adjustment(self, time_data: Dict[str, Any]) -> float:
        hour = time_data.get('hour', 12)
        day_of_week = time_data.get('day_of_week', 3)
        month = time_data.get('month', 6)
        
        hour_factor = 1.0 + np.sin(2 * np.pi * hour / 24) * 0.1
        dow_factor = 1.0 + (day_of_week - 3) * 0.02
        month_factor = 1.0 + np.cos(2 * np.pi * month / 12) * 0.05
        
        return hour_factor * dow_factor * month_factor
    
    def _historical_adjustment(self, historical_data: Dict[str, Any]) -> float:
        trend = historical_data.get('trend', 0)
        volatility = historical_data.get('volatility', 0.1)
        correlation = historical_data.get('correlation', 0)
        
        trend_factor = 1.0 + trend * 0.1
        volatility_factor = 1.0 / (1.0 + volatility)
        correlation_factor = 1.0 + correlation * 0.2
        
        return trend_factor * volatility_factor * correlation_factor
    
    def _generic_adjustment(self, condition: str, value: Any) -> float:
        if isinstance(value, (int, float)):
            return 1.0 + (value - 50) * 0.001
        elif isinstance(value, bool):
            return 1.1 if value else 0.9
        else:
            return 1.0