import { allCatalogSongs, syncCatalog } from "./catalog.js";
import { normalize } from "./core.js";
import { validateWorkspace } from "./backup.js";
import { artistCollections } from "./artist-collections.js";

export const depthLabels = {
  essentials: "Essentials",
  standards: "Standards",
  all: "All",
};
const ids = (titles) =>
  titles.map((title) => {
    const song = allCatalogSongs.find((s) => s.title === title);
    if (!song) throw new Error(`Collection title missing: ${title}`);
    return song.id;
  });
const typeIds = (type) =>
  allCatalogSongs.filter((s) => s.category === type).map((s) => s.id);
const oldIds = allCatalogSongs.slice(0, 20).map((s) => s.id);
const selected = (id, name, description, songIds, essentials, standards) => ({
  id,
  name,
  description,
  songIds: [...new Set(songIds)],
  revision: 1,
  group: "Styles",
  limits: { essentials, standards },
  source:
    "Editorial title selection · not a ranked chart or denominational endorsement",
});
export const songCollections = [
  ...artistCollections.map(([artist, pattern]) => ({
    ...selected(
      "artist-" + normalize(({"Shane & Shane":"The Worship Initiative", "Sovereign Grace Music":"Sovereign Grace", "Hillsong Worship / Hillsong UNITED":"Hillsong"})[artist] || artist).replaceAll(" ", "-"),
      artist,
      "Recording and writing associations. Verify the version you sing.",
      allCatalogSongs.filter(s => pattern.test(s.author)).map(s => s.id), 5, 15,
    ), group: "Artists",
  })),
  selected(
    "baptist-mixed",
    "Baptist church repertoire",
    "Traditional hymns alongside modern hymns, worship songs, CCM and gospel. Review the version your church sings.",
    [
      ...oldIds.slice(0, 8),
      ...ids([
        "In Christ Alone",
        "His Mercy Is More",
        "Yet Not I but Through Christ in Me",
        "He Will Hold Me Fast",
        "10,000 Reasons (Bless the Lord)",
        "How Great Is Our God",
        "Living Hope",
        "Because He Lives",
      ]),
      ...oldIds,
      ...allCatalogSongs.map((s) => s.id),
    ],
    16,
    70,
  ),
  selected(
    "baptist-hymns",
    "Baptist hymn selections",
    "A traditional starting selection with gospel hymns and seasonal texts. These songs are not exclusive to Baptist churches.",
    [...oldIds, ...typeIds("traditional"), ...typeIds("gospel")],
    8,
    30,
  ),
  selected(
    "modern-hymns",
    "Modern hymns",
    "Getty/Townend, CityAlight, Sovereign Grace and other contemporary hymn writing. Recording associations help identify versions.",
    typeIds("modern"),
    12,
    24,
  ),
  selected(
    "contemporary-worship",
    "Contemporary worship",
    "A broad worship-song finding aid. Inclusion does not imply approval of every lyric, arrangement, artist or ministry.",
    typeIds("worship"),
    10,
    25,
  ),
  selected(
    "ccm-choruses",
    "CCM & worship choruses",
    "Christian songs and familiar worship choruses to review for congregational use. Some may suit a solo better than congregational singing.",
    typeIds("ccm"),
    10,
    22,
  ),
  selected(
    "gospel",
    "Gospel & gospel hymns",
    "Gospel hymnody and associated gospel recordings across several musical traditions.",
    typeIds("gospel"),
    10,
    22,
  ),
  selected(
    "reformed-hymns",
    "Presbyterian / Reformed hymn selections",
    "A starting selection shared across Reformed traditions. Verify the specific text against your statement of faith.",
    [
      ...ids([
        "Holy, Holy, Holy",
        "A Mighty Fortress Is Our God",
        "How Firm a Foundation",
        "Rock of Ages, Cleft for Me",
        "When I Survey the Wondrous Cross",
        "Praise God, from Whom All Blessings Flow",
        "Crown Him with Many Crowns",
        "Be Thou My Vision",
      ]),
      ...ids([
        "The Church’s One Foundation",
        "Jesus Shall Reign",
        "O Worship the King",
        "Praise to the Lord, the Almighty",
        "Immortal, Invisible, God Only Wise",
        "All Hail the Power of Jesus’ Name",
        "My Hope Is Built on Nothing Less",
        "Take My Life and Let It Be",
        "Abide with Me",
        "Now Thank We All Our God",
      ]),
      ...oldIds,
    ],
    8,
    18,
  ),
  selected(
    "advent-christmas",
    "Advent & Christmas",
    "Texts and song records for Advent and Christmas; chosen stanzas and arrangements still need review.",
    ids([
      "O Come, O Come, Emmanuel",
      "Come, Thou Long-Expected Jesus",
      "Joy to the World",
      "Hark! the Herald Angels Sing",
      "O Come, All Ye Faithful",
      "Angels We Have Heard on High",
      "Silent Night",
      "O Little Town of Bethlehem",
      "The First Noel",
      "What Child Is This?",
      "Sing We the Song of Emmanuel",
    ]),
    4,
    8,
  ),
  selected(
    "cross-resurrection",
    "Cross & resurrection",
    "Traditional and modern titles for services emphasizing Christ’s death and resurrection.",
    ids([
      "When I Survey the Wondrous Cross",
      "Christ the Lord Is Risen Today",
      "Jesus Paid It All",
      "The Power of the Cross",
      "In Christ Alone",
      "Living Hope",
      "Man of Sorrows! What a Name",
      "O Sacred Head, Now Wounded",
      "Jesus Christ Is Risen Today",
      "Up from the Grave He Arose",
      "I Know That My Redeemer Lives",
      "Because He Lives",
      "O Praise the Name (Anástasis)",
      "Glorious Day",
    ]),
    6,
    10,
  ),
];
for (const [id, name, group, titles] of [
  ["era-classic-choruses", "Classic worship choruses · 1970s–1990s", "Eras", ["He Is Exalted", "We Bow Down", "We Will Glorify", "Lamb of God", "How Beautiful", "Oh Lord, You're Beautiful", "There Is a Redeemer", "Create in Me a Clean Heart", "Shout to the Lord", "Open the Eyes of My Heart", "Above All", "Agnus Dei", "You Are My King (Amazing Love)", "I Give You My Heart", "Draw Me Close", "Breathe", "He Knows My Name", "Praise Adonai"]],
  ["era-2000s", "Worship of the 2000s", "Eras", ["How Great Is Our God", "Blessed Be Your Name", "Beautiful One", "Mighty to Save", "Hosanna", "The Stand", "Revelation Song", "Amazing Grace (My Chains Are Gone)", "Jesus Messiah", "Your Grace Is Enough", "Here I Am to Worship", "Your Love Never Fails", "How He Loves", "God of This City", "Our God Saves", "In Christ Alone", "The Power of the Cross", "Speak, O Lord"]],
  ["era-2010s", "Worship of the 2010s", "Eras", ["10,000 Reasons (Bless the Lord)", "Living Hope", "Goodness of God", "Build My Life", "Oceans (Where Feet May Fail)", "What a Beautiful Name", "Great Are You Lord", "Holy Spirit", "This Is Amazing Grace", "O Come to the Altar", "Resurrecting", "King of Kings", "Run to the Father", "Good Good Father", "Raise a Hallelujah", "Yet Not I but Through Christ in Me", "His Mercy Is More", "Only a Holy God"]],
  ["era-2020s", "Worship of the 2020s", "Eras", ["Christ Be Magnified", "The Blessing", "Graves into Gardens", "Battle Belongs", "Hymn of Heaven", "Holy Forever", "Praise", "Same God", "Trust in God", "Good Plans", "Goodbye Yesterday", "Washed", "Known by You", "At the Altar", "Hard Fought Hallelujah", "I Speak Jesus", "Thank You Jesus for the Blood", "There Is One Gospel", "You've Already Won"]],
  ["theme-grace", "Grace & assurance", "Themes", ["Amazing Grace", "In Christ Alone", "His Mercy Is More", "He Will Hold Me Fast", "All I Have Is Christ", "Before the Throne of God Above", "Blessed Assurance", "Grace Greater than Our Sin", "It Was Finished Upon That Cross", "All Sufficient Merit", "Christ Our Hope in Life and Death", "There Is One Gospel", "Jesus, Thank You", "I Know Whom I Have Believed", "My Worth Is Not in What I Own", "O Lord, My Rock and My Redeemer"]],
  ["theme-holiness", "God's holiness & majesty", "Themes", ["Holy, Holy, Holy", "Only a Holy God", "Holy Forever", "Behold Our God", "He Is Our God", "Immortal, Invisible, God Only Wise", "O Worship the King", "Praise to the Lord, the Almighty", "Agnus Dei", "Revelation Song", "Is He Worthy?", "King of Kings", "How Great Is Our God", "Great Are You Lord", "The God of Abraham Praise", "All Creatures of Our God and King"]],
  ["theme-prayer", "Prayer & dependence", "Themes", ["Lord, I Need You", "I Need Thee Every Hour", "Sweet Hour of Prayer", "God I Look to You", "Speak, O Lord", "Holy Spirit, Living Breath of God", "Give Me Jesus", "O Great God", "My Heart Is Filled with Thankfulness", "Take My Life and Let It Be", "The Lord's Prayer (It's Yours)", "The Lord's My Shepherd (Psalm 23)", "Be Thou My Vision", "Jesus, Strong and Kind", "Abide with Me", "Run to the Father"]],
]) {
  const songIds = titles.flatMap(title => allCatalogSongs.filter(s => normalize(s.title) === normalize(title)).map(s => s.id));
  songCollections.push({ ...selected(id, name, group === "Eras" ? "Songs associated with this worship era; later recordings may differ. This is an editorial grouping, not verified release-year metadata." : "An editorial topic grouping. Check the chosen lyric version before use.", songIds, 5, 12), group });
}
export function collectionSongs(collection, depth = "essentials") {
  if (!collection || !Object.hasOwn(depthLabels, depth))
    throw new Error("Choose a collection and depth.");
  const selected = collection.songIds.slice(
    0,
    depth === "all" ? undefined : collection.limits[depth],
  );
  const byId = new Map(allCatalogSongs.map((s) => [s.id, s]));
  return selected.map((id) => byId.get(id));
}
export function existingMatch(workspace, song) {
  return (
    workspace.songs.find((s) => s.id === song.id) ||
    workspace.songs.find(
      (s) =>
        normalize(s.title) === normalize(song.title) &&
        normalize(s.author) === normalize(song.author),
    )
  );
}
export function importSongs(
  workspace,
  songs,
  { libraryId, libraryName, collectionId = null, depth = null } = {},
  newId = () => crypto.randomUUID(),
) {
  const next = structuredClone(workspace);
  if (!songs.length) throw new Error("Select at least one song.");
  let library = libraryId
    ? next.libraries.find((l) => l.id === libraryId)
    : null;
  if (libraryId && !library)
    throw new Error("The target library no longer exists.");
  if (!library) {
    if (!libraryName?.trim()) throw new Error("Name the new library.");
    if (
      next.libraries.some((l) => normalize(l.name) === normalize(libraryName))
    )
      throw new Error(
        "A library with that name already exists. Choose it as the target or use a different name.",
      );
    library = { id: newId(), name: libraryName.trim(), songIds: [] };
    next.libraries.push(library);
  }
  let added = 0,
    saved = 0;
  const seen = new Set();
  for (const song of songs) {
    if (seen.has(song.id)) continue;
    seen.add(song.id);
    let existing = existingMatch(next, song);
    if (existing?.blacklisted || song.blacklisted) continue;
    if (!existing) {
      existing = structuredClone(song);
      next.songs.push(existing);
      added++;
    }
    if (!library.songIds.includes(existing.id)) {
      library.songIds.push(existing.id);
      saved++;
    }
  }
  if (collectionId) {
    next.collectionImports ||= [];
    next.collectionImports.push({
      id: newId(),
      collectionId,
      depth,
      importedAt: new Date().toISOString(),
      added,
      saved,
    });
    next.collectionImports = next.collectionImports.slice(-100);
  }
  return {
    workspace: validateWorkspace(syncCatalog(next)),
    libraryId: library.id,
    added,
    saved,
  };
}

