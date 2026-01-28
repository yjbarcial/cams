# CAMS Backend API

Content and Archive Management System - Backend Server

## Features

- ✅ RESTful API with Express.js
- ✅ PostgreSQL/Supabase database integration
- ✅ JWT-based authentication
- ✅ Role-based authorization (Admin, Editor, Section Head, Member)
- ✅ Real-time updates with WebSocket (Socket.IO)
- ✅ File upload handling
- ✅ Comprehensive audit logging
- ✅ Input validation
- ✅ Error handling
- ✅ CORS configuration
- ✅ Security headers (Helmet)
- ✅ Request logging (Morgan)
- ✅ Response compression

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** PostgreSQL / Supabase
- **Authentication:** JWT (jsonwebtoken)
- **Real-time:** Socket.IO
- **Validation:** express-validator
- **File Upload:** Multer
- **Security:** Helmet, bcrypt

## Project Structure

```
server/
├── src/
│   ├── config/          # Configuration files
│   │   ├── database.js  # PostgreSQL connection
│   │   ├── supabase.js  # Supabase client
│   │   └── websocket.js # Socket.IO setup
│   ├── controllers/     # Route controllers
│   │   ├── archives.controller.js
│   │   ├── auth.controller.js
│   │   ├── departments.controller.js
│   │   ├── positions.controller.js
│   │   ├── profiles.controller.js
│   │   ├── projects.controller.js
│   │   ├── tasks.controller.js
│   │   ├── notifications.controller.js
│   │   ├── mediaFiles.controller.js
│   │   └── auditLogs.controller.js
│   ├── models/          # Database models
│   │   ├── archive.model.js
│   │   ├── department.model.js
│   │   ├── position.model.js
│   │   ├── profile.model.js
│   │   ├── project.model.js
│   │   ├── task.model.js
│   │   ├── notification.model.js
│   │   ├── mediaFile.model.js
│   │   └── auditLog.model.js
│   ├── routes/          # API routes
│   │   └── *.routes.js
│   ├── middleware/      # Custom middleware
│   │   ├── auth.js      # Authentication & authorization
│   │   ├── errorHandler.js
│   │   ├── notFound.js
│   │   ├── upload.js    # File upload
│   │   ├── auditLog.js  # Audit logging
│   │   └── validators.js
│   ├── services/        # Business logic
│   │   └── notification.service.js
│   ├── utils/           # Utility functions
│   │   ├── dateHelpers.js
│   │   ├── fileHelpers.js
│   │   ├── queryHelpers.js
│   │   └── responseHelpers.js
│   ├── database/        # Database scripts
│   │   ├── init.sql     # Table creation
│   │   └── seed.sql     # Sample data
│   └── index.js         # Application entry point
├── uploads/             # File upload directory
├── .env.example         # Environment variables template
├── .gitignore
└── package.json
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cams_db
DB_USER=postgres
DB_PASSWORD=your_password

# Or use Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

### 3. Initialize Database

For PostgreSQL:
```bash
psql -U postgres -d cams_db -f src/database/init.sql
psql -U postgres -d cams_db -f src/database/seed.sql
```

For Supabase:
- Copy contents of `init.sql` to Supabase SQL Editor
- Run the initialization script
- Run the seed script

### 4. Create Upload Directory

```bash
mkdir uploads
```

### 5. Start Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify token
- `POST /api/auth/refresh` - Refresh token

### Archives
- `GET /api/archives` - Get all archives (public)
- `GET /api/archives/:id` - Get archive by ID (public)
- `POST /api/archives` - Create archive (authenticated)
- `PUT /api/archives/:id` - Update archive (admin/editor)
- `DELETE /api/archives/:id` - Delete archive (admin)

### Departments
- `GET /api/departments` - Get all departments
- `GET /api/departments/:id` - Get department by ID
- `POST /api/departments` - Create department (admin)
- `PUT /api/departments/:id` - Update department (admin)
- `DELETE /api/departments/:id` - Delete department (admin)

### Positions
- `GET /api/positions` - Get all positions
- `GET /api/positions/:id` - Get position by ID
- `GET /api/positions/department/:departmentId` - Get positions by department
- `POST /api/positions` - Create position (admin)
- `PUT /api/positions/:id` - Update position (admin)
- `DELETE /api/positions/:id` - Delete position (admin)

### Profiles
- `GET /api/profiles` - Get all profiles
- `GET /api/profiles/me` - Get current user profile
- `GET /api/profiles/:id` - Get profile by ID
- `POST /api/profiles` - Create profile (admin)
- `PUT /api/profiles/:id` - Update profile
- `DELETE /api/profiles/:id` - Delete profile (admin)

### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project (admin/section_head)
- `POST /api/projects/:id/members` - Add project member
- `DELETE /api/projects/:id/members/:userId` - Remove project member

### Tasks
- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/:id` - Get task by ID
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/comments` - Add task comment

### Notifications
- `GET /api/notifications` - Get user notifications
- `GET /api/notifications/unread-count` - Get unread count
- `POST /api/notifications` - Create notification (admin)
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

### Media Files
- `GET /api/media-files` - Get all media files
- `GET /api/media-files/:id` - Get file by ID
- `POST /api/media-files` - Upload file
- `DELETE /api/media-files/:id` - Delete file

### Audit Logs
- `GET /api/audit-logs` - Get all audit logs (admin)
- `GET /api/audit-logs/:id` - Get audit log by ID (admin)

## WebSocket Events

### Client → Server
- `join:project` - Join project room
- `leave:project` - Leave project room
- `join:task` - Join task room
- `leave:task` - Leave task room
- `typing:start` - Start typing indicator
- `typing:stop` - Stop typing indicator

### Server → Client
- `notification:new` - New notification
- `project:updated` - Project update
- `task:updated` - Task update
- `comment:new` - New comment
- `member:added` - Member added to project
- `member:removed` - Member removed from project
- `user:typing` - User is typing
- `user:stopped-typing` - User stopped typing

## Authentication

Include JWT token in Authorization header:
```
Authorization: Bearer <token>
```

## User Roles

- **admin** - Full system access
- **editor** - Can manage content and users
- **section_head** - Can manage projects and team members
- **member** - Can contribute to projects
- **viewer** - Read-only access

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "details": []
  }
}
```

## Success Responses

All success responses follow this format:
```json
{
  "success": true,
  "message": "Success message",
  "data": {}
}
```

## Development

### Run with auto-reload
```bash
npm run dev
```

### View logs
All requests are logged to console in development mode.

## Security Features

- JWT token authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting ready
- Helmet security headers
- CORS configuration

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Use strong `JWT_SECRET`
3. Configure proper CORS origins
4. Enable HTTPS
5. Set up reverse proxy (nginx/Apache)
6. Configure database backups
7. Set up monitoring and logging
8. Use process manager (PM2)

```bash
npm install -g pm2
pm2 start src/index.js --name cams-api
pm2 save
pm2 startup
```

## License

ISC
