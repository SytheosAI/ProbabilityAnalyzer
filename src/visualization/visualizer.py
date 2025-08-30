import matplotlib.pyplot as plt
import seaborn as sns
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
import networkx as nx
from datetime import datetime
import json
import base64
from io import BytesIO

class ProbabilityVisualizer:
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.style = self.config.get('style', 'seaborn')
        self.color_palette = self.config.get('color_palette', 'viridis')
        
        plt.style.use(self.style)
        sns.set_palette(self.color_palette)
        
    def create_probability_dashboard(self,
                                    analysis_results: Dict[str, Any]) -> go.Figure:
        fig = make_subplots(
            rows=3, cols=2,
            subplot_titles=('Probability Distribution', 'Sequential Probabilities',
                          'Pattern Recognition', 'Weather Correlation',
                          'ML Confidence Scores', 'Event Dependencies'),
            specs=[[{'type': 'histogram'}, {'type': 'scatter'}],
                   [{'type': 'heatmap'}, {'type': 'scatter'}],
                   [{'type': 'bar'}, {'type': 'scatter3d'}]]
        )
        
        if 'probability_distribution' in analysis_results:
            self._add_probability_distribution(fig, analysis_results['probability_distribution'], 1, 1)
        
        if 'sequential_probabilities' in analysis_results:
            self._add_sequential_plot(fig, analysis_results['sequential_probabilities'], 1, 2)
        
        if 'patterns' in analysis_results:
            self._add_pattern_heatmap(fig, analysis_results['patterns'], 2, 1)
        
        if 'weather_correlation' in analysis_results:
            self._add_weather_correlation(fig, analysis_results['weather_correlation'], 2, 2)
        
        if 'ml_confidence' in analysis_results:
            self._add_confidence_bars(fig, analysis_results['ml_confidence'], 3, 1)
        
        if 'dependencies' in analysis_results:
            self._add_3d_dependencies(fig, analysis_results['dependencies'], 3, 2)
        
        fig.update_layout(
            height=1200,
            showlegend=True,
            title_text="Probability Analysis Dashboard",
            title_font_size=20
        )
        
        return fig
    
    def plot_probability_timeline(self,
                                 probabilities: List[float],
                                 timestamps: Optional[List[datetime]] = None,
                                 confidence_intervals: Optional[List[Tuple[float, float]]] = None) -> go.Figure:
        if timestamps is None:
            timestamps = list(range(len(probabilities)))
        
        fig = go.Figure()
        
        fig.add_trace(go.Scatter(
            x=timestamps,
            y=probabilities,
            mode='lines+markers',
            name='Probability',
            line=dict(color='blue', width=2),
            marker=dict(size=8)
        ))
        
        if confidence_intervals:
            lower_bounds = [ci[0] for ci in confidence_intervals]
            upper_bounds = [ci[1] for ci in confidence_intervals]
            
            fig.add_trace(go.Scatter(
                x=timestamps + timestamps[::-1],
                y=upper_bounds + lower_bounds[::-1],
                fill='toself',
                fillcolor='rgba(0,100,200,0.2)',
                line=dict(color='rgba(255,255,255,0)'),
                hoverinfo="skip",
                showlegend=False
            ))
        
        fig.update_layout(
            title='Probability Timeline',
            xaxis_title='Time',
            yaxis_title='Probability',
            yaxis=dict(range=[0, 1]),
            hovermode='x unified'
        )
        
        return fig
    
    def plot_pattern_matrix(self,
                          patterns: List[np.ndarray],
                          labels: Optional[List[str]] = None) -> go.Figure:
        if not patterns:
            return go.Figure()
        
        max_len = max(len(p) for p in patterns)
        matrix = np.zeros((len(patterns), max_len))
        
        for i, pattern in enumerate(patterns):
            matrix[i, :len(pattern)] = pattern
        
        if labels is None:
            labels = [f'Pattern {i+1}' for i in range(len(patterns))]
        
        fig = go.Figure(data=go.Heatmap(
            z=matrix,
            y=labels,
            colorscale='Viridis',
            colorbar=dict(title='Value')
        ))
        
        fig.update_layout(
            title='Pattern Matrix Visualization',
            xaxis_title='Time Step',
            yaxis_title='Pattern',
            height=400 + len(patterns) * 20
        )
        
        return fig
    
    def plot_sequential_flow(self,
                           events: List[Dict[str, Any]],
                           transition_matrix: Optional[np.ndarray] = None) -> go.Figure:
        G = nx.DiGraph()
        
        for i, event in enumerate(events):
            G.add_node(event['id'], label=event.get('name', event['id']),
                      probability=event.get('probability', 0))
        
        if transition_matrix is not None:
            n = len(events)
            for i in range(n):
                for j in range(n):
                    if transition_matrix[i, j] > 0.01:
                        G.add_edge(events[i]['id'], events[j]['id'],
                                 weight=transition_matrix[i, j])
        
        pos = nx.spring_layout(G, k=2, iterations=50)
        
        edge_trace = []
        for edge in G.edges():
            x0, y0 = pos[edge[0]]
            x1, y1 = pos[edge[1]]
            weight = G[edge[0]][edge[1]].get('weight', 0.5)
            
            edge_trace.append(go.Scatter(
                x=[x0, x1, None],
                y=[y0, y1, None],
                mode='lines',
                line=dict(width=weight*5, color='gray'),
                hoverinfo='none'
            ))
        
        node_x = []
        node_y = []
        node_text = []
        node_color = []
        
        for node in G.nodes():
            x, y = pos[node]
            node_x.append(x)
            node_y.append(y)
            node_text.append(f"{G.nodes[node]['label']}<br>P={G.nodes[node]['probability']:.3f}")
            node_color.append(G.nodes[node]['probability'])
        
        node_trace = go.Scatter(
            x=node_x, y=node_y,
            mode='markers+text',
            text=[G.nodes[node]['label'] for node in G.nodes()],
            textposition="top center",
            hovertext=node_text,
            hoverinfo='text',
            marker=dict(
                showscale=True,
                colorscale='YlOrRd',
                size=20,
                color=node_color,
                colorbar=dict(
                    thickness=15,
                    title="Probability",
                    xanchor="left",
                    titleside="right"
                )
            )
        )
        
        fig = go.Figure(data=edge_trace + [node_trace])
        
        fig.update_layout(
            title='Sequential Event Flow',
            showlegend=False,
            hovermode='closest',
            xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            height=600
        )
        
        return fig
    
    def plot_weather_impact_3d(self,
                              temperature: List[float],
                              humidity: List[float],
                              probability: List[float]) -> go.Figure:
        fig = go.Figure(data=[go.Scatter3d(
            x=temperature,
            y=humidity,
            z=probability,
            mode='markers',
            marker=dict(
                size=5,
                color=probability,
                colorscale='Viridis',
                showscale=True,
                colorbar=dict(title="Probability")
            ),
            text=[f'T:{t:.1f}°C, H:{h:.1f}%, P:{p:.3f}' 
                  for t, h, p in zip(temperature, humidity, probability)]
        )])
        
        fig.update_layout(
            title='Weather Impact on Probability (3D)',
            scene=dict(
                xaxis_title='Temperature (°C)',
                yaxis_title='Humidity (%)',
                zaxis_title='Probability',
                camera=dict(
                    eye=dict(x=1.5, y=1.5, z=1.3)
                )
            ),
            height=600
        )
        
        return fig
    
    def plot_ml_learning_curve(self,
                              training_history: List[Dict[str, float]]) -> go.Figure:
        epochs = [h.get('epoch', i) for i, h in enumerate(training_history)]
        train_loss = [h.get('train_loss', 0) for h in training_history]
        val_loss = [h.get('val_loss', 0) for h in training_history]
        
        fig = go.Figure()
        
        fig.add_trace(go.Scatter(
            x=epochs,
            y=train_loss,
            mode='lines',
            name='Training Loss',
            line=dict(color='blue', width=2)
        ))
        
        fig.add_trace(go.Scatter(
            x=epochs,
            y=val_loss,
            mode='lines',
            name='Validation Loss',
            line=dict(color='red', width=2)
        ))
        
        fig.update_layout(
            title='ML Model Learning Curve',
            xaxis_title='Epoch',
            yaxis_title='Loss',
            hovermode='x unified'
        )
        
        return fig
    
    def create_report(self,
                     analysis_results: Dict[str, Any],
                     format: str = 'html') -> str:
        if format == 'html':
            return self._create_html_report(analysis_results)
        elif format == 'json':
            return json.dumps(analysis_results, indent=2, default=str)
        else:
            return self._create_text_report(analysis_results)
    
    def _add_probability_distribution(self, fig, data, row, col):
        fig.add_trace(
            go.Histogram(x=data, nbinsx=30, name='Distribution'),
            row=row, col=col
        )
    
    def _add_sequential_plot(self, fig, data, row, col):
        fig.add_trace(
            go.Scatter(y=data, mode='lines+markers', name='Sequential'),
            row=row, col=col
        )
    
    def _add_pattern_heatmap(self, fig, patterns, row, col):
        if patterns:
            matrix = np.array(patterns[:10])
            fig.add_trace(
                go.Heatmap(z=matrix, colorscale='Viridis'),
                row=row, col=col
            )
    
    def _add_weather_correlation(self, fig, data, row, col):
        if 'temperature' in data and 'probability' in data:
            fig.add_trace(
                go.Scatter(x=data['temperature'], y=data['probability'],
                          mode='markers', name='Weather'),
                row=row, col=col
            )
    
    def _add_confidence_bars(self, fig, confidence_scores, row, col):
        labels = list(confidence_scores.keys())
        values = list(confidence_scores.values())
        
        fig.add_trace(
            go.Bar(x=labels, y=values, name='Confidence'),
            row=row, col=col
        )
    
    def _add_3d_dependencies(self, fig, dependencies, row, col):
        if dependencies and len(dependencies) >= 3:
            x = [d.get('x', i) for i, d in enumerate(dependencies)]
            y = [d.get('y', i) for i, d in enumerate(dependencies)]
            z = [d.get('probability', 0) for d in dependencies]
            
            fig.add_trace(
                go.Scatter3d(x=x, y=y, z=z, mode='markers',
                           marker=dict(size=5, color=z, colorscale='Viridis')),
                row=row, col=col
            )
    
    def _create_html_report(self, results: Dict[str, Any]) -> str:
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Probability Analysis Report</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                h1 {{ color: #333; }}
                h2 {{ color: #666; border-bottom: 2px solid #ddd; padding-bottom: 5px; }}
                .metric {{ background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }}
                .metric-label {{ font-weight: bold; color: #555; }}
                .metric-value {{ color: #2196F3; font-size: 1.2em; }}
                table {{ border-collapse: collapse; width: 100%; margin: 20px 0; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>
            <h1>Probability Analysis Report</h1>
            <p>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        """
        
        if 'summary' in results:
            html += "<h2>Summary</h2>"
            for key, value in results['summary'].items():
                html += f'<div class="metric"><span class="metric-label">{key}:</span> '
                html += f'<span class="metric-value">{value}</span></div>'
        
        if 'probabilities' in results:
            html += "<h2>Probability Results</h2><table>"
            html += "<tr><th>Event</th><th>Probability</th><th>Confidence</th></tr>"
            for item in results['probabilities']:
                html += f"<tr><td>{item.get('event', 'N/A')}</td>"
                html += f"<td>{item.get('probability', 0):.4f}</td>"
                html += f"<td>{item.get('confidence', 0):.4f}</td></tr>"
            html += "</table>"
        
        if 'patterns' in results:
            html += f"<h2>Pattern Analysis</h2>"
            html += f"<p>Discovered {len(results['patterns'])} patterns</p>"
        
        if 'weather_impact' in results:
            html += "<h2>Weather Impact</h2>"
            html += f"<p>Combined Impact: {results['weather_impact'].get('combined_impact', 0):.4f}</p>"
        
        html += "</body></html>"
        return html
    
    def _create_text_report(self, results: Dict[str, Any]) -> str:
        report = []
        report.append("=" * 60)
        report.append("PROBABILITY ANALYSIS REPORT")
        report.append("=" * 60)
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("")
        
        if 'summary' in results:
            report.append("SUMMARY")
            report.append("-" * 40)
            for key, value in results['summary'].items():
                report.append(f"  {key}: {value}")
            report.append("")
        
        if 'probabilities' in results:
            report.append("PROBABILITY RESULTS")
            report.append("-" * 40)
            for item in results['probabilities']:
                report.append(f"  Event: {item.get('event', 'N/A')}")
                report.append(f"    Probability: {item.get('probability', 0):.4f}")
                report.append(f"    Confidence: {item.get('confidence', 0):.4f}")
            report.append("")
        
        return "\n".join(report)