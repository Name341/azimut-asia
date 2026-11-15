(() => {
  "use strict";

  const { AsiaQuiz, AsiaMap } = window;
  if (!AsiaQuiz || !AsiaMap) return;

  const byId = id => document.getElementById(id);
  const practiceTab = byId("show-practice");
  const theoryTab = byId("show-theory");
  const practiceView = byId("practice-view");
  const theoryView = byId("theory-view");
  const query = byId("theory-query");
  const matchesList = byId("theory-matches");
  const status = byId("theory-status");
  const result = byId("theory-result");
  const name = byId("theory-country");
  const capital = byId("theory-capital");
  const note = byId("theory-note");
  const countries = new Map(AsiaQuiz.countries.map(country => [country.id, country]));
  let map;
  let selected;

  function showView(inTheory) {
    practiceView.hidden = inTheory;
    theoryView.hidden = !inTheory;
    practiceTab.setAttribute("aria-pressed", String(!inTheory));
    theoryTab.setAttribute("aria-pressed", String(inTheory));
    if (inTheory && !map) {
      map = AsiaMap.mount(byId("theory-map"), [...countries.keys()], id => selectCountry(countries.get(id), { fillQuery: true }));
    }
  }

  function showStatus(message = "") {
    status.textContent = message;
    status.hidden = !message;
  }

  function renderMatches(candidates = []) {
    matchesList.replaceChildren(...candidates.slice(0, 8).map(country => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.country = country.id;
      button.textContent = country.name;
      item.append(button);
      return item;
    }));
    matchesList.hidden = !candidates.length;
  }

  function selectCountry(country, { frameMap = false, fillQuery = false } = {}) {
    const changed = selected !== country.id;
    selected = country.id;
    if (fillQuery) query.value = country.name;
    renderMatches();
    showStatus();
    if (changed) {
      name.textContent = country.name;
      capital.textContent = country.capital;
      note.textContent = country.note ?? "";
      note.hidden = !country.note;
      if (country.noteUrl) {
        const source = document.createElement("a");
        source.href = country.noteUrl;
        source.target = "_blank";
        source.rel = "noopener noreferrer";
        source.textContent = "Источник";
        note.append(" ", source);
      }
      result.hidden = false;
    }
    if (frameMap) map.showCountry(country.id);
  }

  function updateSearch(submitted = false) {
    const value = query.value.trim();
    const { exact, matches } = AsiaQuiz.searchCountries(value);
    const match = exact ?? (submitted && matches.length === 1 ? matches[0] : null);
    if (match) {
      if (match.id !== selected || submitted) selectCountry(match, { frameMap: true, fillQuery: submitted });
      if (submitted && window.matchMedia("(pointer: coarse)").matches) query.blur();
      return;
    }

    if (selected) map.setSelection(null);
    selected = null;
    result.hidden = true;
    renderMatches(matches);
    if (!value) {
      map.resetView();
      showStatus(submitted ? "Введите название страны." : "");
    } else if (matches.length) {
      showStatus(submitted ? "Уточните название или выберите страну из списка." : "");
    } else {
      showStatus("Страна не найдена. Проверьте название.");
    }
  }

  practiceTab.addEventListener("click", () => showView(false));
  theoryTab.addEventListener("click", () => showView(true));
  query.addEventListener("input", event => {
    if (!event.isComposing) updateSearch();
  });
  query.addEventListener("compositionend", () => updateSearch());
  query.addEventListener("keydown", event => {
    const suggestion = matchesList.querySelector("button");
    if (event.key !== "ArrowDown" || !suggestion) return;
    event.preventDefault();
    suggestion.focus();
  });
  byId("theory-search").addEventListener("submit", event => {
    event.preventDefault();
    updateSearch(true);
  });
  matchesList.addEventListener("click", event => {
    const option = event.target.closest("button[data-country]");
    if (!option) return;
    if (event.detail === 0) query.focus({ preventScroll: true });
    selectCountry(countries.get(option.dataset.country), { frameMap: true, fillQuery: true });
  });
  byId("theory-zoom-in").addEventListener("click", () => map.zoomIn());
  byId("theory-zoom-out").addEventListener("click", () => map.zoomOut());
  byId("theory-reset-map").addEventListener("click", () => map.resetView());
})();
