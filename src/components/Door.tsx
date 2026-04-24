import '@/lib/types';
import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Group, Mesh, Vector3, Euler } from 'three';
import { useTexture, Html, Text, Edges } from '@react-three/drei';
import { sfx } from '@/lib/sfx';

export interface DoorProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  enteredRoom: boolean;
  hideLabel: boolean;
  onInteract?: () => void;  // Called when user clicks the door to enter
}

export const Door: React.FC<DoorProps> = ({ position, rotation = [0, 0, 0], isOpen, setIsOpen, enteredRoom, hideLabel, onInteract }) => {
  const groupRef = useRef<Group>(null);
  const doorMeshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const clickLockRef = useRef(false);
  const doorTexture = useTexture('/luxury_door.png');
  const frameTexture = useTexture('/luxury_door.png');

  // Create a shared material for the frame
  const frameMaterial = React.useMemo(() => new THREE.MeshStandardMaterial({
    map: frameTexture,
    roughness: 0.4,
    metalness: 0.2,
    color: "#ffffff",
    emissive: "#000000",
    emissiveIntensity: 0,
  }), [frameTexture]);

  useFrame((_state, delta) => {
    if (doorMeshRef.current) {
      const targetRotation = isOpen ? -Math.PI / 1.8 : 0;
      doorMeshRef.current.rotation.y += (targetRotation - doorMeshRef.current.rotation.y) * 3 * delta;
    }
  });

  const handlePointerOver = () => {
    setHovered(true);
    document.body.style.cursor = 'pointer';
    sfx.playHover();
  };

  const handlePointerOut = () => {
    setHovered(false);
    document.body.style.cursor = 'auto';
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (clickLockRef.current || isOpen) return;
    clickLockRef.current = true;
    setTimeout(() => {
      clickLockRef.current = false;
    }, 500);
    sfx.playDoor();
    setIsOpen(true);
    if (onInteract) {
      onInteract();
    }
  };

  const doorWidth = 1.0;
  const doorHeight = 3.2;

  return (
    <group ref={groupRef} position={new Vector3(...position)} rotation={new Euler(...rotation)}>
      {/* Outer Door Frame (Fixed) - Premium Molding Effect */}
      <group position={[0, doorHeight / 2, 0.01]}>
        {/* Main Frame Layer 1 */}
        <mesh position={[0, doorHeight / 2 + 0.05, 0.021]}> {/* Top piece */}
          <boxGeometry args={[doorWidth + 0.2, 0.1, 0.06]} />
          <primitive object={frameMaterial} attach="material" />
          {hovered && !isOpen && <Edges lineWidth={2} threshold={15} color="white" />}
        </mesh>
        <mesh position={[-(doorWidth / 2 + 0.05), 0, 0.02]}> {/* Left piece */}
          <boxGeometry args={[0.1, doorHeight + 0.1, 0.06]} />
          <primitive object={frameMaterial} attach="material" />
          {hovered && !isOpen && <Edges lineWidth={2} threshold={15} color="white" />}
        </mesh>
        <mesh position={[doorWidth / 2 + 0.05, 0, 0.02]}> {/* Right piece */}
          <boxGeometry args={[0.1, doorHeight + 0.1, 0.06]} />
          <primitive object={frameMaterial} attach="material" />
          {hovered && !isOpen && <Edges lineWidth={2} threshold={15} color="white" />}
        </mesh>

        {/* Outer Molding Layer 2 (Slightly larger and thinner) */}
        <mesh position={[0, doorHeight / 2 + 0.1, 0.01]}> {/* Top molding */}
          <boxGeometry args={[doorWidth + 0.3, 0.05, 0.04]} />
          <primitive object={frameMaterial} attach="material" />
        </mesh>
        <mesh position={[-(doorWidth / 2 + 0.1), 0, 0.01]}> {/* Left molding */}
          <boxGeometry args={[0.05, doorHeight + 0.2, 0.04]} />
          <primitive object={frameMaterial} attach="material" />
        </mesh>
        <mesh position={[doorWidth / 2 + 0.1, 0, 0.01]}> {/* Right molding */}
          <boxGeometry args={[0.05, doorHeight + 0.2, 0.04]} />
          <primitive object={frameMaterial} attach="material" />
        </mesh>
      </group>

      {/* PIVOT GROUP - Now Left Hinge */}
      <group position={[-doorWidth / 2, 0, 0]}>
        <group ref={doorMeshRef}>
          <group
            position={[doorWidth / 2, doorHeight / 2, 0]}
            onClick={handleClick}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          >
            {/* Door Body */}
            <mesh castShadow receiveShadow position={[0, 0, 0.01]}>
              <boxGeometry args={[doorWidth, doorHeight, 0.05]} />
              <meshStandardMaterial
                map={doorTexture}
                roughness={0.4}
                metalness={0.2}
              />
            </mesh>

            {/* Handle - Front (Right side) */}
            <group position={[doorWidth / 2 - 0.15, -0.1, 0.06]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.03, 0.03, 0.02]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
              </mesh>
              <mesh position={[0.08, 0, 0.03]} rotation={[0, 0, Math.PI / 2]}>
                <capsuleGeometry args={[0.015, 0.15]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
              </mesh>
            </group>

            {/* Handle - Back (Right side relative to back view, matches front position) */}
            <group position={[doorWidth / 2 - 0.15, -0.1, -0.04]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.03, 0.03, 0.02]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
              </mesh>
              <mesh position={[0.08, 0, -0.03]} rotation={[0, 0, Math.PI / 2]}>
                <capsuleGeometry args={[0.015, 0.15]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
              </mesh>
            </group>

            {/* Nameplate "SUVO" */}
            <group position={[0, 0.6, 0.05]}>
              {/* Golden Border Frame */}
              <mesh position={[0, 0, -0.005]}>
                <boxGeometry args={[0.53, 0.23, 0.02]} />
                <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
              </mesh>
              {/* The Black Board */}
              <mesh castShadow>
                <boxGeometry args={[0.5, 0.2, 0.02]} />
                <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
              </mesh>
              {/* The Text */}
              <Text
                position={[0, 0, 0.011]}
                fontSize={0.12}
                color="#fbbf24" // Amber/Gold
                anchorX="center"
                anchorY="middle"
              >
                SUVO
              </Text>
            </group>
          </group>
        </group>
      </group>

      {!isOpen && !hideLabel && (
        <Html position={[0, doorHeight / 2, 0.1]} center distanceFactor={5}>
          <style>{`
            @keyframes float-label {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-10px); }
            }
            @keyframes ripple-wave {
              0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.6), 0 0 20px rgba(255, 255, 255, 0.3); }
              100% { box-shadow: 0 0 0 40px rgba(255, 255, 255, 0), 0 0 30px rgba(255, 255, 255, 0); }
            }
          `}</style>
          {/* Wrapper handles the floating animation so scale transform on inner div works independently */}
          <div style={{ animation: 'float-label 3s ease-in-out infinite' }}>
            <div
              onMouseEnter={() => {
                setHovered(true);
                document.body.style.cursor = 'pointer';
              }}
              onMouseLeave={() => {
                setHovered(false);
                document.body.style.cursor = 'auto';
              }}
              onClick={handleClick}
              style={{
                fontFamily: '"Outfit", sans-serif',
                fontSize: '0.75rem',
                fontWeight: '600',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: 'rgba(255, 255, 255, 0.95)',
                background: 'transparent',
                width: '90px',
                height: '90px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                border: '1.5px solid rgba(255, 255, 255, 0.9)',
                whiteSpace: 'normal',
                textAlign: 'center',
                lineHeight: '1.2',
                pointerEvents: 'auto',
                cursor: 'pointer',
                // Hover Interactions
                transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                transform: hovered ? 'scale(1.15)' : 'scale(1)',
                boxShadow: hovered ? 'none' : '0 0 15px rgba(255, 255, 255, 0.1)',
                animation: hovered ? 'ripple-wave 1.5s infinite' : 'none',
              }}
            >
              Click
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};
