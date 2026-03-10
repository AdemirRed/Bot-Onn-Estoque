const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const corteCertoService = require('./corteCertoService');
const messageService = require('./messageService');

/**
 * Serviço para alertas de estoque mínimo
 * Monitora materiais selecionados e envia notificações quando o estoque fica abaixo do mínimo
 */
class StockAlertService {
  constructor() {
    this.monitoredMaterialsPath = path.join(__dirname, '..', 'data', 'monitored-materials.json');
    this.alertStatePath = path.join(__dirname, '..', 'data', 'alert-state.json');
    this.monitoredMaterials = [];
    this.alertState = [];
  }

  /**
   * Carrega materiais monitorados do JSON
   */
  async loadMonitoredMaterials() {
    try {
      const content = await fs.readFile(this.monitoredMaterialsPath, 'utf-8');
      const data = JSON.parse(content);
      this.monitoredMaterials = data.materials || [];
      console.log(`✅ Carregados ${this.monitoredMaterials.length} materiais monitorados`);
      return this.monitoredMaterials;
    } catch (error) {
      console.error('❌ Erro ao carregar materiais monitorados:', error.message);
      this.monitoredMaterials = [];
      return [];
    }
  }

  /**
   * Salva materiais monitorados no JSON
   */
  async saveMonitoredMaterials() {
    try {
      const data = { materials: this.monitoredMaterials };
      await fs.writeFile(this.monitoredMaterialsPath, JSON.stringify(data, null, 2), 'utf-8');
      console.log('✅ Materiais monitorados salvos');
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar materiais monitorados:', error.message);
      return false;
    }
  }

  /**
   * Carrega estado dos alertas do JSON
   */
  async loadAlertState() {
    try {
      const content = await fs.readFile(this.alertStatePath, 'utf-8');
      const data = JSON.parse(content);
      this.alertState = data.alerts || [];
      console.log(`✅ Carregados ${this.alertState.length} estados de alerta`);
      return this.alertState;
    } catch (error) {
      console.error('❌ Erro ao carregar estado de alertas:', error.message);
      this.alertState = [];
      return [];
    }
  }

  /**
   * Salva estado dos alertas no JSON
   */
  async saveAlertState() {
    try {
      const data = { alerts: this.alertState };
      await fs.writeFile(this.alertStatePath, JSON.stringify(data, null, 2), 'utf-8');
      console.log('✅ Estado de alertas salvo');
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar estado de alertas:', error.message);
      return false;
    }
  }

  /**
   * Obtém ou cria estado de um material
   */
  getOrCreateAlertState(codigo) {
    let state = this.alertState.find(s => s.codigo === codigo);
    if (!state) {
      state = {
        codigo,
        lastAlertDate: null,
        currentQuantity: 0,
        purchaseConfirmed: false,
        purchaseConfirmedDate: null
      };
      this.alertState.push(state);
    }
    return state;
  }

  /**
   * Verifica o estoque de um material e retorna informações
   */
  async checkMaterialStock(material) {
    try {
      const chapas = await corteCertoService.loadChapas(material.codigo);
      
      // Encontra a chapa base 2740x1840 que contém a quantidade total
      const baseSheet = chapas.find(c => 
        Math.round(c.altura) === 2740 && Math.round(c.largura) === 1840
      );
      
      const quantity = baseSheet?.quantityCandidate || 0;
      const materialInfo = await corteCertoService.loadMaterial(material.codigo);
      
      // Usa quantidade mínima do arquivo .INI do material
      const minQuantity = materialInfo?.qtdMinChp || config.minStockQuantity;
      
      return {
        codigo: material.codigo,
        nome: materialInfo?.nome || material.nome,
        quantity,
        minQuantity,
        belowMinimum: quantity < minQuantity,
        isZero: quantity === 0,
        isAtMinimum: quantity === minQuantity
      };
    } catch (error) {
      console.error(`❌ Erro ao verificar estoque do material ${material.codigo}:`, error.message);
      return null;
    }
  }

