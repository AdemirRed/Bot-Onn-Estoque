const axios = require('axios');
const config = require('../config');

/**
 * Serviço para enviar mensagens via API WhatsApp
 */

/**
 * Envia uma mensagem de texto
 * @param {string} sessionId - ID da sessão
 * @param {string} chatId - ID do chat (número@c.us)
 * @param {string} message - Mensagem a enviar
 * @returns {Promise<Object>} Resposta da API
 */
async function sendTextMessage(sessionId, chatId, message) {
  try {
    const response = await axios.post(
      `${config.whatsappApiUrl}/client/sendMessage/${sessionId}`,
      {
        chatId: chatId,
        contentType: 'string',
        content: message
      },
      {
        headers: {
          'x-api-key': config.apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error(`❌ Erro ao enviar mensagem:`, error.message);
    throw error;
  }
}

/**
 * Responde uma mensagem específica
 * @param {string} sessionId - ID da sessão
 * @param {string} chatId - ID do chat
 * @param {string} messageId - ID da mensagem para responder
 * @param {string} message - Mensagem de resposta
 * @returns {Promise<Object>} Resposta da API
 */
async function replyToMessage(sessionId, chatId, messageId, message) {
  try {
    const response = await axios.post(
      `${config.whatsappApiUrl}/message/reply/${sessionId}`,
      {
        chatId: chatId,
        messageId: messageId,
        content: message
      },
      {
        headers: {
          'x-api-key': config.apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error(`❌ Erro ao responder mensagem:`, error.message);
    throw error;
  }
}

/**
 * Envia status de "digitando..."
 * @param {string} sessionId - ID da sessão
 * @param {string} chatId - ID do chat
 * @returns {Promise<Object>} Resposta da API
 */
async function sendTyping(sessionId, chatId) {
  try {
    const response = await axios.post(
      `${config.whatsappApiUrl}/client/sendPresenceAvailable/${sessionId}`,
      {
        chatId: chatId
      },
      {
        headers: {
          'x-api-key': config.apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    // Não é crítico se falhar
    console.error(`⚠️ Erro ao enviar typing:`, error.message);
  }
}

module.exports = {
  sendTextMessage,
  replyToMessage,
  sendTyping
};
