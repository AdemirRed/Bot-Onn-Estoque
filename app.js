const express = require('express');
const cors = require('cors');
const webhookRoutes = require('./routes/webhook');

const app = express();

// Middlewares globais
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
