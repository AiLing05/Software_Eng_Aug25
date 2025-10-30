"use client";

import { useEffect, useRef, useState } from 'react';
import { Box, Text, Spinner } from '@chakra-ui/react';
import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import '@babylonjs/loaders/OBJ';

interface ModelViewer3DProps {
  url: string;
  fileExtension: string;
}

export default function ModelViewer3D({ url, fileExtension }: ModelViewer3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    setLoading(true);
    setError(null);

    // Create engine and scene
    const engine = new BABYLON.Engine(canvasRef.current, true);
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.2, 0.2, 0.25, 1); // Dark blue-gray background

    // Camera - positioned for front view with full rotation
    const camera = new BABYLON.ArcRotateCamera(
      'camera',
      -Math.PI / 2, // Front view angle
      Math.PI / 3,  // Slight top-down view
      8,            // Distance from center
      BABYLON.Vector3.Zero(),
      scene
    );
    camera.attachControl(canvasRef.current, true);
    camera.wheelPrecision = 50;
    camera.minZ = 0.1;
    camera.lowerBetaLimit = 0.1;     // Limit vertical rotation (prevent going under)
    camera.upperBetaLimit = Math.PI; // Allow full vertical rotation
    camera.lowerAlphaLimit = -Infinity; // Allow full horizontal rotation
    camera.upperAlphaLimit = Infinity;  // Allow full horizontal rotation
    camera.panningSensibility = 100; // Enable panning for better control

    // Lighting - optimized for 360 viewing
    const light1 = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0, 1, 0), scene);
    light1.intensity = 0.7;

    const light2 = new BABYLON.DirectionalLight('light2', new BABYLON.Vector3(-1, -1, -0.5), scene);
    light2.intensity = 0.6;
    light2.position = new BABYLON.Vector3(5, 10, 5);

    const light3 = new BABYLON.DirectionalLight('light3', new BABYLON.Vector3(1, -1, 0.5), scene);
    light3.intensity = 0.4;
    light3.position = new BABYLON.Vector3(-5, 10, -5);

    // Load model based on file extension
    const loadModel = () => {
      const ext = fileExtension.toLowerCase();

      // Check supported formats
      const supportedFormats = ['.glb', '.gltf', '.obj'];
      if (!supportedFormats.includes(ext)) {
        setLoading(false);
        setError(`3D preview is not supported for ${ext.toUpperCase()} files. Please use .GLB, .GLTF, or .OBJ format for best compatibility.`);
        return;
      }

      try {
        BABYLON.SceneLoader.Append(url, '', scene,
          () => {
            setLoading(false);
            const meshes = scene.meshes;
            if (meshes.length > 0) {
              // Find the main mesh (skip cameras, lights, etc.)
              const mainMeshes = meshes.filter(mesh => mesh.getTotalVertices() > 0);
              if (mainMeshes.length > 0) {
                const mainMesh = mainMeshes[0];

                // Center the model
                const boundingInfo = mainMesh.getBoundingInfo();
                const center = boundingInfo.boundingBox.centerWorld;
                const size = boundingInfo.boundingBox.extendSizeWorld;

                // Adjust camera to fit the model
                const maxDimension = Math.max(size.x, size.y, size.z);
                camera.radius = maxDimension * 2.5;
                camera.setTarget(center);

                // Enable shadows for better depth perception
                mainMesh.receiveShadows = true;
              }
            }
          },
          null,
          (scene, message) => {
            setLoading(false);
            setError(`Failed to load 3D model: ${message}`);
          }
        );
      } catch (err) {
        setLoading(false);
        setError(`Error loading 3D model: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    loadModel();

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
      scene.dispose();
      engine.dispose();
    };
  }, [url, fileExtension]);

  if (error) {
    return (
      <Box h="600px" w="full" display="flex" alignItems="center" justifyContent="center" flexDirection="column" bg="#33343f"> {/* Dark blue-gray background */}
        <Text fontSize="4xl" mb={4} color="white">🎨</Text>
        <Text color="white" mb={4} fontSize="lg" fontWeight="medium">3D Preview Unavailable</Text>
        <Text color="gray.300" fontSize="sm" textAlign="center" maxW="400px">
          {error}
        </Text>
        <Text color="gray.300" textAlign="center" maxW="400px" fontSize="sm" mt={2}>
          Click the download button at the top right corner to download.
        </Text>
      </Box>
    );
  }

  return (
    <Box h="600px" w="full" position="relative" bg="#33343f"> {/* Dark blue-gray background */}
      {loading && (
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="rgba(0,0,0,0.3)"
          zIndex="10"
        >
          <Spinner size="xl" color="blue.300" />
          <Text ml={3} color="white">Loading 3D Model...</Text>
        </Box>
      )}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          outline: 'none',
          display: 'block',
          cursor: 'grab'
        }}
        onMouseDown={() => {
          if (canvasRef.current) {
            canvasRef.current.style.cursor = 'grabbing';
          }
        }}
        onMouseUp={() => {
          if (canvasRef.current) {
            canvasRef.current.style.cursor = 'grab';
          }
        }}
      />
      {!loading && (
        <Text
          position="absolute"
          bottom="16px"
          left="16px"
          color="white"
          fontSize="sm"
          bg="rgba(0,0,0,0.6)"
          px="8px"
          py="4px"
          borderRadius="4px"
        >
          Drag to rotate • Scroll to zoom
        </Text>
      )}
    </Box>
  );
}