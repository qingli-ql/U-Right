# Finder Sync 排障记录

这份文档记录了 U-Right 在 Finder 扩展接入过程中踩到的关键坑、排障思路，以及最终如何定位和解决问题。

## 现象

用户已经：

- 启动了 `U-Right.app`
- 在系统设置里给了某种“扩展权限”
- 重启了 App

但 Finder 中右键文件、目录、空白区域时，仍然看不到 `U-Right` 菜单。

## 最终结论

这次问题的根因一共分成两层：

1. 最初使用的是错误的手工打包产物  
   `.appex` 内部放进去的是一个 `dylib`，不是 Finder Sync 真正可执行扩展，所以系统不会正确注册，也不会被 Finder 加载。

2. 切到 Xcode 原生产物之后，又存在多份相同 bundle id 的扩展副本  
   `pluginkit` 中同时出现了多个 `com.openai.uright.findersync`，会让“系统当前到底用哪一份”变得不直观，增加误判概率。

另外还有一个高频误区：

- `Finder Sync Extension` 要在 `Finder Extensions` 设置页启用
- 不是 `File Provider`

## 这次踩到的坑

### 1. `.appex` 不是“长得像扩展”就可以

最开始的手工打包脚本做法是：

- 先用 SwiftPM 编出一个动态库
- 再把 `libURightFinderExtensionCore.dylib` 改名复制到 `.appex/Contents/MacOS/URightFinderExtension`

这会生成一个“看起来像扩展”的 bundle，但对系统来说它不是合法的 Finder Sync 可执行扩展。

错误特征：

```bash
file path/to/URightFinderExtension
```

输出类似：

```text
Mach-O 64-bit dynamically linked shared library arm64
```

而正常 Finder Sync 扩展应当是：

```text
Mach-O 64-bit executable arm64
```

### 2. 看错了系统设置页面

Finder 右键菜单属于：

- `System Settings -> Privacy & Security -> Extensions -> Finder Extensions`

不是：

- `File Provider`

如果启用的是 File Provider，Finder Sync 菜单不会因此出现。

### 3. 只看“App 启动成功”是不够的

宿主 App 能启动，不代表 Finder 扩展可用。  
Finder 菜单是否出现，取决于：

- `.appex` 是否合法
- `pluginkit` 是否注册到扩展
- Finder 是否真正加载它

### 4. 同一 bundle id 有多份副本会干扰判断

这次排查时，`pluginkit` 里同时发现了多份：

- `/Applications/U-Right.app`
- `build/DerivedData/.../U-Right.app`
- `build/xcode/Debug/U-Right.app`

它们 bundle id 一样，都会出现在插件注册表里。  
如果同时存在，容易误判“当前 Finder 正在使用哪一份扩展”。

## 推荐的 debug 思路

按下面顺序查，效率最高。

### Step 1：先确认启用的是 Finder Extensions

去系统设置确认：

- `System Settings`
- `Privacy & Security`
- `Extensions`
- `Finder Extensions`

确认启用的是 `U-Right Finder Sync`。

### Step 2：确认系统有没有注册到扩展

```bash
pluginkit -m -D -i com.openai.uright.findersync -vv
```

预期结果：

- 能看到 `com.openai.uright.findersync`
- 能看到 `Path`
- `Parent Bundle` 指向实际要运行的 `U-Right.app`

如果这里查不到，说明问题还在扩展包体或注册阶段。

### Step 3：确认扩展二进制类型是否正确

```bash
file /path/to/U-Right.app/Contents/PlugIns/U-Right\ Finder\ Sync.appex/Contents/MacOS/U-Right\ Finder\ Sync
```

预期必须是：

```text
Mach-O 64-bit executable arm64
```

如果是 `shared library`，那 Finder 不会正常把它当 Finder Sync 扩展加载。

### Step 4：确认扩展签名和元数据

```bash
codesign -dv --verbose=2 /path/to/U-Right.app/Contents/PlugIns/U-Right\ Finder\ Sync.appex 2>&1
```

重点检查：

- `Identifier`
- `Executable`
- `Format`
- `Signature`

### Step 5：查看 Finder / PlugInKit 日志

```bash
/usr/bin/log stream --style compact --predicate 'subsystem CONTAINS[c] "pluginkit" OR process == "Finder" OR eventMessage CONTAINS[c] "com.openai.uright.findersync"'
```

