"use client";

import { Asset } from '@/lib/types';
import { Box, Image, Text } from '@chakra-ui/react';
import VideoPreview from './VideoPreview';
import ModelViewer3D from './ModelViewer3D';
import DocumentPreview from './DocumentPreview';

interface AssetPreviewProps {
  asset: Asset;
}

export default function AssetPreview({ asset }: AssetPreviewProps) {
  const renderPreview = () => {
    switch (asset.file_type) {
      case 'image':
        return (
          <Image
            src={asset.file_url}
            alt={asset.title}
            maxH="600px"
            objectFit="contain"
            mx="auto"
          />
        );

      case 'video':
        return <VideoPreview url={asset.file_url} />;

      case '3d_model':
        return <ModelViewer3D url={asset.file_url} fileExtension={asset.file_extension} />;

      case 'document':
        return <DocumentPreview asset={asset} />;

      default:
        return (
          <Box h="600px" w="full" display="flex" alignItems="center" justifyContent="center" flexDirection="column">
            <Text fontSize="4xl" mb={4}>📦</Text>
            <Text color="gray.600" mb={4}>Preview not available for this file type</Text>
            <a
              href={asset.file_url}
              download
              style={{
                color: '#3182CE',
                fontWeight: 'bold',
                textDecoration: 'underline',
              }}
            >
              Download File
            </a>
          </Box>
        );
    }
  };

  return <Box>{renderPreview()}</Box>;
}