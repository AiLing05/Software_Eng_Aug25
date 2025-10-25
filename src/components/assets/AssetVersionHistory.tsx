"use client";

import { AssetVersion } from '@/lib/types';
import { Box, VStack, HStack, Text, Badge } from '@chakra-ui/react';
import { format } from 'date-fns';

interface AssetVersionHistoryProps {
  versions: AssetVersion[];
}

export default function AssetVersionHistory({ versions }: AssetVersionHistoryProps) {
  if (versions.length === 0) {
    return (
      <Text fontSize="sm" color="gray.500">No version history available</Text>
    );
  }

  return (
    <VStack gap={4} align="stretch">
      {versions.map((version) => (
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
              <Badge colorScheme="blue">v{version.version}</Badge>
              <Text fontSize="sm" fontWeight="medium">
                {version.created_by.username}
              </Text>
            </HStack>
            <Text fontSize="xs" color="gray.500">
              {format(new Date(version.created_at), 'MMM dd, yyyy HH:mm')}
            </Text>
          </HStack>
          <Text fontSize="sm">{version.changes || 'No changes noted'}</Text>
        </Box>
      ))}
    </VStack>
  );
}