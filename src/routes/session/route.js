const { createGuestSession, clearGuestSession } = require("../../controllers/session/controller");
const router = require("express").Router();

router.post("/initiate", createGuestSession);
router.post("/clear", clearGuestSession);

module.exports = router;