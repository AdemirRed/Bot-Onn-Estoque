/**
 * Serviço para gerenciar processamento de múltiplos áudios consecutivos
 */
class MultiAudioManager {
  constructor() {
    // Áudios pendentes por usuário
    this.pendingAudios = new Map(); // userId -> { audios: [], timeout: timeoutId, lastAudioTime: timestamp }
    this.BATCH_TIMEOUT = 5000; // 5 segundos de espera após último áudio
  }

  /**
   * Adiciona áudio à fila para processamento em lote
   * @param {string} userId - ID do usuário
   * @param {string} messageId - ID da mensagem de áudio
   * @param {string} sessionId - ID da sessão
   */
  addAudio(userId, messageId, sessionId) {
    const now = Date.now();
    
    if (!this.pendingAudios.has(userId)) {
      this.pendingAudios.set(userId, {
        audios: [],
        timeout: null,
        lastAudioTime: now,
        sessionId
      });
    }

    const userAudios = this.pendingAudios.get(userId);
    
    // Adiciona áudio à lista
    userAudios.audios.push({
      messageId,
      timestamp: now
    });
    userAudios.lastAudioTime = now;

    console.log(`🎤 [${userId}] Áudio ${userAudios.audios.length} adicionado à fila`);

    // Cancela timeout anterior se existir
    if (userAudios.timeout) {
      clearTimeout(userAudios.timeout);
    }

    // Define novo timeout
    userAudios.timeout = setTimeout(() => {
      this.processAudioBatch(userId);
    }, this.BATCH_TIMEOUT);

    return userAudios.audios.length;
  }

  /**
   * Processa lote de áudios de um usuário
   * @param {string} userId - ID do usuário
   */
  async processAudioBatch(userId) {
    const userAudios = this.pendingAudios.get(userId);
    if (!userAudios || userAudios.audios.length === 0) {
      return;
    }

    const audioCount = userAudios.audios.length;
    const { audios, sessionId } = userAudios;
    
    console.log(`\n🎤 Processando lote de ${audioCount} áudio(s) de ${userId}:`);
    audios.forEach((audio, i) => {
      console.log(`   ${i + 1}. ${audio.messageId}`);
    });

    // Remove da lista de pendentes
    this.pendingAudios.delete(userId);

    // Importa serviços aqui para evitar dependências circulares
    const transcriptionService = require('./transcriptionService');
    const messageService = require('./messageService');
    const materialSearchService = require('./materialSearchService');

    try {
      const transcriptions = [];
      let hasError = false;

      // Transcreve todos os áudios
      for (let i = 0; i < audios.length; i++) {
        const { messageId } = audios[i];
        
        try {
          console.log(`🎤 Transcrevendo áudio ${i + 1}/${audioCount}...`);
          
          // Envia resposta inicial apenas no primeiro áudio
          if (i === 0) {
            await messageService.replyToMessage(
              sessionId,
              userId,
              messageId,
              `🎤 Transcrevendo ${audioCount} áudio(s)... Aguarde alguns segundos.`
            );
          }

          const transcription = await transcriptionService.transcribeAudioById(messageId);
          if (transcription) {
            transcriptions.push({
              messageId,
              transcription,
              index: i + 1
            });
          }
        } catch (error) {
          console.error(`❌ Erro ao transcrever áudio ${i + 1}:`, error.message);
          hasError = true;
        }
      }

      // Se teve transcrições bem-sucedidas
      if (transcriptions.length > 0) {
        // Formata todas as transcrições
        let fullMessage = `📝 *Transcrição de ${transcriptions.length} áudio(s):*\n\n`;
        
        transcriptions.forEach(({ transcription, index }) => {
          fullMessage += `🎤 *Áudio ${index}:*\n"${transcription}"\n\n`;
        });

        // Remove a última quebra de linha dupla
        fullMessage = fullMessage.trim();

        // Envia transcrições consolidadas
        await messageService.sendTextMessage(sessionId, userId, fullMessage);
        console.log(`✅ Transcrições consolidadas enviadas!`);

        // Combina todas as transcrições para busca de material
        const combinedText = transcriptions.map(t => t.transcription).join(' ');
        
        // Processa como busca de material
        try {
          const searchResult = await materialSearchService.processMessage(userId, sessionId, combinedText);
          if (searchResult && searchResult.message) {
            await new Promise(res => setTimeout(res, 1000));
            await messageService.sendTextMessage(sessionId, userId, searchResult.message);
            console.log('✅ Resposta de material enviada após transcrições múltiplas');
          }
        } catch (searchError) {
          console.error('❌ Erro na busca de material:', searchError.message);
        }

      } else if (hasError) {
        // Todos falharam
        await messageService.sendTextMessage(
          sessionId,
          userId,
          `❌ Erro ao transcrever os áudios. Tente enviá-los novamente individualmente.`
        );
      }

    } catch (error) {
      console.error('❌ Erro no processamento do lote de áudios:', error.message);
      await messageService.sendTextMessage(
        sessionId,
        userId,
        `❌ Erro no processamento dos áudios. Tente novamente.`
      );
    }
  }

  /**
   * Cancela processamento pendente de um usuário
   * @param {string} userId - ID do usuário
   */
  cancelPending(userId) {
    const userAudios = this.pendingAudios.get(userId);
    if (userAudios && userAudios.timeout) {
      clearTimeout(userAudios.timeout);
      this.pendingAudios.delete(userId);
      console.log(`🚫 Cancelado processamento de áudios pendentes para ${userId}`);
    }
  }

  /**
   * Verifica se usuário tem áudios pendentes
   * @param {string} userId - ID do usuário
   * @returns {boolean}
   */
  hasPendingAudios(userId) {
    const userAudios = this.pendingAudios.get(userId);
    return userAudios && userAudios.audios.length > 0;
  }

  /**
   * Obtém estatísticas do gerenciador
   * @returns {Object}
   */
  getStats() {
    const users = Array.from(this.pendingAudios.keys());
    const totalAudios = users.reduce((sum, userId) => {
      return sum + this.pendingAudios.get(userId).audios.length;
    }, 0);

    return {
      usersWithPendingAudios: users.length,
      totalPendingAudios: totalAudios,
      users: users.map(userId => ({
        userId,
        audioCount: this.pendingAudios.get(userId).audios.length,
        lastAudioTime: this.pendingAudios.get(userId).lastAudioTime
      }))
    };
  }
}

module.exports = new MultiAudioManager();