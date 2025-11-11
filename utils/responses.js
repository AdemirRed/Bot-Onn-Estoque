/**
 * Função auxiliar para enviar respostas de erro padronizadas
 * @param {Object} res - Objeto de resposta do Express
 * @param {Number} statusCode - Código de status HTTP
 * @param {String} message - Mensagem de erro
 */
function sendErrorResponse(res, statusCode, message) {
  return res.status(statusCode).json({
    success: false,
    error: message
  });
}

/**
 * Função auxiliar para enviar respostas de sucesso padronizadas
 * @param {Object} res - Objeto de resposta do Express
 * @param {Object} data - Dados a serem retornados
 * @param {String} message - Mensagem de sucesso opcional
 */
function sendSuccessResponse(res, data, message = 'Operação realizada com sucesso') {
  return res.status(200).json({
    success: true,
    message,
    data
  });
}

module.exports = {
  sendErrorResponse,
  sendSuccessResponse
};
