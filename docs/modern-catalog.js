// Recording associations identify versions, not exhaustive writing credits.
const rows = `
Praise|Elevation Worship|8|6|7|Praise|An energetic call to praise through adversity, with the exhortation developed more than the identity of the God being praised.
Trust in God|Elevation Worship|8|8|8|Trust|Connects trust with Christ's saving work and God's faithfulness; interpret confidence without promising a particular earthly outcome.
Do It Again|Elevation Worship|8|7|8|Faithfulness|Recalls God's faithfulness while waiting for deliverance; past intervention is grounds for trust, not a guarantee of repeating the same event.
See a Victory|Elevation Worship|7|6|7|Trust|Expresses confidence that God works through conflict and evil; explain what victory means amid ongoing suffering.
RATTLE!|Elevation Worship|7|6|6|New life|Uses dry-bones and resurrection images for God's life-giving power; distinguish biblical events from promised present experiences.
Worthy|Elevation Worship|9|7|8|Christ|Responds to Christ's cross and freedom from shame with praise of his worthiness.
LION|Elevation Worship|7|6|6|Kingship|Combines Lion of Judah and prophetic imagery with repeated imperatives; explain the biblical images rather than assuming their meaning is obvious.
Jireh|Elevation Worship · Maverick City Music|8|7|7|Provision|Expresses contentment in God's provision using care-for-creation imagery; no promise of prosperity should be inferred.
More Than Able|Elevation Worship|7|6|7|Trust|A prayer of confidence in God's power; broad expectation language needs distinction between divine ability and a specific promised outcome.
Million Little Miracles|Elevation Worship · Maverick City Music|8|6|7|Thanksgiving|Invites gratitude for God's everyday care; its miracle language can blur providential gifts and extraordinary biblical signs.
No Longer Slaves|Bethel Music · Jonathan David and Melissa Helser|8|7|7|Identity in Christ|Connects adoption and deliverance with release from fear; avoid implying that mature believers never experience fear.
It Is Well (Through It All)|Bethel Music · Kristene DiMarco|8|6|7|Trust|A distinct modern song about trust through difficulty; it does not have the same doctrinal development as Spafford's traditional hymn.
The Lion and the Lamb|Leeland · Bethel Music|9|8|8|Christ|Praises Christ's royal power and sacrificial redemption through the Lion and Lamb images.
God I Look to You|Bethel Music · Jenn Johnson|9|6|8|Dependence|A clear prayer for wisdom and strength, followed by praise of God's reign; its scope is intentionally focused.
You Make Me Brave|Bethel Music · Amanda Cook|8|6|7|Trust|Uses sea and shoreline imagery for confidence in God's love and calling; much of its development is personal experience.
This I Believe (The Creed)|Hillsong Worship|9|9|8|Creed|Explicitly confesses the Trinity, Christ's saving work, resurrection and return in a corporate statement of faith.
Hosanna|Hillsong UNITED|8|7|7|Devotion|Moves from visions of God's glory to prayers for forgiveness, compassion and a life shaped by his purposes.
From the Inside Out|Hillsong UNITED|8|7|7|Devotion|Confesses human failure, God's enduring mercy and a desire for inner change and worship.
Broken Vessels (Amazing Grace)|Hillsong Worship|8|7|7|Grace|Combines grace language with a testimony of restoration; the original hymn and added material should be reviewed separately.
So Will I (100 Billion X)|Hillsong UNITED|7|8|7|Creation|Moves through creation, revelation and redemption with expansive poetic imagery; several lines need careful interpretation rather than literal scientific claims.
Touch of Heaven|Hillsong Worship|8|5|7|Desire for God|A prayer of openness and nearness to God; the experiential emphasis offers few specific explanations of his character or saving work.
Man of Sorrows|Hillsong Worship|9|9|8|Atonement|Confesses Christ's willing suffering, the finished work of the cross and freedom through his sacrifice.
Psalm 46 (Lord of Hosts)|Shane & Shane · The Worship Initiative|9|9|8|Refuge|Develops Psalm 46's pictures of upheaval, God's presence and the command to be still under his sovereign rule.
Psalm 23 (Surely Goodness, Surely Mercy)|Shane & Shane · The Worship Initiative|9|8|8|Providence|Sets the shepherd psalm's guidance, provision and comfort within a modern refrain.
Psalm 34 (Taste and See)|Shane & Shane · The Worship Initiative|9|9|8|Praise|Uses Psalm 34's testimony of seeking the Lord, deliverance and invitation to taste his goodness.
Psalm 90 (Satisfy Us with Your Love)|Shane & Shane · The Worship Initiative|9|9|8|Dependence|Connects human frailty with prayer for God's mercy, satisfying love and the establishment of our work.
Psalm 145 (The Lord Is Gracious and Compassionate)|Shane & Shane · The Worship Initiative|9|8|8|Attributes of God|Names God's mercy and patient kindness and invites praise across generations.
Glorious Christ|Sovereign Grace Music|9|9|9|Christ|Develops Christ's eternal glory, humility, saving death and reign as reasons for worship.
He Is Our God|Sovereign Grace Music|9|9|9|Holiness|Uses God's unmatched power and redeeming care to lead into corporate praise of his holiness.
Christ Exalted Is Our Song|Sovereign Grace Music|9|9|9|Christ|Keeps praise centered on Christ's person, saving work and exaltation rather than the worshipper's experience.
All Glory Be to Christ|Kings Kaleidoscope|9|9|9|Christ|Adapts a familiar tune to developed praise of Christ's provision, kingdom and final restoration.
Holy Forever|Chris Tomlin|9|8|8|Holiness|Joins heavenly and earthly worship in praise of God's holiness and the supremacy of his name.
Gratitude|Brandon Lake|8|6|8|Thanksgiving|Acknowledges the limits of the singer's response and offers heartfelt praise; it develops response more than doctrinal explanation.
I Speak Jesus|Charity Gayle|7|6|7|Prayer|Prays for Christ's presence and help over varied needs; distinguish invocation of Jesus from a formula guaranteeing relief.
Thank You Jesus for the Blood|Charity Gayle|9|9|8|Atonement|Connects cleansing, reconciliation and new life explicitly with Christ's saving blood.
Firm Foundation (He Won’t)|Cody Carnes · Maverick City Music|8|7|7|Assurance|Expresses security in Christ amid uncertainty; explain standing firm as faithful endurance rather than exemption from loss.
Run to the Father|Cody Carnes|8|7|8|Repentance|A prayer of returning to the Father through grace and Christ's sacrifice; personal response receives substantial emphasis.
A Thousand Hallelujahs|Brooke Ligertwood|9|8|8|Praise|Connects the abundance of praise with Christ's saving work and eternal worthiness.
Forever (We Sing Hallelujah)|Kari Jobe|7|8|8|Resurrection|Narrates Christ's death and resurrection in vivid imagery; the grave-battle line deserves careful theological review.
`;
export const modernCatalog = rows
  .trim()
  .split("\n")
  .map((line) => {
    const [title, artist, a, s, l, theme, summary] = line.split("|");
    const slug = (title + " " + artist)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return {
      id: "modern-" + slug,
      title,
      author: "Associated recording: " + artist,
      firstLine: "",
      category: /Sovereign Grace|Kings Kaleidoscope/.test(artist)
        ? "modern"
        : "worship",
      version: "Associated recording · verify exact text and arrangement",
      themes: [theme],
      review: {
        status: "ai",
        scores: { accuracy: +a, substance: +s, language: +l, time: null },
        summary,
        claims: [],
        concerns: [],
        uses: [],
        scriptures: [],
        sources: [],
        concern: title.startsWith("Forever (") ? "context" : "none",
        musical: "",
        language: "",
        time: "",
        key: "",
        minutes: 4,
        notes: title.startsWith("Forever (")
          ? "Project owner’s personal theological concern: Jesus did not undergo a “battle in the grave.” His work was finished on the cross."
          : "",
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
        updatedAt: "2026-10-12T00:00:00Z",
      },
    };
  });
