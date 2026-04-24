import '@/lib/types';
import React from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';

export const Hallway: React.FC = () => {
  const hallLength = 4;
  const hallWidth = 1.6; // Thinner hallway
  const hallHeight = 4;

  const carpetTexture = useTexture('/red_carpet.png');
  carpetTexture.wrapS = carpetTexture.wrapT = THREE.RepeatWrapping;
  carpetTexture.repeat.set(1, 4);

  const wallTexture = useTexture('/hall_wood.jpg');
  wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;

  // Create variations for different surfaces to keep scale consistent
  // Base scale: 1 repeat per 1.6 units (matching the house width)
  const sideWallTexture = wallTexture.clone();
  sideWallTexture.repeat.set(hallLength / 1.6, 1);

  const ceilingTexture = wallTexture.clone();
  ceilingTexture.center.set(0.5, 0.5);
  ceilingTexture.rotation = Math.PI / 2;
  ceilingTexture.repeat.set(1, 1);

  const backWallTexture = wallTexture.clone();
  backWallTexture.repeat.set(1, 1);

  // Door hole dimensions to match the Room's front wall and the Door component
  const doorOpeningWidth = 1.2;
  const doorOpeningHeight = 3.2;
  const doorPosX = 0; // Centered

  const holeLeft = doorPosX - doorOpeningWidth / 2;
  const holeRight = doorPosX + doorOpeningWidth / 2;

  return (
    <group>
      {/* Red Carpet Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -hallLength / 2]} receiveShadow>
        <planeGeometry args={[hallWidth, hallLength]} />
        <meshStandardMaterial
          map={carpetTexture}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, hallHeight, -hallLength / 2]}>
        <planeGeometry args={[hallWidth, hallLength]} />
        <meshStandardMaterial map={ceilingTexture} roughness={0.8} />
      </mesh>

      {/* Side Walls */}
      <mesh position={[-hallWidth / 2, hallHeight / 2, -hallLength / 2]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[hallLength, hallHeight]} />
        <meshStandardMaterial map={sideWallTexture} roughness={0.8} />
      </mesh>
      <mesh position={[hallWidth / 2, hallHeight / 2, -hallLength / 2]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[hallLength, hallHeight]} />
        <meshStandardMaterial map={sideWallTexture} roughness={0.8} />
      </mesh>

      {/* Back Wall (Facing User at start) */}
      <mesh position={[0, hallHeight / 2, 0]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[hallWidth, hallHeight]} />
        <meshStandardMaterial map={backWallTexture} roughness={0.8} />
      </mesh>

      {/* End Wall Frame (Split into parts to create the Door Hole) */}
      <group position={[0, 0, -hallLength + 0.05]}>
        {/* Left Section */}
        <mesh position={[(-hallWidth / 2 + holeLeft) / 2, hallHeight / 2, 0]} receiveShadow>
          <planeGeometry args={[holeLeft - (-hallWidth / 2), hallHeight]} />
          <meshStandardMaterial map={backWallTexture} roughness={0.5} />
        </mesh>
        {/* Right Section */}
        <mesh position={[(holeRight + hallWidth / 2) / 2, hallHeight / 2, 0]} receiveShadow>
          <planeGeometry args={[hallWidth / 2 - holeRight, hallHeight]} />
          <meshStandardMaterial map={backWallTexture} roughness={0.5} />
        </mesh>
        {/* Top Section (above door) */}
        <mesh position={[doorPosX, (hallHeight + doorOpeningHeight) / 2, 0]} receiveShadow>
          <planeGeometry args={[doorOpeningWidth, hallHeight - doorOpeningHeight]} />
          <meshStandardMaterial map={backWallTexture} roughness={0.5} />
        </mesh>
      </group>

    </group>
  );
};