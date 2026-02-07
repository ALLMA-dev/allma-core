import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from './lib/api-response.js';
import { initiateBomUpload } from './commands/initiate-bom-upload.command.js';
import { updateProfile } from './commands/update-profile.command.js';
import { saveProject } from './commands/save-project.command.js';
import { initiateSupplierUpload } from './commands/initiate-supplier-import.command.js';
import { createRfq } from './commands/create-rfq.command.js';
import { cloneRfq } from './commands/clone-rfq.command.js';
import { updateRfq } from './commands/update-rfq.command.js';
import { sendRfq } from './commands/send-rfq.command.js';
import { initiateRfqUpload } from './commands/initiate-rfq-upload.command.js';
import { sendCommunication } from './commands/send-communication.command.js';
import { deleteProject } from './commands/delete-project.command.js';


/**
 * @description Main API handler for all POST /commands requests.
 * Acts as a router to delegate to specific command logic.
 * @param event The API Gateway event.
 * @returns A formatted API Gateway response.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  console.log('PostCommand router received event:', JSON.stringify(event, null, 2));

  try {
    // Entity ID is not always required for creation commands, so we check for it where needed.
    const { entityType } = event.pathParameters ?? {};
     if (!entityType) {
        throw new Error("Missing 'entityType' in path parameters.");
    }
    if (!event.body) {
      throw new Error("Request body is missing.");
    }
    const { command, payload } = JSON.parse(event.body);

    const claims = (event.requestContext as any)?.authorizer?.jwt?.claims;
    const userId = claims?.sub as string;
    const userEmail = claims?.email as string;

    if (!userId) {
      return createErrorResponse(event, new Error('User ID not found in token.'), 403);
    }
    
    const id = event.pathParameters?.id ?? null;
    let responseData;

    const commandHandlerKey = `${entityType}:${command}`;
    switch (commandHandlerKey) {
      case 'project:initiate-bom-upload':
        if (!userEmail) {
          return createErrorResponse(event, new Error('User email not found in token, which is required for this action.'), 400);
        }
        responseData = await initiateBomUpload(payload, userId, userEmail);
        break;
      case 'supplier:initiate-supplier-upload':
        if (!userEmail) {
          return createErrorResponse(event, new Error('User email not found in token, which is required for this action.'), 400);
        }
        responseData = await initiateSupplierUpload(payload, userId, userEmail);
        break;
      case 'project:saveProject':
        // For creation, id is null. For update, it's present.
        responseData = await saveProject(id, payload, userId);
        break;
      case 'project:deleteProject':
        if (!id) throw new Error("Missing project 'id' for deleteProject command.");
        responseData = await deleteProject(id, userId);
        break;
      // --- New RFQ Commands ---
      case 'project:createRfq':
        if (!id) throw new Error("Missing project 'id' for createRfq command.");
        responseData = await createRfq(id, payload, userId);
        break;
      case 'project:initiateRfqUpload':
        if (!id) throw new Error("Missing project 'id' for initiateRfqUpload command.");
        if (!userEmail) return createErrorResponse(event, new Error('User email not found.'), 400);
        responseData = await initiateRfqUpload(id, payload, userId, userEmail);
        break;
      case 'rfq:cloneRfq':
        if (!id) throw new Error("Missing source RFQ 'id' for cloneRfq command.");
        responseData = await cloneRfq(id, payload, userId);
        break;
      case 'rfq:updateRfq':
        if (!id) throw new Error("Missing RFQ 'id' for updateRfq command.");
        responseData = await updateRfq(id, payload, userId);
        break;
      case 'rfq:sendRfq':
        if (!id) throw new Error("Missing RFQ 'id' for sendRfq command.");
        responseData = await sendRfq(id, userId);
        break;
      case 'communication:sendEmail':
        if (!id) throw new Error("Missing RFQ 'id' for sendEmail command.");
        if (!userEmail) return createErrorResponse(event, new Error('User email not found.'), 400);
        responseData = await sendCommunication(id, payload, userId, userEmail);
        break;
      // --- Existing Commands ---
      case 'project:cloneProject':
        if (!id) throw new Error("Missing 'id' for cloneProject command.");
        // const { handleCloneProject } = require('./commands/clone-project.command');
        // responseData = await handleCloneProject(id, payload);
        responseData = { message: `Project ${id} cloned successfully.` };
        break;
      case 'quote:approveQuoteExtraction':
        if (!id) throw new Error("Missing 'id' for approveQuoteExtraction command.");
         // const { handleApproveQuoteExtraction } = require('./commands/approve-quote-extraction.command');
        // responseData = await handleApproveQuoteExtraction(id, payload);
        responseData = { message: `Quote ${id} extraction approved.` };
        break;
      case 'profile:updateProfile':
        responseData = await updateProfile(userId, payload);
        break;
      // Add cases for all other commands
      default:
        throw new Error(`Unknown command: ${commandHandlerKey}`);
    }
    
    return createSuccessResponse(event, responseData);
  } catch (error) {
    console.error(error);
    const statusCode = error instanceof SyntaxError ? 400 : 500;
    return createErrorResponse(event, error, statusCode);
  }
};