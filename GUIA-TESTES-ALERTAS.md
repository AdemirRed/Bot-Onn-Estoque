# 📖 Guia de Testes - Sistema de Alertas de Estoque

## 🧪 Como Testar os Comandos

### 1️⃣ Testar Comandos via WhatsApp

Envie mensagens pelo WhatsApp para o bot (sessão **ademir**):

#### Comando: Listar Materiais Monitorados
```
listar alertas
```
**O que faz:** Mostra todos os materiais sendo monitorados, estoque atual e status

**Resposta esperada:**
```
📋 MATERIAIS MONITORADOS

⚙️ Quantidade mínima: 15 chapas

🟢 Branco Liso 18mm
• Código: 6
• Quantidade: 25 chapas
• Status: ✅ Ativo
• 🔄 Auto-add: 33 chapas

🟡 Branco Liso 6mm
• Código: 24
• Quantidade: 15 chapas
• Status: ✅ Ativo

━━━━━━━━━━━━━━━━━━━━
Total: 2 materiais
```

---

#### Comando: Ajuda
```
ajuda alertas
```
**O que faz:** Exibe manual completo com todos os comandos disponíveis

---

#### Comando: Confirmar Compra
```
compra 6
```
**O que faz:** Confirma que a compra do material foi realizada e pausa alertas

**Resposta esperada:**
```
✅ Compra confirmada!

📦 Material: Branco Liso 18mm
🔢 Código: 6
📅 Data: 08/01/2026, 14:30:00

🔄 Estoque atualizado automaticamente!
• Adicionadas 33 chapas
• Em 7 linhas

Os alertas foram pausados para este material até que o estoque volte ao normal.
```

---

#### Comando: Adicionar Material
```
adicionar 50 Cinza 18mm
```
**O que faz:** Adiciona novo material ao monitoramento

**Resposta esperada:**
```
✅ Material adicionado ao monitoramento!

📦 Nome: Cinza Preto 18mm
🔢 Código: 50
⚙️ Status: Ativo
📊 Mínimo: 15 chapas

O material será verificado diariamente.
```

---

#### Comando: Remover Material
```
remover 50
```
**O que faz:** Remove material do monitoramento

**Resposta esperada:**
```
✅ Material removido do monitoramento!

📦 Material: Cinza Preto 18mm
🔢 Código: 50

Os alertas para este material foram desativados.
```

---

#### Comando: Alterar Quantidade Mínima
```
minimo 20
```
**O que faz:** Altera temporariamente a quantidade mínima de chapas

**Resposta esperada:**
```
✅ Quantidade mínima alterada!

📊 Anterior: 15 chapas
📊 Nova: 20 chapas

⚠️ Atenção: Esta alteração é temporária.
Para torná-la permanente, atualize a variável QTD_MIN_CHP no arquivo .env e reinicie o servidor.
```

---

## 🔍 Como Verificar o Sistema

### Opção 1: Verificar Sem Enviar (Teste)

Execute o script de teste que verifica tudo mas NÃO envia mensagens:

```powershell
node test-alerts.js
```

**O que ele faz:**
- ✅ Carrega materiais monitorados
- ✅ Verifica estoque atual de cada material
- ✅ Mostra quais alertas seriam enviados
- ❌ NÃO envia mensagens reais

**Exemplo de saída:**
```
🧪 TESTE DO SISTEMA DE ALERTAS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ Carregando materiais monitorados...
✅ 2 materiais carregados

2️⃣ Materiais configurados:
   • Código 6: Branco Liso 18mm ✅
     └─ Auto-add: 33 chapas em 7 linhas
   • Código 24: Branco Liso 6mm ✅

3️⃣ Verificando estoque atual:
   🟢 OK Branco Liso 18mm (6): 25 chapas
   🟡 MÍNIMO Branco Liso 6mm (24): 15 chapas

4️⃣ Verificando alertas pendentes...
   ⚠️ Branco Liso 6mm: Precisa enviar alerta

5️⃣ Enviar alertas agora?
   ⚠️ ATENÇÃO: Isso enviará mensagens reais via WhatsApp!

   Para enviar, execute:
   node -e "require('./services/stockAlertService').checkAndAlert()"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Teste concluído com sucesso!
```

---

### Opção 2: Enviar Alertas Manualmente

Para enviar alertas REAIS via WhatsApp AGORA (sem esperar 8h):

```powershell
node send-alerts-now.js
```

**⚠️ ATENÇÃO:** Este comando envia mensagens reais!

**O que ele faz:**
- ✅ Verifica estoque de todos os materiais monitorados
- ✅ Envia alertas para os 3 números configurados via sessão ademir
- ✅ Atualiza estado (última data de alerta enviado)

---

### Opção 3: Habilitar Teste no Startup

Descomente as linhas no arquivo `server.js` para testar ao iniciar:

```javascript
// TESTE MANUAL: Descomentar para testar alertas imediatamente ao iniciar
console.log('\n🧪 MODO TESTE: Executando verificação de alertas...');
await stockAlertService.checkAndAlert();
```

Depois reinicie o servidor:
```powershell
node server.js
```

---

## 📊 Como Ver os Logs

### Logs do Servidor

