import { APIGatewayProxyResult } from "aws-lambda";

export function htmlResponse(html: string): APIGatewayProxyResult {
  return {
    statusCode: 200,
    body: html,
    headers: {
      'Content-Type': 'text/html'
    }
  }
}