  /**
   * Formata mensagem de alerta com emoji colorido
   */
  formatAlertMessage(stockInfo) {
    let emoji = '🟢'; // Verde = OK
    let status = 'OK';
    
    if (stockInfo.isZero) {
      emoji = '🔴'; // Vermelho = Zerado
      status = 'ZERADO';
    } else if (stockInfo.belowMinimum) {
      emoji = '🔴'; // Vermelho = Abaixo do mínimo
      status = 'ABAIXO DO MÍNIMO';
    } else if (stockInfo.isAtMinimum) {
      emoji = '🟡'; // Amarelo = No mínimo
      status = 'NO MÍNIMO';
    }
    
    return `${emoji} *${stockInfo.nome}*\n` +
           `• Código: ${stockInfo.codigo}\n` +
           `• Quantidade: *${stockInfo.quantity} chapas*\n` +
           `• Status: *${status}*\n` +
           `• Mínimo: ${stockInfo.minQuantity} chapas`;
  }

  /**
   * Verifica se deve enviar alerta hoje
   */
  shouldSendAlert(state) {
    // Se compra foi confirmada, não enviar
    if (state.purchaseConfirmed) {
      return false;
    }
    
    // Se nunca enviou alerta, enviar
    if (!state.lastAlertDate) {
      return true;
    }
    
    // Verifica se já enviou hoje
    const today = new Date().toISOString().split('T')[0];
    return state.lastAlertDate !== today;
  }

  /**
   * Verifica todos os materiais e envia alertas necessários
   */
  async checkAndAlert() {
    console.log('\n🔍 Iniciando verificação de estoque mínimo...');
    
    await this.loadMonitoredMaterials();
    await this.loadAlertState();
    
    const alertsToSend = [];
    
    for (const material of this.monitoredMaterials) {
      if (!material.enabled) {
        console.log(`⏭️ Material ${material.codigo} desabilitado, pulando...`);
        continue;
      }
      
      const stockInfo = await this.checkMaterialStock(material);
      if (!stockInfo) continue;
      
      const state = this.getOrCreateAlertState(material.codigo);
      state.currentQuantity = stockInfo.quantity;
      
      // Se estoque OK (no mínimo ou acima), limpar flag de compra confirmada
      if (!stockInfo.belowMinimum) {
        if (state.purchaseConfirmed) {
          console.log(`✅ Material ${material.codigo} voltou ao estoque normal. Resetando flag de compra.`);
          state.purchaseConfirmed = false;
          state.purchaseConfirmedDate = null;
        }
        continue;
      }
      
      // Se estoque baixo, verificar se deve alertar
      if (this.shouldSendAlert(state)) {
        alertsToSend.push({ material, stockInfo, state });
      } else {
        console.log(`⏭️ Material ${material.codigo}: já enviado alerta hoje ou compra confirmada`);
      }
    }
    
    // Envia alertas
    if (alertsToSend.length > 0) {
      await this.sendAlerts(alertsToSend);
    } else {
      console.log('✅ Nenhum alerta necessário no momento');
    }
    
    await this.saveAlertState();
  }

  /**
   * Envia alertas via WhatsApp
   */
  async sendAlerts(alertsToSend) {
    console.log(`📢 Enviando ${alertsToSend.length} alertas...`);
    
    let message = `⚠️ *ALERTA DE ESTOQUE MÍNIMO* ⚠️\n\n`;
    message += `📅 ${new Date().toLocaleString('pt-BR')}\n\n`;
    
    for (const { stockInfo } of alertsToSend) {
      message += this.formatAlertMessage(stockInfo) + '\n\n';
    }
    
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `📋 *OPÇÕES RÁPIDAS:*\n\n`;
    message += `1️⃣ *Confirmar compra* [código]\n`;
    message += `   Exemplo: \`1 6\`\n\n`;
    message += `2️⃣ *Cancelar avisos* [código]\n`;
    message += `   Exemplo: \`2 6\`\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `📋 *OU USE COMANDOS:*\n\n`;
    message += `\`/compra [código]\` - Confirmar compra\n`;
    message += `\`/remover [código]\` - Cancelar alertas\n`;
    message += `\`/adicionar [código]\` - Adicionar material\n`;
    message += `\`/listar alertas\` - Ver materiais\n`;
    message += `\`/estoque\` - Verificar agora\n`;
    message += `\`/ajuda alertas\` - Ajuda`;
    
    // Envia para todos os destinatários
    for (const recipient of config.alertRecipients) {
      try {
        await messageService.sendTextMessage(
          config.alertSessionId,
          recipient,
          message
        );
        console.log(`✅ Alerta enviado para ${recipient}`);
      } catch (error) {
        console.error(`❌ Erro ao enviar alerta para ${recipient}:`, error.message);
      }
    }
    
    // Atualiza estado dos alertas
    const today = new Date().toISOString().split('T')[0];
    for (const { state } of alertsToSend) {
      state.lastAlertDate = today;
    }
  }

