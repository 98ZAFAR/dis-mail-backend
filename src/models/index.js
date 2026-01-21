const User = require('./auth/model');
const Mailbox = require('./mailbox/model');
const DisposableEmail = require('./disposableEmail/model');
const Mail = require('./mail/model');
const Attachment = require('./attachments/model');

// Define all associations
Mailbox.hasOne(DisposableEmail, {
    foreignKey: {
        name: 'mailboxId',
        allowNull: false,
    },
    onDelete: 'CASCADE',
});

DisposableEmail.belongsTo(Mailbox, {
    foreignKey: {
        name: 'mailboxId',
        allowNull: false,
    },
    onDelete: 'CASCADE',
});

Mailbox.hasMany(Mail, {
    foreignKey: {
        name: 'mailboxId',
        allowNull: false,
    },
    onDelete: 'CASCADE',
});

Mail.belongsTo(Mailbox, {
    foreignKey: {
        name: 'mailboxId',
        allowNull: false,
    },
});

Mail.hasMany(Attachment, {
    foreignKey: {
        name: 'mailId',
        allowNull: false,
    },
    onDelete: 'CASCADE',
});

Attachment.belongsTo(Mail, {
    foreignKey: {
        name: 'mailId',
        allowNull: false,
    },
    onDelete: 'CASCADE',
});

// Sync all models after associations are defined
const syncDatabase = async () => {
    try {
        // Use force: true in development to drop and recreate tables
        // Use alter: true in production to modify existing tables
        const syncOptions = process.env.NODE_ENV === 'production' 
            ? { alter: false } 
            : { force: false };

        await User.sync(syncOptions);
        await Mailbox.sync(syncOptions);
        await DisposableEmail.sync(syncOptions);
        await Mail.sync(syncOptions);
        await Attachment.sync(syncOptions);
        console.log('All models synchronized successfully');
    } catch (error) {
        console.error('Error synchronizing models:', error);
    }
};

module.exports = {
    User,
    Mailbox,
    DisposableEmail,
    Mail,
    Attachment,
    syncDatabase,
};
