"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store';
import axios from '@/lib/api/axios';
import { fetchAssetById, fetchAssetVersions, updateAsset } from '@/lib/store/slices/assetsSlice';
import {
  Box,
  Container,
  Grid,
  Heading,
  Text,
  HStack,
  VStack,
  Badge,
  IconButton
} from '@chakra-ui/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import AssetPreview from '@/components/assets/AssetPreview';
import AssetMetadata from '@/components/assets/AssetMetadata';
import AssetVersionHistory from '@/components/assets/AssetVersionHistory';
import AssetActions from '@/components/assets/AssetActions';
import { format } from 'date-fns';

// Type definitions for the asset data structure
interface Tag {
  id: number;
  name: string;
}

interface User {
  id: number;
  username?: string;
  email?: string;
}

interface TechnicalMetadata {
  resolution?: string;
  width?: number;
  height?: number;
  [key: string]: string | number | undefined;
}

interface Asset {
  id: number;
  title: string;
  description?: string;
  file_type: string;
  file_extension: string;
  file_size: number;
  version: number;
  created_at: string;
  updated_at?: string;
  uploaded_by?: User;
  tags?: Tag[];
  technical_metadata?: TechnicalMetadata;
  metadata?: any[]; // Custom metadata fields
}

// Custom copy icon component for copying asset ID
const CopyIconComponent = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
  </svg>
);

/**
 * Asset Detail Page Component
 * Displays detailed information about a specific asset including metadata, tags, and version history
 */
