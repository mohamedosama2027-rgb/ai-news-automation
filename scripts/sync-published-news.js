const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const publishedFile = "data/published-news.json";
const maxPushAttempts = 5;

function git(args, options = {}) {
    return execFileSync("git", args, {
        encoding: options.encoding || "utf8",
        stdio: options.stdio || ["ignore", "pipe", "pipe"],
        env: options.env || process.env
    });
}

function canonicalLink(value) {
    if (!value) return "";
    try {
        const url = new URL(value);
        url.hash = "";
        for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"]) {
            url.searchParams.delete(key);
        }
        return url.toString().replace(/\/$/, "");
    } catch (_) {
        return value.trim();
    }
}

function mergeRecord(previous, incoming) {
    const merged = { ...previous };
    for (const [key, value] of Object.entries(incoming)) {
        if (value === null || value === undefined || value === "") continue;
        if (Array.isArray(value) && value.length === 0) continue;
        merged[key] = value;
    }

    const previousPerformanceTime = Date.parse(previous.performanceCheckedAt || "") || 0;
    const incomingPerformanceTime = Date.parse(incoming.performanceCheckedAt || "") || 0;
    if (previousPerformanceTime > incomingPerformanceTime) {
        merged.performance = previous.performance;
        merged.performanceCheckedAt = previous.performanceCheckedAt;
    }
    return merged;
}

function mergeRecords(first, second) {
    if (!Array.isArray(first) || !Array.isArray(second)) {
        throw new Error("Published history files must both contain JSON arrays.");
    }

    const records = [];
    const indexByKey = new Map();
    for (const record of [...first, ...second]) {
        const keys = [
            record.facebookPostId ? `post:${record.facebookPostId}` : "",
            record.link ? `link:${canonicalLink(record.link)}` : ""
        ].filter(Boolean);
        const existingIndex = keys.map(key => indexByKey.get(key)).find(index => index !== undefined);

        if (existingIndex === undefined) {
            records.push(record);
            for (const key of keys) indexByKey.set(key, records.length - 1);
            continue;
        }

        records[existingIndex] = mergeRecord(records[existingIndex], record);
        for (const key of keys) indexByKey.set(key, existingIndex);
    }
    return records;
}

function resolvePublishedHistoryConflict() {
    const unresolved = git(["diff", "--name-only", "--diff-filter=U"])
        .trim()
        .split(/\r?\n/)
        .filter(Boolean);
    if (unresolved.length !== 1 || unresolved[0] !== publishedFile) return false;

    const upstream = JSON.parse(git(["show", `:2:${publishedFile}`]));
    const publishingRun = JSON.parse(git(["show", `:3:${publishedFile}`]));
    const merged = mergeRecords(upstream, publishingRun);
    fs.writeFileSync(publishedFile, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
    git(["add", "--", publishedFile]);
    git(["-c", "core.editor=true", "rebase", "--continue"], {
        env: { ...process.env, GIT_EDITOR: "true" },
        stdio: "inherit"
    });
    console.log(`Merged concurrent published history; ${merged.length} unique record(s).`);
    return true;
}

function main() {
    const absoluteFile = path.resolve(publishedFile);
    if (!fs.existsSync(absoluteFile)) {
        console.log(`${publishedFile} does not exist; nothing to sync.`);
        return;
    }

    git(["add", "-f", "--", publishedFile]);
    let hasStagedChanges = true;
    try {
        git(["diff", "--cached", "--quiet"], { stdio: "ignore" });
        hasStagedChanges = false;
    } catch (error) {
        if (error.status !== 1) throw error;
    }
    if (!hasStagedChanges) {
        console.log("No changes to published history.");
        return;
    }

    git(["commit", "-m", "Update published news"], { stdio: "inherit" });

    for (let attempt = 1; attempt <= maxPushAttempts; attempt++) {
        git(["fetch", "origin"], { stdio: "inherit" });

        try {
            git(["rebase", "origin/main"], { stdio: "inherit" });
        } catch (error) {
            try {
                if (!resolvePublishedHistoryConflict()) throw error;
            } catch (resolutionError) {
                try { git(["rebase", "--abort"], { stdio: "inherit" }); } catch (_) {}
                throw resolutionError;
            }
        }

        try {
            git(["push", "origin", "HEAD:main"], { stdio: "inherit" });
            console.log("Published history synced to origin/main.");
            return;
        } catch (error) {
            if (attempt === maxPushAttempts) throw error;
            console.warn(`Push raced with another update; retrying (${attempt}/${maxPushAttempts - 1}).`);
        }
    }
}

if (require.main === module) {
    try {
        main();
    } catch (error) {
        console.error(error.stderr?.toString() || error.message);
        process.exitCode = 1;
    }
}

module.exports = { mergeRecords };
