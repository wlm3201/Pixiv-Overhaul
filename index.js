let fs = require("fs");
let path = require("path");
nw.Window.open(
  "index.html",
  {
    id: "pixiv",
    width: 1920,
    height: 1080,
    title: "Pixiv",
    icon: "favicon.ico",
  },
  win => {
    win.showDevTools();
    fs.watch(process.cwd(), { recursive: true }, (eventType, filename) => {
      if (filename === "index.html" || filename === "script.js") win.reload();
      if (filename === "style.css")
        win.window.document.querySelector('link[rel="stylesheet"]').href =
          "style.css";
    });
  }
);