export default function AssetDetailPage() {
  // Get asset ID from URL parameters
  const params = useParams();
  const dispatch = useDispatch<AppDispatch>();

  // Get asset data and loading state from Redux store
  const { selectedAsset: asset, versions, loading } = useSelector((state: RootState) => state.assets);

  // State to manage edit mode
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Fetch asset data and version history when component mounts or asset ID changes
  useEffect(() => {
    const id = Number(params.id);
    if (id) {
      dispatch(fetchAssetById(id));
      dispatch(fetchAssetVersions(id));
    }
  }, [params.id, dispatch]);

  /**
   * Handle saving asset metadata updates
   * @param data - Updated asset data including title, description, tags, and custom metadata
   * @returns Promise<boolean> - Success status of the save operation
   */
  const handleSave = async (data: any) => {
    console.log('📝 page.tsx: Received update data:', data);

    if (!asset) {
      console.error('❌ Asset is null, cannot save');
      return false;
    }

    try {
      // Prepare FormData for the update request
      const formData = new FormData();

      // Add basic fields
      formData.append('title', data.title || asset.title);
      formData.append('description', data.description || '');

      // Process tags - add each tag name to form data
      if (data.tag_names && Array.isArray(data.tag_names)) {
        data.tag_names.forEach((tagName: string) => {
          formData.append('tag_names', tagName);
        });
      }

      // Process custom metadata JSON
      if (data.metadata_json) {
        formData.append('metadata_json', data.metadata_json);
        console.log('📤 page.tsx sending metadata_json:', data.metadata_json);
      }

      console.log('📤 page.tsx: Sending FormData to backend');
      console.log('🏷️ Tags:', data.tag_names);
      console.log('📝 Title:', data.title);
      console.log('📄 Description:', data.description);
      console.log('🔧 Custom fields:', data.metadata_json);

      // Send PATCH request to update asset
      const response = await axios.patch(`/assets/${asset.id}/update_asset/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ page.tsx: Update successful:', response.data);

      // Refresh asset data after successful update
      dispatch(fetchAssetById(asset.id));

      return true;
    } catch (error) {
      console.error('❌ page.tsx: Update failed:', error);
      return false;
    }
  };

  /**
   * Copy asset ID to clipboard
   */
  const handleCopyAssetId = (): void => {
    if (asset) {
      navigator.clipboard.writeText(asset.id.toString());
      console.log('Asset ID copied to clipboard:', asset.id);
    }
  };

  /**
   * Handle asset data updates from child components
   * @param updatedAsset - The updated asset object
   */
  const handleUpdateAsset = (updatedAsset: Asset) => {
    // Handle post-update logic here
    console.log('🔄 Asset updated:', updatedAsset);
  };

  /**
   * Handle image updates from child components
   * @param newImageUrl - URL of the new/updated image
   */
  const handleImageUpdate = (newImageUrl: string) => {
    console.log('🖼️ Image updated:', newImageUrl);
    // Handle post-image-update logic here, such as refreshing preview
  };

  // Show loading state while fetching data
  if (loading || !asset) {
    return (
      <DashboardLayout>
        <Container maxW="container.xl" py={8}>
          <Text>Loading...</Text>
        </Container>
      </DashboardLayout>
    );
  }

  // Edit Mode - Show only asset preview and editing form
  if (isEditing) {
    return (
      <DashboardLayout>
        <Container maxW="container.xl" py={8}>
          <HStack justify="space-between" mb={6}>
            <Heading size="3xl">Edit Asset</Heading>
          </HStack>

          <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={8}>
            {/* Asset Preview Section */}
            <Box bg="white" p={6} borderRadius="lg" shadow="sm">
              <AssetPreview asset={asset} />
            </Box>

            {/* Asset Metadata Editing Section */}
            <Box bg="white" p={6} borderRadius="lg" shadow="sm">
              <AssetMetadata
                asset={asset}
                isEditing={isEditing}
                onEditToggle={setIsEditing}
                onSave={handleSave}
                onUpdateAsset={handleUpdateAsset}
                onImageUpdate={handleImageUpdate}
              />
            </Box>
          </Grid>
        </Container>
      </DashboardLayout>
    );
  }

  // View Mode - Show full asset details
  return (
    <DashboardLayout>
      <Container maxW="container.xl" py={3}>
        {/* Page Header with Asset Title and Actions */}
        <HStack justify="space-between" mb={3}>
          <Heading size="4xl">{asset.title}</Heading>
          <AssetActions asset={asset} onEditClick={() => setIsEditing(true)} />
        </HStack>

        {/* Main Content Grid */}
        <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={8}>
          {/* Left Column: Preview, Description, Version History */}
          <VStack gap={1} align="stretch">
            {/* Asset Preview */}
            <Box bg="white" p={6} borderRadius="lg" shadow="sm">
              <AssetPreview asset={asset} />
            </Box>

            {/* Asset Description (if available) */}
            {asset.description && (
              <Box bg="white" p={6} borderRadius="lg" shadow="sm">
                <Heading size="md" mb={4}>Description</Heading>
                <Text>{asset.description}</Text>
              </Box>
            )}

            {/* Version History */}
            <Box bg="white" p={6} borderRadius="lg" shadow="sm">
              <Heading size="md" mb={4}>Version History</Heading>
              {asset && (
                <AssetVersionHistory versions={versions} assetId={asset.id} />
              )}
            </Box>
          </VStack>

          {/* Right Column: Details, Tags, Custom Fields */}
          <VStack gap={6} align="stretch">
            {/* Asset Details Section */}
            <Box bg="white" p={6} borderRadius="lg" shadow="sm">
              <Heading size="md" mb={4}>Details</Heading>
              <VStack gap={3} align="stretch">
                {/* Asset ID with Copy Functionality */}
                <HStack justify="space-between">
                  <Text color="gray.600">Asset ID:</Text>
                  <HStack>
                    <Text fontFamily="mono" fontSize="sm">{asset.id}</Text>
                    <IconButton
                      aria-label="Copy Asset ID"
                      size="xs"
                      onClick={handleCopyAssetId}
                      color="gray.600"
                      variant="ghost"
                    >
                      <CopyIconComponent />
                    </IconButton>
                  </HStack>
                </HStack>

                {/* File Type */}
                <HStack justify="space-between">
                  <Text color="gray.600">File Type:</Text>
                  <Badge>{asset.file_extension}</Badge>
                </HStack>

                {/* File Size */}
                <HStack justify="space-between">
                  <Text color="gray.600">File Size:</Text>
                  <Text>{(asset.file_size / 1024 / 1024).toFixed(2)} MB</Text>
                </HStack>

                {/* Version Number */}
                <HStack justify="space-between">
                  <Text color="gray.600">Version:</Text>
                  <Text>v{asset.version}</Text>
                </HStack>

                {/* Uploaded By User */}
                <HStack justify="space-between">
                  <Text color="gray.600">Uploaded By:</Text>
                  <Text fontSize="sm">
                    {asset.uploaded_by?.username || asset.uploaded_by?.email || 'N/A'}
                  </Text>
                </HStack>

                {/* Upload Date */}
                <HStack justify="space-between">
                  <Text color="gray.600">Upload Date:</Text>
                  <Text fontSize="sm">
                    {asset.created_at ? format(new Date(asset.created_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
                  </Text>
                </HStack>

                {/* Last Updated Date */}
                <HStack justify="space-between">
                  <Text color="gray.600">Last Updated:</Text>
                  <Text fontSize="sm">
                    {asset.updated_at ? format(new Date(asset.updated_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
                  </Text>
                </HStack>
              </VStack>
            </Box>

            {/* Tags Section */}
            <Box bg="white" p={6} borderRadius="lg" shadow="sm">
              <Heading size="md" mb={4}>Tags</Heading>
              <HStack flexWrap="wrap" gap={2}>
                {asset.tags && asset.tags.length > 0 ? (
                  asset.tags.map((tag: Tag) => (
                    <Box
                      key={tag.id}
                      bg="gray.100"
                      color="black"
                      px={3}
                      py={1}
                      borderRadius="full"
                      fontSize="sm"
                      fontWeight="semibold"
                      _hover={{ bg: "gray.200" }}
                      cursor="default"
                      transition="all 0.2s"
                    >
                      {tag.name.toUpperCase()}
                    </Box>
                  ))
                ) : (
                  <Text color="gray.500" fontSize="sm">
                    No tags
                  </Text>
                )}
              </HStack>
            </Box>

            {/* Custom Fields Section */}
            <Box bg="white" p={6} borderRadius="lg" shadow="sm">
              <Heading size="md" mb={4}>More Info</Heading>
              {asset.metadata && Array.isArray(asset.metadata) && asset.metadata.length > 0 ? (
                <VStack gap={3} align="stretch">
                  {asset.metadata.map((field: any, index: number) => (
                    <HStack key={field.id || `field-${index}`} justify="space-between">
                      <Text fontSize="sm" color="gray.600" minW="120px">
                        {field.key ?
                          field.key.replace(/_/g, ' ')
                            .replace(/\b\w/g, (l: string) => l.toUpperCase())
                          : `Field ${index + 1}`}:
                      </Text>
                      <Text
                        fontSize="sm"
                        maxW="200px"
                        textAlign="right"
                        wordBreak="break-all"
                        fontWeight="medium"
                      >
                        {field.value !== undefined && field.value !== null ? String(field.value) : 'N/A'}
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              ) : (
                <Text color="gray.500" fontSize="sm">
                  No additional information
                </Text>
              )}
            </Box>
          </VStack>
        </Grid>
      </Container>
    </DashboardLayout>
  );
}