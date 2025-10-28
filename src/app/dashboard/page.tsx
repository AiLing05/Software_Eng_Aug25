"use client";

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store';
import { fetchAssets } from '@/lib/store/slices/assetsSlice';
import { fetchTags } from '@/lib/store/slices/tagsSlice';
import { Box, Container, Heading, Button, HStack, Grid } from '@chakra-ui/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import AssetCard from '@/components/assets/AssetCard';
import SearchBar from '@/components/search/SearchBar';
import FilterPanel from '@/components/search/FilterPanel';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { items: assets, loading } = useSelector((state: RootState) => state.assets);
  const [showFilters, setShowFilters] = useState(false);
  const { canAdd } = useAuth();

  useEffect(() => {
    dispatch(fetchAssets({ page: 1 }));
    dispatch(fetchTags());
  }, [dispatch]);

  const handleUploadClick = () => {
    router.push('/upload'); // Navigate to the upload page
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

          <HStack gap={4} mb={6}>
            <Box flex={1}>
              <SearchBar />
            </Box>
            <Button onClick={() => setShowFilters(!showFilters)}>
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
          </HStack>

          {showFilters && <FilterPanel />}
        </Box>

        {loading ? (
          <Box>Loading...</Box>
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