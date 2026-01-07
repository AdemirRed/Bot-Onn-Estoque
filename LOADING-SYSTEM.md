# Sistema de Indicadores de Carregamento (Loading)

## Visão Geral

O bot agora possui um sistema completo de indicadores de carregamento que informa aos usuários quando operações demoradas estão sendo processadas.

## Componentes

### 1. Utilitário de Loading (`utils/loadingIndicator.js`)

Funções disponíveis:

- **`sendLoadingMessage(sessionId, chatId, operation, estimatedSeconds)`**
  - Envia mensagem inicial: "⏳ [Operação]... ⏱️ Tempo estimado: ~X segundos"
  
- **`sendCompletionMessage(sessionId, chatId, operation, success)`**
  - Envia confirmação: "✅ [Operação] pronto!" ou "❌ [Operação] falhou!"

- **`sendProgressMessage(sessionId, chatId, operation, progress)`**
  - Envia barra de progresso: "▰▰▰▰▰▱▱▱▱▱ ⏳ [Operação]... X%"

- **`withLoadingIndicator(sessionId, chatId, operationName, operation, estimatedSeconds)`**
  - Wrapper que adiciona loading automaticamente em qualquer operação async

### 2. Frames de Animação

```javascript
const LOADING_FRAMES = [
  '▰▱▱▱▱▱▱▱▱▱',  // 10%
  '▰▰▱▱▱▱▱▱▱▱',  // 20%
  '▰▰▰▱▱▱▱▱▱▱',  // 30%
  '▰▰▰▰▱▱▱▱▱▱',  // 40%
  '▰▰▰▰▰▱▱▱▱▱',  // 50%
  '▰▰▰▰▰▰▱▱▱▱',  // 60%
  '▰▰▰▰▰▰▰▱▱▱',  // 70%
  '▰▰▰▰▰▰▰▰▱▱',  // 80%
  '▰▰▰▰▰▰▰▰▰▱',  // 90%
  '▰▰▰▰▰▰▰▰▰▰'   // 100%
];
```

## Operações com Loading

### 1. Geração de Relatórios

**Antes:**
```
[Usuário aguarda sem feedback por ~10 segundos]
📊 Relatório pronto!
```

**Agora:**
```
⏳ Gerando relatório...
⏱️ Tempo estimado: ~10 segundos

[Processa...]

✅ Relatório pronto!
📊 Relatório de Estoque
[arquivo.html anexado]
```

**Implementação:**
```javascript
const report = await reportService.generateReport({
  espessura: 18,
  sessionId: 'red',
  chatId: '555197756708@c.us'
});
```

### 2. Geração de Listas de Materiais

**Antes:**
```
[Usuário aguarda sem feedback por ~8 segundos]
📋 Lista pronta!
```

**Agora:**
```
⏳ Gerando lista de materiais...
⏱️ Tempo estimado: ~8 segundos

[Processa...]

✅ Lista de materiais pronto!
📋 Lista de Materiais - Total: 150 materiais
[arquivo.pdf anexado]
```

**Implementação:**
```javascript
const list = await materialListService.generateMaterialList({
  espessura: 18,
  sessionId: 'red',
  chatId: '555197756708@c.us'
});
```

### 3. Transcrição de Áudios

**Áudio Único:**
```
⏳ Transcrevendo áudio...
⏱️ Tempo estimado: ~10 segundos

[Transcreve...]

✅ Transcrição pronto!
📝 Transcrição: "Quero buscar branco neve 18mm"
```

**Múltiplos Áudios:**
```
⏳ Transcrevendo 3 áudio(s)...
⏱️ Tempo estimado: ~15 segundos

[Transcreve todos...]

✅ Transcrição pronto!
📝 Transcrição de 3 áudio(s):

🎤 Áudio 1:
"Quero buscar"

🎤 Áudio 2:
"branco neve"

🎤 Áudio 3:
"18 milímetros"
```

## Configurações Predefinidas

