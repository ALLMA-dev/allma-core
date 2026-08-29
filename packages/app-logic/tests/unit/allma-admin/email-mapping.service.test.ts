import { describe, it, expect, beforeEach } from 'vitest';
import { DynamoDBDocumentClient, QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { StepType, PermanentStepError, type FlowDefinition } from '@allma/core-types';
import { mockClient, resetAwsClientMocks } from '../_helpers/aws-mock.js';

process.env.EMAIL_TO_FLOW_MAPPING_TABLE_NAME = 'email-map-table';

const { EmailMappingService } = await import('../../../src/allma-admin/services/email-mapping.service.js');

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  resetAwsClientMocks(ddbMock);
});

describe('EmailMappingService', () => {
  describe('getMappingsForRecipient', () => {
    it('queries DynamoDB for mappings matching the recipient email address', async () => {
      const mockItems = [
        {
          emailAddress: 'support@example.com',
          keyword: '#DEFAULT',
          flowDefinitionId: 'flow-123',
          stepInstanceId: 'step-start',
        },
        {
          emailAddress: 'support@example.com',
          keyword: 'URGENT',
          flowDefinitionId: 'flow-urgent',
          triggerMessagePattern: 'ticket-(\\d+)',
        },
      ];

      ddbMock.on(QueryCommand).resolves({ Items: mockItems });

      const result = await EmailMappingService.getMappingsForRecipient('support@example.com');

      expect(result).toEqual(mockItems);
      const calls = ddbMock.commandCalls(QueryCommand);
      expect(calls).toHaveLength(1);
      expect(calls[0].args[0].input).toEqual({
        TableName: 'email-map-table',
        KeyConditionExpression: 'emailAddress = :recipient',
        ExpressionAttributeValues: {
          ':recipient': 'support@example.com',
        },
      });
    });

    it('returns an empty array when no items are returned from DynamoDB', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: undefined });

      const result = await EmailMappingService.getMappingsForRecipient('unknown@example.com');

      expect(result).toEqual([]);
    });

    it('propagates DynamoDB client errors', async () => {
      ddbMock.on(QueryCommand).rejects(new Error('DynamoDB unavailable'));

      await expect(EmailMappingService.getMappingsForRecipient('error@example.com')).rejects.toThrow('DynamoDB unavailable');
    });
  });

  describe('syncMappingsForFlowVersion', () => {
    it('creates Put transactions for email start steps in a new version', async () => {
      const newFlow: FlowDefinition = {
        id: 'flow-1',
        name: 'Email Handler Flow',
        version: 1,
        steps: {
          step1: {
            stepInstanceId: 'step1',
            stepType: StepType.EMAIL_START_POINT,
            emailAddress: 'incoming@example.com',
            keyword: 'HELP',
            triggerMessagePattern: 'order-(\\d+)',
          } as any,
        },
      } as any;

      ddbMock.on(TransactWriteCommand).resolves({});

      await EmailMappingService.syncMappingsForFlowVersion('flow-1', undefined, newFlow);

      const calls = ddbMock.commandCalls(TransactWriteCommand);
      expect(calls).toHaveLength(1);
      const transactItems = calls[0].args[0].input.TransactItems;
      expect(transactItems).toHaveLength(1);
      expect(transactItems![0].Put).toEqual({
        TableName: 'email-map-table',
        Item: {
          emailAddress: 'incoming@example.com',
          keyword: 'HELP',
          flowDefinitionId: 'flow-1',
          stepInstanceId: 'step1',
          triggerMessagePattern: 'order-(\\d+)',
        },
        ConditionExpression: '(attribute_not_exists(flowDefinitionId)) OR (flowDefinitionId = :flowId)',
        ExpressionAttributeValues: { ':flowId': 'flow-1' },
      });
    });

    it('creates Delete transactions for mappings removed in the new version', async () => {
      const oldFlow: FlowDefinition = {
        id: 'flow-1',
        name: 'Email Handler Flow',
        version: 1,
        steps: {
          step1: {
            stepInstanceId: 'step1',
            stepType: StepType.EMAIL_START_POINT,
            emailAddress: 'old@example.com',
            keyword: '#DEFAULT',
          } as any,
        },
      } as any;

      ddbMock.on(TransactWriteCommand).resolves({});

      await EmailMappingService.syncMappingsForFlowVersion('flow-1', oldFlow, undefined);

      const calls = ddbMock.commandCalls(TransactWriteCommand);
      expect(calls).toHaveLength(1);
      const transactItems = calls[0].args[0].input.TransactItems;
      expect(transactItems).toHaveLength(1);
      expect(transactItems![0].Delete).toEqual({
        TableName: 'email-map-table',
        Key: {
          emailAddress: 'old@example.com',
          keyword: '#DEFAULT',
        },
        ConditionExpression: 'attribute_not_exists(emailAddress) OR flowDefinitionId = :flowId',
        ExpressionAttributeValues: { ':flowId': 'flow-1' },
      });
    });

    it('renders templated email addresses using flowVariables', async () => {
      const newFlow: FlowDefinition = {
        id: 'flow-1',
        name: 'Templated Email Flow',
        version: 1,
        flowVariables: {
          domain: 'example.com',
          inbox: 'orders',
        },
        steps: {
          step1: {
            stepInstanceId: 'step1',
            stepType: StepType.EMAIL_START_POINT,
            emailAddress: '{{flow_variables.inbox}}@{{flow_variables.domain}}',
          } as any,
        },
      } as any;

      ddbMock.on(TransactWriteCommand).resolves({});

      await EmailMappingService.syncMappingsForFlowVersion('flow-1', undefined, newFlow);

      const calls = ddbMock.commandCalls(TransactWriteCommand);
      expect(calls).toHaveLength(1);
      const putItem = calls[0].args[0].input.TransactItems![0].Put;
      expect(putItem!.Item.emailAddress).toBe('orders@example.com');
      expect(putItem!.Item.keyword).toBe('#DEFAULT');
    });

    it('throws PermanentStepError when resolved email is invalid', async () => {
      const newFlow: FlowDefinition = {
        id: 'flow-1',
        name: 'Invalid Email Flow',
        version: 1,
        steps: {
          step1: {
            stepInstanceId: 'step1',
            stepType: StepType.EMAIL_START_POINT,
            emailAddress: 'not-a-valid-email',
          } as any,
        },
      } as any;

      await expect(
        EmailMappingService.syncMappingsForFlowVersion('flow-1', undefined, newFlow),
      ).rejects.toThrow(PermanentStepError);
    });

    it('throws PermanentStepError with conflict info on TransactionCanceledException for Put', async () => {
      const newFlow: FlowDefinition = {
        id: 'flow-1',
        name: 'Email Flow',
        version: 1,
        steps: {
          step1: {
            stepInstanceId: 'step1',
            stepType: StepType.EMAIL_START_POINT,
            emailAddress: 'conflict@example.com',
            keyword: 'TEST',
          } as any,
        },
      } as any;

      const txError = new Error('Transaction cancelled');
      txError.name = 'TransactionCanceledException';
      (txError as any).CancellationReasons = [{ Code: 'ConditionalCheckFailed' }];

      ddbMock.on(TransactWriteCommand).rejects(txError);

      await expect(
        EmailMappingService.syncMappingsForFlowVersion('flow-1', undefined, newFlow),
      ).rejects.toThrow(/Email address conflict/);
    });

    it('throws PermanentStepError with desync info on TransactionCanceledException for Delete', async () => {
      const oldFlow: FlowDefinition = {
        id: 'flow-1',
        name: 'Email Flow',
        version: 1,
        steps: {
          step1: {
            stepInstanceId: 'step1',
            stepType: StepType.EMAIL_START_POINT,
            emailAddress: 'owned-by-other@example.com',
            keyword: '#DEFAULT',
          } as any,
        },
      } as any;

      const txError = new Error('Transaction cancelled');
      txError.name = 'TransactionCanceledException';
      (txError as any).CancellationReasons = [{ Code: 'ConditionalCheckFailed' }];

      ddbMock.on(TransactWriteCommand).rejects(txError);

      await expect(
        EmailMappingService.syncMappingsForFlowVersion('flow-1', oldFlow, undefined),
      ).rejects.toThrow(/Email trigger desync/);
    });

    it('parses bracketed string reasons in TransactionCanceledException message', async () => {
      const newFlow: FlowDefinition = {
        id: 'flow-1',
        name: 'Email Flow',
        version: 1,
        steps: {
          step1: {
            stepInstanceId: 'step1',
            stepType: StepType.EMAIL_START_POINT,
            emailAddress: 'conflict2@example.com',
            keyword: '#DEFAULT',
          } as any,
        },
      } as any;

      const txError = new Error('Transaction cancelled [ConditionalCheckFailed]');
      txError.name = 'TransactionCanceledException';

      ddbMock.on(TransactWriteCommand).rejects(txError);

      await expect(
        EmailMappingService.syncMappingsForFlowVersion('flow-1', undefined, newFlow),
      ).rejects.toThrow(/Email address conflict/);
    });

    it('throws generic error when TransactionCanceledException reasons cannot be identified', async () => {
      const newFlow: FlowDefinition = {
        id: 'flow-1',
        name: 'Email Flow',
        version: 1,
        steps: {
          step1: {
            stepInstanceId: 'step1',
            stepType: StepType.EMAIL_START_POINT,
            emailAddress: 'test@example.com',
            keyword: '#DEFAULT',
          } as any,
        },
      } as any;

      const txError = new Error('Transaction cancelled due to unknown reason');
      txError.name = 'TransactionCanceledException';

      ddbMock.on(TransactWriteCommand).rejects(txError);

      await expect(
        EmailMappingService.syncMappingsForFlowVersion('flow-1', undefined, newFlow),
      ).rejects.toThrow(/DynamoDB transaction failed due to a conditional check violation/);
    });

    it('does not execute transactions when no email start point steps exist', async () => {
      const flow: FlowDefinition = {
        id: 'flow-1',
        name: 'Standard Flow',
        version: 1,
        steps: {
          step1: {
            stepInstanceId: 'step1',
            stepType: StepType.NOOP,
          } as any,
        },
      } as any;

      await EmailMappingService.syncMappingsForFlowVersion('flow-1', undefined, flow);

      expect(ddbMock.commandCalls(TransactWriteCommand)).toHaveLength(0);
    });
  });
});
