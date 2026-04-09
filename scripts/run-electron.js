const { spawn } = require("node:child_process");

const electronBinary = require("electron");
const args = process.argv.slice(2);

if (process.platform === "linux") {
  args.unshift("--disable-setuid-sandbox");
  args.unshift("--no-sandbox");
}

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronBinary, args, {
  stdio: "inherit",
  windowsHide: false,
  env
});

child.on("close", (code, signal) => {
  if (code === null) {
    console.error(`${electronBinary} exited with signal ${signal}`);
    process.exit(1);
  }

  process.exit(code);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (!child.killed) {
      child.kill(signal);
    }
  });
}
