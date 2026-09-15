const cloudinary = require('../config/cloudinary');

/**
 * Helper to upload image stream/buffer to Cloudinary
 */
async function uploadImageToCloudinary(fileBuffer, folder = 'civicpulse_uploads') {
  return new Promise((resolve, reject) => {
    // If Cloudinary keys are not fully set in dev mode, fallback to placeholder
    if (!process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY === '123456789') {
      return resolve({
        imageUrl: `https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80`,
        publicId: `dev_upload_${Date.now()}`,
      });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          imageUrl: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    uploadStream.end(fileBuffer);
  });
}

module.exports = {
  uploadImageToCloudinary,
};
