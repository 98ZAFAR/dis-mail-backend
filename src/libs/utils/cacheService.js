const redis = require("../../configs/redisConfigs");

/**
 * Cache Service
 * Provides caching utilities for mailbox lookups and session storage
 */

// Cache TTLs (Time To Live in seconds)
const CACHE_TTL = {
  MAILBOX_LOOKUP: 300, // 5 minutes
  SESSION: 86400, // 24 hours
  ALIAS_CHECK: 600, // 10 minutes
  OTP: 600, // 10 minutes
};

// Cache key prefixes
const KEYS = {
  MAILBOX_BY_EMAIL: "mailbox:email:",
  MAILBOX_BY_ID: "mailbox:id:",
  SESSION: "session:",
  ALIAS_EXISTS: "alias:",
  OTP: "otp:",
};

/**
 * Mailbox Caching
 */

// Cache mailbox by email address
const cacheMailboxByEmail = async (emailAddress, mailboxData) => {
  try {
    const key = KEYS.MAILBOX_BY_EMAIL + emailAddress.toLowerCase();
    await redis.setex(key, CACHE_TTL.MAILBOX_LOOKUP, JSON.stringify(mailboxData));
    return true;
  } catch (error) {
    console.error("Error caching mailbox by email:", error);
    return false;
  }
};

// Get mailbox from cache by email
const getMailboxByEmail = async (emailAddress) => {
  try {
    const key = KEYS.MAILBOX_BY_EMAIL + emailAddress.toLowerCase();
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error("Error getting mailbox from cache:", error);
    return null;
  }
};

// Cache mailbox by ID
const cacheMailboxById = async (mailboxId, mailboxData) => {
  try {
    const key = KEYS.MAILBOX_BY_ID + mailboxId;
    await redis.setex(key, CACHE_TTL.MAILBOX_LOOKUP, JSON.stringify(mailboxData));
    return true;
  } catch (error) {
    console.error("Error caching mailbox by ID:", error);
    return false;
  }
};

// Get mailbox from cache by ID
const getMailboxById = async (mailboxId) => {
  try {
    const key = KEYS.MAILBOX_BY_ID + mailboxId;
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error("Error getting mailbox by ID from cache:", error);
    return null;
  }
};

// Invalidate mailbox cache
const invalidateMailboxCache = async (emailAddress, mailboxId) => {
  try {
    const keys = [];
    if (emailAddress) {
      keys.push(KEYS.MAILBOX_BY_EMAIL + emailAddress.toLowerCase());
    }
    if (mailboxId) {
      keys.push(KEYS.MAILBOX_BY_ID + mailboxId);
    }
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return true;
  } catch (error) {
    console.error("Error invalidating mailbox cache:", error);
    return false;
  }
};

/**
 * Session Caching
 */

// Cache session data
const cacheSession = async (sessionToken, sessionData) => {
  try {
    const key = KEYS.SESSION + sessionToken;
    await redis.setex(key, CACHE_TTL.SESSION, JSON.stringify(sessionData));
    return true;
  } catch (error) {
    console.error("Error caching session:", error);
    return false;
  }
};

// Get session from cache
const getSession = async (sessionToken) => {
  try {
    const key = KEYS.SESSION + sessionToken;
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error("Error getting session from cache:", error);
    return null;
  }
};

// Invalidate session
const invalidateSession = async (sessionToken) => {
  try {
    const key = KEYS.SESSION + sessionToken;
    await redis.del(key);
    return true;
  } catch (error) {
    console.error("Error invalidating session:", error);
    return false;
  }
};

// Update session TTL
const refreshSession = async (sessionToken) => {
  try {
    const key = KEYS.SESSION + sessionToken;
    await redis.expire(key, CACHE_TTL.SESSION);
    return true;
  } catch (error) {
    console.error("Error refreshing session:", error);
    return false;
  }
};

/**
 * Alias Availability Caching
 */

// Cache alias existence check
const cacheAliasExists = async (alias, exists) => {
  try {
    const key = KEYS.ALIAS_EXISTS + alias.toLowerCase();
    await redis.setex(key, CACHE_TTL.ALIAS_CHECK, exists ? "1" : "0");
    return true;
  } catch (error) {
    console.error("Error caching alias check:", error);
    return false;
  }
};

