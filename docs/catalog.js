import {enrichCatalogEvaluation} from "./catalog-analysis.js";
import { prewrittenReview } from "./prewritten-reviews.js";
import { modernCatalog } from "./modern-catalog.js";
import { expandedCatalog, newStarterTitles } from "./expanded-catalog.js";
import { artistCatalog } from "./artist-catalog.js";
import { seedSongs } from "./seeds.js";
import { additionalSongs, mixedStarterTitles } from "./repertoire-data.js";
import { overall, normalize } from "./core.js";
import { withProfileDefaults } from "./profile.js";
import { reviewForDisplay } from "./profile.js";
import { humanFirst } from "./song-state.js";
import { catalogRecordings } from "./catalog-recordings.js";

const additions = [
  [
    "come-thou-fount",
    "Come, Thou Fount of Every Blessing",
    "Robert Robinson",
    "Come, Thou Fount of every blessing",
    "NETTLETON",
    ["Grace", "Dependence", "Perseverance"],
    9,
    9,
    8,
    "A prayer that credits God with the source of praise and acknowledges the believer’s tendency to wander. Explain unfamiliar imagery rather than treating its vocabulary as empty language.",
    [
      "God is the source of blessing and worthy of praise.",
      "The believer depends on grace rather than personal resolve alone.",
      "Human hearts are prone to wander and need God’s preserving care.",
    ],
    ["Opening praise", "Confession", "Response"],
    [
      "1 Samuel 7:12 — allusion: Ebenezer as a memorial of God’s help.",
      "Jude 24–25 — thematic connection: God’s preserving care.",
    ],
    "Its prayer develops across the verses. “Ebenezer” needs explanation; it is a specific biblical image, not filler.",
    ["Select the exact text: some editions revise the final stanza."],
  ],
  [
    "all-creatures",
    "All Creatures of Our God and King",
    "Francis of Assisi · English adaptation: William H. Draper",
    "All creatures of our God and King",
    "LASST UNS ERFREUEN",
    ["Creation", "Adoration", "Trinity"],
    9,
    8,
    8,
    "Invites creation and the church to praise their Creator. Its recurring alleluias function as praise, but the number of verses and extended repetitions should serve the congregation.",
    [
      "Creation owes praise to God.",
      "Human worship belongs within the wider praise of creation.",
      "Traditional concluding verses confess the Trinity.",
    ],
    ["Opening praise", "Creation emphasis"],
    [
      "Psalm 148 — thematic connection: all creation called to praise.",
      "Revelation 5:13 — thematic connection: universal worship.",
    ],
    "Personification is purposeful poetry. “Alleluia” means praise the Lord, so it should not be classified as meaningless wordless singing.",
    [
      "Translations and selected verses differ; verify the Trinitarian ending you intend to sing.",
    ],
  ],
  [
    "great-faithfulness",
    "Great Is Thy Faithfulness",
    "Thomas O. Chisholm · music: William M. Runyan",
    "Great is Thy faithfulness, O God my Father",
    "FAITHFULNESS",
    ["Faithfulness", "Providence", "Assurance"],
    9,
    9,
    8,
    "Develops God’s faithfulness through creation, forgiveness, provision and future hope. The specific examples offer more substance than an undeveloped statement that God is faithful.",
    [
      "God’s mercy and faithfulness endure.",
      "Creation witnesses to God’s ordered provision.",
      "God grants pardon, presence and hope.",
    ],
    ["Assurance", "Thanksgiving", "Response"],
    [
      "Lamentations 3:22–23 — clear allusion: renewed mercies and great faithfulness.",
      "James 1:17 — thematic connection: God’s constancy.",
    ],
    "Complete poetic statements develop a consistent theme. Archaic pronouns may affect accessibility without making the English incorrect.",
    [],
  ],
  [
    "firm-foundation",
    "How Firm a Foundation",
    "Attributed to “K” · published in John Rippon’s collection",
    "How firm a foundation, ye saints of the Lord",
    "FOUNDATION",
    ["Scripture", "Assurance", "Perseverance"],
    9,
    9,
    8,
    "Grounds confidence in God’s promises and sustaining presence through trials. Several stanzas speak in God’s voice, so make the scriptural basis clear.",
    [
      "God’s promises provide a firm foundation for believers.",
      "God sustains his people through fear and trial.",
      "God does not abandon those who trust him.",
    ],
    ["Assurance", "Preparation for sermon", "Sending"],
    [
      "Isaiah 41:10 — clear allusion: fear not and divine help.",
      "Isaiah 43:2 — clear allusion: waters and fire.",
    ],
    "Well-structured promises with a clear progression. The change to first-person divine speech is intentional, but should be understood by the congregation.",
    [
      "The original author’s identity is uncertain; avoid assigning a definite author without evidence.",
    ],
  ],
  [
    "it-is-well",
    "It Is Well with My Soul",
    "Horatio G. Spafford · music: Philip P. Bliss",
    "When peace like a river attendeth my way",
    "VILLE DU HAVRE",
    ["Assurance", "Atonement", "Future hope"],
    9,
    9,
    8,
    "Moves from peace amid suffering to forgiveness through Christ and the hope of his return. Selecting only the familiar refrain loses much of the hymn’s theological development.",
    [
      "Christ’s atonement addresses the whole burden of sin.",
      "Faith can rest in God amid suffering.",
      "The believer hopes for Christ’s return.",
    ],
    ["Assurance", "Lament", "Response"],
    [
      "Colossians 2:13–14 — allusion: the debt of sin dealt with at the cross.",
      "1 Thessalonians 4:16–17 — thematic connection: Christ’s return.",
    ],
    "Strong images and connected stanzas. “It is well” expresses faith amid grief rather than a promise that circumstances are painless.",
    [
      "Retain the atonement and future-hope verses when those are central to the service.",
    ],
  ],
  [
    "jesus-paid",
    "Jesus Paid It All",
    "Elvina M. Hall · music: John T. Grape",
    "I hear the Savior say",
    "ALL TO CHRIST",
    ["Atonement", "Grace", "Dependence"],
    9,
    8,
    8,
    "Confesses dependence on Christ’s saving work and rejects self-sufficiency. Modern added bridges need their own review and arrangement assessment.",
    [
      "Human strength is insufficient for salvation.",
      "Christ’s saving work is sufficient.",
      "Forgiveness and cleansing come through Christ.",
    ],
    ["Response", "Assurance", "Communion"],
    [
      "Isaiah 1:18 — clear allusion: sin made white as snow.",
      "Hebrews 10:14 — thematic connection: Christ’s sufficient sacrifice.",
    ],
    "The refrain is a concise confession rather than an explanation of every aspect of atonement. The verses provide the context.",
    [
      "Do not assume an added contemporary bridge belongs to Hall’s original text.",
    ],
  ],
  [
    "and-can-it-be",
    "And Can It Be That I Should Gain",
    "Charles Wesley · traditional tune: Thomas Campbell",
    "And can it be that I should gain",
    "SAGINA",
    ["Grace", "Atonement", "Assurance"],
    9,
    9,
    8,
    "A developed testimony of undeserved grace, liberation and assurance. Interpret its incarnation language with care.",
    [
      "Christ died for undeserving sinners.",
      "God’s initiative brings liberation from sin.",
      "Believers have confidence through Christ.",
    ],
    ["Opening praise", "Assurance", "Response"],
    [
      "Romans 8:1 — clear allusion: no condemnation.",
      "Acts 12:7 — imagery connection: chains falling away.",
      "Hebrews 4:16 — allusion: approaching the throne with confidence.",
    ],
    "Connected rhetorical questions and testimony build an argument. Older vocabulary may need teaching before a first use.",
    [
      "“Emptied himself” language should be understood through Philippians 2:6–8, not as a denial of Christ’s deity.",
    ],
  ],
  [
    "when-i-survey",
    "When I Survey the Wondrous Cross",
    "Isaac Watts · traditional tune: Lowell Mason",
    "When I survey the wondrous cross",
    "HAMBURG · other tunes exist",
    ["Cross", "Humility", "Devotion"],
    9,
    9,
    9,
    "A sustained reflection on the cross that moves from rejecting pride to a response of whole-life devotion. Metaphors develop a coherent theological and devotional point.",
    [
      "Christ’s cross overturns human boasting.",
      "Christ’s suffering reveals divine love.",
      "The fitting response is complete devotion to Christ.",
    ],
    ["Communion", "Good Friday", "Response"],
    [
      "Galatians 6:14 — clear allusion: boasting only in the cross.",
      "Romans 12:1 — thematic connection: whole-life response.",
    ],
    "Carefully structured stanzas with substantial imagery and little conversational padding.",
    [],
  ],
  [
    "mighty-fortress",
    "A Mighty Fortress Is Our God",
    "Martin Luther · English translation varies",
    "A mighty fortress is our God",
    "EIN FESTE BURG",
    ["Spiritual warfare", "Assurance", "Sovereignty"],
    9,
    9,
    7,
    "Confesses confidence in God and Christ in the face of evil. Its martial imagery describes spiritual conflict, not a guarantee of political or material victory.",
    [
      "God is the refuge of his people.",
      "Christ is the decisive champion against evil.",
      "God’s word and kingdom endure beyond earthly loss.",
    ],
    ["Assurance", "Reformation emphasis", "Sending"],
    [
      "Psalm 46 — thematic foundation: God as refuge.",
      "Ephesians 6:10–18 — thematic connection: spiritual warfare.",
    ],
    "A strong argument expressed through older idioms. Translation choice affects clarity and sentence structure significantly.",
    [
      "Review the exact translation and its treatment of God’s word, Spirit and kingdom.",
    ],
  ],
  [
    "crown-him",
    "Crown Him with Many Crowns",
    "Matthew Bridges and Godfrey Thring · music: George J. Elvey",
    "Crown Him with many crowns",
    "DIADEMATA",
    ["Kingship", "Resurrection", "Adoration"],
    9,
    9,
    8,
    "Praises Christ’s kingship through several specific dimensions of his person and work. Verse selection determines which theological themes the congregation actually sings.",
    [
      "Jesus Christ is worthy of royal honor and worship.",
      "Christ triumphs over death.",
      "Christ’s reign and saving work are grounds for praise.",
    ],
    ["Opening praise", "Easter", "Sending"],
    [
      "Revelation 19:12 — clear allusion: many crowns.",
      "Revelation 5:12 — thematic connection: the Lamb worthy of honor.",
    ],
    "Parallel stanzas provide a clear structure. Older word order may require explanation but is usually purposeful.",
    [
      "Hymnals combine stanzas from different authors; verify the chosen edition.",
    ],
  ],
  [
    "thousand-tongues",
    "O for a Thousand Tongues to Sing",
    "Charles Wesley · common tune: Carl G. Gläser",
    "O for a thousand tongues to sing",
    "AZMON · other tunes exist",
    ["Praise", "Grace", "Salvation"],
    9,
    8,
    8,
    "Celebrates Christ’s saving power and the desire to praise him more fully. The multitude of tongues is a poetic expression of abundant praise.",
    [
      "Christ is worthy of abundant praise.",
      "Christ brings forgiveness and freedom from sin.",
      "The good news is a reason for public proclamation.",
    ],
    ["Opening praise", "Mission emphasis"],
    [
      "Psalm 35:28 — thematic connection: declaring God’s praise.",
      "Romans 6:14 — thematic connection: freedom from sin’s dominion.",
    ],
    "Concise stanzas make specific claims. Some historical verses use language for disability that may need sensitive explanation or a different verse selection.",
    [
      "Modern hymnals usually select only a subset of Wesley’s original stanzas.",
    ],
  ],
  [
    "doxology",
    "Praise God, from Whom All Blessings Flow",
    "Thomas Ken · traditional tune: OLD HUNDREDTH",
    "Praise God, from whom all blessings flow",
    "OLD HUNDREDTH",
    ["Trinity", "Thanksgiving", "Adoration"],
    9,
    7,
    9,
    "A brief, specific Trinitarian doxology. Its purpose is compact praise, so limited breadth is not itself a defect; it contributes a clear confession in a short space.",
    [
      "God is the source of blessing.",
      "All creation is called to praise God.",
      "Praise is offered to Father, Son and Holy Spirit.",
    ],
    ["Doxology", "Thanksgiving", "Sending"],
    [
      "James 1:17 — thematic connection: the source of good gifts.",
      "Matthew 28:19 — thematic connection: the Trinity.",
    ],
    "Four well-structured imperatives with purposeful parallelism and little filler.",
    ["Expanded modern choruses should be assessed separately."],
  ],
  [
    "rock-of-ages",
    "Rock of Ages, Cleft for Me",
    "Augustus M. Toplady · common tune: Thomas Hastings",
    "Rock of Ages, cleft for me",
    "TOPLADY · other tunes exist",
    ["Grace", "Atonement", "Dependence"],
    9,
    9,
    8,
    "A prayer for refuge in Christ that explicitly rejects salvation by personal effort. Its images develop a sustained confession of dependence on Christ.",
    [
      "Salvation depends on Christ rather than human works.",
      "Christ provides refuge and cleansing for sinners.",
      "The believer’s hope in death rests in Christ.",
    ],
    ["Confession", "Assurance", "Communion"],
    [
      "Titus 3:5 — thematic connection: salvation not by works.",
      "John 19:34 — allusion: blood and water.",
      "Psalm 18:2 — thematic connection: God as rock and refuge.",
    ],
    "A coherent prayer developed through biblical imagery. Explain “double cure” in its context instead of leaving the phrase opaque.",
    [
      "Editions vary in how they describe cleansing from guilt and sin’s power.",
    ],
  ],
  [
    "christ-risen",
    "Christ the Lord Is Risen Today",
    "Charles Wesley · traditional tune: EASTER HYMN",
    "Christ the Lord is risen today",
    "EASTER HYMN",
    ["Resurrection", "Victory", "Future hope"],
    9,
    8,
    8,
    "Confesses the bodily resurrection and celebrates victory over death. Repeated alleluias contribute explicit praise; the substantive statements still deserve attention.",
    [
      "Jesus Christ is risen from the dead.",
      "Christ’s resurrection defeats death.",
      "Christ’s victory grounds the believer’s hope.",
    ],
    ["Easter", "Opening praise"],
    [
      "1 Corinthians 15:54–57 — clear allusion: victory over death.",
      "Luke 24:6 — thematic connection: Christ is risen.",
    ],
    "Short, clear declarations with intentional praise responses. Avoid treating “alleluia” as a meaningless “oh”.",
    [],
  ],
  [
    "fairest-lord",
    "Fairest Lord Jesus",
    "Traditional German hymn · English translation varies",
    "Fairest Lord Jesus",
    "SCHÖNSTER HERR JESU",
    ["Christ", "Creation", "Adoration"],
    9,
    7,
    8,
    "Uses the beauty of creation to express Christ’s surpassing worth. It offers clear praise of his person but less explanation of his saving work than some other hymns.",
    [
      "Jesus Christ is worthy of devotion above created beauty.",
      "Christ rules creation.",
      "Christ is honored as divine and human in traditional concluding verses.",
    ],
    ["Adoration", "Preparation for sermon"],
    [
      "Colossians 1:15–17 — thematic connection: Christ and creation.",
      "John 1:14 — thematic connection: Christ’s incarnation.",
    ],
    "Coherent comparisons make the poetic purpose clear. Verify the translation’s pronouns and final stanza.",
    [
      "Attribution and translation differ among hymnals; avoid a single unverified authorship claim.",
    ],
  ],
  [
    "what-a-friend",
    "What a Friend We Have in Jesus",
    "Joseph M. Scriven · music: Charles C. Converse",
    "What a friend we have in Jesus",
    "CONVERSE",
    ["Prayer", "Dependence", "Comfort"],
    9,
    7,
    8,
    "Encourages prayer and dependence on Christ amid grief and weakness. Its pastoral focus is valuable, though it offers less development of atonement or resurrection.",
    [
      "Believers may bring their burdens to Christ in prayer.",
      "Christ is a faithful source of comfort.",
      "Dependence on Christ matters amid trial.",
    ],
    ["Prayer", "Lament", "Response"],
    [
      "1 Peter 5:7 — thematic connection: casting cares on God.",
      "Hebrews 4:15–16 — thematic connection: Christ’s sympathy and access to help.",
    ],
    "Clear questions and exhortations develop a single pastoral theme. Evaluate broad statements about needless pain with care.",
    [
      "Prayer does not guarantee immediate relief from suffering; avoid presenting the hymn as a prosperity promise.",
    ],
  ],
];

