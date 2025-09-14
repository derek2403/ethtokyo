import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

// Module-level state for the Boy model and animations
let boyLoaded = false;
let boyModel = null;
let boyMixer = null;
let boyActions = {};
let boyActiveAction = null;
let startWalkFinishedHandler = null; // one-shot handler for startWalking -> walk

// Animation speed constants for consistency
const ANIMATION_SPEED = 1.0;
const WALK_SPEED_MULTIPLIER = 1.0; // Adjust this to change walk speed
const TRANSITION_DURATION = 0.3; // Smooth transition time in seconds

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

    // Use a clone so we can safely tweak tracks when needed
    let clip = fbx.animations[0].clone();

    // Strip root translation for locomotion if we drive movement in code
    if (name === "walk" || name === "startWalking") {
      const ROOTS = ["mixamorigHips", "Hips", "Root", "Armature|Hips"];
      clip.tracks = clip.tracks.filter((t) => {
        const isRoot = ROOTS.some((n) => t.name.startsWith(n + "."));
        return !(isRoot && t.name.endsWith(".position"));
      });

      // Ensure smooth looping for walk animations by adjusting the last keyframe
      // to match the first keyframe for seamless loops
      clip.tracks.forEach((track) => {
        if (track.values && track.values.length > 0) {
          const valueSize = track.getValueSize();
          const lastIndex = track.values.length - valueSize;
          // Copy first keyframe values to last keyframe for seamless loop
          for (let i = 0; i < valueSize; i++) {
            track.values[lastIndex + i] = track.values[i];
          }
        }
      });
    }

    const action = boyMixer.clipAction(clip, boyModel);
    boyActions[name] = action;

    // Consistent speed settings
    action.enabled = true;
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = false;

    // Set consistent speed based on animation type
    const speed =
      name === "walk"
        ? ANIMATION_SPEED * WALK_SPEED_MULTIPLIER
        : ANIMATION_SPEED;
    action.timeScale = speed;
    action.setEffectiveWeight?.(1);
    if ("weight" in action) action.weight = 1;

    console.log(
      `[boy] animation loaded: ${name} (duration=${clip.duration.toFixed(
        3
      )}s, speed=${speed})`
    );
    return action;
  } catch (err) {
    console.error(`[boy] failed to load animation ${name} from ${url}`, err);
    return null;
  }
}

function fadeTo(name, duration = TRANSITION_DURATION) {
  const next = boyActions[name];
  if (!next) return;

  // If already running this action, do nothing
  if (boyActiveAction === next && next.isRunning && next.isRunning()) return;

  // Global mixer speed should always be 1.0 for consistent timing
  if (boyMixer) boyMixer.timeScale = 1.0;

  // Stop current action first
  if (boyActiveAction && boyActiveAction.isRunning()) {
    boyActiveAction.stop();
  }

  // Start new action
  next.enabled = true;
  next.paused = false;
  next.setLoop(THREE.LoopRepeat, Infinity);

  // Set consistent speed based on animation type
  const speed =
    name === "walk" ? ANIMATION_SPEED * WALK_SPEED_MULTIPLIER : ANIMATION_SPEED;
  next.timeScale = speed;

  next.setEffectiveWeight?.(1);
  if ("weight" in next) next.weight = 1;

  next.reset().play();
  boyActiveAction = next;
}

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

  console.log("[boy] loading idle model...");
  const base = await loadFBX("/model/boy/Idle.fbx");

  if (!hasAnyMesh(base)) {
    throw new Error(
      "[boy] Idle.fbx contains no meshes - cannot proceed without base model"
    );
  }

  boyModel = base;
  setShadowAndSkinning(boyModel);
  applyBoyMaterials(boyModel);
  boyModel.userData.isBoy = true;

  const scale = opts.scale != null ? opts.scale : 0.003;
  boyModel.scale.setScalar(scale);

  if (opts.position) boyModel.position.copy(opts.position);
  if (opts.rotation) boyModel.rotation.setFromVector3(opts.rotation);

  scene.add(boyModel);

  // Mixer
  boyMixer = new THREE.AnimationMixer(boyModel);
  boyMixer.timeScale = 1.0;

  if (boyModel.animations && boyModel.animations.length) {
    const idleClip = boyModel.animations[0];
    boyActions.idle = boyMixer.clipAction(idleClip, boyModel);
    boyActions.idle.timeScale = ANIMATION_SPEED;
    boyActions.idle.setLoop(THREE.LoopRepeat, Infinity);
    boyActions.idle.setEffectiveWeight?.(1);
    if ("weight" in boyActions.idle) boyActions.idle.weight = 1;
    console.log("[boy] idle animation loaded from Idle.fbx");
  } else {
    // If no embedded animation, load it separately
    await loadAnim("idle", "/model/boy/Idle.fbx");
  }

  await loadAnim("walk", "/model/boy/Walking.fbx");
  await loadAnim("startWalking", "/model/boy/Start Walking.fbx");

  // Default state
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
    playBoy("startWalking");
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

