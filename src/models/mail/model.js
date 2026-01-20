const { DataTypes } = require('sequelize');

const db = require('../../configs/dbConfigs');

const Mail = db.define('Mail', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    messageId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        comment: 'SMTP Message-ID header',
    },
    from: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isEmail: true,
        },
    },
    fromName: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Sender display name',
    },
    to: {
        type: DataTypes.JSONB,
        allowNull: false,
        comment: 'Array of recipient emails',
    },
    cc: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Array of CC recipient emails',
    },
    bcc: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Array of BCC recipient emails',
    },
    subject: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    bodyHeaders: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Headers of the email',
    },
    bodyText: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Content of the email',
    },
    bodyHTML: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'HTML content of the email',
    },
    hasAttachments: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    isStarred: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    size: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Email size in bytes',
    },
    receivedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    timestamps: true,
    indexes: [
        {
            fields: ['receivedAt'],
        },
        {
            fields: ['isRead'],
        },
    ],
});

module.exports = Mail;