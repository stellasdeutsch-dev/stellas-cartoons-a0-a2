/* Stellas Deutsch — каталог мультфильмов: фильтрация, сортировка, группировка */
(function () {
  "use strict";

  var DATA = window.CATALOG;
  var ITEMS = DATA.items;
  var SITE = DATA.site;

  var SPEED_LABEL = { 1: "медленная речь", 2: "средний темп", 3: "быстрая речь" };
  var THEME_EMOJI = {
    "Быт и семья": "🏠", "Животные": "🐾", "Приключения": "🧭", "Наука и мир вокруг": "🔬",
    "Дружба": "🤝", "Сказка и магия": "✨", "Техника и профессии": "🛠", "Школа и садик": "🎒",
    "Природа": "🌿", "Юмор": "😄", "История": "🏛", "Фэнтези": "🐉", "Sci-Fi": "🚀",
    "Драма": "🎭", "Сатира": "🃏", "Психология": "🧠", "Семья": "👨‍👩‍👧", "Музыка": "🎵",
    "Экология": "🌍", "Детектив": "🔍", "Общество": "🏙", "Мистика": "🔮", "Взросление": "🌱",
    "Романтика": "💞", "Философия": "💭", "Школа": "🎒", "Антология": "📚", "Культовое": "🔥",
    "Быт и общество": "🏙"
  };

  var state = {
    q: "",
    levels: [],
    formats: [],
    themes: [],
    grammar: "",
    speeds: [],
    freeOnly: false,
    sort: "level",
    group: "level"
  };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function uniq(list) {
    var seen = {}, out = [];
    list.forEach(function (v) { if (v && !seen[v]) { seen[v] = 1; out.push(v); } });
    return out;
  }

  var ALL_THEMES = uniq(ITEMS.reduce(function (a, i) { return a.concat(i.themes); }, [])).sort();
  var ALL_GRAMMAR = uniq(ITEMS.reduce(function (a, i) { return a.concat(i.grammar); }, [])).sort();
  var LEVELS = SITE.levels;

  /* ---------- фильтрация ---------- */
  function matches(it) {
    if (state.freeOnly && !hasFreeLink(it)) return false;
    if (state.levels.length && state.levels.indexOf(it.level) < 0) return false;
    if (state.formats.length && state.formats.indexOf(it.format) < 0) return false;
    if (state.speeds.length && state.speeds.indexOf(String(it.speed)) < 0) return false;
    if (state.themes.length && !state.themes.some(function (t) { return it.themes.indexOf(t) >= 0; })) return false;
    if (state.grammar && it.grammar.indexOf(state.grammar) < 0) return false;
    if (state.q) {
      var hay = [it.title, it.original, it.desc, it.vocab, it.tip]
        .concat(it.themes, it.grammar).join(" ").toLowerCase();
      if (hay.indexOf(state.q.toLowerCase()) < 0) return false;
    }
    return true;
  }

  function hasFreeLink(it) {
    return it.platforms.some(function (p) { return p.free; });
  }

  /* ---------- сортировка ---------- */
  var SORTERS = {
    level: function (a, b) { return LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.title.localeCompare(b.title, "de"); },
    "level-desc": function (a, b) { return LEVELS.indexOf(b.level) - LEVELS.indexOf(a.level) || a.title.localeCompare(b.title, "de"); },
    title: function (a, b) { return a.title.localeCompare(b.title, "de"); },
    duration: function (a, b) { return a.epMin - b.epMin || a.title.localeCompare(b.title, "de"); },
    "duration-desc": function (a, b) { return b.epMin - a.epMin; },
    "year-desc": function (a, b) { return (b.year || 0) - (a.year || 0); },
    year: function (a, b) { return (a.year || 0) - (b.year || 0); },
    speed: function (a, b) { return a.speed - b.speed || a.epMin - b.epMin; }
  };

  /* ---------- группировка ---------- */
  var GROUPERS = {
    none: null,
    level: { label: function (i) { return "Уровень " + i.level; }, order: function (k) { return LEVELS.indexOf(k.replace("Уровень ", "")); } },
    format: { label: function (i) { return i.format; } },
    speed: { label: function (i) { return SPEED_LABEL[i.speed]; }, order: function (k) { return ["медленная речь", "средний темп", "быстрая речь"].indexOf(k); } },
    theme: { label: function (i) { return i.themes[0]; } },
    access: { label: function (i) { return hasFreeLink(i) ? "Есть бесплатный просмотр" : "Только по подписке"; }, order: function (k) { return k[0] === "Е" ? 0 : 1; } },
    grammar: { label: function (i) { return i.grammar[0]; } }
  };

  /* ---------- рендер ---------- */
  function render() {
    var list = ITEMS.filter(matches).sort(SORTERS[state.sort]);
    $("#count").innerHTML = "<b>" + list.length + "</b> из " + ITEMS.length;

    var host = $("#results");
    host.innerHTML = "";

    if (!list.length) {
      host.innerHTML = '<div class="empty"><b>Ничего не нашлось</b>Попробуйте снять часть фильтров или очистить поиск.</div>';
      return;
    }

    var g = GROUPERS[state.group];
    if (!g) {
      host.appendChild(gridOf(list));
      return;
    }

    var buckets = {}, keys = [];
    list.forEach(function (it) {
      var k = g.label(it);
      if (!buckets[k]) { buckets[k] = []; keys.push(k); }
      buckets[k].push(it);
    });
    if (g.order) keys.sort(function (a, b) { return g.order(a) - g.order(b); });
    else keys.sort(function (a, b) { return buckets[b].length - buckets[a].length || a.localeCompare(b, "ru"); });

    keys.forEach(function (k) {
      var sec = document.createElement("section");
      sec.className = "group";
      var h = document.createElement("div");
      h.className = "group__title";
      h.innerHTML = "<h3>" + esc(k) + "</h3><span>" + buckets[k].length + " шт.</span>";
      sec.appendChild(h);
      sec.appendChild(gridOf(buckets[k]));
      host.appendChild(sec);
    });
  }

  function gridOf(list) {
    var grid = document.createElement("div");
    grid.className = "grid";
    list.forEach(function (it) { grid.appendChild(cardOf(it)); });
    return grid;
  }

  function cardOf(it) {
    var el = document.createElement("button");
    el.className = "card";
    el.type = "button";
    el.setAttribute("aria-label", it.title);
    el.innerHTML =
      '<div class="card__poster">' +
        '<span class="card__lvl lvl-' + it.level + '">' + it.level + '</span>' +
        (hasFreeLink(it) ? '<span class="card__free">бесплатно</span>' : '') +
        '<img loading="lazy" src="' + it.posterSmall + '" alt="Постер: ' + esc(it.title) + '">' +
      '</div>' +
      '<div class="card__body">' +
        '<h3 class="card__title">' + esc(it.title) + '</h3>' +
        '<div class="card__meta"><span>' + it.format + '</span><span>' + it.epMin + ' мин</span>' +
        (it.year ? '<span>' + it.year + '</span>' : '') + '</div>' +
        '<div class="card__tags">' +
          '<span class="tag">' + esc(it.grammar[0]) + '</span>' +
          '<span class="tag tag--theme">' + esc(it.themes[0]) + '</span>' +
        '</div>' +
      '</div>';
    el.addEventListener("click", function () { openModal(it); });
    return el;
  }

  /* ---------- модальное окно ---------- */
  function openModal(it) {
    var m = $("#modal");
    $("#m-poster").src = it.poster;
    $("#m-poster").alt = "Постер: " + it.title;
    $("#m-title").textContent = it.title;
    $("#m-orig").textContent = it.original + (it.year ? " · " + it.year : "");
    $("#m-desc").textContent = it.desc;
    $("#m-tip").textContent = it.tip;
    $("#m-vocab").textContent = it.vocab;
    $("#m-facts").innerHTML = [
      ["Уровень", it.level],
      ["Формат", it.format + " · " + it.epMin + " мин"],
      ["Темп речи", SPEED_LABEL[it.speed]],
      ["Доступ", hasFreeLink(it) ? "есть бесплатно" : "по подписке"]
    ].map(function (f) {
      return '<div class="fact"><small>' + f[0] + '</small><b>' + esc(f[1]) + '</b></div>';
    }).join("");
    $("#m-grammar").innerHTML = it.grammar.map(function (g) {
      return '<span class="tag">' + esc(g) + '</span>';
    }).join("") + it.themes.map(function (t) {
      return '<span class="tag tag--theme">' + (THEME_EMOJI[t] || "") + " " + esc(t) + '</span>';
    }).join("");
    $("#m-links").innerHTML = it.platforms.map(function (p) {
      return '<a class="linkbtn' + (p.free ? ' linkbtn--free' : '') + '" target="_blank" rel="noopener" href="' +
        p.url + '">' + (p.free ? "▶ " : "🔒 ") + esc(p.name) + '</a>';
    }).join("") + (it.tmdbUrl ? '<a class="linkbtn" style="background:#f6f5fc;color:#101334" target="_blank" rel="noopener" href="' + it.tmdbUrl + '">ℹ О мультфильме</a>' : '');
    m.classList.add("is-open");
    m.scrollTop = 0;
    document.body.style.overflow = "hidden";
    history.replaceState(null, "", "#t=" + it.id);
  }

  function closeModal() {
    $("#modal").classList.remove("is-open");
    document.body.style.overflow = "";
    if (location.hash.indexOf("#t=") === 0) history.replaceState(null, "", location.pathname);
  }

  function openFromHash() {
    if (location.hash.indexOf("#t=") !== 0) return;
    var id = location.hash.slice(3);
    var it = ITEMS.filter(function (i) { return i.id === id; })[0];
    if (it) openModal(it);
  }

  /* ---------- построение управляющих элементов ---------- */
  function buildControls() {
    // уровни
    $("#f-levels").innerHTML = LEVELS.map(function (l) {
      return '<button class="pill lvl-' + l + '" data-set="levels" data-val="' + l + '">' + l + '</button>';
    }).join("");

    // формат
    var formats = uniq(ITEMS.map(function (i) { return i.format; }));
    $("#f-formats").innerHTML = formats.map(function (f) {
      return '<button class="pill" data-set="formats" data-val="' + f + '">' + f + '</button>';
    }).join("");

    // темп речи
    $("#f-speeds").innerHTML = [1, 2, 3].map(function (s) {
      return '<button class="pill" data-set="speeds" data-val="' + s + '">' + SPEED_LABEL[s] + '</button>';
    }).join("");

    // темы
    $("#f-themes").innerHTML = ALL_THEMES.map(function (t) {
      return '<button class="chip" data-set="themes" data-val="' + esc(t) + '"><em>' +
        (THEME_EMOJI[t] || "🎬") + '</em>' + esc(t) + '</button>';
    }).join("");

    // грамматика
    $("#f-grammar").innerHTML = '<option value="">Любая тема</option>' + ALL_GRAMMAR.map(function (g) {
      return '<option value="' + esc(g) + '">' + esc(g) + '</option>';
    }).join("");

    $$("[data-set]").forEach(function (b) {
      b.addEventListener("click", function () {
        var key = b.dataset.set, val = b.dataset.val;
        var arr = state[key], i = arr.indexOf(val);
        if (i < 0) arr.push(val); else arr.splice(i, 1);
        b.classList.toggle("is-on", i < 0);
        render();
      });
    });
  }

  function syncPills() {
    $$("[data-set]").forEach(function (b) {
      b.classList.toggle("is-on", state[b.dataset.set].indexOf(b.dataset.val) >= 0);
    });
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ---------- статистика в шапке ---------- */
  function fillStats() {
    var free = ITEMS.filter(hasFreeLink).length;
    var series = ITEMS.filter(function (i) { return i.format === "Сериал"; }).length;
    $("#s-total").textContent = ITEMS.length;
    $("#s-free").textContent = free;
    $("#s-series").textContent = series;
    $("#s-levels").textContent = LEVELS.length;

    // постеры в герое — три случайных с разных уровней
    var picks = LEVELS.map(function (l) {
      var pool = ITEMS.filter(function (i) { return i.level === l; });
      return pool[Math.floor(Math.random() * pool.length)];
    }).filter(Boolean);
    while (picks.length < 3) picks.push(ITEMS[picks.length]);
    $$("#hero-art img").forEach(function (img, n) {
      if (picks[n]) { img.src = picks[n].poster; img.alt = "Постер: " + picks[n].title; }
    });
  }

  /* ---------- события ---------- */
  function bind() {
    $("#search").addEventListener("input", function (e) {
      state.q = e.target.value.trim();
      render();
    });
    $("#sort").addEventListener("change", function (e) { state.sort = e.target.value; render(); });
    $("#group").addEventListener("change", function (e) { state.group = e.target.value; render(); });
    $("#f-grammar").addEventListener("change", function (e) { state.grammar = e.target.value; render(); });
    $("#free-only").addEventListener("change", function (e) { state.freeOnly = e.target.checked; render(); });

    $("#reset").addEventListener("click", function () {
      state.q = ""; state.levels = []; state.formats = []; state.themes = [];
      state.speeds = []; state.grammar = ""; state.freeOnly = false;
      state.sort = "level"; state.group = "level";
      $("#search").value = ""; $("#sort").value = "level"; $("#group").value = "level";
      $("#f-grammar").value = ""; $("#free-only").checked = false;
      syncPills(); render();
    });

    $$("[data-quick]").forEach(function (el) {
      el.addEventListener("click", function () {
        var q = el.dataset.quick;
        if (q === "first") { state.levels = [LEVELS[0]]; state.sort = "duration"; }
        if (q === "grammar") { $("#f-grammar").focus(); $("#f-grammar").scrollIntoView({ block: "center" }); return; }
        if (q === "free") { state.freeOnly = true; $("#free-only").checked = true; }
        if (q === "short") { state.sort = "duration"; $("#sort").value = "duration"; }
        syncPills(); render();
        $("#catalog").scrollIntoView({ behavior: "smooth" });
      });
    });

    $("#modal").addEventListener("click", function (e) {
      if (e.target.id === "modal" || e.target.classList.contains("modal__bg") || e.target.closest(".modal__close")) closeModal();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });
  }

  buildControls();
  fillStats();
  bind();
  render();
  openFromHash();
})();
