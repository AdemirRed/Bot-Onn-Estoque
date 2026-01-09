/**
 * Serviço para análise de mensagens e extração de informações
 */
class MessageAnalyzerService {
  constructor() {
    // Palavras-chave para identificar intenção
    this.chapaKeywords = ['chapa', 'chapas', 'placa', 'placas', 'inteira', 'inteiras'];
    this.retalhoKeywords = ['retalho', 'retalhos', 'sobra', 'sobras', 'resto', 'restos'];
    this.reportKeywords = ['relatorio', 'relatório', 'relacao', 'relação', 'listagem', 'inventario', 'inventário'];
    this.listKeywords = ['lista', 'lista de materiais', 'listar', 'imprimir', 'imprimir lista'];
    
    // Comandos de alerta de estoque
    this.alertCommandKeywords = {
      confirmPurchase: ['compra', 'comprar', 'confirmar compra', 'confirmado'],
      addMaterial: ['adicionar', 'add', 'adicionar alerta', 'monitorar'],
      removeMaterial: ['remover', 'remove', 'remover alerta', 'parar'],
      listAlerts: ['listar alertas', 'ver alertas', 'alertas', 'monitorados'],
      changeMinimum: ['minimo', 'mínimo', 'quantidade minima', 'alterar minimo'],
      helpAlerts: ['ajuda alertas', 'help alertas', 'comandos alertas'],
      checkNow: ['estoque']
    };
    
    // Espessuras comuns
    this.commonThicknesses = [6, 9, 15, 18, 25];
  }

  /**
   * Analisa uma mensagem e extrai informações relevantes
   * @param {string} message - Mensagem do usuário
   * @returns {Object} Informações extraídas
   */
  analyzeMessage(message) {
    const normalized = this.normalizeText(message);

    // Verifica comandos de alerta primeiro
    const alertCommand = this.detectAlertCommand(normalized, message);
    if (alertCommand.isAlertCommand) {
      return alertCommand;
    }

    return {
      cor: this.extractColor(normalized, message),
      espessura: this.extractThickness(normalized),
      tipo: this.extractType(normalized),
      isNumericSelection: this.isNumericSelection(normalized),
      isReportRequest: this.isReportRequest(normalized),
      isListRequest: this.isListRequest(normalized),
      selectedNumber: this.extractNumber(normalized),
      originalMessage: message,
      isAlertCommand: false
    };
  }

  /**
   * Extrai a cor da mensagem
   * @param {string} normalized - Mensagem normalizada
   * @param {string} original - Mensagem original
   * @returns {string|null} Cor extraída
   */
  extractColor(normalized, original) {
    // Se é apenas um número (seleção), não tem cor
    if (/^\d+$/.test(normalized.trim())) {
      return null;
    }
    
    // Lista de palavras irrelevantes para remover
    const stopWords = [
      'chapa', 'chapas', 'retalho', 'retalhos', 'sobra', 'sobras',
      'tem', 'preciso', 'quero', 'gostaria', 'inteira', 'inteiras',
      'para', 'de', 'em', 'com', 'o', 'a', 'os', 'as',
      'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas',
      'por', 'pelo', 'pela', 'pelos', 'pelas',
      // Palavras de comando
      'relatorio', 'relatório', 'relacao', 'relação', 'listagem', 
      'inventario', 'inventário', 'lista', 'listar', 'imprimir'
    ];
    
    // Remove a espessura e palavras-chave de contexto
    let colorText = normalized
      .replace(/\b(\d+)\s*mm\.?/gi, '') // Remove "18mm", "18mm.", "18 mm."
      .replace(/\b(\d+)\s*milimetros?\.?/gi, '') // Remove "18 milímetros."
      .replace(/\bde\s+(\d+)\.?/gi, '') // Remove "de 18" ou "de 18."
      .replace(/\bespessura\s+(\d+)\.?/gi, '') // Remove "espessura 18."
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim();

    // Remove stop words
    const words = colorText.split(/\s+/);
    const filteredWords = words.filter(word => {
      // Remove números soltos
      if (/^\d+$/.test(word)) return false;
      // Remove stop words
      if (stopWords.includes(word.toLowerCase())) return false;
      // Mantém palavras com mais de 2 caracteres
      return word.length > 2;
    });

    colorText = filteredWords.join(' ').trim();

    // Se sobrou algo relevante, é a cor
    if (colorText.length > 2) {
      // Tenta manter capitalização original
      const originalWords = original.split(/\s+/);
      const colorWords = originalWords.filter(w => {
        const norm = this.normalizeText(w);
        // Ignora números, mm, e stop words
        if (/^\d+$/.test(w) || /mm$/i.test(w)) return false;
        if (stopWords.includes(norm)) return false;
        return colorText.includes(norm) && w.length > 2;
      });
      
      return colorWords.join(' ').trim() || null;
    }

    return null;
  }

