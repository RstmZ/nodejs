const { S3, Polly } = require('aws-sdk');

const {
  AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_BUCKET_NAME, AWS_REGION,
  AWS_POLLY_ACCESS_KEY_ID, AWS_POLLY_SECRET_ACCESS_KEY
} = process.env;

const clientS3 = new S3({
  accessKeyId: AWS_ACCESS_KEY_ID || null,
  secretAccessKey: AWS_SECRET_ACCESS_KEY || null,
  region: AWS_REGION || 'us-east-1',
  params: { Bucket: AWS_BUCKET_NAME || 'co-prai-app-test' },
});

const polly = new Polly({
  region: AWS_REGION || 'us-east-1',
  maxRetries: 3,
  accessKeyId: AWS_POLLY_ACCESS_KEY_ID || null,
  secretAccessKey: AWS_POLLY_SECRET_ACCESS_KEY || null,
  timeout: 15000
});

// const params = { Key: 'a7c4004f-096e-4e90-ac09-c5c29521bcb08231a424-2dc0-4cac-85ae-a98595a894b7.jpg' };

// clientS3.deleteObject(params, async (err, data) => {
//   if (err) console.log(err, err.stack); // an error occurred
//   else {
//     console.log(data);
//   }// successful response);
// });

module.exports = {
  clientS3,
  polly
};
