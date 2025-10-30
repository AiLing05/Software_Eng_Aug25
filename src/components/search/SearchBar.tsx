"use client";

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store';
import { searchAssets } from '@/lib/store/slices/assetsSlice';
import { 
  Input, 
  Button,
  Flex,
  Box
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

interface SearchBarProps {
  fileType?: string;
  selectedTags?: number[];
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  onSortChange?: (value: string) => void;
}

export default function SearchBar({
  fileType,
  selectedTags,
  dateFrom,
  dateTo,
  sortBy = 'newest',
  onSortChange
}: SearchBarProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { loading, items } = useSelector((state: RootState) => state.assets);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [dateField, setDateField] = useState<string>('created_at'); // We'll detect this

  // Debug: Find the correct date field
  useEffect(() => {
    if (items && items.length > 0) {
      console.log('📅 [DEBUG] Checking for creation date field:');
      
      const firstAsset = items[0] as any;
      let foundDateField = 'created_at'; // default
      
      // Look for fields that contain date-like data
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
            console.log(✅ Found likely date field: ${key} = ${value});
            foundDateField = key;
          }
          
          if (looksLikeDate) {
            console.log(📌 Potential date field: ${key} = ${value});
          }
        }
      });
      
      console.log(🎯 Using date field: ${foundDateField});
      setDateField(foundDateField);
    }
  }, [items]);

  // Map our sort options to what the API expects using the actual date field
  const getSortParameter = (sortOption: string) => {
    console.log('🔄 [DEBUG] Converting sort option:', sortOption, 'using field:', dateField);
    
    if (sortOption === 'newest') return -${dateField};  // Newest first (descending)
    if (sortOption === 'oldest') return dateField;        // Oldest first (ascending)
    
    return -${dateField}; // default to newest first
  };

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Search execution function
  const executeSearch = () => {
    const apiSortParam = getSortParameter(sortBy);
    
    console.log('🔍 [DEBUG] Executing search with:', {
      sortBy,
      apiSortParam,
      dateField,
      debouncedTerm,
      fileType,
      selectedTags,
      dateFrom,
      dateTo
    });
    
    const searchParams: any = {
      keyword: debouncedTerm || undefined,
      file_type: fileType || undefined,
      tags: selectedTags?.length ? selectedTags : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    };
    
    // Try different sorting parameter names - test these one by one
    searchParams.ordering = apiSortParam;    // Most common for Django REST framework
    // searchParams.sort = apiSortParam;     // Alternative
    // searchParams.sort_by = apiSortParam;  // Another option
    // searchParams.order_by = apiSortParam; // Or this
    // searchParams.order = apiSortParam;    // Simple version
    
    console.log('📤 [DEBUG] Final search params:', searchParams);
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
    console.log('🔄 [DEBUG] Sort option changed to:', sortBy);
    executeSearch();
  }, [sortBy]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeSearch();
    }
  };

  const handleSearchClick = () => {
    executeSearch();
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSortChange?.(e.target.value);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  return (
    <Box width="100%">
      <Flex gap={4} width="100%" direction={{ base: "column", md: "row" }} alignItems="center">
        {/* Search Input with Icon and Button */}
        <Box position="relative" flex={1} width="100%">
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
          {/* Search Icon */}
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
          
          {/* Search Button */}
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
            loading={loading}  // Fixed: using 'loading' instead of 'isLoading'
          >
            Search
          </Button>
        </Box>

        {/* Sort Filter */}
        <Box width={{ base: "100%", md: "200px" }}>
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
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </Box>
      </Flex>
      
      {/* Debug info - remove in production */}
      <Box mt={2} fontSize="sm" color="gray.500">
        Debug: Using date field "{dateField}" for sorting
      </Box>
    </Box>
  );
}
