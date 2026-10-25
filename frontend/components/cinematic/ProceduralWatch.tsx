'use client';

import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { CINEMA, samplePose, type CinemaMotion } from './config';

type WatchProps = { motion: RefObject<CinemaMotion>; mobile: boolean };
const TAU = Math.PI * 2;
const GEARS = [
  { x: -.62, y: .43, radius: .44, teeth: 32, direction: 1 },
  { x: .56, y: .57, radius: .38, teeth: 28, direction: -1 },
  { x: -.04, y: .83, radius: .27, teeth: 24, direction: -1 },
  { x: -.73, y: -.31, radius: .3, teeth: 24, direction: -1 },
  { x: .71, y: -.27, radius: .31, teeth: 24, direction: 1 },
  { x: 0, y: -.56, radius: .46, teeth: 36, direction: 1 },
];
const TEETH = GEARS.reduce((count, gear) => count + gear.teeth, 0);

// All gear rims, teeth, spokes and ruby bearings share four instanced draw calls.
function GearTrain({ explosion }: { explosion: RefObject<number> }) {
  const rims = useRef<THREE.InstancedMesh>(null);
  const teeth = useRef<THREE.InstancedMesh>(null);
  const spokes = useRef<THREE.InstancedMesh>(null);
  const rubies = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const elapsed = useRef(0);
  useFrame((_, delta) => {
    if (!rims.current || !teeth.current || !spokes.current || !rubies.current) return;
    elapsed.current += Math.min(delta, .05);
    let toothIndex = 0;
    GEARS.forEach((gear, index) => {
      const angle = elapsed.current * CINEMA.gearSpeed * gear.direction / gear.radius;
      const z = .02 + explosion.current * (.25 + (index % 3) * .2);
      dummy.position.set(gear.x, gear.y, z);
      dummy.rotation.set(0, 0, angle);
      dummy.scale.set(gear.radius, gear.radius, .7);
      dummy.updateMatrix();
      rims.current!.setMatrixAt(index, dummy.matrix);
      dummy.scale.setScalar(.052);
      dummy.position.z = z + .06;
      dummy.updateMatrix();
      rubies.current!.setMatrixAt(index, dummy.matrix);
      for (let i = 0; i < gear.teeth; i++) {
        const a = angle + i / gear.teeth * TAU;
        dummy.position.set(gear.x + Math.cos(a) * gear.radius, gear.y + Math.sin(a) * gear.radius, z);
        dummy.rotation.z = a;
        dummy.scale.set(gear.radius * .17, gear.radius * .13, .075);
        dummy.updateMatrix();
        teeth.current!.setMatrixAt(toothIndex++, dummy.matrix);
      }
      for (let i = 0; i < 5; i++) {
        const a = angle + i / 5 * TAU;
        dummy.position.set(gear.x + Math.cos(a) * gear.radius * .43, gear.y + Math.sin(a) * gear.radius * .43, z);
        dummy.rotation.z = a;
        dummy.scale.set(gear.radius * .8, gear.radius * .095, .055);
        dummy.updateMatrix();
        spokes.current!.setMatrixAt(index * 5 + i, dummy.matrix);
      }
    });
    [rims, teeth, spokes, rubies].forEach(ref => { ref.current!.instanceMatrix.needsUpdate = true; });
  });
  return <group>
    <instancedMesh ref={rims} args={[undefined, undefined, GEARS.length]} frustumCulled={false}><torusGeometry args={[.84, .12, 8, 48]} /><meshStandardMaterial color="#b18d4c" metalness={.95} roughness={.26} /></instancedMesh>
    <instancedMesh ref={teeth} args={[undefined, undefined, TEETH]} frustumCulled={false}><boxGeometry /><meshStandardMaterial color="#c3a671" metalness={.9} roughness={.28} /></instancedMesh>
    <instancedMesh ref={spokes} args={[undefined, undefined, GEARS.length * 5]} frustumCulled={false}><boxGeometry /><meshStandardMaterial color="#a48858" metalness={.95} roughness={.3} /></instancedMesh>
    <instancedMesh ref={rubies} args={[undefined, undefined, GEARS.length]} frustumCulled={false}><sphereGeometry args={[1, 12, 8]} /><meshPhysicalMaterial color={CINEMA.colors.burgundy} metalness={.25} roughness={.14} clearcoat={1} /></instancedMesh>
  </group>;
}

