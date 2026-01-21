const cron = require("node-cron");
const { Op } = require("sequelize");
const { Mailbox, DisposableEmail, Mail, Attachment } = require("../../models");

/**
 * Cleanup expired mailboxes and associated data
 * Runs every 10 minutes
 */
const cleanupExpiredData = async () => {
  try {
    const now = new Date();
    console.log(`\n[Scheduler] Running cleanup at ${now.toISOString()}`);

    // Find all expired mailboxes
    const expiredMailboxes = await Mailbox.findAll({
      where: {
        expiresAt: {
          [Op.lt]: now, // Less than current time
        },
      },
      attributes: ["id", "emailAddress", "expiresAt"],
    });

    if (expiredMailboxes.length === 0) {
      console.log("[Scheduler] No expired mailboxes found");
      return;
    }

    console.log(
      `[Scheduler] Found ${expiredMailboxes.length} expired mailbox(es)`
    );

    let totalDeleted = {
      mailboxes: 0,
      disposableEmails: 0,
      mails: 0,
      attachments: 0,
    };

    // Process each expired mailbox
    for (const mailbox of expiredMailboxes) {
      console.log(
        `[Scheduler] Cleaning up: ${mailbox.emailAddress} (expired: ${mailbox.expiresAt})`
      );

      // Count related data before deletion
      const mailCount = await Mail.count({
        where: { mailboxId: mailbox.id },
      });

      const attachmentCount = await Attachment.count({
        include: [
          {
            model: Mail,
            where: { mailboxId: mailbox.id },
            attributes: [],
          },
        ],
      });

      // Delete the mailbox (CASCADE will handle DisposableEmail, Mail, Attachments)
      await mailbox.destroy();

      totalDeleted.mailboxes++;
      totalDeleted.disposableEmails++; // 1:1 relationship
      totalDeleted.mails += mailCount;
      totalDeleted.attachments += attachmentCount;

      console.log(
        `[Scheduler] ✓ Deleted: ${mailbox.emailAddress} (${mailCount} emails, ${attachmentCount} attachments)`
      );
    }

    console.log(
      `[Scheduler] Cleanup completed: ${totalDeleted.mailboxes} mailboxes, ${totalDeleted.disposableEmails} disposable emails, ${totalDeleted.mails} mails, ${totalDeleted.attachments} attachments deleted\n`
    );
  } catch (error) {
    console.error("[Scheduler] Error during cleanup:", error);
  }
};

/**
 * Deactivate mailboxes that are about to expire (within 1 hour)
 * Optional: Send notification or warning
 */
const deactivateExpiringSoon = async () => {
  try {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    const expiringSoon = await Mailbox.update(
      { isActive: false },
      {
        where: {
          expiresAt: {
            [Op.between]: [now, oneHourFromNow],
          },
          isActive: true,
        },
      }
    );

    if (expiringSoon[0] > 0) {
      console.log(
        `[Scheduler] Deactivated ${expiringSoon[0]} mailbox(es) expiring soon`
      );
    }
  } catch (error) {
    console.error("[Scheduler] Error deactivating expiring mailboxes:", error);
  }
};

const schedular = cron.schedule(
  "* * * * *",
  async () => {
    await cleanupExpiredData();
    await deactivateExpiringSoon();
  },
  {
    scheduled: false,
    timezone: "UTC",
  }
);

// Manual cleanup function for testing/debugging
const manualCleanup = async () => {
  console.log("[Manual Cleanup] Starting manual cleanup...");
  await cleanupExpiredData();
  await deactivateExpiringSoon();
  console.log("[Manual Cleanup] Completed");
};

schedular.manualCleanup = manualCleanup;

module.exports = schedular;