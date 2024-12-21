function addStyle(cssText) {
  let link = document.createElement("link");
  link.href = URL.createObjectURL(new Blob([cssText], { type: "text/css" }));
  link.rel = "stylesheet";
  document.head.appendChild(link);
}
function addScript(scriptText) {
  let script = document.createElement("script");
  script.src = URL.createObjectURL(
    new Blob([scriptText], { type: "text/javascript" })
  );
  document.body.appendChild(script);
}

if (location.pathname !== "/wtf/") {
  window.addEventListener("load", () => {
    let ctn =
      document.querySelector(
        "#root > div.charcoal-token > div > div:nth-child(3) > div:nth-child(1) > div:nth-child(1) > div > div"
      ) ||
      document.querySelector(
        "#__next > div > div:nth-child(2) > div > div > div:nth-child(1) > div > div.box-border"
      ) ||
      document.querySelector(
        "#js-mount-point-header > div > div > div > div:nth-child(1) > div:nth-child(2) > div:nth-child(1)"
      );
    let btn = document.createElement("button");
    btn.innerText = "瀑布流";
    btn.className = "pblbtn";
    addStyle(`.pblbtn {
  color-scheme: dark;
  height: 40px;
  width: 80px;
  border-radius: 20px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  background: rgb(58, 58, 58);
  margin-left: 20px;
  color: #d6d6d6;
  align-self: center;
  z-index: 1;
  &:hover {
    background: rgb(82, 82, 82);
  }
}`);
    btn.onclick = () => (location.href = "https://www.pixiv.net/wtf/");
    ctn.append(btn);
  });
} else {
  window.stop();
  let htmlText = GM_getResourceText("html");
  let scriptText = GM_getResourceText("script");
  let cssText = GM_getResourceText("css");
  document.documentElement.innerHTML = htmlText;
  addStyle(cssText);
  addScript(scriptText);
}
