# Bot Onn Estoque - Sistema de Webhook WhatsApp

Sistema para receber e exibir webhooks do WhatsApp no console, com filtro de sessões.

## 🚀 Instalação

```powershell
npm install
```

## ⚙️ Configuração

1. Copie o arquivo `.env.example` para `.env`:
```powershell
Copy-Item .env.example .env
```

2. Configure sua API Key no arquivo `.env`

## 📡 Como Usar

### 1. Iniciar o servidor

```powershell
npm start
```

Ou em modo desenvolvimento:
```powershell
npm run dev
```

### 2. Configurar filtro de sessões

**Filtrar uma sessão específica:**
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/webhook/filter" -Method POST -Headers @{"x-api-key"="sua_chave_aqui"; "Content-Type"="application/json"} -Body '{"sessionIds":"sessao1"}'
```

**Filtrar múltiplas sessões:**
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/webhook/filter" -Method POST -Headers @{"x-api-key"="sua_chave_aqui"; "Content-Type"="application/json"} -Body '{"sessionIds":["sessao1","sessao2","sessao3"]}'
```

**Exibir todas as sessões (remover filtro):**
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/webhook/filter" -Method DELETE -Headers @{"x-api-key"="sua_chave_aqui"}
```

**Ver filtros ativos:**
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/webhook/filter" -Method GET -Headers @{"x-api-key"="sua_chave_aqui"}
```

## 📋 Eventos Capturados

O sistema captura e exibe os seguintes eventos do WhatsApp:

- 📥 **message** - Mensagens recebidas
- 📤 **message_create** - Mensagens enviadas
- 📱 **qr** - QR Code gerado
- ✅ **ready** - Cliente conectado
- 🔐 **authenticated** - Autenticação bem-sucedida
- ❌ **auth_failure** - Falha na autenticação
- 🔌 **disconnected** - Cliente desconectado
- ✓ **message_ack** - Status de entrega da mensagem
- 👥 **group_join** - Entrada em grupo
- 👋 **group_leave** - Saída de grupo

## 🔍 Sistema de Busca de Materiais

O bot inclui um **sistema inteligente de busca de materiais** do Corte Certo:

### Recursos
- 🎨 Busca por nome parcial (ex: "Branco" encontra todos os brancos)
- 📏 Espessura opcional (pergunta automaticamente se necessário)
- 💬 Conversação com contexto (lembra seleções por 10 minutos)
- 📦 Exibe chapas inteiras e retalhos
- 🌾 Informações de veio (horizontal/vertical)
- 💰 Preços e dimensões

### Exemplos de Uso
```
Usuário: Branco Liso 18mm
Bot: ✅ BRANCO LISO 18mm
     📦 CHAPAS INTEIRAS (5)
     ♻️ RETALHOS (12)
     ...
```

```
Usuário: Noite Guara
Bot: 📏 Qual espessura?
     Espessuras disponíveis: 6mm, 18mm
     
Usuário: 18
Bot: [Exibe detalhes completos]
```

📖 **Documentação completa**: [README-MATERIAIS.md](README-MATERIAIS.md)

## 🎤 Transcrição de Áudio

Sistema automático de transcrição de áudios via BipText:

1. Usuário envia áudio de voz
2. Bot responde: "Transcrevendo áudio..."
3. Envia áudio para BipText (553172280540@c.us)
4. Bot responde com a transcrição completa

### Filtros
- ❌ Não processa áudios do BipText
- ❌ Não processa mensagens do próprio bot
- ✅ Apenas sessões configuradas no .env

## 🔗 Integração com API WhatsApp Existente

Para integrar com sua API WhatsApp existente, adicione no código de inicialização da sessão:

```javascript
const webhookService = require('./services/webhookService');

// Ao criar uma sessão
webhookService.setupWebhookListeners(sessionId, client);
```

## 📝 Exemplo de Saída no Console

```
┌─────────────────────────────────────────────────
│ 🔔 WEBHOOK EVENT
│ ⏰ 11/11/2025, 10:30:45
│ 📱 Sessão: sessao1
│ 📌 Evento: message
├─────────────────────────────────────────────────
│ 👤 De: 555197756708@c.us
│ 💬 Mensagem: Olá, tudo bem?
│ 📝 Tipo: chat
└─────────────────────────────────────────────────
```

## 🛠️ Estrutura do Projeto

```
Bot Onn Estoque/
├── app.js                          # Configuração do Express
├── server.js                       # Inicialização do servidor
├── config/
│   └── index.js                   # Configurações centralizadas
├── controllers/
│   ├── webhookController.js       # Controller do webhook
│   ├── audioController.js         # Controller de áudios
│   └── sessionController.js       # Controller de sessões
├── middlewares/
│   └── index.js                   # Middleware de autenticação
├── routes/
│   └── webhook.js                 # Rotas do webhook
├── services/
│   ├── webhookService.js          # Lógica do webhook
│   ├── audioService.js            # Armazenamento de áudios
│   ├── transcriptionService.js    # Transcrição via BipText
│   ├── messageService.js          # Envio de mensagens
│   ├── corteCertoService.js       # Leitura arquivos Corte Certo
│   ├── messageAnalyzerService.js  # Análise de mensagens (NLP)
│   └── materialSearchService.js   # Busca inteligente de materiais
├── utils/
│   └── responses.js               # Funções de resposta padronizadas
└── CC_DATA_BASE/                  # Base de dados Corte Certo
    └── CC_DATA_BASE/
        ├── MAT/                   # Materiais (.INI)
        └── CHP/                   # Chapas e Retalhos (.TAB)
```
