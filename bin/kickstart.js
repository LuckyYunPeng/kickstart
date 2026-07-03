#!/usr/bin/env node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import inquirer from "inquirer";

const execFileAsync = promisify(execFile);
const HOME_DIR = os.homedir();
const CACHE_DIR = path.join(HOME_DIR, ".kickstart");
const CONFIG_FILE = path.join(CACHE_DIR, "config.json");
const LAST_SELECTION_FILE = path.join(CACHE_DIR, "last-selection.json");
const WORKSPACES_FILE = path.join(CACHE_DIR, "workspaces.json");
const APP_WORKSPACES_FILE = path.join(CACHE_DIR, "app-workspaces.json");
const WINDOW_READY_DELAY = 0.4;
const PANE_READY_DELAY = 0.25;
const COMMAND_READY_DELAY = 0.15;
const APP_LAUNCH_DELAY_MS = 2000;
const APP_POSITION_DELAY_MS = 300;
const MAX_RESULT_OPTIONS = [5, 10, 15, 20, 25, 30];
const SKIP_DIRS = new Set([
  ".Trash",
  ".cache",
  ".npm",
  ".pnpm-store",
  ".yarn",
  "Applications",
  "Library",
  "Movies",
  "Music",
  "Pictures",
  "Public",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".nuxt",
  ".turbo",
  ".git"
]);

const LAYOUT_LABELS = {
  "1x2": "2等分（左右）",
  "1x3": "3等分（左中右）",
  "2x2": "4等分 2×2",
  "2x3": "6等分 2×3",
};

const CELL_POSITION_LABELS = {
  "1x2": ["左", "右"],
  "1x3": ["左", "中", "右"],
  "2x2": ["左上", "右上", "左下", "右下"],
  "2x3": ["左上", "中上", "右上", "左下", "中下", "右下"],
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readLastSelection() {
  try {
    const content = await fs.readFile(LAST_SELECTION_FILE, "utf8");
    const parsed = JSON.parse(content);

    if (!Array.isArray(parsed.selectedRepos)) {
      return [];
    }

    return parsed.selectedRepos.filter((item) => typeof item === "string");
  } catch {
    return [];
  }
}

async function readConfig() {
  try {
    const content = await fs.readFile(CONFIG_FILE, "utf8");
    const parsed = JSON.parse(content);

    if (typeof parsed.launchCommand !== "string" || parsed.launchCommand.trim() === "") {
      return null;
    }

    if (!MAX_RESULT_OPTIONS.includes(parsed.maxResults)) {
      return null;
    }

    return {
      launchCommand: parsed.launchCommand.trim(),
      maxResults: parsed.maxResults
    };
  } catch {
    return null;
  }
}

async function writeConfig(config) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
}

function normalizeWorkspaceName(name) {
  return name.trim();
}

function isValidWorkspaceRecord(workspace) {
  return (
    workspace &&
    typeof workspace.name === "string" &&
    workspace.name.trim() !== "" &&
    Array.isArray(workspace.repoPaths)
  );
}

function sortWorkspaces(workspaces) {
  return [...workspaces].sort((left, right) => {
    const leftUpdatedAt = Date.parse(left.updatedAt ?? "") || 0;
    const rightUpdatedAt = Date.parse(right.updatedAt ?? "") || 0;
    return rightUpdatedAt - leftUpdatedAt;
  });
}

async function readWorkspaces() {
  try {
    const content = await fs.readFile(WORKSPACES_FILE, "utf8");
    const parsed = JSON.parse(content);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortWorkspaces(
      parsed
        .filter(isValidWorkspaceRecord)
        .map((workspace) => ({
          name: normalizeWorkspaceName(workspace.name),
          repoPaths: workspace.repoPaths.filter((item) => typeof item === "string"),
          updatedAt:
            typeof workspace.updatedAt === "string" && workspace.updatedAt.trim() !== ""
              ? workspace.updatedAt
              : new Date(0).toISOString()
        }))
        .filter((workspace) => workspace.repoPaths.length > 0)
    );
  } catch {
    return [];
  }
}

async function writeWorkspaces(workspaces) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(WORKSPACES_FILE, JSON.stringify(sortWorkspaces(workspaces), null, 2), "utf8");
}

function isWorkspaceNameTaken(workspaces, workspaceName, excludeName = "") {
  return workspaces.some(
    (workspace) =>
      workspace.name === workspaceName &&
      (excludeName === "" || workspace.name !== excludeName)
  );
}

async function saveWorkspace(workspaceName, repoPaths) {
  const normalizedName = normalizeWorkspaceName(workspaceName);
  const workspaces = await readWorkspaces();

  if (isWorkspaceNameTaken(workspaces, normalizedName)) {
    throw new Error(`工作区预设 ${normalizedName} 已存在。`);
  }

  workspaces.push({
    name: normalizedName,
    repoPaths: [...repoPaths],
    updatedAt: new Date().toISOString()
  });

  await writeWorkspaces(workspaces);
}

async function renameWorkspace(oldName, newName) {
  const normalizedNewName = normalizeWorkspaceName(newName);
  const workspaces = await readWorkspaces();

  if (isWorkspaceNameTaken(workspaces, normalizedNewName, oldName)) {
    throw new Error(`工作区预设 ${normalizedNewName} 已存在。`);
  }

  const nextWorkspaces = workspaces.map((workspace) => {
    if (workspace.name !== oldName) {
      return workspace;
    }

    return {
      ...workspace,
      name: normalizedNewName,
      updatedAt: new Date().toISOString()
    };
  });

  await writeWorkspaces(nextWorkspaces);
}

async function deleteWorkspace(workspaceName) {
  const workspaces = await readWorkspaces();
  const nextWorkspaces = workspaces.filter((workspace) => workspace.name !== workspaceName);
  await writeWorkspaces(nextWorkspaces);
}

function buildWorkspaceChoices(workspaces) {
  return sortWorkspaces(workspaces).map((workspace) => ({
    name: `${workspace.name}  ${workspace.repoPaths.length} 个项目`,
    value: workspace.name,
    description: workspace.repoPaths.join(", ")
  }));
}

