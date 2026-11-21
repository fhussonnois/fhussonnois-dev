(function () {
  var blocks = document.querySelectorAll('.prose pre');
  if (!blocks.length) return;

  var COPY_ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  var CHECK_ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';

  function fallbackCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(area);
    return ok ? Promise.resolve() : Promise.reject(new Error('copy failed'));
  }

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () {
        return fallbackCopy(text);
      });
    }
    return fallbackCopy(text);
  }

  blocks.forEach(function (pre) {
    // Chroma wraps <pre> in <div class="highlight">; wrap that if present.
    var target = pre.parentElement.classList.contains('highlight') ? pre.parentElement : pre;
    var wrapper = document.createElement('div');
    wrapper.className = 'code-block';
    target.parentNode.insertBefore(wrapper, target);
    wrapper.appendChild(target);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'code-copy';
    btn.setAttribute('aria-label', 'Copy code to clipboard');
    btn.title = 'Copy';
    btn.innerHTML = COPY_ICON;
    wrapper.appendChild(btn);

    var timer;
    btn.addEventListener('click', function () {
      var code = pre.querySelector('code') || pre;
      var text = code.innerText.replace(/\n$/, '');
      copy(text).then(
        function () {
          btn.innerHTML = CHECK_ICON;
          btn.classList.add('copied');
          btn.setAttribute('aria-label', 'Copied');
          btn.title = 'Copied!';
        },
        function () {
          btn.title = 'Copy failed';
        }
      ).then(function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          btn.innerHTML = COPY_ICON;
          btn.classList.remove('copied');
          btn.setAttribute('aria-label', 'Copy code to clipboard');
          btn.title = 'Copy';
        }, 2000);
      });
    });
  });
})();
