import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Experience } from "../components/book/Experience";
import { UI } from "../components/book/UI";

export default function BookPage() {
  return (
    <>
      {/* UI overlay with controls and background animation */}
      <UI />
      
      {/* Three.js loader for showing loading state */}
      <Loader />
      
      {/* Main 3D canvas - use a fixed full-screen container to guarantee full height */}
      <div id="book-canvas-root" className="fixed inset-0">
        <Canvas 
          style={{ width: '100%', height: '100%' }}
          shadows 
          camera={{
            position: [-0.5, -0.5, typeof window !== 'undefined' && window.innerWidth > 800 ? 4 : 9],
            fov: 45,
          }}
        >
        <group position-y={-1.2}>
          <Suspense fallback={null}>
            <Experience />
          </Suspense>
        </group>
        </Canvas>
      </div>
    </>
  );
}
