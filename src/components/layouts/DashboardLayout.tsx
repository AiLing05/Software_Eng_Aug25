"use client";

import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/lib/store';
import { logout } from '@/lib/store/slices/authSlice';
import {
  Box,
  Flex,
  HStack,
  Button,
  Text,
} from '@chakra-ui/react';
import { useAuth } from '@/lib/hooks/useAuth';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      console.log('Starting logout process...');
      
      // Calling the logout action
      const result = await dispatch(logout());
      console.log('Logout dispatch result:', result);
      
      // Make sure you are redirected to the login page
      console.log('Redirecting to login page...');
      router.push('/login');
      router.refresh(); // Force refresh routing
      
    } catch (error) {
      console.error('Logout failed:', error);
      // Jump to the login page even if an error occurs
      router.push('/login');
    }
  };

  const handleProfileClick = () => {
    router.push('/dashboard/profile');
  };

  return (
    <Flex direction="column" minH="100vh">
      <Box bg="white" borderBottom="1px" borderColor="gray.200" px={8} py={4}>
        <Flex justify="space-between" align="center">
          <HStack gap={8}>
            <Text
              fontSize="2xl"
              fontWeight="bold"
              cursor="pointer"
              onClick={() => router.push('/dashboard')}
            >
              DAM System
            </Text>
          </HStack>

          <HStack gap={4}>
            {/* Profile Section - Click on the avatar to enter the Profile */}
            <HStack 
              gap={3} 
              cursor="pointer" 
              onClick={handleProfileClick}
              px={4}
              py={2}
              borderRadius="lg"
              _hover={{ bg: 'gray.50' }}
              transition="all 0.2s"
            >
              <Box
                width="48px"
                height="48px"
                borderRadius="full"
                bg="blue.500"
                color="white"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize="lg"
                fontWeight="bold"
                flexShrink={0}
              >
                {user?.username?.charAt(0).toUpperCase()}
              </Box>
              
              <Box textAlign="left">
                <Text fontSize="sm" fontWeight="medium">
                  {user?.username}
                </Text>
                <Text fontSize="xs" color="gray.600">
                  {user?.role}
                </Text>
              </Box>
            </HStack>

            {/* Logout Button */}
            <Button 
              variant="outline" 
              colorScheme="red" 
              size="sm"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </HStack>
        </Flex>
      </Box>

      <Box flex={1} bg="gray.50">
        {children}
      </Box>
    </Flex>
  );
}