import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { S3 } from 'aws-sdk';
import { htmlResponse } from './html-response';
/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

const formHtml = `
  <html>
  <head>
    <meta charset="utf-8"/>
  </head>
  <body>
    <form method="POST">
      Please enter your name:
      <input type="text" name="name"/>
      <br/>
      <input type="submit" />
    </form>
  </body>
  </html>
`;

const thanksHtml = ` <html>
  <head>
    <meta charset="utf-8"/>
  </head>
  <body>
    <h1>Thanks</h1>
    <p>We received your submission</p>
  </body>
  </html>
`;

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { httpMethod } = event;

  let response: APIGatewayProxyResult;
  try {
    response = {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Hello serverless with lambda authorizer (build by webpack)',
      }),
    };
  } catch (err) {
    console.log(err);
    response = {
      statusCode: 500,
      body: JSON.stringify({
        message: 'some error happened',
      }),
    };
  }

  return response;
};

export const formHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { httpMethod } = event;

  let response: APIGatewayProxyResult;
  try {
    if (httpMethod === 'GET') {
      response = htmlResponse(formHtml);
    } else {
      response = htmlResponse(thanksHtml);
    }
  } catch (err) {
    console.log(err);
    response = {
      statusCode: 500,
      body: JSON.stringify({
        message: 'some error happened',
      }),
    };
  }

  return response;
}

export const processFormHandler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  const s3 = new S3();
  const bucketName = process.env.UPLOAD_S3_BUCKET;

  if (bucketName) {
    await s3.putObject({
      Bucket: bucketName,
      Key: context.awsRequestId,
      Body: JSON.stringify(event)
    }).promise();
  }

  const reply = `
    <html>
    <head>
      <meta charset="utf-8"/>
    </head>
    <body>
      <h1>Thanks</h1>
      <p>We received your submission</p>
      <p>Reference: ${context.awsRequestId}</p>
      </p>
    </body>
    </html>
  `;

  return htmlResponse(reply);
}

