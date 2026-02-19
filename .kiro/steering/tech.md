# Tech Stack & Build System

## Backend (Node.js/Express)

- **Runtime**: Node.js 18.x
- **Framework**: Express.js
- **Database**: MongoDB (primary, via Mongoose) with Sequelize/PostgreSQL support
- **Authentication**: JWT tokens with bcryptjs password hashing
- **Real-time**: Socket.io for video call signaling
- **Security**: Helmet, CORS, rate limiting, input validation
- **Logging**: Winston logger
- **Email**: Nodemailer (Gmail SMTP)
- **Payments**: M-Pesa API integration

## Frontend (React)

- **Framework**: React 18 with Create React App
- **UI Library**: Material-UI (MUI) v5
- **Routing**: React Router v6
- **State**: React Context API (AuthContext)
- **Notifications**: notistack
- **Charts**: Recharts
- **Video**: simple-peer (WebRTC)
- **Animations**: Framer Motion

## Common Commands

```bash
# Backend
npm start              # Start production server
npm run dev            # Start with nodemon (development)
npm test               # Run Jest tests

# Frontend (from /client)
npm start              # Start React dev server
npm run build          # Production build
npm test               # Run React tests

# Full stack local dev
# Terminal 1: npm run dev (backend on :5000)
# Terminal 2: cd client && npm start (frontend on :3000)
```

## Environment Variables

Backend requires `.env` with:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Token signing secret
- `EMAIL_USER` / `EMAIL_PASSWORD` - SMTP credentials
- `MPESA_*` - M-Pesa API credentials
- `CLIENT_URL` / `ALLOWED_ORIGINS` - CORS configuration

## Deployment

- **Platform**: Render (render.yaml configuration)
- **Backend**: Node web service
- **Frontend**: Static site (built React app)
- **Database**: MongoDB Atlas or Render PostgreSQL

## Testing

- **Backend**: Jest with fast-check for property-based tests
- **Frontend**: React Testing Library, jest-axe for accessibility
- Test files: `*.test.js`, `*.property.test.js`
