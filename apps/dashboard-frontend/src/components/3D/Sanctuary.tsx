import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ScrollControls, Preload } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';

import { WarpBackground } from './WarpBackground';
import { NeuralCore } from './NeuralCore';
import { NeuralBridge } from './NeuralBridge';
import { APIStream } from './APIStream';

/**
 * The Sanctuary is the isolated 3D environment for Warp.
 */
export const Sanctuary = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="fixed inset-0 z-0 text-white">
      <Canvas
        gl={{ antialias: false, alpha: true }}
        dpr={[1, 2]}
        camera={{ position: [0, 0, 8], fov: 35 }}
      >
        <Suspense fallback={null}>
          <ScrollControls pages={3.8} damping={0.2} infinite={false}>

            <ambientLight intensity={0.4} />
            <pointLight position={[10, 10, 10]} intensity={2} color="#FF003C" />

            <WarpBackground />

            <group position={[0, 0, 0]}>
              <NeuralCore />
              <NeuralBridge />
              <APIStream />
            </group>

            <EffectComposer disableNormalPass>
              <Bloom luminanceThreshold={0.5} mipmapBlur intensity={1.5} />
              <ChromaticAberration offset={new THREE.Vector2(0.002, 0.002)} />
              <Noise opacity={0.06} />
            </EffectComposer>

            <Preload all />

            {/* The UI layer is passed as children to Scroll, so it stays in sync */}
            {children}

          </ScrollControls>
        </Suspense>
      </Canvas>
    </div>
  );
};
