import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { AdminPermission } from '@allma/core-types';
import { AuthContext } from '@allma/core-sdk';
import { buildErrorResponse, createApiGatewayResponse } from '@allma/core-sdk';

/**
 * Defines the shape of a handler function used by the ApiRouter.
 * It receives the event, auth context, and extracted path parameters.
 */
type RouteHandler = (
  event: APIGatewayProxyEventV2,
  authContext: AuthContext,
  params: Record<string, string>
) => Promise<APIGatewayProxyResultV2>;

/**
 * Defines options for a specific route, such as required permissions.
 */
interface RouteOptions {
  requiredPermission?: AdminPermission;
}

/**
 * Internal representation of a configured route.
 */
interface Route {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
  options?: RouteOptions;
}

/**
 * A declarative router for API Gateway Lambda handlers.
 * It simplifies routing, path parameter extraction, and permission checks.
 */
export class ApiRouter {
  private routes: Route[] = [];

  /**
   * Registers a handler for a GET request.
   * @param path The path pattern (e.g., '/items/{id}').
   * @param handler The function to execute for this route.
   * @param options Optional route-specific configurations.
   */
  public get(path: string, handler: RouteHandler, options?: RouteOptions): this {
    return this.addRoute('GET', path, handler, options);
  }

  /**
   * Registers a handler for a POST request.
   */
  public post(path: string, handler: RouteHandler, options?: RouteOptions): this {
    return this.addRoute('POST', path, handler, options);
  }

  /**
   * Registers a handler for a PUT request.
   */
  public put(path: string, handler: RouteHandler, options?: RouteOptions): this {
    return this.addRoute('PUT', path, handler, options);
  }

  /**
   * Registers a handler for a DELETE request.
   */
  public delete(path: string, handler: RouteHandler, options?: RouteOptions): this {
    return this.addRoute('DELETE', path, handler, options);
  }

  /**
   * Converts a path pattern into a regular expression for matching and extracts parameter names.
   * @param path The path pattern (e.g., '/items/{id}').
   * @returns An object with the RegExp pattern and an array of parameter names.
   */
  private parsePath(path: string): { pattern: RegExp; paramNames: string[] } {
    const paramNames: string[] = [];
    const pathRegex = path.replace(/{(\w+)}/g, (_, paramName) => {
      paramNames.push(paramName);
      return '([^/]+)';
    });
    
    const pattern = new RegExp(`${pathRegex}$`);
    return { pattern, paramNames };
  }

  private addRoute(
    method: Route['method'],
    path: string,
    handler: RouteHandler,
    options?: RouteOptions
  ): this {
    const { pattern, paramNames } = this.parsePath(path);
    const route: Route = { method, pattern, paramNames, handler };
    if (options) {
      route.options = options;
    }
    this.routes.push(route);
    return this;
  }

  /**
   * Returns a Lambda handler function that performs the routing logic.
   * This handler should be wrapped with `withAdminAuth`.
   */
  public getHandler() {
    return async (
      event: APIGatewayProxyEventV2,
      authContext: AuthContext
    ): Promise<APIGatewayProxyResultV2> => {
      const { http } = event.requestContext;
      const correlationId = event.requestContext.requestId;

      for (const route of this.routes) {
        if (http.method !== route.method) continue;

        const match = http.path.match(route.pattern);
        if (match) {
          // Check permissions if specified for the route.
          if (route.options?.requiredPermission && !authContext.hasPermission(route.options.requiredPermission)) {
            return createApiGatewayResponse(403, buildErrorResponse('Forbidden', 'FORBIDDEN'), correlationId);
          }

          const params = route.paramNames.reduce((acc, name, index) => {
            acc[name] = match[index + 1];
            return acc;
          }, {} as Record<string, string>);

          // Execute the handler with extracted parameters.
          return route.handler(event, authContext, params);
        }
      }

      // If no route was matched.
      return createApiGatewayResponse(
        404,
        buildErrorResponse(`Route not found: ${http.method} ${http.path}`, 'NOT_FOUND'),
        correlationId
      );
    };
  }
}