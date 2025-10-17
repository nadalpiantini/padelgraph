/**
 * API Response Helpers Tests
 * Unit tests for API response helper functions
 */
import { describe, it, expect } from 'vitest';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-response';

describe('API Response Helpers', () => {
  it('should create success response with data', async () => {
    const data = { id: '123', name: 'Test' };
    const response = successResponse(data);

    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.data).toEqual(data);
    expect(json.message).toBeUndefined();
  });

  it('should create success response with message', async () => {
    const data = { id: '123' };
    const message = 'Success message';
    const response = successResponse(data, message);

    const json = await response.json();
    expect(json.data).toEqual(data);
    expect(json.message).toBe(message);
  });

  it('should create success response with custom status', async () => {
    const data = { id: '123' };
    const response = successResponse(data, 'Created', 201);

    expect(response.status).toBe(201);
  });

  it('should create error response', async () => {
    const error = 'Something went wrong';
    const response = errorResponse(error);

    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.error).toBe(error);
    expect(json.details).toBeUndefined();
  });

  it('should create error response with details', async () => {
    const error = 'Validation error';
    const details = { field: 'email', issue: 'invalid format' };
    const response = errorResponse(error, details);

    const json = await response.json();
    expect(json.error).toBe(error);
    expect(json.details).toEqual(details);
  });

  it('should create error response with custom status', async () => {
    const response = errorResponse('Conflict', undefined, 409);
    expect(response.status).toBe(409);
  });

  it('should create unauthorized response', async () => {
    const response = unauthorizedResponse();

    expect(response.status).toBe(401);

    const json = await response.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('should create unauthorized response with custom message', async () => {
    const message = 'Not authenticated';
    const response = unauthorizedResponse(message);

    const json = await response.json();
    expect(json.error).toBe(message);
  });

  it('should create not found response', async () => {
    const response = notFoundResponse();

    expect(response.status).toBe(404);

    const json = await response.json();
    expect(json.error).toBe('Resource not found');
  });

  it('should create not found response with custom resource', async () => {
    const resource = 'User';
    const response = notFoundResponse(resource);

    const json = await response.json();
    expect(json.error).toBe('User not found');
  });

  it('should create server error response', async () => {
    const response = serverErrorResponse();

    expect(response.status).toBe(500);

    const json = await response.json();
    expect(json.error).toBe('Internal server error');
  });

  it('should create server error response with message and details', async () => {
    const message = 'Database error';
    const details = { code: 'DB_CONNECTION_FAILED' };
    const response = serverErrorResponse(message, details);

    const json = await response.json();
    expect(json.error).toBe(message);
    expect(json.details).toEqual(details);
  });
});
