const reportService = require('./services/reportService');

async function testReport() {
  console.log('🧪 Testando relatórios...\n');

  try {
    // Teste 1: Relatório por espessura
    console.log('📊 Teste 1: Relatório 18mm');
    const report1 = await reportService.generateReport({
      material: null,
      cor: null,
      espessura: 18,
      tipo: 'ambos'
    });
    console.log(`✅ Relatório gerado: ${report1.filename}`);
    console.log(`Summary: ${report1.summary}\n`);

    // Teste 2: Relatório por cor
    console.log('📊 Teste 2: Relatório Branco Liso');
    const report2 = await reportService.generateReport({
      material: null,
      cor: 'Branco Liso',
      espessura: null,
      tipo: 'ambos'
    });
    console.log(`✅ Relatório gerado: ${report2.filename}`);
    console.log(`Summary: ${report2.summary}\n`);

    console.log('✅ Todos os testes de relatório passaram!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro nos testes de relatório:', error);
    process.exit(1);
  }
}

testReport();