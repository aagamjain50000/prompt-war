# Road Rash: Sentience

A 2026 reimagining of the classic motorcycle racing game, featuring NPCs with persistent memory and dynamic AI-driven dialogue powered by Gemini.

## Features
- **3D Racing Engine**: Built with Three.js and React Three Fiber.
- **AI Memory System**: NPCs remember your behavior (e.g., brutality) across sessions.
- **Dynamic Dialogue**: Real-time insults and reactions via WebSocket and Gemini.
- **Reputation Engine**: Your actions affect your notoriety and police heat.

## Prerequisites
- Python 3.9+
- Node.js 18+
- Gemini API Key (Google AI Studio)

## Setup & Running

### 1. Backend (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
export GOOGLE_API_KEY="your_actual_key_here"
python main.py
```

### 2. Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```

## Gameplay Controls
- **WASD / Arrow Keys**: Move bike (lanes).
- **Space**: Kick / Hit adjacent rider (Logs a memory entry for the NPC).
- **Proximity**: Getting close to an NPC triggers AI reasoning and dialogue.

## Architecture
- **Frontend**: Next.js + Three.js
- **Backend**: FastAPI + WebSockets
- **AI**: Gemini 1.5 Flash
- **State**: In-memory (JSON-simulated memory)
