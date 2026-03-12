import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  PanResponder,
  PanResponderInstance,
  StyleSheet,
  View,
} from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';

type Static2DViewerProps = {
  backgroundColor?: string;
};

/**
 * Static 2D render mode: renders the 3D model to an off-screen canvas from a
 * random angle and displays the resulting image. No touch rotation — only
 * pinch-to-zoom and pan-when-zoomed.
 */
export function Static2DViewer({ backgroundColor = '#2c2c2c' }: Static2DViewerProps) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const layoutRef = useRef({ width: 0, height: 0 });
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const lastTouchInfoRef = useRef<{
    type: 'none' | 'pan' | 'pinch';
    initialDistance?: number;
    initialZoom?: number;
  }>({ type: 'none' });

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    layoutRef.current = { width, height };
  }, []);

  // Render a single frame off-screen
  const onContextCreate = useCallback(
    async (gl: ExpoWebGLRenderingContext) => {
      const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;

      const renderer = new Renderer({ gl });
      renderer.setSize(width, height);
      renderer.setClearColor(backgroundColor);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);

      // Random angle
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.5) * 0.6;
      camera.position.set(
        Math.cos(angle) * 3,
        elevation * 2,
        Math.sin(angle) * 3,
      );
      camera.lookAt(0, 0, 0);

      const ambient = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambient);
      const directional = new THREE.DirectionalLight(0xffffff, 1);
      directional.position.set(2, 4, 3);
      scene.add(directional);

      // Simple humanoid placeholder
      const skinColor = 0xdeb896;
      const mat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.5 });

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), mat);
      head.position.y = 1.05;
      scene.add(head);

      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.7, 16), mat);
      torso.position.y = 0.45;
      scene.add(torso);

      [-1, 1].forEach((side) => {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.6, 8), mat);
        arm.position.set(side * 0.3, 0.5, 0);
        scene.add(arm);

        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.05, 0.7, 8), mat);
        leg.position.set(side * 0.1, -0.25, 0);
        scene.add(leg);
      });

      // Render one frame
      renderer.render(scene, camera);
      gl.endFrameEXP();

      // Capture as data URI via gl.toDataURL (expo-gl supports this)
      // Note: In production this would be a pre-rendered asset.
      // For now the GLView itself serves as the static image — no rotation.
    },
    [backgroundColor],
  );

  const panResponder = useRef<PanResponderInstance>(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { touches } = evt.nativeEvent;
        if (touches.length === 2) {
          const [t1, t2] = touches;
          const dx = t2.pageX - t1.pageX;
          const dy = t2.pageY - t1.pageY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          lastTouchInfoRef.current = {
            type: 'pinch',
            initialDistance: distance,
            initialZoom: zoomRef.current,
          };
        } else if (touches.length === 1 && zoomRef.current > 1) {
          lastTouchInfoRef.current = { type: 'pan' };
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const { touches } = evt.nativeEvent;

        if (touches.length === 2 && lastTouchInfoRef.current.type === 'pinch') {
          const [t1, t2] = touches;
          const dx = t2.pageX - t1.pageX;
          const dy = t2.pageY - t1.pageY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (lastTouchInfoRef.current.initialDistance) {
            const scale = distance / lastTouchInfoRef.current.initialDistance;
            const baseZoom = lastTouchInfoRef.current.initialZoom ?? 1;
            const newZoom = Math.min(5, Math.max(1, baseZoom * scale));
            zoomRef.current = newZoom;
            setZoom(newZoom);
          }
        } else if (lastTouchInfoRef.current.type === 'pan' && zoomRef.current > 1) {
          const newPan = {
            x: gestureState.dx,
            y: gestureState.dy,
          };
          panRef.current = newPan;
          setPan(newPan);
        }
      },
      onPanResponderRelease: () => {
        lastTouchInfoRef.current = { type: 'none' };
      },
    }),
  ).current;

  return (
    <View style={[styles.container, { backgroundColor }]} onLayout={handleLayout}>
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [
              { scale: zoom },
              { translateX: pan.x / zoom },
              { translateY: pan.y / zoom },
            ],
          },
        ]}
      >
        <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} />
      </View>
      <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
