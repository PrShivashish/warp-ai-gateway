import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MeshTransmissionMaterial, Float, useScroll } from '@react-three/drei';
import * as THREE from 'three';

const neuralVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  uniform float uTime;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec3 pos = position;
    // Organic pulsing
    pos += normal * (sin(pos.y * 5.0 + uTime * 2.0) * 0.05);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const neuralFragmentShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  uniform float uTime;
  uniform vec3 uColor;
  
  void main() {
    float pulse = sin(uTime * 3.0 + vUv.y * 10.0) * 0.5 + 0.5;
    vec3 color = mix(vec3(0.0), uColor, pulse);
    // Fresnel glow
    float fresnel = pow(1.0 - dot(vec3(0,0,1), vNormal), 2.0);
    gl_FragColor = vec4(color + (uColor * fresnel * 0.5), 1.0);
  }
`;

export const NeuralCore = () => {
  const outerRef = useRef<THREE.Mesh>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const { mouse } = useThree();
  const scroll = useScroll();

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#FF003C') }
  }), []);

  useFrame((state) => {
    const { clock } = state;
    const t = clock.getElapsedTime();
    
    if (shaderRef.current) {
        shaderRef.current.uniforms.uTime.value = t;
    }

    if (outerRef.current) {
        outerRef.current.rotation.y = t * 0.1;
        outerRef.current.rotation.x = t * 0.05;
        
        // Parallax and scroll mapping
        const targetX = 1.5 + mouse.x * 0.5;
        const targetY = -mouse.y * 0.5 - (scroll.offset * 10);
        
        outerRef.current.position.x = THREE.MathUtils.lerp(outerRef.current.position.x, targetX, 0.05);
        outerRef.current.position.y = THREE.MathUtils.lerp(outerRef.current.position.y, targetY, 0.05);
        
        // Scale with scroll
        const s = 1.8 + scroll.offset * 1.5;
        outerRef.current.scale.set(s, s, s);
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>
        <mesh ref={outerRef} position={[1.5, 0, 0]}>
            <icosahedronGeometry args={[1, 15]} />
            
            {/* The Ethereal Inner Core */}
            <mesh scale={0.97}>
                <icosahedronGeometry args={[1, 10]} />
                <shaderMaterial 
                    ref={shaderRef}
                    vertexShader={neuralVertexShader}
                    fragmentShader={neuralFragmentShader}
                    uniforms={uniforms}
                    transparent
                />
            </mesh>

            {/* The Glass Refraction Shell */}
            <MeshTransmissionMaterial 
                backside
                samples={8}
                thickness={0.6}
                roughness={0.05}
                transmission={1}
                ior={1.2}
                chromaticAberration={0.15}
                anisotropy={0.2}
                distortion={0.5}
                distortionScale={1}
                temporalDistortion={0.1}
                color="#050505"
                attenuationDistance={0.5}
                attenuationColor="#ffffff"
            />
        </mesh>
    </Float>
  );
};
