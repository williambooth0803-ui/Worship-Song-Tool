// Editorial finding aid. Recording associations are not songwriting credits.
// Titles without a lyric assessment intentionally have no invented ratings,
// themes, Scripture connections, keys or arrangement measurements.
const groups = [
  ["worship", "Cody Carnes", `Christ Be Magnified|Nothing Else|Take You at Your Word|God Is Good|Too Good to Not Believe|Ain't Nobody|Good (Can't Be Anything Else)|Be Glad`],
  ["worship", "Elevation RHYTHM", `Goodbye Yesterday|Washed|At the Altar|Known by You|PRAISES|This Is the Gospel|IYKYK|Still Holy|Fake Love|Growing Pains|Over & Over|Never Walk Away|Walk on Water|Better with You|You Will Be Saved|Easy|Heartbeat|Purify|Reality|Here`],
  ["worship", "Red Rocks Worship", `Good Plans|Breakthrough|Echo Holy|No Other Love|Now Here|Something Has to Break|Overflow|Fill This Place|On Earth as in Heaven|Nobody Like You|Be Still|Living Litany|Come Alive|The Battle Is Yours|Things of Heaven|All I Want|Never Leave`],
  ["worship", "Elevation Worship", `Same God|The Blessing|O Come to the Altar|Resurrecting|Graves into Gardens|Here Again|Never Lost|My Testimony|Give Me Faith|It Is So|There Is a Cloud|Fullness|Unstoppable God|Old Church Basement|Wait on You|Talking to Jesus|What I See|This Is the Kingdom|Bless You|Another One|Sure Been Good|All of a Sudden|Always on Time|God Is Not Against Me|Jesus Be the Name|I Know a Name|When Wind Meets Fire|Yesterday Today & Forever|Welcome Resurrection|Jesus I Come|No One Beside|Hallelujah Here Below|Then He Rose|Shine a Light|We Rejoice|Let Us Adore|Mighty God (Another Hallelujah)|Open the Grave|Mercy`],
  ["worship", "Bethel Music", `Goodness of God|Raise a Hallelujah|Reckless Love|King of My Heart|God of Revival|Alabaster Heart|Homecoming|Egypt|We Praise You|Reason to Praise|I Believe|Beauty|Come Up Here|Son of Suffering|Our King Jesus|Ain't No Grave|Dancing on the Waves|Anything Is Possible|Champion|Promises Never Fail|Endless Alleluia|Ever Be|Have It All|Pieces|Closer|One Thing Remains|Our Father|I Love Your Presence|You Are Good|Come to Me|The Blood|Victory Is Yours|For the One|God of the Redeemed|Peace|Stand in Your Love`],
  ["worship", "Hillsong Worship", `What a Beautiful Name|Who You Say I Am|King of Kings|O Praise the Name (Anástasis)|Cornerstone|Mighty to Save|Here I Am to Worship|Shout to the Lord|I Give You My Heart|Still|This Is Our God|Eagle's Wings|Awake My Soul|No One but You|See the Light|New Wine|Fresh Wind|That's the Power|Never Walk Alone|Hope of the Ages|Remembrance|Behold (Then Sings My Soul)|Love on the Line|Grace to Grace|Calvary|At the Cross|Christ Is Enough|God Is Able|With All I Am|You Are My World|Jesus I Need You|Beautiful Exchange|Open Heaven (River Wild)|Let There Be Light|Prince of Peace|His Glory Appears|I Surrender`],
  ["worship", "Hillsong UNITED", `Oceans (Where Feet May Fail)|The Stand|Another in the Fire|Good Grace|Highlands (Song of Ascent)|Whole Heart (Hold Me Now)|As You Find Me|Clean|Know You Will|On Repeat|Sure Thing|Echoes (Till We See the Other Side)|Scandal of Grace|Not Today|Wonder|Say the Word|Even When It Hurts (Praise Song)|With Everything|Lead Me to the Cross|Best Friends|All I Need Is You|Take It All|Salvation Is Here|Go|Relentless|Futures|Nobody Like You|Heaven Knows`],
  ["worship", "Passion", `Glorious Day|Build My Life|God, You're So Good|I've Witnessed It|Even So Come|Whole Heart|Follow You Anywhere|There's Nothing That Our God Can't Do|Beautiful Jesus|Simple|Worthy of Your Name|Remember|All Praise|It Is Finished|King of Glory|Let Me See Jesus|Fall Like Rain|Because of Christ|He Who Is to Come|Call on Heaven`],
  ["worship", "Phil Wickham", `Living Hope|Battle Belongs|This Is Amazing Grace|House of the Lord|Hymn of Heaven|I Believe|The Jesus Way|Sunday Is Coming|This Is Our God|Great Things|Doxology (Amen)|Your Love Awakens Me|At Your Name|Till I Found You|Song in My Soul|It's Always Been You|1000 Names|Heaven Song|You're Beautiful|Holy Light|Praise the Lord|People of Heaven|Look to Jesus|True Love|The King Is in the Room`],
  ["worship", "Brandon Lake", `Praise You Anywhere|Hard Fought Hallelujah|That's Who I Praise|Count 'Em|Coat of Many Colors|Miracle Child|Tear Off the Roof|More|Adoption Song|Fear Is Not My Future|Greater Still|Just Like Heaven|House of Miracles|Lost in Your Love|Help!|So Close|Don't You Give Up on Me|Sevens|Meant for Good`],
  ["worship", "Charity Gayle", `I Believe|Endless Praise|New Name Written Down in Glory|You Have Made Me Glad|We Need a Miracle|Name Above All Names|Because of Jesus|Seed of Faith|Echo (In Jesus Name)|Divine Exchange|Cleansed|Living in the Overflow|Look What the Lord Has Done|Amen|Benediction (As You Go)`],
  ["worship", "Maverick City Music", `Promises|Jubilee|Rest on Us|Refiner|Man of Your Word|Communion|I Thank God|God Problems|Most Beautiful / So in Love|Such an Awesome God|Make It Right|Getting Ready|The Story I'll Tell|To You|Be Praised|Isaiah Song`],
  ["worship", "Jesus Culture", `Holy Spirit|Your Love Never Fails|How He Loves|Break Every Chain|Fierce|Rooftops|Set a Fire|In the River|Freedom|Alive in You|Make Us One|Move|Defender|Living with a Fire|Let It Echo|Come Away|God with Us|Light of the World|Miracles|Your Name Is Glorious`],
  ["worship", "Kari Jobe", `Revelation Song|I Am Not Alone|Heal Our Land|You Are for Me|Let the Heavens Open|Hands to the Heavens|The Garden|Steady My Heart|Healer|First Love|Speak to Me|Rest|Love So Holy`],
  ["worship", "Chris Tomlin", `How Great Is Our God|Our God|Good Good Father|Amazing Grace (My Chains Are Gone)|Jesus Messiah|Whom Shall I Fear (God of Angel Armies)|I Will Follow|I Will Rise|At the Cross (Love Ran Red)|God of This City|Forever|Indescribable|Made to Worship|Jesus|Nobody Loves Me Like You|Always|Thank You Lord|God's Great Dance Floor|Home|All My Fountains|Crown Him (Majesty)|Sing, Sing, Sing|Waterfall|Nobody Like Our God|Jesus Son of God|Resurrection Power|White Flag|Lay Me Down|Praise Is the Highway`],
  ["modern", "CityAlight", `Christ Is Mine Forevermore|Yet Not I but Through Christ in Me|Only a Holy God|Ancient of Days|Jesus, Strong and Kind|There Is One Gospel|God Is for Us|It Was Finished Upon That Cross|Your Will Be Done|Saved My Soul|I Will Trust My Saviour Jesus|On That Day|Known and Loved|All My Ways Are Known to You|Good and Gracious King|The Night Song|The Love of the Father|Jesus Is Alive|Come to Jesus|Grace|Holy God|My God Is All I Need`],
  ["modern", "Sovereign Grace Music", `All I Have Is Christ|Behold Our God|O Lord, My Rock and My Redeemer|Jesus, Thank You|Come Behold the Wondrous Mystery|Before the Throne of God Above|Let Your Kingdom Come|Now Why This Fear|Not in Me|Show Us Christ|O Great God|His Forever|The Glories of Calvary|Turn Your Eyes|All Praise to Him|Come Praise and Glorify|A Christian's Daily Prayer|Grace and Peace|Prepare Him Room|O Come, All You Unfaithful|He Who Is Mighty|Oh the Deep, Deep Love|We Look to You|How Rich a Treasure We Possess|The Lord Almighty Reigns|Heaven Has Come to Us|Christ Our Wisdom|My Soul Will Wait (Psalm 62)|As Long as You Are Glorified|You Have Been Raised|Greater Than We Can Imagine|I Will Glory in My Redeemer|Shine into Our Night|You Are Our Hope`],
  ["modern", "Keith & Kristyn Getty", `In Christ Alone|The Power of the Cross|Speak, O Lord|By Faith|Across the Lands|See, What a Morning|The Lord Is My Salvation|Christ Our Hope in Life and Death|My Worth Is Not in What I Own|His Mercy Is More|He Will Hold Me Fast|O Church, Arise|Holy Spirit, Living Breath of God|Facing a Task Unfinished|Lift High the Name of Jesus|For the Cause|Creation Sings the Father's Song|In the Valley|Still, My Soul, Be Still|Magnificent, Marvelous, Matchless Love|Christ Is All in All|Rejoice|The Perfect Wisdom of Our God|A Rich Young Man (Simple Living)|Sing We the Song of Emmanuel|God of Grace|Oh How Good It Is|The Lord Is in His Holy Temple|I Will Wait for You (Psalm 130)|Psalm 24 (The King of Glory)|Lovingkindness|Christ the Sure and Steady Anchor|Consider the Stars|Lord from Sorrows Deep I Call|Come to the Waters|I Am Not My Own|The Lord Is My Shepherd|May the Peoples Praise You`],
  ["modern", "Matt Boswell & Matt Papa", `Come Behold the Wondrous Mystery|His Mercy Is More|Christ the Sure and Steady Anchor|Christ Our Hope in Life and Death|Lord from Sorrows Deep I Call|How Rich a Treasure We Possess|Sing We the Song of Emmanuel|Almost Home|All My Boast Is in Jesus|Let the Nations Be Glad|Come Adore the Humble King|God of Every Grace|Our God Will Go Before Us|Psalm 150 (Praise the Lord)|Christ Our Glory|He Is Worthy|The King in All His Beauty|O Give Thanks|O Fount of Love|God the Uncreated One (King Forevermore)|Your Mercy|Come to the Waters`],
  ["modern", "Shane & Shane · The Worship Initiative", `Psalm 51 (Wisdom in the Secret Heart)|Psalm 91 (On Eagles' Wings)|Psalm 98 (Sing Unto the Lord)|Psalm 139 (Far Too Wonderful)|Psalm 63 (Better Than Life)|Psalm 16 (Fullness of Joy)|Psalm 13 (How Long O Lord)|Psalm 27 (One Thing)|Psalm 130 (I Will Wait for You)|Psalm 42 (Loudest Praise)|Psalm 45 (Fairest of All)|Psalm 84 (I'm Home)|Psalm 8 (How Majestic Is Your Name)|You've Already Won|All Sufficient Merit|All My Hope|Though You Slay Me|Burn Us Up|When I Think About the Lord|We Love You Jesus|You Said|Yearn|Lord of All|Unto You`],
  ["ccm", "Matt Redman", `10,000 Reasons (Bless the Lord)|Blessed Be Your Name|The Heart of Worship|You Never Let Go|Better Is One Day|Once Again|Let Everything That Has Breath|Never Once|Endless Hallelujah|Mercy|Your Grace Finds Me|Unbroken Praise|Lamb of God|Gracefully Broken|One Day (When We All Get to Heaven)|Upon Him|The Same Jesus|Sing and Shout`],
  ["ccm", "Matt Maher", `Lord, I Need You|Because He Lives (Amen)|Your Grace Is Enough|All the People Said Amen|Christ Is Risen|Alive & Breathing|The Lord's Prayer (It's Yours)|Hold Us Together|What a Friend|Turn Around|In the Room|Your Love Defends Me|Just as I Am|The In Between`],
  ["ccm", "Casting Crowns", `Who Am I|Voice of Truth|Praise You in This Storm|Glorious Day (Living He Loved Me)|East to West|Until the Whole World Hears|Only Jesus|Nobody|Scars in Heaven|Oh My Soul|God of All My Days|Just Be Held|Already There|Lifesong|Jesus, Friend of Sinners|If We Are the Body|The Well|Broken Together|The Altar and the Door|Courageous`],
  ["ccm", "MercyMe", `I Can Only Imagine|Word of God Speak|Even If|Greater|Flawless|All of Creation|God with Us|You Are I Am|Bring the Rain|In You|Here with Me|Beautiful|Best News Ever|Almost Home|Say I Won't|To Not Worship You`],
  ["ccm", "Michael W. Smith", `Agnus Dei|Above All|Let It Rain|Healing Rain|Ancient Words|A New Hallelujah|Our God Is an Awesome God|You Are Holy (Prince of Peace)`],
  ["ccm", "Steven Curtis Chapman", `Great Expectations|Speechless|For the Sake of the Call|The Great Adventure|His Strength Is Perfect|Be Still and Know|God Is God|Magnificent Obsession|My Redeemer Is Faithful and True|More to This Life|Cinderella|Lord of the Dance|We Believe|I Will Be Here|Remember to Remember|Don't Lose Heart`],
  ["ccm", "We The Kingdom", `Holy Water|God So Loved|Child of Love|Miracle Power|Jesus Does|Left It in the Water|Church Music|No Doubt About It|Don't Tread on Me|Waking Up|Cages`],
  ["ccm", "CAIN", `Rise Up (Lazarus)|Yes He Can|I'm So Blessed|The Commission|Friend in Jesus|Jesus Music|Any More|Come Forth|Windows Down|Made for Heaven`],
  ["ccm", "Anne Wilson", `My Jesus|Sunday Sermons|Strong|The Cross|Hey Girl|Mamas|God & Country|This House|Living Water|Rain in the Rearview`],
  ["ccm", "Crowder", `Come as You Are|All My Hope|Good God Almighty|God Really Loves Us|Forgiven|Red Letters|In the House|Lift Your Head Weary Sinner (Chains)|Run Devil Run|Let It Rain (Is There Anybody)|I Am|Oh Happiness|Everything Glorious|After All (Holy)`],
  ["ccm", "Zach Williams", `Chain Breaker|Fear Is a Liar|Old Church Choir|There Was Jesus|Less Like Me|Rescue Story|Heart of God|Lookin' for You|Under My Feet|Slave to Nothing`],
  ["ccm", "Lauren Daigle", `You Say|How Can It Be|Trust in You|Rescue|O'Lord|Still Rolling Stones|Look Up Child|Hold On to Me|Thank God I Do|These Are the Days|Come Alive (Dry Bones)|First|Light of the World`],
  ["ccm", "Katy Nichole", `In Jesus Name (God of Possible)|God Is in This Story|Hold On|Jesus Changed My Life|My God Can|Please|By the Grace of God|Take It to the Cross`],
  ["gospel", "CeCe Winans", `Believe for It|That's My King|Worthy of It All|Come Jesus Come|Alabaster Box|Mercy Said No|More Than This|Jesus, You're Beautiful|He's Concerned|Fill My Cup|We Welcome You (Holy Father)`],
  ["gospel", "Donnie McClurkin", `We Fall Down|Stand|Great Is Your Mercy|I Call You Faithful|Only You Are Holy|Holy|Speak to My Heart|I Need You|The Prayer`],
  ["gospel", "Kirk Franklin", `My Life Is in Your Hands|I Smile|Imagine Me|Love Theory|Now Behold the Lamb|Why We Sing|Silver and Gold|The Blood Song|Stomp|Brighter Day|Wanna Be Happy?|My World Needs You|Looking for You|Melodies from Heaven`],
  ["gospel", "Fred Hammond", `No Weapon|We're Blessed|You Are the Living Word|Jesus Be a Fence Around Me|Let the Praise Begin|Glory to Glory to Glory|When the Spirit of the Lord|Blessed|I Will Trust|This Is the Day|Your Steps Are Ordered`],
  ["gospel", "Tasha Cobbs Leonard", `You Know My Name|For Your Glory|Fill Me Up|I'm Getting Ready|Put a Praise on It|Your Spirit|Great God|This Is a Move|Royalty|In Spite of Me`],
  ["gospel", "Gaither Vocal Band", `He Touched Me|The King Is Coming|Alpha and Omega|Yes, I Know|I Believe in a Hill Called Mount Calvary|Sinner Saved by Grace|Let Freedom Ring|Worthy the Lamb|There's Something About That Name|Sometimes It Takes a Mountain|I Bowed on My Knees and Cried Holy|Child of the King|Daystar (Shine Down on Me)|I Am Loved|It Is Finished`],
  ["other", "Andrew Peterson", `Is He Worthy?|Behold the Lamb of God|Labor of Love|Don't You Want to Thank Someone|The Sower's Song|You'll Find Your Way|Dancing in the Minefields|Remember Me|All Things Together|The Good Confession (I Believe)`],
  ["other", "Fernando Ortega", `Give Me Jesus|Come Down, O Love Divine|Jesus, King of Angels|This Good Day|Our Great Savior|Sing to Jesus|Trisagion|Lord of Eternity`],
];

