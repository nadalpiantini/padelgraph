/**
 * API Response helpers for consistent error handling
 */
import { NextResponse } from 'next/server';

export interface ApiError {
  error: string;
  details?: unknown;
}

export interface ApiSuccess<T = unknown> {
  data: T;
  message?: string;
}

export function successResponse<T>(data: T, message?: string, status = 200) {
  return NextResponse.json<ApiSuccess<T>>(
    {
      data,
      ...(message && { message }),
    },
    { status }
  );
}

export function errorResponse(error: string, details?: unknown, status = 400) {
  const response: ApiError = { error };
  if (details !== undefined) {
    response.details = details;
  }
  return NextResponse.json<ApiError>(response, { status });
}

export function unauthorizedResponse(message = 'Unauthorized') {
  return errorResponse(message, undefined, 401);
}

export function notFoundResponse(resource = 'Resource') {
  return errorResponse(`${resource} not found`, undefined, 404);
}

export function serverErrorResponse(message = 'Internal server error', details?: unknown) {
  return errorResponse(message, details, 500);
}

/**
 * ApiResponse namespace for consistent API responses
 */
export const ApiResponse = {
  success: successResponse,
  error: errorResponse,
  unauthorized: unauthorizedResponse,
  notFound: notFoundResponse,
  serverError: serverErrorResponse,
};