async function promptWorkspaceName(message, existingName = "") {
  const workspaces = await readWorkspaces();
  const { workspaceName } = await inquirer.prompt([
    {
      type: "input",
      name: "workspaceName",
      message,
      default: existingName,
      validate(value) {
        const normalizedName = normalizeWorkspaceName(value);

        if (!normalizedName) {
          return "预设名称不能为空";
        }

        if (isWorkspaceNameTaken(workspaces, normalizedName, existingName)) {
          return "预设名称已存在";
        }

        return true;
      }
    }
  ]);

  return normalizeWorkspaceName(workspaceName);
}

async function promptRecentRepoSelection(recentRepos, lastSelection, maxResults) {
  const { selectedRepos } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selectedRepos",
      message: "选择要打开的项目",
      choices: recentRepos.map((repo) => ({
        name: formatRecentRepoChoice(repo),
        value: repo.repoPath,
        checked: lastSelection.has(repo.repoPath)
      })),
      pageSize: maxResults,
      loop: false,
      validate(value) {
        return value.length > 0 ? true : "至少选择一个项目";
      }
    }
  ]);

  return selectedRepos;
}

function formatRecentRepoChoice(repo) {
  const repoName = path.basename(repo.repoPath);
  const updatedAtText = formatUpdatedAt(repo.updatedAt);
  const branchText = repo.branchName || "unknown";
  const statusText = repo.isDirty ? "[33m! 待提交[0m" : "";

  return `${repoName}  ${updatedAtText}  [${branchText}]${statusText ? `  ${statusText}` : ""}`;
}

function parseBranchFromStatusHeader(headerLine) {
  if (!headerLine.startsWith("## ")) {
    return "unknown";
  }

  const branchPart = headerLine.slice(3).split("...")[0].trim();

  if (branchPart === "HEAD (no branch)") {
    return "HEAD";
  }

  return branchPart || "unknown";
}

async function getRepoState(repoPath) {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["-C", repoPath, "status", "--short", "--branch"],
      { timeout: 1200, maxBuffer: 1024 * 1024 }
    );

    const lines = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== "");

    const branchName = parseBranchFromStatusHeader(lines[0] ?? "");
    const isDirty = lines.slice(1).length > 0;

    return {
      branchName,
      isDirty
    };
  } catch {
    return {
      branchName: "unknown",
      isDirty: false
    };
  }
}

async function openSelectedProjects(selectedRepos, launchCommand) {
  await writeLastSelection(selectedRepos);
  await openProjectsInIterm(selectedRepos, launchCommand);
  process.stdout.write(`已打开 ${selectedRepos.length} 个项目。\n`);
}

async function handleRecentProjectsFlow(config) {
  process.stdout.write(`正在扫描 ${HOME_DIR} 下的 Git 项目...\n`);
  const repoPaths = await collectGitRepos(HOME_DIR);

  if (repoPaths.length === 0) {
    process.stdout.write("没有找到 Git 项目。\n");
    return;
  }

  const repos = await Promise.all(
    repoPaths.map(async (repoPath) => ({
      repoPath,
      updatedAt: await getRepoUpdatedAt(repoPath)
    }))
  );

  const recentRepos = repos
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, config.maxResults);

  const recentReposWithState = await Promise.all(
    recentRepos.map(async (repo) => ({
      ...repo,
      ...(await getRepoState(repo.repoPath))
    }))
  );

  const lastSelection = new Set(await readLastSelection());
  const selectedRepos = await promptRecentRepoSelection(
    recentReposWithState,
    lastSelection,
    config.maxResults
  );

  const { nextAction } = await inquirer.prompt([
    {
      type: "list",
      name: "nextAction",
      message: "接下来要怎么处理这组项目？",
      choices: [
        {
          name: "直接打开",
          value: "openDirectly"
        },
        {
          name: "保存为预设后打开",
          value: "saveAndOpen"
        }
      ]
    }
  ]);

  if (nextAction === "saveAndOpen") {
    const workspaceName = await promptWorkspaceName("请输入工作区预设名称");
    await saveWorkspace(workspaceName, selectedRepos);
    process.stdout.write(`已保存工作区预设：${workspaceName}\n`);
  }

  await openSelectedProjects(selectedRepos, config.launchCommand);
}

async function getExistingRepoPaths(repoPaths) {
  const results = await Promise.all(
    repoPaths.map(async (repoPath) => ({
      repoPath,
      isExisting: await pathExists(repoPath)
    }))
  );

  const validRepoPaths = results.filter((item) => item.isExisting).map((item) => item.repoPath);
  const invalidRepoPaths = results.filter((item) => !item.isExisting).map((item) => item.repoPath);

  return { validRepoPaths, invalidRepoPaths };
}

async function handleWorkspacePresetsFlow(config) {
  const workspaces = await readWorkspaces();

  if (workspaces.length === 0) {
    process.stdout.write("还没有保存任何工作区预设。\n");
    return;
  }

  const { workspaceName } = await inquirer.prompt([
    {
      type: "list",
      name: "workspaceName",
      message: "选择要打开的工作区预设",
      choices: buildWorkspaceChoices(workspaces),
      loop: false
    }
  ]);

  const selectedWorkspace = workspaces.find((workspace) => workspace.name === workspaceName);
  const { validRepoPaths, invalidRepoPaths } = await getExistingRepoPaths(selectedWorkspace.repoPaths);

  if (invalidRepoPaths.length > 0) {
    process.stdout.write(`已跳过 ${invalidRepoPaths.length} 个失效项目路径。\n`);
  }

  if (validRepoPaths.length === 0) {
    throw new Error(`工作区预设 ${workspaceName} 没有可用的项目路径。`);
  }

  await openSelectedProjects(validRepoPaths, config.launchCommand);
}

