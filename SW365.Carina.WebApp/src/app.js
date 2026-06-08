const express = require('express');
const path = require('path');

const apiRouter = require('./routes');
const { sendSuccess, sendError } = require('./utils/api-response');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req, res) => {
  return sendSuccess(res, null, 'API is running', 200);
});

app.use('/api', apiRouter);

app.use((req, res) => {
  return sendError(res, 'Route not found', null, 404);
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  return sendError(res, 'Internal server error', null, 500);
});

module.exports = app;
