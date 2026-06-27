const { spawn } = require("child_process");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const serverEntry = path.join(projectRoot, "backend", "server.js");
const mode = process.argv[2] === "--dev" ? "dev" : "start";
const isWindows = process.platform === "win32";

const command = mode === "dev"
  ? (isWindows ? "nodemon.cmd" : "nodemon")
  : process.execPath;

const args = mode === "dev"
  ? [serverEntry]
  : [serverEntry];

const child = spawn(command, args, {
  cwd: projectRoot,
  stdio: "inherit",
  shell: false,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});

child.on("error", (error) => {
  console.error("Failed to start server runner:", error.message);
  process.exit(1);
});
