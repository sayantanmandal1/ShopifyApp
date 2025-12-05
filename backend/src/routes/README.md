# API Routes Documentation

## Authentication Routes

### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "tenantId": "uuid-of-tenant"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "tenantId": "tenant-uuid"
    },
    "token": "jwt-token-here"
  }
}
```

**Error Responses:**
- 400: Validation failed (missing fields, invalid email, password too short)
- 400: User already exists
- 500: Internal server error

---

### POST /api/auth/login
Login with existing credentials.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "tenantId": "tenant-uuid"
    },
    "token": "jwt-token-here"
  }
}
```

**Error Responses:**
- 400: Validation failed (missing fields)
- 401: Invalid email or password
- 500: Internal server error

---

### POST /api/auth/logout
Logout and invalidate current session.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Error Responses:**
- 401: Authentication required
- 500: Internal server error

---

### GET /api/auth/me
Get current authenticated user information.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "tenantId": "tenant-uuid"
  }
}
```

**Error Responses:**
- 401: Authentication required
- 500: Internal server error

---

## Authentication Middleware

### `authenticate`
Protects routes by requiring valid JWT authentication.

**Usage:**
```typescript
import { authenticate } from '../middleware/auth.middleware';

router.get('/protected-route', authenticate, (req, res) => {
  // Access user info via req.user
  const { userId, email, tenantId } = req.user;
  // ...
});
```

### `optionalAuthenticate`
Attempts authentication but doesn't reject if it fails.

**Usage:**
```typescript
import { optionalAuthenticate } from '../middleware/auth.middleware';

router.get('/public-route', optionalAuthenticate, (req, res) => {
  // req.user will be set if authenticated, undefined otherwise
  if (req.user) {
    // User is authenticated
  } else {
    // User is not authenticated
  }
});
```

---

## Testing with cURL

### Register a new user:
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "tenantId": "your-tenant-id"
  }'
```

### Login:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Get current user (replace TOKEN with actual JWT):
```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer TOKEN"
```

### Logout (replace TOKEN with actual JWT):
```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer TOKEN"
```
