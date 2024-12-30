let path = require("path");
let fs = require("fs");

let css = fs.readFileSync(path.join(__dirname, "style.css"), "utf8");
let html = fs
  .readFileSync(path.join(__dirname, "index.html"), "utf8")
  .replace(`<link rel="stylesheet" href="style.css" />`, "")
  .replace(`<script src="script.js"></script>`, "")
  .replace(/<script src="sid.js">.*?<\/script>/s, "");
let script = fs
  .readFileSync(path.join(__dirname, "script.js"), "utf8")
  .replaceAll("\\", "\\\\")
  .replaceAll("`", "\\`")
  .replaceAll("$", "\\$");
let gmjs = fs
  .readFileSync(path.join(__dirname, "gm.js"), "utf8")
  .replaceAll(/\/\/ @(resource|grant|require).*\r\n/g, "")
  .replace(" dev", "");
let mainjs = fs
  .readFileSync(path.join(__dirname, "main.js"), "utf8")
  .replace('GM_getResourceText("html")', `\`${html}\``)
  .replace('GM_getResourceText("css")', `\`${css}\``)
  .replace('GM_getResourceText("script")', `\`${script}\``);
fs.writeFileSync(path.join(__dirname, "pixiv.user.js"), gmjs + mainjs);
