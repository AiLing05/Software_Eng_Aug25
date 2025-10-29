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
 DialogRoot,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogBody,
 DialogFooter,
 DialogCloseTrigger
} from '@chakra-ui/react';
import axios from '@/lib/api/axios';
import CustomFieldsManager, { MetadataField } from '@/components/assets/CustomFieldsManager';


//Component property interface
interface AssetMetadataProps {
 asset: Asset;
 isEditing?: boolean;          
 onEditToggle?: (editing: boolean) => void;
 onSave?: (data: any) => Promise<boolean>;
 onUpdateAsset?: (asset: Asset) => void;
 onImageUpdate?: (newImageUrl: string) => void;
}


// Icon components
const AddIcon = () => (
 <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
   <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
 </svg>
);


const ImageIcon = () => (
 <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
   <path d="M14 2H2C1.44772 2 1 2.44772 1 3V13C1 13.5523 1.44772 14 2 14H14C14.5523 14 15 13.5523 15 13V3C15 2.44772 14.5523 2 14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
   <path d="M5.5 7C6.05228 7 6.5 6.55228 6.5 6C6.5 5.44772 6.05228 5 5.5 5C4.94772 5 4.5 5.44772 4.5 6C4.5 6.55228 4.94772 7 5.5 7Z" fill="currentColor"/>
   <path d="M15 10L11 6L2 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
 </svg>
);


