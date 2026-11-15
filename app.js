(() => {
  "use strict";

  const byId = (id) => document.getElementById(id);
  const { AsiaQuiz, AsiaMap } = window;
  const ui = Object.fromEntries([
    "workspace", "map-count", "map-surface", "map-label", "task-actions",
    "map-slot", "map-panel", "map-dialog", "map-host", "expand-map", "close-map", "finish-map", "mobile-map-prompt", "mobile-map-status",
    "question-number", "mode-chip", "test-progress", "prompt-label", "prompt", "answer-form",
    "text-label", "answer", "text-attempt", "map-attempt", "selection-status", "selection-icon", "selection-text",
    "validation", "feedback", "check-answer", "check-label", "skip-answer", "mode-note-icon",
    "mode-note-title", "mode-note-text", "results", "results-title", "results-direction",
    "result-metrics", "result-rows", "errors-only", "empty-results", "progress-dialog", "progress-summary",
  ].map((id) => [id, byId(id)]));

  if (!AsiaQuiz || !AsiaMap) {
    ui.prompt.textContent = "Не удалось загрузить тренажёр";
    ui["answer-form"].hidden = true;
    ui["task-actions"].hidden = true;
    return;
  }

  const CAPITAL = "country-to-capital";
  const COUNTRY = "capital-to-country";
  const ATTEMPT_LIMIT = 3;
  const mobileMap = window.matchMedia("(max-width: 740px), (max-width: 960px) and (pointer: coarse)");
  const directions = {
    [CAPITAL]: {
      title: "Страна → Столица",
      promptLabel: "Названа страна",
      textLabel: "Введите название столицы",
      placeholder: "Название столицы",
    },
    [COUNTRY]: {
      title: "Столица → Страна",
      promptLabel: "Названа столица",
      textLabel: "Введите название страны",
      placeholder: "Название страны",
    },
  };

  const countryById = new Map(AsiaQuiz.countries.map((country) => [country.id, country]));
  const total = countryById.size;
  const sessions = new Map();
  let mode = "training";
  let direction = CAPITAL;
  let active;
  let mapOpener;

  const map = AsiaMap.mount(ui["map-surface"], [...countryById.keys()], (id) => {
    active.mapId = id;
    clearValidation();
    renderSelection();
  });
  ui["map-count"].textContent = `${total} стран`;

  function makeElement(tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value !== undefined) element.textContent = value;
    return element;
  }

  function icon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const use = document.createElementNS(svg.namespaceURI, "use");
    svg.setAttribute("class", "icon");
    svg.setAttribute("aria-hidden", "true");
    use.setAttribute("href", `#i-${name}`);
    svg.append(use);
    return svg;
  }

  function clearValidation() {
    ui.validation.hidden = true;
    ui.answer.removeAttribute("aria-invalid");
  }

  function revealOnPhone(element, block = "center") {
    if (!window.matchMedia("(max-width: 740px)").matches) return;
    const { top, bottom } = element.getBoundingClientRect();
    const visibleBottom = Math.min(window.innerHeight, ui["task-actions"].getBoundingClientRect().top);
    if (top < 8 || bottom > visibleBottom - 8) element.scrollIntoView({ block, behavior: "instant" });
  }

  function openMobileMap(opener) {
    const dialog = ui["map-dialog"];
    if (!mobileMap.matches || typeof dialog.showModal !== "function") return false;
    if (dialog.open) return true;

    mapOpener = opener;
    ui["map-slot"].style.minHeight = `${ui["map-panel"].offsetHeight}px`;
    ui["mobile-map-prompt"].textContent = active.session.current().prompt;
    ui["map-host"].append(ui["map-panel"]);
    dialog.showModal();
    map.setExpandedView(true);
    renderSelection();
    return true;
  }

  function closeMobileMap() {
    ui["map-dialog"].close();
  }

  function restoreInlineMap() {
    ui["map-slot"].append(ui["map-panel"]);
    ui["map-slot"].style.minHeight = "";
    map.setExpandedView(false);
    mapOpener?.focus({ preventScroll: true });
    mapOpener = null;
  }

  function syncMapButton() {
    const available = mobileMap.matches && typeof ui["map-dialog"].showModal === "function";
    ui["expand-map"].hidden = !available;
    if (available) ui["selection-status"].setAttribute("aria-haspopup", "dialog");
    else ui["selection-status"].removeAttribute("aria-haspopup");
  }

  function renderSelection() {
    const selected = active.mapId !== null;
    const hinted = active.practice?.map.status === "hint";
    ui["selection-status"].classList.toggle("selected", selected || hinted);
    ui["selection-icon"].setAttribute("href", selected || hinted ? "#i-check" : "#i-pin");
    ui["selection-text"].textContent = hinted
      ? "Смотреть подсказку на карте"
      : (selected ? "Страна выбрана" : "Выберите страну на карте");
    if (ui["map-dialog"].open) {
      ui["mobile-map-status"].textContent = hinted
        ? "Нужная страна выделена"
        : (selected ? "Страна выбрана" : "Коснитесь страны на карте");
    }
  }

  function renderAttempt(node, attempt, correctText, hintText) {
    const status = attempt?.status;
    const errors = attempt?.wrong.size ?? 0;
    node.classList.toggle("attempt-correct", status === "correct");
    node.classList.toggle("attempt-hint", status === "hint");
    node.hidden = !status && errors === 0;
    if (node.hidden) {
      node.textContent = "";
    } else if (status) {
      node.textContent = status === "correct" ? correctText : hintText;
    } else {
      const remaining = ATTEMPT_LIMIT - errors;
      node.textContent = remaining === 1 ? "Пока неверно. Осталась 1 попытка." : `Пока неверно. Осталось ${remaining} попытки.`;
    }
  }

  function renderFeedback(result, practice) {
    ui.feedback.hidden = !result;
    if (!result) return;

    const solved = practice.text.status === "correct" && practice.map.status === "correct";
    ui.feedback.classList.toggle("correct", solved);
    ui.feedback.replaceChildren(
      makeElement("p", "feedback-title", solved ? "Всё верно!" : "Задание завершено"),
    );
    if (result.country.note) {
      const note = makeElement("p", "feedback-note", `${result.country.note} `);
      if (result.country.noteUrl) {
        const source = makeElement("a", null, "Источник");
        source.href = result.country.noteUrl;
        source.target = "_blank";
        source.rel = "noopener noreferrer";
        note.append(source);
      }
      ui.feedback.append(note);
    }
  }

  function renderMap(question, animateHint) {
    const mapStatus = active.practice?.map.status;
    map.setEnabled(!mapStatus);
    if (animateHint) {
      map.setSelection(null);
      if (!openMobileMap(ui["check-answer"])) ui["map-surface"].scrollIntoView({ block: "center", behavior: "instant" });
      map.revealCountry(question.country.id);
    } else if (mapStatus) {
      const correct = question.country.id;
      map.setResult({ selected: mapStatus === "correct" ? correct : null, correct });
    } else {
      map.setSelection(active.mapId);
    }
  }

  function renderQuestion({ focus = false, updateMap = true, animateHint = false } = {}) {
    const question = active.session.current();
    ui.workspace.hidden = !question;
    ui.results.hidden = Boolean(question);
    if (!question) {
      renderResults();
      if (focus) ui["results-title"].focus();
      return;
    }

    const config = directions[direction];
    const isTest = mode === "test";
    const { result, practice } = active;
    const textHint = practice?.text.status === "hint";
    ui["question-number"].textContent = isTest ? `Вопрос ${question.index} из ${question.total}` : `Задание ${question.index}`;
    ui["mode-chip"].textContent = isTest ? "Контрольная" : "Тренажёр";
    ui["mode-chip"].classList.toggle("test", isTest);
    ui["test-progress"].hidden = !isTest;
    if (isTest) {
      ui["test-progress"].max = question.total;
      ui["test-progress"].value = question.index - 1;
    }
    ui["prompt-label"].textContent = config.promptLabel;
    ui.prompt.textContent = question.prompt;
    ui["text-label"].textContent = config.textLabel;
    ui.answer.placeholder = config.placeholder;
    ui.answer.value = textHint ? (direction === CAPITAL ? question.country.capital : question.country.name) : active.text;
    ui.answer.readOnly = Boolean(practice?.text.status);
    ui.answer.classList.toggle("answer-hint", textHint);
    ui["check-label"].textContent = isTest
      ? (question.index === question.total ? "Завершить контрольную" : "Сохранить и продолжить")
      : (result ? "Следующее задание" : "Проверить ответ");
    ui["skip-answer"].hidden = Boolean(result);
    ui["mode-note-title"].textContent = isTest ? "Все страны по одному разу" : "Адаптивное повторение";
    ui["mode-note-text"].textContent = isTest
      ? "Статистика и правильные ответы появятся после последнего вопроса."
      : "Страны, в которых вы ошибаетесь, будут попадаться чаще.";
    ui["mode-note-icon"].setAttribute("href", isTest ? "#i-clipboard" : "#i-repeat");
    if (updateMap) renderMap(question, animateHint);
    clearValidation();
    renderSelection();
    renderAttempt(ui["text-attempt"], practice?.text, "Название верно.", "Правильный ответ в поле.");
    renderAttempt(ui["map-attempt"], practice?.map, "Страна указана верно.", "Нужная страна выделена на карте.");
    renderFeedback(result, practice);
    if (focus) {
      ui.prompt.focus({ preventScroll: true });
      revealOnPhone(ui.prompt.closest(".task-panel"), "start");
    }
  }

  function selectSession() {
    clearMapHint();
    const key = `${mode}/${direction}`;
    if (!sessions.has(key)) {
      sessions.set(key, {
        session: AsiaQuiz.createSession({ mode, direction }),
        text: "", mapId: null, result: null, practice: mode === "training" ? newPractice() : null,
      });
    }
    active = sessions.get(key);
    renderQuestion();
  }

  function advance() {
    clearMapHint();
    active.session.next();
    active.result = null;
    active.text = "";
    active.mapId = null;
    if (active.practice) active.practice = newPractice();
    renderQuestion({ focus: true });
  }

  function clearMapHint() {
    map.clearHint();
    if (active?.practice?.map.status === "hint") map.resetView();
  }

  function newPractice() {
    return { text: { status: null, wrong: new Set() }, map: { status: null, wrong: new Set() } };
  }

  function checkAttempt(attempt, key, answer, correct) {
    if (attempt.status || !key || attempt.wrong.has(key)) return false;

    attempt.first ??= answer;
    if (correct) {
      attempt.status = "correct";
    } else {
      attempt.wrong.add(key);
      if (attempt.wrong.size === ATTEMPT_LIMIT) attempt.status = "hint";
    }
    return true;
  }

  function finishPractice() {
    const { text, map } = active.practice;
    active.result = active.session.submit({ text: text.first, mapId: map.first });
  }

  function submitPractice(skip) {
    const { text, map } = active.practice;
    if (skip) {
      const mapWasResolved = Boolean(map.status);
      text.status ??= "hint";
      map.status ??= "hint";
      finishPractice();
      renderQuestion({ updateMap: !mapWasResolved });
      ui["check-answer"].focus({ preventScroll: true });
      if (!mapWasResolved) revealOnPhone(ui["map-surface"]);
      return;
    }

    const answer = active.session.check({ text: active.text, mapId: active.mapId });
    const textChanged = checkAttempt(text, answer.textKey || answer.text, answer.text, answer.textCorrect);
    const mapChanged = checkAttempt(map, answer.mapId, answer.mapId, answer.mapCorrect);
    if (!textChanged && !mapChanged) {
      ui.validation.textContent = text.status ? "Укажите страну на карте."
        : (map.status ? "Введите новый вариант названия." : "Введите название или сделайте новый выбор на карте.");
      ui.validation.hidden = false;
      revealOnPhone(ui.validation);
      return;
    }

    if (text.status && map.status) finishPractice();
    const animateHint = mapChanged && map.status === "hint";
    renderQuestion({ updateMap: mapChanged && Boolean(map.status), animateHint });
    if (active.result && !ui["map-dialog"].open) ui["check-answer"].focus({ preventScroll: true });
    if (!animateHint) {
      if (textChanged && !active.result && (!mapChanged || map.status === "correct")) {
        revealOnPhone(ui["text-attempt"]);
      } else if (mapChanged) {
        revealOnPhone(ui["map-attempt"], "end");
      }
    }
  }

  function submitAnswer(skip = false) {
    if (active.result) {
      advance();
      return;
    }
    if (mode === "training") {
      submitPractice(skip);
      return;
    }

    const textMissing = !active.text.trim();
    const mapMissing = !active.mapId;
    if (!skip && (textMissing || mapMissing)) {
      const prompt = textMissing ? directions[direction].textLabel : ui["map-label"].textContent;
      ui.validation.textContent = `${prompt}.`;
      ui.validation.hidden = false;
      if (textMissing) ui.answer.setAttribute("aria-invalid", "true");
      if (mapMissing && !textMissing && openMobileMap(ui["check-answer"])) return;
      (textMissing ? ui.answer : ui["selection-status"]).focus();
      return;
    }

    active.session.submit(skip ? {} : { text: active.text, mapId: active.mapId });
    advance();
  }

  function resultMetric(value, label) {
    const metric = makeElement("div", "result-stat");
    metric.append(makeElement("strong", null, value), makeElement("span", null, label));
    return metric;
  }

  function reviewCell(label, contents) {
    const cell = makeElement("td");
    cell.setAttribute("role", "cell");
    const caption = makeElement("span", "review-label", label);
    caption.setAttribute("aria-hidden", "true");
    cell.append(caption, contents);
    return cell;
  }

  function resultCell(label, value, correct) {
    const content = makeElement("span", `cell-answer ${correct ? "ok" : "wrong"}`);
    const statusImage = icon(correct ? "check" : "close");
    const status = makeElement("span", "visually-hidden", correct ? "Верно. " : "Ошибка. ");
    content.append(statusImage, status, makeElement("span", null, value || "Пропуск"));
    return reviewCell(label, content);
  }

  function renderRows(rows) {
    const filtered = ui["errors-only"].checked ? rows.filter((row) => !row.correct) : rows;
    ui["empty-results"].hidden = filtered.length > 0;
    ui["result-rows"].replaceChildren(...filtered.map((row) => {
      const tr = makeElement("tr");
      tr.setAttribute("role", "row");
      tr.append(
        reviewCell("Страна", row.country.name),
        reviewCell("Столица", row.country.capital),
        resultCell("Ваш ответ", row.text, row.textCorrect),
        resultCell("Выбор на карте", countryById.get(row.mapId)?.name, row.mapCorrect),
      );
      return tr;
    }));
  }

  function renderResults() {
    const stats = active.session.stats();
    const percent = Math.round(stats.correct / stats.total * 100);
    ui["results-direction"].textContent = `${directions[direction].title} · ${percent}% полностью верных ответов`;
    ui["result-metrics"].replaceChildren(
      resultMetric(`${stats.correct} / ${stats.total}`, "Обе части верны"),
      resultMetric(`${stats.textCorrect} / ${stats.total}`, "Верные названия"),
      resultMetric(`${stats.mapCorrect} / ${stats.total}`, "Верно на карте"),
    );
    renderRows(stats.rows);
  }

  function openProgress() {
    ui["progress-summary"].replaceChildren(...Object.entries(directions).map(([key, config]) => {
      const { total, studied, mastered } = AsiaQuiz.mastery(key);
      const card = makeElement("section", "mastery");
      const progress = makeElement("progress");
      progress.max = total;
      progress.value = mastered;
      progress.setAttribute("aria-label", `Выучено: ${config.title}`);
      card.append(
        makeElement("h3", null, config.title),
        makeElement("p", null, `Встречались ${studied} из ${total} · Выучено ${mastered}`),
        progress,
      );
      return card;
    }));
    ui["progress-dialog"].showModal();
  }

  document.querySelectorAll(".toolbar input").forEach((input) => input.addEventListener("change", () => {
    if (!input.checked) return;
    if (input.name === "mode") mode = input.value;
    else direction = input.value;
    selectSession();
  }));
  ui.answer.addEventListener("input", () => {
    active.text = ui.answer.value;
    clearValidation();
  });
  ui["answer-form"].addEventListener("submit", (event) => {
    event.preventDefault();
    submitAnswer();
  });
  ui["skip-answer"].addEventListener("click", () => submitAnswer(true));
  ui["selection-status"].addEventListener("click", () => {
    if (openMobileMap(ui["selection-status"])) return;
    ui["map-surface"].scrollIntoView({ block: "center", behavior: "instant" });
    ui["map-surface"].querySelector('[tabindex="0"]')?.focus({ preventScroll: true });
  });
  ui["expand-map"].addEventListener("click", () => openMobileMap(ui["expand-map"]));
  ui["map-dialog"].addEventListener("close", restoreInlineMap);
  ui["close-map"].addEventListener("click", closeMobileMap);
  ui["finish-map"].addEventListener("click", closeMobileMap);
  mobileMap.addEventListener?.("change", syncMapButton);
  syncMapButton();
  byId("zoom-in").addEventListener("click", map.zoomIn);
  byId("zoom-out").addEventListener("click", map.zoomOut);
  byId("reset-map").addEventListener("click", map.resetView);
  byId("open-progress").addEventListener("click", openProgress);
  byId("restart-test").addEventListener("click", () => {
    sessions.delete(`${mode}/${direction}`);
    ui["errors-only"].checked = false;
    selectSession();
    ui.prompt.focus();
  });
  ui["errors-only"].addEventListener("change", () => renderRows(active.session.stats().rows));
  window.addEventListener("pageshow", () => {
    document.querySelector(`.toolbar [name="mode"][value="${mode}"]`).checked = true;
    document.querySelector(`.toolbar [name="direction"][value="${direction}"]`).checked = true;
  });

  selectSession();
})();
