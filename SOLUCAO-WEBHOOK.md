# 🔧 SOLUÇÃO: Configurar Webhook na API WhatsApp

## ✅ DIAGNÓSTICO COMPLETO

Seu bot está **100% funcional** e pronto para receber webhooks. O problema é que **a API WhatsApp não está configurada para ENVIAR os webhooks de mensagens** para o seu bot.

---

## 📍 ONDE ESTÁ SUA API WHATSAPP?

A API está rodando em: **http://localhost:200**

Você precisa encontrar os arquivos de configuração dela, provavelmente em algum destes locais:
- `C:\whatsapp-api\`
- `C:\api-whatsapp\`
- `C:\Users\SCM\Documents\whatsapp-api\`
- Ou onde você instalou a API

---

## 🔍 PASSO 1: Encontrar o diretório da API WhatsApp

Execute este comando para encontrar onde está rodando:

```powershell
Get-Process -Name "node" | Select-Object Id, Path, StartTime | Format-Table -AutoSize
```

Ou procure por arquivos `.env` relacionados à API:

```powershell
Get-ChildItem -Path C:\ -Filter ".env" -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.DirectoryName -like "*whatsapp*" -or $_.DirectoryName -like "*api*" }
```

---

## 🔧 PASSO 2: Configurar o Webhook

Quando encontrar o diretório da API WhatsApp, procure por um arquivo **`.env`** ou **`config.js`**.

### Opção A: Arquivo .env

Abra o arquivo `.env` e adicione ou modifique estas linhas:

```bash
# URL do webhook para enviar eventos
WEBHOOK_URL=http://20.20.20.21:3000/api/webhook
WEBHOOK_ENABLED=true

# Ou pode ser:
# CALLBACK_URL=http://20.20.20.21:3000/api/webhook
# BASE_WEBHOOK_URL=http://20.20.20.21:3000/api/webhook
```

### Opção B: Arquivo config.js ou config.json

Se for um arquivo JavaScript:

```javascript
module.exports = {
  // ... outras configurações
  webhook: {
    url: 'http://20.20.20.21:3000/api/webhook',
    enabled: true,
    events: ['message', 'message_create', 'qr', 'ready']
  }
}
```

Se for JSON:

```json
{
  "webhook": {
    "url": "http://20.20.20.21:3000/api/webhook",
    "enabled": true,
    "events": ["message", "message_create", "qr", "ready"]
  }
}
```

---

## 🔄 PASSO 3: Reiniciar a API WhatsApp

Após configurar, **reinicie a API WhatsApp** para aplicar as mudanças:

```powershell
# Encontre o processo da API (porta 200)
$apiProcess = Get-NetTCPConnection -LocalPort 200 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
Stop-Process -Id $apiProcess -Force

# Depois inicie novamente (depende de como você a inicia)
```

---

## 🧪 PASSO 4: Testar

1. Certifique-se que seu bot está rodando:
   ```powershell
   cd "c:\Users\SCM\Downloads\Bot-Onn-Estoque"
   node server.js
   ```

2. Envie uma mensagem para o WhatsApp conectado

3. Observe o terminal do bot - deve aparecer:
   ```
   ═══════════════════════════════════════════════════════════
   📥 [WEBHOOK] Recebido em: 28/01/2026, 10:30:00
   📥 [WEBHOOK] Body: {
     "sessionId": "ademir",
     "dataType": "message",
     "data": {
       "from": "555199999999@c.us",
       "body": "Teste"
     }
   }
   ═══════════════════════════════════════════════════════════
   ```

---

## 🔍 SE NÃO ENCONTRAR O ARQUIVO DE CONFIGURAÇÃO

### Opção 1: Pergunte onde está a API

Me diga: **onde você instalou/baixou a API WhatsApp?** Posso ajudar a procurar.

### Opção 2: Verificar processos Node.js

```powershell
Get-WmiObject Win32_Process -Filter "name = 'node.exe'" | Select-Object ProcessId, CommandLine | Format-List
```

Isso mostrará todos os processos Node.js e seus diretórios de trabalho.

### Opção 3: API pode estar dockerizada

Se a API está em Docker, você precisa configurar as variáveis de ambiente do container:

```bash
docker ps  # Ver containers rodando
docker inspect <container_id>  # Ver configuração
```

---

## 📌 INFORMAÇÕES IMPORTANTES

### URLs que devem ser configuradas:

- **Se API e Bot estão na MESMA máquina:**
  ```
  http://localhost:3000/api/webhook
  ```

- **Se estão em máquinas DIFERENTES (recomendado):**
  ```
  http://20.20.20.21:3000/api/webhook
  ```

### Header necessário:
```
x-api-key: redblack
```

### Eventos para ativar:
- `message` - Mensagens recebidas
- `message_create` - Mensagens criadas (incluindo próprias)
- `qr` - QR Code (já funciona)
- `ready` - Sessão pronta (já funciona)
- `authenticated` - Autenticação (já funciona)

---

## ⚡ ALTERNATIVA: Usar proxy reverso

Se não conseguir configurar na API, posso criar um proxy que intercepte as mensagens:

1. A API continua enviando para `/webhook/local`
2. Criamos um servidor que escuta e repassa para seu bot
3. Solução temporária mas funcional

Me avise se quer essa alternativa!

---

## 📞 PRÓXIMOS PASSOS

1. **Encontre onde está a API WhatsApp**
2. **Localize o arquivo de configuração (.env ou config.js)**
3. **Adicione a URL do webhook**
4. **Reinicie a API**
5. **Teste enviando uma mensagem**

**Me diga onde está a API ou qual o caminho completo dela, e posso ajudar a configurar!**
