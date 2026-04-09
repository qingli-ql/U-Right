# U-Right 仓库重构归档摘要

更新时间：2026-04-08

状态：`Archived`

这份文档只保留仓库重构的归档摘要，不再作为当前主线执行文档。

## 结果摘要

- 顶层脚本入口已统一收口到 `tools/`
- 动作元数据真相源已收口到 `manifest/`
- TS 合同层已收口到 `electron/src/contracts/`
- `electron/src/main` 已按 `bootstrap / application / adapters / desktop / infrastructure` 分层
- 原生 Host 已迁入 `archive/native-host/`
- 当前主线文档已压缩为 `README.md`、`docs/guide.md`、`docs/action-implementation-status.md`

## 为什么归档

- 原计划已经执行完成
- 其中的阶段记账、迁移步骤和风险清单已经不再适合作为当前阅读入口
- 当前事实、开发入口和边界说明已收口到主线文档

## 当前入口

- 当前主线说明：[`docs/guide.md`](../../docs/guide.md)
- 当前动作状态：[`docs/action-implementation-status.md`](../../docs/action-implementation-status.md)
- 其他历史材料：[`archive/docs/README.md`](./README.md)
