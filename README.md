# Assistente da Serraria — versão 6

Aplicação estática em HTML, CSS e JavaScript, pensada para celular e para funcionar sem conta ou servidor de dados. Pode ser publicada no GitHub Pages.

## Melhorias incluídas nesta versão

### Redesign da emissão de notas — revisão de UX

- A emissão abre com a lista de produtos oculta. A busca mostra resultados ao digitar; a lista completa só aparece depois de tocar em “Ver lista completa de produtos”.
- A tela organiza a sequência em escolha do produto, quantidade/medidas/desconto, conferência dos itens, dados opcionais do cliente e total/finalização.
- Os campos se adaptam à forma de cobrança já cadastrada; as medidas de comprimento/largura e a regra do milheiro continuam sendo tratadas pelo cálculo original.
- A prévia do item, os descontos, a conferência financeira e o valor final têm rótulos mais claros. Os dados do cliente ficam visíveis e continuam sendo salvos enquanto são digitados.
- Os itens aparecem em cartões com total, detalhes de preço e ações explícitas de editar/remover. Remover um item pede confirmação.
- “Notas salvas e arquivos” agora abre com o histórico de notas antes das ferramentas administrativas. Cada nota pode ser aberta para impressão/PDF, e a impressão em lote permanece disponível.
- Ao salvar, a nota é gravada e abre uma pré-visualização de conferência com HTML/CSS responsivo próprio para tela. Ela reutiliza o conteúdo e os dados de `receiptHtml`, mas não cria folha A4, grade de impressão nem linhas vazias; a impressão continua usando seu documento independente. Fechar retorna à emissão limpa para uma nova nota.
- A seção “Notas” diferencia notas sem confirmação e com confirmação por uma etiqueta textual e cor verde-clara; é possível desfazer uma confirmação.

As fórmulas comerciais e o conteúdo/layout do comprovante A4 foram preservados. O campo aditivo `printConfirmed` e o campo `printConfirmedAt` são normalizados para notas antigas sem redefinir os demais dados; nenhuma limpeza ou reinicialização do armazenamento é necessária.

- **Histórico do Estoque:** tela própria para consultar entradas, saídas, ajustes e cadastros iniciais, com data sem horário, material, quantidade, saldo antes/depois e observações. Há filtros por período, material, tipo e pessoa responsável; os registros mais recentes aparecem primeiro.
- **Responsável pela retirada:** ao registrar uma saída, o campo “Pessoa responsável pela retirada” fica obrigatório. A data é gravada como data de calendário, sem horário. O material, a unidade, o nome do responsável e as observações são copiados para o registro histórico para que alterações futuras no cadastro não modifiquem as novas movimentações já gravadas.
- **Gerenciamento de produtos e preços:** a área “Produtos e preços” permite pesquisar, cadastrar, editar ou excluir produtos e atualizar nome, categoria, preço, forma/unidade de cobrança e especificações. Alterar o cadastro vale para vendas futuras; os itens e valores já gravados nas notas permanecem preservados.
- **Edição de item dentro da nota:** o botão “Editar item” muda descrição, quantidade, preço usado, medidas e desconto somente naquela nota em andamento, sem editar o cadastro principal.
- **Desconto por produto:** campo próprio no item da nota. A unidade do desconto acompanha a cobrança do produto (por unidade, metro, m² ou milheiro). O preço original cadastrado não é alterado.
- **Desconto geral:** campo separado em reais, aplicado uma única vez ao subtotal já reduzido pelos descontos de produto. O sistema impede desconto maior que o preço original por unidade comercial e impede desconto geral maior que o subtotal, para evitar valores finais negativos.
- **Histórico e impressão das notas:** as notas guardam preços originais, descontos por produto, totais por item, subtotal, desconto geral e total final. A impressão mostra os preços/descontos por unidade comercial e o resumo dos descontos.
- **Excel atualizado:** abas Estoque, Preços, Movimentações, Notas e Itens das notas. A exportação inclui responsável pela retirada e campos de subtotal/descontos/preço final.
- **Cópia de segurança JSON:** exporte e restaure o conjunto de dados local, incluindo o status e a data da confirmação de impressão. Backups antigos sem esses campos continuam aceitos e as notas são tratadas como “Não impressa”.
- **Funcionamento offline:** o service worker usa o cache `assistente-serraria-v6-preview-responsive` para carregar os arquivos atualizados após visitar a nova versão.

## Armazenamento e planilha — importante

- Os dados operacionais ficam no `localStorage` do navegador, neste aparelho e neste endereço do site. Não são enviados para GitHub ou para um servidor.
- **Não há sincronização ativa com Google Sheets nesta versão.** O arquivo Excel é uma fotografia dos dados no momento da exportação; ele não atualiza o site automaticamente e o site não lê alterações feitas na planilha.
- Abrir o mesmo site em outro aparelho/navegador não transfere automaticamente notas, saldos ou movimentações. Limpar os dados do navegador, mudar de endereço ou perder o aparelho pode apagar os dados locais. Exporte a cópia JSON regularmente e guarde-a fora do aparelho.
- Na migração, dados anteriores não são apagados. Para movimentações antigas que não tinham nome do material/unidade gravados no próprio registro, o sistema tenta preencher o nome a partir do cadastro de estoque relacionado. Esse preenchimento é apenas a melhor informação disponível; se o nome original já foi alterado antes da atualização, não é possível reconstruí-lo com certeza. Registros anteriores não contêm o nome do responsável se ele nunca foi informado.