function makeSong([
  id,
  title,
  author,
  firstLine,
  tune,
  themes,
  accuracy,
  substance,
  language,
  summary,
  claims,
  uses,
  scriptures,
  languageNote,
  concerns,
]) {
  return {
    id,
    title,
    author,
    firstLine,
    version: `Traditional hymn · ${tune} · verify edition`,
    themes,
    review: {
      scores: { accuracy, substance, language, time: null },
      summary,
      claims,
      uses,
      scriptures,
      concerns,
      language: languageNote,
      time: "Not assessed. Specify the selected verses, repetitions and arrangement duration.",
      concern: concerns.length ? "context" : "none",
      musical:
        "Not assessed. Range, vocal jumps and instrumental demands require evidence for your selected key and arrangement.",
      status: "starter",
      notes: "",
      key: "",
      minutes: 4,
      updatedAt: null,
      sources: [
        {
          label: "Hymnary title lookup — verify the exact text and tune",
          url: `https://hymnary.org/search?qu=${encodeURIComponent(title)}`,
        },
      ],
    },
  };
}

export const traditionalCatalog = [
  ...seedSongs,
  ...additions.map(makeSong),
].map((song) => ({
  ...song,
  category: "traditional",
  review: {
    ...song.review,
    status: "ai",
    aiFields: [
      "scores",
      "summary",
      "claims",
      "concerns",
      "uses",
      "themes",
      "scriptures",
      "language",
      "time",
    ],
    model: "Prewritten model-knowledge draft · exact text not verified",
  },
}));
const reviewedAdditions = additionalSongs.map(prewrittenReview);
const previousTitles = new Set([...traditionalCatalog, ...reviewedAdditions, ...modernCatalog].map(s => normalize(s.title)));
const expandedAdditions = expandedCatalog.filter(s => !previousTitles.has(normalize(s.title)));
const seenAssociations = new Set([...traditionalCatalog, ...reviewedAdditions, ...modernCatalog, ...expandedAdditions].map(s => normalize(s.title) + ":" + normalize(s.author.replace(/^Associated recording:\s*/i, ""))));
const artistAdditions = artistCatalog.filter(s => {
  const key = normalize(s.title) + ":" + normalize(s.author.replace(/^Associated recording:\s*/i, ""));
  if (seenAssociations.has(key)) return false;
  seenAssociations.add(key); return true;
});
const rawCatalogSongs = [
  ...traditionalCatalog,
  ...reviewedAdditions,
  ...modernCatalog,
  ...expandedAdditions,
  ...artistAdditions,
];
export const baseCatalogSongs = rawCatalogSongs;
export const allCatalogSongs = rawCatalogSongs.map(enrichCatalogEvaluation);
export const catalogSongs = [
  ...traditionalCatalog,
  ...reviewedAdditions.filter((song) =>
    mixedStarterTitles.includes(song.title),
  ),
  ...modernCatalog
    .filter((s) =>
      [
        "Elevation Worship",
        "Bethel Music",
        "Hillsong Worship",
        "The Worship Initiative",
        "Sovereign Grace Music",
        "Kari Jobe",
      ].some((a) => s.author.includes(a)),
    )
    .filter(
      (s, i, all) =>
        i < 12 ||
        s.author.includes("The Worship Initiative") ||
        s.author.includes("Sovereign Grace"),
    ),
  ...modernCatalog.filter((s) => s.title.startsWith("Forever (")),
  ...expandedAdditions.filter(s => newStarterTitles.includes(s.title)),
].map(enrichCatalogEvaluation);
export const CATALOG_REVISION = 5;
export const approvalLabels = {
  unreviewed: "Not reviewed",
  approved: "Approved for use",
  context: "Approved with context",
  avoid: "Avoid for our church",
};

