import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from './lib/api-response.js';
import { getProjectsList } from './queries/get-projects-list.view.js';
import { getProjectSummary } from './queries/get-project-summary.view.js';
import { getProfile } from './queries/get-profile.view.js';
import { getProjectEditData } from './queries/get-project-edit.view.js';
import { getFxRates } from './queries/get-fx-rates.view.js';
import { getSuppliersList } from './queries/get-suppliers-list.view.js';
import { getCommoditiesList } from './queries/get-commodities-list.view.js';
import { getRfqEditData } from './queries/get-rfq-edit.view.js';

/**
 * @description Main API handler for all GET /views requests.
 * Acts as a router to delegate to specific view logic based on `viewName`.
 * @param event The API Gateway event.
 * @returns A formatted API Gateway response with untranslated data.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  console.log('GetView router received event:', JSON.stringify(event, null, 2));

  try {
    const { viewName, id } = event.pathParameters ?? {};
    if (!viewName) {
        throw new Error("Missing 'viewName' in path parameters.");
    }
    const claims = (event.requestContext as any).authorizer?.jwt.claims;
    const userId = claims?.sub as string;
    const userEmail = claims?.email as string;

    if (!userId || !userEmail) {
      return createErrorResponse(event, new Error('User ID or email not found in token.'), 403);
    }

    let responseData: any;

    switch (viewName) {
      case 'project-summary':
        if (!id) throw new Error("Missing 'id' in path parameters for project-summary.");
        responseData = await getProjectSummary(id, userId);
        break;
      
      case 'projects-list':
        responseData = await getProjectsList(userId);
        break;

      case 'profile':
        // The 'id' from the path is 'me', but we use the authenticated userId.
        responseData = await getProfile(userId, userEmail);
        break;

      // Handle the project initiation view
      case 'project-edit':
        // The ID can be a real projectId for editing or a placeholder like 'new' for creation.
        if (!id) throw new Error("Missing 'id' in path parameters for project-edit.");
        responseData = await getProjectEditData(id, userId);
        break;
      
      case 'fx-rates':
        responseData = await getFxRates();
        break;

      case 'suppliers-list':
        responseData = await getSuppliersList(userId);
        break;

      case 'commodities-list':
        responseData = await getCommoditiesList();
        break;

      case 'rfq-edit':
        if (!id) throw new Error("Missing 'id' in path parameters for rfq-edit.");
        responseData = await getRfqEditData(id, userId);
        break;

      default:
        throw new Error(`Unknown view: ${viewName}`);
    }

    // If a handler returns null (e.g., project not found), return a 404
    if (responseData === null) {
      return createErrorResponse(event, new Error(`Resource not found for view '${viewName}' with id '${id}'`), 404);
    }

    // Return the raw, untranslated data. The frontend is responsible for translation.
    return createSuccessResponse(event, responseData);
  } catch (error) {
    console.error(error);
    return createErrorResponse(event, error);
  }
};