import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useScroll, Float } from '@react-three/drei';
import * as THREE from 'three';

/**
 * NeuralBridge: A high-speed data-stream tunnel.
 * Intensifies during the 'bore zone' (middle scroll).
 */
export const NeuralBridge = () => {
    const groupRef = useRef<THREE.Group>(null);
    const scroll = useScroll();
    const { mouse } = useThree();
    
    // Create 'data shards' - more quantity for immersion
    const count = 100;
    const shards = useMemo(() => {
        const data = [];
        for (let i = 0; i < count; i++) {
            data.push({
                x: (Math.random() - 0.5) * 30,
                y: -(Math.random() * 50 + 20), // Spreading through the deep scroll gap
                z: (Math.random() - 0.5) * 15,
                rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0] as [number, number, number],
                speed: 0.1 + Math.random() * 0.4,
                color: i % 10 === 0 ? "#FF003C" : "#FFFFFF"
            });
        }
        return data;
    }, []);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        if (groupRef.current) {
            // Appearance mapping: Intensify between 0.3 and 0.7 scroll
            const visibility = scroll.range(0.2, 0.8);
            groupRef.current.position.y = - (scroll.offset * 60);
            
            groupRef.current.children.forEach((child, i) => {
                const s = shards[i];
                // Drifting motion
                child.position.y += Math.sin(t + i) * 0.01;
                child.rotation.x += 0.01;
                child.rotation.y += 0.01;
                
                // Opacity fades in/out based on global scroll position
                if (child.material instanceof THREE.MeshStandardMaterial) {
                    child.material.opacity = visibility * 0.4;
                }
            });
            
            // Mouse Parallax
            groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, mouse.x * 0.1, 0.05);
        }
    });

    return (
        <group ref={groupRef}>
            {shards.map((s, i) => (
                <Float key={i} speed={2} rotationIntensity={2} floatIntensity={1}>
                    <mesh position={[s.x, s.y, s.z]} rotation={s.rotation}>
                        <boxGeometry args={[0.2, 0.2, 0.2]} />
                        <meshStandardMaterial 
                            color={s.color} 
                            emissive={s.color}
                            emissiveIntensity={3}
                            transparent
                            opacity={0} 
                        />
                    </mesh>
                </Float>
            ))}
        </group>
    );
};
