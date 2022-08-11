import { APIGatewayEvent, APIGatewayProxyHandler, APIGatewayProxyResult, Context } from "aws-lambda";
import { S3 } from "aws-sdk";
import { htmlResponse } from "./html-response";

export const confirmUploadHandler = async (event: APIGatewayEvent) => {
  console.log({ confirmUploadEvent: event });

  const s3 = new S3();
  const params = {
    Bucket: process.env.UPLOAD_S3_BUCKET,
    Key: event.queryStringParameters?.key,
    Expires: 600
  };

  const url = s3.getSignedUrl('getObject', params); const responseText = `
    <html><body>
    <h1>Thanks</h1>
    <a href="${url}">
      check your upload
    </a>(the link expires in 10 minutes)
    </body></html >
  `;

  return htmlResponse(responseText);
}

export const showUploadFormHandler: APIGatewayProxyHandler =
  async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
    console.log({ uploadFormEvent: event });

    const s3 = new S3();
    const uploadLimitInMB = parseInt(process.env.UPLOAD_LIMIT_IN_MB || '1');

    const apiHost = event.requestContext.domainName;
    const prefix = event.requestContext.stage;
    const redirectUrl = `https://${apiHost}/${prefix}/confirm`;

    const params: S3.PresignedPost.Params = {
      Bucket: process.env.UPLOAD_S3_BUCKET,
      Expires: 600,
      Conditions: [
        ['content-length-range', 1, uploadLimitInMB * 1000000]
      ],
      Fields: {
        success_action_redirect: redirectUrl,
        acl: 'private',
        key: context.awsRequestId + '.jpg'
      },
    };

    const form = s3.createPresignedPost(params);

    return htmlResponse(buildForm(form));
  }

function buildForm(form: S3.PresignedPost) {
  const fieldNames = Object.keys(form.fields);
  const fields = fieldNames.map(field =>
    (`<input type="hidden" name="${field}" value="${form.fields[field]}"/>`)
  ).join('\n');

  return `
    <html>
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    </head>
    <body>
      <form action="${form.url}" method="post" enctype="multipart/form-data">
      ${fields}
      Select a JPG file:
      <input type="file" name="file" /> <br />
      <input type="submit" name="submit" value="Upload file" />
      </form>
    </body>
    </html>
  `;
}