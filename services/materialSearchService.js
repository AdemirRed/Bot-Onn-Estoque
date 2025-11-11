const corteCertoService = require('./corteCertoService');
const messageAnalyzerService = require('./messageAnalyzerService');
const userStateService = require('./userStateService');

/**
 * Serviço de busca inteligente de materiais
 */
class MaterialSearchService {
  constructor() {
    // Contextos de conversação por usuário
    this.conversationContexts = new Map();
    this.CONTEXT_TIMEOUT = 10 * 60 * 1000; // 10 minutos
    this.FLOW_TIMEOUT = 3 * 60 * 1000; // 3 minutos para fluxos (espessura/seleção)
    
    // Carrega usuários saudados
    this.initUserState();
    
    // Limpa contextos expirados a cada 5 minutos
    setInterval(() => this.cleanupExpiredContexts(), 5 * 60 * 1000);
  }

  /**
   * Inicializa estado dos usuários
   */
  async initUserState() {
    await userStateService.load();
  }

  /**
   * Processa uma mensagem e retorna resposta apropriada
   * @param {string} from - ID do usuário
   * @param {string} sessionId - Sessão do WhatsApp
   * @param {string} message - Mensagem recebida
   * @returns {Promise<Object>} Resposta formatada
   */
  async processMessage(from, sessionId, message) {
    const context = this.getContext(from);
    
    // Verifica se é a primeira mensagem deste usuário (usa arquivo persistente)
    if (!userStateService.hasBeenGreeted(from)) {
      userStateService.markAsGreeted(from); // Não precisa await, salva async
      
      return {
        type: 'greeting',
        message: this.getGreetingMessage()
      };
    }
    
    // Verifica se há fluxo aguardando há muito tempo (timeout de 3 minutos)
    if (context && (context.awaitingSelection || context.awaitingThickness)) {
      const flowAge = Date.now() - context.timestamp;
      if (flowAge > this.FLOW_TIMEOUT) {
        this.clearContext(from);
        return {
          type: 'timeout',
          message: `⏰ *Tempo esgotado!*\n\n` +
                   `O fluxo de seleção expirou por inatividade.\n\n` +
                   `💡 Envie uma nova consulta quando precisar!`
        };
      }
    }
    
    // Se há contexto de material visualizado e mensagem menciona apenas "retalho" ou "chapa"
    if (context && context.lastViewedMaterial) {
      const msg = message.toLowerCase().trim();
      const isRequestingChapa = msg.includes('chapa') && !msg.includes('retalho');
      const isRequestingRetalho = msg.includes('retalho') && !msg.includes('chapa');
      
      if (isRequestingChapa || isRequestingRetalho) {
        const tipo = isRequestingChapa ? 'chapa' : 'retalho';
        return await this.showMaterialDetails(from, sessionId, context.lastViewedMaterial, tipo);
      }
    }
    
    // Analisa a mensagem
    const analysis = messageAnalyzerService.analyzeMessage(message);

    // PRIORIDADE 1: Se é seleção numérica e há contexto de seleção de material
    if (analysis.isNumericSelection && context && context.awaitingSelection) {
      return await this.handleNumericSelection(from, sessionId, analysis.selectedNumber);
    }

    // PRIORIDADE 2: Se está aguardando espessura, trata QUALQUER número como espessura
    if (context && context.awaitingThickness) {
      const thickness = parseInt(message.trim());
      if (!isNaN(thickness)) {
        return await this.handleThicknessSelection(from, sessionId, thickness);
      }
    }

    // PRIORIDADE 3: Se a mensagem for apenas um número sem contexto,
    // tenta buscar material pelo código (M{numero})
    if (analysis.isNumericSelection && 
        (!context || (!context.awaitingSelection && !context.awaitingThickness))) {
      const codeNum = analysis.selectedNumber;
      if (codeNum && !isNaN(codeNum)) {
        // Tenta carregar material pelo código
        const mat = await corteCertoService.loadMaterial(codeNum);
        if (mat) {
          // Encontrou material pelo código - mostra detalhes
          return await this.showMaterialDetails(from, sessionId, mat, 'ambos');
        } else {
          // Não encontrou material com esse código
          return {
            type: 'not_found',
            message: `❌ Material com código *${codeNum}* não encontrado.\n\n` +
                     `💡 Tente buscar pelo nome do material.\n` +
                     `Exemplo: "Branco Liso 18mm"`
          };
        }
      }
    }

    // Busca normal de material
    return await this.searchMaterial(from, sessionId, analysis);
  }