export function syncCatalog(
  workspace,
  catalog = catalogSongs,
  revision = CATALOG_REVISION,
) {
  const result = structuredClone(workspace);
  result.profile = withProfileDefaults(result.profile);
  const existing = new Map(result.songs.map((s) => [s.id, s]));
  if (catalog === catalogSongs) {
    const defaults = new Set(catalogSongs.map((s) => s.id));
    catalog = allCatalogSongs.filter(
      (s) => defaults.has(s.id) || existing.has(s.id),
    );
  }
  for (const entry of catalog) {
    let song = existing.get(entry.id);
    if (!song) {
      song = structuredClone(entry);
      result.songs.push(song);
    }
    // Refresh shared evidence, but only replace an untouched starter assessment.
    if (
      (song.review.status === "starter" ||
        song.review.status === "unreviewed" ||
        (song.review.status === "ai" &&
          /^Prewritten (?:model-knowledge|lyric-evidence)/.test(song.review.model || ""))) &&
      song.title === entry.title && song.author === entry.author &&
      song.catalogRevision !== revision
    ) {
      const personalNotes = song.review.notes,
        personalKey = song.review.key,
        personalMinutes = song.review.minutes,
        personalMusical = song.review.musical,
        personalCustomScores = song.review.customScores;
      song.review = structuredClone(entry.review);
      if (personalCustomScores) song.review.customScores = structuredClone(personalCustomScores);
      if (personalNotes) song.review.notes = personalNotes;
      if (personalKey) song.review.key = personalKey;
      if (personalMinutes) song.review.minutes = personalMinutes;
      if (personalMusical && !personalMusical.startsWith("Not assessed"))
        song.review.musical = personalMusical;
      song.themes = structuredClone(entry.themes);
      // Catalog research never changes a human church-use decision.
    }
    song.catalogReview = structuredClone(entry.review);
    song.catalogThemes = structuredClone(entry.themes);
    song.catalogRevision = revision;
    song.category ||= entry.category;
    // A present personal list (even []) owns the choice. Never restore removed
    // links or append new defaults to a person's preferred versions.
    if (song.recordings === undefined && song.title === entry.title && song.author === entry.author && catalogRecordings[entry.id]) {
      song.recordings = structuredClone(catalogRecordings[entry.id]);
    }
    if (song.title === entry.title && song.author === entry.author) {
      for (const recording of song.recordings || []) {
        const source = catalogRecordings[entry.id]?.find(r => r.id === recording.id && r.url === recording.url);
        if (source?.artwork && recording.artwork === undefined) recording.artwork = source.artwork;
        if (source?.releaseDate && recording.releaseDate === undefined) recording.releaseDate = source.releaseDate;
      }
    }
  }
  const catalogIds = new Set(catalog.map((s) => s.id));
  for (const song of result.songs) {
    if (!song.facts?.minutes && song.review.minutes === 4 && ["ai", "starter", "unreviewed"].includes(song.review.status)) {
      song.facts ||= {};
      song.facts.minutes = { confidence: "guess", source: "Editable planning estimate; recording duration not verified." };
    }
    const changedPrimary = song.review.status === "ai" && song.review.previous?.status === "manual";
    humanFirst(song);
    if (changedPrimary && song.approval) invalidateApproval(song);
    if (song.author.startsWith("Associated recording:") && !song.facts?.author) {
      song.facts ||= {};
      song.facts.author = { confidence: "guess", source: "Model-knowledge recording association; verify the chosen recording." };
    }
    song.approval ||= { status: "unreviewed", notes: "", updatedAt: null };
    if (!catalogIds.has(song.id)) {
      delete song.catalogReview;
      delete song.catalogThemes;
      delete song.catalogRevision;
    }
  }
  return result;
}

export function invalidateApproval(song) {
  if (song.approval && song.approval.status !== "unreviewed") {
    song.legacyApproval = structuredClone(song.approval);
    song.approval = { ...song.approval, status: "unreviewed", updatedAt: null };
  }
}

export function discoverSongs(
  songs,
  { theme = "", approval = "", sort = "default" } = {},
  profile,
) {
  let matches = songs.filter(
    (s) =>
      (!theme || s.themes.includes(theme)) &&
      (!approval || (s.approval?.status || "unreviewed") === approval),
  );
  if (sort === "title") matches.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === "rating" || sort === "substance") {
    // Compute each visible value once; comparisons must not rebuild reviews/rubrics.
    const values = new Map(matches.map(song => {
      const review = reviewForDisplay(song,profile?.aiMode);
      return [song, (sort === "rating" ? overall(review,profile) : review.scores.substance) ?? -1];
    }));
    matches.sort((a,b)=>values.get(b)-values.get(a));
  }
  return matches;
}
