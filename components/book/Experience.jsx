
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
      
      {/* Increased ambient lighting for better visibility */}
      <ambientLight intensity={2.0} />
      {/* Removed harsh directional light and environment lighting */}
      
    </>
  );
};