async function handleManageWorkspacesFlow() {
  const repoWorkspaces = await readWorkspaces();
  const appWorkspaces = await readAppWorkspaces();

  if (repoWorkspaces.length === 0 && appWorkspaces.length === 0) {
    process.stdout.write("当前没有任何预设可管理。\n");
    return;
  }

  let presetType = "workspace";

  if (repoWorkspaces.length > 0 && appWorkspaces.length > 0) {
    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "presetType",
        message: "管理哪类预设？",
        choices: [
          { name: "工作区预设（项目）", value: "workspace" },
          { name: "App 预设", value: "app" }
        ]
      }
    ]);
    presetType = answer.presetType;
  } else if (appWorkspaces.length > 0) {
    presetType = "app";
  }

  if (presetType === "app") {
    await handleManageAppWorkspacesFlow();
    return;
  }

  const workspaces = repoWorkspaces;
  const { manageAction } = await inquirer.prompt([
    {
      type: "list",
      name: "manageAction",
      message: "请选择预设管理操作",
      choices: [
        {
          name: "查看预设",
          value: "view"
        },
        {
          name: "重命名预设",
          value: "rename"
        },
        {
          name: "删除预设",
          value: "delete"
        }
      ]
    }
  ]);

  const { workspaceName } = await inquirer.prompt([
    {
      type: "list",
      name: "workspaceName",
      message: "请选择工作区预设",
      choices: buildWorkspaceChoices(workspaces),
      loop: false
    }
  ]);

  const selectedWorkspace = workspaces.find((workspace) => workspace.name === workspaceName);

  if (manageAction === "view") {
    process.stdout.write(`工作区预设：${selectedWorkspace.name}\n`);
    selectedWorkspace.repoPaths.forEach((repoPath, index) => {
      process.stdout.write(`${index + 1}. ${repoPath}\n`);
    });
    return;
  }

  if (manageAction === "rename") {
    const nextWorkspaceName = await promptWorkspaceName("请输入新的预设名称", selectedWorkspace.name);
    await renameWorkspace(selectedWorkspace.name, nextWorkspaceName);
    process.stdout.write(`已将工作区预设重命名为：${nextWorkspaceName}\n`);
    return;
  }

  const { isConfirmed } = await inquirer.prompt([
    {
      type: "confirm",
      name: "isConfirmed",
      message: `确定删除工作区预设 ${selectedWorkspace.name} 吗？`,
      default: false
    }
  ]);

  if (!isConfirmed) {
    process.stdout.write("已取消删除。\n");
    return;
  }

  await deleteWorkspace(selectedWorkspace.name);
  process.stdout.write(`已删除工作区预设：${selectedWorkspace.name}\n`);
}

// ─── App 网格布局 ────────────────────────────────────────────────────────────

function isValidAppWorkspaceRecord(workspace) {
  return (
    workspace &&
    typeof workspace.name === "string" &&
    workspace.name.trim() !== "" &&
    Array.isArray(workspace.apps) &&
    workspace.apps.length > 0 &&
    typeof workspace.layout === "string" &&
    workspace.layout in LAYOUT_LABELS
  );
}

async function readAppWorkspaces() {
  try {
    const content = await fs.readFile(APP_WORKSPACES_FILE, "utf8");
    const parsed = JSON.parse(content);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortWorkspaces(
      parsed
        .filter(isValidAppWorkspaceRecord)
        .map((workspace) => ({
          name: normalizeWorkspaceName(workspace.name),
          apps: workspace.apps.filter((item) => typeof item === "string"),
          layout: workspace.layout,
          updatedAt:
            typeof workspace.updatedAt === "string" && workspace.updatedAt.trim() !== ""
              ? workspace.updatedAt
              : new Date(0).toISOString()
        }))
    );
  } catch {
    return [];
  }
}

async function writeAppWorkspaces(workspaces) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(APP_WORKSPACES_FILE, JSON.stringify(sortWorkspaces(workspaces), null, 2), "utf8");
}

async function saveAppWorkspace(workspaceName, apps, layout) {
  const normalizedName = normalizeWorkspaceName(workspaceName);
  const workspaces = await readAppWorkspaces();

  if (isWorkspaceNameTaken(workspaces, normalizedName)) {
    throw new Error(`App 预设 ${normalizedName} 已存在。`);
  }

  workspaces.push({
    name: normalizedName,
    apps: [...apps],
    layout,
    updatedAt: new Date().toISOString()
  });

  await writeAppWorkspaces(workspaces);
}

async function promptAppWorkspaceName(message, existingName = "") {
  const workspaces = await readAppWorkspaces();
  const { workspaceName } = await inquirer.prompt([
    {
      type: "input",
      name: "workspaceName",
      message,
      default: existingName,
      validate(value) {
        const normalizedName = normalizeWorkspaceName(value);

        if (!normalizedName) {
          return "预设名称不能为空";
        }

        if (isWorkspaceNameTaken(workspaces, normalizedName, existingName)) {
          return "预设名称已存在";
        }

        return true;
      }
    }
  ]);

  return normalizeWorkspaceName(workspaceName);
}

function renderLayoutDiagram(layout) {
  const diagrams = {
    "1x2": [
      "  ┌──────┬──────┐",
      "  │  ①  │  ②  │",
      "  └──────┴──────┘",
    ],
    "1x3": [
      "  ┌────┬────┬────┐",
      "  │ ① │ ② │ ③ │",
      "  └────┴────┴────┘",
    ],
    "2x2": [
      "  ┌──────┬──────┐",
      "  │  ①  │  ②  │",
      "  ├──────┼──────┤",
      "  │  ③  │  ④  │",
      "  └──────┴──────┘",
    ],
    "2x3": [
      "  ┌────┬────┬────┐",
      "  │ ① │ ② │ ③ │",
      "  ├────┼────┼────┤",
      "  │ ④ │ ⑤ │ ⑥ │",
      "  └────┴────┴────┘",
    ],
  };

  return (diagrams[layout] ?? []).join("\n");
}

