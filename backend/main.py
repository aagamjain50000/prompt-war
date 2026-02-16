from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import time
import uuid
import json
import asyncio
import random
from typing import Dict
from models import GameState, PlayerReputation, NPC, PersonalityTrait, MemoryEntry
from ai_service import AIService

app = FastAPI(title="Road Rash: Sentience API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for MVP
game_sessions: Dict[str, GameState] = {}

def initialize_game():
    session_id = str(uuid.uuid4())
    npcs = {
        "rider_1": NPC(id="rider_1", name="Axel", personality=[PersonalityTrait.AGGRESSIVE], lane=-2.0, z_pos=-20.0),
        "rider_2": NPC(id="rider_2", name="Tasha", personality=[PersonalityTrait.STRATEGIC], lane=2.0, z_pos=-40.0),
        "rider_3": NPC(id="rider_3", name="Officer Miller", personality=[PersonalityTrait.LAWFUL], lane=0.0, z_pos=-60.0),
    }
    game_sessions[session_id] = GameState(
        session_id=session_id,
        player_id="player_one",
        reputation=PlayerReputation(),
        npcs=npcs
    )
    return session_id

@app.get("/session/new")
async def create_session():
    session_id = initialize_game()
    return {"session_id": session_id}

@app.websocket("/ws/{session_id}")
async def game_socket(websocket: WebSocket, session_id: str):
    await websocket.accept()
    if session_id not in game_sessions:
        await websocket.close(code=1008)
        return

    state = game_sessions[session_id]
    
    async def npc_ai_manager():
        """Background task to update NPC positions and simulate world events."""
        try:
            while True:
                await asyncio.sleep(2.0) # Decision every 2 seconds
                for npc_id, npc in state.npcs.items():
                    # Get movement intent from AI
                    move = await AIService.get_npc_movement_logic(npc, 0, 0) # Mock player pos for now
                    npc.target_lane = move["target_lane"]
                    npc.speed = move["target_speed"]
                    
                    # Notify frontend of movement
                    await websocket.send_json({
                        "type": "npc_move",
                        "npc_id": npc_id,
                        "target_lane": npc.target_lane,
                        "speed": npc.speed
                    })
                
                # Chance for dynamic event
                if random.random() < 0.1:
                    event = await AIService.generate_dynamic_event(state.reputation, ["race_ongoing"])
                    await websocket.send_json({
                        "type": "world_event",
                        "event": event
                    })
        except Exception as e:
            print(f"AI Manager error: {e}")

    # Start background AI
    ai_task = asyncio.create_task(npc_ai_manager())

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "voice_input":
                speech = message["text"]
                # For now, address the nearest rider or all
                for npc in state.npcs.values():
                    response = await AIService.handle_player_speech(npc, state.reputation, speech)
                    await websocket.send_json({
                        "type": "npc_dialogue",
                        "npc_id": npc.id,
                        "npc_name": npc.name,
                        "text": response["response"],
                        "emotion": response["emotion"]
                    })
                    npc.aggression_level += response.get("aggression_change", 0)

            elif message["type"] == "proximity_alert":
                npc_id = message["npc_id"]
                if npc_id in state.npcs:
                    npc = state.npcs[npc_id]
                    reaction = await AIService.get_npc_reaction(npc, state.reputation, "Player is riding close to you.")
                    npc.aggression_level = reaction["aggression_level"]
                    await websocket.send_json({
                        "type": "npc_dialogue",
                        "npc_id": npc_id,
                        "npc_name": npc.name,
                        "emotion": reaction["emotion"],
                        "text": reaction["dialogue"]
                    })

            elif message["type"] == "combat_event":
                npc_id = message["npc_id"]
                action = message["action"]
                hit_success = message.get("success", False)
                if npc_id in state.npcs:
                    npc = state.npcs[npc_id]
                    npc.memories.append(MemoryEntry(
                        event=f"player_{action}",
                        location="highway",
                        emotion="angry" if hit_success else "mocking",
                        timestamp=time.time(),
                        description=f"Player attempted to {action} me and {'succeeded' if hit_success else 'failed'}."
                    ))
                    state.reputation.brutality += 0.1
                    if npc.personality[0] == PersonalityTrait.LAWFUL:
                        state.reputation.police_heat += 0.2
                    reaction = await AIService.get_npc_reaction(npc, state.reputation, f"Player just {action}ed you!")
                    await websocket.send_json({
                        "type": "npc_dialogue",
                        "npc_id": npc_id,
                        "text": reaction["dialogue"]
                    })

    except WebSocketDisconnect:
        ai_task.cancel()
        print(f"Client disconnected from session {session_id}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
