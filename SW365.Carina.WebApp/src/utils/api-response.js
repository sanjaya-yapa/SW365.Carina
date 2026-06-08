function sendSuccess(res, data, message, statusCode) {
  return res.status(statusCode || 200).json({
    success: true,
    data: data || null,
    message: message || 'Request successful'
  });
}

function sendError(res, message, details, statusCode) {
  const payload = {
    success: false,
    message: message || 'Request failed'
  };

  if (details) {
    payload.details = details;
  }

  return res.status(statusCode || 500).json(payload);
}

module.exports = {
  sendSuccess,
  sendError
};
