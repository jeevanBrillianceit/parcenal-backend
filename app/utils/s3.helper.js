// utils/s3.upload.js
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

/**
 * Uploads a file to S3 bucket
 * @param {Object} file - File object with buffer, mimetype, originalname
 * @param {String} folder - Folder path in S3 bucket (e.g., 'profile', 'chat')
 * @returns {Promise<String>} Public URL of the uploaded file
 */
const uploadToS3 = async (file, folder = 'uploads') => {
  try {
    if (!file || !file.buffer) {
      throw new Error('Invalid file object');
    }

    const extension = file.originalname.split('.').pop();
    const fileName = `${folder}/${uuidv4()}.${extension}`;

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      // ACL: 'public-read',
      ContentType: file.mimetype,
      ContentDisposition: 'inline'
    };

    const data = await s3.upload(params).promise();
    return data.Location;
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new Error('Failed to upload file to S3');
  }
};

/**
 * Deletes a file from S3 bucket
 * @param {String} fileUrl - URL of the file to delete
 * @returns {Promise<Boolean>} True if deletion was successful
 */
const deleteFromS3 = async (fileUrl) => {
  try {
    if (!fileUrl) return true;

    const key = new URL(fileUrl).pathname.substring(1); // Remove leading slash
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key
    };

    await s3.deleteObject(params).promise();
    return true;
  } catch (error) {
    console.error('S3 Delete Error:', error);
    throw new Error('Failed to delete file from S3');
  }
};

module.exports = { uploadToS3, deleteFromS3 };