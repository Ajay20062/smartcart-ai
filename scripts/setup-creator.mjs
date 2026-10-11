#!/usr/bin/env node
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { resolve } from "node:path";

function readEnvValue(content, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(new RegExp(`^${escapedKey}=(.*)$`, "m"));
  return match?.[1]?.replace(/^["']|["']$/g, "") ?? "";
}

function setEnvValue(content, key, value) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${escapedKey}=.*$`, "m");

  return pattern.test(content)
    ? content.replace(pattern, line)
    : `${content.trimEnd()}${content.trim() ? "\n" : ""}${line}\n`;
}

function readHiddenPassword() {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    return Promise.reject(
      new Error("Run this command in an interactive terminal."),
    );
  }

  return new Promise((resolvePassword, rejectPassword) => {
    let password = "";
    stdout.write("Creator password (input hidden): ");
    stdin.setEncoding("utf8");
    stdin.setRawMode(true);
    stdin.resume();

    const finish = (error) => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
      if (error) rejectPassword(error);
      else resolvePassword(password);
    };

    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === "\u0003") {
          finish(new Error("Setup cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u007f" || character === "\b") {
          password = Array.from(password).slice(0, -1).join("");
        } else if (character >= " " && character !== "\u007f") {
          password += character;
        }
      }
    };

    stdin.on("data", onData);
  });
}

const envPath = resolve(process.cwd(), ".env.local");
let envContent = "";

try {
  envContent = await readFile(envPath, "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const defaultEmail =
  readEnvValue(envContent, "CREATOR_LOGIN_EMAIL") ||
  readEnvValue(envContent, "CREATOR_EMAIL") ||
  "creator@example.com";
const terminal = createInterface({ input: stdin, output: stdout });

try {
  const answer = await terminal.question(
    `Creator login email [${defaultEmail}]: `,
  );
  terminal.close();
  const email = (answer.trim() || defaultEmail).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error("Enter a valid email address.");
  }

  const password = await readHiddenPassword();
  if (Array.from(password).length < 12 || Array.from(password).length > 256) {
    throw new Error("Use a password between 12 and 256 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const sessionSecret = randomBytes(32).toString("base64url");

  envContent = setEnvValue(envContent, "CREATOR_LOGIN_EMAIL", email);
  envContent = setEnvValue(
    envContent,
    "CREATOR_PASSWORD_HASH",
    passwordHash.replaceAll("$", "\\$"),
  );
  envContent = setEnvValue(envContent, "SESSION_SECRET", sessionSecret);
  await writeFile(envPath, envContent, { mode: 0o600 });
  console.log("Creator login configured in the Git-ignored .env.local file.");
} finally {
  terminal.close();
}
