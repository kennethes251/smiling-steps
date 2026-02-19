# Project Structure

## Root Layout

```
/
├── server/           # Express.js backend
├── client/           # React frontend
├── uploads/          # User-uploaded files
├── docs/             # Technical documentation
├── scripts/          # Utility scripts
├── package.json      # Backend dependencies & scripts
└── render.yaml       # Render deployment config
```

## Backend (`/server`)

```
server/
├── index.js          # Main entry point
├── config/           # Database, security, environment configs
├── constants/        # State machines, enums (session/payment states)
├── middleware/       # Auth, rate limiting, error handling, validation
├── models/           # Mongoose schemas (User, Session, Blog, etc.)
├── routes/           # API route handlers
├── services/         # Business logic (video calls, payments, notifications)
├── utils/            # Helpers (logger, encryption, validators)
├── scripts/          # DB migrations, admin setup scripts
└── test/             # Jest tests (unit, integration, property)
```

### Key Backend Patterns

- Routes in `/routes/*.js` - RESTful API endpoints
- Models use Mongoose schemas (MongoDB) - some have Sequelize variants
- Auth middleware at `/middleware/auth.js` - JWT verification
- Role-based access via `/middleware/roleAuth.js`

## Frontend (`/client/src`)

```
client/src/
├── App.js            # Root component with routes
├── theme.js          # MUI theme configuration
├── config/api.js     # API URL configuration
├── context/          # React contexts (AuthContext)
├── components/
│   ├── auth/         # Login, registration
│   ├── dashboards/   # Role-specific dashboards
│   ├── VideoCall/    # Video call components
│   └── *.js          # Shared components
├── pages/            # Route page components
├── utils/            # Helper functions
└── test/             # Test utilities
```

### Key Frontend Patterns

- Pages in `/pages/*.js` - one per route
- Dashboards in `/components/dashboards/` - role-specific views
- `RoleGuard` component protects routes by user role
- `AuthContext` provides user state and auth methods
- API calls use axios with base URL from `/config/api.js`

## API Route Structure

All API routes prefixed with `/api/`:
- `/api/auth` - Login, register, token refresh
- `/api/users` - User management
- `/api/sessions` - Booking and session management
- `/api/admin` - Admin-only operations
- `/api/mpesa` - Payment processing
- `/api/video-calls` - Video session management
- `/api/public` - Unauthenticated endpoints (psychologist list, blogs)