  /**
   * Busca material baseado na análise
   * @param {string} from - ID do usuário
   * @param {string} sessionId - Sessão
   * @param {Object} analysis - Análise da mensagem
   * @returns {Promise<Object>}
   */
  async searchMaterial(from, sessionId, analysis) {
    const { cor, espessura, tipo } = analysis;

    // Valida se tem informação mínima
    if (!cor) {
      return {
        type: 'error',
        message: messageAnalyzerService.getSuggestionMessage()
      };
    }

    // Busca materiais
    const materials = await corteCertoService.searchMaterials(cor, espessura);

    // Nenhum resultado - tenta busca mais ampla
    if (materials.length === 0) {
      // Tenta buscar apenas pela primeira palavra da cor
      const firstWord = cor.split(/\s+/)[0];
      if (firstWord && firstWord.length > 2 && firstWord !== cor) {
        const similarMaterials = await corteCertoService.searchMaterials(firstWord, espessura);
        
        if (similarMaterials.length > 0) {
          // Limita a 10 materiais
          const limitedMaterials = similarMaterials.slice(0, 10);
          
          // Salva no contexto para permitir seleção
          this.setContext(from, {
            awaitingSelection: true,
            materials: limitedMaterials,
            espessura
          });
          
          return {
            type: 'suggestions',
            message: this.formatSuggestionsMessage(cor, limitedMaterials, espessura)
          };
        }
      }
      
      return {
        type: 'not_found',
        message: this.formatNotFoundMessage(cor, espessura)
      };
    }

    // Resultado único - mostra diretamente
    if (materials.length === 1) {
      return await this.showMaterialDetails(from, sessionId, materials[0], tipo);
    }

    // Se tem espessura especificada mas múltiplos resultados
    if (espessura && materials.length > 1) {
      // Filtra exatamente pela espessura
      const exactMatches = materials.filter(m => m.espessura === espessura);
      
      if (exactMatches.length === 1) {
        return await this.showMaterialDetails(from, sessionId, exactMatches[0], tipo);
      }
      
      if (exactMatches.length > 1) {
        return this.showMaterialOptions(from, exactMatches, espessura);
      }
    }

    // Múltiplos resultados - agrupa por espessura
    const byThickness = this.groupByThickness(materials);

    // Se só tem uma espessura disponível
    if (Object.keys(byThickness).length === 1) {
      const thickness = Object.keys(byThickness)[0];
      const mats = byThickness[thickness];
      
      if (mats.length === 1) {
        return await this.showMaterialDetails(from, sessionId, mats[0], tipo);
      }
      
      return this.showMaterialOptions(from, mats, parseInt(thickness));
    }

    // Múltiplas espessuras - pede para especificar
    return this.askForThickness(from, byThickness, cor);
  }

  /**
   * Mostra detalhes completos de um material
   * @param {string} from - ID do usuário
   * @param {string} sessionId - Sessão
   * @param {Object} material - Material selecionado
   * @param {string} tipo - Tipo (chapa/retalho/ambos)
   * @returns {Promise<Object>}
   */
  async showMaterialDetails(from, sessionId, material, tipo) {
    const chapas = tipo !== 'retalho' ? await corteCertoService.loadChapas(material.codigo) : [];
    const retalhos = tipo !== 'chapa' ? await corteCertoService.loadRetalhos(material.codigo) : [];

    // Salva no contexto o último material visualizado (para permitir "mostre retalhos" depois)
    this.setContext(from, {
      lastViewedMaterial: material
    });

    return {
      type: 'material_details',
      material,
      chapas,
      retalhos,
      message: this.formatMaterialDetails(material, chapas, retalhos, tipo)
    };
  }

