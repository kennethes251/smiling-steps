/**
 * Auth Validators - Schema-based Input Validation
 * 
 * All user input must be validated before reaching services.
 * Uses Joi for schema validation.
 * 
 * @stable
 * @verified 2024-12-27
 * @module validators/authValidators
 */

const Joi = require('joi');

// Common validation patterns
const patterns = {
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  phone: /^\+?[1-9]\d{9,14}$/
};

/**
 * Registration validation schema
 */
const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .lowercase()
    .trim()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),

  password: Joi.string()
    .min(8)
    .max(128)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.max': 'Password must not exceed 128 characters',
      'any.required': 'Password is required'
    }),

  firstName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .trim()
    .messages({
      'string.min': 'First name must be at least 2 characters',
      'any.required': 'First name is required'
    }),

  lastName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .trim()
    .messages({
      'string.min': 'Last name must be at least 2 characters',
      'any.required': 'Last name is required'
    }),

  role: Joi.string()
    .valid('client', 'psychologist')
    .default('client')
    .messages({
      'any.only': 'Role must be either client or psychologist'
    }),

  phone: Joi.string()
    .pattern(patterns.phone)
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    })
});

/**
 * Login validation schema
 */
const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .lowercase()
    .trim()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),

  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

/**
 * Email verification schema
 */
const emailVerificationSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Verification token is required'
    })
});

/**
 * Password reset request schema
 */
const passwordResetRequestSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .lowercase()
    .trim()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    })
});

/**
 * Password reset schema
 */
const passwordResetSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Reset token is required'
    }),

  newPassword: Joi.string()
    .min(8)
    .max(128)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'any.required': 'New password is required'
    })
});

/**
 * Validate data against a schema
 * @param {object} schema - Joi schema
 * @param {object} data - Data to validate
 * @returns {{ value: object, error: object|null }}
 */
const validate = (schema, data) => {
  const { value, error } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    return { value: null, error: errors };
  }

  return { value, error: null };
};

// Convenience validation functions
const validateRegister = (data) => validate(registerSchema, data);
const validateLogin = (data) => validate(loginSchema, data);
const validateEmailVerification = (data) => validate(emailVerificationSchema, data);
const validatePasswordResetRequest = (data) => validate(passwordResetRequestSchema, data);
const validatePasswordReset = (data) => validate(passwordResetSchema, data);

module.exports = {
  registerSchema,
  loginSchema,
  emailVerificationSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  validate,
  validateRegister,
  validateLogin,
  validateEmailVerification,
  validatePasswordResetRequest,
  validatePasswordReset
};
