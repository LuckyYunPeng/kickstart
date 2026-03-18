# kickstart

[中文](#中文) | [English](#english)

`kickstart` is a productivity CLI for macOS + iTerm2. It scans Git repositories on your machine, shows the most recently updated projects, lets you select multiple entries, and opens them in a single iTerm2 window with a grid layout, running `opencode .` in each pane.

`kickstart` 是一个面向 macOS + iTerm2 的终端效率工具。它会扫描你电脑上的 Git 项目，按最近更新时间展示候选项目，支持多选，并在一个 iTerm2 窗口中按网格布局自动打开多个项目，在每个 pane 中执行 `opencode .`。

---

## 中文

### 项目介绍

`kickstart` 用来帮你快速恢复多项目工作现场。

当你在终端输入 `kickstart` 时，它会：

- 扫描你电脑中的 Git 项目
- 按最近更新时间倒序排列
- 展示最近的 10 个项目供你多选
- 第一次启动时引导初始化启动命令
- 第一次启动时可设置最近仓库展示数量
- 记住你上一次的选择，并在下次启动时默认勾选
- 打开一个 iTerm2 窗口
- 按 grid 布局为每个项目创建 pane
- 在每个 pane 中自动执行 `opencode .`

适合经常同时处理多个仓库、希望一键恢复工作环境的开发者。

### 功能特性

- 只需一个命令：`kickstart`
- 自动扫描 Git 仓库并按最近更新时间排序
- 首次运行自动初始化启动命令
- 首次运行可配置最近仓库数量（5-30）
- 支持多选项目
- 只打开一个 iTerm2 窗口
- 自动按网格布局分配 pane
- 自动记住上一次的选择
- 针对 macOS + iTerm2 场景优化

### 使用方式

#### 1. 安装

全局安装：

```bash
npm install -g kickstart-workspace
```

安装完成后即可使用：

```bash
kickstart
```

如果你是在本地开发这个项目，也可以在项目目录执行：

```bash
npm install
npm link
```

开发模式下安装完成后，全局即可使用：

```bash
kickstart
```

#### 2. 运行前准备

请确保你的环境满足以下条件：

- macOS
- 已安装 iTerm2
- 已安装 `opencode`
- `opencode` 已加入系统 `PATH`

#### 3. 启动

在任意终端中运行：

```bash
kickstart
```

启动后你会看到最近更新的 Git 项目列表，可以直接多选。

首次运行时，`kickstart` 会先引导你完成初始化。你可以选择：

- `opencode` -> `opencode .`
- `claude` -> `claude`
- `custom`

选择 `custom` 时，会出现输入框供你填写命令。

同时你还可以设置最近仓库展示数量：

- `5`
- `10`
- `15`
- `20`
- `25`
- `30`

确认后，程序会：

- 打开一个 iTerm2 窗口
- 根据你选择的项目数量自动分 pane
- 在每个 pane 中执行 `opencode .`

### 默认行为

- 最近项目数量：首次运行时选择，最大 `30`
- 终端窗口：`1` 个
- 布局方式：grid
- 启动命令：首次运行时选择
- 选择记忆文件：`~/.kickstart/last-selection.json`

### 重置配置

如果你想重新初始化启动命令或清空上次选择，可以执行：

```bash
kickstart reset
```

这会清空：

- `~/.kickstart/config.json`
- `~/.kickstart/last-selection.json`

### 适用场景

- 同时维护多个 Git 仓库
- 每天固定打开一组项目
- 希望快速进入多项目协作状态
- 想把“打开项目 + 进入工作区”流程自动化

---

## English

### Overview

`kickstart` helps you restore a multi-project workspace in one command.

When you run `kickstart`, it will:

- scan Git repositories on your machine
- sort them by most recently updated
- show the latest 10 projects for multi-selection
- guide you through a first-run launch command setup
- let you configure how many recent repositories to show
- remember your last selection and preselect it next time
- open a single iTerm2 window
- split the window into a grid of panes
- run `opencode .` inside each pane

It is designed for developers who frequently work across multiple repositories and want to jump back into context instantly.

### Features

- Single command entry: `kickstart`
- Automatic Git repository discovery
- First-run launch command initialization
- First-run recent repository count setup (5-30)
- Recent-project sorting
- Multi-select project picker
- One iTerm2 window with grid panes
- Last selection memory
- Optimized for macOS + iTerm2 workflows

### Usage

#### 1. Install

Install globally:

```bash
npm install -g kickstart-workspace
```

Then run:

```bash
kickstart
```

If you are developing this project locally, you can also run:

```bash
npm install
npm link
```

Then use it globally with:

```bash
kickstart
```

#### 2. Requirements

Make sure your environment includes:

- macOS
- iTerm2
- `opencode`
- `opencode` available in your `PATH`

#### 3. Run

Start the tool from any terminal:

```bash
kickstart
```

After launch, you can choose from the most recently updated Git projects.

On first run, `kickstart` will guide you through initialization. You can choose:

- `opencode` -> `opencode .`
- `claude` -> `claude`
- `custom`

If you choose `custom`, `kickstart` will show an input box for your command.

You can also choose how many recent repositories to display:

- `5`
- `10`
- `15`
- `20`
- `25`
- `30`

Once confirmed, `kickstart` will:

- open one iTerm2 window
- create a pane grid based on your selection count
- run `opencode .` in each pane

### Default Behavior

- Recent project limit: selected during first-run setup, up to `30`
- Terminal windows opened: `1`
- Layout: grid
- Launch command: selected during first-run setup
- Selection cache file: `~/.kickstart/last-selection.json`

### Reset

If you want to re-run initialization or clear the last selection, run:

```bash
kickstart reset
```

This removes:

- `~/.kickstart/config.json`
- `~/.kickstart/last-selection.json`

### Good Fit For

- working on multiple Git repositories at the same time
- reopening the same project set every day
- restoring a development workspace quickly
- automating project boot-up workflows
