/* ============================================
   Galaxy: a small copy of the N-body project,
   drawn inside its project card.

   Same starting galaxy as src/galaxy.cpp in the
   repo (a black hole holding 5% of the mass, a
   thin disk of stars on circular orbits, and a
   small bulge with 10% of the bodies), the same
   softening (0.02), direct-sum gravity and the
   kick-drift-kick leapfrog step. Plain JS and
   fewer stars, so it runs on any laptop.

   Pauses when off screen or when the tab is hidden.
   ============================================ */

(function () {
    var canvas = document.getElementById('galaxy');
    if (!canvas || !canvas.getContext) return;

    var ctx = canvas.getContext('2d');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var small = window.matchMedia('(max-width: 560px)').matches;

    var N = small ? 256 : 512;
    var BLACK_HOLE_MASS = 0.05, STARS_MASS = 0.95;
    var BULGE_FRACTION = 0.10, BULGE_RADIUS = 0.12, DISK_THICKNESS = 0.02;
    var EPS2 = 0.02 * 0.02;          // SOFTENING_SQUARED in types.h
    var DT = 0.005, STEPS_PER_FRAME = 1;
    // The repo's disk starts cold, so it breaks into clumps within about one
    // orbit and later scatters. Start over every 12 seconds, with a short fade.
    var RESTART = 720, FADE = 36;
    var INCLINE = 1.18;              // radians: view the disk from about 68 degrees

    var x = new Float32Array(N), y = new Float32Array(N), z = new Float32Array(N);
    var vx = new Float32Array(N), vy = new Float32Array(N), vz = new Float32Array(N);
    var ax = new Float32Array(N), ay = new Float32Array(N), az = new Float32Array(N);
    var m = new Float32Array(N);
    var bulgeStart, initial, steps = 0;

    // seeded random numbers, so every visit starts from the same galaxy
    var seed = 42;
    function rand() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    function uniform(lo, hi) { return lo + (hi - lo) * rand(); }
    function gaussian(sigma) {
        var u = Math.max(rand(), 1e-9), v = rand();
        return sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    function massInside(r) { return BLACK_HOLE_MASS + STARS_MASS * (r < 1 ? r * r : 1); }
    function circularSpeed(r) { return Math.sqrt(massInside(r) / r); }

    (function makeGalaxy() {
        var nBulge = Math.floor(N * BULGE_FRACTION);
        var nDisk = N - 1 - nBulge;
        var starMass = STARS_MASS / (N - 1);

        m[0] = BLACK_HOLE_MASS;                       // body 0: the black hole, at rest

        for (var i = 1; i <= nDisk; i++) {            // disk stars on circular orbits
            var r = Math.sqrt(uniform(0.0025, 1)), a = uniform(0, 2 * Math.PI);
            x[i] = r * Math.cos(a); y[i] = r * Math.sin(a); z[i] = gaussian(DISK_THICKNESS);
            var v = circularSpeed(r), jitter = 0.04 * v;
            vx[i] = -v * Math.sin(a) + gaussian(jitter);
            vy[i] = v * Math.cos(a) + gaussian(jitter);
            vz[i] = gaussian(0.2 * jitter);
            m[i] = starMass;
        }

        bulgeStart = nDisk + 1;
        for (var j = bulgeStart; j < N; j++) {        // bulge stars, random directions
            var rb = BULGE_RADIUS * Math.cbrt(uniform(0.001, 1));
            var ang = uniform(0, 2 * Math.PI), tilt = Math.acos(uniform(-1, 1));
            x[j] = rb * Math.sin(tilt) * Math.cos(ang);
            y[j] = rb * Math.sin(tilt) * Math.sin(ang);
            z[j] = rb * Math.cos(tilt);
            var s = Math.abs(gaussian(0.5 * circularSpeed(rb)));
            var va = uniform(0, 2 * Math.PI), vt = Math.acos(uniform(-1, 1));
            vx[j] = s * Math.sin(vt) * Math.cos(va);
            vy[j] = s * Math.sin(vt) * Math.sin(va);
            vz[j] = s * Math.cos(vt);
            m[j] = starMass;
        }
        initial = [x, y, z, vx, vy, vz].map(function (a) { return a.slice(); });
    })();

    function restart() {
        [x, y, z, vx, vy, vz].forEach(function (a, k) { a.set(initial[k]); });
        steps = 0;
        accelerations();
    }

    // every body pulls on every other body: the same loop as the repo's force kernel
    function accelerations() {
        var i, j, dx, dy, dz, d2, inv, fi, fj;
        for (i = 0; i < N; i++) { ax[i] = 0; ay[i] = 0; az[i] = 0; }
        for (i = 0; i < N; i++) {
            for (j = i + 1; j < N; j++) {
                dx = x[j] - x[i]; dy = y[j] - y[i]; dz = z[j] - z[i];
                d2 = dx * dx + dy * dy + dz * dz + EPS2;
                inv = 1 / (d2 * Math.sqrt(d2));
                fi = m[j] * inv; fj = m[i] * inv;
                ax[i] += dx * fi; ay[i] += dy * fi; az[i] += dz * fi;
                ax[j] -= dx * fj; ay[j] -= dy * fj; az[j] -= dz * fj;
            }
        }
    }

    // kick (half step), drift (full step), kick (half step)
    function step() {
        var i, h = DT / 2;
        for (i = 0; i < N; i++) {
            vx[i] += ax[i] * h; vy[i] += ay[i] * h; vz[i] += az[i] * h;
            x[i] += vx[i] * DT; y[i] += vy[i] * DT; z[i] += vz[i] * DT;
        }
        accelerations();
        for (i = 0; i < N; i++) {
            vx[i] += ax[i] * h; vy[i] += ay[i] * h; vz[i] += az[i] * h;
        }
    }

    var W = 0, H = 0, dpr = 1, fg = '#000', accent = '#b4613c';
    var cosI = Math.cos(INCLINE), sinI = Math.sin(INCLINE);

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = canvas.clientWidth; H = canvas.clientHeight;
        canvas.width = W * dpr; canvas.height = H * dpr;
        var css = getComputedStyle(document.documentElement);
        fg = css.getPropertyValue('--fg').trim() || '#000';
        accent = css.getPropertyValue('--accent').trim() || '#b4613c';
    }

    function draw() {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        var fade = Math.min(1, steps / 18, (RESTART - steps) / FADE);
        var scale = Math.min(W * 0.4, H * 0.42 / cosI);
        var cx = W / 2, cy = H / 2;
        // keep the black hole in the middle of the picture
        var ox = x[0], oy = y[0], oz = z[0];
        ctx.fillStyle = fg;
        for (var i = 1; i < N; i++) {
            var px = x[i] - ox, py = y[i] - oy, pz = z[i] - oz;
            var sx = cx + px * scale;
            var sy = cy + (py * cosI - pz * sinI) * scale;
            var bulge = i >= bulgeStart;
            var r2 = px * px + py * py;
            ctx.globalAlpha = fade * (bulge ? 0.85 : 0.35 + 0.5 / (1 + r2 * 4));
            ctx.beginPath();
            ctx.arc(sx, sy, bulge ? 1.1 : 0.9, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(cx, cy, 2.4, 0, Math.PI * 2);
        ctx.fill();
    }

    var visible = true, raf = 0;

    function frame() {
        raf = 0;
        if (!visible || document.hidden) return;
        for (var k = 0; k < STEPS_PER_FRAME; k++) { step(); steps++; }
        if (steps >= RESTART) restart();
        draw();
        raf = requestAnimationFrame(frame);
    }

    function start() { if (!raf && !reduced) raf = requestAnimationFrame(frame); }

    resize();
    accelerations();
    steps = 18;    // first frame fully visible
    draw();

    window.addEventListener('resize', function () { resize(); draw(); });
    // the canvas sits inside a folded project; size it when the fold opens
    var fold = canvas.closest('details');
    if (fold) fold.addEventListener('toggle', function () { if (fold.open) { resize(); draw(); start(); } });
    document.addEventListener('visibilitychange', start);
    new MutationObserver(function () { resize(); draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            visible = entries[0].isIntersecting;
            start();
        }).observe(canvas);
    }
    start();
})();
