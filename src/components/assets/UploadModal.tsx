"use client";

import { useState, useCallback, useEffect } from 'react';
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
  Heading, 
} from '@chakra-ui/react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Icon component
const AddIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
    <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// Custom Tag component
const CustomTag = ({ children, onClose, ...props }: any) => (
  <Box
    display="inline-flex"
    alignItems="center"
    gap={1}
    px={3}
    py={1}
    borderRadius="full"
    bg="blue.500"
    color="white"
    fontSize="sm"
    fontWeight="medium"
    {...props}
  >
    {children}
    {onClose && (
      <Box
        as="button"
        onClick={onClose}
        display="flex"
        alignItems="center"
        justifyContent="center"
        width="4"
        height="4"
        borderRadius="full"
        _hover={{ bg: 'blue.600' }}
      >
        ×
      </Box>
    )}
  </Box>
);

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState({
    file: false,
    title: false,
    tags: false
  });

  // Reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setFiles([]);
      setTitle('');
      setDescription('');
      setTags([]);
      setNewTag('');
      setUploadProgress(0);
      setErrors({
        file: false,
        title: false,
        tags: false
      });
    }
  }, [isOpen]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
    if (acceptedFiles.length > 0 && !title) {
      setTitle(acceptedFiles[0].name);
    }
    // Clear file error when file is selected
    setErrors(prev => ({ ...prev, file: false }));
  }, [title]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi', '.webm'],
      'model/*': ['.glb', '.gltf', '.obj', '.fbx'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
  });

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim().toUpperCase())) {
      setTags(prev => [...prev, newTag.trim().toUpperCase()]);
      setNewTag('');
      // Clear tags error when at least one tag is added
      setErrors(prev => ({ ...prev, tags: false }));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const validateForm = () => {
    const newErrors = {
      file: files.length === 0,
      title: !title.trim(),
      tags: tags.length === 0
    };
    
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const handleUpload = async () => {
    // Validate all fields
    if (!validateForm()) {
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', files[0]);
    formData.append('title', title);
    formData.append('description', description);

    if (files[0]) {
      const extension = files[0].name.split('.').pop()?.toLowerCase() || '';
      let fileType = 'other';
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) fileType = 'image';
      else if (['mp4', 'mov', 'avi', 'webm'].includes(extension)) fileType = 'video';
      else if (['pdf', 'doc', 'docx', 'txt'].includes(extension)) fileType = 'document';
      else if (['glb', 'gltf', 'obj', 'fbx'].includes(extension)) fileType = '3d_model';
      formData.append('file_type', fileType);
    }

    // 处理标签 - 确保所有标签都是大写的
    if (tags.length > 0) {
      tags.forEach(tag => formData.append('tags', tag));
    }

    try {
      await dispatch(uploadAsset(formData)).unwrap();
      onClose(); // Close after successful upload
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  // If not enabled, no content is rendered.
  if (!isOpen) return null;

  return (
    <Box
      position="relative"
      bg="white"
      borderRadius="lg"
      boxShadow="xl"
      p={6}
      width="100%"
    >
      <VStack gap={6} align="stretch">
        {/* Header */}
        <Box>
          <HStack justify="space-between" align="center">
            <Heading size="lg">Upload Assets</Heading>
            <Button variant="ghost" onClick={handleClose}>
              Close
            </Button>
          </HStack>
        </Box>

        {/* Dropzone */}
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={2}>
            File * {errors.file && <Text as="span" color="red.500">- Please select a file</Text>}
          </Text>
          <Box
            {...getRootProps()}
            p={12}
            border="2px dashed"
            borderColor={errors.file ? 'red.300' : (isDragActive ? 'blue.400' : 'gray.300')}
            borderRadius="lg"
            bg={errors.file ? 'red.50' : (isDragActive ? 'blue.50' : 'gray.50')}
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
        </Box>

        {/* Selected file */}
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

        {/* Title */}
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={2}>
            Title * {errors.title && <Text as="span" color="red.500">- Title is required</Text>}
          </Text>
          <Input
            placeholder="Asset Title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (e.target.value.trim()) {
                setErrors(prev => ({ ...prev, title: false }));
              }
            }}
            _invalid={{ borderColor: 'red.300' }}
            borderColor={errors.title ? 'red.300' : 'gray.200'}
          />
        </Box>

        {/* Description */}
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.700">
            Description <Text as="span" color="gray.400" fontSize="xs">(Optional)</Text>
          </Text>
          <Input
            placeholder="Enter asset description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Box>

        {/* Tags */}
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={2}>
            Tags * {errors.tags && <Text as="span" color="red.500">- At least one tag is required</Text>}
          </Text>
          <VStack gap={2} align="stretch">
            <HStack flexWrap="wrap" gap={2}>
              {tags.map((tag, index) => (
                <CustomTag key={index} onClose={() => handleRemoveTag(tag)}>
                  {tag}
                </CustomTag>
              ))}
            </HStack>
            
            <Box>
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value.toUpperCase())} 
                onKeyPress={handleTagKeyPress}
                placeholder="Enter new tag..."
                size="sm"
              />
              <Button
                aria-label="Add tag"
                size="sm"
                onClick={handleAddTag}
                mt={2}
                width="full"
              >
                <AddIcon />
                <Text ml={2}>Add Tag</Text>
              </Button>
            </Box>
          </VStack>
        </Box>

        {/* Progress */}
        {uploading && (
          <Progress.Root value={uploadProgress}>
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
        )}

        {/* Actions */}
        <HStack justify="flex-end" pt={4}>
          <Button variant="ghost" onClick={handleClose} mr={3}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleUpload}
            disabled={uploading}
            loading={uploading}
          >
            Upload
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}