// CSV parser supports quoted commas/newlines, doubled quotes and UTF-8 BOM.
export function parseCSV(text) {
  if (
    typeof text !== "string" ||
    new TextEncoder().encode(text).length > 1024 * 1024
  )
    throw new Error("Song list files must be under 1 MB.");
  const rows = [];
  let row = [],
    cell = "",
    quoted = false,
    afterQuote = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
        afterQuote = true;
      } else cell += c;
    } else if (c === '"' && cell === "") {
      quoted = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
      afterQuote = false;
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((s) => s.trim())) rows.push(row);
      row = [];
      cell = "";
      afterQuote = false;
    } else if (afterQuote && !/\s/.test(c))
      throw new Error("Unexpected text after a quoted CSV field.");
    else if (!afterQuote) cell += c;
    if (rows.length > 1001 || cell.length > 30000)
      throw new Error(
        "The song list is too large; import up to 1,000 songs at a time.",
      );
  }
  if (quoted) throw new Error("The CSV contains an unclosed quotation mark.");
  row.push(cell);
  if (row.some((s) => s.trim())) rows.push(row);
  return rows;
}
export function songsFromCSV(text, newId = () => crypto.randomUUID()) {
  const rows = parseCSV(text);
  if (rows.length < 2)
    throw new Error("The CSV needs a header row and at least one song.");
  const headers = rows.shift().map(normalize);
  const column = (names) => headers.findIndex((h) => names.includes(h));
  const titleIndex = column(["title", "song title", "songtitle"]);
  if (titleIndex < 0) throw new Error("Include a Title or Song Title column.");
  const authorIndex = column([
    "writer",
    "author",
    "attribution",
    "credits associated artist",
    "writer attribution",
  ]);
  const themeIndex = column(["themes", "theme"]),
    keyIndex = column(["preferred key", "key"]);
  const songIds = new Set();
  const result = rows
    .map((row, i) => {
      const title = (row[titleIndex] || "").trim(),
        author = (row[authorIndex] || "").trim() || "Unknown attribution";
      if (!title || title.length > 200 || author.length > 1000)
        throw new Error(`Check the title or attribution on CSV row ${i + 2}.`);
      const known = allCatalogSongs.find(
        (s) =>
          normalize(s.title) === normalize(title) &&
          normalize(s.author) === normalize(author),
      );
      const song = known
        ? structuredClone(known)
        : {
            id: newId(),
            title,
            author,
            firstLine: "",
            version: "Imported title list · verify exact version",
            themes: [],
            category: "other",
            review: {
              scores: {
                accuracy: null,
                substance: null,
                language: null,
                time: null,
              },
              status: "unreviewed",
              concern: "none",
              minutes: 4,
              sources: [],
              summary: "Imported title record. Assessment required.",
              language: "",
              time: "Not assessed.",
              musical: "Not assessed.",
              notes: "",
              key: "",
              claims: [],
              concerns: [],
              uses: [],
              scriptures: [],
              updatedAt: null,
            },
          };
      if (!known) {
        song.themes = (row[themeIndex] || "")
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean);
        song.review.key = (row[keyIndex] || "").trim();
      }
      const identity = normalize(title) + "|" + normalize(author);
      if (songIds.has(identity)) return null;
      songIds.add(identity);
      return song;
    })
    .filter(Boolean);
  if (result.length > 1000)
    throw new Error("Import up to 1,000 songs at a time.");
  return result;
}
