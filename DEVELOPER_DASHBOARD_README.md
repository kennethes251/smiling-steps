<<<<<<< HEAD
# 🛠️ Smiling Steps Developer Dashboard

## Overview
The Developer Dashboard is a comprehensive admin interface that gives you complete control over your Smiling Steps platform. Manage psychologists, create blog content, add resources, and monitor platform analytics.

## 🚀 Getting Started

### 1. Create Admin Account
Run this command to create your admin account:
```bash
cd server
node create-admin.js
```

**Default Admin Credentials:**
- Email: `admin@smilingsteps.com`
- Password: `admin123`
- ⚠️ **Change password after first login!**

### 2. Access Dashboard
1. Start your server: `npm run dev` (from server directory)
2. Start your client: `npm start` (from client directory)
3. Login with admin credentials
4. Click "🛠️ Dev Dashboard" in the header
5. Or navigate to: `http://localhost:3000/developer-dashboard`

## 📋 Dashboard Features

### 🏠 **Overview Tab**
- **Platform Statistics**: Users, psychologists, sessions, blog posts
- **Quick Actions**: Create psychologist, blog post, or resource
- **Recent Activity**: Latest platform activity feed

### 👨‍⚕️ **Psychologist Management**
- **Add New Psychologists**: Complete profile creation
- **Manage Existing**: Edit profiles, specializations, credentials
- **Specializations**: Addiction Counseling, Anxiety, Depression, PTSD, etc.
- **Professional Details**: Experience, education, bio

### 📝 **Blog Management**
- **Create Blog Posts**: Rich content creation with categories
- **Content Categories**: Mental Health, Addiction Recovery, Therapy Tips, etc.
- **Publishing Control**: Draft/Published status management
- **SEO Features**: Meta titles, descriptions, tags
- **Analytics**: View counts, engagement metrics

### 📚 **Resource Management**
- **Resource Types**: Worksheets, Guides, Videos, Assessments, Tools
- **Access Control**: Public, Client, Psychologist, Admin levels
- **File Management**: Upload and organize therapy resources
- **Categories**: Organize by therapy type and topic
- **Download Tracking**: Monitor resource usage

### 📊 **Analytics Tab**
- **User Growth**: Registration and engagement trends
- **Session Statistics**: Booking and completion rates
- **Content Performance**: Blog and resource analytics
- **Platform Health**: System metrics and performance

### ⚙️ **Settings Tab**
- **Platform Configuration**: Registration settings, notifications
- **Maintenance Mode**: Control platform availability
- **Feature Toggles**: Enable/disable platform features

## 🔧 Technical Details

### Backend APIs
All dashboard functionality is powered by REST APIs:

- **Admin Stats**: `GET /api/admin/stats`
- **Psychologist Management**: 
  - `POST /api/admin/psychologists` - Create
  - `GET /api/admin/psychologists` - List all
  - `PUT /api/admin/psychologists/:id` - Update
  - `DELETE /api/admin/psychologists/:id` - Delete
- **Blog Management**:
  - `POST /api/admin/blogs` - Create
  - `GET /api/admin/blogs` - List with pagination
  - `PUT /api/admin/blogs/:id` - Update
  - `DELETE /api/admin/blogs/:id` - Delete
- **Resource Management**:
  - `POST /api/admin/resources` - Create
  - `GET /api/admin/resources` - List with filters
  - `PUT /api/admin/resources/:id` - Update
  - `DELETE /api/admin/resources/:id` - Delete

### Database Models

#### Blog Model
```javascript
{
  title: String,
  slug: String (auto-generated),
  excerpt: Text,
  content: Text,
  category: Enum,
  tags: JSON Array,
  published: Boolean,
  publishedAt: Date,
  authorId: Integer,
  views: Integer,
  likes: Integer
}
```

#### Resource Model
```javascript
{
  title: String,
  description: Text,
  type: Enum,
  category: String,
  url: String,
  filePath: String,
  downloadable: Boolean,
  accessLevel: Enum,
  tags: JSON Array,
  downloads: Integer,
  views: Integer,
  rating: Decimal
}
```

## 🔐 Security Features

### Admin Authentication
- **Role-based Access**: Only users with `role: 'admin'` can access
- **JWT Token Validation**: Secure API access
- **Route Protection**: Frontend and backend route guards

### Data Validation
- **Input Sanitization**: All form inputs validated
- **SQL Injection Prevention**: Sequelize ORM protection
- **XSS Protection**: Content sanitization

## 🎯 Usage Examples