function Markers() {
  const ticks = useRef<THREE.InstancedMesh>(null);
  const screws = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 60; i++) {
      const a = i / 60 * TAU;
      dummy.position.set(Math.sin(a) * 1.32, Math.cos(a) * 1.32, .035);
      dummy.rotation.z = -a;
      dummy.scale.set(i % 5 === 0 ? .044 : .015, i % 5 === 0 ? .17 : .055, .035);
      dummy.updateMatrix(); ticks.current!.setMatrixAt(i, dummy.matrix);
    }
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU;
      dummy.position.set(Math.sin(a) * 1.52, Math.cos(a) * 1.52, .055);
      dummy.rotation.set(Math.PI / 2, 0, a);
      dummy.scale.setScalar(1);
      dummy.updateMatrix(); screws.current!.setMatrixAt(i, dummy.matrix);
    }
    ticks.current!.instanceMatrix.needsUpdate = true;
    screws.current!.instanceMatrix.needsUpdate = true;
  }, []);
  return <>
    <instancedMesh ref={ticks} args={[undefined, undefined, 60]}><boxGeometry /><meshStandardMaterial color="#ded1aa" metalness={.85} roughness={.2} /></instancedMesh>
    <instancedMesh ref={screws} args={[undefined, undefined, 8]}><cylinderGeometry args={[.045, .045, .025, 12]} /><meshStandardMaterial color="#a6a49b" metalness={1} roughness={.2} /></instancedMesh>
  </>;
}

function TourbillonCage({ explosion }: { explosion: RefObject<number> }) {
  const cage = useRef<THREE.Group>(null);
  const balance = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  useFrame((_, delta) => {
    elapsed.current += Math.min(delta, .05);
    if (cage.current) {
      cage.current.position.z = .21 + explosion.current * 1.05;
      cage.current.rotation.z = elapsed.current * TAU / 60;
    }
    if (balance.current) balance.current.rotation.z = Math.sin(elapsed.current * 18) * .32;
  });
  return <group position={[0, -.56, 0]}>
    <group ref={cage}>
      <mesh><torusGeometry args={[.51, .032, 10, 64]} /><meshStandardMaterial color="#e1d4ad" metalness={1} roughness={.18} /></mesh>
      <mesh position={[0, 0, -.12]}><torusGeometry args={[.51, .03, 10, 64]} /><meshStandardMaterial color="#9b7949" metalness={1} roughness={.3} /></mesh>
      {[0, 1, 2].map(i => <group key={i} rotation={[0, 0, i * TAU / 3]}>
        <mesh position={[0, .26, .035]}><boxGeometry args={[.045, .51, .055]} /><meshStandardMaterial color="#ded7c4" metalness={1} roughness={.18} /></mesh>
        <mesh position={[0, .48, -.04]}><cylinderGeometry args={[.022, .022, .18, 8]} /><meshStandardMaterial color="#B08D57" metalness={1} roughness={.2} /></mesh>
      </group>)}
      <group ref={balance} position={[0, 0, -.035]}>
        <mesh><torusGeometry args={[.35, .028, 8, 48]} /><meshStandardMaterial color="#c5a165" metalness={1} roughness={.2} /></mesh>
        <mesh><boxGeometry args={[.68, .026, .035]} /><meshStandardMaterial color="#c5a165" metalness={1} roughness={.2} /></mesh>
        {[.08, .12, .16, .2, .24].map(r => <mesh key={r}><torusGeometry args={[r, .006, 4, 40, Math.PI * 1.88]} /><meshStandardMaterial color="#8596a3" metalness={1} roughness={.3} /></mesh>)}
      </group>
      <mesh position={[0, 0, .07]}><sphereGeometry args={[.055, 16, 8]} /><meshPhysicalMaterial color={CINEMA.colors.burgundy} clearcoat={1} roughness={.1} /></mesh>
    </group>
  </group>;
}