async function promptAppAssignment(selectedApps, layout) {
  const cellLabels = CELL_POSITION_LABELS[layout];
  const totalCells = cellLabels.length;
  const assignment = new Array(totalCells).fill("");
  const remaining = [...selectedApps];
  const EMPTY = "__empty__";

  process.stdout.write(`\n${renderLayoutDiagram(layout)}\n\n`);

  for (let i = 0; i < totalCells; i++) {
    if (remaining.length === 0) break;

    const remainingCells = totalCells - i;
    const canLeaveEmpty = remaining.length < remainingCells;
    const choices = remaining.map((app) => ({ name: app, value: app }));

    if (canLeaveEmpty) {
      choices.push({ name: "留空", value: EMPTY });
    }

    const { appChoice } = await inquirer.prompt([
      {
        type: "list",
        name: "appChoice",
        message: `区域 ${i + 1}（${cellLabels[i]}）`,
        choices,
        loop: false
      }
    ]);

    if (appChoice !== EMPTY) {
      assignment[i] = appChoice;
      remaining.splice(remaining.indexOf(appChoice), 1);
    }
  }

  return assignment;
}

async function scanInstalledApps() {
  const appDirs = [
    "/Applications",
    path.join(HOME_DIR, "Applications"),
    "/Applications/Utilities"
  ];
  const apps = new Set();

  for (const dir of appDirs) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.endsWith(".app") && entry.isDirectory()) {
          apps.add(entry.name.replace(/\.app$/, ""));
        }
      }
    } catch {
      // 目录不存在则跳过
    }
  }

  return [...apps].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function recommendLayout(count) {
  if (count <= 2) return "1x2";
  if (count <= 4) return "2x2";
  return "2x3";
}

function getAvailableLayouts(count) {
  if (count === 3) return ["2x2", "1x3"];
  return [recommendLayout(count)];
}

async function promptLayoutSelection(count) {
  const recommended = recommendLayout(count);
  const available = getAvailableLayouts(count);

  if (available.length === 1) {
    process.stdout.write(`布局：${LAYOUT_LABELS[recommended]}\n`);
    return recommended;
  }

  const { layout } = await inquirer.prompt([
    {
      type: "list",
      name: "layout",
      message: "选择布局",
      choices: available.map((l) => ({
        name: l === recommended ? `${LAYOUT_LABELS[l]}（推荐）` : LAYOUT_LABELS[l],
        value: l
      })),
      default: recommended
    }
  ]);

  return layout;
}

async function getUsableScreenBounds() {
  const jxa = `
ObjC.import('AppKit');
var screens = $.NSScreen.screens;
var primaryFrame = screens.objectAtIndex(0).frame;
var mouseLoc = $.NSEvent.mouseLocation;

var target = null;
for (var i = 0; i < screens.count; i++) {
  var scr = screens.objectAtIndex(i);
  var f = scr.frame;
  if (mouseLoc.x >= f.origin.x && mouseLoc.x < f.origin.x + f.size.width &&
      mouseLoc.y >= f.origin.y && mouseLoc.y < f.origin.y + f.size.height) {
    target = scr;
    break;
  }
}
if (!target) target = $.NSScreen.mainScreen;

var v = target.visibleFrame;
var left = Math.round(v.origin.x);
var top = Math.round(primaryFrame.size.height - v.origin.y - v.size.height);
var right = Math.round(v.origin.x + v.size.width);
var bottom = top + Math.round(v.size.height);
[left, top, right, bottom].join(',')
`;
  const { stdout } = await execFileAsync("osascript", ["-l", "JavaScript", "-e", jxa]);
  const [left, top, right, bottom] = stdout.trim().split(",").map(Number);
  return { left, top, right, bottom };
}

function calculateCellBounds(layout, { left, top, right, bottom }) {
  const W = right - left;
  const H = bottom - top;
  const cells = [];

  if (layout === "1x2") {
    const w = Math.floor(W / 2);
    cells.push({ left, top, right: left + w, bottom });
    cells.push({ left: left + w, top, right, bottom });
  } else if (layout === "1x3") {
    const w = Math.floor(W / 3);
    cells.push({ left, top, right: left + w, bottom });
    cells.push({ left: left + w, top, right: left + 2 * w, bottom });
    cells.push({ left: left + 2 * w, top, right, bottom });
  } else if (layout === "2x2") {
    const w = Math.floor(W / 2);
    const h = Math.floor(H / 2);
    cells.push({ left, top, right: left + w, bottom: top + h });
    cells.push({ left: left + w, top, right, bottom: top + h });
    cells.push({ left, top: top + h, right: left + w, bottom });
    cells.push({ left: left + w, top: top + h, right, bottom });
  } else if (layout === "2x3") {
    const w = Math.floor(W / 3);
    const h = Math.floor(H / 2);

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const cellLeft = left + col * w;
        const cellTop = top + row * h;
        const cellRight = col === 2 ? right : left + (col + 1) * w;
        const cellBottom = row === 1 ? bottom : top + (row + 1) * h;
        cells.push({ left: cellLeft, top: cellTop, right: cellRight, bottom: cellBottom });
      }
    }
  }

  return cells;
}

