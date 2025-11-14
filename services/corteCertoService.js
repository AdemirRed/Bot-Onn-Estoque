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
        preco: parseFloat(material.PROP_COMERC?.PRECO_CHAPA) || 0
      };
    } catch (error) {
      return null;
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
