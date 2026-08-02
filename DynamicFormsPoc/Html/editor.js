(function () {
  var mode = 'design';
  var isSummernote = false;
  var documentElement;
  var savedRange;
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
    if (isSummernote) {
      documentElement = document.querySelector('.note-editable');
    }
    if (!documentElement) {
      documentElement = byId('document');
    }
    return documentElement;
  }

  function focusDocument() {
    var doc = editable();
    if (!doc) {
      return;
    }
    doc.focus();
    if (savedRange && window.getSelection) {
      var selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedRange);
    }
  }

  function getHtml() {
    if (isSummernote) {
      return window.jQuery('#document').summernote('code');
    }
    return editable().innerHTML;
  }

  function setHtml(html) {
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
    if (isSummernote) {
      window.jQuery('#document').summernote('focus');
      window.jQuery('#document').summernote('pasteHTML', html);
    } else {
      focusDocument();
      document.execCommand('insertHTML', false, html);
    }
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

  function getSelectedCell() {
    var selection = window.getSelection && window.getSelection();
    var node = selection && selection.anchorNode;
    if (!node && savedRange) {
      node = savedRange.commonAncestorContainer;
    }
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

  function requireCell() {
    var cell = getSelectedCell();
    if (!cell) {
      post('error', { Message: '표 셀 안에 커서를 둔 뒤 실행하세요.', message: '표 셀 안에 커서를 둔 뒤 실행하세요.' });
    }
    return cell;
  }

  function getFocusedField() {
    var node = document.activeElement;
    if (!node || node === document.body) {
      node = lastFillTarget;
    }
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
    if (isSummernote) {
      if (mode === 'design') {
        window.jQuery('#document').summernote('enable');
      } else {
        window.jQuery('#document').summernote('disable');
      }
      doc = editable();
    } else {
      doc.setAttribute('contenteditable', mode === 'design' ? 'true' : 'false');
    }

    var fields = doc.querySelectorAll('input, select, textarea, button');
    for (var i = 0; i < fields.length; i++) {
      fields[i].disabled = false;
      if (mode === 'design' && fields[i].tagName === 'BUTTON') {
        fields[i].disabled = true;
      }
    }
  }

  function syncEditorCodeFromDom() {
    if (isSummernote) {
      var doc = editable();
      window.jQuery('#document').summernote('code', doc.innerHTML);
      documentElement = document.querySelector('.note-editable');
    }
  }

  function bindFieldEvents() {
    var doc = editable();
    if (!doc || doc.getAttribute('data-dynamic-events') === '1') {
      return;
    }
    doc.setAttribute('data-dynamic-events', '1');

    doc.addEventListener('input', function () {
      post('content-changed');
    });
    doc.addEventListener('change', function () {
      post('content-changed');
    });
    doc.addEventListener('click', function (event) {
      var target = event.target;
      if (hasClass(target, 'field-control')) {
        lastFillTarget = target;
      }
      var imageFocus = findImageField(target);
      if (imageFocus) {
        lastFillTarget = imageFocus;
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
      }
    });
  }

  function trackSelection() {
    document.addEventListener('selectionchange', function () {
      var doc = editable();
      if (!doc || !window.getSelection) {
        return;
      }
      var selection = window.getSelection();
      if (!selection.rangeCount) {
        return;
      }
      var range = selection.getRangeAt(0);
      if (doc.contains(range.commonAncestorContainer)) {
        savedRange = range.cloneRange();
      }
    });
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
    var selects = root.querySelectorAll('select.field-control');
    for (var i = 0; i < selects.length; i++) {
      var span = document.createElement('span');
      span.className = 'print-value';
      span.appendChild(document.createTextNode(selects[i].options[selects[i].selectedIndex] ? selects[i].options[selects[i].selectedIndex].text : ''));
      selects[i].parentNode.insertBefore(span, selects[i].nextSibling);
    }
  }

  function initSummernote() {
    if (!hasSummernote()) {
      documentElement = byId('document');
      post('error', { Message: 'Summernote CDN 로딩 실패. 기본 contenteditable 모드로 실행합니다.', message: 'Summernote CDN 로딩 실패. 기본 contenteditable 모드로 실행합니다.' });
      return;
    }

    isSummernote = true;
    window.jQuery('#document').summernote({
      height: 1043,
      dialogsInBody: true,
      fontNames: ['Malgun Gothic', 'Arial', 'Arial Black', 'Courier New', 'Times New Roman'],
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
      setHtml('<h1 style="text-align:center">신규 검사성적서</h1><table><tbody><tr><th class="header-cell">문서 번호</th><td>&nbsp;</td><th class="header-cell">양식명</th><td>&nbsp;</td></tr><tr><th class="header-cell">제품명</th><td>&nbsp;</td><th class="header-cell">검사일자</th><td>&nbsp;</td></tr><tr><th class="header-cell">검사 항목</th><th class="header-cell">기준</th><th class="header-cell">판정</th><th class="header-cell">비고</th></tr><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table><p>관리자 모드에서 표와 필드를 구성한 뒤 저장하고, 사용자 모드에서 데이터만 입력합니다.</p>');
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
      setReadonlyForMode();
    },
    resetValues: function () {
      clearFieldValues(editable());
      syncEditorCodeFromDom();
      post('content-changed');
    },
    execCommand: function (command) {
      runCommand(command, null);
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
      var columns = table.rows[0].cells.length;
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
    insertTextField: function (config) {
      config = getConfig(config);
      insertHtml('<input class="field-control" data-field-id="' + htmlEscape(config.id) + '" data-field-type="text" data-field-label="' + htmlEscape(config.label) + '" type="text" value="" placeholder="' + htmlEscape(config.label) + '" />');
    },
    insertNumberField: function (config) {
      config = getConfig(config);
      insertHtml('<input class="field-control" data-field-id="' + htmlEscape(config.id) + '" data-field-type="number" data-field-label="' + htmlEscape(config.label) + '" type="number" value="" placeholder="' + htmlEscape(config.label) + '" />');
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
    insertCheckboxField: function (config) {
      config = getConfig(config);
      insertHtml('<label class="field-label"><input class="field-control" data-field-id="' + htmlEscape(config.id) + '" data-field-type="checkbox" data-field-label="' + htmlEscape(config.label) + '" type="checkbox" /> ' + htmlEscape(config.label) + '</label>');
    },
    insertImageField: function (config) {
      config = getConfig(config);
      insertHtml('<div class="image-field" data-field-id="' + htmlEscape(config.id) + '" data-field-type="image" data-field-label="' + htmlEscape(config.label) + '"><div class="image-placeholder">이미지 없음 - ' + htmlEscape(config.label) + '</div><img class="image-preview" alt="' + htmlEscape(config.label) + '" /><div class="image-actions"><button type="button" data-image-action="choose">선택</button><button type="button" data-image-action="remove">삭제</button></div></div>');
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
    printDocument: function () {
      prepareRootForPrint(document);
      window.print();
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    documentElement = byId('document');
    initSummernote();
    bindFieldEvents();
    trackSelection();
    setReadonlyForMode();
    window.editor.isReady = true;
    post('editor-ready');
  });
})();