  /**
   * Extrai a espessura da mensagem
   * @param {string} normalized - Mensagem normalizada
   * @returns {number|null} Espessura em mm
   */
  extractThickness(normalized) {
    // Padrões: "18mm", "18 mm", "18.", "de 18", "18mm."
    const patterns = [
      /(\d+)\s*mm\.?/i,  // 18mm ou 18mm. ou 18 mm.
      /(\d+)\s*milimetros?\.?/i,
      /espessura\s+(\d+)/i,
      /de\s+(\d+)(?:\s|$|\.)/i,  // de 18 ou de 18.
      /\b(\d+)(?:\s*mm)?\.?\b/i  // 18 ou 18.
    ];

    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match) {
        const value = parseInt(match[1]);
        // Valida se é uma espessura comum
        if ([6, 9, 15, 18, 25, 3, 4, 10, 12].includes(value)) {
          return value;
        }
      }
    }

    return null;
  }

  /**
   * Identifica se é chapa ou retalho
   * @param {string} normalized - Mensagem normalizada
   * @returns {string} 'chapa', 'retalho' ou 'ambos'
   */
  extractType(normalized) {
    const hasChapa = this.chapaKeywords.some(k => normalized.includes(k));
    const hasRetalho = this.retalhoKeywords.some(k => normalized.includes(k));

    if (hasChapa && !hasRetalho) return 'chapa';
    if (hasRetalho && !hasChapa) return 'retalho';
    if (hasChapa && hasRetalho) return 'ambos';
    
    // Se não especificou, mostra ambos
    return 'ambos';
  }

  /**
   * Verifica se a mensagem é uma seleção numérica
   * @param {string} normalized - Mensagem normalizada
   * @returns {boolean}
   */
  isNumericSelection(normalized) {
    // Aceita: "1", "2", "opcao 1", "numero 2", etc
    return /^(opcao\s+)?(\d+)$|^numero\s+(\d+)$/i.test(normalized.trim());
  }

  /**
   * Verifica se é solicitação de relatório
   * @param {string} normalized - Mensagem normalizada
   * @returns {boolean}
   */
  isReportRequest(normalized) {
    return this.reportKeywords.some(keyword => normalized.includes(keyword));
  }

  /**
   * Verifica se é solicitação de lista de materiais
   * @param {string} normalized - Mensagem normalizada
   * @returns {boolean}
   */
  isListRequest(normalized) {
    // Verifica se contém palavras de lista E não contém palavra de relatório
    // Isso permite que "lista" seja usada para lista de materiais
    // e "relatorio" para relatório de estoque
    const hasListKeyword = this.listKeywords.some(keyword => normalized.includes(keyword));
    const hasReportKeyword = this.reportKeywords.some(keyword => normalized.includes(keyword));
    
    // Se tiver palavra de lista E não tiver palavra de relatório, é lista de materiais
    // Se tiver ambas, prioriza relatório
    return hasListKeyword && !hasReportKeyword;
  }

  /**
   * Extrai número de uma seleção
   * @param {string} normalized - Mensagem normalizada
   * @returns {number|null}
   */
  extractNumber(normalized) {
    const match = normalized.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  }

  /**
   * Normaliza texto para análise
   * @param {string} text - Texto a normalizar
   * @returns {string}
   */
  normalizeText(text) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Gera sugestão de formato quando não entende a mensagem
   * @returns {string}
   */
  getSuggestionMessage() {
    return `Não consegui entender. Por favor, envie no formato:\n\n` +
           `📋 *Exemplos:*\n` +
           `• Branco Liso 18mm\n` +
           `• Branco Liso 18\n` +
           `• Noite Guara 18mm\n` +
           `• Carvalho Hanover 18\n\n` +
           `Ou especifique se quer:\n` +
           `• *Chapas* ou *Retalhos*`;
  }

  /**
   * Detecta comandos relacionados a alertas de estoque
   * @param {string} normalized - Mensagem normalizada
   * @param {string} original - Mensagem original
   * @returns {Object} Comando detectado e parâmetros
   */
  detectAlertCommand(normalized, original) {
    // Primeiro verifica se é uma resposta numérica no formato "número código" (ex: "1 6", "2 37")
    // Isso permite responder às opções dos alertas
    const numericMatch = normalized.trim().match(/^(\d+)\s+(\d+)$/);
    if (numericMatch) {
      const optionNumber = parseInt(numericMatch[1]);
      const codigo = numericMatch[2];
      return {
        isAlertCommand: true,
        commandType: 'numericResponse',
        optionNumber: optionNumber,
        codigo: codigo,
        originalMessage: original
      };
    }
    
    // Verifica se começa com / (obrigatório para comandos)
    if (!normalized.startsWith('/')) {
      return { isAlertCommand: false };
    }
    
    // Remove / do início para processar
    const normalizedCmd = normalized.substring(1);
    
    // Confirmar compra: "/compra 6" ou "/comprar 6"
    if (this.alertCommandKeywords.confirmPurchase.some(kw => normalizedCmd.includes(kw))) {
      const match = normalizedCmd.match(/(?:compra|comprar|confirmad[oa]|confirmar)\s+(\d+)/);
      if (match) {
        return {
          isAlertCommand: true,
          commandType: 'confirmPurchase',
          codigo: match[1],
          originalMessage: original
        };
      }
    }

    // Adicionar material: "/adicionar 37" (nome é opcional)
    if (this.alertCommandKeywords.addMaterial.some(kw => normalizedCmd.includes(kw))) {
      // Tenta extrair código e nome opcional
      const matchWithName = normalizedCmd.match(/(?:adicionar|add|monitorar)\s+(\d+)\s+(.+)/);
      if (matchWithName) {
        return {
          isAlertCommand: true,
          commandType: 'addMaterial',
          codigo: matchWithName[1],
          nome: matchWithName[2].trim(),
          originalMessage: original
        };
      }
      
      // Apenas código: "/adicionar 37"
      const matchCodeOnly = normalizedCmd.match(/(?:adicionar|add|monitorar)\s+(\d+)/);
      if (matchCodeOnly) {
        return {
          isAlertCommand: true,
          commandType: 'addMaterial',
          codigo: matchCodeOnly[1],
          nome: null,
          originalMessage: original
        };
      }
    }

    // Remover material: "/remover 50"
    if (this.alertCommandKeywords.removeMaterial.some(kw => normalizedCmd.includes(kw))) {
      const match = normalizedCmd.match(/(?:remover|remove|parar)\s+(?:alerta\s+)?(\d+)/);
      if (match) {
        return {
          isAlertCommand: true,
          commandType: 'removeMaterial',
          codigo: match[1],
          originalMessage: original
        };
      }
    }

    // Ajuda alertas: "/ajuda alertas" (verificar ANTES de listar alertas!)
    if (this.alertCommandKeywords.helpAlerts.some(kw => normalizedCmd.includes(kw))) {
      return {
        isAlertCommand: true,
        commandType: 'helpAlerts',
        originalMessage: original
      };
    }

    // Listar alertas: "/listar alertas" ou "ver alertas"
    if (this.alertCommandKeywords.listAlerts.some(kw => normalizedCmd.includes(kw))) {
      return {
        isAlertCommand: true,
        commandType: 'listAlerts',
        originalMessage: original
      };
    }

    // Verificar estoque agora: "/estoque"
    if (this.alertCommandKeywords.checkNow.some(kw => normalizedCmd === kw)) {
      return {
        isAlertCommand: true,
        commandType: 'checkNow',
        originalMessage: original
      };
    }

    // Alterar mínimo: "/minimo 20" ou "/minimo 6 20"
    if (this.alertCommandKeywords.changeMinimum.some(kw => normalizedCmd.includes(kw))) {
      // Verifica se tem código do material: "/minimo 6 20"
      const matchWithCode = normalizedCmd.match(/(?:minimo|quantidade\s+minima|alterar\s+minimo)\s+(\d+)\s+(\d+)/);
      if (matchWithCode) {
        return {
          isAlertCommand: true,
          commandType: 'changeMinimum',
          codigo: matchWithCode[1],
          newMinimum: parseInt(matchWithCode[2]),
          originalMessage: original
        };
      }
      
      // Apenas quantidade (mínimo global): "/minimo 20"
      const match = normalizedCmd.match(/(?:minimo|quantidade\s+minima|alterar\s+minimo)\s+(\d+)/);
      if (match) {
        return {
          isAlertCommand: true,
          commandType: 'changeMinimum',
          newMinimum: parseInt(match[1]),
          originalMessage: original
        };
      }
    }

    return { isAlertCommand: false };
  }
}

module.exports = new MessageAnalyzerService();
