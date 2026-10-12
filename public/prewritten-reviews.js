// Prewritten AI drafts from general model knowledge, not a live lyric/source audit.
// Each row evaluates a particular known text; never score by artist or title alone.
// Exact editions and recordings still require human review. No inferred musical data.
const rows = `
Yet|7|6|7|Lament|A vulnerable prayer about weakness and fear of rejection. Read the plea for God not to give up as the singer’s struggle, rather than a settled claim that God abandons his people.
All Hail the Power of Jesus’ Name|9|8|8|Kingship|Calls peoples and nations to honor Christ as Lord, with a clear repeated act of praise.
Praise to the Lord, the Almighty|9|9|8|Providence|Develops praise through God's creation, provision, protection and sustaining care.
Immortal, Invisible, God Only Wise|9|9|8|Attributes of God|Names God's eternity, wisdom, holiness and invisible majesty through developed poetic contrasts.
O Worship the King|9|9|8|Creation|Connects God's kingship and glory with his care for frail, dependent people.
Come, Thou Almighty King|9|8|8|Trinity|Addresses Father, Son and Spirit in an ordered prayer for worship and divine help.
Come, Christians, Join to Sing|9|7|8|Praise|A direct invitation to shared praise; clear purpose, modest breadth of doctrinal explanation.
Rejoice, the Lord Is King|9|8|8|Kingship|Christ's living reign and return supply concrete reasons for rejoicing.
Jesus Shall Reign|9|9|8|Mission|Envisions Christ's worldwide reign and its blessings beyond one people or place.
All Glory, Laud, and Honor|9|8|8|Kingship|Connects the church's praise with Christ's royal entry into Jerusalem.
The Church’s One Foundation|9|9|8|Church|Grounds the church in Christ's saving work and traces its unity, struggle and future hope.
My Hope Is Built on Nothing Less|9|9|8|Assurance|Places confidence in Christ's righteousness and saving work rather than personal merit.
I Need Thee Every Hour|9|7|8|Dependence|A coherent prayer for Christ's help throughout ordinary life, temptation and trial.
Abide with Me|9|9|9|Comfort|Prays for Christ's presence as life changes and death approaches; later stanzas deepen its hope.
Be Still, My Soul|9|8|8|Trust|Encourages patient confidence in God's care amid grief and change, looking toward final restoration.
Guide Me, O Thou Great Jehovah|9|9|8|Dependence|Uses wilderness pilgrimage to pray for God's provision, guidance and safe passage through death.
All the Way My Savior Leads Me|9|8|8|Providence|Reflects on Christ's guidance, sustaining grace and the believer's hope beyond this life.
Savior, Like a Shepherd Lead Us|9|8|8|Dependence|The shepherd image supports connected prayers for guidance, protection, forgiveness and obedience.
Take My Life and Let It Be|9|8|9|Devotion|A structured dedication of the worshipper's time, possessions, speech and will to God.
May the Mind of Christ My Savior|9|9|9|Discipleship|Prays for Christlike thought, love and conduct, with attention to how others see Christ through us.
I Love to Tell the Story|9|7|8|Witness|Expresses delight in proclaiming Christ and his love; greater gospel detail comes from surrounding teaching.
We Gather Together|8|7|8|Thanksgiving|Thanks God for protection and guidance; historic conflict imagery benefits from contextual interpretation.
Now Thank We All Our God|9|8|8|Thanksgiving|Thanks God for lifelong care and concludes with explicit Trinitarian praise.
Come, Ye Thankful People, Come|9|8|8|Thanksgiving|Moves from harvest thanksgiving to final gathering and judgment; retain the later stanzas for its full message.
For the Beauty of the Earth|9|7|9|Thanksgiving|An orderly thanksgiving for creation, relationships and the church; its focus is gratitude rather than broad doctrine.
Joy to the World|9|9|9|Kingship|Celebrates the Lord's coming reign, creation's response and the reach of blessing against the curse.
Hark! the Herald Angels Sing|9|10|9|Incarnation|Develops Christ's deity, incarnation, reconciliation and new life with unusually dense doctrinal language.
O Come, All Ye Faithful|9|9|8|Incarnation|Invites adoration of the incarnate Christ and, in fuller versions, states his divine identity clearly.
O Come, O Come, Emmanuel|9|9|8|Advent|Its successive biblical titles form prayers for Christ's coming, deliverance and restoration.
Come, Thou Long-Expected Jesus|9|9|9|Advent|Connects longing for Christ with release from sin, his reign and lasting hope for his people.
Angels We Have Heard on High|9|7|8|Christmas|Retells the angels' praise and invites worship at the manger; the Latin refrain is meaningful praise.
Silent Night|8|7|8|Christmas|A quiet meditation on Christ's birth; assess the wording of the particular translation.
O Little Town of Bethlehem|9|8|9|Incarnation|Connects Christ's birth with divine grace and a prayer to receive his presence.
The First Noel|8|7|7|Christmas|A narrative carol about the birth of Christ; details and stanza wording vary across editions.
What Child Is This?|9|9|9|Incarnation|Moves from the manger to Christ's identity and, in fuller versions, the cross and a response of worship.
Man of Sorrows! What a Name|9|9|9|Atonement|Traces the Savior's humiliation, substitutionary sacrifice, finished work and return.
O Sacred Head, Now Wounded|9|9|9|Cross|Reflects on Christ's suffering and the worshipper's gratitude, confession and dependence at death.
Jesus Christ Is Risen Today|9|8|8|Resurrection|Clear Easter praise connecting Christ's resurrection with his saving suffering.
Up from the Grave He Arose|9|8|8|Resurrection|Contrasts Christ's burial with his triumphant bodily resurrection; the refrain carries its central claim.
I Know That My Redeemer Lives|9|9|8|Resurrection|Develops the significance of the living Christ for present help, intercession and future hope.
Dying with Jesus (Moment by Moment)|8|8|7|Union with Christ|Describes ongoing dependence on Christ and union with him through a sequence of paired phrases.
In Christ Alone|9|10|9|Gospel|Traces Christ's incarnation, atoning death, resurrection and the believer's secure hope in a coherent narrative.
The Power of the Cross|9|10|9|Atonement|Focuses on Christ bearing sin and judgment at the cross, leading to forgiveness and costly gratitude.
Speak, O Lord|9|9|9|Scripture|A structured prayer that hearing God's word would produce faith, obedience and a life shaped by truth.
How Deep the Father’s Love for Us|8|9|9|Cross|Reflects on the cost of Christ's saving death and rejects boasting in human achievement.|Interpret the Father's turning away as poetic atonement language; it should not imply division within the Trinity.
Before the Throne of God Above|9|10|9|Assurance|Grounds assurance in Christ's priestly intercession, righteousness and sufficient sacrifice.
Yet Not I but Through Christ in Me|9|9|9|Dependence|Develops reliance on Christ through weakness, forgiveness, perseverance and future hope.
His Mercy Is More|9|9|9|Mercy|Contrasts the extent of human sin with God's patient mercy and the cost of redemption.
Come Behold the Wondrous Mystery|9|10|9|Gospel|Traces incarnation, obedient life, substitutionary death and resurrection in connected stanzas.
He Will Hold Me Fast|9|8|9|Assurance|Centers on Christ's preserving love amid weakness and temptation, grounded in his saving death and resurrection.
All I Have Is Christ|9|9|9|Grace|Moves from lostness and rescue through the cross to grateful dependence and a life offered to Christ.
Christ Our Hope in Life and Death|9|9|9|Assurance|A catechism-like confession that Christ grounds hope through life, death and the coming resurrection.
O Church Arise|9|9|9|Discipleship|Calls the church to spiritual faithfulness, witness and perseverance in the strength Christ supplies.
By Faith|9|9|8|Faith|Connects the witness of God's people across generations with present faithfulness and hope in his promises.
There Is a Higher Throne|9|9|9|Future hope|Looks toward the redeemed gathered before God, joining present worship to future consummation.
Across the Lands|9|9|9|Christ|Praises the eternal Word's creation, incarnation, saving work and continuing reign.
My Worth Is Not in What I Own|9|9|9|Identity in Christ|Rejects possessions and achievement as grounds of worth, locating confidence in Christ's cross.
The Lord Is My Salvation|9|9|9|Salvation|Confesses God's saving strength through fear, weakness, trial and the final passage through death.
Behold Our God|9|9|9|Attributes of God|Pairs God's unmatched wisdom and power with Christ's humiliation, death and resurrection.
O Great God|9|9|9|Sanctification|A developed prayer for the God who gave new life to govern desires, speech and conduct.
Jesus, Thank You|9|9|9|Atonement|Connects reconciliation and gratitude with Christ's blood and the change from enmity to fellowship.
Lord, from Sorrows Deep I Call|9|9|9|Lament|Prays honestly amid suffering while returning to hope in God's steadfast care.
Christ the Sure and Steady Anchor|9|9|9|Assurance|Develops the anchor image through temptation, suffering and death, resting in Christ's faithfulness.
I Will Wait for You (Psalm 130)|9|9|9|Repentance|Develops Psalm 130's movement from crying out to waiting for the Lord and hoping in his redemption.
Almost Home|9|8|8|Future hope|Encourages endurance by contrasting present difficulty with the believer's approaching heavenly rest.
Sing We the Song of Emmanuel|9|9|9|Incarnation|Celebrates God with us through Christ's birth and saving purpose, leading to public praise.
God the Uncreated One (King Forevermore)|9|9|9|Kingship|Moves through God's eternity and sovereignty to Christ's incarnation, cross and enduring reign.
Only a Holy God|9|9|9|Holiness|Uses concrete questions about God's uniqueness, power and saving grace to direct worship to him alone.
Ancient of Days|9|8|9|Sovereignty|The CityAlight text expresses confidence in God's enduring rule amid nations, fear and an uncertain future.
Good and Gracious King|9|8|9|Grace|Approaches God through the acceptance he supplies, linking his majesty with undeserved grace.
Jesus, Strong and Kind|9|8|9|Dependence|Clear, simple statements of Christ's trustworthy help and his initiative in seeking those in need.
Saved My Soul|9|8|8|Salvation|A direct testimony of rescue and freedom through Christ; its refrain reinforces the central confession.
Christ Is Mine Forevermore|9|9|9|Assurance|Acknowledges sin, sorrow and conflict while developing the believer's lasting possession of Christ.
On That Day|9|8|8|Resurrection|Looks toward resurrection and Christ's return as grounds of joy and confidence today.
There Is One Gospel|9|10|9|Gospel|Confesses one saving gospel centered on Christ's death and resurrection and its place in the church's shared faith.
Grace|9|8|8|Grace|The CityAlight song centers on undeserved divine grace and its sustaining role through life.
Turn Your Eyes|9|9|9|Christ|The Sovereign Grace expansion directs attention to Christ's cross, resurrection and return rather than only the familiar refrain.
Show Us Christ|9|8|9|Scripture|Prays that hearing God's word would reveal Christ and transform the listeners' lives.
Let Your Kingdom Come|9|8|9|Mission|A prayer for God's kingdom, gospel witness and lives surrendered to his purposes.
The Glories of Calvary|9|9|9|Cross|Praises God's holiness and grace revealed in Christ's saving sacrifice.
Come Praise and Glorify|9|10|9|Trinity|Develops the Father's purpose, the Son's redemption and the Spirit's sealing in ordered Trinitarian praise.
10,000 Reasons (Bless the Lord)|9|8|8|Thanksgiving|Moves through a day and a lifetime of praise, naming God's love, patience and goodness as its reasons.
Blessed Be Your Name|8|8|8|Trust|Confesses praise in prosperity and loss; its giving and taking language needs pastoral context rather than a blanket claim about every tragedy.
The Heart of Worship|8|6|8|Worship|Confesses that worship should center on God rather than the performance; offers limited detail about his saving work.
How Great Is Our God|9|7|8|Attributes of God|Names God's majesty, eternity and triune identity within a simple praise structure.
Amazing Grace (My Chains Are Gone)|9|8|8|Grace|Newton's testimony of grace gains a modern freedom refrain; review the specific verses retained.
Our God|8|7|7|Power of God|Praises God's greatness and help through biblical miracle imagery; do not read its victory language as immunity from hardship.
Holy Is the Lord|9|7|8|Holiness|A concise response to God's holiness and glory; the central praise is clear but doctrinal breadth is limited.
Indescribable|9|8|8|Creation|Praises God's power and knowledge through varied creation imagery and his care for the worshipper.
Jesus Messiah|9|9|8|Atonement|Connects Christ's incarnation and sacrifice with redemption, rescue and hope.
Forever|9|8|8|Faithfulness|The Chris Tomlin song uses enduring love and faithfulness as grounds for corporate thanksgiving; it is distinct from Kari Jobe's song.
Good Good Father|8|6|7|Fatherhood of God|Emphasizes God's goodness and personal love; fewer specific claims explain who this Father is or how we know him.
At the Cross (Love Ran Red)|9|8|8|Cross|Responds to Christ's saving death with surrender and gratitude, though the refrain relies heavily on evocative imagery.
I Will Rise|9|9|8|Resurrection|Connects the believer's future resurrection with Christ's victory and heavenly worship.
Whom Shall I Fear (God of Angel Armies)|8|7|8|Assurance|Expresses confidence in God's presence and protection; interpret assurances through faithful endurance rather than guaranteed earthly success.
Is He Worthy?|9|10|9|Redemption|Uses questions and congregational responses to move from creation's brokenness to the slain Lamb's worthiness and redemption.
Living Hope|9|9|8|Gospel|Develops Christ's incarnation, saving death and resurrection as the basis of the believer's living hope.
This Is Amazing Grace|8|8|8|Grace|Praises the King who creates, rules and takes the sinner's place; check how its liberation language is explained.
This Is Our God|9|8|8|Gospel|Connects rescue from sin and fear with Christ's cross and resurrection in direct congregational praise.
Great Things|8|7|8|Deliverance|Celebrates God's saving deeds and faithfulness; its broad victory language needs the actual service context.
House of the Lord|8|7|8|Praise|Calls the gathered church to rejoice in God's rescue, including Christ's death and resurrection.
Hymn of Heaven|9|9|8|Future hope|Looks toward life with God and worship of the Lamb, joining future hope with present faithfulness.
Battle Belongs|8|6|7|Trust|Turns fear into prayer and confidence in God; broad triumph statements require context about suffering and unanswered expectations.
Build My Life|9|7|8|Devotion|Moves from praise of Jesus' worth to prayer for holiness, love and a life founded on trust in him.
Great Are You Lord|9|6|8|Praise|Acknowledges life and breath as God's gifts and returns them in praise; the central thought is strong but narrowly developed.
Lord, I Need You|9|8|8|Dependence|Confesses dependence on grace and Christ's righteousness through temptation and weakness.
Here I Am to Worship|9|8|8|Incarnation|Connects the incarnate Christ's humility and the cost of the cross with a response of worship.
Mighty to Save|8|8|8|Salvation|Names mercy, forgiveness and Christ's resurrection as grounds of saving hope.
Cornerstone|9|8|8|Assurance|Builds a modern refrain around the traditional hymn's confidence in Christ's righteousness; retain verses for its doctrinal development.
What a Beautiful Name|8|8|8|Christ|Moves through Christ's eternal identity, incarnation and victory to praise of his name.|The line about not wanting heaven without us can suggest human need in God; interpret carefully alongside his self-sufficiency.
Who You Say I Am|8|7|8|Identity in Christ|Affirms acceptance and freedom in Christ; the repeated identity statements carry more emphasis than explanation of salvation.
Oceans (Where Feet May Fail)|8|6|7|Trust|A prayer for faith and dependence under the imagery of stepping into unknown waters; much of its development is experiential.
King of Kings|9|10|9|Gospel|Traces incarnation, cross, resurrection and the church's witness, with explicit Trinitarian praise.
O Praise the Name (Anástasis)|9|9|9|Resurrection|Narrates Christ's suffering, burial and resurrection and looks ahead to his return.
Goodness of God|8|7|8|Faithfulness|A testimony of God's care and faithful presence; interpret goodness through suffering as well as favorable circumstances.
Raise a Hallelujah|8|6|7|Praise in trial|Chooses praise amid conflict and uncertainty; claims about praise's effects need context rather than mechanical guarantees.
King of My Heart|8|6|7|Trust|Uses shelter, wind and fire imagery to express reliance on God's goodness; limited doctrinal specificity.|The repeated assurance that God will never let us down needs explanation that does not promise preferred outcomes.
Reckless Love|7|7|7|Love of God|Uses the lost-sheep image to praise God's seeking love; its central adjective is rhetorically strong but theologically imprecise.|Calling divine love reckless can imply lack of wisdom; clarify the intended contrast with our calculations.
The Blessing|8|7|8|Blessing|Adapts the priestly blessing and adds family-focused petitions; distinguish prayerful blessing from guaranteed outcomes for every person.
Graves into Gardens|8|7|7|Restoration|Moves from the inadequacy of substitutes to confidence in God's transforming power through several biblical images.
Same God|8|7|7|Faithfulness|Appeals to God's work with biblical figures as grounds of present prayer; shared divine faithfulness does not guarantee identical experiences.
Jesus Paid It All (O Praise the One)|9|8|8|Atonement|Adds a praise bridge to the hymn's confession of Christ's sufficient saving work; assess retained stanzas and bridge length separately.
Death Was Arrested|8|8|8|Salvation|Describes release from sin and new life through Christ's death and resurrection; its arrest metaphor is poetic.
Glorious Day|8|8|8|New life|Uses being called from death to life as testimony to Christ's rescue; much of the song is personal response.
In Jesus’ Name|8|7|7|Confidence in Christ|The Darlene Zschech song connects confidence with Christ's victory; avoid treating victory language as guaranteed healing or earthly success.
Shout to the Lord|8|7|8|Praise|Praises God's majesty and faithful care with creation imagery and personal commitment.
Open the Eyes of My Heart|9|6|8|Holiness|A short prayer to perceive God's glory, drawing on Isaiah's vision; theological development is concentrated in a few phrases.
Above All|7|7|8|Cross|Contrasts Christ's supremacy with his suffering and rejection.|The claim that Christ thought of the singer above all may over-center the worshipper and obscure the wider purpose of the cross.
Give Thanks|9|7|9|Thanksgiving|Connects thanksgiving with the gift of Jesus and the reversal of human weakness and poverty.
As the Deer|8|6|8|Desire for God|Adapts the thirsting image of Psalm 42 into personal devotion; most of the text centers on the worshipper's desire.
I Love You, Lord|9|5|9|Devotion|A clear, brief expression of love and praise, with little doctrinal explanation beyond that intended purpose.
Lord, I Lift Your Name on High|8|7|8|Gospel|A concise movement from heaven to the cross, grave and exaltation; it sketches rather than explains the saving story.
You Are My All in All|9|8|8|Dependence|Connects need, Christ's saving work and the Lamb's worthiness in accessible praise.
Shine, Jesus, Shine|8|7|8|Mission|Prays for Christ's light and truth to transform people and reach the nations; imagery carries much of its message.
Knowing You (All I Once Held Dear)|9|9|9|Discipleship|Rejects former grounds of confidence for knowing Christ and sharing his righteousness and resurrection life.
In Christ Alone (I Place My Trust)|9|8|8|Trust|This distinct song places confidence in Christ's grace rather than personal strength and achievement.
Ancient of Days (Blessing and Honor)|9|8|8|Kingship|Praises God's eternal reign and the worship of all peoples; distinguish it from the CityAlight song of the same title.
Days of Elijah|7|7|7|Hope and witness|Uses biblical figures to portray present witness and hope for Christ's return.|Its identification of present days with particular biblical figures is typological poetry, not a precise prophetic timetable.
The Wonderful Cross|9|8|8|Cross|Adds a response chorus to Watts's developed reflection on the cross; assess the modern chorus separately from original stanzas.
Draw Me Close|8|5|7|Desire for God|Expresses longing for God's nearness with relational imagery; it gives relatively few specific claims about his person or work.
Breathe|8|5|7|Dependence|A short confession of dependence using breath and daily sustenance; the divine addressee is not made specific by many doctrinal claims.
Come, Now Is the Time to Worship|8|6|8|Worship|Invites worship and surrender now and acknowledges universal recognition of God; it focuses on response more than doctrinal explanation.
We Fall Down|9|6|8|Holiness|A concise response of humility and praise before the holy Lamb; repetition reinforces a narrow, clear confession.
Better Is One Day|9|7|8|Desire for God|Adapts Psalm 84's longing for God's dwelling into a focused expression of delight in his presence.
Trading My Sorrows|7|6|7|Hope in suffering|Uses scriptural joy and endurance imagery alongside declarations of leaving sorrow behind.|Avoid presenting exchanged sorrow or sickness as a guarantee that faithful believers will cease to suffer.
God of Wonders|9|8|8|Creation|Names God's holiness and creative majesty, connecting the visible heavens with praise.
Your Grace Is Enough|8|7|8|Grace|Praises God's faithfulness and grace through covenant and weakness imagery; the chorus is clear but broadly developed.
Everlasting God|9|8|8|Strength in weakness|Adapts Isaiah's contrast between human weakness and the unfailing God who strengthens those who wait for him.
Hosanna (Praise Is Rising)|8|6|8|Worship|Moves from longing and fear toward prayer for God's saving presence; doctrinal detail is relatively sparse.
Revelation Song|9|8|8|Holiness|Uses Revelation's throne-room and Lamb imagery for explicit praise of God's holiness and eternal identity.
Wonderful, Merciful Savior|9|9|9|Trinity|Addresses Christ, the Spirit and the Father with concrete saving and sustaining roles.
There Is a Redeemer|9|8|9|Redemption|Confesses Jesus as Redeemer and thanks the Father for the Son and Spirit, with hope of seeing him in glory.
The Lamb of God|9|9|9|Atonement|Connects Christ's innocence, sacrifice and rejection with the worshipper's need for cleansing and rescue.
He Is Exalted|9|7|9|Kingship|A compact confession of the Lord's reign and the praise due to him; clear but intentionally limited in scope.
We Believe|9|9|8|Creed|Explicitly confesses the Trinity, Christ's incarnation, death, resurrection and return, then relates belief to witness.
Redeemed|8|7|8|Redemption|A personal testimony of being freed from the defining weight of past sin by Christ's redemption.
How He Loves|8|6|7|Love of God|Uses intense relational and natural imagery to express divine love; version choices affect clarity and imagery substantially.
O Come to the Altar|8|7|8|Repentance|Invites those burdened by sin to receive forgiveness through Christ's blood.|Clarify that coming to a physical altar is a response symbol, not the means by which forgiveness is secured.
Resurrecting|9|8|8|Resurrection|Contrasts Christ's humiliation with exaltation and connects his resurrection with the believer's new life.
Way Maker|8|6|7|Faithfulness|Repeats several biblical descriptions of God and trust in his unseen work; more titles than developed explanations.
Because He Lives|9|8|8|Resurrection|Connects Christ's incarnation, cross and resurrection with confidence for life and death.
He Touched Me|8|7|8|Salvation|A personal testimony of Christ's transforming rescue, with emotional experience prominent in the account.
Something Beautiful|8|5|8|Restoration|A brief testimony to God's transforming work, with relatively little explanation of that transformation's basis.
The Family of God|8|6|8|Church|Celebrates shared belonging through Christ's cleansing and the care of the church as a family.
The Old Rugged Cross|8|8|8|Cross|Expresses devotion to the cross as the place of Christ's saving sacrifice; explain the symbol's relationship to Christ himself.
Victory in Jesus|8|8|8|Salvation|A testimony of rescue through Christ's blood and future hope; editions differ in healing imagery and selected verses.
I’ll Fly Away|8|6|8|Future hope|Expresses hope beyond death in accessible imagery; provides little account of bodily resurrection or the new creation.
When We All Get to Heaven|8|7|8|Future hope|Anticipates shared joy with Christ and encourages perseverance; explain the implied identity of the believing community.
Blessed Assurance|9|8|8|Assurance|Connects belonging to Christ with cleansing, Spirit-given life and a continuing testimony of praise.
To God Be the Glory|9|9|8|Gospel|Praises God for giving the Son and granting forgiveness through Christ's atoning work.
Redeemed, How I Love to Proclaim It|9|8|8|Redemption|A sustained testimony to redemption through the Lamb's blood and lasting belonging to God.
Pass Me Not, O Gentle Savior|8|7|8|Prayer|A prayer for mercy and trust in Christ; pastoral explanation can help avoid suggesting an unwilling Savior.
Just as I Am|9|8|8|Repentance|Approaches Christ on the basis of his blood and promise rather than personal readiness or merit; its opening 'just' is meaningful.
Softly and Tenderly|8|7|8|Invitation|Uses a pastoral invitation to repentance and forgiveness; interpret its emotional imagery through the gospel.
I Surrender All|8|7|8|Devotion|A direct profession of surrender and trust; treat the response as devotion rather than a claim to earn salvation.
Leaning on the Everlasting Arms|9|7|8|Assurance|Develops the supporting-arms image into confidence and fellowship under God's care.
Standing on the Promises|8|7|8|Trust|Confesses confidence in God's promises through trial; identify actual biblical promises rather than attaching any desired outcome.
There Is Power in the Blood|9|8|8|Atonement|Uses connected questions to confess cleansing and freedom through Christ's saving blood.
Nothing but the Blood|9|8|9|Atonement|A clear, sustained confession that cleansing and righteousness depend on Christ's saving blood alone.
Are You Washed in the Blood?|9|8|8|Atonement|Calls listeners to consider cleansing and trust in the Lamb's sacrifice rather than external religion.
At Calvary|9|8|8|Grace|Traces ignorance and conviction to forgiveness and grateful recognition of Christ's sacrifice.
At the Cross (Alas! and Did My Savior Bleed)|9|9|8|Cross|Watts's reflection on Christ's suffering is paired with a testimony refrain; assess the hymn and added refrain in context.
Since Jesus Came into My Heart|8|6|7|New life|A personal testimony of changed affections and hope; emotion receives more development than doctrinal explanation.
Higher Ground|8|6|8|Discipleship|Prays for growth and faithfulness using upward movement as an image; keep the image distinct from earning acceptance.
Count Your Blessings|8|6|8|Thanksgiving|Encourages recollection of God's gifts amid discouragement; avoid using it to dismiss grief or suffering.
Sweet Hour of Prayer|8|7|8|Prayer|Describes prayer as refuge and fellowship amid difficulty; wording and stanza selections vary among hymnals.
Precious Lord, Take My Hand|9|7|9|Lament|A clear prayer for the Lord's sustaining guidance through weakness, darkness and the final journey home.
His Eye Is on the Sparrow|8|7|8|Providence|Connects care for the sparrow with trust in God's attentive love through discouragement.
Soon and Very Soon|8|6|8|Future hope|Anticipates seeing the King and release from sorrow; a simple confession rather than a developed account of final hope.
My Tribute (To God Be the Glory)|9|8|8|Thanksgiving|Thanks God for undeserved grace and explicitly connects praise with Christ's blood and power.
Total Praise|9|7|9|Dependence|A focused prayer of trust in the Lord as source of strength and help through trouble.
Every Praise|9|6|8|Praise|Repeated corporate praise names God's saving and delivering work; doctrinal development is limited by its compact structure.
We’ve Come This Far by Faith|8|7|8|Faith|A communal testimony of dependence on God's word and sustaining care through the journey of faith.
Down at the Cross (Glory to His Name)|9|8|8|Cross|Celebrates cleansing and pardon through Christ's saving sacrifice with a clear praise refrain.
Jesus Loves Me|9|7|9|Love of Christ|A simple confession of Christ's love grounded in Scripture, weakness and belonging to him.
`;
const map = new Map(
  rows
    .trim()
    .split("\n")
    .map((line) => {
      const [title, a, s, l, theme, summary, concern] = line.split("|");
      return [title, { a: +a, s: +s, l: +l, theme, summary, concern }];
    }),
);
export function prewrittenReview(song) {
  const entry = map.get(song.title);
  if (!entry) return song;
  return {
    ...song,
    themes: [entry.theme],
    version: song.version.replace(
      "title record; verify exact text and arrangement",
      "verify exact text and arrangement",
    ),
    review: {
      ...song.review,
      status: "ai",
      scores: {
        accuracy: entry.a,
        substance: entry.s,
        language: entry.l,
        time: null,
      },
      summary: entry.summary,
      claims: [],
      uses: [],
      scriptures: [],
      sources: [],
      concerns: entry.concern ? [entry.concern] : [],
      concern: entry.concern ? "context" : "none",
      musical: "",
      language: "",
      time: "",
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
}
