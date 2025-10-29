"use client";

import { Asset } from '@/lib/types';
import { Box, Text } from '@chakra-ui/react';
import { useState, useEffect } from 'react';

interface DocumentPreviewProps {
  asset: Asset;
}

export default function DocumentPreview({ asset }: DocumentPreviewProps) {
  const [textContent, setTextContent] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Build full URL
  const fullUrl = asset.file_url.startsWith('http') 
    ? asset.file_url 
    : `http://localhost:8000${asset.file_url}`;

  // Load text content for .txt files
  useEffect(() => {
    if (asset.file_extension.toLowerCase() === '.txt') {
      setLoading(true);
      fetch(fullUrl)
        .then(response => response.text())
        .then(text => {
          setTextContent(text);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error loading text file:', error);
          setLoading(false);
        });
    }
  }, [asset.file_extension, fullUrl]);

  // PDF document preview
  if (asset.file_extension.toLowerCase() === '.pdf') {
    return (
      <Box h="600px" w="full" bg="white">
        <iframe
          src={fullUrl}
          style={{ 
            width: '100%', 
            height: '100%', 
            border: 'none'
          }}
          title={asset.title}
        />
      </Box>
    );
  }

  // Text file preview
  if (asset.file_extension.toLowerCase() === '.txt') {
    return (
      <Box h="600px" w="full" bg="white" overflow="auto">
        {loading ? (
          <Box display="flex" alignItems="center" justifyContent="center" h="100%">
            <Text color="gray.500">Loading text content...</Text>
          </Box>
        ) : textContent ? (
          <Text 
            whiteSpace="pre-wrap" 
            fontFamily="monospace" 
            fontSize="sm"
            color="gray.800"
            p={4}
          >
            {textContent}
          </Text>
        ) : (
          <Box display="flex" alignItems="center" justifyContent="center" h="100%">
            <Text color="gray.500">Unable to load text content</Text>
          </Box>
        )}
      </Box>
    );
  }

  // Word document preview with dark blue background
  if (['.doc', '.docx'].includes(asset.file_extension.toLowerCase())) {
    return (
      <Box h="600px" w="full" display="flex" alignItems="center" justifyContent="center" flexDirection="column" bg="#33343f">
        <Text fontSize="4xl" mb={4} color="white">📄</Text>
        <Text color="white" mb={4} fontSize="lg" fontWeight="medium">
          Microsoft Word Document
        </Text>
        <Text color="gray.300" textAlign="center" maxW="400px" fontSize="sm">
          This file needs to be downloaded to view its contents.
        </Text>
        <Text color="gray.300" textAlign="center" maxW="400px" fontSize="sm" mt={2}>
          Click the download button at the top right corner to download.
        </Text>
      </Box>
    );
  }
}
