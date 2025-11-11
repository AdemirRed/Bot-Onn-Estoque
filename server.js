const app = require('./app');
const config = require('./config');
const whatsappApiService = require('./services/whatsappApiService');
const userStateService = require('./services/userStateService');

const PORT = config.port;

app.listen(PORT, async () => {
  console.log('🚀 Servidor rodando na porta ' + PORT);
  console.log('🏥 Health Check: http://localhost:' + PORT + '/health');
  console.log('\n📡 WEBHOOK URL (configure na sua API WhatsApp):');
  console.log('   🔗 http://localhost:' + PORT + '/api/webhook');
  console.log('   🔑 Header: x-api-key: ' + config.apiKey);
  console.log('\n📡 OUTROS ENDPOINTS:');
  console.log('   POST   /api/webhook/filter   - Configurar filtro de sessões');
  console.log('   GET    /api/webhook/filter   - Ver filtros ativos');
  console.log('   DELETE /api/webhook/filter   - Limpar filtros');
  
  // Carrega estado dos usuários
  await userStateService.load();
  
  // Consulta sessões ativas na API WhatsApp
  await whatsappApiService.displayActiveSessions();
  
  console.log('🔍 SESSÕES MONITORADAS (filtro do .env):');
  if (config.monitoredSessions.length > 0) {
    config.monitoredSessions.forEach(session => {
      console.log('   ✓ ' + session);
    });
  } else {
    console.log('   📢 Todas as sessões (nenhum filtro ativo)');
  }
  console.log('\n💡 Aguardando webhooks da API WhatsApp...\n');
});
