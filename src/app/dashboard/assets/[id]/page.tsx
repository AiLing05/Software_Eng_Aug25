"use client";


import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store';
import axios from '@/lib/api/axios';
import { fetchAssetById, fetchAssetVersions, updateAsset } from '@/lib/store/slices/assetsSlice';
import {
 Box,
 Container,
 Grid,
 Heading,
 Text,
 HStack,
 VStack,
 Badge,
 IconButton
} from '@chakra-ui/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import AssetPreview from '@/components/assets/AssetPreview';
import AssetMetadata from '@/components/assets/AssetMetadata';
import AssetVersionHistory from '@/components/assets/AssetVersionHistory';
import AssetActions from '@/components/assets/AssetActions';
import { format } from 'date-fns';


interface Tag {
 id: number;
 name: string;
}


interface User {
 id: number;
 username?: string;
 email?: string;
}


interface TechnicalMetadata {
 resolution?: string;
 width?: number;
 height?: number;
 [key: string]: string | number | undefined;
}


interface Asset {
 id: number;
 title: string;
 description?: string;
 file_type: string;
 file_extension: string;
 file_size: number;
 version: number;
 created_at: string;
 updated_at?: string;
 uploaded_by?: User;
 tags?: Tag[];
 technical_metadata?: TechnicalMetadata;
}


const CopyIconComponent = () => (
 <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
   <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
 </svg>
);


