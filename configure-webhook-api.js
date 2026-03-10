/**
 * Script para configurar webhook na API WhatsApp
 * Configura a API para enviar eventos de mensagens para este bot
 */

const axios = require('axios');
const config = require('./config');
const os = require('os');

// Pega o IP local da máquina
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

async function configureWebhook() {
  console.log('🔧 Configurando webhook na API WhatsApp...\n');
  
  const localIP = getLocalIP();
  const webhookUrl = `http://${localIP}:${config.port}/api/webhook`;
  
  console.log('📋 Informações:');
  console.log(`   IP Local: ${localIP}`);
  console.log(`   URL Webhook: ${webhookUrl}`);
  console.log(`   API WhatsApp: ${config.whatsappApiUrl}`);
  console.log(`   Sessões: ${config.monitoredSessions.join(', ')}\n`);
  
  // Tenta diferentes endpoints comuns de configuração de webhook
  const endpoints = [
    '/webhook/set',
    '/webhook',
    '/session/webhook',
    '/config/webhook'
  ];
  
  for (const session of config.monitoredSessions) {
    console.log(`\n🔄 Configurando webhook para sessão: ${session}`);
    
    let configured = false;
    
    for (const endpoint of endpoints) {
      try {
        const url = `${config.whatsappApiUrl}${endpoint}`;
        console.log(`   Tentando: ${url}`);
        
        // Tenta diferentes formatos de requisição
        const configs = [
          {
            sessionId: session,
            webhook: webhookUrl,
            webhookUrl: webhookUrl,
            events: ['message', 'message_create', 'ready', 'authenticated', 'auth_failure', 'disconnected']
          },
          {
            session: session,
            webhook: webhookUrl,
            enabled: true
          },
          {
            sessionId: session,
            config: {
              webhook: webhookUrl,
              webhookEvents: ['message', 'message_create']
            }
          }
        ];
        
        for (const configData of configs) {
          try {
            const response = await axios.post(url, configData, {
              timeout: 5000,
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey
              }
            });
            
            console.log(`   ✅ Configurado com sucesso!`);
            console.log(`   Resposta:`, response.data);
            configured = true;
            break;
          } catch (err) {
            // Continua tentando outros formatos
            continue;
          }
        }
        
        if (configured) break;
        
      } catch (error) {
        // Continua tentando outros endpoints
        continue;
      }
    }
    
    if (!configured) {
      console.log(`   ⚠️  Não foi possível configurar automaticamente`);
    }
  }
  
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('📌 CONFIGURAÇÃO MANUAL (se necessário)');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('\nAcesse a interface da sua API WhatsApp e configure:');
  console.log(`\n   Webhook URL: ${webhookUrl}`);
  console.log(`   API Key Header: x-api-key: ${config.apiKey}`);
  console.log('   Eventos: message, message_create, ready, qr');
  console.log('\nOu via curl/Postman, faça um POST para:');
  console.log(`\n   ${config.whatsappApiUrl}/webhook/set`);
  console.log('\nCom o body:');
  console.log(JSON.stringify({
    sessionId: config.monitoredSessions[0],
    webhook: webhookUrl,
    events: ['message', 'message_create', 'ready']
  }, null, 2));
  console.log('\nE header:');
  console.log(`   x-api-key: ${config.apiKey}`);
  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

// Executar
configureWebhook().catch(error => {
  console.error('❌ Erro:', error.message);
  process.exit(1);
});
