/**
 * Descobre endpoints e documentação da API WhatsApp
 */

const axios = require('axios');
const config = require('./config');

async function discoverAPI() {
  console.log('🔍 Descobrindo endpoints da API WhatsApp...\n');
  console.log(`API Base: ${config.whatsappApiUrl}\n`);
  
  // Endpoints comuns para testar
  const endpoints = [
    '/',
    '/docs',
    '/swagger',
    '/api-docs',
    '/health',
    '/status',
    '/session/list',
    '/session/status/all',
    '/webhook',
    '/webhook/list',
    '/webhook/get',
    '/instance/webhook',
    '/instance/settings',
    '/settings',
    '/config'
  ];
  
  const discovered = [];
  
  for (const endpoint of endpoints) {
    try {
      const url = `${config.whatsappApiUrl}${endpoint}`;
      const response = await axios.get(url, {
        timeout: 3000,
        validateStatus: () => true, // Aceita qualquer status
        headers: {
          'x-api-key': config.apiKey
        }
      });
      
      if (response.status < 500) {
        console.log(`✅ ${endpoint.padEnd(30)} - Status ${response.status}`);
        discovered.push({
          endpoint,
          status: response.status,
          data: response.data
        });
      }
    } catch (error) {
      // Ignora erros
    }
  }
  
  console.log('\n\n📋 ENDPOINTS DESCOBERTOS:\n');
  discovered.forEach(item => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Endpoint: ${item.endpoint}`);
    console.log(`Status: ${item.status}`);
    console.log('Resposta:', JSON.stringify(item.data, null, 2).substring(0, 500));
  });
  
  // Testa endpoints POST para webhook
  console.log('\n\n🔄 Testando configuração de webhook (POST)...\n');
  
  const webhookEndpoints = [
    '/webhook',
    '/webhook/set',
    '/session/webhook',
    '/instance/webhook',
    '/instance/ademir/webhook',
    '/session/ademir/webhook'
  ];
  
  for (const endpoint of webhookEndpoints) {
    try {
      const url = `${config.whatsappApiUrl}${endpoint}`;
      const testData = {
        webhook: 'http://20.20.20.21:3000/api/webhook',
        webhookUrl: 'http://20.20.20.21:3000/api/webhook',
        enabled: true,
        events: ['message', 'message_create']
      };
      
      console.log(`Testando POST: ${endpoint}`);
      const response = await axios.post(url, testData, {
        timeout: 3000,
        validateStatus: () => true,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey
        }
      });
      
      if (response.status < 500) {
        console.log(`   ✅ Status ${response.status}`);
        console.log(`   Resposta:`, JSON.stringify(response.data, null, 2));
      }
    } catch (error) {
      console.log(`   ❌ ${error.message}`);
    }
  }
}

discoverAPI().catch(console.error);
