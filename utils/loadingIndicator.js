const { sendTextMessage, editMessage } = require('../services/messageService');

/**
 * Loading animation frames using block characters
 */
const LOADING_FRAMES = [
  '▰▱▱▱▱▱▱▱▱▱',
  '▰▰▱▱▱▱▱▱▱▱',
  '▰▰▰▱▱▱▱▱▱▱',
  '▰▰▰▰▱▱▱▱▱▱',
  '▰▰▰▰▰▱▱▱▱▱',
  '▰▰▰▰▰▰▱▱▱▱',
  '▰▰▰▰▰▰▰▱▱▱',
  '▰▰▰▰▰▰▰▰▱▱',
  '▰▰▰▰▰▰▰▰▰▱',
  '▰▰▰▰▰▰▰▰▰▰'
];

/**
 * Sends a loading message with progress indicator
 * @param {string} sessionId - WhatsApp session ID
 * @param {string} chatId - Chat ID to send message to
 * @param {string} operation - Operation being performed (e.g., "Gerando relatório")
 * @param {number} estimatedSeconds - Estimated time in seconds
 * @returns {Promise<Object>} Message response
 */
async function sendLoadingMessage(sessionId, chatId, operation, estimatedSeconds = null) {
  let message = `⏳ ${operation}...`;
  
  if (estimatedSeconds) {
    message += `\n⏱️ Tempo estimado: ~${estimatedSeconds} segundos`;
  }
  
  try {
    return await sendTextMessage(sessionId, chatId, message);
  } catch (error) {
    console.error('Error sending loading message:', error);
    return null;
  }
}

/**
 * Sends a progress message with animated loading bar
 * @param {string} sessionId - WhatsApp session ID
 * @param {string} chatId - Chat ID to send message to
 * @param {string} operation - Operation being performed
 * @param {number} progress - Progress percentage (0-100)
 * @returns {Promise<Object>} Message response
 */
async function sendProgressMessage(sessionId, chatId, operation, progress) {
  const frameIndex = Math.min(Math.floor((progress / 100) * LOADING_FRAMES.length), LOADING_FRAMES.length - 1);
  const loadingBar = LOADING_FRAMES[frameIndex];
  
  const message = `${loadingBar}\n⏳ ${operation}... ${progress}%`;
  
  try {
    return await sendTextMessage(sessionId, chatId, message);
  } catch (error) {
    console.error('Error sending progress message:', error);
    return null;
  }
}

/**
 * Sends a completion message
 * @param {string} sessionId - WhatsApp session ID
 * @param {string} chatId - Chat ID to send message to
 * @param {string} operation - Operation that was completed
 * @param {boolean} success - Whether the operation was successful
 * @returns {Promise<Object>} Message response
 */
async function sendCompletionMessage(sessionId, chatId, operation, success = true) {
  const emoji = success ? '✅' : '❌';
  const status = success ? 'pronto' : 'falhou';
  const message = `${emoji} ${operation} ${status}!`;
  
  try {
    return await sendTextMessage(sessionId, chatId, message);
  } catch (error) {
    console.error('Error sending completion message:', error);
    return null;
  }
}

/**
 * Wraps an async operation with loading messages
 * @param {string} sessionId - WhatsApp session ID
 * @param {string} chatId - Chat ID to send messages to
 * @param {string} operationName - Name of the operation
 * @param {Function} operation - Async function to execute
 * @param {number} estimatedSeconds - Estimated time in seconds
 * @returns {Promise<any>} Result of the operation
 */
async function withLoadingIndicator(sessionId, chatId, operationName, operation, estimatedSeconds = null) {
  // Send loading message
  await sendLoadingMessage(sessionId, chatId, operationName, estimatedSeconds);
  
  try {
    // Execute the operation
    const result = await operation();
    
    // Send completion message
    await sendCompletionMessage(sessionId, chatId, operationName, true);
    
    return result;
  } catch (error) {
    // Send error completion message
    await sendCompletionMessage(sessionId, chatId, operationName, false);
    throw error;
  }
}

/**
 * Sends animated loading messages with progress updates
 * Edits the same message to show progress (no spam!)
 * @param {string} sessionId - WhatsApp session ID
 * @param {string} chatId - Chat ID to send messages to
 * @param {string} operation - Operation being performed
 * @param {number} estimatedSeconds - Estimated time in seconds
 * @param {number} updateIntervalMs - Interval between updates in milliseconds (default: 2000)
 * @returns {Promise<Object>} Controller object with stop() method (resolves after first message sent)
 */
