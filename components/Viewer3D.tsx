import React, { useCallback, useRef } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  PanResponderInstance,
  StyleSheet,
  View,
} from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import type {
  ModelStyle,
  GridOverlayDivisions,
  BodyRegion,
  PerspectiveMode,
} from '@/constants/presets';

type Viewer3DProps = {
  directionalIntensity: number;
  ambientIntensity: number;
  showGrid?: boolean;
  backgroundColor?: string;
  // Phase 5 props
  modelStyle?: ModelStyle;
  wireframeOverlay?: boolean;
  negativeSpace?: boolean;
  gridOverlay?: GridOverlayDivisions;
  showBoundingBox?: boolean;
  showFloorPlane?: boolean;
  showPoseShadow?: boolean;
  modelOpacity?: number;
  mirrorX?: boolean;
  selectedBodyRegions?: BodyRegion[];
  // Phase 6 props
  perspectiveMode?: PerspectiveMode;
  /** 0–1, used for fade transitions — controls overall scene opacity */
  sceneOpacity?: number;
};

// Body region colours for coloured anatomy mode
const ANATOMY_COLOURS: Record<string, number> = {
  head: 0xffffff,      // white (bone)
  torso: 0xcc3333,     // red (muscle)
  'left-arm': 0xcc3333,
  'right-arm': 0xcc3333,
  'left-leg': 0x3366cc, // blue (tendons)
  'right-leg': 0x3366cc,
};

// Skin-tone base colour
const SKIN_COLOUR = 0xdeb896;
const MUSCLE_COLOUR = 0xcc4455;
const BONE_COLOUR = 0xe8e8d0;

/** Camera configuration for each perspective mode */
type CameraConfig = {
  type: 'perspective' | 'orthographic';
  fov?: number;
  position: [number, number, number];
  lookAt: [number, number, number];
};

function getCameraConfig(mode: PerspectiveMode): CameraConfig {
  switch (mode) {
    case 'flat':
      return {
        type: 'orthographic',
        position: [0, 0, 3],
        lookAt: [0, 0, 0],
      };
    case '1-point':
      return {
        type: 'perspective',
        fov: 50,
        position: [0, 0, 3],
        lookAt: [0, 0, 0],
      };
    case '2-point':
      return {
        type: 'perspective',
        fov: 60,
        position: [2, 0.5, 2],
        lookAt: [0, 0, 0],
      };
    case '3-point':
      return {
        type: 'perspective',
        fov: 75,
        position: [1.5, 2.5, 2],
        lookAt: [0, -0.3, 0],
      };
    case '4-point':
      return {
        type: 'perspective',
        fov: 100,
        position: [0, 0, 2.5],
        lookAt: [0, 0, 0],
      };
    case 'fisheye':
      return {
        type: 'perspective',
        fov: 90,
        position: [0, 0, 2.5],
        lookAt: [0, 0, 0],
      };
    default:
      return {
        type: 'perspective',
        fov: 50,
        position: [0, 0, 3],
        lookAt: [0, 0, 0],
      };
  }
}

/**
 * Returns a distortion strength for barrel/curvilinear post-processing.
 * 0 = no distortion.
 */
function getDistortionStrength(mode: PerspectiveMode): number {
  switch (mode) {
    case '4-point':
      return 0.35;
    case 'fisheye':
      return 0.7;
    default:
      return 0;
  }
}

