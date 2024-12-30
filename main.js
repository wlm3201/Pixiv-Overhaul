"use strict";
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

if (!location.pathname.includes("/wtf")) {
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
      ) ||
      document.querySelector(".htd__logo-copy-container");
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
    btn.onclick = () => {
      let path = location.pathname;
      let id, uid;
      let wtf = "https://www.pixiv.net/wtf/";
      if (path.match("discovery/users")) location.href = wtf + "/?#users";
      else if (path.match("discovery")) location.href = wtf + "/?#discovery";
      else if (path.match("bookmark_new_illust.php"))
        location.href = wtf + "/#latest";
      else if (path.match("ranking.php")) location.href = wtf + "/#ranking";
      else if (path.match(/tags\/(.*)/)) location.href = wtf + "/#search";
      else if ((id = path.match(/artworks\/(\d+)/)?.[1]))
        location.href = wtf + `/?illust=${id}`;
      else if ((uid = path.match(/users\/(\d+)\/bookmarks\/artworks/)?.[1]))
        location.href = wtf + `/?bookmarked=${uid}`;
      else if ((uid = path.match(/users\/(\d+)\/following/)?.[1]))
        location.href = wtf + `/?followed=${uid}`;
      else if ((uid = path.match(/users\/(\d+)/)?.[1]))
        location.href = wtf + `/?user=${uid}`;
      else if (location.host.includes("pixivision"))
        location.href = "https://www.pixivision.net/zh/wtf#vision";
      else location.href = wtf + "/?#discovery";
    };
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
