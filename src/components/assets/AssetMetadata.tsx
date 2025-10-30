"use client";


import { useState, useEffect } from 'react';
import { Asset } from '@/lib/types';
import {
 Box,
 Button,
 Input,
 Textarea,
 VStack,
 HStack,
 Text,
 IconButton,
 useDisclosure,
 Badge,
 Dialog,
 Progress,
 CloseButton,
} from '@chakra-ui/react';
import { useDropzone } from 'react-dropzone';
import axios from '@/lib/api/axios';


interface AssetMetadataProps {
 asset: Asset;
 isEditing?: boolean;
 onEditToggle?: (editing: boolean) => void;
 onSave?: (data: any) => Promise<boolean>;
 onUpdateAsset?: (asset: Asset) => void;
 onImageUpdate?: (newImageUrl: string) => void;
}


interface MetadataField {
 id: string;
 key: string;
 value: string;
}


// Icon components for consistent UI
const AddIcon = (props: any) => (
 <svg width="12" height="12" viewBox="0 0 12 12" fill="none" {...props}>
   <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
 </svg>
);


const DeleteIcon = (props: any) => (
 <svg width="16" height="16" viewBox="0 0 16 16" fill="none" {...props}>
   <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
 </svg>
);


const ImageIcon = (props: any) => (
 <svg width="16" height="16" viewBox="0 0 16 16" fill="none" {...props}>
   <path d="M14 2H2C1.44772 2 1 2.44772 1 3V13C1 13.5523 1.44772 14 2 14H14C14.5523 14 15 13.5523 15 13V3C15 2.44772 14.5523 2 14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
   <path d="M5.5 7C6.05228 7 6.5 6.55228 6.5 6C6.5 5.44772 6.05228 5 5.5 5C4.94772 5 4.5 5.44772 4.5 6C4.5 6.55228 4.94772 7 5.5 7Z" fill="currentColor" />
   <path d="M15 10L11 6L2 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
 </svg>
);


