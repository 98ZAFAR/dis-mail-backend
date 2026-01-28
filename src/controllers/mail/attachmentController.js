const upload = require('../../configs/multerConfigs');
const Attachment = require('../../models/attachments/model');
const Mail = require('../../models/mail/model');
const Mailbox = require('../../models/mailbox/model');

/**
 * Upload attachments for a specific email
 * This is an example endpoint if you want to allow users to upload files directly
 */
const uploadAttachments = async (req, res) => {
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

    // Verify email exists and belongs to user
    const email = await Mail.findOne({
      where: {
        id: emailId,
        mailboxId: mailbox.id,
      },
    });

    if (!email) {
      return res.status(404).json({
        message: "Email not found",
      });
    }

    // Files are already uploaded to Cloudinary via multer middleware
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({
        message: "No files uploaded",
      });
    }

    // Create attachment records
    const attachmentRecords = files.map((file) => ({
      mailId: emailId,
      filename: file.originalname,
      contentType: file.mimetype,
      size: file.size,
      url: file.path, // Cloudinary URL
      cloudinaryPublicId: file.filename, // Cloudinary public ID
      contentId: null,
      isInline: false,
    }));

    const attachments = await Attachment.bulkCreate(attachmentRecords);

    // Update email hasAttachments flag
    await email.update({ hasAttachments: true });

    return res.status(201).json({
      message: "Attachments uploaded successfully",
      attachments: attachments.map((att) => ({
        id: att.id,
        filename: att.filename,
        size: att.size,
        url: att.url,
      })),
    });
  } catch (error) {
    console.error("Error uploading attachments:", error);
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * Delete an attachment
 */
const deleteAttachment = async (req, res) => {
  try {
    const { attachmentId } = req.params;
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

    // Find attachment and verify ownership
    const attachment = await Attachment.findOne({
      where: { id: attachmentId },
      include: [
        {
          model: Mail,
          where: { mailboxId: mailbox.id },
          attributes: ['id', 'hasAttachments'],
        },
      ],
    });

    if (!attachment) {
      return res.status(404).json({
        message: "Attachment not found",
      });
    }

    // Delete from Cloudinary if exists
    if (attachment.cloudinaryPublicId) {
      const { deleteFromCloudinary } = require('../../libs/utils/cloudinaryService');
      try {
        await deleteFromCloudinary(attachment.cloudinaryPublicId);
      } catch (error) {
        console.error("Error deleting from Cloudinary:", error);
      }
    }

    // Delete attachment record
    await attachment.destroy();

    // Check if email still has attachments
    const remainingAttachments = await Attachment.count({
      where: { mailId: attachment.mailId },
    });

    if (remainingAttachments === 0) {
      await Mail.update(
        { hasAttachments: false },
        { where: { id: attachment.mailId } }
      );
    }

    return res.status(200).json({
      message: "Attachment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting attachment:", error);
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  uploadAttachments,
  deleteAttachment,
};
