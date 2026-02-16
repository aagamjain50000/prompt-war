from pydantic import BaseModel
from typing import List, Dict, Optional
from enum import Enum

class PersonalityTrait(str, Enum):
    AGGRESSIVE = "aggressive"
    COWARD = "coward"
    STRATEGIC = "strategic"
    LAWFUL = "lawful"

class MemoryEntry(BaseModel):
    event: str
    location: str
    emotion: str
    timestamp: float
    description: str

class NPC(BaseModel):
    id: str
    name: str
    personality: List[PersonalityTrait]
    memories: List[MemoryEntry] = []
    health: float = 100.0
    aggression_level: float = 0.5
    lane: float = 0.0
    z_pos: float = -20.0
    target_lane: float = 0.0
    speed: float = 0.2

class PlayerReputation(BaseModel):
    brutality: float = 0.0
    honor: float = 0.0
    notoriety: float = 0.0
    police_heat: float = 0.0

class GameState(BaseModel):
    session_id: str
    player_id: str
    reputation: PlayerReputation
    npcs: Dict[str, NPC]
    current_race_id: Optional[str] = None
