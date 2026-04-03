# 产品方向结论：Electron Host + 原生 Finder Extension

更新时间：2026-04-02

这份文档只保留最后的方向结论，不再展开过长的技术选型讨论。

## 当前方向

U-Right 采用混合架构：

- 原生 `Finder Sync Extension`
- Electron Host
- Shared 集成层

## 为什么这样做

原因只有两个：

### 1. Finder 集成必须走原生扩展

这不是偏好问题，是系统能力边界。  
只要产品还要 Finder 右键菜单，就需要原生 Finder Sync Extension。

### 2. 复杂 UI 更适合放在 Electron

- Settings
- Prompt
- Result
- Logs

这些放在 Electron 更快，也更容易迭代。

## 当前结论

- 不做“纯 Electron 替代 Finder 扩展”的幻想
- 不把原生层做厚
- 不把复杂工作流继续塞回原生 Host

## 当前工程思想

- 原生层做薄
- 共享层做清楚
- 宿主层负责复杂 UI 和执行

## 现在真正要做的

- 继续收敛 Shared、Settings、菜单、执行的一致性
- 补齐高频动作
- 减少声明超前
- 做稳发布链路

## 暂时不展开的内容

以下内容目前不是收缩阶段重点：

- 大而全的桌面技术栈比较
- 复杂测试框架设计
- 远期 MAS 版本设计
- 大规模监控平台接入

如果后面真的要做，再单独写 ADR 或发布文档，不放在当前主方向文档里。
