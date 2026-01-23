const crypto = require("crypto");
const { setCookies, clearCookies } = require("../../configs/cookieConfigs");
const { cacheSession } = require("../../libs/utils/cacheService");

const createGuestSession = async (req, res) => {
  try {
    const existingSessionId = req.cookies.sessionToken;
    if (existingSessionId) {
      return res.status(400).json({
        message: "Guest session already exists",
      });
    }

    const sessionToken = crypto.randomUUID();

    // Cache the new session
    await cacheSession(sessionToken, {
      createdAt: new Date(),
      mailboxId: null,
    });

    setCookies(res, "sessionToken", sessionToken, {
      maxAge: 24 * 60 * 60 * 1000,
    });

    console.log(`[Session Created] ${sessionToken} - Cached`);

    return res.status(201).json({
      message: "Guest session created successfully",
      sessionToken,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

const clearGuestSession = (req, res) => {
  try {
    clearCookies(res, "sessionToken");
    return res.status(200).json({
      message: "Guest session cleared successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  createGuestSession,
  clearGuestSession,
};
