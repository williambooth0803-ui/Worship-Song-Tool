// Public product copy only: the landing page never reads private workspace data.
export function landingPage(hasWorkspace) {
  const steps=[
    ['01','discover','Discover','Find the song you have in mind.','Search the repertoire or explore collections, then open the version you want to review.'],
    ['02','evaluate','Evaluate','Look closely at the words.','Set your criteria, read the supporting reasons and Scripture connections, and record your own assessment.'],
    ['03','library','Libraries','Keep your decisions together.','Group songs by season, ministry, or readiness. Keep the notes and context behind each decision.'],
    ['04','plans','Plans','Prepare the service yourself.','Build the order, record keys and arrangements, and look back at the songs your church has used.'],
  ];
  return `<article class="landing-page" aria-labelledby="landing-title">
    <section class="landing-hero">
      <div class="landing-intro">
        <p class="landing-eyebrow">Faithful Repertoire · For worship leaders</p>
        <h1 id="landing-title">Prepare the songs<br>you lead.</h1>
        <p class="landing-lede">Explore worship songs, study their words, and keep your church’s repertoire and service plans together.</p>
        <div class="landing-actions">
          <button class="button primary" data-action="nav" data-view="discover">${hasWorkspace?'Browse the repertoire':'Sign in to begin'}</button>
          <a class="about-link landing-about-link" href="#about" data-action="nav" data-view="about">About Faithful Repertoire <span aria-hidden="true">→</span></a>
        </div>
        <p class="landing-caption">${hasWorkspace?'Choose a tool below to continue your work.':'Your repertoire starts with your own church, criteria and decisions.'}</p>
      </div>
      <aside class="landing-purpose" aria-labelledby="landing-purpose-title">
        <p class="landing-eyebrow">Built around your church</p>
        <h2 id="landing-purpose-title">Your criteria.<br>Your decisions.<br>Your repertoire.</h2>
        <p>Keep human evaluations at the center. Use optional analysis tools to support your review, with the criteria and purpose you choose.</p>
        <div class="landing-byline"><strong>Created by William Booth</strong><span>Church music · Baylor University</span></div>
      </aside>
    </section>
    <section class="landing-tools" aria-labelledby="landing-tools-title">
      <div class="landing-section-heading"><div><p class="landing-eyebrow">From a song to a service</p><h2 id="landing-tools-title">A place for each part of preparation.</h2></div><p>Start wherever you need to work today.</p></div>
      <div class="landing-tool-grid">${steps.map(([number,view,name,title,description])=>`<article class="landing-tool"><p class="landing-tool-number">${number} <span>${name}</span></p><h3>${title}</h3><p>${description}</p><button class="text-button" data-action="nav" data-view="${view}">Open ${name}<span aria-hidden="true"> →</span></button></article>`).join('')}</div>
    </section>
    <section class="landing-settings" aria-labelledby="landing-settings-title">
      <div><p class="landing-eyebrow">One repertoire, different settings</p><h2 id="landing-settings-title">Sunday morning.<br>A prayer night. A new season.</h2></div>
      <div><p>Use analysis lenses to keep different criteria and evaluations for different settings. Organize Christmas, Easter, youth or college songs into libraries, then review the plans you have led over a season or year.</p><a class="landing-workflow-link" href="#about" data-action="nav" data-view="about">See recommended ways to use Faithful Repertoire <span aria-hidden="true">→</span></a></div>
    </section>
  </article>`;
}
