const { verifyToken } = require("../libs/utils/auth");

const validateUser = (req, res, next) => {
  try {
    const token = req.cookies.token || "";
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    console.error("Validation failed: ", error);
  }
};

module.exports = validateUser;