// Custom Progress component
const CustomProgress = ({ value, size, ...props }: any) => (
 <Box
   width="full"
   bg="gray.200"
   borderRadius="full"
   overflow="hidden"
   height={size === 'sm' ? '2' : '3'}
   {...props}
 >
   <Box
     height="full"
     bg="blue.500"
     borderRadius="full"
     transition="width 0.3s"
     width={`${value}%`}
   />
 </Box>
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
  // Add verification status
 const [descriptionError, setDescriptionError] = useState('');


 // Custom fields state
 const [customFields, setCustomFields] = useState<MetadataField[]>([]);


 // File update state
 const { open: isFileModalOpen, onOpen: onFileModalOpen, onClose: onFileModalClose } = useDisclosure();
 const [newFile, setNewFile] = useState<File | null>(null);
 const [isUploadingFile, setIsUploadingFile] = useState(false);
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
   if (asset.metadata && typeof asset.metadata === 'object') {
     const fields: MetadataField[] = [];
     Object.entries(asset.metadata).forEach(([key, value]) => {
       // Skip system fields or fields that are already handled elsewhere
       if (!['title', 'description', 'tags', 'file_type', 'created_at', 'updated_at'].includes(key)) {
         fields.push({
           id: `field-${key}-${Date.now()}`,
           key,
           value: String(value)
         });
       }
     });
     console.log('Initializing custom fields from asset metadata:', fields);
     setCustomFields(fields);
   } else {
     console.log('No custom metadata found in asset');
     setCustomFields([]);
   }
 }, [asset.metadata]);


 // Sync internal editing state with external
 useEffect(() => {
   if (externalIsEditing !== undefined) {
     setInternalIsEditing(externalIsEditing);
   }
 }, [externalIsEditing]);


 // Clear Save Message
 useEffect(() => {
   if (saveMessage) {
     const timer = setTimeout(() => {
       setSaveMessage(null);
     }, 3000);
     return () => clearTimeout(timer);
   }
 }, [saveMessage]);


 // Handle file selection
 const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
   if (e.target.files && e.target.files[0]) {
     const file = e.target.files[0];
     setNewFile(file);
     // Auto-set title to file name if title is empty
     if (!editedTitle) {
       setEditedTitle(file.name);
     }
   }
 };


 // Upload new file
 const handleUploadNewFile = async () => {
   if (!newFile) return;


   setIsUploadingFile(true);
   setUploadProgress(0);


   const formData = new FormData();
   formData.append('file', newFile);
   formData.append('asset_id', asset.id.toString());


   try {
     const response = await axios.post(`/assets/${asset.id}/update-file/`, formData, {
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
     console.log('New file uploaded successfully:', updatedAsset);


     // Update parent component with new asset data
     if (onUpdateAsset) {
       onUpdateAsset(updatedAsset);
     }


     // Update file in parent component
     if (onImageUpdate) {
       onImageUpdate(updatedAsset.file_url || updatedAsset.image_url);
     }


     // Reset and close modal
     setNewFile(null);
     setUploadProgress(0);
     onFileModalClose();


     setSaveMessage({
       type: 'success',
       message: 'File updated successfully'
     });


   } catch (error: any) {
     console.error('Failed to upload new file:', error);
     setSaveMessage({
       type: 'error',
       message: 'Failed to update file'
     });
   } finally {
     setIsUploadingFile(false);
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


 // Save main info - Include custom fields
 const handleSaveMain = async () => {
   setIsSaving(true);
   setSaveMessage(null);
  
   try {
     // Get or create tag and get the tag ID array
     const tagIds = await getOrCreateTagIds(editedTags);
    
     // Constructing a custom field object
     const metadataObj: Record<string, string> = {};
     customFields.forEach(field => {
       if (field.key.trim() && field.value.trim()) {
         metadataObj[field.key.trim()] = field.value.trim();
       }
     });

     // Automatic processing: if there are only spaces, convert them to empty strings
     const finalDescription = editedDescription.trim() === '' ? '' : editedDescription;

     // Send data, including custom fields
     const updatedData = {
       title: editedTitle,
       description: editedDescription.trim(),
       tag_ids: tagIds,
       metadata: metadataObj
     };

     console.log('AssetMetadata: Saving data to Django:', updatedData);
     console.log('Custom fields to save:', metadataObj);
    
     let success = false;
     let updatedAsset: Asset | null = null;
    
     if (onSave) {
       success = await onSave(updatedData);
     } else {
       success = await saveToBackend(updatedData);
 
       updatedAsset = await fetchUpdatedAsset();
     }
    
     if (success) {
       setSaveMessage({
         type: 'success',
         message: 'Asset metadata updated successfully'
       });
      
       console.log('Save successful');
      
       if (updatedAsset && onUpdateAsset) {
         onUpdateAsset(updatedAsset);
       }
      
       await refreshTagsDisplay();
      
       // Automatically exit edit mode after successful saving
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

 const fetchUpdatedAsset = async (): Promise<Asset> => {
   try {
     const response = await axios.get(`/assets/${asset.id}/`);
     console.log('Fetched updated asset:', response.data);
     return response.data;
   } catch (error) {
     console.error('Failed to fetch updated asset:', error);
     return asset; 
   }
 };

 const refreshTagsDisplay = async () => {
   try {
     const response = await axios.get(`/assets/${asset.id}/`);
     const updatedAsset = response.data;
    
     if (updatedAsset.tags && updatedAsset.tags.length > 0) {
       const tagNames = updatedAsset.tags.map((tag: any) =>
         typeof tag === 'string' ? tag : tag.name
       );
       console.log('Refreshed tags from server:', tagNames);
       setEditedTags(tagNames);
     } else {
       console.log('No tags found after refresh');
       setEditedTags([]);
     }
   } catch (error) {
     console.error('Failed to refresh tags:', error);
   }
 };

 const getOrCreateTagIds = async (tagNames: string[]): Promise<number[]> => {
   console.log('Starting tag processing for:', tagNames);
  
   if (tagNames.length === 0) {
     console.log('No tags to process');
     return [];
   }
  
   const tagIds: number[] = [];
   const uniqueTagNames = [...new Set(tagNames.map(name => name.trim().toLowerCase()))];
  
   console.log('Unique tag names:', uniqueTagNames);
  
   for (const [index, tagName] of uniqueTagNames.entries()) {
     console.log(`\nProcessing tag ${index + 1}/${uniqueTagNames.length}: "${tagName}"`);
    
     try {

       console.log(`Searching for existing tag: "${tagName}"`);
       const searchResponse = await axios.get('/tags/', {
         params: { search: tagName, exact_match: true }
       });
      
       const tags = searchResponse.data.results || searchResponse.data || [];
       console.log(`Search results:`, tags);
      
       const existingTag = tags.find((t: any) => t.name.toLowerCase() === tagName);
      
       if (existingTag) {
         console.log(`Found existing tag: ${existingTag.name} (ID: ${existingTag.id})`);
         tagIds.push(existingTag.id);
         continue;
       }
      
       console.log(`Creating new tag: "${tagName}"`);
       try {
         const createResponse = await axios.post('/tags/', { name: tagName });
         console.log(`Created new tag:`, createResponse.data);
         tagIds.push(createResponse.data.id);
       } catch (createError: any) {
         console.error(`Failed to create tag "${tagName}":`, createError.response?.data);


       }
      
     } catch (error: any) {
       console.error(`Error processing tag "${tagName}":`, error.message);
     }
   }
  
   console.log(`Final tag IDs:`, tagIds);
   return tagIds;
 };

 const saveToBackend = async (data: any): Promise<boolean> => {
   try {
     console.log('[1] Starting saveToBackend with data:', data);
    
     const response = await axios.patch(`/assets/${asset.id}/`, data);
     const updatedAsset = response.data;
    
     console.log('[2] Backend response received');
     console.log('[3] Tags in response:', updatedAsset.tags);
     console.log('[4] Full response:', updatedAsset);
    


     if (updatedAsset.tags && Array.isArray(updatedAsset.tags)) {
       const newTags = updatedAsset.tags.map((tag: any) => {
         const tagName = tag?.name || tag;
         console.log('Processing tag:', tag, '->', tagName);
         return tagName;
       });
      
       console.log('[5] Final tag names to set:', newTags);
       setEditedTags(newTags);
       console.log('[6] editedTags should be updated to:', newTags);
     } else {
       console.log('No tags found in response');
       setEditedTags([]);
     }
    
     if (onUpdateAsset) {
       console.log('[7] Calling onUpdateAsset');
       onUpdateAsset(updatedAsset);
     }
    
     return true;
   } catch (error) {
     console.error('Save failed:', error);
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

 // Update File Dialog
 const UpdateFileDialog = () => (
   <DialogRoot open={isFileModalOpen} onOpenChange={onFileModalClose}>
     <DialogContent maxW="lg">
       <DialogHeader>
         <DialogTitle>Update New File</DialogTitle>
         <DialogCloseTrigger />
       </DialogHeader>


       <DialogBody>
         <VStack gap={4} align="stretch">
           <Text fontSize="sm" color="gray.600">
             Upload a new file for this asset. This will replace the current file.
           </Text>
          
           {/* File input for new file */}
           <Box>
             <Text fontSize="sm" fontWeight="medium" mb={2}>Select New File</Text>
             <Input
               type="file"
               onChange={handleFileSelect}
               accept="*/*"
             />
           </Box>


           {/* Selected file info */}
           {newFile && (
             <Box p={3} bg="blue.50" borderRadius="md">
               <HStack justify="space-between">
                 <HStack>
                   <Text fontWeight="medium">{newFile.name}</Text>
                   <Badge colorScheme="blue">
                     {formatFileSize(newFile.size)}
                   </Badge>
                 </HStack>
                 <Button size="sm" variant="ghost" onClick={() => setNewFile(null)}>
                   Remove
                 </Button>
               </HStack>
             </Box>
           )}


           {/* Upload progress */}
           {isUploadingFile && (
             <Box>
               <Text fontSize="sm" mb={2}>Uploading... {uploadProgress}%</Text>
               <CustomProgress value={uploadProgress} size="sm" />
             </Box>
           )}
         </VStack>
       </DialogBody>


       <DialogFooter>
         <Button variant="ghost" onClick={onFileModalClose} mr={3}>
           Cancel
         </Button>
         <Button
           colorScheme="blue"
           onClick={handleUploadNewFile}
           disabled={!newFile || isUploadingFile}
         >
           {isUploadingFile ? 'Uploading...' : 'Update File'}
         </Button>
       </DialogFooter>
     </DialogContent>
   </DialogRoot>
 );


 // Edit mode form
 if (isEditing) {
   return (
     <VStack gap={6} align="stretch">
       {/* Save message display */}
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


       {/* Update File Button */}
       <Box>
         <Text fontSize="sm" fontWeight="medium" mb={2}>Update New File</Text>
         <Button
           colorScheme="blue"
           variant="outline"
           onClick={onFileModalOpen}
           width="full"
         >
           <HStack gap={2}>
             <Box as="span" display="flex" alignItems="center">
               <ImageIcon />
             </Box>
             <Text>Choose New File</Text>
           </HStack>
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
             />
           </Box>


           <Box>
             <Text fontSize="sm" fontWeight="medium" mb={2}>
               Description (If has)
             </Text>
             <Textarea
               value={editedDescription}
               onChange={(e) => setEditedDescription(e.target.value)}
               placeholder="Enter asset description (optional)..."
               rows={4}
             />
            
             {/* Only show a gentle reminder when the user enters a space */}
             {editedDescription.trim() === '' && editedDescription !== '' && (
               <Text fontSize="xs" color="orange.500" mt={1}>
                 Note: You've entered only spaces. This will be saved as an empty description.
               </Text>
             )}
           </Box>
           <Box>
             <Text fontSize="sm" fontWeight="medium" mb={2}>Tags</Text>
             <VStack gap={2} align="stretch">
               {/* Existing tags */}
               <HStack flexWrap="wrap" gap={2}>
                 {editedTags.map((tag, index) => (
                   <CustomTag key={index} onClose={() => handleRemoveTag(tag)}>
                     {tag.toUpperCase()}
                   </CustomTag>
                 ))}
               </HStack>
              
               {/* Add new tag */}
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
                   <HStack gap={2}>
                     <Box as="span" display="flex" alignItems="center">
                       <AddIcon />
                     </Box>
                     <Text>Add Tag</Text>
                   </HStack>
                 </Button>
               </Box>
             </VStack>
           </Box>


           {/* Custom Fields Section */}
           <CustomFieldsManager
             customFields={customFields}
             onCustomFieldsChange={setCustomFields}
           />


           <HStack pt={2}>
             <Button
               colorScheme="blue"
               onClick={handleSaveMain}
               disabled={isSaving}
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


       {/* Update File Dialog */}
       <UpdateFileDialog />
     </VStack>
   );
 }


 // View mode - show basic info and custom fields
 return (
   <VStack gap={3} align="stretch">
     <Box>
       <Text fontSize="sm" color="gray.600" mb={1}>Title</Text>
       <Text fontWeight="medium">{asset.title}</Text>
     </Box>
    
     <Box>
       <Text fontSize="sm" color="gray.600" mb={1}>Description</Text>
       <Text color={asset.description ? 'inherit' : 'gray.500'}>
         {asset.description || 'No description'}
       </Text>
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


     {/* Edit Button */}
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

// Badge component
const Badge = ({ children, colorScheme, fontSize, ...props }: any) => (
 <Box
   display="inline-block"
   px={2}
   py={1}
   borderRadius="md"
   bg={`${colorScheme}.100`}
   color={`${colorScheme}.800`}
   fontSize={fontSize || 'xs'}
   fontWeight="medium"
   {...props}
 >
   {children}
 </Box>
);
