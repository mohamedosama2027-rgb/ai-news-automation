const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const roots = ["index.js", "src", "tests", "scripts"];
const files = [];

for (const root of roots) {
    const fullPath = path.join(__dirname, "..", root);

    if (fs.statSync(fullPath).isFile()) {
        files.push(fullPath);
        continue;
    }

    for (const entry of fs.readdirSync(fullPath)) {
        if (entry.endsWith(".js")) {
            files.push(path.join(fullPath, entry));
        }
    }
}

for (const file of files) {
    const result = spawnSync(process.execPath, ["--check", file], {
        stdio: "inherit"
    });

    if (result.status !== 0) {
        process.exit(result.status || 1);
    }
}

console.log(`Syntax check passed for ${files.length} JavaScript files.`);