(() => {
  "use strict";

  const STORAGE_KEY = "asia-trainer-progress-v1";
  const COUNTRY_TO_CAPITAL = "country-to-capital";
  const CAPITAL_TO_COUNTRY = "capital-to-country";
  const RECENT_QUESTIONS = 3;

  function entry(id, name, capital, options = {}) {
    const { countryAliases = [], capitalAliases = [], note, noteUrl } = options;
    return Object.freeze({
      id,
      name,
      capital,
      countryAliases: Object.freeze(countryAliases),
      capitalAliases: Object.freeze(capitalAliases),
      note,
      noteUrl,
    });
  }

  // UN M49 Asia countries, supplemented by Abkhazia and South Ossetia, which Russia recognizes.
  const countries = Object.freeze([
    entry("B35", "Абхазия", "Сухум", {
      countryAliases: ["Республика Абхазия", "Апсны"],
      capitalAliases: ["Сухуми", "Акуа", "Аҟуа"],
      note: "Россия признала независимость Абхазии в 2008 году.",
      noteUrl: "https://www.kdmid.ru/docs/abkhazia/information-about-the-country",
    }),
    entry("AZE", "Азербайджан", "Баку", { countryAliases: ["Азербайджанская Республика"] }),
    entry("ARM", "Армения", "Ереван", { countryAliases: ["Республика Армения"] }),
    entry("AFG", "Афганистан", "Кабул"),
    entry("BGD", "Бангладеш", "Дакка", { countryAliases: ["Народная Республика Бангладеш"] }),
    entry("BHR", "Бахрейн", "Манама", { countryAliases: ["Королевство Бахрейн"] }),
    entry("BRN", "Бруней", "Бандар-Сери-Бегаван", { countryAliases: ["Бруней-Даруссалам"] }),
    entry("BTN", "Бутан", "Тхимпху", { countryAliases: ["Королевство Бутан"], capitalAliases: ["Тхимпу", "Тимпху"] }),
    entry("TLS", "Восточный Тимор", "Дили", {
      countryAliases: ["Тимор-Лешти", "Тимор-Лесте", "Демократическая Республика Тимор-Лешти", "Демократическая Республика Восточный Тимор"],
    }),
    entry("VNM", "Вьетнам", "Ханой", { countryAliases: ["Социалистическая Республика Вьетнам"] }),
    entry("GEO", "Грузия", "Тбилиси", { countryAliases: ["Сакартвело"] }),
    entry("ISR", "Израиль", "Иерусалим", {
      countryAliases: ["Государство Израиль"],
      capitalAliases: ["Западный Иерусалим", "Йерусалим"],
      note: "Израиль объявил Иерусалим своей столицей. Статус Восточного Иерусалима остаётся предметом спора.",
      noteUrl: "https://www.un.org/unispal/permanent-status-issues/",
    }),
    entry("IND", "Индия", "Нью-Дели", { countryAliases: ["Республика Индия", "Бхарат"] }),
    entry("IDN", "Индонезия", "Джакарта", {
      countryAliases: ["Республика Индонезия"],
      note: "Джакарта остаётся столицей до официального переноса в Нусантару.",
      noteUrl: "https://inp.polri.go.id/artikel/jakarta-remains-national-capital-pending-presidential-decree-constitutional-court",
    }),
    entry("JOR", "Иордания", "Амман", { countryAliases: ["Иорданское Хашимитское Королевство"] }),
    entry("IRQ", "Ирак", "Багдад", { countryAliases: ["Республика Ирак"] }),
    entry("IRN", "Иран", "Тегеран", { countryAliases: ["Исламская Республика Иран"] }),
    entry("YEM", "Йемен", "Сана", {
      countryAliases: ["Йеменская Республика", "Емен"],
      capitalAliases: ["Санаа"],
      note: "Сана — официальная столица. Правительство Йемена использует Аден как временную столицу.",
      noteUrl: "https://www.sabanew.net/viewstory/154204",
    }),
    entry("KAZ", "Казахстан", "Астана", {
      countryAliases: ["Республика Казахстан", "РК"],
      note: "В 2022 году городу вернули название Астана.",
      noteUrl: "https://www.gov.kz/org/mfa-pretoria/press/news/details/429981?lang=ru",
    }),
    entry("KHM", "Камбоджа", "Пномпень", { countryAliases: ["Королевство Камбоджа"] }),
    entry("QAT", "Катар", "Доха", { countryAliases: ["Государство Катар"] }),
    entry("CYP", "Кипр", "Никосия", { countryAliases: ["Республика Кипр"], capitalAliases: ["Лефкосия", "Левкосия"] }),
    entry("CHN", "Китай", "Пекин", {
      countryAliases: ["КНР", "Китайская Народная Республика"],
      capitalAliases: ["Бэйцзин", "Бейцзин"],
    }),
    entry("KWT", "Кувейт", "Эль-Кувейт", {
      countryAliases: ["Государство Кувейт"],
      capitalAliases: ["Кувейт", "Кувейт-Сити", "Аль-Кувейт"],
    }),
    entry("KGZ", "Кыргызстан", "Бишкек", {
      countryAliases: ["Киргизия", "Киргизстан", "Кыргызская Республика", "Киргизская Республика"],
    }),
    entry("LAO", "Лаос", "Вьентьян", { countryAliases: ["ЛНДР", "Лаосская Народно-Демократическая Республика"] }),
    entry("LBN", "Ливан", "Бейрут", { countryAliases: ["Ливанская Республика"] }),
    entry("MYS", "Малайзия", "Куала-Лумпур", {
      note: "Куала-Лумпур — официальная столица. Путраджая — федеральный административный центр.",
      noteUrl: "https://www.kln.gov.my/web/fin_helsinki/post/federal-territory-day-hari-wilayah-persekutuan",
    }),
    entry("MDV", "Мальдивы", "Мале", { countryAliases: ["Мальдивская Республика", "Мальдивские острова"] }),
    entry("MNG", "Монголия", "Улан-Батор", { capitalAliases: ["Улаанбаатар", "Уланбаатар"] }),
    entry("MMR", "Мьянма", "Нейпьидо", {
      countryAliases: ["Бирма", "Союз Мьянма", "Республика Союз Мьянма"],
      capitalAliases: ["Нейпидо", "Найпьидо", "Найпидо", "Нэйпьидо", "Нэйпидо"],
    }),
    entry("NPL", "Непал", "Катманду", { countryAliases: ["Федеративная Демократическая Республика Непал"], capitalAliases: ["Катманду́"] }),
    entry("ARE", "Объединённые Арабские Эмираты", "Абу-Даби", { countryAliases: ["ОАЭ", "Арабские Эмираты", "Эмираты"] }),
    entry("OMN", "Оман", "Маскат", { countryAliases: ["Султанат Оман"] }),
    entry("PAK", "Пакистан", "Исламабад", { countryAliases: ["Исламская Республика Пакистан"] }),
    entry("PSE", "Палестина", "Восточный Иерусалим", {
      countryAliases: ["Государство Палестина"],
      capitalAliases: ["Рамалла", "Рамаллах"],
      note: "Палестина считает Восточный Иерусалим своей столицей. В Рамалле находится административный центр.",
      noteUrl: "https://data.un.org/legacy/en/iso/ps.html",
    }),
    entry("SAU", "Саудовская Аравия", "Эр-Рияд", {
      countryAliases: ["Королевство Саудовская Аравия", "КСА"],
      capitalAliases: ["Рияд", "Ар-Рияд"],
    }),
    entry("PRK", "Северная Корея", "Пхеньян", { countryAliases: ["КНДР", "Корейская Народно-Демократическая Республика"] }),
    entry("SGP", "Сингапур", "Сингапур", { countryAliases: ["Республика Сингапур"] }),
    entry("SYR", "Сирия", "Дамаск", { countryAliases: ["Сирийская Арабская Республика"] }),
    entry("TJK", "Таджикистан", "Душанбе", { countryAliases: ["Республика Таджикистан"] }),
    entry("THA", "Таиланд", "Бангкок", {
      countryAliases: ["Тайланд", "Королевство Таиланд"],
      capitalAliases: ["Крунгтеп", "Крунгтеп Маханакхон", "Крунг Тхеп Маха Накхон"],
    }),
    entry("TKM", "Туркменистан", "Ашхабад", { countryAliases: ["Туркмения"], capitalAliases: ["Ашгабат"] }),
    entry("TUR", "Турция", "Анкара", { countryAliases: ["Турецкая Республика", "Тюркие"] }),
    entry("UZB", "Узбекистан", "Ташкент", { countryAliases: ["Республика Узбекистан"] }),
    entry("PHL", "Филиппины", "Манила", { countryAliases: ["Республика Филиппины", "Филиппинские острова"] }),
    entry("LKA", "Шри-Ланка", "Шри-Джаяварденепура-Котте", {
      countryAliases: ["Демократическая Социалистическая Республика Шри-Ланка"],
      capitalAliases: ["Шри-Джаяварденепура", "Шри-Джаяварданапура-Котте", "Котте", "Коломбо"],
      note: "Парламент находится в Шри-Джаяварденепура-Котте. Коломбо остаётся центром исполнительной и судебной власти.",
      noteUrl: "https://www.emb-havana.gov.lk/en/sri-lanka-profile",
    }),
    entry("KOR", "Южная Корея", "Сеул", { countryAliases: ["Республика Корея"] }),
    entry("B37", "Южная Осетия", "Цхинвал", {
      countryAliases: ["Республика Южная Осетия", "Государство Алания", "РЮО"],
      capitalAliases: ["Цхинвали"],
      note: "Россия признала независимость Южной Осетии в 2008 году.",
      noteUrl: "https://www.kdmid.ru/docs/south-ossetia/information-about-the-country/",
    }),
    entry("JPN", "Япония", "Токио"),
  ]);

  const countriesById = new Map(countries.map((country) => [country.id, country]));
  let volatileProgress = null;

  function normalize(value) {
    return value
      .normalize("NFC")
      .toLowerCase()
      .replaceAll("ё", "е")
      .replace(/[^\p{L}\p{N}]/gu, "");
  }

  function searchCountries(value) {
    const term = normalize(value);
    if (!term) return { exact: null, matches: [] };
    const matches = [];
    let exact = null;
    for (const country of countries) {
      const names = [country.name, ...country.countryAliases].map(normalize);
      if (names.includes(term)) exact = country;
      else if (names.some(name => name.includes(term))) matches.push(country);
    }
    return { exact, matches: exact ? [exact, ...matches] : matches };
  }

  function readProgress() {
    if (volatileProgress) return volatileProgress;

    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
      return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
    } catch {
      return {};
    }
  }

  function readDirection(progress, direction) {
    const saved = progress[direction];
    return {
      round: Number.isSafeInteger(saved?.round) && saved.round >= 0 ? saved.round : 0,
      cards: saved?.cards && typeof saved.cards === "object" ? saved.cards : {},
    };
  }

  function readCard(cards, id) {
    const card = cards[id];
    if (!card || !Number.isFinite(card.strength) || card.strength < 0 || card.strength > 1) return null;

    return {
      strength: card.strength,
      streak: Number.isSafeInteger(card.streak) && card.streak >= 0 ? card.streak : 0,
      lastRound: Number.isSafeInteger(card.lastRound) && card.lastRound >= 0 ? card.lastRound : 0,
    };
  }

  function recordPractice(direction, result) {
    const progress = readProgress();
    const history = readDirection(progress, direction);
    const previous = readCard(history.cards, result.country.id);
    const score = result.correct ? 1 : result.textCorrect || result.mapCorrect ? 0.35 : 0;

    history.round += 1;
    history.cards[result.country.id] = {
      strength: previous ? previous.strength * 0.45 + score * 0.55 : score,
      streak: result.correct ? (previous?.streak ?? 0) + 1 : 0,
      lastRound: history.round,
    };
    progress[direction] = history;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      volatileProgress = null;
    } catch {
      volatileProgress = progress;
    }
  }

  function mastery(direction = COUNTRY_TO_CAPITAL) {
    const history = readDirection(readProgress(), direction);
    const studied = countries.map(({ id }) => readCard(history.cards, id)).filter(Boolean);
    return {
      studied: studied.length,
      mastered: studied.filter(({ streak }) => streak >= 2).length,
      total: countries.length,
    };
  }

  function shuffledCountries(random) {
    const order = [...countries];
    for (let index = order.length - 1; index > 0; index -= 1) {
      const other = Math.floor(random() * (index + 1));
      [order[index], order[other]] = [order[other], order[index]];
    }
    return order;
  }

  function choosePracticeCountry(direction, recent, random) {
    const history = readDirection(readProgress(), direction);
    const candidates = countries.filter(({ id }) => !recent.includes(id));
    const weights = candidates.map(({ id }) => {
      const card = readCard(history.cards, id);
      if (!card) return 4.6;

      const roundsSincePractice = Math.max(0, history.round - card.lastRound);
      const reviewWeight = Math.min(1.8, Math.sqrt(roundsSincePractice / 35));
      return 0.75 + 7 * (1 - card.strength) + reviewWeight;
    });

    let sample = random() * weights.reduce((sum, weight) => sum + weight, 0);
    for (const [index, country] of candidates.entries()) {
      sample -= weights[index];
      if (sample < 0) return country;
    }
    return candidates.at(-1);
  }

  function createSession({ mode = "training", direction = COUNTRY_TO_CAPITAL, random = Math.random } = {}) {
    if (mode !== "training" && mode !== "test") throw new RangeError("Unknown quiz mode");
    if (direction !== COUNTRY_TO_CAPITAL && direction !== CAPITAL_TO_COUNTRY) {
      throw new RangeError("Unknown quiz direction");
    }

    const isTraining = mode === "training";
    const asksCapital = direction === COUNTRY_TO_CAPITAL;
    const testOrder = isTraining ? [] : shuffledCountries(random);
    const recent = [];
    const rows = [];
    let question = selectQuestion();
    let result = null;

    function selectQuestion() {
      const country = isTraining
        ? choosePracticeCountry(direction, recent, random)
        : testOrder[rows.length];
      if (!country) return null;

      return Object.freeze({
        country,
        prompt: asksCapital ? country.name : country.capital,
        index: rows.length + 1,
        total: isTraining ? null : testOrder.length,
      });
    }

    function check({ text = "", mapId = null } = {}) {
      if (!question) return null;

      const { country, prompt } = question;
      const expected = asksCapital ? country.capital : country.name;
      const aliases = asksCapital ? country.capitalAliases : country.countryAliases;
      const answer = String(text ?? "").trim();
      const answerWithoutCityPrefix = asksCapital ? answer.replace(/^(?:г\.|город\s+)\s*/iu, "") : answer;
      const normalized = normalize(answerWithoutCityPrefix);
      const textCorrect = [expected, ...aliases].some((name) => normalize(name) === normalized);
      const mapCorrect = mapId === country.id;

      return Object.freeze({
        country,
        prompt,
        expected,
        text: answer,
        textKey: normalized,
        mapId: countriesById.has(mapId) ? mapId : null,
        textCorrect,
        mapCorrect,
        correct: textCorrect && mapCorrect,
      });
    }

    function submit(answer) {
      if (!question || result) return result;

      result = check(answer);
      rows.push(result);

      if (isTraining) {
        recordPractice(direction, result);
        recent.push(result.country.id);
        if (recent.length > RECENT_QUESTIONS) recent.shift();
      }
      return result;
    }

    function next() {
      if (!result) return question;

      question = selectQuestion();
      result = null;
      return question;
    }

    function stats() {
      return {
        total: isTraining ? rows.length : testOrder.length,
        answered: rows.length,
        correct: rows.filter((row) => row.correct).length,
        textCorrect: rows.filter((row) => row.textCorrect).length,
        mapCorrect: rows.filter((row) => row.mapCorrect).length,
        rows: [...rows],
      };
    }

    return Object.freeze({ current: () => question, check, submit, next, stats });
  }

  window.AsiaQuiz = Object.freeze({ countries, createSession, mastery, searchCountries });
})();
