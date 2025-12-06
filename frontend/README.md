# Shopify Insights Platform - Frontend

## Authentication Implementation

This frontend application implements a complete authentication system with the following features:

### Pages

- **Login Page** (`/login`): Email/password authentication form
- **Register Page** (`/register`): User registration with tenant ID
- **Dashboard Page** (`/dashboard`): Protected dashboard (requires authentication)
- **Home Page** (`/`): Redirects to login or dashboard based on auth status
;
### Authentication Context

The `AuthContext` provides global authentication state management:

- Stores user information and JWT token
- Persists authentication in localStorage
- Provides login/logout functions
- Automatically checks for existing sessions on mount

### Protected Routes

The `ProtectedRoute` component wraps protected pages and:

- Checks authentication status
- Redirects unauthenticated users to login
- Shows loading state while checking auth
- Prevents rendering of protected content for unauthenticated users

### API Integration

The frontend integrates with the backend API at `http://localhost:3001`:

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### Form Validation

Both login and register forms include client-side validation:

- Email format validation
- Password length validation (minimum 8 characters)
- Password confirmation matching (register only)
- Required field validation

### Usage

1. Start the backend server: `cd backend && npm run dev`
2. Start the frontend: `cd frontend && npm run dev`
3. Navigate to `http://localhost:3000`
4. You'll be redirected to the login page
5. Register a new account or login with existing credentials
6. Access the protected dashboard after authentication

### Requirements Validated

- **Requirement 6.1**: User authentication with email/password
- **Requirement 6.2**: Session creation on successful authentication
- **Requirement 6.4**: Redirect unauthenticated users to login
