"use client";

import React, { useState, useEffect, useRef } from 'react';
import GameScene from '@/components/GameScene';
import { MessageSquare, Shield, Zap, Flame } from 'lucide-react';

export default function GamePage() {
    const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
    const [playerLane, setPlayerLane] = useState(0);
    const [dialogue, setDialogue] = useState<{name: string, text: string} | null>(null);
    const [reputation, setReputation] = useState({ brutality: 0.2, honor: 0.5, notoriety: 0.3, heat: 0.4 });
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);
    
    // UI states
    const [isShaking, setIsShaking] = useState(false);
    const [fakeSpeed, setFakeSpeed] = useState(0);
    const [events, setEvents] = useState<{id: string, text: string, type: 'info' | 'warn'}[]>([]);

    // Dynamic NPCs for the scene
    const [npcs, setNpcs] = useState([
        { id: 'rider_1', name: 'AXEL-7', lane: -2.0, z: -20, color: 'orange', target_lane: -2.0, aggression: 'neutral' },
        { id: 'rider_2', name: 'TASHA-V', lane: 2.0, z: -40, color: 'purple', target_lane: 2.0, aggression: 'neutral' },
        { id: 'rider_3', name: 'MILLER-COP', lane: 0.0, z: -60, color: 'blue', target_lane: 0.0, aggression: 'neutral' },
    ]);

    useEffect(() => {
        if (gameState !== 'playing') return;

        // Step 1: Initialize Session
        fetch('http://localhost:8000/session/new')
            .then(res => res.json())
            .then(data => {
                setSessionId(data.session_id);
                const socket = new WebSocket(`ws://localhost:8000/ws/${data.session_id}`);
                
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

        // Step 2: Controls
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'a' || e.key === 'ArrowLeft') setPlayerLane(prev => Math.max(prev - 0.5, -4));
            if (e.key === 'd' || e.key === 'ArrowRight') setPlayerLane(prev => Math.min(prev + 0.5, 4));
            if (e.key === 'v') startVoiceInput(); 
            if (e.key === ' ') {
                if (ws && sessionId) {
                    setIsShaking(true);
                    setTimeout(() => setIsShaking(false), 200);
                    ws.send(JSON.stringify({
                        type: 'combat_event',
                        npc_id: 'rider_1',
                        action: 'hit',
                        success: true
                    }));
                    setReputation(prev => ({...prev, brutality: Math.min(1, prev.brutality + 0.05)}));
                }
            }
            if (e.key === 'q') setGameState('gameover');
        };

        const startVoiceInput = () => {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRecognition) return;
            
            const recognition = new SpeechRecognition();
            recognition.onstart = () => setIsListening(true);
            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                if (ws) ws.send(JSON.stringify({ type: 'voice_input', text: transcript }));
            };
            recognition.onend = () => setIsListening(false);
            recognition.start();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [ws, sessionId, gameState]);

    // Speed simulation logic
    useEffect(() => {
        if (gameState !== 'playing') {
            setFakeSpeed(0);
            return;
        }
        const interval = setInterval(() => {
            setFakeSpeed(s => 140 + Math.sin(Date.now() / 1000) * 10);
        }, 100);
        return () => clearInterval(interval);
    }, [gameState]);

    // Proximity logic
    useEffect(() => {
        if (gameState !== 'playing') return;
        const interval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                npcs.forEach(npc => {
                    if (Math.abs(playerLane - npc.lane) < 1.0) {
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
                speed={fakeSpeed} 
                isPlayerHitting={isShaking} 
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
                    {fakeSpeed > 145 && (
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

                    {/* TOP HUD: Event Banners */}
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 w-full max-w-lg pointer-events-none">
                        {events.map((event) => (
                            <div key={event.id} className={`glass-panel px-6 py-2 border-l-4 ${event.type === 'warn' ? 'border-red-500 text-red-500' : 'border-cyan-500 text-cyan-400'} animate-in slide-in-from-top-4 font-audiowide uppercase tracking-wider text-sm`}>
                                {event.text}
                            </div>
                        ))}
                    </div>

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
                                    {Math.floor(fakeSpeed)}
                                </span>
                                <span className="text-xs text-cyan-500 font-audiowide">KPH</span>
                            </div>
                            <div className="w-full h-1 bg-cyan-900/40 mt-3 relative overflow-hidden">
                                <div className="absolute inset-0 bg-cyan-500 shadow-[0_0_15px_#00f3ff]" style={{ width: `${(fakeSpeed / 200) * 100}%` }} />
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
