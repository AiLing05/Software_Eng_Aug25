"use client";


import { AssetVersion } from '@/lib/types';
import { Box, VStack, HStack, Text, Badge, Link, Button } from '@chakra-ui/react';
import { format } from 'date-fns';
import { useState } from 'react';


interface AssetVersionHistoryProps {
 versions: AssetVersion[];
 assetId: number;
}


const MoreInfoNewField = ({ line }: { line: string }) => {
 const [fieldPart, newValue] = line.split('→').map(s => s.trim());
 const field = fieldPart.split(':')[0].trim();
 return (
   <HStack gap={2} mb={2} align="flex-start">
     <Badge color="green.700" bg="green.100" fontSize="0.6em" px={2} py={0.5} borderRadius="sm">New</Badge>
     <Text fontSize="sm" color="gray.700">{field}: {newValue}</Text>
   </HStack>
 );
};


const MoreInfoDeletedField = ({ line }: { line: string }) => {
 const [fieldPart] = line.split('→');
 const field = fieldPart.split(':')[0].trim();
 const oldValue = fieldPart.split(':')[1]?.trim();
 return (
   <HStack gap={2} mb={2} align="flex-start">
     <Badge color="red.700" bg="red.100" fontSize="0.6em" px={2} py={0.5} borderRadius="sm">Deleted</Badge>
     <Text fontSize="sm" color="gray.600">{field}: {oldValue}</Text>
   </HStack>
 );
};


const MoreInfoUpdatedField = ({ line }: { line: string }) => {
 const [fieldPart, changes] = line.split(':');
 const field = fieldPart.trim();
 const [from, to] = changes.split('→').map(s => s.trim());
  return (
   <Box mb={3}>
     <Text fontSize="sm" fontWeight="medium" mb={1}>{field}:</Text>
     <HStack gap={2} mb={1}>
       <Badge color="blue.600" bg="blue.100" fontSize="0.6em" px={2} py={0.5} borderRadius="sm">From</Badge>
       <Text fontSize="sm" color="gray.600">{from}</Text>
     </HStack>
     <HStack gap={2}>
       <Badge color="blue.700" bg="blue.100" fontSize="0.6em" px={2} py={0.5} borderRadius="sm">To</Badge>
       <Text fontSize="sm" color="gray.700">{to}</Text>
     </HStack>
   </Box>
 );
};


interface MoreInfoItem {
 line: string;
 idx: number;
}


