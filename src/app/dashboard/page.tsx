"use client";

import { useEffect, useState } from 'react';
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
  const [sortBy, setSortBy] = useState('newest');
  const { canAdd } = useAuth();

  useEffect(() => {
    console.log('Assets updated:', assets);
    console.log('Loading state:', loading);
    console.log('Sort by:', sortBy);
  }, [assets, loading, sortBy]);

  useEffect(() => {
    dispatch(fetchAssets({ page: 1 }));
    dispatch(fetchTags());
  }, [dispatch]);

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

          <Box mb={6}>
            <SearchBar 
              sortBy={sortBy}
              onSortChange={handleSortChange}
            />
          </Box>
        </Box>

        {/* Debug info - shows current sort status */}
        <Box mb={4}>
          <Text fontSize="sm" color="gray.600">
            Showing {assets.length} assets • Sorted by: {sortBy === 'newest' ? 'Latest' : 'Oldest'} {loading && '(loading...)'}
          </Text>
        </Box>

        {loading ? (
          <Box textAlign="center" py={8}>
            <Text>Loading assets...</Text>
          </Box>
        ) : (
          <Grid templateColumns="repeat(auto-fill, minmax(280px, 1fr))" gap={6}>
            {assets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </Grid>
        )}

        {assets.length === 0 && !loading && (
          <Box textAlign="center" py={12}>
            <Heading size="md" color="gray.500">No assets found</Heading>
          </Box>
        )}
      </Container>
    </DashboardLayout>
  );
}