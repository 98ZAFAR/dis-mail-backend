const { createGuestSession } = require("../../controllers/session/controller");
const router = require("express").Router();

router.post("/initiate", createGuestSession);

module.exports = router;