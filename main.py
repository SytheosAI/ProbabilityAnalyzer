import numpy as np
import pandas as pd
import yaml
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import asyncio
from datetime import datetime

from src.core.probability_analyzer import ProbabilityAnalyzer, SequentialEvent, AnalysisType
from src.core.sequential_calculator import SequentialProbabilityCalculator, Event
from src.data.data_processor import DataProcessor
from src.weather.weather_integration import WeatherIntegration
from src.ml.yolo_feedback_loop import YOLOFeedbackLoop
from src.ml.pattern_recognition import PatternRecognitionEngine
from src.visualization.visualizer import ProbabilityVisualizer

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ProbabilityAnalyzerSystem:
    def __init__(self, config_path: str = './config/config.yaml'):
        self.config = self._load_config(config_path)
        self._initialize_components()
        
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        logger.info(f"Loaded configuration from {config_path}")
        return config
    
    def _initialize_components(self):
        self.probability_analyzer = ProbabilityAnalyzer(self.config.get('probability', {}))
        self.sequential_calculator = SequentialProbabilityCalculator(self.config.get('sequential', {}))
        self.data_processor = DataProcessor(self.config.get('data', {}))
        self.weather_integration = WeatherIntegration(self.config.get('weather', {}))
        self.yolo_feedback = YOLOFeedbackLoop(self.config.get('ml', {}).get('feedback_loop', {}))
        self.pattern_engine = PatternRecognitionEngine(self.config.get('ml', {}).get('pattern_recognition', {}))
        self.visualizer = ProbabilityVisualizer()
        
        logger.info("All components initialized successfully")
    
    def analyze_dataset(self,
                       data_source: str,
                       target_column: Optional[str] = None,
                       include_weather: bool = True,
                       location: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
        
        logger.info(f"Starting analysis of dataset: {data_source}")
        
        raw_data = self.data_processor.ingest_data(data_source)
        
        X, y = self.data_processor.preprocess_data(
            raw_data,
            target_column=target_column,
            scaling_method='standard'
        )
        
        base_results = self.probability_analyzer.analyze_single_event(
            X.flatten() if X.ndim > 1 else X,
            method=AnalysisType.ENSEMBLE
        )
        
        patterns = self.pattern_engine.discover_patterns(
            X.flatten() if X.ndim > 1 else X,
            method='ensemble'
        )
        
        pattern_probabilities = {}
        for pattern in patterns[:10]:
            prob_analysis = self.pattern_engine.analyze_pattern_probability(
                pattern.sequence,
                X.flatten() if X.ndim > 1 else X
            )
            pattern_probabilities[pattern.pattern_id] = prob_analysis
        
        weather_impact = {}
        if include_weather and location:
            weather_data = self.weather_integration.fetch_current_weather(location)
            weather_impact = self.weather_integration.analyze_weather_impact(
                weather_data,
                target_column or 'target'
            )
            
            adjusted_probability = self.probability_analyzer.cross_reference_with_conditions(
                base_results.probability,
                {'weather': weather_data}
            )
        else:
            adjusted_probability = base_results.probability
        
        ml_results = self.yolo_feedback.process_data(X, task_type='analysis')
        
        ml_confidence = ml_results.get('confidence_scores', {})
        
        return {
            'base_probability': base_results.probability,
            'adjusted_probability': adjusted_probability,
            'confidence_interval': base_results.confidence_interval,
            'patterns_discovered': len(patterns),
            'pattern_probabilities': pattern_probabilities,
            'weather_impact': weather_impact,
            'ml_confidence': ml_confidence,
            'metadata': {
                'timestamp': datetime.now().isoformat(),
                'data_shape': X.shape,
                'analysis_method': base_results.method
            }
        }
    
    def analyze_sequential_events(self,
                                 events_data: List[Dict[str, Any]],
                                 analyze_combinations: bool = True) -> Dict[str, Any]:
        
        logger.info(f"Analyzing {len(events_data)} sequential events")
        
        events = []
        for event_dict in events_data:
            event = Event(
                id=event_dict['id'],
                name=event_dict.get('name', event_dict['id']),
                probability=event_dict.get('probability', 0.5),
                dependencies=event_dict.get('dependencies', []),
                conditions=event_dict.get('conditions', {})
            )
            events.append(event)
        
        sequential_prob = self.sequential_calculator.calculate_sequential_probability(
            events,
            method='ensemble'
        )
        
        dependency_analysis = self.sequential_calculator.analyze_sequence_dependencies(events)
        
        best_sequence, best_prob = self.sequential_calculator.find_most_probable_sequence(
            events,
            target_length=min(5, len(events))
        )
        
        combinations_analysis = {}
        if analyze_combinations and len(events) > 1:
            event_sets = [events[i:i+2] for i in range(0, len(events)-1, 2)]
            combinations_analysis = self.sequential_calculator.calculate_combined_events_probability(
                event_sets,
                combination_type='all'
            )
        
        return {
            'sequential_probability': sequential_prob,
            'dependency_analysis': dependency_analysis,
            'best_sequence': {
                'sequence': [e.id for e in best_sequence] if best_sequence else [],
                'probability': best_prob
            },
            'combinations_analysis': combinations_analysis
        }
    
    def run_continuous_learning(self,
                              training_data_path: str,
                              validation_split: float = 0.2):
        
        logger.info("Starting continuous learning process")
        
        data = self.data_processor.ingest_data(training_data_path)
        X, y = self.data_processor.preprocess_data(data)
        
        splits = self.data_processor.split_data(X, y)
        
        training_data = list(zip(splits['train'][0], splits['train'][1]))
        validation_data = list(zip(splits['validation'][0], splits['validation'][1])) if splits['validation'][1] is not None else None
        
        self.yolo_feedback.train_feedback_loop(training_data, validation_data)
        
        logger.info("Continuous learning initiated")
    
    def generate_report(self,
                       analysis_results: Dict[str, Any],
                       output_format: str = 'html',
                       output_path: Optional[str] = None) -> str:
        
        logger.info(f"Generating {output_format} report")
        
        dashboard = self.visualizer.create_probability_dashboard(analysis_results)
        
        report = self.visualizer.create_report(analysis_results, format=output_format)
        
        if output_path:
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            
            if output_format == 'html':
                dashboard.write_html(str(output_file.with_suffix('.html')))
                with open(output_file.with_suffix('.report.html'), 'w') as f:
                    f.write(report)
            else:
                with open(output_file, 'w') as f:
                    f.write(report)
            
            logger.info(f"Report saved to {output_path}")
        
        return report
    
    async def analyze_realtime_stream(self,
                                     data_source: str,
                                     callback: Optional[callable] = None):
        
        logger.info("Starting real-time analysis stream")
        
        async for chunk in self._stream_data_async(data_source):
            X, _ = self.data_processor.preprocess_data(chunk)
            
            patterns = self.pattern_engine.discover_patterns(X.flatten())
            
            if patterns:
                prediction = self.pattern_engine.predict_next_pattern(X.flatten()[-100:])
                
                ml_results = self.yolo_feedback.process_data(X)
                
                new_data = (X.flatten()[-512:], prediction.get('predicted_pattern', np.zeros(10))[:10])
                self.yolo_feedback.apply_continuous_learning(new_data)
                
                if callback:
                    await callback({
                        'timestamp': datetime.now().isoformat(),
                        'prediction': prediction,
                        'ml_confidence': ml_results.get('confidence_scores', {})
                    })
    
    async def _stream_data_async(self, source: str):
        for chunk in self.data_processor.stream_data(source, chunk_size=100):
            yield chunk
            await asyncio.sleep(0.1)

def main():
    system = ProbabilityAnalyzerSystem()
    
    print("Probability Analyzer System Initialized")
    print("=" * 60)
    print("\nAvailable Commands:")
    print("1. analyze <data_file> - Analyze a dataset")
    print("2. sequential <events_file> - Analyze sequential events")
    print("3. train <data_file> - Start continuous learning")
    print("4. stream <data_source> - Start real-time analysis")
    print("5. report <results_file> - Generate report")
    print("6. quit - Exit the system")
    print("=" * 60)
    
    while True:
        try:
            command = input("\nEnter command: ").strip().split()
            
            if not command:
                continue
            
            if command[0] == 'quit':
                print("Exiting system...")
                break
            
            elif command[0] == 'analyze' and len(command) > 1:
                results = system.analyze_dataset(
                    command[1],
                    include_weather=True,
                    location={'lat': 40.7128, 'lon': -74.0060}
                )
                print(f"\nAnalysis Results:")
                print(f"Base Probability: {results['base_probability']:.4f}")
                print(f"Adjusted Probability: {results['adjusted_probability']:.4f}")
                print(f"Patterns Discovered: {results['patterns_discovered']}")
                
                report_path = f"./reports/analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
                system.generate_report(results, output_path=report_path)
                print(f"Report saved to: {report_path}")
            
            elif command[0] == 'sequential' and len(command) > 1:
                sample_events = [
                    {'id': 'E1', 'name': 'Event 1', 'probability': 0.7, 'dependencies': []},
                    {'id': 'E2', 'name': 'Event 2', 'probability': 0.5, 'dependencies': ['E1']},
                    {'id': 'E3', 'name': 'Event 3', 'probability': 0.6, 'dependencies': ['E1', 'E2']}
                ]
                
                results = system.analyze_sequential_events(sample_events)
                print(f"\nSequential Analysis Results:")
                print(f"Sequential Probability: {results['sequential_probability']['sequential_probability']:.4f}")
                print(f"Best Sequence: {results['best_sequence']['sequence']}")
                print(f"Best Sequence Probability: {results['best_sequence']['probability']:.4f}")
            
            elif command[0] == 'train' and len(command) > 1:
                system.run_continuous_learning(command[1])
                print("Continuous learning started in background")
            
            elif command[0] == 'stream' and len(command) > 1:
                async def callback(result):
                    print(f"Stream Update: {result['timestamp']}")
                    print(f"  Confidence: {result['ml_confidence']}")
                
                asyncio.run(system.analyze_realtime_stream(command[1], callback))
            
            elif command[0] == 'report' and len(command) > 1:
                import json
                with open(command[1], 'r') as f:
                    results = json.load(f)
                
                report_path = f"./reports/report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
                system.generate_report(results, output_path=report_path)
                print(f"Report generated: {report_path}")
            
            else:
                print("Invalid command. Type 'quit' to exit.")
        
        except Exception as e:
            logger.error(f"Error executing command: {e}")
            print(f"Error: {e}")

if __name__ == "__main__":
    main()