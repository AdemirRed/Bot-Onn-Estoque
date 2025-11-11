/**
 * Script de teste para busca de materiais do Corte Certo
 */
const materialSearchService = require('./services/materialSearchService');

async function testSearch() {
  console.log('🧪 TESTANDO SISTEMA DE BUSCA DE MATERIAIS\n');
  console.log('='.repeat(50));

  // Teste 1: Busca simples com espessura
  console.log('\n📋 Teste 1: Branco Liso 18mm');
  console.log('-'.repeat(50));
  const result1 = await materialSearchService.processMessage(
    '555197756708@c.us',
    'red',
    'Branco Liso 18mm'
  );
  console.log(result1.message);
  console.log('='.repeat(50));

  // Teste 2: Busca sem espessura
  console.log('\n📋 Teste 2: Branco (sem espessura)');
  console.log('-'.repeat(50));
  const result2 = await materialSearchService.processMessage(
    '555197756708@c.us',
    'red',
    'Branco'
  );
  console.log(result2.message);
  console.log('='.repeat(50));

  // Teste 3: Material não encontrado
  console.log('\n📋 Teste 3: Material inexistente');
  console.log('-'.repeat(50));
  const result3 = await materialSearchService.processMessage(
    '555197756708@c.us',
    'red',
    'Cor que não existe 18mm'
  );
  console.log(result3.message);
  console.log('='.repeat(50));

  // Teste 4: Busca por retalhos
  console.log('\n📋 Teste 4: Branco Liso 18mm (com retalhos)');
  console.log('-'.repeat(50));
  const result4 = await materialSearchService.processMessage(
    '555197756708@c.us',
    'red',
    'Branco Liso 18mm'
  );
  console.log(result4.message);
  console.log('='.repeat(50));

  console.log('\n✅ Testes concluídos!\n');
}

// Executa os testes
testSearch().catch(error => {
  console.error('❌ Erro nos testes:', error);
  process.exit(1);
});
