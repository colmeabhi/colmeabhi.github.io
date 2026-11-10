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

    btn.addEventListener('click', function () {
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
   Timeline strip — one tick per month since
   May 2020, coloured by what I was doing.
   Edit PERIODS to keep it current.
   ============================================ */

(function () {
    var strip = document.getElementById('strip');
    if (!strip) return;

    // [start, end, kind, label] — months are "YYYY-MM", end is inclusive
    var PERIODS = [
        ['2020-05', '2020-06', 'intern', 'Research Intern · Bennett University'],
        ['2020-07', '2020-10', 'intern', 'Web Dev Intern · Felis Leo Ventures'],
        ['2021-07', '2021-11', 'intern', 'Framework Engineer Intern · Quantiphi'],
        ['2021-11', '2023-12', 'work', 'Platform Engineer · Quantiphi'],
        ['2024-01', '2025-07', 'work', 'Senior Platform Engineer · Quantiphi'],
        ['2025-08', '2027-05', 'school', 'MS Computer Science · SJSU']
    ];
    var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    var idx = function (ym) { var p = ym.split('-'); return p[0] * 12 + (p[1] - 1); };
    var now = new Date();
    var first = idx('2020-05');
    var last = now.getFullYear() * 12 + now.getMonth();
    var active = 0;

    for (var m = first; m <= last; m++) {
        var kind = 'gap', label = '';
        PERIODS.forEach(function (p) {
            if (m >= idx(p[0]) && m <= idx(p[1])) { kind = p[2]; label = p[3]; }
        });
        if (kind !== 'gap') active++;

        var tick = document.createElement('i');
        tick.className = 'tick tick-' + kind;
        // small deterministic tilt so the strip feels hand-drawn
        tick.style.setProperty('--tilt', (((m * 7) % 5) - 2) * 2.5 + 'deg');
        tick.style.animationDelay = (m - first) * 8 + 'ms';
        tick.title = MONTHS[m % 12] + ' ' + Math.floor(m / 12) + (label ? ' — ' + label : '');
        strip.appendChild(tick);
    }

    var count = document.getElementById('strip-count');
    if (count) count.textContent = active;
})();