  /**
   * Mostra opções quando há múltiplos materiais
   * @param {string} from - ID do usuário
   * @param {Array} materials - Materiais encontrados
   * @param {number} espessura - Espessura
   * @returns {Object}
   */
  showMaterialOptions(from, materials, espessura) {
    // Salva contexto
    this.setContext(from, {
      awaitingSelection: true,
      materials,
      espessura
    });

    return {
      type: 'material_options',
      materials,
      message: this.formatMaterialOptions(materials, espessura)
    };
  }

  /**
   * Pede especificação de espessura
   * @param {string} from - ID do usuário
   * @param {Object} byThickness - Materiais agrupados por espessura
   * @param {string} cor - Cor buscada
   * @returns {Object}
   */
  askForThickness(from, byThickness, cor) {
    const thicknesses = Object.keys(byThickness).map(t => parseInt(t)).sort((a, b) => a - b);
    
    // Salva contexto
    this.setContext(from, {
      awaitingThickness: true,
      byThickness,
      cor,
      thicknesses
    });

    return {
      type: 'ask_thickness',
      thicknesses,
      message: this.formatThicknessQuestion(cor, thicknesses)
    };
  }

  /**
   * Processa seleção numérica de material
   * @param {string} from - ID do usuário
   * @param {string} sessionId - Sessão
   * @param {number} selection - Número selecionado
   * @returns {Promise<Object>}
   */
  async handleNumericSelection(from, sessionId, selection) {
    const context = this.getContext(from);
    
    if (!context || !context.materials) {
      return {
        type: 'error',
        message: '❌ Contexto perdido. Por favor, faça a busca novamente.'
      };
    }

    // Primeiro tenta encontrar por código do material (ex: M6 -> 6)
    const matchByCode = context.materials.find(m => parseInt(m.codigo) === selection);
    if (matchByCode) {
      return await this.showMaterialDetails(from, sessionId, matchByCode, 'ambos');
    }

    const index = selection - 1;

    if (index < 0 || index >= context.materials.length) {
      return {
        type: 'error',
        message: `❌ Opção inválida. Por favor, escolha entre 1 e ${context.materials.length}.`
      };
    }

    const material = context.materials[index];
    return await this.showMaterialDetails(from, sessionId, material, 'ambos');
  }

  /**
   * Processa seleção de espessura
   * @param {string} from - ID do usuário
   * @param {string} sessionId - Sessão
   * @param {number} thickness - Espessura selecionada
   * @returns {Promise<Object>}
   */
  async handleThicknessSelection(from, sessionId, thickness) {
    const context = this.getContext(from);
    
    if (!context || !context.byThickness) {
      return {
        type: 'error',
        message: '❌ Contexto perdido. Por favor, faça a busca novamente.'
      };
    }

    const materials = context.byThickness[thickness];
    
    if (!materials) {
      return {
        type: 'error',
        message: `❌ Espessura ${thickness}mm não disponível.`
      };
    }

    if (materials.length === 1) {
      return await this.showMaterialDetails(from, sessionId, materials[0], 'ambos');
    }

    return this.showMaterialOptions(from, materials, thickness);
  }

  /**
   * Agrupa materiais por espessura
   * @param {Array} materials - Lista de materiais
   * @returns {Object}
   */
  groupByThickness(materials) {
    return materials.reduce((acc, mat) => {
      if (!acc[mat.espessura]) {
        acc[mat.espessura] = [];
      }
      acc[mat.espessura].push(mat);
      return acc;
    }, {});
  }

