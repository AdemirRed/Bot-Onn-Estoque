const fs = require('fs').promises;
const path = require('path');

/**
 * Serviço para gerenciar estado persistente de usuários
 */
class UserStateService {
  constructor() {
    this.dataPath = path.join(__dirname, '..', 'data', 'greeted-users.json');
    this.greetedUsers = new Set();
    this.loaded = false;
  }

  /**
   * Carrega lista de usuários saudados do arquivo
   */
  async load() {
    try {
      const data = await fs.readFile(this.dataPath, 'utf-8');
      const users = JSON.parse(data);
      this.greetedUsers = new Set(users);
      this.loaded = true;
      console.log(`✅ Carregados ${this.greetedUsers.size} usuários já saudados`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Arquivo não existe, cria um novo
        this.greetedUsers = new Set();
        await this.save();
        this.loaded = true;
        console.log(`📝 Arquivo de usuários saudados criado`);
      } else {
        console.error('❌ Erro ao carregar usuários saudados:', error.message);
      }
    }
  }

  /**
   * Salva lista de usuários saudados no arquivo
   */
  async save() {
    try {
      const users = Array.from(this.greetedUsers);
      await fs.writeFile(this.dataPath, JSON.stringify(users, null, 2), 'utf-8');
    } catch (error) {
      console.error('❌ Erro ao salvar usuários saudados:', error.message);
    }
  }

  /**
   * Verifica se usuário já foi saudado
   * @param {string} userId - ID do usuário
   * @returns {boolean}
   */
  hasBeenGreeted(userId) {
    // Se ainda não carregou, considera que não foi saudado (evita erro)
    if (!this.loaded) {
      console.warn('⚠️ UserStateService ainda não foi carregado');
      return false;
    }
    return this.greetedUsers.has(userId);
  }

  /**
   * Marca usuário como saudado (síncrono na memória, salva async no arquivo)
   * @param {string} userId - ID do usuário
   */
  markAsGreeted(userId) {
    if (!this.greetedUsers.has(userId)) {
      this.greetedUsers.add(userId);
      // Salva no arquivo de forma assíncrona (não bloqueia)
      this.save().catch(err => {
        console.error('❌ Erro ao salvar usuário saudado:', err.message);
      });
      console.log(`👋 Usuário ${userId} marcado como saudado`);
    }
  }

  /**
   * Remove usuário da lista (para testes)
   * @param {string} userId - ID do usuário
   */
  async removeUser(userId) {
    if (this.greetedUsers.has(userId)) {
      this.greetedUsers.delete(userId);
      await this.save();
      console.log(`🗑️ Usuário ${userId} removido da lista`);
    }
  }
}

module.exports = new UserStateService();
