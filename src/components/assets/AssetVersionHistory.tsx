"use client";

import { AssetVersion } from '@/lib/types';
import { Box, VStack, HStack, Text, Badge, Link } from '@chakra-ui/react';
import { format } from 'date-fns';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/lib/store';
import { fetchAssetVersions, fetchAssetById } from '@/lib/store/slices/assetsSlice';

interface AssetVersionHistoryProps {
  versions: AssetVersion[];
  assetId: number;
}

export default function AssetVersionHistory({ versions, assetId }: AssetVersionHistoryProps) {
  console.log('=== VERSIONS DATA ===');
  console.log('All versions:', versions);
  
  // Check each version individually
  versions.forEach((version, index) => {
    console.log(`Version ${version.version}:`, {
      id: version.id,
      version: version.version,
      changes: version.changes,  // ← This should show the detailed changes
      file_url: version.file_url,
      created_at: version.created_at
    });
  });

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

      {/* Render changes with clickable file links */}
      <VStack align="stretch" gap={1} mb={2}>
        {version.changes.split('\n').map((change, index) => {
            if (change.includes('File:') && version.file_url) {
                const parts = change.split(' → ');
                const oldFilePart = parts[0].replace('File: ', '');
                const newFilePart = parts[1] || '';
                
                return (
                    <HStack key={index} align="baseline">
                        <Text fontSize="sm" fontWeight="medium">File:</Text>
                        <Link 
                            href={version.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            color="blue.500"
                            fontSize="sm"
                        >
                            {oldFilePart}
                        </Link>
                        <Text fontSize="sm">→ {newFilePart}</Text>
                    </HStack>
                );
            }
                return (
                    <Text key={index} fontSize="sm" whiteSpace="pre-wrap">
                        {change}
                    </Text>
                  );
              })}
            </VStack>
          </Box>
        ))}
    </VStack>
  );
}