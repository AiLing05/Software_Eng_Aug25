"use client";

import { Box, Container, Heading, Button, VStack } from '@chakra-ui/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import UploadModal from '@/components/assets/UploadModal'; 
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const router = useRouter();

  const handleClose = () => {
    router.push('/dashboard'); // back to dashboard
  };

  return (
    <DashboardLayout>
      <Container maxW="container.xl" py={10}>
        <VStack align="stretch" maxW="2xl" mx="auto">
          {/* Using UploadModal as a form */}
          <UploadModal isOpen={true} onClose={handleClose} />
        </VStack>
      </Container>
    </DashboardLayout>
  );
}