Quando o servidor está rodando, você vê:

**Ao iniciar:**
```
🔔 Inicializando serviço de alertas de estoque...
✅ Carregados 2 materiais monitorados
✅ Carregados 0 estados de alerta
✅ Serviço de alertas inicializado
🔔 Alertas de estoque agendados: 0 8 * * *
```

**Quando recebe comando:**
```
│ 🔔 Comando de alerta detectado: listAlerts
│ ✅ Resposta de alerta enviada para 555197756708@c.us
```

**Verificação agendada (8h da manhã):**
```
⏰ Iniciando verificação agendada de estoque mínimo...

🔍 Iniciando verificação de estoque mínimo...
✅ Carregados 2 materiais monitorados
✅ Carregados 1 estados de alerta
📢 Enviando 1 alertas...
✅ Alerta enviado para 555131026660@c.us
✅ Alerta enviado para 555199326748@c.us
✅ Alerta enviado para 555197756708@c.us
✅ Estado de alertas salvo
```

---

## 📂 Arquivos de Dados

### Verificar Materiais Monitorados

Abrir: `data/monitored-materials.json`

```json
{
  "materials": [
    {
      "codigo": "6",
      "nome": "Branco Liso 18mm",
      "enabled": true,
      "autoAddOnPurchase": true,
      "autoAddQuantity": 33,
      "autoAddLines": 7,
      "notes": "Vem em pallet, adiciona 33 chapas em 7 linhas automaticamente"
    },
    {
      "codigo": "24",
      "nome": "Branco Liso 6mm",
      "enabled": true,
      "autoAddOnPurchase": false,
      "autoAddQuantity": 0,
      "autoAddLines": 0,
      "notes": "Adicionar quantidade manualmente após compra"
    }
  ]
}
```

**Como editar:**
- Adicionar/remover materiais diretamente
- Alterar configurações de auto-add
- Desabilitar material: `"enabled": false`

---

### Verificar Estado dos Alertas

Abrir: `data/alert-state.json`

```json
{
  "alerts": [
    {
      "codigo": "24",
      "lastAlertDate": "2026-01-08",
      "currentQuantity": 12,
      "purchaseConfirmed": false,
      "purchaseConfirmedDate": null
    }
  ]
}
```

**O que significa:**
- `lastAlertDate`: Última vez que alerta foi enviado
- `currentQuantity`: Última quantidade verificada
- `purchaseConfirmed`: Se compra foi confirmada (true = não envia mais alertas)
- `purchaseConfirmedDate`: Quando a compra foi confirmada

**Como resetar:**
- Apagar o arquivo ou remover entradas específicas
- O sistema recria automaticamente

---

## ⏰ Verificar Agendamento

O cron executa no horário configurado em `config/index.js`:

```javascript
alertSchedule: '0 8 * * *'  // 8h da manhã todos os dias
```

**Formato cron:**
```
┌─── minuto (0-59)
│ ┌─── hora (0-23)
│ │ ┌─── dia do mês (1-31)
│ │ │ ┌─── mês (1-12)
│ │ │ │ ┌─── dia da semana (0-6, 0=domingo)
│ │ │ │ │
0 8 * * *
```

**Exemplos:**
- `0 8 * * *` - Todos os dias às 8h
- `0 8,17 * * *` - Todos os dias às 8h e 17h
- `0 8 * * 1-5` - Segunda a sexta às 8h
- `*/30 * * * *` - A cada 30 minutos

---

## 🎯 Checklist de Validação

- [ ] Servidor iniciado com sucesso
- [ ] Materiais monitorados carregados (2 materiais)
- [ ] Cron agendado aparece no log: `🔔 Alertas de estoque agendados: 0 8 * * *`
- [ ] Comando `listar alertas` funciona via WhatsApp
- [ ] Comando `ajuda alertas` funciona via WhatsApp
- [ ] Script `node test-alerts.js` executa sem erros
- [ ] Arquivo `data/monitored-materials.json` existe e está válido
- [ ] Arquivo `data/alert-state.json` existe

---

## 🆘 Problemas Comuns

### "Material não encontrado no sistema"
**Causa:** Código do material não existe nos arquivos do Corte Certo  
**Solução:** Verifique o código correto usando busca de materiais no bot

### "Alertas não estão sendo enviados"
**Causa:** `lastAlertDate` está com data de hoje  
**Solução:** Edite `data/alert-state.json` e remova a entrada ou altere a data

### "Comando não reconhecido"
**Causa:** Formato do comando incorreto  
**Solução:** Use `ajuda alertas` para ver formato correto

### "Erro ao enviar mensagem"
**Causa:** Sessão "ademir" não está conectada  
**Solução:** Verifique status das sessões no log do servidor

---

## 📝 Comandos Rápidos

```powershell
# Testar sem enviar
node test-alerts.js

# Enviar alertas agora
node send-alerts-now.js

# Iniciar servidor
node server.js

# Ver logs em tempo real (se usando PM2)
pm2 logs bot-estoque

# Ver materiais monitorados
type data\monitored-materials.json

# Ver estado dos alertas
type data\alert-state.json
```

---

✅ **Sistema pronto para uso!**
