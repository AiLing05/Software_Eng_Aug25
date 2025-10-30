"use client";

import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store';
import { fetchAssets } from '@/lib/store/slices/assetsSlice';
import { fetchTags } from '@/lib/store/slices/tagsSlice';
import { Box, Container, Heading, Button, HStack, Grid, Text } from '@chakra-ui/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import AssetCard from '@/components/assets/AssetCard';
import SearchBar from '@/components/search/SearchBar';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { items: assets, loading, pagination } = useSelector((state: RootState) => state.assets);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const { canAdd } = useAuth();

  const uniqueAssets = useMemo(() => {
    if (!assets || !Array.isArray(assets)) return [];
    
    const seen = new Set();
    return assets.filter(asset => {
      if (seen.has(asset.id)) {
        return false;
      }
      seen.add(asset.id);
      return true;
    });
  }, [assets]);

  //Tag Management
  // Calculate the usage of all tags
  const tagUsageData = useMemo(() => {
    const tagUsageCount: { [key: number]: number } = {};
    
    if (assets && assets.length > 0) {
      assets.forEach(asset => {
        if (asset.tags && Array.isArray(asset.tags)) {
          asset.tags.forEach((tag: any) => {
            tagUsageCount[tag.id] = (tagUsageCount[tag.id] || 0) + 1;
          });
        }
      });
    }
    
    return tagUsageCount;
  }, [assets]); 

  // Debug: log assets when they change
  useEffect(() => {
    console.log('Assets updated:', assets);
    console.log('Loading state:', loading);
    console.log('Sort by:', sortBy);
  }, [assets, loading, sortBy]);

  useEffect(() => {
    dispatch(fetchAssets({ page: 1 }));
    dispatch(fetchTags());
  }, [dispatch]);

  // Handle sort change
  const handleSortChange = (newSort: string) => {
    console.log('Sort changed to:', newSort);
    setSortBy(newSort);
  };

  const handleUploadClick = () => {
    router.push('/upload');
  };

  return (
    <DashboardLayout>
      <Container maxW="container.xl" py={8}>
        <Box mb={8}>
          <HStack justify="space-between" mb={6}>
            <Heading size="2xl">Assets</Heading>
            {canAdd() && (
              <Button colorScheme="blue" onClick={handleUploadClick}>
                Upload Assets
              </Button>
            )}
          </HStack>
          
            {/*filter by date,type and tags*/}
          {/* SearchBar - contains all filter functionality */}
          <HStack gap={4} mb={6}>
            <Box flex={1}>
              <SearchBar 
                sortBy={sortBy}
                onSortChange={handleSortChange}
                tagUsageData={tagUsageData}
              />
            </Box>
          </HStack>
        </Box>

          {/* Change sort from newest first to latest, oldest first to oldest */}
        {/* Shows current sort status */}
        <Box mb={4}>
          <Text fontSize="sm" color="gray.600">
            Showing {uniqueAssets.length} assets • Sorted by: {sortBy === 'newest' ? 'Latest' : 'Oldest'} {loading && '(loading...)'}
          </Text>
        </Box>

        {loading ? (
          <Box textAlign="center" py={8}>
            <Text>Loading assets...</Text>
          </Box>
        ) : (
          <Grid templateColumns="repeat(auto-fill, minmax(280px, 1fr))" gap={6}>
            {uniqueAssets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </Grid>
        )}

        {uniqueAssets.length === 0 && !loading && (
          <Box textAlign="center" py={12}>
            <Heading size="md" color="gray.500">No assets found</Heading>
          </Box>
        )}
      </Container>
    </DashboardLayout>
  );
}
