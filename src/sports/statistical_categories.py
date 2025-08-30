"""
Comprehensive statistical categories for all major sports
"""
from typing import Dict, List, Any, Optional, Union
from enum import Enum
from dataclasses import dataclass, field
import numpy as np

class StatCategory(Enum):
    """Base statistical category types"""
    OFFENSIVE = "offensive"
    DEFENSIVE = "defensive"
    SPECIAL_TEAMS = "special_teams"
    PITCHING = "pitching"
    BATTING = "batting"
    FIELDING = "fielding"
    GOALTENDING = "goaltending"
    POSSESSION = "possession"
    EFFICIENCY = "efficiency"

@dataclass
class StatDefinition:
    """Definition of a statistical category"""
    name: str
    category: StatCategory
    display_name: str
    unit: str
    per_game_avg: bool = True
    is_percentage: bool = False
    higher_is_better: bool = True
    min_sample_size: int = 1
    weather_sensitive: bool = False
    venue_sensitive: bool = False
    opponent_adjusted: bool = False
    
class NFLStatistics:
    """NFL Statistical Categories"""
    
    PASSING = {
        'completions': StatDefinition('completions', StatCategory.OFFENSIVE, 'Completions', 'count'),
        'attempts': StatDefinition('attempts', StatCategory.OFFENSIVE, 'Pass Attempts', 'count'),
        'completion_pct': StatDefinition('completion_pct', StatCategory.OFFENSIVE, 'Completion %', '%', is_percentage=True),
        'passing_yards': StatDefinition('passing_yards', StatCategory.OFFENSIVE, 'Passing Yards', 'yards', weather_sensitive=True),
        'passing_tds': StatDefinition('passing_tds', StatCategory.OFFENSIVE, 'Passing TDs', 'count'),
        'interceptions': StatDefinition('interceptions', StatCategory.OFFENSIVE, 'Interceptions', 'count', higher_is_better=False),
        'sacks_taken': StatDefinition('sacks_taken', StatCategory.OFFENSIVE, 'Sacks Taken', 'count', higher_is_better=False),
        'qb_rating': StatDefinition('qb_rating', StatCategory.OFFENSIVE, 'QB Rating', 'rating'),
        'qbr': StatDefinition('qbr', StatCategory.OFFENSIVE, 'QBR', 'rating'),
        'yards_per_attempt': StatDefinition('yards_per_attempt', StatCategory.OFFENSIVE, 'Y/A', 'yards'),
        'adjusted_yards_per_attempt': StatDefinition('adjusted_yards_per_attempt', StatCategory.OFFENSIVE, 'AY/A', 'yards'),
        'air_yards': StatDefinition('air_yards', StatCategory.OFFENSIVE, 'Air Yards', 'yards', weather_sensitive=True),
    }
    
    RUSHING = {
        'rushing_attempts': StatDefinition('rushing_attempts', StatCategory.OFFENSIVE, 'Rush Attempts', 'count'),
        'rushing_yards': StatDefinition('rushing_yards', StatCategory.OFFENSIVE, 'Rushing Yards', 'yards'),
        'rushing_tds': StatDefinition('rushing_tds', StatCategory.OFFENSIVE, 'Rushing TDs', 'count'),
        'yards_per_carry': StatDefinition('yards_per_carry', StatCategory.OFFENSIVE, 'Y/C', 'yards'),
        'long_rush': StatDefinition('long_rush', StatCategory.OFFENSIVE, 'Long Rush', 'yards'),
        'rushing_first_downs': StatDefinition('rushing_first_downs', StatCategory.OFFENSIVE, 'Rush 1st Downs', 'count'),
        'fumbles': StatDefinition('fumbles', StatCategory.OFFENSIVE, 'Fumbles', 'count', higher_is_better=False),
        'broken_tackles': StatDefinition('broken_tackles', StatCategory.OFFENSIVE, 'Broken Tackles', 'count'),
        'yards_after_contact': StatDefinition('yards_after_contact', StatCategory.OFFENSIVE, 'YAC', 'yards'),
    }
    
    RECEIVING = {
        'receptions': StatDefinition('receptions', StatCategory.OFFENSIVE, 'Receptions', 'count'),
        'targets': StatDefinition('targets', StatCategory.OFFENSIVE, 'Targets', 'count'),
        'receiving_yards': StatDefinition('receiving_yards', StatCategory.OFFENSIVE, 'Receiving Yards', 'yards'),
        'receiving_tds': StatDefinition('receiving_tds', StatCategory.OFFENSIVE, 'Receiving TDs', 'count'),
        'yards_per_reception': StatDefinition('yards_per_reception', StatCategory.OFFENSIVE, 'Y/R', 'yards'),
        'catch_rate': StatDefinition('catch_rate', StatCategory.OFFENSIVE, 'Catch Rate', '%', is_percentage=True),
        'drops': StatDefinition('drops', StatCategory.OFFENSIVE, 'Drops', 'count', higher_is_better=False),
        'yards_after_catch': StatDefinition('yards_after_catch', StatCategory.OFFENSIVE, 'YAC', 'yards'),
        'contested_catches': StatDefinition('contested_catches', StatCategory.OFFENSIVE, 'Contested Catches', 'count'),
    }
    
    DEFENSE = {
        'tackles': StatDefinition('tackles', StatCategory.DEFENSIVE, 'Tackles', 'count'),
        'solo_tackles': StatDefinition('solo_tackles', StatCategory.DEFENSIVE, 'Solo Tackles', 'count'),
        'sacks': StatDefinition('sacks', StatCategory.DEFENSIVE, 'Sacks', 'count'),
        'qb_hits': StatDefinition('qb_hits', StatCategory.DEFENSIVE, 'QB Hits', 'count'),
        'tackles_for_loss': StatDefinition('tackles_for_loss', StatCategory.DEFENSIVE, 'TFL', 'count'),
        'interceptions_def': StatDefinition('interceptions_def', StatCategory.DEFENSIVE, 'INTs', 'count'),
        'passes_defended': StatDefinition('passes_defended', StatCategory.DEFENSIVE, 'PD', 'count'),
        'forced_fumbles': StatDefinition('forced_fumbles', StatCategory.DEFENSIVE, 'FF', 'count'),
        'fumble_recoveries': StatDefinition('fumble_recoveries', StatCategory.DEFENSIVE, 'FR', 'count'),
        'defensive_tds': StatDefinition('defensive_tds', StatCategory.DEFENSIVE, 'Def TDs', 'count'),
        'hurries': StatDefinition('hurries', StatCategory.DEFENSIVE, 'Hurries', 'count'),
    }
    
    SPECIAL_TEAMS = {
        'field_goals_made': StatDefinition('field_goals_made', StatCategory.SPECIAL_TEAMS, 'FG Made', 'count'),
        'field_goals_attempted': StatDefinition('field_goals_attempted', StatCategory.SPECIAL_TEAMS, 'FG Att', 'count'),
        'field_goal_pct': StatDefinition('field_goal_pct', StatCategory.SPECIAL_TEAMS, 'FG%', '%', is_percentage=True, weather_sensitive=True),
        'extra_points_made': StatDefinition('extra_points_made', StatCategory.SPECIAL_TEAMS, 'XP Made', 'count'),
        'punt_yards': StatDefinition('punt_yards', StatCategory.SPECIAL_TEAMS, 'Punt Yards', 'yards', weather_sensitive=True),
        'punt_average': StatDefinition('punt_average', StatCategory.SPECIAL_TEAMS, 'Punt Avg', 'yards', weather_sensitive=True),
        'kickoff_return_yards': StatDefinition('kickoff_return_yards', StatCategory.SPECIAL_TEAMS, 'KR Yards', 'yards'),
        'punt_return_yards': StatDefinition('punt_return_yards', StatCategory.SPECIAL_TEAMS, 'PR Yards', 'yards'),
    }

