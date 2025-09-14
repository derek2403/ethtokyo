import { useCursor, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useAtom } from "jotai";
import { easing } from "maath";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bone,
  BoxGeometry,
  Color,
  Float32BufferAttribute,
  MathUtils,
  MeshStandardMaterial,
  Skeleton,
  SkinnedMesh,
  SRGBColorSpace,
  Uint16BufferAttribute,
  Vector3,
} from "three";
import { degToRad } from "three/src/math/MathUtils.js";
import { pageAtom, pages, modalPageAtom, summaryTextureAtom } from "./UI";

// Animation and curve parameters
const easingFactor = 0.5; // Controls the speed of the easing
const easingFactorFold = 0.3; // Controls the speed of the easing
const insideCurveStrength = 0.18; // Controls the strength of the curve
const outsideCurveStrength = 0.05; // Controls the strength of the curve
const turningCurveStrength = 0.09; // Controls the strength of the curve

// Page dimensions and geometry
const PAGE_WIDTH = 1.28;
const PAGE_HEIGHT = 1.71; // 4:3 aspect ratio
const PAGE_DEPTH = 0.003;
const PAGE_SEGMENTS = 30;
const SEGMENT_WIDTH = PAGE_WIDTH / PAGE_SEGMENTS;

// Create page geometry with bone weights for animation
const pageGeometry = new BoxGeometry(
  PAGE_WIDTH,
  PAGE_HEIGHT,
  PAGE_DEPTH,
  PAGE_SEGMENTS,
  2
);

pageGeometry.translate(PAGE_WIDTH / 2, 0, 0);

const position = pageGeometry.attributes.position;
const vertex = new Vector3();
const skinIndexes = [];
const skinWeights = [];

// Calculate skin weights for each vertex to enable page bending animation
for (let i = 0; i < position.count; i++) {
  vertex.fromBufferAttribute(position, i);
  const x = vertex.x;

  const skinIndex = Math.max(0, Math.floor(x / SEGMENT_WIDTH));
  let skinWeight = (x % SEGMENT_WIDTH) / SEGMENT_WIDTH;

  skinIndexes.push(skinIndex, skinIndex + 1, 0, 0);
  skinWeights.push(1 - skinWeight, skinWeight, 0, 0);
}

pageGeometry.setAttribute(
  "skinIndex",
  new Uint16BufferAttribute(skinIndexes, 4)
);
pageGeometry.setAttribute(
  "skinWeight",
  new Float32BufferAttribute(skinWeights, 4)
);

// Colors for materials
const whiteColor = new Color("white");
const emissiveColor = new Color("orange");

// Page materials for different parts of the book
const pageMaterials = [
  new MeshStandardMaterial({
    color: whiteColor,
  }),
  new MeshStandardMaterial({
    color: "#111",
  }),
  new MeshStandardMaterial({
    color: whiteColor,
  }),
  new MeshStandardMaterial({
    color: whiteColor,
  }),
];

// Preload cover page, first page, and back cover textures
// Updated to use the new PNG cover image (requested change)
useTexture.preload('/book_pages/cover_page.png');
useTexture.preload('/book_pages/page_1.png');
useTexture.preload('/book_pages/back_cover.png');
// Preload fallback texture for pages without specific images
useTexture.preload('/book_pages/continued.png');

