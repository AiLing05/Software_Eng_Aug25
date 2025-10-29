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


// Icon components
const AddIcon = (props: any) => (
 <svg width="12" height="12" viewBox="0 0 12 12" fill="none" {...props}>
   <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
 </svg>
);


const DeleteIcon = (props: any) => (
 <svg width="16" height="16" viewBox="0 0 16 16" fill="none" {...props}>
   <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
 </svg>
);


const ImageIcon = (props: any) => (
 <svg width="16" height="16" viewBox="0 0 16 16" fill="none" {...props}>
   <path d="M14 2H2C1.44772 2 1 2.44772 1 3V13C1 13.5523 1.44772 14 2 14H14C14.5523 14 15 13.5523 15 13V3C15 2.44772 14.5523 2 14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
   <path d="M5.5 7C6.05228 7 6.5 6.55228 6.5 6C6.5 5.44772 6.05228 5 5.5 5C4.94772 5 4.5 5.44772 4.5 6C4.5 6.55228 4.94772 7 5.5 7Z" fill="currentColor"/>
   <path d="M15 10L11 6L2 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
 </svg>
);


export default function AssetMetadata({
 asset,
 isEditing: externalIsEditing,
 onEditToggle,
 onSave,
 onUpdateAsset,
 onImageUpdate
}: AssetMetadataProps) {
 const { canEdit } = useAuth();
  // Use external editing state if provided; otherwise use internal
 const [internalIsEditing, setInternalIsEditing] = useState(false);
 const isEditing = externalIsEditing !== undefined ? externalIsEditing : internalIsEditing;
  // Main info edit state
 const [editedTitle, setEditedTitle] = useState(asset.title);
 const [editedDescription, setEditedDescription] = useState(asset.description || '');
 const [editedTags, setEditedTags] = useState<string[]>([]);
 const [newTag, setNewTag] = useState('');
 const [isSaving, setIsSaving] = useState(false);
 const [saveMessage, setSaveMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);
  // Custom fields state
 const [customFields, setCustomFields] = useState<MetadataField[]>([]);
 const [newCustomField, setNewCustomField] = useState({ key: '', value: '' });


 // Image update state - Chakra UI v3 useDisclosure
 const { open: isImageModalOpen, onOpen: onImageModalOpen, onClose: onImageModalClose } = useDisclosure();
 const [newImageFile, setNewImageFile] = useState<File | null>(null);
 const [isUploadingImage, setIsUploadingImage] = useState(false);
 const [uploadProgress, setUploadProgress] = useState(0);


 // Initialize tags from asset
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
   console.log('🔍 DEBUG - Full asset metadata structure:', asset.metadata);
  
   if (asset.metadata && Array.isArray(asset.metadata)) {
     const fields: MetadataField[] = [];
    
     asset.metadata.forEach((item: any, index: number) => {
       console.log(`🔍 DEBUG - metadata:`, item);
      
       if (item && typeof item === 'object' && item.key && item.value !== undefined) {
         const fieldId = item.id ? `field-${item.id}` : `field-${index}-${Date.now()}`;
        
         fields.push({
           id: fieldId,
           key: item.key,
           value: String(item.value)
         });
       }
     });
    
     console.log('Initialize custom fields:', fields);
     setCustomFields(fields);
   } else {
     console.log('No custom found metadata');
     setCustomFields([]);
   }
 }, [asset.metadata]);


 // Sync internal editing state with external
 useEffect(() => {
   if (externalIsEditing !== undefined) {
     setInternalIsEditing(externalIsEditing);
   }
 }, [externalIsEditing]);


 
 useEffect(() => {
   if (saveMessage) {
     const timer = setTimeout(() => {
       setSaveMessage(null);
     }, 3000);
     return () => clearTimeout(timer);
   }
 }, [saveMessage]);


 // Dropzone for image upload
 const { getRootProps: getImageRootProps, getInputProps: getImageInputProps, isDragActive: isImageDragActive } = useDropzone({
   onDrop: (acceptedFiles) => {
     if (acceptedFiles.length > 0) {
       setNewImageFile(acceptedFiles[0]);
     }
   },
   accept: {
     'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp']
   },
   maxFiles: 1
 });


 // Upload new image
 const handleUploadNewImage = async () => {
   if (!newImageFile) return;


   setIsUploadingImage(true);
   setUploadProgress(0);


   const formData = new FormData();
   formData.append('image', newImageFile);
   formData.append('asset_id', asset.id.toString());


   try {
     const response = await axios.post(`/assets/${asset.id}/update-image/`, formData, {
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


     const updatedAsset = response.data.asset;
     console.log('New image uploaded successfully:', updatedAsset);


     // Update parent component with new asset data
     if (onUpdateAsset) {
       onUpdateAsset(updatedAsset);
     }


     // Update image in parent component
     if (onImageUpdate) {
       onImageUpdate(updatedAsset.file_url || updatedAsset.image_url);
     }


     // Reset and close modal
     setNewImageFile(null);
     setUploadProgress(0);
     onImageModalClose();


     setSaveMessage({
       type: 'success',
       message: 'Image updated successfully'
     });


   } catch (error: any) {
     console.error('Failed to upload new image:', error);
     setSaveMessage({
       type: 'error',
       message: 'Failed to update image'
     });
   } finally {
     setIsUploadingImage(false);
   }
 };


 // Add tag
 const handleAddTag = () => {
   if (newTag.trim() && !editedTags.includes(newTag.trim().toUpperCase())) {
     setEditedTags(prev => [...prev, newTag.trim().toUpperCase()]);
     setNewTag('');
   }
 };


 // Remove tag
 const handleRemoveTag = (tagToRemove: string) => {
   setEditedTags(prev => prev.filter(tag => tag !== tagToRemove));
 };


 // Handle Enter key for adding tag
 const handleTagKeyPress = (e: React.KeyboardEvent) => {
   if (e.key === 'Enter') {
     e.preventDefault();
     handleAddTag();
   }
 };


 // Custom fields functions
 const handleAddCustomField = () => {
   console.log('newCustomField:', newCustomField);
  
   if (newCustomField.key.trim() && newCustomField.value.trim()) {
     const newField: MetadataField = {
       id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
       key: newCustomField.key.trim(),
       value: newCustomField.value.trim()
     };
    
     console.log(' Create a new field:', newField);
    
     setCustomFields(prev => {
       const updatedFields = [...prev, newField];
       console.log('List of updated fields:', updatedFields);
       return updatedFields;
     });
    
     setNewCustomField({ key: '', value: '' });
     console.log('The field added is complete，clear input box');
   } else {
     console.log('The key field or value is empty');
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


 // Save main info
 const handleSaveMain = async () => {
   setIsSaving(true);
   setSaveMessage(null);
  
   try {
     const tagIds = await getOrCreateTagIds(editedTags);
    
     const metadataObj: Record<string, string> = {};
     customFields.forEach(field => {
       if (field.key.trim() && field.value.trim()) {
         metadataObj[field.key.trim()] = field.value.trim();
       }
     });


     const updatedData = {
       title: editedTitle,
       description: editedDescription,
       tag_ids: tagIds,  
       metadata: metadataObj
     };


     console.log('AssetMetadata: Saving data to Django:', updatedData);
     console.log('Tag IDs to update:', tagIds);
    
     let success = false;
    
     if (onSave) {
       success = await onSave(updatedData);
     } else {
       success = await saveToBackend(updatedData);
     }
    
     if (success) {
       setSaveMessage({
         type: 'success',
         message: 'Asset metadata updated successfully'
       });
      
       console.log('Save successful');
      
       if (onEditToggle) {
         onEditToggle(false);
       } else {
         setInternalIsEditing(false);
       }
      
     } else {
       throw new Error('Save failed');
     }
    
   } catch (error) {
     console.error('AssetMetadata: Save failed:', error);
     setSaveMessage({
       type: 'error',
       message: 'Failed to update asset metadata'
     });
   } finally {
     setIsSaving(false);
   }
 };


 const getOrCreateTagIds = async (tagNames: string[]): Promise<number[]> => {
   console.log('Tags to process:', tagNames);
  
   if (tagNames.length === 0) return [];
  
   const tagIds: number[] = [];
  
   try {
     const searchResponse = await axios.get('/tags/');
     const allTags = searchResponse.data.results || searchResponse.data || [];
     console.log('All available tags:', allTags);
    
     for (const tagName of tagNames) {
       const cleanName = tagName.trim().toLowerCase();
      
       if (!cleanName) continue;
      
       const existingTag = allTags.find((t: any) =>
         t.name.toLowerCase() === cleanName
       );
      
       if (existingTag) {
         console.log(`Found existing tag: "${cleanName}" (ID: ${existingTag.id})`);
         tagIds.push(existingTag.id);
       } else {
         console.warn(`Tag "${cleanName}" does not exist. Please create it first in the database.`);
       }
     }
   } catch (error: any) {
     console.error('❌ Error fetching tags:', error.message);
   }
  
   console.log('Final tag IDs to update:', tagIds);
   return tagIds;
 };


 const saveToBackend = async (data: any): Promise<boolean> => {
   try {
     console.log('🔧 Sending PATCH request to:', `/assets/${asset.id}/`);
     console.log('🔧 Request data:', JSON.stringify(data, null, 2));
    
     const response = await axios.patch(`/assets/${asset.id}/`, data, {
       headers: {
         'Content-Type': 'application/json',
       },
     });


     const updatedAsset = response.data;
     console.log(' AssetMetadata: Backend response:', updatedAsset);
     console.log('Updated tags:', updatedAsset.tags);
    
     if (onUpdateAsset) {
       onUpdateAsset(updatedAsset);
     }
    
     return true;
   } catch (error: any) {
     console.error('AssetMetadata: Save to backend failed:', error);
    
     if (error.response) {
       console.error('Backend error response:', error.response.data);
       console.error('Backend error status:', error.response.status);
     }
    
     return false;
   }
 };


 // Cancel editing
 const handleCancelMain = () => {
   setEditedTitle(asset.title);
   setEditedDescription(asset.description || '');
  
   if (asset.tags && asset.tags.length > 0) {
     const tagNames = asset.tags.map((tag: any) =>
       typeof tag === 'string' ? tag : tag.name
     );
     setEditedTags(tagNames);
   } else {
     setEditedTags([]);
   }
  
   // Reset custom fields
   if (asset.metadata && typeof asset.metadata === 'object') {
     const fields: MetadataField[] = [];
     Object.entries(asset.metadata).forEach(([key, value]) => {
       if (!['title', 'description', 'tags', 'file_type', 'created_at', 'updated_at'].includes(key)) {
         fields.push({
           id: `field-${key}-${Date.now()}`,
           key,
           value: String(value)
         });
       }
     });
     setCustomFields(fields);
   } else {
     setCustomFields([]);
   }
  
   if (onEditToggle) {
     onEditToggle(false);
   } else {
     setInternalIsEditing(false);
   }
 };


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
         title="Remove tag"
       >
         ×
       </Box>
     )}
   </Box>
 );


 // Format file size
 const formatFileSize = (bytes: number) => {
   if (bytes === 0) return '0 Bytes';
   const k = 1024;
   const sizes = ['Bytes', 'KB', 'MB', 'GB'];
   const i = Math.floor(Math.log(bytes) / Math.log(k));
   return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
 };


 // Edit mode form
 if (isEditing) {
   return (
     <VStack gap={6} align="stretch">
       {saveMessage && (
         <Box
           p={3}
           borderRadius="md"
           bg={saveMessage.type === 'success' ? 'green.50' : 'red.50'}
           borderColor={saveMessage.type === 'success' ? 'green.200' : 'red.200'}
           borderWidth="1px"
         >
           <Text
             color={saveMessage.type === 'success' ? 'green.800' : 'red.800'}
             fontSize="sm"
           >
             {saveMessage.message}
           </Text>
         </Box>
       )}


       {/* Change Image Button */}
       <Box>
         <Text fontSize="sm" fontWeight="medium" mb={2}>Update Asset</Text>
         <Button
           colorScheme="blue"
           variant="outline"
           onClick={onImageModalOpen}
           width="full"
         >
           <ImageIcon style={{ marginRight: '8px' }} />
           Choose Asset
         </Button>
       </Box>


       <Box>
         <VStack gap={4} align="stretch">
           <Box>
             <Text fontSize="sm" fontWeight="medium" mb={2}>Title</Text>
             <Input
               value={editedTitle}
               onChange={(e) => setEditedTitle(e.target.value)}
               placeholder="Enter asset title..."
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


           <Box>
             <Text fontSize="sm" fontWeight="medium" mb={2}>
               Description (If has)
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
                 />
                 <Button
                   size="sm"
                   onClick={handleAddTag}
                   mt={2}
                   width="full"
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


       {/* Update Image Dialog - Chakra UI v3 Dialog */}
       <Dialog.Root open={isImageModalOpen} onOpenChange={onImageModalClose}>
         <Dialog.Backdrop />
         <Dialog.Positioner>
           <Dialog.Content maxWidth="lg">
             <Dialog.Header>
               <Dialog.Title>Update Asset Image</Dialog.Title>
               <Dialog.CloseTrigger />
             </Dialog.Header>


             <Dialog.Body>
               <VStack gap={4} align="stretch">
                 <Text fontSize="sm" color="gray.600">
                   Upload a new image for this asset. This will replace the current image.
                 </Text>
                
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
                     or click to select image
                   </Text>
                   <Text fontSize="xs" color="gray.500" mt={2}>
                     Supported: JPG, JPEG, PNG, GIF, WEBP
                   </Text>
                 </Box>


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
                 Update Image
               </Button>
             </Dialog.Footer>
           </Dialog.Content>
         </Dialog.Positioner>
       </Dialog.Root>
     </VStack>
   );
 }


 // View mode
 return (
   <VStack gap={3} align="stretch">
     <Box>
       <Text fontSize="sm" color="gray.600" mb={1}>Title</Text>
       <Text fontWeight="medium">{asset.title}</Text>
     </Box>
    
     <Box>
       <Text fontSize="sm" fontWeight="medium" mb={2}>
         Description (If has)
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
   </VStack>
 );
}


const useAuth = () => {
 return {
   canEdit: () => true
 };
};
