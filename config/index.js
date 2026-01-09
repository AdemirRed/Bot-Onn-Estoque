require('dotenv').config();

/**
 * Configurações centralizadas da aplicação
 * Carrega variáveis de ambiente e define valores padrão
 */
module.exports = {
  // Configurações do servidor
  port: process.env.PORT || 200,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Segurança
  apiKey: process.env.API_KEY || 'redblack',
  
  // API WhatsApp externa
  whatsappApiUrl: process.env.WHATSAPP_API_URL || 'http://192.168.0.201:200/',
  
  // Sessões para monitorar
  monitoredSessions: process.env.MONITORED_SESSIONS 
    ? process.env.MONITORED_SESSIONS.split(',').map(s => s.trim())
    : ['ademir'],
  
  // BipText
  bipTextNumber: process.env.BIPTEXT_NUMBER || '553172280540@c.us',
  transcriptionTimeout: parseInt(process.env.TRANSCRIPTION_TIMEOUT) || 120000,
  
  // Controle de grupos e contatos
  allowedGroups: process.env.ALLOWED_GROUPS 
    ? process.env.ALLOWED_GROUPS.split(',').map(s => s.trim()).filter(s => s.length > 0)
    : null, // null = todos os grupos permitidos
  allowPrivateChats: process.env.ALLOW_PRIVATE_CHATS === 'true',
  
  // Diretórios do banco de dados
  databasePath: process.env.DATABASE_PATH || 'C:\\CC_DATA_BASE',
  materialsFolder: process.env.MATERIALS_FOLDER || 'MAT',
  chapasFolder: process.env.CHAPAS_FOLDER || 'CHP',
  
  // Sistema de alertas de estoque mínimo
  minStockQuantity: parseInt(process.env.QTD_MIN_CHP) || 15,
  alertRecipients: process.env.ALERT_RECIPIENTS 
    ? process.env.ALERT_RECIPIENTS.split(',').map(s => s.trim())
    : ['555131026660@c.us', '555199326748@c.us', '555197756708@c.us'],
  alertSessionId: process.env.ALERT_SESSION || 'ademir',
  alertSchedule: process.env.ALERT_SCHEDULE || '0 8 * * *' // 8h da manhã todos os dias
};
