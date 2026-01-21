const { DataTypes } = require('sequelize');

const db = require('../../configs/dbConfigs');

const Attachment = db.define('Attachment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    mailId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    filename: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    contentType: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'MIME type',
    },
    size: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'File size in bytes',
    },
    url: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL to access the attachment (S3/CDN)',
    },
    content: {
        type: DataTypes.BLOB,
        allowNull: true,
        comment: 'Binary content if stored in DB',
    },
    contentId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Content-ID for inline attachments',
    },
    isInline: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether attachment is inline (embedded in HTML)',
    },
}, {
    timestamps: true,
});

module.exports = Attachment;