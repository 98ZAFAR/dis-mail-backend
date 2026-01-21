const {
  triggerCleanup,
  getStats,
  getAllMailboxes,
  getMailboxDetails,
  deleteMailbox,
  extendMailboxExpiry,
  toggleMailboxStatus,
  deleteAllExpired,
  getRecentEmails,
  searchEmails,
  healthCheck,
} = require("../../controllers/admin/controller");

const router = require("express").Router();

// System management
router.post("/cleanup", triggerCleanup);
router.get("/stats", getStats);
router.get("/health", healthCheck);

// Mailbox management
router.get("/mailboxes", getAllMailboxes);
router.get("/mailboxes/:mailboxId", getMailboxDetails);
router.delete("/mailboxes/:mailboxId", deleteMailbox);
router.put("/mailboxes/:mailboxId/extend", extendMailboxExpiry);
router.patch("/mailboxes/:mailboxId/toggle", toggleMailboxStatus);
router.delete("/mailboxes/expired/all", deleteAllExpired);

// Email management
router.get("/emails/recent", getRecentEmails);
router.get("/emails/search", searchEmails);

module.exports = router;
