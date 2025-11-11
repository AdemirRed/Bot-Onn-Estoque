const audioService = require('../services/audioService');
const transcriptionService = require('../services/transcriptionService');
const { sendErrorResponse, sendSuccessResponse } = require('../utils/responses');

/**
 * Controller para listar áudios pendentes
 */
function listPendingAudios(req, res) {
  /* 
    #swagger.tags = ['Audio']
    #swagger.summary = 'Listar áudios pendentes'
    #swagger.description = 'Lista todos os áudios recebidos que ainda não foram transcritos.'
  */
  try {
    const audios = audioService.listPendingAudios();
    
    // Remove o base64 da listagem para não sobrecarregar
    const audiosList = audios.map(audio => ({
      id: audio.id,
      sessionId: audio.sessionId,
      from: audio.from,
      duration: audio.duration,
      filesize: audio.filesize,
      timestamp: audio.timestamp,
      hasBase64: !!audio.base64
    }));
    
    return sendSuccessResponse(res, {
      total: audiosList.length,
      audios: audiosList
    }, 'Áudios listados com sucesso');
    
  } catch (error) {
    return sendErrorResponse(res, 500, `Erro ao listar áudios: ${error.message}`);
  }
}

/**
 * Controller para obter detalhes de um áudio específico
 */
function getAudio(req, res) {
  /* 
    #swagger.tags = ['Audio']
    #swagger.summary = 'Obter áudio'
    #swagger.description = 'Retorna os detalhes completos de um áudio, incluindo o base64.'
  */
  try {
    const { messageId } = req.params;
    
    if (!messageId) {
      return sendErrorResponse(res, 400, 'messageId é obrigatório');
    }
    
    const audio = audioService.getAudio(messageId);
    
    if (!audio) {
      return sendErrorResponse(res, 404, 'Áudio não encontrado');
    }
    
    return sendSuccessResponse(res, audio, 'Áudio encontrado');
    
  } catch (error) {
    return sendErrorResponse(res, 500, `Erro ao obter áudio: ${error.message}`);
  }
}

/**
 * Controller para deletar um áudio
 */
function deleteAudio(req, res) {
  /* 
    #swagger.tags = ['Audio']
    #swagger.summary = 'Deletar áudio'
    #swagger.description = 'Remove um áudio da memória.'
  */
  try {
    const { messageId } = req.params;
    
    if (!messageId) {
      return sendErrorResponse(res, 400, 'messageId é obrigatório');
    }
    
    const deleted = audioService.deleteAudio(messageId);
    
    if (!deleted) {
      return sendErrorResponse(res, 404, 'Áudio não encontrado');
    }
    
    return sendSuccessResponse(res, { deleted: true }, 'Áudio deletado com sucesso');
    
  } catch (error) {
    return sendErrorResponse(res, 500, `Erro ao deletar áudio: ${error.message}`);
  }
}

/**
 * Controller para transcrever um áudio específico
 */
async function transcribeAudio(req, res) {
  /* 
    #swagger.tags = ['Audio']
    #swagger.summary = 'Transcrever áudio'
    #swagger.description = 'Envia um áudio armazenado para transcrição via BipText.'
  */
  try {
    const { messageId } = req.params;
    
    if (!messageId) {
      return sendErrorResponse(res, 400, 'messageId é obrigatório');
    }
    
    const result = await transcriptionService.transcribeStoredAudio(messageId);
    
    if (!result.success) {
      return sendErrorResponse(res, 500, result.error);
    }
    
    return sendSuccessResponse(res, result);
    
  } catch (error) {
    return sendErrorResponse(res, 500, `Erro ao transcrever áudio: ${error.message}`);
  }
}

/**
 * Controller para transcrever todos os áudios pendentes
 */
async function transcribeAllPending(req, res) {
  /* 
    #swagger.tags = ['Audio']
    #swagger.summary = 'Transcrever todos pendentes'
    #swagger.description = 'Transcreve automaticamente todos os áudios que ainda não foram processados.'
  */
  try {
    const results = await transcriptionService.transcribeAllPending();
    
    return sendSuccessResponse(res, {
      total: results.length,
      results
    }, 'Processamento concluído');
    
  } catch (error) {
    return sendErrorResponse(res, 500, `Erro ao processar áudios: ${error.message}`);
  }
}

module.exports = {
  listPendingAudios,
  getAudio,
  deleteAudio,
  transcribeAudio,
  transcribeAllPending
};
