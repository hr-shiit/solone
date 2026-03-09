import { Request, Response } from 'express';
import healthRouter from './health';

describe('Health Check Endpoint', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  it('should return status 200 with { status: "ok" }', () => {
    // Get the route handler from the router
    const routeStack = (healthRouter as any).stack;
    const getRoute = routeStack.find((layer: any) => layer.route?.methods?.get);
    const handler = getRoute.route.stack[0].handle;

    // Call the handler
    handler(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({ status: 'ok' });
  });
});
