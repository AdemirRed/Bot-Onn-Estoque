/**
 * Serviço para gerenciar áudios recebidos
 * Armazena temporariamente para transcrição futura
 */

// Armazena áudios em memória (futuramente pode ser salvo em banco de dados)
const pendingAudios = new Map();

/**
 * Armazena um áudio para processamento futuro
 * @param {string} messageId - ID da mensagem
 * @param {Object} audioData - Dados do áudio
 */
function storeAudio(messageId, audioData) {
  const audio = {
    id: messageId,
    sessionId: audioData.sessionId,
    from: audioData.from,
    to: audioData.to,
    base64: audioData.base64,
    mimetype: audioData.mimetype,
    duration: audioData.duration,
    filesize: audioData.filesize,
    timestamp: new Date().toISOString(),
    transcribed: false,
    transcription: null
  };
  
  pendingAudios.set(messageId, audio);
  
  console.log(`💾 Áudio armazenado: ${messageId} (${audioData.duration}s)`);
  
  return audio;
}

/**
 * Recupera um áudio armazenado
 * @param {string} messageId - ID da mensagem
 * @returns {Object|null} Dados do áudio
 */
function getAudio(messageId) {
  return pendingAudios.get(messageId) || null;
}

/**
 * Lista todos os áudios pendentes
 * @returns {Array} Array de áudios
 */
function listPendingAudios() {
  return Array.from(pendingAudios.values()).filter(audio => !audio.transcribed);
}

/**
 * Marca um áudio como transcrito
 * @param {string} messageId - ID da mensagem
 * @param {string} transcription - Texto transcrito
 */
function markAsTranscribed(messageId, transcription) {
  const audio = pendingAudios.get(messageId);
  if (audio) {
    audio.transcribed = true;
    audio.transcription = transcription;
    audio.transcribedAt = new Date().toISOString();
    
    console.log(`✅ Áudio transcrito: ${messageId}`);
  }
}

/**
 * Remove um áudio da memória
 * @param {string} messageId - ID da mensagem
 */
function deleteAudio(messageId) {
  const deleted = pendingAudios.delete(messageId);
  if (deleted) {
    console.log(`🗑️  Áudio removido: ${messageId}`);
  }
  return deleted;
}

/**
 * Limpa áudios antigos (mais de 1 hora)
 */
function cleanupOldAudios() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  let cleaned = 0;
  
  for (const [messageId, audio] of pendingAudios.entries()) {
    const audioTime = new Date(audio.timestamp);
    if (audioTime < oneHourAgo) {
      pendingAudios.delete(messageId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 ${cleaned} áudio(s) antigo(s) removido(s)`);
  }
}

// Limpa áudios antigos a cada 30 minutos
setInterval(cleanupOldAudios, 30 * 60 * 1000);

module.exports = {
  storeAudio,
  getAudio,
  listPendingAudios,
  markAsTranscribed,
  deleteAudio,
  cleanupOldAudios
};
