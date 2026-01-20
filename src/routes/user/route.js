const {
  registerUser,
  loginUser,
  logout,
  getProfile,
} = require("../../controllers/user/controller");
const validateUser = require("../../middlewares/authMiddleware");

const router = require("express").Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logout);
router.get("/profile", validateUser, getProfile);

module.exports = router;