  /**
   * Confirma compra de um material
   */
  async confirmPurchase(codigo, sessionId, chatId) {
    await this.loadMonitoredMaterials();
    await this.loadAlertState();
    
    const material = this.monitoredMaterials.find(m => m.codigo === codigo);
    if (!material) {
      return {
        success: false,
        message: `❌ Material com código *${codigo}* não está sendo monitorado.\n\n` +
                 `Use \`/listar alertas\` para ver materiais monitorados.`
      };
    }
    
    const state = this.getOrCreateAlertState(codigo);
    state.purchaseConfirmed = true;
    state.purchaseConfirmedDate = new Date().toISOString();
    
    await this.saveAlertState();
    
    let message = `✅ *Compra confirmada!*\n\n`;
    message += `📦 Material: *${material.nome}*\n`;
    message += `🔢 Código: ${codigo}\n`;
    message += `📅 Data: ${new Date().toLocaleString('pt-BR')}\n\n`;
    
    // Se tem adição automática de estoque
    if (material.autoAddOnPurchase) {
      try {
        const result = await this.autoAddStock(material);
        if (result) {
          // Verifica estoque atualizado
          const stockInfo = await this.checkMaterialStock(material);
          const recommended = material.recommendedStock ?? stockInfo.minQuantity;
          const missingToRecommended = Math.max(0, recommended - stockInfo.quantity);
          
          message += `🔄 *Estoque atualizado automaticamente!*\n\n`;
          message += `📊 *Detalhes:*\n`;
          message += `• Quantidade anterior: ${stockInfo.quantity - material.autoAddQuantity} chapas\n`;
          message += `• Adicionadas: ${material.autoAddQuantity} chapas\n`;
          message += `• Quantidade atual: *${stockInfo.quantity} chapas*\n`;
          message += `• Arquivo: CHP${codigo.padStart(5, '0')}.TAB\n\n`;
          message += missingToRecommended > 0
            ? `📌 Faltam *${missingToRecommended} chapas* para atingir o recomendado (${recommended}).\n\n`
            : `✅ Estoque recomendado atingido (${recommended} chapas).\n\n`;
        } else {
          message += `⚠️ *Erro ao atualizar estoque automaticamente.*\n`;
          message += `Por favor, adicione manualmente ${material.autoAddQuantity} chapas.\n\n`;
        }
      } catch (error) {
        message += `⚠️ *Erro ao atualizar estoque automaticamente.*\n`;
        message += `Por favor, adicione manualmente ${material.autoAddQuantity} chapas.\n\n`;
      }
    } else {
      const stockInfo = await this.checkMaterialStock(material);
      const recommended = material.recommendedStock ?? stockInfo.minQuantity;
      const missingToRecommended = Math.max(0, recommended - stockInfo.quantity);
      message += `⚠️ *Lembre-se de atualizar o estoque manualmente!*\n`;
      message += missingToRecommended > 0
        ? `📌 Faltam *${missingToRecommended} chapas* para atingir o recomendado (${recommended}).\n\n`
        : `✅ Estoque recomendado atingido (${recommended} chapas).\n\n`;
    }
    
    message += `Os alertas foram pausados para este material até que o estoque volte ao normal.`;
    
    return { success: true, message };
  }