async function positionAppWindow(appName, cell, options = {}) {
  const { left, top, right, bottom } = cell;
  const width = right - left;
  const height = bottom - top;
  const quoted = appleScriptQuote(appName);
  const anchorBottom = options.anchorBottom === true;

  // 使用重试循环：activate 后最多等 ~4.5s，每 0.3s 检查一次是否有窗口可定位。
  // 按进程名精确锁定目标窗口（不用 `frontmost is true`，activate 异步会抓错窗口；
  // AppleScript 字符串比较默认不区分大小写，故 name is "Ghostty" 能匹配进程 "ghostty"）。
  // size → position → size 落位后，按两种模式收尾：
  //   - 上排(默认)：若被顶部菜单栏夹下压了 δ，把高度减掉 δ，使底边仍停在 cell.bottom。
  //   - 下排(anchorBottom)：窗口若因最小高度被撑大，整体上移使底边贴住 cell.bottom(可用区底)，
  //     不压 Dock；让出的空间由同列上排缩短填补（调用方用返回的实际顶边作分界）。
  // position 都放最后一步：部分 app(如 Fork)resize 后会自动重新居中，须最后再 assert 位置。
  const adjustBlock = anchorBottom
    ? [
        `        set fSizeTmp to size of targetWindow`,
        `        set actualHeight to item 2 of fSizeTmp`,
        `        set position of targetWindow to {${left}, ${bottom} - actualHeight}`,
      ]
    : [
        `        set winPos to position of targetWindow`,
        `        set actualTop to item 2 of winPos`,
        `        if actualTop > ${top} then`,
        `          set adjH to ${height} - (actualTop - ${top})`,
        `          if adjH > 100 then set size of targetWindow to {${width}, adjH}`,
        `        end if`,
        `        set position of targetWindow to {${left}, ${top}}`,
      ];

  const script = [
    `set logLine to "no-window"`,
    `tell application "${quoted}" to activate`,
    `set windowSet to false`,
    `repeat 15 times`,
    `  delay 0.3`,
    `  tell application "System Events"`,
    `    try`,
    `      set frontProc to first application process whose name is "${quoted}"`,
    `      set procName to name of frontProc`,
    `      if (count of windows of frontProc) > 0 then`,
    `        set targetWindow to window 1 of frontProc`,
    `        set size of targetWindow to {${width}, ${height}}`,
    `        set position of targetWindow to {${left}, ${top}}`,
    `        set size of targetWindow to {${width}, ${height}}`,
    ...adjustBlock,
    `        set fPos to position of targetWindow`,
    `        set fSize to size of targetWindow`,
    `        set logLine to "frontProc=" & procName & " mode=${anchorBottom ? "bottom" : "top"} reqCell={${left},${top},${right},${bottom}} finalPos={" & (item 1 of fPos) & "," & (item 2 of fPos) & "} finalSize={" & (item 1 of fSize) & "," & (item 2 of fSize) & "}"`,
    `        set windowSet to true`,
    `      else`,
    `        set logLine to "frontProc=" & procName & " has 0 windows (retrying)"`,
    `      end if`,
    `    on error errMsg`,
    `      set logLine to "ERROR: " & errMsg`,
    `    end try`,
    `  end tell`,
    `  if windowSet then exit repeat`,
    `  tell application "${quoted}" to activate`,
    `end repeat`,
    `return logLine`
  ].join("\n");

  let diag = "";
  try {
    const { stdout } = await execFileAsync("osascript", ["-e", script]);
    diag = stdout.trim();
  } catch (err) {
    diag = `EXEC-FAIL: ${err && err.message ? err.message : err}`;
  }

  try {
    await fs.appendFile(
      path.join(CACHE_DIR, "layout-debug.log"),
      `[${new Date().toISOString()}] app=${appName} cell={L:${left},T:${top},R:${right},B:${bottom}} -> ${diag}\n`,
      "utf8"
    );
  } catch {
    // 日志写入失败不影响布局
  }

  // 解析实际几何返回给调用方（供本列自适应使用）
  const posMatch = diag.match(/finalPos=\{(-?\d+),(-?\d+)\}/);
  const sizeMatch = diag.match(/finalSize=\{(-?\d+),(-?\d+)\}/);
  if (posMatch && sizeMatch) {
    const x = Number(posMatch[1]);
    const y = Number(posMatch[2]);
    const w = Number(sizeMatch[1]);
    const h = Number(sizeMatch[2]);
    return { left: x, top: y, right: x + w, bottom: y + h, width: w, height: h };
  }
  return null;
}

async function openAppsInLayout(assignment, layout) {
  const screenBounds = await getUsableScreenBounds();
  const cells = calculateCellBounds(layout, screenBounds);

  const appsToOpen = assignment.filter(Boolean);
  await Promise.all(appsToOpen.map((app) => execFileAsync("open", ["-a", app])));
  await sleep(APP_LAUNCH_DELAY_MS);

  const [rows, cols] = layout.split("x").map(Number);

  // 单行布局（1x2 / 1x3）：每个窗口独占整屏高度，直接逐格摆放。
  if (rows < 2) {
    for (let i = 0; i < assignment.length; i++) {
      const app = assignment[i];
      if (!app || !cells[i]) continue;
      await positionAppWindow(app, cells[i]);
      await sleep(APP_POSITION_DELAY_MS);
    }
    return;
  }

  // 双行布局（2x2 / 2x3）：两趟摆放，用一条【全局分界线】保证整排对齐。
  // 若某个下排 app 有最小高度（缩不到半屏），单列自适应会让各列分界高低不一、上排参差。
  // 因此：第一趟先把所有下排窗口锚底摆一遍，探测出「最高的下排窗口」把分界顶到多高；
  // 取所有列中最靠上的那条作为全局分界，第二趟再统一按它摆放上下两排 ——
  // 上排全部等高对齐、下排全部等高对齐，代价只是整体分界不在正中（被最高的下排 app 决定）。
  // cells 为行优先：上排 index = col，下排 index = cols + col。
  const usableTop = screenBounds.top;
  const usableBottom = screenBounds.bottom;

  // 第一趟：探测下排各窗口锚底后的实际顶边，取最高者为全局分界
  let boundary = cells[0].bottom; // 默认等分（上排格子底边）
  for (let col = 0; col < cols; col++) {
    const botApp = assignment[cols + col];
    const botCell = cells[cols + col];
    if (!botApp || !botCell) continue;
    const actual = await positionAppWindow(botApp, botCell, { anchorBottom: true });
    await sleep(APP_POSITION_DELAY_MS);
    if (actual && Number.isFinite(actual.top)) {
      boundary = Math.min(boundary, actual.top);
    }
  }
  // 安全下限：避免上排被压成过小/负高度
  boundary = Math.max(boundary, usableTop + 100);

  // 第二趟：用同一条 boundary 统一摆放，保证上下两排各自对齐
  for (let col = 0; col < cols; col++) {
    const topApp = assignment[col];
    const botApp = assignment[cols + col];
    const topCell = cells[col];
    const botCell = cells[cols + col];

    if (botApp && botCell) {
      // 下排：占据 [boundary, 可用区底]，各列同高
      await positionAppWindow(botApp, { ...botCell, top: boundary, bottom: usableBottom }, { anchorBottom: true });
      await sleep(APP_POSITION_DELAY_MS);
    }

    if (topApp && topCell) {
      // 上排：占据 [可用区顶, boundary]，各列同高
      await positionAppWindow(topApp, { ...topCell, top: usableTop, bottom: boundary });
      await sleep(APP_POSITION_DELAY_MS);
    }
  }
}

