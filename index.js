(() => {
  const PANEL_ID = 'st-selection-editor-panel';
  const TOGGLE_ID = 'st-selection-editor-toggle';
  const KEY = 'st-selection-editor-settings';
  const DEFAULTS = {
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    prompt: 'Rewrite the selected text to improve clarity while preserving meaning, tone, and natural flow. Return only the final text.'
  };

  function getSettings() {
    try {
      const raw = localStorage.getItem(KEY);
      return { ...DEFAULTS, ...(raw ? JSON.parse(raw) : {}) };
    } catch {
      return { ...DEFAULTS };
    }
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      // no-op
    }
  }

  function getActiveTarget() {
    const active = document.activeElement;
    if (active) {
      if (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT') return active;
      if (active.isContentEditable) return active;
    }
    return document.querySelector('textarea, input[type="text"], input[type="search"], [contenteditable="true"]');
  }

  function getSelectedText() {
    const target = getActiveTarget();
    if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) {
      if (typeof target.selectionStart === 'number' && typeof target.selectionEnd === 'number') {
        return target.value.slice(target.selectionStart, target.selectionEnd);
      }
    }
    const sel = window.getSelection ? window.getSelection() : null;
    return sel ? sel.toString().trim() : '';
  }

  function applyReplacement(replacement) {
    const target = getActiveTarget();

    if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) {
      if (typeof target.selectionStart === 'number' && typeof target.selectionEnd === 'number') {
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const nextValue = target.value.slice(0, start) + replacement + target.value.slice(end);
        target.value = nextValue;
        target.focus();
        const cursor = start + replacement.length;
        target.setSelectionRange(cursor, cursor);
        target.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
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

  function deleteSelected() {
    const target = getActiveTarget();
    if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) {
      if (typeof target.selectionStart === 'number' && typeof target.selectionEnd === 'number') {
        const start = target.selectionStart;
        const end = target.selectionEnd;
        target.value = target.value.slice(0, start) + target.value.slice(end);
        target.focus();
        target.setSelectionRange(start, start);
        target.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
    }

    const sel = window.getSelection ? window.getSelection() : null;
    if (sel && sel.rangeCount) {
      sel.getRangeAt(0).deleteContents();
      sel.removeAllRanges();
      return true;
    }

    return false;
  }

  async function callAI(selectedText) {
    const settings = getSettings();
    if (!settings.apiKey) throw new Error('Digite a API key antes de usar a IA.');

    const url = `${String(settings.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')}/chat/completions`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: settings.model || 'gpt-4o-mini',
        temperature: 0.4,
        messages: [
          { role: 'system', content: settings.prompt || DEFAULTS.prompt },
          { role: 'user', content: `Texto selecionado:\n${selectedText}` }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro da API (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return String(data?.choices?.[0]?.message?.content || '').trim();
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
        <strong>Editor de Texto</strong>
        <button type="button" class="st-selection-editor-close">×</button>
      </div>
      <div class="st-selection-editor-body">
        <div class="st-se-block">
          <label>Texto selecionado</label>
          <textarea id="st-selection-editor-input" rows="6" placeholder="Selecione algum texto..."></textarea>
        </div>

        <div class="st-se-actions">
          <button type="button" data-action="apply">Aplicar</button>
          <button type="button" data-action="delete" class="secondary">Apagar</button>
          <button type="button" data-action="ai" class="primary">IA</button>
        </div>

        <div id="st-selection-editor-status" class="st-se-alert" aria-live="polite"></div>

        <details open class="st-se-settings">
          <summary>Configuração da IA</summary>
          <div class="st-se-setting-row">
            <label>API key</label>
            <input id="st-selection-editor-api" type="password" placeholder="sk-..." />
          </div>
          <div class="st-se-setting-row">
            <label>Base URL</label>
            <input id="st-selection-editor-base" type="text" value="https://api.openai.com/v1" />
          </div>
          <div class="st-se-setting-row">
            <label>Modelo</label>
            <input id="st-selection-editor-model" type="text" value="gpt-4o-mini" />
          </div>
          <div class="st-se-setting-row">
            <label>Prompt</label>
            <textarea id="st-selection-editor-prompt" rows="3">Rewrite the selected text to improve clarity while preserving meaning, tone, and natural flow. Return only the final text.</textarea>
          </div>
        </details>
      </div>
    `;

    panel.querySelector('.st-selection-editor-close').addEventListener('click', () => {
      panel.classList.remove('open');
    });

    const input = panel.querySelector('#st-selection-editor-input');
    const api = panel.querySelector('#st-selection-editor-api');
    const base = panel.querySelector('#st-selection-editor-base');
    const model = panel.querySelector('#st-selection-editor-model');
    const prompt = panel.querySelector('#st-selection-editor-prompt');

    const settings = getSettings();
    api.value = settings.apiKey || '';
    base.value = settings.baseUrl || 'https://api.openai.com/v1';
    model.value = settings.model || 'gpt-4o-mini';
    prompt.value = settings.prompt || DEFAULTS.prompt;
    input.value = getSelectedText();

    panel.querySelector('[data-action="apply"]').addEventListener('click', () => {
      const text = input.value.trim();
      if (!text) return showStatus(panel, 'Nenhum texto para aplicar.', true);
      const ok = applyReplacement(text);
      if (ok) {
        showStatus(panel, 'Texto editado com sucesso.');
        panel.classList.remove('open');
      } else {
        showStatus(panel, 'Não foi possível localizar a seleção ativa.', true);
      }
    });

    panel.querySelector('[data-action="delete"]').addEventListener('click', () => {
      const ok = deleteSelected();
      if (ok) {
        showStatus(panel, 'Seleção removida.');
        panel.classList.remove('open');
      } else {
        showStatus(panel, 'Não foi possível apagar a seleção.', true);
      }
    });

    panel.querySelector('[data-action="ai"]').addEventListener('click', async () => {
      const text = input.value.trim();
      if (!text) return showStatus(panel, 'Selecione algo antes de pedir ajuda da IA.', true);

      const settings = getSettings();
      settings.apiKey = api.value.trim();
      settings.baseUrl = base.value.trim();
      settings.model = model.value.trim();
      settings.prompt = prompt.value.trim();
      saveSettings(settings);

      try {
        showStatus(panel, 'A IA está reescrevendo a seleção...');
        const rewritten = await callAI(text);
        input.value = rewritten;
        showStatus(panel, 'Texto reescrito pela IA.');
      } catch (error) {
        showStatus(panel, String(error?.message || error), true);
      }
    });

    return panel;
  }

  function openPanel() {
    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = createPanel();
      document.body.appendChild(panel);
    }

    const settings = getSettings();
    panel.querySelector('#st-selection-editor-api').value = settings.apiKey || '';
    panel.querySelector('#st-selection-editor-base').value = settings.baseUrl || 'https://api.openai.com/v1';
    panel.querySelector('#st-selection-editor-model').value = settings.model || 'gpt-4o-mini';
    panel.querySelector('#st-selection-editor-prompt').value = settings.prompt || DEFAULTS.prompt;
    panel.querySelector('#st-selection-editor-input').value = getSelectedText();
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
