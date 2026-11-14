/* ============================================
   Theme toggle
   ============================================ */

document.getElementById('theme-toggle').addEventListener('click', function () {
    var dark = document.documentElement.classList.toggle('dark');
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
});

/* ============================================
   Copy-to-clipboard buttons  (data-copy="text")
   ============================================ */

document.querySelectorAll('[data-copy]').forEach(function (btn) {
    var label = btn.querySelector('[data-copy-label]');
    var original = label.textContent;
    var timer;

    btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        var text = btn.getAttribute('data-copy');
        var done = function () {
            label.textContent = 'Copied!';
            clearTimeout(timer);
            timer = setTimeout(function () { label.textContent = original; }, 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, function () { location.href = 'mailto:' + text; });
        } else {
            location.href = 'mailto:' + text;
        }
    });
});

/* ============================================
   "Say hello": opens the visitor's mail app and
   also copies the address, so the button still
   does something when no mail app is set up.
   ============================================ */

document.querySelectorAll('[data-hello]').forEach(function (link) {
    var label = link.querySelector('[data-hello-label]');
    var original = label.textContent;
    var timer;

    link.addEventListener('click', function () {
        var email = link.getAttribute('data-hello');
        if (!navigator.clipboard || !navigator.clipboard.writeText) return;
        navigator.clipboard.writeText(email).then(function () {
            label.textContent = 'Email (copied)';
            clearTimeout(timer);
            timer = setTimeout(function () { label.textContent = original; }, 2600);
        }, function () {});
    });
});

/* ============================================
   GitHub contributions strip
   One bar per week for the last year. Bar height
   and colour follow the week's contribution count;
   hovering (or tapping) a bar shows the numbers.
   Tries the live API, falls back to the snapshot
   that build.py saves in data/contributions.json.
   ============================================ */

(function () {
    var strip = document.getElementById('strip');
    if (!strip) return;

    var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var user = strip.getAttribute('data-user');
    var tip = document.createElement('div');
    tip.className = 'strip-tip';
    tip.hidden = true;

    function label(iso) {
        var p = iso.split('-');
        return MONTHS[p[1] - 1] + ' ' + (+p[2]);
    }

    // [[date, count], ...] -> [{from, to, count}, ...] grouped Sunday to Saturday
    function toWeeks(days) {
        var weeks = [];
        days.forEach(function (d) {
            var p = d[0].split('-');
            var weekday = new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay();
            if (!weeks.length || weekday === 0) weeks.push({ from: d[0], to: d[0], count: 0 });
            var w = weeks[weeks.length - 1];
            w.to = d[0];
            w.count += d[1];
        });
        return weeks;
    }

    function show(bar, w) {
        tip.innerHTML = '';
        var strong = document.createElement('strong');
        strong.textContent = w.count + (w.count === 1 ? ' contribution' : ' contributions');
        var span = document.createElement('span');
        span.textContent = label(w.from) + ' – ' + label(w.to) + ', ' + w.to.slice(0, 4);
        tip.appendChild(strong);
        tip.appendChild(span);
        tip.hidden = false;

        // centre over the bar, but keep the tooltip inside the strip
        var x = bar.offsetLeft + bar.offsetWidth / 2;
        var half = tip.offsetWidth / 2;
        var clamped = Math.max(half, Math.min(strip.offsetWidth - half, x));
        tip.style.left = clamped + 'px';
        tip.style.setProperty('--nub', (x - clamped) + 'px');
    }

    function render(days) {
        var weeks = toWeeks(days);
        var max = Math.max.apply(null, weeks.map(function (w) { return w.count; })) || 1;
        var total = 0;

        strip.innerHTML = '';
        weeks.forEach(function (w, i) {
            total += w.count;
            var bar = document.createElement('button');
            bar.type = 'button';
            bar.className = 'bar';
            bar.setAttribute('aria-label', w.count + ' contributions, ' + label(w.from) + ' to ' + label(w.to));

            // sqrt keeps quiet weeks visible next to one very busy week
            var share = w.count ? Math.sqrt(w.count / max) : 0;
            var level = w.count ? Math.min(4, 1 + Math.floor(share * 3.999)) : 0;
            bar.style.setProperty('--h', (w.count ? 22 + share * 78 : 10) + '%');
            bar.style.setProperty('--i', i);
            bar.setAttribute('data-level', level);

            bar.addEventListener('mouseenter', function () { show(bar, w); });
            bar.addEventListener('focus', function () { show(bar, w); });
            bar.addEventListener('click', function () { show(bar, w); });
            strip.appendChild(bar);
        });
        strip.appendChild(tip);

        var count = document.getElementById('strip-count');
        if (count) count.textContent = total.toLocaleString('en-US');
    }

    strip.addEventListener('mouseleave', function () { tip.hidden = true; });
    strip.addEventListener('focusout', function () { tip.hidden = true; });

    function snapshot() {
        return fetch('data/contributions.json').then(function (r) { return r.json(); }).then(function (d) { return d.days; });
    }

    var ctrl = window.AbortController ? new AbortController() : null;
    if (ctrl) setTimeout(function () { ctrl.abort(); }, 4000);

    fetch('https://github-contributions-api.jogruber.de/v4/' + encodeURIComponent(user) + '?y=last', ctrl ? { signal: ctrl.signal } : {})
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (d) { return d.contributions.map(function (c) { return [c.date, c.count]; }); })
        .catch(snapshot)
        .then(render)
        .catch(function () { strip.parentNode.hidden = false; strip.hidden = true; });
})();

