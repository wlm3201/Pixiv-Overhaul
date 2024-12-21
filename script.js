"use strict";
//#region
let nel = document.createElement;
nel = nel.bind(document);
nel = (tag, text) => {
  let el = document.createElement(tag);
  if (text) el.textContent = text;
  return el;
};
let $ = document.querySelector;
$ = $.bind(document);
let $$ = document.querySelectorAll;
$$ = $$.bind(document);
function $x(xpath, el = document) {
  let result = document.evaluate(
    xpath,
    el,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  );
  return Array(result.snapshotLength)
    .fill()
    .map((_, i) => result.snapshotItem(i));
}
let sleep = ms => new Promise(r => setTimeout(r, ms));
let del = document.documentElement;
let log = console.log;
let range = (s, e) =>
  Array(e - s + 1)
    .fill()
    .map((_, i) => s + i);
function debounce(func, ms = 1000) {
  let timeout;
  return function () {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, arguments), ms);
  };
}
HTMLElement.prototype.$ = function () {
  return $.apply(this, arguments);
};
HTMLElement.prototype.$$ = function () {
  return $$.apply(this, arguments);
};
HTMLElement.prototype.$x = function (xpath) {
  return $x(xpath, this);
};
HTMLElement.prototype.hide = function () {
  this.classList.add("hide");
};
HTMLElement.prototype.show = function () {
  this.classList.remove("hide");
};
HTMLElement.prototype.toggle = function () {
  this.classList.toggle("hide");
};
HTMLElement.prototype.hided = function () {
  return this.matches(".hide");
};
Array.prototype.remove = function (el) {
  let index = this.indexOf(el);
  if (index > -1) this.splice(index, 1);
};
Array.prototype.add = function (el) {
  this.remove(el);
  this.push(el);
};
class IDB {
  db;
  constructor(name = "Default") {
    this.initing = this.init(name);
  }
  init(name) {
    if (this.initing) return this.initing;
    return new Promise((res, rej) => {
      let r = indexedDB.open(name, 1);
      r.onsuccess = e => {
        this.db = e.target.result;
        if (this.db.objectStoreNames.contains("k_v")) res(this);
      };
      r.onupgradeneeded = e => {
        this.db = e.target.result;
        this.db.createObjectStore("k_v", { keyPath: "k" });
        res(this);
      };
      r.onerror = e => rej(e);
      r.onblocked = e => rej(e);
    });
  }
  exec(f, o) {
    return new Promise((res, rej) => {
      let t = this.db.transaction(["k_v"], "readwrite");
      let s = t.objectStore("k_v");
      let r = s[f](o);
      r.onsuccess = e => res(e.target.result?.v || e.target.result);
      r.onerror = e => rej(e.target.error);
    });
  }
  get(k) {
    return this.exec("get", k);
  }
  put(k, v) {
    return this.exec("put", { k, v, t: Date.now() });
  }
  delete(k) {
    return this.exec("delete", k);
  }
  clear() {
    return this.exec("clear");
  }
  async getAll() {
    let results = await this.exec("getAll");
    return results.sort((a, b) => b.t - a.t).map(r => r.v);
  }
}
//#endregion
let g = {};
let enums = {
  size: {
    large: "large",
    original: "original",
    master: "master",
    auto: "auto",
    zip: "zip",
    origzip: "origzip",
  },
  imgbox: "imgbox",
  userbox: "userbox",
};
// 接口
{
  g.apis = {
    host: "https://www.pixiv.net",
    ajax: "https://www.pixiv.net/ajax",
    uid: undefined,
    async init() {
      if (this.inited) return;
      let r = await fetch(this.host);
      let html = await r.text();
      let parser = new DOMParser();
      let doc = parser.parseFromString(html, "text/html");
      let text = doc.querySelector('[name="global-data"]').content;
      let j = JSON.parse(text);
      this.csrf = j.token;
      this.uid = j.userData.id;
      this.inited = 1;
    },
    toParam(obj) {
      return Object.entries(obj)
        .flatMap(([k, v]) =>
          v instanceof Array ? v.map(v => `${k}[]=${v}`).join("&") : `${k}=${v}`
        )
        .join("&");
    },
    async request(path, init) {
      let url;
      if (path.startsWith("https://")) url = path;
      else url = this.ajax + path;
      let r = await fetch(url, init);
      let j = await r.json();
      if (j.error) throw j.message;
      return j.body || j;
    },
    async get(path, params) {
      return this.request(
        path + "?" + this.toParam({ ...params, lang: "zh" }),
        {
          method: "GET",
        }
      );
    },
    async _post(path, body, init) {
      if (!this.csrf) await this.init();
      return this.request(path, {
        method: "POST",
        body,
        ...init,
        headers: {
          "content-type": "application/json",
          "x-csrf-token": this.csrf,
          ...init?.headers,
        },
      });
    },
    async post(path, data, init) {
      return this._post(path, JSON.stringify(data), init);
    },
    async postForm(path, data, init) {
      return this._post(path, this.toParam(data), {
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          ...init?.headers,
        },
        ...init,
      });
    },
    discovery() {
      let path = "/discovery/artworks";
      let params = {
        mode: "all",
        limit: 100,
      };
      return this.get(path, params);
    },
    latest(p) {
      let path = "/follow_latest/illust";
      let params = {
        p,
        mode: "all",
      };
      return this.get(path, params);
    },
    async bookmarks(uid, p) {
      let path = `/user/${uid}/illusts/bookmarks`;
      let params = {
        tag: "",
        offset: 100 * (p - 1),
        limit: 100,
        rest: "show",
      };
      return this.get(path, params);
    },
    users() {
      let path = "/discovery/users";
      let params = {
        limit: 100,
      };
      return this.get(path, params);
    },
    async following(uid, p) {
      let path = `/user/${uid}/following`;
      let params = {
        offset: 100 * (p - 1),
        limit: 100,
        rest: "show",
        tag: "",
        acceptingRequests: 0,
      };
      return this.get(path, params);
    },
    user(uid) {
      let path = `/user/${uid}`;
      let params = {
        full: 1,
      };
      return this.get(path, params);
    },
    useIds(uid) {
      let path = `/user/${uid}/profile/all`;
      let params = {
        sensitiveFilterMode: "userSetting",
      };
      return this.get(path, params);
    },
    userIllusts(uid, ids) {
      let path = `/user/${uid}/profile/illusts`;
      let params = {
        ids,
        work_category: "illustManga",
        is_first_page: 0,
        sensitiveFilterMode: "userSetting",
      };
      return this.get(path, params);
    },
    illust(id) {
      let path = `/illust/${id}`;
      let params = {};
      return this.get(path, params);
    },
    recommendIds(id) {
      let path = `/illust/${id}/recommend/init`;
      let params = {
        limit: 100,
      };
      return this.get(path, params);
    },
    recommendIllusts(illust_ids) {
      let path = this.ajax + "/illust/recommend/illusts";
      let params = {
        illust_ids,
      };
      return this.get(path, params);
    },
    search(params, p) {
      params = { ...params, p, csw: 0 };
      let pathname = {
        all: "artworks",
        illust_and_ugoira: "illustrations",
        illust: "illustrations",
        manga: "manga",
        ugoira: "illustrations",
      }[params.type];
      let path = `/search/${pathname}/${params.word}`;
      return this.get(path, params);
    },
    like(id) {
      let path = "/illusts/bookmarks/add";
      let data = {
        illust_id: id,
        restrict: 0,
        comment: "",
        tags: [],
      };
      return this.post(path, data);
    },
    unLike(bid) {
      let path = "/illusts/bookmarks/delete";
      let data = { bookmark_id: bid };
      return this.postForm(path, data);
    },
    follow(uid) {
      let url = this.host + "/bookmark_add.php";
      let data = {
        mode: "add",
        type: "user",
        user_id: uid,
        tag: "",
        restrict: 0,
        format: "json",
      };
      return this.postForm(url, data);
    },
    unFollow(uid) {
      let url = this.host + "/rpc_group_setting.php";
      let data = {
        mode: "del",
        type: "bookuser",
        id: uid,
      };
      return this.postForm(url, data);
    },
    ugoiraMeta(id) {
      let path = `/illust/${id}/ugoira_meta`;
      let params = {};
      return this.get(path, params);
    },
    getPrompts(keyword) {
      let path = this.host + "/rpc/cps.php";
      let params = {
        keyword,
      };
      return this.get(path, params);
    },
    ranking(mode, date, p) {
      let path = this.host + "/ranking.php";
      let params = {
        mode,
        date,
        p,
        format: "json",
      };
      return this.get(path, params);
    },
  };
}
// 显示
{
  let loading = 0;
  g.imgHeight = 300;
  function formatUrl(u, q = enums.size.large, p = 0, [w, h] = [1920, 1080]) {
    if (u.match("limit_unknown_360")) return u;
    let hash = u.match(/\/img\/(.*?)_/)[1];
    let _p = u.includes("_p") ? `_p${p}` : "";
    switch (q) {
      case enums.size.large:
        return `https://i.pximg.net/c/600x1200_90/img-master/img/${hash}${_p}_master1200.jpg`;
      case enums.size.master:
        return `https://i.pximg.net/img-master/img/${hash}${_p}_master1200.jpg`;
      case enums.size.original:
        if (!u.includes("_p"))
          return `https://i.pximg.net/img-original/img/${hash}_ugoira0.jpg`;
        let suffix = u.split(".").pop();
        return `https://i.pximg.net/img-original/img/${hash}${_p}.${suffix}`;
      case enums.size.zip:
        return `https://i.pximg.net/img-zip-ugoira/img/${hash}_ugoira600x600.zip`;
      case enums.size.origzip:
        return `https://i.pximg.net/img-zip-ugoira/img/${hash}_ugoira1920x1080.zip`;
      case enums.size.auto:
        [w, h] = [(g.imgHeight * w) / h, g.imgHeight];
        let sizes = [
          "c/100x100",
          "c/128x128",
          "c/150x150",
          "c/240x240",
          "c/240x480",
          "c/260x260_80",
          "c/360x360_70",
          "c/400x250_80",
          "c/540x540_70",
          "c/600x600",
          "c/600x1200_90_webp",
          "c/768x1200_80",
        ];
        for (let size of sizes) {
          let [mw, mh, q] = size.match(/c\/(\d+)x(\d+)(?:_(\d+))?/).slice(1);
          if (q) [mw, mh] = [(mw * q) / 100, (mh * q) / 100];
          if (w < mw && h < mh) {
            return `https://i.pximg.net/${size}/img-master/img/${hash}${_p}_master1200.jpg`;
          }
        }
        return `https://i.pximg.net/img-master/img/${hash}${_p}_master1200.jpg`;
    }
  }
  async function loadNext() {
    if (loading) return;
    if (del.scrollTop + del.clientHeight < del.scrollHeight - del.clientHeight)
      return;
    try {
      loading = 1;
      await g.pageMgr?.loadNext();
    } finally {
      loading = 0;
    }
  }
  function resize(wrap) {
    let illust = wrap.illust;
    let ratio = illust.width / illust.height;
    wrap.style.flexBasis = ratio * g.imgHeight + "px";
    wrap.style.flexGrow = ratio;
    return wrap;
  }
  class PageMgr {
    constructor(frag, type, finite, getFlex) {
      this.$_ = frag.querySelector.bind(frag);
      this.getFlex = getFlex;
      this.finite = finite;
      if (type === enums.imgbox) {
        this.flexbox = this.$_(".imgbox");
        this.wrapFlex = this.loadImgs;
      } else if (type === enums.userbox) {
        this.flexbox = this.$_(".userbox");
        this.wrapFlex = this.loadUsers;
      }
      this.flexbox.replaceChildren();
      if (finite) {
        this.p = 1;
        this.tp = 1;
        this.$_(".navbar").onclick = e => {
          let el = e.target;
          let np = this.p,
            tp = this.tp,
            $_ = this.$_;
          if (el.matches(".prev")) np--;
          else if (el.matches(".next")) np++;
          else if (el.matches(".pages button:not(.active)"))
            np = +el.textContent;
          else if (el.matches(".goto")) np = +$_(".pagenum").value;
          else return;
          if (isNaN(np) || np < 1 || (tp && np > tp) || np === this.p) return;
          this.reset(np);
        };
        this.$_(".pagenum").onkeydown = e =>
          e.key !== "Enter" || (e.target.blur(), this.$_(".goto").click());
      }
      this.loadPage();
    }
    updateNav() {
      let p = this.p,
        tp = this.tp,
        n = 3;
      let pages = this.$_(".pages");
      if (!this.flexbox.children.length) {
        let ps = [
          ...new Set([
            ...range(1, Math.min(1 + n, p)),
            ...range(Math.max(1, p - n), Math.min(p + n, tp)),
            ...range(Math.max(p, tp - n), tp),
          ]),
        ];
        ps = ps.flatMap((v, i, a) => (v - a[i - 1] > 1 ? ["...", v] : [v]));
        pages.replaceChildren(...ps.map(i => nel("button", i)));
      } else if (p + n < tp - n) {
        let el = nel("button", p + n);
        pages.$x(`./*[text()='${p + n - 1}']`)[0].after(el);
        if (p + n === tp - n - 1)
          pages.$x(`./*[text()='${p + n}']`)[0].nextElementSibling.remove();
      }
      pages.$x(`./*[text()='${p}']`)[0].classList.add("active");
    }
    async loadPage() {
      let flexs = (await this.getFlex()) || [];
      if (!flexs.length) return;
      let wraps = this.wrapFlex(flexs);
      if (this.finite) this.updateNav();
      this.flexbox.append(...wraps);
    }
    async loadNext() {
      if (this.finite && this.p >= this.tp) return;
      this.p++;
      await this.loadPage();
    }
    reset(p = 1) {
      this.p = p;
      this.flexbox.replaceChildren();
      this.loadPage();
    }
    wrapImg(illust) {
      let wrap = $("#wraps").content.cloneNode(true).children[0];
      wrap.illust = illust;
      let $_ = wrap.querySelector.bind(wrap);
      $_(".thumb").src = formatUrl(illust.url, enums.size.auto, 0, [
        illust.width,
        illust.height,
      ]);
      $_(".avatar").src = illust.profileImageUrl;
      g.isFollowed(illust.userId)
        ? $_(".avatar").classList.add("isfollowed")
        : null;
      $_(".avatar").userId = illust.userId;
      illust.pageCount > 1
        ? ($_(".page").textContent = illust.pageCount)
        : null;
      $_(".name").textContent = illust.userName;
      $_(".title").textContent = illust.title;
      $_(".detail").innerText = [
        illust.id,
        `${illust.width}x${illust.height}`,
        new Date(illust.updateDate).toLocaleDateString(),
      ].join("\n");
      illust.bookmarkData?.id ? $_(".like").classList.add("liked") : null;
      illust.aiType === 2 ? wrap.classList.add("ai") : null;
      illust.xRestrict === 1 ? wrap.classList.add("r18") : null;
      $_(".tags").replaceChildren(...illust.tags.map(tag => nel("span", tag)));
      return wrap;
    }
    loadImgs = illusts => illusts.map(illust => resize(this.wrapImg(illust)));
    loadUsers = users =>
      users.map(info => {
        let user = $("#users").content.cloneNode(true).children[0];
        let $_ = user.querySelector.bind(user);
        user.info = info;
        $_(".avatar").userId = info.userId;
        $_(".avatar").src = info.profileImageUrl;
        $_(".name").textContent = info.userName;
        $_(".uid").textContent = info.userId;
        info.following ? $_(".follow").classList.add("isfollowed") : null;
        $_(".works").replaceChildren(
          $_(".holder"),
          $_(".scroll"),
          ...info.illusts.map(illust => this.wrapImg(illust, 0))
        );
        return user;
      });
  }
  g.init = {
    async discovery(frag) {
      g.pageMgr = new PageMgr(frag, enums.imgbox, false, async function () {
        let j = await g.apis.discovery();
        let illusts = j.thumbnails.illust;
        illusts.forEach(illust => (illust.url = illust.urls["1200x1200"]));
        return illusts;
      });
    },
    async latest(frag) {
      g.pageMgr = new PageMgr(frag, enums.imgbox, true, async function () {
        let j = await g.apis.latest(this.p);
        this.tp = 34;
        let illusts = j.thumbnails.illust;
        illusts.forEach(illust => (illust.url = illust.urls["1200x1200"]));
        return illusts;
      });
    },
    async users(frag) {
      g.pageMgr = new PageMgr(frag, enums.userbox, false, async () => {
        let j = await g.apis.users();
        j.users.forEach(user => {
          let recommendedUser = j.recommendedUsers.find(
            recommendedUser => recommendedUser.userId === user.userId
          );
          user.illusts =
            recommendedUser?.recentIllustIds.map(id =>
              j.thumbnails.illust.find(illust => illust.id === id)
            ) || [];
          user.illusts.forEach(
            illust => (illust.url = illust.urls["1200x1200"])
          );
        });
        j.users.forEach(user => {
          user.profileImageUrl = user.imageBig;
          user.userName = user.name;
        });
        return j.users;
      });
    },
    async search(frag) {
      let searchinput = $("#searchinput");
      g.pageMgr = new PageMgr(frag, enums.imgbox, true, async function () {
        if (!searchinput.value) return [];
        let params = Object.fromEntries(new FormData($("#searchbar")));
        let j = await g.apis.search(params, this.p);
        let body =
          j[
            {
              all: "illustManga",
              illust_and_ugoira: "illust",
              illust: "illust",
              manga: "manga",
              ugoira: "illust",
            }[params.type]
          ];
        this.tp = body.lastPage;
        return body.data;
      });
      searchinput.addEventListener(
        "keydown",
        e =>
          e.key !== "Enter" ||
          (searchinput.blur(e.preventDefault()), g.pageMgr.reset())
      );
      $("#searchbtn").onclick = e => g.pageMgr.reset(e.preventDefault());
    },
    async following(frag) {
      g.pageMgr = new PageMgr(frag, enums.userbox, true, async function () {
        if (!g.apis.uid) await g.apis.init();
        let j = await g.apis.following(g.apis.uid, this.p);
        this.tp = Math.ceil(j.total / 100);
        j.users.forEach(user => (user.isFollowed = user.following));
        return j.users;
      });
    },
    async bookmarks(frag) {
      g.pageMgr = new PageMgr(frag, enums.imgbox, true, async function () {
        if (!g.apis.uid) await g.apis.init();
        let j = await g.apis.bookmarks(g.apis.uid, this.p);
        this.tp = Math.ceil(j.total / 100);
        return j.works;
      });
    },
    async history(frag) {
      let p = 0;
      g.pageMgr = new PageMgr(frag, enums.imgbox, false, () =>
        !p++ ? g.viewed?.getAll() : []
      );
    },
    async user(uid) {
      let view = $("#user").content.cloneNode(true).children[0];
      g.nav.push(view, "?user=" + uid, "用户 - " + uid);
      {
        let info = await g.apis.user(uid);
        let $_ = view.querySelector.bind(view);
        $_(".user").info = info;
        $_(".bg").src = info.background?.url;
        $_(".avatar").src = info.imageBig;
        $_(".name").textContent = info.name;
        $_(".uid").textContent = info.userId;
        info.isFollowed ? $_(".follow").classList.add("isfollowed") : null;
        $_(".followed").textContent = "已关注 " + info.following;
        $_(".desc").innerHTML = info.commentHtml;
      }
      g.pageMgr = new PageMgr(view, enums.imgbox, true, async function () {
        if (!this.allIds) {
          let j = await g.apis.useIds(uid);
          this.allIds = Object.keys(j.illusts).reverse();
          this.tp = Math.ceil(this.allIds.length / 100);
        }
        let offset = (this.p - 1) * 100;
        let ids = this.allIds.slice(offset, offset + 100);
        if (!ids.length) return [];
        let j = await g.apis.userIllusts(uid, ids);
        return Object.values(j.works).reverse();
      });
    },
    async illust(id) {
      let view = $("#illust").content.cloneNode(true).children[0];
      g.nav.push(view, "?illust=" + id, "插画 - " + id);
      {
        let illust = await g.apis.illust(id);
        illust.url = illust.urls.original;
        view.illust = illust;
        let $_ = view.querySelector.bind(view);
        $_(".avatar").src = Object.values(illust.userIllusts)
          .find(illust => illust?.profileImageUrl)
          ?.profileImageUrl.replace("_50", "_170");
        $_(".avatar").userId = illust.userId;
        $_(".name").textContent = illust.userName;
        $_(".uid").textContent = illust.userId;
        illust.illustType === 2
          ? $_(".orig").replaceWith(await g.getUgoiraCanvas(illust.id))
          : $_(".pics").replaceChildren(
              ...Array(illust.pageCount)
                .fill()
                .map((_, p) => {
                  let img = $_(".orig").cloneNode();
                  img.src = formatUrl(illust.url, enums.size.master, p);
                  return img;
                })
            );
        illust.bookmarkData?.id ? $_(".like").classList.add("liked") : null;
        $_(".title").textContent = illust.illustTitle;
        $_(".id").textContent = illust.illustId;
        $_(".desc").innerHTML = illust.description;
        $_(".tags").replaceChildren(
          ...illust.tags.tags.flatMap(tag => [
            nel("span", tag.tag),
            nel("small", tag.translation?.en),
          ])
        );
        $_(".stat").textContent = `${illust.isOriginal ? "原创" : ""} ${
          illust.width
        }×${illust.height} 🖒${illust.likeCount} ♡${illust.bookmarkCount} 👁︎${
          illust.viewCount
        }`;
        $_(".date").textContent = new Date(illust.uploadDate).toLocaleString();
      }
      g.pageMgr = new PageMgr(view, enums.imgbox, true, async function () {
        let j;
        if (this.p === 1) {
          j = await g.apis.recommendIds(id);
          this.allIds = j.nextIds;
          this.tp = Math.ceil(this.allIds.length / 100 + 1);
        } else {
          let offset = (this.p - 2) * 100;
          let ids = this.allIds.slice(offset, offset + 100);
          if (!ids.length) return [];
          j = await g.apis.recommendIllusts(ids);
        }
        return j.illusts;
      });
    },
    async followed(uid) {
      let view = $("#followed").content.cloneNode(true).children[0];
      g.nav.push(view, "?followed=" + uid, uid + " 的关注");
      g.pageMgr = new PageMgr(view, enums.userbox, true, async function () {
        let j = await g.apis.following(uid, this.p);
        this.tp = Math.ceil(j.total / 100);
        j.users.forEach(user => (user.isFollowed = user.following));
        return j.users;
      });
    },
    async bookmarked(uid) {
      let view = $("#bookmarked").content.cloneNode(true).children[0];
      g.nav.push(view, "?bookmarked=" + uid, uid + " 的收藏");
      g.pageMgr = new PageMgr(view, enums.imgbox, true, async function () {
        let j = await g.apis.bookmarks(uid, this.p);
        this.tp = Math.ceil(j.total / 100);
        return j.works;
      });
    },
    async ranking(frag) {
      let $_ = frag.querySelector.bind(frag);
      $_("[value='daily']").checked = true;
      $_("[value='_r18']").onclick = e => {
        $_("[value='monthly']").disabled =
          $_("[value='rookie']").disabled =
          $_("[value='original']").disabled =
            e.target.checked;
        if (
          e.target.checked &&
          ($_("[value='monthly']").checked ||
            $_("[value='rookie']").checked ||
            $_("[value='original']").checked)
        )
          $_("[value='daily']").checked = true;
      };
      let maxDate = new Date();
      maxDate.setDate(maxDate.getDate() - 1);
      $_("[name='date']").value = $_("[name='date']").max = maxDate
        .toISOString()
        .split("T")[0];
      $_(".menu").onclick = e => {
        let el = e.target;
        let i;
        if (el.matches(".prev")) i = -1;
        else if (el.matches(".next")) i = 1;
        if (!i) return;
        let date = new Date($_("[name='date']").value);
        date.setDate(date.getDate() + i);
        $_("[name='date']").value = date.toISOString().split("T")[0];
        g.pageMgr.reset();
      };
      frag.$$("input").forEach(el => (el.onchange = () => g.pageMgr.reset()));
      g.pageMgr = new PageMgr(frag, enums.imgbox, true, async function () {
        let mode =
          $_("[name='mode']:checked").value +
          ($_("[value='_r18']").checked ? "_r18" : "");
        mode = mode.replace("daily_ai_r18", "daily_r18_ai");
        let date = $_("[name='date']").value.replaceAll("-", "");
        let j = await g.apis.ranking(mode, date, this.p);
        this.tp = Math.ceil(j.rank_total / 50);
        j.contents.forEach(illust => {
          illust.id = illust.illust_id;
          illust.userId = illust.user_id;
          illust.userName = illust.user_name;
          illust.pageCount = illust.illust_page_count;
          illust.updateDate = illust.illust_upload_timestamp * 1000;
          illust.profileImageUrl = illust.profile_img;
        });
        return j.contents;
      });
    },
  };
  document.addEventListener("click", async e => {
    let el = e.target;
    if (el.matches(".like")) {
      let illust = el.closest(".wrap,.view").illust;
      if (!illust.bookmarkData?.id) {
        let j = await g.apis.like(illust.id);
        if (!j.error)
          illust.bookmarkData = {
            id: j.last_bookmark_id,
          };
        el.classList.add("liked");
      } else {
        let j = await g.apis.unLike(illust.id);
        if (!j.error) delete illust.bookmarkData.id;
        el.classList.remove("liked");
      }
    } else if (el.matches(".scroll")) {
      let works = el.closest(".works");
      works.scrollTo({ left: works.scrollWidth, behavior: "smooth" });
    } else if (el.matches(".follow")) {
      let info = el.closest(".user").info;
      if (info.isFollowed) {
        let j = await g.apis.unFollow(info.userId);
        info.isFollowed = false;
        g.followed.delete(info.userId);
        el.classList.remove("isfollowed");
      } else {
        let j = await g.apis.follow(info.userId);
        info.isFollowed = true;
        g.followed.add(info.userId);
        el.classList.add("isfollowed");
      }
    } else if (el.matches(".avatar")) {
      let uid = el.userId;
      if (!uid) return;
      g.init.user(uid);
    } else if (el.matches(".followed")) {
      let uid = el.closest(".user").info.userId;
      g.init.followed(uid);
    } else if (el.matches(".bookmarked")) {
      let uid = el.closest(".user").info.userId;
      g.init.bookmarked(uid);
    } else if (el.matches(".thumb")) {
      let illust = el.closest(".wrap").illust;
      let id = illust.id;
      g.viewed.put(id, illust);
      g.init.illust(id);
    } else if (el.matches("span") && el.closest(".tags")) {
      if ($("#searchinput").closest(".hide")) return;
      $("#searchinput").value += " " + el.textContent;
    }
  });
  document.addEventListener("auxclick", e => {
    if (e.button === 3) g.nav.back();
    if (e.button === 4) g.nav.forward();
  });
  document.addEventListener("mouseup", e => {
    if (e.button === 3 || e.button === 4) e.preventDefault();
  });
  document.addEventListener("keydown", e => {
    if (e.ctrlKey && e.key === "f") $("#searchinput").focus(e.preventDefault());
  });
  window.onresize = loadNext;
  document.onscroll = loadNext;
  $$("slot").forEach(
    slot => (slot.outerHTML = $(`template[name="${slot.name}"]`)?.innerHTML)
  );
  $$("template").forEach(tpl =>
    tpl.content
      .querySelectorAll("slot")
      .forEach(
        slot => (slot.outerHTML = $(`template[name="${slot.name}"]`)?.innerHTML)
      )
  );
  g.formatUrl = formatUrl;
  g.resize = resize;
}
// 侧栏
{
  g.nav = {
    layers: [],
    states: [],
    index: 0,
    cover(el) {
      el.show();
      this.layers.add(el);
    },
    uncover() {
      if (this.layers.length === 0) return;
      let el = this.layers.pop();
      el.hide();
    },
    getState() {
      return {
        view: $(".view"),
        scrollTop: del.scrollTop,
        pageMgr: g.pageMgr,
        title: document.title,
        path: (location.search || "?") + location.hash,
      };
    },
    setState(state) {
      $(".view").replaceWith(state.view);
      del.scrollTop = state.scrollTop;
      g.pageMgr = state.pageMgr;
      document.title = state.title;
      history.replaceState(null, null, state.path);
    },
    switch(frag, path, title) {
      this.clear();
      let lastFrag = $(".frag:not(.hide)");
      lastFrag.lastScroll = del.scrollTop;
      lastFrag.pageMgr = g.pageMgr;
      lastFrag.hide();
      g.pageMgr = frag.pageMgr;
      del.scrollTop = frag.lastScroll;
      frag.show();
      document.title = title;
      history.replaceState(null, null, path);
    },
    push(view, path, title) {
      this.states.splice(this.index, this.states.length, this.getState());
      if (this.index === 0) $("#frags").hide();
      this.setState({
        view,
        title,
        path,
      });
      this.index++;
    },
    back() {
      if (this.index === 0) return;
      this.states[this.index] = this.getState();
      if (this.index === 1) $("#frags").show();
      this.setState(this.states[--this.index]);
    },
    forward() {
      if (this.index >= this.states.length - 1) return;
      this.states[this.index] = this.getState();
      if (this.index === 0) $("#frags").hide();
      this.setState(this.states[++this.index]);
    },
    clear() {
      if (!this.states.length) return;
      this.index = 0;
      this.setState(this.states[this.index]);
      this.states = [];
      $("#frags").show();
    },
  };
  let leftbar = $("#leftbar");
  $("#leftbtn").onclick = () => leftbar.show();
  $("#closeleft").onclick = () => leftbar.hide();
  $("#back").onclick = () => g.nav.back();
  $("#forward").onclick = () => g.nav.forward();
  $("#top").onclick = () => del.scrollTo({ behavior: "smooth", top: 0 });
  $("#end").onclick = () =>
    del.scrollTo({ behavior: "smooth", top: del.scrollHeight });
  $("#refresh").onclick = () => (
    leftbar.hide(), g.init[$(".tab.active").name]($(".frag:not(.hide)"))
  );
  $("#tabs").onclick = e => {
    let tab = e.target;
    if (!tab.matches(".tab")) return;
    leftbar.hide();
    $(".tab.active")?.classList.remove("active");
    tab.classList.add("active");
    let name = tab.name;
    let frag = $(`.frag[name="${name}"]`);
    g.nav.switch(frag, "?#" + name, "pixiv - " + tab.textContent);
    if (!frag.init || name === "history") frag.init = (g.init[name](frag), 1);
  };
  $(`.tab[name="${location.hash.slice(1)}"`)?.click();
  {
    let params = location.search.slice(1).split("=");
    history.replaceState(null, null, params[0] ? "?" : "");
    g.init[params[0]]?.(params[1]);
  }
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      if (g.nav.layers.length) g.nav.uncover();
      else if (g.nav.index > 0) g.nav.back();
    } else if (e.key === "Tab") {
      if (document.activeElement === document.body)
        leftbar.toggle(e.preventDefault());
    } else if (e.altKey && e.key === "ArrowLeft")
      g.nav.back(e.preventDefault());
    else if (e.altKey && e.key === "ArrowRight")
      g.nav.forward(e.preventDefault());
  });
  // 图高
  {
    let heightinput = $("#heightinput");
    heightinput.oninput = () =>
      ($("#heightvalue").textContent = heightinput.value);
    heightinput.onchange = () => {
      g.imgHeight = +heightinput.value;
      del.style.setProperty("--height", heightinput.value + "px");
      localStorage.setItem("height", heightinput.value);
      $$(".wrap").forEach(wrap => g.resize(wrap));
    };
    heightinput.value = localStorage.getItem("height") || g.imgHeight;
    heightinput.oninput();
    heightinput.onchange();
  }
}
// 缩放
{
  g.viewed = new IDB("viewd");
  g.fails = [];
  let cover = $("#cover");
  let zoom = $("#zoom");
  function toggleZoom(src) {
    if (g.fails.includes(src)) zoom.src = src.replace(".jpg", ".png");
    else zoom.src = src;
    zoom.onerror = () => {
      g.fails.push(zoom.src);
      let src = zoom.src.replace(".jpg", ".png");
      if (zoom.src !== src) zoom.src = src;
    };
    zoom.style = "";
    zoom.scale = 1;
    g.nav.cover(cover);
  }
  function zoomImg(e) {
    e.preventDefault();
    let scale = zoom.scale * (e.deltaY < 0 ? 1.25 : 0.8);
    if (scale < 0.8 || scale > 4) return;
    else zoom.scale = scale;
    zoom.style.transform = `scale(${zoom.scale})`;
    moveImg(e);
  }
  function moveImg(e) {
    let t,
      l,
      br = 0.8,
      ih = zoom.clientHeight * zoom.scale,
      iw = zoom.clientWidth * zoom.scale,
      dh = del.clientHeight,
      dw = del.clientWidth;
    if (ih > dh + 1) t = (br * dh - ih) * (e.clientY / dh - 0.5);
    else t = 0;
    if (iw > dw + 1) l = (br * dw - iw) * (e.clientX / dw - 0.5);
    else l = 0;
    zoom.style.translate = `${l}px ${t}px 0px`;
  }
  // 切换
  {
    let wrap, p;
    function navZoom(forward) {
      let illust = wrap?.illust;
      if (!illust) return;
      if (forward) {
        if (p < illust.pageCount - 1) p++;
        else if (wrap.matches(".view")) return;
        else {
          wrap = wrap.nextElementSibling;
          if (!wrap) return;
          illust = wrap.illust;
          p = 0;
        }
      } else {
        if (p > 0) p--;
        else if (wrap.matches(".view")) return;
        else {
          wrap = wrap.previousElementSibling;
          if (!wrap) return;
          illust = wrap.illust;
          p = illust.pageCount - 1;
        }
      }
      toggleZoom(g.formatUrl(illust.url, enums.size.original, p));
      g.viewed.put(illust.id, illust);
    }
    document.addEventListener("contextmenu", e => {
      let el = e.target;
      if (el.matches(".thumb")) {
        e.preventDefault();
        wrap = el.closest(".wrap");
        p = 0;
        let illust = wrap.illust;
        toggleZoom(g.formatUrl(illust.url, enums.size.original, p));
        g.viewed.put(illust.id, illust);
      } else if (el.matches(".orig")) {
        e.preventDefault();
        wrap = el.closest(".view");
        let illust = wrap.illust;
        p = el.src.match(/_p(\d+)_/)?.[1] || 0;
        toggleZoom(g.formatUrl(illust.url, enums.size.original, p));
      }
    });
    document.addEventListener("keydown", e => {
      if (!cover.hided()) {
        if (["ArrowRight", "d", "D"].includes(e.key)) navZoom(1);
        else if (["ArrowLeft", "a", "A"].includes(e.key)) navZoom(0);
      }
    });
    cover.onwheel = zoomImg;
    cover.onmousemove = moveImg;
    cover.onclick = e => {
      let btn = e.target;
      if (btn.matches(".next")) navZoom(1);
      else if (btn.matches(".prev")) navZoom(0);
      else g.nav.uncover();
    };
  }
}
//关注
{
  (async () => {
    let idb = new IDB();
    window.idb = idb;
    await idb.init();
    let followed = await idb.get("followed");
    if (!followed) {
      followed = new Set();
      let p = 1;
      let tp;
      await g.apis.init();
      do {
        let j = await g.apis.following(g.apis.uid, p);
        tp = Math.ceil(j.total / 100);
        j.users.forEach(u => followed.add(u.userId));
      } while (p++ < tp);
      await idb.put("followed", followed);
    }
    let commit = debounce(() => {
      idb.put("followed", followed);
    });
    followed.add = function (uid) {
      Set.prototype.add.call(this, uid);
      commit();
    };
    followed.delete = function (uid) {
      Set.prototype.delete.call(this, uid);
      commit();
    };
    g.followed = followed;
    g.isFollowed = uid => followed.has(uid);
  })();
}
//动图
{
  async function unzip(buffer) {
    let dv = new DataView(buffer);
    let offset = 0;
    while (
      dv.getUint32(offset, true) !== 0x06054b50 &&
      offset < buffer.byteLength
    )
      offset++;
    let fileCount = dv.getUint16(offset + 10, true);
    offset = dv.getUint32(offset + 16, true);
    let files = [];
    let decoder = new TextDecoder();
    for (let _ of Array(fileCount)) {
      let fileOffset = dv.getUint32(offset + 42, true) + 40;
      let zipedSize = dv.getUint32(offset + 20, true);
      files.push({
        name: decoder.decode(buffer.slice(offset + 46, offset + 56)),
        blob: new Blob([buffer.slice(fileOffset, fileOffset + zipedSize)]),
      });
      offset += dv.getUint16(offset + 32, true) + 56;
    }
    return files;
  }
  g.getUgoiraCanvas = async uid => {
    let j = await g.apis.ugoiraMeta(uid);
    let frames = j.frames;
    let zip = await fetch(j.originalSrc).then(r => r.arrayBuffer());
    let files = await unzip(zip);
    await Promise.all(
      frames.map(
        async (f, i) => (f.image = await createImageBitmap(files[i].blob))
      )
    );
    let canvas = nel("canvas");
    canvas.height = frames[0].image.height;
    canvas.width = frames[0].image.width;
    let ctx = canvas.getContext("2d");
    let loop;
    let index = 0;
    async function render(bool) {
      if (bool && loop) return;
      loop = bool;
      while (loop) {
        log(loop);
        index = index >= frames.length - 1 ? 0 : index + 1;
        let frame = frames[index];
        ctx.drawImage(frame.image, 0, 0);
        await sleep(frame.delay);
      }
    }
    canvas.onclick = async () => render(!loop);
    let obs = new IntersectionObserver(es => render(es.at(-1).isIntersecting));
    obs.observe(canvas);
    document.onvisibilitychange = () =>
      render(document.visibilityState === "visible");
    render(1);
    return canvas;
  };
}
//补全
{
  let searchinput = $("#searchinput");
  let ul = $("#prompts");
  let lastWord = "";
  let index = 0;
  function getSE() {
    let text = searchinput.value;
    let start = searchinput.selectionStart;
    let end = searchinput.selectionEnd;
    while (start > 0 && !' |"'.includes(text[start - 1])) start--;
    while (end < text.length && !' |"'.includes(text[end])) end++;
    return [start, end];
  }
  let updatePrompt = debounce(async word => {
    let j = await g.apis.getPrompts(word);
    let tags = j.candidates;
    ul.replaceChildren(
      ...tags.map(tag => {
        let li = nel("li");
        li.replaceChildren(
          nel("span", tag.tag_name),
          nel("small", tag.tag_translation)
        );
        return li;
      })
    );
    setFocus((index = 0));
  }, 250);
  let autocomplete = () => {
    let [start, end] = getSE();
    let word = searchinput.value.slice(start, end);
    if (word === lastWord) return;
    lastWord = word;
    if (!word) return ul.replaceChildren();
    updatePrompt(word);
  };
  function setFocus() {
    index = Math.max(0, Math.min(index, ul.children.length - 1));
    let li = ul.children[index];
    if (!li) return;
    ul.$(".focus")?.classList.remove("focus");
    li.classList.add("focus");
  }
  function select() {
    let tag = ul.$(".focus span").textContent;
    let text = searchinput.value;
    let [start, end] = getSE();
    searchinput.value = text.slice(0, start) + tag + (text.slice(end) || " ");
    let cursor = start + tag.length + (text.slice(end) ? 0 : 1);
    searchinput.setSelectionRange(cursor, cursor);
    searchinput.oninput();
  }
  searchinput.onclick = autocomplete;
  searchinput.onfocus = autocomplete;
  searchinput.onblur = () => ul.replaceChildren();
  searchinput.oninput = () => {
    autocomplete();
    searchinput.style.width = "";
    searchinput.style.width =
      Math.max(200, searchinput.scrollWidth + 10) + "px";
  };
  searchinput.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") autocomplete();
    else if (e.key === "ArrowRight") autocomplete();
    else if (e.key === "ArrowUp" || (e.ctrlKey && e.key === " " && e.shiftKey))
      setFocus(index--);
    else if (e.key === "ArrowDown" || (e.ctrlKey && e.key === " "))
      setFocus(index++);
    else if (e.key === "Tab") select(e.preventDefault());
    else if (e.key === "Escape") searchinput.blur();
    else if (e.ctrlKey && e.key === "d")
      searchinput.setSelectionRange(...getSE(e.preventDefault()));
  });
  ul.onmousedown = e => {
    let li = e.target.closest("li");
    if (!li) return;
    e.preventDefault();
    index = [...ul.children].indexOf(e.target);
    setFocus();
    select();
  };
}
// nwjs
chrome.webRequest?.onBeforeSendHeaders.addListener(
  details => ({
    requestHeaders: [
      ...details.requestHeaders,
      {
        name: "Referer",
        value: "https://www.pixiv.net",
      },
    ],
  }),
  { urls: ["https://i.pximg.net/*", "https://www.pixiv.net/*"] },
  ["blocking", "requestHeaders", "extraHeaders"]
);
