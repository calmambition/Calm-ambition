/* Scrubbable charts for blog posts.
   A post opts in with <figure class="scrub" data-chart="NAME"></figure> and this script.
   Curves are schematic shapes, not measured data. Points are [x, y], both 0 to 1, y = 1 is high.
   To change wording, edit the CHARTS config below. */
(function () {
  "use strict";

  var CHARTS = {
    cortisol: {
      title: "One day of cortisol, two shapes",
      yLabel: "Cortisol",
      sliderLabel: "Move through the day",
      ticks: [[0, "Wake"], [0.28, "Midday"], [0.61, "Evening"], [0.94, "Midnight"]],
      note: "A sketch of the pattern this article describes, not measured data. Studies of burnout don't agree on one cortisol signature, so read the shape and ignore the height.",
      start: 0.035,
      modes: [
        {
          key: "healthy", name: "Healthy rhythm",
          line: [[0, 0.62], [0.035, 0.95], [0.1, 0.8], [0.28, 0.55], [0.45, 0.4], [0.61, 0.26], [0.8, 0.14], [0.94, 0.08], [1, 0.09]],
          zones: [
            [0.07, "On waking", "In the 30 to 45 minutes after waking, cortisol spikes. Blood sugar rises and attention sharpens."],
            [0.3, "Morning", "Cortisol sits at its highest and starts to ease off."],
            [0.6, "Afternoon", "The level declines through the afternoon."],
            [0.85, "Evening", "Cortisol is low by evening, which lets melatonin rise."],
            [1, "Around midnight", "The lowest point of the day. The body uses this window to repair."]
          ]
        },
        {
          key: "flat", name: "Flattened rhythm",
          line: [[0, 0.36], [0.04, 0.47], [0.12, 0.44], [0.28, 0.42], [0.45, 0.42], [0.61, 0.41], [0.8, 0.38], [0.94, 0.33], [1, 0.32]],
          zones: [
            [0.07, "On waking", "The morning spike is weak. You wake flat, slow, and unable to get started."],
            [0.3, "Morning", "With no real peak behind you, there is little drive before noon."],
            [0.6, "Afternoon", "The afternoon decline disappears. The line runs level."],
            [0.85, "Evening", "Cortisol that should have dropped stays up and suppresses melatonin."],
            [1, "Around midnight", "The level never reaches its low point, which cuts into the recovery window."]
          ]
        }
      ]
    },

    recovery: {
      title: "Recovery: the line you expect and the line you get",
      yLabel: "Capacity",
      sliderLabel: "Move through the months",
      ticks: [[0, "Pressure lifts"], [1, "Months later"]],
      note: "A sketch of the shape this article describes, not a schedule. Your own timeline depends on what you've been carrying and for how long.",
      start: 0.05,
      modes: [
        {
          key: "expected", name: "What you expect",
          line: [[0, 0.15], [0.06, 0.6], [0.12, 0.88], [0.2, 0.94], [0.5, 0.95], [1, 0.95]],
          zones: [
            [0.25, "The battery model", "Rest, then full. A week off should do it."],
            [1, "The battery model", "By this model you were back to normal long ago. It assumes the part of you that recharges still works."]
          ]
        },
        {
          key: "actual", name: "What happens",
          line: [[0, 0.15], [0.1, 0.22], [0.18, 0.17], [0.28, 0.3], [0.36, 0.24], [0.48, 0.4], [0.56, 0.33], [0.68, 0.52], [0.76, 0.47], [0.88, 0.64], [1, 0.7]],
          extra: { name: "Productivity", line: [[0, 0.15], [0.3, 0.16], [0.55, 0.2], [0.75, 0.3], [0.9, 0.45], [1, 0.55]] },
          zones: [
            [0.12, "At the start", "Pressure lifts. Your stress response is still blunted, so rest alone doesn't rebuild it."],
            [0.4, "Early on", "Some weeks feel a little less heavy than others. Then a heavier one arrives, and most people read it as failure and push harder."],
            [0.7, "Further in", "The signals worth tracking are quiet: waking up rested, a stressor leaving you sooner, tension releasing during the day, moments of feeling present."],
            [1, "Months in", "Productivity is the last thing to come back. You can be months into recovery and still feel behind."]
          ]
        }
      ]
    }
  };

  var W = 600, H = 240, PAD = 14;
  var SVGNS = "http://www.w3.org/2000/svg";

  /* Catmull-Rom through the points, returned as dense [x, y] samples in 0..1. */
  function sample(pts) {
    var out = [], n = pts.length, STEPS = 24;
    for (var i = 0; i < n - 1; i++) {
      var p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, n - 1)];
      for (var s = 0; s < STEPS; s++) {
        var t = s / STEPS, t2 = t * t, t3 = t2 * t;
        var f = function (k) {
          return 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
        };
        out.push([Math.min(Math.max(f(0), p1[0]), p2[0]), Math.min(Math.max(f(1), 0.02), 0.98)]);
      }
    }
    out.push(pts[n - 1]);
    return out;
  }
  function toPath(samples) {
    return samples.map(function (p, i) {
      return (i ? "L" : "M") + (p[0] * W).toFixed(1) + " " + (PAD + (1 - p[1]) * (H - 2 * PAD)).toFixed(1);
    }).join(" ");
  }
  function yAt(samples, x) {
    for (var i = 1; i < samples.length; i++) {
      if (samples[i][0] >= x) {
        var a = samples[i - 1], b = samples[i], span = b[0] - a[0];
        return span > 0 ? a[1] + (b[1] - a[1]) * (x - a[0]) / span : b[1];
      }
    }
    return samples[samples.length - 1][1];
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function build(fig, cfg) {
    var active = 0, x = cfg.start;
    cfg.modes.forEach(function (m) {
      m.samples = sample(m.line);
      if (m.extra) m.extra.samples = sample(m.extra.line);
    });

    fig.appendChild(el("p", "scrub-title", cfg.title));

    var toggles = el("div", "scrub-toggles");
    toggles.setAttribute("role", "group");
    toggles.setAttribute("aria-label", "Choose which line to follow");
    var buttons = cfg.modes.map(function (m, i) {
      var b = el("button", "scrub-toggle");
      b.type = "button";
      b.appendChild(el("span", "scrub-swatch"));
      b.appendChild(document.createTextNode(m.name));
      b.addEventListener("click", function () { active = i; render(); });
      toggles.appendChild(b);
      return b;
    });
    fig.appendChild(toggles);

    var plot = el("div", "scrub-plot");
    plot.appendChild(el("span", "scrub-ylabel", cfg.yLabel + " ↑"));
    var svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");
    var paths = cfg.modes.map(function (m) {
      var p = document.createElementNS(SVGNS, "path");
      p.setAttribute("d", toPath(m.samples));
      p.setAttribute("class", "scrub-line");
      svg.appendChild(p);
      return p;
    });
    var extras = cfg.modes.map(function (m) {
      if (!m.extra) return null;
      var p = document.createElementNS(SVGNS, "path");
      p.setAttribute("d", toPath(m.extra.samples));
      p.setAttribute("class", "scrub-line scrub-extra");
      svg.appendChild(p);
      return p;
    });
    plot.appendChild(svg);
    var guide = el("span", "scrub-guide"), dot = el("span", "scrub-dot");
    plot.appendChild(guide);
    plot.appendChild(dot);
    var extraTag = el("span", "scrub-extra-tag");
    plot.appendChild(extraTag);
    fig.appendChild(plot);

    var range = el("input", "scrub-range");
    range.type = "range"; range.min = 0; range.max = 1000; range.step = 1;
    range.value = Math.round(x * 1000);
    range.setAttribute("aria-label", cfg.sliderLabel);
    fig.appendChild(range);

    var ticks = el("div", "scrub-ticks");
    cfg.ticks.forEach(function (t) {
      var s = el("span", "", t[1]);
      s.style.left = (t[0] * 100) + "%";
      if (t[0] === 0) s.className = "first";
      if (t[0] > 0.9) s.className = "last";
      ticks.appendChild(s);
    });
    fig.appendChild(ticks);

    var cap = el("div", "scrub-caption");
    cap.setAttribute("aria-live", "polite");
    var capLabel = el("p", "scrub-zone"), capText = el("p", "scrub-text");
    cap.appendChild(capLabel); cap.appendChild(capText);
    fig.appendChild(cap);
    fig.appendChild(el("figcaption", "scrub-note", cfg.note));

    function render() {
      var m = cfg.modes[active];
      buttons.forEach(function (b, i) { b.setAttribute("aria-pressed", String(i === active)); });
      paths.forEach(function (p, i) { p.classList.toggle("is-active", i === active); });
      extras.forEach(function (p, i) { if (p) p.classList.toggle("is-shown", i === active); });
      var y = yAt(m.samples, x);
      var top = (PAD + (1 - y) * (H - 2 * PAD)) / H * 100;
      dot.style.left = guide.style.left = (x * 100) + "%";
      dot.style.top = top + "%";
      if (m.extra) {
        var ex = 0.5, ey = yAt(m.extra.samples, ex);
        extraTag.textContent = m.extra.name;
        extraTag.style.left = (ex * 100) + "%";
        extraTag.style.top = ((PAD + (1 - ey) * (H - 2 * PAD)) / H * 100) + "%";
        extraTag.hidden = false;
      } else { extraTag.hidden = true; }
      var zone = m.zones[m.zones.length - 1];
      for (var i = 0; i < m.zones.length; i++) { if (x <= m.zones[i][0]) { zone = m.zones[i]; break; } }
      if (capLabel.textContent !== zone[1]) capLabel.textContent = zone[1];
      if (capText.textContent !== zone[2]) capText.textContent = zone[2];
      range.setAttribute("aria-valuetext", m.name + ", " + zone[1]);
    }

    range.addEventListener("input", function () { x = range.value / 1000; render(); });
    var dragging = false;
    function fromPointer(e) {
      var r = plot.getBoundingClientRect();
      x = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
      range.value = Math.round(x * 1000);
      render();
    }
    plot.addEventListener("pointerdown", function (e) { dragging = true; plot.setPointerCapture(e.pointerId); fromPointer(e); });
    plot.addEventListener("pointermove", function (e) { if (dragging) fromPointer(e); });
    plot.addEventListener("pointerup", function () { dragging = false; });
    plot.addEventListener("pointercancel", function () { dragging = false; });

    render();
    fig.classList.add("is-ready");
  }

  document.querySelectorAll("figure.scrub[data-chart]").forEach(function (fig) {
    var cfg = CHARTS[fig.getAttribute("data-chart")];
    if (cfg) build(fig, cfg);
  });
})();
