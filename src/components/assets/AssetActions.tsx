"use client";

import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/lib/store';
import { deleteAsset, updateAsset } from '@/lib/store/slices/assetsSlice';
import { Asset, Tag } from '@/lib/types';
import { Button, HStack, Flex, Input, Text, Textarea } from '@chakra-ui/react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useState } from 'react';
import axios from '@/lib/api/axios';
import { fetchAssetById, fetchAssetVersions, updateAsset as updateAssetThunk } from '@/lib/store/slices/assetsSlice';

interface AssetActionsProps {
  asset: Asset;
}

export default function AssetActions({ asset }: AssetActionsProps) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { canEdit, canDelete } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(asset.title);
  const [description, setDescription] = useState(asset.description || '');
  const [newTag, setNewTag] = useState(asset.tags.map(t => t.name).join(', '));
  const [file, setFile] = useState<File | null>(null);
  const [hasChanged, setHasChanged] = useState(false);

  const onFieldChange = () => setHasChanged(true);

  const handleDownload = async () => {
    try {
      const response = await fetch(asset.file_url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/octet-stream' },
      });
      if (!response.ok) throw new Error('Failed to download file');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = asset.title;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this asset?')) {
      await dispatch(deleteAsset(asset.id));
      router.push('/dashboard');
    }
  };

  const handleSave = async () => {
    if (!hasChanged) {
      setIsOpen(false);
      return;
    }

    try {
      const fileData = new FormData();

      // Update file if exists
      if (file) {
        fileData.append('file', file);
        const mainType = file.type ? file.type.split('/')[0] : 'unknown';
        fileData.append('file_type', mainType);
      }

      // Process tags (unique + lowercase)
      const tagNames = newTag
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter((t, i, arr) => t && arr.indexOf(t) === i);

      // Fetch existing tags from backend
      const existingTagsRes = await axios.get('/tags/');
      const existingTags = Array.isArray(existingTagsRes.data)
        ? existingTagsRes.data
        : existingTagsRes.data.results || [];

      const existingTagObjects = existingTags.filter((t: any) =>
        tagNames.includes(t.name.toLowerCase())
      );

      const existingTagNames = existingTagObjects.map((t: any) => t.name);
      const newTagNames = tagNames.filter(t => !existingTagNames.includes(t));

      const createdTags = await Promise.all(
        newTagNames.map(async name => {
          const res = await axios.post('/tags/', { name });
          return res.data;
        })
      );

      const allTags = [...existingTagObjects, ...createdTags];

      // Append fields for asset patch
      fileData.append('title', title || asset.title);
      fileData.append('description', description || asset.description || '');
      allTags.forEach(tag => {
        fileData.append('tag_names', tag.name);
      });
      fileData.append('version', String(asset.version + 1));

      // Patch asset
      const res = await axios.patch(/api/assets/${asset.id}/update_asset/, fileData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

      const updatedAsset = {
        ...asset,
        title: res.data.title,
        description: res.data.description,
        tags: allTags,
        file_url: res.data.file_url,
        version: res.data.version,
        updated_at: res.data.updated_at,
      };

      // Build changes for version history (one change per line)
      const changes: string[] = [];

      if (file) changes.push('File: updated to a new file');
      if (title && title !== asset.title) changes.push(Title: ${asset.title} → ${title});
      if (description && description !== asset.description) changes.push(
        Description: ${asset.description || '(empty)'} → ${description}
      );

      const oldTags = asset.tags.map(t => t.name).join(', ') || '(none)';
      const newTags = allTags.map(t => t.name).join(', ') || '(none)';
      if (oldTags !== newTags) changes.push(Tags: ${oldTags} → ${newTags});

      const changesText = changes.join('\n') || 'No major changes.';
      
      // Post version history
      console.log("DEBUG", {
        asset: asset.id,
        version: updatedAsset.version,
        file_url: updatedAsset.file_url,
        created_by: updatedAsset.uploaded_by?.id,
        changes: changesText,
      });


      // Update Redux store and force re-fetch to refresh preview & tags
      await dispatch(updateAssetThunk({ id: asset.id, data: updatedAsset }));
      await dispatch(fetchAssetById(asset.id));
      await dispatch(fetchAssetVersions(asset.id));

      setIsOpen(false);
    } catch (error) {
      console.error('Failed to update asset:', error);
    }
  };

  return (
    <>
      <HStack>
        <Button onClick={handleDownload}>Download</Button>

        {canEdit() && (
          <Button variant="outline" onClick={() => setIsOpen(true)}>
            Edit
          </Button>
        )}

        {canDelete() && (
          <Button variant="outline" onClick={handleDelete}>
            Delete
          </Button>
        )}
      </HStack>

      {isOpen && (
        <Flex
          position="fixed"
          top={0}
          left={0}
          w="100vw"
          h="100vh"
          bg="rgba(0,0,0,0.5)"
          align="center"
          justify="center"
          zIndex={9999}
          onClick={() => setIsOpen(false)}
        >
          <Flex
            direction="column"
            bg="white"
            p={5}
            borderRadius="md"
            w="400px"
            onClick={(e) => e.stopPropagation()}
          >
            <Text fontSize="lg" fontWeight="bold" mb={3}>
              Edit Asset
            </Text>

            <Text mb={1}>Replace File (optional)</Text>
            <Input
              type="file"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setFile(e.target.files[0]);
                  setTitle(e.target.files[0].name);
                  onFieldChange();
                }
              }}
              mb={3}
            />

            <Text mb={1}>Title</Text>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                onFieldChange();
              }}
              mb={3}
            />

            <Text mb={1}>Description</Text>
            <Textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                onFieldChange();
              }}
              mb={3}
            />

            <Text mb={1}>Tags (comma separated)</Text>
            <Input
              value={newTag}
              onChange={(e) => {
                setNewTag(e.target.value);
                onFieldChange();
              }}
              mb={4}
            />

            <HStack justify="flex-end">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button colorScheme="blue" onClick={handleSave}>
                Save
              </Button>
            </HStack>
          </Flex>
        </Flex>
      )}
    </>
  );
}