function createBodyPart(
  geometry: THREE.BufferGeometry,
  region: BodyRegion,
  modelStyle: ModelStyle,
  opacity: number,
  visible: boolean,
): THREE.Mesh {
  let material: THREE.MeshStandardMaterial;

  switch (modelStyle) {
    case 'muscle': {
      material = new THREE.MeshStandardMaterial({
        color: MUSCLE_COLOUR,
        metalness: 0.1,
        roughness: 0.6,
        transparent: true,
        opacity: opacity * 0.75,
      });
      break;
    }
    case 'skeleton': {
      material = new THREE.MeshStandardMaterial({
        color: BONE_COLOUR,
        metalness: 0.0,
        roughness: 0.8,
        wireframe: true,
        transparent: opacity < 1,
        opacity,
      });
      break;
    }
    case 'forms': {
      material = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.0,
        roughness: 0.5,
        transparent: opacity < 1,
        opacity,
      });
      break;
    }
    case 'coloured-anatomy': {
      material = new THREE.MeshStandardMaterial({
        color: ANATOMY_COLOURS[region] ?? 0xcccccc,
        metalness: 0.1,
        roughness: 0.5,
        transparent: opacity < 1,
        opacity,
      });
      break;
    }
    default: {
      // 'solid'
      material = new THREE.MeshStandardMaterial({
        color: SKIN_COLOUR,
        metalness: 0.15,
        roughness: 0.5,
        transparent: opacity < 1,
        opacity,
      });
      break;
    }
  }

  const mesh = new THREE.Mesh(geometry, material);
  mesh.visible = visible;
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  return mesh;
}

/**
 * Creates a simplified humanoid figure using basic primitives.
 * Returns a group with named children for each body region.
 */
