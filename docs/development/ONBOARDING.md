# 首次引导系统 (Onboarding)

## 📖 概述

Earth Agent 包含一个交互式的首次引导系统，帮助新用户快速了解和使用扩展的核心功能。

## 🎯 功能特性

### 1. **欢迎模态框 (Welcome Modal)**
- 在首次使用时显示
- 介绍 Earth Agent 的主要功能
- 提供"开始导览"和"跳过"选项

### 2. **分步引导 (Step-by-Step Tour)**
使用 spotlight 效果高亮关键 UI 元素，包含 4 个步骤：

**步骤 1: 设置 API Key**
- 高亮：Settings 按钮
- 说明：如何配置 AI 提供商的 API Key
- 提示支持的提供商：OpenAI, Anthropic, Google, Qwen, Ollama

**步骤 2: Ask Mode vs Do Mode**
- 高亮：聊天输入区域
- 说明：两种模式的区别
- 建议新手使用 Do Mode

**步骤 3: 开始对话**
- 高亮：聊天输入框
- 说明：如何开始使用
- 提供示例提示词

**步骤 4: 获取帮助**
- 高亮：Help 按钮
- 说明：如何访问文档和获取支持

## 🛠️ 技术实现

### 文件结构

```
src/
├── components/
│   └── Onboarding/
│       ├── WelcomeModal.tsx       # 欢迎对话框
│       ├── OnboardingTour.tsx     # 分步引导组件
│       └── index.ts               # 导出文件
├── hooks/
│   └── useOnboarding.ts           # 引导状态管理 Hook
└── components/
    └── Chat.tsx                   # 集成引导组件
```

### 核心组件

#### 1. `WelcomeModal`
欢迎对话框，使用 framer-motion 实现动画效果。

**Props:**
- `onStart: () => void` - 开始导览回调
- `onSkip: () => void` - 跳过回调

#### 2. `OnboardingTour`
分步引导组件，使用 SVG mask 实现 spotlight 效果。

**Props:**
- `steps: OnboardingStep[]` - 引导步骤数组
- `currentStep: number` - 当前步骤索引
- `onNext: () => void` - 下一步回调
- `onSkip: () => void` - 跳过回调
- `onComplete: () => void` - 完成回调

**OnboardingStep 接口:**
```typescript
interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target: string;  // CSS selector (data-onboarding attribute)
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void;
}
```

#### 3. `useOnboarding` Hook
管理引导系统的状态和逻辑。

**返回值:**
```typescript
{
  showWelcome: boolean;
  showTour: boolean;
  currentStep: number;
  steps: OnboardingStep[];
  startTour: () => void;
  nextStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  resetOnboarding: () => void;
}
```

### 存储机制

引导状态存储在 `chrome.storage.local` 中：

```typescript
const STORAGE_KEYS = {
  COMPLETED: 'earth_agent_onboarding_completed',
  DISMISSED: 'earth_agent_onboarding_dismissed',
  CURRENT_STEP: 'earth_agent_onboarding_step',
  LAST_SHOWN: 'earth_agent_onboarding_last_shown',
};
```

### Data Attributes

关键 UI 元素使用 `data-onboarding` 属性进行标识：

```html
<!-- Settings 按钮 -->
<Button data-onboarding="settings-button">...</Button>

<!-- Help 按钮 -->
<Button data-onboarding="help-button">...</Button>

<!-- 聊天输入框 -->
<textarea data-onboarding="chat-input">...</textarea>
```

## 🧪 测试

### 1. 测试首次引导流程

**重置引导状态:**
```javascript
// 在浏览器控制台中执行
chrome.storage.local.remove([
  'earth_agent_onboarding_completed',
  'earth_agent_onboarding_dismissed',
  'earth_agent_onboarding_step',
  'earth_agent_onboarding_last_shown'
], () => {
  console.log('✅ Onboarding reset complete');
  location.reload();
});
```

**或使用 Chrome DevTools:**
1. 打开扩展的 sidepanel
2. 右键 → 检查
3. 在 DevTools 中切换到 "Application" 标签
4. 侧边栏中选择 "Storage" → "Local Storage" → "chrome-extension://..."
5. 删除所有 `earth_agent_onboarding_*` 键
6. 刷新页面

### 2. 测试各个步骤

