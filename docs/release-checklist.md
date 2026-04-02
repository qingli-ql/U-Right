# U-Right 发布链路清单

更新时间：2026-04-01

当前项目仍处于 MVP / 原型收敛阶段，这份清单用于把后续 Release 工作拆成可执行步骤。

## 1. 打包结构确认

- 确认宿主 app 只保留一个权威安装路径：`/Applications/U-Right.app`
- 确认 Finder Sync `.appex` 由 Xcode 原生嵌入宿主 app
- 确认 Electron Host 与 Finder Extension 使用同一套共享配置目录 / 请求目录

## 2. 签名

- 为宿主 app 使用 Developer ID Application 签名
- 为 Finder Sync Extension 使用同一团队签名
- 检查 entitlements 是否与当前非 App Store 路线一致
- 用 `codesign --verify --deep --strict --verbose=2` 验证产物

## 3. notarization

- 准备发布归档
- 使用 `notarytool` 提交 notarization
- 等待 notarization 通过
- 对最终分发产物执行 `staple`

## 4. Finder 侧验证

- 验证文件右键
- 验证文件夹右键
- 验证多选右键
- 验证空白区域 / 当前目录语义
- 验证扩展禁用 / 启用 / 重载流程

## 5. Host 侧验证

- 验证 Settings 读写共享配置
- 验证 Logs 窗口与日志文件输出
- 验证 Prompt / Result 窗口基础交互
- 验证 CLI 可用与 CLI 缺失时的 AI fallback

## 6. 文档收尾

- README 中只保留当前权威开发入口
- 发布说明中写明最低 macOS 版本
- 写明扩展启用步骤与常见排障路径
- 写明签名 / notarization / 已知限制

## 当前尚缺

- 还没有正式的 Developer ID 签名脚本
- 还没有 notarization / staple 自动化
- 还没有发布产物校验脚本
- 还没有完整的 Finder 回归验证脚本