export default function AssetVersionHistory({ versions, assetId }: AssetVersionHistoryProps) {
 const [showAll, setShowAll] = useState(false);
 const [expandedVersions, setExpandedVersions] = useState<Set<number>>(new Set());


 // Sort versions by version number (newest first)
 const sortedVersions = [...versions].sort((a, b) => b.version - a.version);


 // Show only 2 versions initially, or all if showAll is true
 const displayedVersions = showAll ? sortedVersions : sortedVersions.slice(0, 2);


 const toggleVersionExpansion = (versionId: number) => {
   const newExpanded = new Set(expandedVersions);
   if (newExpanded.has(versionId)) {
     newExpanded.delete(versionId);
   } else {
     newExpanded.add(versionId);
   }
   setExpandedVersions(newExpanded);
 };


 const getChangeSummary = (changes: string) => {
   if (!changes) return 'No changes noted';


   const lines = changes.split('\n');
   const summaryLines = lines.map(line => {
     if (line.includes('Title:')) return 'title';
     if (line.includes('Description:')) return 'description';
     if (line.includes('Tags:')) return 'tags';
     if (line.includes('File:')) return 'file';
     if (!line.includes('Title:') && !line.includes('Description:') && !line.includes('Tags:') && !line.includes('File:')) {
       return 'more info';
     }
     return null;
   }).filter(Boolean);


   const uniqueSummary = Array.from(new Set(summaryLines));


   if (uniqueSummary.length === 0) return 'No changes noted';


   if (uniqueSummary.length === 1) {
     return `had updated the ${uniqueSummary[0]}.`;
   } else {
     const lastItem = uniqueSummary.pop();
     return `had updated the ${uniqueSummary.join(', ')} and ${lastItem}.`;
   }
 };


 const isMoreInfoUpdate = (line: string) => {
   return !line.includes('Title:') &&
          !line.includes('Description:') &&
          !line.includes('Tags:') &&
          !line.includes('File:') &&
          line.includes(':') &&
          line.includes('→') &&
          !line.includes('(none) →') &&
          !line.includes('→ (removed)');
 };


 if (!versions || versions.length === 0) {
   return (
     <Text fontSize="sm" color="gray.500">No version history available</Text>
   );
 }


 return (
   <VStack align="stretch" gap={2}>
     {displayedVersions.map((version) => {
       const isExpanded = expandedVersions.has(version.id);


       return (
         <Box
           key={version.id}
           p={3}
           bg="white"
           borderRadius="md"
           border="1px solid"
           borderColor="gray.200"
           cursor="pointer"
           onClick={() => toggleVersionExpansion(version.id)}
           _hover={{ bg: 'gray.50' }}
           transition="all 0.2s"
         >
           {/* Compact header - always visible */}
           <HStack justify="space-between">
             <HStack gap={2}>
               <Badge colorScheme="blue" fontSize="0.7em" minW="40px">
                 v{version.version}
               </Badge>
               <Text fontSize="sm" fontWeight="medium">
                 {version.created_by.username}
               </Text>
               <Text fontSize="xs" color="gray.600">
                 {getChangeSummary(version.changes)}
               </Text>
             </HStack>
             <HStack gap={5}>
               <Text fontSize="xs" color="gray.500">
                 {format(new Date(version.created_at), 'MMM dd, HH:mm')}
               </Text>
               <Text
                 fontSize="xs"
                 color="gray.400"
                 transform={isExpanded ? "rotate(180deg)" : "rotate(0deg)"}
                 transition="transform 0.2s"
               >
                 ▼
               </Text>
             </HStack>
           </HStack>


           {/* Expandable details */}
           {isExpanded && (
             <Box mt={3} pt={3} borderTop="1px solid" borderColor="gray.100">
               {(() => {
                 const lines = version.changes.split('\n');
                 const hasMoreInfo = lines.some(line =>
                   !line.includes('Title:') &&
                   !line.includes('Description:') &&
                   !line.includes('Tags:') &&
                   !line.includes('File:') &&
                   line.trim() &&
                   (line.includes('→') || line.includes('(none) →') || line.includes('→ (removed)'))
                 );


                 let hasRenderedMoreInfo = false;
                 const moreInfoItems: MoreInfoItem[] = [];


                 return lines.map((line, idx) => {
                   // File update
                   if (line.includes('File: Updated to new file')) {
                     return (
                       <Box key={idx} mb={4} p={3} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.200">
                         <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
                           New File Updated.
                         </Text>
                         {version.file_url && (
                           <Link
                             href={version.file_url}
                             target="_blank"
                             rel="noopener noreferrer"
                             color="blue.600"
                             fontSize="sm"
                             fontWeight="medium"
                             display="inline-flex"
                             alignItems="center"
                             gap={1}
                             _hover={{ color: "blue.700", textDecoration: "underline" }}
                           >
                             📎 View Previous File
                           </Link>
                         )}
                       </Box>
                     );
                   }
                   else if ((line.includes('Title:') || line.includes('Description:')) && line.includes('→')) {
                     const [fieldPart, changes] = line.split(':');
                     const field = fieldPart.trim();
                     const [from, to] = changes.split('→').map(s => s.trim());
                     return (
                       <Box key={idx} mb={3}>
                         <Text fontSize="sm" fontWeight="medium" mb={1}>{field}:</Text>
                         <HStack gap={2} mb={1}>
                           <Badge color="blue.600" bg="blue.100" fontSize="0.6em" px={2} py={0.5} borderRadius="sm">From</Badge>
                           <Text fontSize="sm" color="gray.600">{from}</Text>
                         </HStack>
                         <HStack gap={2}>
                           <Badge color="blue.700" bg="blue.100" fontSize="0.6em" px={2} py={0.5} borderRadius="sm">To</Badge>
                           <Text fontSize="sm" color="gray.700">{to}</Text>
                         </HStack>
                       </Box>
                     );
                   }
                   else if (line.includes('Tags:') && line.includes('→')) {
                     const [fromTags, toTags] = line.split('→').map(s => s.replace('Tags:', '').trim().toUpperCase());
                     const fromList = fromTags.split(',').map(t => t.trim()).filter(t => t);
                     const toList = toTags.split(',').map(t => t.trim()).filter(t => t);


                     const added = toList.filter(tag => !fromList.includes(tag));
                     const removed = fromList.filter(tag => !toList.includes(tag));


                     return (
                       <Box key={idx} mb={3}>
                         <Text fontSize="sm" fontWeight="medium" mb={1}>Tags:</Text>
                         {added.map((tag, tagIdx) => (
                           <HStack key={tagIdx} gap={2} mb={1}>
                             <Badge color="green.700" bg="green.100" fontSize="0.6em" px={2} py={0.5} borderRadius="sm">New</Badge>
                             <Text fontSize="sm" color="gray.700">{tag}</Text>
                           </HStack>
                         ))}
                         {removed.map((tag, tagIdx) => (
                           <HStack key={tagIdx} gap={2} mb={1}>
                             <Badge color="red.700" bg="red.100" fontSize="0.6em" px={2} py={0.5} borderRadius="sm">Deleted</Badge>
                             <Text fontSize="sm" color="gray.600">{tag}</Text>
                           </HStack>
                         ))}
                       </Box>
                     );
                   }
                   else if (!line.includes('Title:') && !line.includes('Description:') && !line.includes('Tags:') && !line.includes('File:')) {
                     moreInfoItems.push({ line, idx });


                     if (idx === lines.length - 1 ||
                         (lines[idx + 1] &&
                          (lines[idx + 1].includes('Title:') ||
                           lines[idx + 1].includes('Description:') ||
                           lines[idx + 1].includes('Tags:') ||
                           lines[idx + 1].includes('File:')))) {
                      
                       const hasMoreInfoContent = moreInfoItems.some(item =>
                         item.line.trim() &&
                         (item.line.includes('→') || item.line.includes('(none) →') || item.line.includes('→ (removed)'))
                       );


                       if (hasMoreInfoContent) {
                         return (
                           <Box key={`more-info-${idx}`}>
                             <Text fontSize="sm" fontWeight="medium" mb={2}>More info:</Text>
                             {moreInfoItems.map((item) => {
                               if (item.line.includes('(none) →')) {
                                 return <MoreInfoNewField key={item.idx} line={item.line} />;
                               } else if (item.line.includes('→ (removed)')) {
                                 return <MoreInfoDeletedField key={item.idx} line={item.line} />;
                               } else if (isMoreInfoUpdate(item.line)) {
                                 return <MoreInfoUpdatedField key={item.idx} line={item.line} />;
                               } else if (item.line.trim()) {
                                 return (
                                   <Text key={item.idx} fontSize="sm" mb={2} color="gray.700" whiteSpace="pre-wrap">
                                     {item.line}
                                   </Text>
                                 );
                               }
                               return null;
                             })}
                           </Box>
                         );
                       }
                     }
                     return null;
                   }
                   else if (line.trim()) {
                     moreInfoItems.length = 0;
                     return (
                       <Text key={idx} fontSize="sm" mb={2} color="gray.700" whiteSpace="pre-wrap">
                         {line}
                       </Text>
                     );
                   }
                  
                   if (line.trim() === '') {
                     moreInfoItems.length = 0;
                   }
                  
                   return null;
                 });
               })()}
             </Box>
           )}
         </Box>
       );
     })}


     {/* Show More/Less button */}
     {versions.length > 2 && (
       <Box textAlign="center" mt={2}>
         <Button
           variant="ghost"
           size="sm"
           onClick={() => setShowAll(!showAll)}
           color="blue.500"
         >
           {showAll ? `Show less` : `Show more (+${versions.length - 2} versions)`}
         </Button>
       </Box>
     )}
   </VStack>
 );
}
