(function () {
  var mode = 'design';
  var isSummernote = false;
  var documentElement;
  var fillDocumentElement;
  var savedRange;
  var cellColorTarget;
  var pendingCellColor;
  var pendingCellColorArmed = false;
  var lastFillTarget;

  function byId(id) {
    return document.getElementById(id);
  }

  function post(type, data) {
    var message = data || {};
    message.Type = type;
    message.type = type;
    try {
      if (window.CefSharp && window.CefSharp.PostMessage) {
        window.CefSharp.PostMessage(JSON.stringify(message));
      }
    } catch (ex) {
    }
  }

  function hasSummernote() {
    return window.jQuery && window.jQuery.fn && window.jQuery.fn.summernote;
  }

  function editable() {
    if (mode === 'fill' && fillDocumentElement) {
      return fillDocumentElement;
    }
    if (isSummernote) {
      documentElement = document.querySelector('.note-editable');
    }
    if (!documentElement) {
      documentElement = byId('document');
    }
    return documentElement;
  }

  function showDesignSurface(show) {
    var page = byId('page');
    var noteEditor = document.querySelector('.note-editor');
    if (page) {
      page.style.display = show ? '' : 'none';
    }
    if (noteEditor) {
      noteEditor.style.display = show ? '' : 'none';
    }
  }

  function removeFillSurface() {
    var oldPage = document.querySelector('.fill-page');
    if (oldPage && oldPage.parentNode) {
      oldPage.parentNode.removeChild(oldPage);
    }
    fillDocumentElement = null;
  }

  function createFillSurface() {
    var workspace = byId('workspace');
    if (!workspace) {
      return;
    }

    removeFillSurface();
    var page = document.createElement('div');
    page.className = 'a4-page fill-page';

    var doc = document.createElement('div');
    doc.className = 'document fill-document';
    doc.setAttribute('contenteditable', 'false');
    doc.innerHTML = getHtml();

    page.appendChild(doc);
    workspace.appendChild(page);
    fillDocumentElement = doc;
    showDesignSurface(false);
    bindFieldEvents();
    bindFillControlEvents(doc);
  }

  function restoreDesignSurface() {
    removeFillSurface();
    showDesignSurface(true);
  }

  function focusDocument() {
    var doc = editable();
    if (!doc) {
      return;
    }
    doc.focus();
    if (!window.getSelection) {
      return;
    }

    var range = getEditorRange() || createEndRange(doc);
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    savedRange = range.cloneRange();
  }

  function rememberEditorRange() {
    if (!window.getSelection) {
      return;
    }

    var selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
      return;
    }

    var range = selection.getRangeAt(0);
    if (isRangeInEditor(range)) {
      savedRange = range.cloneRange();
      if (isSummernote) {
        try {
          window.jQuery('#document').summernote('saveRange');
        } catch (ex) {
        }
      }
    }
  }

  function createEndRange(node) {
    var range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);
    return range;
  }

  function isRangeInEditor(range) {
    var doc = editable();
    return !!(doc && range && doc.contains(range.commonAncestorContainer));
  }

  function getEditorRange() {
    if (window.getSelection) {
      var selection = window.getSelection();
      if (selection && selection.rangeCount) {
        var currentRange = selection.getRangeAt(0);
        if (isRangeInEditor(currentRange)) {
          return currentRange;
        }
      }
    }

    if (isRangeInEditor(savedRange)) {
      return savedRange;
    }

    return null;
  }

  function getHtml() {
    if (isSummernote) {
      return window.jQuery('#document').summernote('code');
    }
    return editable().innerHTML;
  }

  function setHtml(html) {
    restoreDesignSurface();
    if (isSummernote) {
      window.jQuery('#document').summernote('code', html || '');
      documentElement = document.querySelector('.note-editable');
    } else {
      editable().innerHTML = html || '';
    }
    bindFieldEvents();
    setReadonlyForMode();
  }

  function insertHtml(html) {
    if (mode !== 'design') {
      return;
    }
    focusDocument();
    document.execCommand('insertHTML', false, html);
    rememberEditorRange();
    bindFieldEvents();
    post('content-changed');
  }

  function htmlEscape(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function guid() {
    return 'f' + Math.random().toString(16).slice(2) + new Date().getTime().toString(16);
  }

  function getConfig(config) {
    config = config || {};
    return {
      id: config.id || guid(),
      label: config.label || '입력 필드',
      options: config.options || ['OK', 'NG', 'N/A']
    };
  }

  function trimText(value) {
    return String(value || '').replace(/^\s+|\s+$/g, '');
  }

  function promptFieldConfig(defaultLabel, includeOptions) {
    if (mode !== 'design') {
      return null;
    }

    var label = window.prompt('필드명', defaultLabel);
    if (label === null) {
      return null;
    }

    var config = {
      id: guid(),
      label: trimText(label) || defaultLabel
    };

    if (includeOptions) {
      var optionText = window.prompt('콤보 옵션(쉼표 구분)', 'OK,NG,N/A');
      if (optionText === null) {
        return null;
      }
      var rawOptions = optionText.split(',');
      var options = [];
      for (var i = 0; i < rawOptions.length; i++) {
        var option = trimText(rawOptions[i]);
        if (option) {
          options.push(option);
        }
      }
      config.options = options.length ? options : ['OK', 'NG', 'N/A'];
    }

    return config;
  }

  function getSelectedCell() {
    var range = getEditorRange();
    var node = range && range.commonAncestorContainer;
    return findCellFromNode(node);
  }

  function findCellFromNode(node) {
    while (node && node.nodeType !== 1) {
      node = node.parentNode;
    }
    while (node && node.tagName !== 'TD' && node.tagName !== 'TH') {
      node = node.parentNode;
    }
    return node;
  }

  function getSelectedTable() {
    var node = getSelectedCell();
    while (node && node.tagName !== 'TABLE') {
      node = node.parentNode;
    }
    return node;
  }

  function getTableColumnCount(table) {
    var maxColumns = 0;
    if (!table) {
      return 0;
    }
    for (var r = 0; r < table.rows.length; r++) {
      var columns = 0;
      for (var c = 0; c < table.rows[r].cells.length; c++) {
        columns += table.rows[r].cells[c].colSpan || 1;
      }
      if (columns > maxColumns) {
        maxColumns = columns;
      }
    }
    return maxColumns;
  }

  function requireCell() {
    var cell = getSelectedCell();
    if (!cell) {
      post('error', { Message: '표 셀 안에 커서를 둔 뒤 실행하세요.', message: '표 셀 안에 커서를 둔 뒤 실행하세요.' });
    }
    return cell;
  }

  function applyCellBackground(cell, color, silent) {
    if (!cell) {
      if (!silent) {
        post('error', { Message: '표 셀 안에 커서를 둔 뒤 실행하세요.', message: '표 셀 안에 커서를 둔 뒤 실행하세요.' });
      }
      return;
    }
    cell.style.backgroundColor = color || '#dfeef3';
    post('content-changed');
  }

  function getFocusedField() {
    var node = document.activeElement;
    if (!node || node === document.body) {
      node = lastFillTarget;
    }
    var field = findFieldFromNode(node);
    if (field) {
      return field;
    }
    return findFieldFromNode(lastFillTarget);
  }

  function findFieldFromNode(node) {
    while (node && node !== document.body) {
      if (hasClass(node, 'field-control') || hasClass(node, 'image-field')) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  function hasClass(node, className) {
    return node && node.className && String(node.className).indexOf(className) >= 0;
  }

  function isNativeFillControl(node) {
    if (!node || !node.tagName) {
      return false;
    }
    var tag = node.tagName.toUpperCase();
    if (tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA' && tag !== 'BUTTON') {
      return false;
    }
    return hasClass(node, 'field-control') || (node.getAttribute && node.getAttribute('data-image-action'));
  }

  function isAllowedFillTarget(node) {
    if (!node) {
      return false;
    }
    while (node && node !== document.body) {
      if (isNativeFillControl(node)) {
        return true;
      }
      if (hasClass(node, 'field-control')) {
        return true;
      }
      if (node.getAttribute && node.getAttribute('data-image-action')) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  }

  function isAllowedFillEvent(event) {
    if (isAllowedFillTarget(event.target)) {
      return true;
    }
    if (isAllowedFillTarget(document.activeElement)) {
      return true;
    }
    if (isNativeFillControl(document.activeElement)) {
      return true;
    }
    if (isNativeFillControl(lastFillTarget)) {
      return true;
    }
    if (event.composedPath) {
      var path = event.composedPath();
      for (var i = 0; i < path.length; i++) {
        if (isAllowedFillTarget(path[i])) {
          return true;
        }
      }
    }
    return false;
  }

  function preventFillEdit(event) {
    if (mode !== 'fill' || isAllowedFillEvent(event)) {
      return;
    }

    if (event.type === 'keydown') {
      var key = event.key || '';
      var allowedKeys = {
        Tab: true,
        Shift: true,
        Control: true,
        Alt: true,
        Escape: true,
        ArrowLeft: true,
        ArrowRight: true,
        ArrowUp: true,
        ArrowDown: true,
        Home: true,
        End: true,
        PageUp: true,
        PageDown: true
      };
      if (allowedKeys[key]) {
        return;
      }
      if ((event.ctrlKey || event.metaKey) && (key === 'a' || key === 'A' || key === 'c' || key === 'C')) {
        return;
      }
    }

    event.preventDefault();
    event.stopPropagation();
  }

  function applyFieldFormat(command, value) {
    var target = getFocusedField();
    if (!target) {
      return;
    }

    if (command === 'bold') {
      target.style.fontWeight = target.style.fontWeight === '700' || target.style.fontWeight === 'bold' ? '' : '700';
    } else if (command === 'italic') {
      target.style.fontStyle = target.style.fontStyle === 'italic' ? '' : 'italic';
    } else if (command === 'underline') {
      target.style.textDecoration = target.style.textDecoration === 'underline' ? '' : 'underline';
    } else if (command === 'justifyLeft') {
      target.style.textAlign = 'left';
    } else if (command === 'justifyCenter') {
      target.style.textAlign = 'center';
    } else if (command === 'justifyRight') {
      target.style.textAlign = 'right';
    } else if (command === 'fontSize') {
      target.style.fontSize = fontSizeToCss(value);
    } else if (command === 'fontName') {
      target.style.fontFamily = value;
    } else if (command === 'foreColor') {
      target.style.color = value;
    }

    syncEditorCodeFromDom();
    post('content-changed');
  }

  function fontSizeToCss(value) {
    if (value === '1') {
      return '10px';
    }
    if (value === '2') {
      return '12px';
    }
    if (value === '4') {
      return '18px';
    }
    if (value === '5') {
      return '22px';
    }
    if (value === '6') {
      return '28px';
    }
    return '14px';
  }

  function runCommand(command, value) {
    if (mode === 'fill') {
      applyFieldFormat(command, value);
      return;
    }

    if (isSummernote) {
      var method = command;
      if (command === 'justifyLeft') {
        method = 'justifyLeft';
      } else if (command === 'justifyCenter') {
        method = 'justifyCenter';
      } else if (command === 'justifyRight') {
        method = 'justifyRight';
      } else if (command === 'fontName') {
        method = 'fontName';
      } else if (command === 'fontSize') {
        method = 'fontSize';
      } else if (command === 'foreColor') {
        method = 'foreColor';
      }
      window.jQuery('#document').summernote(method, value);
    } else {
      focusDocument();
      document.execCommand(command, false, value || null);
    }
    post('content-changed');
  }

  function setReadonlyForMode() {
    var doc = editable();
    if (!doc) {
      return;
    }

    document.body.className = mode === 'fill' ? 'fill-mode' : '';
    updateCommandToolbar();
    doc.setAttribute('contenteditable', mode === 'fill' ? 'false' : 'true');

    var fields = doc.querySelectorAll('input, select, textarea, button');
    for (var i = 0; i < fields.length; i++) {
      fields[i].disabled = false;
      fields[i].removeAttribute('disabled');
      fields[i].removeAttribute('readonly');
      if (mode === 'design' && fields[i].tagName === 'BUTTON') {
        fields[i].disabled = true;
        fields[i].setAttribute('disabled', 'disabled');
      }
    }
    bindFillControlEvents(doc);
  }

  function updateCommandToolbar() {
    var toolbar = byId('dynamic-toolbar');
    if (!toolbar) {
      return;
    }
    var buttons = toolbar.querySelectorAll('[data-design-only="true"]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].disabled = mode !== 'design';
    }
  }

  function syncEditorCodeFromDom() {
    var doc = editable();
    syncFieldAttributes(doc);
  }

  function bindFieldEvents() {
    var doc = editable();
    if (!doc || doc.getAttribute('data-dynamic-events') === '1') {
      return;
    }
    doc.setAttribute('data-dynamic-events', '1');

    doc.addEventListener('input', function () {
      rememberEditorRange();
      post('content-changed');
    });
    doc.addEventListener('change', function () {
      rememberEditorRange();
      post('content-changed');
    });
    doc.addEventListener('keyup', rememberEditorRange);
    doc.addEventListener('mouseup', rememberEditorRange);
    doc.addEventListener('keydown', preventFillEdit, true);
    doc.addEventListener('beforeinput', preventFillEdit, true);
    doc.addEventListener('paste', preventFillEdit, true);
    doc.addEventListener('drop', preventFillEdit, true);
    doc.addEventListener('mousedown', function (event) {
      var target = event.target;
      rememberEditorRange();
      if (hasClass(target, 'field-control')) {
        lastFillTarget = target;
      } else if (findImageField(target)) {
        lastFillTarget = findImageField(target);
      } else {
        lastFillTarget = null;
      }
    });
    doc.addEventListener('click', function (event) {
      var target = event.target;
      var clickedCell = findCellFromNode(target);
      if (mode === 'design' && pendingCellColorArmed && clickedCell) {
        applyCellBackground(clickedCell, pendingCellColor, true);
        pendingCellColor = null;
        pendingCellColorArmed = false;
        cellColorTarget = null;
      }
      if (hasClass(target, 'field-control')) {
        lastFillTarget = target;
      } else if (findImageField(target)) {
        var imageFocus = findImageField(target);
        lastFillTarget = imageFocus;
      } else {
        lastFillTarget = null;
      }
      if (target && target.getAttribute('data-image-action') === 'choose') {
        var field = findImageField(target);
        if (field && mode === 'fill') {
          post('choose-image', { FieldId: field.getAttribute('data-field-id'), fieldId: field.getAttribute('data-field-id') });
        }
      }
      if (target && target.getAttribute('data-image-action') === 'remove') {
        var removeField = findImageField(target);
        if (removeField && mode === 'fill') {
          clearImageNode(removeField);
          syncEditorCodeFromDom();
          post('image-remove', { FieldId: removeField.getAttribute('data-field-id'), fieldId: removeField.getAttribute('data-field-id') });
          post('content-changed');
        }
      }
    });
    doc.addEventListener('focusin', function (event) {
      var target = event.target;
      if (hasClass(target, 'field-control')) {
        lastFillTarget = target;
      } else if (target !== doc) {
        lastFillTarget = null;
      }
      rememberEditorRange();
    });
  }

  function bindFillControlEvents(root) {
    root = root || editable();
    if (!root) {
      return;
    }

    var controls = root.querySelectorAll('input.field-control, select.field-control, textarea.field-control');
    for (var i = 0; i < controls.length; i++) {
      bindFillControlEvent(controls[i]);
    }
  }

  function bindFillControlEvent(control) {
    if (!control || control.getAttribute('data-fill-events') === '1') {
      return;
    }
    control.setAttribute('data-fill-events', '1');

    control.addEventListener('mousedown', function (event) {
      lastFillTarget = control;
      if (mode === 'fill' && control.focus) {
        control.focus();
      }
      event.stopPropagation();
    });

    control.addEventListener('click', function (event) {
      lastFillTarget = control;
      if (mode === 'fill' && control.focus) {
        control.focus();
      }
      event.stopPropagation();
    });

    control.addEventListener('focus', function () {
      lastFillTarget = control;
    });

    control.addEventListener('keydown', function (event) {
      lastFillTarget = control;
      if (mode === 'fill') {
        event.stopPropagation();
      }
    });

    control.addEventListener('beforeinput', function (event) {
      lastFillTarget = control;
      if (mode === 'fill') {
        event.stopPropagation();
      }
    });

    control.addEventListener('paste', function (event) {
      lastFillTarget = control;
      if (mode === 'fill') {
        event.stopPropagation();
      }
    });

    control.addEventListener('input', function (event) {
      lastFillTarget = control;
      syncFieldAttributes(control.parentNode || editable());
      post('content-changed');
      if (mode === 'fill') {
        event.stopPropagation();
      }
    });

    control.addEventListener('change', function (event) {
      lastFillTarget = control;
      syncFieldAttributes(control.parentNode || editable());
      post('content-changed');
      if (mode === 'fill') {
        event.stopPropagation();
      }
    });
  }

  function trackSelection() {
    document.addEventListener('selectionchange', function () {
      rememberEditorRange();
    });
  }

  function bindToolbarEvents() {
    var toolbar = byId('dynamic-toolbar');
    if (!toolbar || toolbar.getAttribute('data-range-events') === '1') {
      return;
    }
    toolbar.setAttribute('data-range-events', '1');
    toolbar.addEventListener('mousedown', function (event) {
      var target = event.target;
      rememberEditorRange();
      if (target && target.tagName === 'BUTTON') {
        event.preventDefault();
      }
    }, true);
  }

  function findImageField(node) {
    while (node && !hasClass(node, 'image-field')) {
      node = node.parentNode;
    }
    return node;
  }

  function clearImageNode(field) {
    if (!field) {
      return;
    }
    field.className = 'image-field';
    field.removeAttribute('data-image-src');
    var img = field.querySelector('img.image-preview');
    if (img) {
      img.removeAttribute('src');
    }
  }

  function findFieldLabel(node) {
    while (node && node !== document) {
      if (hasClass(node, 'field-label')) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  function syncFieldAttributes(root) {
    root = root || editable();
    var controls = root.querySelectorAll('input, textarea, select');
    for (var i = 0; i < controls.length; i++) {
      var control = controls[i];
      if (control.tagName === 'SELECT') {
        for (var j = 0; j < control.options.length; j++) {
          if (control.options[j].selected) {
            control.options[j].setAttribute('selected', 'selected');
          } else {
            control.options[j].removeAttribute('selected');
          }
        }
      } else if (control.type === 'checkbox') {
        if (control.checked) {
          control.setAttribute('checked', 'checked');
        } else {
          control.removeAttribute('checked');
        }
      } else {
        control.setAttribute('value', control.value || '');
      }
    }
  }

  function clearFieldValues(root) {
    root = root || editable();
    var controls = root.querySelectorAll('input, textarea, select');
    for (var i = 0; i < controls.length; i++) {
      var control = controls[i];
      if (control.tagName === 'SELECT') {
        control.selectedIndex = 0;
        for (var j = 0; j < control.options.length; j++) {
          control.options[j].removeAttribute('selected');
        }
      } else if (control.type === 'checkbox') {
        control.checked = false;
        control.removeAttribute('checked');
      } else {
        control.value = '';
        control.setAttribute('value', '');
      }
    }

    var images = root.querySelectorAll('.image-field');
    for (var k = 0; k < images.length; k++) {
      clearImageNode(images[k]);
    }
  }

  function prepareRootForPrint(root) {
    root = root || document;
    syncFieldAttributes(root);
    var oldValues = root.querySelectorAll('.print-value');
    for (var o = 0; o < oldValues.length; o++) {
      oldValues[o].parentNode.removeChild(oldValues[o]);
    }
    var oldHidden = root.querySelectorAll('.print-hidden');
    for (var h = 0; h < oldHidden.length; h++) {
      oldHidden[h].className = oldHidden[h].className.replace(/\bprint-hidden\b/g, '').replace(/\s+/g, ' ');
    }
    var selects = root.querySelectorAll('select.field-control');
    for (var i = 0; i < selects.length; i++) {
      var span = document.createElement('span');
      span.className = 'print-value';
      span.appendChild(document.createTextNode(selects[i].options[selects[i].selectedIndex] ? selects[i].options[selects[i].selectedIndex].text : ''));
      selects[i].parentNode.insertBefore(span, selects[i].nextSibling);
      selects[i].className += ' print-hidden';
    }
    var checkboxes = root.querySelectorAll('input[type="checkbox"].field-control');
    for (var c = 0; c < checkboxes.length; c++) {
      var checkbox = checkboxes[c];
      var label = checkbox.getAttribute('data-field-label') || '';
      var checkSpan = document.createElement('span');
      checkSpan.className = 'print-value checkbox-print-value';
      checkSpan.appendChild(document.createTextNode((checkbox.checked ? '☑ ' : '☐ ') + label));
      var wrapper = findFieldLabel(checkbox);
      if (wrapper) {
        wrapper.parentNode.insertBefore(checkSpan, wrapper.nextSibling);
        wrapper.className += ' print-hidden';
      } else {
        checkbox.parentNode.insertBefore(checkSpan, checkbox.nextSibling);
        checkbox.className += ' print-hidden';
      }
    }
  }

  function prepareRootForPreview(root) {
    root = root || document;
    prepareRootForPrint(root);
    var controls = root.querySelectorAll('input.field-control, select.field-control, textarea.field-control, button');
    for (var i = 0; i < controls.length; i++) {
      var control = controls[i];
      var tag = control.tagName ? control.tagName.toLowerCase() : '';
      var type = (control.getAttribute('type') || '').toLowerCase();
      control.setAttribute('tabindex', '-1');
      if (tag === 'input' && type !== 'checkbox' && type !== 'radio') {
        control.readOnly = true;
        control.setAttribute('readonly', 'readonly');
      } else if (tag === 'textarea') {
        control.readOnly = true;
        control.setAttribute('readonly', 'readonly');
      } else {
        control.disabled = true;
        control.setAttribute('disabled', 'disabled');
      }
    }
  }

  function initSummernote() {
    if (!hasSummernote()) {
      documentElement = byId('document');
      post('error', { Message: 'Summernote 로컬 파일 로딩 실패. 기본 contenteditable 모드로 실행합니다.', message: 'Summernote 로컬 파일 로딩 실패. 기본 contenteditable 모드로 실행합니다.' });
      return;
    }

    var ui = window.jQuery.summernote.ui;
    var button = function (contents, tooltip, handler) {
      return function () {
        return ui.button({
          contents: contents,
          click: handler,
          callback: function (node) {
            node.attr('title', tooltip);
          }
        }).render();
      };
    };

    isSummernote = true;
    window.jQuery('#document').summernote({
      height: 1043,
      dialogsInBody: true,
      disableDragAndDrop: true,
      fontNames: ['Malgun Gothic', 'Arial', 'Arial Black', 'Courier New', 'Times New Roman'],
      popover: {
        image: [],
        link: [],
        table: []
      },
      buttons: {
        dynTablePrompt: button('표+', '행/열 수를 입력해 표 삽입', function () { window.editor.promptInsertTable(); }),
        dynRowAdd: button('행+', '선택한 표에 행 추가', function () { window.editor.addTableRow(); }),
        dynRowDel: button('행-', '선택한 표의 행 삭제', function () { window.editor.deleteTableRow(); }),
        dynColAdd: button('열+', '선택한 표에 열 추가', function () { window.editor.addTableColumn(); }),
        dynColDel: button('열-', '선택한 표의 열 삭제', function () { window.editor.deleteTableColumn(); }),
        dynMerge: button('병합', '선택한 셀 병합', function () { window.editor.mergeCell(); }),
        dynSplit: button('분할', '선택한 셀 분할', function () { window.editor.splitCell(); }),
        dynHeader: button('헤더', '선택한 셀 헤더 스타일 토글', function () { window.editor.toggleHeaderCell(); }),
        dynCellSize: button('셀크기', '선택한 셀 너비/높이 지정', function () { window.editor.setCellSize(); }),
        dynText: button('텍스트', '텍스트 입력칸 삽입', function () { window.editor.promptInsertTextField(); }),
        dynNumber: button('숫자', '숫자 입력칸 삽입', function () { window.editor.promptInsertNumberField(); }),
        dynSelect: button('콤보', '콤보박스 삽입', function () { window.editor.promptInsertSelectField(); }),
        dynCheck: button('체크', '체크박스 삽입', function () { window.editor.promptInsertCheckboxField(); }),
        dynImage: button('이미지', '이미지 영역 삽입', function () { window.editor.promptInsertImageField(); })
      },
      toolbar: [
        ['style', ['style']],
        ['font', ['bold', 'italic', 'underline', 'clear']],
        ['fontname', ['fontname']],
        ['fontsize', ['fontsize']],
        ['color', ['color']],
        ['para', ['ul', 'ol', 'paragraph']],
        ['table', ['table']],
        ['insert', ['hr']],
        ['view', ['codeview']]
      ],
      callbacks: {
        onInit: function () {
          documentElement = document.querySelector('.note-editable');
          bindFieldEvents();
          setReadonlyForMode();
        },
        onChange: function () {
          post('content-changed');
        }
      }
    });
    documentElement = document.querySelector('.note-editable');
  }

  window.editor = {
    isReady: false,
    newTemplate: function () {
      restoreDesignSurface();
      setHtml('');
      mode = 'design';
      setReadonlyForMode();
      post('content-changed');
    },
    getTemplateHtml: function () {
      var temp = document.createElement('div');
      temp.innerHTML = getHtml();
      clearFieldValues(temp);
      return temp.innerHTML;
    },
    setTemplateHtml: function (html) {
      setHtml(html || '');
    },
    setMode: function (nextMode) {
      mode = nextMode === 'fill' ? 'fill' : 'design';
      if (mode === 'fill') {
        createFillSurface();
      } else {
        restoreDesignSurface();
      }
      setReadonlyForMode();
    },
    resetValues: function () {
      clearFieldValues(editable());
      syncEditorCodeFromDom();
      post('content-changed');
    },
    execCommand: function (command, value) {
      runCommand(command, value || null);
    },
    insertTable: function (rows, columns) {
      rows = rows || 3;
      columns = columns || 3;
      var html = '<table><tbody>';
      for (var r = 0; r < rows; r++) {
        html += '<tr>';
        for (var c = 0; c < columns; c++) {
          html += '<td>&nbsp;</td>';
        }
        html += '</tr>';
      }
      html += '</tbody></table>';
      insertHtml(html);
    },
    promptInsertTable: function () {
      if (mode !== 'design') {
        return;
      }
      var rows = parseInt(window.prompt('행 수', '5'), 10);
      var columns = parseInt(window.prompt('열 수', '4'), 10);
      this.insertTable(rows || 5, columns || 4);
    },
    addTableRow: function () {
      if (mode !== 'design') {
        return;
      }
      var table = getSelectedTable();
      if (!table || !table.rows.length) {
        return;
      }
      var row = table.insertRow(getSelectedCell() ? getSelectedCell().parentNode.rowIndex + 1 : table.rows.length);
      var columns = getTableColumnCount(table) || 1;
      for (var i = 0; i < columns; i++) {
        row.insertCell(i).innerHTML = '&nbsp;';
      }
      post('content-changed');
    },
    deleteTableRow: function () {
      if (mode !== 'design') {
        return;
      }
      var cell = getSelectedCell();
      var table = getSelectedTable();
      if (!cell || !table || table.rows.length <= 1) {
        return;
      }
      table.deleteRow(cell.parentNode.rowIndex);
      post('content-changed');
    },
    addTableColumn: function () {
      if (mode !== 'design') {
        return;
      }
      var cell = getSelectedCell();
      var table = getSelectedTable();
      if (!cell || !table) {
        return;
      }
      var index = cell.cellIndex + 1;
      for (var r = 0; r < table.rows.length; r++) {
        table.rows[r].insertCell(index).innerHTML = '&nbsp;';
      }
      post('content-changed');
    },
    deleteTableColumn: function () {
      if (mode !== 'design') {
        return;
      }
      var cell = getSelectedCell();
      var table = getSelectedTable();
      if (!cell || !table || table.rows[0].cells.length <= 1) {
        return;
      }
      var index = cell.cellIndex;
      for (var r = 0; r < table.rows.length; r++) {
        table.rows[r].deleteCell(index);
      }
      post('content-changed');
    },
    mergeCell: function () {
      if (mode !== 'design') {
        return;
      }
      var cell = requireCell();
      if (!cell) {
        return;
      }
      var colspan = parseInt(window.prompt('가로 병합 칸 수', '2'), 10) || 1;
      var rowspan = parseInt(window.prompt('세로 병합 칸 수', '1'), 10) || 1;
      colspan = Math.max(1, colspan);
      rowspan = Math.max(1, rowspan);
      var table = getSelectedTable();
      var rowIndex = cell.parentNode.rowIndex;
      var cellIndex = cell.cellIndex;
      for (var r = 0; r < rowspan; r++) {
        var targetRow = table.rows[rowIndex + r];
        if (!targetRow) {
          continue;
        }
        for (var c = colspan - 1; c >= 0; c--) {
          if (r === 0 && c === 0) {
            continue;
          }
          var removeCell = targetRow.cells[cellIndex + c];
          if (removeCell) {
            targetRow.deleteCell(removeCell.cellIndex);
          }
        }
      }
      cell.colSpan = colspan;
      cell.rowSpan = rowspan;
      post('content-changed');
    },
    splitCell: function () {
      if (mode !== 'design') {
        return;
      }
      var cell = requireCell();
      if (!cell) {
        return;
      }
      var colspan = cell.colSpan || 1;
      var rowspan = cell.rowSpan || 1;
      cell.colSpan = 1;
      cell.rowSpan = 1;
      for (var c = 1; c < colspan; c++) {
        cell.parentNode.insertCell(cell.cellIndex + c).innerHTML = '&nbsp;';
      }
      if (rowspan > 1) {
        var table = getSelectedTable();
        var rowIndex = cell.parentNode.rowIndex;
        for (var r = 1; r < rowspan; r++) {
          if (table.rows[rowIndex + r]) {
            table.rows[rowIndex + r].insertCell(cell.cellIndex).innerHTML = '&nbsp;';
          }
        }
      }
      post('content-changed');
    },
    toggleHeaderCell: function () {
      if (mode !== 'design') {
        return;
      }
      var cell = requireCell();
      if (!cell) {
        return;
      }
      if (hasClass(cell, 'header-cell')) {
        cell.className = String(cell.className).replace('header-cell', '').replace(/\s+/g, ' ');
      } else {
        cell.className = (cell.className ? cell.className + ' ' : '') + 'header-cell';
      }
      post('content-changed');
    },
    setCellSize: function () {
      if (mode !== 'design') {
        return;
      }
      var cell = requireCell();
      if (!cell) {
        return;
      }
      var width = window.prompt('셀 너비(px 또는 %, 빈 값은 유지)', cell.style.width || '');
      var height = window.prompt('셀 높이(px, 빈 값은 유지)', cell.style.height || '');
      if (width !== null && width !== '') {
        cell.style.width = width;
      }
      if (height !== null && height !== '') {
        cell.style.height = height;
      }
      post('content-changed');
    },
    setCellBackground: function (color) {
      if (mode !== 'design') {
        return;
      }
      applyCellBackground(cellColorTarget || getSelectedCell(), color);
      pendingCellColor = null;
      pendingCellColorArmed = false;
      cellColorTarget = null;
    },
    captureCellColorTarget: function () {
      rememberEditorRange();
      cellColorTarget = getSelectedCell();
    },
    applyCellColorPicker: function (color, done) {
      if (mode !== 'design') {
        return;
      }
      pendingCellColor = color || '#dfeef3';
      if (cellColorTarget) {
        applyCellBackground(cellColorTarget, pendingCellColor, true);
        pendingCellColorArmed = false;
      } else {
        pendingCellColorArmed = true;
      }
      if (done && cellColorTarget) {
        cellColorTarget = null;
      }
    },
    insertTextField: function (config) {
      config = getConfig(config);
      insertHtml('<input class="field-control" data-field-id="' + htmlEscape(config.id) + '" data-field-type="text" data-field-label="' + htmlEscape(config.label) + '" type="text" value="" placeholder="' + htmlEscape(config.label) + '" />');
    },
    promptInsertTextField: function () {
      var config = promptFieldConfig('텍스트 입력칸', false);
      if (config) {
        this.insertTextField(config);
      }
    },
    insertNumberField: function (config) {
      config = getConfig(config);
      insertHtml('<input class="field-control" data-field-id="' + htmlEscape(config.id) + '" data-field-type="number" data-field-label="' + htmlEscape(config.label) + '" type="number" value="" placeholder="' + htmlEscape(config.label) + '" />');
    },
    promptInsertNumberField: function () {
      var config = promptFieldConfig('숫자 입력칸', false);
      if (config) {
        this.insertNumberField(config);
      }
    },
    insertSelectField: function (config) {
      config = getConfig(config);
      var html = '<select class="field-control" data-field-id="' + htmlEscape(config.id) + '" data-field-type="select" data-field-label="' + htmlEscape(config.label) + '"><option value="">선택</option>';
      for (var i = 0; i < config.options.length; i++) {
        html += '<option>' + htmlEscape(String(config.options[i]).trim()) + '</option>';
      }
      html += '</select>';
      insertHtml(html);
    },
    promptInsertSelectField: function () {
      var config = promptFieldConfig('콤보박스', true);
      if (config) {
        this.insertSelectField(config);
      }
    },
    insertCheckboxField: function (config) {
      config = getConfig(config);
      insertHtml('<label class="field-label"><input class="field-control" data-field-id="' + htmlEscape(config.id) + '" data-field-type="checkbox" data-field-label="' + htmlEscape(config.label) + '" type="checkbox" /> ' + htmlEscape(config.label) + '</label>');
    },
    promptInsertCheckboxField: function () {
      var config = promptFieldConfig('체크박스', false);
      if (config) {
        this.insertCheckboxField(config);
      }
    },
    insertImageField: function (config) {
      config = getConfig(config);
      insertHtml('<div class="image-field" data-field-id="' + htmlEscape(config.id) + '" data-field-type="image" data-field-label="' + htmlEscape(config.label) + '"><div class="image-placeholder">이미지 없음 - ' + htmlEscape(config.label) + '</div><img class="image-preview" alt="' + htmlEscape(config.label) + '" /><div class="image-actions"><button type="button" data-image-action="choose">선택</button><button type="button" data-image-action="remove">삭제</button></div></div>');
    },
    promptInsertImageField: function () {
      var config = promptFieldConfig('이미지 영역', false);
      if (config) {
        this.insertImageField(config);
      }
    },
    setImageSource: function (fieldId, imageUrl) {
      var field = editable().querySelector('.image-field[data-field-id="' + fieldId + '"]');
      if (!field) {
        return;
      }
      field.className = 'image-field has-image';
      field.setAttribute('data-image-src', imageUrl);
      var img = field.querySelector('img.image-preview');
      if (img) {
        img.src = imageUrl;
        img.setAttribute('src', imageUrl);
      }
      syncEditorCodeFromDom();
      post('content-changed');
    },
    clearImageSource: function (fieldId) {
      clearImageNode(editable().querySelector('.image-field[data-field-id="' + fieldId + '"]'));
      syncEditorCodeFromDom();
      post('content-changed');
    },
    getCurrentDocumentHtml: function () {
      syncFieldAttributes(editable());
      return editable().innerHTML;
    },
    renderComposition: function (items) {
      var root = byId('workspace') || document.body;
      root.innerHTML = '';
      items = items || [];
      for (var i = 0; i < items.length; i++) {
        var page = document.createElement('div');
        page.className = 'a4-page';
        var doc = document.createElement('div');
        doc.className = 'document';
        doc.innerHTML = items[i].Html || items[i].html || '';
        page.appendChild(doc);
        root.appendChild(page);
      }
    },
    prepareForPrint: function (root) {
      prepareRootForPrint(root);
    },
    prepareForPreview: function (root) {
      prepareRootForPreview(root);
    },
    printDocument: function () {
      prepareRootForPrint(document);
      window.print();
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    documentElement = byId('document');
    initSummernote();
    bindFieldEvents();
    bindToolbarEvents();
    trackSelection();
    setReadonlyForMode();
    window.editor.isReady = true;
    post('editor-ready');
  });
})();
