# 首次引导调试指南

## 🔍 问题：看不到引导

如果你看不到引导系统，按照以下步骤调试。

## 📋 调试步骤

### 第 1 步：重新加载扩展

1. 打开 `chrome://extensions/`
2. 找到 "Earth Agent"
3. 点击刷新按钮 ↻
4. 关闭并重新打开 sidepanel

### 第 2 步：检查控制台日志

1. **打开 sidepanel**
2. **右键点击 sidepanel 内容区域**
3. **选择"检查"（Inspect）**
4. **切换到 Console 标签**

你应该看到类似这样的日志：

```
🔍 [Onboarding] Status check: {completed: false, dismissed: false, shouldShow: true}
✅ [Onboarding] Showing welcome modal
🎯 [Chat] Onboarding state: {showWelcome: true, showTour: false, currentStep: 0}
```

### 第 3 步：检查存储状态

**在控制台运行以下代码：**

```javascript
chrome.storage.local.get([
  'earth_agent_onboarding_completed',
  'earth_agent_onboarding_dismissed',
  'earth_agent_onboarding_step',
  'earth_agent_onboarding_last_shown'
], (result) => {
  console.table(result);
});
```

**期望结果：**
- 如果是首次使用，所有值应该是 `undefined`
- 如果已经完成，会显示相应的值

### 第 4 步：强制重置引导状态

**在控制台运行：**

```javascript
chrome.storage.local.remove([
  'earth_agent_onboarding_completed',
  'earth_agent_onboarding_dismissed',
  'earth_agent_onboarding_step',
  'earth_agent_onboarding_last_shown'
], () => {
  console.log('✅ 引导状态已重置');
  location.reload();
});
```

### 第 5 步：检查 React 组件渲染

**在控制台运行：**

```javascript
// 检查 WelcomeModal 是否存在
document.querySelector('[class*="WelcomeModal"]') ||
document.querySelector('[class*="welcome"]') ||
console.log('❌ 未找到 WelcomeModal');

// 检查是否有固定定位的遮罩层
document.querySelector('.fixed.inset-0.z-50') ||
console.log('❌ 未找到遮罩层');
```

## 🐛 常见问题和解决方案

### 问题 1: 控制台显示 "Not showing (completed or dismissed)"

**原因：** 引导已被标记为完成或跳过

**解决：**
```javascript
// 重置状态
chrome.storage.local.remove([
  'earth_agent_onboarding_completed',
  'earth_agent_onboarding_dismissed'
], () => location.reload());
```

### 问题 2: 控制台没有任何 [Onboarding] 日志

**原因：** useOnboarding hook 可能没有被调用

**检查：**
1. 确认你打开的是 sidepanel（不是 popup）
2. 确认扩展已重新加载
3. 查看是否有 JavaScript 错误

**解决：**
```javascript
// 检查是否有错误
console.log(chrome.runtime.lastError);
```

### 问题 3: showWelcome 是 true 但看不到对话框

**原因：** 可能是 z-index 或样式问题

**检查：**
```javascript
// 查找所有 z-index > 50 的元素
[...document.querySelectorAll('*')].filter(el => {
  const z = window.getComputedStyle(el).zIndex;
  return z !== 'auto' && parseInt(z) > 50;
}).forEach(el => {
  console.log(el, window.getComputedStyle(el).zIndex);
});
```

### 问题 4: Chrome Storage API 错误

**原因：** 可能是权限问题

**检查 manifest.json：**
```json
{
  "permissions": [
    "storage"
  ]
}
```

**测试 Storage API：**
```javascript
chrome.storage.local.set({test: 'value'}, () => {
  if (chrome.runtime.lastError) {
    console.error('❌ Storage 写入失败:', chrome.runtime.lastError);
  } else {
    console.log('✅ Storage 工作正常');
  }
});
```

## 🧪 手动触发引导（测试用）

如果你想在不修改存储的情况下测试引导，可以在控制台直接调用：

**注意：** 这需要你能访问 React 组件实例（仅用于调试）

```javascript
// 方法 1: 通过存储触发
chrome.storage.local.set({
  earth_agent_onboarding_completed: false,
  earth_agent_onboarding_dismissed: false
}, () => location.reload());

// 方法 2: 直接清空存储
chrome.storage.local.clear(() => {
  console.log('✅ 所有存储已清空');
  location.reload();
});
```

## 📊 完整诊断脚本

**复制并在控制台运行：**

```javascript
(async function diagnoseOnboarding() {
  console.log('🔍 开始诊断引导系统...\n');

  // 1. 检查 Storage
  console.log('1️⃣ 检查 Chrome Storage:');
  const storage = await chrome.storage.local.get(null);
  const onboardingKeys = Object.keys(storage).filter(k => k.includes('onboarding'));
  if (onboardingKeys.length > 0) {
    console.table(onboardingKeys.reduce((obj, k) => {
      obj[k] = storage[k];
      return obj;
    }, {}));
  } else {
    console.log('   ✅ 无引导相关键（首次使用状态）');
  }

  // 2. 检查 DOM
  console.log('\n2️⃣ 检查 DOM 元素:');
  const hasModal = !!document.querySelector('.fixed.inset-0.z-50');
  const hasBackdrop = !!document.querySelector('.fixed.inset-0.z-\\[100\\]');
  console.log('   Modal 元素:', hasModal ? '✅ 找到' : '❌ 未找到');
  console.log('   Backdrop 元素:', hasBackdrop ? '✅ 找到' : '❌ 未找到');

  // 3. 检查 JavaScript 错误
  console.log('\n3️⃣ 最近的 JavaScript 错误:');
  // （需要之前捕获的错误）

  // 4. 建议
  console.log('\n💡 建议:');
  if (!hasModal && !hasBackdrop && onboardingKeys.length === 0) {
    console.log('   ✅ 系统正常，应该显示引导');
    console.log('   🔄 尝试刷新页面: location.reload()');
  } else if (onboardingKeys.length > 0) {
    console.log('   ⚠️ 引导状态已保存，运行以下代码重置:');
    console.log(`
chrome.storage.local.remove([
  'earth_agent_onboarding_completed',
  'earth_agent_onboarding_dismissed',
  'earth_agent_onboarding_step',
  'earth_agent_onboarding_last_shown'
], () => location.reload());
    `);
  }
})();
```

## 🎯 快速解决方案

**99% 的情况下，这个命令可以解决问题：**

```javascript
chrome.storage.local.clear(() => {
  console.log('✅ 存储已清空，正在刷新...');
  setTimeout(() => location.reload(), 500);
});
```

## 📞 如果还是不行

如果按照以上步骤仍然无法显示引导，请提供以下信息：

1. **控制台日志截图**
2. **Storage 状态**（运行 `chrome.storage.local.get(null, console.log)`）
3. **DOM 检查结果**
4. **Chrome 版本**
5. **是否有其他扩展可能冲突**

---

## ✅ 预期正常流程

1. **首次打开 sidepanel**
2. **控制台显示：**
   ```
   🔍 [Onboarding] Status check: {completed: false, dismissed: false, shouldShow: true}
   ✅ [Onboarding] Showing welcome modal
   🎯 [Chat] Onboarding state: {showWelcome: true, showTour: false, currentStep: 0}
   ```
3. **看到欢迎对话框**
4. **点击"开始导览"或"跳过"**

如果你看到了这些日志但没有看到对话框，那可能是样式或 z-index 问题。
