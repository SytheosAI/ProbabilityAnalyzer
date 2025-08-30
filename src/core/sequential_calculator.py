import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple, Optional, Union
from scipy.special import comb
from itertools import combinations, permutations, product
import networkx as nx
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class Event:
    id: str
    name: str
    probability: float
    dependencies: List[str]
    conditions: Dict[str, Any]
    timestamp: Optional[float] = None
    
@dataclass
class EventSequence:
    events: List[Event]
    transition_matrix: Optional[np.ndarray] = None
    dependency_graph: Optional[nx.DiGraph] = None

class SequentialProbabilityCalculator:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.max_sequence_length = config.get('max_sequence_length', 20)
        self.transition_regularization = config.get('transition_matrix_regularization', 0.01)
        self.dependency_threshold = config.get('dependency_threshold', 0.1)
        
        self.event_history = []
        self.transition_matrices = {}
        self.dependency_graphs = {}
        
    def calculate_sequential_probability(self,
                                        events: List[Event],
                                        method: str = 'markov') -> Dict[str, Any]:
        if method == 'markov':
            return self._markov_chain_probability(events)
        elif method == 'bayesian_network':
            return self._bayesian_network_probability(events)
        elif method == 'conditional':
            return self._conditional_probability(events)
        elif method == 'joint':
            return self._joint_probability(events)
        else:
            return self._ensemble_probability(events)
    
    def calculate_combined_events_probability(self,
                                            event_sets: List[List[Event]],
                                            combination_type: str = 'all') -> Dict[str, Any]:
        if combination_type == 'all':
            return self._all_events_probability(event_sets)
        elif combination_type == 'any':
            return self._any_events_probability(event_sets)
        elif combination_type == 'exclusive':
            return self._exclusive_events_probability(event_sets)
        else:
            return self._custom_combination_probability(event_sets)
    
    def build_transition_matrix(self,
                               historical_sequences: List[List[Event]]) -> np.ndarray:
        event_ids = list(set(event.id for seq in historical_sequences for event in seq))
        n_events = len(event_ids)
        event_to_idx = {event_id: idx for idx, event_id in enumerate(event_ids)}
        
        transition_counts = np.zeros((n_events, n_events))
        
        for sequence in historical_sequences:
            for i in range(len(sequence) - 1):
                from_idx = event_to_idx[sequence[i].id]
                to_idx = event_to_idx[sequence[i + 1].id]
                transition_counts[from_idx, to_idx] += 1
        
        transition_counts += self.transition_regularization
        
        transition_matrix = transition_counts / transition_counts.sum(axis=1, keepdims=True)
        
        return transition_matrix
    
    def build_dependency_graph(self, events: List[Event]) -> nx.DiGraph:
        graph = nx.DiGraph()
        
        for event in events:
            graph.add_node(event.id, probability=event.probability, event=event)
        
        for event in events:
            for dep in event.dependencies:
                if dep in [e.id for e in events]:
                    graph.add_edge(dep, event.id, weight=1.0)
        
        return graph
    
    def calculate_path_probability(self,
                                  path: List[Event],
                                  transition_matrix: Optional[np.ndarray] = None) -> float:
        if len(path) == 0:
            return 0.0
        
        if len(path) == 1:
            return path[0].probability
        
        if transition_matrix is None:
            prob = path[0].probability
            for i in range(1, len(path)):
                conditional_prob = self._calculate_conditional(path[i], path[:i])
                prob *= conditional_prob
        else:
            event_to_idx = {event.id: idx for idx, event in enumerate(path)}
            prob = path[0].probability
            
            for i in range(len(path) - 1):
                from_idx = event_to_idx[path[i].id]
                to_idx = event_to_idx[path[i + 1].id]
                
                if from_idx < transition_matrix.shape[0] and to_idx < transition_matrix.shape[1]:
                    transition_prob = transition_matrix[from_idx, to_idx]
                else:
                    transition_prob = 1.0 / len(path)
                
                prob *= transition_prob * path[i + 1].probability
        
        return min(1.0, prob)
    
    def find_most_probable_sequence(self,
                                   events: List[Event],
                                   target_length: int) -> Tuple[List[Event], float]:
        if target_length > len(events):
            target_length = len(events)
        
        best_sequence = None
        best_probability = 0.0
        
        for perm in permutations(events, target_length):
            prob = self.calculate_path_probability(list(perm))
            
            if prob > best_probability:
                best_probability = prob
                best_sequence = list(perm)
        
        return best_sequence, best_probability
    
    def simulate_sequences(self,
                         initial_event: Event,
                         n_steps: int,
                         n_simulations: int = 1000) -> List[Dict[str, Any]]:
        simulations = []
        
        for _ in range(n_simulations):
            sequence = [initial_event]
            current_prob = initial_event.probability
            
            for step in range(n_steps - 1):
                next_event = self._sample_next_event(sequence[-1], self.event_history)
                
                if next_event is None:
                    break
                
                sequence.append(next_event)
                transition_prob = self._get_transition_probability(sequence[-2], sequence[-1])
                current_prob *= transition_prob * next_event.probability
            
            simulations.append({
                'sequence': sequence,
                'probability': current_prob,
                'length': len(sequence)
            })
        
        return simulations
    
    def analyze_sequence_dependencies(self,
                                     sequence: List[Event]) -> Dict[str, Any]:
        dependency_graph = self.build_dependency_graph(sequence)
        
        strongly_connected = list(nx.strongly_connected_components(dependency_graph))
        
        cycles = list(nx.simple_cycles(dependency_graph))
        
        critical_path = []
        if dependency_graph.number_of_nodes() > 0:
            try:
                critical_path = nx.dag_longest_path(dependency_graph)
            except nx.NetworkXError:
                pass
        
        independence_score = self._calculate_independence_score(sequence)
        
        conditional_dependencies = self._analyze_conditional_dependencies(sequence)
        
        return {
            'strongly_connected_components': strongly_connected,
            'cycles': cycles,
            'critical_path': critical_path,
            'independence_score': independence_score,
            'conditional_dependencies': conditional_dependencies,
            'graph_metrics': {
                'nodes': dependency_graph.number_of_nodes(),
                'edges': dependency_graph.number_of_edges(),
                'density': nx.density(dependency_graph) if dependency_graph.number_of_nodes() > 0 else 0
            }
        }
    
    def calculate_waiting_time_probability(self,
                                          event: Event,
                                          time_steps: int,
                                          rate: Optional[float] = None) -> float:
        if rate is None:
            rate = event.probability
        
        prob_not_occur = (1 - rate) ** time_steps
        
        prob_occur_by_time = 1 - prob_not_occur
        
        return prob_occur_by_time
    
    def _markov_chain_probability(self, events: List[Event]) -> Dict[str, Any]:
        if len(self.event_history) > 0:
            transition_matrix = self.build_transition_matrix([self.event_history])
        else:
            n = len(events)
            transition_matrix = np.ones((n, n)) / n
        
        path_prob = self.calculate_path_probability(events, transition_matrix)
        
        state_probabilities = self._calculate_stationary_distribution(transition_matrix)
        
        return {
            'sequential_probability': path_prob,
            'method': 'markov_chain',
            'transition_matrix': transition_matrix.tolist(),
            'stationary_distribution': state_probabilities,
            'expected_return_time': {
                events[i].id: 1.0 / state_probabilities[i] if state_probabilities[i] > 0 else float('inf')
                for i in range(len(events))
            }
        }
    
    def _bayesian_network_probability(self, events: List[Event]) -> Dict[str, Any]:
        graph = self.build_dependency_graph(events)
        
        joint_prob = 1.0
        
        for event in events:
            parents = list(graph.predecessors(event.id))
            
            if not parents:
                joint_prob *= event.probability
            else:
                parent_events = [e for e in events if e.id in parents]
                conditional_prob = self._calculate_conditional(event, parent_events)
                joint_prob *= conditional_prob
        
        marginal_probs = {}
        for event in events:
            marginal_probs[event.id] = self._calculate_marginal_probability(event, events, graph)
        
        return {
            'sequential_probability': joint_prob,
            'method': 'bayesian_network',
            'marginal_probabilities': marginal_probs,
            'network_structure': {
                'nodes': list(graph.nodes()),
                'edges': list(graph.edges())
            }
        }
    
    def _conditional_probability(self, events: List[Event]) -> Dict[str, Any]:
        if len(events) == 0:
            return {'sequential_probability': 0.0, 'method': 'conditional'}
        
        prob = events[0].probability
        conditional_probs = [prob]
        
        for i in range(1, len(events)):
            cond_prob = self._calculate_conditional(events[i], events[:i])
            prob *= cond_prob
            conditional_probs.append(cond_prob)
        
        return {
            'sequential_probability': prob,
            'method': 'conditional',
            'conditional_probabilities': conditional_probs,
            'cumulative_probability': [np.prod(conditional_probs[:i+1]) for i in range(len(conditional_probs))]
        }
    
    def _joint_probability(self, events: List[Event]) -> Dict[str, Any]:
        if self._are_independent(events):
            joint_prob = np.prod([e.probability for e in events])
        else:
            correlation_matrix = self._estimate_correlation_matrix(events)
            joint_prob = self._multivariate_probability(events, correlation_matrix)
        
        subsets_probs = {}
        for r in range(1, min(len(events) + 1, 5)):
            for subset in combinations(events, r):
                subset_prob = np.prod([e.probability for e in subset])
                subset_key = '_'.join([e.id for e in subset])
                subsets_probs[subset_key] = subset_prob
        
        return {
            'sequential_probability': joint_prob,
            'method': 'joint',
            'subset_probabilities': subsets_probs,
            'independence_assumption': self._are_independent(events)
        }
    
    def _ensemble_probability(self, events: List[Event]) -> Dict[str, Any]:
        methods = [
            self._markov_chain_probability,
            self._bayesian_network_probability,
            self._conditional_probability,
            self._joint_probability
        ]
        
        results = []
        weights = [0.3, 0.3, 0.2, 0.2]
        
        for method, weight in zip(methods, weights):
            try:
                result = method(events)
                results.append((result['sequential_probability'], weight))
            except Exception as e:
                logger.debug(f"Method {method.__name__} failed: {e}")
                results.append((0.0, weight))
        
        ensemble_prob = sum(prob * weight for prob, weight in results)
        
        return {
            'sequential_probability': ensemble_prob,
            'method': 'ensemble',
            'individual_results': [prob for prob, _ in results],
            'weights': weights
        }
    
    def _all_events_probability(self, event_sets: List[List[Event]]) -> Dict[str, Any]:
        set_probabilities = []
        
        for event_set in event_sets:
            set_prob = self.calculate_sequential_probability(event_set)
            set_probabilities.append(set_prob['sequential_probability'])
        
        combined_prob = np.prod(set_probabilities)
        
        return {
            'combined_probability': combined_prob,
            'combination_type': 'all',
            'individual_probabilities': set_probabilities,
            'n_sets': len(event_sets)
        }
    
    def _any_events_probability(self, event_sets: List[List[Event]]) -> Dict[str, Any]:
        set_probabilities = []
        
        for event_set in event_sets:
            set_prob = self.calculate_sequential_probability(event_set)
            set_probabilities.append(set_prob['sequential_probability'])
        
        combined_prob = 1 - np.prod([1 - p for p in set_probabilities])
        
        return {
            'combined_probability': combined_prob,
            'combination_type': 'any',
            'individual_probabilities': set_probabilities,
            'n_sets': len(event_sets)
        }
    
    def _exclusive_events_probability(self, event_sets: List[List[Event]]) -> Dict[str, Any]:
        set_probabilities = []
        
        for event_set in event_sets:
            set_prob = self.calculate_sequential_probability(event_set)
            set_probabilities.append(set_prob['sequential_probability'])
        
        combined_prob = sum(set_probabilities)
        
        if combined_prob > 1.0:
            combined_prob = 1.0
        
        return {
            'combined_probability': combined_prob,
            'combination_type': 'exclusive',
            'individual_probabilities': set_probabilities,
            'n_sets': len(event_sets)
        }
    
    def _custom_combination_probability(self, event_sets: List[List[Event]]) -> Dict[str, Any]:
        combinations_probs = {}
        
        for r in range(1, min(len(event_sets) + 1, 4)):
            for combo in combinations(range(len(event_sets)), r):
                combo_events = [event_sets[i] for i in combo]
                combo_prob = self._all_events_probability(combo_events)
                combo_key = f"sets_{combo}"
                combinations_probs[combo_key] = combo_prob['combined_probability']
        
        return {
            'combined_probability': max(combinations_probs.values()) if combinations_probs else 0.0,
            'combination_type': 'custom',
            'all_combinations': combinations_probs,
            'n_sets': len(event_sets)
        }
    
    def _calculate_conditional(self, event: Event, given_events: List[Event]) -> float:
        if not given_events:
            return event.probability
        
        dependency_factor = 1.0
        for given_event in given_events:
            if given_event.id in event.dependencies:
                dependency_factor *= 1.2
        
        base_prob = event.probability * dependency_factor
        
        return min(1.0, base_prob)
    
    def _sample_next_event(self, current_event: Event, history: List[Event]) -> Optional[Event]:
        if not history:
            return None
        
        candidates = [e for e in history if e.id != current_event.id]
        
        if not candidates:
            return None
        
        probabilities = [self._get_transition_probability(current_event, e) for e in candidates]
        
        if sum(probabilities) == 0:
            return np.random.choice(candidates)
        
        probabilities = np.array(probabilities) / sum(probabilities)
        
        return np.random.choice(candidates, p=probabilities)
    
    def _get_transition_probability(self, from_event: Event, to_event: Event) -> float:
        key = (from_event.id, to_event.id)
        
        if key in self.transition_matrices:
            return self.transition_matrices[key]
        
        base_prob = to_event.probability
        
        if from_event.id in to_event.dependencies:
            base_prob *= 1.5
        
        return min(1.0, base_prob)
    
    def _calculate_independence_score(self, events: List[Event]) -> float:
        if len(events) <= 1:
            return 1.0
        
        total_dependencies = sum(len(e.dependencies) for e in events)
        max_dependencies = len(events) * (len(events) - 1)
        
        if max_dependencies == 0:
            return 1.0
        
        return 1.0 - (total_dependencies / max_dependencies)
    
    def _analyze_conditional_dependencies(self, events: List[Event]) -> Dict[str, List[str]]:
        dependencies = {}
        
        for event in events:
            deps = []
            for dep_id in event.dependencies:
                dep_event = next((e for e in events if e.id == dep_id), None)
                if dep_event:
                    deps.append({
                        'id': dep_id,
                        'probability_impact': dep_event.probability * 0.2
                    })
            dependencies[event.id] = deps
        
        return dependencies
    
    def _calculate_stationary_distribution(self, transition_matrix: np.ndarray) -> np.ndarray:
        n = transition_matrix.shape[0]
        
        if n == 0:
            return np.array([])
        
        try:
            eigenvalues, eigenvectors = np.linalg.eig(transition_matrix.T)
            stationary_idx = np.argmax(np.abs(eigenvalues))
            stationary = np.abs(eigenvectors[:, stationary_idx])
            stationary = stationary / stationary.sum()
            return stationary
        except:
            return np.ones(n) / n
    
    def _calculate_marginal_probability(self, event: Event, all_events: List[Event], graph: nx.DiGraph) -> float:
        ancestors = nx.ancestors(graph, event.id)
        
        if not ancestors:
            return event.probability
        
        ancestor_events = [e for e in all_events if e.id in ancestors]
        
        marginal = event.probability
        for ancestor in ancestor_events:
            marginal *= (1 + 0.1 * ancestor.probability)
        
        return min(1.0, marginal)
    
    def _are_independent(self, events: List[Event]) -> bool:
        for event in events:
            if event.dependencies:
                return False
        return True
    
    def _estimate_correlation_matrix(self, events: List[Event]) -> np.ndarray:
        n = len(events)
        correlation = np.eye(n)
        
        for i in range(n):
            for j in range(i + 1, n):
                if events[j].id in events[i].dependencies or events[i].id in events[j].dependencies:
                    correlation[i, j] = correlation[j, i] = 0.5
        
        return correlation
    
    def _multivariate_probability(self, events: List[Event], correlation: np.ndarray) -> float:
        marginals = [e.probability for e in events]
        
        joint = np.prod(marginals)
        
        correlation_adjustment = np.linalg.det(correlation) ** 0.5
        
        return joint * correlation_adjustment