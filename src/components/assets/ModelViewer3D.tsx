"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Spinner, Text } from "@chakra-ui/react";
import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders/glTF";

interface ModelViewer3DProps {
  url: string;
}

export default function ModelViewer3D({ url }: ModelViewer3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new BABYLON.Engine(canvasRef.current, true);
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.95, 0.95, 0.95, 1);

    const camera = new BABYLON.ArcRotateCamera(
      "camera",
      -Math.PI / 1,
      Math.PI / 3,
      60,
      BABYLON.Vector3.Zero(),
      scene
    );
    camera.attachControl(canvasRef.current, true);
    camera.wheelPrecision = 1;
    camera.lowerRadiusLimit = 0.1;

    new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

    BABYLON.SceneLoader.Append(
      "",
      url,
      scene,
      () => {
        setIsLoading(false);
      },
      null,
      (scene, message) => {
        setError(`Failed to load model: ${message}`);
        setIsLoading(false);
      },
      ".glb"
    );

    engine.runRenderLoop(() => {
      scene.render();
    });

    const handleResize = () => engine.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      scene.dispose();
      engine.dispose();
    };
  }, [url]);

  return (
    <Box
      position="relative"
      h="600px"
      w="full"
      border="1px solid"
      borderColor="gray.300"
    >
      {error && (
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bg="red.500"
          color="white"
          p="2"
          zIndex="10"
        >
          {error}
        </Box>
      )}

      {isLoading && (
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          display="flex"
          alignItems="center"
          justifyContent="center"
          backgroundColor="gray.50"
          zIndex="5"
        >
          <Spinner size="xl" color="blue.500" />
          <Text ml={3}>Loading 3D model...</Text>
        </Box>
      )}

      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          outline: "none",
          background: "#f8f9fa",
        }}
      />
    </Box>
  );
}