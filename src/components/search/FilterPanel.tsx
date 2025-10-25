"use client";

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store';
import { searchAssets } from '@/lib/store/slices/assetsSlice';
import { Box, Button, VStack, HStack, Select, Input, Heading, Badge } from '@chakra-ui/react';

export default function FilterPanel() {
  const dispatch = useDispatch<AppDispatch>();
  const { items: tags } = useSelector((state: RootState) => state.tags);
  
  const [fileType, setFileType] = useState('');
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const handleApplyFilters = () => {
    dispatch(searchAssets({
      file_type: fileType || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }));
  };

  const handleResetFilters = () => {
    setFileType('');
    setSelectedTags([]);
    setDateFrom('');
    setDateTo('');
    dispatch(searchAssets({}));
  };

  const toggleTag = (tagId: number) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  return (
    <Box bg="white" p={6} borderRadius="lg" shadow="sm" mb={6}>
      <Heading size="md" mb={4}>Filters</Heading>
      
      <VStack gap={4} align="stretch">
        <Box>
          <label style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px', display: 'block' }}>
            File Type
          </label>
          <Select value={fileType} onChange={(e) => setFileType(e.target.value)}>
            <option value="">All Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="model">3D Models</option>
            <option value="document">Documents</option>
          </Select>
        </Box>

        <Box>
          <label style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px', display: 'block' }}>
            Tags
          </label>
          <HStack wrap="wrap" gap={2}>
            {tags.map((tag) => (
              <Badge
                key={tag.id}
                colorScheme={selectedTags.includes(tag.id) ? 'blue' : 'gray'}
                cursor="pointer"
                onClick={() => toggleTag(tag.id)}
                px={3}
                py={1}
              >
                {tag.name}
              </Badge>
            ))}
          </HStack>
        </Box>

        <HStack gap={4}>
          <Box flex={1}>
            <label style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px', display: 'block' }}>
              Date From
            </label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </Box>
          <Box flex={1}>
            <label style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px', display: 'block' }}>
              Date To
            </label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </Box>
        </HStack>

        <HStack pt={2}>
          <Button colorScheme="blue" onClick={handleApplyFilters}>
            Apply Filters
          </Button>
          <Button variant="ghost" onClick={handleResetFilters}>
            Reset
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}