### Creating a Psychologist
1. Go to "Psychologists" tab
2. Click "Add Psychologist"
3. Fill in professional details:
   - Name, email, password
   - Specializations (multiple selection)
   - Experience and education
   - Professional bio
4. Click "Create Psychologist"

### Publishing a Blog Post
1. Go to "Blog Management" tab
2. Click "Create Blog Post"
3. Add content:
   - Title and category
   - Excerpt for previews
   - Full content (Markdown supported)
   - Tags for organization
4. Toggle "Publish immediately" if ready
5. Click "Create Blog Post"

### Adding Resources
1. Go to "Resources" tab
2. Click "Add Resource"
3. Configure resource:
   - Title and description
   - Type (Worksheet, Guide, Video, etc.)
   - URL or file upload
   - Access level and permissions
4. Click "Add Resource"

## 🚀 Deployment Notes

### Environment Variables
Ensure these are set in production:
```
MONGODB_URI=your_production_database_url
JWT_SECRET=your_secure_jwt_secret
NODE_ENV=production
```

### Admin Account Security
1. **Change default password** immediately
2. **Use strong passwords** (12+ characters)
3. **Enable 2FA** (future feature)
4. **Regular security audits**

## 📈 Future Enhancements

### Planned Features
- **Advanced Analytics**: Detailed user behavior tracking
- **Email Campaign Management**: Newsletter and notifications
- **A/B Testing**: Content and feature testing
- **Backup Management**: Automated data backups
- **API Rate Limiting**: Enhanced security controls
- **Audit Logging**: Complete admin action tracking

### Integration Opportunities
- **Payment Analytics**: Revenue and subscription tracking
- **Email Service**: Automated notifications and campaigns
- **File Storage**: Cloud storage for resources and media
- **CDN Integration**: Faster content delivery

## 🆘 Troubleshooting

### Common Issues

**Dashboard Not Loading**
- Verify admin account exists and has correct role
- Check JWT token validity
- Ensure server is running with admin routes

**API Errors**
- Check database connection
- Verify model associations are properly set up
- Review server logs for detailed error messages

**Permission Denied**
- Confirm user has `role: 'admin'`
- Check JWT token in browser localStorage
- Verify admin middleware is working

### Support
For technical support or feature requests, contact the development team or check the project documentation.

---

=======
# 🛠️ Smiling Steps Developer Dashboard

## Overview
The Developer Dashboard is a comprehensive admin interface that gives you complete control over your Smiling Steps platform. Manage psychologists, create blog content, add resources, and monitor platform analytics.

## 🚀 Getting Started

### 1. Create Admin Account
Run this command to create your admin account:
```bash
cd server
node create-admin.js
```

**Default Admin Credentials:**
- Email: `admin@smilingsteps.com`
- Password: `admin123`
- ⚠️ **Change password after first login!**

### 2. Access Dashboard
1. Start your server: `npm run dev` (from server directory)
2. Start your client: `npm start` (from client directory)
3. Login with admin credentials
4. Click "🛠️ Dev Dashboard" in the header
5. Or navigate to: `http://localhost:3000/developer-dashboard`

## 📋 Dashboard Features

### 🏠 **Overview Tab**
- **Platform Statistics**: Users, psychologists, sessions, blog posts
- **Quick Actions**: Create psychologist, blog post, or resource
- **Recent Activity**: Latest platform activity feed

### 👨‍⚕️ **Psychologist Management**
- **Add New Psychologists**: Complete profile creation
- **Manage Existing**: Edit profiles, specializations, credentials
- **Specializations**: Addiction Counseling, Anxiety, Depression, PTSD, etc.
- **Professional Details**: Experience, education, bio

### 📝 **Blog Management**
- **Create Blog Posts**: Rich content creation with categories
- **Content Categories**: Mental Health, Addiction Recovery, Therapy Tips, etc.
- **Publishing Control**: Draft/Published status management
- **SEO Features**: Meta titles, descriptions, tags
- **Analytics**: View counts, engagement metrics

### 📚 **Resource Management**
- **Resource Types**: Worksheets, Guides, Videos, Assessments, Tools
- **Access Control**: Public, Client, Psychologist, Admin levels
- **File Management**: Upload and organize therapy resources
- **Categories**: Organize by therapy type and topic
- **Download Tracking**: Monitor resource usage

### 📊 **Analytics Tab**
- **User Growth**: Registration and engagement trends
- **Session Statistics**: Booking and completion rates
- **Content Performance**: Blog and resource analytics
- **Platform Health**: System metrics and performance

