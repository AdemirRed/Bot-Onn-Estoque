require('dotenv').config();

/**
 * Configurações centralizadas da aplicação
 * Carrega variáveis de ambiente e define valores padrão
 */
module.exports = {
  // Configurações do servidor
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Segurança
  apiKey: process.env.API_KEY || 'sua_chave_aqui_mudeme',
  
  // API WhatsApp externa
  whatsappApiUrl: process.env.WHATSAPP_API_URL || 'http://localhost:3000',
  
  // Sessões para monitorar
  monitoredSessions: process.env.MONITORED_SESSIONS 
    ? process.env.MONITORED_SESSIONS.split(',').map(s => s.trim())
    : [],
  
  // BipText
  bipTextNumber: process.env.BIPTEXT_NUMBER || '553172280540@c.us',
  transcriptionTimeout: parseInt(process.env.TRANSCRIPTION_TIMEOUT) || 120000,
  
  // Controle de grupos e contatos
  allowedGroups: process.env.ALLOWED_GROUPS 
    ? process.env.ALLOWED_GROUPS.split(',').map(s => s.trim()).filter(s => s.length > 0)
    : null, // null = todos os grupos permitidos
  allowPrivateChats: process.env.ALLOW_PRIVATE_CHATS === 'true',
  
  // Diretórios do banco de dados
  databasePath: process.env.DATABASE_PATH || 'C:\\Users\\RedBlack-PC\\Desktop\\CC_DATA_BASE',
  materialsFolder: process.env.MATERIALS_FOLDER || 'MAT',
  chapasFolder: process.env.CHAPAS_FOLDER || 'CHP'
};
