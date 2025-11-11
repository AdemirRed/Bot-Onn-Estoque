# 🧪 Exemplos de Teste - Sistema de Busca de Materiais

## 📋 Testes via PowerShell (Webhook)

### 1. Busca Completa (Nome + Espessura)
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/webhook" `
  -Method POST `
  -Headers @{"x-api-key"="redblack"; "Content-Type"="application/json"} `
  -Body '{"sessionId":"red","event":"message","data":{"from":"555197756708@c.us","body":"Branco Liso 18mm","type":"chat","fromMe":false}}'
```

### 2. Busca Sem Espessura
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/webhook" `
  -Method POST `
  -Headers @{"x-api-key"="redblack"; "Content-Type"="application/json"} `
  -Body '{"sessionId":"red","event":"message","data":{"from":"555197756708@c.us","body":"Noite Guara","type":"chat","fromMe":false}}'
```

**Resposta esperada**: Bot pergunta qual espessura

**Depois responda**:
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/webhook" `
  -Method POST `
  -Headers @{"x-api-key"="redblack"; "Content-Type"="application/json"} `
  -Body '{"sessionId":"red","event":"message","data":{"from":"555197756708@c.us","body":"18","type":"chat","fromMe":false}}'
```

### 3. Busca Parcial (Múltiplos Resultados)
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/webhook" `
  -Method POST `
  -Headers @{"x-api-key"="redblack"; "Content-Type"="application/json"} `
  -Body '{"sessionId":"red","event":"message","data":{"from":"555197756708@c.us","body":"Branco 18mm","type":"chat","fromMe":false}}'
```

**Resposta esperada**: Lista numerada de materiais

**Depois responda**:
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/webhook" `
  -Method POST `
  -Headers @{"x-api-key"="redblack"; "Content-Type"="application/json"} `
  -Body '{"sessionId":"red","event":"message","data":{"from":"555197756708@c.us","body":"1","type":"chat","fromMe":false}}'
```

### 4. Busca por Retalhos
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/webhook" `
  -Method POST `
  -Headers @{"x-api-key"="redblack"; "Content-Type"="application/json"} `
  -Body '{"sessionId":"red","event":"message","data":{"from":"555197756708@c.us","body":"retalho Noite Guara 18","type":"chat","fromMe":false}}'
```

### 5. Material Não Encontrado
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/webhook" `
  -Method POST `
  -Headers @{"x-api-key"="redblack"; "Content-Type"="application/json"} `
  -Body '{"sessionId":"red","event":"message","data":{"from":"555197756708@c.us","body":"Material Inexistente 999mm","type":"chat","fromMe":false}}'
```

### 6. Teste de Áudio (Transcrição)
```powershell
# Simula recebimento de áudio
Invoke-WebRequest -Uri "http://localhost:3000/api/webhook" `
  -Method POST `
  -Headers @{"x-api-key"="redblack"; "Content-Type"="application/json"} `
  -Body '{
    "sessionId":"red",
    "dataType":"media",
    "data":{
      "message":{
        "from":"555197756708@c.us",
        "to":"123456@c.us",
        "type":"ptt",
        "duration":5,
        "id":{"_serialized":"msg123"}
      },
      "messageMedia":{
        "mimetype":"audio/ogg",
        "data":"base64audiodatahere...",
        "filesize":15000
      }
    }
  }'
```

## 🎯 Testes Diretos (Node.js)

### Executar Suite de Testes
```powershell
node test-material-search.js
```

### Teste Individual
```javascript
const materialSearchService = require('./services/materialSearchService');

// Teste assíncrono
(async () => {
  const result = await materialSearchService.processMessage(
    '555197756708@c.us',
    'red',
    'Branco Liso 18mm'
  );
  
  console.log(result.message);
})();
```

## 📊 Casos de Teste Esperados

### ✅ Caso 1: Material Único com Estoque
**Input**: `Noite Guara 18mm`

**Output esperado**:
```
✅ NOITE GUARA. 18mm
📏 Espessura: 18mm
🌾 Veio: Horizontal

📦 CHAPAS INTEIRAS (7)
━━━━━━━━━━━━━━━━━━
1. 2740x1840mm - __**_9993>9992
2. 2740x1845mm - _
...
```

