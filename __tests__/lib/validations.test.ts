/**
 * Validation Schema Tests
 * Unit tests for all validation schemas
 */
import { describe, it, expect } from 'vitest';
import {
  profileUpdateSchema,
  preferencesUpdateSchema,
} from '@/lib/validations/profile';
import {
  createBookingSchema,
  bookingsQuerySchema,
  createCourtSchema,
  updateCourtSchema,
  createAvailabilitySchema,
} from '@/lib/validations/booking';
import {
  feedQuerySchema,
  createPostSchema,
  createCommentSchema,
} from '@/lib/validations/feed';
import {
  updateAvailabilitySchema,
  dashboardQuerySchema,
  orgRoleEnum,
} from '@/lib/validations/admin';

describe('Profile Validations', () => {
  it('should validate valid profile update', () => {
    const valid = {
      name: 'John Doe',
      phone: '+1234567890',
      level: 5.5,
    };
    const result = profileUpdateSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject invalid phone format', () => {
    const invalid = { phone: 'invalid-phone' };
    const result = profileUpdateSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject level out of range', () => {
    const invalid = { level: 10.0 };
    const result = profileUpdateSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should validate preferences update', () => {
    const valid = {
      lang: 'es',
      notifications: {
        email: true,
        whatsapp: false,
      },
    };
    const result = preferencesUpdateSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});

describe('Booking Validations', () => {
  it('should validate valid booking creation', () => {
    const valid = {
      court_id: '123e4567-e89b-12d3-a456-426614174000',
      start_at: '2025-10-17T10:00:00Z',
      end_at: '2025-10-17T11:00:00Z',
    };
    const result = createBookingSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject end_at before start_at', () => {
    const invalid = {
      court_id: '123e4567-e89b-12d3-a456-426614174000',
      start_at: '2025-10-17T11:00:00Z',
      end_at: '2025-10-17T10:00:00Z',
    };
    const result = createBookingSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should validate bookings query params', () => {
    const valid = {
      status: 'pending',
      limit: '10',
      offset: '0',
    };
    const result = bookingsQuerySchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
      expect(result.data.offset).toBe(0);
    }
  });
});

describe('Court Validations', () => {
  it('should validate court creation', () => {
    const valid = {
      org_id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Court 1',
      type: 'outdoor',
      surface: 'grass',
    };
    const result = createCourtSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject invalid surface type', () => {
    const invalid = {
      org_id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Court 1',
      surface: 'invalid',
    };
    const result = createCourtSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should validate court update', () => {
    const valid = {
      name: 'Updated Court',
      type: 'indoor',
    };
    const result = updateCourtSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});

describe('Availability Validations', () => {
  it('should validate availability creation', () => {
    const valid = {
      court_id: '123e4567-e89b-12d3-a456-426614174000',
      day_of_week: 1,
      start_time: '09:00:00',
      end_time: '18:00:00',
      price_per_hour: 50,
    };
    const result = createAvailabilitySchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject invalid time format', () => {
    const invalid = {
      court_id: '123e4567-e89b-12d3-a456-426614174000',
      day_of_week: 1,
      start_time: '9:00',
      end_time: '18:00:00',
      price_per_hour: 50,
    };
    const result = createAvailabilitySchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject invalid day_of_week', () => {
    const invalid = {
      court_id: '123e4567-e89b-12d3-a456-426614174000',
      day_of_week: 7,
      start_time: '09:00:00',
      end_time: '18:00:00',
      price_per_hour: 50,
    };
    const result = createAvailabilitySchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should validate availability update', () => {
    const valid = {
      price_per_hour: 60,
      active: false,
    };
    const result = updateAvailabilitySchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject end_time before start_time', () => {
    const invalid = {
      start_time: '18:00:00',
      end_time: '09:00:00',
    };
    const result = updateAvailabilitySchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('Feed Validations', () => {
  it('should validate feed query', () => {
    const valid = {
      limit: '20',
      user_id: '123e4567-e89b-12d3-a456-426614174000',
    };
    const result = feedQuerySchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
    }
  });

  it('should validate post creation', () => {
    const valid = {
      content: 'Test post content',
      visibility: 'public',
    };
    const result = createPostSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject empty post content', () => {
    const invalid = {
      content: '',
    };
    const result = createPostSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should validate comment creation', () => {
    const valid = {
      content: 'Test comment',
    };
    const result = createCommentSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject too many media URLs', () => {
    const invalid = {
      content: 'Test post',
      media_urls: Array(11).fill('https://example.com/image.jpg'),
    };
    const result = createPostSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('Admin Validations', () => {
  it('should validate dashboard query', () => {
    const valid = {
      org_id: '123e4567-e89b-12d3-a456-426614174000',
      from_date: '2025-01-01T00:00:00Z',
      to_date: '2025-12-31T23:59:59Z',
    };
    const result = dashboardQuerySchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject invalid org_id', () => {
    const invalid = {
      org_id: 'not-a-uuid',
    };
    const result = dashboardQuerySchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should validate org role enum', () => {
    expect(orgRoleEnum.safeParse('owner').success).toBe(true);
    expect(orgRoleEnum.safeParse('admin').success).toBe(true);
    expect(orgRoleEnum.safeParse('member').success).toBe(true);
    expect(orgRoleEnum.safeParse('invalid').success).toBe(false);
  });
});
