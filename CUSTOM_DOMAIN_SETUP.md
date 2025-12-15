# Custom Domain Setup Guide

## 🌐 Setting Up Your Custom Domain

### Current Status:
- ✅ **Backend**: `https://smiling-steps.onrender.com`
- ✅ **Frontend**: `https://smiling-steps-frontend.onrender.com`
- 🔄 **Custom Domain**: `https://yourdomain.com` (to be configured)

### Step 1: Render Configuration

1. **Frontend Service Setup**:
   - Go to Render Dashboard → Your Frontend Service
   - Settings → Custom Domains
   - Add: `yourdomain.com` and `www.yourdomain.com`
   - Render will provide SSL certificates automatically

2. **Backend Service** (if you want a custom API domain):
   - Go to Render Dashboard → Your Backend Service  
   - Settings → Custom Domains
   - Add: `api.yourdomain.com`

### Step 2: Namecheap DNS Configuration

Add these DNS records in Namecheap Advanced DNS:

```
Type: CNAME Record
Host: @
Value: smiling-steps-frontend.onrender.com
TTL: Automatic

Type: CNAME Record  
Host: www
Value: smiling-steps-frontend.onrender.com
TTL: Automatic

Type: CNAME Record (Optional - for custom API domain)
Host: api
Value: smiling-steps.onrender.com
TTL: Automatic
```

### Step 3: Update Application Configuration

After DNS propagation (24-48 hours), update these files:

#### Frontend API Configuration (`client/src/config/api.js`):
```javascript
// Update the production API URL if using custom API domain
const API_BASE_URL = 'https://api.yourdomain.com'; // or keep existing
```

#### Backend CORS Configuration (`server/index.js`):
```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'https://smiling-steps-frontend.onrender.com',
  'https://yourdomain.com',        // Add your custom domain
  'https://www.yourdomain.com'     // Add www version
];
```

### Step 4: SSL Certificate

- Render automatically provides SSL certificates for custom domains
- Your site will be accessible via HTTPS within 24-48 hours
- No additional configuration needed

### Step 5: Verification

After DNS propagation:
1. Visit `https://yourdomain.com`
2. Verify login functionality works
3. Check that all API calls succeed
4. Test on both `yourdomain.com` and `www.yourdomain.com`

### Troubleshooting

**DNS Propagation**: Use [whatsmydns.net](https://whatsmydns.net) to check DNS propagation
**SSL Issues**: Wait 24-48 hours for automatic SSL certificate provisioning
**CORS Errors**: Ensure your custom domain is added to the CORS allowedOrigins array

### Timeline
- **DNS Setup**: 5-10 minutes
- **DNS Propagation**: 24-48 hours  
- **SSL Certificate**: Automatic after DNS propagation
- **Full Functionality**: 24-48 hours after DNS setup