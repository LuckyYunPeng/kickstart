# kickstart

[中文](#中文) | [English](#english)

`kickstart` is a macOS productivity CLI. Its core feature is **App Grid Layout**: pick a few Mac apps, get a recommended screen grid based on how many you picked (2-split / 3-split / 2×2 / 2×3), manually assign which app goes into which cell, then have everything opened and positioned automatically — and optionally save the arrangement as a reusable preset for one-click reuse. It also includes a secondary feature for Git users: scan local Git repos and open several of them at once in an iTerm2 grid, running a preset command in each pane.

`kickstart` 是一个 macOS 效率 CLI。核心功能是 **App 网格布局**：选择几个 Mac App，工具会根据数量推荐合适的屏幕网格（2 等分 / 3 等分 / 2×2 / 2×3），你可以手动编排每个区域对应哪个 App，然后自动打开并把窗口摆放到位，还能把排列方式保存为预设，下次一键复用。此外也附带一个面向 Git 用户的次要功能：扫描本机 Git 仓库，在一个 iTerm2 窗口里按网格批量打开多个仓库，并在每个 pane 中执行预设命令。

---

## 中文

### App 网格布局（核心功能）

把日常要用的几个 App（比如 Slack、Notion、浏览器、备忘录）一次性按网格摆好，不用每次手动拖窗口。

- 从已安装的 App 中选择 2~6 个
- 根据选择数量自动推荐网格布局（2 等分 / 3 等分 / 2×2 / 2×3），部分情况下可手动切换
- 手动编排每个网格区域对应哪个 App，允许留空
- 自动识别你当前激活的屏幕（支持外接显示器），把窗口摆到正确的位置上
- 直接打开，或保存为预设后打开
- 已保存的预设支持一键打开、查看、重命名、删除

### 工作区预设（Git 仓库，次要功能）

如果你也需要同时维护多个 Git 仓库，`kickstart` 可以扫描本机仓库，按最近更新时间展示候选项目，支持多选并在一个 iTerm2 窗口中按网格布局打开，自动在每个 pane 执行你预设的启动命令（如 `opencode .`、`claude`、`codex`、`npm run dev` 等），并支持保存为命名预设、下次直接打开。

### 使用方式

安装：

```bash
npm install -g kickstart-workspace
```

运行：

```bash
kickstart
# or
kk
```

启动后可选择四种入口：

- `App 网格布局`
- `最近项目`（Git 仓库）
- `工作区预设`（Git 仓库）
- `管理预设`

### SwiftBar 集成（可选）

安装 [SwiftBar](https://swiftbar.app) 后，可以把 App 预设放进菜单栏，点击即触发，无需打开终端。

**前提**：已全局安装 `kickstart-workspace`，已安装 SwiftBar 并配置好插件目录。

在 SwiftBar 插件目录中创建 `kickstart.1h.sh`：

```bash
#!/bin/bash
# <swiftbar.title>KickStart</swiftbar.title>
# <swiftbar.hideAboutPlugin>true</swiftbar.hideAboutPlugin>
# <swiftbar.refreshOnOpen>true</swiftbar.refreshOnOpen>

# 替换为你自己的 node 路径（运行 `which node` 获取）
NODE="$(which node)"
# 替换为你自己的 kickstart.js 路径（运行 `npm root -g` 获取前缀）
KK="$(npm root -g)/kickstart-workspace/bin/kickstart.js"

$NODE -e "
const fs = require('fs');
const os = require('os');
const HOME = os.homedir();
const NODE = '$NODE';
const KK = '$KK';

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
}

const appWorkspaces = readJSON(HOME + '/.kickstart/app-workspaces.json');

console.log('🚀');
console.log('---');

if (appWorkspaces.length > 0) {
  console.log('App 预设 | disabled=true size=11 color=#888888');
  appWorkspaces.forEach((w, i) => {
    console.log(w.name + ' | bash=\"' + NODE + '\" param1=' + KK + ' param2=--app-preset-index param3=' + i + ' terminal=false refresh=false');
  });
  console.log('---');
}

console.log('打开 Kickstart... | bash=\"' + NODE + '\" param1=' + KK + ' terminal=true');
"
```

赋予执行权限：

```bash
chmod +x kickstart.1h.sh
```

之后点击菜单栏 🚀，即可直接触发 App 预设，窗口自动排布到位。

> **nvm 用户注意**：SwiftBar 运行时没有 shell 环境，`which node` 在脚本内可能失效。建议直接写死完整路径，例如 `/Users/yourname/.nvm/versions/node/v22.19.0/bin/node`。

> **辅助功能权限**：窗口自动排布依赖 `System Events`，需要辅助功能权限。若 App 启动了但窗口位置不对，请前往**系统设置 → 隐私与安全性 → 辅助功能**，将 `SwiftBar` 添加并启用。

### App Grid Layout (core feature)

Arrange the apps you use every day (Slack, Notion, a browser, notes...) into a screen grid in one shot, instead of dragging windows manually.

- Select 2–6 installed apps
- Auto-recommend a grid layout based on app count (2-split / 3-split / 2×2 / 2×3), with manual override for some counts
- Manually assign which app goes into which grid cell, with empty cells allowed
- Detects the screen you're currently active on (works with external monitors) and positions windows there
- Open directly, or save as a preset and open
- One-click open, view, rename, and delete for saved presets

### Workspace Presets (Git repos, secondary feature)

If you also juggle multiple Git repositories, `kickstart` can scan local repos, list candidates by recent activity, let you multi-select, and open them all in a single iTerm2 window with a grid layout — running your preset command (`opencode .`, `claude`, `codex`, `npm run dev`, etc.) in each pane. Selections can be saved as named presets and reopened later.

### Usage

Install:

```bash
npm install -g kickstart-workspace
```

Run:

```bash
kickstart
# or
kk
```

After startup, choose between four entries:

- `App Grid Layout`
- `Recent Projects` (Git repos)
- `Workspace Presets` (Git repos)
- `Manage Presets`

### SwiftBar Integration (optional)

With [SwiftBar](https://swiftbar.app) installed, you can put your App presets in the menu bar and trigger them with a single click — no terminal needed.

**Requirements**: `kickstart-workspace` installed globally, SwiftBar installed with a plugin directory configured.

Create `kickstart.1h.sh` in your SwiftBar plugin directory:

```bash
#!/bin/bash
# <swiftbar.title>KickStart</swiftbar.title>
# <swiftbar.hideAboutPlugin>true</swiftbar.hideAboutPlugin>
# <swiftbar.refreshOnOpen>true</swiftbar.refreshOnOpen>

# Replace with your actual node path (run `which node`)
NODE="$(which node)"
# Replace with your actual kickstart.js path (run `npm root -g` for the prefix)
KK="$(npm root -g)/kickstart-workspace/bin/kickstart.js"

$NODE -e "
const fs = require('fs');
const os = require('os');
const HOME = os.homedir();
const NODE = '$NODE';
const KK = '$KK';

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
}

const appWorkspaces = readJSON(HOME + '/.kickstart/app-workspaces.json');

console.log('🚀');
console.log('---');

if (appWorkspaces.length > 0) {
  console.log('App Presets | disabled=true size=11 color=#888888');
  appWorkspaces.forEach((w, i) => {
    console.log(w.name + ' | bash=\"' + NODE + '\" param1=' + KK + ' param2=--app-preset-index param3=' + i + ' terminal=false refresh=false');
  });
  console.log('---');
}

console.log('Open Kickstart... | bash=\"' + NODE + '\" param1=' + KK + ' terminal=true');
"
```

Make it executable:

```bash
chmod +x kickstart.1h.sh
```

Click 🚀 in the menu bar to instantly trigger any App preset — windows are arranged automatically.

> **nvm users**: SwiftBar runs without a shell environment, so `which node` may not resolve correctly inside the script. Use the full hardcoded path instead, e.g. `/Users/yourname/.nvm/versions/node/v22.19.0/bin/node`.

> **Accessibility permission**: Window positioning relies on `System Events` and requires accessibility access. If apps launch but windows aren't arranged correctly, go to **System Settings → Privacy & Security → Accessibility** and add `SwiftBar`.
