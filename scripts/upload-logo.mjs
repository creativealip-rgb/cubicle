// Quick R2 upload helper
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFileSync } from "fs";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const bucket = process.env.R2_BUCKET_NAME;
const publicBase = process.env.R2_PUBLIC_ENDPOINT;

const key = `branding/acme-logo.png`;
const file = readFileSync("/tmp/acme-logo.png");

await r2.send(
  new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: file,
    ContentType: "image/png",
  }),
);

const url = `${publicBase}/${key}`;
console.log("Uploaded:", url);
console.log("Public URL:", publicBase);
