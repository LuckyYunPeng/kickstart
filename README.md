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

---

## English

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
