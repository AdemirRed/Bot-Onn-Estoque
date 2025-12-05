/**
 * Serviço para extração inteligente de materiais de transcrições de áudio
 */
class AudioMaterialExtractor {
  constructor() {
    // Palavras irrelevantes que devem ser removidas
    // NOTA: "retalho/retalhos" NÃO está aqui pois é um material específico (códigos 99 e 999)
    this.stopWords = [
      // Nomes comuns
      'demir', 'ademir', 'redblack', 'red', 'black',
      // Verbos e ações
      'corta', 'cortar', 'precisa', 'preciso', 'precisando', 'quero', 'tem', 'pode', 'ser',
      'fazer', 'faz', 'pegar', 'buscar', 'procurar', 'estava', 'talvez',
      // Medidas e dimensões (contexto, não material)
      'metro', 'metros', 'centimetro', 'centimetros', 'largura', 'comprimento',
      'peça', 'peca', 'pedaço', 'pedaco', 'chapa',
      // Tipos de material (sempre presentes, não distinguem)
      'mdf', 'mdp', 'compensado', 'aglomerado', 'madeira',
      // Palavras conectivas
      'uma', 'de', 'por', 'em', 'pra', 'para', 'com', 'sem', 'não', 'nao',
      'é', 'e', 'ou', 'mas', 'se', 'que', 'quando', 'onde',
      // Interjeições e expressões
      'ô', 'o', 'a', 'ah', 'eh', 'né', 'ne', 'tá', 'ta', 'ok', 'certo',
      // Palavras de transcrição
      'transcrito', 'transcricao', 'blip', 'viratexto', 'por'
    ];

    // Padrões para identificar espessuras (em mm ou decimais)
    this.thicknessPatterns = [
      /(\d+)\s*mil[íi]metros?/gi,      // 18 milímetros, 15 milimetro
      /(\d+)\s*mm/gi,                  // 18mm, 6mm
      /0[.,](\d+)/g,                   // 0,9 -> 9mm, 0.6 -> 6mm  
      /\b0?(\d+)\b(?!\s*metro)/gi,     // 06, 6, 18 (mas não "1 metro")
      /espessura\s*(\d+)/gi            // espessura 18
    ];
  }

  /**
   * Extrai informações de material de uma transcrição de áudio
   * @param {string} transcription - Transcrição do áudio
   * @returns {Object} Informações extraídas
   */
  extractMaterialInfo(transcription) {
    if (!transcription || typeof transcription !== 'string') {
      return { materialTerms: [], espessura: null };
    }

    // Remove formatação markdown e limpa texto
    let cleanText = transcription
      .replace(/\*\*/g, '') // Remove **
      .replace(/--.*?$/gm, '') // Remove linha de crédito
      .replace(/\n/g, ' ') // Remove quebras de linha
      .toLowerCase()
      .trim();

    // Extrai espessura primeiro
    const espessura = this.extractThickness(cleanText);

    // Remove números de medidas e espessuras do texto para focar no nome do material
    cleanText = this.removeMeasurements(cleanText);

    // Extrai termos candidatos a material
    const materialTerms = this.extractMaterialTerms(cleanText);

    return {
      materialTerms,
      espessura,
      originalText: transcription
    };
  }

  /**
   * Extrai espessura da transcrição
   * @param {string} text - Texto limpo
   * @returns {number|null} Espessura em mm
   */
  extractThickness(text) {
    for (const pattern of this.thicknessPatterns) {
      const matches = Array.from(text.matchAll(pattern));
      
      for (const match of matches) {
        let thickness;
        
        if (pattern.source.includes('0[.,]')) {
          // Padrão 0,9 -> 9mm (converte decimal para mm)
          thickness = parseInt(match[1]);
          if (thickness === 9 || thickness === 6) {
            return thickness;
          }
        } else {
          // Números diretos (18 milímetros, 15mm, etc)
          thickness = parseInt(match[1]);
        }
        
        // Valida se é uma espessura comum (6mm, 9mm, 15mm, 18mm, 25mm)
        if ([6, 9, 15, 18, 25].includes(thickness)) {
          return thickness;
        }
      }
    }
    
    return null;
  }

