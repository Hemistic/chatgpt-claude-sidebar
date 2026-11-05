(function () {
  'use strict';
  const h = React.createElement;
  const { useState } = React;
  function answersFor(questions, selected, custom) {
    const result = {};
    for (const question of questions) {
      const value = selected[question.id];
      const other = question.isOther && String(custom[question.id] || '').trim();
      const values = Array.isArray(value) ? [...value] : value ? [value] : [];
      if (other) values.push(other);
      if (values.length) result[question.id] = question.multiSelect ? values : values[values.length - 1];
    }
    return result;
  }
  // Joi/Doi/joi in app-primary-83c2b5ae05b6.js, productSurface=work.
  function Question({ block, onAnswer }) {
    const { Surface, Header, Marker, Button } = window.CodexRequestUI;
    const questions = block.questions || [];
    const [index, setIndex] = useState(0);
    const [selected, setSelected] = useState(() => Object.fromEntries(questions.filter(question => !question.multiSelect && question.options?.length).map(question => [question.id, question.options[0].value])));
    const [custom, setCustom] = useState({});
    const root = React.useRef(null), other = React.useRef(null), submitting = React.useRef(false);
    const current = questions[index];
    const pending = block.responsePending === true;
    React.useEffect(() => { root.current?.focus(); }, []);
    React.useEffect(() => { submitting.current = pending; }, [pending, block.responseError]);
    if (!current) return null;
    const answers = answersFor(questions, selected, custom);
    const hasCustom = !!String(custom[current.id] || '').trim();
    const multiValues = Array.isArray(selected[current.id]) ? selected[current.id] : [];
    const hasResponse = hasCustom || current.multiSelect && multiValues.length > 0;
    function submit(values) {
      if (pending || submitting.current) return;
      submitting.current = true;
      Promise.resolve(onAnswer(block.id, values)).finally(() => { submitting.current = false; });
    }
    function advance(values = selected, freeform = custom) {
      if (pending) return;
      if (index < questions.length - 1) { setIndex(value => value + 1); root.current?.focus(); return; }
      const result = answersFor(questions, values, freeform);
      if (questions.every(question => Object.hasOwn(result, question.id))) submit(result);
    }
    function choose(option) {
      if (pending) return;
      const next = { ...selected }, freeform = { ...custom };
      if (current.multiSelect) {
        const items = new Set(next[current.id] || []);
        items.has(option.value) ? items.delete(option.value) : items.add(option.value);
        next[current.id] = [...items];
      } else { next[current.id] = option.value; freeform[current.id] = ''; }
      setSelected(next); setCustom(freeform);
      if (!current.multiSelect) advance(next, freeform);
    }
    function navigate(next) {
      setIndex(Math.min(questions.length - 1, Math.max(0, next)));
      root.current?.focus();
    }
    function onKeyDown(event) {
      if (event.isComposing || pending || event.defaultPrevented) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); submit(null); return; }
      if (event.target.closest('input,textarea,button,summary')) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); navigate(index + (event.key === 'ArrowRight' ? 1 : -1)); }
      if (/^[1-9]$/.test(event.key) && current.options[Number(event.key) - 1]) { event.preventDefault(); choose(current.options[Number(event.key) - 1]); }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const position = current.options.findIndex(option => option.value === selected[current.id]);
        const option = current.options[Math.min(current.options.length - 1, Math.max(0, position + (event.key === 'ArrowDown' ? 1 : -1)))];
        if (option && !current.multiSelect) setSelected(values => ({ ...values, [current.id]: option.value }));
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        if (hasResponse) advance();
        else if (!current.multiSelect) { const option = current.options.find(option => option.value === selected[current.id]); if (option) choose(option); }
      }
    }
    return h(Surface, { ref: root, className: 'cg-question', 'aria-label': '需要你的选择', 'data-codex-composer-request-navigation': true, 'aria-busy': pending, tabIndex: 0, onKeyDown },
      h('div', { className: 'flex items-start justify-between ps-4 pe-3 pt-4 pb-2' },
        h('div', { className: 'min-w-0 flex-1' }, h(Header, { title: current.question })),
        questions.length > 1 ? h('div', { className: 'cg-question-navigation flex shrink-0 items-center gap-1 text-xs text-codex-description' },
          h(Button, { disabled: pending || index === 0, 'aria-label': '上一题', onClick: () => navigate(index - 1) }, '‹'),
          h('span', null, `${index + 1} of ${questions.length}`),
          h(Button, { disabled: pending || index === questions.length - 1, 'aria-label': '下一题', onClick: () => navigate(index + 1) }, '›')) : null),
      h('div', { className: 'flex flex-col gap-3 pt-1 pb-2 cg-question-body' },
        h('div', { className: 'flex flex-col gap-1 px-2' },
          h('div', { className: 'flex flex-col gap-1', role: current.multiSelect ? 'group' : 'radiogroup', 'aria-label': current.question }, current.options.map((option, i) => {
            const checked = current.multiSelect ? multiValues.includes(option.value) : selected[current.id] === option.value && !hasCustom;
            return h('button', { type: 'button', key: option.value, className: `cg-request-choice ${checked ? 'is-highlighted' : ''}`, role: current.multiSelect ? 'checkbox' : 'radio', 'aria-checked': checked, 'aria-label': option.label, disabled: pending, onClick: () => choose(option) },
              h(Marker, { index: i + 1, checkbox: current.multiSelect, checked }),
              h('span', { className: 'cg-question-choice-copy' }, h('span', { className: 'cg-question-choice-label' }, option.label), option.description ? h('span', { className: 'text-sm wrap-anywhere text-codex-description' }, option.description) : null),
              !current.multiSelect ? h('span', { className: 'cg-question-enter', 'aria-hidden': true }, '↵') : null);
          })),
          h('div', { className: 'cg-question-other-row flex items-center gap-2', 'data-request-input-other-row': current.isOther || undefined },
            current.isOther ? h('label', { className: 'cg-question-freeform' }, h(window.CodexSidebarView.Glyph, { name: 'edit', size: 18 }),
              h('input', { ref: other, type: current.isSecret ? 'password' : 'text', value: custom[current.id] || '', disabled: pending, placeholder: block.freeformPlaceholder || '其他，请说明…', 'aria-label': '其他回答',
                onChange: event => { setCustom(values => ({ ...values, [current.id]: event.target.value })); if (!current.multiSelect) setSelected(values => ({ ...values, [current.id]: '' })); },
                onKeyDown: event => { if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); event.stopPropagation(); if (hasResponse) advance(); } } })) : null,
            h(Button, { primary: hasResponse, disabled: pending, 'data-request-input-skip': !hasResponse || undefined,
              onClick: () => { if (hasResponse) advance(); else submit(null); } }, pending ? '正在提交…' : hasResponse ? index < questions.length - 1 ? '下一步' : '提交' : '跳过')))),
      block.responseError ? h('p', { role: 'alert', className: 'cg-request-error' }, block.responseError) : null);
  }

  window.CodexQuestionUI = Object.freeze({ Question, answersFor });
})();