// --- Improved mixer update for smooth looping ---
let __mixAcc = 0;
const __MIX_STEP = 1 / 60; // 60 Hz animation step
const __MAX_FRAME = 1 / 30; // never advance more than 33ms at once

export function updateBoy(deltaSeconds) {
  if (!boyMixer) return;

  // Clamp ridiculous deltas (first few clicks can hitch)
  const dt = Math.min(Math.max(deltaSeconds || 0, 0), __MAX_FRAME);

  // For smoother animation, use variable timestep but with smoothing
  const smoothDelta = dt * 0.8 + (deltaSeconds || 0) * 0.2;

  __mixAcc += smoothDelta;

  // Use smaller steps for better loop smoothness
  const dynamicStep = Math.min(__MIX_STEP, __mixAcc);

  // Advance mixer with smoothed delta for better loop transitions
  if (__mixAcc >= dynamicStep) {
    boyMixer.update(dynamicStep);
    __mixAcc -= dynamicStep;
  }

  // Prevent accumulation buildup
  if (__mixAcc > __MIX_STEP * 2) {
    __mixAcc = __MIX_STEP;
  }
}

export function playBoy(name, forceRestart = false) {
  if (!boyModel || !boyMixer) {
    console.warn(
      `[boy] model or mixer not ready, cannot play animation: ${name}`
    );
    return;
  }

  const a = boyActions[name];
  if (!a) {
    console.warn(`[boy] action not found: ${name}`);
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

// (Optional) Debounced wrapper to avoid rapid re-plays on the first clicks
let __lastAnimName = null;
let __lastAnimAt = 0;
const __ANIM_DEBOUNCE_MS = 120;
export function playBoyOnce(name) {
  const now =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  if (__lastAnimName === name && now - __lastAnimAt < __ANIM_DEBOUNCE_MS)
    return;
  __lastAnimName = name;
  __lastAnimAt = now;
  playBoy(name);
}

// Animation speed control functions
export function setBoyWalkSpeed(speed) {
  if (boyActions.walk) {
    boyActions.walk.timeScale = ANIMATION_SPEED * speed;
  }
  if (boyActions.startWalking) {
    boyActions.startWalking.timeScale = ANIMATION_SPEED * speed;
  }
  console.log(`[boy] walk speed set to: ${speed}`);
}

export function setBoyAnimationSpeed(animationName, speed) {
  if (boyActions[animationName]) {
    boyActions[animationName].timeScale = speed;
    console.log(`[boy] ${animationName} speed set to: ${speed}`);
  } else {
    console.warn(`[boy] animation not found: ${animationName}`);
  }
}

export function getCurrentAnimation() {
  return boyActiveAction
    ? Object.keys(boyActions).find((key) => boyActions[key] === boyActiveAction)
    : null;
}

// Force reset to idle state - useful when model gets corrupted
export function resetBoyToIdle() {
  if (!boyModel || !boyMixer || !boyActions.idle) {
    console.warn(
      "[boy] cannot reset to idle - model not ready or idle animation missing"
    );
    return;
  }

  // Stop all animations
  Object.values(boyActions).forEach((action) => {
    if (action && action.isRunning && action.isRunning()) {
      action.stop();
    }
  });

  // Clear mixer
  boyMixer.stopAllAction();

  // Reset to idle
  boyActiveAction = null;
  fadeTo("idle");

  console.log("[boy] reset to idle state");
}

// Convenience loader mirroring sample-model style
export async function loadBoy(scene, callbacks = {}) {
  const data = await spawnBoy(scene);
  if (callbacks.onBoyLoaded) callbacks.onBoyLoaded(data);
  return data;
}
