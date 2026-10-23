const express = require('express');
const controller = require('../controllers/transaction-owners.controller');
const {
  validateRequest,
  validatePositiveIntParam,
  validateRequiredString,
} = require('../middleware/validate-request');

const router = express.Router();

function optionalContact(field, maxLength, pattern) {
  return (req) => {
    const value = req.body[field];
    if (value === undefined || value === null || value === '') {
      req.body[field] = null;
      return null;
    }
    if (typeof value !== 'string' || value.trim().length > maxLength) {
      return { field, message: `${field} must be text of ${maxLength} characters or less` };
    }
    const trimmed = value.trim();
    if (trimmed && pattern && !pattern.test(trimmed)) {
      return { field, message: `${field} is invalid` };
    }
    req.body[field] = trimmed || null;
    return null;
  };
}

const validators = [
  validateRequiredString('firstName', { maxLength: 100 }),
  validateRequiredString('lastName', { maxLength: 100 }),
  optionalContact('emailAddress', 254, /^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  optionalContact('phoneNumber', 50),
];

router.get('/', controller.getOwners);
router.post('/', validateRequest(validators), controller.createOwner);
router.put(
  '/:id',
  validateRequest([validatePositiveIntParam('id'), ...validators]),
  controller.updateOwner
);

module.exports = router;
