const {
  validateRecipient,
  receiveEmail,
  getMailboxEmails,
  getEmailById,
  getAttachment,
} = require("../../controllers/mail/controller");

const router = require("express").Router();

router.post("/validate-recipient", validateRecipient);
router.post("/receive", receiveEmail);
router.get("/inbox", getMailboxEmails);
router.get("/:emailId", getEmailById);
router.get("/attachment/:attachmentId", getAttachment);

module.exports = router;