function createHumanoidModel(
  modelStyle: ModelStyle,
  opacity: number,
  selectedRegions: BodyRegion[],
): THREE.Group {
  const group = new THREE.Group();

  const isFormsStyle = modelStyle === 'forms';

  // Head
  const headGeo = new THREE.SphereGeometry(0.22, isFormsStyle ? 8 : 16, isFormsStyle ? 8 : 16);
  const head = createBodyPart(headGeo, 'head', modelStyle, opacity, selectedRegions.includes('head'));
  head.position.set(0, 1.65, 0);
  head.name = 'head';
  group.add(head);

  // Neck
  const neckGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.12, isFormsStyle ? 6 : 12);
  const neck = createBodyPart(neckGeo, 'head', modelStyle, opacity, selectedRegions.includes('head'));
  neck.position.set(0, 1.49, 0);
  neck.name = 'neck';
  group.add(neck);

  // Torso - upper
  const upperTorsoGeo = isFormsStyle
    ? new THREE.BoxGeometry(0.55, 0.45, 0.28)
    : new THREE.CylinderGeometry(0.22, 0.26, 0.45, 16);
  const upperTorso = createBodyPart(upperTorsoGeo, 'torso', modelStyle, opacity, selectedRegions.includes('torso'));
  upperTorso.position.set(0, 1.2, 0);
  upperTorso.name = 'upper-torso';
  group.add(upperTorso);

  // Torso - lower
  const lowerTorsoGeo = isFormsStyle
    ? new THREE.BoxGeometry(0.44, 0.35, 0.24)
    : new THREE.CylinderGeometry(0.26, 0.2, 0.35, 16);
  const lowerTorso = createBodyPart(lowerTorsoGeo, 'torso', modelStyle, opacity, selectedRegions.includes('torso'));
  lowerTorso.position.set(0, 0.82, 0);
  lowerTorso.name = 'lower-torso';
  group.add(lowerTorso);

  // Pelvis
  const pelvisGeo = isFormsStyle
    ? new THREE.BoxGeometry(0.38, 0.18, 0.22)
    : new THREE.SphereGeometry(0.18, 12, 8);
  const pelvis = createBodyPart(pelvisGeo, 'torso', modelStyle, opacity, selectedRegions.includes('torso'));
  pelvis.position.set(0, 0.62, 0);
  pelvis.name = 'pelvis';
  group.add(pelvis);

  // --- Arms ---
  const armConfigs: { region: BodyRegion; side: number }[] = [
    { region: 'left-arm', side: -1 },
    { region: 'right-arm', side: 1 },
  ];

  for (const { region, side } of armConfigs) {
    const visible = selectedRegions.includes(region);

    // Shoulder joint
    const shoulderGeo = new THREE.SphereGeometry(0.07, isFormsStyle ? 6 : 10, isFormsStyle ? 6 : 10);
    const shoulder = createBodyPart(shoulderGeo, region, modelStyle, opacity, visible);
    shoulder.position.set(side * 0.32, 1.36, 0);
    shoulder.name = `${region}-shoulder`;
    group.add(shoulder);

    // Upper arm
    const upperArmGeo = new THREE.CylinderGeometry(0.055, 0.05, 0.32, isFormsStyle ? 6 : 10);
    const upperArm = createBodyPart(upperArmGeo, region, modelStyle, opacity, visible);
    upperArm.position.set(side * 0.34, 1.16, 0);
    upperArm.name = `${region}-upper`;
    group.add(upperArm);

    // Elbow joint
    const elbowGeo = new THREE.SphereGeometry(0.05, isFormsStyle ? 6 : 8, isFormsStyle ? 6 : 8);
    const elbow = createBodyPart(elbowGeo, region, modelStyle, opacity, visible);
    elbow.position.set(side * 0.34, 0.98, 0);
    elbow.name = `${region}-elbow`;
    group.add(elbow);

    // Lower arm
    const lowerArmGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.3, isFormsStyle ? 6 : 10);
    const lowerArm = createBodyPart(lowerArmGeo, region, modelStyle, opacity, visible);
    lowerArm.position.set(side * 0.34, 0.8, 0);
    lowerArm.name = `${region}-lower`;
    group.add(lowerArm);

    // Hand
    const handGeo = isFormsStyle
      ? new THREE.BoxGeometry(0.06, 0.1, 0.04)
      : new THREE.SphereGeometry(0.04, 8, 8);
    const hand = createBodyPart(handGeo, region, modelStyle, opacity, visible);
    hand.position.set(side * 0.34, 0.62, 0);
    hand.name = `${region}-hand`;
    group.add(hand);
  }

  // --- Legs ---
  const legConfigs: { region: BodyRegion; side: number }[] = [
    { region: 'left-leg', side: -1 },
    { region: 'right-leg', side: 1 },
  ];

  for (const { region, side } of legConfigs) {
    const visible = selectedRegions.includes(region);

    // Hip joint
    const hipGeo = new THREE.SphereGeometry(0.07, isFormsStyle ? 6 : 10, isFormsStyle ? 6 : 10);
    const hip = createBodyPart(hipGeo, region, modelStyle, opacity, visible);
    hip.position.set(side * 0.12, 0.55, 0);
    hip.name = `${region}-hip`;
    group.add(hip);

    // Upper leg
    const upperLegGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.42, isFormsStyle ? 6 : 10);
    const upperLeg = createBodyPart(upperLegGeo, region, modelStyle, opacity, visible);
    upperLeg.position.set(side * 0.12, 0.3, 0);
    upperLeg.name = `${region}-upper`;
    group.add(upperLeg);

    // Knee joint
    const kneeGeo = new THREE.SphereGeometry(0.055, isFormsStyle ? 6 : 8, isFormsStyle ? 6 : 8);
    const knee = createBodyPart(kneeGeo, region, modelStyle, opacity, visible);
    knee.position.set(side * 0.12, 0.08, 0);
    knee.name = `${region}-knee`;
    group.add(knee);

    // Lower leg
    const lowerLegGeo = new THREE.CylinderGeometry(0.055, 0.045, 0.4, isFormsStyle ? 6 : 10);
    const lowerLeg = createBodyPart(lowerLegGeo, region, modelStyle, opacity, visible);
    lowerLeg.position.set(side * 0.12, -0.15, 0);
    lowerLeg.name = `${region}-lower`;
    group.add(lowerLeg);

    // Foot
    const footGeo = isFormsStyle
      ? new THREE.BoxGeometry(0.08, 0.05, 0.16)
      : new THREE.BoxGeometry(0.07, 0.04, 0.14);
    const foot = createBodyPart(footGeo, region, modelStyle, opacity, visible);
    foot.position.set(side * 0.12, -0.38, 0.03);
    foot.name = `${region}-foot`;
    group.add(foot);
  }

  // Centre the model vertically (approx eye-level at y=0)
  group.position.y = -0.6;

  return group;
}

