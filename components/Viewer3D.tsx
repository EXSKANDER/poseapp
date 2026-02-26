import React, { useCallback, useRef } from 'react';
import { LayoutChangeEvent, PanResponder, PanResponderInstance, StyleSheet, View } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';

type Viewer3DProps = {
  directionalIntensity: number;
  ambientIntensity: number;
};

export function Viewer3D({ directionalIntensity, ambientIntensity }: Viewer3DProps) {
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

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    layoutRef.current = { width, height };
  }, []);

  const onContextCreate = useCallback(
    async (gl: ExpoWebGLRenderingContext) => {
      const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;

      const renderer = new Renderer({ gl });
      renderer.setSize(width, height);
      renderer.setClearColor('#2c2c2c');

      const scene = new THREE.Scene();

      const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
      camera.position.set(0, 0, 5);

      const ambientLight = new THREE.AmbientLight(0xffffff, ambientIntensity);
      const directionalLight = new THREE.DirectionalLight(0xffffff, directionalIntensity);
      directionalLight.position.set(2, 4, 3);

      ambientLightRef.current = ambientLight;
      directionalLightRef.current = directionalLight;

      scene.add(ambientLight);
      scene.add(directionalLight);

      const geometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
      const material = new THREE.MeshStandardMaterial({
        color: '#ff8855',
        metalness: 0.2,
        roughness: 0.4,
      });
      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);

      const grid = new THREE.GridHelper(10, 10, 0x555555, 0x333333);
      grid.position.y = -1.5;
      scene.add(grid);

      const clock = new THREE.Clock();

      const render = () => {
        requestAnimationFrame(render);

        const delta = clock.getDelta();
        cube.rotation.y += delta * 0.1;

        cube.rotation.x = rotationRef.current.x;
        cube.rotation.y += rotationRef.current.y * delta * 5;

        camera.position.z = 5 / zoomRef.current;
        camera.position.x = panRef.current.x;
        camera.position.y = panRef.current.y;
        camera.lookAt(0, 0, 0);

        if (ambientLightRef.current) {
          ambientLightRef.current.intensity = ambientIntensity;
        }
        if (directionalLightRef.current) {
          directionalLightRef.current.intensity = directionalIntensity;
        }

        renderer.render(scene, camera);
        gl.endFrameEXP();
      };

      render();
    },
    [ambientIntensity, directionalIntensity],
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
          const touch = touches[0];
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

          if (lastTouchInfoRef.current.type === 'pinch' && lastTouchInfoRef.current.initialDistance) {
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c2c2c',
  },
});