## Publicar no GitHub Pages

1. Antes de substituir a versão publicada, abra **Arquivos e cópias → Salvar cópia de segurança (JSON)** e guarde os dados atuais.
2. Descompacte o ZIP e envie **todos os arquivos da pasta** para a raiz do repositório: `index.html`, `styles.css`, `app.js`, `manifest.webmanifest`, `sw.js`, `icon.svg` e `README.md`.
3. No repositório, abra **Settings → Pages** e configure a publicação pela branch principal (`main`) e pasta `/(root)`.
4. Abra o endereço publicado no Chrome do celular. No menu do navegador, use **Adicionar à tela inicial** para criar um atalho semelhante a aplicativo.
5. Se o navegador continuar mostrando a versão antiga, feche e reabra a página. O service worker desta versão usa um cache novo.

## Cadastro de produtos e unidades

Os preços e as observações já existentes foram preservados. Produtos de madeira cotados por metro linear usam quantidade e comprimento individual. Itens vendidos por m² usam comprimento e largura. Telha e tijolo configurados por milheiro permitem informar a quantidade física em unidades; o desconto é aplicado por milheiro porque essa é a unidade do preço cadastrado. Produtos com forma de cobrança incerta continuam bloqueados para nota até que a unidade seja confirmada em **Produtos e preços → Editar**.

## Verificações documentadas na versão-base

Os seguintes testes constavam na documentação recebida com a versão-base. Eles não foram reexecutados integralmente nesta revisão visual: fórmulas para unidade, metro linear, m², base de metros e milheiro; testes de integração de estoque e edição; exportação XLSX e validação das abas.

## Correção da pré-visualização responsiva — 15/10/2026

- `openReceiptPreview()` agora carrega `receiptPreviewHtml(receipt)`, um documento de tela separado, dentro do iframe já existente.
- `receiptPreviewHtml()` utiliza CSS responsivo em pixels/unidades relativas, sem `.sheet`, `@page`, dimensões em milímetros ou grade para múltiplas notas. Só a nota escolhida é renderizada.
- `receiptHtml(receipt, true)` reutiliza a estrutura e os valores atuais, mas não adiciona as linhas vazias reservadas ao formulário de impressão. A impressão continua chamando `receiptHtml` no modo padrão e mantém as linhas da folha física.
- O modal foi ampliado em telas grandes e seus estilos de tamanho foram ajustados para deixar o visualizador usar melhor a área disponível.
- Teste automatizado do HTML gerado: aprovado para ausência de `.sheet`, regras `@page`, dimensões fixas de papel e linhas vazias de impressão; os dados de exemplo de cliente/produto estão presentes.
- Comparação automatizada: o HTML gerado pela rotina original de impressão é byte a byte idêntico ao produzido pela versão atual para um lote de cinco notas.
- Validação sintática de `app.js` e `sw.js`: aprovada. Os estilos do HTML de pré-visualização e `styles.css` foram analisados com parser CSS sem erros sintáticos.

## Verificações desta atualização de fluxo de impressão

- `node --check app.js` e `node --check sw.js`: aprovados.
- Teste automatizado isolado com DOM/localStorage simulados: aprovado para lista de produtos oculta por padrão, exibição ao pesquisar ou pedir lista completa, adição com reset do seletor, preservação do formulário em erro de validação ou falha de armazenamento, salvamento sem abrir a impressão, pré-visualização sem `window.print()`, cancelamento da confirmação, confirmação vinculada apenas aos IDs da operação, desfazer confirmação, etiquetas do histórico e backup/restore antigo e novo.
- A confirmação de impressão atualiza somente as notas guardadas em `pendingPrintOperation.receiptIds`. O retorno do navegador apenas abre a pergunta; a atualização depende sempre da ação manual “Sim, confirmar impressão”. “Não, ainda não”, fechar a pergunta ou cancelar mantém o status anterior.
- O status é aditivo no registro da nota: `printConfirmed` (booleano) e `printConfirmedAt` (data/hora ISO quando confirmada). Notas antigas ausentes desses campos são consideradas sem confirmação. Os campos são incluídos no backup JSON e normalizados na restauração.
- Comparação técnica de impressão: a função `receiptHtml` não sofreu alteração funcional, e a string CSS do documento A4 foi comparada e permaneceu idêntica à versão-base. A rotina de geração do documento ganhou apenas o modo sem impressão automática para pré-visualização e o envio de um evento `afterprint` para solicitar confirmação, sem marcar notas automaticamente.
- Os testes usaram dados e armazenamento simulados; nenhum dado operacional do proprietário foi aberto, reinicializado ou alterado.

### Verificações pendentes

- A tentativa de renderização com Chromium headless não concluiu: o processo travou e precisou ser encerrado por timeout. Por isso, a responsividade foi verificada por análise do HTML/CSS gerado e testes automatizados, mas ainda não foi validada visualmente em um navegador real.
- Ainda é necessário conferir em Android real e computador; testar impressão cancelada/concluída e salvamento em PDF no navegador alvo; e verificar o papel A4 fisicamente. A comparação automatizada do HTML de impressão passou, mas não houve impressão física nesta revisão.
- Estoque, produtos/preços, histórico de movimentações e exportação XLSX não foram submetidos a uma regressão manual completa; suas rotinas comerciais não foram reescritas.
