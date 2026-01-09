/**
 * Script para enviar alertas manualmente
 * Execute: node send-alerts-now.js
 */

const stockAlertService = require('./services/stockAlertService');

async function sendAlertsNow() {
  console.log('📢 ENVIANDO ALERTAS DE ESTOQUE MANUALMENTE\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    await stockAlertService.initialize();
    console.log('✅ Serviço inicializado\n');
    
    console.log('🔍 Verificando estoque e enviando alertas...\n');
    await stockAlertService.checkAndAlert();
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Processo concluído!\n');
    
  } catch (error) {
    console.error('❌ Erro ao enviar alertas:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
  
  process.exit(0);
}

sendAlertsNow();