  /**
   * Adiciona estoque automaticamente
   */
  async autoAddStock(material) {
    if (!material.autoAddOnPurchase) return false;
    
    try {
      console.log(`📦 Atualizando estoque: ${material.autoAddQuantity} chapas para material ${material.codigo}`);
      
      // Atualiza estoque no arquivo .TAB do Corte Certo
      const result = await corteCertoService.updateStockQuantity(
        material.codigo,
        material.autoAddQuantity
      );
      
      if (result.success) {
        console.log(`✅ Estoque atualizado: ${result.oldQuantity} -> ${result.newQuantity} em ${result.linesUpdated} linhas`);
        return true;
      } else {
        console.error(`❌ Falha ao atualizar estoque: ${result.message}`);
        return false;
      }
      
    } catch (error) {
      console.error('❌ Erro ao adicionar estoque automaticamente:', error.message);
      return false;
    }
  }

  /**
   * Adiciona novo material para monitoramento
   * @param {string} codigo - Código do material
   * @param {string} nome - Nome do material (opcional, busca automaticamente se não fornecido)
   */
  async addMaterial(codigo, nome = null, sessionId, chatId) {
    await this.loadMonitoredMaterials();
    
    const exists = this.monitoredMaterials.find(m => m.codigo === codigo);
    if (exists) {
      return {
        success: false,
        message: `⚠️ Material com código *${codigo}* já está sendo monitorado.\n\n` +
                 `Use \`/listar alertas\` para ver todos os materiais.`
      };
    }
    
    // Verifica se o material existe no sistema e busca o nome
    const materialInfo = await corteCertoService.loadMaterial(codigo);
    if (!materialInfo) {
      return {
        success: false,
        message: `❌ Material com código *${codigo}* não encontrado no sistema.\n\n` +
                 `Verifique o código e tente novamente.`
      };
    }

    // Lê quantidade mínima do arquivo .INI
    const minQty = await corteCertoService.getMinStockQuantity(codigo);
    
    const newMaterial = {
      codigo,
      nome: materialInfo.nome, // Sempre usa o nome do arquivo .INI
      enabled: true,
      autoAddOnPurchase: false,
      autoAddQuantity: 0,
      autoAddLines: 0,
      recommendedStock: minQty,
      notes: 'Adicionar quantidade manualmente após compra'
    };
    
    this.monitoredMaterials.push(newMaterial);
    await this.saveMonitoredMaterials();
    
    return {
      success: true,
      message: `✅ *Material adicionado ao monitoramento!*\n\n` +
               `📦 Nome: *${newMaterial.nome}*\n` +
               `🔢 Código: ${codigo}\n` +
               `⚙️ Status: Ativo\n` +
               `📊 Mínimo: ${minQty} chapas (do arquivo .INI)\n` +
               `📌 Recomendado: ${newMaterial.recommendedStock} chapas\n\n` +
               `O material será verificado diariamente.\n\n` +
               `💡 Use \`/minimo ${codigo} [quantidade]\` para alterar o mínimo.`
    };
  }

  /**
   * Remove material do monitoramento
   */
  async removeMaterial(codigo, sessionId, chatId) {
    await this.loadMonitoredMaterials();
    
    const index = this.monitoredMaterials.findIndex(m => m.codigo === codigo);
    if (index === -1) {
      return {
        success: false,
        message: `❌ Material com código *${codigo}* não está sendo monitorado.\n\n` +
                 `Use \`/listar alertas\` para ver materiais monitorados.`
      };
    }
    
    const removed = this.monitoredMaterials.splice(index, 1)[0];
    await this.saveMonitoredMaterials();
    
    // Remove também do estado de alertas
    await this.loadAlertState();
    const stateIndex = this.alertState.findIndex(s => s.codigo === codigo);
    if (stateIndex !== -1) {
      this.alertState.splice(stateIndex, 1);
      await this.saveAlertState();
    }
    
    return {
      success: true,
      message: `✅ *Material removido do monitoramento!*\n\n` +
               `📦 Material: *${removed.nome}*\n` +
               `🔢 Código: ${codigo}\n\n` +
               `Os alertas para este material foram desativados.`
    };
  }

