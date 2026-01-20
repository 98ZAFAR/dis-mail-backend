const { DataTypes } = require('sequelize');

const db = require('../../configs/dbConfigs');

const Mailbox = db.define('Mailbox', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    emailAddress: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
    },
    alias: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'The username part before @ symbol',
    },
    domain: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: process.env.DEFAULT_MAIL_DOMAIN,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Auto-delete mailbox after this time',
    },
    lastAccessedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    sessionToken: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Token for anonymous access',
    },
}, {
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['emailAddress'],
        },
        {
            unique: true,
            fields: ['sessionToken'],
        },
    ],
});

module.exports = Mailbox;