### ✅ Caso 2: Múltiplas Espessuras
**Input**: `Branco Liso`

**Output esperado**:
```
📏 Qual espessura?

Material: Branco Liso

Espessuras disponíveis:
• 6mm
• 9mm
• 15mm
• 18mm
• 25mm

💬 Responda com a espessura (ex: 18)
```

### ✅ Caso 3: Múltiplos Materiais Mesma Espessura
**Input**: `Branco 18mm`

**Output esperado**:
```
🎨 Encontrei 3 materiais
📏 Espessura: 18mm

━━━━━━━━━━━━━━━━━━
1. Branco Liso 18mm
2. Branco Diamante 18mm
3. Branco Ártico 18mm
━━━━━━━━━━━━━━━━━━

💬 Responda com o número da opção desejada.
```

### ❌ Caso 4: Material Não Encontrado
**Input**: `Cor Inexistente 99mm`

**Output esperado**:
```
❌ Material não encontrado

Busca: Cor Inexistente 99mm

💡 Dica: Tente buscar apenas pela cor principal.
Exemplo: "Branco" em vez de "Branco Liso"
```

### ✅ Caso 5: Seleção Numérica
**Sequência**:
1. Input: `Branco 18mm`
2. Output: Lista com 3 opções
3. Input: `1`
4. Output: Detalhes do Branco Liso 18mm

### ✅ Caso 6: Seleção de Espessura
**Sequência**:
1. Input: `Noite Guara`
2. Output: Pergunta espessura (6, 18)
3. Input: `18`
4. Output: Detalhes do Noite Guara 18mm

### ✅ Caso 7: Apenas Retalhos
**Input**: `retalho Carvalho 18mm`

**Output esperado**:
```
✅ CARVALHO HANOVER 18mm
📏 Espessura: 18mm
🌾 Veio: Vertical

♻️ RETALHOS (15)
━━━━━━━━━━━━━━━━━━
1. 2398x741mm (1.78m²) - A1
2. 810x321mm (0.26m²) - A3
...
```

### ✅ Caso 8: Sem Estoque
**Input**: `Material Sem Estoque 18mm`

**Output esperado**:
```
✅ MATERIAL SEM ESTOQUE 18mm
📏 Espessura: 18mm

⚠️ Sem estoque no momento
```

## 🔍 Verificação de Logs

### Console do Servidor
Ao processar uma mensagem, você deve ver:

```
 🔔 WEBHOOK EVENT
│ ⏰ 11/11/2025, 18:48:33
│ 📱 Sessão: red
│ 📌 Evento: message
├─────────────────────────────────────────────────
│ 👤 De: 555197756708@c.us
│ 💬 Mensagem: Branco Liso 18mm
│ 📝 Tipo: chat
│ 🔍 Processando busca de material...
└─────────────────────────────────────────────────

✅ Carregados 267 materiais do Corte Certo
│ ✅ Resposta enviada para 555197756708@c.us
```

## 🚨 Troubleshooting

### Problema: Material não encontrado mas existe
**Causa**: Nome da busca muito específico  
**Solução**: Buscar apenas cor principal (ex: "Branco" ao invés de "Branco Liso Ultra HD")

### Problema: Contexto perdido
**Causa**: Passou mais de 10 minutos  
**Solução**: Refazer a busca inicial

### Problema: Bot não responde
**Verificar**:
1. Servidor rodando? `npm start`
2. SessionId está no .env? `MONITORED_SESSIONS=red,redblack,ademir`
3. Mensagem não é do BipText? `from !== 553172280540@c.us`
4. Mensagem não é do próprio bot? `fromMe === false`

### Problema: Cache desatualizado
**Solução**: Cache expira automaticamente em 5 minutos, ou reinicie o servidor

## 📈 Benchmarks

### Tempos Esperados
- Primeira busca (carrega cache): ~50-100ms
- Buscas subsequentes: ~5-10ms
- Parse de chapas/retalhos: ~10ms
- Resposta total: ~100-200ms

### Limites
- 267 materiais cadastrados
- Cache válido por 5 minutos
- Contexto válido por 10 minutos
- Timeout transcrição: 2 minutos

---

**Última atualização**: 11/11/2025  
**Status**: ✅ Todos os testes passando
