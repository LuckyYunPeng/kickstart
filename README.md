# kickstart

[中文](#中文) | [English](#english)

`kickstart` is a terminal productivity tool for macOS + iTerm2. It scans Git projects on your machine, shows candidate projects by most recent update time, supports multi-selection, and automatically opens multiple projects in a single iTerm2 window with a grid layout, running the command you chose during initialization in each pane, such as `opencode .`, `claude`, `codex`, `npm run dev`, `npm run start`, or another custom command, so you can quickly restore your working context. The recent-project list also shows each repository's current branch and whether it has pending changes. It also supports workspace presets, so you can save a named project set and reopen it later.

`kickstart` 是一个面向 macOS + iTerm2 的终端效率工具。它会扫描你电脑上的 Git 项目，按最近更新时间展示候选项目，支持多选，并在一个 iTerm2 窗口中按网格布局自动打开多个项目，在每个 pane 中执行你初始化时选择的命令，比如 `opencode .`、`claude`、`codex`、`npm run dev`、`npm run start` 或其他自定义命令，快速恢复工作现场。最近项目列表还会显示仓库当前分支和是否有待提交改动。同时也支持“工作区预设”，可以把常用项目组合保存下来，后续直接一键恢复。

---

## 中文

### 文字介绍

`kickstart` 会帮你快速找回常用的多项目工作区。

它会扫描本机 Git 项目，按最近更新时间展示候选仓库，支持多选，并在一个 iTerm2 窗口中按网格布局打开多个 pane，自动执行你预设的启动命令。

现在你也可以把一组常用仓库保存成“工作区预设”，以后直接选择预设打开，不用每次重新勾选。

### 适用场景

- 同时维护多个 Git 仓库
- 每天固定打开一组项目
- 想快速恢复工作现场
- 想把项目启动流程自动化
- 想把常用项目组合保存为工作区预设

### 设计截图

![项目网格布局](https://raw.githubusercontent.com/LuckyYunPeng/kickstart/main/assets/workspace-grid.png)

> 选择多个仓库后，kickstart 会在同一个 iTerm2 窗口中按网格布局打开项目，并在每个 pane 中执行启动命令。

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

首次运行时，你可以选择启动命令：

- `opencode` -> `opencode .`
- `claude` -> `claude`
- `codex` -> `codex`
- `npm run dev` -> `npm run dev`
- `npm run start` -> `npm run start`
- `custom`

启动后，你可以选择三种入口：

- `最近项目`
- `工作区预设`
- `管理预设`

如果你从“最近项目”里选中了多个仓库，还可以：

- `直接打开`
- `保存为预设后打开`

工作区预设当前支持：

- 保存当前仓库组合
- 直接从预设打开项目
- 查看预设内容
- 重命名预设
- 删除预设

---

## English

### Overview

`kickstart` helps you quickly restore a familiar multi-project workspace.

It scans local Git projects, shows candidate repositories by most recent update time, supports multi-selection, and opens multiple panes in a single iTerm2 window with a grid layout, automatically running your preset command in each pane. You can also save named workspace presets to reopen the same set of repositories later.

### Use Cases

- Working across multiple Git repositories
- Reopening the same project set every day
- Restoring your working context quickly
- Automating project boot-up workflows
- Saving frequently used repo combinations as workspace presets

### Screenshot

![Workspace grid](https://raw.githubusercontent.com/LuckyYunPeng/kickstart/main/assets/workspace-grid.png)

> After selecting multiple repositories, kickstart opens them in a single iTerm2 window with a grid layout and runs the chosen command in each pane.

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

On first run, you can choose a launch command:

- `opencode` -> `opencode .`
- `claude` -> `claude`
- `codex` -> `codex`
- `npm run dev` -> `npm run dev`
- `npm run start` -> `npm run start`
- `custom`

After startup, you can choose between:

- `Recent Projects`
- `Workspace Presets`
- `Manage Presets`

From the recent-project flow, you can either:

- `Open Directly`
- `Save as Preset and Open`

Workspace presets currently support:

- Saving the current project selection
- Opening a saved preset directly
- Viewing preset contents
- Renaming a preset
- Deleting a preset