class NBAStatistics:
    """NBA Statistical Categories"""
    
    SCORING = {
        'points': StatDefinition('points', StatCategory.OFFENSIVE, 'Points', 'points'),
        'field_goals_made': StatDefinition('field_goals_made', StatCategory.OFFENSIVE, 'FGM', 'count'),
        'field_goals_attempted': StatDefinition('field_goals_attempted', StatCategory.OFFENSIVE, 'FGA', 'count'),
        'field_goal_pct': StatDefinition('field_goal_pct', StatCategory.OFFENSIVE, 'FG%', '%', is_percentage=True),
        'three_point_made': StatDefinition('three_point_made', StatCategory.OFFENSIVE, '3PM', 'count'),
        'three_point_attempted': StatDefinition('three_point_attempted', StatCategory.OFFENSIVE, '3PA', 'count'),
        'three_point_pct': StatDefinition('three_point_pct', StatCategory.OFFENSIVE, '3P%', '%', is_percentage=True),
        'free_throws_made': StatDefinition('free_throws_made', StatCategory.OFFENSIVE, 'FTM', 'count'),
        'free_throws_attempted': StatDefinition('free_throws_attempted', StatCategory.OFFENSIVE, 'FTA', 'count'),
        'free_throw_pct': StatDefinition('free_throw_pct', StatCategory.OFFENSIVE, 'FT%', '%', is_percentage=True),
        'true_shooting_pct': StatDefinition('true_shooting_pct', StatCategory.EFFICIENCY, 'TS%', '%', is_percentage=True),
        'effective_field_goal_pct': StatDefinition('effective_field_goal_pct', StatCategory.EFFICIENCY, 'eFG%', '%', is_percentage=True),
    }
    
    REBOUNDING = {
        'rebounds': StatDefinition('rebounds', StatCategory.DEFENSIVE, 'Rebounds', 'count'),
        'offensive_rebounds': StatDefinition('offensive_rebounds', StatCategory.OFFENSIVE, 'OREB', 'count'),
        'defensive_rebounds': StatDefinition('defensive_rebounds', StatCategory.DEFENSIVE, 'DREB', 'count'),
        'rebound_pct': StatDefinition('rebound_pct', StatCategory.DEFENSIVE, 'REB%', '%', is_percentage=True),
    }
    
    PLAYMAKING = {
        'assists': StatDefinition('assists', StatCategory.OFFENSIVE, 'Assists', 'count'),
        'turnovers': StatDefinition('turnovers', StatCategory.OFFENSIVE, 'Turnovers', 'count', higher_is_better=False),
        'assist_to_turnover': StatDefinition('assist_to_turnover', StatCategory.EFFICIENCY, 'AST/TO', 'ratio'),
        'usage_rate': StatDefinition('usage_rate', StatCategory.EFFICIENCY, 'USG%', '%', is_percentage=True),
        'assist_pct': StatDefinition('assist_pct', StatCategory.EFFICIENCY, 'AST%', '%', is_percentage=True),
    }
    
    DEFENSE = {
        'steals': StatDefinition('steals', StatCategory.DEFENSIVE, 'Steals', 'count'),
        'blocks': StatDefinition('blocks', StatCategory.DEFENSIVE, 'Blocks', 'count'),
        'personal_fouls': StatDefinition('personal_fouls', StatCategory.DEFENSIVE, 'Fouls', 'count', higher_is_better=False),
        'defensive_rating': StatDefinition('defensive_rating', StatCategory.DEFENSIVE, 'DRTG', 'rating', higher_is_better=False),
        'steal_pct': StatDefinition('steal_pct', StatCategory.DEFENSIVE, 'STL%', '%', is_percentage=True),
        'block_pct': StatDefinition('block_pct', StatCategory.DEFENSIVE, 'BLK%', '%', is_percentage=True),
    }
    
    ADVANCED = {
        'player_efficiency_rating': StatDefinition('player_efficiency_rating', StatCategory.EFFICIENCY, 'PER', 'rating'),
        'offensive_rating': StatDefinition('offensive_rating', StatCategory.OFFENSIVE, 'ORTG', 'rating'),
        'plus_minus': StatDefinition('plus_minus', StatCategory.EFFICIENCY, '+/-', 'differential'),
        'box_plus_minus': StatDefinition('box_plus_minus', StatCategory.EFFICIENCY, 'BPM', 'rating'),
        'value_over_replacement': StatDefinition('value_over_replacement', StatCategory.EFFICIENCY, 'VORP', 'value'),
        'win_shares': StatDefinition('win_shares', StatCategory.EFFICIENCY, 'WS', 'shares'),
        'pace': StatDefinition('pace', StatCategory.EFFICIENCY, 'Pace', 'possessions'),
    }

