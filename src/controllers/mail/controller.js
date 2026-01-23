const Mailbox = require("../../models/mailbox/model");
const Mail = require("../../models/mail/model");
const Attachment = require("../../models/attachments/model");
const { decrypt } = require("../../libs/utils/decryption");
const {
  getMailboxByEmail,
  cacheMailboxByEmail,
} = require("../../libs/utils/cacheService");

const validateRecipient = async (req, res) => {
  try {
    const { emailAddress } = req.body;

    if (!emailAddress) {
      return res.status(400).json({
        valid: false,
        message: "Email address is required",
      });
    }

    const normalizedEmail = emailAddress.toLowerCase();

    // Try to get from cache first
    let mailbox = await getMailboxByEmail(normalizedEmail);

    if (!mailbox) {
      // Cache miss - fetch from database
      console.log(`[Cache Miss] Mailbox lookup: ${normalizedEmail}`);
      
      mailbox = await Mailbox.findOne({
        where: {
          emailAddress: normalizedEmail,
          isActive: true,
        },
      });

      if (!mailbox) {
        return res.status(200).json({
          valid: false,
          message: "Mailbox not found",
        });
      }

      // Cache the mailbox for future lookups
      await cacheMailboxByEmail(normalizedEmail, {
        id: mailbox.id,
        emailAddress: mailbox.emailAddress,
        isActive: mailbox.isActive,
        expiresAt: mailbox.expiresAt,
      });
      
      console.log(`[Cache Set] Mailbox cached: ${normalizedEmail}`);
    } else {
      console.log(`[Cache Hit] Mailbox lookup: ${normalizedEmail}`);
    }

    // Check if mailbox has expired
    if (mailbox.expiresAt && new Date(mailbox.expiresAt) < new Date()) {
      return res.status(200).json({
        valid: false,
        message: "Mailbox has expired",
      });
    }

    // Update last accessed time (async, don't wait)
    if (!mailbox.update) {
      // If from cache, update DB in background
      Mailbox.update(
        { lastAccessedAt: new Date() },
        { where: { id: mailbox.id } }
      ).catch((err) => console.error("Error updating lastAccessedAt:", err));
    } else {
      mailbox.update({ lastAccessedAt: new Date() }).catch((err) =>
        console.error("Error updating lastAccessedAt:", err)
      );
    }

    return res.status(200).json({
      valid: true,
      mailboxId: mailbox.id,
    });
  } catch (error) {
    res.status(500).json({
      valid: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

const receiveEmail = async (req, res) => {
  try {
    const { iv, encryptedData } = req.body;

    if (!iv || !encryptedData) {
      return res.status(400).json({
        message: "Invalid encrypted data",
      });
    }

    // Decrypt the email data
    const mailData = decrypt(iv, encryptedData);

    // Validate mailbox still exists and is active
    const mailbox = await Mailbox.findByPk(mailData.mailboxId);
    if (!mailbox || !mailbox.isActive) {
      return res.status(404).json({
        message: "Mailbox not found or inactive",
      });
    }

    // Create the mail record
    const mail = await Mail.create({
      mailboxId: mailData.mailboxId,
      messageId: mailData.messageId,
      from: mailData.from,
      fromName: mailData.fromName,
      to: mailData.to,
      cc: mailData.cc,
      bcc: mailData.bcc,
      subject: mailData.subject,
      bodyText: mailData.bodyText,
      bodyHTML: mailData.bodyHTML,
      bodyHeaders: mailData.bodyHeaders,
      hasAttachments: mailData.hasAttachments,
      size: mailData.size,
      isRead: false,
      isStarred: false,
      receivedAt: mailData.receivedAt,
    });

    // Create attachment records if any
    if (mailData.attachments && mailData.attachments.length > 0) {
      const attachmentRecords = mailData.attachments.map((att) => ({
        mailId: mail.id,
        filename: att.filename,
        contentType: att.contentType,
        size: att.size,
        content: att.content ? Buffer.from(att.content, "base64") : null,
        contentId: att.contentId,
        isInline: att.contentDisposition === "inline",
      }));

      await Attachment.bulkCreate(attachmentRecords);
    }

    console.log(`✓ Email stored: ${mail.subject} to ${mailbox.emailAddress}`);

    return res.status(201).json({
      message: "Email received and stored successfully",
      mailId: mail.id,
    });
  } catch (error) {
    console.error("Error receiving email:", error);
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

const getMailboxEmails = async (req, res) => {
  try {
    const sessionToken = req.cookies.sessionToken;
    if (!sessionToken) {
      return res.status(401).json({
        message: "No active session found",
      });
    }

    const mailbox = await Mailbox.findOne({
      where: { sessionToken },
    });

    if (!mailbox) {
      return res.status(404).json({
        message: "Mailbox not found",
      });
    }

    const emails = await Mail.findAll({
      where: { mailboxId: mailbox.id },
      order: [["receivedAt", "DESC"]],
      attributes: {
        exclude: ["bodyText", "bodyHTML", "bodyHeaders"],
      },
    });

    return res.status(200).json({
      mailbox: {
        emailAddress: mailbox.emailAddress,
        alias: mailbox.alias,
        expiresAt: mailbox.expiresAt,
      },
      emails,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

const getEmailById = async (req, res) => {
  try {
    const { emailId } = req.params;
    const sessionToken = req.cookies.sessionToken;

    if (!sessionToken) {
      return res.status(401).json({
        message: "No active session found",
      });
    }

    const mailbox = await Mailbox.findOne({
      where: { sessionToken },
    });

    if (!mailbox) {
      return res.status(404).json({
        message: "Mailbox not found",
      });
    }

    const email = await Mail.findOne({
      where: {
        id: emailId,
        mailboxId: mailbox.id,
      },
      include: [
        {
          model: Attachment,
          attributes: { exclude: ["content"] },
        },
      ],
    });

    if (!email) {
      return res.status(404).json({
        message: "Email not found",
      });
    }

    // Mark as read
    if (!email.isRead) {
      await email.update({ isRead: true });
    }

    return res.status(200).json({ email });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  validateRecipient,
  receiveEmail,
  getMailboxEmails,
  getEmailById,
};
