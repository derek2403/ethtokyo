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
    renderer.toneMappingExposure = 0.7;
    renderer.shadowMap.enabled = true;
    containerElement.appendChild(renderer.domElement);

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
        const PETALS = 10;
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
            sinkDepth: 0.05,
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
        //right -> decoupled placement using island bounds fractions
        loader.load("/assets/tree2.glb", (tgltf) => {
          const tree = tgltf.scene;
          tree.traverse((o) => {
            if (o.isMesh) o.castShadow = true;
          });
          tree.scale.set(0.85, 0.85, 0.85);

          // Place near a diagonal corner; tweak 0.18/0.82 as needed
          placeOnIslandByFrac(tree, 0.18, 0.82, {
            pad: 0.18,
            alignToSlope: true,
          });

          // Face the house for composition
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
          torii.scale.set(0.85, 0.85, 0.85);

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
      });
    });

    // Spawn Boy once island is in scene
    // This happens after islandRoot is added within loader callbacks above.
    // Poll until island meshes are ready, then place the boy on land.
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
          // Place near island center
          const box = new THREE.Box3().setFromObject(islandRoot);
          const ctr = box.getCenter(new THREE.Vector3());
          // Slight offset so not colliding with house
          const x = ctr.x + 0.2;
          const z = ctr.z + 0.2;
          placeOnIsland(model, x, z, { sinkDepth: 0.02, alignToSlope: true });
        },
      });
    })();

    // Click-to-move like sample-map: click ground to walk there
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
          // Close enough: snap to ground at target and stop
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

        // Handle animation state transitions
        if (wasWalking && !isWalking) {
          // Just stopped walking, go to idle
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

    // Resize
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // Cleanup
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