/**
 * Creates a wireframe clone of the model group.
 */
function createWireframeOverlay(sourceGroup: THREE.Group): THREE.Group {
  const wireGroup = new THREE.Group();
  sourceGroup.children.forEach((child) => {
    if (child instanceof THREE.Mesh && child.visible) {
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0x00ffaa,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
      });
      const wireMesh = new THREE.Mesh(child.geometry, wireMat);
      wireMesh.position.copy(child.position);
      wireMesh.rotation.copy(child.rotation);
      wireMesh.scale.copy(child.scale);
      wireGroup.add(wireMesh);
    }
  });
  wireGroup.position.copy(sourceGroup.position);
  return wireGroup;
}

/**
 * Barrel distortion vertex/fragment shaders for 4-point and fisheye modes.
 * Renders the scene to a texture, then applies distortion as a full-screen pass.
 */
const DISTORTION_VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const DISTORTION_FRAGMENT_SHADER = `
precision mediump float;
uniform sampler2D tDiffuse;
uniform float strength;
varying vec2 vUv;

void main() {
  vec2 centered = vUv - 0.5;
  float dist = length(centered);
  float distortion = 1.0 + strength * dist * dist;
  vec2 distorted = centered * distortion + 0.5;

  if (distorted.x < 0.0 || distorted.x > 1.0 || distorted.y < 0.0 || distorted.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    gl_FragColor = texture2D(tDiffuse, distorted);
  }
}
`;

