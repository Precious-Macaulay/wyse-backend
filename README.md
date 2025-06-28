# Wyse Backend API

A secure, scalable backend API for the Wyse financial intelligence platform built with Node.js, Express, and MongoDB.

## 🚀 Features

- **Secure Authentication**: JWT-based authentication with email verification
- **OTP System**: Email-based OTP for account verification
- **User Management**: Complete user profile and preferences management
- **Security Features**: Rate limiting, account locking, device tracking
- **Email Service**: Automated email notifications and OTP delivery
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Centralized error handling with detailed responses

## 📋 Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or cloud instance)
- Email service (Gmail, SendGrid, etc.)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd wyse-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=3001
   NODE_ENV=development

   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/wyse

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d

   # Email Configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM=Wyse <noreply@wyse.com>

   # CORS Configuration
   CORS_ORIGIN=http://localhost:5173
   ```

4. **Start the server**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## 📚 API Documentation

### Authentication Endpoints

#### POST `/api/auth/send-otp`
Send OTP to email for verification.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "OTP sent successfully",
  "email": "user@example.com"
}
```

#### POST `/api/auth/verify-otp`
Verify OTP for email verification.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "message": "OTP verified successfully",
  "email": "user@example.com"
}
```

#### POST `/api/auth/signup`
Create new user account (requires email verification).

**Request Body:**
```json
{
  "email": "user@example.com",
  "passcode": "123456"
}
```

**Response:**
```json
{
  "message": "Account created successfully",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "isEmailVerified": true,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  "token": "jwt_token_here"
}
```

#### POST `/api/auth/signin`
Sign in user with email and passcode.

**Request Body:**
```json
{
  "email": "user@example.com",
  "passcode": "123456"
}
```

**Response:**
```json
{
  "message": "Sign in successful",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "isEmailVerified": true,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  "token": "jwt_token_here"
}
```

#### POST `/api/auth/signout`
Sign out user (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "message": "Sign out successful"
}
```

#### GET `/api/auth/verify`
Verify JWT token and return user info (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "message": "Token verified",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "isEmailVerified": true,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

### User Management Endpoints

#### GET `/api/user/profile`
Get user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "message": "Profile retrieved successfully",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "isEmailVerified": true,
    "profile": {
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "dateOfBirth": "1990-01-01T00:00:00.000Z"
    },
    "preferences": {
      "notifications": {
        "email": true,
        "push": true,
        "sms": false
      },
      "theme": "dark",
      "currency": "NGN"
    },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

#### PUT `/api/user/profile`
Update user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "dateOfBirth": "1990-01-01"
}
```

#### PUT `/api/user/preferences`
Update user preferences (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "preferences": {
    "notifications": {
      "email": true,
      "push": false,
      "sms": true
    },
    "theme": "light",
    "currency": "USD"
  }
}
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Prevents abuse with configurable limits
- **Account Locking**: Automatic account lock after failed attempts
- **Input Validation**: Comprehensive request validation
- **CORS Protection**: Configurable cross-origin resource sharing
- **Helmet Security**: Security headers for protection
- **Password Hashing**: Bcrypt-based passcode hashing

## 📧 Email Configuration

The backend uses Nodemailer for sending emails. Configure your email service in the `.env` file:

### Gmail Setup
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password
3. Use the App Password in `EMAIL_PASS`

### Other Email Services
Update the email configuration in `.env`:
```env
EMAIL_HOST=your-smtp-host
EMAIL_PORT=587
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-password
EMAIL_FROM=Wyse <noreply@wyse.com>
```

## 🗄️ Database Schema

### User Model
- `email`: Unique email address
- `passcode`: Hashed 6-digit passcode
- `isEmailVerified`: Email verification status
- `profile`: User profile information
- `preferences`: User preferences and settings
- `security`: Security-related data (devices, login attempts)
- `timestamps`: Created and updated timestamps

### OTP Model
- `email`: Email address
- `otp`: 6-digit verification code
- `type`: OTP type (email_verification, password_reset, login)
- `isUsed`: Usage status
- `expiresAt`: Expiration timestamp
- `attempts`: Verification attempts count

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/wyse
JWT_SECRET=your-production-jwt-secret
CORS_ORIGIN=https://your-frontend-domain.com
```

### PM2 Deployment
```bash
npm install -g pm2
pm2 start src/server.js --name "wyse-api"
pm2 save
pm2 startup
```

## 🧪 Testing

```bash
npm test
```

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions, please contact the development team. 