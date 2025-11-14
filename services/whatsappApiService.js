const axios = require('axios');
const config = require('../config');

/**
 * Service para interagir com a API WhatsApp externa
 */

/**
 * Lista todas as sessões ativas na API WhatsApp
 * @returns {Promise<Array>} Array de sessões
 */
async function listActiveSessions() {
  try {
    console.log('🔍 Fazendo requisição para:', `${config.whatsappApiUrl}/session/list`);
    const response = await axios.get(`${config.whatsappApiUrl}/session/list`, {
      headers: {
        'x-api-key': config.apiKey
      }
    });
    
    console.log('📊 Resposta da API:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.sessions) {
      return response.data.sessions;
    }
    
    return [];
  } catch (error) {
    console.error('❌ Erro ao listar sessões:');
    console.error('   URL:', `${config.whatsappApiUrl}/session/list`);
    console.error('   Status:', error.response?.status);
    console.error('   StatusText:', error.response?.statusText);
    console.error('   Data:', error.response?.data);
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);
    return [];
  }
}

/**
 * Obtém o status de uma sessão específica
 * @param {string} sessionId - ID da sessão
 * @returns {Promise<Object>} Status da sessão
 */
async function getSessionStatus(sessionId) {
  try {
    const response = await axios.get(`${config.whatsappApiUrl}/session/status/${sessionId}`, {
      headers: {
        'x-api-key': config.apiKey
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`❌ Erro ao obter status da sessão ${sessionId}:`, error.message);
    return null;
  }
}

/**
 * Exibe informações das sessões ativas
 */
async function displayActiveSessions() {
  console.log('\n🔍 Consultando sessões ativas na API WhatsApp...\n');
  
  const sessions = await listActiveSessions();
  
  if (sessions.length === 0) {
    console.log('⚠️  Nenhuma sessão ativa encontrada na API WhatsApp');
    console.log(`💡 Inicie sessões usando: GET ${config.whatsappApiUrl}session/start/:sessionId\n`);
    return [];
  }
  
  console.log('✅ Sessões ativas encontradas:\n');
  
  const activeSessions = [];
  
  for (const session of sessions) {
    const sessionId = session.sessionId || session;
    const status = session.status || 'unknown';
    
    let emoji = '⚪';
    if (status === 'CONNECTED' || status === 'ready') emoji = '🟢';
    else if (status === 'STARTING' || status === 'qr') emoji = '🟡';
    else if (status === 'DISCONNECTED') emoji = '🔴';
    
    console.log(`   ${emoji} ${sessionId} - ${status}`);
    
    if (status === 'CONNECTED' || status === 'ready') {
      activeSessions.push(sessionId);
    }
  }
  
  console.log('');
  return activeSessions;
}

module.exports = {
  listActiveSessions,
  getSessionStatus,
  displayActiveSessions
};
