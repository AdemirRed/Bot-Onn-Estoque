/**
 * Serviço para análise de mensagens e extração de informações
 */
class MessageAnalyzerService {
  constructor() {
    // Palavras-chave para identificar intenção
    this.chapaKeywords = ['chapa', 'chapas', 'placa', 'placas', 'inteira', 'inteiras'];
    this.retalhoKeywords = ['retalho', 'retalhos', 'sobra', 'sobras', 'resto', 'restos'];
    
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

    return {
      cor: this.extractColor(normalized, message),
      espessura: this.extractThickness(normalized),
      tipo: this.extractType(normalized),
      isNumericSelection: this.isNumericSelection(normalized),
      selectedNumber: this.extractNumber(normalized),
      originalMessage: message
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
      'por', 'pelo', 'pela', 'pelos', 'pelas'
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
}

module.exports = new MessageAnalyzerService();
