const { createMailbox, getMailboxDetails } = require("../../controllers/mailbox/controller");
const verifySession = require("../../middlewares/sessionMiddleware");

const router = require("express").Router();

router.post("/mailbox", verifySession, createMailbox);
router.get("/mailbox", verifySession, getMailboxDetails);

module.exports = router;