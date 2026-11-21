---
name: dsh-plugin-release
description: 提交、推送、发版 dsh-session-todo 这个 DeepSeek Harness 插件到 GitHub，并在公网验证"别人能装上"的 SOP。用户要求提交/推送/push/发版/release 本插件、改动后要更新 GitHub、升级 DSH 后重新发布，或要确认外部安装是否可用时使用。
license: MIT
---

# DSH 插件发布 SOP

## 范围

| 项 | 值 |
|---|---|
| 工作目录 | 本仓库根目录（本 skill 位于 `.agents/skills/dsh-plugin-release/`，只在本仓库内被发现） |
| 远端 | `git@github.com:nogiveme/dsh-session-todo.git`，分支 `main`，**公开** |
| 包名 | `@local/dsh-session-todo`（`private: true`，只走 git/本地安装，不发 npm） |
| Bundle 行 | `cordis.patch.yml` 插入 `id: session-todo` |
| 两种安装形态 | 本地目录 → `link:`，改完刷新即生效；GitHub URL → 固定 commit 的副本，改完必须卸载重装 |

## 硬规则（动手前先看）

1. **包名三处锁定**：`package.json` 的 `name`、`cordis.patch.yml` 里 row 的 `name`、`client.js` 顶部 `window.__ModuleLoader__.load({ id: ... })`（及内部 `PKG` 常量）必须完全一致。改任一处就要三处同步，改完必须让用户重装。
2. **不要引入构建步骤或安装脚本**。当前包只依赖 Node 内置模块；Client 半只 `require('react')`（浏览器模块表内置）。加了 `prepare`/`postinstall`，pnpm 10 会拦截并要求用户逐条批准。
3. **不进版本库**：`node_modules/`、`*.log`、`*.tgz`、`.DS_Store` 已在 `.gitignore`；同时永远不要提交 `~/.dsh/session-todo/todos.json` 或任何用户数据。
4. **每次影响运行时行为的推送都要 bump `package.json` 的 `version`**。git 安装是固定 commit 的副本，版本号是用户区分新旧版本的唯一依据。
5. **`engines.dsh` 是兼容性闸门**（当前 `>=0.2.2-rc.5 <0.3.0`）。放宽前必须在新版本 DSH 上实测插件；只给某人临时放行用 `dsh plugin --profile web allow-version @local/dsh-session-todo@<ver> --dsh-version <ver> --accept-risk`，不要直接改范围。
6. **不要用 `plugin_manager install_bundle` 来"验证"**：本机 profile 是 `link:` 安装，装同一包会报 `already-installed` 或顶掉 link，破坏本地开发回路。验证一律在 `/tmp` 里做。

## 提交前检查（必做）

以下命令都在仓库根目录执行：

```bash
# 1) 语法与清单
for f in index.js store.js prompt-tracker.js routes.js client.js; do node --check "$f" || break; done
node -e "for (const p of ['package.json','locale/en.json','locale/zh.json']) JSON.parse(require('fs').readFileSync(p,'utf8')); console.log('ok json')"

# 2) 用真实 loader 解析 bundle patch（版本闸门一起评估）
DSH_PKG=$(readlink -f "$(command -v dsh)")
DSH_PKG="$DSH_PKG" node --input-type=module -e "
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readFileSync } from 'node:fs'
const entry = createRequire(process.env.DSH_PKG).resolve('@deepseek-ai/dsh-app-boot')
const { loadOverlayPatches, evaluatePluginCompatibility } = await import(pathToFileURL(entry).href)
console.log(JSON.stringify(loadOverlayPatches('dsh', 'cordis.patch.yml')))
const c = evaluatePluginCompatibility(JSON.parse(readFileSync('package.json','utf8')))
console.log('compat (undefined = 可安装):', c)
"

# 3) 变更审查
git status --short && git diff --stat
```

`loadOverlayPatches` 不报错且输出 `insert: session-todo`、`compat` 为 `undefined` 才算过。若取不到 `dsh` 安装目录，跳过第 2 步并在汇报里注明"未用真实 loader 校验"。

## 提交与推送

```bash
git add -A && git status --short          # 确认没有多余文件
git commit -m "<一句话：用户可见的效果>"
git push origin main
git ls-remote origin refs/heads/main      # 核对远端 commit 与本机一致
```

- 标题写"改完以后用户会看到什么"，中英文皆可（仓库首条为英文，保持一致更好）；一条提交只做一件事。
- **推送是外发动作**：用户明确说"提交/推送/发版"即视为授权；只说"改一下"时只做本地改动，不要推送。
- 不改写已推送历史：要回滚就 `git revert` 后正常推送。

## 推送后验证（公网，必做）

按第三方视角在临时目录装一遍，验证完删掉临时目录：

```bash
rm -rf /tmp/dsh-todo-remote && mkdir -p /tmp/dsh-todo-remote && cd /tmp/dsh-todo-remote
printf '{"name":"remote-test","private":true}\n' > package.json
pnpm add "https://github.com/nogiveme/dsh-session-todo"
node --input-type=module -e "const m = await import('@local/dsh-session-todo'); console.log(Object.keys(m), m.inject)"
```

预期：`+ @local/dsh-session-todo <version>`，依赖记录为 `github:nogiveme/dsh-session-todo`，导出 `apply` / `inject` 正常。再对安装副本跑一次上面的 `loadOverlayPatches` + `evaluatePluginCompatibility`（路径换成 `node_modules/@local/dsh-session-todo`）。

这一步只证明"能装、模块能加载、patch 合法"；**界面表现仍需在 UI 里看**（新会话确认插件行、侧栏「待办」、提示条、快捷键）。

## 升级与回滚

- 别人的升级 = **卸载重装**（第三方 git 插件没有 Update 按钮）：`dsh plugin --profile web remove @local/dsh-session-todo`，再 `add`。
- 本机开发机是 `link:`，推送不影响本地；只有走 `/tmp` 的安装验证才是"副本形态"。
- 回滚：`git revert <sha>` 并 bump 一个版本，不要 `push --force`。

## 复用规则（其他 DSH 插件）

同样的约束适用于任何要发 GitHub 的 DSH 插件：必须声明 `dsh.bundle.patch`；`dsh.client` 的模块 id 必须等于包名；不依赖仓库外的私有路径或本机绝对路径；图标 ≤256 KiB 且用 SVG/PNG/JPEG/WebP；`locale/*.json` 的 `meta.title` / `meta.description` 要写真实能力描述。

## 已知限制（写进发布说明时别夸大）

- 定位依赖 DSH 客户端内部锚点（`data-chat-turn`、`data-conversation-scroll` 等），DSH 升级后可能失效；任务数据本身不受影响。
- 数据文件 `~/.dsh/session-todo/todos.json` 按 `DSH_HOME` 共享，同机多 profile 读到同一份。
- 只支持 v3 数据；旧版文件改名保留，不自动迁移。
- 需要 Web 类 profile：Host 注入 `webServer` / `workspaceRegistry` / `sessionQuery`，`headless` 等 profile 里不会激活。
- README 目前只有中文。