class MLBStatistics:
    """MLB Statistical Categories"""
    
    BATTING = {
        'batting_average': StatDefinition('batting_average', StatCategory.BATTING, 'AVG', 'average', is_percentage=True),
        'on_base_percentage': StatDefinition('on_base_percentage', StatCategory.BATTING, 'OBP', '%', is_percentage=True),
        'slugging_percentage': StatDefinition('slugging_percentage', StatCategory.BATTING, 'SLG', '%', is_percentage=True),
        'on_base_plus_slugging': StatDefinition('on_base_plus_slugging', StatCategory.BATTING, 'OPS', 'ops'),
        'hits': StatDefinition('hits', StatCategory.BATTING, 'Hits', 'count'),
        'at_bats': StatDefinition('at_bats', StatCategory.BATTING, 'AB', 'count'),
        'runs': StatDefinition('runs', StatCategory.BATTING, 'Runs', 'count'),
        'runs_batted_in': StatDefinition('runs_batted_in', StatCategory.BATTING, 'RBI', 'count'),
        'home_runs': StatDefinition('home_runs', StatCategory.BATTING, 'HR', 'count', weather_sensitive=True, venue_sensitive=True),
        'doubles': StatDefinition('doubles', StatCategory.BATTING, '2B', 'count'),
        'triples': StatDefinition('triples', StatCategory.BATTING, '3B', 'count'),
        'stolen_bases': StatDefinition('stolen_bases', StatCategory.BATTING, 'SB', 'count'),
        'caught_stealing': StatDefinition('caught_stealing', StatCategory.BATTING, 'CS', 'count', higher_is_better=False),
        'walks': StatDefinition('walks', StatCategory.BATTING, 'BB', 'count'),
        'strikeouts_batting': StatDefinition('strikeouts_batting', StatCategory.BATTING, 'K', 'count', higher_is_better=False),
        'hit_by_pitch': StatDefinition('hit_by_pitch', StatCategory.BATTING, 'HBP', 'count'),
        'sacrifice_flies': StatDefinition('sacrifice_flies', StatCategory.BATTING, 'SF', 'count'),
        'woba': StatDefinition('woba', StatCategory.BATTING, 'wOBA', 'weighted'),
        'wrc_plus': StatDefinition('wrc_plus', StatCategory.BATTING, 'wRC+', 'plus'),
        'babip': StatDefinition('babip', StatCategory.BATTING, 'BABIP', 'average'),
        'isolated_power': StatDefinition('isolated_power', StatCategory.BATTING, 'ISO', 'power'),
    }
    
    PITCHING = {
        'earned_run_average': StatDefinition('earned_run_average', StatCategory.PITCHING, 'ERA', 'average', higher_is_better=False),
        'whip': StatDefinition('whip', StatCategory.PITCHING, 'WHIP', 'ratio', higher_is_better=False),
        'innings_pitched': StatDefinition('innings_pitched', StatCategory.PITCHING, 'IP', 'innings'),
        'strikeouts_pitching': StatDefinition('strikeouts_pitching', StatCategory.PITCHING, 'K', 'count'),
        'walks_allowed': StatDefinition('walks_allowed', StatCategory.PITCHING, 'BB', 'count', higher_is_better=False),
        'hits_allowed': StatDefinition('hits_allowed', StatCategory.PITCHING, 'H', 'count', higher_is_better=False),
        'home_runs_allowed': StatDefinition('home_runs_allowed', StatCategory.PITCHING, 'HR', 'count', higher_is_better=False),
        'earned_runs': StatDefinition('earned_runs', StatCategory.PITCHING, 'ER', 'count', higher_is_better=False),
        'wins': StatDefinition('wins', StatCategory.PITCHING, 'W', 'count'),
        'losses': StatDefinition('losses', StatCategory.PITCHING, 'L', 'count', higher_is_better=False),
        'saves': StatDefinition('saves', StatCategory.PITCHING, 'SV', 'count'),
        'blown_saves': StatDefinition('blown_saves', StatCategory.PITCHING, 'BS', 'count', higher_is_better=False),
        'holds': StatDefinition('holds', StatCategory.PITCHING, 'HLD', 'count'),
        'quality_starts': StatDefinition('quality_starts', StatCategory.PITCHING, 'QS', 'count'),
        'strikeouts_per_nine': StatDefinition('strikeouts_per_nine', StatCategory.PITCHING, 'K/9', 'rate'),
        'walks_per_nine': StatDefinition('walks_per_nine', StatCategory.PITCHING, 'BB/9', 'rate', higher_is_better=False),
        'fip': StatDefinition('fip', StatCategory.PITCHING, 'FIP', 'index', higher_is_better=False),
        'xfip': StatDefinition('xfip', StatCategory.PITCHING, 'xFIP', 'index', higher_is_better=False),
        'ground_ball_pct': StatDefinition('ground_ball_pct', StatCategory.PITCHING, 'GB%', '%', is_percentage=True),
        'fly_ball_pct': StatDefinition('fly_ball_pct', StatCategory.PITCHING, 'FB%', '%', is_percentage=True),
    }
    
    FIELDING = {
        'putouts': StatDefinition('putouts', StatCategory.FIELDING, 'PO', 'count'),
        'assists_fielding': StatDefinition('assists_fielding', StatCategory.FIELDING, 'A', 'count'),
        'errors': StatDefinition('errors', StatCategory.FIELDING, 'E', 'count', higher_is_better=False),
        'fielding_percentage': StatDefinition('fielding_percentage', StatCategory.FIELDING, 'FLD%', '%', is_percentage=True),
        'double_plays': StatDefinition('double_plays', StatCategory.FIELDING, 'DP', 'count'),
        'defensive_runs_saved': StatDefinition('defensive_runs_saved', StatCategory.FIELDING, 'DRS', 'runs'),
        'ultimate_zone_rating': StatDefinition('ultimate_zone_rating', StatCategory.FIELDING, 'UZR', 'rating'),
    }

