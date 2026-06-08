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
        message: `${paramName} must be a positive integer`
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
        message: `${fieldName} is required`
      };
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return {
        field: fieldName,
        message: `${fieldName} is required`
      };
    }

    if (trimmed.length > maxLength) {
      return {
        field: fieldName,
        message: `${fieldName} must be ${maxLength} characters or less`
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
        message: `${fieldName} is required`
      };
    }

    const normalized = value.trim().toUpperCase();
    if (!allowed.includes(normalized)) {
      return {
        field: fieldName,
        message: `${fieldName} must be one of: ${allowed.join(', ')}`
      };
    }

    container[fieldName] = normalized;
    return null;
  };
}

module.exports = {
  validateRequest,
  validatePositiveIntParam,
  validateRequiredString,
  validateEnumString
};
