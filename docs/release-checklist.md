# U-Right 发布清单

更新时间：2026-04-02

当前项目还没到正式发布阶段。  
这份文档只保留发布前必须补齐的最小清单。

## 必做

### 1. 产物结构

- [ ] 只保留一个权威安装路径：`/Applications/U-Right.app`
- [ ] Finder Sync `.appex` 由 Xcode 原生嵌入宿主 app
- [ ] Host 与 Extension 使用同一套共享目录

### 2. 签名与公证

- [ ] Developer ID 签名
- [ ] notarization
- [ ] staple
- [ ] `codesign --verify --deep --strict --verbose=2`

### 3. Finder 验证

- [ ] 文件右键
- [ ] 文件夹右键
- [ ] 多选右键
- [ ] 空白区域右键
- [ ] 扩展启用 / 禁用 / 重载

### 4. Host 验证

- [ ] Settings 读写
- [ ] Logs 输出
- [ ] Prompt / Result 基础交互
- [ ] CLI 可用路径
- [ ] CLI 缺失时 API fallback

### 5. 文档

- [ ] README 只保留当前权威入口
- [ ] 写明扩展启用步骤
- [ ] 写明常见排障命令
- [ ] 写明已知限制

## 当前还没有

- Developer ID 自动化脚本
- notarization / staple 自动化
- 发布产物校验脚本
- 完整 Finder 回归脚本
