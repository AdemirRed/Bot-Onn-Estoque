const axios = require('axios');
const fs = require('fs');
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

/**
 * Envia um arquivo/documento
 * @param {string} sessionId - ID da sessão
 * @param {string} chatId - ID do chat
 * @param {string} filepath - Caminho do arquivo
 * @param {string} caption - Legenda opcional
 * @returns {Promise<Object>} Resposta da API
 */
async function sendDocument(sessionId, chatId, filepath, caption = '') {
  try {
    // Lê o arquivo e converte para base64
    const fileBuffer = fs.readFileSync(filepath);
    const base64Data = fileBuffer.toString('base64');
    const filename = filepath.split(/[/\\]/).pop();
    
    // Detecta mimetype baseado na extensão
    const ext = filename.split('.').pop().toLowerCase();
    const mimetypes = {
      'html': 'text/html',
      'pdf': 'application/pdf',
      'csv': 'text/csv',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'txt': 'text/plain'
    };
    const mimetype = mimetypes[ext] || 'application/octet-stream';

    const response = await axios.post(
      `${config.whatsappApiUrl}/client/sendMessage/${sessionId}`,
      {
        chatId: chatId,
        contentType: 'MessageMedia',
        content: {
          mimetype: mimetype,
          data: base64Data,
          filename: filename
        }
      },
      {
        headers: {
          'x-api-key': config.apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Se tem legenda, envia como mensagem separada
    if (caption) {
      await sendTextMessage(sessionId, chatId, caption);
    }
    
    return response.data;
  } catch (error) {
    console.error(`❌ Erro ao enviar documento:`, error.message);
    throw error;
  }
}

module.exports = {
  sendTextMessage,
  replyToMessage,
  sendTyping,
  sendDocument
};
