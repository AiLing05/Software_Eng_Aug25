"use client";

import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/lib/store';
import { deleteAsset } from '@/lib/store/slices/assetsSlice';
import { Asset } from '@/lib/types';
import { Button, HStack } from '@chakra-ui/react';
import { useAuth } from '@/lib/hooks/useAuth';

interface AssetActionsProps {
  asset: Asset;
  onEditClick?: () => void; // Receive edit click callback
}

export default function AssetActions({ asset, onEditClick }: AssetActionsProps) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { canEdit, canDelete } = useAuth();

  const handleDownload = () => {
    window.open(asset.file_url, '_blank');
  };

  const handleEdit = () => {
    // If there is a callback function, call it, otherwise use the default behavior
    if (onEditClick) {
      onEditClick();
    } else {
      // 
      console.log('Edit clicked for asset:', asset.id);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this asset?')) {
      await dispatch(deleteAsset(asset.id));
      router.push('/dashboard');
    }
  };

  return (
    <HStack gap={2}>
      <Button onClick={handleDownload}>
        Download
      </Button>
      
      {canEdit() && (
        <Button variant="outline" onClick={handleEdit}>
          Edit
        </Button>
      )}
      
      {canDelete() && (
        <Button colorScheme="red" variant="outline" onClick={handleDelete}>
          Delete
        </Button>
      )}
    </HStack>
  );
}