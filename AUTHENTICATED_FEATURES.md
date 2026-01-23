# Authenticated User Mailbox Features

## Overview
This update adds enhanced mailbox management for authenticated users with extended expiry times and additional functionality.

## Key Changes

### 1. Extended Mail Expiry for Authenticated Users
- **Anonymous users**: 24 hours
- **Authenticated users**: 1 week (7 days)

### 2. New API Endpoints

#### User Profile Management
- `PUT /api/users/profile` - Update user profile (fullName)
- `POST /api/users/change-password` - Change user password

#### Authenticated User Mailbox Management
All endpoints under `/api/user/mailbox` require authentication.

- `POST /api/user/mailbox/create` - Create a new mailbox for authenticated user
  - Body: `{ "alias": "myalias" }`
  - Maximum 5 mailboxes per user (configurable via `MAX_MAILBOXES_PER_USER` env variable)
  - Expiry: 1 week from creation

- `GET /api/user/mailbox` - Get all mailboxes for authenticated user
  - Returns list of all active mailboxes with details

- `GET /api/user/mailbox/:mailboxId` - Get specific mailbox details
  - Returns detailed information about a specific mailbox

- `DELETE /api/user/mailbox/:mailboxId` - Delete a mailbox (soft delete)
  - Deactivates the mailbox and associated disposable email

- `POST /api/user/mailbox/:mailboxId/extend` - Extend mailbox expiry
  - Extends mailbox expiry by another week from current expiry or now (whichever is later)

### 3. Database Schema Updates

#### Mailbox Model
Added `userId` field to support authenticated user mailboxes:
```javascript
userId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'User ID for authenticated users',
}
```

#### DisposableEmail Model
Added `userId` field for consistency:
```javascript
userId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'User ID for authenticated users'
}
```

### 4. Controller Functions

#### New Mailbox Controller Functions
- `createAuthenticatedMailbox` - Create mailbox with 1-week expiry for authenticated users
- `getUserMailboxes` - Get all mailboxes owned by user
- `deleteUserMailbox` - Soft delete user's mailbox
- `extendMailboxExpiry` - Extend mailbox expiry by 1 week
- `getUserMailboxDetails` - Get detailed info about a specific mailbox

#### New User Controller Functions
- `updateProfile` - Update user's full name
- `changePassword` - Change user's password with validation

### 5. Environment Variables

Add to your `.env` file:
```env
MAX_MAILBOXES_PER_USER=5  # Maximum mailboxes per authenticated user
```

## Authentication Flow

1. **Register**: `POST /api/users/register`
2. **Login**: `POST /api/users/login` (sets JWT token in cookie)
   - Optional: Pass `migrateSession: true` in body to transfer anonymous mailbox to your account
3. **Access Protected Routes**: Use the JWT token from cookie
4. **Logout**: `POST /api/users/logout` (clears both token and sessionToken cookies)

### Session Cookie Management

The system uses **two separate cookie types**:
- **`token`**: JWT cookie for authenticated users (set on login)
- **`sessionToken`**: Anonymous session cookie for guest users (set on guest session creation)

**Important behaviors:**
- When a user **logs in**, the `sessionToken` cookie is automatically cleared
- When a user **logs out**, both `token` and `sessionToken` cookies are cleared
- **Anonymous → Authenticated migration**: If you have an anonymous mailbox and log in with `migrateSession: true`, your temporary mailbox will be:
  - Transferred to your user account
  - Extended from 24 hours to 1 week
  - Converted from sessionToken to userId ownership

### Mailbox Migration Example
```bash
# Login with session migration
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -b "sessionToken=YOUR_GUEST_SESSION" \
  -d '{
    "email": "user@example.com",
    "password": "yourpassword",
    "migrateSession": true
  }'

# Response includes migrated mailbox info:
{
  "message": "Login successful. Your anonymous mailbox has been transferred to your account with extended expiry!",
  "token": "...",
  "migratedMailbox": {
    "emailAddress": "myalias@sparemails.com",
    "expiresAt": "2026-01-30T..."
  }
}
```

## Example Usage

### Create Authenticated Mailbox
```bash
curl -X POST http://localhost:5000/api/user/mailbox/create \
  -H "Content-Type: application/json" \
  -b "token=YOUR_JWT_TOKEN" \
  -d '{"alias": "myemail"}'
```

### Get All User Mailboxes
```bash
curl -X GET http://localhost:5000/api/user/mailbox \
  -b "token=YOUR_JWT_TOKEN"
```

### Extend Mailbox Expiry
```bash
curl -X POST http://localhost:5000/api/user/mailbox/:mailboxId/extend \
  -b "token=YOUR_JWT_TOKEN"
```

### Delete Mailbox
```bash
curl -X DELETE http://localhost:5000/api/user/mailbox/:mailboxId \
  -b "token=YOUR_JWT_TOKEN"
```

## Migration Notes

If you have an existing database, you'll need to add the new `userId` column to both the `Mailboxes` and `DisposableEmails` tables. The application will handle this automatically on next startup if using Sequelize sync.

For production environments, consider creating a proper migration script:
```sql
ALTER TABLE Mailboxes ADD COLUMN userId UUID NULL;
ALTER TABLE DisposableEmails ADD COLUMN userId UUID NULL;
```

## Benefits

1. **Longer retention**: Authenticated users get 7 days vs 24 hours for anonymous
2. **Multiple mailboxes**: Users can create up to 5 mailboxes
3. **Mailbox management**: Easy CRUD operations on mailboxes
4. **Extendable expiry**: Users can extend mailbox lifetime by another week
5. **Better tracking**: All mailboxes linked to user account
