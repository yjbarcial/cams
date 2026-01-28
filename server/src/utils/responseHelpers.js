// Success response
export const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

// Error response
export const errorResponse = (res, message = 'An error occurred', statusCode = 500, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(errors && { details: errors })
    }
  });
};

// Paginated response
export const paginatedResponse = (res, data, pagination, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination
  });
};

// Created response
export const createdResponse = (res, data, message = 'Resource created successfully') => {
  return successResponse(res, data, message, 201);
};

// No content response
export const noContentResponse = (res) => {
  return res.status(204).send();
};

// Not found response
export const notFoundResponse = (res, resource = 'Resource') => {
  return errorResponse(res, `${resource} not found`, 404);
};

// Validation error response
export const validationErrorResponse = (res, errors) => {
  return errorResponse(res, 'Validation failed', 400, errors);
};

// Unauthorized response
export const unauthorizedResponse = (res, message = 'Unauthorized access') => {
  return errorResponse(res, message, 401);
};

// Forbidden response
export const forbiddenResponse = (res, message = 'Forbidden access') => {
  return errorResponse(res, message, 403);
};

export default {
  successResponse,
  errorResponse,
  paginatedResponse,
  createdResponse,
  noContentResponse,
  notFoundResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse
};
