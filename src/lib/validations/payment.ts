/**
 * Payment validation schemas
 * Sprint 1 - PayPal Integration
 */

import { z } from 'zod';

// ============================================================================
// PAYMENT SCHEMAS
// ============================================================================

export const createPaymentOrderSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid number with up to 2 decimals'),
  currency: z.enum(['USD', 'EUR', 'GBP', 'ARS'], {
    message: 'Currency must be USD, EUR, GBP, or ARS',
  }),
  description: z.string().max(127, 'Description too long').optional(),
});

export const capturePaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  bookingId: z.string().uuid('Invalid booking ID'),
});

export const paypalWebhookSchema = z.object({
  event_type: z.string(),
  resource: z.object({
    id: z.string(),
    status: z.string().optional(),
    amount: z
      .object({
        value: z.string(),
        currency_code: z.string(),
      })
      .optional(),
    custom_id: z.string().optional(),
  }),
});

// ============================================================================
// TYPES (inferred from schemas)
// ============================================================================

export type CreatePaymentOrderInput = z.infer<typeof createPaymentOrderSchema>;
export type CapturePaymentInput = z.infer<typeof capturePaymentSchema>;
export type PayPalWebhookInput = z.infer<typeof paypalWebhookSchema>;
