/**
 * Migration script to add cloudinaryPublicId column to Attachments table
 * Run this if you're adding Cloudinary to an existing database
 */

const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const db = require('../configs/dbConfigs');

async function addCloudinaryPublicIdColumn() {
  try {
    console.log('Starting migration: Adding cloudinaryPublicId column...');

    // Check if column already exists
    const queryInterface = db.getQueryInterface();
    const tableDescription = await queryInterface.describeTable('Attachments');

    if (tableDescription.cloudinaryPublicId) {
      console.log('✓ Column cloudinaryPublicId already exists. Skipping migration.');
      return;
    }

    // Add the column
    await queryInterface.addColumn('Attachments', 'cloudinaryPublicId', {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Cloudinary public ID for deletion',
    });

    console.log('✓ Successfully added cloudinaryPublicId column to Attachments table');
    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('✗ Migration failed:', error);
    throw error;
  } finally {
    await db.close();
  }
}

// Run migration if executed directly
if (require.main === module) {
  addCloudinaryPublicIdColumn()
    .then(() => {
      console.log('Migration script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = addCloudinaryPublicIdColumn;
