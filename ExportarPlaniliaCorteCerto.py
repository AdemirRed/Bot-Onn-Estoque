import os
import sys
import zipfile
import tempfile
import shutil
from PyQt5 import QtWidgets, QtCore, QtGui
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from natsort import natsorted

# Imports otimizados - carregados apenas quando necessário
rarfile = None

class MaterialListApp(QtWidgets.QMainWindow):
    def __init__(self):
        super().__init__()
        self.temp_dir = None
        self.setup_style()  # Configurar estilo antes de initUI
        self.initUI()
        self.show()
        QtWidgets.QApplication.processEvents()

    def setup_style(self):
        """Configura o tema escuro com azul claro"""
        self.setStyleSheet("""
            QMainWindow {
                background-color: #2D2D2D;
            }
            QWidget {
                background-color: #2D2D2D;
                color: #E0E0E0;
                font-family: 'Segoe UI';
            }
            QLabel {
                color: #E0E0E0;
            }
            QLineEdit {
                background-color: #3D3D3D;
                border: 1px solid #555;
                border-radius: 4px;
                padding: 5px;
                color: #E0E0E0;
                selection-background-color: #0078D7;
            }
            QPushButton {
                background-color: #0078D7;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px 16px;
                min-width: 80px;
            }
            QPushButton:hover {
                background-color: #0086F0;
            }
            QPushButton:pressed {
                background-color: #005A9E;
            }
            QProgressBar {
                border: 1px solid #555;
                border-radius: 4px;
                text-align: center;
                background-color: #3D3D3D;
            }
            QProgressBar::chunk {
                background-color: #0078D7;
                width: 10px;
            }
            QGroupBox {
                border: 1px solid #555;
                border-radius: 4px;
                margin-top: 10px;
                padding-top: 15px;
                color: #E0E0E0;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 3px;
            }
            QTextEdit {
                background-color: #3D3D3D;
                border: 1px solid #555;
                border-radius: 4px;
                color: #E0E0E0;
                font-family: 'Consolas';
            }
            QMenuBar {
                background-color: #252525;
                color: #E0E0E0;
            }
            QMenuBar::item {
                background-color: transparent;
                padding: 5px 10px;
            }
            QMenuBar::item:selected {
                background-color: #0078D7;
            }
            QMenu {
                background-color: #3D3D3D;
                border: 1px solid #555;
                color: #E0E0E0;
            }
            QMenu::item:selected {
                background-color: #0078D7;
            }
        """)

    def initUI(self):
        # Configuração da janela principal
        self.setWindowTitle('Gerador de Lista de Materiais - Corte Certo')
        self.setGeometry(300, 300, 800, 600)
        self.setMinimumSize(600, 400)
        
        # Widget central e layout
        central_widget = QtWidgets.QWidget()
        self.setCentralWidget(central_widget)
        layout = QtWidgets.QVBoxLayout(central_widget)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(15)
        
        # Cabeçalho
        header = QtWidgets.QHBoxLayout()
        logo_label = QtWidgets.QLabel()
        logo_pixmap = QtGui.QPixmap()
        logo_label.setPixmap(logo_pixmap)
        header.addWidget(logo_label)
        
        title_label = QtWidgets.QLabel('Gerador de Lista de Materiais')
        title_font = QtGui.QFont('Segoe UI', 18, QtGui.QFont.Bold)
        title_label.setFont(title_font)
        title_label.setAlignment(QtCore.Qt.AlignCenter)
        header.addWidget(title_label, 1)
        
        layout.addLayout(header)
        
        # Instruções
        instruction_label = QtWidgets.QLabel('Selecione uma pasta ou arquivo compactado (.zip/.rar) contendo os arquivos .ini')
        instruction_label.setWordWrap(True)
        layout.addWidget(instruction_label)
        
        # Campo do caminho
        path_layout = QtWidgets.QHBoxLayout()
        path_layout.setSpacing(10)
        self.path_edit = QtWidgets.QLineEdit()
        self.path_edit.setPlaceholderText("Nenhum arquivo ou pasta selecionado")
        path_layout.addWidget(self.path_edit)
        
        # Botão para selecionar pasta
        select_folder_btn = QtWidgets.QPushButton('Pasta')
        select_folder_btn.setIcon(self.style().standardIcon(QtWidgets.QStyle.SP_DirIcon))
        select_folder_btn.clicked.connect(self.select_folder)
        path_layout.addWidget(select_folder_btn)
        
        # Botão para selecionar arquivo
        select_file_btn = QtWidgets.QPushButton('Arquivo')
        select_file_btn.setIcon(self.style().standardIcon(QtWidgets.QStyle.SP_FileIcon))
        select_file_btn.clicked.connect(self.select_file)
        path_layout.addWidget(select_file_btn)
        
        layout.addLayout(path_layout)
        
        # Campo para o nome do arquivo PDF
        pdf_layout = QtWidgets.QHBoxLayout()
        pdf_layout.addWidget(QtWidgets.QLabel('Nome do arquivo PDF:'))
        self.pdf_name_edit = QtWidgets.QLineEdit('lista_materiais.pdf')
        pdf_layout.addWidget(self.pdf_name_edit, 1)
        layout.addLayout(pdf_layout)
        
        # Barra de progresso
        self.progress_bar = QtWidgets.QProgressBar()
        self.progress_bar.setValue(0)
        self.progress_bar.setTextVisible(True)
        layout.addWidget(self.progress_bar)
        
        # Status
        self.status_label = QtWidgets.QLabel('Pronto')
        self.status_label.setAlignment(QtCore.Qt.AlignCenter)
        layout.addWidget(self.status_label)
        
        # Log
        self.log_group = QtWidgets.QGroupBox('Log de Operações')
        log_layout = QtWidgets.QVBoxLayout(self.log_group)
        self.log_text = QtWidgets.QTextEdit()
        self.log_text.setReadOnly(True)
        log_layout.addWidget(self.log_text)
        layout.addWidget(self.log_group)
        
        # Botão para gerar PDF
        generate_btn = QtWidgets.QPushButton('Gerar PDF')
        generate_btn.setIcon(self.style().standardIcon(QtWidgets.QStyle.SP_DialogSaveButton))
        generate_btn.clicked.connect(self.generate_pdf)
        generate_btn.setMinimumHeight(40)
        font = QtGui.QFont()
        font.setBold(True)
        font.setPointSize(10)
        generate_btn.setFont(font)
        layout.addWidget(generate_btn)
        
        # Rodapé
        footer = QtWidgets.QHBoxLayout()
        footer.addStretch(1)
        
        version_label = QtWidgets.QLabel('Versão 2.0')
        version_label.setStyleSheet("color: #888;")
        footer.addWidget(version_label)
        
        credit_label = QtWidgets.QLabel('© RedBlack')
        credit_label.setStyleSheet("color: #0078D7; font-style: italic;")
        footer.addWidget(credit_label)
        
        layout.addLayout(footer)
    
    def select_folder(self):
        folder_path = QtWidgets.QFileDialog.getExistingDirectory(self, 'Selecionar Pasta')
        if folder_path:
            self.path_edit.setText(folder_path)
            self.log_message(f"Pasta selecionada: {folder_path}")
    
    def select_file(self):
        file_path, _ = QtWidgets.QFileDialog.getOpenFileName(
            self, 
            'Selecionar Arquivo', 
            '', 
            'Arquivos Compactados (*.zip *.rar)'
        )
        if file_path:
            self.path_edit.setText(file_path)
            self.log_message(f"Arquivo selecionado: {file_path}")
    
    def log_message(self, message):
        """Adiciona mensagem ao log e rola para o final"""
        self.log_text.append(message)
        self.log_text.moveCursor(QtGui.QTextCursor.End)
        # Processar eventos para manter a interface responsiva
        QtWidgets.QApplication.processEvents()
    
    def generate_pdf(self):
        # Verificar se um caminho foi selecionado
        path = self.path_edit.text()
        if not path:
            QtWidgets.QMessageBox.warning(self, 'Aviso', 'Por favor, selecione uma pasta ou arquivo primeiro!')
            return
        
        pdf_name = self.pdf_name_edit.text()
        if not pdf_name.lower().endswith('.pdf'):
            pdf_name += '.pdf'
        
        # Limpar logs anteriores
        self.log_text.clear()
        self.status_label.setText('Processando...')
        
        # Iniciar em uma thread separada para não congelar a interface
        self.worker = ProcessWorker(path, pdf_name)
        self.worker.progress_signal.connect(self.update_progress)
        self.worker.log_signal.connect(self.log_message)
        self.worker.finished_signal.connect(self.process_finished)
        self.worker.start()
    
    def update_progress(self, value):
        self.progress_bar.setValue(value)
    
    def process_finished(self, success, message, pdf_path):
        if success:
            self.status_label.setText(f"PDF gerado com sucesso: {pdf_path}")
            result = QtWidgets.QMessageBox.question(
                self, 
                'Sucesso', 
                f"PDF gerado com sucesso!\n\nDeseja abrir o arquivo agora?",
                QtWidgets.QMessageBox.Yes | QtWidgets.QMessageBox.No
            )
            if result == QtWidgets.QMessageBox.Yes:
                QtGui.QDesktopServices.openUrl(QtCore.QUrl.fromLocalFile(pdf_path))
        else:
            self.status_label.setText("Erro ao gerar PDF")
            QtWidgets.QMessageBox.critical(self, 'Erro', message)


