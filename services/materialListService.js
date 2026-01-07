const fs = require('fs').promises;
const path = require('path');
const PDFDocument = require('pdfkit');
const corteCertoService = require('./corteCertoService');
const { startAnimatedLoading, sendCompletionMessage } = require('../utils/loadingIndicator');

/**
 * Serviço para gerar lista de materiais em PDF
 * Similar ao ExportarPlaniliaCorteCerto.py
 */
class MaterialListService {
  constructor() {
    this.listsPath = path.join(__dirname, '..', 'lists');
    this.ensureListsDirectory();
  }

  /**
   * Garante que o diretório de listas existe
   */
  async ensureListsDirectory() {
    try {
      await fs.mkdir(this.listsPath, { recursive: true });
    } catch (error) {
      console.error('Erro ao criar diretório de listas:', error);
    }
  }

  /**
   * Gera PDF com lista de materiais ordenada alfabeticamente
   * @param {Object} options - Opções de filtro
   * @returns {Promise<Object>} Caminho do arquivo e resumo
   */
  async generateMaterialList(options = {}) {
    const { espessura = null, includeCode = true, sessionId = null, chatId = null } = options;

    // Start animated loading if session and chat IDs are provided
    let loadingController = null;
    if (sessionId && chatId) {
      loadingController = await startAnimatedLoading(sessionId, chatId, 'Gerando lista de materiais', 10, 2000);
    }

    console.log('📋 Gerando lista de materiais...');

    // Carrega todos os materiais
    let materials = await corteCertoService.loadAllMaterials();

    if (materials.length === 0) {
      throw new Error('Nenhum material encontrado no banco de dados');
    }

    // Filtra por espessura se especificada
    if (espessura !== null) {
      materials = materials.filter(m => m.espessura === espessura);
      if (materials.length === 0) {
        throw new Error(`Nenhum material encontrado com espessura ${espessura}mm`);
      }
    }

    console.log(`📋 Materiais para PDF: ${materials.length} (espessura: ${espessura || 'todas'})`);

    // Ordena alfabeticamente por nome (natural sort)
    materials.sort((a, b) => {
      return a.nome.localeCompare(b.nome, 'pt-BR', { 
        numeric: true, 
        sensitivity: 'base' 
      });
    });

    // Gera o PDF
    const filename = this.generateFilename(options);
    const filepath = path.join(this.listsPath, filename);

    await this.createPDF(materials, filepath, options);

    console.log(`✅ Lista gerada: ${materials.length} materiais`);

    // Finish loading at 100% and send completion message
    if (loadingController) {
      await loadingController.finishLoading();
    }
    if (sessionId && chatId) {
      await sendCompletionMessage(sessionId, chatId, 'Lista de materiais', true);
    }

    return {
      filepath,
      filename,
      summary: {
        total: materials.length,
        espessura: espessura || 'Todas'
      }
    };
  }

  /**
   * Cria o arquivo PDF
   */
  async createPDF(materials, filepath, options) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 60, left: 30, right: 30 }
      });

      const stream = require('fs').createWriteStream(filepath);
      doc.pipe(stream);

      // Título da primeira página
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Lista de Materiais (Ordenada Alfabeticamente)', { align: 'center' });

      if (options.espessura) {
        doc.fontSize(10)
           .font('Helvetica')
           .text(`Espessura: ${options.espessura}mm`, { align: 'center' });
      }

      doc.moveDown(0.5);
      doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).stroke();
      doc.moveDown(1);

      // Configurações
      doc.fontSize(10).font('Helvetica');
      const lineHeight = 15;
      const startY = doc.y;
      const linesPerPage = Math.floor((doc.page.height - startY - 60) / lineHeight);
      const itemsPerPage = linesPerPage * 2; // 2 colunas
      
      console.log(`📄 PDF iniciado: ${materials.length} materiais`);
      console.log(`📄 Linhas por página: ${linesPerPage}, Itens por página: ${itemsPerPage}`);
      
      // Calcula número de páginas necessárias
      const totalPages = Math.ceil(materials.length / itemsPerPage);
      console.log(`📊 Páginas necessárias: ${totalPages} para ${materials.length} materiais`);

      let currentPage = 0;
      let itemsInPage = 0;
      let currentY = startY;
      let currentColumn = 0; // 0 = esquerda, 1 = direita

      // Processa cada material
      for (let i = 0; i < materials.length; i++) {
        // Inicia nova página se necessário (só se ainda há muitos itens restantes)
        const itemsRemaining = materials.length - i - 1;
        if (itemsInPage >= itemsPerPage && itemsRemaining > 10) {
          console.log(`📄 Criando nova página: item ${i}, restantes=${itemsRemaining}, itemsInPage=${itemsInPage}`);
          doc.addPage();
          currentPage++;
          itemsInPage = 0;
          currentY = 40;
          currentColumn = 0;
        }

        const material = materials[i];
        let nome = material.nome.replace(/\bMDF\b/gi, '').trim();
        const text = `${material.codigo} = ${nome} ${material.espessura}mm`;

        // Posição X baseada na coluna
        const x = currentColumn === 0 ? 30 : 320;

        // Escreve o texto
        doc.text(text, x, currentY, { width: 280, lineBreak: false, ellipsis: true });

        // Próxima posição
        currentColumn = 1 - currentColumn; // Alterna entre 0 e 1
        if (currentColumn === 0) {
          currentY += lineHeight; // Nova linha
        }

        itemsInPage++;
        
        if (i < 10 || i === materials.length - 1) {
          console.log(`Item ${i+1}: ${material.codigo}, página=${currentPage+1}, itemsInPage=${itemsInPage}`);
        }
      }

      console.log(`🏁 Fim: ${materials.length} materiais em ${currentPage + 1} páginas`);

      // Finaliza
      doc.end();

      stream.on('finish', () => {
        console.log(`✅ PDF gerado com ${currentPage + 1} páginas`);
        resolve();
      });
      stream.on('error', reject);
    });
  }

  /**
   * Gera nome do arquivo
   */
  generateFilename(options) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    let name = 'lista-materiais';

    if (options.espessura) {
      name += `-${options.espessura}mm`;
    }

    return `${name}-${timestamp}.pdf`;
  }
}

module.exports = new MaterialListService();