const Page = ({ number, front, back, page, opened, bookClosed, ...props }) => {
  // Load cover page texture for the first page (cover)
  // Updated to use the new PNG cover image (requested change)
  const coverTexture = number === 0 ? useTexture('/book_pages/cover_page.png') : null;
  if (coverTexture) {
    coverTexture.colorSpace = SRGBColorSpace;
  }
  
  // Load page_1.png texture for the left side of the first spread (back of cover)
  const page1Texture = number === 0 ? useTexture('/book_pages/page_1.png') : null;
  if (page1Texture) {
    page1Texture.colorSpace = SRGBColorSpace;
  }
  
  // Load back cover texture for the last page (back cover)
  const backCoverTexture = number === pages.length - 1 ? useTexture('/book_pages/back_cover.png') : null;
  if (backCoverTexture) {
    backCoverTexture.colorSpace = SRGBColorSpace;
  }
  
  // Fallback texture used when a page does not have a dedicated image
  const continuedTexture = useTexture('/book_pages/continued.png');
  if (continuedTexture) {
    continuedTexture.colorSpace = SRGBColorSpace;
  }

  // Optional dynamic summary texture for the right page of the first spread
  const [summaryTextureUrl] = useAtom(summaryTextureAtom);
  const dynamicSummaryTexture = useTexture(summaryTextureUrl || '/book_pages/continued.png');
  dynamicSummaryTexture.colorSpace = SRGBColorSpace;
  
  // Determine textures for this page surfaces
  // - Front (material[4]): cover image on page 0
  // - Back  (material[5]): page_1.png on page 0, back cover image on last page
  //   For all other pages without images, use the continued.png fallback
  const frontTexture = number === 0
    ? coverTexture
    : (number === 1 ? dynamicSummaryTexture : continuedTexture);
  const backTexture =
    number === 0
      ? page1Texture
      : number === pages.length - 1
        ? backCoverTexture
        : number === 1
          ? dynamicSummaryTexture
          : continuedTexture;
  const pictureRoughness = null;
  
  const group = useRef();
  const turnedAt = useRef(0);
  const lastOpened = useRef(opened);
  const skinnedMeshRef = useRef();

  // Create skinned mesh with bone system for page animation
  const manualSkinnedMesh = useMemo(() => {
    const bones = [];
    
    // Create bones for page segments
    for (let i = 0; i <= PAGE_SEGMENTS; i++) {
      let bone = new Bone();
      bones.push(bone);
      if (i === 0) {
        bone.position.x = 0;
      } else {
        bone.position.x = SEGMENT_WIDTH;
      }
      if (i > 0) {
        bones[i - 1].add(bone);
      }
    }
    const skeleton = new Skeleton(bones);

    // Create materials for page surfaces
    const pageColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
      '#F1948A', '#AED6F1', '#A9DFBF', '#F9E79F'
    ];
    
    // If a texture is present, keep material color white to avoid tinting
    const hasFrontTexture = !!frontTexture;
    const hasBackTexture = !!backTexture;
    const frontColor = hasFrontTexture ? 'white' : pageColors[number % pageColors.length];
    const backColor = hasBackTexture ? 'white' : pageColors[(number + 1) % pageColors.length];
    
    const materials = [
      ...pageMaterials,
      new MeshStandardMaterial({
        map: frontTexture, // Cover texture on page 0
        color: frontColor,
        roughness: frontTexture ? 0.8 : 0.1,
        emissive: emissiveColor,
        emissiveIntensity: 0,
      }),
      new MeshStandardMaterial({
        map: backTexture, // page_1.png on back of cover (left side), back cover on last page
        color: backColor,
        roughness: backTexture ? 0.8 : 0.1,
        emissive: emissiveColor,
        emissiveIntensity: 0,
      }),
    ];
    
    const mesh = new SkinnedMesh(pageGeometry, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.add(skeleton.bones[0]);
    mesh.bind(skeleton);
    return mesh;
  }, []);

  // When textures change (e.g., summary data URL ready), update the material maps
  useEffect(() => {
    const mesh = skinnedMeshRef.current;
    if (!mesh) return;
    const frontMat = mesh.material[4];
    const backMat = mesh.material[5];
    if (frontMat && frontMat.map !== frontTexture) {
      frontMat.map = frontTexture;
      frontMat.needsUpdate = true;
    }
    if (backMat && backMat.map !== backTexture) {
      backMat.map = backTexture;
      backMat.needsUpdate = true;
    }
  }, [frontTexture, backTexture]);

  // Animation loop for page turning
  useFrame((_, delta) => {
    if (!skinnedMeshRef.current) {
      return;
    }

    // Handle highlighting effect
    const emissiveIntensity = highlighted ? 0.22 : 0;
    skinnedMeshRef.current.material[4].emissiveIntensity =
      skinnedMeshRef.current.material[5].emissiveIntensity = MathUtils.lerp(
        skinnedMeshRef.current.material[4].emissiveIntensity,
        emissiveIntensity,
        0.1
      );

    // Track when page starts turning
    if (lastOpened.current !== opened) {
      turnedAt.current = +new Date();
      lastOpened.current = opened;
    }
    
    // Calculate turning animation progress
    let turningTime = Math.min(400, new Date() - turnedAt.current) / 400;
    turningTime = Math.sin(turningTime * Math.PI);

    // Determine target rotation based on page state
    let targetRotation = opened ? -Math.PI / 2 : Math.PI / 2;
    if (!bookClosed) {
      targetRotation += degToRad(number * 0.8);
    }

    // Animate each bone for realistic page bending
    const bones = skinnedMeshRef.current.skeleton.bones;
    for (let i = 0; i < bones.length; i++) {
      const target = i === 0 ? group.current : bones[i];

      // Calculate curve intensities for different parts of the page
      const insideCurveIntensity = i < 8 ? Math.sin(i * 0.2 + 0.25) : 0;
      const outsideCurveIntensity = i >= 8 ? Math.cos(i * 0.3 + 0.09) : 0;
      const turningIntensity =
        Math.sin(i * Math.PI * (1 / bones.length)) * turningTime;
        
      // Combine curve effects for final rotation
      let rotationAngle =
        insideCurveStrength * insideCurveIntensity * targetRotation -
        outsideCurveStrength * outsideCurveIntensity * targetRotation +
        turningCurveStrength * turningIntensity * targetRotation;
        
      let foldRotationAngle = degToRad(Math.sign(targetRotation) * 2);
      
      // Handle closed book state
      if (bookClosed) {
        if (i === 0) {
          rotationAngle = targetRotation;
          foldRotationAngle = 0;
        } else {
          rotationAngle = 0;
          foldRotationAngle = 0;
        }
      }
      
      // Apply smooth easing to rotations
      easing.dampAngle(
        target.rotation,
        "y",
        rotationAngle,
        easingFactor,
        delta
      );

      // Add folding effect during turning
      const foldIntensity =
        i > 8
          ? Math.sin(i * Math.PI * (1 / bones.length) - 0.5) * turningTime
          : 0;
      easing.dampAngle(
        target.rotation,
        "x",
        foldRotationAngle * foldIntensity,
        easingFactorFold,
        delta
      );
    }
  });

  const [_, setPage] = useAtom(pageAtom);
  const [__, setModalPage] = useAtom(modalPageAtom);
  const [highlighted, setHighlighted] = useState(false);
  useCursor(highlighted);

  return (
    <group
      {...props}
      ref={group}
      onPointerEnter={(e) => {
        e.stopPropagation();
        setHighlighted(true);
      }}
      onPointerLeave={(e) => {
        e.stopPropagation();
        setHighlighted(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        // Determine whether click was on left or right half of the visible page area
        // Convert pointer to local space on the group
        const localX = group.current.worldToLocal(e.point.clone()).x;
        const half = localX < PAGE_WIDTH / 2 ? 'left' : 'right';
        // For the 3D page, the "front" is material[4], the "back" is material[5]
        // For simplicity here, use 'front' when not opened, else 'back'
        const side = opened ? 'back' : 'front';
        setModalPage({ page: number, side, half });
        setHighlighted(false);
      }}
    >
      <primitive
        object={manualSkinnedMesh}
        ref={skinnedMeshRef}
        position-z={-number * PAGE_DEPTH + page * PAGE_DEPTH}
      />
    </group>
  );
};

export const Book = ({ ...props }) => {
  const [page] = useAtom(pageAtom);
  const [delayedPage, setDelayedPage] = useState(page);

  // Handle smooth page transitions with delays
  useEffect(() => {
    let timeout;
    const goToPage = () => {
      setDelayedPage((delayedPage) => {
        if (page === delayedPage) {
          return delayedPage;
        } else {
          timeout = setTimeout(
            () => {
              goToPage();
            },
            Math.abs(page - delayedPage) > 2 ? 50 : 150
          );
          if (page > delayedPage) {
            return delayedPage + 1;
          }
          if (page < delayedPage) {
            return delayedPage - 1;
          }
        }
      });
    };
    goToPage();
    return () => {
      clearTimeout(timeout);
    };
  }, [page]);

  return (
    <group {...props} rotation-y={-Math.PI / 2}>
      {[...pages].map((pageData, index) => (
        <Page
          key={index}
          page={delayedPage}
          number={index}
          opened={delayedPage > index}
          bookClosed={delayedPage === 0 || delayedPage === pages.length}
          {...pageData}
        />
      ))}
    </group>
  );
};