async function startAnimatedLoading(sessionId, chatId, operation, estimatedSeconds = 10, updateIntervalMs = 2000) {
  let currentFrame = 0;
  let stopped = false;
  let intervalId = null;
  let messageId = null;
  
  const controller = {
    stop: () => {
      stopped = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    },
    finishLoading: async () => {
      // Stop the interval first
      stopped = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
      
      // Update to 100% before finishing
      if (messageId) {
        try {
          const finalMessage = `${LOADING_FRAMES[LOADING_FRAMES.length - 1]}\n⏳ ${operation}... 100%`;
          console.log('🎯 Finalizando loading em 100%...');
          await editMessage(sessionId, chatId, messageId, finalMessage);
          console.log('✅ Loading finalizado em 100%');
          
          // Small delay to let user see 100%
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error('Erro ao finalizar loading em 100%:', error.message);
        }
      }
    }
  };

  // Send initial message and get its ID
  try {
    const initialMessage = `${LOADING_FRAMES[0]}\n⏳ ${operation}...\n⏱️ Tempo estimado: ~${estimatedSeconds} segundos`;
    const response = await sendTextMessage(sessionId, chatId, initialMessage);
    
    console.log('📊 Resposta completa do sendTextMessage:', JSON.stringify(response, null, 2));
    
    // Extract message ID from response - try different possible structures
    if (response) {
      // Try: response.result.message.id._serialized
      if (response.result && response.result.message && response.result.message.id) {
        messageId = response.result.message.id._serialized || response.result.message.id.id || response.result.message.id;
      }
      // Try: response.message.id._serialized
      else if (response.message && response.message.id) {
        messageId = response.message.id._serialized || response.message.id.id || response.message.id;
      }
      // Try: response.id
      else if (response.id) {
        messageId = response.id._serialized || response.id.id || response.id;
      }
      
      if (messageId) {
        console.log(`✅ Loading inicial enviado com sucesso!`);
        console.log(`📍 Message ID capturado: ${messageId}`);
        console.log(`🎯 Operação: ${operation}`);
      } else {
        console.warn('⚠️ Resposta recebida mas messageId não encontrado na estrutura esperada');
        console.warn('📋 Estrutura recebida:', Object.keys(response));
        return controller;
      }
    } else {
      console.error('❌ Resposta vazia do sendTextMessage');
      return controller;
    }
    
    // Small delay to ensure message is delivered before continuing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log(`🔄 Iniciando loop de edição (intervalo: ${updateIntervalMs}ms)`);
    
    // Edit the same message with progress updates
    intervalId = setInterval(async () => {
      if (stopped || !messageId) {
        clearInterval(intervalId);
        console.log('🛑 Loop de edição parado');
        return;
      }
      
      currentFrame = (currentFrame + 1) % LOADING_FRAMES.length;
      const progress = Math.round(((currentFrame + 1) / LOADING_FRAMES.length) * 100);
      const loadingBar = LOADING_FRAMES[currentFrame];
      
      const updatedMessage = `${loadingBar}\n⏳ ${operation}... ${progress}%`;
      
      try {
        console.log(`📝 Tentando editar mensagem ${messageId} para ${progress}%...`);
        const editResponse = await editMessage(sessionId, chatId, messageId, updatedMessage);
        console.log(`✅ Mensagem editada com sucesso: ${progress}%`);
        console.log(`📊 Resposta da edição:`, JSON.stringify(editResponse, null, 2));
      } catch (error) {
        console.error(`❌ Erro ao editar mensagem (${progress}%):`, error.message);
        console.error('   Message ID:', messageId);
        console.error('   Chat ID:', chatId);
        console.error('   Session ID:', sessionId);
        // If edit fails, stop trying
        controller.stop();
      }
    }, updateIntervalMs);
    
    // Auto-stop after max duration (estimatedSeconds * 3)
    setTimeout(() => {
      if (!stopped) {
        controller.stop();
        if (messageId) {
          editMessage(sessionId, chatId, messageId, '⚠️ Operação está demorando mais que o esperado...')
            .catch(err => console.error('Error updating timeout message:', err));
        }
      }
    }, estimatedSeconds * 3000);
    
  } catch (error) {
    console.error('Error starting animated loading:', error);
  }
  
  return controller;
}

/**
 * Wraps an async operation with animated loading messages
 * Shows continuous progress updates until operation completes
 * @param {string} sessionId - WhatsApp session ID
 * @param {string} chatId - Chat ID to send messages to
 * @param {string} operationName - Name of the operation
 * @param {Function} operation - Async function to execute
 * @param {number} estimatedSeconds - Estimated time in seconds
 * @param {number} updateIntervalMs - Interval between updates (default: 2000ms)
 * @returns {Promise<any>} Result of the operation
 */
async function withAnimatedLoading(sessionId, chatId, operationName, operation, estimatedSeconds = 10, updateIntervalMs = 2000) {
  // Start animated loading
  const controller = startAnimatedLoading(sessionId, chatId, operationName, estimatedSeconds, updateIntervalMs);
  
  try {
    // Execute the operation
    const result = await operation();
    
    // Stop animation
    controller.stop();
    
    // Send completion message
    await sendCompletionMessage(sessionId, chatId, operationName, true);
    
    return result;
  } catch (error) {
    // Stop animation
    controller.stop();
    
    // Send error completion message
    await sendCompletionMessage(sessionId, chatId, operationName, false);
    throw error;
  }
}

/**
 * Predefined loading configurations for common operations
 */
const LOADING_CONFIGS = {
  TRANSCRIPTION: {
    operation: 'Transcrevendo áudio',
    estimatedSeconds: 10,
    updateInterval: 2000
  },
  MATERIAL_SEARCH: {
    operation: 'Buscando material',
    estimatedSeconds: 3,
    updateInterval: 1000
  },
  REPORT_GENERATION: {
    operation: 'Gerando relatório',
    estimatedSeconds: 10,
    updateInterval: 2000
  },
  LIST_GENERATION: {
    operation: 'Gerando lista de materiais',
    estimatedSeconds: 8,
    updateInterval: 2000
  },
  DATABASE_QUERY: {
    operation: 'Consultando banco de dados',
    estimatedSeconds: 5,
    updateInterval: 1500
  }
};

module.exports = {
  sendLoadingMessage,
  sendProgressMessage,
  sendCompletionMessage,
  withLoadingIndicator,
  startAnimatedLoading,
  withAnimatedLoading,
  LOADING_CONFIGS,
  LOADING_FRAMES
};
