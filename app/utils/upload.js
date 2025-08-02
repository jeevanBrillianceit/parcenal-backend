// const AWS = require('aws-sdk');
// const { v4: uuidv4 } = require('uuid');
// const s3 = new AWS.S3(/* credentials via env */);

// module.exports.uploadFile = async (file) => {
//   const key = `${Date.now()}-${uuidv4()}-${file.originalname}`;
//   const data = await s3.upload({
//     Bucket: process.env.AWS_BUCKET_NAME,
//     Key: key,
//     Body: file.buffer,
//     ACL: 'public-read',
//   }).promise();
//   return data.Location;
// };
