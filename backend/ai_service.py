import google.generativeai as genai
import os
import json
from typing import List, Dict
from models import NPC, PlayerReputation, MemoryEntry

# Setup Gemini - expects GOOGLE_API_KEY environment variable
genai.configure(api_key=os.environ.get("GOOGLE_API_KEY", "YOUR_API_KEY"))
model = genai.GenerativeModel('gemini-1.5-flash')

class AIService:
    @staticmethod
    async def get_npc_reaction(npc: NPC, reputation: PlayerReputation, context: str):
        prompt = f"""
        You are an NPC in a high-stakes motorcycle racing game called "Road Rash: Sentience".
        
        NPC Profile:
        - Name: {npc.name}
        - Personality: {", ".join([t.value for t in npc.personality])}
        - Past Memories: {json.dumps([m.dict() for m in npc.memories[-5:]])}
        
        Player Reputation:
        - Brutality: {reputation.brutality}
        - Honor: {reputation.honor}
        - Notoriety: {reputation.notoriety}
        
        Current Context: {context}
        
        Tasks:
        1. Decide your internal state (emotion, aggression level).
        2. Generate a short, punchy dialogue line (max 15 words) to say to the player.
        
        Output in JSON format:
        {{
            "emotion": "string",
            "aggression_level": float (0.0 to 1.0),
            "dialogue": "string"
        }}
        """
        
        try:
            response = model.generate_content(prompt)
            # Basic JSON extraction (assuming Gemini returns valid JSON in text)
            content = response.text.strip()
            if content.startswith("```json"):
                content = content.replace("```json", "").replace("```", "").strip()
            return json.loads(content)
        except Exception as e:
            print(f"Error calling Gemini: {e}")
            return {
                "emotion": "annoyed",
                "aggression_level": 0.5,
                "dialogue": "Watch your back, rookie!"
            }

    @staticmethod
    async def handle_player_speech(npc: NPC, reputation: PlayerReputation, speech: str):
        prompt = f"""
        You are {npc.name} in "Road Rash: Sentience".
        The player just said: "{speech}"
        
        Personality: {", ".join([t.value for t in npc.personality])}
        Memories: {json.dumps([m.dict() for m in npc.memories[-3:]])}
        Reputation: Brutality={reputation.brutality}, Honor={reputation.honor}
        
        Respond to the player's speech. Be in character.
        Output in JSON:
        {{
            "response": "string",
            "emotion": "string",
            "aggression_change": float (-0.2 to 0.4)
        }}
        """
        try:
            response = model.generate_content(prompt)
            content = response.text.strip()
            if content.startswith("```json"):
                content = content.replace("```json", "").replace("```", "").strip()
            return json.loads(content)
        except Exception:
            return {"response": "Shut up and ride!", "emotion": "angry", "aggression_change": 0.1}

    @staticmethod
    async def get_npc_movement_logic(npc: NPC, player_lane: float, player_z: float):
        prompt = f"""
        Decide the next racing move for {npc.name}.
        Current Lane: {npc.lane}
        Player Lane: {player_lane}
        Aggression: {npc.aggression_level}
        
        Options:
        - "ram": Try to hit the player if close.
        - "weave": Avoid the player.
        - "race": Focus on speed.
        
        Output in JSON:
        {{
            "action": "ram | weave | race",
            "target_lane": float (-4.0 to 4.0),
            "target_speed": float (0.1 to 0.5)
        }}
        """
        try:
            response = model.generate_content(prompt)
            content = response.text.strip()
            if content.startswith("```json"):
                content = content.replace("```json", "").replace("```", "").strip()
            return json.loads(content)
        except Exception:
            return {"action": "race", "target_lane": npc.lane, "target_speed": 0.2}

    @staticmethod
    async def generate_dynamic_event(reputation: PlayerReputation, recent_events: List[str]):
        prompt = f"""
        Generate a dynamic world event for "Road Rash: Sentience" based on the player's history.
        
        Player Reputation:
        - Brutality: {reputation.brutality}
        - Notoriety: {reputation.notoriety}
        - Police Heat: {reputation.police_heat}
        
        Recent History: {", ".join(recent_events)}
        
        Output in JSON format:
        {{
            "event_type": "rival_ambush | police_checkpoint | gang_invite",
            "title": "string",
            "description": "string",
            "impact": {{"heat_increase": float, "dialogue": "string"}}
        }}
        """
        try:
            response = model.generate_content(prompt)
            content = response.text.strip()
            if content.startswith("```json"):
                content = content.replace("```json", "").replace("```", "").strip()
            return json.loads(content)
        except Exception as e:
            return {
                "event_type": "police_checkpoint",
                "title": "Routine Inspection",
                "description": "The cops are looking for someone matching your description.",
                "impact": {"heat_increase": 0.1, "dialogue": "Pull over!"}
            }
