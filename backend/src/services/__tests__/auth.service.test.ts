import { authService } from '../auth.service';
import prisma from '../../db/prisma';
import { redisClient } from '../../db/redis';
import bcrypt from 'bcrypt';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock dependencies
jest.mock('../../db/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../db/redis', () => ({
  redisClient: {
    getClient: jest.fn(() => ({
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
    })),
  },
}));

describe('AuthService', () => {
  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';
  const mockEmail = 'test@example.com';
  const mockPassword = 'password123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const mockTenant = { id: mockTenantId, shopDomain: 'test.myshopify.com' };
      const mockUser = {
        id: mockUserId,
        email: mockEmail,
        tenantId: mockTenantId,
        passwordHash: 'hashed-password',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const redisGetClient = redisClient.getClient();
      (redisGetClient.setex as jest.Mock).mockResolvedValue('OK');

      const result = await authService.register({
        email: mockEmail,
        password: mockPassword,
        tenantId: mockTenantId,
      });

      expect(result.user.email).toBe(mockEmail);
      expect(result.user.tenantId).toBe(mockTenantId);
      expect(result.token).toBeDefined();
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should throw error if user already exists', async () => {
      const existingUser = { id: mockUserId, email: mockEmail };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);

      await expect(
        authService.register({
          email: mockEmail,
          password: mockPassword,
          tenantId: mockTenantId,
        })
      ).rejects.toThrow('User with this email already exists');
    });

    it('should throw error if tenant does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.register({
          email: mockEmail,
          password: mockPassword,
          tenantId: mockTenantId,
        })
      ).rejects.toThrow('Invalid tenant ID');
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash(mockPassword, 12);
      const mockUser = {
        id: mockUserId,
        email: mockEmail,
        tenantId: mockTenantId,
        passwordHash: hashedPassword,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const redisGetClient = redisClient.getClient();
      (redisGetClient.setex as jest.Mock).mockResolvedValue('OK');

      const result = await authService.login({
        email: mockEmail,
        password: mockPassword,
      });

      expect(result.user.email).toBe(mockEmail);
      expect(result.token).toBeDefined();
    });

    it('should throw error with invalid email', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.login({
          email: mockEmail,
          password: mockPassword,
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error with invalid password', async () => {
      const hashedPassword = await bcrypt.hash('different-password', 12);
      const mockUser = {
        id: mockUserId,
        email: mockEmail,
        tenantId: mockTenantId,
        passwordHash: hashedPassword,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        authService.login({
          email: mockEmail,
          password: mockPassword,
        })
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('validateToken', () => {
    it('should validate a valid token', () => {
      const payload = {
        userId: mockUserId,
        email: mockEmail,
        tenantId: mockTenantId,
      };

      // Generate a real token
      const token = (authService as any).generateToken(payload);

      const result = authService.validateToken(token);

      expect(result.userId).toBe(mockUserId);
      expect(result.email).toBe(mockEmail);
      expect(result.tenantId).toBe(mockTenantId);
    });

    it('should throw error for invalid token', () => {
      expect(() => authService.validateToken('invalid-token')).toThrow(
        'Invalid or expired token'
      );
    });
  });

  describe('logout', () => {
    it('should invalidate session on logout', async () => {
      const mockDel = jest.fn().mockResolvedValue(1);
      const mockGetClient = jest.fn(() => ({
        del: mockDel,
      }));
      
      (redisClient.getClient as jest.Mock) = mockGetClient;

      await authService.logout(mockUserId);

      expect(mockDel).toHaveBeenCalledWith(`session:${mockUserId}`);
    });
  });
});
