const config = require('../config');
const { sendErrorResponse } = require('../utils/responses');

/**
 * Middleware para validação da API Key
 * Verifica se a requisição contém uma API key válida no header
 */
function apikey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['apikey'];
  
  if (!apiKey) {
    return sendErrorResponse(res, 401, 'API Key não fornecida');
  }
  
  if (apiKey !== config.apiKey) {
    return sendErrorResponse(res, 403, 'API Key inválida');
  }
  
  next();
}

module.exports = { apikey };
