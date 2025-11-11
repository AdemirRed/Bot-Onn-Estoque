# 🤖 Sistema de Busca de Materiais - Bot Estoque

Sistema inteligente de busca de materiais do Corte Certo via WhatsApp.

## 📋 Funcionalidades

### 🔍 Busca Inteligente
- **Busca parcial por nome**: "Branco" retorna todos os materiais com "Branco" no nome
- **Espessura opcional**: Pode especificar ou o bot pergunta se necessário
- **Múltiplos formatos aceitos**:
  - `Branco Liso 18mm`
  - `Branco Liso 18`
  - `Noite Guara 18`
  - `Carvalho Hanover`

### 💬 Conversação Contextual
- Mantém contexto por **10 minutos**
- Seleção numérica quando há múltiplos resultados
- Pergunta espessura automaticamente quando necessário

### 📦 Informações Exibidas

#### Chapas Inteiras
- Dimensões (altura x largura)
- Quantidade disponível
- Descrição/observações

#### Retalhos
- Dimensões (altura x largura)
- **Área em m²**
- Quantidade disponível
- Ordenados por tamanho (maior → menor)

#### Dados do Material
- Nome completo
- Espessura
- Direção do veio (Horizontal/Vertical)
- Preço da chapa

## 🚀 Como Usar

### Exemplos de Mensagens

#### 1️⃣ Busca Completa (Nome + Espessura)
```
Branco Liso 18mm
```
**Resposta**: Detalhes completos com chapas e retalhos

#### 2️⃣ Busca Sem Espessura
```
Branco Liso
```
**Bot pergunta**: "Qual espessura? 6, 9, 15, 18, 25mm"
**Você responde**: `18`

#### 3️⃣ Busca Parcial (Múltiplos Resultados)
```
Branco
```
**Bot lista**:
```
🎨 Encontrei 5 materiais

1. Branco Liso 18mm
2. Branco Diamante 18mm
3. Branco Ártico 18mm
...

💬 Responda com o número da opção desejada.
```
**Você responde**: `1`

#### 4️⃣ Busca Específica por Retalhos
```
retalho Noite Guara 18mm
```
**Resposta**: Apenas retalhos disponíveis

#### 5️⃣ Busca Específica por Chapas
```
chapa Carvalho Hanover 18mm
```
**Resposta**: Apenas chapas inteiras

## 🎯 Fluxos de Conversação

### Fluxo 1: Resultado Único
```
Usuário: Branco Liso 18mm
Bot: ✅ BRANCO LISO 18mm
     📏 Espessura: 18mm
     📦 CHAPAS INTEIRAS (5)
     ♻️ RETALHOS (12)
     ...
```

### Fluxo 2: Múltiplas Espessuras
```
Usuário: Noite Guara
Bot: 📏 Qual espessura?
     Material: Noite Guara
     Espessuras disponíveis:
     • 6mm
     • 18mm
     💬 Responda com a espessura

Usuário: 18
Bot: [Exibe detalhes do material 18mm]
```

### Fluxo 3: Múltiplos Materiais
```
Usuário: Branco 18mm
Bot: 🎨 Encontrei 3 materiais
     📏 Espessura: 18mm
     
     1. Branco Liso 18mm
     2. Branco Diamante 18mm
     3. Branco Ártico 18mm
     
     💬 Responda com o número

Usuário: 1
Bot: [Exibe detalhes do Branco Liso 18mm]
```

## 🛠️ Estrutura Técnica

### Arquivos do Corte Certo
```
CC_DATA_BASE/
├── MAT/
│   └── M{codigo}.INI      # Nomes e propriedades
└── CHP/
    ├── CHP00{codigo}.TAB  # Chapas (espaço separado)
    └── RET00{codigo}.TAB  # Retalhos (vírgula separado)
```

### Serviços Criados

1. **corteCertoService.js**
   - Leitura de arquivos INI e TAB
   - Cache de 5 minutos
   - Parse de materiais, chapas e retalhos

2. **messageAnalyzerService.js**
   - Extração de cor e espessura
   - Identificação de tipo (chapa/retalho)
   - Detecção de seleção numérica

3. **materialSearchService.js**
   - Busca inteligente com contexto
   - Gerenciamento de conversação
   - Formatação de respostas

## 🔧 Configuração

### Sessões Monitoradas (.env)
```env
MONITORED_SESSIONS=red,redblack,ademir
```

### Números Ignorados
- BipText: `553172280540@c.us` (transcrição de áudio)
- Próprio bot: Mensagens com `fromMe=true`

## 🧪 Testes

Execute o arquivo de teste:
```bash
node test-material-search.js
```

Ou teste via webhook:
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/webhook" `
  -Method POST `
  -Headers @{"x-api-key"="redblack"; "Content-Type"="application/json"} `
  -Body '{"sessionId":"red","event":"message","data":{"from":"555197756708@c.us","body":"Branco Liso 18mm","type":"chat"}}'
```

## 📊 Espessuras Comuns

- **6mm**: Fundos de gavetas, divisórias
- **9mm**: Prateleiras leves
- **15mm**: Portas, laterais
- **18mm**: Padrão para móveis
- **25mm**: Tampos, estruturas

## 💡 Dicas de Uso

1. **Seja específico quando possível**: "Branco Liso 18mm" é mais rápido que "Branco"
2. **Use nomes parciais**: "Noite" encontra "Noite Guara"
3. **Contexto expira em 10min**: Se demorar, refaça a busca
4. **Números soltos**: Bot entende como seleção ou espessura pelo contexto

## 🚫 Filtros Automáticos

- ❌ Mensagens do BipText (bot de transcrição)
- ❌ Mensagens do próprio bot (fromMe=true)
- ❌ Eventos QR e loading_screen
- ✅ Apenas sessões configuradas no .env

## 📈 Performance

- **Cache de materiais**: 5 minutos
- **Contexto de conversação**: 10 minutos
- **Limpeza automática**: A cada 5 minutos
- **267 materiais carregados** em ~50ms

---

**Status**: ✅ Funcionando perfeitamente!
**Última atualização**: 11/11/2025
