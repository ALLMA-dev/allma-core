export interface CloudFormationEvent {
  RequestType: 'Create' | 'Update' | 'Delete';
  ServiceToken: string;
  ResponseURL: string;
  StackId: string;
  RequestId: string;
  LogicalResourceId: string;
  PhysicalResourceId?: string;
  ResourceType: string;
  ResourceProperties: { [key: string]: any };
  OldResourceProperties?: { [key: string]: any };
}

export async function sendCloudFormationResponse(
  event: CloudFormationEvent,
  status: 'SUCCESS' | 'FAILED',
  data?: { [key: string]: any }
): Promise<void> {
  const responseBody = JSON.stringify({
    Status: status,
    Reason: `See the details in CloudWatch Log Stream: ${process.env.AWS_LAMBDA_LOG_STREAM_NAME}`,
    PhysicalResourceId: event.PhysicalResourceId || `custom-resource-${Date.now()}`,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: data,
  });

  const responseOptions = {
    method: 'PUT',
    body: responseBody,
    headers: {
      'content-type': '',
      'content-length': responseBody.length.toString(),
    },
  };

  try {
    const response = await fetch(event.ResponseURL, responseOptions);
    console.log('CloudFormation response status:', response.status);
  } catch (error) {
    console.error('Failed to send CloudFormation response:', error);
  }
}