  /**
   * Formata mensagem de material não encontrado
   */
  /**
   * Formata mensagem com sugestões de materiais semelhantes
   */
  formatSuggestionsMessage(searchTerm, materials, espessura) {
    let msg = `❌ *Material não encontrado*\n\n`;
    msg += `Busca: ${searchTerm}`;
    if (espessura) msg += ` ${espessura}mm`;
    msg += `\n\n`;
    
    msg += `🔍 *Materiais semelhantes encontrados:*\n\n`;
    
    // Emojis de números
    const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    
    // Agrupa por espessura
    const byThickness = {};
    materials.forEach(mat => {
      if (!byThickness[mat.espessura]) {
        byThickness[mat.espessura] = [];
      }
      byThickness[mat.espessura].push(mat);
    });
    
    // Exibe até 10 materiais
    let count = 0;
    for (const thickness in byThickness) {
      const mats = byThickness[thickness];
      for (const mat of mats) {
        if (count >= 10) break;
        const emoji = numberEmojis[count] || `${count + 1}.`;
        msg += `${emoji} ${mat.codigo} → *${mat.nome}* (${mat.espessura}mm)\n`;
        count++;
      }
      if (count >= 10) break;
    }
    
    msg += `\n💡 Digite o número para ver detalhes`;
    
    return msg;
  }

  formatNotFoundMessage(cor, espessura) {
    let msg = `❌ *Material não encontrado*\n\n`;
    msg += `Busca: ${cor}`;
    if (espessura) msg += ` ${espessura}mm`;
    msg += `\n\n`;
    msg += `💡 *Dica:* Tente buscar apenas pela cor principal.\n`;
    msg += `Exemplo: "Branco" em vez de "Branco Liso"`;
    return msg;
  }

  /**
   * Formata detalhes do material
   */
  formatMaterialDetails(material, chapas, retalhos, tipo) {
    let msg = `${material.codigo} → *${material.nome}*\n`;
    msg += `📏 Espessura: *${material.espessura}mm*\n`;

    // Veio: se giro=1 então não faz sentido de veio (rotacionável)
    if (material.giro === 1) {
      msg += `🌾 Veio: Sem (rotacionável)\n`;
    } else {
      const temVeio = material.veioHorizontal === true || material.veioVertical === true;
      if (temVeio) {
        msg += `🌾 Veio: ${material.veioHorizontal ? 'Horizontal' : 'Vertical'}\n`;
      }
    }
    
    msg += `\n`;

    // Chapas
    if (tipo !== 'retalho' && chapas.length > 0) {
      // Se existir a chapa base 2740x1840, mostre a quantityCandidate dessa linha
      const baseSheet = chapas.find(c => Math.round(c.altura) === 2740 && Math.round(c.largura) === 1840);
      if (baseSheet && baseSheet.quantityCandidate) {
        msg += `📦 *CHAPAS* (2740x1840): *${baseSheet.quantityCandidate} unidades*\n\n`;
      } else {
        msg += `📦 *CHAPAS INTEIRAS* (${chapas.length})\n\n`;
      }
    }

    // Retalhos
    if (tipo !== 'chapa' && retalhos.length > 0) {
      msg += `♻️ *RETALHOS* (${retalhos.length})\n`;
      msg += `━━━━━━━━━━━━━━━━━━\n`;
      
      // Ordena por área (maior primeiro)
      const sorted = retalhos.sort((a, b) => b.area - a.area);
      
      sorted.slice(0, 15).forEach((ret, i) => {
        const area = ret.area.toFixed(2);
        const dims = `${ret.altura.toFixed(0)}x${ret.largura.toFixed(0)}mm`;
        const qty = ret.quantidade > 1 ? ` x${ret.quantidade}` : '';
        const desc = ret.descricao ? ` | ${ret.descricao.toUpperCase()}` : '';
        
        msg += `${i + 1}. ${dims} (${area}m²)${qty}${desc}\n`;
      });
      
      if (retalhos.length > 15) {
        msg += `... e mais ${retalhos.length - 15} retalhos\n`;
      }
      msg += `\n`;
    }

    // Se não tem nada
    if (chapas.length === 0 && retalhos.length === 0) {
      msg += `⚠️ *Sem estoque no momento*\n`;
    }

    return msg;
  }

