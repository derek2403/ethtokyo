import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment";
import { loadBoy, updateBoy, playBoy } from "../components/boy.js";

export default function HomePage() {
  const containerRef = useRef(null);

  useEffect(() => {
    const containerElement = containerRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9; // slightly brighter overall
    renderer.shadowMap.enabled = true;
    containerElement.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    // Flat pastel background with no fog
    scene.background = new THREE.Color(0xbfe6ff);
    scene.fog = null;
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

    // Position the sun low in the sky, similar to planets in the diagram
    const SUN_ELEVATION_DEG = 8; // even lower elevation -> nearer to horizon
    const SUN_AZIMUTH_DEG = 160; // rotate around island (left/right)
    const sunDir = new THREE.Vector3();
    const phi = THREE.MathUtils.degToRad(90 - SUN_ELEVATION_DEG);
    const theta = THREE.MathUtils.degToRad(SUN_AZIMUTH_DEG);
    sunDir.setFromSphericalCoords(1, phi, theta);
    // Place the light along that direction (a bit closer)
    sun.position.copy(sunDir.clone().multiplyScalar(45));
    sun.intensity = 1.25;

    // No mountains or other background geometry

    const loader = new GLTFLoader();
    let sunModel = null;
    // Load a large visible sun model high in the sky
    loader.load("/assets/sun.glb", (sgltf) => {
      sunModel = sgltf.scene;
      sunModel.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = false;
          o.receiveShadow = false;
          if (o.material) {
            if (o.material.emissive) o.material.emissive.set(0xffb84d);
            if ("emissiveIntensity" in o.material)
              o.material.emissiveIntensity = 4.0; // brighter so color reads
            if (o.material.color) o.material.color.set(0xffd36b);
            if ("toneMapped" in o.material) o.material.toneMapped = false; // keep vivid color
            o.material.fog = false; // keep crisp through fog
          }
        }
      });
      // Position along the sun direction even closer and lower
      const sunDistance = 38;
      const pos = sunDir.clone().multiplyScalar(sunDistance);
      // Keep very low so it's clearly to the side of the island
      pos.y = Math.max(pos.y, 4);
      sunModel.position.copy(pos);
      sunModel.scale.setScalar(10.0);
      // Look toward the world origin until island center is known
      sunModel.lookAt(new THREE.Vector3(0, 0, 0));
      scene.add(sunModel);
    });
    let islandRoot = null;
    const islandMeshes = [];

    let boy = null;
    let isWalking = false;
    let wasWalking = false; // track animation state transitions
    const targetPos = new THREE.Vector3();
    const WALK_SPEED = 0.5;
    const ARRIVE_RADIUS = 0.05; // tolerance to consider arrival

    // Helpers
    function frameObject(obj, { pad = 0.4 } = {}) {
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3()).length();
      const center = box.getCenter(new THREE.Vector3());

      controls.target.copy(center);
      const fitDist = (size * pad) / Math.tan((Math.PI * camera.fov) / 360);

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
      const raycaster = new THREE.Raycaster(
        rayOrigin,
        new THREE.Vector3(0, -1, 0)
      );
      const hits = raycaster.intersectObjects(islandMeshes, true);
      if (!hits.length) {
        object3D.position.set(x, 0, z);
        return;
      }

      const hit = hits[0];
      const n =
        hit.face && hit.face.normal
          ? hit.face.normal.clone().normalize()
          : new THREE.Vector3(0, 1, 0);
      const pos = hit.point.clone().addScaledVector(n, -sinkDepth);
      object3D.position.copy(pos);

      if (alignToSlope) {
        const up = new THREE.Vector3(0, 1, 0);
        const q = new THREE.Quaternion().setFromUnitVectors(up, n);
        const blended = new THREE.Quaternion().slerpQuaternions(
          new THREE.Quaternion(),
          q,
          0.5
        );
        object3D.quaternion.premultiply(blended);
      }
    }

    function groundHitAt(x, z, meshes) {
      const rc = new THREE.Raycaster(
        new THREE.Vector3(x, 50, z),
        new THREE.Vector3(0, -1, 0)
      );
      const hits = rc.intersectObjects(meshes, true);
      for (const h of hits) {
        const n = (h.object.name || "").toLowerCase();
        const m = (h.object.material?.name || "").toLowerCase();
        if (!/water|pond|lake|pool/.test(n) && !/water|pond|lake|pool/.test(m))
          return h;
      }
      return null;
    }

    function boundsXZ(root) {
      const b = new THREE.Box3().setFromObject(root);
      return { minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z };
    }

    function dropHighestAt(x, z) {
      const rc = new THREE.Raycaster(
        new THREE.Vector3(x, 50, z),
        new THREE.Vector3(0, -1, 0)
      );
      const hits = rc.intersectObjects(islandMeshes, true);
      if (!hits.length) return null;
      const candidates = hits.filter((h) => {
        const n = (h.object.name || "").toLowerCase();
        const m = (h.object.material?.name || "").toLowerCase();
        return (
          !/water|pond|lake|pool/.test(n) && !/water|pond|lake|pool/.test(m)
        );
      });
      if (!candidates.length) return null;
      candidates.sort((a, b) => b.point.y - a.point.y);
      return candidates[0];
    }

    // Place by island-bounds fractions (decoupled from camera and other props)
    function placeOnIslandByFrac(
      object3D,
      fracX,
      fracZ,
      { pad = 0.18, alignToSlope = true } = {}
    ) {
      if (!islandRoot) return;
      const box = new THREE.Box3().setFromObject(islandRoot);
      const x = THREE.MathUtils.lerp(
        box.min.x + pad,
        box.max.x - pad,
        THREE.MathUtils.clamp(fracX, 0, 1)
      );
      const z = THREE.MathUtils.lerp(
        box.min.z + pad,
        box.max.z - pad,
        THREE.MathUtils.clamp(fracZ, 0, 1)
      );
      const hit = dropHighestAt(x, z);
      if (hit) {
        const up = new THREE.Vector3(0, 1, 0);
        const n =
          hit.face && hit.face.normal
            ? hit.face.normal.clone().normalize()
            : up.clone();
        object3D.position.copy(hit.point);
        if (alignToSlope) {
          const q = new THREE.Quaternion().setFromUnitVectors(up, n);
          object3D.quaternion.copy(q);
        }
      } else {
        object3D.position.set(x, 0, z);
      }
    }

    const rand = (a, b) => a + Math.random() * (b - a);

    // Load island and props
    loader.load("/assets/island.glb", (gltf) => {
      islandRoot = gltf.scene;
      islandRoot.scale.set(2.0, 2.0, 3.0);

      islandRoot.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          islandMeshes.push(o);
        }
      });

      scene.add(islandRoot);
      frameObject(islandRoot);

      // Aim the directional light and sun model at the island center
      const islandCenter = new THREE.Box3()
        .setFromObject(islandRoot)
        .getCenter(new THREE.Vector3());
      sun.target.position.copy(islandCenter);
      if (!scene.children.includes(sun.target)) scene.add(sun.target);
      if (typeof sunModel !== "undefined" && sunModel) {
        sunModel.lookAt(islandCenter);
      }

      // Petals
      (function addPetals() {
        const { minX, maxX, minZ, maxZ } = boundsXZ(islandRoot);
        const petalGeo = new THREE.CircleGeometry(0.035, 16);
        const baseMat = new THREE.MeshBasicMaterial({
          color: 0xff6fb0,
          side: THREE.DoubleSide,
          depthTest: true,
          depthWrite: true,
        });
        const PETALS = 15;
        for (let i = 0; i < PETALS; i++) {
          const x = rand(minX + 0.22, maxX - 0.22);
          const z = rand(minZ + 0.22, maxZ - 0.22);
          const hit = groundHitAt(x, z, islandMeshes);
          if (!hit) continue;

          const n =
            hit.face && hit.face.normal
              ? hit.face.normal.clone().normalize()
              : new THREE.Vector3(0, 1, 0);
          const q = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            n
          );

          const petal = new THREE.Mesh(petalGeo, baseMat.clone());
          petal.material.color.offsetHSL(0, 0, rand(-0.08, 0.08));
          petal.position.copy(hit.point).addScaledVector(n, 0.012);
          petal.quaternion.copy(q);
          petal.rotateOnAxis(n, rand(0, Math.PI * 2));
          petal.renderOrder = 999;
          scene.add(petal);
        }
      })();

      loader.load("/assets/house.glb", (hgltf) => {
        const house = hgltf.scene;
        house.traverse((o) => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });
        house.scale.set(0.9, 0.9, 0.9);

        placeOnIsland(house, -0.8, 1.5, {
          sinkDepth: 0.03,
          alignToSlope: true,
        });

        const center = new THREE.Box3()
          .setFromObject(islandRoot)
          .getCenter(new THREE.Vector3());
        const pos = house.position.clone();
        house.lookAt(new THREE.Vector3(center.x, pos.y, center.z));
        scene.add(house);

        loader.load("/assets/tree.glb", (tgltf) => {
          const tree = tgltf.scene;
          tree.traverse((o) => {
            if (o.isMesh) o.castShadow = true;
          });
          tree.scale.set(0.9, 0.9, 0.9);

          const right = new THREE.Vector3(1, 0, 0).applyQuaternion(
            house.quaternion
          );
          const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(
            house.quaternion
          );
          const target = house.position
            .clone()
            .addScaledVector(right, 1.15)
            .addScaledVector(fwd, 0.6);

          placeOnIsland(tree, target.x, target.z, {
            sinkDepth: 0.1,
            alignToSlope: true,
          });
          tree.lookAt(
            new THREE.Vector3(
              house.position.x,
              tree.position.y,
              house.position.z
            )
          );
          scene.add(tree);
        });
        //left
        loader.load("/assets/tree2.glb", (t2gltf) => {
          const tree2 = t2gltf.scene;
          tree2.traverse((o) => {
            if (o.isMesh) o.castShadow = true;
          });
          tree2.scale.set(1.5, 1.5, 1.5);

          const right = new THREE.Vector3(1, 0, 0).applyQuaternion(
            house.quaternion
          );
          const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(
            house.quaternion
          );
          const target2 = house.position
            .clone()
            .addScaledVector(right, -1.3)
            .addScaledVector(fwd, 0.3);

          placeOnIsland(tree2, target2.x, target2.z, {
            sinkDepth: 0.05,
            alignToSlope: true,
          });
          tree2.rotation.y += THREE.MathUtils.degToRad(150);
          tree2.lookAt(
            new THREE.Vector3(
              house.position.x,
              tree2.position.y,
              house.position.z
            )
          );
          scene.add(tree2);
        });

        loader.load("/assets/tree2.glb", (tgltf) => {
          const tree = tgltf.scene;
          tree.traverse((o) => {
            if (o.isMesh) o.castShadow = true;
          });
          tree.scale.set(0.85, 0.85, 0.85);

          placeOnIslandByFrac(tree, 0.8, 0.09, {
            pad: 0.18,
            alignToSlope: true,
          });

          tree.lookAt(
            new THREE.Vector3(
              house.position.x,
              tree.position.y,
              house.position.z
            )
          );
          scene.add(tree);
        });

        loader.load("/assets/torii.glb", (ggltf) => {
          const torii = ggltf.scene;
          torii.traverse((o) => {
            if (o.isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;
            }
          });
          torii.scale.set(0.88, 0.88, 0.88);

          let grassTop = null;
          islandRoot.traverse((o) => {
            if (!grassTop && o.isMesh) {
              const n = (o.name || "").toLowerCase();
              const m = (o.material?.name || "").toLowerCase();
              if (/grass|top/.test(n) || /grass|top/.test(m)) grassTop = o;
            }
          });
          if (!grassTop) grassTop = islandRoot;

          const box = new THREE.Box3().setFromObject(grassTop);
          const ctr = box.getCenter(new THREE.Vector3());

          placeOnIslandByFrac(torii, 0.23, 0.1, {
            pad: 0.2,
            alignToSlope: true,
          });

          const hp = new THREE.Vector3();
          house.getWorldPosition(hp);
          torii.lookAt(new THREE.Vector3(hp.x, torii.position.y, hp.z));
          torii.rotateY(THREE.MathUtils.degToRad(10));

          scene.add(torii);
        });

        loader.load("/assets/bridge.glb", (bgltf) => {
          const bridge = bgltf.scene;
          bridge.traverse((o) => {
            if (o.isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;
            }
          });

          const BRIDGE_POS = new THREE.Vector3(0.66, 2.69, -1.02);

          const BRIDGE_SCALE_X = 0.55;
          const BRIDGE_SCALE_Y = 0.55;
          const BRIDGE_SCALE_Z = 0.95;
          const BRIDGE_ROT_Y_DEG = 75;

          bridge.scale.set(BRIDGE_SCALE_X, BRIDGE_SCALE_Y, BRIDGE_SCALE_Z);
          bridge.position.copy(BRIDGE_POS);
          bridge.rotation.y = THREE.MathUtils.degToRad(BRIDGE_ROT_Y_DEG);

          scene.add(bridge);
          console.log("[bridge] placed at fixed coordinate", {
            position: bridge.position,
            scale: bridge.scale,
            rotYdeg: BRIDGE_ROT_Y_DEG,
          });
        });
      });
    });

    (function trySpawnBoy() {
      const ready =
        islandMeshes.length > 0 && scene.children.includes(islandRoot);
      if (!ready) {
        requestAnimationFrame(trySpawnBoy);
        return;
      }
      loadBoy(scene, {
        onBoyLoaded: ({ model }) => {
          boy = model;

          const box = new THREE.Box3().setFromObject(islandRoot);
          const ctr = box.getCenter(new THREE.Vector3());

          const x = ctr.x + 0.2;
          const z = ctr.z + 0.2;
          placeOnIsland(model, x, z, { sinkDepth: 0.02, alignToSlope: true });
        },
      });
    })();

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    function onPointerDown(e) {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouse.set(x, y);
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(islandMeshes, true);
      if (!hits.length || !boy) return;
      const hit = hits[0];
      // Ignore water-like surfaces
      const n = (hit.object.name || "").toLowerCase();
      const m = (hit.object.material?.name || "").toLowerCase();
      if (/water|pond|lake|pool/.test(n) || /water|pond|lake|pool/.test(m))
        return;

      targetPos.copy(hit.point);

      // Only start walking if not already walking
      if (!isWalking) {
        isWalking = true;
        // Play walk animation directly - no startWalking animation
        playBoy("walk");
      }
    }
    renderer.domElement.addEventListener("pointerdown", onPointerDown);

    // Render loop
    const clock = new THREE.Clock();
    let rafId = 0;
    const tick = () => {
      const dt = clock.getDelta();
      // Move boy toward target when walking
      if (boy && isWalking) {
        const pos = boy.position;
        const dir = new THREE.Vector3(
          targetPos.x - pos.x,
          0,
          targetPos.z - pos.z
        );
        const dist = dir.length();
        if (dist <= ARRIVE_RADIUS) {
          const hit = groundHitAt(targetPos.x, targetPos.z, islandMeshes);
          if (hit) boy.position.copy(hit.point);
          isWalking = false;
        } else {
          dir.normalize();
          // Clamp step to avoid large hitch-induced overshoot
          const step = Math.min(WALK_SPEED * dt, dist);
          const nx = pos.x + dir.x * step;
          const nz = pos.z + dir.z * step;
          const hit = groundHitAt(nx, nz, islandMeshes);
          if (hit) {
            boy.position.copy(hit.point);
          } else {
            boy.position.set(nx, pos.y, nz);
          }
          // Face movement direction
          if (step > 0.0001) {
            boy.rotation.y = Math.atan2(dir.x, dir.z);
          }
        }

        if (wasWalking && !isWalking) {
          playBoy("idle");
        }

        wasWalking = isWalking;
      }
      updateBoy(dt);
      controls.update();
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
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
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      cancelAnimationFrame(rafId);
      controls.dispose();
      pmrem.dispose();
      scene.environment = null;
      renderer.dispose();
      if (containerElement?.contains(renderer.domElement)) {
        containerElement.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />;
}
