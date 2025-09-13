import { useEffect } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment";

export default function HomePage() {
  useEffect(() => {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.7;
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(2.5, 2, 3);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(
      new RoomEnvironment(renderer),
      0.04
    ).texture;

    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(3, 5, 2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0xffffff, 0.15));

    const loader = new GLTFLoader();
    let islandRoot = null;
    const islandMeshes = [];

    function frameObject(obj) {
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3()).length();
      const center = box.getCenter(new THREE.Vector3());
      controls.target.copy(center);
      const fitDist = (size * 0.6) / Math.tan((Math.PI * camera.fov) / 360);
      camera.position
        .copy(center)
        .add(new THREE.Vector3(fitDist, fitDist, fitDist));
      camera.near = size / 100;
      camera.far = size * 100;
      camera.updateProjectionMatrix();
      controls.update();
    }

    function placeOnIsland(
      object3D,
      x,
      z,
      { sinkDepth = 0.03, alignToSlope = true } = {}
    ) {
      if (!islandMeshes.length) return;

      const rayOrigin = new THREE.Vector3(x, 50, z);
      const rayDir = new THREE.Vector3(0, -1, 0);
      const raycaster = new THREE.Raycaster(rayOrigin, rayDir);

      const hits = raycaster.intersectObjects(islandMeshes, true);
      if (!hits.length) {
        object3D.position.set(x, 0, z);
        return;
      }

      const hit = hits[0];

      const pos = hit.point
        .clone()
        .addScaledVector(hit.face.normal, -sinkDepth);
      object3D.position.copy(pos);

      if (alignToSlope) {
        const up = new THREE.Vector3(0, 1, 0);
        const q = new THREE.Quaternion().setFromUnitVectors(
          up,
          hit.face.normal.clone().normalize()
        );

        const blended = new THREE.Quaternion().slerpQuaternions(
          new THREE.Quaternion(),
          q,
          0.5
        );
        object3D.quaternion.premultiply(blended);
      }
    }

    loader.load("/assets/island.glb", (gltf) => {
      islandRoot = gltf.scene;

      islandRoot.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          islandMeshes.push(o);
        }
      });

      scene.add(islandRoot);
      frameObject(islandRoot);

      loader.load("/assets/base_basic_shaded.glb", (tgltf) => {
        const tree = tgltf.scene;
        tree.traverse((o) => {
          if (o.isMesh) o.castShadow = true;
        });

        tree.scale.set(0.6, 0.6, 0.6);

        placeOnIsland(tree, -0.6, -0.6, {
          sinkDepth: 0.05,
          alignToSlope: true,
        });
        scene.add(tree);

        scene.add(tree);
      });
    });

    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    };
    tick();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      document.body.removeChild(renderer.domElement);
    };
  }, []);

  return null;
}