export default function AssetDetailPage() {
 const params = useParams();
 const dispatch = useDispatch<AppDispatch>();
 const { selectedAsset: asset, versions, loading } = useSelector((state: RootState) => state.assets);
  const [isEditing, setIsEditing] = useState<boolean>(false);


 useEffect(() => {
   const id = Number(params.id);
   if (id) {
     dispatch(fetchAssetById(id));
     dispatch(fetchAssetVersions(id));
   }
 }, [params.id, dispatch]);


 const handleCopyAssetId = (): void => {
   if (asset) {
     navigator.clipboard.writeText(asset.id.toString());
     console.log('Asset ID copied to clipboard:', asset.id);
   }
 };


 const handleUpdateAsset = async (updatedData: any) => {
   try {
     console.log('page.tsx: receive updated data:', updatedData);
    
     if (!asset) {
       console.error('Asset is null, cannot update');
       return false;
     }
    
     const payload = {
       title: updatedData.title?.trim() || asset.title,
       description: updatedData.description?.trim() || '',
       ...(updatedData.tags && { tags: updatedData.tags })
     };
    
     console.log('page.tsx: sent to the future payload:', payload);
    
     const result = await dispatch(updateAsset({
       id: asset.id,
       data: payload
     })).unwrap();


     console.log('page.tsx: update successfully:', result);
    


     dispatch(fetchAssetById(asset.id));
    
     return true;
   } catch (error: any) {
     console.error('page.tsx: update fail:', error);
    
     if (error.response) {
       console.error(' Backend error response:', {
         status: error.response.status,
         data: error.response.data,
       });
     }
    
     return false;
   }
 };


 const handleProcessTags = async (tagNames: string[]): Promise<number[]> => {
   try {
     const tagIds: number[] = [];
    
     const existingTagsResponse = await fetch('/api/tags/');
     if (!existingTagsResponse.ok) {
       throw new Error(`Failed to fetch tags: ${existingTagsResponse.status}`);
     }
    
     const existingTags = await existingTagsResponse.json();
     const tagsList = existingTags.results || existingTags;
    
     for (const tagName of tagNames) {
       const existingTag = tagsList.find((tag: Tag) => tag.name === tagName);
      
       if (existingTag) {
         tagIds.push(existingTag.id);
       } else {
         try {
           const newTagResponse = await fetch('/api/tags/', {
             method: 'POST',
             headers: {
               'Content-Type': 'application/json',
             },
             body: JSON.stringify({
               name: tagName,
             }),
           });
          
           if (newTagResponse.ok) {
             const newTag = await newTagResponse.json();
             tagIds.push(newTag.id);
           }
         } catch (error) {
           console.error(`Error creating tag ${tagName}:`, error);
         }
       }
     }
    
     return tagIds;
   } catch (error) {
     console.error('Error processing tags:', error);
     return [];
   }
 };


 const hasTechnicalMetadata = asset?.technical_metadata &&
   Object.keys(asset.technical_metadata).length > 0 &&
   Object.values(asset.technical_metadata).some(value => value != null && value !== '');


 if (loading || !asset) {
   return (
     <DashboardLayout>
       <Container maxW="container.xl" py={8}>
         <Text>Loading...</Text>
       </Container>
     </DashboardLayout>
   );
 }




 if (isEditing) {
   return (
     <DashboardLayout>
       <Container maxW="container.xl" py={8}>
         <HStack justify="space-between" mb={6}>
           <Heading size="3xl">Edit Asset</Heading>
         </HStack>


         <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={8}>
           <Box bg="white" p={6} borderRadius="lg" shadow="sm">
             <AssetPreview asset={asset} />
           </Box>


           <Box bg="white" p={6} borderRadius="lg" shadow="sm">
             <AssetMetadata
               asset={asset}
               isEditing={isEditing}
               onEditToggle={setIsEditing}
               onSave={handleUpdateAsset}
             />
           </Box>
         </Grid>
       </Container>
     </DashboardLayout>
   );
 }




 return (
   <DashboardLayout>
     <Container maxW="container.xl" py={8}>
       <HStack justify="space-between" mb={6}>
         <Heading size="2xl">{asset.title}</Heading>
         <AssetActions asset={asset} onEditClick={() => setIsEditing(true)} />
       </HStack>


       <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={8}>
         <VStack gap={6} align="stretch">
           <Box bg="white" p={6} borderRadius="lg" shadow="sm">
             <AssetPreview asset={asset} />
           </Box>


           {asset.description && (
             <Box bg="white" p={6} borderRadius="lg" shadow="sm">
               <Heading size="md" mb={4}>Description</Heading>
               <Text>{asset.description}</Text>
             </Box>
           )}


           <Box bg="white" p={6} borderRadius="lg" shadow="sm">
             <Heading size="md" mb={4}>Version History</Heading>
             <AssetVersionHistory versions={versions} />
           </Box>
         </VStack>


         <VStack gap={6} align="stretch">


           <Box bg="white" p={6} borderRadius="lg" shadow="sm">
             <Heading size="md" mb={4}>Details</Heading>
             <VStack gap={3} align="stretch">
               {/* Asset ID with copy button */}
               <HStack justify="space-between">
                 <Text color="gray.600">Asset ID:</Text>
                 <HStack>
                   <Text fontFamily="mono" fontSize="sm">{asset.id}</Text>
                   <IconButton
                     aria-label="Copy Asset ID"
                     size="xs"
                     onClick={handleCopyAssetId}
                     color="gray.600"
                     variant="ghost"
                   >
                     <CopyIconComponent />
                   </IconButton>
                 </HStack>
               </HStack>


               <HStack justify="space-between">
                 <Text color="gray.600">File Type:</Text>
                 <Badge colorScheme="blue">{asset.file_extension}</Badge>
               </HStack>


               <HStack justify="space-between">
                 <Text color="gray.600">Size:</Text>
                 <Text>{(asset.file_size / 1024 / 1024).toFixed(2)} MB</Text>
               </HStack>


               <HStack justify="space-between">
                 <Text color="gray.600">Uploaded:</Text>
                 <Text>{format(new Date(asset.created_at), 'MMM dd, yyyy')}</Text>
               </HStack>


               <HStack justify="space-between">
                 <Text color="gray.600">Version:</Text>
                 <Text>v{asset.version}</Text>
               </HStack>


               <HStack justify="space-between">
                 <Text color="gray.600">Uploaded By:</Text>
                 <Text fontSize="sm">
                   {asset.uploaded_by?.username || asset.uploaded_by?.email || 'N/A'}
                 </Text>
               </HStack>


               <HStack justify="space-between">
                 <Text color="gray.600">Upload Date:</Text>
                 <Text fontSize="sm">
                   {asset.created_at ? format(new Date(asset.created_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
                 </Text>
               </HStack>
              
               <HStack justify="space-between">
                 <Text color="gray.600">Last Updated:</Text>
                 <Text fontSize="sm">
                   {asset.updated_at ? format(new Date(asset.updated_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
                 </Text>
               </HStack>


               {hasTechnicalMetadata && (
                 <Box mt={3} pt={3} borderTop="1px" borderColor="gray.100">
                   <Text fontSize="sm" fontWeight="medium" color="gray.600" mb={2}>
                     Technical Metadata
                   </Text>
                   <VStack gap={2} align="stretch">
                     {Object.entries(asset.technical_metadata!)
                       .filter(([key, value]) =>
                         value != null &&
                         value !== '' &&
                         !['width', 'height', 'resolution'].includes(key)
                       )
                       .map(([key, value]) => (
                         <HStack key={key} justify="space-between">
                           <Text fontSize="sm" color="gray.600">
                             {key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}:
                           </Text>
                           <Text fontSize="sm" maxW="200px" textAlign="right" wordBreak="break-all">
                             {String(value)}
                           </Text>
                         </HStack>
                       ))}
                   </VStack>
                 </Box>
               )}




               {asset.file_type === 'image' && asset.technical_metadata && (
                 <>
                   {asset.technical_metadata.resolution && (
                     <HStack justify="space-between">
                       <Text color="gray.600">Resolution:</Text>
                       <Text>{asset.technical_metadata.resolution}</Text>
                     </HStack>
                   )}
                  
                   {(asset.technical_metadata.width || asset.technical_metadata.height) && (
                     <HStack justify="space-between">
                       <Text color="gray.600">Dimensions:</Text>
                       <Text>
                         {asset.technical_metadata.width && `${asset.technical_metadata.width}px`}
                         {asset.technical_metadata.width && asset.technical_metadata.height && ' × '}
                         {asset.technical_metadata.height && `${asset.technical_metadata.height}px`}
                       </Text>
                     </HStack>
                   )}
                 </>
               )}
             </VStack>
           </Box>


           {/* Tags */}
           <Box bg="white" p={6} borderRadius="lg" shadow="sm">
             <Heading size="md" mb={4}>Tags</Heading>
             <HStack flexWrap="wrap" gap={2}>
               {asset.tags && asset.tags.length > 0 ? (
                 asset.tags.map((tag: Tag) => (
                   <Box
                     key={tag.id}
                     bg="blue.100"
                     color="blue.800"
                     px={3}
                     py={1}
                     borderRadius="full"
                     fontSize="sm"
                     fontWeight="semibold"
                     _hover={{ bg: "blue.200" }}
                     cursor="default"
                     transition="all 0.2s"
                   >
                     {tag.name.toUpperCase()}
                   </Box>
                 ))
               ) : (
                 <Text color="gray.500" fontSize="sm">
                   No tags
                 </Text>
               )}
             </HStack>
           </Box>
         </VStack>
       </Grid>
     </Container>
   </DashboardLayout>
 );
}
