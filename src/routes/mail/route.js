const {
  validateRecipient,
  receiveEmail,
  getMailboxEmails,
  getEmailById,
} = require("../../controllers/mail/controller");

const router = require("express").Router();

router.post("/validate-recipient", validateRecipient);
router.post("/receive", receiveEmail);
router.get("/inbox", getMailboxEmails);
router.get("/:emailId", getEmailById);

module.exports = router;
