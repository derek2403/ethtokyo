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
    const rand = (a, b) => a + Math.random() * (b - a);

    loader.load("/assets/island.glb", (gltf) => {
      islandRoot = gltf.scene;
      islandRoot.scale.set(2.0, 2.0, 2.0);

      islandRoot.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          islandMeshes.push(o);
        }
      });

      scene.add(islandRoot);
      frameObject(islandRoot);

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
        house.scale.set(0.7, 0.7, 0.7);

        placeOnIsland(house, -1.0, 0.9, {
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
            .addScaledVector(right, 1.05)
            .addScaledVector(fwd, 0.3);

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

        loader.load("/assets/tree2.glb", (t2gltf) => {
          const tree2 = t2gltf.scene;
          tree2.traverse((o) => {
            if (o.isMesh) o.castShadow = true;
          });

          tree2.scale.set(1.0, 1.0, 1.0);

          const right = new THREE.Vector3(1, 0, 0).applyQuaternion(
            house.quaternion
          );
          const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(
            house.quaternion
          );

          const target2 = house.position
            .clone()
            .addScaledVector(right, -0.85)
            .addScaledVector(fwd, 0.25);

          placeOnIsland(tree2, target2.x, target2.z, {
            sinkDepth: 0.05,
            alignToSlope: true,
          });

          tree2.rotation.y += THREE.MathUtils.degToRad(-90);

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
          tree.scale.set(0.65, 0.65, 0.65);

          const right = new THREE.Vector3(1, 0, 0).applyQuaternion(
            house.quaternion
          );
          const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(
            house.quaternion
          );
          const target = house.position
            .clone()
            .addScaledVector(right, 1.25) // sideways from the house
            .addScaledVector(fwd, 0.6);

          placeOnIsland(tree, target.x, target.z, {
            sinkDepth: 0.05,
            alignToSlope: true,
          });

          tree.rotation.z += THREE.MathUtils.degToRad(90);
          tree.rotation.y += THREE.MathUtils.degToRad(30);

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
          torii.scale.set(0.75, 0.75, 0.75);

          let grassTop = null;
          islandRoot.traverse((o) => {
            if (!grassTop && o.isMesh) {
              const n = (o.name || "").toLowerCase(),
                m = (o.material?.name || "").toLowerCase();
              if (/grass|top/.test(n) || /grass|top/.test(m)) grassTop = o;
            }
          });
          if (!grassTop) grassTop = islandRoot;

          const box = new THREE.Box3().setFromObject(grassTop);
          const half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
          const ctr = box.getCenter(new THREE.Vector3());

          const up = new THREE.Vector3(0, 1, 0);
          const front = camera.position.clone().sub(ctr).setY(0).normalize();
          const left = new THREE.Vector3().crossVectors(up, front).normalize();

          const margin = 0.18;
          const dist = Math.max(0.01, Math.min(half.x, half.z) - margin);

          const targetXZ = ctr
            .clone()
            .addScaledVector(front, dist * 0.95)
            .addScaledVector(left, dist * 0.15);

          const drop = (x, z) => {
            const rc = new THREE.Raycaster(
              new THREE.Vector3(x, 50, z),
              new THREE.Vector3(0, -1, 0)
            );
            const hits = rc.intersectObjects(islandMeshes, true);
            return hits.length ? hits[0] : null;
          };

          let hit = drop(targetXZ.x, targetXZ.z);
          if (!hit) {
            for (let i = 1; i <= 12 && !hit; i++) {
              const p = targetXZ
                .clone()
                .addScaledVector(front, -0.1 * i)
                .addScaledVector(left, -0.1 * i);
              hit = drop(p.x, p.z);
            }
          }
          if (!hit) return;

          const n =
            hit.face && hit.face.normal
              ? hit.face.normal.clone().normalize()
              : up.clone();
          torii.position.copy(hit.point).addScaledVector(n, 0.05);
          const q = new THREE.Quaternion().setFromUnitVectors(up, n);
          torii.quaternion.copy(q);

          const hp = new THREE.Vector3();
          house.getWorldPosition(hp);
          torii.lookAt(new THREE.Vector3(hp.x, torii.position.y, hp.z));

          torii.rotateY(THREE.MathUtils.degToRad(-14));

          scene.add(torii);
        });
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
