import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

// Module-level state for the Boy model and animations
let boyLoaded = false;
let boyModel = null;
let boyMixer = null;
let boyActions = {};
let boyActiveAction = null;
let startWalkFinishedHandler = null; // one-shot handler for startWalking -> walk

function hasAnyMesh(root) {
  let found = false;
  root.traverse((o) => {
    if (o.isMesh) found = true;
  });
  return found;
}

function setShadowAndSkinning(root) {
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      if (o.material && "skinning" in o.material && o.isSkinnedMesh) {
        o.material.skinning = true;
        o.material.needsUpdate = true;
      }
    }
  });
}

function applyBoyMaterials(root) {
  const texture = new THREE.TextureLoader().load("/model/boy/shaded.png");
  // Ensure original color fidelity
  if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;

  root.traverse((child) => {
    if (child.isMesh) {
      const mat = new THREE.MeshStandardMaterial({
        map: texture,
        skinning: !!child.isSkinnedMesh,
        roughness: 0.6,
        metalness: 0.05,
      });
      child.material = mat;
      if (child.material.map && THREE.SRGBColorSpace) {
        child.material.map.colorSpace = THREE.SRGBColorSpace;
      }
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

function loadFBX(url) {
  const fbxLoader = new FBXLoader();
  return new Promise((resolve, reject) => {
    fbxLoader.load(url, resolve, undefined, reject);
  });
}

async function loadAnim(name, url) {
  try {
    const fbx = await loadFBX(url);
    if (!fbx.animations || !fbx.animations.length) {
      console.warn(`[boy] animation has no clips: ${url}`);
      return null;
    }
    const clip = fbx.animations[0];
    const action = boyMixer.clipAction(clip, boyModel);
    boyActions[name] = action;
    // Speed up specific animations
    if (name === "walk" || name === "startWalking") {
      if (typeof action.setEffectiveTimeScale === "function") {
        action.setEffectiveTimeScale(1.5);
      } else {
        action.timeScale = 1.5;
      }
    }
    console.log(`[boy] animation loaded: ${name}`);
    return action;
  } catch (err) {
    console.error(`[boy] failed to load animation ${name} from ${url}`, err);
    return null;
  }
}

function fadeTo(name, duration = 0.3) {
  const next = boyActions[name];
  if (!next || next === boyActiveAction) return;
  if (boyActiveAction) boyActiveAction.fadeOut(duration);
  next.reset().fadeIn(duration).play();
  boyActiveAction = next;
}

// Public API
export async function spawnBoy(scene, opts = {}) {
  // Toggle visibility if already loaded
  if (boyLoaded && boyModel) {
    boyModel.visible = !boyModel.visible;
    if (typeof window !== "undefined") {
      window.pluginsInRoom = window.pluginsInRoom || {};
      window.pluginsInRoom.boy = boyModel.visible;
    }
    console.log(`[boy] visibility set to: ${boyModel.visible}`);
    return { model: boyModel, mixer: boyMixer, actions: boyActions };
  }

  console.log("[boy] loading idle model (as base)...");
  let base = await loadFBX("/model/boy/Idle.fbx");
  if (!hasAnyMesh(base)) {
    console.warn(
      "[boy] Idle.fbx contains no meshes; falling back to base_basic_shaded.fbx"
    );
    base = await loadFBX("/model/boy/base_basic_shaded.fbx");
  }
  boyModel = base; // mesh (and possibly idle animation)
  setShadowAndSkinning(boyModel);
  applyBoyMaterials(boyModel);
  boyModel.userData.isBoy = true;

  const scale = opts.scale != null ? opts.scale : 0.003;
  boyModel.scale.setScalar(scale);

  // Optional position/rotation
  if (opts.position) boyModel.position.copy(opts.position);
  if (opts.rotation) boyModel.rotation.setFromVector3(opts.rotation);

  // Add to scene
  scene.add(boyModel);

  // Create mixer and load animations
  boyMixer = new THREE.AnimationMixer(boyModel);
  if (boyModel.animations && boyModel.animations.length) {
    const idleClip = boyModel.animations[0];
    boyActions.idle = boyMixer.clipAction(idleClip, boyModel);
    console.log("[boy] idle animation loaded from Idle.fbx");
  }
  await loadAnim("walk", "/model/boy/Walking.fbx");
  await loadAnim("startWalking", "/model/boy/Start Walking.fbx");

  // Default state - prioritize idle animation
  if (boyActions.idle) {
    console.log("[boy] setting idle as default animation");
    fadeTo("idle");
  } else if (boyActions.walk) {
    console.log("[boy] no idle animation found, falling back to walk");
    fadeTo("walk");
  } else if (boyActions.startWalking) {
    console.log(
      "[boy] no idle or walk animation found, falling back to startWalking"
    );
    fadeTo("startWalking");
  } else {
    console.warn("[boy] no animations available");
  }

  boyLoaded = true;
  if (typeof window !== "undefined") {
    window.pluginsInRoom = window.pluginsInRoom || {};
    window.pluginsInRoom.boy = true;
  }

  console.log("[boy] model added to scene");
  return { model: boyModel, mixer: boyMixer, actions: boyActions };
}

export function updateBoy(deltaSeconds) {
  if (boyMixer) boyMixer.update(deltaSeconds);
}

export function playBoy(name) {
  if (!boyActions[name]) {
    console.warn(`[boy] action not found: ${name}`);
    return;
  }
  // special handling: startWalking once then go to walk
  if (name === "startWalking") {
    const a = boyActions.startWalking;
    a.reset().setLoop(THREE.LoopOnce, 1).play();
    if (boyActiveAction && boyActiveAction !== a) boyActiveAction.stop();
    boyActiveAction = a;
    a.clampWhenFinished = true;
    // Remove any previous handler to avoid duplicate triggers
    if (startWalkFinishedHandler && boyMixer) {
      boyMixer.removeEventListener("finished", startWalkFinishedHandler);
      startWalkFinishedHandler = null;
    }
    // Only transition when THIS action finishes
    const onFinished = (e) => {
      if (e.action === a) {
        if (boyMixer) boyMixer.removeEventListener("finished", onFinished);
        startWalkFinishedHandler = null;
        if (boyActions.walk) fadeTo("walk", 0.2);
      }
    };
    startWalkFinishedHandler = onFinished;
    a.getMixer().addEventListener("finished", onFinished);
    return;
  }
  fadeTo(name);
}

export function getBoy() {
  return boyModel;
}

export function isBoyLoaded() {
  return boyLoaded;
}

// Convenience loader mirroring sample-model style
export async function loadBoy(scene, callbacks = {}) {
  const data = await spawnBoy(scene);
  if (callbacks.onBoyLoaded) callbacks.onBoyLoaded(data);
  return data;
}
