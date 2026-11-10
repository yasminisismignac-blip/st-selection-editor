(() => {
  const PANEL_ID = 'st-selection-editor-panel';
  const TOGGLE_ID = 'st-selection-editor-toggle';

  const state = {
    originTarget: null,
    originStart: 0,
    originEnd: 0,
    currentText: ''
  };

  function captureOriginSelection() {
    const active = document.activeElement;
    if (!active) return false;

    if (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT') {
      const start = typeof active.selectionStart === 'number' ? active.selectionStart : 0;
      const end = typeof active.selectionEnd === 'number' ? active.selectionEnd : 0;
      state.originTarget = active;
      state.originStart = start;
      state.originEnd = end;
      state.currentText = (active.value || '').slice(start, end);
      return !!state.currentText;
    }

    const sel = window.getSelection && window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const text = sel.toString().trim();
      state.originTarget = active;
      state.originStart = 0;
      state.originEnd = 0;
      state.currentText = text;
      return !!text;
    }

    return false;
  }

  function getTextToEdit() {
    return state.currentText || '';
  }

  function writeBackText(replacement) {
    const target = state.originTarget;
    if (!target) return false;

    if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
      const before = target.value.slice(0, state.originStart);
      const after = target.value.slice(state.originEnd);
      target.value = before + replacement + after;
      target.focus();
      const cursorPos = state.originStart + replacement.length;
      try { target.setSelectionRange(cursorPos, cursorPos); } catch (error) {}
      target.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      return true;
    }

    const sel = window.getSelection ? window.getSelection() : null;
    if (sel && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const node = document.createTextNode(replacement);
      range.insertNode(node);
      range.setStartAfter(node);
      range.setEndAfter(node);
      sel.removeAllRanges();
      sel.addRange(range);
      return true;
    }

    return false;
  }

  function deleteSelection() {
    const target = state.originTarget;
    if (!target) return false;

    if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
      const before = target.value.slice(0, state.originStart);
      const after = target.value.slice(state.originEnd);
      target.value = before + after;
      target.focus();
      const cursorPos = state.originStart;
      try { target.setSelectionRange(cursorPos, cursorPos); } catch (error) {}
      target.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      return true;
    }

    const sel = window.getSelection ? window.getSelection() : null;
    if (sel && sel.rangeCount) {
      sel.getRangeAt(0).deleteContents();
      sel.removeAllRanges();
      return true;
    }

    return false;
  }

  function getSTModelCall() {
    const ctx = (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') ? window.SillyTavern.getContext() : null;
    if (ctx) {
      if (typeof ctx.generateQuietPrompt === 'function') return ctx.generateQuietPrompt.bind(ctx);
      if (typeof ctx.generatePrompt === 'function') return ctx.generatePrompt.bind(ctx);
      if (ctx.ChatCompletionService && typeof ctx.ChatCompletionService.processRequest === 'function') {
        return ctx.ChatCompletionService.processRequest.bind(ctx.ChatCompletionService);
      }
    }
    if (typeof window.generateQuietPrompt === 'function') return window.generateQuietPrompt.bind(window);
    if (typeof window.generatePrompt === 'function') return window.generatePrompt.bind(window);
    return null;
  }

  async function rewriteWithSTModel(text) {
    const fn = getSTModelCall();
    if (!fn) {
      throw new Error('O modelo do SillyTavern não está acessível a esta extensão.');
    }

    const prompt = [
      'You are a text editor. Preserve the meaning and tone, improve clarity, and return only the final text.',
      '',
      'Text to rewrite:',
      text
    ].join('\n');

    try {
      const result = await fn({ quietPrompt: prompt });
      return String(result || '').trim();
    } catch (error) {
      const fallback = await fn(prompt);
      return String(fallback || '').trim();
    }
  }

  function showStatus(panel, message, isError = false) {
    const status = panel.querySelector('#st-selection-editor-status');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('error', isError);
  }

  function createPanel() {
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.className = 'st-selection-editor-panel';
    panel.innerHTML = `
      <div class="st-selection-editor-header">
        <strong>Editar seleção</strong>
        <button type="button" class="st-selection-editor-close">×</button>
      </div>
      <div class="st-selection-editor-body">
        <div class="st-se-block">
          <label>Texto selecionado</label>
          <textarea id="st-selection-editor-input" rows="6" placeholder="Selecione um texto no chat ou no campo de edição..."></textarea>
        </div>

        <div class="st-se-actions">
          <button type="button" data-action="apply">Aplicar edição</button>
          <button type="button" data-action="delete" class="secondary">Apagar seleção</button>
          <button type="button" data-action="ai" class="primary">IA do SillyTavern</button>
        </div>

        <div id="st-selection-editor-status" class="st-se-alert" aria-live="polite"></div>
      </div>
    `;

    panel.querySelector('.st-selection-editor-close').addEventListener('click', () => {
      panel.classList.remove('open');
    });

    const input = panel.querySelector('#st-selection-editor-input');
    input.value = getTextToEdit();

    panel.querySelector('[data-action="apply"]').addEventListener('click', () => {
      const value = (input.value || '').trim();
      if (!value) {
        showStatus(panel, 'Nada para aplicar.', true);
        return;
      }

      const ok = writeBackText(value);
      if (ok) {
        showStatus(panel, 'Texto atualizado.');
        panel.classList.remove('open');
      } else {
        showStatus(panel, 'Não foi possível salvar no campo ativo.', true);
      }
    });

    panel.querySelector('[data-action="delete"]').addEventListener('click', () => {
      const ok = deleteSelection();
      if (ok) {
        showStatus(panel, 'Seleção removida.');
        panel.classList.remove('open');
      } else {
        showStatus(panel, 'Não foi possível apagar o texto selecionado.', true);
      }
    });

    panel.querySelector('[data-action="ai"]').addEventListener('click', async () => {
      const currentValue = (input.value || '').trim();
      if (!currentValue) {
        showStatus(panel, 'Selecione algo antes de chamar a IA.', true);
        return;
      }

      try {
        showStatus(panel, 'A IA do SillyTavern está reescrevendo...');
        const rewritten = await rewriteWithSTModel(currentValue);
        input.value = rewritten;
        showStatus(panel, 'Texto reescrito pela IA.');
      } catch (error) {
        showStatus(panel, String(error?.message || error), true);
      }
    });

    return panel;
  }

  function openPanel() {
    const ok = captureOriginSelection();
    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = createPanel();
      document.body.appendChild(panel);
    }

    const input = panel.querySelector('#st-selection-editor-input');
    if (input) {
      input.value = getTextToEdit();
    }

    if (!ok) {
      showStatus(panel, 'Nada selecionado. Selecione um texto antes de editar.', true);
    }

    panel.classList.add('open');
  }

  function addToggleButton() {
    if (document.getElementById(TOGGLE_ID)) return;
    const button = document.createElement('button');
    button.id = TOGGLE_ID;
    button.type = 'button';
    button.className = 'st-selection-editor-toggle';
    button.textContent = '✏️';
    button.title = 'Editar texto selecionado';
    button.addEventListener('click', openPanel);
    document.body.appendChild(button);
  }

  function bindShortcuts() {
    document.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e') {
        event.preventDefault();
        openPanel();
      }
    });
  }

  function init() {
    addToggleButton();
    bindShortcuts();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
