import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useScroll } from '@react-three/drei';
import * as THREE from 'three';

/**
 * APIStream: High-speed vertical data streaks appearing in the bottom section.
 * Simulates real-time API request flows through the gateway.
 */
export const APIStream = () => {
    const groupRef = useRef<THREE.Group>(null);
    const scroll = useScroll();
    
    const count = 30; // Number of streaks
    const streaks = useMemo(() => {
        const data = [];
        for (let i = 0; i < count; i++) {
            data.push({
                x: (Math.random() - 0.5) * 15,
                y: - (Math.random() * 40 + 70), // Positioned deep in the terminal section zone
                z: (Math.random() - 0.5) * 8,
                length: 5 + Math.random() * 15,
                speed: 1 + Math.random() * 3,
                color: i % 4 === 0 ? "#FF003C" : "#FFFFFF"
            });
        }
        return data;
    }, []);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        if (groupRef.current) {
            // Only visible between 0.65 and 0.9 scroll range (Integration section)
            const visibility = scroll.range(0.6, 0.4);
            
            groupRef.current.children.forEach((child, i) => {
                const s = streaks[i];
                // Falling streak motion (simulating light speed)
                const fallPos = ((t * s.speed * 20) % 60) - 30;
                child.position.y = (s.y - fallPos);
                
                // Fade in/out based on visibility and position
                if (child.material instanceof THREE.MeshStandardMaterial) {
                    child.material.opacity = visibility * 0.4;
                }
            });
        }
    });

    return (
        <group ref={groupRef}>
            {streaks.map((s, i) => (
                <mesh key={i} position={[s.x, 0, s.z]} rotation={[0, 0, 0]}>
                    <cylinderGeometry args={[0.01, 0.01, s.length, 4]} />
                    <meshStandardMaterial 
                        color={s.color} 
                        emissive={s.color} 
                        emissiveIntensity={8}
                        transparent 
                        opacity={0} 
                    />
                </mesh>
            ))}
        </group>
    );
};
