/* ============================================
   Small interactive figures for project cards
   and case studies. Each one is a simulation of
   the real project's logic, running in the page.

   Usage: <div class="demo" data-demo="scale-in"></div>
   ============================================ */

(function () {
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // el('div.cls', {attr: value}, [children or text])
    function el(spec, attrs, children) {
        var parts = spec.split('.');
        var node = document.createElement(parts[0] || 'div');
        if (parts.length > 1) node.className = parts.slice(1).join(' ');
        Object.keys(attrs || {}).forEach(function (k) {
            if (k === 'text') node.textContent = attrs[k];
            else if (k === 'onclick') node.addEventListener('click', attrs[k]);
            else node.setAttribute(k, attrs[k]);
        });
        (children || []).forEach(function (c) {
            node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
        });
        return node;
    }

    function button(label, onclick, primary) {
        return el('button.demo-btn' + (primary ? '.demo-btn-primary' : ''), { type: 'button', text: label, onclick: onclick });
    }

    function header(title, hint) {
        return el('div.demo-head', {}, [el('span.demo-title', { text: title }), el('span.demo-hint', { text: hint })]);
    }

    /* ─────────────────────────────────────────────
       1. Cache-aware scale-in
       cost = round((0.7 * hit rate + 0.3 * KV usage) * 1000)
       Default Kubernetes removes the most recently ready pod;
       with the annotation it removes the lowest cost.
       ───────────────────────────────────────────── */

    function scaleIn(root) {
        var scenarios = [
            // newest pod is the hot one: the case the project exists for
            [{ hit: 5, kv: 20, age: '6h' }, { hit: 55, kv: 60, age: '3h' }, { hit: 70, kv: 85, age: '12m' }],
            [{ hit: 70, kv: 80, age: '5h' }, { hit: 5, kv: 15, age: '2h' }, { hit: 55, kv: 65, age: '20m' }],
            [{ hit: 62, kv: 70, age: '4h' }, { hit: 48, kv: 90, age: '9m' }, { hit: 12, kv: 30, age: '1h' }],
            // sometimes both rules agree
            [{ hit: 70, kv: 75, age: '8h' }, { hit: 55, kv: 60, age: '2h' }, { hit: 5, kv: 10, age: '4m' }]
        ];
        var index = 0;
        var scaled = false;
        var minutes = function (age) { return parseFloat(age) * (age.slice(-1) === 'h' ? 60 : 1); };

        var panels = el('div.si-panels');
        var verdict = el('p.demo-verdict');
        var action = button('Scale 3 → 2', function () { scaled = true; draw(); }, true);
        var shuffle = button('Different traffic', function () { index = (index + 1) % scenarios.length; scaled = false; draw(); });

        function draw() {
            var pods = scenarios[index].map(function (p, i) {
                return {
                    name: 'pod-' + 'abc'[i], hit: p.hit, kv: p.kv, age: p.age,
                    cost: Math.round((0.7 * p.hit / 100 + 0.3 * p.kv / 100) * 1000)
                };
            });
            var newest = pods.slice().sort(function (a, b) { return minutes(a.age) - minutes(b.age); })[0];
            var coldest = pods.slice().sort(function (a, b) { return a.cost - b.cost; })[0];
            var hottest = pods.slice().sort(function (a, b) { return b.cost - a.cost; })[0];

            panels.innerHTML = '';
            [
                { title: 'Default Kubernetes', rule: 'removes the newest pod', victim: newest, aware: false },
                { title: 'Cache-aware', rule: 'removes the lowest cost', victim: coldest, aware: true }
            ].forEach(function (side) {
                var list = el('div.si-pods');
                pods.forEach(function (p) {
                    var gone = scaled && p === side.victim;
                    var bar = el('i.si-bar');
                    bar.style.setProperty('--w', p.hit + '%');
                    list.appendChild(el('div.si-pod' + (gone ? '.is-gone' : ''), {}, [
                        el('span.si-name', { text: p.name }),
                        bar,
                        el('span.si-num', { text: p.hit + '% hits' }),
                        el('span.si-meta', { text: side.aware ? 'cost ' + p.cost : 'ready ' + p.age })
                    ]));
                });
                panels.appendChild(el('div.si-panel', {}, [
                    el('div.si-panel-head', {}, [el('strong', { text: side.title }), el('span', { text: side.rule })]),
                    list
                ]));
            });

            action.disabled = scaled;
            if (!scaled) {
                verdict.textContent = 'Three vLLM replicas, each with its own prefix cache. Traffic drops and one has to go.';
                verdict.className = 'demo-verdict';
            } else if (newest === coldest) {
                verdict.textContent = 'Both removed ' + newest.name + ' this time: the newest pod also had the coldest cache. The default is right by luck.';
                verdict.className = 'demo-verdict';
            } else {
                verdict.textContent = 'Default threw away ' + newest.name + (newest === hottest ? ', the hottest cache (' : ' (') + newest.hit +
                    '% hits). Cache-aware removed ' + coldest.name + ' (' + coldest.hit + '% hits) and kept the warm prefixes.';
                verdict.className = 'demo-verdict is-win';
            }
        }

        root.appendChild(header('Try it: which replica gets removed?', 'simulation'));
        root.appendChild(panels);
        root.appendChild(el('div.demo-row', {}, [action, shuffle]));
        root.appendChild(verdict);
        draw();
    }

    /* ─────────────────────────────────────────────
       2. Idempotent orders
       Same key + same body  -> stored response, same order id
       Same key + other body -> 409
       New key               -> new order
       ───────────────────────────────────────────── */

    function idempotency(root) {
        var state;
        var key = el('code.idem-key');
        var body = el('code.idem-body');
        var log = el('ol.idem-log');
        var sent = el('strong');
        var orders = el('strong');

        function newKey() { return Math.random().toString(16).slice(2, 8); }

        function reset() {
            state = { key: newKey(), qty: 1, store: {}, nextId: 1042, sent: 0, orders: 0 };
            log.innerHTML = '';
            line('idle', 'Send an order, then retry it.');
            draw();
        }

        function line(kind, text) {
            var item = el('li.idem-line.is-' + kind, { text: text });
            log.insertBefore(item, log.firstChild);
            while (log.children.length > 5) log.removeChild(log.lastChild);
        }

        function draw() {
            key.textContent = 'Idempotency-Key: ' + state.key;
            body.textContent = '{ "item_id": "item1", "quantity": ' + state.qty + ' }';
            sent.textContent = state.sent;
            orders.textContent = state.orders;
            orders.parentNode.classList.remove('is-bump');
        }

        function send() {
            var payload = String(state.qty);
            var record = state.store[state.key];
            state.sent++;
            if (!record) {
                state.store[state.key] = { body: payload, id: state.nextId++ };
                state.orders++;
                line('created', '201  order ' + state.store[state.key].id + '  created');
            } else if (record.body === payload) {
                line('replay', '201  order ' + record.id + '  replayed');
            } else {
                line('conflict', '409  same key, different body');
            }
            draw();
        }

        root.appendChild(header('Try it: retry as many times as you like', 'simulation'));
        root.appendChild(el('div.idem', {}, [
            el('div.idem-req', {}, [
                el('span.idem-verb', { text: 'POST /orders' }), key, body,
                el('div.demo-row', {}, [
                    button('Send order', send, true),
                    button('Change body', function () { state.qty = state.qty === 1 ? 2 : 1; draw(); }),
                    button('New key', function () { state.key = newKey(); state.qty = 1; draw(); }),
                    button('Reset', reset)
                ])
            ]),
            el('div.idem-res', {}, [
                log,
                el('p.idem-count', {}, [el('span', {}, ['requests sent ', sent]), el('span', {}, ['orders in database ', orders])])
            ])
        ]));
        reset();
    }

    /* ─────────────────────────────────────────────
       3. SDN load balancer
       Same five algorithms and the same weights
       (1, 1, 2, 2) as the RYU controller.
       ───────────────────────────────────────────── */

    function loadBalancer(root) {
        var ALGOS = [
            ['round_robin', 'Round robin', 'Each new connection goes to the next server in turn.'],
            ['random', 'Random', 'Each new connection picks a server at random.'],
            ['ip_hash', 'IP hash', 'A client always lands on the same server, chosen by hashing its IP.'],
            ['least_connections', 'Least connections', 'The server with the fewest open connections wins.'],
            ['weighted', 'Weighted', 'Servers 3 and 4 have weight 2, so they take twice the share.']
        ];
        var WEIGHTS = [1, 1, 2, 2];
        var CLIENTS = ['10.0.0.1', '10.0.0.2', '10.0.0.3'];
        var algo = 'round_robin';
        var counts, active, rr, widx, timer, running = false;
        var sequence = [];
        WEIGHTS.forEach(function (w, i) { for (var k = 0; k < w; k++) sequence.push(i); });

        var tabs = el('div.lb-tabs', { role: 'tablist' });
        var note = el('p.demo-verdict');
        var stage = el('div.lb-stage');
        var clientEls = CLIENTS.map(function (ip, i) { return el('div.lb-client', {}, [el('span', { text: 'client ' + (i + 1) }), el('small', { text: ip })]); });
        var serverEls = WEIGHTS.map(function (w, i) {
            return el('div.lb-server', {}, [
                el('span.lb-sname', { text: 'server ' + (i + 1) }),
                el('i.lb-bar'),
                el('span.lb-count', { text: '0' })
            ]);
        });
        var vip = el('div.lb-vip', {}, [el('span', { text: 'switch' }), el('small', { text: 'VIP 10.0.0.100' })]);
        stage.appendChild(el('div.lb-col', {}, clientEls));
        stage.appendChild(vip);
        stage.appendChild(el('div.lb-col.lb-servers', {}, serverEls));

        function hash(ip) {
            var h = 0;
            for (var i = 0; i < ip.length; i++) h = (h * 31 + ip.charCodeAt(i)) >>> 0;
            return h % WEIGHTS.length;
        }

        function pick(client) {
            if (algo === 'round_robin') return rr++ % WEIGHTS.length;
            if (algo === 'random') return Math.floor(Math.random() * WEIGHTS.length);
            if (algo === 'ip_hash') return hash(CLIENTS[client]);
            if (algo === 'weighted') return sequence[widx++ % sequence.length];
            var best = 0;                                   // least_connections
            for (var i = 1; i < active.length; i++) if (active[i] < active[best]) best = i;
            return best;
        }

        function redraw() {
            var max = Math.max.apply(null, counts.concat([1]));
            serverEls.forEach(function (s, i) {
                s.querySelector('.lb-bar').style.setProperty('--w', (counts[i] / max * 100) + '%');
                s.querySelector('.lb-count').textContent = counts[i];
            });
        }

        function fly(from, to, done) {
            if (reduced) return done();
            var a = from.getBoundingClientRect(), v = vip.getBoundingClientRect(), b = to.getBoundingClientRect(), s = stage.getBoundingClientRect();
            var dot = el('i.lb-dot');
            stage.appendChild(dot);
            var p = function (r, edge) { return 'translate(' + ((edge === 'r' ? r.right : edge === 'l' ? r.left : r.left + r.width / 2) - s.left - 3) + 'px,' + (r.top + r.height / 2 - s.top - 3) + 'px)'; };
            var anim = dot.animate([{ transform: p(a, 'r') }, { transform: p(v, 'c'), offset: 0.45 }, { transform: p(b, 'l') }], { duration: 520, easing: 'ease-in-out' });
            anim.onfinish = function () { dot.remove(); done(); };
        }

        function request() {
            var client = Math.floor(Math.random() * CLIENTS.length);
            var server = pick(client);
            active[server]++;
            fly(clientEls[client], serverEls[server], function () {
                counts[server]++;
                redraw();
                // connections stay open for a while, which is what least-connections reacts to
                setTimeout(function () { active[server] = Math.max(0, active[server] - 1); }, 400 + Math.random() * 1600);
            });
        }

        function reset() {
            counts = [0, 0, 0, 0]; active = [0, 0, 0, 0]; rr = 0; widx = 0;
            redraw();
        }

        // Runs on its own: a steady trickle of requests while the demo is on
        // screen, moving to the next algorithm every few seconds until someone
        // picks one, which pins it.
        var pinned = false, visible = false, sent = 0, PER_ALGO = 36;

        function tick() {
            if (!visible || document.hidden) return;
            if (!pinned && sent >= PER_ALGO) {
                var i = ALGOS.map(function (a) { return a[0]; }).indexOf(algo);
                select(ALGOS[(i + 1) % ALGOS.length][0]);
            }
            request();
            sent++;
        }

        function select(id) {
            algo = id;
            sent = 0;
            Array.prototype.forEach.call(tabs.children, function (t) { t.setAttribute('aria-selected', t.getAttribute('data-id') === id); });
            note.textContent = ALGOS.filter(function (a) { return a[0] === id; })[0][2];
            reset();
        }

        ALGOS.forEach(function (a) {
            tabs.appendChild(el('button.lb-tab', { type: 'button', role: 'tab', 'data-id': a[0], text: a[1], onclick: function () { pinned = true; select(a[0]); } }));
        });

        root.appendChild(header('Requests through the switch', 'live'));
        root.appendChild(tabs);
        root.appendChild(stage);
        root.appendChild(note);
        select('round_robin');

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }).observe(root);
        } else {
            visible = true;
        }
        timer = setInterval(tick, reduced ? 700 : 240);
    }

    var DEMOS = { 'scale-in': scaleIn, 'idempotency': idempotency, 'load-balancer': loadBalancer };

    document.querySelectorAll('[data-demo]').forEach(function (node) {
        var mount = DEMOS[node.getAttribute('data-demo')];
        if (mount) mount(node);
    });
})();
