const materialListService = require('./services/materialListService');

async function testList() {
  console.log('🧪 Testando geração de lista de materiais...\n');

  try {
    // Teste 1: Lista completa
    console.log('📋 Teste 1: Lista completa');
    const list1 = await materialListService.generateMaterialList({});
    console.log(`✅ Lista gerada: ${list1.filename}`);
    console.log(`📊 Total: ${list1.summary.total} materiais`);
    console.log(`📄 Arquivo: ${list1.filepath}\n`);

    // Teste 2: Lista por espessura (18mm)
    console.log('📋 Teste 2: Lista de 18mm');
    const list2 = await materialListService.generateMaterialList({ espessura: 18 });
    console.log(`✅ Lista gerada: ${list2.filename}`);
    console.log(`📊 Total: ${list2.summary.total} materiais de 18mm`);
    console.log(`📄 Arquivo: ${list2.filepath}\n`);

    console.log('✅ Todos os testes passaram!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro nos testes:', error);
    process.exit(1);
  }
}

testList();
