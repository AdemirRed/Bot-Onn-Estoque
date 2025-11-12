const fs = require('fs').promises;
const path = require('path');
const corteCertoService = require('./corteCertoService');

/**
 * Serviço para geração de relatórios de estoque
 */
class ReportService {
  constructor() {
    this.reportsPath = path.join(__dirname, '..', 'reports');
    this.ensureReportsFolder();
  }

  /**
   * Garante que a pasta de relatórios existe
   */
  async ensureReportsFolder() {
    try {
      await fs.mkdir(this.reportsPath, { recursive: true });
    } catch (error) {
      console.error('Erro ao criar pasta de relatórios:', error.message);
    }
  }

  /**
   * Gera relatório de estoque
   * @param {Object} options - Opções do relatório
   * @returns {Promise<Object>} Caminho do arquivo gerado
   */
  async generateReport(options) {
    const {
      material = null,      // Código do material ou null para todos
      cor = null,           // Nome/cor do material para busca
      espessura = null,     // Espessura específica ou null para todas
      tipo = 'ambos'        // 'chapa', 'retalho' ou 'ambos'
    } = options;

    let data;
    
    if (material) {
      // Relatório de material específico por código
      data = await this.getReportDataForMaterial(material, tipo);
    } else if (cor) {
      // Relatório de material por nome/cor
      data = await this.getReportDataByName(cor, espessura, tipo);
    } else if (espessura) {
      // Relatório por espessura (todos materiais)
      data = await this.getReportDataByThickness(espessura, tipo);
    } else {
      // Relatório geral (todos materiais, todas espessuras)
      data = await this.getReportDataGeneral(tipo);
    }

    // Gera HTML
    const html = this.generateHTML(data, options);
    const filename = this.generateFilename(options);
    const filepath = path.join(this.reportsPath, filename);

    await fs.writeFile(filepath, html, 'utf-8');

    return {
      filepath,
      filename,
      summary: this.generateSummary(data)
    };
  }

  /**
   * Dados de material específico
   */
  async getReportDataForMaterial(codigo, tipo) {
    const material = await corteCertoService.loadMaterial(codigo);
    if (!material) return null;

    const chapas = tipo !== 'retalho' ? await corteCertoService.loadChapas(codigo) : [];
    const retalhos = tipo !== 'chapa' ? await corteCertoService.loadRetalhos(codigo) : [];

    return {
      type: 'material',
      materials: [{ material, chapas, retalhos }]
    };
  }

  /**
   * Dados por nome/cor do material
   */
  async getReportDataByName(cor, espessura, tipo) {
    const materials = await corteCertoService.searchMaterials(cor, espessura);

    const data = [];
    for (const material of materials) {
      const chapas = tipo !== 'retalho' ? await corteCertoService.loadChapas(material.codigo) : [];
      const retalhos = tipo !== 'chapa' ? await corteCertoService.loadRetalhos(material.codigo) : [];
      data.push({ material, chapas, retalhos });
    }

    return {
      type: 'by_name',
      cor,
      espessura,
      materials: data
    };
  }

  /**
   * Dados por espessura
   */
  async getReportDataByThickness(espessura, tipo) {
    console.log(`🔍 Buscando relatório por espessura: ${espessura}mm, tipo: ${tipo}`);
    
    const allMaterials = await corteCertoService.loadAllMaterials();
    console.log(`📦 Total de materiais carregados: ${allMaterials.length}`);
    
    const filtered = allMaterials.filter(m => m.espessura === espessura);
    console.log(`📊 Materiais filtrados com ${espessura}mm: ${filtered.length}`);

    const data = [];
    for (const material of filtered) {
      const chapas = tipo !== 'retalho' ? await corteCertoService.loadChapas(material.codigo) : [];
      const retalhos = tipo !== 'chapa' ? await corteCertoService.loadRetalhos(material.codigo) : [];
      console.log(`  • ${material.codigo}: ${chapas.length} chapas, ${retalhos.length} retalhos`);
      data.push({ material, chapas, retalhos });
    }

    console.log(`✅ Relatório gerado com ${data.length} materiais`);

    return {
      type: 'thickness',
      espessura,
      materials: data
    };
  }