export function Viewer3D({
  directionalIntensity,
  ambientIntensity,
  showGrid = true,
  backgroundColor = '#2c2c2c',
  modelStyle = 'solid',
  wireframeOverlay = false,
  negativeSpace = false,
  gridOverlay = 'off',
  showBoundingBox = false,
  showFloorPlane = false,
  showPoseShadow = false,
  modelOpacity = 1,
  mirrorX = false,
  selectedBodyRegions = ['head', 'torso', 'left-arm', 'right-arm', 'left-leg', 'right-leg'],
  perspectiveMode = '1-point',
  sceneOpacity = 1,
}: Viewer3DProps) {
  const layoutRef = useRef({ width: 0, height: 0 });
  const rotationRef = useRef({ x: 0, y: 0 });
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const lastTouchInfoRef = useRef<{
    type: 'none' | 'rotate' | 'pan' | 'pinch';
    initialDistance?: number;
    initialZoom?: number;
    lastX?: number;
    lastY?: number;
  }>({ type: 'none' });
  const lastTapRef = useRef(0);

  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const directionalLightRef = useRef<THREE.DirectionalLight | null>(null);

  // Refs for mutable scene objects that update every frame
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const wireGroupRef = useRef<THREE.Group | null>(null);
  const boundingBoxHelperRef = useRef<THREE.Box3Helper | null>(null);
  const floorPlaneRef = useRef<THREE.Mesh | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  // Store current prop values for the render loop
  const propsRef = useRef({
    modelStyle,
    wireframeOverlay,
    negativeSpace,
    showBoundingBox,
    showFloorPlane,
    showPoseShadow,
    modelOpacity,
    mirrorX,
    selectedBodyRegions,
    showGrid,
    gridOverlay,
    backgroundColor,
    perspectiveMode,
    sceneOpacity,
  });
  propsRef.current = {
    modelStyle,
    wireframeOverlay,
    negativeSpace,
    showBoundingBox,
    showFloorPlane,
    showPoseShadow,
    modelOpacity,
    mirrorX,
    selectedBodyRegions,
    showGrid,
    gridOverlay,
    backgroundColor,
    perspectiveMode,
    sceneOpacity,
  };

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    layoutRef.current = { width, height };
  }, []);

  const onContextCreate = useCallback(
    async (gl: ExpoWebGLRenderingContext) => {
      const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
      const aspect = width / height;

      const renderer = new Renderer({ gl });
      renderer.setSize(width, height);
      renderer.setClearColor(backgroundColor);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.BasicShadowMap;

      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // Create cameras for different modes
      const camConfig = getCameraConfig(perspectiveMode);

      let activeCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
      const perspCam = new THREE.PerspectiveCamera(camConfig.fov ?? 50, aspect, 0.1, 1000);
      const orthoFrustum = 2;
      const orthoCam = new THREE.OrthographicCamera(
        -orthoFrustum * aspect,
        orthoFrustum * aspect,
        orthoFrustum,
        -orthoFrustum,
        0.1,
        1000,
      );

      if (camConfig.type === 'orthographic') {
        activeCamera = orthoCam;
      } else {
        activeCamera = perspCam;
      }
      activeCamera.position.set(...camConfig.position);
      activeCamera.lookAt(new THREE.Vector3(...camConfig.lookAt));

      // --- Distortion post-processing setup ---
      const distortionStrength = getDistortionStrength(perspectiveMode);
      let renderTarget: THREE.WebGLRenderTarget | null = null;
      let distortionQuad: THREE.Mesh | null = null;
      let distortionScene: THREE.Scene | null = null;
      let distortionCamera: THREE.OrthographicCamera | null = null;
      let distortionMaterial: THREE.ShaderMaterial | null = null;

      if (distortionStrength > 0) {
        renderTarget = new THREE.WebGLRenderTarget(width, height);
        distortionMaterial = new THREE.ShaderMaterial({
          uniforms: {
            tDiffuse: { value: renderTarget.texture },
            strength: { value: distortionStrength },
          },
          vertexShader: DISTORTION_VERTEX_SHADER,
          fragmentShader: DISTORTION_FRAGMENT_SHADER,
        });
        const quadGeo = new THREE.PlaneGeometry(2, 2);
        distortionQuad = new THREE.Mesh(quadGeo, distortionMaterial);
        distortionScene = new THREE.Scene();
        distortionScene.add(distortionQuad);
        distortionCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      }

      // Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, ambientIntensity);
      ambientLightRef.current = ambientLight;
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, directionalIntensity);
      directionalLight.position.set(2, 4, 3);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 512;
      directionalLight.shadow.mapSize.height = 512;
      directionalLight.shadow.camera.near = 0.1;
      directionalLight.shadow.camera.far = 20;
      directionalLight.shadow.camera.left = -3;
      directionalLight.shadow.camera.right = 3;
      directionalLight.shadow.camera.top = 3;
      directionalLight.shadow.camera.bottom = -3;
      directionalLightRef.current = directionalLight;
      scene.add(directionalLight);

      // Create humanoid model
      const modelGroup = createHumanoidModel(modelStyle, modelOpacity, selectedBodyRegions);
      modelGroupRef.current = modelGroup;
      scene.add(modelGroup);

      // Wireframe overlay
      if (wireframeOverlay) {
        const wireGroup = createWireframeOverlay(modelGroup);
        wireGroupRef.current = wireGroup;
        scene.add(wireGroup);
      }

      // Grid helper (legacy, tied to showGrid)
      if (showGrid) {
        const grid = new THREE.GridHelper(10, 10, 0x555555, 0x333333);
        grid.position.y = -1.0;
        gridHelperRef.current = grid;
        scene.add(grid);
      }

      // Floor plane
      const floorGeo = new THREE.PlaneGeometry(6, 6);
      const floorMat = new THREE.MeshStandardMaterial({
        color: 0x444444,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.rotation.x = -Math.PI / 2;
      floorMesh.position.y = -1.0;
      floorMesh.receiveShadow = true;
      floorMesh.visible = showFloorPlane;
      floorPlaneRef.current = floorMesh;
      scene.add(floorMesh);

      // Bounding box helper
      const bbox = new THREE.Box3().setFromObject(modelGroup);
      const bboxHelper = new THREE.Box3Helper(bbox, new THREE.Color(0xffff00));
      bboxHelper.visible = showBoundingBox;
      boundingBoxHelperRef.current = bboxHelper;
      scene.add(bboxHelper);

      // Track previous prop values to detect changes requiring model rebuild
      let prevModelStyle = modelStyle;
      let prevOpacity = modelOpacity;
      let prevSelectedRegions = [...selectedBodyRegions];
      let prevWireframe = wireframeOverlay;
      let prevMirrorX = mirrorX;
      let prevPerspectiveMode = perspectiveMode;

      const clock = new THREE.Clock();

      const render = () => {
        requestAnimationFrame(render);

        const p = propsRef.current;
        clock.getDelta();

        // Update light intensities
        if (ambientLightRef.current) {
          ambientLightRef.current.intensity = ambientIntensity;
        }
        if (directionalLightRef.current) {
          directionalLightRef.current.intensity = directionalIntensity;
        }

        // Handle perspective mode changes
        if (p.perspectiveMode !== prevPerspectiveMode) {
          const newConfig = getCameraConfig(p.perspectiveMode);
          const newDistortion = getDistortionStrength(p.perspectiveMode);

          if (newConfig.type === 'orthographic') {
            activeCamera = orthoCam;
          } else {
            if (newConfig.fov && perspCam instanceof THREE.PerspectiveCamera) {
              perspCam.fov = newConfig.fov;
              perspCam.updateProjectionMatrix();
            }
            activeCamera = perspCam;
          }
          activeCamera.position.set(...newConfig.position);
          activeCamera.lookAt(new THREE.Vector3(...newConfig.lookAt));

          // Update distortion
          if (newDistortion > 0) {
            if (!renderTarget) {
              renderTarget = new THREE.WebGLRenderTarget(width, height);
              distortionMaterial = new THREE.ShaderMaterial({
                uniforms: {
                  tDiffuse: { value: renderTarget.texture },
                  strength: { value: newDistortion },
                },
                vertexShader: DISTORTION_VERTEX_SHADER,
                fragmentShader: DISTORTION_FRAGMENT_SHADER,
              });
              const quadGeo = new THREE.PlaneGeometry(2, 2);
              distortionQuad = new THREE.Mesh(quadGeo, distortionMaterial);
              distortionScene = new THREE.Scene();
              distortionScene.add(distortionQuad);
              distortionCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
            }
            if (distortionMaterial) {
              distortionMaterial.uniforms.strength.value = newDistortion;
            }
          } else {
            // Disable distortion
            renderTarget = null;
            distortionQuad = null;
            distortionScene = null;
            distortionCamera = null;
            distortionMaterial = null;
          }

          prevPerspectiveMode = p.perspectiveMode;
        }

        // Rebuild model if style, opacity, or regions changed
        const regionsChanged =
          p.selectedBodyRegions.length !== prevSelectedRegions.length ||
          p.selectedBodyRegions.some((r, i) => r !== prevSelectedRegions[i]);

        if (
          p.modelStyle !== prevModelStyle ||
          p.modelOpacity !== prevOpacity ||
          regionsChanged
        ) {
          // Remove old model group
          if (modelGroupRef.current) scene.remove(modelGroupRef.current);
          if (wireGroupRef.current) scene.remove(wireGroupRef.current);

          const newGroup = createHumanoidModel(
            p.modelStyle,
            p.modelOpacity,
            p.selectedBodyRegions,
          );
          modelGroupRef.current = newGroup;
          newGroup.scale.x = p.mirrorX ? -1 : 1;
          scene.add(newGroup);

          // Rebuild wireframe if on
          if (p.wireframeOverlay) {
            const wg = createWireframeOverlay(newGroup);
            wireGroupRef.current = wg;
            scene.add(wg);
          } else {
            wireGroupRef.current = null;
          }

          // Update bounding box
          if (boundingBoxHelperRef.current) {
            scene.remove(boundingBoxHelperRef.current);
          }
          const bbox2 = new THREE.Box3().setFromObject(newGroup);
          const bboxHelper2 = new THREE.Box3Helper(bbox2, new THREE.Color(0xffff00));
          bboxHelper2.visible = p.showBoundingBox;
          boundingBoxHelperRef.current = bboxHelper2;
          scene.add(bboxHelper2);

          prevModelStyle = p.modelStyle;
          prevOpacity = p.modelOpacity;
          prevSelectedRegions = [...p.selectedBodyRegions];
          prevWireframe = p.wireframeOverlay;
        }

        // Toggle wireframe without full rebuild
        if (p.wireframeOverlay !== prevWireframe) {
          if (p.wireframeOverlay && modelGroupRef.current) {
            if (wireGroupRef.current) scene.remove(wireGroupRef.current);
            const wg = createWireframeOverlay(modelGroupRef.current);
            wireGroupRef.current = wg;
            scene.add(wg);
          } else if (wireGroupRef.current) {
            scene.remove(wireGroupRef.current);
            wireGroupRef.current = null;
          }
          prevWireframe = p.wireframeOverlay;
        }

        // Mirror
        if (p.mirrorX !== prevMirrorX && modelGroupRef.current) {
          modelGroupRef.current.scale.x = p.mirrorX ? -1 : 1;
          if (wireGroupRef.current) {
            wireGroupRef.current.scale.x = p.mirrorX ? -1 : 1;
          }
          prevMirrorX = p.mirrorX;
        }

        // Update visibility toggles
        if (boundingBoxHelperRef.current) {
          boundingBoxHelperRef.current.visible = p.showBoundingBox;
        }
        if (floorPlaneRef.current) {
          floorPlaneRef.current.visible = p.showFloorPlane;
        }
        if (gridHelperRef.current) {
          gridHelperRef.current.visible = p.showGrid;
        }

        // Apply shadow
        if (directionalLightRef.current) {
          directionalLightRef.current.castShadow = p.showPoseShadow;
        }
        if (floorPlaneRef.current) {
          floorPlaneRef.current.receiveShadow = p.showPoseShadow;
        }

        // Negative space mode: invert background
        if (p.negativeSpace) {
          renderer.setClearColor(0xeeeeee);
          // Make model pure black silhouette
          if (modelGroupRef.current) {
            modelGroupRef.current.children.forEach((child) => {
              if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                child.material.color.set(0x000000);
                child.material.emissive.set(0x000000);
                child.material.metalness = 0;
                child.material.roughness = 1;
                child.material.transparent = false;
                child.material.opacity = 1;
              }
            });
          }
        } else {
          renderer.setClearColor(p.backgroundColor);
        }

        // Apply rotation from touch
        if (modelGroupRef.current) {
          modelGroupRef.current.rotation.x = rotationRef.current.x;
          modelGroupRef.current.rotation.y = rotationRef.current.y;
        }
        if (wireGroupRef.current) {
          wireGroupRef.current.rotation.x = rotationRef.current.x;
          wireGroupRef.current.rotation.y = rotationRef.current.y;
        }

        // Camera position with zoom/pan applied
        const config = getCameraConfig(p.perspectiveMode);
        const baseZ = config.position[2];
        activeCamera.position.z = baseZ / zoomRef.current;
        activeCamera.position.x = config.position[0] + panRef.current.x;
        activeCamera.position.y = config.position[1] + panRef.current.y;
        activeCamera.lookAt(new THREE.Vector3(...config.lookAt));

        // Render with or without distortion post-processing
        if (renderTarget && distortionScene && distortionCamera) {
          renderer.setRenderTarget(renderTarget);
          renderer.render(scene, activeCamera);
          renderer.setRenderTarget(null);
          renderer.render(distortionScene, distortionCamera);
        } else {
          renderer.render(scene, activeCamera);
        }

        gl.endFrameEXP();
      };

      render();
    },
    // Only recreate GL context on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const panResponder = useRef<PanResponderInstance>(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { touches } = evt.nativeEvent;
        if (touches.length === 1) {
          lastTouchInfoRef.current = {
            type: 'rotate',
            lastX: touches[0].pageX,
            lastY: touches[0].pageY,
          };
        } else if (touches.length === 2) {
          const [t1, t2] = touches;
          const dx = t2.pageX - t1.pageX;
          const dy = t2.pageY - t1.pageY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          lastTouchInfoRef.current = {
            type: 'pinch',
            initialDistance: distance,
            initialZoom: zoomRef.current,
          };
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const { touches } = evt.nativeEvent;

        if (touches.length === 1 && lastTouchInfoRef.current.type === 'rotate') {
          const dx = gestureState.dx;
          const dy = gestureState.dy;

          rotationRef.current = {
            x: rotationRef.current.x + dy * 0.005,
            y: rotationRef.current.y + dx * 0.005,
          };
        } else if (touches.length === 2) {
          const [t1, t2] = touches;
          const dx = t2.pageX - t1.pageX;
          const dy = t2.pageY - t1.pageY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (
            lastTouchInfoRef.current.type === 'pinch' &&
            lastTouchInfoRef.current.initialDistance
          ) {
            const scale = distance / lastTouchInfoRef.current.initialDistance;
            const baseZoom = lastTouchInfoRef.current.initialZoom ?? 1;
            zoomRef.current = Math.min(3, Math.max(0.5, baseZoom * scale));
          } else {
            lastTouchInfoRef.current.type = 'pan';
          }

          if (lastTouchInfoRef.current.type === 'pan') {
            panRef.current = {
              x: (gestureState.dx / (layoutRef.current.width || 1)) * 3,
              y: (-gestureState.dy / (layoutRef.current.height || 1)) * 3,
            };
          }
        }
      },
      onPanResponderRelease: () => {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          rotationRef.current = { x: 0, y: 0 };
          panRef.current = { x: 0, y: 0 };
          zoomRef.current = 1;
        }
        lastTapRef.current = now;
        lastTouchInfoRef.current = { type: 'none' };
      },
    }),
  ).current;

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} />
      <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} />
      {/* Fade overlay for transition opacity */}
      {sceneOpacity < 1 && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: `rgba(0,0,0,${1 - sceneOpacity})` },
          ]}
          pointerEvents="none"
        />
      )}
      {/* 2D Grid overlay drawn on top of 3D scene */}
      {gridOverlay !== 'off' && <GridOverlay2D divisions={gridOverlay} />}
    </View>
  );
}

/**
 * Renders a 2D grid overlay on top of the 3D viewport.
 */
function GridOverlay2D({ divisions }: { divisions: GridOverlayDivisions }) {
  const count = divisions === '4' ? 2 : divisions === '9' ? 3 : divisions === '16' ? 4 : 0;
  if (count === 0) return null;

  const lines: React.ReactElement[] = [];
  for (let i = 1; i < count; i++) {
    const pct = `${(i / count) * 100}%`;
    // Horizontal line
    lines.push(
      <View
        key={`h-${i}`}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: pct,
          height: 1,
          backgroundColor: 'rgba(255,255,255,0.35)',
        }}
      />,
    );
    // Vertical line
    lines.push(
      <View
        key={`v-${i}`}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: pct,
          width: 1,
          backgroundColor: 'rgba(255,255,255,0.35)',
        }}
      />,
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {lines}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c2c2c',
  },
});