class NHLStatistics:
    """NHL Statistical Categories"""
    
    SCORING = {
        'goals': StatDefinition('goals', StatCategory.OFFENSIVE, 'Goals', 'count'),
        'assists': StatDefinition('assists', StatCategory.OFFENSIVE, 'Assists', 'count'),
        'points': StatDefinition('points', StatCategory.OFFENSIVE, 'Points', 'count'),
        'power_play_goals': StatDefinition('power_play_goals', StatCategory.OFFENSIVE, 'PPG', 'count'),
        'power_play_assists': StatDefinition('power_play_assists', StatCategory.OFFENSIVE, 'PPA', 'count'),
        'short_handed_goals': StatDefinition('short_handed_goals', StatCategory.OFFENSIVE, 'SHG', 'count'),
        'game_winning_goals': StatDefinition('game_winning_goals', StatCategory.OFFENSIVE, 'GWG', 'count'),
        'shots': StatDefinition('shots', StatCategory.OFFENSIVE, 'Shots', 'count'),
        'shooting_pct': StatDefinition('shooting_pct', StatCategory.OFFENSIVE, 'S%', '%', is_percentage=True),
        'faceoff_wins': StatDefinition('faceoff_wins', StatCategory.OFFENSIVE, 'FOW', 'count'),
        'faceoff_pct': StatDefinition('faceoff_pct', StatCategory.OFFENSIVE, 'FO%', '%', is_percentage=True),
    }
    
    DEFENSE = {
        'plus_minus': StatDefinition('plus_minus', StatCategory.DEFENSIVE, '+/-', 'differential'),
        'penalty_minutes': StatDefinition('penalty_minutes', StatCategory.DEFENSIVE, 'PIM', 'minutes'),
        'hits': StatDefinition('hits', StatCategory.DEFENSIVE, 'Hits', 'count'),
        'blocks': StatDefinition('blocks', StatCategory.DEFENSIVE, 'Blocks', 'count'),
        'takeaways': StatDefinition('takeaways', StatCategory.DEFENSIVE, 'Takeaways', 'count'),
        'giveaways': StatDefinition('giveaways', StatCategory.DEFENSIVE, 'Giveaways', 'count', higher_is_better=False),
    }
    
    GOALTENDING = {
        'save_percentage': StatDefinition('save_percentage', StatCategory.GOALTENDING, 'SV%', '%', is_percentage=True),
        'goals_against_average': StatDefinition('goals_against_average', StatCategory.GOALTENDING, 'GAA', 'average', higher_is_better=False),
        'saves': StatDefinition('saves', StatCategory.GOALTENDING, 'Saves', 'count'),
        'shots_against': StatDefinition('shots_against', StatCategory.GOALTENDING, 'SA', 'count'),
        'wins': StatDefinition('wins', StatCategory.GOALTENDING, 'W', 'count'),
        'losses': StatDefinition('losses', StatCategory.GOALTENDING, 'L', 'count', higher_is_better=False),
        'overtime_losses': StatDefinition('overtime_losses', StatCategory.GOALTENDING, 'OTL', 'count', higher_is_better=False),
        'shutouts': StatDefinition('shutouts', StatCategory.GOALTENDING, 'SO', 'count'),
        'quality_starts_goalie': StatDefinition('quality_starts_goalie', StatCategory.GOALTENDING, 'QS', 'count'),
        'really_bad_starts': StatDefinition('really_bad_starts', StatCategory.GOALTENDING, 'RBS', 'count', higher_is_better=False),
        'goals_saved_above_average': StatDefinition('goals_saved_above_average', StatCategory.GOALTENDING, 'GSAA', 'goals'),
        'high_danger_save_pct': StatDefinition('high_danger_save_pct', StatCategory.GOALTENDING, 'HDSV%', '%', is_percentage=True),
    }
    
    ADVANCED = {
        'corsi_for_pct': StatDefinition('corsi_for_pct', StatCategory.EFFICIENCY, 'CF%', '%', is_percentage=True),
        'fenwick_for_pct': StatDefinition('fenwick_for_pct', StatCategory.EFFICIENCY, 'FF%', '%', is_percentage=True),
        'expected_goals_for': StatDefinition('expected_goals_for', StatCategory.EFFICIENCY, 'xGF', 'goals'),
        'expected_goals_against': StatDefinition('expected_goals_against', StatCategory.EFFICIENCY, 'xGA', 'goals', higher_is_better=False),
        'pdo': StatDefinition('pdo', StatCategory.EFFICIENCY, 'PDO', 'index'),
        'offensive_zone_starts': StatDefinition('offensive_zone_starts', StatCategory.EFFICIENCY, 'OZS%', '%', is_percentage=True),
        'ice_time': StatDefinition('ice_time', StatCategory.EFFICIENCY, 'TOI', 'minutes'),
    }

