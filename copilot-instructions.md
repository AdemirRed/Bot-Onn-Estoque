# GitHub Copilot Instructions

## Regras Gerais
- Sempre use português brasileiro nos comentários e mensagens
- Siga o padrão de código existente no projeto
- Execute `node swagger.js` após modificar rotas ou controllers
- Sempre utilize o número 555197756708 para exemplos de números brasileiros
- Não crie arquivos de documentação separados, use Swagger para documentar APIs
- Use async/await para operações assíncronas
- Após criar arquivos de teste, sempre apague os desnecessários
- O meu terminal só usa ; e nunca &&
- Antes de adicionar algo novo na API, sempre verifique a documentação oficial do whatsapp-web.js e etc.
- Sem resumos gigantes, seja objetivo e direto ao ponto.
- Sempre usar o Invoke-WebRequest ao invez do curl no powershell

## Obrigatorio seguir
- O usuario não gosta de arquivos de documentação separados, use Swagger para documentar APIs. ou crie uma pasta para documentações.
- Sempre remover testes antigos que não são mais necessários e novos que não serão usados.
- Sempre siga as regras específicas para WhatsApp API, Swagger e Audio/Transcription abaixo.
- Sempre valide os dados de entrada e saída das funções.
- Use mensagens de erro claras e consistentes.
- Mantenha o código limpo e bem organizado.
- Adicione testes unitários para novas funcionalidades.
- Documente todas as mudanças no código. dentro do codigo e em português brasileiro.
- Mantenha sempre o Swagger atualizado com as novas rotas e mudanças.

## WhatsApp API - Regras Específicas
- Sempre use middleware de validação: `sessionNameValidation` e `sessionValidation`
- Todos os endpoints precisam do middleware `apikey`
- Após criar novos endpoints, atualizar swagger.js com as definições
- Use `sendErrorResponse(res, statusCode, message)` para erros
- Sessões devem ser validadas com `validateSession(sessionId)`

## Swagger Documentation
- Adicionar comentários `#swagger.summary` e `#swagger.description`
- Usar `$` para campos obrigatórios nas definições (ex: `$phoneNumber`)
- Incluir exemplos em `#swagger.requestBody` quando houver múltiplas opções

## Audio/Transcription
- BipText número: 553172280540@c.us
- Fluxo de respostas: "Concordo" → "Permito" → Aguardar → Extrair transcrição
- Sempre incluir timeout de 2 minutos para transcrições

## Corte Certo - Sistema de Busca de Materiais
- Base de dados: `CC_DATA_BASE/CC_DATA_BASE/`
- Estrutura de arquivos:
  - `MAT/M{codigo}.INI` - Nomes e propriedades dos materiais
  - `CHP/CHP00{codigo}.TAB` - Chapas inteiras (espaço separado)
  - `CHP/RET00{codigo}.TAB` - Retalhos (vírgula separado)
- Parsing de INI: Seções `[DESC]` (CAMPO1=nome) e `[PROP_FISIC]` (ESPESSURA, VEIO_HORIZONTAL, VEIO_VERTICAL)
- Busca inteligente: Suporta nome parcial (ex: "branco" retorna todos os brancos)
- Fluxo conversacional: Mantém contexto por 10 minutos para seleções numéricas
- Espessuras comuns: 6, 9, 15, 18, 25mm
- Cache de materiais: 5 minutos para performance
- Formato de resposta: Markdown com emojis, lista numerada, área em m² para retalhos
