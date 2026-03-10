/**
 * Serviço de Webhook para eventos do WhatsApp
 * Recebe webhooks da API externa e filtra por sessionId
 */
const config = require('../config');
const audioService = require('./audioService');
const transcriptionService = require('./transcriptionService');
const materialSearchService = require('./materialSearchService');
const messageService = require('./messageService');
const multiAudioManager = require('./multiAudioManager');
const stockAlertService = require('./stockAlertService');

// Inicializa com as sessões do .env
let sessionFilters = [...config.monitoredSessions];
// Contatos já apresentados pelo bot (para mensagem de boas-vindas)
const introducedContacts = new Set();
// Cache de mensagens recém-enviadas pelo bot (para evitar processar suas próprias respostas)
const sentMessagesCache = new Map();

// Limpa cache de mensagens enviadas a cada 2 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of sentMessagesCache.entries()) {
    if (now - timestamp > 120000) { // 2 minutos
      sentMessagesCache.delete(key);
    }
  }
}, 120000);

/**
 * Define quais sessões devem ter seus eventos exibidos no console
 * @param {string|string[]} sessionIds - SessionId único ou array de sessionIds para filtrar
 */
function setSessionFilter(sessionIds) {
  if (Array.isArray(sessionIds)) {
    sessionFilters = sessionIds;
  } else if (sessionIds) {
    sessionFilters = [sessionIds];
  } else {
    sessionFilters = [];
  }
  
  console.log('\n========================================');
  console.log('🔔 FILTRO DE WEBHOOK ATUALIZADO');
  console.log('========================================');
  if (sessionFilters.length === 0) {
    console.log('📢 Exibindo eventos de TODAS as sessões');
  } else {
    console.log('📢 Exibindo eventos apenas das sessões:', sessionFilters.join(', '));
  }
  console.log('========================================\n');
}

/**
 * Obtém os filtros ativos
 * @returns {string[]} Array de sessionIds filtrados
 */
function getSessionFilters() {
  return sessionFilters;
}

/**
 * Verifica se um sessionId deve ser exibido baseado nos filtros
 * @param {string} sessionId - ID da sessão a verificar
 * @returns {boolean} True se deve exibir
 */
function shouldDisplaySession(sessionId) {
  // Se não há filtros, exibe todas as sessões
  if (sessionFilters.length === 0) return true;
  
  // Se há filtros, verifica se a sessão está na lista
  return sessionFilters.includes(sessionId);
}

/**
 * Formata e exibe o evento no console
 * @param {string} sessionId - ID da sessão
 * @param {string} eventType - Tipo do evento
 * @param {Object} data - Dados do evento
 */