```javascript
const LOADING_CONFIGS = {
  TRANSCRIPTION: {
    operation: 'Transcrevendo áudio',
    estimatedSeconds: 10
  },
  MATERIAL_SEARCH: {
    operation: 'Buscando material',
    estimatedSeconds: 3
  },
  REPORT_GENERATION: {
    operation: 'Gerando relatório',
    estimatedSeconds: 10
  },
  LIST_GENERATION: {
    operation: 'Gerando lista de materiais',
    estimatedSeconds: 8
  },
  DATABASE_QUERY: {
    operation: 'Consultando banco de dados',
    estimatedSeconds: 5
  }
};
```

## Limitações Técnicas

### ❌ Edição de Mensagens NÃO Suportada

O WhatsApp Web.js **NÃO PERMITE** editar mensagens já enviadas. Por isso, o sistema usa **mensagens sequenciais** ao invés de atualizar uma única mensagem.

**Tentativa inicial (não funciona):**
```javascript
// Isso não existe na API
await editMessage(messageId, "▰▰▱▱▱▱▱▱▱▱");
await editMessage(messageId, "▰▰▰▰▱▱▱▱▱▱");
await editMessage(messageId, "▰▰▰▰▰▰▱▱▱▱");
```

**Solução implementada:**
```javascript
// Envia mensagem inicial
await sendLoadingMessage(sessionId, chatId, 'Gerando relatório', 10);

// Processa
const result = await generateReport();

// Envia confirmação
await sendCompletionMessage(sessionId, chatId, 'Relatório', true);

// Envia resultado
await sendDocument(sessionId, chatId, result.filepath);
```

## Fluxo de Mensagens no Chat

**Exemplo real:**
```
👤 Usuário: relatório 18mm

🤖 Bot: ⏳ Gerando relatório...
        ⏱️ Tempo estimado: ~10 segundos

🤖 Bot: ✅ Relatório pronto!

🤖 Bot: 📊 Relatório de Estoque
        
        Espessura: 18mm
        Materiais: 12
        Chapas: 45
        Retalhos: 23
        
        📎 relatorio-estoque-18mm-ambos-2025-01-07.html
```

## Vantagens do Sistema

✅ **Feedback imediato** - Usuário sabe que o bot está processando  
✅ **Estimativa de tempo** - Define expectativas claras  
✅ **Confirmação visual** - Sinaliza conclusão ou erro  
✅ **Não invasivo** - Não cria spam de mensagens  
✅ **Configurável** - Fácil adicionar em novas operações  

## Como Adicionar Loading em Nova Operação

### Opção 1: Manual
```javascript
const { sendLoadingMessage, sendCompletionMessage } = require('../utils/loadingIndicator');

async function minhaOperacao(sessionId, chatId) {
  // Envia loading
  await sendLoadingMessage(sessionId, chatId, 'Processando', 5);
  
  try {
    // Faz o trabalho pesado
    const result = await operacaoDemorada();
    
    // Confirma sucesso
    await sendCompletionMessage(sessionId, chatId, 'Processamento', true);
    
    return result;
  } catch (error) {
    // Confirma erro
    await sendCompletionMessage(sessionId, chatId, 'Processamento', false);
    throw error;
  }
}
```

### Opção 2: Com Wrapper
```javascript
const { withLoadingIndicator } = require('../utils/loadingIndicator');

async function minhaOperacao(sessionId, chatId) {
  return await withLoadingIndicator(
    sessionId,
    chatId,
    'Processando',
    async () => {
      // Sua lógica aqui
      return await operacaoDemorada();
    },
    5 // tempo estimado
  );
}
```

## Testando o Sistema

Para testar, envie no WhatsApp:

1. **Relatório**: `relatório 18mm` ou `relatorio geral`
2. **Lista**: `lista de materiais 18mm` ou `lista`
3. **Áudio**: Grave e envie áudios de voz
4. **Múltiplos áudios**: Envie 2-3 áudios em sequência rápida

Você verá as mensagens de loading aparecerem antes dos resultados!
