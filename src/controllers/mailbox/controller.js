const { Mailbox, DisposableEmail } = require("../../models");
const {
  isAliasCached,
  cacheAliasExists,
  invalidateAliasCache,
  cacheMailboxByEmail,
  getSession,
  cacheSession,
} = require("../../libs/utils/cacheService");

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

    // Check cache first for alias existence
    let aliasExists = await isAliasCached(alias);

    if (aliasExists === null) {
      // Cache miss - check database
      console.log(`[Cache Miss] Alias check: ${alias}`);
      const existingMailbox = await Mailbox.findOne({
        where: { emailAddress },
      });
      aliasExists = !!existingMailbox;
      
      // Cache the result
      await cacheAliasExists(alias, aliasExists);
      console.log(`[Cache Set] Alias cached: ${alias} - exists: ${aliasExists}`);
    } else {
      console.log(`[Cache Hit] Alias check: ${alias} - exists: ${aliasExists}`);
    }

    if (aliasExists) {
      return res.status(409).json({
        message: "Email address already taken",
      });
    }

    // Check if session already has mailbox (check cache first)
    let sessionData = await getSession(sessionToken);

    if (!sessionData) {
      // Check database
      const existingSession = await Mailbox.findOne({
        where: { sessionToken },
      });

      if (existingSession) {
        return res.status(400).json({
          message: "Session already has a mailbox",
        });
      }
    } else if (sessionData.mailboxId) {
      return res.status(400).json({
        message: "Session already has a mailbox",
      });
    }

    const expiresAt = new Date();
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

    // Cache the new mailbox
    await cacheMailboxByEmail(emailAddress, {
      id: mailbox.id,
      emailAddress: mailbox.emailAddress,
      alias: mailbox.alias,
      isActive: mailbox.isActive,
      expiresAt: mailbox.expiresAt,
    });

    // Update session cache
    await cacheSession(sessionToken, {
      mailboxId: mailbox.id,
      emailAddress: mailbox.emailAddress,
      createdAt: new Date(),
    });

    // Invalidate alias cache since it now exists
    await invalidateAliasCache(alias);

    console.log(`[Mailbox Created] ${emailAddress} - Cached`);

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

    // Try cache first
    let sessionData = await getSession(sessionToken);

    if (sessionData && sessionData.mailboxId) {
      console.log(`[Cache Hit] Session: ${sessionToken}`);
      
      // Get full mailbox details from DB
      const mailbox = await Mailbox.findByPk(sessionData.mailboxId);
      
      if (!mailbox) {
        return res.status(404).json({ message: "Mailbox not found" });
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
    }

    // Cache miss - fetch from database
    console.log(`[Cache Miss] Session: ${sessionToken}`);
    
    const mailbox = await Mailbox.findOne({ where: { sessionToken } });
    
    if (!mailbox) {
      return res
        .status(404)
        .json({ message: "Mailbox not found for this session" });
    }

    // Cache the session data
    await cacheSession(sessionToken, {
      mailboxId: mailbox.id,
      emailAddress: mailbox.emailAddress,
      createdAt: new Date(),
    });

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

// ========== Authenticated User Mailbox Functions ==========

const createAuthenticatedMailbox = async (req, res) => {
  try {
    const userId = req.user.id;
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

    // Check if alias already exists
    let aliasExists = await isAliasCached(alias);

    if (aliasExists === null) {
      console.log(`[Cache Miss] Alias check: ${alias}`);
      const existingMailbox = await Mailbox.findOne({
        where: { emailAddress },
      });
      aliasExists = !!existingMailbox;
      await cacheAliasExists(alias, aliasExists);
      console.log(`[Cache Set] Alias cached: ${alias} - exists: ${aliasExists}`);
    } else {
      console.log(`[Cache Hit] Alias check: ${alias} - exists: ${aliasExists}`);
    }

    if (aliasExists) {
      return res.status(409).json({
        message: "Email address already taken",
      });
    }

    // Check if user already has mailboxes
    const existingMailboxes = await Mailbox.findAll({
      where: { userId },
    });

    const MAX_MAILBOXES_PER_USER = parseInt(process.env.MAX_MAILBOXES_PER_USER) || 5;
    
    if (existingMailboxes.length >= MAX_MAILBOXES_PER_USER) {
      return res.status(400).json({
        message: `Maximum of ${MAX_MAILBOXES_PER_USER} mailboxes allowed per user`,
      });
    }

    // Set expiry to 1 week for authenticated users
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 1 week

    const mailbox = await Mailbox.create({
      emailAddress,
      alias,
      domain,
      isActive: true,
      expiresAt,
      userId,
      lastAccessedAt: new Date(),
    });

    await DisposableEmail.create({
      mailboxId: mailbox.id,
      alias,
      domain,
      isActive: true,
      expiresAt,
      userId,
    });

    // Cache the new mailbox
    await cacheMailboxByEmail(emailAddress, {
      id: mailbox.id,
      emailAddress: mailbox.emailAddress,
      alias: mailbox.alias,
      isActive: mailbox.isActive,
      expiresAt: mailbox.expiresAt,
      userId: mailbox.userId,
    });

    await invalidateAliasCache(alias);

    console.log(`[Authenticated Mailbox Created] ${emailAddress} for user ${userId}`);

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

const getUserMailboxes = async (req, res) => {
  try {
    const userId = req.user.id;

    const mailboxes = await Mailbox.findAll({
      where: { userId, isActive: true },
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      mailboxes: mailboxes.map((mb) => ({
        id: mb.id,
        emailAddress: mb.emailAddress,
        alias: mb.alias,
        domain: mb.domain,
        isActive: mb.isActive,
        expiresAt: mb.expiresAt,
        createdAt: mb.createdAt,
        lastAccessedAt: mb.lastAccessedAt,
      })),
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

const deleteUserMailbox = async (req, res) => {
  try {
    const userId = req.user.id;
    const { mailboxId } = req.params;

    const mailbox = await Mailbox.findOne({
      where: { id: mailboxId, userId },
    });

    if (!mailbox) {
      return res.status(404).json({
        message: "Mailbox not found or not owned by user",
      });
    }

    // Delete mailbox and associated data (CASCADE)
    await mailbox.destroy();

    // Invalidate cache
    await invalidateAliasCache(mailbox.alias);

    return res.status(200).json({
      message: "Mailbox deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

const extendMailboxExpiry = async (req, res) => {
  try {
    const userId = req.user.id;
    const { mailboxId } = req.params;

    const mailbox = await Mailbox.findOne({
      where: { id: mailboxId, userId },
    });

    if (!mailbox) {
      return res.status(404).json({
        message: "Mailbox not found or not owned by user",
      });
    }

    // Extend by another week from current expiry or now (whichever is later)
    const newExpiresAt = new Date(
      Math.max(new Date(mailbox.expiresAt), new Date())
    );
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    await mailbox.update({ expiresAt: newExpiresAt });
    await DisposableEmail.update(
      { expiresAt: newExpiresAt },
      { where: { mailboxId } }
    );

    // Update cache
    await cacheMailboxByEmail(mailbox.emailAddress, {
      id: mailbox.id,
      emailAddress: mailbox.emailAddress,
      alias: mailbox.alias,
      isActive: mailbox.isActive,
      expiresAt: newExpiresAt,
      userId: mailbox.userId,
    });

    return res.status(200).json({
      message: "Mailbox expiry extended successfully",
      expiresAt: newExpiresAt,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

const getUserMailboxDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { mailboxId } = req.params;

    const mailbox = await Mailbox.findOne({
      where: { id: mailboxId, userId },
    });

    if (!mailbox) {
      return res.status(404).json({
        message: "Mailbox not found or not owned by user",
      });
    }

    return res.status(200).json({
      mailbox: {
        id: mailbox.id,
        emailAddress: mailbox.emailAddress,
        alias: mailbox.alias,
        domain: mailbox.domain,
        isActive: mailbox.isActive,
        expiresAt: mailbox.expiresAt,
        createdAt: mailbox.createdAt,
        lastAccessedAt: mailbox.lastAccessedAt,
      },
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
  createAuthenticatedMailbox,
  getUserMailboxes,
  deleteUserMailbox,
  extendMailboxExpiry,
  getUserMailboxDetails,
};
