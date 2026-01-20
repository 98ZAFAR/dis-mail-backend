const verifySession = (req, res, next) => {
  try {
    const sessionToken = req.cookies.sessionToken || "";
    if (!sessionToken) {
      return res.status(401).json({ message: "No session ID provided" });
    }

    req.sessionToken = sessionToken;
    next();
  } catch (error) {
    console.error("Session validation failed: ", error);
  }
};

module.exports = verifySession;