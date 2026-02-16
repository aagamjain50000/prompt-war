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

## 🚀 Deployment (Google Cloud)

### 1. Push to GitHub
Ensure all changes are pushed to your repository:
```bash
git push
```

### 2. Backend (Cloud Run)
1. In GCP Console, create a Cloud Run service from your GitHub repo.
2. Select **Dockerfile** as the build type.
3. Set **Dockerfile path** to `backend/Dockerfile`.
4. Add environment variable `GOOGLE_API_KEY`.

### 3. Frontend (Cloud Run)
1. Create another Cloud Run service.
2. Set **Dockerfile path** to `frontend/Dockerfile`.

## 🕹️ Controls
- **WASD / Arrows**: Move bike across 3 lanes.
- **Space**: **COMBAT STRIKE** - Knock adjacent riders. NPCs will remember your brutality!
- **V**: **VOICE NEGOTIATION** - Hold 'V' to talk to NPCs.
- **Q**: **SELF DESTRUCT** - Immediate Game Over.

## 🎨 Technology Stack
- **Frontend**: Next.js 15, Three.js, React Three Fiber, Tailwind CSS.
- **Backend**: FastAPI, WebSockets, Python 3.11.
- **AI**: Gemini 1.5 Flash (Memory & Dialogue).
