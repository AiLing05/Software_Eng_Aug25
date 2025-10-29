"use client";

import { AssetVersion } from '@/lib/types';
import { Box, VStack, HStack, Text, Badge, Link } from '@chakra-ui/react';
import { format } from 'date-fns';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/lib/store';
import { restoreAssetVersion, fetchAssetVersions, fetchAssetById } from '@/lib/store/slices/assetsSlice';

interface AssetVersionHistoryProps {
  versions: AssetVersion[];
  assetId: number;
}

export default function AssetVersionHistory({ versions, assetId }: AssetVersionHistoryProps) {
  const dispatch = useDispatch<AppDispatch>();

  // Function to restore asset to a specific version
  const handleRestore = async (versionId: number) => {
    if (!confirm('Are you sure you want to restore this version?')) return;

    try {
      // Call Redux action to restore version
      await dispatch(restoreAssetVersion({ assetId, versionId }));

      // Re-fetch asset and versions to refresh UI
      await dispatch(fetchAssetById(assetId));
      await dispatch(fetchAssetVersions(assetId));

      alert('Successfully restored to this version');
    } catch (error) {
      console.error('Failed to restore version:', error);
    }
  };

  if (!versions || versions.length === 0) {
    return (
      <Text fontSize="sm" color="gray.500">No version history available</Text>
    );
  }

  return (
    <VStack align="stretch">
      {[...versions] 
        .sort((a, b) => b.version - a.version)
        .map((version) => (
          <Box
            key={version.id}
            p={4}
            bg="gray.50"
            borderRadius="md"
            borderLeft="3px solid"
            borderColor="blue.400"
          >
            <HStack justify="space-between" mb={2}>
              <HStack>
                <Badge colorScheme="blue">v{version.version-1}</Badge>
                <Text fontSize="sm" fontWeight="medium">
                  {version.created_by.username}
                </Text>
              </HStack>
              <Text fontSize="xs" color="gray.500">
                {format(new Date(version.created_at), 'MMM dd, yyyy HH:mm')}
              </Text>
            </HStack>

            <Text fontSize="sm" whiteSpace="pre-wrap" mb={2}>
              {version.changes || 'No changes noted'}
            </Text>

            <Link
              fontSize="sm"
              color="blue.500"
              cursor="pointer"
              onClick={() => handleRestore(version.id)}
            >
              Click to restore this version
            </Link>
          </Box>
        ))}
    </VStack>
  );
}