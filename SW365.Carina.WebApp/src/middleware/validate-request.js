const { sendError } = require('../utils/api-response');

function validateRequest(validators) {
  return (req, res, next) => {
    const checks = Array.isArray(validators) ? validators : [validators];
    const errors = checks
      .filter((check) => typeof check === 'function')
      .map((check) => check(req))
      .filter(Boolean);

    if (errors.length > 0) {
      return sendError(res, 'Validation failed', errors, 400);
    }

    return next();
  };
}

function validatePositiveIntParam(paramName) {
  return (req) => {
    const raw = req.params[paramName];
    const parsed = Number(raw);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      return {
        field: paramName,
        message: `${paramName} must be a positive integer`,
      };
    }

    req.params[paramName] = parsed;
    return null;
  };
}

function validateRequiredString(fieldName, options) {
  const opts = options || {};
  const maxLength = Number.isInteger(opts.maxLength) ? opts.maxLength : 100;
  const source = opts.source || 'body';

  return (req) => {
    const container = req[source] || {};
    const value = container[fieldName];

    if (typeof value !== 'string') {
      return {
        field: fieldName,
        message: `${fieldName} is required`,
      };
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return {
        field: fieldName,
        message: `${fieldName} is required`,
      };
    }

    if (trimmed.length > maxLength) {
      return {
        field: fieldName,
        message: `${fieldName} must be ${maxLength} characters or less`,
      };
    }

    container[fieldName] = trimmed;
    return null;
  };
}

function validateEnumString(fieldName, allowedValues, options) {
  const source = (options && options.source) || 'body';
  const allowed = Array.isArray(allowedValues) ? allowedValues : [];

  return (req) => {
    const container = req[source] || {};
    const value = container[fieldName];

    if (typeof value !== 'string') {
      return {
        field: fieldName,
        message: `${fieldName} is required`,
      };
    }

    const normalized = value.trim().toUpperCase();
    if (!allowed.includes(normalized)) {
      return {
        field: fieldName,
        message: `${fieldName} must be one of: ${allowed.join(', ')}`,
      };
    }

    container[fieldName] = normalized;
    return null;
  };
}

function validatePositiveIntRange(fieldName, min, max, options) {
  const source = (options && options.source) || 'body';

  return (req) => {
    const container = req[source] || {};
    const value = container[fieldName];
    const parsed = Number(value);

    if (!Number.isInteger(parsed)) {
      return {
        field: fieldName,
        message: `${fieldName} must be an integer`,
      };
    }

    if (parsed < min || parsed > max) {
      return {
        field: fieldName,
        message: `${fieldName} must be between ${min} and ${max}`,
      };
    }

    container[fieldName] = parsed;
    return null;
  };
}

function validatePositiveDecimal(fieldName, options) {
  const source = (options && options.source) || 'body';

  return (req) => {
    const container = req[source] || {};
    const value = container[fieldName];
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      return {
        field: fieldName,
        message: `${fieldName} must be a valid number`,
      };
    }

    if (parsed <= 0) {
      return {
        field: fieldName,
        message: `${fieldName} must be greater than 0`,
      };
    }

    container[fieldName] = parsed;
    return null;
  };
}

function validateNonNegativeDecimal(fieldName, options) {
  const source = (options && options.source) || 'body';

  return (req) => {
    const container = req[source] || {};
    const value = container[fieldName];
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      return {
        field: fieldName,
        message: `${fieldName} must be a valid number`,
      };
    }

    if (parsed < 0) {
      return {
        field: fieldName,
        message: `${fieldName} cannot be negative`,
      };
    }

    container[fieldName] = parsed;
    return null;
  };
}

function validateDate(fieldName, options = {}) {
  const source = (options && options.source) || 'body';

  return (req) => {
    const container = req[source] || {};
    const raw = container[fieldName];

    if (!raw || typeof raw !== 'string') {
      return {
        field: fieldName,
        message: `${fieldName} must be a valid date string (YYYY-MM-DD)`,
      };
    }

    // Check format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(raw)) {
      return {
        field: fieldName,
        message: `${fieldName} must be in format YYYY-MM-DD`,
      };
    }

    // Check if valid date
    const date = new Date(raw);
    if (isNaN(date.getTime())) {
      return {
        field: fieldName,
        message: `${fieldName} is not a valid date`,
      };
    }

    return null;
  };
}

module.exports = {
  validateRequest,
  validatePositiveIntParam,
  validateRequiredString,
  validateEnumString,
  validatePositiveIntRange,
  validatePositiveDecimal,
  validateNonNegativeDecimal,
  validateDate,
};