function WatchHands() {
  const hour = useRef<THREE.Group>(null);
  const minute = useRef<THREE.Group>(null);
  const second = useRef<THREE.Group>(null);
  useFrame(() => {
    const time = new Date();
    const seconds = time.getSeconds() + time.getMilliseconds() / 1000;
    const minutes = time.getMinutes() + seconds / 60;
    if (hour.current) hour.current.rotation.z = -(time.getHours() % 12 + minutes / 60) * TAU / 12;
    if (minute.current) minute.current.rotation.z = -minutes * TAU / 60;
    if (second.current) second.current.rotation.z = -seconds * TAU / 60;
  });
  return <group>
    <group ref={hour}><mesh position={[0, .36, .02]}><boxGeometry args={[.07, .8, .035]} /><meshStandardMaterial color="#ede4d3" metalness={.9} roughness={.18} /></mesh></group>
    <group ref={minute}><mesh position={[0, .5, .065]}><boxGeometry args={[.043, 1.12, .026]} /><meshStandardMaterial color="#ede4d3" metalness={.9} roughness={.18} /></mesh></group>
    <group ref={second}><mesh position={[0, .43, .1]}><boxGeometry args={[.014, 1.48, .018]} /><meshStandardMaterial color="#b08d57" metalness={.8} roughness={.2} /></mesh></group>
    <mesh position={[0, 0, .13]}><sphereGeometry args={[.065, 16, 8]} /><meshStandardMaterial color="#d3b47b" metalness={1} roughness={.15} /></mesh>
  </group>;
}

