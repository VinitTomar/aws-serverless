import { Context, S3Event } from "aws-lambda";
import { S3 } from "aws-sdk";
import { createReadStream, createWriteStream } from "fs";
import { unlink } from "fs/promises";
import { extname, join } from "path";
import { tmpdir } from 'os';
import { spawn, SpawnOptions } from "child_process";


function extractS3Info(event: S3Event) {
  const {
    s3: {
      bucket: {
        name: bucket
      },
      object: {
        key
      }
    }
  } = event.Records[0];

  return { bucket, key };
}

function downloadFileFromS3(bucket: string, fileKey: string, filePath: string) {
  console.log('downloading...', bucket, fileKey, filePath);

  return new Promise((res, rej) => {
    const s3 = new S3();
    const file = createWriteStream(filePath);

    const s3Stream = s3.getObject({
      Bucket: bucket,
      Key: fileKey
    }).createReadStream();

    s3Stream.on('error', rej);
    file.on('error', rej);
    file.on('finish', () => {
      console.log('downloaded', bucket, fileKey, filePath);
      res(filePath);
    });

    s3Stream.pipe(file);
  });
}

function uploadFileToS3(bucket: string, fileKey: string, filePath: string, contentType: string) {
  console.log('uploading...', bucket, fileKey, filePath);
  const s3 = new S3();

  return s3.upload({
    Bucket: bucket,
    Key: fileKey,
    Body: createReadStream(filePath),
    ACL: 'private',
    ContentType: contentType
  }).promise();
}

async function removeFile(filePath: string) {
  try {
    await unlink(filePath);
  } catch (error) {
    console.log({ unlinkError: error })
  }
}

function executeCmd(command: string, args: ReadonlyArray<string>, options: SpawnOptions = {}) {
  return new Promise<void>((res, rej) => {
    console.log('executing', command, args.join(' '));
    const childProc = spawn(command, args, options);

    childProc.stdout?.on('data', buffer => console.log(buffer.toString()));
    childProc.stderr?.on('data', buffer => console.error(buffer.toString()));

    childProc.on('exit', (code, signal) => {
      console.log(`${command} completed with ${code}:${signal}`); if (code || signal) {
        rej(`${command} failed with ${code || signal}`);
      } else {
        res();
      }
    });

    childProc.on('error', rej);
  });
}

export const generateThumbnailHandler = async (event: S3Event, context: Context) => {
  const supportedFormats = ['jpg', 'jpeg', 'png', 'gif'];
  const OUTPUT_BUCKET = process.env.OUTPUT_BUCKET;
  const THUMB_WIDTH = process.env.THUMB_WIDTH;

  if (!OUTPUT_BUCKET) {
    throw new Error(`No S3 bucket ${OUTPUT_BUCKET}`);
  }

  const { bucket, key } = extractS3Info(event);
  const { awsRequestId: id } = context;
  const fileExtension = extname(key).toLowerCase();
  const tempFilePath = join(tmpdir(), id + fileExtension);
  const fileExtensionWithNoDot = fileExtension.slice(1);
  const contentType = `image/${fileExtensionWithNoDot}`;

  console.log('converting', bucket, ':', key, 'using', tempFilePath);

  if (!supportedFormats.includes(fileExtensionWithNoDot)) {
    throw new Error(`unsupported file type ${fileExtension}`);
  }

  await downloadFileFromS3(bucket, key, tempFilePath);
  await executeCmd('/opt/bin/mogrify', ['-thumbnail', `${THUMB_WIDTH}x`, tempFilePath]);
  await uploadFileToS3(OUTPUT_BUCKET, key, tempFilePath, contentType);
  await removeFile(tempFilePath);
}