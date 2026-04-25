// Cloudinary image upload utility
// If CLOUDINARY_CLOUD_NAME is set, uploads go to Cloudinary (permanent)
// If not set, falls back to local disk (ephemeral on Railway)

const isCloudinaryConfigured = () => !!(
  process.env.CLOUDINARY_API_SECRET && (
    process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_URL
  )
);

const getMulterStorage = (multer, path) => {
  if (isCloudinaryConfigured()) {
    try {
      const cloudinary = require('cloudinary').v2;
      const { CloudinaryStorage } = require('multer-storage-cloudinary');
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dqvxvqvxv',
        api_key:    process.env.CLOUDINARY_API_KEY    || 'QSfXbiirOygQpNaBKSDfMWXDv_8',
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      console.log('✅ Cloudinary configured with cloud:', process.env.CLOUDINARY_CLOUD_NAME || 'dqvxvqvxv');
      return new CloudinaryStorage({
        cloudinary,
        params: { folder: 'beast-cricket', allowed_formats: ['jpg','jpeg','png','webp'], transformation: [{ width:800, height:800, crop:'limit', quality:'auto' }] },
      });
    } catch (e) {
      console.warn('⚠️ Cloudinary packages not installed, using local storage');
    }
  }
  // Fallback: local disk
  const multerLib = require('multer');
  return multerLib.diskStorage({
    destination: (req, file, cb) => cb(null, path),
    filename:    (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random()*1e9) + require('path').extname(file.originalname)),
  });
};

const getImageUrl = (file) => {
  if (!file) return null;
  // Cloudinary returns full URL in file.path
  if (file.path && file.path.startsWith('http')) return file.path;
  // Local storage
  return `/uploads/${file.filename}`;
};

module.exports = { isCloudinaryConfigured, getMulterStorage, getImageUrl };
