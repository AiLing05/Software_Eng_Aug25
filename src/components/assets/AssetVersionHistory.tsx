"use client";


import { AssetVersion } from "@/lib/types";
import { Box, VStack, HStack, Text, Badge, Link, Button } from "@chakra-ui/react";
import { format } from "date-fns";
import { useState } from "react";


interface AssetVersionHistoryProps {
 versions: AssetVersion[];
 assetId: number;
}


const MoreInfoNewField = ({ line }: { line: string }) => {
 const [fieldPart, newValue] = line.split("→").map((s) => s.trim());
 const field = fieldPart.split(":")[0].trim();
 return (
   <HStack gap={2} mb={2} align="flex-start">
     <Badge color="green.700" bg="green.100" fontSize="0.6em" px={2} py={0.5} borderRadius="sm">
       New
     </Badge>
     <Text fontSize="sm" color="gray.700">
       {field}: {newValue}
     </Text>
   </HStack>
 );
};


const MoreInfoDeletedField = ({ line }: { line: string }) => {
 const [fieldPart] = line.split("→");
 const field = fieldPart.split(":")[0].trim();
 const oldValue = fieldPart.split(":")[1]?.trim();
 return (
   <HStack gap={2} mb={2} align="flex-start">
     <Badge color="red.700" bg="red.100" fontSize="0.6em" px={2} py={0.5} borderRadius="sm">
       Deleted
     </Badge>
     <Text fontSize="sm" color="gray.600">
       {field}: {oldValue}
     </Text>
   </HStack>
 );
};


const MoreInfoUpdatedField = ({ line }: { line: string }) => {
 const [fieldPart, changes] = line.split(":");
 const field = fieldPart.trim();
 const [from, to] = changes.split("→").map((s) => s.trim());
  return (
   <HStack gap={2} mb={2} align="flex-start">
     <Text fontSize="sm" fontWeight="medium" minW="80px">{field}:</Text>
     <HStack gap={2}>
       <Badge color="blue.600" bg="blue.100" fontSize="0.6em" px={2} py={0.5} borderRadius="sm">From</Badge>
       <Text fontSize="sm" color="gray.600">{from}</Text>
       <Badge color="blue.700" bg="blue.100" fontSize="0.6em" px={2} py={0.5} borderRadius="sm">To</Badge>
       <Text fontSize="sm" color="gray.700">{to}</Text>
     </HStack>
   </HStack>
 );
};


