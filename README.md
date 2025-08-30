# Probability Analyzer with ML/YOLO Integration

A comprehensive probability analysis system that combines statistical analysis, machine learning (YOLO), weather data integration, and pattern recognition for predictive analytics.

## Features

- **Multi-Method Probability Analysis**: Bayesian, Frequentist, Monte Carlo, Markov Chain, and Ensemble methods
- **ML/YOLO Continuous Learning**: Adaptive feedback loop with YOLO integration for pattern detection
- **Weather Data Integration**: Real-time and historical weather correlation analysis
- **Pattern Recognition**: Advanced pattern discovery and prediction using multiple algorithms
- **Sequential Event Analysis**: Calculate probabilities for combined and sequential events
- **Real-time Processing**: Stream processing capabilities with continuous learning
- **Interactive Visualizations**: Comprehensive dashboards and 3D visualizations

## Installation

```bash
# Clone the repository
cd probability-analyzer

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
export WEATHER_API_KEY="your_openweather_api_key"
export DB_USER="your_db_user"
export DB_PASSWORD="your_db_password"
```

## Quick Start

```python
from main import ProbabilityAnalyzerSystem

# Initialize the system
system = ProbabilityAnalyzerSystem()

# Analyze a dataset
results = system.analyze_dataset(
    'data.csv',
    target_column='outcome',
    include_weather=True,
    location={'lat': 40.7128, 'lon': -74.0060}
)

# Generate report
system.generate_report(results, output_path='report.html')
```

## Usage

### Command Line Interface

```bash
python main.py
```

Available commands:
- `analyze <data_file>` - Analyze a dataset with ML and weather integration
- `sequential <events_file>` - Analyze sequential event probabilities
- `train <data_file>` - Start continuous learning process
- `stream <data_source>` - Start real-time analysis stream
- `report <results_file>` - Generate HTML/JSON report

### Python API

```python
# Analyze multiple datasets
datasets = [data1, data2, data3]
weights = [0.3, 0.4, 0.3]
results = system.probability_analyzer.analyze_multiple_datasets(datasets, weights)

# Sequential event analysis
events = [
    {'id': 'E1', 'probability': 0.7, 'dependencies': []},
    {'id': 'E2', 'probability': 0.5, 'dependencies': ['E1']},
    {'id': 'E3', 'probability': 0.6, 'dependencies': ['E1', 'E2']}
]
sequential_results = system.analyze_sequential_events(events)

# Pattern recognition
patterns = system.pattern_engine.discover_patterns(time_series_data)
prediction = system.pattern_engine.predict_next_pattern(current_sequence)
```

## Architecture

### Core Components

1. **Probability Analyzer** (`src/core/probability_analyzer.py`)
   - Multiple statistical analysis methods
   - Cross-reference with conditions
   - Joint and conditional probability calculations

2. **Sequential Calculator** (`src/core/sequential_calculator.py`)
   - Markov chain analysis
   - Bayesian network probability
   - Dependency graph analysis

3. **Data Processor** (`src/data/data_processor.py`)
   - Data ingestion from multiple formats
   - Preprocessing and augmentation
   - Streaming capabilities

4. **Weather Integration** (`src/weather/weather_integration.py`)
   - Real-time weather data fetching
   - Historical weather analysis
   - Weather impact correlation

5. **YOLO Feedback Loop** (`src/ml/yolo_feedback_loop.py`)
   - Continuous learning system
   - Adaptive model training
   - Real-time pattern detection

6. **Pattern Recognition** (`src/ml/pattern_recognition.py`)
   - Multiple discovery algorithms
   - Pattern clustering and analysis
   - Predictive capabilities

## Configuration

Edit `config/config.yaml` to customize:

```yaml
ml:
  yolo:
    model_type: "yolov8n"
    confidence_threshold: 0.5
  feedback_loop:
    learning_rate: 0.001
    batch_size: 16
  pattern_recognition:
    window_size: 100
    similarity_threshold: 0.85

probability:
  monte_carlo_simulations: 10000
  confidence_intervals: [0.90, 0.95, 0.99]
```

## API Endpoints (Optional FastAPI Integration)

```python
# Add to main.py for API support
from fastapi import FastAPI
app = FastAPI()

@app.post("/analyze")
async def analyze_endpoint(data: dict):
    return system.analyze_dataset(data['source'])
```

## Examples

### Weather-Correlated Analysis
```python
# Analyze with weather correlation
location = {'lat': 37.7749, 'lon': -122.4194}
results = system.analyze_dataset(
    'sales_data.csv',
    target_column='sales',
    include_weather=True,
    location=location
)
```

### Real-time Stream Processing
```python
# Process real-time data stream
async def process_stream():
    await system.analyze_realtime_stream(
        'live_data_source',
        callback=lambda x: print(f"Prediction: {x['prediction']}")
    )
```

## Requirements

- Python 3.8+
- CUDA-capable GPU (optional, for YOLO acceleration)
- OpenWeatherMap API key (for weather integration)
- PostgreSQL (optional, for data persistence)

## License

MIT License

## Contributing

Pull requests are welcome. For major changes, please open an issue first.

## Support

For issues and questions, please open an issue on GitHub.