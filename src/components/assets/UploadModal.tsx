"use client";

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/lib/store';
import { uploadAsset } from '@/lib/store/slices/assetsSlice';
import {
  Box,
  Button,
  Input,
  Text,
  VStack,
  HStack,
  Badge,
  Progress,
} from '@chakra-ui/react';
import { DialogRoot, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogCloseTrigger } from '@chakra-ui/react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
    if (acceptedFiles.length > 0 && !title) {
      setTitle(acceptedFiles[0].name);
    }
  }, [title]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi', '.webm'],
      'model/*': ['.glb', '.gltf'],
      'application/pdf': ['.pdf'],
    },
  });

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', files[0]);
    formData.append('title', title);
    formData.append('description', description);
    
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      tagArray.forEach(tag => formData.append('tags', tag));
    }

    try {
      await dispatch(uploadAsset(formData)).unwrap();
      handleClose();
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFiles([]);
    setTitle('');
    setDescription('');
    setTags('');
    setUploadProgress(0);
    onClose();
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={handleClose}>
      <DialogContent maxW="2xl">
        <DialogHeader>
          <DialogTitle>Upload Assets</DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>

        <DialogBody>
          <VStack gap={4} align="stretch">
            <Box
              {...getRootProps()}
              p={12}
              border="2px dashed"
              borderColor={isDragActive ? 'blue.400' : 'gray.300'}
              borderRadius="lg"
              bg={isDragActive ? 'blue.50' : 'gray.50'}
              textAlign="center"
              cursor="pointer"
              transition="all 0.2s"
            >
              <input {...getInputProps()} />
              <Text fontSize="lg" mb={2}>
                {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
              </Text>
              <Text fontSize="sm" color="gray.600">
                or click to select files
              </Text>
              <Text fontSize="xs" color="gray.500" mt={2}>
                Supported: Images, Videos (.mp4), 3D Models (.glb), PDFs
              </Text>
            </Box>

            {files.length > 0 && (
              <Box p={4} bg="gray.50" borderRadius="md">
                <HStack justify="space-between">
                  <HStack>
                    <Text fontWeight="medium">{files[0].name}</Text>
                    <Badge colorScheme="blue">
                      {(files[0].size / 1024 / 1024).toFixed(2)} MB
                    </Badge>
                  </HStack>
                  <Button size="sm" variant="ghost" onClick={() => setFiles([])}>
                    Remove
                  </Button>
                </HStack>
              </Box>
            )}

            <Input
              placeholder="Asset Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <Input
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <Input
              placeholder="Tags (comma separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />

            {uploading && <Progress value={uploadProgress} size="sm" />}
          </VStack>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} mr={3}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleUpload}
            disabled={files.length === 0 || !title || uploading}
            loading={uploading}
          >
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}