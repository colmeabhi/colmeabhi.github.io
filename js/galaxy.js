/* ============================================
   Galaxy: a small N-body simulation drawn inside
   the N-body project card. Direct-sum gravity with Plummer
   softening and a kick-drift-kick leapfrog
   integrator, the same scheme as the N-body
   project (there in C++/CUDA, here in plain JS).
   Pauses when off screen or when the tab is hidden.
   ============================================ */

(function () {
    var canvas = document.getElementById('galaxy');
    if (!canvas || !canvas.getContext) return;

    var ctx = canvas.getContext('2d');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var small = window.matchMedia('(max-width: 560px)').matches;

    var N = small ? 180 : 340;      // disk particles
    var CORE = 1.0;                 // central mass (G = 1)
    var DISK = 0.05;                // total disk mass, shared equally
    var EPS2 = 0.06 * 0.06;         // Plummer softening between particles, squared
    var CORE_EPS2 = 0.22 * 0.22;    // softer core, so the centre turns gently
    var DT = 0.012;
    var TILT = 0.38;                // squash y to view the disk at an angle

    var x = new Float32Array(N), y = new Float32Array(N);
    var vx = new Float32Array(N), vy = new Float32Array(N);
    var ax = new Float32Array(N), ay = new Float32Array(N);
    var m = DISK / N;

    // Exponential disk (dense centre, thin edge) on circular orbits around the core
    for (var i = 0; i < N; i++) {
        var r = 0.05 + 0.3 * -Math.log(1 - 0.96 * Math.random());
        var a = Math.random() * Math.PI * 2;
        var d2c = r * r + CORE_EPS2;
        var v = Math.sqrt(CORE * r * r / (d2c * Math.sqrt(d2c))) * (0.98 + Math.random() * 0.04);
        x[i] = r * Math.cos(a); y[i] = r * Math.sin(a);
        vx[i] = -v * Math.sin(a); vy[i] = v * Math.cos(a);
    }

    function accelerations() {
        var i, j, dx, dy, d2, inv, f;
        for (i = 0; i < N; i++) {
            d2 = x[i] * x[i] + y[i] * y[i] + CORE_EPS2;
            inv = CORE / (d2 * Math.sqrt(d2));
            ax[i] = -x[i] * inv; ay[i] = -y[i] * inv;
        }
        for (i = 0; i < N; i++) {
            for (j = i + 1; j < N; j++) {
                dx = x[j] - x[i]; dy = y[j] - y[i];
                d2 = dx * dx + dy * dy + EPS2;
                f = m / (d2 * Math.sqrt(d2));
                ax[i] += dx * f; ay[i] += dy * f;
                ax[j] -= dx * f; ay[j] -= dy * f;
            }
        }
    }

    function step() {
        var i, h = DT / 2;
        for (i = 0; i < N; i++) {           // kick, drift
            vx[i] += ax[i] * h; vy[i] += ay[i] * h;
            x[i] += vx[i] * DT; y[i] += vy[i] * DT;
        }
        accelerations();
        for (i = 0; i < N; i++) {           // kick
            vx[i] += ax[i] * h; vy[i] += ay[i] * h;
        }
    }

    var W = 0, H = 0, dpr = 1, color = '#000';

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = canvas.clientWidth; H = canvas.clientHeight;
        canvas.width = W * dpr; canvas.height = H * dpr;
        color = getComputedStyle(document.documentElement).getPropertyValue('--fg').trim() || '#000';
    }

    function draw() {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = color;
        var scale = Math.min(W * 0.34, H * 1.05);
        var cx = W / 2, cy = H / 2;
        for (var i = 0; i < N; i++) {
            var px = cx + x[i] * scale;
            var py = cy + y[i] * scale * TILT;
            var r2 = x[i] * x[i] + y[i] * y[i];
            // brighter and slightly larger towards the centre
            var glow = 1 / (1 + r2 * 3);
            ctx.globalAlpha = 0.3 + 0.6 * glow;
            ctx.beginPath();
            ctx.arc(px, py, 0.7 + 0.7 * glow, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    var visible = true, raf = 0;

    function frame() {
        raf = 0;
        if (!visible || document.hidden) return;
        step();
        draw();
        raf = requestAnimationFrame(frame);
    }

    function start() { if (!raf && !reduced) raf = requestAnimationFrame(frame); }

    resize();
    accelerations();
    draw();

    window.addEventListener('resize', function () { resize(); draw(); });
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
