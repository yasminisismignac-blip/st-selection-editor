# ST Selection Editor

Uma extensão para SillyTavern que permite:

- editar texto selecionado manualmente
- apagar a seleção
- pedir para o próprio modelo do SillyTavern reescrever o texto selecionado
- funcionar em desktop e celular

## Instalação

1. Abra o SillyTavern.
2. Vá em Extensions -> Install Extension.
3. Cole este repositório:

```text
https://github.com/yasminisismignac-blip/st-selection-editor
```

4. Instale e recarregue a página.

## Como usar

- Selecione um texto em qualquer caixa de texto do chat ou em um campo editável.
- Pressione o botão `✏️` no canto inferior direito.
- Ou use `Ctrl/Cmd + E`.
- No painel:
  - edite manualmente
  - clique em `Aplicar edição`
  - clique em `Apagar seleção`
  - ou use `IA do SillyTavern`

## Observação importante

Esta versão usa o modelo que o SillyTavern já está usando, sem pedir API key nem URL.
A extensão salva a seleção original antes de abrir o painel, para evitar o problema em que o foco muda e o texto não era realmente alterado.

## Correção aplicada

A lógica de edição foi corrigida para:

- capturar a seleção ativa antes de abrir o painel
- voltar o texto para o campo original
- apagar a seleção corretamente
- reaproveitar o modelo atual do SillyTavern para a IA
