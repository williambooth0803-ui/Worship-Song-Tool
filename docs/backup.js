import { dimensions } from "./core.js";
import { denominations, statements, aiModes } from "./profile.js";
import { songTypes } from "./repertoire-data.js";
import { parsePitch } from "./planning.js";
import { validateIndexView } from "./index-views.js";
import { validateRecordings } from "./recordings.js";
import { validateCriteria, validateCustomScores } from "./scoring.js";

export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

// Construct a new workspace from known fields; imported data never directly
// becomes application state. Invalid references or shapes reject the whole file.
export function validateWorkspace(input) {
  const fail = (message) => {
    throw new Error(`Invalid backup: ${message}`);
  };
  const object = (value, label) => {
    if (!value || typeof value !== "object" || Array.isArray(value))
      fail(`${label} must be an object.`);
    return value;
  };
  const text = (value, label, max = 6000, required = false) => {
    if (
      typeof value !== "string" ||
      value.length > max ||
      (required && !value.trim())
    )
      fail(`${label} is missing or too long.`);
    return value;
  };
  const number = (value, label, min, max) => {
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < min ||
      value > max
    )
      fail(`${label} is out of range.`);
    return value;
  };
  const array = (value, label, max = 100) => {
    if (!Array.isArray(value) || value.length > max)
      fail(`${label} must be a list of up to ${max} items.`);
    return value;
  };
  const texts = (value, label) =>
    array(value, label).map((x) => text(x, label));
  const choice = (value, label, choices) => {
    if (!choices.includes(value)) fail(`${label} is not recognized.`);
    return value;
  };
  const id = (value) => text(value, "ID", 200, true);
  const unique = (values, label) => {
    if (new Set(values).size !== values.length)
      fail(`${label} contains duplicate IDs.`);
  };
  const review = (value, previous = false) => {
    object(value, "assessment");
    object(value.scores, "scores");
    const result = {
      scores: Object.fromEntries(
        Object.keys(dimensions).map((k) => [
          k,
          value.scores[k] === null ? null : number(value.scores[k], k, 0, 10),
        ]),
      ),
      status: choice(value.status, "review status", [
        "starter",
        "unreviewed",
        "manual",
        "ai",
      ]),
      concern: choice(value.concern, "doctrinal concern", [
        "none",
        "context",
        "serious",
      ]),
      minutes: number(value.minutes, "song duration", 0.5, 60),
      sources: array(value.sources, "sources").map((source) => {
        object(source, "source");
        const url = text(source.url, "source URL", 6000);
        let parsed;
        try {
          parsed = new URL(url);
        } catch {
          fail("a source URL is invalid.");
        }
        if (
          !["http:", "https:"].includes(parsed.protocol) ||
          parsed.username ||
          parsed.password
        )
          fail("source URLs must be public HTTP or HTTPS links.");
        return { url, label: text(source.label, "source label") };
      }),
    };
    for (const key of [
      "summary",
      "language",
      "time",
      "musical",
      "notes",
      "key",
    ])
      result[key] = text(value[key], key);
    if (value.customScores !== undefined) result.customScores = validateCustomScores(value.customScores);
    for (const key of ["claims", "concerns", "uses", "scriptures"])
      result[key] = texts(value[key], key);
    if (value.themes !== undefined)
      result.themes = texts(value.themes, "assessment themes");
    if (value.aiFields !== undefined)
      result.aiFields = texts(value.aiFields, "AI field labels");
    if (value.model !== undefined)
      result.model = text(value.model, "model", 200);
    if (value.assistance !== undefined) {
      object(value.assistance, "assistance notes");
      result.assistance = {};
      for (const key of ["summary", "language", "time", "model", "updatedAt"])
        result.assistance[key] = text(
          value.assistance[key],
          "assistance notes",
        );
    }
    if (value.updatedAt !== undefined && value.updatedAt !== null) {
      result.updatedAt = text(value.updatedAt, "review date", 100);
      if (!Number.isFinite(Date.parse(result.updatedAt)))
        fail("the review date is invalid.");
    } else result.updatedAt = null;
    if (value.previous !== undefined) {
      if (previous) fail("assessment history is too deeply nested.");
      result.previous = review(value.previous, true);
    }
    return result;
  };
  object(input, "workspace");
  if (input.version !== 1) fail("this backup version is not supported.");
  const songs = array(input.songs, "songs", 5000).map((song) => {
    object(song, "song");
    const result = {
      id: id(song.id),
      title: text(song.title, "song title", 200, true),
      author: text(song.author, "song author", 1000),
      firstLine: text(song.firstLine, "opening line", 1000),
      version: text(song.version, "song version", 1000),
      themes: texts(song.themes, "themes"),
      review: review(song.review),
    };
    if (song.recordings !== undefined) result.recordings = validateRecordings(song.recordings);
    for (const key of ["blacklisted", "aiDismissed"]) {
      if (song[key] !== undefined) {
        if (typeof song[key] !== "boolean") fail(`${key} must be true or false.`);
        result[key] = song[key];
      }
    }
    if (song.aiReview !== undefined) {
      result.aiReview = review(song.aiReview);
      if (result.aiReview.status !== "ai") fail("the secondary AI evaluation must be an AI draft.");
    }
    if (song.facts !== undefined) {
      object(song.facts, "fact provenance"); result.facts = {};
      for (const [field, value] of Object.entries(song.facts)) {
        if (!["author", "key", "tempo", "minutes", "timeSignature", "range", "tune", "meter"].includes(field)) fail("unknown objective fact.");
        object(value, "fact evidence");
        result.facts[field] = { confidence: choice(value.confidence, "fact confidence", ["ai", "guess", "confirmed"]), source: text(value.source, "fact source", 1000) };
      }
    }
    if (song.files !== undefined) {
      result.files = array(song.files, "song files", 50).map(file => {
        object(file, "song file");
        const checked = { id: id(file.id), name: text(file.name, "file name", 200, true), size: number(file.size, "file size", 1, 10 * 1024 * 1024), mime: text(file.mime, "file type", 200), storage: choice(file.storage, "file storage", ["device", "account", "organization"]), path: text(file.path, "file path", 600, true) };
        if (["account", "organization"].includes(checked.storage) && !/^[0-9a-f-]{36}\/[a-zA-Z0-9_-]{1,200}\/[a-zA-Z0-9._-]{1,200}$/i.test(checked.path)) fail("invalid account file path.");
        return checked;
      });
      unique(result.files.map(file => file.id), "file IDs");
    }
    if (song.detailLayout !== undefined) {
      object(song.detailLayout, "detail layout");
      result.detailLayout = {
        order: texts(song.detailLayout.order, "attribute order"),
        hidden: texts(song.detailLayout.hidden, "hidden attributes"),
      };
    }
    if (song.category !== undefined)
      result.category = choice(
        song.category,
        "song type",
        Object.keys(songTypes),
      );
    if (song.arrangements !== undefined) {
      result.arrangements = array(song.arrangements, "arrangements", 50).map(
        (a) => {
          object(a, "arrangement");
          const checked = {
            id: id(a.id),
            name: text(a.name, "arrangement name", 200, true),
            key: text(a.key, "arrangement key", 30),
            minutes: number(a.minutes, "arrangement duration", 0.5, 60),
            notes: text(a.notes, "arrangement notes"),
            lowNote: text(a.lowNote, "lowest note", 10),
            highNote: text(a.highNote, "highest note", 10),
          };
          for (const k of [
            "tempo",
            "largestLeap",
            "wordlessSeconds",
            "instrumentalSeconds",
          ]) {
            const bounds = {
              tempo: [20, 400],
              largestLeap: [0, 36],
              wordlessSeconds: [0, a.minutes * 60],
              instrumentalSeconds: [0, a.minutes * 60],
            }[k];
            checked[k] = a[k] === null ? null : number(a[k], k, ...bounds);
          }
          for (const k of [
            "timeSignature",
            "vocalDifficulty",
            "instrumentalDifficulty",
          ])
            checked[k] = text(a[k], k, 300);
          checked.instruments = texts(a.instruments, "arrangement instruments");
          for (const k of ["lowNote", "highNote"])
            if (checked[k] && parsePitch(checked[k]) === null)
              fail("use note names such as C4 or F#5 for the vocal range.");
          if (
            checked.lowNote &&
            checked.highNote &&
            parsePitch(checked.lowNote) > parsePitch(checked.highNote)
          )
            fail("the lowest vocal note must not exceed the highest note.");
          return checked;
        },
      );
      unique(
        result.arrangements.map((a) => a.id),
        "arrangements",
      );
    }
    if (
      song.preferredArrangementId !== undefined &&
      song.preferredArrangementId !== null
    ) {
      result.preferredArrangementId = id(song.preferredArrangementId);
      if (
        !result.arrangements?.some(
          (a) => a.id === result.preferredArrangementId,
        )
      )
        fail("the preferred arrangement is missing.");
    }
    if (song.metadata !== undefined) {
      const value = object(song.metadata, "song index details");
      result.metadata = {};
      for (const key of [
        "tune",
        "meter",
        "timeSignature",
        "range",
        "vocalDifficulty",
        "instrumentalDifficulty",
        "languageName",
      ])
        result.metadata[key] = text(value[key] ?? "", key, 300);
      result.metadata.lyrics = text(value.lyrics ?? "", "song words", 30000);
      result.metadata.tempo =
        value.tempo === null || value.tempo === undefined
          ? null
          : number(value.tempo, "tempo", 20, 400);
      for (const key of ["instruments", "tags", "themes"]) {
        if (value[key] !== undefined)
          result.metadata[key] = texts(value[key], key);
      }
      result.metadata.custom = array(
        value.custom ?? [],
        "custom metrics",
        50,
      ).map((item) => {
        object(item, "custom metric");
        const type = choice(item.type, "metric type", ["text", "number"]);
        return {
          name: text(item.name, "metric name", 100, true),
          type,
          value:
            type === "number"
              ? number(item.value, "metric value", -1e9, 1e9)
              : text(item.value, "metric value", 1000),
        };
      });
      unique(
        result.metadata.custom.map((item) =>
          item.name.normalize("NFKC").toLowerCase().trim(),
        ),
        "custom metric names",
      );
    }
    if (song.catalogReview !== undefined)
      result.catalogReview = review(song.catalogReview);
    if (song.catalogRevision !== undefined)
      result.catalogRevision = number(
        song.catalogRevision,
        "catalog revision",
        1,
        100000,
      );
    if (song.catalogThemes !== undefined)
      result.catalogThemes = texts(song.catalogThemes, "catalog themes");
    if (song.approval !== undefined) {
      object(song.approval, "church-use decision");
      const value = song.approval;
      result.approval = {
        status: choice(value.status, "church-use decision", [
          "unreviewed",
          "approved",
          "context",
          "avoid",
        ]),
        notes: text(value.notes, "decision notes"),
        updatedAt: null,
      };
      if (value.updatedAt !== null && value.updatedAt !== undefined) {
        result.approval.updatedAt = text(value.updatedAt, "decision date", 100);
        if (!Number.isFinite(Date.parse(value.updatedAt)))
          fail("the decision date is invalid.");
      }
    }
    if (song.legacyApproval !== undefined) {
      const value=object(song.legacyApproval,"previous decision");
      result.legacyApproval={status:choice(value.status,"previous decision",["unreviewed","approved","context","avoid"]),notes:text(value.notes,"previous decision notes"),updatedAt:value.updatedAt==null?null:text(value.updatedAt,"previous decision date",100)};
      if(result.legacyApproval.updatedAt!==null&&!Number.isFinite(Date.parse(result.legacyApproval.updatedAt)))fail("invalid previous decision date.");
    }
    return result;
  });
  unique(
    songs.map((s) => s.id),
    "songs",
  );
  const songIds = new Set(songs.map((s) => s.id));
  const libraries = array(input.libraries, "libraries", 100).map((library) => {
    object(library, "library");
    const ids = array(library.songIds, "library songs", 5000).map(id);
    unique(ids, "library songs");
    if (ids.some((x) => !songIds.has(x)))
      fail("a library references a missing song.");
    return {
      id: id(library.id),
      name: text(library.name, "library name", 100, true),
      songIds: ids,
    };
  });
  if (!libraries.length) fail("at least one library is required.");
  unique(
    libraries.map((l) => l.id),
    "libraries",
  );
  const validatePlan = (plan) => {
    object(plan, "plan");
    const items = array(plan.items, "service items", 1000).map((item) => {
      object(item, "service item");
      const result = {
        id: id(item.id),
        type: choice(item.type, "item type", ["song", "other", "heading"]),
        minutes: number(item.minutes, "item duration", item.type === "heading" ? 0 : 0.5, item.type === "heading" ? 0 : 180),
        role: text(item.role, "item role", 100),
        notes: text(item.notes, "item notes"),
      };
      if (item.type === "song") {
        result.songId = id(item.songId);
        if (!songIds.has(result.songId))
          fail("a plan references a missing song.");
        result.key = text(item.key, "item key", 100);
        if (item.arrangementId !== undefined)
          result.arrangementId = id(item.arrangementId);
        if (item.arrangementName !== undefined)
          result.arrangementName = text(
            item.arrangementName,
            "arrangement name",
            200,
          );
      } else result.title = text(item.title, "item title", 200, true);
      return result;
    });
    unique(
      items.map((i) => i.id),
      "service items",
    );
    const date = text(plan.date, "plan date", 10);
    if (
      date &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date)
    )
      fail("the plan date is invalid.");
    const checkedPlan = {
      id: id(plan.id),
      title: text(plan.title, "plan title", 200, true),
      date,
      theme: text(plan.theme, "plan theme", 500),
      passage: text(plan.passage, "sermon passage", 200),
      items,
    };
    if (plan.status !== undefined)
      checkedPlan.status = choice(plan.status, "plan status", [
        "draft",
        "ready",
        "completed",
      ]);
    if (plan.importSource !== undefined) {
      object(plan.importSource, "plan import source");
      checkedPlan.importSource = { label: text(plan.importSource.label, "source label", 200), importedAt: text(plan.importSource.importedAt, "import date", 100), schema: choice(plan.importSource.schema, "import schema", ["faithful-plan-v1"]), uncertaintyReviewed: plan.importSource.uncertaintyReviewed === true };
      if (!Number.isFinite(Date.parse(checkedPlan.importSource.importedAt))) fail("invalid import date.");
    }
    return checkedPlan;
  };
  const plans = array(input.plans, "plans", 1000).map(validatePlan);
  unique(
    plans.map((p) => p.id),
    "plans",
  );
  const profile = object(input.profile, "profile");
  const criteria = profile.criteria === undefined ? undefined : validateCriteria(profile.criteria);
  object(profile.weights, "rating weights");
  const weights = Object.fromEntries(
    Object.keys(dimensions).map((k) => [
      k,
      number(profile.weights[k], "rating weight", 0, 100),
    ]),
  );
  for (const [key, value] of Object.entries(profile.weights)) {
    if (/^custom-[a-z0-9-]{1,80}$/.test(key)) weights[key] = number(value, "custom rating weight", 0, 100);
  }
  if (!Object.values(weights).some(w => w > 0) || (criteria && !criteria.some(c => c.active && (weights[c.id] ?? 1) > 0))) fail("at least one active rating weight must be positive.");
  const result = {
    version: 1,
    songs,
    libraries,
    plans,
    profile: {
      weights,
      ...(criteria ? { criteria } : {}),
      principles: text(profile.principles, "rating parameters", 6000, true),
    },
  };
  if (profile.evaluationPurpose !== undefined) result.profile.evaluationPurpose = text(profile.evaluationPurpose, 'lens purpose', 2000);
  if (input.lenses !== undefined) {
    result.lenses = array(input.lenses, 'evaluation lenses', 12).map(lens => {
      object(lens, 'lens'); object(lens.evaluations, 'lens evaluations');
      if (Object.keys(lens.evaluations).length > 5000) fail('too many lens evaluations.');
      const checked = {id:id(lens.id), name:text(lens.name, 'lens name', 100, true),
        profile:validateWorkspace({version:1, songs:[], libraries:[{id:"lens-validation",name:"Lens",songIds:[]}], plans:[], profile:lens.profile}).profile, evaluations:{}};
      for (const [songId, saved] of Object.entries(lens.evaluations)) {
        id(songId); if(['__proto__','constructor','prototype'].includes(songId))fail('invalid lens song ID.'); object(saved, 'lens song evaluation');
        const entry = {review:review(saved.review), themes:texts(saved.themes || [], 'lens themes')};
        if (saved.aiReview !== undefined) {entry.aiReview=review(saved.aiReview); if(entry.aiReview.status!=='ai') fail('secondary lens review must be AI.');}
        if (saved.aiDismissed !== undefined) {if(typeof saved.aiDismissed!=='boolean')fail('invalid lens AI dismissal.');entry.aiDismissed=saved.aiDismissed;}
        checked.evaluations[songId]=entry;
      }
      return checked;
    });
    unique(result.lenses.map(lens=>lens.id), 'lens IDs');
    unique(result.lenses.map(lens=>lens.name.toLowerCase()), 'lens names');
    result.activeLensId = id(input.activeLensId);
    if (!result.lenses.some(lens=>lens.id===result.activeLensId)) fail('active lens does not exist.');
  } else if (input.activeLensId !== undefined) fail('active lens requires saved lenses.');
  if (input.indexViews !== undefined) {
    result.indexViews = array(input.indexViews, "saved index views", 100).map(validateIndexView);
    unique(result.indexViews.map((v) => v.id), "saved index views");
    unique(result.indexViews.map((v) => v.name.normalize("NFKC").toLowerCase()), "saved index view names");
  }
  if (input.planTemplates !== undefined) {
    result.planTemplates = array(input.planTemplates, "plan templates", 100).map((template) => {
      const checked = validatePlan(template);
      if (checked.date || checked.status !== "draft") fail("templates must be undated drafts.");
      return checked;
    });
    unique(result.planTemplates.map((p) => p.id), "plan templates");
    unique(result.planTemplates.map((p) => p.title.normalize("NFKC").toLowerCase().trim()), "template names");
  }
  if (input.collectionImports !== undefined)
    result.collectionImports = array(
      input.collectionImports,
      "collection imports",
      100,
    ).map((item) => {
      object(item, "collection import");
      const importedAt = text(item.importedAt, "import date", 100, true);
      if (!Number.isFinite(Date.parse(importedAt)))
        fail("the collection import date is invalid.");
      return {
        id: id(item.id),
        collectionId: id(item.collectionId),
        depth: choice(item.depth, "collection depth", [
          "essentials",
          "standards",
          "all",
        ]),
        importedAt,
        added: number(item.added, "added songs", 0, 5000),
        saved: number(item.saved, "saved songs", 0, 5000),
      };
    });
  for (const [key, choices] of [
    ["denomination", Object.keys(denominations)],
    ["statement", Object.keys(statements)],
    ["aiMode", Object.keys(aiModes)],
  ]) {
    if (profile[key] !== undefined)
      result.profile[key] = choice(profile[key], key, choices);
  }
  if (profile.customStatement !== undefined)
    result.profile.customStatement = text(
      profile.customStatement,
      "custom statement",
      6000,
    );
  if (profile.setupComplete !== undefined) {
    if (typeof profile.setupComplete !== "boolean")
      fail("profile setup state must be a boolean.");
    result.profile.setupComplete = profile.setupComplete;
  }
  if (profile.aiLabels !== undefined) {
    if (typeof profile.aiLabels !== "boolean")
      fail("AI labels setting must be a boolean.");
    result.profile.aiLabels = profile.aiLabels;
  }
  return result;
}
