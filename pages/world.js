import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment";
import { loadBoy, updateBoy, playBoy } from "../components/boy.js";
import { usePrivy } from "@privy-io/react-auth";
import subscriptionAbi from "@/lib/subscription-abi.json";
import ConnectWalletButton from "@/components/ConnectWalletButton";

const RPC_URL = `https://rpc.kaigan.jsc.dev/rpc?token=${process.env.NEXT_PUBLIC_KAIGAN_RPC_TOKEN}`;
const SUBSCRIPTION_CONTRACT_ADDRESS = "0xAb8281Eb535238eA29fC10cbc67959e0FBdb6626";
const chain = {
  id: 5278000,
  name: "JSC Kaigan Testnet",
  nativeCurrency: { name: "JSC Testnet Ether", symbol: "JETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } }
};

export default function HomePage() {
  const containerRef = useRef(null);
  const router = useRouter();
  const { ready, authenticated, user } = usePrivy();
  const [showSubscribePrompt, setShowSubscribePrompt] = useState(false);
  const [plans, setPlans] = useState([]);
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState("");

  async function createPublicClient() {
    const { createPublicClient, http } = await import("viem");
    return createPublicClient({ chain, transport: http(RPC_URL) });
  }

  async function getContract(client) {
    const { getContract } = await import("viem");
    return getContract({ address: SUBSCRIPTION_CONTRACT_ADDRESS, abi: subscriptionAbi, client });
  }

  // On load, check if the connected wallet is verified + subscribed
  useEffect(() => {
    if (!ready) return;
    if (!authenticated || !user?.wallet?.address) {
      setShowSubscribePrompt(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const client = await createPublicClient();
        const ok = await client.readContract({
          address: SUBSCRIPTION_CONTRACT_ADDRESS,
          abi: subscriptionAbi,
          functionName: 'isCallerVerifiedAndSubscribed',
          account: user.wallet.address,
        });
        if (!cancelled) setShowSubscribePrompt(!Boolean(ok));

        // Also load available plans for the modal
        const contract = await getContract(client);
        const nextId = await contract.read.nextPlanId();
        const fetched = [];
        for (let i = 1; i < Number(nextId); i++) {
          try {
            const plan = await contract.read.getPlan([BigInt(i)]);
            if (plan.active) fetched.push({ id: i, ...plan });
          } catch {}
        }
        if (!cancelled) setPlans(fetched);
      } catch (_) {
        if (!cancelled) setShowSubscribePrompt(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ready, authenticated, user?.wallet?.address]);

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
    // Replace solid color with a simple gradient sky dome
    scene.background = null;
    scene.fog = null;
    const skyGeo = new THREE.SphereGeometry(500, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x87ceeb) }, // sky blue
        bottomColor: { value: new THREE.Color(0xf0f8ff) }, // alice blue
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main(){
          vec4 p = modelMatrix * vec4(position, 1.0);
          vWorldPosition = p.xyz;
          gl_Position = projectionMatrix * viewMatrix * p;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        void main(){
          float h = normalize(vWorldPosition).y * 0.5 + 0.5;
          vec3 col = mix(bottomColor, topColor, pow(h, 1.5));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyMesh);

    // Mountains removed as requested

    // Clouds removed as requested
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

    // Improved lighting for Japanese garden atmosphere
    const sun = new THREE.DirectionalLight(0xfff8dc, 1.2); // warm sunlight
    sun.position.set(3, 5, 2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.1;
    sun.shadow.camera.far = 50;
    sun.shadow.camera.left = -10;
    sun.shadow.camera.right = 10;
    sun.shadow.camera.top = 10;
    sun.shadow.camera.bottom = -10;
    scene.add(sun);

    // Soft ambient light with slight pink tint for cherry blossom atmosphere
    scene.add(new THREE.AmbientLight(0xfff0f5, 0.4));

    // Add a subtle fill light
    const fillLight = new THREE.DirectionalLight(0xe6e6fa, 0.3);
    fillLight.position.set(-2, 3, -1);
    scene.add(fillLight);

    // Position the sun low in the sky, similar to planets in the diagram
    const SUN_ELEVATION_DEG = 8; // low near the horizon
    const SUN_AZIMUTH_DEG = 330; // moved further to the left, facing the island
    const sunDir = new THREE.Vector3();
    const phi = THREE.MathUtils.degToRad(90 - SUN_ELEVATION_DEG);
    const theta = THREE.MathUtils.degToRad(SUN_AZIMUTH_DEG);
    sunDir.setFromSphericalCoords(1, phi, theta);
    // Place the light along that direction; closer and leftward
    sun.position.copy(sunDir.clone().multiplyScalar(20));
    sun.intensity = 1.25;

    // No mountains or other background geometry

    const loader = new GLTFLoader();
    let sunModel = null;
    // Load a large visible sun model high in the sky
    loader.load("/assets/sun.glb", (sgltf) => {
      sunModel = sgltf.scene;
      // Keep original GLB materials; don't override colors/emissive/toneMapping
      sunModel.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = false;
          o.receiveShadow = false;
        }
      });
      // Position along the sun direction; smaller, lower, and nearer
      const sunDistance = 18;
      const pos = sunDir.clone().multiplyScalar(sunDistance);
      // Keep very low so it's clearly to the side of the island
      pos.y = Math.max(pos.y, 1.5);
      sunModel.position.copy(pos);
      sunModel.scale.setScalar(3.0);
      // Look toward the world origin until island center is known
      sunModel.lookAt(new THREE.Vector3(0, 0, 0));
      scene.add(sunModel);
    });
    let islandRoot = null;
    const islandMeshes = [];

    // House doorway trigger state
    let houseRef = null;
    let enteredDoor = false;
    let doorTriggerLocal = null;
    const SHOW_DOOR_TRIGGER_DEBUG = false;
    let doorDebug = null;
    let goalIsHouse = false;

    let boy = null;
    let isWalking = false;
    let wasWalking = false; // track animation state transitions
    const targetPos = new THREE.Vector3();
    const WALK_SPEED = 0.5;
    const ARRIVE_RADIUS = 0.05; // tolerance to consider arrival

    // Helpers
    function frameObject(obj, { pad = 0.35 } = {}) {  // Reduced pad from 0.4 to 0.15 for closer view
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3()).length();
      const center = box.getCenter(new THREE.Vector3());

      controls.target.copy(center);
      const fitDist = (size * pad) / Math.tan((Math.PI * camera.fov) / 360);

      // Position camera closer and at a better angle for the island view
      const offsetVector = new THREE.Vector3(fitDist * 1.2, fitDist * 1.1, fitDist * 0.4);  // Raised Y from 1.1 to 1.4 for higher angle
      // Rotate the offset vector 25 degrees to the right around Y axis
      offsetVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(40));
      camera.position
        .copy(center)
        .add(offsetVector);
      // Raise camera vertically by additional amount
      camera.position.y += 1.0;
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

    function computeLocalAABB(obj) {
      const worldBB = new THREE.Box3().setFromObject(obj);
      const corners = [
        new THREE.Vector3(worldBB.min.x, worldBB.min.y, worldBB.min.z),
        new THREE.Vector3(worldBB.min.x, worldBB.min.y, worldBB.max.z),
        new THREE.Vector3(worldBB.min.x, worldBB.max.y, worldBB.min.z),
        new THREE.Vector3(worldBB.min.x, worldBB.max.y, worldBB.max.z),
        new THREE.Vector3(worldBB.max.x, worldBB.min.y, worldBB.min.z),
        new THREE.Vector3(worldBB.max.x, worldBB.min.y, worldBB.max.z),
        new THREE.Vector3(worldBB.max.x, worldBB.max.y, worldBB.min.z),
        new THREE.Vector3(worldBB.max.x, worldBB.max.y, worldBB.max.z),
      ];
      const localBB = new THREE.Box3();
      for (const c of corners) {
        const lc = obj.worldToLocal(c.clone());
        localBB.expandByPoint(lc);
      }
      return localBB;
    }

    function computeDoorTriggerLocal(obj) {
      // Entire house bounds, with slight padding on all axes
      const bb = computeLocalAABB(obj);
      const w = bb.max.x - bb.min.x;
      const h = bb.max.y - bb.min.y;
      const d = bb.max.z - bb.min.z;
      const padFrac = 0.06; // 6% padding around house
      const px = w * padFrac;
      const py = h * padFrac * 0.5; // smaller Y pad to avoid ground
      const pz = d * padFrac;
      const min = new THREE.Vector3(bb.min.x - px, bb.min.y - py, bb.min.z - pz);
      const max = new THREE.Vector3(bb.max.x + px, bb.max.y + py, bb.max.z + pz);
      return { min, max };
    }

    function computeHouseApproachPoint() {
      if (!houseRef || !doorTriggerLocal) return null;
      // Aim for a point slightly in front of the door center (outside the house)
      const centerLocal = new THREE.Vector3(
        (doorTriggerLocal.min.x + doorTriggerLocal.max.x) * 0.5,
        (doorTriggerLocal.min.y + doorTriggerLocal.max.y) * 0.5,
        doorTriggerLocal.min.z
      );
      const margin = 0.35; // step out in front of the door
      const outsideLocal = centerLocal.clone();
      outsideLocal.z -= margin; // assuming door on -Z side
      const outsideWorld = houseRef.localToWorld(outsideLocal.clone());
      const hit = groundHitAt(outsideWorld.x, outsideWorld.z, islandMeshes);
      return hit ? hit.point.clone() : outsideWorld;
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
        // Removed falling petals (performance)
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
        houseRef = house;
        doorTriggerLocal = computeDoorTriggerLocal(house);
        if (SHOW_DOOR_TRIGGER_DEBUG && doorTriggerLocal) {
          const size = new THREE.Vector3(
            doorTriggerLocal.max.x - doorTriggerLocal.min.x,
            doorTriggerLocal.max.y - doorTriggerLocal.min.y,
            doorTriggerLocal.max.z - doorTriggerLocal.min.z
          );
          const center = new THREE.Vector3(
            (doorTriggerLocal.min.x + doorTriggerLocal.max.x) * 0.5,
            (doorTriggerLocal.min.y + doorTriggerLocal.max.y) * 0.5,
            (doorTriggerLocal.min.z + doorTriggerLocal.max.z) * 0.5
          );
          const g = new THREE.BoxGeometry(size.x, size.y, size.z);
          const m = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            wireframe: true,
            transparent: true,
            opacity: 0.6,
            depthTest: false,
          });
          doorDebug = new THREE.Mesh(g, m);
          doorDebug.position.copy(center);
          house.add(doorDebug);
        }

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

          // Torii placed; stone path removed as requested
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

        // Removed cherry blossom trees as requested

        // Stone path removed as requested

        // Add floating cherry blossom petals
        function addFloatingPetals() {
          const petalGeo = new THREE.PlaneGeometry(0.05, 0.08);
          const petalMat = new THREE.MeshBasicMaterial({
            color: 0xffc0cb,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
          });

          const petals = [];
          for (let i = 0; i < 20; i++) {
            const petal = new THREE.Mesh(petalGeo, petalMat.clone());
            petal.position.set(
              (Math.random() - 0.5) * 10,
              2 + Math.random() * 3,
              (Math.random() - 0.5) * 10
            );

            // Set bright pink color directly
            petal.material.color.setRGB(1.0, 0.75, 0.8); // Bright pink

            petal.userData.velocity = {
              x: (Math.random() - 0.5) * 0.01,
              y: -0.005 - Math.random() * 0.01,
              z: (Math.random() - 0.5) * 0.01,
            };

            petal.userData.rotationSpeed = (Math.random() - 0.5) * 0.02;

            scene.add(petal);
            petals.push(petal);
          }

          // Animate petals in the render loop
          return petals;
        }

        // Wait a bit for island to be fully loaded, then add decorations
        setTimeout(() => {
          window.floatingPetals = addFloatingPetals();
        }, 200); // Slightly longer delay to ensure torii is loaded
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
      if (!boy) return;

      // Prefer clicking the house: if hit, set goal to house and compute approach point
      if (houseRef) {
        const houseHits = raycaster.intersectObject(houseRef, true);
        if (houseHits.length) {
          goalIsHouse = true;
          const ap = computeHouseApproachPoint();
          if (ap) targetPos.copy(ap);
          if (!isWalking) {
            isWalking = true;
            playBoy("walk");
          }
          return;
        }
      }

      // Otherwise, walk to ground point and clear house goal
      const hits = raycaster.intersectObjects(islandMeshes, true);
      if (!hits.length) return;
      const hit = hits[0];
      const n = (hit.object.name || "").toLowerCase();
      const m = (hit.object.material?.name || "").toLowerCase();
      if (/water|pond|lake|pool/.test(n) || /water|pond|lake|pool/.test(m)) return;
      goalIsHouse = false;
      targetPos.copy(hit.point);
      if (!isWalking) {
        isWalking = true;
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

      // Doorway trigger attached to house (local-space box), only when heading to the house
      if (boy && houseRef && doorTriggerLocal && goalIsHouse) {
        const lp = houseRef.worldToLocal(boy.position.clone());
        const inside =
          lp.x >= doorTriggerLocal.min.x && lp.x <= doorTriggerLocal.max.x &&
          lp.y >= doorTriggerLocal.min.y && lp.y <= doorTriggerLocal.max.y &&
          lp.z >= doorTriggerLocal.min.z && lp.z <= doorTriggerLocal.max.z;
        if (inside && !enteredDoor) {
          enteredDoor = true;
          router.push("/chat");
        } else if (!inside) {
          enteredDoor = false;
        }
      }

      // Animate floating cherry blossom petals
      if (window.floatingPetals) {
        window.floatingPetals.forEach((petal) => {
          // Move petal
          petal.position.x += petal.userData.velocity.x;
          petal.position.y += petal.userData.velocity.y;
          petal.position.z += petal.userData.velocity.z;

          // Rotate petal
          petal.rotation.z += petal.userData.rotationSpeed;

          // Reset petal if it falls too low
          if (petal.position.y < -1) {
            petal.position.y = 4 + Math.random() * 2;
            petal.position.x = (Math.random() - 0.5) * 10;
            petal.position.z = (Math.random() - 0.5) * 10;
          }
        });
      }

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

  // Transaction helpers and subscribe action (outside JSX)
  async function txWrite(method, args = [], value = 0n) {
    if (!ready) throw new Error("Privy not ready");
    if (!authenticated || !user?.wallet?.address) throw new Error("Please connect your wallet");

    if (user.wallet.id) {
      const resp = await fetch('/api/transaction', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletId: user.wallet.id, method, args, value: value.toString(), contractAddress: SUBSCRIPTION_CONTRACT_ADDRESS, abi: subscriptionAbi })
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || 'Transaction failed');
      }
      return (await resp.json()).hash;
    }

    const { createWalletClient, custom, encodeFunctionData } = await import('viem');
    if (!window.ethereum) throw new Error('No ethereum provider');
    const hexChainId = '0x' + chain.id.toString(16);
    try {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexChainId }] });
    } catch (switchErr) {
      if (switchErr?.code === 4902) {
        await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [{ chainId: hexChainId, chainName: chain.name, nativeCurrency: chain.nativeCurrency, rpcUrls: chain.rpcUrls.default.http }] });
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexChainId }] });
      } else {
        throw new Error(`Please switch your wallet to ${chain.name}`);
      }
    }
    const walletClient = createWalletClient({ chain, transport: custom(window.ethereum), account: user.wallet.address });
    const data = encodeFunctionData({ abi: subscriptionAbi, functionName: method, args });
    return walletClient.sendTransaction({ to: SUBSCRIPTION_CONTRACT_ADDRESS, data, value, chain });
  }

  async function subscribeToPlan(plan) {
    setSubError("");
    setSubLoading(true);
    try {
      const hash = await txWrite('subscribe', [BigInt(plan.id)], plan.price);
      const client = await createPublicClient();
      try {
        if (hash) {
          await client.waitForTransactionReceipt({ hash });
        }
      } catch (_) {}
      const ok = await client.readContract({ address: SUBSCRIPTION_CONTRACT_ADDRESS, abi: subscriptionAbi, functionName: 'isCallerVerifiedAndSubscribed', account: user.wallet.address });
      setShowSubscribePrompt(!Boolean(ok));
      if (ok) {
        // Ensure UI reflects new permissions/state
        if (typeof window !== 'undefined') window.location.reload();
      }
    } catch (e) {
      setSubError(e?.message || 'Failed to subscribe');
    } finally {
      setSubLoading(false);
    }
  }

  return (
    <>
      <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />
      {showSubscribePrompt && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}>
          <div
            className="w-full max-w-md"
            style={{
              background: 'rgba(255,255,255,0.25)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: 20,
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)'
            }}
          >
            <div className="flex items-center justify-between" style={{ padding: '12px 16px' }}>
              <h3 style={{ color: '#fff', fontWeight: 600 }}>Subscribe</h3>
              <button onClick={() => setShowSubscribePrompt(false)} style={{ color: 'rgba(255,255,255,0.9)' }}>✕</button>
            </div>
            {subError && <div className="text-sm" style={{ color: '#fecaca', padding: '0 16px 8px' }}>{subError}</div>}
            {!authenticated && (
              <div className="flex justify-center" style={{ padding: '0 16px 12px' }}>
                <ConnectWalletButton className="cta-primary" />
              </div>
            )}
            <div style={{ padding: '8px 12px 16px' }}>
              {plans.length ? plans.map((plan) => (
                <div key={plan.id} className="flex items-center justify-between" style={{
                  margin: '8px 4px',
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.35)',
                  border: '1px solid rgba(255,255,255,0.4)',
                  borderRadius: 16
                }}>
                  <div>
                    <div style={{ color: '#111', fontWeight: 700, fontSize: 18 }}>{(Number(plan.price) / 1e18).toString()} JETH</div>
                    <div style={{ color: '#374151', fontSize: 14 }}>{Math.round(Number(plan.duration)/(24*60*60))} days</div>
                  </div>
                  <button
                    disabled={subLoading || !authenticated}
                    onClick={() => subscribeToPlan(plan)}
                    className="manifesto-button"
                    style={{ padding: '10px 18px', fontSize: 14 }}
                  >
                    {subLoading ? 'Processing…' : 'Subscribe'}
                  </button>
                </div>
              )) : (
                <div className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.9)', padding: '8px 12px 16px' }}>No active plans configured.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
