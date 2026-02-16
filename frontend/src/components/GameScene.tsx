"use client";

import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, OrbitControls, Stars, Text } from "@react-three/drei";
import * as THREE from "three";

function Road({ speed = 0 }: { speed?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state, delta) => {
    if (meshRef.current) {
      // Scale scroll speed by player velocity
      const scrollSpeed = (speed / 10) + 15;
      meshRef.current.position.z += scrollSpeed * delta;
      if (meshRef.current.position.z > 50) {
        meshRef.current.position.z = -50;
      }
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
      <planeGeometry args={[10, 200]} />
      <meshStandardMaterial color="#222" />
    </mesh>
  );
}

// --- Modular Vehicle Components ---

function Sparks({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<any[]>([]);
  
  useEffect(() => {
    if (active) {
      const newParticles = Array.from({ length: 10 }).map(() => ({
        id: Math.random(),
        pos: [Math.random() - 0.5, 0.5, Math.random() - 0.5],
        vel: [Math.random() - 0.5, Math.random() * 0.5, Math.random() - 0.5],
        life: 1.0,
      }));
      setParticles(newParticles);
      const timer = setTimeout(() => setParticles([]), 300);
      return () => clearTimeout(timer);
    }
  }, [active]);

  return (
    <group>
      {particles.map(p => (
        <mesh key={p.id} position={p.pos as any}>
          <boxGeometry args={[0.05, 0.05, 0.05]} />
          <meshBasicMaterial color="#ffff00" />
        </mesh>
      ))}
    </group>
  );
}

function BikeBody({ type, color, speed = 0, hit = false, wheelRotation = 0 }: { type: string, color: string, speed?: number, hit?: boolean, wheelRotation?: number }) {
  const isPolice = type === 'police';
  const isAggressive = type === 'aggressive';
  
  return (
    <group>
      <Sparks active={hit} />
      
      {/* Main Chassis */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[0.6, 0.8, 2.2]} />
        <meshStandardMaterial 
            color={hit ? "white" : "#111"} 
            emissive={hit ? "white" : "black"}
            roughness={0.3}
        />
      </mesh>

      {/* Internal Reactor Glow */}
      <mesh position={[0, 0.4, 0.2]}>
        <boxGeometry args={[0.7, 0.4, 0.4]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} transparent opacity={0.4} />
      </mesh>

      {/* Handlebars (Minimal suggestion) */}
      <group position={[0, 0.8, -0.6]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.03, 0.03, 1]} />
            <meshStandardMaterial color="#444" />
        </mesh>
        <mesh position={[0.45, 0, 0]} rotation={[0, 0, Math.PI/2]}>
            <cylinderGeometry args={[0.04, 0.04, 0.2]} />
            <meshStandardMaterial color="#222" />
        </mesh>
        <mesh position={[-0.45, 0, 0]} rotation={[0, 0, Math.PI/2]}>
            <cylinderGeometry args={[0.04, 0.04, 0.2]} />
            <meshStandardMaterial color="#222" />
        </mesh>
      </group>

      {/* Front Fairing / Headlight Area */}
      <mesh position={[0, 0.6, -1]} rotation={[-0.4, 0, 0]}>
        <boxGeometry args={[0.5, 0.6, 0.8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>

      {/* Aggressive Spikes / Armor */}
      {isAggressive && (
        <group>
            <mesh position={[0.3, 0.5, 0]} rotation={[0, 0, 0.2]}>
                <coneGeometry args={[0.1, 0.5, 4]} />
                <meshStandardMaterial color="#333" />
            </mesh>
            <mesh position={[-0.3, 0.5, 0]} rotation={[0, 0, -0.2]}>
                <coneGeometry args={[0.1, 0.5, 4]} />
                <meshStandardMaterial color="#333" />
            </mesh>
        </group>
      )}

      {/* Police Siren Lights */}
      {isPolice && (
        <group position={[0, 1.1, 0.5]}>
            <mesh position={[0.2, 0, 0]}>
                <boxGeometry args={[0.2, 0.2, 0.2]} />
                <meshStandardMaterial color="blue" emissive="blue" emissiveIntensity={Math.sin(Date.now() * 0.01) > 0 ? 2 : 0} />
            </mesh>
            <mesh position={[-0.2, 0, 0]}>
                <boxGeometry args={[0.2, 0.2, 0.2]} />
                <meshStandardMaterial color="red" emissive="red" emissiveIntensity={Math.sin(Date.now() * 0.01) < 0 ? 2 : 0} />
            </mesh>
        </group>
      )}

      {/* Exhaust Pipes & Glow */}
      <group position={[0, 0.2, 1.1]}>
        <mesh rotation={[Math.PI/2, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.1, 0.6]} />
            <meshStandardMaterial color="#222" />
        </mesh>
        {/* Exhaust Flame/Glow */}
        <mesh position={[0, 0, 0.3]} rotation={[Math.PI/2, 0, 0]}>
            <coneGeometry args={[0.1, 0.4 * (1 + speed/200), 8]} />
            <meshStandardMaterial color="#ff4400" emissive="#ff4400" emissiveIntensity={speed/50} transparent opacity={0.6} />
        </mesh>
        <pointLight position={[0, 0, 0.5]} color="#ff4400" intensity={speed/100} />
      </group>

      {/* Wheels with rotation for motion blur illusion */}
      <mesh position={[0, 0, 0.9]} rotation={[wheelRotation, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} />
        <meshStandardMaterial color="black" roughness={1} />
        {/* Rim suggestion for motion */}
        <mesh position={[0, 0.16, 0]}>
            <boxGeometry args={[0.05, 0.1, 0.4]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
        </mesh>
      </mesh>
      <mesh position={[0, 0, -0.9]} rotation={[wheelRotation, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} />
        <meshStandardMaterial color="black" roughness={1} />
        <mesh position={[0, 0.16, 0]}>
            <boxGeometry args={[0.05, 0.1, 0.4]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
        </mesh>
      </mesh>

      {/* Fake Shadow - scales with speed */}
      <mesh position={[0, -0.38, 0]} rotation={[-Math.PI/2, 0, 0]} scale={[1, 1 + speed/500, 1]}>
        <planeGeometry args={[1.5, 3]} />
        <meshBasicMaterial color="black" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

function Bike({ 
    position, 
    targetLane, 
    color, 
    isPlayer, 
    type = 'civilian',
    speed = 0,
    hit = false
}: { 
    position: [number, number, number], 
    targetLane?: number, 
    color: string, 
    isPlayer?: boolean, 
    type?: string,
    speed?: number,
    hit?: boolean
}) {
  const meshRef = useRef<THREE.Group>(null);
  const [tilt, setTilt] = useState(0);
  const [wheelRotation, setWheelRotation] = useState(0);
  const prevX = useRef(position[0]);

  useFrame((state, delta) => {
    if (meshRef.current) {
        let currentX = meshRef.current.position.x;
        
        if (!isPlayer && targetLane !== undefined) {
            currentX = THREE.MathUtils.lerp(currentX, targetLane, 0.05);
            meshRef.current.position.x = currentX;
        } else if (isPlayer) {
            currentX = position[0];
            meshRef.current.position.x = currentX;
        }

        // Calculate tilt
        const moveDelta = currentX - prevX.current;
        const targetTilt = -moveDelta * 5;
        setTilt(t => THREE.MathUtils.lerp(t, targetTilt, 0.1));
        prevX.current = currentX;

        // Apply tilt and velocity stretch (Z-scale)
        meshRef.current.rotation.z = tilt;
        
        // Jitter on hit
        if (hit) {
            meshRef.current.position.x += (Math.random() - 0.5) * 0.1;
            meshRef.current.position.y += (Math.random() - 0.5) * 0.1;
        } else {
            meshRef.current.position.y = 0;
        }

        const stretchFactor = 1 + (speed / 1000);
        meshRef.current.scale.set(1, 1, stretchFactor);

        // Wheel rotation
        setWheelRotation(r => r + (speed / 100) * delta * 50);
    }
  });

  return (
    <group ref={meshRef} position={position}>
      <BikeBody type={type} color={color} speed={speed} hit={hit} wheelRotation={wheelRotation} />
    </group>
  );
}

function SceneController({ shakeIntensity = 0 }: { shakeIntensity?: number }) {
  const { camera } = useThree();

  useFrame(() => {
    if (shakeIntensity > 0) {
      camera.position.x = (Math.random() - 0.5) * shakeIntensity * 0.2;
      camera.position.y = 3 + (Math.random() - 0.5) * shakeIntensity * 0.2;
    } else {
      camera.position.x = 0;
      camera.position.y = 3;
    }
  });

  return null;
}

export default function GameScene({ 
    playerPos, 
    npcs,
    speed = 0,
    shakeIntensity = 0,
    isPlayerHitting = false
}: { 
    playerPos: number, 
    npcs: any[],
    speed?: number,
    shakeIntensity?: number,
    isPlayerHitting?: boolean
}) {
  return (
    <div className="w-full h-screen bg-black">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 3, 7]} />
        <SceneController shakeIntensity={shakeIntensity} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={speed/100} />
        
        <Road speed={speed} />
        
        {/* Player Bike */}
        <Bike position={[playerPos, 0, 0]} color="cyan" isPlayer type="player" speed={speed} hit={isPlayerHitting} />
        
        {/* NPC Bikes */}
        {npcs.map((npc) => {
            let type = 'civilian';
            if (npc.aggression === 'police') type = 'police';
            else if (npc.aggression === 'aggressive') type = 'aggressive';
            
            // NPCs move relative to player. We draw them based on their relative Z.
            // If NPC Z is very negative, they are behind. If positive, they are ahead.
            return (
                <group key={npc.id} position={[npc.lane, 0, -npc.z]}>
                    <Bike position={[0, 0, 0]} targetLane={npc.target_lane} color={npc.color} type={type} speed={npc.speed} />
                    <Text
                        position={[0, 1.5, 0]}
                        fontSize={0.3}
                        color={type === 'aggressive' ? '#ff003c' : (type === 'police' ? '#0088ff' : '#00f3ff')}
                        anchorX="center"
                    >
                        {npc.name}
                    </Text>
                </group>
            );
        })}
        
        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2.1} />
      </Canvas>
    </div>
  );
}
