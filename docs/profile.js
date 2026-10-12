export const denominations = {
  baptist: "Baptist",
  reformed: "Reformed / Presbyterian",
  methodist: "Methodist / Wesleyan",
  lutheran: "Lutheran",
  anglican: "Anglican",
  pentecostal: "Pentecostal",
  catholic: "Roman Catholic",
  nondenominational: "Nondenominational",
  other: "Other / custom",
};
export const statements = {
  custom: {
    name: "My church’s statement of faith",
    denomination: "other",
    summary:
      "Use the church’s supplied statement as the doctrinal reference. Do not infer beliefs that are not supplied.",
  },
  bfm2000: {
    name: "Baptist Faith and Message (2000)",
    denomination: "baptist",
    summary:
      "Baptist working baseline: Scripture as doctrinal authority; the Trinity; Christ’s deity, humanity, atoning death and bodily resurrection; salvation by grace through faith; believer’s baptism. Distinguish human response from earning salvation. This summary does not reproduce the full statement.",
  },
  london1689: {
    name: "Second London Baptist Confession (1689)",
    denomination: "baptist",
    summary:
      "Confessional Reformed Baptist working baseline: scriptural authority, the Trinity, Christ’s sufficient saving work, salvation by grace, divine initiative and election, perseverance, and believer’s baptism. Do not penalize simple professions of deciding to follow Christ solely for describing a human response.",
  },
  newhampshire: {
    name: "New Hampshire Confession (1833)",
    denomination: "baptist",
    summary:
      "Baptist working baseline: scriptural authority, the Trinity, justification through faith, grace and regeneration, the necessity of repentance and faith, and believer’s baptism.",
  },
  westminster: {
    name: "Westminster Confession of Faith",
    denomination: "reformed",
    summary:
      "Confessional Reformed working baseline: scriptural authority, the Trinity, sovereign grace, justification through faith, divine election, covenant theology and perseverance. Do not apply Baptist-specific baptismal objections as if they were this profile’s convictions.",
  },
  methodist: {
    name: "Methodist Articles of Religion",
    denomination: "methodist",
    summary:
      "Methodist working baseline: the Trinity, Christ’s saving work, justification through faith, grace-enabled human response and holiness of life. Evaluate claims against the selected church’s understanding of grace and sanctification.",
  },
  augsburg: {
    name: "Augsburg Confession",
    denomination: "lutheran",
    summary:
      "Lutheran working baseline: the Trinity, justification by grace through faith, Christ’s saving work, and the importance of word and sacrament. Do not apply Baptist sacramental assumptions automatically.",
  },
  articles39: {
    name: "Thirty-Nine Articles",
    denomination: "anglican",
    summary:
      "Anglican working baseline: the Trinity, the sufficiency of Scripture for salvation, justification through faith, and the selected church’s understanding of the sacraments.",
  },
  ag16: {
    name: "Assemblies of God: 16 Fundamental Truths",
    denomination: "pentecostal",
    summary:
      "Assemblies of God working baseline: biblical authority, the Trinity, salvation through Christ, holiness, the work of the Holy Spirit and continuation of spiritual gifts. Distinguish prayer for healing from a guarantee of wealth or freedom from suffering.",
  },
  nicene: {
    name: "Nicene Creed",
    denomination: "all",
    summary:
      "Ecumenical creedal working baseline: one God, the Trinity, Jesus Christ truly divine and incarnate, his death and resurrection, his return, and the life to come. A creed alone does not settle every denominational or sacramental question.",
  },
  apostles: {
    name: "Apostles’ Creed",
    denomination: "all",
    summary:
      "Ecumenical creedal working baseline: Father, Son and Holy Spirit; Christ’s incarnation, death, resurrection and return; the church, forgiveness and resurrection hope. A creed alone does not settle every denominational question.",
  },
};
export const aiModes = {
  manual: {
    title: "Human reviews only",
    description:
      "Show your reviews and editorial catalog notes. Hide AI drafts and assistance; send no AI requests.",
  },
  limited: {
    title: "AI observations only",
    description:
      "Show text and arrangement assistance. Hide AI theological ratings and recommendations; keep your own assessment.",
  },
  full: {
    title: "Full AI content",
    description:
      "Show AI draft song assessments and ratings alongside your own reviews. Applying a draft and approving a song remain your decisions. Worship plans are built by you.",
  },
};
const editorialPrinciples =
  "Distinguish doctrinal error from lack of theological substance. Value specific claims, clear English and coherent sentences. Assess filler uses of “just” in context. Evaluate repetition, wordless vocals and instrumental breaks by purpose and arrangement evidence. Do not infer musical range or difficult intervals from lyrics alone. Discuss soteriology only when an explicit salvation claim is a major part of the song; ordinary devotion does not require that debate. Include Scripture only for specific quotations or clear textual allusions, with chapter and verse; omit broad topical parallels.";

export function composePrinciples(statement, customStatement = "") {
  return `${statements[statement]?.summary || statements.custom.summary}\n${customStatement.trim() ? `Additional church convictions: ${customStatement.trim()}\n` : ""}${editorialPrinciples}`;
}
export function withProfileDefaults(profile) {
  return {
    ...profile,
    denomination: profile.denomination || "baptist",
    statement: profile.statement || "bfm2000",
    customStatement: profile.customStatement || "",
    aiMode: profile.aiMode || "full",
    aiLabels: profile.aiLabels !== false,
    setupComplete: Boolean(profile.setupComplete),
  };
}
export function reviewForDisplay(song, mode = "full") {
  if (mode === "full") return song.review;
  const raw = song.review;
  let base = raw;
  if (raw.status === "ai") {
    base =
      raw.previous && ["manual", "starter"].includes(raw.previous.status)
        ? raw.previous
        : song.catalogReview?.status !== "ai"
          ? song.catalogReview
          : null;
    base ||= {
      scores: { accuracy: null, substance: null, language: null, time: null },
      status: "unreviewed",
      concern: "none",
      summary: "No human assessment yet.",
      claims: [],
      concerns: [],
      uses: [],
      scriptures: [],
      sources: [],
      language: "",
      time: "",
    };
  }
  const result = {
    ...base,
    notes: raw.notes,
    musical: raw.musical,
    key: raw.key,
    minutes: raw.minutes,
  };
  for (const field of base.aiFields || []) {
    if (field === "scores")
      result.scores = {
        accuracy: null,
        substance: null,
        language: null,
        time: null,
      };
    else if (
      ["claims", "concerns", "uses", "scriptures", "themes"].includes(field)
    )
      result[field] = [];
    else result[field] = "";
  }
  if (mode === "manual") delete result.assistance;
  else if (raw.assistance) result.assistance = raw.assistance;
  return result;
}
export function themesForDisplay(song, mode = "full") {
  if (song.metadata?.themes) return song.metadata.themes;
  return mode !== "full" &&
    (song.review.status === "ai" || song.review.aiFields?.includes("themes"))
    ? song.catalogReview?.status === "ai"
      ? []
      : song.catalogThemes || []
    : song.themes;
}
export function restrictAssistance(review, mode) {
  if (mode !== "limited") return review;
  return {
    ...review,
    scores: { accuracy: null, substance: null, language: null, time: null },
    claims: [],
    concerns: [],
    scriptures: [],
    themes: [],
    uses: [],
    concern: "none",
  };
}