// Check if alias exists from cache
const isAliasCached = async (alias) => {
  try {
    const key = KEYS.ALIAS_EXISTS + alias.toLowerCase();
    const cached = await redis.get(key);
    if (cached === null) return null; // Not in cache
    return cached === "1"; // true if exists, false if not
  } catch (error) {
    console.error("Error checking alias from cache:", error);
    return null;
  }
};

// Invalidate alias cache
const invalidateAliasCache = async (alias) => {
  try {
    const key = KEYS.ALIAS_EXISTS + alias.toLowerCase();
    await redis.del(key);
    return true;
  } catch (error) {
    console.error("Error invalidating alias cache:", error);
    return false;
  }
};

/**
 * OTP Caching
 */

// Store OTP for user
const cacheOTP = async (userId, otp, purpose = "password_change") => {
  try {
    const key = KEYS.OTP + purpose + ":" + userId;
    const data = {
      otp,
      attempts: 0,
      createdAt: new Date().toISOString(),
    };
    // Upstash Redis auto-handles JSON, no need for JSON.stringify
    await redis.setex(key, CACHE_TTL.OTP, data);
    console.log(`[OTP Cached] User: ${userId}, Purpose: ${purpose}, Expires: ${CACHE_TTL.OTP}s`);
    return true;
  } catch (error) {
    console.error("Error caching OTP:", error);
    return false;
  }
};

// Get OTP data for user
const getOTP = async (userId, purpose = "password_change") => {
  try {
    const key = KEYS.OTP + purpose + ":" + userId;
    // Upstash Redis auto-parses JSON, returns object directly
    const cached = await redis.get(key);
    return cached || null;
  } catch (error) {
    console.error("Error getting OTP from cache:", error);
    return null;
  }
};

// Increment OTP verification attempt
const incrementOTPAttempt = async (userId, purpose = "password_change") => {
  try {
    const otpData = await getOTP(userId, purpose);
    if (!otpData) return false;

    otpData.attempts += 1;
    const key = KEYS.OTP + purpose + ":" + userId;
    
    // Get remaining TTL
    const ttl = await redis.ttl(key);
    if (ttl > 0) {
      // Upstash Redis auto-handles JSON
      await redis.setex(key, ttl, otpData);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error incrementing OTP attempt:", error);
    return false;
  }
};

// Delete OTP after successful verification
const deleteOTP = async (userId, purpose = "password_change") => {
  try {
    const key = KEYS.OTP + purpose + ":" + userId;
    await redis.del(key);
    console.log(`[OTP Deleted] User: ${userId}, Purpose: ${purpose}`);
    return true;
  } catch (error) {
    console.error("Error deleting OTP:", error);
    return false;
  }
};

/**
 * Utility Functions
 */

// Clear all cache
const clearAllCache = async () => {
  try {
    // Get all keys with our prefixes
    const patterns = Object.values(KEYS);
    let deletedCount = 0;

    for (const pattern of patterns) {
      const keys = await redis.keys(pattern + "*");
      if (keys.length > 0) {
        await redis.del(...keys);
        deletedCount += keys.length;
      }
    }

    return { success: true, deletedCount };
  } catch (error) {
    console.error("Error clearing cache:", error);
    return { success: false, error: error.message };
  }
};

// Get cache stats
const getCacheStats = async () => {
  try {
    const stats = {};

    for (const [name, prefix] of Object.entries(KEYS)) {
      const keys = await redis.keys(prefix + "*");
      stats[name.toLowerCase()] = keys.length;
    }

    return stats;
  } catch (error) {
    console.error("Error getting cache stats:", error);
    return null;
  }
};

module.exports = {
  // Mailbox caching
  cacheMailboxByEmail,
  getMailboxByEmail,
  cacheMailboxById,
  getMailboxById,
  invalidateMailboxCache,

  // Session caching
  cacheSession,
  getSession,
  invalidateSession,
  refreshSession,

  // Alias caching
  cacheAliasExists,
  isAliasCached,
  invalidateAliasCache,

  // OTP caching
  cacheOTP,
  getOTP,
  incrementOTPAttempt,
  deleteOTP,

  // Utilities
  clearAllCache,
  getCacheStats,
};
