# 🔍 DIAGNÓSTICO: Não recebe webhooks de mensagens

## ✅ O que está funcionando:
- ✅ Servidor local rodando (porta 3000)
- ✅ Endpoint de webhook respondendo
- ✅ Recebe webhooks de QR Code
- ✅ Sessão "ademir" conectada

## ❌ O que NÃO está funcionando:
- ❌ Não recebe webhooks de mensagens
- ❌ API WhatsApp retorna erro 403 em alguns endpoints

## 🔍 CAUSA DO PROBLEMA:

A API WhatsApp **não está configurada para enviar webhooks de mensagens** para este bot.

Você está recebendo webhooks de QR Code porque esses eventos são enviados por padrão, mas os eventos de **mensagens precisam ser configurados explicitamente** na API WhatsApp.

---

## 🛠️ SOLUÇÕES:

### Opção 1: Configurar via Script Automático

Execute o script de configuração:

```bash
node configure-webhook-api.js
```

### Opção 2: Configurar Manualmente na API WhatsApp

Você precisa acessar sua API WhatsApp e configurar o webhook para enviar eventos de mensagens.

#### **Informações necessárias:**

- **URL do Webhook:** `http://SEU_IP:3000/api/webhook`
  - Se a API está na mesma máquina: `http://localhost:3000/api/webhook`
  - Se está em outra máquina: `http://192.168.X.X:3000/api/webhook`
  
- **API Key:** `redblack` (enviar no header `x-api-key`)

- **Eventos a configurar:**
  - `message` - Mensagens recebidas
  - `message_create` - Mensagens criadas
  - `ready` - Sessão pronta
  - `qr` - QR Code (já funciona)

#### **Exemplo de configuração via API:**

```bash
curl -X POST http://localhost:200/webhook/set \
  -H "Content-Type: application/json" \
  -H "x-api-key: redblack" \
  -d '{
    "sessionId": "ademir",
    "webhook": "http://localhost:3000/api/webhook",
    "events": ["message", "message_create", "ready", "qr"]
  }'
```

### Opção 3: Verificar Documentação da API WhatsApp

Consulte a documentação da sua API WhatsApp para ver como configurar webhooks. Cada API pode ter um método diferente:

- Algumas usam interface web
- Outras usam endpoints REST
- Algumas salvam em arquivo de configuração

---

## 🧪 COMO TESTAR SE FUNCIONOU:

1. Envie uma mensagem para o número do WhatsApp conectado
2. Observe o terminal do servidor
3. Você deve ver algo como:

```
═══════════════════════════════════════════════════════════
📥 [WEBHOOK] Recebido em: 28/01/2026 10:20:30
📥 [WEBHOOK] Body: {
  "sessionId": "ademir",
  "event": "message",
  "data": {
    "from": "555199999999@c.us",
    "body": "Teste"
  }
}
═══════════════════════════════════════════════════════════
```

---

## 🔥 FIREWALL / REDE

Se mesmo depois de configurar o webhook não funcionar:

1. **Verifique o Firewall do Windows:**
   ```powershell
   # Permite conexões na porta 3000
   New-NetFirewallRule -DisplayName "Bot Estoque Webhook" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
   ```

2. **Se a API WhatsApp está em OUTRA máquina:**
   - Use o IP real da máquina onde o bot está rodando
   - Não use `localhost` ou `127.0.0.1`
   - Certifique-se que ambas as máquinas estão na mesma rede

3. **Verifique se a porta está aberta:**
   ```powershell
   netstat -ano | findstr ":3000"
   ```

---

## 📝 QUAL API WHATSAPP VOCÊ ESTÁ USANDO?

Para ajudar melhor, informe qual API WhatsApp você está usando:

- [ ] Evolution API
- [ ] Baileys
- [ ] WPPConnect
- [ ] Venom Bot
- [ ] Outra: _______________

Cada API tem uma forma específica de configurar webhooks!
