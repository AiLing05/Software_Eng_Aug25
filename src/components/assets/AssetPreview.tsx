"use client";

import { Asset } from '@/lib/types';
import { Box, Image, Text } from '@chakra-ui/react';
import VideoPreview from './VideoPreview';
import ModelViewer3D from './ModelViewer3D';

interface AssetPreviewProps {
  asset: Asset;
}

export default function AssetPreview({ asset }: AssetPreviewProps) {
  const renderPreview = () => {
    const extension = asset.file_extension.toLowerCase().replace('.', '');

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
    if (['glb', 'gltf', 'obj', 'fbx'].includes(extension)) {
      return <ModelViewer3D url={asset.file_url} />;
    }

    // Document preview
    if (['pdf', 'doc', 'docx', 'txt'].includes(extension)) {
      if (extension === 'pdf') {
        // PDF: show inline preview
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

      // Word or text: not directly viewable, show download prompt
      return (
        <Box textAlign="center" py={12}>
          <Text fontSize="4xl" mb={4}>📄</Text>
          <Text color="gray.600" mb={2}>
            {extension === 'txt'
              ? 'Plain text files can be downloaded and opened directly.'
              : 'Preview not supported. You can download this document to view it.'}
          </Text>
          <a
            href={asset.file_url}
            download
            style={{
              color: '#3182CE',
              fontWeight: 'bold',
              textDecoration: 'underline',
            }}
          >
            Download file
          </a>
        </Box>
      );
    }

    // Default fallback
    return (
      <Box textAlign="center" py={12}>
        <Text fontSize="4xl" mb={4}>📦</Text>
        <Text color="gray.600">Preview not available for this file type</Text>
      </Box>
    );
  };

  return <Box>{renderPreview()}</Box>;
}