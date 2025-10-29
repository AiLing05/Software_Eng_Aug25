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
  const { loading } = useSelector((state: RootState) => state.assets);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');

  // Debug logging
  useEffect(() => {
    console.log('Search term:', searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    console.log('Debounced term:', debouncedTerm);
  }, [debouncedTerm]);

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Search execution function
  const executeSearch = () => {
    console.log('Executing search with:', {
      keyword: debouncedTerm,
      file_type: fileType,
      tags: selectedTags,
      date_from: dateFrom,
      date_to: dateTo
    });
    
    dispatch(
      searchAssets({
        keyword: debouncedTerm || undefined,
        file_type: fileType || undefined,
        tags: selectedTags?.length ? selectedTags : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
    );
  };

  // Effect to trigger search when dependencies change
  useEffect(() => {
    if (debouncedTerm !== '' || fileType || selectedTags?.length || dateFrom || dateTo) {
      executeSearch();
    }
  }, [debouncedTerm, fileType, selectedTags, dateFrom, dateTo, dispatch]);

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
            loading={loading}
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
            <option value="title_asc">Title A-Z</option>
            <option value="title_desc">Title Z-A</option>
            <option value="relevance">Relevance</option>
          </select>
        </Box>
      </Flex>
    </Box>
  );
}
