# OTP Verification for Password Change

## Overview
A secure OTP (One-Time Password) verification system has been implemented for password changes. This adds an extra layer of security by requiring users to verify their email before changing their password.

## Features

### 🔐 Security Features
- **6-digit OTP** generated using cryptographically secure random numbers
- **10-minute expiry** for OTP codes
- **Rate limiting**: Maximum 5 verification attempts per OTP
- **Auto-cleanup**: OTP is deleted after successful verification or expiry
- **Brute force protection**: OTP invalidated after max attempts
- **Redis caching**: Fast and secure OTP storage

### 📧 Email Notifications
- Professional HTML email template
- Masked email display for privacy
- Clear security warnings
- Plain text fallback

## Setup

### 1. Install Required Dependency
```bash
cd backend
npm install nodemailer
```

### 2. Environment Variables
Add these to your `.env` file:

```env
# SMTP Configuration for sending OTP emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
SMTP_FROM_NAME=Disposable Mail
SMTP_FROM_EMAIL=noreply@sparemails.com
```

### Gmail Setup (If using Gmail)
1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the generated 16-character password
   - Use this as `SMTP_PASSWORD` in `.env`

### Alternative SMTP Services
- **SendGrid**: `smtp.sendgrid.net:587`
- **Mailgun**: `smtp.mailgun.org:587`
- **AWS SES**: `email-smtp.[region].amazonaws.com:587`
- **Outlook**: `smtp-mail.outlook.com:587`

## API Endpoints

### 1. Request Password Change OTP

**Endpoint**: `POST /api/users/request-password-otp`

**Authentication**: Required (JWT token)

**Request**:
```bash
curl -X POST http://localhost:5000/api/users/request-password-otp \
  -H "Content-Type: application/json" \
  -b "token=YOUR_JWT_TOKEN"
```

**Response** (Success):
```json
{
  "message": "OTP sent to your email address. Valid for 10 minutes.",
  "email": "us***@example.com",
  "expiresIn": 600
}
```

**Response** (Error):
```json
{
  "message": "Failed to send OTP email. Please try again later.",
  "error": "SMTP connection failed"
}
```

### 2. Change Password with OTP

**Endpoint**: `POST /api/users/change-password`

**Authentication**: Required (JWT token)

**Request Body**:
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456",
  "otp": "123456"
}
```

**Request**:
```bash
curl -X POST http://localhost:5000/api/users/change-password \
  -H "Content-Type: application/json" \
  -b "token=YOUR_JWT_TOKEN" \
  -d '{
    "currentPassword": "oldpassword123",
    "newPassword": "newpassword456",
    "otp": "123456"
  }'
```

**Response** (Success):
```json
{
  "message": "Password changed successfully"
}
```

**Response** (Invalid OTP):
```json
{
  "message": "Invalid OTP",
  "remainingAttempts": 4
}
```

**Response** (Expired OTP):
```json
{
  "message": "OTP has expired or not found. Please request a new OTP."
}
```

**Response** (Too Many Attempts):
```json
{
  "message": "Too many failed attempts. Please request a new OTP."
}
```

## User Flow

### Complete Password Change Flow

```
1. User clicks "Change Password"
   ↓
2. Frontend calls POST /api/users/request-password-otp
   ↓
3. Backend generates 6-digit OTP
   ↓
4. OTP stored in Redis (10-minute expiry)
   ↓
5. OTP sent to user's email
   ↓
6. User receives email with OTP code
   ↓
7. User enters: current password, new password, and OTP
   ↓
8. Frontend calls POST /api/users/change-password
   ↓
9. Backend verifies:
   - OTP is valid and not expired
   - OTP attempts < 5
   - Current password is correct
   - New password meets requirements
   ↓
10. Password updated successfully
    ↓
11. OTP deleted from cache
```

## Security Considerations

### OTP Storage
- **Redis Cache**: OTP stored in Redis with automatic expiry
- **Key Format**: `otp:password_change:USER_ID`
- **Data Stored**:
  ```json
  {
    "otp": "123456",
    "attempts": 0,
    "createdAt": "2026-01-23T10:30:00.000Z"
  }
  ```

### Rate Limiting
- Maximum **5 verification attempts** per OTP
- OTP auto-deleted after max attempts
- Must request new OTP after exhausting attempts

### Password Requirements
- Minimum **6 characters** (can be increased)
- Current password verification required
- New password hashed with bcrypt (10 rounds)

### Email Security
- Email address masked in responses: `us***@example.com`
- Clear warning if user didn't request change
- OTP only valid for 10 minutes

## Testing

### Test Email Configuration
You can add a test endpoint to verify SMTP setup:

```javascript
// In user controller
const { sendTestEmail } = require("../../libs/utils/emailService");

