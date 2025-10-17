# PadelGraph API Documentation - Sprint 1

**Version**: 1.0.0
**Base URL**: `https://padelgraph.app/api`
**Authentication**: JWT via Supabase Auth
**Last Updated**: 2025-10-16

## Table of Contents

1. [Authentication](#authentication)
2. [Profile Management](#profile-management)
3. [Social Feed](#social-feed)
4. [Booking System](#booking-system)
5. [Admin Panel](#admin-panel)
6. [Communication](#communication)
7. [Payments](#payments)
8. [Common Responses](#common-responses)
9. [Error Codes](#error-codes)

---

## Authentication

All API endpoints (except `/api/health`) require authentication via Supabase JWT token in cookies.

**Authentication Flow**:
1. User authenticates via Supabase Auth
2. JWT token stored in httpOnly cookie
3. Token automatically included in requests
4. Server validates token via `createClient()` from `@/lib/supabase/server`

**Unauthorized Response** (401):
```json
{
  "error": "Not authenticated"
}
```

---

## Profile Management

### GET /api/profile

Get current user's profile information.

**Authentication**: Required

**Response** (200):
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "+1234567890",
    "level": 5.5,
    "city": "Miami",
    "country": "US",
    "lat": 25.7617,
    "lng": -80.1918,
    "bio": "Padel enthusiast",
    "avatar_url": "https://...",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  }
}
```

**Errors**:
- 401: Not authenticated
- 404: Profile not found
- 500: Database error

---

### PUT /api/profile

Update current user's profile.

**Authentication**: Required

**Request Body**:
```json
{
  "name": "John Doe",
  "phone": "+1234567890",
  "level": 5.5,
  "city": "Miami",
  "country": "US",
  "lat": 25.7617,
  "lng": -80.1918,
  "bio": "Padel enthusiast",
  "avatar_url": "https://..."
}
```

**Validation**:
- `name`: 1-100 characters (optional)
- `phone`: E.164 format, regex: `^\+?[1-9]\d{1,14}$` (optional)
- `level`: 1.0-7.0 (optional)
- `city`: 1-100 characters (optional)
- `country`: ISO 3166-1 alpha-2 code (optional)
- `lat`: -90 to 90 (optional)
- `lng`: -180 to 180 (optional)
- `bio`: max 500 characters (optional)
- `avatar_url`: valid URL (optional)

**Response** (200):
```json
{
  "data": { /* updated profile */ },
  "message": "Profile updated successfully"
}
```

**Errors**:
- 400: Validation error
- 401: Not authenticated
- 500: Database error

---

### GET /api/preferences

Get user preferences.

**Authentication**: Required

**Response** (200):
```json
{
  "data": {
    "user_id": "uuid",
    "lang": "en",
    "notifications": {
      "email": true,
      "whatsapp": false,
      "sms": false,
      "push": true
    },
    "privacy": {
      "show_location": true,
      "show_level": true,
      "discoverable": true
    }
  }
}
```

---

### PUT /api/preferences

Update user preferences.

**Authentication**: Required

**Request Body**:
```json
{
  "lang": "es",
  "notifications": {
    "email": true,
    "whatsapp": true,
    "sms": false,
    "push": true
  },
  "privacy": {
    "show_location": false,
    "show_level": true,
    "discoverable": true
  }
}
```

**Validation**:
- `lang`: "en" | "es"
- All fields optional

**Response** (200):
```json
{
  "data": { /* updated preferences */ },
  "message": "Preferences updated successfully"
}
```

---

## Social Feed

### GET /api/feed

Get social feed timeline with pagination.

**Authentication**: Required

**Query Parameters**:
- `limit` (number, optional): Items per page (1-100, default: 20)
- `cursor` (uuid, optional): Pagination cursor
- `user_id` (uuid, optional): Filter by specific user
- `org_id` (uuid, optional): Filter by organization

**Response** (200):
```json
{
  "data": {
    "posts": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "org_id": "uuid",
        "content": "Just finished an amazing match!",
        "media_urls": ["https://..."],
        "visibility": "public",
        "created_at": "2025-10-16T10:00:00Z",
        "updated_at": "2025-10-16T10:00:00Z",
        "author": {
          "id": "uuid",
          "name": "John Doe",
          "avatar_url": "https://...",
          "level": 5.5
        }
      }
    ],
    "nextCursor": "uuid",
    "hasMore": true
  }
}
```

**Visibility Rules**:
- Public posts: visible to all
- User's own posts: always visible
- Org posts: visible if user is member

**Errors**:
- 400: Invalid query parameters
- 401: Not authenticated
- 500: Database error

---

### POST /api/posts

Create a new post.

**Authentication**: Required

**Request Body**:
```json
{
  "content": "Post content",
  "media_urls": ["https://image1.jpg", "https://image2.jpg"],
  "visibility": "public",
  "org_id": "uuid"
}
```

**Validation**:
- `content`: 1-5000 characters (required)
- `media_urls`: array of URLs, max 10 (optional)
- `visibility`: "public" | "friends" | "private" | "org" (default: "public")
- `org_id`: uuid (optional, required if visibility is "org")

**Response** (201):
```json
{
  "data": { /* created post */ },
  "message": "Post created successfully"
}
```

---

### POST /api/posts/[id]/comment

Add comment to a post.

**Authentication**: Required

**URL Parameters**:
- `id`: Post UUID

**Request Body**:
```json
{
  "content": "Great match!"
}
```

**Validation**:
- `content`: 1-1000 characters (required)

**Response** (201):
```json
{
  "data": { /* created comment */ },
  "message": "Comment added successfully"
}
```

---

### POST /api/posts/[id]/like

Toggle like on a post.

**Authentication**: Required

**URL Parameters**:
- `id`: Post UUID

**Response** (200):
```json
{
  "data": {
    "liked": true,
    "like_count": 42
  },
  "message": "Post liked"
}
```

---

## Booking System

### GET /api/bookings

Get user's bookings with filters.

**Authentication**: Required

**Query Parameters**:
- `status` (enum, optional): "pending" | "confirmed" | "cancelled" | "completed"
- `court_id` (uuid, optional): Filter by court
- `from_date` (datetime, optional): Start date filter
- `to_date` (datetime, optional): End date filter
- `limit` (number, optional): Items per page (1-100, default: 20)
- `offset` (number, optional): Pagination offset (default: 0)

**Response** (200):
```json
{
  "data": {
    "bookings": [
      {
        "id": "uuid",
        "court_id": "uuid",
        "user_id": "uuid",
        "org_id": "uuid",
        "start_at": "2025-10-17T10:00:00Z",
        "end_at": "2025-10-17T11:00:00Z",
        "total_price": 50.00,
        "status": "pending",
        "notes": "Birthday celebration",
        "created_at": "2025-10-16T00:00:00Z",
        "court": {
          "id": "uuid",
          "name": "Court 1",
          "type": "outdoor",
          "surface": "grass",
          "organization": {
            "id": "uuid",
            "name": "Miami Padel Club"
          }
        }
      }
    ],
    "total": 10,
    "limit": 20,
    "offset": 0
  }
}
```

**Errors**:
- 400: Invalid query parameters
- 401: Not authenticated
- 500: Database error

---

### POST /api/bookings

Create a new booking.

**Authentication**: Required

**Request Body**:
```json
{
  "court_id": "uuid",
  "start_at": "2025-10-17T10:00:00Z",
  "end_at": "2025-10-17T11:00:00Z",
  "notes": "Optional notes"
}
```

**Validation**:
- `court_id`: valid UUID (required)
- `start_at`: ISO 8601 datetime (required)
- `end_at`: ISO 8601 datetime, must be after start_at (required)
- `notes`: max 500 characters (optional)

**Business Logic**:
1. Validates court exists and is active
2. Calculates duration and finds pricing from availability slots
3. Checks for booking conflicts via database trigger
4. Creates booking with status "pending"

**Response** (201):
```json
{
  "data": {
    /* booking with court and user details */
  },
  "message": "Booking created successfully"
}
```

**Errors**:
- 400: Validation error or court not active
- 401: Not authenticated
- 404: Court not found
- 409: Time slot already booked
- 500: Database error

---

### GET /api/courts

Get courts list with filters.

**Authentication**: Required

**Query Parameters**:
- `org_id` (uuid, optional): Filter by organization
- `active` (boolean, optional): Filter by active status
- `limit` (number, optional): Items per page (1-100, default: 20)
- `offset` (number, optional): Pagination offset (default: 0)

**Response** (200):
```json
{
  "data": [
    {
      "id": "uuid",
      "org_id": "uuid",
      "name": "Court 1",
      "type": "outdoor",
      "surface": "grass",
      "description": "Main tournament court",
      "active": true,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-15T00:00:00Z"
    }
  ]
}
```

---

### GET /api/courts/[id]

Get specific court details with availability.

**Authentication**: Required

**URL Parameters**:
- `id`: Court UUID

**Response** (200):
```json
{
  "data": {
    "id": "uuid",
    "org_id": "uuid",
    "name": "Court 1",
    "type": "outdoor",
    "surface": "grass",
    "description": "Main tournament court",
    "active": true,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-15T00:00:00Z",
    "availability": [
      {
        "id": "uuid",
        "day_of_week": 1,
        "start_time": "09:00:00",
        "end_time": "18:00:00",
        "price_per_hour": 50.00,
        "active": true
      }
    ]
  }
}
```

**Errors**:
- 401: Not authenticated
- 404: Court not found
- 500: Database error

---

### GET /api/courts/[id]/availability

Get availability slots for a court.

**Authentication**: Required

**URL Parameters**:
- `id`: Court UUID

**Query Parameters**:
- `date` (string, optional): Date in YYYY-MM-DD format

**Response** (200):
```json
{
  "data": [
    {
      "id": "uuid",
      "court_id": "uuid",
      "day_of_week": 1,
      "start_time": "09:00:00",
      "end_time": "18:00:00",
      "price_per_hour": 50.00,
      "active": true
    }
  ]
}
```

---

## Admin Panel

**Authorization**: All admin endpoints require `owner` or `admin` role in the organization.

### GET /api/admin/dashboard

Get comprehensive dashboard metrics for an organization.

**Authentication**: Required
**Authorization**: Admin or Owner role

**Query Parameters**:
- `org_id` (uuid, required): Organization ID
- `from_date` (datetime, optional): Start date for metrics
- `to_date` (datetime, optional): End date for metrics

**Response** (200):
```json
{
  "data": {
    "courts": {
      "total": 10,
      "active": 8
    },
    "bookings": {
      "today": 5,
      "this_week": 42,
      "this_month": 180
    },
    "revenue": {
      "confirmed": 5420.00,
      "projected": 8500.00
    },
    "occupancy_rate": 72.5,
    "upcoming_bookings": [
      {
        /* next 5 bookings */
      }
    ]
  }
}
```

**Metrics Details**:
- `occupancy_rate`: Percentage of booked hours vs available hours
- `revenue.confirmed`: Total from confirmed bookings
- `revenue.projected`: Total including pending bookings

**Errors**:
- 400: Invalid org_id
- 401: Not authenticated
- 403: Insufficient permissions
- 500: Database error

---

### POST /api/courts

Create a new court (admin only).

**Authentication**: Required
**Authorization**: Admin or Owner role

**Request Body**:
```json
{
  "org_id": "uuid",
  "name": "Court 1",
  "type": "outdoor",
  "surface": "grass",
  "description": "Main tournament court"
}
```

**Validation**:
- `org_id`: valid UUID (required)
- `name`: 1-100 characters (required)
- `type`: "indoor" | "outdoor" | "covered" (default: "outdoor")
- `surface`: "carpet" | "concrete" | "grass" | "crystal" | "synthetic" (default: "concrete")
- `description`: max 500 characters (optional)

**Response** (201):
```json
{
  "data": { /* created court */ },
  "message": "Court created successfully"
}
```

**Errors**:
- 400: Validation error
- 401: Not authenticated
- 403: Insufficient permissions
- 500: Database error

---

### PUT /api/courts/[id]

Update court details (admin only).

**Authentication**: Required
**Authorization**: Admin or Owner role

**URL Parameters**:
- `id`: Court UUID

**Request Body**:
```json
{
  "name": "Updated Court Name",
  "type": "indoor",
  "surface": "carpet",
  "description": "Updated description"
}
```

**Response** (200):
```json
{
  "data": { /* updated court */ },
  "message": "Court updated successfully"
}
```

---

### DELETE /api/courts/[id]

Soft delete a court (admin only).

**Authentication**: Required
**Authorization**: Admin or Owner role

**URL Parameters**:
- `id`: Court UUID

**Response** (200):
```json
{
  "data": {
    "id": "uuid",
    "active": false
  },
  "message": "Court deactivated successfully"
}
```

**Note**: Courts are soft-deleted (active=false) to preserve booking history.

---

### POST /api/availability

Create availability slot for a court (admin only).

**Authentication**: Required
**Authorization**: Admin or Owner role

**Request Body**:
```json
{
  "court_id": "uuid",
  "day_of_week": 1,
  "start_time": "09:00:00",
  "end_time": "18:00:00",
  "price_per_hour": 50.00
}
```

**Validation**:
- `court_id`: valid UUID (required)
- `day_of_week`: 0-6 (Sunday=0, Saturday=6) (required)
- `start_time`: HH:MM:SS format (required)
- `end_time`: HH:MM:SS format, must be after start_time (required)
- `price_per_hour`: positive number (required)

**Response** (201):
```json
{
  "data": { /* created availability slot */ },
  "message": "Availability created successfully"
}
```

---

### PUT /api/availability/[id]

Update availability slot (admin only).

**Authentication**: Required
**Authorization**: Admin or Owner role

**URL Parameters**:
- `id`: Availability UUID

**Request Body**:
```json
{
  "day_of_week": 2,
  "start_time": "10:00:00",
  "end_time": "19:00:00",
  "price_per_hour": 60.00,
  "active": true
}
```

**Response** (200):
```json
{
  "data": { /* updated availability */ },
  "message": "Availability updated successfully"
}
```

---

### DELETE /api/availability/[id]

Delete availability slot (admin only).

**Authentication**: Required
**Authorization**: Admin or Owner role

**URL Parameters**:
- `id`: Availability UUID

**Response** (200):
```json
{
  "message": "Availability deleted successfully"
}
```

---

## Communication

### POST /api/email/send

Send email via Resend.

**Authentication**: Required

**Request Body**:
```json
{
  "to": "user@example.com",
  "subject": "Booking Confirmation",
  "html": "<h1>Your booking is confirmed</h1>",
  "text": "Your booking is confirmed"
}
```

**Response** (200):
```json
{
  "data": {
    "id": "email_id",
    "success": true
  },
  "message": "Email sent successfully"
}
```

---

### POST /api/whatsapp/send

Send WhatsApp message via Twilio.

**Authentication**: Required

**Request Body**:
```json
{
  "to": "+1234567890",
  "message": "Your booking is confirmed for tomorrow at 10:00 AM"
}
```

**Response** (200):
```json
{
  "data": {
    "sid": "message_sid",
    "status": "queued"
  },
  "message": "WhatsApp message sent"
}
```

---

## Payments

### POST /api/payments/create

Create PayPal payment order.

**Authentication**: Required

**Request Body**:
```json
{
  "amount": 50.00,
  "currency": "USD",
  "booking_id": "uuid",
  "description": "Court booking payment"
}
```

**Response** (201):
```json
{
  "data": {
    "order_id": "paypal_order_id",
    "approval_url": "https://paypal.com/approve/..."
  },
  "message": "Payment created"
}
```

---

### POST /api/payments/capture

Capture approved PayPal payment.

**Authentication**: Required

**Request Body**:
```json
{
  "order_id": "paypal_order_id"
}
```

**Response** (200):
```json
{
  "data": {
    "capture_id": "capture_id",
    "status": "COMPLETED",
    "amount": 50.00
  },
  "message": "Payment captured successfully"
}
```

---

### POST /api/payments/webhook

PayPal webhook handler.

**Authentication**: Public (verified via PayPal signature)

**Headers**:
- `PAYPAL-TRANSMISSION-ID`
- `PAYPAL-TRANSMISSION-TIME`
- `PAYPAL-TRANSMISSION-SIG`
- `PAYPAL-CERT-URL`
- `PAYPAL-AUTH-ALGO`

**Response** (200):
```json
{
  "message": "Webhook processed"
}
```

---

## Common Responses

### Success Response
```json
{
  "data": { /* response data */ },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": { /* optional error details */ }
}
```

---

## Error Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Validation error, invalid parameters |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | Insufficient permissions (admin/owner required) |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Booking time slot conflict, duplicate resource |
| 500 | Internal Server Error | Database error, unexpected server error |

---

## Rate Limiting

**Not implemented in Sprint 1** - Will be added in future sprints.

Planned limits:
- Anonymous: 100 requests/hour
- Authenticated: 1000 requests/hour
- Admin: 5000 requests/hour

---

## Versioning

**Current Version**: v1 (implicit, no version in URL)

Future versions will use URL versioning: `/api/v2/...`

---

## Support

For API support and questions:
- Email: support@padelgraph.com
- Docs: https://docs.padelgraph.com
- Status: https://status.padelgraph.com

---

**Last Updated**: 2025-10-16
**API Version**: 1.0.0
**Sprint**: 1