  /**
   * Lista todos os materiais monitorados
   */
  async listMonitoredMaterials(sessionId, chatId) {
    await this.loadMonitoredMaterials();
    await this.loadAlertState();
    
    if (this.monitoredMaterials.length === 0) {
      return {
        success: true,
        message: `📋 *MATERIAIS MONITORADOS*\n\n` +
                 `Nenhum material está sendo monitorado no momento.\n\n` +
                 `Use \`adicionar [código] [nome]\` para adicionar.`
      };
    }
    
    let message = `📋 *MATERIAIS MONITORADOS*\n\n`;
    
    for (const material of this.monitoredMaterials) {
      const state = this.getOrCreateAlertState(material.codigo);
      const stockInfo = await this.checkMaterialStock(material);
      
      let emoji = '🟢';
      if (stockInfo) {
        if (stockInfo.isZero) emoji = '🔴';
        else if (stockInfo.belowMinimum) emoji = '🔴';
        else if (stockInfo.isAtMinimum) emoji = '🟡';
      }
      
      // Lê quantidade mínima do arquivo .INI
      const minQty = stockInfo?.minQuantity || config.minStockQuantity;
      const recommended = material.recommendedStock ?? minQty;
      
      message += `${emoji} *${material.nome}*\n`;
      message += `• Código: ${material.codigo}\n`;
      message += `• Quantidade: ${stockInfo?.quantity || 0} chapas\n`;
      message += `• Mínimo: ${minQty} chapas (arquivo .INI)\n`;
      message += `• Recomendado: ${recommended} chapas\n`;
      message += `• Status: ${material.enabled ? '✅ Ativo' : '❌ Inativo'}\n`;
      
      if (state.purchaseConfirmed) {
        message += `• 🛒 Compra confirmada em ${new Date(state.purchaseConfirmedDate).toLocaleDateString('pt-BR')}\n`;
      }
      
      if (material.autoAddOnPurchase) {
        message += `• 🔄 Auto-add: ${material.autoAddQuantity} chapas\n`;
      }
      
      message += `\n`;
    }
    
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `Total: ${this.monitoredMaterials.length} materiais`;
    
    return { success: true, message };
  }

  /**
   * Altera quantidade mínima global ou de um material específico
   */
  async changeMinimumQuantity(newMinimum, sessionId, chatId, codigo = null) {
    if (isNaN(newMinimum) || newMinimum < 0) {
      return {
        success: false,
        message: `❌ Quantidade inválida.\n\n` +
                 `Use: \`/minimo [quantidade]\` ou \`/minimo [código] [quantidade]\`\n` +
                 `Exemplos:\n` +
                 `• \`/minimo 20\` - Altera padrão global\n` +
                 `• \`/minimo 6 15\` - Altera apenas material 6`
      };
    }
    
    // Se tem código, altera material específico no arquivo .INI
    if (codigo) {
      await this.loadMonitoredMaterials();
      
      const material = this.monitoredMaterials.find(m => m.codigo === codigo);
      if (!material) {
        return {
          success: false,
          message: `❌ Material com código *${codigo}* não está sendo monitorado.\n\n` +
                   `Use \`/listar alertas\` para ver materiais monitorados.`
        };
      }
      
      // Lê quantidade mínima atual do .INI
      const oldMinimum = await corteCertoService.getMinStockQuantity(codigo);
      
      // Atualiza no arquivo .INI
      const updated = await corteCertoService.updateMinStockQuantity(codigo, parseInt(newMinimum));
      
      if (!updated) {
        return {
          success: false,
          message: `❌ Erro ao atualizar quantidade mínima no arquivo do material.\n\n` +
                   `Verifique os logs do servidor.`
        };
      }
      
      return {
        success: true,
        message: `✅ *Quantidade mínima alterada!*\n\n` +
                 `📦 Material: *${material.nome}*\n` +
                 `🔢 Código: ${codigo}\n` +
                 `📊 Anterior: ${oldMinimum} chapas\n` +
                 `📊 Nova: ${newMinimum} chapas\n\n` +
                 `✅ Alteração salva permanentemente no arquivo .INI do material.`
      };
    }
    
    // Altera mínimo global (padrão)
    const oldMinimum = config.minStockQuantity;
    config.minStockQuantity = parseInt(newMinimum);
    
    // Nota: Para persistir, seria necessário atualizar o .env ou config
    // Por ora, a mudança é apenas em memória até reiniciar o servidor
    
    return {
      success: true,
      message: `✅ *Quantidade mínima padrão alterada!*\n\n` +
               `📊 Anterior: ${oldMinimum} chapas\n` +
               `📊 Nova: ${config.minStockQuantity} chapas\n\n` +
               `⚠️ *Atenção:* Esta alteração é temporária.\n` +
               `Para torná-la permanente, atualize a variável \`QTD_MIN_CHP\` no arquivo .env e reinicie o servidor.\n\n` +
               `💡 *Dica:* Para alterar a quantidade mínima de um material específico, use:\n` +
               `\`/minimo [código] [quantidade]\`\n` +
               `Exemplo: \`/minimo 6 15\``
    };
  }

