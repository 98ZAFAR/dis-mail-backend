const {
  registerUser,
  loginUser,
  logout,
  getProfile,
  updateProfile,
  requestPasswordChangeOTP,
  changePassword,
} = require("../../controllers/user/controller");
const validateUser = require("../../middlewares/authMiddleware");

const router = require("express").Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logout);
router.get("/profile", validateUser, getProfile);
router.put("/profile", validateUser, updateProfile);

// Password change with OTP verification
router.post("/request-password-otp", validateUser, requestPasswordChangeOTP);
router.post("/change-password", validateUser, changePassword);

module.exports = router;
