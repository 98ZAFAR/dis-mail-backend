const { Mailbox, DisposableEmail } = require("../../models");

const createMailbox = async (req, res) => {
  try {
    const sessionToken = req.cookies.sessionToken;
    if (!sessionToken) {
      return res.status(401).json({
        message: "No active session found",
      });
    }

    const { alias } = req.body;
    if (!alias) {
      return res.status(400).json({
        message: "Alias is required",
      });
    }

    if (!/^[a-z0-9_-]{3,20}$/i.test(alias)) {
      return res.status(400).json({
        message:
          "Invalid alias. Use 3-20 alphanumeric characters, hyphens, or underscores",
      });
    }

    const domain = process.env.DEFAULT_MAIL_DOMAIN || "sparemails.com";
    const emailAddress = `${alias}@${domain}`;

    const existingMailbox = await Mailbox.findOne({
      where: { emailAddress },
    });

    if (existingMailbox) {
      return res.status(409).json({
        message: "Email address already taken",
      });
    }

    const existingSession = await Mailbox.findOne({
      where: { sessionToken },
    });

    if (existingSession) {
      return res.status(400).json({
        message: "Session already has a mailbox",
      });
    }

    const expiresAt = new Date();
    // expiresAt.setMinutes(expiresAt.getMinutes() + 1);
    expiresAt.setHours(expiresAt.getHours() + 24);

    const mailbox = await Mailbox.create({
      emailAddress,
      alias,
      domain,
      isActive: true,
      expiresAt,
      sessionToken,
      lastAccessedAt: new Date(),
    });

    await DisposableEmail.create({
      mailboxId: mailbox.id,
      alias,
      domain,
      isActive: true,
      expiresAt,
      guestSessionId: sessionToken,
    });

    return res.status(201).json({
      message: "Mailbox created successfully",
      email: {
        address: emailAddress,
        alias,
        domain,
        expiresAt,
      },
      mailboxId: mailbox.id,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

const getMailboxDetails = async (req, res) => {
  try {
    const sessionToken = req.cookies.sessionToken;
    if (!sessionToken) {
      return res.status(401).json({ message: "No active session found" });
    }

    const mailbox = await Mailbox.findOne({ where: { sessionToken } });
    if (!mailbox) {
      return res
        .status(404)
        .json({ message: "Mailbox not found for this session" });
    }
    return res.status(200).json({
      email: {
        address: mailbox.emailAddress,
        alias: mailbox.alias,
        domain: mailbox.domain,
        expiresAt: mailbox.expiresAt,
      },
      mailboxId: mailbox.id,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  createMailbox,
  getMailboxDetails,
};
