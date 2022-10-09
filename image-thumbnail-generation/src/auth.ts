import { APIGatewayAuthorizerResult, APIGatewayTokenAuthorizerEvent, APIGatewayTokenAuthorizerHandler } from "aws-lambda";


export const restApiAuthorizationHandler: APIGatewayTokenAuthorizerHandler =
  async (event: APIGatewayTokenAuthorizerEvent) => {

    console.log({ authEvent: event })

    const {
      authorizationToken: token,
      methodArn: resource,
      type
    } = event;

    if (type !== 'TOKEN' || !token || token.replace('Bearer ', '') !== 'valid-token') {
      return denyPolicy(token, resource);
    }

    return allowPolicy(token, resource);

  }

function generatePolicy(principalId: string, effect: string, resource: string): APIGatewayAuthorizerResult {
  return {
    principalId,
    policyDocument: {
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource
        }
      ],
      Version: '2012-10-17'
    },
    context: {
      'key': 'value'
    }
  }
}

function allowPolicy(principalId: string, resource: string): APIGatewayAuthorizerResult {
  return generatePolicy(principalId, 'Allow', resource);
}

function denyPolicy(principalId: string, resource: string): APIGatewayAuthorizerResult {
  return generatePolicy(principalId, 'Deny', resource);
}