import { body, param, query, validationResult } from 'express-validator';

// Middleware to handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: errors.array()
      }
    });
  }
  next();
};

// Archive validations
export const validateArchiveCreate = [
  body('title').notEmpty().trim().withMessage('Title is required'),
  body('category').isIn(['magazine', 'newsletter', 'folio', 'other']).withMessage('Invalid category'),
  body('file_url').notEmpty().isURL().withMessage('Valid file URL is required'),
  body('cover_image_url').optional().isURL().withMessage('Must be a valid URL'),
  body('publication_date').optional().isISO8601().withMessage('Must be a valid date'),
  handleValidationErrors
];

export const validateArchiveUpdate = [
  param('id').isInt().withMessage('Invalid archive ID'),
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('category').optional().isIn(['magazine', 'newsletter', 'folio', 'other']).withMessage('Invalid category'),
  body('file_url').optional().isURL().withMessage('Must be a valid URL'),
  handleValidationErrors
];

// Department validations
export const validateDepartmentCreate = [
  body('name').notEmpty().trim().withMessage('Department name is required'),
  body('description').optional().trim(),
  handleValidationErrors
];

export const validateDepartmentUpdate = [
  param('id').isInt().withMessage('Invalid department ID'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  handleValidationErrors
];

// Position validations
export const validatePositionCreate = [
  body('title').notEmpty().trim().withMessage('Position title is required'),
  body('department_id').optional().isInt().withMessage('Invalid department ID'),
  body('is_leadership').optional().isBoolean().withMessage('Must be a boolean'),
  handleValidationErrors
];

// Profile validations
export const validateProfileCreate = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('first_name').notEmpty().trim().withMessage('First name is required'),
  body('last_name').notEmpty().trim().withMessage('Last name is required'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('role').optional().isIn(['admin', 'editor', 'section_head', 'member']).withMessage('Invalid role'),
  body('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status'),
  handleValidationErrors
];

export const validateProfileUpdate = [
  param('id').isInt().withMessage('Invalid profile ID'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Must be a valid email'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  handleValidationErrors
];

// Project validations
export const validateProjectCreate = [
  body('title').notEmpty().trim().withMessage('Project title is required'),
  body('description').optional().trim(),
  body('project_type').optional().isIn(['magazine', 'newsletter', 'folio', 'other']).withMessage('Invalid project type'),
  body('status').optional().isIn(['draft', 'planning', 'in_progress', 'review', 'completed', 'archived']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('start_date').optional().isISO8601().withMessage('Invalid start date'),
  body('due_date').optional().isISO8601().withMessage('Invalid due date'),
  handleValidationErrors
];

export const validateProjectUpdate = [
  param('id').isInt().withMessage('Invalid project ID'),
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('status').optional().isIn(['draft', 'planning', 'in_progress', 'review', 'completed', 'archived']).withMessage('Invalid status'),
  handleValidationErrors
];

// Task validations
export const validateTaskCreate = [
  body('project_id').isInt().withMessage('Valid project ID is required'),
  body('title').notEmpty().trim().withMessage('Task title is required'),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'completed', 'blocked']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('due_date').optional().isISO8601().withMessage('Invalid due date'),
  body('assigned_to').optional().isInt().withMessage('Invalid user ID'),
  handleValidationErrors
];

export const validateTaskUpdate = [
  param('id').isInt().withMessage('Invalid task ID'),
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'completed', 'blocked']).withMessage('Invalid status'),
  handleValidationErrors
];

// Notification validations
export const validateNotificationCreate = [
  body('user_id').isInt().withMessage('Valid user ID is required'),
  body('title').notEmpty().trim().withMessage('Title is required'),
  body('message').notEmpty().trim().withMessage('Message is required'),
  body('type').optional().isIn(['info', 'warning', 'error', 'success']).withMessage('Invalid type'),
  handleValidationErrors
];

// Comment validations
export const validateCommentCreate = [
  body('content').notEmpty().trim().withMessage('Comment content is required'),
  body('parent_comment_id').optional().isInt().withMessage('Invalid parent comment ID'),
  handleValidationErrors
];

// Auth validations
export const validateRegister = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('first_name').notEmpty().trim().withMessage('First name is required'),
  body('last_name').notEmpty().trim().withMessage('Last name is required'),
  handleValidationErrors
];

export const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

// Query validations
export const validatePagination = [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  handleValidationErrors
];

export const validateDateRange = [
  query('start_date').optional().isISO8601().withMessage('Invalid start date'),
  query('end_date').optional().isISO8601().withMessage('Invalid end date'),
  handleValidationErrors
];
