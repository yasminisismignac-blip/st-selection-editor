# ST Selection Editor

Uma extensão para SillyTavern que permite:

- editar texto selecionado manualmente
- apagar a seleção
- pedir para a IA reescrever o texto selecionado usando uma API OpenAI-compatible
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
- Ou use o atalho `Ctrl/Cmd + E`.
- No painel:
  - edite manualmente
  - clique em `Aplicar`
  - clique em `Apagar`
  - ou use `IA`

## Configuração da IA

Preencha:

- API key
- Base URL
- Modelo
- Prompt

A extensão usa o formato OpenAI-compatible:

```text
https://api.openai.com/v1/chat/completions
```

## Observação

Este addon foi pensado para editar texto selecionado de forma rápida e simples, sem depender de frameworks pesados.