const testEmail = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    
    const result = await sendTestEmail(user.email);
    
    if (result.success) {
      return res.status(200).json({
        message: "Test email sent successfully",
        messageId: result.messageId,
      });
    }
    
    return res.status(500).json({
      message: "Failed to send test email",
      error: result.error,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};
```

### Manual Testing Steps

1. **Setup SMTP credentials** in `.env`
2. **Start the server**: `npm run dev`
3. **Login as a user** to get JWT token
4. **Request OTP**:
   ```bash
   POST /api/users/request-password-otp
   ```
5. **Check email** for OTP code
6. **Change password** with OTP:
   ```bash
   POST /api/users/change-password
   ```
7. **Verify** password changed successfully

## Error Handling

| Error Code | Message | Cause |
|------------|---------|-------|
| 400 | "Current password, new password, and OTP are required" | Missing required fields |
| 400 | "New password must be at least 6 characters long" | Password too short |
| 400 | "OTP has expired or not found. Please request a new OTP." | OTP expired or doesn't exist |
| 401 | "Invalid OTP" | Wrong OTP code entered |
| 401 | "Current password is incorrect" | Wrong current password |
| 404 | "User not found" | User doesn't exist |
| 429 | "Too many failed attempts. Please request a new OTP." | Exceeded 5 attempts |
| 500 | "Failed to generate OTP. Please try again." | Redis cache error |
| 500 | "Failed to send OTP email. Please try again later." | SMTP/Email error |

## File Changes

### New Files Created
- `backend/src/libs/utils/emailService.js` - Email sending service with OTP templates

### Modified Files
- `backend/src/libs/utils/cacheService.js` - Added OTP caching functions
- `backend/src/controllers/user/controller.js` - Added OTP request & verification
- `backend/src/routes/user/route.js` - Added new OTP endpoints

### Functions Added

#### cacheService.js
- `cacheOTP(userId, otp, purpose)` - Store OTP in cache
- `getOTP(userId, purpose)` - Retrieve OTP data
- `incrementOTPAttempt(userId, purpose)` - Track verification attempts
- `deleteOTP(userId, purpose)` - Remove OTP from cache

#### emailService.js
- `sendPasswordChangeOTP(email, otp, userName)` - Send OTP email
- `sendTestEmail(email)` - Test SMTP configuration

#### user/controller.js
- `requestPasswordChangeOTP(req, res)` - Generate and send OTP
- Updated `changePassword(req, res)` - Now requires OTP verification

## Frontend Integration Example

```javascript
// Step 1: Request OTP
const requestOTP = async () => {
  try {
    const response = await fetch('/api/users/request-password-otp', {
      method: 'POST',
      credentials: 'include', // Include cookies
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert(`OTP sent to ${data.email}`);
      // Show OTP input form
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

// Step 2: Change Password with OTP
const changePassword = async (currentPassword, newPassword, otp) => {
  try {
    const response = await fetch('/api/users/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        currentPassword,
        newPassword,
        otp
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert('Password changed successfully!');
      // Redirect to login or profile
    } else {
      alert(data.message);
      if (data.remainingAttempts !== undefined) {
        alert(`Remaining attempts: ${data.remainingAttempts}`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

## Troubleshooting

### OTP Email Not Received

1. **Check SMTP credentials** in `.env`
2. **Verify email address** is correct in user profile
3. **Check spam folder** in email
4. **Test SMTP connection**:
   ```bash
   # Check server logs for email sending errors
   npm run dev
   ```
5. **Gmail users**: Ensure App Password is used (not regular password)

### "Failed to send OTP email"

- **Check internet connection**
- **Verify SMTP host and port** are correct
- **Check firewall settings** (allow outbound SMTP port)
- **Review server logs** for detailed error messages

### "OTP has expired"

- OTP is valid for **10 minutes only**
- Request a new OTP if expired
- Check system time is synchronized

## Future Enhancements

- [ ] SMS-based OTP as alternative to email
- [ ] Configurable OTP expiry time via environment variable
- [ ] OTP for email verification during registration
- [ ] Password reset via email (forgot password)
- [ ] 2FA/MFA implementation
- [ ] Rate limiting on OTP requests (prevent spam)
- [ ] Audit log for password changes
