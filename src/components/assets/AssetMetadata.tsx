"use client";

import { useState } from 'react';
import { Asset } from '@/lib/types';
import { Box, Button, Input, VStack, HStack, Text } from '@chakra-ui/react';
import { useAuth } from '@/lib/hooks/useAuth';

interface AssetMetadataProps {
  asset: Asset;
}

export default function AssetMetadata({ asset }: AssetMetadataProps) {
  const { canEdit } = useAuth();
  const [metadata, setMetadata] = useState(asset.metadata);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    // TODO: Dispatch update action
    setIsEditing(false);
  };

  return (
    <VStack gap={3} align="stretch">
      {metadata.map((field) => (
        <Box key={field.id}>
          <HStack justify="space-between" mb={1}>
            <Text fontSize="sm" color="gray.600">{field.key}:</Text>
          </HStack>
          {isEditing ? (
            <Input size="sm" defaultValue={field.value} />
          ) : (
            <Text>{field.value}</Text>
          )}
        </Box>
      ))}

      {metadata.length === 0 && (
        <Text fontSize="sm" color="gray.500">No metadata available</Text>
      )}

      {canEdit() && (
        <HStack pt={2}>
          {isEditing ? (
            <>
              <Button size="sm" colorScheme="blue" onClick={handleSave}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setIsEditing(true)}>
              Edit Metadata
            </Button>
          )}
        </HStack>
      )}
    </VStack>
  );
}