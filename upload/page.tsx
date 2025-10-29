"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/lib/store';
import { login } from '@/lib/store/slices/authSlice';
import {
  Box,
  Button,
  Input,
  Heading,
  Text,
  VStack,
  Container,
  Card,
  Field,
} from '@chakra-ui/react';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await dispatch(login({ username, password })).unwrap();
      router.push('/dashboard');
    } catch (err: any) {
      setError(err || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center">
      <Container maxW="md">
        <Card.Root p={8}>
          <VStack gap={6} align="stretch">
            <Box textAlign="center">
              <Heading size="xl" mb={2}>Digital Asset Management</Heading>
              <Text color="gray.600">Sign in to access your assets</Text>
            </Box>

            <form onSubmit={handleSubmit}>
              <VStack gap={4}>
                <Field.Root>
                  <Field.Label>Username</Field.Label>
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>Password</Field.Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                </Field.Root>

                {error && (
                  <Text color="red.500" fontSize="sm">{error}</Text>
                )}

                <Button
                  type="submit"
                  colorScheme="blue"
                  width="full"
                  loading={loading}
                  mt={2}
                >
                  Sign In
                </Button>
              </VStack>
            </form>
          </VStack>
        </Card.Root>
      </Container>
    </Box>
  );
}