class ProcessWorker(QtCore.QThread):
    progress_signal = QtCore.pyqtSignal(int)
    log_signal = QtCore.pyqtSignal(str)
    finished_signal = QtCore.pyqtSignal(bool, str, str)
    
    def __init__(self, path, pdf_name):
        super().__init__()
        self.path = path
        self.pdf_name = pdf_name
        self.temp_dir = None
    
    def run(self):
        try:
            # Identificar se é um arquivo compactado ou pasta
            is_archive = os.path.isfile(self.path) and (self.path.lower().endswith('.zip') or self.path.lower().endswith('.rar'))
            
            if is_archive:
                self.log_signal.emit(f"Extraindo arquivo compactado: {self.path}")
                self.temp_dir = tempfile.mkdtemp()
                self.extract_archive(self.path, self.temp_dir)
                input_path = self.temp_dir
            else:
                input_path = self.path
            
            # Processar os arquivos
            self.log_signal.emit("Iniciando processamento dos arquivos INI...")
            dados = self.processar_arquivos_pasta(input_path)
            
            if not dados:
                self.log_signal.emit("Nenhum dado encontrado nos arquivos.")
                self.finished_signal.emit(False, "Nenhum dado foi encontrado nos arquivos INI.", "")
                return
            
            # Ordenar e gerar PDF
            self.log_signal.emit(f"Encontrados {len(dados)} materiais. Ordenando...")
            dados_ordenados = self.ordenar_alfabeticamente(dados)
            
            # Determinar o caminho do PDF de saída
            if os.path.isfile(self.path):
                output_dir = os.path.dirname(self.path)
            else:
                output_dir = self.path
                
            output_pdf = os.path.join(output_dir, self.pdf_name)
            
            self.log_signal.emit(f"Gerando PDF: {output_pdf}")
            self.gerar_pdf(dados_ordenados, output_pdf)
            
            # Limpar diretório temporário se necessário
            if self.temp_dir:
                shutil.rmtree(self.temp_dir)
                self.temp_dir = None
            
            self.finished_signal.emit(True, "PDF gerado com sucesso!", output_pdf)
            
        except Exception as e:
            self.log_signal.emit(f"Erro: {str(e)}")
            # Limpar diretório temporário em caso de erro
            if self.temp_dir and os.path.exists(self.temp_dir):
                shutil.rmtree(self.temp_dir)
            self.finished_signal.emit(False, f"Erro ao processar: {str(e)}", "")
    
    def extract_archive(self, archive_path, extract_path):
        """Extrai arquivo ZIP ou RAR para o diretório especificado"""
        try:
            # Carregar rarfile apenas quando for necessário para arquivos .rar
            global rarfile
            
            if archive_path.lower().endswith('.zip'):
                with zipfile.ZipFile(archive_path, 'r') as zip_ref:
                    total_files = len(zip_ref.namelist())
                    for i, file in enumerate(zip_ref.namelist()):
                        zip_ref.extract(file, extract_path)
                        self.progress_signal.emit(int((i+1) / total_files * 50))  # 50% para extração
                    self.log_signal.emit(f"Arquivo ZIP extraído com sucesso: {len(zip_ref.namelist())} arquivos")
            
            elif archive_path.lower().endswith('.rar'):
                # Importar rarfile apenas quando necessário
                if rarfile is None:
                    import rarfile
                    
                    # Configurar o caminho do UnRAR em sistemas Windows
                    if os.name == 'nt':
                        unrar_paths = [
                            r'C:\Program Files\WinRAR\UnRAR.exe',
                            r'C:\Program Files (x86)\WinRAR\UnRAR.exe',
                            os.path.join(os.path.dirname(os.path.abspath(__file__)), 'UnRAR.exe')
                        ]
                        
                        for path in unrar_paths:
                            if os.path.exists(path):
                                rarfile.UNRAR_TOOL = path
                                break
                
                with rarfile.RarFile(archive_path, 'r') as rar_ref:
                    total_files = len(rar_ref.namelist())
                    for i, file in enumerate(rar_ref.namelist()):
                        rar_ref.extract(file, extract_path)
                        self.progress_signal.emit(int((i+1) / total_files * 50))  # 50% para extração
                    self.log_signal.emit(f"Arquivo RAR extraído com sucesso: {len(rar_ref.namelist())} arquivos")
        
        except Exception as e:
            self.log_signal.emit(f"Erro ao extrair arquivo: {str(e)}")
            raise

    def extrair_dados_arquivo_ini(self, caminho_arquivo):
        """Extrai o CAMPO1 de um arquivo INI"""
        codificacoes = ['utf-8', 'latin-1', 'cp1252']
        
        for codificacao in codificacoes:
            try:
                with open(caminho_arquivo, 'r', encoding=codificacao) as arquivo:
                    for linha in arquivo:
                        if linha.startswith('CAMPO1='):
                            campo1 = linha.split('=')[1].strip()
                            campo1 = campo1.replace("MDF", "").strip()  # Remove "MDF" e espaços em branco
                            return campo1
                return None
            except UnicodeDecodeError:
                self.log_signal.emit(f"Erro com '{codificacao}' no arquivo: {os.path.basename(caminho_arquivo)}, tentando próxima codificação.")
            except Exception as e:
                self.log_signal.emit(f"Erro ao ler o arquivo: {os.path.basename(caminho_arquivo)} | Erro: {e}")
        
        # Se nenhuma codificação funcionou, tente ler como bytes e decodificar
        try:
            with open(caminho_arquivo, 'rb') as arquivo:
                conteudo = arquivo.read()
                for codificacao in codificacoes:
                    try:
                        texto = conteudo.decode(codificacao)
                        if 'CAMPO1=' in texto:
                            campo1 = texto.split('CAMPO1=')[1].split('\n')[0].strip().replace("MDF", "").strip()
                            return campo1
                    except (UnicodeDecodeError, IndexError):
                        continue
        except Exception as e:
            self.log_signal.emit(f"Não foi possível ler o arquivo: {os.path.basename(caminho_arquivo)} | Erro: {e}")
        
        self.log_signal.emit(f"Conteúdo do arquivo não lido: {os.path.basename(caminho_arquivo)}")
        return None

    def processar_arquivos_pasta(self, caminho_pasta):
        """Processa todos os arquivos INI na pasta (e subpastas)"""
        dados = []
        arquivos_ini = []
        
        # Encontrar todos os arquivos INI
        for raiz, _, arquivos in os.walk(caminho_pasta):
            for arquivo in arquivos:
                if arquivo.lower().endswith('.ini'):
                    arquivos_ini.append(os.path.join(raiz, arquivo))
        
        total_arquivos = len(arquivos_ini)
        self.log_signal.emit(f"Encontrados {total_arquivos} arquivos INI para processar")
        
        # Processar cada arquivo
        for i, caminho_arquivo in enumerate(arquivos_ini):
            nome_arquivo = os.path.basename(caminho_arquivo)
            campo1 = self.extrair_dados_arquivo_ini(caminho_arquivo)
            if campo1:
                codigo = os.path.splitext(nome_arquivo)[0].replace("M", "")  # Remove o 'M' do nome do arquivo
                dados.append((campo1, codigo))  # (nome do material, código)
            
            # Atualizar progresso (50% a 90%)
            self.progress_signal.emit(50 + int((i+1) / total_arquivos * 40))
        
        self.log_signal.emit(f"Processamento concluído. Dados extraídos: {len(dados)}/{total_arquivos}")
        return dados

    def ordenar_alfabeticamente(self, dados):
        """Ordena a lista de materiais alfabeticamente usando natsort"""
        return natsorted(dados)

    def gerar_pdf(self, dados, caminho_pdf):
        """Gera o PDF com a lista de materiais"""
        pdf = canvas.Canvas(caminho_pdf, pagesize=A4)
        largura, altura = A4

        def adicionar_rodape(pdf, largura, altura):
            """Adiciona rodapé em todas as páginas"""
            # Salvar estado atual
            pdf.saveState()
            
            # Linha separadora do rodapé
            pdf.line(30, 35, largura - 30, 35)
            
            # Texto do rodapé com crédito ao desenvolvedor
            pdf.setFont("Helvetica", 8)
            pdf.drawString(30, 25, "© RedBlack")
            
            # Número da página
            pdf.drawString(30, 15, f"Página {pdf.getPageNumber()}")
            
            # Data e hora
            import datetime
            data_hora = datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")
            pdf.drawRightString(largura - 30, 15, f"Gerado em: {data_hora}")
            
            # Restaurar estado
            pdf.restoreState()

        pdf.setFont("Helvetica-Bold", 14)
        y = altura - 40  # Começar no topo da página
        espacamento = 20  # Espaçamento entre as linhas

        # Título do documento
        pdf.drawString(30, y, "Lista de Materiais (Ordenada Alfabeticamente)")
        pdf.line(30, y - 5, largura - 30, y - 5)  # Linha horizontal abaixo do título
        y -= espacamento * 2  # Espaço maior após o título

        pdf.setFont("Helvetica", 12)
        
        # Iterar pelos materiais, exibindo dois por linha
        for i in range(0, len(dados), 2):
            if y < 50:  # Quando chegar no final da página, cria uma nova
                # Adicionar rodapé antes de criar nova página
                adicionar_rodape(pdf, largura, altura)
                pdf.showPage()
                pdf.setFont("Helvetica", 12)
                y = altura - 40
            
            # Formatar a string para mostrar o código e o material
            material1 = f"{dados[i][1]} = {dados[i][0]}"  # Primeiro material
            material2 = f"{dados[i + 1][1]} = {dados[i + 1][0]}" if i + 1 < len(dados) else ""  # Segundo material, se existir

            # Desenha os dois materiais na mesma linha, com espaçamento entre eles
            pdf.drawString(30, y, material1)  # Margem esquerda reduzida para 30
            pdf.drawString(largura / 2 + 10, y, material2)  # Ajuste correspondente para o segundo material
            y -= espacamento
        
        # Adicionar rodapé na última página
        adicionar_rodape(pdf, largura, altura)
        
        pdf.save()
        self.progress_signal.emit(100)
        self.log_signal.emit("PDF salvo com sucesso!")


