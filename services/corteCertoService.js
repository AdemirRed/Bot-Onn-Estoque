const fs = require('fs').promises;
const path = require('path');
const config = require('../config');

// Caminho base do banco de dados do Corte Certo (configurável)
const DB_PATH = config.databasePath;
const MAT_PATH = path.join(DB_PATH, config.materialsFolder);
const CHP_PATH = path.join(DB_PATH, config.chapasFolder);

/**
 * Serviço para leitura e manipulação dos arquivos do Corte Certo
 */
class CorteCertoService {
  constructor() {
    this.materialsCache = null;
    this.cacheTime = null;
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
  }

  /**
   * Carrega todos os materiais do banco de dados
   * @returns {Promise<Array>} Lista de materiais
   */
  async loadAllMaterials() {
    // Retorna cache se válido
    if (this.materialsCache && this.cacheTime && 
        (Date.now() - this.cacheTime) < this.CACHE_DURATION) {
      return this.materialsCache;
    }

    const materials = [];
    
    try {
      const files = await fs.readdir(MAT_PATH);
      const iniFiles = files.filter(f => f.startsWith('M') && f.endsWith('.INI'));

      for (const file of iniFiles) {
        try {
          const codigo = this.extractCode(file);
          const material = await this.loadMaterial(codigo);
          
          if (material && material.nome) {
            materials.push(material);
          }
        } catch (err) {
          // Ignora arquivos com erro
          console.error(`Erro ao ler ${file}:`, err.message);
        }
      }

      // Atualiza cache
      this.materialsCache = materials;
      this.cacheTime = Date.now();

      console.log(`✅ Carregados ${materials.length} materiais do Corte Certo`);
      return materials;
    } catch (error) {
      console.error('❌ Erro ao carregar materiais:', error);
      return [];
    }
  }

  /**
   * Extrai o código numérico do nome do arquivo
   * @param {string} filename - Nome do arquivo (ex: M259.INI)
   * @returns {string} Código (ex: 259)
   */
  extractCode(filename) {
    const match = filename.match(/M(\d+)\.INI/i);
    return match ? match[1] : null;
  }

  /**
   * Carrega um material específico pelo código
   * @param {string} codigo - Código do material
   * @returns {Promise<Object>} Dados do material
   */
  async loadMaterial(codigo) {
    const iniPath = path.join(MAT_PATH, `M${codigo}.INI`);
    
    try {
      const content = await fs.readFile(iniPath, 'utf-8');
      const material = this.parseINI(content);
      
      return {
        codigo,
        nome: material.DESC?.CAMPO1 || '',
        familia: material.DESC?.FAMILIA || '',
        espessura: parseInt(material.PROP_FISIC?.ESPESSURA) || 0,
        veioHorizontal: material.PROP_FISIC?.VEIO_HORIZONTAL === '1',
        veioVertical: material.PROP_FISIC?.VEIO_VERTICAL === '1',
        giro: parseInt(material.PROP_FISIC?.GIRO) || 0,
        preco: parseFloat(material.PROP_COMERC?.PRECO_CHAPA) || 0,
        qtdMinChp: parseInt(material.ESTOQUE?.QTD_MIN_CHP) || config.minStockQuantity
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Lê a quantidade mínima de estoque do arquivo .INI
   * @param {string} codigo - Código do material
   * @returns {Promise<number>} Quantidade mínima configurada
   */
  async getMinStockQuantity(codigo) {
    const material = await this.loadMaterial(codigo);
    return material?.qtdMinChp || config.minStockQuantity;
  }

  /**
   * Atualiza a quantidade mínima de estoque no arquivo .INI
   * @param {string} codigo - Código do material
   * @param {number} newQuantity - Nova quantidade mínima
   * @returns {Promise<boolean>} Sucesso da operação
   */
  async updateMinStockQuantity(codigo, newQuantity) {
    const iniPath = path.join(MAT_PATH, `M${codigo}.INI`);
    
    try {
      const content = await fs.readFile(iniPath, 'utf-8');
      const lines = content.split('\n');
      let updated = false;
      let inEstoqueSection = false;
      
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        
        // Detecta seção [ESTOQUE]
        if (trimmed === '[ESTOQUE]') {
          inEstoqueSection = true;
          continue;
        }
        
        // Nova seção encontrada
        if (trimmed.startsWith('[') && inEstoqueSection) {
          // Se não achou QTD_MIN_CHP, adiciona antes da próxima seção
          if (!updated) {
            lines.splice(i, 0, `QTD_MIN_CHP=${newQuantity}`);
            updated = true;
          }
          break;
        }
        
        // Atualiza QTD_MIN_CHP na seção [ESTOQUE]
        if (inEstoqueSection && trimmed.startsWith('QTD_MIN_CHP=')) {
          lines[i] = `QTD_MIN_CHP=${newQuantity}`;
          updated = true;
          break;
        }
      }
      
      // Se não encontrou seção [ESTOQUE], adiciona no final
      if (!updated) {
        lines.push('[ESTOQUE]');
        lines.push(`QTD_MIN_CHP=${newQuantity}`);
        updated = true;
      }
      
      // Salva arquivo
      await fs.writeFile(iniPath, lines.join('\n'), 'utf-8');
      console.log(`✅ QTD_MIN_CHP atualizado para ${newQuantity} no material ${codigo}`);
      
      // Limpa cache para forçar reload
      this.clearCache();
      
      return true;
    } catch (error) {
      console.error(`❌ Erro ao atualizar QTD_MIN_CHP do material ${codigo}:`, error.message);
      return false;
    }
  }

  /**
   * Parse de arquivo INI
   * @param {string} content - Conteúdo do arquivo
   * @returns {Object} Objeto com seções e valores
   */
  parseINI(content) {
    const result = {};
    let currentSection = null;

    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Seção
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        currentSection = trimmed.slice(1, -1);
        result[currentSection] = {};
      }
      // Propriedade
      else if (trimmed.includes('=') && currentSection) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').trim();
        result[currentSection][key.trim()] = value;
      }
    }

