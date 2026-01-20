const { DataTypes } = require('sequelize');

const db = require('../../configs/dbConfigs');

const DisposableEmail = db.define('DisposableEmail', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    alias:{
        type: DataTypes.STRING(255),
        unique:true
    },
    domain: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: process.env.DEFAULT_MAIL_DOMAIN
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    expiresAt:{
        type: DataTypes.DATE,
        allowNull: false
    },
    guestSessionId:{
        type: DataTypes.UUID,
        allowNull: true
    }
}, {
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['alias'],
        },
    ],
});

module.exports = DisposableEmail;