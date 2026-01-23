const {
  createAuthenticatedMailbox,
  getUserMailboxes,
  deleteUserMailbox,
  extendMailboxExpiry,
  getUserMailboxDetails,
} = require("../../controllers/mailbox/controller");
const validateUser = require("../../middlewares/authMiddleware");

const router = require("express").Router();

// All routes require authentication
router.use(validateUser);

// Create a new mailbox for authenticated user
router.post("/create", createAuthenticatedMailbox);

// Get all mailboxes for authenticated user
router.get("/", getUserMailboxes);

// Get specific mailbox details
router.get("/:mailboxId", getUserMailboxDetails);

// Delete a mailbox (soft delete)
router.delete("/:mailboxId", deleteUserMailbox);

// Extend mailbox expiry by 1 week
router.post("/:mailboxId/extend", extendMailboxExpiry);

module.exports = router;
