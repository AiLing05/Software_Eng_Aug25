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

  const getBadgeColor = () => {
    switch (asset.file_type) {
      case 'image': return 'green';
      case 'video': return 'red';
      case '3d_model': return 'purple';
      case 'document': return 'blue';
      default: return 'gray';
    }
  };

  return (
    <Box
      bg="white"
      borderRadius="lg"
      overflow="hidden"
      shadow="sm"
      transition="all 0.2s"
      _hover={{ shadow: 'md', transform: 'translateY(-4px)' }}
      cursor="pointer"
      onClick={() => router.push(/dashboard/assets/${asset.id})}
    >
      <Box position="relative" h="200px" bg="gray.100">
        {asset.thumbnail_url ? (
          <Image
            src={asset.thumbnail_url}
            alt={asset.title}
            objectFit="cover"
            w="full"
            h="full"
          />
        ) : (
          <Box display="flex" alignItems="center" justifyContent="center" h="full" fontSize="4xl">
            {asset.file_type === 'image' && '🖼'}
            {asset.file_type === 'video' && '🎥'}
            {asset.file_type === '3d_model' && '🎨'}
            {asset.file_type === 'document' && '📄'}
            {!asset.file_type && '📦'}
          </Box>
        )}
        <Badge
          position="absolute"
          top={2}
          right={2}
          colorScheme={getBadgeColor()}
        >
          {asset.file_extension.toLowerCase().replace('.', '')}
        </Badge>
      </Box>

      <VStack p={4} align="stretch" gap={2}>
        <Text fontWeight="semibold" lineClamp={1}>{asset.title}</Text>
        <Text fontSize="sm" color="gray.600" lineClamp={2}>
          {asset.description || 'No description'}
        </Text>
        <HStack justify="space-between" pt={2}>
          <Text fontSize="xs" color="gray.500">
            {format(new Date(asset.created_at), 'MMM dd, yyyy')}
          </Text>
          <Text fontSize="xs" color="gray.500">
            v{asset.version}
          </Text>
        </HStack>
      </VStack>
    </Box>
  );
}