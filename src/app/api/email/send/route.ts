/**
 * Email API endpoint
 * POST /api/email/send - Send email
 */
import { emailService } from '@/lib/email';
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const sendEmailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1).max(200),
  html: z.string().min(1),
  text: z.string().optional(),
});

const sendTemplateSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  templateId: z.string().min(1),
  variables: z.record(z.string(), z.unknown()),
  subject: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse('Not authenticated');
    }

    // Parse request body
    const body = await request.json();

    // Check if it's a template email or regular email
    const isTemplate = 'templateId' in body;

    if (isTemplate) {
      // Validate template email request
      const validation = sendTemplateSchema.safeParse(body);

      if (!validation.success) {
        return errorResponse('Invalid request data', validation.error.issues);
      }

      // Send template email
      const result = await emailService.sendTemplate(validation.data.templateId, {
        to: validation.data.to,
        subject: validation.data.subject || 'PadelGraph Notification',
        variables: validation.data.variables,
      });

      if (!result.success) {
        return serverErrorResponse('Failed to send email', result.error);
      }

      return successResponse(
        { messageId: result.messageId },
        'Template email sent successfully'
      );
    } else {
      // Validate regular email request
      const validation = sendEmailSchema.safeParse(body);

      if (!validation.success) {
        return errorResponse('Invalid request data', validation.error.issues);
      }

      // Send regular email
      const result = await emailService.send(validation.data);

      if (!result.success) {
        return serverErrorResponse('Failed to send email', result.error);
      }

      return successResponse(
        { messageId: result.messageId },
        'Email sent successfully'
      );
    }
  } catch (error) {
    console.error('[Email API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