    return result;
  }

  /**
   * Carrega chapas de um material específico
   * @param {string} codigo - Código do material
   * @returns {Promise<Array>} Lista de chapas
   */
  async loadChapas(codigo) {
    // Padroniza código com zeros à esquerda (ex: 1 -> 00001, 259 -> 00259)
    const paddedCode = codigo.toString().padStart(5, '0');
    const chapasPath = path.join(CHP_PATH, `CHP${paddedCode}.TAB`);
    
    try {
      const content = await fs.readFile(chapasPath, 'utf-8');
      const lines = content.trim().split('\n').filter(l => l.trim());
      
      return lines.map(line => {
        const parts = line.trim().split(/\s+/);
        // parts[2] pode representar código do material ou um valor placeholder (ex: 9999)
        const rawThird = parts[2];
        return {
          ativo: parts[0] === '1',
          numero: parseInt(parts[1]),
          codigoMaterial: parseInt(parts[2]) || null,
          quantityCandidate: parseInt(rawThird) || 0,
          altura: parseFloat(parts[3]),
          largura: parseFloat(parts[4]),
          descricao: parts.slice(5).join(' '),
          rawLine: line
        };
      }).filter(c => c.ativo);
    } catch (error) {
      return [];
    }
  }

  /**
   * Carrega retalhos de um material específico
   * @param {string} codigo - Código do material
   * @returns {Promise<Array>} Lista de retalhos
   */
  async loadRetalhos(codigo) {
    // Padroniza código com zeros à esquerda (ex: 1 -> 00001, 259 -> 00259)
    const paddedCode = codigo.toString().padStart(5, '0');
    const retalhosPath = path.join(CHP_PATH, `RET${paddedCode}.TAB`);
    
    try {
      const content = await fs.readFile(retalhosPath, 'utf-8');
      const lines = content.trim().split('\n').filter(l => l.trim());
      
      return lines.map(line => {
        const parts = line.split(',');
        return {
          numero: parseInt(parts[0]),
          ativo: parts[1] === '+',
          quantidade: parseInt(parts[2]),
          altura: parseFloat(parts[3]),
          largura: parseFloat(parts[4]),
          descricao: parts[5]?.trim() || '',
          area: parseFloat(parts[3]) * parseFloat(parts[4]) / 1000000 // m²
        };
      }).filter(r => r.ativo && r.quantidade > 0);
    } catch (error) {
      return [];
    }
  }

  /**
   * Busca materiais por nome (busca parcial)
   * @param {string} searchTerm - Termo de busca
   * @param {number} espessura - Espessura (opcional)
   * @returns {Promise<Array>} Materiais encontrados
   */
  async searchMaterials(searchTerm, espessura = null) {
    const materials = await this.loadAllMaterials();
    const normalizedSearch = this.normalizeText(searchTerm);

    let results = materials.filter(m => {
      const normalizedName = this.normalizeText(m.nome);
      return normalizedName.includes(normalizedSearch);
    });

    // Filtra por espessura se especificada
    if (espessura !== null) {
      results = results.filter(m => m.espessura === espessura);
    }

    return results;
  }

  /**
   * Normaliza texto para busca (remove acentos, converte para minúsculas)
   * @param {string} text - Texto a normalizar
   * @returns {string} Texto normalizado
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
   * Atualiza a quantidade de chapas no arquivo .TAB
   * @param {string} codigo - Código do material
   * @param {number} quantityToAdd - Quantidade a adicionar
   * @returns {Promise<Object>} Resultado da operação
   */
  async updateStockQuantity(codigo, quantityToAdd) {
    const paddedCode = codigo.toString().padStart(5, '0');
    const chapasPath = path.join(CHP_PATH, `CHP${paddedCode}.TAB`);
    
    try {
      // Lê arquivo atual
      const content = await fs.readFile(chapasPath, 'utf-8');
      const lines = content.split('\n');
      
      let updatedLines = 0;
      let oldQuantity = 0;
      let newQuantity = 0;
      
      // Processa cada linha
      const modifiedLines = lines.map(line => {
        if (!line.trim()) return line;
        
        const parts = line.trim().split(/\s+/);
        
        // Verifica se é uma linha válida (tem pelo menos 5 campos)
        if (parts.length >= 5 && parts[0] === '1') {
          const currentQty = parseInt(parts[2]);
          
          // Atualiza apenas se for a quantidade base (chapa inteira 2740x1840)
          const altura = parseFloat(parts[3]);
          const largura = parseFloat(parts[4]);
          
          // Identifica chapas base (2740-2747 x 1840-1847)
          if (altura >= 2740 && altura <= 2747 && largura >= 1840 && largura <= 1847) {
            if (updatedLines === 0) {
              oldQuantity = currentQty;
            }
            
            newQuantity = currentQty + quantityToAdd;
            
            // Procura pelo padrão: número seguido de espaços
            // Substitui o terceiro campo numérico mantendo os espaços
            let fieldCount = 0;
            let result = '';
            let i = 0;
            
            while (i < line.length) {
              // Encontra início de um número
              if (line[i] >= '0' && line[i] <= '9') {
                let numStart = i;
                let numStr = '';
                
                // Coleta o número completo
                while (i < line.length && line[i] >= '0' && line[i] <= '9') {
                  numStr += line[i];
                  i++;
                }
                
                fieldCount++;
                
                // Se é o terceiro campo (quantidade), substitui
                if (fieldCount === 3) {
                  const oldNumLength = numStr.length;
                  const newNumStr = newQuantity.toString();
                  const spacesToAdd = oldNumLength - newNumStr.length;
                  
                  result += newNumStr;
                  // Adiciona espaços extras se o novo número for menor
                  if (spacesToAdd > 0) {
                    result += ' '.repeat(spacesToAdd);
                  }
                  updatedLines++;
                } else {
                  result += numStr;
                }
              } else {
                result += line[i];
                i++;
              }
            }
            
            return result;
          }
        }
        
        return line;
      });
      
      if (updatedLines === 0) {
        return {
          success: false,
          message: 'Nenhuma chapa base encontrada para atualizar',
          oldQuantity: 0,
          newQuantity: 0,
          linesUpdated: 0
        };
      }
      
      // Salva arquivo atualizado
      await fs.writeFile(chapasPath, modifiedLines.join('\n'), 'utf-8');
      
      console.log(`✅ Estoque atualizado: Material ${codigo}, ${oldQuantity} -> ${newQuantity} (${updatedLines} linhas)`);
      
      // Limpa cache
      this.clearCache();
      
      return {
        success: true,
        message: 'Estoque atualizado com sucesso',
        oldQuantity,
        newQuantity,
        linesUpdated: updatedLines
      };
      
    } catch (error) {
      console.error(`❌ Erro ao atualizar estoque do material ${codigo}:`, error.message);
      return {
        success: false,
        message: `Erro: ${error.message}`,
        oldQuantity: 0,
        newQuantity: 0,
        linesUpdated: 0
      };
    }
  }

  /**
   * Limpa o cache de materiais
   */
  clearCache() {
    this.materialsCache = null;
    this.cacheTime = null;
  }

  /**
   * Retorna estatísticas do cache
   * @returns {Object} Estatísticas do cache
   */
  getCacheStats() {
    const now = Date.now();
    const isValid = this.cacheTime && (now - this.cacheTime < this.CACHE_DURATION);
    
    return {
      materialsCount: this.materialsCache ? Object.keys(this.materialsCache).length : 0,
      chapasCount: this.chapasCache ? Object.keys(this.chapasCache).length : 0,
      retalhosCount: this.retalhosCache ? Object.keys(this.retalhosCache).length : 0,
      cacheTime: this.cacheTime,
      isCacheValid: isValid
    };
  }
}

module.exports = new CorteCertoService();
