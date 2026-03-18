# kickstart

[中文](#中文) | [English](#english)

`kickstart` is a terminal productivity tool for macOS + iTerm2. It scans Git projects on your machine, shows candidate projects by most recent update time, supports multi-selection, and automatically opens multiple projects in a single iTerm2 window with a grid layout, running the command you chose during initialization in each pane, such as `opencode .`, `claude`, or another custom command, so you can quickly restore your working context.

`kickstart` 是一个面向 macOS + iTerm2 的终端效率工具。它会扫描你电脑上的 Git 项目，按最近更新时间展示候选项目，支持多选，并在一个 iTerm2 窗口中按网格布局自动打开多个项目，在每个 pane 中执行你初始化时选择的命令，比如 `opencode .`、`claude` 或其他自定义命令，快速恢复工作现场。

---

## 中文

### 文字介绍

`kickstart` 会帮你快速找回常用的多项目工作区。

它会扫描本机 Git 项目，按最近更新时间展示候选仓库，支持多选，并在一个 iTerm2 窗口中按网格布局打开多个 pane，自动执行你预设的启动命令。

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
```

首次运行时，你可以选择启动命令：

- `opencode` -> `opencode .`
- `claude` -> `claude`
- `custom`

### 适用场景

- 同时维护多个 Git 仓库
- 每天固定打开一组项目
- 想快速恢复工作现场
- 想把项目启动流程自动化

---

## English

### Overview

`kickstart` helps you quickly restore a familiar multi-project workspace.

It scans local Git projects, shows candidate repositories by most recent update time, supports multi-selection, and opens multiple panes in a single iTerm2 window with a grid layout, automatically running your preset command in each pane.

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
```

On first run, you can choose a launch command:

- `opencode` -> `opencode .`
- `claude` -> `claude`
- `custom`

### Use Cases

- Working across multiple Git repositories
- Reopening the same project set every day
- Restoring your working context quickly
- Automating project boot-up workflows