if __name__ == '__main__':
    # Iniciar a aplicação primeiro para mostrar a interface mais rapidamente
    app = QtWidgets.QApplication(sys.argv)
    app.setStyle('Fusion')
    
    # Definir uma paleta de cores adequada
    palette = QtGui.QPalette()
    palette.setColor(QtGui.QPalette.Window, QtGui.QColor(240, 240, 240))
    palette.setColor(QtGui.QPalette.WindowText, QtGui.QColor(0, 0, 0))
    palette.setColor(QtGui.QPalette.Base, QtGui.QColor(255, 255, 255))
    palette.setColor(QtGui.QPalette.AlternateBase, QtGui.QColor(245, 245, 245))
    palette.setColor(QtGui.QPalette.ToolTipBase, QtGui.QColor(255, 255, 255))
    palette.setColor(QtGui.QPalette.ToolTipText, QtGui.QColor(0, 0, 0))
    palette.setColor(QtGui.QPalette.Text, QtGui.QColor(0, 0, 0))
    palette.setColor(QtGui.QPalette.Button, QtGui.QColor(240, 240, 240))
    palette.setColor(QtGui.QPalette.ButtonText, QtGui.QColor(0, 0, 0))
    palette.setColor(QtGui.QPalette.BrightText, QtGui.QColor(255, 0, 0))
    palette.setColor(QtGui.QPalette.Highlight, QtGui.QColor(42, 130, 218))
    palette.setColor(QtGui.QPalette.HighlightedText, QtGui.QColor(255, 255, 255))
    app.setPalette(palette)
    
    # Criar a janela principal
    ex = MaterialListApp()
    
    
    
    sys.exit(app.exec_())

