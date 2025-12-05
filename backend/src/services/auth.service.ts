import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../db/prisma';
import { redisClient } from '../db/redis';
import { logger } from '../utils/logger';

export interface RegisterInput {
  email: string;
  password: string;
  tenantId: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    tenantId: string;
  };
  token: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  tenantId: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<AuthResponse> {
    const { email, password, tenantId } = input;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error('Invalid tenant ID');
    }

    // Hash password with bcrypt (12 salt rounds)
    const passwordHash = await bcrypt.hash(password, config.auth.bcryptSaltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        tenantId,
      },
    });

    // Generate JWT token
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
    });

    // Store session in Redis with 24-hour expiration
    await this.storeSession(user.id, token);

    logger.info(`User registered: ${user.email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
      },
      token,
    };
  }

  /**
   * Login an existing user
   */
  async login(input: LoginInput): Promise<AuthResponse> {
    const { email, password } = input;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
    });

    // Store session in Redis with 24-hour expiration
    await this.storeSession(user.id, token);

    logger.info(`User logged in: ${user.email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
      },
      token,
    };
  }

  /**
   * Validate JWT token and return payload
   */
  validateToken(token: string): JWTPayload {
    try {
      const payload = jwt.verify(token, config.auth.jwtSecret) as JWTPayload;
      return payload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Check if session exists in Redis
   */
  async validateSession(userId: string, token: string): Promise<boolean> {
    const sessionKey = this.getSessionKey(userId);
    const storedToken = await redisClient.getClient().get(sessionKey);
    return storedToken === token;
  }

  /**
   * Logout user by invalidating session
   */
  async logout(userId: string): Promise<void> {
    const sessionKey = this.getSessionKey(userId);
    await redisClient.getClient().del(sessionKey);
    logger.info(`User logged out: ${userId}`);
  }

  /**
   * Generate JWT token
   */
  private generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, config.auth.jwtSecret, {
      expiresIn: config.auth.jwtExpiration,
    } as jwt.SignOptions);
  }

  /**
   * Store session in Redis with TTL
   */
  private async storeSession(userId: string, token: string): Promise<void> {
    const sessionKey = this.getSessionKey(userId);
    await redisClient.getClient().setex(sessionKey, config.session.ttl, token);
  }

  /**
   * Get Redis session key for user
   */
  private getSessionKey(userId: string): string {
    return `session:${userId}`;
  }
}

export const authService = new AuthService();
