import { Response } from 'express';
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendAuthenticationError,
  sendAuthorizationError,
  sendNotFoundError,
  sendInternalError,
  sendExternalServiceError,
  calculatePagination,
  parsePaginationParams,
} from '../response';

describe('Response Utilities', () => {
  let mockResponse: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };
  });

  describe('sendSuccess', () => {
    it('should send success response with data', () => {
      const data = { id: '123', name: 'Test' };
      sendSuccess(mockResponse as Response, data);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data,
      });
    });

    it('should send success response with custom status code', () => {
      const data = { id: '123' };
      sendSuccess(mockResponse as Response, data, 201);

      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it('should include pagination metadata when provided', () => {
      const data = [{ id: '1' }, { id: '2' }];
      const pagination = {
        total: 10,
        page: 1,
        pageSize: 2,
        totalPages: 5,
        hasNextPage: true,
        hasPreviousPage: false,
      };

      sendSuccess(mockResponse as Response, data, 200, pagination);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data,
        pagination,
      });
    });
  });

  describe('sendError', () => {
    it('should send error response', () => {
      sendError(mockResponse as Response, 'Test error', 400);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Test error',
      });
    });

    it('should include details when provided', () => {
      sendError(mockResponse as Response, 'Test error', 400, 'More details');

      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Test error',
        details: 'More details',
      });
    });

    it('should handle array of details', () => {
      const details = ['Error 1', 'Error 2'];
      sendError(mockResponse as Response, 'Test error', 400, details);

      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Test error',
        details,
      });
    });
  });

  describe('sendValidationError', () => {
    it('should send 400 validation error', () => {
      sendValidationError(mockResponse as Response, 'Invalid input');

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: 'Invalid input',
      });
    });
  });

  describe('sendAuthenticationError', () => {
    it('should send 401 authentication error', () => {
      sendAuthenticationError(mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Authentication required',
      });
    });

    it('should use custom message', () => {
      sendAuthenticationError(mockResponse as Response, 'Invalid token');

      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Invalid token',
      });
    });
  });

  describe('sendAuthorizationError', () => {
    it('should send 403 authorization error', () => {
      sendAuthorizationError(mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Access denied',
      });
    });
  });

  describe('sendNotFoundError', () => {
    it('should send 404 not found error', () => {
      sendNotFoundError(mockResponse as Response, 'User');

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'User not found',
      });
    });
  });

  describe('sendInternalError', () => {
    it('should send 500 internal error', () => {
      sendInternalError(mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Internal server error',
      });
    });
  });

  describe('sendExternalServiceError', () => {
    it('should send 502 external service error', () => {
      sendExternalServiceError(mockResponse as Response, 'Shopify API');

      expect(statusMock).toHaveBeenCalledWith(502);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Shopify API error',
      });
    });
  });

  describe('calculatePagination', () => {
    it('should calculate pagination metadata correctly', () => {
      const result = calculatePagination(100, 1, 10);

      expect(result).toEqual({
        total: 100,
        page: 1,
        pageSize: 10,
        totalPages: 10,
        hasNextPage: true,
        hasPreviousPage: false,
      });
    });

    it('should handle last page correctly', () => {
      const result = calculatePagination(100, 10, 10);

      expect(result).toEqual({
        total: 100,
        page: 10,
        pageSize: 10,
        totalPages: 10,
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });

    it('should handle middle page correctly', () => {
      const result = calculatePagination(100, 5, 10);

      expect(result).toEqual({
        total: 100,
        page: 5,
        pageSize: 10,
        totalPages: 10,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });

    it('should handle non-divisible totals', () => {
      const result = calculatePagination(95, 1, 10);

      expect(result).toEqual({
        total: 95,
        page: 1,
        pageSize: 10,
        totalPages: 10,
        hasNextPage: true,
        hasPreviousPage: false,
      });
    });
  });

  describe('parsePaginationParams', () => {
    it('should use defaults when no params provided', () => {
      const result = parsePaginationParams();

      expect(result).toEqual({
        page: 1,
        pageSize: 100,
        skip: 0,
      });
    });

    it('should parse valid page and pageSize', () => {
      const result = parsePaginationParams('2', '50');

      expect(result).toEqual({
        page: 2,
        pageSize: 50,
        skip: 50,
      });
    });

    it('should enforce minimum page of 1', () => {
      const result = parsePaginationParams('0', '10');

      expect(result.page).toBe(1);
      expect(result.skip).toBe(0);
    });

    it('should enforce maximum pageSize of 100', () => {
      const result = parsePaginationParams('1', '200');

      expect(result.pageSize).toBe(100);
    });

    it('should handle invalid inputs', () => {
      const result = parsePaginationParams('invalid', 'invalid');

      expect(result).toEqual({
        page: 1,
        pageSize: 100,
        skip: 0,
      });
    });

    it('should calculate skip correctly', () => {
      const result = parsePaginationParams('3', '25');

      expect(result.skip).toBe(50); // (3-1) * 25
    });
  });
});
