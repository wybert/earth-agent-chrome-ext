# Content Script 诊断指南

## 问题现象
Tools在background console显示成功调用，但GEE Code Editor中没有代码变化。

## 诊断步骤

### 1. 检查Content Script是否已加载

在GEE Code Editor页面打开DevTools (F12)，在Console中运行：

```javascript
// 检查content script是否加载
console.log('Content script loaded:', window['earth-engine-ai-assistant-content-script']);

// 检查可用的编辑器
console.log('Ace editor:', window.ace);
console.log('CodeMirror:', window.CodeMirror);

// 查找编辑器元素
console.log('Editor elements:', document.querySelectorAll('.ace_editor, .CodeMirror, .monaco-editor'));
```

### 2. 检查Content Script日志

在GEE Code Editor页面的Console中应该看到：

- ✅ "Earth Engine AI Assistant content script loading at:..."
- ✅ "Notifying background script that content script is loaded..."
- ✅ "Content script loaded notification sent successfully"

如果没有看到这些日志，content script可能没有正确注入。

### 3. 手动测试消息传递

在GEE Code Editor页面的Console中运行：

```javascript
// 测试发送EDIT_SCRIPT消息
chrome.runtime.sendMessage({
  type: 'EDIT_SCRIPT',
  scriptId: 'current',
  content: '// Test code from manual injection\nprint("Hello from debug!");'
}, response => {
  console.log('Response:', response);
});
```

### 4. 检查GEE编辑器类型

在GEE Code Editor页面运行：

```javascript
// 检查编辑器类型
const checkEditor = () => {
  // Monaco Editor (现代GEE)
  const monacoEditors = document.querySelectorAll('.monaco-editor');
  if (monacoEditors.length > 0) {
    console.log('✅ Found Monaco Editor:', monacoEditors);
    const monacoInstance = monacoEditors[0];
    console.log('Monaco instance:', monacoInstance.monaco || monacoInstance);
    return 'monaco';
  }

  // Ace Editor (旧版GEE)
  const aceEditors = document.querySelectorAll('.ace_editor');
  if (aceEditors.length > 0) {
    console.log('✅ Found Ace Editor:', aceEditors);
    return 'ace';
  }

  // CodeMirror
  const cmEditors = document.querySelectorAll('.CodeMirror');
  if (cmEditors.length > 0) {
    console.log('✅ Found CodeMirror:', cmEditors);
    return 'codemirror';
  }

  console.log('❌ No known editor found');
  return 'unknown';
};

console.log('Editor type:', checkEditor());
```

### 5. 检查Shadow DOM

GEE可能使用Shadow DOM，运行以下代码检查：

```javascript
// 查找所有shadow roots
const findShadowRoots = (element = document.body) => {
  const shadows = [];

  const traverse = (el) => {
    if (el.shadowRoot) {
      shadows.push(el);
      console.log('Found shadow root in:', el.tagName, el.className);
    }

    for (const child of el.children) {
      traverse(child);
    }
  };

  traverse(element);
  return shadows;
};

const shadowElements = findShadowRoots();
console.log(`Found ${shadowElements.length} elements with shadow DOM`);

// 检查shadow DOM中的编辑器
shadowElements.forEach(el => {
  if (el.shadowRoot) {
    console.log('Editors in shadow:', el.shadowRoot.querySelectorAll('.ace_editor, .monaco-editor, .CodeMirror'));
  }
});
```

### 6. 尝试手动更新编辑器

```javascript
// 如果是Monaco Editor
const monacoEditors = document.querySelectorAll('.monaco-editor');
if (monacoEditors.length > 0) {
  // Monaco使用不同的API
  const model = window.monaco?.editor?.getModels?.()?.[0];
  if (model) {
    model.setValue('// Test from Monaco\nprint("Hello Monaco!");');
    console.log('✅ Monaco editor updated');
  }
}

// 如果是Ace Editor
const aceEditor = document.querySelector('.ace_editor');
if (aceEditor && aceEditor.env?.editor) {
  aceEditor.env.editor.setValue('// Test from Ace\nprint("Hello Ace!");');
  console.log('✅ Ace editor updated');
}
```

## 常见问题

### 问题1: Content Script未加载
**症状**: 没有看到"Earth Engine AI Assistant content script loading"日志

**解决**:
1. 重新加载extension: chrome://extensions → 点击刷新按钮
2. 重新加载GEE页面
3. 检查manifest.json中的content_scripts配置

### 问题2: GEE使用Monaco Editor
**症状**: 找到`.monaco-editor`元素但代码不更新

**解决**:
需要更新`handleEditScript`函数添加Monaco支持。Monaco使用完全不同的API。

### 问题3: Shadow DOM阻挡
**症状**: 能找到编辑器元素但无法访问

**解决**:
需要遍历Shadow DOM树来找到真正的编辑器实例。

## 下一步

根据诊断结果：

1. **如果content script未加载** → 修复content script注入
2. **如果GEE使用Monaco** → 添加Monaco editor支持
3. **如果在Shadow DOM中** → 更新代码支持Shadow DOM遍历
