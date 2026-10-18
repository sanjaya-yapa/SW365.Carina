const router = require('express').Router();
const service = require('../services/payments.service');
const { sendSuccess, sendError } = require('../utils/api-response');
const handle =
  (fn, status = 200) =>
  async (req, res) => {
    try {
      return sendSuccess(res, await fn(req), 'Payment request completed', status);
    } catch (error) {
      return sendError(
        res,
        error.status ? error.message : 'Unable to process payments. Please try again.',
        null,
        error.status || 500
      );
    }
  };
router.get(
  '/',
  handle(() => service.schedules())
);
router.post(
  '/',
  handle((req) => service.create(req.body || {}), 201)
);
router.get(
  '/calendar',
  handle((req) => service.calendar(req.query.from, req.query.to, req.query.today))
);
router.put(
  '/:id/end',
  handle((req) => service.endSchedule(req.params.id, req.body?.endDate))
);
router.put(
  '/:id/occurrences/:date',
  handle((req) => service.changeOccurrence(req.params.id, req.params.date, req.body || {}))
);
module.exports = router;