  /**
   * Remove medidas e números de dimensões do texto
   * @param {string} text - Texto
   * @returns {string} Texto sem medidas
   */
  removeMeasurements(text) {
    return text
      // Remove medidas: "2 metros e 70", "1 metro por 50"
      .replace(/\d+\s*(metro|metros|centimetro|centimetros|cm|m)\s*(e\s*\d+|por\s*\d+)?/gi, '')
      // Remove dimensões: "2,70 x 1,50", "100x50"
      .replace(/\d+[.,]\d+\s*(x|por|de)\s*\d+[.,]?\d*/gi, '')
      // Remove números soltos seguidos de medida
      .replace(/\d+[.,]?\d*\s*(x|por|de|cm|mm|m)\s*\d*[.,]?\d*/gi, '')
      // Remove espessuras já capturadas: "18 milímetros", "0,9"
      .replace(/\d+\s*mil[íi]metros?/gi, '')
      .replace(/0[.,]\d+/g, '')
      // Remove sequências de números
      .replace(/\d+[.,]\d+/g, '')
      // Remove pontuação excessiva
      .replace(/[,]{2,}/g, '')
      .replace(/[.]{2,}/g, '')
      // Normaliza espaços
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extrai termos candidatos a nomes de materiais
   * @param {string} text - Texto limpo
   * @returns {Array} Array de termos candidatos
   */
  extractMaterialTerms(text) {
    // Divide em palavras e limpa pontuação
    const words = text.split(/\s+/)
      .map(word => word.replace(/[,.!?;:]+$/, '').trim()) // Remove pontuação do final
      .filter(word => word.length > 0); // Remove palavras vazias
    
    // Remove stop words e palavras muito curtas
    const relevantWords = words.filter(word => {
      const cleanWord = word.toLowerCase();
      return cleanWord.length > 2 && 
             !this.stopWords.includes(cleanWord) &&
             !/^\d+$/.test(cleanWord) && // Remove números puros
             !/^[,.!?;:]+$/.test(cleanWord); // Remove pontuação pura
    });

    // Gera combinações de palavras (1, 2 e 3 palavras consecutivas)
    const terms = [];
    
    // Palavras individuais
    relevantWords.forEach(word => {
      if (word.length > 3) { // Só palavras com mais de 3 caracteres sozinhas
        terms.push(this.capitalizeFirst(word));
      }
    });

    // Combinações de 2 palavras
    for (let i = 0; i < relevantWords.length - 1; i++) {
      const combo = `${relevantWords[i]} ${relevantWords[i + 1]}`;
      terms.push(this.capitalizeWords(combo));
    }

    // Combinações de 3 palavras (para materiais como "Branco Liso TX")
    for (let i = 0; i < relevantWords.length - 2; i++) {
      const combo = `${relevantWords[i]} ${relevantWords[i + 1]} ${relevantWords[i + 2]}`;
      terms.push(this.capitalizeWords(combo));
    }

    // Remove duplicatas e ordena por relevância (termos maiores primeiro)
    const uniqueTerms = [...new Set(terms)]
      .filter(term => term.length > 3) // Remove termos muito curtos
      .sort((a, b) => b.length - a.length);
    
    return uniqueTerms;
  }

  /**
   * Capitaliza primeira letra
   * @param {string} str - String
   * @returns {string} String com primeira letra maiúscula
   */
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Capitaliza cada palavra
   * @param {string} str - String
   * @returns {string} String com cada palavra capitalizada
   */
  capitalizeWords(str) {
    return str.split(' ').map(word => this.capitalizeFirst(word)).join(' ');
  }

  /**
   * Busca material usando os termos extraídos
   * @param {Array} materialTerms - Termos candidatos
   * @param {number} espessura - Espessura
   * @param {Object} corteCertoService - Serviço de busca
   * @returns {Promise<Object>} Resultado da busca
   */
  async searchWithTerms(materialTerms, espessura, corteCertoService) {
    // Tenta busca com cada termo, do mais específico para o mais geral
    for (const term of materialTerms) {
      const materials = await corteCertoService.searchMaterials(term, espessura);
      
      if (materials.length > 0) {
        return {
          success: true,
          materials,
          searchTerm: term,
          espessura
        };
      }
    }

    return {
      success: false,
      searchTerms: materialTerms,
      espessura
    };
  }
}

module.exports = new AudioMaterialExtractor();