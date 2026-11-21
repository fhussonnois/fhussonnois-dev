(function () {
  var content = document.querySelector('.prose');
  var progress = document.querySelector('.read-progress');
  if (!content || !progress) return;

  var bar = progress.querySelector('.read-progress-bar');
  var value = progress.querySelector('.read-progress-value');
  var links = Array.prototype.slice.call(document.querySelectorAll('.toc-card-links a[href^="#"]'));
  var headings = links
    .map(function (link) {
      return document.getElementById(decodeURIComponent(link.getAttribute('href').slice(1)));
    })
    .filter(Boolean);
  var navHeight = (document.querySelector('.site-nav') || { offsetHeight: 0 }).offsetHeight;
  var ticking = false;

  function update() {
    ticking = false;

    // Reading progress: 0% when the post starts at the top of the viewport,
    // 100% when its last line reaches the bottom of the viewport.
    var rect = content.getBoundingClientRect();
    var total = rect.height - window.innerHeight + navHeight;
    var read = navHeight - rect.top;
    var pct = total > 0 ? Math.round(Math.min(Math.max(read / total, 0), 1) * 100) : 100;
    bar.style.strokeDashoffset = String(100 - pct);
    value.textContent = pct + '%';
    progress.setAttribute('aria-valuenow', String(pct));

    // Active section: last heading that has entered the top part of the viewport.
    var threshold = navHeight + Math.min(window.innerHeight * 0.3, 240);
    var activeIndex = -1;
    for (var i = 0; i < headings.length; i++) {
      if (headings[i].getBoundingClientRect().top <= threshold) activeIndex = i;
      else break;
    }
    links.forEach(function (link, i) {
      var isActive = i === activeIndex;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();
