const messageAnalyzerService = require('./services/messageAnalyzerService');

// Testa análise de mensagens
console.log('🧪 Testando análise de mensagens...\n');

const testMessages = [
  'relatorio 18',
  'relatorio Branco liso',
  'relatorio',
  'lista 18',
  'lista'
];

testMessages.forEach(msg => {
  console.log(`📝 Mensagem: "${msg}"`);
  const analysis = messageAnalyzerService.analyzeMessage(msg);
  console.log(`📊 Análise:`, analysis);
  console.log('');
});