function logWebhookEvent(sessionId, eventType, data) {
  if (!shouldDisplaySession(sessionId)) return;
  
  const timestamp = new Date().toLocaleString('pt-BR');
  
  console.log('\n┌─────────────────────────────────────────────────');
  console.log(`│ 🔔 WEBHOOK EVENT`);
  console.log(`│ ⏰ ${timestamp}`);
  console.log(`│ 📱 Sessão: ${sessionId}`);
  console.log(`│ 📌 Evento: ${eventType}`);
  console.log('├─────────────────────────────────────────────────');
  
  // Formata dados específicos por tipo de evento
  switch (eventType) {
    case 'message':
      // Os dados podem estar em data.message._data ou diretamente em data
      const msgData = data.message?._data || data;
      
      console.log(`│ 👤 De: ${msgData.from}`);
      console.log(`│ 💬 Mensagem: ${msgData.body || '[Mídia]'}`);
      console.log(`│ 📝 Tipo: ${msgData.type}`);
      if (msgData.hasMedia) {
        console.log(`│ 📎 Contém mídia: Sim`);
      }
      
      // Processa mensagens de texto (exceto do próprio bot)
      if (msgData.type === 'chat' && msgData.body && !msgData.id?.fromMe) {
        // Ignora mensagens do BipText
        if (msgData.from === config.bipTextNumber) {
          console.log(`│ 🚫 Ignorado: É do BipText`);
          break;
        }
        
        // Verifica se deve processar baseado no controle de grupos/contatos
        if (!shouldProcessChat(msgData.from)) {
          console.log(`│ 🚫 Ignorado: Chat não permitido nas configurações`);
          break;
        }
        
        // Se usuário enviar mensagem de texto, cancela áudios pendentes
        if (multiAudioManager.hasPendingAudios(msgData.from)) {
          multiAudioManager.cancelPending(msgData.from);
          console.log(`│ 🚫 Cancelados áudios pendentes - usuário enviou texto`);
        }
        
        // Ignora se acabamos de enviar uma mensagem com esse conteúdo para esse contato
        const cacheKey = `${sessionId}:${msgData.from}:${msgData.body}`;
        if (sentMessagesCache.has(cacheKey)) {
          console.log(`│ 🚫 Ignorado: Mensagem recém-enviada pelo bot`);
          sentMessagesCache.delete(cacheKey); // Remove do cache após ignorar
          break;
        }
        
        console.log(`│ 🔍 Processando busca de material...`);
        
        // Captura o ID da mensagem para responder
        const messageId = msgData.id?._serialized || msgData.id;

        // Processa em background para não bloquear webhook
        setTimeout(async () => {
          try {
            // Verifica se é um comando de alerta primeiro
            const messageAnalyzer = require('./messageAnalyzerService');
            const analysis = messageAnalyzer.analyzeMessage(msgData.body);
            
            if (analysis.isAlertCommand) {
              console.log(`│ 🔔 Comando de alerta detectado: ${analysis.commandType}`);
              let response;
              
              switch (analysis.commandType) {
                case 'numericResponse':
                  response = await stockAlertService.processNumericResponse(analysis.optionNumber, analysis.codigo, sessionId, msgData.from);
                  break;
                case 'confirmPurchase':
                  response = await stockAlertService.confirmPurchase(analysis.codigo, sessionId, msgData.from);
                  break;
                case 'addMaterial':
                  response = await stockAlertService.addMaterial(analysis.codigo, analysis.nome, sessionId, msgData.from);
                  break;
                case 'removeMaterial':
                  response = await stockAlertService.removeMaterial(analysis.codigo, sessionId, msgData.from);
                  break;
                case 'listAlerts':
                  response = await stockAlertService.listMonitoredMaterials(sessionId, msgData.from);
                  break;
                case 'changeMinimum':
                  response = await stockAlertService.changeMinimumQuantity(analysis.newMinimum, sessionId, msgData.from, analysis.codigo);
                  break;
                case 'helpAlerts':
                  response = stockAlertService.getHelpMessage();
                  break;
                case 'checkNow':
                  response = await stockAlertService.checkNowCommand(sessionId, msgData.from);
                  break;
                default:
                  response = { success: false, message: 'Comando não reconhecido.' };
              }
              
              if (response && response.message) {
                const alertKey = `${sessionId}:${msgData.from}:${response.message}`;
                sentMessagesCache.set(alertKey, Date.now());
                
                try {
                  if (messageId) {
                    try {
                      await messageService.replyToMessage(sessionId, msgData.from, messageId, response.message);
                    } catch (replyError) {
                      console.log(`│ ⚠️  Falha ao responder mensagem, enviando como mensagem normal`);
                      await messageService.sendTextMessage(sessionId, msgData.from, response.message);
                    }
                  } else {
                    await messageService.sendTextMessage(sessionId, msgData.from, response.message);
                  }
                  console.log(`│ ✅ Resposta de alerta enviada para ${msgData.from}`);
                } catch (sendError) {
                  console.error(`│ ❌ Erro ao enviar resposta de alerta:`, sendError.message);
                  if (sendError.response) {
                    console.error(`│    Status: ${sendError.response.status}`);
                    console.error(`│    Data:`, JSON.stringify(sendError.response.data, null, 2));
                  }
                }
              }
              return; // Não processa como busca de material
            }
            
            // Envia "digitando..."
            await messageService.sendTyping(sessionId, msgData.from);
            
            // Primeiro passo: processa a mensagem — pode retornar uma saudação
            const firstResult = await materialSearchService.processMessage(
              msgData.from,
              sessionId,
              msgData.body
            );

            // Se o resultado for uma saudação, envia-a e em seguida processa a mesma mensagem novamente
            if (firstResult && firstResult.type === 'greeting') {
              // Registra no cache antes de enviar
              const greetingKey = `${sessionId}:${msgData.from}:${firstResult.message}`;
              sentMessagesCache.set(greetingKey, Date.now());
              
              try {
                // Responde a mensagem original
                if (messageId) {
                  try {
                    await messageService.replyToMessage(sessionId, msgData.from, messageId, firstResult.message);
                  } catch (replyError) {
                    console.log(`│ ⚠️  Falha ao responder mensagem, enviando como mensagem normal`);
                    await messageService.sendTextMessage(sessionId, msgData.from, firstResult.message);
                  }
                } else {
                  await messageService.sendTextMessage(sessionId, msgData.from, firstResult.message);
                }
                console.log(`│ ✅ Saudação enviada para ${msgData.from}`);
              } catch (sendError) {
                console.error(`│ ❌ Erro ao enviar saudação:`, sendError.message);
                if (sendError.response) {
                  console.error(`│    Status: ${sendError.response.status}`);
                  console.error(`│    Data:`, JSON.stringify(sendError.response.data, null, 2));
                }
                return; // Não continua se falhar
              }

              // Aguarda um pouco e envia "digitando..." novamente
              await new Promise(resolve => setTimeout(resolve, 1000));
              await messageService.sendTyping(sessionId, msgData.from);

              // Reprocessa a mensagem para responder à consulta original
              const followUp = await materialSearchService.processMessage(
                msgData.from,
                sessionId,
                msgData.body
              );
              if (followUp && followUp.message) {
                // Registra no cache antes de enviar
                const followUpKey = `${sessionId}:${msgData.from}:${followUp.message}`;
                sentMessagesCache.set(followUpKey, Date.now());
                
                try {
                  // Responde a mensagem original
                  if (messageId) {
                    try {
                      await messageService.replyToMessage(sessionId, msgData.from, messageId, followUp.message);
                    } catch (replyError) {
                      console.log(`│ ⚠️  Falha ao responder mensagem, enviando como mensagem normal`);
                      await messageService.sendTextMessage(sessionId, msgData.from, followUp.message);
                    }
                  } else {
                    await messageService.sendTextMessage(sessionId, msgData.from, followUp.message);
                  }
                  console.log(`│ ✅ Resposta enviada para ${msgData.from}`);
                } catch (sendError) {
                  console.error(`│ ❌ Erro ao enviar resposta:`, sendError.message);
                  if (sendError.response) {
                    console.error(`│    Status: ${sendError.response.status}`);
                    console.error(`│    Data:`, JSON.stringify(sendError.response.data, null, 2));
                  }
                }
              }
            } else {
              // Resultado normal — envia a resposta
              if (firstResult && (firstResult.message || firstResult.filepath)) {
                // Verifica se é relatório ou lista de materiais
                if ((firstResult.type === 'report' || firstResult.type === 'material_list') && firstResult.filepath) {
                  // Envia arquivo (HTML para relatório, PDF para lista)
                  // Se message é null, não envia caption (resultado já está na mensagem de loading)
                  try {
                    const caption = firstResult.message || ''; // Empty caption if null
                    await messageService.sendDocument(sessionId, msgData.from, firstResult.filepath, caption);
                    const docType = firstResult.type === 'report' ? 'Relatório' : 'Lista';
                    console.log(`│ 📄 ${docType} enviado para ${msgData.from}`);
                  } catch (error) {
                    console.error(`│ ❌ Erro ao enviar documento:`, error.message);
                    if (error.response) {
                      console.error(`│    Status: ${error.response.status}`);
                      console.error(`│    Data:`, JSON.stringify(error.response.data, null, 2));
                    }
                    // Se falhar e tiver mensagem, envia como texto
                    if (firstResult.message) {
                      try {
                        await messageService.sendTextMessage(sessionId, msgData.from, firstResult.message);
                      } catch (textError) {
                        console.error(`│ ❌ Erro ao enviar texto alternativo:`, textError.message);
                      }
                    }
                  }
                } else if (firstResult.message) {
                  // Registra no cache antes de enviar
                  const messageKey = `${sessionId}:${msgData.from}:${firstResult.message}`;
                  sentMessagesCache.set(messageKey, Date.now());
                  
                  try {
                    // Responde a mensagem original
                    if (messageId) {
                      try {
                        await messageService.replyToMessage(sessionId, msgData.from, messageId, firstResult.message);
                      } catch (replyError) {
                        console.log(`│ ⚠️  Falha ao responder mensagem, enviando como mensagem normal`);
                        await messageService.sendTextMessage(sessionId, msgData.from, firstResult.message);
                      }
                    } else {
                      await messageService.sendTextMessage(sessionId, msgData.from, firstResult.message);
                    }
                    console.log(`│ ✅ Resposta enviada para ${msgData.from}`);
                  } catch (sendError) {
                    console.error(`│ ❌ Erro ao enviar resposta:`, sendError.message);
                    if (sendError.response) {
                      console.error(`│    Status: ${sendError.response.status}`);
                      console.error(`│    Data:`, JSON.stringify(sendError.response.data, null, 2));
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.error(`│ ❌ Erro ao processar mensagem:`, error.message);
            if (error.response) {
              console.error(`│    Status HTTP: ${error.response.status}`);
              console.error(`│    Status Text: ${error.response.statusText}`);
              console.error(`│    Dados da resposta:`, JSON.stringify(error.response.data, null, 2));
            }
            if (error.stack) {
              console.error(`│    Stack trace:`, error.stack);
            }
          }
        }, 500);
      }
      break;
    
    case 'unread_count':
      // Extrai info da mensagem dentro do chat
      if (data.chat && data.chat.lastMessage) {
        const msg = data.chat.lastMessage;
        const contact = data.chat.name || data.chat.id._serialized;
        console.log(`│ 👤 Contato: ${contact}`);
        console.log(`│ 💬 Mensagem: ${msg.body || '[Mídia]'}`);
        console.log(`│ 📱 De: ${msg.from}`);
        console.log(`│ 📊 Não lidas: ${data.chat.unreadCount}`);
        // Não processamos buscas a partir de 'unread_count' para evitar duplicidade
        // (o evento real de mensagem será tratado em 'message')
      }
      break;
    
    case 'media':
      // Evento de mídia (áudio, imagem, vídeo, etc)
      if (data.message && data.messageMedia) {
        const msg = data.message;
        const media = data.messageMedia;
        const contact = msg.from || 'Desconhecido';
        
        console.log(`│ 👤 De: ${contact}`);
        console.log(`│ 📎 Tipo: ${media.mimetype}`);
        console.log(`│ 📦 Tamanho: ${media.filesize} bytes`);
        
        // Se for áudio (ptt = push to talk)
        if (msg.type === 'ptt' || media.mimetype?.includes('audio')) {
          console.log(`│ 🎤 Áudio de voz`);
          console.log(`│ ⏱️  Duração: ${msg.duration}s`);
          
          // Ignora áudios do BipText (bot de transcrição)
          if (msg.from === config.bipTextNumber) {
          console.log(`│ 🚫 Ignorado: É do BipText`);
          break;
        }
        
        // Verifica se deve processar baseado no controle de grupos/contatos
        if (!shouldProcessChat(msg.from)) {
          console.log(`│ 🚫 Ignorado: Chat não permitido nas configurações`);
          break;
        }
        
        console.log(`│ 💾 Armazenando e processando...`);          // Armazena o áudio
          const messageId = msg.id._serialized || msg.id;
          audioService.storeAudio(messageId, {
            sessionId,
            from: msg.from,
            to: msg.to,
            base64: media.data,
            mimetype: media.mimetype,
            duration: msg.duration,
            filesize: media.filesize
          });
          
          // Usa o multiAudioManager para processamento inteligente
          const audioCount = multiAudioManager.addAudio(msg.from, messageId, sessionId);
          console.log(`│ 🔢 Total de áudios na fila: ${audioCount}`);
          
          // O processamento será feito automaticamente pelo multiAudioManager
          // após 5 segundos sem novos áudios
        }
      }
      break;
      
    case 'message_create':
      // Mensagem enviada (pode ter estrutura diferente)
      const msgCreateData = data.message || data;
      const toContact = msgCreateData.to || msgCreateData._data?.to || 'Desconhecido';
      const msgBody = msgCreateData.body || msgCreateData._data?.body || '[Mídia]';
      
      console.log(`│ 📤 Mensagem enviada para: ${toContact}`);
      console.log(`│ 💬 Conteúdo: ${msgBody}`);
      break;
      
    case 'qr':
      console.log(`│ 📱 QR Code gerado`);
      console.log(`│ ℹ️  Escaneie para conectar`);
      break;
      
    case 'ready':
      console.log(`│ ✅ Cliente conectado e pronto`);
      break;
      
    case 'authenticated':
      console.log(`│ 🔐 Autenticação bem-sucedida`);
      break;
      
    case 'auth_failure':
      console.log(`│ ❌ Falha na autenticação`);
      console.log(`│ 💡 Motivo: ${data.message || 'Desconhecido'}`);
      break;
      
    case 'disconnected':
      console.log(`│ 🔌 Cliente desconectado`);
      console.log(`│ 💡 Motivo: ${data.reason || 'Desconhecido'}`);
      break;
      
    case 'message_ack':
      const ackData = data.message || data;
      const ackValue = data.ack || ackData.ack || ackData._data?.ack || 0;
      const msgId = data.messageId || ackData.id?._serialized || 'Desconhecido';
      
      console.log(`│ ✓ Status da mensagem atualizado`);
      console.log(`│ 📊 ACK: ${ackValue} (${getAckDescription(ackValue)})`);
      console.log(`│ 🆔 Message ID: ${msgId.substring(0, 30)}...`);
      break;
      
    case 'group_join':
      console.log(`│ 👥 Entrou no grupo: ${data.chatId}`);
      break;
      
    case 'group_leave':
      console.log(`│ 👋 Saiu do grupo: ${data.chatId}`);
      break;
      
    default:
      console.log(`│ 📦 Dados:`, JSON.stringify(data, null, 2).split('\n').join('\n│    '));
  }
  
  console.log('└─────────────────────────────────────────────────\n');
}

/**
 * Retorna descrição do status ACK
 * @param {number} ack - Código ACK
 * @returns {string} Descrição
 */
function getAckDescription(ack) {
  const descriptions = {
    '-1': 'Erro',
    '0': 'Pendente',
    '1': 'Enviada',
    '2': 'Recebida',
    '3': 'Lida',
    '4': 'Tocada'
  };
  return descriptions[ack] || 'Desconhecido';
}

/**
 * Configura os listeners de webhook para uma sessão
 * @param {string} sessionId - ID da sessão
 * @param {Object} client - Cliente do WhatsApp Web
 */
function setupWebhookListeners(sessionId, client) {
  // Evento: Mensagem recebida
  client.on('message', (message) => {
    logWebhookEvent(sessionId, 'message', {
      from: message.from,
      to: message.to,
      body: message.body,
      type: message.type,
      hasMedia: message.hasMedia,
      timestamp: message.timestamp
    });
  });

  // Evento: Mensagem criada (enviada)
  client.on('message_create', (message) => {
    if (message.fromMe) {
      logWebhookEvent(sessionId, 'message_create', {
        to: message.to,
        body: message.body,
        type: message.type,
        timestamp: message.timestamp
      });
    }
  });

  // Evento: QR Code
  client.on('qr', (qr) => {
    logWebhookEvent(sessionId, 'qr', { qr });
  });

  // Evento: Cliente pronto
  client.on('ready', () => {
    logWebhookEvent(sessionId, 'ready', {});
  });

  // Evento: Autenticado
  client.on('authenticated', () => {
    logWebhookEvent(sessionId, 'authenticated', {});
  });

  // Evento: Falha na autenticação
  client.on('auth_failure', (message) => {
    logWebhookEvent(sessionId, 'auth_failure', { message });
  });

  // Evento: Desconectado
  client.on('disconnected', (reason) => {
    logWebhookEvent(sessionId, 'disconnected', { reason });
  });

  // Evento: ACK de mensagem
  client.on('message_ack', (message, ack) => {
    logWebhookEvent(sessionId, 'message_ack', {
      messageId: message.id._serialized,
      ack: ack
    });
  });

  // Evento: Entrou em um grupo
  client.on('group_join', (notification) => {
    logWebhookEvent(sessionId, 'group_join', {
      chatId: notification.chatId,
      who: notification.id.participant
    });
  });

  // Evento: Saiu de um grupo
  client.on('group_leave', (notification) => {
    logWebhookEvent(sessionId, 'group_leave', {
      chatId: notification.chatId,
      who: notification.id.participant
    });
  });

  console.log(`✅ Webhook listeners configurados para sessão: ${sessionId}`);
}

/**
 * Verifica se deve processar mensagens de um chat específico
 * @param {string} chatId - ID do chat (pode ser grupo ou contato privado)
 * @returns {boolean}
 */
function shouldProcessChat(chatId) {
  // Identifica se é grupo (@g.us) ou contato privado (@c.us)
  const isGroup = chatId.endsWith('@g.us') || chatId.includes('-');
  
  if (isGroup) {
    // Para grupos: verifica lista de grupos permitidos
    if (config.allowedGroups === null) {
      return true; // Todos os grupos permitidos
    }
    return config.allowedGroups.includes(chatId);
  } else {
    // Para contatos privados: verifica configuração
    return true; // FORÇADO: sempre permite chats privados
    // return config.allowPrivateChats;
  }
}

/**
 * Processa webhook recebido da API externa
 * @param {string} sessionId - ID da sessão
 * @param {string} eventType - Tipo do evento
 * @param {Object} data - Dados do evento
 */
function processWebhook(sessionId, eventType, data) {
  logWebhookEvent(sessionId, eventType, data);
}

module.exports = {
  setSessionFilter,
  getSessionFilters,
  setupWebhookListeners,
  processWebhook,
  logWebhookEvent,
  shouldProcessChat
};
