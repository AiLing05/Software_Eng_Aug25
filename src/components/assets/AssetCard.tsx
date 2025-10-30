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
      onClick={() => router.push(`/dashboard/assets/${asset.id}`)}
    >
      <Box position="relative" h="200px" bg="gray.100">
        {asset.thumbnail_url ? (
          <Image
            src={`${asset.thumbnail_url}?v=${asset.updated_at}`}
            alt={asset.title}
            objectFit="cover"
            w="full"
            h="full"
          />
        ) : (
          <Box display="flex" alignItems="center" justifyContent="center" h="full" fontSize="4xl">
            {asset.file_type === 'image' && '🖼️'}
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
        <Box display="flex" flexWrap="wrap" gap="4px" alignItems="center">
          {asset.tags && asset.tags.length > 0 ? (
            <>
              {asset.tags.slice(0, 3).map((tag) => (
                <Box
                  key={tag.id}
                  bg="gray.100"
                  color="gray.800"
                  px={3}
                  py={1}
                  borderRadius="full"
                  fontSize="xs"
                  fontWeight="semibold"
                  cursor="default"
                  transition="all 0.2s"
                >
                  {tag.name.toUpperCase()}
                </Box>
              ))}
              {asset.tags.length > 3 && (
                <Text fontSize="xs" color="gray.500">
                  +{asset.tags.length - 3}
                </Text>
              )}
            </>
          ) : (
            <Text fontSize="sm" color="gray.500">
              No tags
            </Text>
          )}
        </Box>
        <HStack justify="space-between" pt={2}>
          <Text fontSize="xs" color="gray.500">
            {format(new Date(asset.created_at), 'MMM dd, yyyy')}
          </Text>
          <Text fontSize="xs" color="gray.500">
            V{asset.version}
          </Text>
        </HStack>
      </VStack>
    </Box>
  );
}