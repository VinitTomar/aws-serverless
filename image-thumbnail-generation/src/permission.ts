import { APIGatewayProxyHandler, APIGatewayEvent, Context, APIGatewayProxyResult } from "aws-lambda";
import { S3 } from "aws-sdk";

function jsonResponse(body: any, corsOrigin: string): APIGatewayProxyResult {
  return {
    statusCode: 200,
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': corsOrigin
    }
  };
}

function errorResponse(body: any, corsOrigin: string) {
  return {
    statusCode: 500,
    body: String(body),
    headers: {
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': corsOrigin
    }
  };
};


export const getUploadDownloadPolicyHandler: APIGatewayProxyHandler =
  async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {

    try {
      const uploadSigner = new S3PolicySigner(process.env.UPLOAD_S3_BUCKET || '');
      const downloadSigner = new S3PolicySigner(process.env.THUMBNAILS_S3_BUCKET || '');
      const requestProcessor = new RequestProcessor(
        uploadSigner,
        downloadSigner,
        parseInt(process.env.UPLOAD_LIMIT_IN_MB || ''),
        process.env.ALLOWED_IMAGE_EXTENSIONS?.split(',') || ['']
      );
      const result = requestProcessor.processRequest(
        context.awsRequestId,
        event.pathParameters?.extension || '',
      );
      return jsonResponse(result, process.env.CORS_ORIGIN || '');
    } catch (e) {
      return errorResponse(e, process.env.CORS_ORIGIN || '');
    }

  }

class S3PolicySigner {
  private s3 = new S3();
  constructor(
    private bucketName: string,
    private expiry: number = 600
  ) { }

  signUpload(key: string, uploadLimitInMB: number) {
    const uploadParams = {
      Bucket: this.bucketName,
      Expires: this.expiry,
      Conditions: [
        ['content-length-range', 1, uploadLimitInMB * 1000000]
      ],
      Fields: { acl: 'private', key: key }
    };
    return this.s3.createPresignedPost(uploadParams);
  }

  signDownload(key: string) {
    const downloadParams = {
      Bucket: this.bucketName,
      Key: key,
      Expires: this.expiry
    };
    return this.s3.getSignedUrl('getObject', downloadParams);
  }
}

class RequestProcessor {
  constructor(
    private uploadSigner: S3PolicySigner,
    private downloadSigner: S3PolicySigner,
    private uploadLimitInMB: number,
    private allowedExtensions: string[]
  ) { }

  processRequest(requestId: string, extension: string) {
    if (!extension) {
      throw `no extension provided`;
    }
    const normalisedExtension = extension.toLowerCase();
    const isImage = this.allowedExtensions.includes(normalisedExtension);
    if (!isImage) {
      throw `extension ${extension} is not supported`;
    }
    const fileKey = `${requestId}.${normalisedExtension}`;
    return {
      upload: this.uploadSigner.signUpload(fileKey, this.uploadLimitInMB),
      download: this.downloadSigner.signDownload(fileKey)
    };
  };
}