  /**
   * Dados gerais
   */
  async getReportDataGeneral(tipo) {
    const allMaterials = await corteCertoService.loadAllMaterials();

    const data = [];
    for (const material of allMaterials.slice(0, 50)) { // Limita a 50 para não travar
      const chapas = tipo !== 'retalho' ? await corteCertoService.loadChapas(material.codigo) : [];
      const retalhos = tipo !== 'chapa' ? await corteCertoService.loadRetalhos(material.codigo) : [];
      data.push({ material, chapas, retalhos });
    }

    return {
      type: 'general',
      materials: data
    };
  }

  /**
   * Gera nome do arquivo
   */
  generateFilename(options) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    let name = 'relatorio-estoque';
    
    if (options.material) {
      name += `-M${options.material}`;
    } else if (options.espessura) {
      name += `-${options.espessura}mm`;
    } else {
      name += '-geral';
    }
    
    name += `-${options.tipo}`;
    name += `-${timestamp}.html`;
    
    return name;
  }

  /**
   * Gera HTML do relatório
   */
  generateHTML(data, options) {
    if (!data || !data.materials || data.materials.length === 0) {
      return this.generateEmptyHTML();
    }

    const tipo = options.tipo || 'ambos';
    const tipoText = tipo === 'chapa' ? 'Chapas' : tipo === 'retalho' ? 'Retalhos' : 'Chapas e Retalhos';

    let html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório de Estoque - ONN Móveis</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { border-bottom: 3px solid #00796b; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #00796b; font-size: 28px; margin-bottom: 10px; }
    .header .info { color: #666; font-size: 14px; }
    .material-card { 
      border: 1px solid #e0e0e0; 
      border-radius: 8px; 
      padding: 20px; 
      margin-bottom: 20px;
      background: #fafafa;
    }
    .material-header { 
      background: #00796b; 
      color: white; 
      padding: 15px; 
      border-radius: 6px;
      margin-bottom: 15px;
    }
    .material-header h2 { font-size: 20px; margin-bottom: 5px; }
    .material-header .code { font-size: 16px; opacity: 0.9; }
    .material-info { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
    .info-item { background: white; padding: 12px; border-radius: 6px; border-left: 4px solid #00796b; }
    .info-item .label { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 5px; }
    .info-item .value { font-size: 18px; font-weight: bold; color: #333; }
    .section { margin-top: 20px; }
    .section-title { 
      font-size: 16px; 
      color: #00796b; 
      margin-bottom: 10px;
      padding: 8px;
      background: #e0f2f1;
      border-radius: 4px;
    }
    table { width: 100%; border-collapse: collapse; background: white; }
    th { background: #00796b; color: white; padding: 12px; text-align: left; font-weight: 600; }
    td { padding: 10px 12px; border-bottom: 1px solid #e0e0e0; }
    tr:hover { background: #f5f5f5; }
    .empty { text-align: center; padding: 20px; color: #999; font-style: italic; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #e0e0e0; text-align: center; color: #666; font-size: 12px; }
    @media print {
      body { padding: 0; background: white; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Relatório de Estoque - ONN Móveis</h1>
      <div class="info">
        <p><strong>Tipo:</strong> ${tipoText}</p>
        <p><strong>Gerado em:</strong> ${new Date().toLocaleString('pt-BR')}</p>
      </div>
    </div>
`;

    // Adiciona materiais
    for (const item of data.materials) {
      const { material, chapas, retalhos } = item;
      
      html += `
    <div class="material-card">
      <div class="material-header">
        <div class="code">Código: ${material.codigo}</div>
        <h2>${material.nome}</h2>
      </div>
      
      <div class="material-info">
        <div class="info-item">
          <div class="label">Espessura</div>
          <div class="value">${material.espessura}mm</div>
        </div>`;

      if (material.giro === 1) {
        html += `
        <div class="info-item">
          <div class="label">Veio</div>
          <div class="value">Rotacionável</div>
        </div>`;
      } else if (material.veioHorizontal || material.veioVertical) {
        html += `
        <div class="info-item">
          <div class="label">Veio</div>
          <div class="value">${material.veioHorizontal ? 'Horizontal' : 'Vertical'}</div>
        </div>`;
      }

      // Chapas
      if (tipo !== 'retalho' && chapas.length > 0) {
        const qtdChapas = chapas[0]?.quantityCandidate || 0;
        html += `
        <div class="info-item">
          <div class="label">Chapas em Estoque</div>
          <div class="value">${qtdChapas} un</div>
        </div>`;
      }

      // Retalhos
      if (tipo !== 'chapa' && retalhos.length > 0) {
        html += `
        <div class="info-item">
          <div class="label">Retalhos em Estoque</div>
          <div class="value">${retalhos.length} pçs</div>
        </div>`;
      }

      html += `
      </div>`;

      // Tabela de retalhos
      if (tipo !== 'chapa' && retalhos.length > 0) {
        html += `
      <div class="section">
        <div class="section-title">♻️ Retalhos Disponíveis</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Dimensões</th>
              <th>Área</th>
              <th>Quantidade</th>
              <th>Descrição</th>
            </tr>
          </thead>
          <tbody>`;
        
        retalhos.forEach((ret, i) => {
          const width = ret.largura || ret.width || 0;
          const height = ret.altura || ret.height || 0;
          const quantity = ret.quantidade || ret.quantity || 1;
          const description = ret.descricao || ret.description || '-';
          
          html += `
            <tr>
              <td>${i + 1}</td>
              <td>${Math.round(width)}x${Math.round(height)}mm</td>
              <td>${ret.area ? ret.area.toFixed(2) : '0.00'}m²</td>
              <td>${quantity}</td>
              <td>${description}</td>
            </tr>`;
        });

        html += `
          </tbody>
        </table>
      </div>`;
      }

      html += `
    </div>`;
    }

    html += `
    <div class="footer">
      <p>Relatório gerado automaticamente pelo Bot de Estoque ONN</p>
      <p>© ${new Date().getFullYear()} ONN Móveis - Todos os direitos reservados</p>
    </div>
  </div>
</body>
</html>`;

    return html;
  }

  /**
   * HTML vazio
   */
  generateEmptyHTML() {
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Sem Dados</title></head>
<body><h1>Nenhum dado encontrado</h1></body></html>`;
  }

  /**
   * Gera resumo do relatório
   */
  generateSummary(data) {
    if (!data || !data.materials) {
      console.log('⚠️ Dados vazios no generateSummary');
      return 'Sem dados';
    }

    console.log(`📊 Gerando resumo para ${data.materials.length} materiais`);

    const totalMaterials = data.materials.length;
    let totalChapas = 0;
    let totalRetalhos = 0;

    for (const item of data.materials) {
      if (item.chapas && item.chapas.length > 0) {
        // Soma TODAS as chapas, não apenas a primeira
        for (const chapa of item.chapas) {
          totalChapas += chapa.quantityCandidate || 0;
        }
      }
      if (item.retalhos) {
        totalRetalhos += item.retalhos.length;
      }
    }

    console.log(`📦 Resumo: ${totalMaterials} materiais, ${totalChapas} chapas, ${totalRetalhos} retalhos`);

    return `📊 *Resumo:*\n` +
           `• ${totalMaterials} materiais\n` +
           `• ${totalChapas} chapas\n` +
           `• ${totalRetalhos} retalhos`;
  }
}

module.exports = new ReportService();

module.exports = new ReportService();