# Função para verificar dependências em segundo plano
def check_dependencies_async():
    try:
        # Iniciar uma thread para verificar/instalar dependências
        thread = QtCore.QThread()
        worker = DependencyWorker()
        worker.moveToThread(thread)
        thread.started.connect(worker.run)
        worker.finished.connect(thread.quit)
        thread.start()
    except Exception as e:
        print(f"Erro ao verificar dependências: {e}")
        # Verificar dependências em segundo plano após a interface já estar visível
    QtCore.QTimer.singleShot(100, lambda: check_dependencies_async())

# Classe para gerenciar dependências em thread separada
class DependencyWorker(QtCore.QObject):
    finished = QtCore.pyqtSignal()
    
    def run(self):
        try:
            # Verificar rarfile
            try:
                import rarfile
            except ImportError:
                # Instalar sem bloquear a interface
                import subprocess
                subprocess.Popen([sys.executable, "-m", "pip", "install", "rarfile"])
            
            # Configurar UnRAR apenas se necessário (em Windows)
            if os.name == 'nt':
                try:
                    import rarfile
                    # Verificar se já tem um caminho configurado
                    if not hasattr(rarfile, 'UNRAR_TOOL') or not os.path.exists(rarfile.UNRAR_TOOL):
                        unrar_paths = [
                            r'C:\Program Files\WinRAR\UnRAR.exe',
                            r'C:\Program Files (x86)\WinRAR\UnRAR.exe',
                            os.path.join(os.path.dirname(os.path.abspath(__file__)), 'UnRAR.exe')
                        ]
                        
                        for path in unrar_paths:
                            if os.path.exists(path):
                                rarfile.UNRAR_TOOL = path
                                break
                except Exception:
                    pass  # Ignorar erros na configuração do UnRAR
        except Exception as e:
            print(f"Erro ao verificar dependências: {e}")
        
        self.finished.emit()