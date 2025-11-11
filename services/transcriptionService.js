const axios = require('axios');
const config = require('../config');
const audioService = require('./audioService');
const messageService = require('./messageService');
const materialSearchService = require('./materialSearchService');

/**
 * Serviço de transcrição de áudio usando BipText
 */

/**
 * Transcreve um áudio via API WhatsApp (BipText)
 * @param {string} sessionId - ID da sessão
 * @param {string} audioBase64 - Áudio em base64
 * @param {string} filename - Nome do arquivo (opcional)
 * @returns {Promise<string>} Texto transcrito
 */
async function transcribeAudio(sessionId, audioBase64, filename = 'audio.ogg') {
  try {
    console.log(`\n🎤 Iniciando transcrição de áudio...`);
    console.log(`   Sessão: ${sessionId}`);
    console.log(`   Tamanho: ${audioBase64.length} chars`);
    
    // Garante que o base64 tem o prefixo correto
    const formattedAudio = audioBase64.startsWith('data:audio/') 
      ? audioBase64 
      : `data:audio/ogg;base64,${audioBase64}`;
    
    const response = await axios.post(
      `${config.whatsappApiUrl}/audio/transcribe/${sessionId}`,
      {
        audioBase64: formattedAudio,
        filename: filename
      },
      {
        headers: {
          'x-api-key': config.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: config.transcriptionTimeout
      }
    );
    
    if (response.data && response.data.transcription) {
      console.log(`✅ Transcrição concluída!`);
      console.log(`   Texto: "${response.data.transcription}"\n`);
      return response.data.transcription;
    }
    
    throw new Error('Resposta sem transcrição');
    
  } catch (error) {
    console.error(`❌ Erro na transcrição:`, error.message);
    throw error;
  }
}

/**
 * Transcreve um áudio armazenado pelo messageId
 * @param {string} messageId - ID da mensagem
 * @returns {Promise<Object>} Resultado com transcrição
 */
async function transcribeStoredAudio(messageId) {
  try {
    // Busca o áudio armazenado
    const audio = audioService.getAudio(messageId);
    
    if (!audio) {
      throw new Error('Áudio não encontrado');
    }
    
    if (audio.transcribed) {
      return {
        success: true,
        transcription: audio.transcription,
        cached: true,
        message: 'Transcrição já realizada (cache)'
      };
    }
    
    // Transcreve o áudio
    const transcription = await transcribeAudio(
      audio.sessionId,
      audio.base64,
      `audio_${messageId.substring(0, 10)}.ogg`
    );
    
    // Marca como transcrito
    audioService.markAsTranscribed(messageId, transcription);
    
    return {
      success: true,
      transcription,
      cached: false,
      message: 'Áudio transcrito com sucesso'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Erro ao transcrever áudio'
    };
  }
}

/**
 * Transcreve automaticamente todos os áudios pendentes
 * @returns {Promise<Array>} Resultados das transcrições
 */
async function transcribeAllPending() {
  const pendingAudios = audioService.listPendingAudios();
  
  if (pendingAudios.length === 0) {
    console.log('📭 Nenhum áudio pendente para transcrever');
    return [];
  }
  
  console.log(`\n📋 ${pendingAudios.length} áudio(s) pendente(s) para transcrever\n`);
  
  const results = [];
  
  for (const audio of pendingAudios) {
    const result = await transcribeStoredAudio(audio.id);
    results.push({
      messageId: audio.id,
      from: audio.from,
      ...result
    });
    
    // Pequena pausa entre transcrições para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return results;
}

/**
 * Processa áudio automaticamente: responde "transcrevendo", transcreve e envia resultado
 * @param {string} messageId - ID da mensagem
 * @param {string} sessionId - ID da sessão
 * @param {string} chatId - ID do chat
 * @returns {Promise<Object>} Resultado do processamento
 */
async function processAudioWithReply(messageId, sessionId, chatId) {
  try {
    console.log(`\n🎤 Processando áudio automaticamente...`);
    
    // 1. Responde que vai transcrever
    await messageService.replyToMessage(
      sessionId,
      chatId,
      messageId,
      '🎤 Transcrevendo áudio... Aguarde alguns segundos.'
    );
    console.log(`✅ Mensagem de confirmação enviada`);
    
    // 2. Busca o áudio
    const audio = audioService.getAudio(messageId);
    if (!audio) {
      await messageService.sendTextMessage(
        sessionId,
        chatId,
        '❌ Erro: Áudio não encontrado na memória.'
      );
      return { success: false, error: 'Áudio não encontrado' };
    }
    
    // 3. Transcreve
    const transcription = await transcribeAudio(
      audio.sessionId,
      audio.base64,
      `audio_${messageId.substring(0, 10)}.ogg`
    );
    
    // 4. Marca como transcrito
    audioService.markAsTranscribed(messageId, transcription);
    
    // 5. Responde com a transcrição
    await messageService.replyToMessage(
      sessionId,
      chatId,
      messageId,
      `📝 *Transcrição:*\n\n"${transcription}"`
    );
    console.log(`✅ Transcrição enviada com sucesso!\n`);
    // 6. Processa automaticamente a transcrição como uma busca de material
    try {
      const searchResult = await materialSearchService.processMessage(chatId, sessionId, transcription);
      if (searchResult && searchResult.message) {
        // envia como resposta normal (não reply) após pequena pausa
        await new Promise(res => setTimeout(res, 500));
        await messageService.sendTextMessage(sessionId, chatId, searchResult.message);
        console.log('✅ Resposta de material enviada após transcrição');
      }
    } catch (err) {
      console.error('❌ Erro ao processar transcrição como busca:', err.message);
    }
    
    return {
      success: true,
      transcription,
      message: 'Áudio processado e resposta enviada'
    };
    
  } catch (error) {
    console.error(`❌ Erro ao processar áudio:`, error.message);
    
    // Tenta enviar mensagem de erro
    try {
      await messageService.sendTextMessage(
        sessionId,
        chatId,
        `❌ Erro ao transcrever áudio: ${error.message}`
      );
    } catch (msgError) {
      console.error(`❌ Erro ao enviar mensagem de erro:`, msgError.message);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  transcribeAudio,
  transcribeStoredAudio,
  transcribeAllPending,
  processAudioWithReply
};