export function ProceduralWatch({ motion, mobile }: WatchProps) {
  const dial = useRef<THREE.Group>(null);
  const crystal = useRef<THREE.Mesh>(null);
  const bezel = useRef<THREE.Group>(null);
  const hands = useRef<THREE.Group>(null);
  const back = useRef<THREE.Group>(null);
  const strap = useRef<THREE.Group>(null);
  const explosion = useRef(0);
  const dialShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 1.43, 0, TAU, false);
    [[-.62, .43, .48], [.56, .57, .42], [0, -.56, .57]].forEach(([x, y, r]) => {
      const hole = new THREE.Path(); hole.absarc(x, y, r, 0, TAU, true); shape.holes.push(hole);
    });
    return shape;
  }, []);
  const segments = mobile ? 48 : 96;
  useFrame((_, delta) => {
    const { from, to, t } = samplePose(motion.current.progress);
    explosion.current = THREE.MathUtils.damp(explosion.current, THREE.MathUtils.lerp(from.explosion, to.explosion, t), 5, Math.min(delta, .05));
    const e = explosion.current;
    if (dial.current) dial.current.position.z = .16 + e * 1.6;
    if (bezel.current) bezel.current.position.z = .25 + e * 2.25;
    if (crystal.current) crystal.current.position.z = .38 + e * 2.9;
    if (hands.current) hands.current.position.z = .24 + e * 2.05;
    if (back.current) back.current.position.z = -.23 - e * .55;
    if (strap.current) strap.current.position.z = -.16 - e * .28;
  });
  return <group>
    <group ref={strap}>
      {[-1, 1].map(side => <group key={side}>
        <RoundedBox args={[.98, 2.05, .15]} radius={.055} smoothness={3} position={[0, side * 2.55, -.06]} rotation={[side * -.08, 0, 0]}><meshStandardMaterial color="#211811" roughness={.88} /></RoundedBox>
        {[-1, 1].map(edge => <mesh key={edge} position={[edge * .42, side * 2.55, .025]}><boxGeometry args={[.012, 1.9, .006]} /><meshStandardMaterial color="#655037" roughness={1} /></mesh>)}
        {[-1, 1].map(edge => <RoundedBox key={edge} args={[.21, .58, .24]} radius={.06} smoothness={3} position={[edge * .65, side * 1.58, .02]} rotation={[0, 0, side * edge * -.13]}><meshStandardMaterial color="#bba174" metalness={1} roughness={.22} /></RoundedBox>)}
      </group>)}
    </group>
    <mesh><torusGeometry args={[1.55, .14, 16, segments]} /><meshPhysicalMaterial color="#b4a07b" metalness={1} roughness={.24} clearcoat={.5} /></mesh>
    <mesh position={[0, 0, -.08]}><torusGeometry args={[1.55, .13, 12, segments]} /><meshStandardMaterial color="#655a49" metalness={1} roughness={.3} /></mesh>
    <group ref={back}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.46, 1.46, .065, segments]} /><meshStandardMaterial color="#27231e" metalness={.9} roughness={.38} /></mesh>
      <mesh><torusGeometry args={[1.4, .024, 8, segments]} /><meshStandardMaterial color="#b08d57" metalness={1} roughness={.3} /></mesh>
    </group>
    <group position={[1.72, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
      <mesh><cylinderGeometry args={[.15, .15, .22, 32]} /><meshStandardMaterial color="#bba174" metalness={1} roughness={.22} /></mesh>
      {[-.08, -.04, 0, .04, .08].map(y => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.15, .012, 6, 24]} /><meshStandardMaterial color="#dfc795" metalness={1} roughness={.28} /></mesh>)}
    </group>
    <GearTrain explosion={explosion} />
    <TourbillonCage explosion={explosion} />
    <group ref={dial}>
      <mesh><shapeGeometry args={[dialShape, mobile ? 24 : 48]} /><meshPhysicalMaterial color="#242421" metalness={.82} roughness={.34} side={THREE.DoubleSide} /></mesh>
      <Markers />
      <mesh><torusGeometry args={[1.23, .006, 4, segments]} /><meshStandardMaterial color="#b08d57" metalness={.8} roughness={.4} /></mesh>
    </group>
    <group ref={hands}><WatchHands /></group>
    <group ref={bezel}><mesh><torusGeometry args={[1.51, .055, 12, segments]} /><meshStandardMaterial color="#d3bb8d" metalness={1} roughness={.16} /></mesh></group>
    <mesh ref={crystal} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[1.47, 1.47, .025, segments]} />
      <meshPhysicalMaterial color="#dce8ee" metalness={.08} roughness={.04} transparent opacity={.08} depthWrite={false} clearcoat={1} clearcoatRoughness={.025} envMapIntensity={1.35} side={THREE.FrontSide} />
    </mesh>
  </group>;
}

// Author a replacement GLB around the origin, facing +Z, with a case radius of 1.6 units.
// Optional named groups preserve the exploded animation; unnamed GLBs still rotate as one piece.
function ImportedWatch({ url, motion }: { url: string; motion: RefObject<CinemaMotion> }) {
  const gltf = useGLTF(url);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const parts = useMemo(() => ['Caseback', 'Movement', 'Dial', 'Hands', 'Bezel', 'Crystal'].flatMap((name, i) => {
    const object = scene.getObjectByName(name);
    return object ? [{ object, z: object.position.z, amount: (i - 1) * .55 }] : [];
  }), [scene]);
  useFrame(() => {
    const { from, to, t } = samplePose(motion.current.progress);
    const e = THREE.MathUtils.lerp(from.explosion, to.explosion, t);
    parts.forEach(({ object, z, amount }) => { object.position.z = z + e * amount; });
  });
  // useGLTF owns this cached asset. Shared cache geometries must not be disposed on each mount.
  return <primitive object={scene} dispose={null} />;
}

export default function WatchModel(props: WatchProps) {
  return CINEMA.watchModel ? <ImportedWatch url={CINEMA.watchModel} motion={props.motion} /> : <ProceduralWatch {...props} />;
}