重点关注：

- 是否发现了该扩展
- Finder 是否尝试加载它
- 是否出现 bundle / extension point / LaunchServices / entitlement 相关错误

### Step 6：清理重复副本，避免 Finder 选错

建议只保留一份最终要跑的 App，例如：

- `/Applications/U-Right.app`

避免同时保留多个开发副本参与注册。

再执行：

```bash
pluginkit -e use -i com.openai.uright.findersync
killall Finder
open /Applications/U-Right.app
```

### Step 7：做最小化验证

不要一开始就测复杂功能。  
先验证：

- Finder 右键是否出现 `U-Right` 根菜单

如果根菜单都没有，问题还在系统加载层。  
如果根菜单有了，再往下查菜单逻辑和动作执行。

## 这次是如何解决的

### 修复点 1：从手工拼 `.appex` 改成原生 Xcode 工程

最终采用的方案是：

- `Package.swift` 只保留 `URightShared`
- `URight.xcodeproj` 负责：
  - `URightHostApp`
  - `URightFinderSync`
- Host App 和 Finder Sync Extension 都链接 `URightShared`
- 由 Xcode 原生负责：
  - Finder Sync target
  - `.appex` 生成
  - 嵌入宿主 app
  - 签名与元数据

这一步解决了“扩展本身不合法”的根因。

### 修复点 2：验证 Xcode 产物确实是合法 Finder Sync 扩展

构建命令：

```bash
xcodebuild -project URight.xcodeproj -scheme URightHostApp -configuration Debug -derivedDataPath build/DerivedData build
```

随后验证：

```bash
file build/DerivedData/Build/Products/Debug/U-Right.app/Contents/PlugIns/U-Right\ Finder\ Sync.appex/Contents/MacOS/U-Right\ Finder\ Sync
```

结果已变成：

```text
Mach-O 64-bit executable arm64
```

### 修复点 3：确认 `pluginkit` 已经注册到扩展

```bash
pluginkit -a build/DerivedData/Build/Products/Debug/U-Right.app/Contents/PlugIns/U-Right\ Finder\ Sync.appex
pluginkit -m -D -i com.openai.uright.findersync -vv
```

确认系统已经能发现并注册该扩展。

### 修复点 4：用户启用了正确的 Finder Extensions 项

在 `Finder Extensions` 页面启用正确项后，Finder 右键菜单出现，问题解决。

### 修复点 5：统一 `make run` 与 Finder 实际使用的 app 路径

后续又发现一个容易反复踩到的问题：

- 手动调试时使用的是 `/Applications/U-Right.app`
- 但原先的 `make run` 打开的是 `build/xcode/Debug/U-Right.app`

这样会导致：

- 构建产物是一份
- Finder 实际使用的扩展可能是另一份
- 同一个 bundle id 有多份副本同时存在
- 右键菜单是否出现会变得不稳定，或者让调试结果难以解释

因此后续做了进一步收敛：

- `make run` 改为先执行安装
- 然后统一打开 `/Applications/U-Right.app`

也就是说，现在推荐的调试入口不再区分“开发副本”和“安装副本”，统一以安装版为准。

## 以后再遇到类似问题时的判断口诀

如果 Finder 菜单不出现，优先按这个顺序怀疑：

1. 启用的是不是 `Finder Extensions`，而不是 `File Provider`
2. `pluginkit` 里有没有这个扩展
3. 扩展二进制是不是 `Mach-O executable`
4. 系统里是不是注册了多份同 bundle id 的副本
5. Finder 是否真的加载了它

## 当前推荐构建路径

不要再把旧的手工 `.appex` 拼装产物当成主路径。  
当前推荐统一使用 Xcode 工程构建：

```bash
xcodebuild -project URight.xcodeproj -scheme URightHostApp -configuration Debug -derivedDataPath build/DerivedData build
```

最终使用的 app 建议统一安装为：

- `/Applications/U-Right.app`

并从这一路径启动与验证。

当前推荐命令：

```bash
make run CONFIG=Debug
```

它会确保：

- 先安装最新构建
- 再打开 `/Applications/U-Right.app`
- Finder 扩展验证始终围绕同一份 app 进行
