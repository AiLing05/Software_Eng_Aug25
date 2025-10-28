"use client";

import { useEffect, useRef } from 'react';
import { Box } from '@chakra-ui/react';
import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

interface ModelViewer3DProps {
  url: string;
}

export default function ModelViewer3D({ url }: ModelViewer3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BABYLON.Engine | null>(null);
  const sceneRef = useRef<BABYLON.Scene | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Create engine
    const engine = new BABYLON.Engine(canvasRef.current, true);
    engineRef.current = engine;

    // Create scene
    const scene = new BABYLON.Scene(engine);
    sceneRef.current = scene;

    // Camera
    const camera = new BABYLON.ArcRotateCamera(
      'camera',
      Math.PI / 2,
      Math.PI / 2,
      5,
      BABYLON.Vector3.Zero(),
      scene
    );
    camera.attachControl(canvasRef.current, true);
    camera.wheelPrecision = 50;
    camera.minZ = 0.1;

    // Lighting
    const light1 = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(1, 1, 0), scene);
    light1.intensity = 0.7;

    const light2 = new BABYLON.DirectionalLight('light2', new BABYLON.Vector3(-1, -2, -1), scene);
    light2.intensity = 0.5;

    // Environment
    scene.createDefaultEnvironment({
      createSkybox: false,
      createGround: false,
    });

    // Load model
    BABYLON.SceneLoader.Append(url, '', scene, (loadedScene) => {
      // Auto-frame the model
      const meshes = loadedScene.meshes;
      if (meshes.length > 0) {
        camera.setTarget(meshes[0]);
        camera.radius = meshes[0].getBoundingInfo().boundingSphere.radiusWorld * 3;
      }
    });

    // Render loop
    engine.runRenderLoop(() => {
      scene.render();
    });

    // Handle resize
    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      engine.dispose();
    };
  }, [url]);

  return (
    <Box h="600px" w="full">
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', outline: 'none' }}
      />
    </Box>
  );
}