  /**
   * Mostra ajuda dos comandos de alerta
   */
  getHelpMessage() {
    let message = `📖 *AJUDA - SISTEMA DE ALERTAS*\n\n`;
    message += `O sistema monitora materiais selecionados e envia alertas diários quando o estoque fica abaixo do mínimo configurado.\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `📋 *COMANDOS DISPONÍVEIS:*\n\n`;
    
    message += `*1️⃣ Confirmar compra*\n`;
    message += `\`/compra [código]\`\n`;
    message += `Confirma que a compra foi feita e pausa os alertas até o estoque normalizar.\n`;
    message += `Exemplo: \`/compra 6\`\n\n`;
    
    message += `*2️⃣ Adicionar material*\n`;
    message += `\`/adicionar [código]\`\n`;
    message += `Adiciona um novo material ao monitoramento. O nome é buscado automaticamente do arquivo .INI.\n`;
    message += `Exemplo: \`/adicionar 50\`\n\n`;
    
    message += `*3️⃣ Remover material*\n`;
    message += `\`/remover [código]\`\n`;
    message += `Remove um material do monitoramento.\n`;
    message += `Exemplo: \`/remover 50\`\n\n`;
    
    message += `*4️⃣ Listar materiais*\n`;
    message += `\`/listar alertas\`\n`;
    message += `Mostra todos os materiais monitorados e seus estoques atuais.\n\n`;
    
    message += `*5️⃣ Alterar mínimo*\n`;
    message += `\`/minimo [quantidade]\` - Altera mínimo padrão (temporário)\n`;
    message += `\`/minimo [código] [quantidade]\` - Altera mínimo de um material (PERMANENTE no .INI)\n`;
    message += `Exemplos:\n`;
    message += `• \`/minimo 20\` - Mínimo padrão = 20\n`;
    message += `• \`/minimo 6 15\` - Material 6 = 15 chapas (salva no arquivo M6.INI)\n\n`;
    
    message += `*6️⃣ Verificar agora*\n`;
    message += `\`/estoque\`\n`;
    message += `Verifica o estoque de TODOS os materiais imediatamente, sem esperar o horário agendado.\n\n`;
    
    message += `*7️⃣ Ver ajuda*\n`;
    message += `\`/ajuda alertas\`\n`;
    message += `Mostra esta mensagem de ajuda.\n\n`;
    
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `📊 *STATUS DOS ALERTAS:*\n`;
    message += `🟢 = Estoque OK\n`;
    message += `🟡 = Estoque no mínimo configurado\n`;
    message += `🔴 = Estoque abaixo do mínimo ou zerado\n\n`;
    
    message += `⏰ *HORÁRIO DE VERIFICAÇÃO:*\n`;
    message += `Os alertas são verificados e enviados automaticamente todos os dias às 8h da manhã.\n\n`;
    
    message += `💡 *DICA:*\n`;
    message += `Cada material pode ter sua própria quantidade mínima. Os alertas são enviados apenas uma vez por dia para cada material, até que a compra seja confirmada ou o estoque normalize.`;
    
    return { success: true, message };
  }