const hymns = `
All the Way My Savior Leads Me|Fanny J. Crosby
Blessed Assurance|Fanny J. Crosby
Jesus Is Tenderly Calling|Fanny J. Crosby
Near the Cross|Fanny J. Crosby
Pass Me Not, O Gentle Savior|Fanny J. Crosby
Rescue the Perishing|Fanny J. Crosby
Tell Me the Story of Jesus|Fanny J. Crosby
To God Be the Glory|Fanny J. Crosby
He Hideth My Soul|Fanny J. Crosby
Redeemed, How I Love to Proclaim It|Fanny J. Crosby
Close to Thee|Fanny J. Crosby
I Am Thine, O Lord|Fanny J. Crosby
Praise Him! Praise Him!|Fanny J. Crosby
Hiding in Thee|William O. Cushing
Under His Wings|William O. Cushing
Ring the Bells of Heaven|William O. Cushing
Jesus, Lover of My Soul|Charles Wesley
And Can It Be That I Should Gain|Charles Wesley
Love Divine, All Loves Excelling|Charles Wesley
O for a Thousand Tongues to Sing|Charles Wesley
Rejoice, the Lord Is King|Charles Wesley
Christ, Whose Glory Fills the Skies|Charles Wesley
Soldiers of Christ, Arise|Charles Wesley
Depth of Mercy|Charles Wesley
Arise, My Soul, Arise|Charles Wesley
Come, Sinners, to the Gospel Feast|Charles Wesley
Jesus Shall Reign|Isaac Watts
I Sing the Mighty Power of God|Isaac Watts
Alas! and Did My Savior Bleed|Isaac Watts
Am I a Soldier of the Cross|Isaac Watts
O God, Our Help in Ages Past|Isaac Watts
Come, We That Love the Lord|Isaac Watts
We're Marching to Zion|Isaac Watts · Robert Lowry refrain
Jesus, My Great High Priest|Isaac Watts
Join All the Glorious Names|Isaac Watts
From All That Dwell Below the Skies|Isaac Watts
There Is a Land of Pure Delight|Isaac Watts
My Shepherd Will Supply My Need|Isaac Watts
How Sweet and Awesome Is the Place|Isaac Watts
Come, Holy Spirit, Heavenly Dove|Isaac Watts
Brethren, We Have Met to Worship|George Atkins
On Jordan's Stormy Banks I Stand|Samuel Stennett
Come, Ye Sinners, Poor and Needy|Joseph Hart
Come, Ye Thankful People, Come|Henry Alford
He Leadeth Me|Joseph H. Gilmore
Jesus Saves|Priscilla J. Owens
Will Your Anchor Hold?|Priscilla J. Owens
All Glory, Laud, and Honor|Theodulf of Orléans · John Mason Neale translation
Good Christian Men, Rejoice|Traditional · John Mason Neale translation
Of the Father's Love Begotten|Aurelius Prudentius · John Mason Neale translation
O Love That Wilt Not Let Me Go|George Matheson
Come, Thou Almighty King|Anonymous
All Creatures of Our God and King|Francis of Assisi · William H. Draper adaptation
For the Beauty of the Earth|Folliott S. Pierpoint
This Is My Father's World|Maltbie D. Babcock
The God of Abraham Praise|Thomas Olivers
O for a Closer Walk with God|William Cowper
There Is a Fountain Filled with Blood|William Cowper
God Moves in a Mysterious Way|William Cowper
Sometimes a Light Surprises|William Cowper
How Sweet the Name of Jesus Sounds|John Newton
Glorious Things of Thee Are Spoken|John Newton
I Asked the Lord That I Might Grow|John Newton
May the Mind of Christ My Savior|Kate B. Wilkinson
Like a River Glorious|Frances R. Havergal
Take My Life and Let It Be|Frances R. Havergal
Who Is on the Lord's Side?|Frances R. Havergal
I Gave My Life for Thee|Frances R. Havergal
O Jesus, I Have Promised|John E. Bode
Jesus, I My Cross Have Taken|Henry F. Lyte
Praise, My Soul, the King of Heaven|Henry F. Lyte
Lead On, O King Eternal|Ernest W. Shurtleff
Lead, Kindly Light|John Henry Newman
Be Still, My Soul|Katharina von Schlegel · Jane Borthwick translation
O Happy Day, That Fixed My Choice|Philip Doddridge
Grace Greater than Our Sin|Julia H. Johnston
Wonderful Grace of Jesus|Haldor Lillenas
Saved, Saved!|Jack P. Scholfield
Since Jesus Came into My Heart|Rufus H. McDaniel
He Keeps Me Singing|Luther B. Bridgers
Love Lifted Me|James Rowe
I Know Whom I Have Believed|Daniel W. Whittle
Showers of Blessing|Daniel W. Whittle
Moment by Moment|Daniel W. Whittle
I Need Thee Every Hour|Annie S. Hawks · Robert Lowry refrain
Where He Leads Me|E. W. Blandy
Only Trust Him|John H. Stockton
Room at the Cross for You|Ira F. Stanphill
Jesus Is All the World to Me|Will L. Thompson
Living for Jesus|Thomas O. Chisholm
O to Be Like Thee!|Thomas O. Chisholm
Trust and Obey|John H. Sammis
Wonderful Words of Life|Philip P. Bliss
Let the Lower Lights Be Burning|Philip P. Bliss
Whiter than Snow|James L. Nicholson
Are You Washed in the Blood?|Elisha A. Hoffman
Leaning on the Everlasting Arms|Elisha A. Hoffman
Down at the Cross|Elisha A. Hoffman
Is Your All on the Altar?|Elisha A. Hoffman
I Must Tell Jesus|Elisha A. Hoffman
What a Wonderful Savior!|Elisha A. Hoffman
Nothing but the Blood|Robert Lowry
Shall We Gather at the River|Robert Lowry
Open My Eyes, That I May See|Clara H. Scott
Sweet Hour of Prayer|William W. Walford attribution
Sweet By and By|Sanford F. Bennett
When We All Get to Heaven|Eliza E. Hewitt
Sunshine in My Soul|Eliza E. Hewitt
More About Jesus|Eliza E. Hewitt
Face to Face with Christ, My Savior|Carrie E. Breck
When the Roll Is Called Up Yonder|James M. Black
We'll Understand It Better By and By|Charles A. Tindley
Stand by Me|Charles A. Tindley
Leave It There|Charles A. Tindley
Nothing Between|Charles A. Tindley
We'll Work Till Jesus Comes|Elizabeth Mills attribution
Jesus Loves the Little Children|C. Herbert Woolston
I Love to Tell the Story|Katherine Hankey
Savior, Like a Shepherd Lead Us|Dorothy A. Thrupp attribution
The King of Love My Shepherd Is|Henry W. Baker
The Strife Is O'er, the Battle Done|Traditional Latin · Francis Pott translation
Let All Mortal Flesh Keep Silence|Liturgy of St. James · Gerard Moultrie translation
All People That on Earth Do Dwell|William Kethe
O Sacred Head, Now Wounded|Paul Gerhardt · James W. Alexander translation
Come, Christians, Join to Sing|Christian H. Bateman
My Jesus, I Love Thee|William R. Featherston
More Love to Thee, O Christ|Elizabeth P. Prentiss
Jesus, the Very Thought of Thee|Latin hymn · Edward Caswall translation
Fairest Lord Jesus|Traditional German · English translation
O Zion, Haste|Mary A. Thomson
Send the Light|Charles H. Gabriel
Higher Ground|Johnson Oatman Jr.
Count Your Blessings|Johnson Oatman Jr.
No, Not One!|Johnson Oatman Jr.
O How I Love Jesus|Frederick Whitfield
I Will Sing the Wondrous Story|Francis H. Rowley
Must Jesus Bear the Cross Alone?|Thomas Shepherd · later additions
`;

