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
  Badge,
  Grid,
  VStack,
  HStack
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

  // Fetch tags when component mounts
  useEffect(() => {
    console.log('🔄 SearchBar mounted - fetching tags');
    dispatch(fetchTags())
      .unwrap()
      .then((result) => {
        console.log('✅ Tags fetched successfully:', result);
        console.log('📊 Result type:', typeof result);
        console.log('🔢 Result keys:', Object.keys(result));
      })
      .catch((error) => {
        console.error('❌ Error fetching tags:', error);
      });
  }, [dispatch]);

  // FIXED: Handle both array and object formats for tags
  const availableTags = useMemo(() => {
    // If it's already an array, use it directly
    if (Array.isArray(allTags)) {
      return allTags;
    }
    
    // If it's an object, try to extract the array from common properties
    if (typeof allTags === 'object' && allTags !== null) {
      // Try common property names that might contain the tags array
      const possibleArrayProperties = ['items', 'results', 'data', 'tags', 'list'];
      
      for (const prop of possibleArrayProperties) {
        if (Array.isArray(allTags[prop])) {
          return allTags[prop];
        }
      }
      
      // If no array property found, try to convert object values to array
      const valuesArray = Object.values(allTags);
      if (valuesArray.length > 0 && Array.isArray(valuesArray[0])) {
        return valuesArray[0];
      }
      
      // Last resort: check if object values are tag objects
      const tagObjects = Object.values(allTags).filter(item => 
        item && typeof item === 'object' && 'id' in item && 'name' in item
      );
      if (tagObjects.length > 0) {
        return tagObjects;
      }
    }
    
    return [];
  }, [allTags]);

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
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    };
    
    // Add tags if any are selected
    if (selectedTags.length > 0) {
      searchParams.tags = selectedTags.join(',');
    }
    
    // Sorting parameter 
    searchParams.ordering = apiSortParam;   
    
    console.log('🔍 Executing search with params:', searchParams);
    console.log('🏷️ Selected tags:', selectedTags);
    console.log('📤 Tags being sent to API:', searchParams.tags);
    
    dispatch(searchAssets(searchParams));
  };

  // Effect to trigger search when dependencies change
  useEffect(() => {
    console.log('🔄 Filter change detected - triggering search');
    console.log('🏷️ Selected tags in effect:', selectedTags);
    
    executeSearch();
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
      // If the new "from" date is after the current "to" date, clear the "to" date
      if (value && dateTo && value > dateTo) {
        setDateTo('');
      }
    } else {
      // Only set the "to" date if it's not less than the "from" date
      if (!dateFrom || value >= dateFrom) {
        setDateTo(value);
      } else {
        // Optional: Show a warning or prevent setting the invalid date
        console.warn('End date cannot be before start date');
      }
    }
  };

  const toggleTag = (tagId: number) => {
    console.log('🟡 Toggling tag:', tagId);
    console.log('🟡 Current selected tags:', selectedTags);
    
    setSelectedTags(prev => {
      const newSelectedTags = prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId];
      
      console.log('🟢 New selected tags:', newSelectedTags);
      return newSelectedTags;
    });
  };

  const handleResetFilters = () => {
    console.log('🗑️ Resetting all filters');
    setFileType('');
    setSelectedTags([]);
    setDateFrom('');
    setDateTo('');
  };

  const clearAllTags = () => {
    console.log('🗑️ Clearing all tags');
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

        {/* Filter Panel - Compact version */}
        {isFilterOpen && (
          <Box
            mt={4}
            p={4}
            bg="white"
            border="1px solid"
            borderColor="gray.200"
            borderRadius="lg"
            boxShadow="md"
            width="100%"
          >
            <VStack gap={4} align="stretch">
              {/* Header */}
              <Flex justify="space-between" align="center">
                <Text fontSize="lg" fontWeight="bold">Filters</Text>
                <HStack gap={2}>
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
                </HStack>
              </Flex>

              {/* File Type and Date Range in one row */}
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                {/* File Type */}
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>File Type</Text>
                  <select 
                    value={fileType} 
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFileTypeChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      height: '40px'
                    }}
                  >
                    <option value="">All Types</option>
                    <option value="image">Images</option>
                    <option value="video">Videos</option>
                    <option value="model">3D Models</option>
                    <option value="document">Documents</option>
                  </select>
                </Box>

                {/* Date Range - Fixed alignment */}
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>Date Range</Text>
                  <HStack gap={2}>
                    <Box flex={1}>
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDateChange('from', e.target.value)}
                        size="sm"
                        height="40px"
                        borderColor="gray.300"
                        borderRadius="6px"
                      />
                    </Box>
                    <Text fontSize="sm" color="gray.500" minW="20px" textAlign="center">to</Text>
                    <Box flex={1}>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDateChange('to', e.target.value)}
                        min={dateFrom}
                        size="sm"
                        height="40px"
                        borderColor="gray.300"
                        borderRadius="6px"
                      />
                    </Box>
                  </HStack>
                </Box>
              </Grid>

              {/* Tags Filter */}
              <Box>
                <Flex justify="space-between" align="center" mb={2}>
                  <Text fontSize="sm" fontWeight="medium">Tags</Text>
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
                      Error loading tags: {tagsError}
                    </Text>
                  </Box>
                )}

                <Box 
                  display="flex" 
                  flexWrap="wrap" 
                  gap={2}
                  maxH="120px"
                  overflowY="auto"
                  p={3}
                  border="1px solid"
                  borderColor="gray.200"
                  borderRadius="md"
                  bg="gray.50"
                >
                  {!tagsLoading && availableTags.length > 0 ? (
                    availableTags.map((tag: any) => (
                      <Box
                        key={tag.id}
                        as="button"
                        bg={selectedTags.includes(tag.id) ? "blue.500" : "white"}
                        color={selectedTags.includes(tag.id) ? "white" : "gray.700"}
                        border="1px solid"
                        borderColor={selectedTags.includes(tag.id) ? "blue.500" : "gray.300"}
                        borderRadius="md"
                        px={2}
                        py={1}
                        fontSize="xs"
                        fontWeight="medium"
                        cursor="pointer"
                        onClick={() => toggleTag(tag.id)}
                        _hover={{
                          bg: selectedTags.includes(tag.id) ? "blue.600" : "gray.100"
                        }}
                        transition="all 0.2s"
                        whiteSpace="nowrap"
                        display="inline-flex"
                        alignItems="center"
                        height="24px"
                      >
                        {tag.name}
                      </Box>
                    ))
                  ) : (
                    !tagsLoading && (
                      <Text fontSize="sm" color="gray.500" textAlign="center" width="100%">
                        {tagsError ? `Error: ${tagsError}` : 'No tags available'}
                      </Text>
                    )
                  )}
                </Box>
              </Box>

              {/* Status - Compact */}
              <Box 
                p={2} 
                bg="gray.50" 
                borderRadius="md" 
                border="1px solid"
                borderColor="gray.200"
              >
                <Text fontSize="sm" color="gray.600" textAlign="center">
                  {loading ? 'Searching...' : `${assets?.length || 0} assets found`}
                </Text>
              </Box>
            </VStack>
          </Box>
        )}
      </Box>
    </>
  );
}