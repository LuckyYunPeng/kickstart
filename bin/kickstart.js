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
const WINDOW_READY_DELAY = 0.4;
const PANE_READY_DELAY = 0.25;
const COMMAND_READY_DELAY = 0.15;
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
          name: "opencode",
          value: "opencode ."
        },
        {
          name: "claude",
          value: "claude"
        },
        {
          name: "custom",
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

async function ensureEnvironment(config) {
  if (process.platform !== "darwin") {
    throw new Error("kickstart 目前只支持 macOS。");
  }

  const isWhichAvailable = await pathExists("/usr/bin/which");
  if (!isWhichAvailable) {
    throw new Error("系统缺少 which 命令，无法检查启动命令。");
  }

  const binary = getCommandBinary(config.launchCommand);
  if (!binary) {
    throw new Error("启动命令无效，请重新初始化。");
  }

  try {
    await execFileAsync("which", [binary]);
  } catch {
    throw new Error(`未检测到 ${binary}，请先确保它已加入 PATH。`);
  }
}

async function main() {
  const commandArg = process.argv[2];
  const isResetRequested = commandArg === "reset";

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

  await ensureEnvironment(config);

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

  const lastSelection = new Set(await readLastSelection());

  const { selectedRepos } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selectedRepos",
      message: "选择要打开的项目",
      choices: recentRepos.map((repo) => ({
        name: `${path.basename(repo.repoPath)}  ${formatUpdatedAt(repo.updatedAt)}`,
        value: repo.repoPath,
        checked: lastSelection.has(repo.repoPath)
      })),
      pageSize: config.maxResults,
      loop: false,
      validate(value) {
        return value.length > 0 ? true : "至少选择一个项目";
      }
    }
  ]);

  await writeLastSelection(selectedRepos);

  await openProjectsInIterm(selectedRepos, config.launchCommand);

  process.stdout.write(`已打开 ${selectedRepos.length} 个项目。\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
