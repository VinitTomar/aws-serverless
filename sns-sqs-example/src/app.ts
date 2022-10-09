import { APIGatewayProxyEvent, APIGatewayProxyResult, SNSEvent, SNSHandler, SQSEvent, SQSHandler } from 'aws-lambda';
import { SQS } from 'aws-sdk';

const sqs = new SQS({ apiVersion: '2012-11-05' });

const getDelayInSec = (retryCount: number) => {
  return Math.min(2 ** retryCount, 900);
}

const sendMessage = (message: string, retryCount: number, lastRetryCount: number) => {

  console.log("send message function => Queue url => ", process.env.SQS_QUEUE_URL)

  if (retryCount >= 5 || retryCount >= lastRetryCount) {
    return Promise.reject({ err: `Retry exceeded ${JSON.stringify({ retryCount, lastRetryCount })}` })
  }

  const delay = getDelayInSec(retryCount);
  console.log("send message function => ", { message, delay, retryCount, lastRetryCount });
  const params: SQS.Types.SendMessageRequest = {
    DelaySeconds: delay,
    MessageAttributes: {
      retryCount: {
        DataType: "Number",
        StringValue: `${++retryCount}`
      },
      lastRetryCount: {
        DataType: "Number",
        StringValue: `${lastRetryCount}`
      },
    },
    MessageBody: message,
    QueueUrl: process.env.SQS_QUEUE_URL || ''
  }

  return new Promise((res, rej) => {
    console.log("send message promise start");
    sqs.sendMessage(params, (err, resultData) => {
      console.log("send message promise => ", { err, resultData });
      if (err) {
        rej(err);
      } else {
        res(resultData);
      }
    });
  })

}

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  let response: APIGatewayProxyResult;
  const payload = JSON.parse(event.body || '{}');
  const { message, retryCount, lastRetryCount } = payload;
  try {
    await sendMessage(message, retryCount, lastRetryCount);
    response = {
      statusCode: 200,
      body: JSON.stringify({
        message: "sns sqs example",
      }),
    };
  } catch (err) {
    console.log({ err });
    response = {
      statusCode: 500,
      body: JSON.stringify({
        message: 'some error happened',
      }),
    };
  }

  return response;
};

export const sqsEventHandler: SQSHandler = (event: SQSEvent) => {
  try {
    event.Records.forEach((record, i) => {
      const { body, messageAttributes: { retryCount: {
        stringValue: retry
      }, lastRetryCount: {
        stringValue: lastRetry
      } } } = record;

      const retryCount = parseInt(retry || '0');
      const lastRetryCount = parseInt(lastRetry || '0');

      console.log("sqsEventHandler => ", { retryCount, lastRetryCount });

      if (retryCount === lastRetryCount) {
        console.log({ i, body });
      } else {
        sendMessage(body, retryCount, lastRetryCount);
      }
    });
  } catch (err) {
    console.log("error While handling sqs event", { err })
  }
}

export const emailSqsEventHandler: SQSHandler = (event: SQSEvent) => {
  try {
    event.Records.forEach(event => {
      const { body: emailMessage } = event;
      console.log({ emailMessage });
    });
  } catch (err) {
    console.log("error While handling email sqs event", { err })
  }
}

export const smsSqsEventHandler: SQSHandler = (event: SQSEvent) => {
  try {
    event.Records.forEach(event => {
      const { body: smsMessage } = event;
      console.log({ smsMessage });
    });
  } catch (err) {
    console.log("error While handling sms sqs event", { err })
  }
}

export const snsEventHandler: SNSHandler = (event: SNSEvent) => {
  try {
    event.Records.forEach(event => {
      const { Sns: { Message: snsMessage } } = event;
      console.log({ snsMessage });
    });
  } catch (err) {
    console.log("error While handling sns event", { err })
  }
}