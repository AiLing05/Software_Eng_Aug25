"use client";

import { Asset } from '@/lib/types';
import { Box, Image } from '@chakra-ui/react';
import VideoPreview from './VideoPreview';
import ModelViewer3D from './ModelViewer3D';

interface AssetPreviewProps {
  asset: Asset;
}

export default function AssetPreview({ asset }: AssetPreviewProps) {
  const renderPreview = () => {
    const extension = asset.file_extension.toLowerCase();

    // Image preview
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
      return (
        <Image
          src={asset.file_url}
          alt={asset.title}
          maxH="600px"
          objectFit="contain"
          mx="auto"
        />
      );
    }

    // Video preview
    if (['mp4', 'mov', 'avi', 'webm'].includes(extension)) {
      return <VideoPreview url={asset.file_url} />;
    }

    // 3D Model preview
    if (['glb', 'gltf'].includes(extension)) {
      return <ModelViewer3D url={asset.file_url} />;
    }

    // PDF preview
    if (extension === 'pdf') {
      return (
        <Box h="600px">
          <iframe
            src={asset.file_url}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title={asset.title}
          />
        </Box>
      );
    }

    // Default fallback
    return (
      <Box textAlign="center" py={12}>
        <Text fontSize="4xl" mb={4}>📄</Text>
        <Text color="gray.600">Preview not available for this file type</Text>
      </Box>
    );
  };

  return (
    <Box>
      {renderPreview()}
    </Box>
  );
}