async function handleAppLayoutFlow() {
  const appWorkspaces = await readAppWorkspaces();
  const NEW_LAYOUT = "__new__";

  if (appWorkspaces.length > 0) {
    const { selection } = await inquirer.prompt([
      {
        type: "list",
        name: "selection",
        message: "选择 App 预设或新建布局",
        choices: [
          ...appWorkspaces.map((ws) => ({
            name: `${ws.name}  ${ws.apps.filter(Boolean).length} 个应用  [${LAYOUT_LABELS[ws.layout]}]`,
            value: ws.name,
            description: ws.apps.filter(Boolean).join(", ")
          })),
          { name: "── 新建布局 ──", value: NEW_LAYOUT }
        ],
        loop: false
      }
    ]);

    if (selection !== NEW_LAYOUT) {
      const workspace = appWorkspaces.find((ws) => ws.name === selection);
      await openAppsInLayout(workspace.apps, workspace.layout);
      process.stdout.write(`已打开预设：${workspace.name}\n`);
      return;
    }
  }

  process.stdout.write("正在扫描已安装应用...\n");
  const apps = await scanInstalledApps();

  if (apps.length === 0) {
    process.stdout.write("未找到已安装应用。\n");
    return;
  }

  const { selectedApps } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selectedApps",
      message: "选择要打开的应用（2~6 个）",
      choices: apps.map((app) => ({ name: app, value: app })),
      pageSize: 20,
      loop: false,
      validate(value) {
        if (value.length < 2) return "至少选择 2 个应用";
        if (value.length > 6) return "最多选择 6 个应用";
        return true;
      }
    }
  ]);

  const layout = await promptLayoutSelection(selectedApps.length);
  const assignment = await promptAppAssignment(selectedApps, layout);

  const { nextAction } = await inquirer.prompt([
    {
      type: "list",
      name: "nextAction",
      message: "接下来要怎么处理这组应用？",
      choices: [
        { name: "直接打开", value: "openDirectly" },
        { name: "保存为预设后打开", value: "saveAndOpen" }
      ]
    }
  ]);

  if (nextAction === "saveAndOpen") {
    const workspaceName = await promptAppWorkspaceName("请输入 App 预设名称");
    await saveAppWorkspace(workspaceName, assignment, layout);
    process.stdout.write(`已保存 App 预设：${workspaceName}\n`);
  }

  await openAppsInLayout(assignment, layout);
  process.stdout.write(`已打开 ${assignment.filter(Boolean).length} 个应用。\n`);
}

async function handleManageAppWorkspacesFlow() {
  const workspaces = await readAppWorkspaces();

  if (workspaces.length === 0) {
    process.stdout.write("当前没有任何 App 预设可管理。\n");
    return;
  }

  const { manageAction } = await inquirer.prompt([
    {
      type: "list",
      name: "manageAction",
      message: "请选择预设管理操作",
      choices: [
        { name: "查看预设", value: "view" },
        { name: "重命名预设", value: "rename" },
        { name: "删除预设", value: "delete" }
      ]
    }
  ]);

  const { workspaceName } = await inquirer.prompt([
    {
      type: "list",
      name: "workspaceName",
      message: "请选择 App 预设",
      choices: workspaces.map((ws) => ({
        name: `${ws.name}  ${ws.apps.length} 个应用  [${LAYOUT_LABELS[ws.layout]}]`,
        value: ws.name,
        description: ws.apps.join(", ")
      })),
      loop: false
    }
  ]);

  const selectedWorkspace = workspaces.find((ws) => ws.name === workspaceName);

  if (manageAction === "view") {
    const cellLabels = CELL_POSITION_LABELS[selectedWorkspace.layout] ?? [];
    process.stdout.write(`App 预设：${selectedWorkspace.name}  [${LAYOUT_LABELS[selectedWorkspace.layout]}]\n`);
    process.stdout.write(`${renderLayoutDiagram(selectedWorkspace.layout)}\n\n`);
    selectedWorkspace.apps.forEach((app, index) => {
      const label = cellLabels[index] ? `（${cellLabels[index]}）` : "";
      process.stdout.write(`  区域 ${index + 1}${label}  ${app || "（空）"}\n`);
    });
    return;
  }

  if (manageAction === "rename") {
    const nextName = await promptAppWorkspaceName("请输入新的预设名称", selectedWorkspace.name);
    const nextWorkspaces = workspaces.map((ws) =>
      ws.name !== selectedWorkspace.name
        ? ws
        : { ...ws, name: nextName, updatedAt: new Date().toISOString() }
    );
    await writeAppWorkspaces(nextWorkspaces);
    process.stdout.write(`已将 App 预设重命名为：${nextName}\n`);
    return;
  }

  const { isConfirmed } = await inquirer.prompt([
    {
      type: "confirm",
      name: "isConfirmed",
      message: `确定删除 App 预设 ${selectedWorkspace.name} 吗？`,
      default: false
    }
  ]);

  if (!isConfirmed) {
    process.stdout.write("已取消删除。\n");
    return;
  }

  await writeAppWorkspaces(workspaces.filter((ws) => ws.name !== workspaceName));
  process.stdout.write(`已删除 App 预设：${workspaceName}\n`);
}

// ─── 配置与初始化 ────────────────────────────────────────────────────────────

function getCommandBinary(command) {
  const [binary = ""] = command.trim().split(/\s+/);
  return binary;
}

async function initializeConfig() {
  process.stdout.write("首次使用 kickstart，先完成一次初始化。\n");

  const { launchPreset } = await inquirer.prompt([
    {
      type: "list",
      name: "launchPreset",
      message: "请选择启动后要执行的命令",
      choices: [
        {
          name: "opencode .",
          value: "opencode ."
        },
        {
          name: "claude",
          value: "claude"
        },
        {
          name: "codex",
          value: "codex"
        },
        {
          name: "npm run dev",
          value: "npm run dev"
        },
        {
          name: "npm run start",
          value: "npm run start"
        },
        {
          name: "自定义输入",
          value: "custom"
        }
      ]
    }
  ]);

  const { maxResults } = await inquirer.prompt([
    {
      type: "list",
      name: "maxResults",
      message: "请选择最近仓库展示数量",
      choices: MAX_RESULT_OPTIONS.map((value) => ({
        name: `${value}`,
        value
      })),
      default: 10
    }
  ]);

  let launchCommand = launchPreset;

  if (launchPreset === "custom") {
    const customAnswer = await inquirer.prompt([
      {
        type: "input",
        name: "launchCommand",
        message: "请输入项目启动命令",
        validate(value) {
          return value.trim() ? true : "命令不能为空";
        }
      }
    ]);

    launchCommand = customAnswer.launchCommand.trim();
  }

  const config = { launchCommand, maxResults };
  await writeConfig(config);
  process.stdout.write(
    `初始化完成，当前启动命令为：${launchCommand}，最近仓库数量为：${maxResults}\n`
  );

  return config;
}

