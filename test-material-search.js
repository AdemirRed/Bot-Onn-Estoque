/**
 * Script de teste para busca de materiais do Corte Certo
 */
const materialSearchService = require('./services/materialSearchService');
const userStateService = require('./services/userStateService');

async function testSearch() {
  console.log('🧪 TESTANDO SISTEMA DE BUSCA DE MATERIAIS\n');
  console.log('='.repeat(50));

  // Carrega estado dos usuários e marca como saudados
  await userStateService.load();
  const testUsers = [
    '555197756708@c.us',
    '555197756709@c.us',
    '555197756710@c.us',
    '555197756711@c.us'
  ];
  testUsers.forEach(user => userStateService.markAsGreeted(user));

  // Teste 1: Busca simples com espessura
  console.log('\n📋 Teste 1: Branco Liso 18mm');
  console.log('-'.repeat(50));
  const result1 = await materialSearchService.processMessage(
    testUsers[0],
    'red',
    'Branco Liso 18mm'
  );
  console.log(result1.message);
  console.log('='.repeat(50));

  // Teste 2: Busca sem espessura
  console.log('\n📋 Teste 2: Branco (sem espessura)');
  console.log('-'.repeat(50));
  const result2 = await materialSearchService.processMessage(
    testUsers[0],
    'red',
    'Branco'
  );
  console.log(result2.message);
  console.log('='.repeat(50));

  // Teste 3: Material não encontrado
  console.log('\n📋 Teste 3: Material inexistente');
  console.log('-'.repeat(50));
  const result3 = await materialSearchService.processMessage(
    testUsers[0],
    'red',
    'Cor que não existe 18mm'
  );
  console.log(result3.message);
  console.log('='.repeat(50));

  // Teste 4: Busca por retalhos
  console.log('\n📋 Teste 4: Branco Liso 18mm (com retalhos)');
  console.log('-'.repeat(50));
  const result4 = await materialSearchService.processMessage(
    testUsers[0],
    'red',
    'Branco Liso 18mm'
  );
  console.log(result4.message);
  console.log('='.repeat(50));

  // Teste 5: Busca por retalho 18 (material específico)
  console.log('\n📋 Teste 5: retalho 18');
  console.log('-'.repeat(50));
  const result5 = await materialSearchService.processMessage(
    testUsers[1],
    'red',
    'retalho 18'
  );
  console.log(result5.message);
  console.log('='.repeat(50));

  // Teste 6: Busca por retalho 6 (material específico)
  console.log('\n📋 Teste 6: retalho 6');
  console.log('-'.repeat(50));
  const result6 = await materialSearchService.processMessage(
    testUsers[2],
    'red',
    'retalho 6'
  );
  console.log(result6.message);
  console.log('='.repeat(50));

  // Teste 7: Busca por retalhos 18 (plural)
  console.log('\n📋 Teste 7: retalhos 18');
  console.log('-'.repeat(50));
  const result7 = await materialSearchService.processMessage(
    testUsers[3],
    'red',
    'retalhos 18'
  );
  console.log(result7.message);
  console.log('='.repeat(50));

  console.log('\n✅ Testes concluídos!\n');
}

// Executa os testes
testSearch().catch(error => {
  console.error('❌ Erro nos testes:', error);
  process.exit(1);
});
