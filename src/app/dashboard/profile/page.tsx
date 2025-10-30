"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store';
import { updateProfile } from '@/lib/store/slices/authSlice';
import {
  Box,
  Container,
  HStack,
  VStack,
  Heading,
  Text,
  Input,
  Button,
  Avatar,
  Badge,
  IconButton
} from '@chakra-ui/react';
import { useAuth } from '@/lib/hooks/useAuth';
import DashboardLayout from '@/components/layouts/DashboardLayout';

const CopyIconComponent = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
  </svg>
);

interface ExtendedUser {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  created_at?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuth();
  
  const loading = useSelector((state: RootState) => state.auth.loading);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
  });

  const handleCopyUserId = (): void => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id.toString());
      console.log('User ID copied to clipboard:', user.id);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await dispatch(updateProfile(formData)).unwrap();
      alert('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      alert('Failed to update profile');
    }
  };

  const handleCancel = () => {
    setFormData({
      username: user?.username || '',
      email: user?.email || '',
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
    });
    setIsEditing(false);
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  if (!user) {
    return (
      <DashboardLayout>
        <Container maxW="container.md" py={8}>
          <Text>Loading...</Text>
        </Container>
      </DashboardLayout>
    );
  }

  const extendedUser = user as ExtendedUser;

  return (
    <DashboardLayout>
      <Container maxW="container.md" py={8}>
        <VStack gap={6} align="stretch">
          {/* Header */}
          <Box>
            <Heading size="2xl" mb={2}>Profile</Heading>
            <Text color="gray.600">Manage your account settings and preferences</Text>
          </Box>

          {/* Profile Card */}
          <Box 
            bg="white" 
            p={6} 
            borderRadius="lg" 
            shadow="sm" 
            border="1px" 
            borderColor="gray.200"
          >
            <VStack gap={1} align="stretch">
              {/* Avatar and Account Information in same row */}
              <HStack gap={8} align="flex-start">
                {/* Left side: Avatar and Basic Info */}
                <HStack gap={4} flex="10">
                    <Box
                        w="64px"
                        h="64px"
                        borderRadius="full"
                        bg="blue.500"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                    >
                        <Text fontSize="2xl" fontWeight="bold" color="white">
                        {user.username?.charAt(0).toUpperCase()}
                        </Text>
                    </Box>

                    <Box>
                        <Heading size="2xl">{user.username}</Heading>
                        <Text color="gray.600" mb={2}>{user.email}</Text>
                        <Badge colorScheme="blue" textTransform="capitalize">
                        {user.role}
                        </Badge>
                    </Box>
                    </HStack>

                {/* Right side: Account Information */}
                <Box 
                  bg="gray.50" 
                  p={4} 
                  borderRadius="md" 
                  border="1px" 
                  borderColor="gray.200"
                  minW="300px"
                >
                  <VStack gap={3} align="stretch">
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="gray.600">User ID:</Text>
                      <HStack>
                        <Text fontSize="sm" fontFamily="mono" fontWeight="medium">
                          {user.id}
                        </Text>
                        <IconButton
                          aria-label="Copy User ID"
                          size="xs"
                          onClick={handleCopyUserId}
                          color="gray.600"
                          variant="ghost"
                        >
                          <CopyIconComponent />
                        </IconButton>
                      </HStack>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="gray.600">Join Date:</Text>
                      <Text fontSize="sm">
                        {extendedUser.created_at 
                          ? new Date(extendedUser.created_at).toLocaleDateString() 
                          : new Date().toLocaleDateString()
                        }
                      </Text>
                    </HStack>
                  </VStack>
                </Box>
              </HStack>

              {/* Divider */}
              <Box height="1px" bg="gray.200" my={10} />

              {/* Edit Button */}
              <HStack justify="center" my={1}>
                {!isEditing ? (
                  <Button 
                    colorScheme="blue" 
                    onClick={handleEditClick}
                    size="lg"
                  >
                    Edit Profile
                  </Button>
                ) : null}
              </HStack>

              {/* Edit form */}
              {isEditing && (
                <>
                  {/* Profile Form */}
                  <form onSubmit={handleSubmit}>
                    <VStack gap={4} align="stretch">
                      <HStack gap={4}>
                        <Box flex="1">
                          <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.700">
                            First Name
                          </Text>
                          <Input
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                            placeholder="Enter your first name"
                            bg="white"
                          />
                        </Box>
                        <Box flex="1">
                          <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.700">
                            Last Name
                          </Text>
                          <Input
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                            placeholder="Enter your last name"
                            bg="white"
                          />
                        </Box>
                      </HStack>

                      <Box>
                        <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.700">
                          Name
                        </Text>
                        <Input
                          name="username"
                          value={formData.username}
                          onChange={handleChange}
                          placeholder="Enter your username"
                          bg="white"
                        />
                      </Box>

                      <Box>
                        <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.700">
                          Email
                        </Text>
                        <Input
                          name="email"
                          type="email"
                          value={formData.email}
                          readOnly
                        />
                      </Box>

                      {/* Save/Cancel Buttons */}
                      <HStack justify="flex-end" pt={4}>
                        <Button 
                          variant="outline" 
                          onClick={handleCancel}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          colorScheme="blue"
                          loading={loading}
                          loadingText="Updating..."
                        >
                          Save Changes
                        </Button>
                      </HStack>
                    </VStack>
                  </form>
                </>
              )}
            </VStack>
          </Box>
        </VStack>
      </Container>
    </DashboardLayout>
  );
}
