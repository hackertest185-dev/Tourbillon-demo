'use client';

import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei';
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import WatchModel from './ProceduralWatch';
import { CINEMA, samplePose, type CinemaMotion } from './config';

type SceneProps = { motion: RefObject<CinemaMotion>; mobile: boolean; active: boolean; onFailure: () => void; onReady: () => void };

function ContextLifecycle({ onFailure, onReady }: Pick<SceneProps, 'onFailure' | 'onReady'>) {
  const gl = useThree(state => state.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => { event.preventDefault(); onFailure(); };
    canvas.addEventListener('webglcontextlost', lost);
    onReady();
    return () => canvas.removeEventListener('webglcontextlost', lost);
  }, [gl, onFailure, onReady]);
  return null;
}

function Dust({ mobile }: { mobile: boolean }) {
  const group = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const count = mobile ? CINEMA.mobileParticles : CINEMA.desktopParticles;
    const buffer = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const random = (seed: number) => { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
      buffer[i * 3] = (random(i + 1) - .5) * 14;
      buffer[i * 3 + 1] = (random(i + 80) - .5) * 10;
      buffer[i * 3 + 2] = (random(i + 180) - .5) * 6;
    }
    return buffer;
  }, [mobile]);
  useFrame((_, delta) => { if (group.current) group.current.rotation.z += Math.min(delta, .05) * .008; });
  return <points ref={group}>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
    <pointsMaterial color="#c6ad7b" size={.015} transparent opacity={.36} depthWrite={false} sizeAttenuation />
  </points>;
}

function Studio() {
  return CINEMA.environmentMap ? <Environment files={CINEMA.environmentMap} /> :
    <Environment resolution={128} frames={1}>
      <Lightformer position={[-4, 3, 3]} rotation={[0, Math.PI / 4, 0]} scale={[2, 7, 1]} intensity={4} color="#f4e9ce" />
      <Lightformer position={[4, 1, 2]} rotation={[0, -Math.PI / 4, 0]} scale={[1.5, 5, 1]} intensity={3} color="#B08D57" />
      <Lightformer position={[0, 5, -2]} rotation={[Math.PI / 2, 0, 0]} scale={[8, 2, 1]} intensity={4} color="#ede4d3" />
      <Lightformer position={[0, -3, 3]} rotation={[Math.PI / 3, 0, 0]} scale={[6, .5, 1]} intensity={1.4} color="#8896a5" />
    </Environment>;
}

function SpotlightPool() {
  return <mesh position={[0, -3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
    <planeGeometry args={[14, 14]} />
    <shaderMaterial transparent depthWrite={false} uniforms={{ color: { value: new THREE.Color('#B08D57') } }}
      vertexShader="varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}"
      fragmentShader="varying vec2 vUv; uniform vec3 color; void main(){float d=length((vUv-.5)*2.0);float a=exp(-d*d*12.0)*.16;gl_FragColor=vec4(color,a);}" />
  </mesh>;
}

function CameraRig({ motion, mobile, focus }: { motion: RefObject<CinemaMotion>; mobile: boolean; focus: THREE.Vector3 }) {
  const watch = useRef<THREE.Group>(null);
  const target = useMemo(() => new THREE.Vector3(), []);
  const desiredCamera = useMemo(() => new THREE.Vector3(), []);
  const desiredPosition = useMemo(() => new THREE.Vector3(), []);
  const elapsed = useRef(0);
  useFrame(({ camera, scene }, rawDelta) => {
    const delta = Math.min(rawDelta, .05);
    elapsed.current += delta;
    const { from, to, t } = samplePose(motion.current.progress);
    const interpolate = (a: number, b: number) => THREE.MathUtils.lerp(a, b, t);
    desiredCamera.set(interpolate(from.camera[0], to.camera[0]), interpolate(from.camera[1], to.camera[1]), interpolate(from.camera[2], to.camera[2]));
    // Portrait screens crop the landscape-composed poses badly; pull back further on mobile.
    if (mobile) { desiredCamera.x *= .35; desiredCamera.z *= 2.0; }
    camera.position.lerp(desiredCamera, 1 - Math.exp(-CINEMA.cameraDamping * delta));
    target.set(interpolate(from.target[0], to.target[0]), interpolate(from.target[1], to.target[1]), interpolate(from.target[2], to.target[2]));
    camera.lookAt(target);
    focus.copy(target);
    scene.environmentRotation.y = Math.sin(elapsed.current * .09) * .3 + motion.current.progress * .12;
    if (watch.current) {
      desiredPosition.set(interpolate(from.position[0], to.position[0]), interpolate(from.position[1], to.position[1]), interpolate(from.position[2], to.position[2]));
      if (mobile) { desiredPosition.x *= .18; desiredPosition.y += .85; }
      desiredPosition.y += Math.sin(elapsed.current * .35) * .035;
      watch.current.position.lerp(desiredPosition, 1 - Math.exp(-5 * delta));
      const px = mobile ? 0 : motion.current.pointer[0] * CINEMA.parallax;
      const py = mobile ? 0 : motion.current.pointer[1] * CINEMA.parallax;
      watch.current.rotation.x = THREE.MathUtils.damp(watch.current.rotation.x, interpolate(from.rotation[0], to.rotation[0]) + py, 3, delta);
      watch.current.rotation.y = THREE.MathUtils.damp(watch.current.rotation.y, interpolate(from.rotation[1], to.rotation[1]) + px + Math.sin(elapsed.current * .17) * .06, 3, delta);
      watch.current.rotation.z = THREE.MathUtils.damp(watch.current.rotation.z, interpolate(from.rotation[2], to.rotation[2]), 5, delta);
      watch.current.scale.setScalar(interpolate(from.scale, to.scale) * (mobile ? .85 : 1));
    }
  });
  return <group ref={watch}><WatchModel motion={motion} mobile={mobile} /></group>;
}

function SceneContents({ motion, mobile, onFailure, onReady, low, onDecline }: SceneProps & { low: boolean; onDecline: () => void }) {
  const focus = useMemo(() => new THREE.Vector3(), []);
  return <>
    <color attach="background" args={[CINEMA.colors.black]} />
    <ambientLight intensity={.25} />
    <spotLight position={[1, 6, 4]} color="#efd7a7" intensity={95} angle={.5} penumbra={1} distance={25} />
    <pointLight position={[-4, 1, 4]} color="#c1ceda" intensity={14} />
    <Studio />
    <CameraRig motion={motion} mobile={mobile} focus={focus} />
    <Dust mobile={mobile || low} />
    <SpotlightPool />
    <ContextLifecycle onFailure={onFailure} onReady={onReady} />
    <PerformanceMonitor onDecline={onDecline} flipflops={1} onFallback={onDecline} bounds={() => [35, 58]} />
    {!low && <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom intensity={CINEMA.bloom} luminanceThreshold={1.2} mipmapBlur />
      <Noise opacity={CINEMA.grain} />
      <Vignette eskil={false} offset={.3} darkness={CINEMA.vignette} />
    </EffectComposer>}
  </>;
}

export default function WatchScene(props: SceneProps) {
  const [low, setLow] = useState(false);
  return <Canvas dpr={[1, low ? 1 : props.mobile ? CINEMA.mobileDpr : CINEMA.desktopDpr]}
    frameloop={props.active ? 'always' : 'never'} camera={{ position: [0, .2, 9], fov: 36, near: .1, far: 60 }}
    gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} fallback={null}
    aria-hidden="true" style={{ pointerEvents: 'none' }}>
    <Suspense fallback={null}><SceneContents {...props} low={low} onDecline={() => setLow(true)} /></Suspense>
  </Canvas>;
}
