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
  Menu,
  AvatarRoot,
  AvatarImage,
  AvatarFallback,
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
    await dispatch(logout());
    router.push('/login');
  };

  return (
    <Flex direction="column" minH="100vh">
      <Box bg="white" borderBottom="1px" borderColor="gray.200" px={8} py={4}>
        <Flex justify="space-between" align="center">
          <HStack gap={8}>
            <Text
              fontSize="xl"
              fontWeight="bold"
              cursor="pointer"
              onClick={() => router.push('/dashboard')}
            >
              DAM System
            </Text>

            <HStack gap={4}>
              <Button variant="ghost" onClick={() => router.push('/dashboard')}>
                Assets
              </Button>
              <Button variant="ghost" onClick={() => router.push('/dashboard/search')}>
                Search
              </Button>
            </HStack>
          </HStack>

          <HStack gap={4}>
            <Menu.Root>
              <Menu.Trigger asChild>
                <Button variant="ghost">
                  <HStack>
                    <AvatarRoot size="sm">
                      <AvatarFallback>
                        {user?.username?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </AvatarRoot>
                    <Box textAlign="left">
                      <Text fontSize="sm" fontWeight="medium">
                        {user?.username}
                      </Text>
                      <Text fontSize="xs" color="gray.600">
                        {user?.role}
                      </Text>
                    </Box>
                  </HStack>
                </Button>
              </Menu.Trigger>

              <Menu.Content>
                <Menu.Item value="profile">Profile</Menu.Item>
                <Menu.Item value="settings">Settings</Menu.Item>
                <Menu.Separator />
                <Menu.Item value="logout" color="red.500" onClick={handleLogout}>
                  Logout
                </Menu.Item>
              </Menu.Content>
            </Menu.Root>
          </HStack>
        </Flex>
      </Box>

      <Box flex={1} bg="gray.50">
        {children}
      </Box>
    </Flex>
  );
}
