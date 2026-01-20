const crypto = require("crypto");
const { setCookies } = require("../../configs/cookieConfigs");


const createGuestSession = async (req, res) => {
  try {
    const existingSessionId = req.cookies.sessionToken;
    if (existingSessionId) {
      return res.status(400).json({
        message: "Guest session already exists",
      });
    }

    const sessionToken = crypto.randomUUID();

    setCookies(res, "sessionToken", sessionToken, {
      maxAge: 24 * 60 * 60 * 1000,
    });

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

module.exports = {
  createGuestSession,
};
