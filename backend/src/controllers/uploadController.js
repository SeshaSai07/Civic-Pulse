const uploadService = require('../services/uploadService');
const { sendSuccess, sendError } = require('../utils/apiResponse');

async function uploadImage(req, res, next) {
  try {
    if (!req.file) {
      return sendError(res, 'No image file provided', 400);
    }
    const uploaded = await uploadService.uploadImageToCloudinary(req.file.buffer);
    return sendSuccess(res, uploaded, 'Image uploaded successfully', 201);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadImage,
};
