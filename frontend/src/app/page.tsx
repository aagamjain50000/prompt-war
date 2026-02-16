"use client";

import React, { useState, useEffect, useRef } from 'react';
import GameScene from '@/components/GameScene';
import { MessageSquare, Shield, Zap, Flame } from 'lucide-react';
import * as THREE from 'three';

export default function GamePage() {
    const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
    const [playerLane, setPlayerLane] = useState(0);
    const [dialogue, setDialogue] = useState<{name: string, text: string} | null>(null);
    const [reputation, setReputation] = useState({ brutality: 0.2, honor: 0.5, notoriety: 0.3, heat: 0.4 });
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);
    
    // Physics and Race States
    const [isShaking, setIsShaking] = useState(false);
    const [shakeIntensity, setShakeIntensity] = useState(0);
    const [hitStop, setHitStop] = useState(false);
    const [velocity, setVelocity] = useState(0); // Current speed in KPH
    const [distance, setDistance] = useState(0); 
    const [isFinished, setIsFinished] = useState(false);
    const [events, setEvents] = useState<{id: string, text: string, type: 'info' | 'warn'}[]>([]);
    const [isAccelerating, setIsAccelerating] = useState(false);
    const [isBraking, setIsBraking] = useState(false);

    const RACE_LIMIT = 3000;

    // Initial NPCs with relative Z positions and identities
    const [npcs, setNpcs] = useState([
        { id: 'rider_1', name: 'AXEL-7', lane: -2.0, z: 15, color: '#ff4400', target_lane: -2, speed: 135, aggression: 'aggressive', distance: 15 },
        { id: 'rider_2', name: 'TASHA-V', lane: 2.0, z: 25, color: '#8800ff', target_lane: 2, speed: 142, aggression: 'neutral', distance: 25 },
        { id: 'rider_3', name: 'MILLER-COP', lane: 0.0, z: 40, color: '#0066ff', target_lane: 0, speed: 150, aggression: 'police', distance: 40 },
        { id: 'rider_4', name: 'GANG-01', lane: -4.0, z: 60, color: '#555', target_lane: -4, speed: 130, aggression: 'neutral', distance: 60 },
    ]);

    useEffect(() => {
        if (gameState !== 'playing') return;

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://road-rash-backend-836049237338.us-central1.run.app';
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'ws://localhost:8000';

        fetch(`${backendUrl}/session/new`)
            .then(res => res.json())
            .then(data => {
                setSessionId(data.session_id);
                const wsProtocol = socketUrl.startsWith('https') ? 'wss' : 'ws';
                const finalSocketUrl = socketUrl.includes('run.app') 
                    ? `${socketUrl}/ws/${data.session_id}`
                    : `${socketUrl.replace('http', 'ws')}/ws/${data.session_id}`;
                
                const socket = new WebSocket(finalSocketUrl);
                
                socket.onmessage = (event) => {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'npc_dialogue') {
                        setDialogue({ name: msg.npc_name || 'Rider', text: msg.text });
                        setTimeout(() => setDialogue(null), 5000);
                    } else if (msg.type === 'npc_move') {
                        setNpcs(prev => prev.map(n => 
                            n.id === msg.npc_id ? { ...n, target_lane: msg.target_lane } : n
                        ));
                    } else if (msg.type === 'world_event') {
                        const newEvent = { id: Math.random().toString(), text: msg.event.title, type: 'warn' as const };
                        setEvents(prev => [newEvent, ...prev].slice(0, 3));
                        setTimeout(() => setEvents(prev => prev.filter(e => e.id !== newEvent.id)), 4000);
                    }
                };
                setWs(socket);
            });

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'a' || e.key === 'ArrowLeft') setPlayerLane(prev => Math.max(prev - 0.5, -4));
            if (e.key === 'd' || e.key === 'ArrowRight') setPlayerLane(prev => Math.min(prev + 0.5, 4));
            if (e.key === 'w' || e.key === 'ArrowUp') setIsAccelerating(true);
            if (e.key === 's' || e.key === 'ArrowDown') setIsBraking(true);
            if (e.key === 'v') startVoiceInput(); 
            if (e.key === ' ') {
                if (ws && ws.readyState === WebSocket.OPEN && sessionId) {
                    // Trigger Combat Feedback
                    setHitStop(true);
                    setShakeIntensity(2.0);
                    setTimeout(() => setHitStop(false), 80); // Hit-stop duration
                    setTimeout(() => setShakeIntensity(0), 300); // Shake duration
                    
                    setNpcs(prev => prev.map(n => 
                        n.id === 'rider_1' ? { ...n, speed: n.speed + 20, target_lane: playerLane } : n
                    ));
                    
                    ws.send(JSON.stringify({ type: 'combat_event', npc_id: 'rider_1', action: 'hit', success: true }));
                    setReputation(prev => ({...prev, brutality: Math.min(1, prev.brutality + 0.05)}));
                }
            }
            if (e.key === 'q') setGameState('gameover');
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'w' || e.key === 'ArrowUp') setIsAccelerating(false);
            if (e.key === 's' || e.key === 'ArrowDown') setIsBraking(false);
        };

        const startVoiceInput = () => {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRecognition) return;
            const recognition = new SpeechRecognition();
            recognition.onstart = () => setIsListening(true);
            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'voice_input', text: transcript }));
                }
            };
            recognition.onend = () => setIsListening(false);
            recognition.start();
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [ws, sessionId, gameState]);

    // Game Loop: Speed and NPC Movement
    useEffect(() => {
        if (gameState !== 'playing' || isFinished) return;

        let lastTime = Date.now();
        const interval = setInterval(() => {
            if (hitStop) return; // Time stop effect

            const now = Date.now();
            const delta = (now - lastTime) / 1000;
            lastTime = now;

            // Player Physics
            setVelocity(v => {
                let nextV = v;
                if (isAccelerating) nextV += 45 * delta; // Accel
                else if (isBraking) nextV -= 120 * delta; // Hard brake
                else nextV -= 20 * delta; // Natural drag

                return Math.max(0, Math.min(240, nextV));
            });

            // Update NPC positions based on relative speed
            setNpcs(prev => {
                const newNpcs = prev.map(npc => {
                    // Constant forward motion for NPC
                    const npcMovement = npc.speed * 0.05 * delta * 15;
                    const newTotalDist = npc.distance + npcMovement;

                    // Relative Z for rendering
                    const relativeZ = npc.z + (npc.speed - velocity) * 0.05 * delta * 15;
                    
                    // Weaving/Drift
                    const driftSpeed = npc.aggression === 'aggressive' ? 2 : 0.5;
                    const drift = Math.sin(now / 1000 + npc.id.length) * 0.02 * driftSpeed;
                    
                    // Lane Following
                    let currentLane = npc.lane;
                    const laneTarget = npc.target_lane || 0;
                    currentLane = THREE.MathUtils.lerp(currentLane, laneTarget, 2 * delta);

                    // Overtaking AI
                    let nextTargetLane = npc.target_lane;
                    if (Math.abs(npc.z) < 8 && npc.z < 0 && Math.abs(npc.lane - playerLane) < 1.0) {
                        nextTargetLane = playerLane > 0 ? npc.lane - 2 : npc.lane + 2;
                        nextTargetLane = Math.max(-4, Math.min(4, nextTargetLane));
                    }

                    return {
                        ...npc,
                        lane: currentLane + drift,
                        z: relativeZ,
                        distance: newTotalDist,
                        target_lane: nextTargetLane
                    };
                });

                // Collision Detection
                newNpcs.forEach(npc => {
                    const dist = Math.sqrt(Math.pow(npc.lane - playerLane, 2) + Math.pow(npc.z, 2));
                    if (dist < 1.5) {
                        setShakeIntensity(1.5);
                        setTimeout(() => setShakeIntensity(0), 200);
                        setVelocity(v => Math.max(0, v - 120 * delta));
                        const pushDir = playerLane > npc.lane ? 0.4 : -0.4;
                        setPlayerLane(p => Math.max(-4, Math.min(4, p + pushDir)));
                        
                        // NPC boosts away after hitting player
                        npc.speed += 5;
                    }
                });

                return newNpcs;
            });

            setDistance(d => {
                const nextD = d + velocity * 0.05 * delta * 15;
                if (nextD >= RACE_LIMIT) {
                    setIsFinished(true);
                    setVelocity(0);
                }
                return nextD;
            });
        }, 16);

        return () => clearInterval(interval);
    }, [gameState, isAccelerating, isBraking, velocity, hitStop, isFinished, playerLane]);

    // Proximity logic
    useEffect(() => {
        if (gameState !== 'playing') return;
        const interval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                npcs.forEach(npc => {
                    // Alert if within interaction range (Z-axis is now relative)
                    if (Math.abs(playerLane - npc.lane) < 1.0 && Math.abs(npc.z) < 5) {
                        ws.send(JSON.stringify({ type: 'proximity_alert', npc_id: npc.id }));
                    }
                });
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [playerLane, ws, npcs, gameState]);

    return (
        <main className={`relative w-full h-screen overflow-hidden ${isShaking ? 'shake-effect' : ''}`}>
            {/* 3D Scene */}
            <GameScene 
                playerPos={playerLane} 
                npcs={npcs} 
                speed={velocity} 
                shakeIntensity={shakeIntensity}
                isPlayerHitting={hitStop} 
            />

            {/* START MENU */}
            {gameState === 'menu' && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in transition-all duration-1000">
                    <div className="flex flex-col items-center text-center p-12 glass-panel neon-border-cyan rounded-3xl animate-in zoom-in-95 duration-700">
                        <div className="text-xs font-audiowide text-cyan-500 tracking-[1em] mb-4 opacity-70">PROJECT</div>
                        <h1 className="text-7xl font-orbitron font-black italic tracking-tighter text-white mb-2 drop-shadow-[0_0_30px_#00f3ff]">
                            ROAD RASH<br/>
                            <span className="text-cyan-500">SENTIENCE</span>
                        </h1>
                        <div className="h-px w-32 bg-cyan-500/30 my-8" />
                        <button 
                            onClick={() => setGameState('playing')}
                            className="bg-cyan-500/10 hover:bg-cyan-500/20 border-2 border-cyan-500 text-cyan-500 font-audiowide px-10 py-4 rounded-full tracking-[0.3em] transition-all hover:scale-105 active:scale-95 group"
                        >
                            IGNITE <span className="opacity-50 group-hover:opacity-100 transition-opacity">ENGINE</span>
                        </button>
                        <div className="mt-8 text-[10px] text-white/40 font-audiowide tracking-widest uppercase">
                            WASD to Ride • Space to Strike • V to Negotiate
                        </div>
                    </div>
                </div>
            )}

            {/* GAME OVER SCREEN */}
            {gameState === 'gameover' && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-900/60 backdrop-blur-xl animate-in slide-in-from-top-full duration-1000">
                    <div className="flex flex-col items-center text-center">
                        <h2 className="text-9xl font-orbitron font-black text-white italic tracking-tighter mb-4 shadow-red-500 drop-shadow-[0_0_50px_#ff003c]">
                            WRECKED
                        </h2>
                        <div className="glass-panel p-6 neon-border-red">
                            <div className="text-xl font-audiowide text-red-500 mb-2 uppercase">Heat Level Critical</div>
                            <div className="text-white/60 text-sm">You were taken out by Axel-7. Rep: -20</div>
                        </div>
                        <button 
                            onClick={() => {
                                setGameState('playing');
                                setReputation({ brutality: 0.2, honor: 0.5, notoriety: 0.3, heat: 0.1 });
                            }}
                            className="mt-12 text-white font-audiowide tracking-[0.5em] border-b-2 border-white/20 hover:border-white transition-all pb-2"
                        >
                            RESPAWN
                        </button>
                    </div>
                </div>
            )}

            {gameState === 'playing' && (
                <>
                    {/* Speed Lines Overlay */}
                    {velocity > 145 && (
                        <div className="absolute inset-0 pointer-events-none opacity-40">
                            {[...Array(20)].map((_, i) => (
                                <div 
                                    key={i} 
                                    className="speed-line" 
                                    style={{
                                        top: `${Math.random() * 100}%`,
                                        left: `-20%`,
                                        width: `${20 + Math.random() * 30}%`,
                                        transform: `rotate(${Math.random() * 2 - 1}deg)`,
                                        filter: 'blur(1px)'
                                    }} 
                                />
                            ))}
                        </div>
                    )}

                    {/* TOP HUD: Event Banners & Progress */}
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 w-full max-w-lg pointer-events-none">
                        {events.map((event) => (
                            <div key={event.id} className={`glass-panel px-6 py-2 border-l-4 ${event.type === 'warn' ? 'border-red-500 text-red-500' : 'border-cyan-500 text-cyan-400'} animate-in slide-in-from-top-4 font-audiowide uppercase tracking-wider text-sm`}>
                                {event.text}
                            </div>
                        ))}

                        {/* Finish Warning */}
                        {distance > RACE_LIMIT - 500 && !isFinished && (
                            <div className="bg-red-600 text-white font-orbitron font-black italic px-8 py-2 skew-x-[-20deg] animate-pulse shadow-[0_0_30px_#ff0000]">
                                <span className="inline-block skew-x-[20deg]">LAST STRETCH • FINISH LINE AHEAD</span>
                            </div>
                        )}
                        
                        <div className="mt-4 glass-panel px-4 py-1 flex items-center gap-3">
                            <div className="text-[10px] text-white/40 font-audiowide uppercase tracking-[0.3em]">Track Progress</div>
                            <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-cyan-500 shadow-[0_0_10px_#00f3ff] transition-all duration-300" style={{ width: `${(distance / RACE_LIMIT) * 100}%` }} />
                            </div>
                            <div className="text-[10px] text-cyan-500 font-mono">{Math.floor(distance)}m / {RACE_LIMIT}m</div>
                        </div>
                    </div>

                    {/* LIVE SCOREBOARD */}
                    <div className="absolute top-10 right-10 flex flex-col gap-2 pointer-events-none w-48">
                        <div className="text-[10px] font-audiowide text-white/40 tracking-widest uppercase mb-1">Live Standings</div>
                        {[
                            { name: 'YOU', dist: distance, isPlayer: true },
                            ...npcs.map(n => ({ name: n.name, dist: n.distance, isPlayer: false }))
                        ]
                        .sort((a, b) => b.dist - a.dist)
                        .map((racer, idx) => (
                            <div key={racer.name} className={`glass-panel px-3 py-1 flex justify-between items-center border-l-2 transition-all duration-300 ${racer.isPlayer ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/10'}`}>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-white/50">{idx + 1}</span>
                                    <span className={`text-[10px] font-audiowide ${racer.isPlayer ? 'text-cyan-400' : 'text-white/80'}`}>{racer.name}</span>
                                </div>
                                <span className="text-[8px] font-mono text-white/30">{Math.floor(RACE_LIMIT - racer.dist)}m</span>
                            </div>
                        ))}
                    </div>

                    {/* RACE FINISH OVERLAY */}
                    {isFinished && (
                        <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-1000">
                             <div className="text-xs font-audiowide text-cyan-500 tracking-[1em] mb-4 animate-bounce">RACE COMPLETE</div>
                             <h2 className="text-8xl font-orbitron font-black italic text-white drop-shadow-[0_0_30px_#00f3ff] mb-8">
                                 {(() => {
                                     const sorted = [{ name: 'YOU', dist: distance }, ...npcs.map(n => ({ name: n.name, dist: n.distance }))].sort((a,b) => b.dist - a.dist);
                                     const rank = sorted.findIndex(r => r.name === 'YOU') + 1;
                                     const suffix = rank === 1 ? 'ST' : rank === 2 ? 'ND' : rank === 3 ? 'RD' : 'TH';
                                     return `${rank}${suffix} PLACE`;
                                 })()}
                             </h2>
                             
                             <div className="glass-panel p-8 neon-border-cyan flex flex-col items-center gap-6 max-w-md w-full">
                                <div className="text-cyan-500 font-audiowide tracking-widest uppercase text-sm border-b border-cyan-500/30 pb-2 w-full text-center">Final Results</div>
                                <div className="w-full space-y-4">
                                    {[{ name: 'YOU', dist: distance, isPlayer: true }, ...npcs.map(n => ({ name: n.name, dist: n.distance, isPlayer: false }))]
                                      .sort((a,b) => b.dist - a.dist)
                                      .map((r, i) => (
                                        <div key={r.name} className="flex justify-between items-center">
                                            <span className={`font-audiowide text-sm ${r.isPlayer ? 'text-cyan-400' : 'text-white/60'}`}>{i+1}. {r.name}</span>
                                            <span className="font-mono text-xs text-white/40">{Math.floor(r.dist)}m traveled</span>
                                        </div>
                                      ))
                                    }
                                </div>
                                <button 
                                    onClick={() => window.location.reload()}
                                    className="mt-6 bg-cyan-400 text-black font-audiowide px-8 py-3 rounded-full hover:bg-cyan-300 transition-all hover:scale-110"
                                >
                                    RACE AGAIN
                                </button>
                             </div>
                        </div>
                    )}

                    {/* SIDE HUD: Reputation & Stats */}
                    <div className="absolute top-10 left-10 flex flex-col gap-6 pointer-events-none w-64">
                        <div className="glass-panel p-4 rounded-br-3xl neon-border-cyan">
                            <div className="text-[10px] text-cyan-500 font-audiowide uppercase tracking-widest mb-3 flex justify-between">
                                <span>Reputation</span>
                                <span>{Math.floor(reputation.notoriety * 100)}%</span>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-[8px] uppercase text-white/50 mb-1">
                                        <span>Brutality</span>
                                        <span>{Math.floor(reputation.brutality * 100)}%</span>
                                    </div>
                                    <div className="h-1 bg-white/10 overflow-hidden">
                                        <div className="h-full bg-red-500 transition-all duration-500 shadow-[0_0_10px_#ff003c]" style={{ width: `${reputation.brutality * 100}%` }} />
                                    </div>
                                </div>
                                
                                <div>
                                    <div className="flex justify-between text-[8px] uppercase text-white/50 mb-1">
                                        <span>Heat Level</span>
                                        <span>{Math.floor(reputation.heat * 100)}%</span>
                                    </div>
                                    <div className="h-1 bg-white/10 overflow-hidden">
                                        <div className="h-full bg-orange-500 transition-all duration-500 shadow-[0_0_10px_#ff8c00]" style={{ width: `${reputation.heat * 100}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sentience Indicator */}
                        <div className="glass-panel p-3 rounded-tr-xl rounded-bl-xl border-[#222] flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${dialogue ? 'bg-cyan-500 pulse-sentience shadow-[0_0_10px_#00f3ff]' : 'bg-white/20'}`} />
                            <div className="text-[10px] font-audiowide tracking-widest text-white/80 uppercase">
                                {dialogue ? 'AI Reasoning Active' : 'AI Latency: 22ms'}
                            </div>
                        </div>
                    </div>

                    {/* BOTTOM HUD: Speedometer */}
                    <div className="absolute bottom-10 right-10 pointer-events-none">
                        <div className="glass-panel p-6 rounded-tl-3xl rounded-br-xl flex flex-col items-end neon-border-cyan bg-gradient-to-br from-black/80 to-transparent">
                            <div className="text-[10px] text-cyan-500 font-audiowide uppercase tracking-[0.2em] mb-1">Velocity</div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-6xl font-orbitron font-black italic tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                                    {Math.floor(velocity)}
                                </span>
                                <span className="text-xs text-cyan-500 font-audiowide">KPH</span>
                            </div>
                            <div className="w-full h-1 bg-cyan-900/40 mt-3 relative overflow-hidden">
                                <div className="absolute inset-0 bg-cyan-500 shadow-[0_0_15px_#00f3ff]" style={{ width: `${(velocity / 200) * 100}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* AI Dialogue Overlay */}
                    {dialogue && (
                        <div className="absolute bottom-10 left-10 w-full max-w-sm animate-in fade-in slide-in-from-left-4 duration-500 pointer-events-none">
                            <div className="glass-panel p-5 rounded-tr-3xl border-l-4 border-cyan-500 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500/20 animate-pulse" />
                                <div className="text-[9px] font-bold text-cyan-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                                    <MessageSquare size={12} strokeWidth={3} /> {dialogue.name.toUpperCase()}
                                </div>
                                <div className="text-white font-medium text-lg leading-tight tracking-tight italic">
                                    "{dialogue.text}"
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </main>
    );
}