/* ============================================
   Folds: "Open all" per section, and open
   everything before printing.
   ============================================ */

document.querySelectorAll('[data-open-all]').forEach(function (btn) {
    var section = btn.closest('section');
    var folds = section.querySelectorAll('details.fold');
    var sync = function () {
        var allOpen = Array.prototype.every.call(folds, function (d) { return d.open; });
        btn.textContent = allOpen ? 'Close all' : 'Open all';
        btn.setAttribute('aria-pressed', allOpen);
    };
    btn.addEventListener('click', function () {
        var open = !Array.prototype.every.call(folds, function (d) { return d.open; });
        folds.forEach(function (d) { d.open = open; });
        sync();
    });
    folds.forEach(function (d) { d.addEventListener('toggle', sync); });
});

document.querySelectorAll('[data-fold-close]').forEach(function (btn) {
    btn.addEventListener('click', function () {
        var d = btn.closest('details');
        d.open = false;
        var top = d.getBoundingClientRect().top;
        if (top < 0) d.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
});

window.addEventListener('beforeprint', function () {
    document.querySelectorAll('details.fold').forEach(function (d) { d.open = true; });
});

/* ============================================
   "Currently ..." ticker. One phrase at a time;
   the old one lifts out, the new one settles in.
   Pauses on hover and when the tab is hidden.
   Reduced motion: it just shows the first one.
   ============================================ */

(function () {
    var ticker = document.querySelector('.ticker');
    if (!ticker) return;
    var items;
    try { items = JSON.parse(ticker.getAttribute('data-items')); } catch (e) { return; }
    if (!items || items.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var i = 0, paused = false;
    ticker.addEventListener('mouseenter', function () { paused = true; });
    ticker.addEventListener('mouseleave', function () { paused = false; });

    setInterval(function () {
        if (paused || document.hidden) return;
        i = (i + 1) % items.length;
        var old = ticker.querySelector('.ticker-word');
        var next = document.createElement('span');
        next.className = 'ticker-word is-entering';
        next.textContent = items[i];
        old.classList.add('is-leaving');
        ticker.appendChild(next);
        ticker.style.width = next.offsetWidth + 'px';
        requestAnimationFrame(function () {
            requestAnimationFrame(function () { next.classList.remove('is-entering'); });
        });
        setTimeout(function () { old.remove(); }, 650);
    }, 2800);
})();
