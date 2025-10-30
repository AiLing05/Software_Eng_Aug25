"use client";

import { Box } from '@chakra-ui/react';

interface VideoPreviewProps {
  url: string;
}

export default function VideoPreview({ url }: VideoPreviewProps) {
  return (
    <Box maxH="600px" bg="black" display="flex" alignItems="center" justifyContent="center">
      <video
        controls
        style={{ maxWidth: '100%', maxHeight: '600px' }}
        src={url}
      >
        Your browser does not support the video tag.
      </video>
    </Box>
  );
}