// Specific, provisional model-knowledge assessments, not verified source reviews.
const assessments = {
  "Christ Be Magnified": [9, 8, 8, "Christ", "Calls for Christ to be honored in the singer's whole life, including suffering and costly faithfulness; the refrain develops into a more specific confession of allegiance."],
  "Goodbye Yesterday": [8, 6, 7, "New life", "Celebrates new life and leaving the past behind; distinguish forgiveness and a new identity from a guarantee that past consequences or struggles disappear."],
  "Good Plans": [8, 7, 8, "Trust", "Expresses confidence in God's shepherding and goodness through dark valleys; God's good purposes do not promise ease or a desired earthly outcome."],
  "Same God": [8, 7, 8, "Faithfulness", "Prays to the God known through biblical testimony for present help; distinguish God's unchanging character from expecting every biblical miracle to recur."],
  "The Blessing": [9, 7, 8, "Blessing", "Sets priestly blessing language in a repeated prayer for God's favor and peace; sung blessing is prayer, not a prediction of prosperity."],
  "Resurrecting": [9, 8, 8, "Resurrection", "Connects Christ's humiliation and victorious resurrection with new life in the believer; identify the resurrection power language with dependence on Christ."],
  "Graves into Gardens": [8, 7, 7, "Restoration", "Moves from dissatisfaction with human solutions to trust in God's transforming power; images of reversal need context rather than a promise that every loss is reversed now."],
  "Here Again": [8, 5, 8, "Dependence", "A prayer for God's presence and help amid weakness; the song has a focused devotional purpose and comparatively little developed doctrinal explanation."],
  "Goodness of God": [9, 7, 8, "Faithfulness", "Testifies to God's lifelong care and faithfulness and answers with surrender and praise; its personal testimony should not imply a life free of hardship."],
  "Raise a Hallelujah": [8, 6, 7, "Praise", "Expresses determined praise amid opposition; distinguish praise as faithful response from a technique that guarantees victory over particular troubles."],
  "Egypt": [8, 7, 7, "Deliverance", "Retells exodus imagery as a testimony of deliverance; clarify how Israel's historical rescue relates to redemption in Christ."],
  "Ever Be": [8, 6, 8, "Praise", "Responds to God's faithful love and the church's bridal identity with continuing praise; the repeated refrain carries less doctrinal development than the verses."],
  "What a Beautiful Name": [8, 8, 8, "Christ", "Praises Christ's divine glory, incarnation and victory; the line about heaven without us needs careful explanation of grace rather than divine need."],
  "King of Kings": [9, 9, 8, "Gospel", "Traces the incarnation, cross, resurrection and the birth of the church within Trinitarian praise; its narrative provides substantial content for a congregation."],
  "Awake My Soul": [8, 6, 8, "Praise", "Calls the singer to renewed praise and attentiveness to God; experiential imagery needs interpretation alongside the song's more focused exhortation."],
  "New Wine": [8, 6, 7, "Surrender", "Uses pressing and new-wine imagery to pray for renewal and surrender; the metaphor should not make suffering valuable apart from God's purposes."],
  "Another in the Fire": [8, 7, 7, "Presence of God", "Uses biblical deliverance scenes to express trust in God's presence during hardship; presence should not be confused with exemption from suffering."],
  "Good Grace": [8, 7, 7, "Grace", "Encourages confidence in Jesus and unity among his people; distinguish broad invitations to courage from a developed explanation of salvation."],
  "I've Witnessed It": [8, 7, 8, "Faithfulness", "Offers testimony to God's faithfulness and invites continued trust; personal experience supports praise without guaranteeing an identical experience for everyone."],
  "There's Nothing That Our God Can't Do": [8, 6, 7, "Power of God", "Celebrates God's power to overcome obstacles; divine ability should be understood alongside his wisdom and freedom to answer differently."],
  "Hymn of Heaven": [9, 8, 8, "Eternal hope", "Looks toward worship with the redeemed and the end of pain while confessing Christ's sacrifice; connects present praise with the church's future hope."],
  "The Jesus Way": [9, 8, 8, "Discipleship", "Describes allegiance to Jesus through concrete commitments including love and forgiveness; assess these as responses to grace rather than earning salvation."],
  "House of the Lord": [8, 7, 7, "Praise", "Celebrates redemption and congregational joy in the God who saves; joy is a confession of hope rather than a required emotional state."],
  "Holy Water": [8, 6, 7, "Forgiveness", "Uses sensory images to express the need for forgiveness and grace; the title's water image should be distinguished from a claim about sacramental cleansing."],
  "God So Loved": [9, 8, 8, "Gospel", "Invites weary sinners to Christ while naming God's love and the gift of his Son; its invitation is grounded in grace and redemption."],
  "The Commission": [8, 7, 8, "Mission", "Dramatizes Jesus' commission and reassurance to his disciples; identify poetic paraphrase separately from a direct Scripture quotation."],
  "My Jesus": [8, 7, 7, "Testimony", "Invites listeners to know Jesus through testimony of rescue and restoration; its conversational testimony may function differently from a corporate confession."],
  "Chain Breaker": [8, 6, 7, "Deliverance", "Offers an invitation to Jesus using prison and freedom images; clarify deliverance without promising that every struggle ends immediately."],
  "You Say": [8, 6, 8, "Identity in Christ", "Contrasts self-doubt with confidence in God's assessment; the personal reassurance needs wider gospel context for corporate worship."],
  "Believe for It": [7, 6, 7, "Faith", "Expresses confidence in God's power amid obstacles; distinguish faith in God's character from certainty about a particular breakthrough."],
  "You've Already Won": [9, 8, 8, "Assurance", "Places confidence in Christ's victory amid unresolved hardship; the believer's security does not remove the need for endurance."],
  "All Sufficient Merit": [9, 9, 8, "Atonement", "Grounds acceptance before God in Christ's sufficient merit and saving work rather than the singer's achievements."],
  "There Is One Gospel": [9, 9, 9, "Gospel", "Confesses the gospel of Christ's cross and resurrection as the church's shared foundation and hope."],
  "It Was Finished Upon That Cross": [9, 9, 9, "Finished work of Christ", "Develops Christ's completed saving work, freedom from condemnation and hope beyond death with explicit gospel claims."],
  "Only a Holy God": [9, 8, 9, "Holiness", "Contrasts God's unmatched power and majesty with his redeeming love, inviting the congregation to worship him."],
  "Jesus, Strong and Kind": [9, 8, 9, "Christ", "Uses simple, coherent promises of refuge and Christ's seeking love to invite trust; its limited vocabulary still carries specific meaning."],
  "O Lord, My Rock and My Redeemer": [9, 9, 9, "Christ", "Addresses God as refuge and redeemer and develops Christ's suffering, resurrection and help amid weakness."],
  "All My Boast Is in Jesus": [9, 9, 8, "Grace", "Grounds the believer's confidence and praise in Christ's saving work rather than personal merit."],
  "Almost Home": [9, 8, 8, "Perseverance", "Encourages endurance in the Christian pilgrimage by looking toward the promised home with Christ."],
  "Is He Worthy?": [9, 9, 8, "Christ", "Uses question and response to confess the Lamb's worthiness to redeem and reign; the responsive structure needs a clearly led arrangement."],
};

