# Quick Setup: OTP Verification for Password Change

## 1. Install nodemailer
```bash
npm install nodemailer
```

## 2. Add to .env file
```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password
SMTP_FROM_NAME=Disposable Mail
SMTP_FROM_EMAIL=noreply@sparemails.com
```

## 3. Gmail App Password Setup (If using Gmail)
1. Go to: https://myaccount.google.com/apppasswords
2. Select "Mail" + your device
3. Copy 16-character password
4. Use as `SMTP_PASSWORD`

## 4. Test the Implementation
```bash
# Start server
npm run dev

# 1. Login to get token
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"yourpassword"}'

# 2. Request OTP
curl -X POST http://localhost:5000/api/users/request-password-otp \
  -b "token=YOUR_JWT_TOKEN"

# 3. Check email for OTP, then change password
curl -X POST http://localhost:5000/api/users/change-password \
  -H "Content-Type: application/json" \
  -b "token=YOUR_JWT_TOKEN" \
  -d '{
    "currentPassword": "oldpass",
    "newPassword": "newpass",
    "otp": "123456"
  }'
```

## New API Endpoints
- `POST /api/users/request-password-otp` - Request OTP (requires auth)
- `POST /api/users/change-password` - Change password with OTP (requires auth + OTP)

## Features
✅ 6-digit OTP with 10-minute expiry
✅ Email delivery with professional template
✅ Max 5 verification attempts
✅ Brute force protection
✅ Auto-cleanup after verification

See `OTP_IMPLEMENTATION.md` for complete documentation.
