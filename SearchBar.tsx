//28 Oct 2025
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store';
import { searchAssets } from '@/lib/store/slices/assetsSlice';
import { fetchTags } from '@/lib/store/slices/tagsSlice';
import { 
  Input, 
  Button,
  Flex,
  Box,
  Text,
  Badge
} from '@chakra-ui/react';

// Simple search icon component
const SearchIcon = () => (
  <svg 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

// Filter icon component
const FilterIcon = () => (
  <svg 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
  >
    <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
  </svg>
);

// Close icon component
const CloseIcon = () => (
  <svg 
    width="14" 
    height="14" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
  >
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

interface SearchBarProps {
  onFilterChange?: (filters: {
    fileType: string;
    selectedTags: number[];
    dateFrom: string;
    dateTo: string;
  }) => void;
  sortBy?: string;
  onSortChange?: (value: string) => void;
}

export default function SearchBar({
  onFilterChange,
  sortBy = 'newest',
  onSortChange
}: SearchBarProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { loading, items: assets } = useSelector((state: RootState) => state.assets);
  
  // Get loading and error states for tags
  const { 
    items: allTags, 
    loading: tagsLoading, 
    error: tagsError 
  } = useSelector((state: RootState) => state.tags);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [dateField, setDateField] = useState<string>('created_at');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Filter states
  const [fileType, setFileType] = useState('');
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Active filters count
  const activeFiltersCount = [
    fileType ? 1 : 0,
    dateFrom || dateTo ? 1 : 0,
    selectedTags.length > 0 ? 1 : 0
  ].reduce((a, b) => a + b, 0);

  // Enhanced tags fetching with error handling
  useEffect(() => {
    // Only fetch tags if we don't have them already, not loading, and no error
    if (!allTags || allTags.length === 0) {
      dispatch(fetchTags())
        .unwrap()
        .then((result) => {
          console.log('✅ Tags fetched successfully');
        })
        .catch((error) => {
          console.error('❌ Error fetching tags:', error);
        });
    }
  }, [dispatch, allTags, tagsLoading, tagsError]);

  // Proper available tags calculation
  const availableTags = useMemo(() => {
    // If we have tags from the tags slice, use them
    if (Array.isArray(allTags) && allTags.length > 0) {
      return allTags;
    }
    
    // Fallback: try to extract tags from assets if direct tags fetch failed
    if (Array.isArray(assets) && assets.length > 0) {
      const allTagsFromAssets: any[] = [];
      assets.forEach(asset => {
        if (asset.tags && Array.isArray(asset.tags)) {
          allTagsFromAssets.push(...asset.tags);
        }
      });
      
      const uniqueTags = allTagsFromAssets.filter((tag, index, self) => 
        index === self.findIndex(t => t.id === tag.id)
      );
      return uniqueTags;
    }
    
    return [];
  }, [allTags, assets]);

  // Find the correct date field
  useEffect(() => {
    if (assets && assets.length > 0) {
      const firstAsset = assets[0] as any;
      let foundDateField = 'created_at'; // default
      
      // Look for Created time which contain date data
      Object.keys(firstAsset).forEach(key => {
        const value = firstAsset[key];
        
        // Check if this looks like a date field (based on name and value)
        if (typeof value === 'string') {
          const lowerKey = key.toLowerCase();
          const isDateField = lowerKey.includes('created') || 
                            lowerKey.includes('date') || 
                            lowerKey.includes('time');
          
          const looksLikeDate = value.includes(',') && 
                               (value.includes('202') || value.includes('201'));
          
          if (isDateField && looksLikeDate) {
            foundDateField = key;
          }
        }
      });
      
      setDateField(foundDateField);
    }
  }, [assets]);

  // Sort options to what the API expects using the actual date field
  const getSortParameter = (sortOption: string) => {
    if (sortOption === 'newest') return `-${dateField}`;  // Newest first (descending)
    if (sortOption === 'oldest') return dateField;        // Oldest first (ascending)
    
    return `-${dateField}`; // default to newest first
  };

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Search execution function 
  const executeSearch = () => {
    const apiSortParam = getSortParameter(sortBy);
    
    // Build up for the search parameter
    const searchParams: any = {
      keyword: debouncedTerm || undefined,
      file_type: fileType || undefined,
      tags: selectedTags?.length ? selectedTags : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    };
    
    // Sorting parameter 
    searchParams.ordering = apiSortParam;   
    
    dispatch(searchAssets(searchParams));
  };

  // Effect to trigger search when dependencies change
  useEffect(() => {
    if (debouncedTerm !== '' || fileType || selectedTags?.length || dateFrom || dateTo) {
      executeSearch();
    }
  }, [debouncedTerm, fileType, selectedTags, dateFrom, dateTo]);

  // Effect to trigger search when sortBy changes
  useEffect(() => {
    executeSearch();
  }, [sortBy]);

  // Notify parent component about filter changes
  useEffect(() => {
    onFilterChange?.({
      fileType,
      selectedTags,
      dateFrom,
      dateTo
    });
  }, [fileType, selectedTags, dateFrom, dateTo, onFilterChange]);

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeSearch();
    }
  };

  // Search button click
  const handleSearchClick = () => {
    executeSearch();
  };

  // Sort change
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSortChange?.(e.target.value);
  };

  // Input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Filter functions
  const handleFileTypeChange = (newFileType: string) => {
    setFileType(newFileType);
  };

  const handleDateChange = (type: 'from' | 'to', value: string) => {
    if (type === 'from') {
      setDateFrom(value);
    } else {
      setDateTo(value);
    }
  };

  const toggleTag = (tagId: number) => {
    setSelectedTags(prev => {
      const newSelectedTags = prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId];
      return newSelectedTags;
    });
  };

  const handleResetFilters = () => {
    setFileType('');
    setSelectedTags([]);
    setDateFrom('');
    setDateTo('');
  };

  const clearAllTags = () => {
    setSelectedTags([]);
  };

  return (
    <>
      {/* Main Search Bar */}
      <Box width="100%">
        <Flex gap={3} width="100%" direction={{ base: "column", md: "row" }} alignItems="center">
          {/* Search Input */}
          <Box position="relative" flex={1}>
            <Input
              placeholder="Search assets by title, description, or tags..."
              value={searchTerm}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              size="lg"
              paddingLeft="3rem"
              paddingRight="5rem"
              width="100%"
            />
            <Box
              position="absolute"
              left="0.75rem"
              top="50%"
              transform="translateY(-50%)"
              zIndex={2}
              pointerEvents="none"
              color="gray.500"
            >
              <SearchIcon />
            </Box>
            <Button 
              position="absolute"
              right="0.5rem"
              top="50%"
              transform="translateY(-50%)"
              height="2rem"
              size="sm"
              onClick={handleSearchClick}
              colorScheme="blue"
              zIndex={2}
              loading={loading}
            >
              Search
            </Button>
          </Box>
          
          {/* Filter Button and Sort - positioned together */}
          <Flex gap={3} width={{ base: "100%", md: "auto" }} align="center">
            <Button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              colorScheme="blue"
              variant={isFilterOpen ? "solid" : "outline"}
              height="3rem"
              minWidth="auto"
              px={4}
              width={{ base: "100%", md: "auto" }}
            >
              <Flex align="center" gap={2}>
                <FilterIcon />
                <Text>Filters</Text>
                {activeFiltersCount > 0 && (
                  <Badge 
                    colorScheme="blue" 
                    borderRadius="full" 
                    fontSize="xs"
                    minW="20px"
                    height="20px"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    {activeFiltersCount}
                  </Badge>
                )}
              </Flex>
            </Button>

            {/* Sort Filter */}
            <Box width={{ base: "100%", md: "150px" }}>
              <select
                value={sortBy}
                onChange={handleSortChange}
                style={{
                  width: '100%',
                  height: '3rem',
                  padding: '0 1rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #E2E8F0',
                  backgroundColor: 'white',
                  fontSize: '1rem',
                }}
              >
                <option value="newest">Latest</option>
                <option value="oldest">Oldest</option>
              </select>
            </Box>
          </Flex>
        </Flex>
      </Box>

      {/* Right Sidebar Filter Panel */}
      <Box
        position="fixed"
        top="0"
        right="0"
        height="100vh"
        width={isFilterOpen ? "350px" : "0"}
        bg="white"
        borderLeft="1px solid"
        borderColor="gray.200"
        boxShadow="lg"
        transition="width 0.3s ease"
        zIndex={1000}
        overflow="hidden"
      >
        {/* Sidebar Content */}
        <Box width="350px" height="100%" display="flex" flexDirection="column">
          {/* Header */}
          <Box 
            p={4} 
            borderBottom="1px solid" 
            borderColor="gray.200"
            bg="white"
          >
            <Flex justify="space-between" align="center">
              <Text fontSize="xl" fontWeight="bold">Filters</Text>
              <Flex gap={2}>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  colorScheme="gray"
                  onClick={handleResetFilters}
                  disabled={activeFiltersCount === 0}
                >
                  Clear All
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsFilterOpen(false)}
                >
                  <CloseIcon />
                </Button>
              </Flex>
            </Flex>
          </Box>

          {/* Scrollable Content */}
          <Box 
            flex="1" 
            overflowY="auto" 
            p={4}
            css={{
              '&::-webkit-scrollbar': {
                width: '4px',
              },
              '&::-webkit-scrollbar-track': {
                background: '#f1f1f1',
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#c1c1c1',
                borderRadius: '2px',
              },
            }}
          >
            <Flex direction="column" gap={6}>
              {/* File Type Filter */}
              <Box>
                <Text fontWeight="medium" mb={3}>File Type</Text>
                <select 
                  value={fileType} 
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFileTypeChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">All Types</option>
                  <option value="image">Images</option>
                  <option value="video">Videos</option>
                  <option value="model">3D Models</option>
                  <option value="document">Documents</option>
                </select>
              </Box>

              {/* Date Range Filter */}
              <Box>
                <Text fontWeight="medium" mb={3}>Date Range</Text>
                <Flex direction="column" gap={3}>
                  <Box>
                    <Text fontSize="sm" mb={1} fontWeight="medium">From</Text>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDateChange('from', e.target.value)}
                      size="sm"
                    />
                  </Box>
                  <Box>
                    <Text fontSize="sm" mb={1} fontWeight="medium">To</Text>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDateChange('to', e.target.value)}
                      size="sm"
                    />
                  </Box>
                </Flex>
              </Box>

              {/* Tags Filter */}
              <Box>
                <Flex justify="space-between" align="center" mb={3}>
                  <Text fontWeight="medium">Tags</Text>
                  {selectedTags.length > 0 && (
                    <Button 
                      size="xs" 
                      variant="ghost" 
                      colorScheme="red" 
                      onClick={clearAllTags}
                    >
                      Clear tags
                    </Button>
                  )}
                </Flex>

                {/* Tags Loading State */}
                {tagsLoading && (
                  <Box p={3} bg="gray.50" borderRadius="md" textAlign="center">
                    <Text fontSize="sm" color="gray.600">Loading tags...</Text>
                  </Box>
                )}

                {/* Tags Error State */}
                {tagsError && (
                  <Box p={3} bg="red.50" borderRadius="md" textAlign="center" mb={2}>
                    <Text fontSize="sm" color="red.600">
                      Error loading tags
                    </Text>
                  </Box>
                )}

                <Box 
                  display="flex" 
                  flexWrap="wrap" 
                  gap={2}
                  maxH="300px"
                  overflowY="auto"
                  p={3}
                  border="1px solid"
                  borderColor="gray.200"
                  borderRadius="md"
                >
                  {!tagsLoading && availableTags.length > 0 ? (
                    availableTags.map((tag: any) => (
                      <Box
                        key={tag.id}
                        as="button"
                        bg={selectedTags.includes(tag.id) ? "blue.500" : "gray.100"}
                        color={selectedTags.includes(tag.id) ? "white" : "gray.700"}
                        border="1px solid"
                        borderColor={selectedTags.includes(tag.id) ? "blue.500" : "gray.200"}
                        borderRadius="md"
                        px={3}
                        py={2}
                        fontSize="sm"
                        fontWeight="medium"
                        cursor="pointer"
                        onClick={() => toggleTag(tag.id)}
                        _hover={{
                          bg: selectedTags.includes(tag.id) ? "blue.600" : "gray.200"
                        }}
                        transition="all 0.2s"
                        whiteSpace="nowrap"
                        display="inline-block"
                        margin="2px"
                      >
                        {tag.name}
                      </Box>
                    ))
                  ) : (
                    !tagsLoading && (
                      <Text fontSize="sm" color="gray.500" textAlign="center" width="100%">
                        {tagsError ? 'Error loading tags' : 'No tags available'}
                      </Text>
                    )
                  )}
                </Box>
              </Box>

              {/* Quick Actions */}
              <Box>
                <Text fontWeight="medium" mb={3}>Quick Actions</Text>
                <Flex gap={2} wrap="wrap">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    colorScheme="blue"
                    onClick={() => handleFileTypeChange('image')}
                  >
                    Images Only
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    colorScheme="green"
                    onClick={() => handleFileTypeChange('video')}
                  >
                    Videos Only
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    colorScheme="purple"
                    onClick={handleResetFilters}
                  >
                    Show All
                  </Button>
                </Flex>
              </Box>

              {/* Status */}
              <Box p={3} bg="gray.50" borderRadius="md">
                <Text fontSize="sm" color="gray.600" textAlign="center">
                  {loading ? 'Searching...' : `${assets?.length || 0} assets found`}
                </Text>
              </Box>
            </Flex>
          </Box>
        </Box>
      </Box>

      {/* Overlay when sidebar is open (for mobile) */}
      {isFilterOpen && (
        <Box
          position="fixed"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="blackAlpha.300"
          zIndex={999}
          display={{ base: "block", md: "none" }}
          onClick={() => setIsFilterOpen(false)}
        />
      )}
    </>
  );
}
