const { manualCleanup } = require("../../libs/utils/schedular");
const { Mailbox, Mail, Attachment, DisposableEmail } = require("../../models");
const { Op } = require("sequelize");

const triggerCleanup = async (req, res) => {
  try {
    await manualCleanup();

    return res.status(200).json({
      message: "Cleanup triggered successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

const getStats = async (req, res) => {
  try {
    const now = new Date();

    const totalMailboxes = await Mailbox.count();
    const activeMailboxes = await Mailbox.count({
      where: { isActive: true },
    });
    const expiredMailboxes = await Mailbox.count({
      where: {
        expiresAt: {
          [Op.lt]: now,
        },
      },
    });
    const totalEmails = await Mail.count();
    const unreadEmails = await Mail.count({
      where: { isRead: false },
    });
    const totalAttachments = await Attachment.count();

    const stats = {
      mailboxes: {
        total: totalMailboxes,
        active: activeMailboxes,
        expired: expiredMailboxes,
        inactive: totalMailboxes - activeMailboxes,
      },
      emails: {
        total: totalEmails,
        unread: unreadEmails,
        read: totalEmails - unreadEmails,
      },
      attachments: {
        total: totalAttachments,
      },
      scheduler: {
        interval: "Every 10 minutes",
        nextCleanup: "Check scheduler logs",
      },
    };

    return res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

const getAllMailboxes = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", status = "all" } = req.query;
    const offset = (page - 1) * limit;
    const now = new Date();

    let whereClause = {};

    if (search) {
      whereClause = {
        [Op.or]: [
          { emailAddress: { [Op.iLike]: `%${search}%` } },
          { alias: { [Op.iLike]: `%${search}%` } },
        ],
      };
    }

    if (status === "active") {
      whereClause.isActive = true;
      whereClause.expiresAt = { [Op.gt]: now };
    } else if (status === "expired") {
      whereClause.expiresAt = { [Op.lt]: now };
    } else if (status === "inactive") {
      whereClause.isActive = false;
    }

    const { count, rows } = await Mailbox.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Mail,
          attributes: [],
        },
      ],
      attributes: {
        include: [
          [
            Mailbox.sequelize.fn("COUNT", Mailbox.sequelize.col("Mails.id")),
            "emailCount",
          ],
        ],
      },
      group: ["Mailbox.id"],
      subQuery: false,
    });

    return res.status(200).json({
      mailboxes: rows,
      pagination: {
        total: count.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count.length / limit),
      },
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
    const { mailboxId } = req.params;

    const mailbox = await Mailbox.findByPk(mailboxId, {
      include: [
        {
          model: DisposableEmail,
        },
        {
          model: Mail,
          order: [["receivedAt", "DESC"]],
          limit: 10,
          attributes: { exclude: ["bodyText", "bodyHTML", "bodyHeaders"] },
        },
      ],
    });

    if (!mailbox) {
      return res.status(404).json({
        message: "Mailbox not found",
      });
    }

    const emailCount = await Mail.count({
      where: { mailboxId: mailbox.id },
    });

    const unreadCount = await Mail.count({
      where: { mailboxId: mailbox.id, isRead: false },
    });

    return res.status(200).json({
      mailbox: {
        ...mailbox.toJSON(),
        emailCount,
        unreadCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

const deleteMailbox = async (req, res) => {
  try {
    const { mailboxId } = req.params;

    const mailbox = await Mailbox.findByPk(mailboxId);

    if (!mailbox) {
      return res.status(404).json({
        message: "Mailbox not found",
      });
    }

    const emailAddress = mailbox.emailAddress;
    await mailbox.destroy();

    return res.status(200).json({
      message: `Mailbox ${emailAddress} deleted successfully`,
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
    const { mailboxId } = req.params;
    const { hours = 24 } = req.body;

    const mailbox = await Mailbox.findByPk(mailboxId);

    if (!mailbox) {
      return res.status(404).json({
        message: "Mailbox not found",
      });
    }

    const currentExpiry = new Date(mailbox.expiresAt);
    const newExpiry = new Date(currentExpiry.getTime() + hours * 60 * 60 * 1000);

    await mailbox.update({
      expiresAt: newExpiry,
      isActive: true,
    });

    await DisposableEmail.update(
      { expiresAt: newExpiry, isActive: true },
      { where: { mailboxId: mailbox.id } }
    );

    return res.status(200).json({
      message: `Mailbox expiry extended by ${hours} hours`,
      emailAddress: mailbox.emailAddress,
      newExpiresAt: newExpiry,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

const toggleMailboxStatus = async (req, res) => {
  try {
    const { mailboxId } = req.params;

    const mailbox = await Mailbox.findByPk(mailboxId);

    if (!mailbox) {
      return res.status(404).json({
        message: "Mailbox not found",
      });
    }

    await mailbox.update({
      isActive: !mailbox.isActive,
    });

    await DisposableEmail.update(
      { isActive: !mailbox.isActive },
      { where: { mailboxId: mailbox.id } }
    );

    return res.status(200).json({
      message: `Mailbox ${mailbox.isActive ? "activated" : "deactivated"}`,
      emailAddress: mailbox.emailAddress,
      isActive: mailbox.isActive,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

const deleteAllExpired = async (req, res) => {
  try {
    const now = new Date();

    const expiredMailboxes = await Mailbox.findAll({
      where: {
        expiresAt: {
          [Op.lt]: now,
        },
      },
    });

    let deletedCount = 0;
    for (const mailbox of expiredMailboxes) {
      await mailbox.destroy();
      deletedCount++;
    }

    return res.status(200).json({
      message: `Deleted ${deletedCount} expired mailbox(es)`,
      deletedCount,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

const getRecentEmails = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const emails = await Mail.findAll({
      limit: parseInt(limit),
      order: [["receivedAt", "DESC"]],
      include: [
        {
          model: Mailbox,
          attributes: ["emailAddress", "alias"],
        },
      ],
      attributes: { exclude: ["bodyText", "bodyHTML", "bodyHeaders"] },
    });

    return res.status(200).json({
      emails,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

const searchEmails = async (req, res) => {
  try {
    const { query = "", page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {
      [Op.or]: [
        { from: { [Op.iLike]: `%${query}%` } },
        { subject: { [Op.iLike]: `%${query}%` } },
        { bodyText: { [Op.iLike]: `%${query}%` } },
      ],
    };

    const { count, rows } = await Mail.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["receivedAt", "DESC"]],
      include: [
        {
          model: Mailbox,
          attributes: ["emailAddress", "alias"],
        },
      ],
      attributes: { exclude: ["bodyText", "bodyHTML", "bodyHeaders"] },
    });

    return res.status(200).json({
      emails: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

const healthCheck = async (req, res) => {
  try {
    const dbCheck = await Mailbox.sequelize.authenticate();
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    return res.status(200).json({
      status: "healthy",
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      database: "connected",
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(503).json({
      status: "unhealthy",
      error: error.message,
    });
  }
};

module.exports = {
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
};
