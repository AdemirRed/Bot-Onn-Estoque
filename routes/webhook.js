const express = require('express');
const webhookController = require('../controllers/webhookController');
const sessionController = require('../controllers/sessionController');
const audioController = require('../controllers/audioController');
const { apikey } = require('../middlewares');

const router = express.Router();

/**
 * POST /webhook
 * Recebe webhooks da API WhatsApp externa
 */
router.post('/webhook', apikey, webhookController.receiveWebhook);

/**
 * POST /webhook/filter
 * Configura filtro de sessões do webhook
 */
router.post('/webhook/filter', apikey, webhookController.setWebhookFilter);

/**
 * GET /webhook/filter
 * Obtém os filtros ativos do webhook
 */
router.get('/webhook/filter', apikey, webhookController.getWebhookFilter);

/**
 * DELETE /webhook/filter
 * Remove todos os filtros do webhook
 */
router.delete('/webhook/filter', apikey, webhookController.clearWebhookFilter);

/**
 * GET /sessions
 * Lista todas as sessões ativas da API WhatsApp
 */
router.get('/sessions', apikey, sessionController.listSessions);

/**
 * GET /sessions/:sessionId
 * Obtém status de uma sessão específica
 */
router.get('/sessions/:sessionId', apikey, sessionController.getSessionStatus);

/**
 * GET /audios
 * Lista todos os áudios pendentes
 */
router.get('/audios', apikey, audioController.listPendingAudios);

/**
 * GET /audios/:messageId
 * Obtém detalhes de um áudio específico (com base64)
 */
router.get('/audios/:messageId', apikey, audioController.getAudio);

/**
 * POST /audios/:messageId/transcribe
 * Transcreve um áudio específico via BipText
 */
router.post('/audios/:messageId/transcribe', apikey, audioController.transcribeAudio);

/**
 * POST /audios/transcribe-all
 * Transcreve todos os áudios pendentes
 */
router.post('/audios/transcribe-all', apikey, audioController.transcribeAllPending);

/**
 * DELETE /audios/:messageId
 * Deleta um áudio da memória
 */
router.delete('/audios/:messageId', apikey, audioController.deleteAudio);

module.exports = router;
