"use client";

import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/lib/store';
import { searchAssets } from '@/lib/store/slices/assetsSlice';
import { Input, InputGroup } from '@chakra-ui/react';

export default function SearchBar() {
  const dispatch = useDispatch<AppDispatch>();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    
    if (value.length > 2) {
      dispatch(searchAssets({ keyword: value }));
    } else if (value.length === 0) {
      // Reset to show all assets
      dispatch(searchAssets({}));
    }
  };

  return (
    <InputGroup>
      <Input
        placeholder="Search assets by title, description, or tags..."
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
        size="lg"
      />
    </InputGroup>
  );
}