class SoccerStatistics:
    """Soccer/Football Statistical Categories"""
    
    SCORING = {
        'goals': StatDefinition('goals', StatCategory.OFFENSIVE, 'Goals', 'count'),
        'assists': StatDefinition('assists', StatCategory.OFFENSIVE, 'Assists', 'count'),
        'shots': StatDefinition('shots', StatCategory.OFFENSIVE, 'Shots', 'count'),
        'shots_on_target': StatDefinition('shots_on_target', StatCategory.OFFENSIVE, 'SOT', 'count'),
        'shot_accuracy': StatDefinition('shot_accuracy', StatCategory.OFFENSIVE, 'Shot Acc', '%', is_percentage=True),
        'expected_goals': StatDefinition('expected_goals', StatCategory.OFFENSIVE, 'xG', 'goals'),
        'expected_assists': StatDefinition('expected_assists', StatCategory.OFFENSIVE, 'xA', 'assists'),
        'key_passes': StatDefinition('key_passes', StatCategory.OFFENSIVE, 'Key Passes', 'count'),
        'big_chances_created': StatDefinition('big_chances_created', StatCategory.OFFENSIVE, 'Big Chances', 'count'),
        'penalties_scored': StatDefinition('penalties_scored', StatCategory.OFFENSIVE, 'Pen Scored', 'count'),
        'penalties_missed': StatDefinition('penalties_missed', StatCategory.OFFENSIVE, 'Pen Missed', 'count', higher_is_better=False),
    }
    
    PASSING = {
        'passes_completed': StatDefinition('passes_completed', StatCategory.POSSESSION, 'Passes', 'count'),
        'pass_accuracy': StatDefinition('pass_accuracy', StatCategory.POSSESSION, 'Pass Acc', '%', is_percentage=True),
        'crosses': StatDefinition('crosses', StatCategory.OFFENSIVE, 'Crosses', 'count'),
        'through_balls': StatDefinition('through_balls', StatCategory.OFFENSIVE, 'Through Balls', 'count'),
        'long_balls': StatDefinition('long_balls', StatCategory.POSSESSION, 'Long Balls', 'count'),
        'progressive_passes': StatDefinition('progressive_passes', StatCategory.POSSESSION, 'Prog Passes', 'count'),
    }
    
    DEFENSIVE = {
        'tackles': StatDefinition('tackles', StatCategory.DEFENSIVE, 'Tackles', 'count'),
        'tackles_won': StatDefinition('tackles_won', StatCategory.DEFENSIVE, 'Tackles Won', 'count'),
        'interceptions': StatDefinition('interceptions', StatCategory.DEFENSIVE, 'Interceptions', 'count'),
        'clearances': StatDefinition('clearances', StatCategory.DEFENSIVE, 'Clearances', 'count'),
        'blocks': StatDefinition('blocks', StatCategory.DEFENSIVE, 'Blocks', 'count'),
        'aerial_duels_won': StatDefinition('aerial_duels_won', StatCategory.DEFENSIVE, 'Aerials Won', 'count'),
        'ground_duels_won': StatDefinition('ground_duels_won', StatCategory.DEFENSIVE, 'Ground Duels Won', 'count'),
        'fouls_committed': StatDefinition('fouls_committed', StatCategory.DEFENSIVE, 'Fouls', 'count', higher_is_better=False),
        'yellow_cards': StatDefinition('yellow_cards', StatCategory.DEFENSIVE, 'Yellow Cards', 'count', higher_is_better=False),
        'red_cards': StatDefinition('red_cards', StatCategory.DEFENSIVE, 'Red Cards', 'count', higher_is_better=False),
    }
    
    GOALKEEPING = {
        'saves': StatDefinition('saves', StatCategory.GOALTENDING, 'Saves', 'count'),
        'save_percentage': StatDefinition('save_percentage', StatCategory.GOALTENDING, 'Save %', '%', is_percentage=True),
        'goals_conceded': StatDefinition('goals_conceded', StatCategory.GOALTENDING, 'Goals Against', 'count', higher_is_better=False),
        'clean_sheets': StatDefinition('clean_sheets', StatCategory.GOALTENDING, 'Clean Sheets', 'count'),
        'penalties_saved': StatDefinition('penalties_saved', StatCategory.GOALTENDING, 'Pen Saved', 'count'),
        'high_claims': StatDefinition('high_claims', StatCategory.GOALTENDING, 'High Claims', 'count'),
        'sweeper_clearances': StatDefinition('sweeper_clearances', StatCategory.GOALTENDING, 'Sweeper Clear', 'count'),
        'post_shot_xg': StatDefinition('post_shot_xg', StatCategory.GOALTENDING, 'PSxG', 'goals'),
    }
    
    POSSESSION = {
        'possession_pct': StatDefinition('possession_pct', StatCategory.POSSESSION, 'Possession %', '%', is_percentage=True),
        'touches': StatDefinition('touches', StatCategory.POSSESSION, 'Touches', 'count'),
        'touches_in_box': StatDefinition('touches_in_box', StatCategory.OFFENSIVE, 'Box Touches', 'count'),
        'dribbles_completed': StatDefinition('dribbles_completed', StatCategory.OFFENSIVE, 'Dribbles', 'count'),
        'progressive_carries': StatDefinition('progressive_carries', StatCategory.OFFENSIVE, 'Prog Carries', 'count'),
        'dispossessed': StatDefinition('dispossessed', StatCategory.POSSESSION, 'Dispossessed', 'count', higher_is_better=False),
        'miscontrols': StatDefinition('miscontrols', StatCategory.POSSESSION, 'Miscontrols', 'count', higher_is_better=False),
    }

