import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

// Module-level state for the Boy model and animations
let boyLoaded = false;
let boyModel = null;
let boyMixer = null;
let boyActions = {};
let boyActiveAction = null;

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

  console.log("[boy] loading base model...");
  const basePath = "/model/boy/base_basic_shaded.fbx"; // prefer shaded rig
  const base = await loadFBX(basePath);
  boyModel = base;
  setShadowAndSkinning(boyModel);

  // Scale to meters (most FBX are centimeters)
  const scale = opts.scale != null ? opts.scale : 0.003;
  boyModel.scale.setScalar(scale);

  // Optional position/rotation
  if (opts.position) boyModel.position.copy(opts.position);
  if (opts.rotation) boyModel.rotation.setFromVector3(opts.rotation);

  // Add to scene
  scene.add(boyModel);

  // Create mixer and load animations
  boyMixer = new THREE.AnimationMixer(boyModel);
  await loadAnim("idle", "/model/boy/Idle.fbx");
  await loadAnim("walk", "/model/boy/Walking.fbx");
  await loadAnim("startWalking", "/model/boy/Start Walking.fbx");

  // Default state
  if (boyActions.idle || boyActions.walk || boyActions.startWalking) {
    fadeTo(boyActions.idle ? "idle" : boyActions.walk ? "walk" : "startWalking");
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
    a.getMixer().addEventListener("finished", () => {
      if (boyActions.walk) fadeTo("walk", 0.2);
    });
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

