/**
 * Teste de simulação de webhook - Primeira mensagem
 */
const materialSearchService = require('./services/materialSearchService');

async function testWebhook() {
  console.log('🧪 SIMULANDO WEBHOOKS DO WHATSAPP\n');
  console.log('='.repeat(60));

  const userId = '555197756708@c.us';
  const sessionId = 'redblack';

  // Simula primeira mensagem do usuário
  console.log('\n📱 PRIMEIRA MENSAGEM DO USUÁRIO');
  console.log('-'.repeat(60));
  console.log('Mensagem recebida: "Branco liso 18mm"');
  console.log('-'.repeat(60));
  
  const result1 = await materialSearchService.processMessage(
    userId,
    sessionId,
    'Branco liso 18mm'
  );
  
  console.log('\n🤖 RESPOSTA DO BOT:');
  console.log(result1.message);
  console.log('='.repeat(60));

  // Simula segunda mensagem do mesmo usuário
  console.log('\n📱 SEGUNDA MENSAGEM DO MESMO USUÁRIO');
  console.log('-'.repeat(60));
  console.log('Mensagem recebida: "Branco liso 18mm"');
  console.log('-'.repeat(60));
  
  const result2 = await materialSearchService.processMessage(
    userId,
    sessionId,
    'Branco liso 18mm'
  );
  
  console.log('\n🤖 RESPOSTA DO BOT:');
  console.log(result2.message);
  console.log('='.repeat(60));

  // Simula primeira mensagem de outro usuário
  console.log('\n📱 PRIMEIRA MENSAGEM DE OUTRO USUÁRIO');
  console.log('-'.repeat(60));
  console.log('Mensagem recebida: "Noite Guara 18"');
  console.log('-'.repeat(60));
  
  const result3 = await materialSearchService.processMessage(
    '5511999887766@c.us',
    sessionId,
    'Noite Guara 18'
  );
  
  console.log('\n🤖 RESPOSTA DO BOT:');
  console.log(result3.message);
  console.log('='.repeat(60));

  console.log('\n✅ Simulação concluída!\n');
}

// Executa o teste
testWebhook().catch(error => {
  console.error('❌ Erro na simulação:', error);
  process.exit(1);
});