  /**
   * Comando para verificar estoque agora
   */
  async checkNowCommand(sessionId, chatId) {
    console.log(`🔍 Comando /estoque recebido de ${chatId}`);
    
    try {
      await this.loadMonitoredMaterials();
      await this.loadAlertState();
      
      const alertsToSend = [];
      
      for (const material of this.monitoredMaterials) {
        if (!material.enabled) continue;
        
        const stockInfo = await this.checkMaterialStock(material);
        if (!stockInfo) continue;
        
        const state = this.getOrCreateAlertState(material.codigo);
        state.currentQuantity = stockInfo.quantity;
        
        // Adiciona TODOS os materiais, independente do status
        alertsToSend.push({ material, stockInfo, state });
      }
      
      if (alertsToSend.length === 0) {
        return {
          success: true,
          message: `📋 *VERIFICAÇÃO DE ESTOQUE*\n\n` +
                   `Nenhum material está sendo monitorado.\n\n` +
                   `Use \`/adicionar [código] [nome]\` para adicionar materiais.`
        };
      }
      
      // Monta mensagem com TODOS os materiais
      let message = `📋 *VERIFICAÇÃO DE ESTOQUE*\n\n`;
      message += `📅 ${new Date().toLocaleString('pt-BR')}\n\n`;
      
      for (const { stockInfo } of alertsToSend) {
        message += this.formatAlertMessage(stockInfo) + '\n\n';
      }
      
      message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
      message += `Total: ${alertsToSend.length} materiais verificados`;
      
      console.log(`✅ Verificação manual concluída: ${alertsToSend.length} materiais`);
      
      return { success: true, message };
      
    } catch (error) {
      console.error('❌ Erro na verificação manual:', error.message);
      return {
        success: false,
        message: `❌ Erro ao verificar estoque: ${error.message}`
      };
    }
  }

  /**
   * Processa resposta numérica do usuário
   * @param {number} optionNumber - Número da opção escolhida (1 ou 2)
   * @param {string} codigo - Código do material
   * @param {string} sessionId - ID da sessão
   * @param {string} chatId - ID do chat
   */
  async processNumericResponse(optionNumber, codigo, sessionId, chatId) {
    // Valida a opção (1 ou 2)
    if (optionNumber !== 1 && optionNumber !== 2) {
      return {
        success: false,
        message: `❌ Opção *${optionNumber}* inválida.\n\n` +
                 `Use apenas:\n` +
                 `• \`1 [código]\` - Confirmar compra\n` +
                 `• \`2 [código]\` - Cancelar avisos\n\n` +
                 `Exemplo: \`1 6\` ou \`2 37\``
      };
    }
    
    // Valida se o código foi fornecido
    if (!codigo) {
      return {
        success: false,
        message: `❌ Código do material não informado.\n\n` +
                 `Use:\n` +
                 `• \`1 [código]\` - Confirmar compra\n` +
                 `• \`2 [código]\` - Cancelar avisos\n\n` +
                 `Exemplo: \`1 6\` ou \`2 37\``
      };
    }
    
    // Verifica se o material está sendo monitorado
    await this.loadMonitoredMaterials();
    const material = this.monitoredMaterials.find(m => m.codigo === codigo);
    
    if (!material) {
      return {
        success: false,
        message: `❌ Material com código *${codigo}* não está sendo monitorado.\n\n` +
                 `Use \`/listar alertas\` para ver materiais monitorados.`
      };
    }
    
    // Executa a ação
    if (optionNumber === 1) {
      // Confirmar compra
      return await this.confirmPurchase(codigo, sessionId, chatId);
    } else if (optionNumber === 2) {
      // Cancelar avisos
      return await this.removeMaterial(codigo, sessionId, chatId);
    }
    
    return {
      success: false,
      message: `❌ Ação desconhecida.`
    };
  }

  /**
   * Inicializa o serviço
   */
  async initialize() {
    console.log('🔔 Inicializando serviço de alertas de estoque...');
    await this.loadMonitoredMaterials();
    await this.loadAlertState();
    console.log('✅ Serviço de alertas inicializado');
  }
}

module.exports = new StockAlertService();
