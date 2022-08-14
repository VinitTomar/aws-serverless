import { APIGatewayProxyHandler, APIGatewayEvent, Context, APIGatewayProxyResult } from "aws-lambda";
import { S3 } from "aws-sdk";

function jsonResponse(body: any): APIGatewayProxyResult {
  return {
    statusCode: 200,
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || ''
    }
  };
}

export const getUploadDownloadPolicyHandler: APIGatewayProxyHandler =
  async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {

    const key = context.awsRequestId + '.jpg';
    const uploadLimitInMB = parseInt(process.env.UPLOAD_LIMIT_IN_MB || '1');
    const s3 = new S3();

    const uploadS3BuketParams = {
      Bucket: process.env.UPLOAD_S3_BUCKET,
      Expires: 600,
      Conditions: [
        ['content-length-range', 1, uploadLimitInMB * 1000000]
      ],
      Fields: {
        acl: 'private',
        Key: key
      }
    };

    const dowloadS3BucketParams = {
      Bucket: process.env.THUMBNAILS_S3_BUCKET,
      Key: key,
      Expires: 600
    };

    const uploadForm = s3.createPresignedPost(uploadS3BuketParams);
    const downloadUrl = s3.getSignedUrl('getObject', dowloadS3BucketParams);

    return jsonResponse({
      upload: uploadForm,
      download: downloadUrl
    });

  }

