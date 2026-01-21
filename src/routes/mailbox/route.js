const { createMailbox, getMailboxDetails } = require("../../controllers/mailbox/controller");
const verifySession = require("../../middlewares/sessionMiddleware");

const router = require("express").Router();

router.post("/create", verifySession, createMailbox);
router.get("/", verifySession, getMailboxDetails);

module.exports = router;