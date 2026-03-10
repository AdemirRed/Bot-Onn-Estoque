const express = require('express');
const cors = require('cors');
const webhookRoutes = require('./routes/webhook');

const app = express();

// Middlewares globais
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Banner inicial
console.log('\n╔════════════════════════════════════════════════╗');
console.log('║     Bot Onn Estoque - Webhook WhatsApp        ║');
console.log('╚════════════════════════════════════════════════╝\n');

// Rota de health check
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API está online',
    timestamp: new Date().toISOString()
  });
});

// Rota de teste de webhook (POST)
app.post('/api/webhook/test', (req, res) => {
  console.log('\n🧪 [TESTE] Webhook de teste recebido!');
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  res.json({ 
    success: true, 
    message: 'Webhook de teste recebido com sucesso!',
    receivedData: req.body,
    timestamp: new Date().toISOString()
  });
});

// Rotas do webhook
app.use('/api', webhookRoutes);

// Rota 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint não encontrado'
  });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor'
  });
});

module.exports = app;