/**
* AssetMetadata Component
* Handles viewing and editing of asset metadata including title, description, tags, and custom fields
* Supports image upload and real-time updates
*/
export default function AssetMetadata({
 asset,
 isEditing: externalIsEditing,
 onEditToggle,
 onSave,
 onUpdateAsset,
 onImageUpdate
}: AssetMetadataProps) {
 const { canEdit } = useAuth();


 // State management for editing mode
 const [internalIsEditing, setInternalIsEditing] = useState(false);
 const isEditing = externalIsEditing !== undefined ? externalIsEditing : internalIsEditing;


 // Form state management
 const [editedTitle, setEditedTitle] = useState(asset.title);
 const [editedDescription, setEditedDescription] = useState(asset.description || '');
 const [editedTags, setEditedTags] = useState<string[]>([]);
 const [newTag, setNewTag] = useState('');
 const [isSaving, setIsSaving] = useState(false);
 const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);


 // Custom metadata fields state
 const [customFields, setCustomFields] = useState<MetadataField[]>([]);
 const [newCustomField, setNewCustomField] = useState({ key: '', value: '' });


 // Image upload modal state
 const { open: isImageModalOpen, onOpen: onImageModalOpen, onClose: onImageModalClose } = useDisclosure();
 const [newImageFile, setNewImageFile] = useState<File | null>(null);
 const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
 const [isUploadingImage, setIsUploadingImage] = useState(false);
 const [uploadProgress, setUploadProgress] = useState(0);


 // Handle image preview and cleanup
 useEffect(() => {
   if (newImageFile) {
     const url = URL.createObjectURL(newImageFile);
     setPreviewImageUrl(url);


     // Cleanup function to revoke object URL
     return () => {
       URL.revokeObjectURL(url);
     };
   } else {
     setPreviewImageUrl(null);
   }
 }, [newImageFile]);


 // Initialize tags from asset data
 useEffect(() => {
   if (asset.tags && asset.tags.length > 0) {
     const tagNames = asset.tags.map((tag: any) =>
       typeof tag === 'string' ? tag : tag.name
     );
     console.log('Initializing tags from asset:', tagNames);
     setEditedTags(tagNames);
   } else {
     console.log('No tags found in asset, initializing empty array');
     setEditedTags([]);
   }
 }, [asset.tags]);


 // Initialize custom fields from asset metadata
 useEffect(() => {
   const assetWithMeta = asset as any;
   const rawMeta = assetWithMeta.metadata_json ?? assetWithMeta.metadata ?? null;


   const fields: MetadataField[] = [];


   if (Array.isArray(rawMeta)) {
     rawMeta.forEach((item: any, index: number) => {
       const k = item.key ?? item.name ?? null;
       const v = item.value ?? '';
       // Filter out system fields like weight and height
       if (k && k !== 'weight' && k !== 'height') {
         fields.push({
           id: item.id ? `field-${item.id}` : `field-${index}-${Date.now()}`,
           key: String(k),
           value: String(v)
         });
       }
     });
   } else if (rawMeta && typeof rawMeta === 'object') {
     Object.entries(rawMeta).forEach(([key, value], index) => {
       // Filter out system fields
       if (key !== 'weight' && key !== 'height') {
         fields.push({
           id: `field-${key}-${index}-${Date.now()}`,
           key,
           value: String(value)
         });
       }
     });
   }


   setCustomFields(fields);
 }, [asset]);


 // Sync internal editing state with external prop
 useEffect(() => {
   if (externalIsEditing !== undefined) {
     setInternalIsEditing(externalIsEditing);
   }
 }, [externalIsEditing]);


 // Auto-dismiss save messages after 3 seconds
 useEffect(() => {
   if (saveMessage) {
     const timer = setTimeout(() => {
       setSaveMessage(null);
     }, 3000);
     return () => clearTimeout(timer);
   }
 }, [saveMessage]);


 /**
  * Validates a tag name for correctness
  * @param tagName - The tag name to validate
  * @returns Error message or null if valid
  */
 const validateTag = (tagName: string): string | null => {
   if (!tagName.trim()) {
     return "Tag name cannot be empty";
   }


   if (tagName.length > 50) {
     return "Tag name cannot exceed 50 characters";
   }


   const existingTag = editedTags.find(tag =>
     tag.toLowerCase() === tagName.trim().toLowerCase()
   );


   if (existingTag) {
     return `Tag "${tagName}" already exists`;
   }


   return null;
 };


 // Dropzone configuration for image upload
 const { getRootProps: getImageRootProps, getInputProps: getImageInputProps, isDragActive: isImageDragActive } = useDropzone({
   onDrop: (acceptedFiles) => {
     if (acceptedFiles.length > 0) {
       setNewImageFile(acceptedFiles[0]);
     }
   },
   accept: {
     'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
     '3d_model/*': ['.glb', '.gltf', '.obj', '.fbx', '.stl', '.dae'],
     'video/*': ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.wmv', '.flv'],
     'document/*': ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'],
     'audio/*': ['.mp3', '.wav', '.ogg', '.flac', '.aac']
   },
   maxFiles: 1
 });


 /**
  * Handles uploading a new image for the asset
  * Sends PATCH request to update_asset endpoint with image file
  */
 const handleUploadNewImage = async () => {
   if (!newImageFile) return;


   setIsUploadingImage(true);
   setUploadProgress(0);


   const formData = new FormData();
   formData.append('image', newImageFile);


   console.log('Image upload request:');
   console.log('Endpoint:', `/assets/${asset.id}/update_asset/`);
   console.log('File:', newImageFile.name);


   try {
     const response = await axios.patch(`/assets/${asset.id}/update_asset/`, formData, {
       headers: {
         'Content-Type': 'multipart/form-data',
       },
       onUploadProgress: (progressEvent) => {
         if (progressEvent.total) {
           const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
           setUploadProgress(progress);
         }
       },
     });


     console.log('Image upload successful:', response.data);


     const updatedAsset = response.data;


     console.log('Updated asset information:');
     console.log('file_url:', updatedAsset.file_url);
     console.log('thumbnail_url:', updatedAsset.thumbnail_url);
     console.log('file_size:', updatedAsset.file_size);


     // Update parent component with new asset data
     if (onUpdateAsset) {
       console.log('Calling onUpdateAsset to update parent component');
       onUpdateAsset(updatedAsset);
     }


     // Update image display if new URL is available
     const newImageUrl = updatedAsset.file_url || updatedAsset.thumbnail_url;
     if (onImageUpdate && newImageUrl) {
       console.log('Calling onImageUpdate:', newImageUrl);
       onImageUpdate(newImageUrl);
     }


     // Reset state and close modal
     setNewImageFile(null);
     setPreviewImageUrl(null);
     setUploadProgress(0);
     onImageModalClose();


     setSaveMessage({
       type: 'success',
       message: 'File updated successfully!'
     });


   } catch (error: any) {
     console.error('Image upload failed:', error);
     console.error('Error details:', error.response?.data);
     setSaveMessage({
       type: 'error',
       message: `Image upload failed: ${error.response?.data?.message || 'Please check backend processing'}`
     });
   } finally {
     setIsUploadingImage(false);
   }
 };


 // Tag management functions
 const handleAddTag = () => {
   if (newTag.trim() && !editedTags.includes(newTag.trim().toUpperCase())) {
     setEditedTags(prev => [...prev, newTag.trim().toUpperCase()]);
     setNewTag('');
   }
 };


 const handleRemoveTag = (tagToRemove: string) => {
   setEditedTags(prev => prev.filter(tag => tag !== tagToRemove));
 };


 const handleTagKeyPress = (e: React.KeyboardEvent) => {
   if (e.key === 'Enter') {
     e.preventDefault();
     handleAddTag();
   }
 };


 // Custom fields management functions
 const handleAddCustomField = () => {
   console.log('Adding new field, current newCustomField:', newCustomField);


   if (newCustomField.key.trim() && newCustomField.value.trim()) {
     const newField: MetadataField = {
       id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
       key: newCustomField.key.trim(),
       value: newCustomField.value.trim()
     };


     console.log('Created new field:', newField);


     setCustomFields(prev => {
       const updatedFields = [...prev, newField];
       console.log('Updated fields list:', updatedFields);
       return updatedFields;
     });


     setNewCustomField({ key: '', value: '' });
     console.log('Field added successfully, cleared input');
   } else {
     console.log('Field key or value is empty');
   }
 };


 const handleRemoveCustomField = (fieldId: string) => {
   setCustomFields(prev => prev.filter(field => field.id !== fieldId));
 };


 const handleUpdateCustomField = (fieldId: string, updates: Partial<MetadataField>) => {
   setCustomFields(prev =>
     prev.map(field =>
       field.id === fieldId ? { ...field, ...updates } : field
     )
   );
 };


 const handleCustomFieldKeyPress = (e: React.KeyboardEvent) => {
   if (e.key === 'Enter') {
     e.preventDefault();
     handleAddCustomField();
   }
 };


 /**
  * Main save function for asset metadata
  * Handles title, description, tags, and custom fields
  */
 const handleSaveMain = async () => {
   setIsSaving(true);
   setSaveMessage(null);


   if (editedTitle.trim() === '') {
     setEditedTitle(asset.title);
     setSaveMessage({
       type: 'error',
       message: "⚠️ Title cannot be blank. Restored previous one."
     });
     setIsSaving(false);
     return;
   }


   try {
     const formData = new FormData();


     formData.append('title', editedTitle);
     formData.append('description', editedDescription);


     // tags
     editedTags.forEach(tag => formData.append('tag_names', tag.trim().toLowerCase()));


     // custom fields
     const metadataObject: Record<string, string> = {};
     customFields.forEach(field => {
       if (field.key.trim() && field.value.trim()) {
         metadataObject[field.key] = field.value;
       }
     });
     formData.append('metadata_json', JSON.stringify(metadataObject));


     if (newImageFile) {
       formData.append('image', newImageFile);
     }


     let success = false;
     if (onSave) {
       const saveData = {
         title: editedTitle,
         description: editedDescription,
         tag_names: editedTags.map(t => t.trim().toLowerCase()),
         metadata_json: JSON.stringify(metadataObject),
         file: newImageFile 
       };
       success = await onSave(saveData);
     } else {
       success = await saveToBackend(formData);
     }


     if (success) {
       setSaveMessage({ type: 'success', message: 'Asset updated successfully!' });
       setNewImageFile(null); 
       if (onEditToggle) onEditToggle(false);
       else setInternalIsEditing(false);
     } else {
       throw new Error('Save failed');
     }


   } catch (error) {
     console.error(error);
     setSaveMessage({ type: 'error', message: 'Failed to update asset' });
   } finally {
     setIsSaving(false);
   }
 };


 /**
  * Direct backend save function using axios
  * @param formData - FormData containing all metadata
  * @returns Promise resolving to success status
  */
 const saveToBackend = async (formData: FormData): Promise<boolean> => {
   try {
     console.log('Sending to Django update_asset endpoint:', `/assets/${asset.id}/update_asset/`);


     const response = await axios.patch(`/assets/${asset.id}/update_asset/`, formData, {
       headers: { 'Content-Type': 'multipart/form-data' },
     });


     const updatedAsset = response.data;
     console.log('Django update_asset response:', updatedAsset);
     console.log('Updated tags:', updatedAsset.tags);
     console.log('Updated metadata_json:', updatedAsset.metadata_json);


     if (onUpdateAsset) {
       onUpdateAsset(updatedAsset);
     }


     return true;
   } catch (error: any) {
     console.error('Save to Django failed:', error);


     if (error.response) {
       console.error('Django error response:', error.response.data);
       console.error('Django error status:', error.response.status);


       if (error.response.status === 400) {
         setSaveMessage({
           type: 'error',
           message: `Validation error: ${JSON.stringify(error.response.data)}`
         });
       } else if (error.response.status === 403) {
         setSaveMessage({
           type: 'error',
           message: 'Permission denied: You cannot edit this asset'
         });
       } else if (error.response.status === 404) {
         setSaveMessage({
           type: 'error',
           message: 'API endpoint not found'
         });
       }
     }


     return false;
   }
 };


 /**
  * Cancel editing and reset all form fields to original values
  */
 const handleCancelMain = () => {
   setEditedTitle(asset.title);
   setEditedDescription(asset.description || '');


   // Reset tags
   if (asset.tags && asset.tags.length > 0) {
     const tagNames = asset.tags.map((tag: any) =>
       typeof tag === 'string' ? tag : tag.name
     );
     setEditedTags(tagNames);
   } else {
     setEditedTags([]);
   }


   // Reset custom fields from original metadata
   const assetWithMeta = asset as any;
   const rawMeta = assetWithMeta.metadata_json ?? assetWithMeta.metadata ?? null;
   if (Array.isArray(rawMeta)) {
     const fields: MetadataField[] = rawMeta.map((item: any, idx: number) => ({
       id: item.id ? `field-${item.id}` : `field-${idx}-${Date.now()}`,
       key: item.key ?? item.name ?? '',
       value: String(item.value ?? '')
     }));
     setCustomFields(fields);
   } else if (rawMeta && typeof rawMeta === 'object') {
     const fields: MetadataField[] = Object.entries(rawMeta).map(([key, value]) => ({
       id: `field-${key}-${Date.now()}`,
       key,
       value: String(value)
     }));
     setCustomFields(fields);
   } else {
     setCustomFields([]);
   }


   // Exit editing mode
   if (onEditToggle) {
     onEditToggle(false);
   } else {
     setInternalIsEditing(false);
   }
 };


 /**
  * Custom Tag Component
  * Displays a tag with optional remove functionality
  */
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
         title="Remove tag"
       >
         ×
       </Box>
     )}
   </Box>
 );


 /**
  * Format file size from bytes to human readable format
  * @param bytes - File size in bytes
  * @returns Formatted file size string
  */
 const formatFileSize = (bytes: number) => {
   if (bytes === 0) return '0 Bytes';
   const k = 1024;
   const sizes = ['Bytes', 'KB', 'MB', 'GB'];
   const i = Math.floor(Math.log(bytes) / Math.log(k));
   return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
 };


 // Edit Mode UI
 if (isEditing) {
   return (
     <VStack gap={6} align="stretch">


       {/* Change Image Button */}
       <Box>
         <Text fontSize="sm" fontWeight="medium" mb={2}>Update New File</Text>
         <Button
           onClick={onImageModalOpen}
           bg="gray.100"
           color="black"
           border="2px solid"
           size="sm"
           borderColor="gray.300"
           width="full"
         >
           <ImageIcon style={{ marginRight: '8px' }} />
           Choose File
         </Button>
       </Box>


       {/* Save message display */}
       {saveMessage && (
         <Box
           mt={2}
           py={1}                     
           px={3}
           borderRadius="md"
           bg={saveMessage.type === 'success' ? 'green.50' : 'red.50'}
           borderColor={saveMessage.type === 'success' ? 'green.200' : 'red.200'}
           borderWidth="1px"
           textAlign="center"
         >
           <Text
             color={saveMessage.type === 'success' ? 'green.800' : 'red.800'}
             fontSize="sm"
           >
             {saveMessage.message}
           </Text>
         </Box>
       )}


       {/* Main Edit Form */}
       <Box>
         <VStack gap={4} align="stretch">
           {/* Title Field */}
           <Box>
             <Text fontSize="sm" fontWeight="medium" mb={2}>Title</Text>
             <Input
               value={editedTitle}
               onChange={(e) => setEditedTitle(e.target.value)}
               placeholder="Enter asset title..."
               size="sm" 
               py={1}    
               borderColor={editedTitle.trim() === '' && editedTitle !== '' ? 'orange.300' : 'gray.200'}
               _focus={{
                 borderColor: editedTitle.trim() === '' && editedTitle !== '' ? 'orange.300' : 'blue.500',
                 boxShadow: editedTitle.trim() === '' && editedTitle !== '' ? '0 0 0 1px orange.300' : '0 0 0 1px blue.500'
               }}
             />


             {editedTitle.trim() === '' && editedTitle !== '' && (
               <Text fontSize="xs" color="orange.500" mt={1}>
                 ⚠️ You've entered only spaces. Please enter a meaningful title.
               </Text>
             )}
           </Box>


           {/* Description Field */}
           <Box>
             <Text fontSize="sm" fontWeight="medium" mb={2}>
               Description (Optional)
             </Text>
             <Textarea
               value={editedDescription}
               onChange={(e) => setEditedDescription(e.target.value)}
               placeholder="Enter description if applicable..."
               rows={4}
             />


             {editedDescription.trim() === '' && editedDescription !== '' && (
               <Text fontSize="xs" color="orange.500" mt={1}>
                 Note: Only spaces entered. This will be saved as empty.
               </Text>
             )}
           </Box>


           {/* Tags Section */}
           <Box>
             <Text fontSize="sm" fontWeight="medium" mb={2}>Tags</Text>
             <VStack gap={2} align="stretch">
               <HStack flexWrap="wrap" gap={2}>
                 {editedTags.map((tag, index) => (
                   <CustomTag key={index} onClose={() => handleRemoveTag(tag)}>
                     {tag.toUpperCase()}
                   </CustomTag>
                 ))}
               </HStack>


               <Box>
                 <Input
                   value={newTag}
                   onChange={(e) => setNewTag(e.target.value.toUpperCase())}
                   onKeyPress={handleTagKeyPress}
                   placeholder="Enter new tag and press Enter..."
                   size="sm"
                   borderColor={newTag.trim() && validateTag(newTag) ? 'red.300' : 'gray.200'}
                   _focus={{
                     borderColor: newTag.trim() && validateTag(newTag) ? 'red.300' : 'blue.500',
                   }}
                 />


                 {newTag.trim() && validateTag(newTag) && (
                   <Text fontSize="xs" color="red.500" mt={1}>
                     ⚠️ {validateTag(newTag)}
                   </Text>
                 )}


                 <Button
                   size="sm"
                   onClick={handleAddTag}
                   mt={2}
                   width="full"
                   disabled={!newTag.trim() || !!validateTag(newTag)}
                 >
                   <AddIcon style={{ marginRight: '8px' }} />
                   Add Tag
                 </Button>
               </Box>
             </VStack>
           </Box>


           {/* Custom Fields Section */}
           <Box>
             <Text fontSize="sm" fontWeight="medium" mb={2}>Custom Fields</Text>
             <VStack gap={3} align="stretch">
               {customFields.map((field) => (
                 <HStack key={field.id} gap={2}>
                   <Input
                     value={field.key}
                     onChange={(e) => handleUpdateCustomField(field.id, { key: e.target.value })}
                     placeholder="Field name"
                     size="sm"
                   />
                   <Input
                     value={field.value}
                     onChange={(e) => handleUpdateCustomField(field.id, { value: e.target.value })}
                     placeholder="Field value"
                     size="sm"
                   />
                   <IconButton
                     aria-label="Remove field"
                     size="sm"
                     onClick={() => handleRemoveCustomField(field.id)}
                     colorScheme="red"
                     variant="ghost"
                   >
                     <DeleteIcon />
                   </IconButton>
                 </HStack>
               ))}


               {/* Add New Field Section */}
               <Box p={3} border="1px dashed" borderColor="gray.300" borderRadius="md">
                 <Text fontSize="sm" color="gray.600" mb={2}>Add New Field</Text>
                 <HStack gap={2}>
                   <Input
                     value={newCustomField.key}
                     onChange={(e) => setNewCustomField(prev => ({ ...prev, key: e.target.value }))}
                     onKeyPress={handleCustomFieldKeyPress}
                     placeholder="Field name"
                     size="sm"
                   />
                   <Input
                     value={newCustomField.value}
                     onChange={(e) => setNewCustomField(prev => ({ ...prev, value: e.target.value }))}
                     onKeyPress={handleCustomFieldKeyPress}
                     placeholder="Field value"
                     size="sm"
                   />
                   <Button
                     size="sm"
                     onClick={handleAddCustomField}
                     colorScheme="blue"
                   >
                     <AddIcon />
                   </Button>
                 </HStack>
               </Box>
             </VStack>
           </Box>


           {/* Action Buttons */}
           <HStack pt={2}>
             <Button
               colorScheme="blue"
               onClick={handleSaveMain}
               loading={isSaving}
             >
               {isSaving ? 'Saving...' : 'Save'}
             </Button>
             <Button
               variant="ghost"
               onClick={handleCancelMain}
               disabled={isSaving}
             >
               Cancel
             </Button>
           </HStack>
         </VStack>
       </Box>


       {/* Image Update Modal */}
       <Dialog.Root open={isImageModalOpen} onOpenChange={(open) => !open && onImageModalClose()}>
         <Dialog.Backdrop />
         <Dialog.Positioner>
           <Dialog.Content maxWidth="lg">
             <Dialog.Header>
               <Dialog.Title>Update New File</Dialog.Title>
             </Dialog.Header>


             <Dialog.Body>
               <VStack gap={4} align="stretch">
                 <Text fontSize="sm" color="gray.600">
                   Upload a new file for this asset. This will replace the current file.
                 </Text>


                 {/* Dropzone Area */}
                 <Box
                   {...getImageRootProps()}
                   p={8}
                   border="2px dashed"
                   borderColor={isImageDragActive ? 'blue.400' : 'gray.300'}
                   borderRadius="lg"
                   bg={isImageDragActive ? 'blue.50' : 'gray.50'}
                   textAlign="center"
                   cursor="pointer"
                   transition="all 0.2s"
                 >
                   <input {...getImageInputProps()} />
                   <Text fontSize="lg" mb={2}>
                     {isImageDragActive ? 'Drop image here' : 'Drag & drop new image here'}
                   </Text>
                   <Text fontSize="sm" color="gray.600">
                     or click to select file
                   </Text>
                   <Text fontSize="xs" color="gray.500" mt={2}>
                     Supported: Image, Video, Document and 3D Model
                   </Text>
                 </Box>


                 {/* Selected File Preview */}
                 {newImageFile && (
                   <Box p={3} bg="blue.50" borderRadius="md">
                     <HStack justify="space-between">
                       <HStack>
                         <Text fontWeight="medium">{newImageFile.name}</Text>
                         <Badge colorScheme="blue">
                           {formatFileSize(newImageFile.size)}
                         </Badge>
                       </HStack>
                       <Button size="sm" variant="ghost" onClick={() => setNewImageFile(null)}>
                         Remove
                       </Button>
                     </HStack>
                   </Box>
                 )}


                 {/* Upload Progress */}
                 {isUploadingImage && (
                   <Box>
                     <Text fontSize="sm" mb={2}>Uploading... {uploadProgress}%</Text>
                     <Progress.Root value={uploadProgress} size="sm">
                       <Progress.Track>
                         <Progress.Range />
                       </Progress.Track>
                     </Progress.Root>
                   </Box>
                 )}
               </VStack>
             </Dialog.Body>


             <Dialog.Footer>
               <Button variant="ghost" onClick={onImageModalClose} mr={3}>
                 Cancel
               </Button>
               <Button
                 colorScheme="blue"
                 onClick={handleUploadNewImage}
                 disabled={!newImageFile || isUploadingImage}
                 loading={isUploadingImage}
               >
                 Save
               </Button>
             </Dialog.Footer>
           </Dialog.Content>
         </Dialog.Positioner>
       </Dialog.Root>
     </VStack>
   );
 }


 // View Mode UI (Read-only)
 return (
   <VStack gap={3} align="stretch">
     <Box>
       <Text fontSize="sm" color="gray.600" mb={1}>Title</Text>
       <Text fontWeight="medium">{asset.title}</Text>
     </Box>


     {asset.description && (
       <Box>
         <Text fontSize="sm" color="gray.600" mb={1}>Description</Text>
         <Text>{asset.description}</Text>
       </Box>
     )}


     <Box>
       <Text fontSize="sm" color="gray.600" mb={1}>Tags</Text>
       {editedTags.length > 0 ? (
         <HStack flexWrap="wrap" gap={2}>
           {editedTags.map((tag, index) => (
             <CustomTag key={index}>
               {tag}
             </CustomTag>
           ))}
         </HStack>
       ) : (
         <Text fontSize="sm" color="gray.500">No tags</Text>
       )}
     </Box>


     {/* Custom Fields Display */}
     {customFields.length > 0 && (
       <Box>
         <Text fontSize="sm" color="gray.600" mb={1}>Custom Fields</Text>
         <VStack gap={2} align="stretch">
           {customFields.map((field) => (
             <Box key={field.id} display="flex" justifyContent="space-between" alignItems="center">
               <Text fontSize="sm" fontWeight="medium" minW="120px">{field.key}:</Text>
               <Text fontSize="sm" flex="1" ml={2}>{field.value}</Text>
             </Box>
           ))}
         </VStack>
       </Box>
     )}


     {/* Edit Button (if user has permission) */}
     {canEdit() && (
       <Button
         variant="outline"
         onClick={() => {
           if (onEditToggle) {
             onEditToggle(true);
           } else {
             setInternalIsEditing(true);
           }
         }}
         mt={4}
       >
         Edit
       </Button>
     )}
   </VStack>
 );
}


/**
* Mock authentication hook
* In a real application, this would check user permissions
*/
const useAuth = () => {
 return {
   canEdit: () => true
 };
};