export default function AssetVersionHistory({ versions, assetId }: AssetVersionHistoryProps) {
  const [showAll, setShowAll] = useState(false);
 const [expandedVersions, setExpandedVersions] = useState<Set<number>>(new Set());


 const sortedVersions = [...versions].sort((a, b) => b.version - a.version);
 const displayedVersions = showAll ? sortedVersions : sortedVersions.slice(0, 2);


 const toggleVersionExpansion = (versionId: number) => {
   const newExpanded = new Set(expandedVersions);
   newExpanded.has(versionId) ? newExpanded.delete(versionId) : newExpanded.add(versionId);
   setExpandedVersions(newExpanded);
 };


 const getChangeSummary = (version: AssetVersion) => {


   if (Number(version.version) === 1) {
     const parts: string[] = [];


     if (version.file_url) parts.push("file");
     if (version.title) parts.push("title");
     if (version.description) parts.push("description");
     if (version.tags && Array.isArray(version.tags) && version.tags.length > 0) parts.push("tags");


     if (parts.length === 0) return "had created an asset";


     const last = parts.pop();
     if (parts.length === 0) return `had created ${last}.`;
     return `had created ${parts.join(", ")} and ${last}.`;
   }


   const changes = version.changes;
   if (!changes) return "No changes noted";


   const lines = changes.split("\n");
   const summaryLines = lines
     .map((line) => {
       if (line.includes("Title:")) return "title";
       if (line.includes("Description:")) return "description";
       if (line.includes("Tags:")) return "tags";
       if (line.includes("File:")) return "file";
       if (!line.includes(":")) return null;
       return "more info";
     })
     .filter(Boolean);


   const uniqueSummary = Array.from(new Set(summaryLines));
   if (uniqueSummary.length === 0) return "No changes noted";
   if (uniqueSummary.length === 1) return `had updated the ${uniqueSummary[0]}.`;


   const lastItem = uniqueSummary.pop();
   return `had updated the ${uniqueSummary.join(", ")} and ${lastItem}.`;
 };


 const isMoreInfoUpdate = (line: string) => {
   const result = !line.includes("Title:") &&
          !line.includes("Description:") &&
          !line.includes("Tags:") &&
          !line.includes("File:") &&
          line.includes(":") &&
          line.includes("→") &&
          !line.includes("(none) →") &&
          !line.includes("→ (removed)");
    console.log(`   isMoreInfoUpdate for "${line}": ${result}`);
   return result;
 };




 const renderMoreInfoLine = (line: string, idx: number) => {
   console.log(`  [FRONTEND DEBUG] Rendering more info line: "${line}"`);
   console.log(`    Includes → : ${line.includes("→")}`);
   console.log(`    Includes (none) → : ${line.includes("(none) →")}`);
   console.log(`    Includes → (removed) : ${line.includes("→ (removed)")}`);
   console.log(`    Is more info update: ${isMoreInfoUpdate(line)}`);
  
   if (line.includes("(none) →")) {
     console.log(`    Rendering as New field`);
     return <MoreInfoNewField key={idx} line={line} />;
   } else if (line.includes("→ (removed)")) {
     console.log(`    Rendering as Deleted field`);
     return <MoreInfoDeletedField key={idx} line={line} />;
   } else if (isMoreInfoUpdate(line)) {
     console.log(`    Rendering as Updated field`);
     return <MoreInfoUpdatedField key={idx} line={line} />;
   } else if (line.trim()) {
     console.log(`     Rendering as plain text`);
     return (
       <Text key={idx} fontSize="sm" mb={2} color="gray.700" whiteSpace="pre-wrap">
         {line}
       </Text>
     );
   }
   console.log(`    No rendering for this line`);
   return null;
 };


 const renderVersionChanges = (version: AssetVersion) => {
   console.log(` [FRONTEND DEBUG] Rendering version ${version.version} changes:`);
   console.log(`  Changes text:`, version.changes);
  
   if (Number(version.version) === 1) {
     return (
       <Box>
         {/* File */}
         <Box mb={3}>
           <Text fontSize="sm" fontWeight="medium" mb={1}>File:</Text>
           {version.file_url ? (
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
               📎 View File
             </Link>
           ) : (
             <Text fontSize="sm" color="gray.600">(No file)</Text>
           )}
         </Box>


         {/* Title */}
         <Box mb={3}>
           <Text fontSize="sm" fontWeight="medium">Title:</Text>
           <Text fontSize="sm" color="gray.700">{version.title || "(No title)"}</Text>
         </Box>


         {/* Description */}
         <Box mb={3}>
           <Text fontSize="sm" fontWeight="medium">Description:</Text>
           <Text fontSize="sm" color="gray.700">{version.description || "(No description)"}</Text>
         </Box>


         {/* Tags */}
         <Box mb={3}>
           <Text fontSize="sm" fontWeight="medium" mb={1}>Tags:</Text>
           {version.tags && Array.isArray(version.tags) && version.tags.length > 0 ? (
             <HStack wrap="wrap" gap={1}>
               {version.tags.map((tag) => (
                 <Badge
                   key={tag.id}
                   color="gray.700"
                   bg="gray.100"
                   fontSize="0.7em"
                   px={2}
                   py={0.5}
                   borderRadius="sm"
                 >
                   {tag.name.toUpperCase()}
                 </Badge>
               ))}
             </HStack>
           ) : (
             <Text fontSize="sm" color="gray.600">(No tags)</Text>
           )}
         </Box>
       </Box>
     );
   }


   const changes = version.changes;
   if (!changes) {
     console.log(`  No changes text found`);
     return <Text fontSize="sm" color="gray.500">No changes noted</Text>;
   }


   console.log(`  Changes found, splitting lines...`);
   const lines = changes.split("\n");
   console.log(`  Lines:`, lines);


   let hasRenderedMoreInfo = false;


   return (
     <Box>
       {lines.map((line, idx) => {
         console.log(`  Processing line ${idx}: "${line}"`);


         // File update
         if (line.includes("File: Updated to new file")) {
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
         else if ((line.includes("Title:") || line.includes("Description:")) && line.includes("→")) {
           const [fieldPart, changes] = line.split(":");
           const field = fieldPart.trim();
           const [from, to] = changes.split("→").map((s) => s.trim());
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
         else if (line.includes("Tags:") && line.includes("→")) {
           const [fromTags, toTags] = line.split("→").map((s) => s.replace("Tags:", "").trim().toUpperCase());
           const fromList = fromTags.split(",").map((t) => t.trim()).filter((t) => t);
           const toList = toTags.split(",").map((t) => t.trim()).filter((t) => t);


           const added = toList.filter((tag) => !fromList.includes(tag));
           const removed = fromList.filter((tag) => !toList.includes(tag));


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
         else if (!line.includes("Title:") && !line.includes("Description:") && !line.includes("Tags:") && !line.includes("File:")) {
           if (line.trim() && (line.includes("→") || line.includes("(none) →") || line.includes("→ (removed)"))) {
             console.log(`   More info field detected: "${line}"`);
            
             if (!hasRenderedMoreInfo) {
               hasRenderedMoreInfo = true;
               return (
                 <Box key={`more-info-${idx}`}>
                   <Text fontSize="sm" fontWeight="medium" mb={2}>More info:</Text>
                   {renderMoreInfoLine(line, idx)}
                 </Box>
               );
             } else {
               return renderMoreInfoLine(line, idx);
             }
           }
           return null;
         }
         else if (line.trim()) {
           return (
             <Text key={idx} fontSize="sm" mb={2} color="gray.700" whiteSpace="pre-wrap">
               {line}
             </Text>
           );
         }
         return null;
       })}


       {!hasRenderedMoreInfo && changes.trim() && (
         <Text fontSize="sm" color="gray.700" whiteSpace="pre-wrap">
           {changes}
         </Text>
       )}
     </Box>
   );
 };


 if (!versions || versions.length === 0) {
   return <Text fontSize="sm" color="gray.500">No version history available</Text>;
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
           _hover={{ bg: "gray.50" }}
           transition="all 0.2s"
         >
           {/* Header */}
           <HStack justify="space-between">
             <HStack gap={2}>
               <Badge colorScheme="blue" fontSize="0.7em" minW="40px">
                 v{version.version}
               </Badge>
               <Text fontSize="sm" fontWeight="medium">
                 {version.created_by.username}
               </Text>
               <Text fontSize="xs" color="gray.600">
                 {getChangeSummary(version)}
               </Text>
             </HStack>
             <HStack gap={5}>
               <Text fontSize="xs" color="gray.500">
                 {format(new Date(version.created_at), "MMM dd, HH:mm")}
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
               {renderVersionChanges(version)}
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
