(() => {
  "use strict";

  const svgNS = "http://www.w3.org/2000/svg";
  const width = 900;
  const height = 540;
  const maxZoom = 256;
  const fullView = { x: 0, y: 0, width, height };

  const mapStyle = [
    ".atlas-grid { fill:none; stroke:#89aab4; stroke-opacity:.29; stroke-width:.7; stroke-dasharray:2 5; }",
    ".atlas-ocean-label { fill:#6b909d; font:600 11px system-ui,sans-serif; letter-spacing:2.15px; text-anchor:middle; pointer-events:none; }",
    ".atlas-context { stroke:#bac8aa; stroke-width:.65; pointer-events:none; }",
    ".atlas-water { fill:#dcecf2; stroke:#c7dce1; stroke-width:.4; pointer-events:none; }",
    ".atlas-context,.atlas-country { fill:#d4e4bb; }",
    ".atlas-country { stroke:#fffdf2; stroke-width:1; transition:fill .14s, stroke .14s; }",
    ".atlas-country.atlas-active { cursor:pointer; }",
    ".atlas-country:where(.atlas-active:hover,.atlas-active:focus-visible) { fill:#bbd1a7; stroke:#48675b; stroke-width:1.15; }",
    ".atlas-country.atlas-selected { fill:#f2cf67; stroke:#8c7025; stroke-width:1.35; }",
    ".atlas-country.atlas-correct { fill:#a4ce9e; stroke:#245838; stroke-width:1.6; }",
    ".atlas-country.atlas-incorrect { fill:#edaaa0; stroke:#a03e32; stroke-width:1.6; }",
    ".atlas-country.atlas-hint { fill:#85be80; stroke:#19533a; stroke-width:2.5; animation:atlas-hint-flash .72s ease-in-out 4; }",
    "@keyframes atlas-hint-flash { 48%,52% { fill:#ffe17a; stroke:#725313; stroke-width:3.5; } }",
    ".atlas-country:focus-visible { outline:none; }",
    "@media (prefers-reduced-motion:reduce) { .atlas-country { transition:none; } .atlas-country.atlas-hint { animation:none; } }",
  ].join("\n");

  function element(name, attributes = {}) {
    const node = document.createElementNS(svgNS, name);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
  }

  function path(className, d) {
    return element("path", {
      class: className,
      d,
      "fill-rule": "evenodd",
      "vector-effect": "non-scaling-stroke",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    });
  }

  function project([longitude, latitude]) {
    return { x: (longitude - 5) * 4.65, y: (84 - latitude) * 5.15 };
  }

  function coordinateLabel({ x, y }) {
    const longitude = x / 4.65 + 5;
    const latitude = 84 - y / 5.15;
    const north = latitude >= 0 ? "с. ш." : "ю. ш.";
    const options = { maximumFractionDigits: 1 };
    return `${Math.abs(latitude).toLocaleString("ru-RU", options)}° ${north}, ${longitude.toLocaleString("ru-RU", options)}° в. д.`;
  }

  function graticule() {
    const segments = [];
    for (let longitude = 15; longitude < 199; longitude += 15) {
      const { x } = project([longitude, 0]);
      segments.push(`M${x},0V${height}`);
    }
    for (let latitude = -15; latitude <= 75; latitude += 15) {
      const { y } = project([0, latitude]);
      segments.push(`M0,${y}H${width}`);
    }
    return path("atlas-grid", segments.join(""));
  }

  function addMapLabels(svg) {
    const labels = element("g", { class: "atlas-ocean-label", "aria-hidden": "true" });
    for (const [x, y, label] of [
      [283, 467, "ИНДИЙСКИЙ ОКЕАН"],
      [734, 321, "ТИХИЙ ОКЕАН"],
      [274, 15, "СЕВЕРНЫЙ ЛЕДОВИТЫЙ ОКЕАН"],
    ]) {
      const text = element("text", { x, y });
      text.textContent = label;
      labels.append(text);
    }
    svg.append(labels);
  }

  function mount(container, ids, onSelect) {
    const mapData = window.ASIA_MAP_DATA;
    if (!mapData) throw new Error("Unable to initialize the Asia map data.");

    const questionIds = new Set(ids);
    const countries = new Map();
    const locations = new Map();
    const svg = element("svg", {
      class: "asia-atlas",
      viewBox: `0 0 ${width} ${height}`,
      xmlns: svgNS,
      role: "group",
      "aria-label": "Интерактивная карта Азии",
      preserveAspectRatio: "xMidYMid meet",
      width: "100%",
      height: "100%",
    });
    svg.style.display = "block";
    svg.style.background = "#dcecf2";
    svg.style.userSelect = "none";
    svg.style.touchAction = "pan-y";
    const style = element("style");
    style.textContent = mapStyle;
    const context = element("g", { "aria-hidden": "true" });
    const countryLayer = element("g", { "aria-label": "Страны" });
    const water = element("g", { "aria-hidden": "true" });
    svg.append(style, graticule(), context, countryLayer, water);
    addMapLabels(svg);

    for (const [id, [d, x, y]] of Object.entries(mapData)) {
      const isTarget = questionIds.has(id);
      const node = path(isTarget ? "atlas-country" : "atlas-context", d);
      (isTarget ? countryLayer : context).append(node);
      if (!isTarget) continue;
      const point = { x, y };
      node.setAttribute("data-map-id", id);
      node.setAttribute("aria-label", `Территория около ${coordinateLabel(point)}`);
      countries.set(id, node);
      locations.set(id, point);
    }
    for (const d of window.ASIA_MAP_LAKES) water.append(path("atlas-water", d));
    container.replaceChildren(svg);

    let enabled = true;
    let selection = null;
    let result = null;
    let keyboardId = [...locations.keys()].sort((a, b) => locations.get(a).x - locations.get(b).x)[0];
    let view = { ...fullView };
    let overviewScale = 1;
    let scale = 1;
    let drag = null;
    let touchGesture = null;
    let ignorePointerClick = false;
    let hintedCountry = null;
    let hintFrame = null;

    function updateView() {
      svg.setAttribute("viewBox", `${view.x} ${view.y} ${view.width} ${view.height}`);
      svg.style.touchAction = view.width < width ? "none" : "pan-y";
      scale = overviewScale * width / view.width;
    }

    function measureViewport() {
      const rect = svg.getBoundingClientRect();
      overviewScale = Math.min(rect.width / width, rect.height / height) || 1;
      scale = overviewScale * width / view.width;
    }

    function refreshTargets() {
      for (const [id, node] of countries) {
        node.classList.toggle("atlas-active", enabled);
        node.classList.toggle("atlas-selected", !result && id === selection);
        node.classList.toggle("atlas-correct", result?.correct === id);
        node.classList.toggle("atlas-incorrect", result?.selected === id && result?.correct !== id);
        if (enabled) {
          node.setAttribute("role", "button");
          node.setAttribute("tabindex", id === keyboardId ? 0 : -1);
          node.setAttribute("aria-pressed", String(id === selection));
        } else {
          node.removeAttribute("role");
          node.removeAttribute("tabindex");
          node.removeAttribute("aria-pressed");
        }
      }
    }

    function setSelection(id) {
      selection = id;
      result = null;
      if (locations.has(id)) keyboardId = id;
      refreshTargets();
    }

    function setResult({ selected, correct } = {}) {
      selection = selected ?? null;
      result = { selected, correct };
      refreshTargets();
    }

    function setEnabled(state) {
      enabled = state;
      refreshTargets();
    }

    function panTo(x, y) {
      view.x = Math.max(0, Math.min(width - view.width, x));
      view.y = Math.max(0, Math.min(height - view.height, y));
      updateView();
    }

    function zoomBy(factor, anchor = { x: view.x + view.width / 2, y: view.y + view.height / 2 }) {
      finishHint();
      const newWidth = limitWidth(view.width / factor);
      const ratio = newWidth / view.width;
      zoomTo(newWidth, anchor.x - (anchor.x - view.x) * ratio, anchor.y - (anchor.y - view.y) * ratio);
    }

    function limitWidth(nextWidth) {
      return Math.max(width / maxZoom, Math.min(width, nextWidth));
    }

    function zoomTo(newWidth, x, y) {
      view.width = newWidth;
      view.height = newWidth * height / width;
      panTo(x, y);
    }

    function stopHintCamera() {
      if (hintFrame === null) return;
      window.cancelAnimationFrame(hintFrame);
      hintFrame = null;
    }

    function clearHint() {
      stopHintCamera();
      hintedCountry?.classList.remove("atlas-hint");
      hintedCountry = null;
    }

    function highlightHint() {
      hintedCountry?.classList.add("atlas-hint");
    }

    function finishHint() {
      if (hintFrame === null) return;
      stopHintCamera();
      highlightHint();
    }

    function animateView(destination, duration, onFinish) {
      const start = { ...view };
      const widthChange = destination.width - start.width;
      let startedAt;

      function tick(now) {
        startedAt ??= now;
        const time = Math.min((now - startedAt) / duration, 1);
        const ease = time * time * (3 - 2 * time);
        const nextWidth = start.width * (destination.width / start.width) ** ease;
        const position = widthChange === 0 ? ease : (nextWidth - start.width) / widthChange;
        view = {
          x: start.x + (destination.x - start.x) * position,
          y: start.y + (destination.y - start.y) * position,
          width: nextWidth,
          height: nextWidth * height / width,
        };
        if (time < 1) {
          updateView();
          hintFrame = window.requestAnimationFrame(tick);
          return;
        }
        view = { ...destination };
        updateView();
        hintFrame = null;
        onFinish();
      }

      hintFrame = window.requestAnimationFrame(tick);
    }

    function revealCountry(id) {
      const country = countries.get(id);
      if (!country) return;
      clearHint();
      hintedCountry = country;

      const bounds = country.getBBox();
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      const targetWidth = Math.min(width, Math.max(width / 160, bounds.width * 1.35, bounds.height * 1.35 * width / height));
      const targetHeight = targetWidth * height / width;
      const destination = {
        x: Math.max(0, Math.min(width - targetWidth, centerX - targetWidth / 2)),
        y: Math.max(0, Math.min(height - targetHeight, centerY - targetHeight / 2)),
        width: targetWidth,
        height: targetHeight,
      };

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        view = destination;
        updateView();
        highlightHint();
        return;
      }

      const centerOutsideView = centerX < view.x || centerX > view.x + view.width ||
        centerY < view.y || centerY > view.y + view.height;
      const approachCountry = () => animateView(destination, 720, highlightHint);
      if (view.width < width && centerOutsideView) {
        animateView(fullView, 460, approachCountry);
      } else {
        approachCountry();
      }
    }

    function pointFromClient(x, y) {
      const point = svg.createSVGPoint();
      point.x = x;
      point.y = y;
      return point.matrixTransform(svg.getScreenCTM().inverse());
    }

    function focus(id) {
      const point = locations.get(id);
      if (!point) return;
      keyboardId = id;
      const padding = 12 / scale;
      if (point.x < view.x + padding || point.x > view.x + view.width - padding ||
          point.y < view.y + padding || point.y > view.y + view.height - padding) {
        panTo(point.x - view.width / 2, point.y - view.height / 2);
      }
      refreshTargets();
      countries.get(id).focus({ preventScroll: true });
    }

    function submit(id) {
      if (!enabled || !countries.has(id)) return;
      setSelection(id);
      onSelect(id);
    }

    svg.addEventListener("click", event => {
      if (ignorePointerClick && event.detail !== 0) return;
      const target = event.target.closest(".atlas-active[data-map-id]");
      if (target) submit(target.getAttribute("data-map-id"));
    });

    svg.addEventListener("keydown", event => {
      if (!enabled) return;
      const id = event.target.getAttribute("data-map-id");
      if (!locations.has(id)) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        submit(id);
        return;
      }
      const direction = {
        ArrowLeft: [-1, 0], ArrowRight: [1, 0],
        ArrowUp: [0, -1], ArrowDown: [0, 1],
      }[event.key];
      if (!direction) return;
      event.preventDefault();
      const current = locations.get(id);
      const [dx, dy] = direction;
      let choice = id;
      let best = Infinity;
      for (const [candidate, point] of locations) {
        const offsetX = point.x - current.x;
        const offsetY = point.y - current.y;
        const heading = offsetX * dx + offsetY * dy;
        const flank = Math.abs(offsetX * dy + offsetY * dx);
        const score = heading + flank * 2.4;
        if (heading > 0 && score < best) {
          choice = candidate;
          best = score;
        }
      }
      focus(choice);
    });

    svg.addEventListener("wheel", event => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      zoomBy(event.deltaY < 0 ? 1.23 : 1 / 1.23, pointFromClient(event.clientX, event.clientY));
    }, { passive: false });

    svg.addEventListener("pointerdown", event => {
      if (event.pointerType === "touch") return;
      ignorePointerClick = false;
      if (view.width === width || event.button !== 0 || !event.isPrimary) return;
      drag = {
        pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY,
        x: view.x, y: view.y, moved: false,
      };
    });

    svg.addEventListener("pointermove", event => {
      if (drag?.pointerId !== event.pointerId) return;
      const dx = event.clientX - drag.clientX;
      const dy = event.clientY - drag.clientY;
      if (!drag.moved && Math.hypot(dx, dy) < 5) return;
      if (!drag.moved) {
        finishHint();
        drag.moved = true;
        svg.setPointerCapture(event.pointerId);
        svg.style.cursor = "grabbing";
      }
      panTo(drag.x - dx / scale, drag.y - dy / scale);
    });

    function finishDrag(event) {
      if (drag?.pointerId !== event.pointerId) return;
      ignorePointerClick = drag.moved;
      svg.style.cursor = "";
      drag = null;
    }

    svg.addEventListener("pointerup", finishDrag);
    svg.addEventListener("pointercancel", finishDrag);
    svg.addEventListener("lostpointercapture", finishDrag);

    function mapTouches(event) {
      return Array.from(event.touches).filter(touch => svg.contains(touch.target));
    }

    function fingerPair(first, second) {
      return {
        x: (first.clientX + second.clientX) / 2,
        y: (first.clientY + second.clientY) / 2,
        distance: Math.max(1, Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY)),
      };
    }

    function startTouchGesture([first, second]) {
      if (!first) {
        touchGesture = null;
      } else if (!second) {
        touchGesture = { x: first.clientX, y: first.clientY, moved: false, canPan: view.width < width };
      } else {
        finishHint();
        const midpoint = fingerPair(first, second);
        touchGesture = {
          ...midpoint,
          ids: [first.identifier, second.identifier],
          anchor: pointFromClient(midpoint.x, midpoint.y),
          view: { ...view },
          scale,
        };
      }
    }

    svg.addEventListener("touchstart", event => {
      const touches = mapTouches(event);
      if (!touchGesture) ignorePointerClick = false;
      if (touches.length >= 2) {
        ignorePointerClick = true;
        if (!event.cancelable && view.width === width) return;
        if (event.cancelable) event.preventDefault();
      }
      startTouchGesture(touches);
    }, { passive: false });

    svg.addEventListener("touchmove", event => {
      if (!touchGesture) return;
      const touches = mapTouches(event);
      const gesture = touchGesture;
      if (gesture.ids) {
        const [first, second] = gesture.ids.map(id => touches.find(touch => touch.identifier === id));
        if (!first || !second || (!event.cancelable && view.width === width)) return;
        if (event.cancelable) event.preventDefault();
        const midpoint = fingerPair(first, second);
        const nextWidth = limitWidth(gesture.view.width * gesture.distance / midpoint.distance);
        const ratio = nextWidth / gesture.view.width;
        // Keep the same map point under the midpoint while both fingers move.
        const offsetX = gesture.anchor.x - gesture.view.x + (midpoint.x - gesture.x) / gesture.scale;
        const offsetY = gesture.anchor.y - gesture.view.y + (midpoint.y - gesture.y) / gesture.scale;
        zoomTo(nextWidth, gesture.anchor.x - offsetX * ratio, gesture.anchor.y - offsetY * ratio);
      } else if (touches.length === 1) {
        const { clientX, clientY } = touches[0];
        const dx = clientX - gesture.x;
        const dy = clientY - gesture.y;
        if (!gesture.moved && Math.hypot(dx, dy) < 5) return;
        ignorePointerClick = true;
        gesture.moved = true;
        gesture.x = clientX;
        gesture.y = clientY;
        if (!gesture.canPan || view.width === width) return;
        if (event.cancelable) event.preventDefault();
        finishHint();
        panTo(view.x - dx / scale, view.y - dy / scale);
      }
    }, { passive: false });

    function finishTouchGesture(event) {
      if (event.type === "touchcancel") ignorePointerClick = true;
      startTouchGesture(mapTouches(event));
    }

    svg.addEventListener("touchend", finishTouchGesture);
    svg.addEventListener("touchcancel", finishTouchGesture);

    refreshTargets();
    measureViewport();
    updateView();
    const resize = new ResizeObserver(measureViewport);
    resize.observe(svg);

    return {
      setEnabled, setSelection, setResult, focus, revealCountry, clearHint,
      resetView() {
        finishHint();
        view = { ...fullView };
        updateView();
      },
      zoomIn() { zoomBy(1.5); },
      zoomOut() { zoomBy(1 / 1.5); },
    };
  }

  window.AsiaMap = { mount };
})();
