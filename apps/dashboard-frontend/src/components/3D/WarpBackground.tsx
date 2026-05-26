import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useScroll } from '@react-three/drei';
import * as THREE from 'three';

export const WarpBackground = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const { mouse } = useThree();
  const scroll = useScroll();
  
  const count = 20000;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        // Create an infinite vertical tube of particles
        pos[i * 3] = (Math.random() - 0.5) * 40;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 100; // Large vertical span
        pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return pos;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (pointsRef.current) {
        // Vertical drift relative to scroll
        const scrollSpeed = scroll.delta * 200;
        pointsRef.current.position.y = (t * 0.2 + scroll.offset * 20) % 20 - 10;
        
        // Gentle magnetic sway to mouse
        pointsRef.current.rotation.y = THREE.MathUtils.lerp(pointsRef.current.rotation.y, mouse.x * 0.2, 0.02);
        pointsRef.current.rotation.x = THREE.MathUtils.lerp(pointsRef.current.rotation.x, -mouse.y * 0.1, 0.02);
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3} args={[]}        />
      </bufferGeometry>
      <pointsMaterial
        size={0.015}
        color="#F5F5F5"
        transparent
        opacity={0.1}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