async function resetConfig() {
  await fs.rm(CONFIG_FILE, { force: true });
  await fs.rm(LAST_SELECTION_FILE, { force: true });
  process.stdout.write("已清空 kickstart 配置与上次选择记录。\n");
}

async function writeLastSelection(selectedRepos) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(
    LAST_SELECTION_FILE,
    JSON.stringify({ selectedRepos }, null, 2),
    "utf8"
  );
}

async function collectGitRepos(rootDir) {
  const repos = [];

  async function walk(currentDir) {
    let entries;

    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    const isGitRepo = entries.some((entry) => entry.name === ".git");
    if (isGitRepo) {
      repos.push(currentDir);
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }

      if (entry.name.startsWith(".") && entry.name !== ".config") {
        continue;
      }

      await walk(path.join(currentDir, entry.name));
    }
  }

  await walk(rootDir);
  return repos;
}

async function getRepoUpdatedAt(repoPath) {
  const gitPath = path.join(repoPath, ".git");
  const candidates = [
    repoPath,
    gitPath,
    path.join(gitPath, "index"),
    path.join(gitPath, "HEAD")
  ];

  const mtimes = [];

  for (const candidate of candidates) {
    try {
      const stats = await fs.stat(candidate);
      mtimes.push(stats.mtimeMs);
    } catch {
      continue;
    }
  }

  return Math.max(...mtimes, 0);
}

function formatUpdatedAt(updatedAt) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(updatedAt);
}