const make = (category, title, author, recorded) => {
  const draft = assessments[title];
  return {
    id: "expanded-" + (title + " " + author).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    title, author: recorded ? "Associated recording: " + author : author,
    firstLine: "", category,
    version: recorded ? "Associated recording · verify exact text and arrangement" : "Traditional text · verify chosen stanzas and edition",
    themes: draft ? [draft[3]] : [],
    review: {
      status: draft ? "ai" : "unreviewed",
      scores: { accuracy: draft?.[0] ?? null, substance: draft?.[1] ?? null, language: draft?.[2] ?? null, time: null },
      summary: draft?.[4] || "", claims: [], concerns: [], uses: [], scriptures: [], sources: [],
      concern: "none", musical: "", language: "", time: "", key: "", minutes: 4, notes: "", updatedAt: null,
      ...(draft ? { aiFields: ["scores", "summary", "claims", "concerns", "uses", "scriptures", "language", "time", "themes"], model: "Prewritten model-knowledge draft · exact text not verified" } : {}),
    },
  };
};
export const expandedCatalog = [
  ...groups.flatMap(([category, artist, titles]) => titles.split("|").map(title => make(category, title, artist, true))),
  ...hymns.trim().split("\n").map(line => { const [title, author] = line.split("|"); return make("traditional", title, author, false); }),
];
export const newStarterTitles = ["Christ Be Magnified", "Goodbye Yesterday", "Washed", "At the Altar", "Known by You", "Good Plans", "Same God", "King of Kings", "Hymn of Heaven", "You've Already Won", "There Is One Gospel", "Hard Fought Hallelujah"];