  /**
   * Formata opções de materiais
   */
  formatMaterialOptions(materials, espessura) {
    let msg = `🎨 *Encontrei ${materials.length} materiais*\n`;
    if (espessura) {
      msg += `📏 Espessura: ${espessura}mm\n`;
    }
    msg += `\n━━━━━━━━━━━━━━━━━━\n`;
    
    // Emojis de números
    const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    
    materials.forEach((mat, i) => {
      const emoji = numberEmojis[i] || `${i + 1}.`;
      msg += `${emoji} ${mat.codigo} → *${mat.nome}*`;
      if (!espessura) {
        msg += ` (${mat.espessura}mm)`;
      }
      msg += `\n`;
    });
    
    msg += `━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `💬 *Responda com o número* da opção desejada.`;
    
    return msg;
  }

  /**
   * Formata pergunta sobre espessura
   */
  formatThicknessQuestion(cor, thicknesses) {
    let msg = `📏 *Qual espessura?*\n\n`;
    msg += `Material: *${cor}*\n\n`;
    msg += `Espessuras disponíveis:\n`;
    
    thicknesses.forEach(t => {
      msg += `• ${t}mm\n`;
    });
    
    msg += `\n💬 *Responda com a espessura* (ex: 18)`;
    
    return msg;
  }

  /**
   * Obtém contexto de conversação
   */
  getContext(from) {
    const context = this.conversationContexts.get(from);
    
    if (!context) return null;
    
    // Verifica timeout (10 minutos para contexto geral)
    if (Date.now() - context.timestamp > this.CONTEXT_TIMEOUT) {
      this.clearContext(from);
      return null;
    }
    
    return context;
  }

  /**
   * Define contexto de conversação
   */
  setContext(from, data) {
    const existingContext = this.conversationContexts.get(from) || {};
    this.conversationContexts.set(from, {
      ...existingContext,
      ...data,
      timestamp: Date.now()
    });
  }

  /**
   * Limpa contexto de conversação
   */
  clearContext(from) {
    this.conversationContexts.delete(from);
  }

  /**
   * Limpa contextos expirados (executa periodicamente)
   */
  cleanupExpiredContexts() {
    const now = Date.now();
    
    for (const [from, context] of this.conversationContexts.entries()) {
      if (now - context.timestamp > this.CONTEXT_TIMEOUT) {
        this.conversationContexts.delete(from);
      }
    }
  }

  /**
   * Mensagem de apresentação do bot
   */
  getGreetingMessage() {
    return `👋 *Olá! Sou o Bot de Estoque ONN*\n\n` +
           `Estou aqui para ajudar você a consultar nosso estoque de materiais de forma rápida e prática!\n\n` +
           `📦 *O que posso fazer:*\n` +
           `• Consultar chapas inteiras disponíveis\n` +
           `• Mostrar retalhos em estoque\n` +
           `• Informar espessuras e dimensões\n` +
           `• Indicar direção do veio (quando aplicável)\n\n` +
           `💬 *Como usar:*\n` +
           `Envie o nome do material e espessura\n` +
           `Exemplo: "Branco Liso 18mm" ou "Noite Guara 18"\n\n` +
           `🔍 *Dica:* Se não souber a espessura exata, envie apenas o nome do material e eu mostro as opções disponíveis!\n\n` +
           `Pronto para começar? Envie sua consulta! 🚀`;
  }
}

module.exports = new MaterialSearchService();
