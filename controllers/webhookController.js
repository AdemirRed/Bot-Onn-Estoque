const webhookService = require('../services/webhookService');
const { sendErrorResponse, sendSuccessResponse } = require('../utils/responses');

/**
 * Controller para receber webhooks da API WhatsApp externa
 * Endpoint que a API externa deve chamar quando eventos acontecerem
 */
function receiveWebhook(req, res) {
  /* 
    #swagger.tags = ['Webhook']
    #swagger.summary = 'Receber webhook'
    #swagger.description = 'Endpoint para receber eventos da API WhatsApp externa. A API deve enviar os eventos para este endpoint.'
    #swagger.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: 'object',
            required: ['sessionId', 'event', 'data'],
            properties: {
              sessionId: {
                type: 'string',
                example: 'red',
                description: 'ID da sessão que gerou o evento'
              },
              event: {
                type: 'string',
                example: 'message',
                description: 'Tipo do evento (message, message_create, qr, ready, etc)'
              },
              data: {
                type: 'object',
                description: 'Dados do evento'
              }
            }
          },
          examples: {
            message: {
              summary: 'Mensagem recebida',
              value: {
                sessionId: 'red',
                event: 'message',
                data: {
                  from: '555197756708@c.us',
                  to: '5511999999999@c.us',
                  body: 'Olá, tudo bem?',
                  type: 'chat',
                  hasMedia: false,
                  timestamp: 1699999999
                }
              }
            },
            ready: {
              summary: 'Cliente conectado',
              value: {
                sessionId: 'redblack',
                event: 'ready',
                data: {}
              }
            }
          }
        }
      }
    }
  */
  
  // Log para debug - ver o que está chegando
  // Descomente para ver o formato completo:
  // console.log('📥 [DEBUG] Webhook recebido:', JSON.stringify(req.body, null, 2));
  
  try {
    // A API pode enviar em diferentes formatos, vamos aceitar todos
    let sessionId, event, data;
    
    // Formato com dataType (usado pela API WhatsApp)
    if (req.body.dataType) {
      sessionId = req.body.sessionId || 'unknown';
      event = req.body.dataType;
      data = req.body.data || req.body;
    }
    // Formato 1: { sessionId, event, data }
    else if (req.body.sessionId && req.body.event) {
      sessionId = req.body.sessionId;
      event = req.body.event;
      data = req.body.data || req.body;
    }
    // Formato 2: { session, event, ...resto }
    else if (req.body.session) {
      sessionId = req.body.session;
      event = req.body.event;
      data = req.body;
    }
    // Formato 3: Todo o body é o evento
    else {
      sessionId = req.body.session || req.body.sessionId || 'unknown';
      event = req.body.event || req.body.type || 'unknown';
      data = req.body;
    }
    
    // Ignora eventos QR e loading_screen
    const ignoredEvents = ['qr', 'loading_screen'];
    if (ignoredEvents.includes(event)) {
      return res.status(200).json({ success: true, message: `${event} ignorado` });
    }
    
    // Ignora mensagens enviadas pelo próprio bot (fromMe = true)
    if (event === 'message_create') {
      const msgData = data.message || data;
      const fromMe = msgData.fromMe || msgData._data?.fromMe || false;
      
      if (fromMe) {
        return res.status(200).json({ success: true, message: 'Mensagem própria ignorada' });
      }
    }
    
    // Ignora message_ack de mensagens próprias
    if (event === 'message_ack') {
      const msgData = data.message || data;
      const fromMe = msgData.fromMe || msgData._data?.fromMe || false;
      
      if (fromMe) {
        return res.status(200).json({ success: true, message: 'ACK próprio ignorado' });
      }
    }
    
    // Processa o webhook (exibe no console se passar pelo filtro)
    webhookService.processWebhook(sessionId, event, data);
    
    return sendSuccessResponse(res, {
      received: true,
      sessionId,
      event
    }, 'Webhook recebido e processado');
    
  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    return sendErrorResponse(res, 500, `Erro ao processar webhook: ${error.message}`);
  }
}

/**
 * Controller para configurar filtro de sessões do webhook
 */
function setWebhookFilter(req, res) {
  /* 
    #swagger.tags = ['Webhook']
    #swagger.summary = 'Configurar filtro de sessões'
    #swagger.description = 'Define quais sessões devem ter seus eventos exibidos no console. Aceita uma sessão ou array de sessões.'
    #swagger.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: 'object',
            properties: {
              sessionIds: {
                oneOf: [
                  { type: 'string', example: 'sessao1' },
                  { type: 'array', items: { type: 'string' }, example: ['sessao1', 'sessao2'] }
                ],
                description: 'SessionId único ou array de sessionIds para filtrar. Envie null ou array vazio para exibir todas as sessões.'
              }
            }
          }
        }
      }
    }
  */
  try {
    const { sessionIds } = req.body;
    
    webhookService.setSessionFilter(sessionIds);
    
    return sendSuccessResponse(res, {
      activeFilters: webhookService.getSessionFilters(),
      message: sessionIds && (Array.isArray(sessionIds) ? sessionIds.length : 1) > 0
        ? 'Filtro de sessões configurado'
        : 'Exibindo eventos de todas as sessões'
    });
  } catch (error) {
    return sendErrorResponse(res, 500, `Erro ao configurar filtro: ${error.message}`);
  }
}

/**
 * Controller para obter filtros ativos
 */
function getWebhookFilter(req, res) {
  /* 
    #swagger.tags = ['Webhook']
    #swagger.summary = 'Obter filtros ativos'
    #swagger.description = 'Retorna a lista de sessões que estão sendo monitoradas no webhook.'
  */
  try {
    const filters = webhookService.getSessionFilters();
    
    return sendSuccessResponse(res, {
      activeFilters: filters,
      filteringEnabled: filters.length > 0,
      message: filters.length === 0 
        ? 'Exibindo eventos de todas as sessões' 
        : `Filtrando ${filters.length} sessão(ões)`
    });
  } catch (error) {
    return sendErrorResponse(res, 500, `Erro ao obter filtros: ${error.message}`);
  }
}

/**
 * Controller para limpar todos os filtros
 */
function clearWebhookFilter(req, res) {
  /* 
    #swagger.tags = ['Webhook']
    #swagger.summary = 'Limpar filtros'
    #swagger.description = 'Remove todos os filtros de sessão, exibindo eventos de todas as sessões.'
  */
  try {
    webhookService.setSessionFilter([]);
    
    return sendSuccessResponse(res, {
      message: 'Filtros removidos. Exibindo eventos de todas as sessões.'
    });
  } catch (error) {
    return sendErrorResponse(res, 500, `Erro ao limpar filtros: ${error.message}`);
  }
}

module.exports = {
  receiveWebhook,
  setWebhookFilter,
  getWebhookFilter,
  clearWebhookFilter
};
