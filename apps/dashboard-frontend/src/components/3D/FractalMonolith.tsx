import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MeshTransmissionMaterial, useScroll, Float } from '@react-three/drei';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  uniform float uTime;
  uniform float uDistortion;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    vec3 pos = position;
    // Organic fracture displacement
    float noise = sin(pos.x * 2.0 + uTime) * cos(pos.y * 2.0 + uTime) * uDistortion;
    pos += normal * noise;
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  uniform float uTime;
  uniform vec3 uColor;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    
    // Fresnel calculation for ethereal edges
    float fresnel = pow(1.0 - dot(viewDir, normal), 3.0);
    
    vec3 color = mix(vec3(0.01), uColor, fresnel * 0.8);
    
    // Pulse effect
    float pulse = sin(uTime * 0.5) * 0.1 + 0.9;
    gl_FragColor = vec4(color * pulse, 0.95);
  }
`;

export const FractalMonolith = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<any>(null);
  const { mouse } = useThree();
  const scroll = useScroll();

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uDistortion: { value: 0.1 },
    uColor: { value: new THREE.Color('#FF003C') }
  }), []);

  useFrame((state) => {
    const { clock } = state;
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
      
      // Map scroll to distortion / fracture
      const scrollOffset = scroll.offset;
      materialRef.current.uniforms.uDistortion.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uDistortion.value,
        scrollOffset * 1.5,
        0.1
      );
    }

    if (meshRef.current) {
      // Magnetic reaction to mouse
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, (mouse.x * Math.PI) / 8, 0.05);
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, -(mouse.y * Math.PI) / 8, 0.05);
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef} scale={[1.2, 2.2, 0.4]}>
        <boxGeometry args={[1, 1, 1, 64, 64, 64]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent={true}
        />
        {/* Secondary layer for refraction depth */}
        <mesh scale={[1.05, 1.05, 1.05]}>
          <boxGeometry args={[1, 1, 1, 32, 32, 32]} />
          <MeshTransmissionMaterial 
            backside
            samples={4}
            thickness={2}
            chromaticAberration={0.1}
            anisotropy={0.1}
            distortion={0.5}
            distortionScale={1}
            temporalDistortion={0.1}
            color="#111"
          />
        </mesh>
      </mesh>
    </Float>
  );
};