function shellQuote(value) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function appleScriptQuote(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildSessionCommands(prefix, count, repoPaths, launchCommand) {
  const lines = [];

  for (let index = 1; index < count; index += 1) {
    const previousSession = `${prefix}Session${index}`;
    const nextSession = `${prefix}Session${index + 1}`;

    lines.push(`tell ${previousSession}`);
    lines.push(`set ${nextSession} to split vertically with default profile`);
    lines.push("end tell");
    lines.push(`delay ${PANE_READY_DELAY}`);
  }

  for (let index = 0; index < count; index += 1) {
    const sessionName = `${prefix}Session${index + 1}`;
    const command = appleScriptQuote(`cd ${shellQuote(repoPaths[index])} && ${launchCommand}`);

    lines.push(`tell ${sessionName}`);
    lines.push(`write text "${command}"`);
    lines.push("end tell");
    lines.push(`delay ${COMMAND_READY_DELAY}`);
  }

  return lines;
}

function buildCommandWriteLines(sessionNames, repoPaths, launchCommand) {
  return repoPaths.flatMap((repoPath, index) => {
    const command = appleScriptQuote(`cd ${shellQuote(repoPath)} && ${launchCommand}`);

    return [
      `tell ${sessionNames[index]}`,
      `write text "${command}"`,
      "end tell",
      `delay ${COMMAND_READY_DELAY}`
    ];
  });
}

async function openProjectsInIterm(repoPaths, launchCommand) {
  if (repoPaths.length === 2) {
    const scriptLines = [
      'tell application "iTerm"',
      "activate",
      "set newWindow to create window with default profile",
      "tell newWindow to set zoomed to true",
      `delay ${WINDOW_READY_DELAY}`,
      "set leftSession to current session of newWindow",
      "tell leftSession",
      "set rightSession to split vertically with default profile",
      "end tell",
      `delay ${PANE_READY_DELAY}`,
      ...buildCommandWriteLines(["leftSession", "rightSession"], repoPaths, launchCommand),
      "end tell"
    ];

    await execFileAsync("osascript", ["-e", scriptLines.join("\n")]);
    return;
  }

  if (repoPaths.length === 3) {
    const scriptLines = [
      'tell application "iTerm"',
      "activate",
      "set newWindow to create window with default profile",
      "tell newWindow to set zoomed to true",
      `delay ${WINDOW_READY_DELAY}`,
      "set topLeftSession to current session of newWindow",
      "tell topLeftSession",
      "set topRightSession to split vertically with default profile",
      "end tell",
      `delay ${PANE_READY_DELAY}`,
      "tell topLeftSession",
      "set bottomLeftSession to split horizontally with default profile",
      "end tell",
      `delay ${PANE_READY_DELAY}`,
      "tell topRightSession",
      "set bottomRightSession to split horizontally with default profile",
      "end tell",
      `delay ${PANE_READY_DELAY}`,
      ...buildCommandWriteLines(
        ["topLeftSession", "topRightSession", "bottomLeftSession"],
        repoPaths,
        launchCommand
      ),
      "end tell"
    ];

    await execFileAsync("osascript", ["-e", scriptLines.join("\n")]);
    return;
  }

  const topRowCount = Math.ceil(repoPaths.length / 2);
  const bottomRowCount = repoPaths.length - topRowCount;
  const topRowRepos = repoPaths.slice(0, topRowCount);
  const bottomRowRepos = repoPaths.slice(topRowCount);
  const scriptLines = [
    'tell application "iTerm"',
    "activate",
    "set newWindow to create window with default profile",
    "tell newWindow to set zoomed to true",
    `delay ${WINDOW_READY_DELAY}`,
    "set topSession1 to current session of newWindow"
  ];

  if (bottomRowCount > 0) {
    scriptLines.push("tell topSession1");
    scriptLines.push("set bottomSession1 to split horizontally with default profile");
    scriptLines.push("end tell");
    scriptLines.push(`delay ${PANE_READY_DELAY}`);
  }

  scriptLines.push(...buildSessionCommands("top", topRowCount, topRowRepos, launchCommand));

  if (bottomRowCount > 0) {
    scriptLines.push(...buildSessionCommands("bottom", bottomRowCount, bottomRowRepos, launchCommand));
  }

  scriptLines.push("end tell");

  const script = scriptLines.join("\n");

  await execFileAsync("osascript", ["-e", script]);
}

const STARTUP_QUOTES = [
  "先完成，再完美。",
  "代码是写给人看的，顺便让机器执行。",
  "简单是复杂的终极形式。",
  "不要过早优化。",
  "调试代码比写代码难一倍，所以写代码时越聪明，调试时就越难。",
  "好的代码是最好的文档。",
  "重构不是重写，是尊重。",
  "命名是编程中最难的事之一。",
  "最好的性能优化是删代码。",
  "每行注释都是一次对未来自己的道歉。",
  "写代码时想着接手的人是个暴力狂。",
  "复杂是敌人，简单是朋友。",
  "把大问题拆成小问题，再把小问题解决掉。",
  "没有银弹。",
  "可运行的代码胜过完美的计划。",
  "学会说「我不知道」是工程师的成熟。",
  "测试不是为了证明没有 bug，而是为了找到 bug。",
  "技术债是借来的时间。",
  "架构是为了让变化更容易发生。",
  "少即是多。",
  "下班前一分钟不要改生产环境。",
  "计算机科学中只有两个难题：缓存失效和命名。",
  "先让它工作，再让它正确，最后让它快。",
  "你无法控制你不能度量的东西。",
  "代码审查不是找茬，是传递知识。",
  "好的接口易于正确使用，难以错误使用。",
  "失败不可避免，关键是如何快速恢复。",
  "先写测试，是对需求的最好理解。",
  "软件设计不是关于代码，而是关于权衡。",
  "可观测性不是锦上添花，是工程的基础。",
];

function showStartupEgg() {
  const quote = STARTUP_QUOTES[Math.floor(Math.random() * STARTUP_QUOTES.length)];
  const day = new Date().getDay();
  const daysToWeekend = day === 0 || day === 6 ? 0 : 6 - day;
  const weekendMsg =
    daysToWeekend === 0
      ? "今天周末，好好休息 🎉"
      : `距离周末还有 ${daysToWeekend} 天，加油！`;
  process.stdout.write(`[90m─────────────────────────────────[0m\n`);
  process.stdout.write(`  [33m💡 ${quote}[0m\n`);
  process.stdout.write(`  [36m📅 ${weekendMsg}[0m\n`);
  process.stdout.write(`[90m─────────────────────────────────[0m\n\n`);
}

async function ensureEnvironment(config) {
  if (process.platform !== "darwin") {
    throw new Error("kickstart 目前只支持 macOS。");
  }

  const binary = getCommandBinary(config.launchCommand);
  if (!binary) {
    throw new Error("启动命令无效，请重新初始化。");
  }

  try {
    await execFileAsync("zsh", ["-lic", `command -v ${shellQuote(binary)} >/dev/null 2>&1`]);
  } catch {
    throw new Error(`未检测到 ${binary}，请先确保它可在终端中执行。`);
  }
}

async function promptStartupMode() {
  const { startupMode } = await inquirer.prompt([
    {
      type: "list",
      name: "startupMode",
      message: "请选择进入方式",
      choices: [
        {
          name: "App 网格布局",
          value: "appLayout"
        },
        {
          name: "最近项目",
          value: "recentProjects"
        },
        {
          name: "工作区预设",
          value: "workspacePresets"
        },
        {
          name: "管理预设",
          value: "manageWorkspaces"
        }
      ]
    }
  ]);

  return startupMode;
}

async function main() {
  const commandArg = process.argv[2];
  const commandVal = process.argv[3];
  const isResetRequested = commandArg === "reset";

  if (commandArg === "--workspace-index") {
    const idx = parseInt(commandVal, 10);
    const workspaces = await readWorkspaces();
    if (isNaN(idx) || idx < 0 || idx >= workspaces.length) {
      throw new Error(`无效的工作区索引：${commandVal}`);
    }
    const config = await readConfig();
    if (!config) throw new Error("kickstart 未初始化，请先运行 kickstart。");
    await ensureEnvironment(config);
    const ws = workspaces[idx];
    const { validRepoPaths, invalidRepoPaths } = await getExistingRepoPaths(ws.repoPaths);
    if (invalidRepoPaths.length > 0) {
      process.stdout.write(`已跳过 ${invalidRepoPaths.length} 个失效路径。\n`);
    }
    if (validRepoPaths.length === 0) {
      throw new Error(`预设 "${ws.name}" 没有可用的项目路径。`);
    }
    await openSelectedProjects(validRepoPaths, config.launchCommand);
    return;
  }

  if (commandArg === "--app-preset-index") {
    const idx = parseInt(commandVal, 10);
    const appWorkspaces = await readAppWorkspaces();
    if (isNaN(idx) || idx < 0 || idx >= appWorkspaces.length) {
      throw new Error(`无效的 App 预设索引：${commandVal}`);
    }
    const ws = appWorkspaces[idx];
    await openAppsInLayout(ws.apps, ws.layout);
    process.stdout.write(`已打开预设：${ws.name}\n`);
    return;
  }

  if (commandArg && !isResetRequested) {
    throw new Error("仅支持默认启动或 `kickstart reset`。");
  }

  if (isResetRequested) {
    await resetConfig();
    return;
  }

  let config = await readConfig();
  const isInitialized = Boolean(config);

  if (!isInitialized) {
    config = await initializeConfig();
  }

  showStartupEgg();
  const startupMode = await promptStartupMode();

  if (startupMode === "appLayout") {
    await handleAppLayoutFlow();
    return;
  }

  if (startupMode === "manageWorkspaces") {
    await handleManageWorkspacesFlow();
    return;
  }

  await ensureEnvironment(config);

  if (startupMode === "recentProjects") {
    await handleRecentProjectsFlow(config);
    return;
  }

  if (startupMode === "workspacePresets") {
    await handleWorkspacePresetsFlow(config);
    return;
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