### ⚙️ **Settings Tab**
- **Platform Configuration**: Registration settings, notifications
- **Maintenance Mode**: Control platform availability
- **Feature Toggles**: Enable/disable platform features

## 🔧 Technical Details

### Backend APIs
All dashboard functionality is powered by REST APIs:

- **Admin Stats**: `GET /api/admin/stats`
- **Psychologist Management**: 
  - `POST /api/admin/psychologists` - Create
  - `GET /api/admin/psychologists` - List all
  - `PUT /api/admin/psychologists/:id` - Update
  - `DELETE /api/admin/psychologists/:id` - Delete
- **Blog Management**:
  - `POST /api/admin/blogs` - Create
  - `GET /api/admin/blogs` - List with pagination
  - `PUT /api/admin/blogs/:id` - Update
  - `DELETE /api/admin/blogs/:id` - Delete
- **Resource Management**:
  - `POST /api/admin/resources` - Create
  - `GET /api/admin/resources` - List with filters
  - `PUT /api/admin/resources/:id` - Update
  - `DELETE /api/admin/resources/:id` - Delete

### Database Models

#### Blog Model
```javascript
{
  title: String,
  slug: String (auto-generated),
  excerpt: Text,
  content: Text,
  category: Enum,
  tags: JSON Array,
  published: Boolean,
  publishedAt: Date,
  authorId: Integer,
  views: Integer,
  likes: Integer
}
```

#### Resource Model
```javascript
{
  title: String,
  description: Text,
  type: Enum,
  category: String,
  url: String,
  filePath: String,
  downloadable: Boolean,
  accessLevel: Enum,
  tags: JSON Array,
  downloads: Integer,
  views: Integer,
  rating: Decimal
}
```

## 🔐 Security Features

### Admin Authentication
- **Role-based Access**: Only users with `role: 'admin'` can access
- **JWT Token Validation**: Secure API access
- **Route Protection**: Frontend and backend route guards

### Data Validation
- **Input Sanitization**: All form inputs validated
- **SQL Injection Prevention**: Sequelize ORM protection
- **XSS Protection**: Content sanitization

## 🎯 Usage Examples

### Creating a Psychologist
1. Go to "Psychologists" tab
2. Click "Add Psychologist"
3. Fill in professional details:
   - Name, email, password
   - Specializations (multiple selection)
   - Experience and education
   - Professional bio
4. Click "Create Psychologist"

### Publishing a Blog Post
1. Go to "Blog Management" tab
2. Click "Create Blog Post"
3. Add content:
   - Title and category
   - Excerpt for previews
   - Full content (Markdown supported)
   - Tags for organization
4. Toggle "Publish immediately" if ready
5. Click "Create Blog Post"

### Adding Resources
1. Go to "Resources" tab
2. Click "Add Resource"
3. Configure resource:
   - Title and description
   - Type (Worksheet, Guide, Video, etc.)
   - URL or file upload
   - Access level and permissions
4. Click "Add Resource"

## 🚀 Deployment Notes

### Environment Variables
Ensure these are set in production:
```
MONGODB_URI=your_production_database_url
JWT_SECRET=your_secure_jwt_secret
NODE_ENV=production
```

### Admin Account Security
1. **Change default password** immediately
2. **Use strong passwords** (12+ characters)
3. **Enable 2FA** (future feature)
4. **Regular security audits**

## 📈 Future Enhancements

### Planned Features
- **Advanced Analytics**: Detailed user behavior tracking
- **Email Campaign Management**: Newsletter and notifications
- **A/B Testing**: Content and feature testing
- **Backup Management**: Automated data backups
- **API Rate Limiting**: Enhanced security controls
- **Audit Logging**: Complete admin action tracking

### Integration Opportunities
- **Payment Analytics**: Revenue and subscription tracking
- **Email Service**: Automated notifications and campaigns
- **File Storage**: Cloud storage for resources and media
- **CDN Integration**: Faster content delivery

## 🆘 Troubleshooting

### Common Issues

**Dashboard Not Loading**
- Verify admin account exists and has correct role
- Check JWT token validity
- Ensure server is running with admin routes

**API Errors**
- Check database connection
- Verify model associations are properly set up
- Review server logs for detailed error messages

**Permission Denied**
- Confirm user has `role: 'admin'`
- Check JWT token in browser localStorage
- Verify admin middleware is working

### Support
For technical support or feature requests, contact the development team or check the project documentation.

---

>>>>>>> 54f043a91682edcc5659e6f2a6d44c4e4425ada5
**🎉 Your Smiling Steps platform is now ready for professional content management and administration!**