**验证每个步骤:**
- [ ] 欢迎对话框显示正确
- [ ] "开始导览" 按钮启动引导
- [ ] "跳过" 按钮关闭引导并记录状态
- [ ] Settings 按钮高亮显示（步骤 1）
- [ ] 聊天输入框高亮显示（步骤 2 和 3）
- [ ] Help 按钮高亮显示（步骤 4）
- [ ] 步骤指示器正确显示进度
- [ ] Spotlight 效果正常（半透明遮罩 + 高亮环）
- [ ] 提示卡片位置正确（避免遮挡关键元素）
- [ ] 完成引导后状态正确保存

### 3. 测试边缘情况

- [ ] 目标元素不存在时的处理
- [ ] 窗口大小变化时的适应
- [ ] 深色模式下的显示效果
- [ ] 移动端适配（如果支持）

## 🎨 视觉效果

### Spotlight 效果
使用 SVG `<mask>` 实现：
- 半透明黑色背景（70% 不透明度）
- 高亮元素周围有 8px 的间隙
- 圆角矩形遮罩（8px border-radius）

### 高亮环
- 蓝色边框（2px）
- 阴影效果（`shadow-blue-500/50`）
- 脉冲动画（`animate-pulse`）

### 提示卡片
- 白色背景（深色模式下为深灰色）
- 大阴影（`shadow-2xl`）
- 圆角设计（`rounded-lg`）
- 响应式宽度（320px - 360px）

### 动画
使用 framer-motion：
- 欢迎对话框：缩放 + 淡入（0.3s）
- 提示卡片：上下滑动 + 淡入（0.2s）
- 高亮环：缩放动画

## 🔧 自定义

### 修改引导步骤

在 `src/hooks/useOnboarding.ts` 中修改 `steps` 数组：

```typescript
const steps: OnboardingStep[] = [
  {
    id: 'your-step-id',
    title: '步骤标题',
    description: '步骤描述\n支持多行文本',
    target: '[data-onboarding="your-target"]',
    position: 'bottom',
    action: () => {
      // 可选：步骤显示时执行的操作
      console.log('Step shown');
    }
  },
  // ... 更多步骤
];
```

### 添加新的目标元素

1. 在目标元素上添加 `data-onboarding` 属性：
```tsx
<Button data-onboarding="my-button">...</Button>
```

2. 在 `useOnboarding.ts` 中引用：
```typescript
{
  target: '[data-onboarding="my-button"]',
  // ...
}
```

### 修改样式

主要样式类：
- `WelcomeModal.tsx`: 修改对话框样式
- `OnboardingTour.tsx`: 修改 spotlight 和提示卡片样式

## 📱 响应式设计

- 提示卡片宽度自适应（320px - 360px）
- 自动调整 tooltip 位置避免溢出屏幕
- 目标元素自动滚动到视图中心

## 🌐 国际化

目前文本为中文。如需支持多语言：

1. 安装 i18n 库
2. 将所有文本提取到翻译文件
3. 使用翻译函数包裹文本

## ⚠️ 注意事项

1. **目标元素必须存在**: 如果 `data-onboarding` 指定的元素不存在，该步骤会被跳过并在控制台警告
2. **Z-index 层级**: 引导组件使用 `z-[100]`，确保其他元素不会覆盖
3. **存储权限**: 确保 manifest.json 中有 `storage` 权限
4. **性能**: spotlight 使用 SVG mask，性能开销较小

## 🔄 重置引导功能

提供给用户的重置方法（可以添加到设置页面）：

```typescript
import { useOnboarding } from '@/hooks/useOnboarding';

function Settings() {
  const { resetOnboarding } = useOnboarding();

  return (
    <Button onClick={resetOnboarding}>
      重新观看引导
    </Button>
  );
}
```

## 📊 分析和改进

建议跟踪的指标：
- 引导完成率
- 每个步骤的退出率
- 用户跳过的频率
- 完成引导后的功能使用率

可以在每个步骤的 `action` 中添加分析代码。

## 🚀 未来改进方向

- [ ] 添加更多引导步骤（数据集搜索、代码执行等）
- [ ] 支持条件步骤（根据用户配置显示不同步骤）
- [ ] 添加视频教程链接
- [ ] 支持键盘导航（←/→ 切换步骤）
- [ ] 添加"不再显示"选项
- [ ] 支持引导版本控制（新功能时重新触发）
- [ ] 添加引导进度保存（用户可中断并稍后继续）
