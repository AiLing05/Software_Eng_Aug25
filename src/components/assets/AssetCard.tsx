"use client";

import { useRouter } from 'next/navigation';
import { Asset } from '@/lib/types';
import { Box, Image, Text, HStack, Badge, VStack } from '@chakra-ui/react';
import { format } from 'date-fns';

interface AssetCardProps {
  asset: Asset;
}

export default function AssetCard({ asset }: AssetCardProps) {
  const router = useRouter();

  const getFileIcon = (filename?: string) => {
    if (!filename) return '📄';
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    const videoExts = ['mp4', 'mov', 'avi', 'webm'];
    const modelExts = ['glb', 'gltf', 'obj', 'fbx'];
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];

    if (videoExts.includes(extension)) return '🎥';
    if (modelExts.includes(extension)) return '🧩'; 
    if (imageExts.includes(extension)) return '🖼️';
    return '📄';
  };

  const extension = asset.file ? asset.file.split('.').pop()?.toLowerCase() : 'unknown';
  const versionLabel = asset.version ? `v${asset.version}` : 'v1.0';

  return (
    <Box
      bg="white"
      borderRadius="lg"
      overflow="hidden"
      shadow="sm"
      transition="all 0.2s"
      _hover={{ shadow: 'md', transform: 'translateY(-4px)' }}
      cursor="pointer"
      onClick={() => router.push(`/dashboard/assets/${asset.id}`)}
    >
      <Box position="relative" h="200px" bg="gray.100">
        {asset.file && asset.file_type === 'image' ? (
          <Image
            src={asset.file}
            alt={asset.name}
            objectFit="cover"
            w="full"
            h="full"
          />
        ) : (
          <Box display="flex" alignItems="center" justifyContent="center" h="full" fontSize="4xl">
            {getFileIcon(asset.file)}
          </Box>
        )}
        <Badge position="absolute" top={2} right={2} colorScheme="blue">
          {extension}
        </Badge>
      </Box>

      <VStack p={4} align="stretch" gap={2}>
        <Text fontWeight="semibold" noOfLines={1}>{asset.name}</Text>
        <Text fontSize="sm" color="gray.600" noOfLines={2}>
          {asset.description || 'No description'}
        </Text>
        <HStack justify="space-between" pt={2}>
          <Text fontSize="xs" color="gray.500">
            {asset.uploaded_at
              ? format(new Date(asset.uploaded_at), 'MMM dd, yyyy')
              : 'Unknown date'}
          </Text>
          <Text fontSize="xs" color="gray.500">
            {versionLabel}
          </Text>
        </HStack>
      </VStack>
    </Box>
  );
}
