# Booking Error Fix - 401 Unauthorized

## Problem Analysis

Based on the console errors, the main issues are:

1. **401 Unauthorized errors** on `/api/sessions` - Authentication token issues
2. **404 errors** on `/api/company/my-company` - Endpoint doesn't exist
3. **CORS errors** - Intermittent backend CORS header issues
4. **Connection errors** - Backend crashes or restarts
5. **Frontend TypeError** - `t.map is not a function` in dashboard

## Root Causes

### 1. Authentication Token Issues
- Users' JWT tokens are expiring
- Token not being refreshed automatically
- Token not persisting across page reloads

### 2. Missing Endpoint
- `/api/company/my-company` endpoint doesn't exist in the backend
- Frontend is trying to fetch company data that isn't implemented

### 3. CORS Configuration
- Backend CORS may not be properly configured for production
- Allowed origins mismatch between frontend and backend URLs

## Immediate Fixes

### Fix 1: Remove Company Endpoint Calls

The `/api/company/my-company` endpoint doesn't exist. Remove these calls from `ClientDashboard.js`:

```javascript
// REMOVE THIS:
axios.get(`${API_BASE_URL}/api/company/my-company`, config).catch(() => ({ data: null }))

// And remove all company/subscription related code
```

### Fix 2: Add Token Refresh Logic

Add automatic token refresh in `AuthContext.js`:

```javascript
// Check token expiration and refresh if needed
useEffect(() => {
  const checkTokenExpiration = () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwt_decode(token);
        const currentTime = Date.now() / 1000;
        
        // If token expires in less than 5 minutes, refresh it
        if (decoded.exp < currentTime + 300) {
          refreshToken();
        }
      } catch (error) {
        console.error('Token decode error:', error);
        logout();
      }
    }
  };

  // Check every minute
  const interval = setInterval(checkTokenExpiration, 60000);
  return () => clearInterval(interval);
}, []);
```

### Fix 3: Add Request Interceptor for Token

Add axios interceptor to handle 401 errors:

```javascript
// In AuthContext.js or a separate file
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh token
        const newToken = await refreshToken();
        if (newToken) {
          originalRequest.headers['x-auth-token'] = newToken;
          return axios(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        logout();
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
```

### Fix 4: Verify CORS Configuration

Ensure `render.yaml` has correct CORS settings:

```yaml
- key: ALLOWED_ORIGINS
  value: https://smiling-steps-frontend.onrender.com,https://smiling-steps.onrender.com
```

### Fix 5: Add Error Boundary

Wrap dashboard in error boundary to catch `t.map is not a function` errors:

```javascript
// Add null checks before mapping
{sessions && Array.isArray(sessions) && sessions.filter(...).map(...)}
```

## Testing Steps

1. Clear browser cache and localStorage
2. Login with fresh credentials
3. Try booking a session
4. Check browser console for errors
5. Verify token is being sent with requests

## Backend Logs to Check

```bash
# On Render, check logs for:
- "🔐 Auth middleware - Token received: No"
- "❌ Auth middleware - Token invalid"
- CORS errors
- Database connection issues
```

## Quick Test Script

Run this in browser console on the dashboard:

```javascript
// Check if token exists
console.log('Token:', localStorage.getItem('token'));

// Check if token is valid
const token = localStorage.getItem('token');
if (token) {
  const parts = token.split('.');
  if (parts.length === 3) {
    const payload = JSON.parse(atob(parts[1]));
    console.log('Token payload:', payload);
    console.log('Expires:', new Date(payload.exp * 1000));
    console.log('Is expired:', payload.exp < Date.now() / 1000);
  }
}

// Test API call
axios.get('https://smiling-steps.onrender.com/api/sessions', {
  headers: { 'x-auth-token': token }
}).then(r => console.log('Sessions:', r.data))
  .catch(e => console.error('Error:', e.response?.data));
```

## Priority Actions

1. **IMMEDIATE**: Remove company endpoint calls from ClientDashboard
2. **HIGH**: Add null checks for array operations
3. **HIGH**: Verify CORS configuration
4. **MEDIUM**: Add token refresh logic
5. **MEDIUM**: Add request interceptor

## Files to Modify

1. `client/src/components/dashboards/ClientDashboard.js` - Remove company calls, add null checks
2. `client/src/context/AuthContext.js` - Add token refresh logic
3. `server/config/securityConfig.js` - Verify CORS settings
4. `render.yaml` - Update ALLOWED_ORIGINS if needed
