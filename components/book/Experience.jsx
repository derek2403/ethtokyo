import { Environment, Float, OrbitControls } from "@react-three/drei";
import { Book } from "./Book";

export const Experience = () => {
  return (
    <>
      {/* Floating animation wrapper for the book */}
      <Float
        rotation-x={-Math.PI / 6}
        floatIntensity={0.3}
        speed={1}
        rotationIntensity={0.5}
        position={[0, 0.5, 0]}
      >
        <Book />
      </Float>
      
      {/* Interactive camera controls */}
      <OrbitControls 
        target={[0, -0.7, 0]}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={10}
      />
      
      {/* Environment lighting */}
      <Environment preset="studio"></Environment>
      
      {/* Main directional light with shadows */}
      <directionalLight
        position={[2, 5, 2]}
        intensity={2.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      />
      
      {/* Ground plane for shadows */}
      <mesh position-y={-2} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <shadowMaterial transparent opacity={0.2} />
      </mesh>
    </>
  );
};
