const cloudinary = require('../../configs/cloudinaryConfigs');
const streamifier = require('streamifier');

/**
 * Upload a file to Cloudinary from buffer
 * @param {Buffer} fileBuffer - File buffer to upload
 * @param {String} filename - Original filename
 * @param {String} contentType - MIME type of the file
 * @returns {Promise<Object>} Cloudinary upload result
 */
const uploadToCloudinary = (fileBuffer, filename, contentType) => {
    return new Promise((resolve, reject) => {
        // Determine resource type based on content type
        let resourceType = 'auto';
        if (contentType.startsWith('image/')) {
            resourceType = 'image';
        } else if (contentType.startsWith('video/')) {
            resourceType = 'video';
        } else {
            resourceType = 'raw';
        }

        // Create upload stream
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'mail-attachments',
                resource_type: resourceType,
                public_id: `${Date.now()}-${filename.split('.')[0]}`,
                use_filename: true,
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );

        // Convert buffer to stream and pipe to Cloudinary
        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
};

/**
 * Delete a file from Cloudinary
 * @param {String} publicId - Cloudinary public ID of the file
 * @param {String} resourceType - Type of resource (image, video, raw)
 * @returns {Promise<Object>} Cloudinary deletion result
 */
const deleteFromCloudinary = async (publicId, resourceType = 'raw') => {
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
        });
        return result;
    } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
        throw error;
    }
};

/**
 * Get optimized URL for an attachment
 * @param {String} publicId - Cloudinary public ID
 * @param {Object} options - Transformation options
 * @returns {String} Optimized URL
 */
const getOptimizedUrl = (publicId, options = {}) => {
    return cloudinary.url(publicId, {
        secure: true,
        ...options,
    });
};

module.exports = {
    uploadToCloudinary,
    deleteFromCloudinary,
    getOptimizedUrl,
};
