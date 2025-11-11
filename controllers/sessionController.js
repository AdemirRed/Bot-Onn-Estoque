const whatsappApiService = require('../services/whatsappApiService');
const { sendErrorResponse, sendSuccessResponse } = require('../utils/responses');

/**
 * Controller para listar sessões ativas na API WhatsApp externa
 */
async function listSessions(req, res) {
  /* 
    #swagger.tags = ['Sessions']
    #swagger.summary = 'Listar sessões ativas'
    #swagger.description = 'Consulta a API WhatsApp externa e retorna todas as sessões ativas.'
  */
  try {
    const sessions = await whatsappApiService.listActiveSessions();
    
    return sendSuccessResponse(res, {
      total: sessions.length,
      sessions
    }, 'Sessões listadas com sucesso');
    
  } catch (error) {
    return sendErrorResponse(res, 500, `Erro ao listar sessões: ${error.message}`);
  }
}

/**
 * Controller para obter status de uma sessão específica
 */
async function getSessionStatus(req, res) {
  /* 
    #swagger.tags = ['Sessions']
    #swagger.summary = 'Status de uma sessão'
    #swagger.description = 'Consulta o status de uma sessão específica na API WhatsApp externa.'
  */
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return sendErrorResponse(res, 400, 'sessionId é obrigatório');
    }
    
    const status = await whatsappApiService.getSessionStatus(sessionId);
    
    if (!status) {
      return sendErrorResponse(res, 404, 'Sessão não encontrada');
    }
    
    return sendSuccessResponse(res, status, 'Status obtido com sucesso');
    
  } catch (error) {
    return sendErrorResponse(res, 500, `Erro ao obter status: ${error.message}`);
  }
}

module.exports = {
  listSessions,
  getSessionStatus
};