class StatisticalCategoryManager:
    """Manager for all sport statistics"""
    
    def __init__(self):
        self.sports_stats = {
            'NFL': NFLStatistics(),
            'NBA': NBAStatistics(),
            'MLB': MLBStatistics(),
            'NHL': NHLStatistics(),
            'SOCCER': SoccerStatistics(),
        }
        
    def get_sport_categories(self, sport: str) -> Dict[str, Dict[str, StatDefinition]]:
        """Get all statistical categories for a sport"""
        sport_upper = sport.upper()
        if sport_upper not in self.sports_stats:
            raise ValueError(f"Sport {sport} not supported")
        
        sport_stats = self.sports_stats[sport_upper]
        categories = {}
        
        for attr_name in dir(sport_stats):
            if not attr_name.startswith('_'):
                attr = getattr(sport_stats, attr_name)
                if isinstance(attr, dict):
                    categories[attr_name.lower()] = attr
                    
        return categories
    
    def get_weather_sensitive_stats(self, sport: str) -> List[str]:
        """Get weather-sensitive statistics for a sport"""
        categories = self.get_sport_categories(sport)
        weather_stats = []
        
        for category_name, category_stats in categories.items():
            for stat_name, stat_def in category_stats.items():
                if stat_def.weather_sensitive:
                    weather_stats.append(stat_name)
                    
        return weather_stats
    
    def get_venue_sensitive_stats(self, sport: str) -> List[str]:
        """Get venue-sensitive statistics for a sport"""
        categories = self.get_sport_categories(sport)
        venue_stats = []
        
        for category_name, category_stats in categories.items():
            for stat_name, stat_def in category_stats.items():
                if stat_def.venue_sensitive:
                    venue_stats.append(stat_name)
                    
        return venue_stats
    
    def calculate_stat_percentile(self, 
                                 value: float, 
                                 stat_name: str, 
                                 sport: str,
                                 historical_values: List[float]) -> float:
        """Calculate percentile rank for a statistical value"""
        if not historical_values:
            return 50.0
            
        percentile = (sum(1 for v in historical_values if v <= value) / len(historical_values)) * 100
        
        # Check if higher is better for this stat
        categories = self.get_sport_categories(sport)
        for category_stats in categories.values():
            if stat_name in category_stats:
                if not category_stats[stat_name].higher_is_better:
                    percentile = 100 - percentile
                break
                
        return percentile
    
    def normalize_stat_value(self,
                            value: float,
                            stat_name: str,
                            sport: str,
                            mean: float,
                            std: float) -> float:
        """Normalize a statistical value using z-score"""
        if std == 0:
            return 0
            
        z_score = (value - mean) / std
        
        # Check if higher is better for this stat
        categories = self.get_sport_categories(sport)
        for category_stats in categories.values():
            if stat_name in category_stats:
                if not category_stats[stat_name].higher_is_better:
                    z_score = -z_score
                break
                
        return z_score