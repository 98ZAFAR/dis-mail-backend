const verifyAdmin = (req, res, next) => {
  try {
    const user = req.user;
    if (user && user.role === "admin") {
      next();
    } else {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

module.exports = verifyAdmin;