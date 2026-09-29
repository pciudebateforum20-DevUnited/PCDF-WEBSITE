/**
 * PCDF – Video Frame Controller  (Production)
 * =============================================
 *
 * 1. HERO LOOP  (#heroFilmCanvas, z:1)
 *    - Plays all 393 frames at 24fps, looping forever
 *    - globalAlpha = 1.0  →  fully visible background video
 *    - Canvas covers entire hero section
 *
 * 2. SCROLL SECTION  (#videoScrollCanvas, inside #video-scroll-section)
 *    - 400vh sticky section
 *    - Scroll progress 0→1 drives frame 1→393
 *    - globalAlpha = 0.45 (clearly a background, text readable on top)
 *    - Live chapter text + red progress bar
 */
(function () {
    'use strict';

    const FRAME_COUNT = 393;
    const HERO_FPS = 24;
    const HERO_ALPHA = 1.0;    // CSS opacity:0.22 + mix-blend-mode:multiply handles blending
    const SCROLL_ALPHA = 0.45;
    const INITIAL_BATCH = 60;
    const BATCH_SIZE = 30;

    const frameSrc = (n) =>
        `/static/framesnew/frame_${String(n).padStart(4, '0')}.webp`;

    /* ── Shared image cache (1-indexed) ────────────────────────────────── */
    const images = [];
    let loadedMax = 0;

    /* ── Cover-fit draw helper ─────────────────────────────────────────── */
    function paintCover(ctx, img, cw, ch, alpha) {
        if (!img || !img.complete || img.naturalWidth === 0) return;
        const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
        const dw = img.naturalWidth * s;
        const dh = img.naturalHeight * s;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
        ctx.restore();
    }

    /* ══════════════════════════════════════════════════════════════════════
       1. HERO LOOP
       ══════════════════════════════════════════════════════════════════════ */
    (function heroLoop() {
        const canvas = document.getElementById('heroFilmCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const heroEl = document.getElementById('hero-section');
        const MS = 1000 / HERO_FPS;

        let cw = 0, ch = 0, frame = 1, last = 0, running = false, raf;
        let isVisible = true;
        const observer = new IntersectionObserver((entries) => {
            const wasVisible = isVisible;
            isVisible = entries[0].isIntersecting;
            if (isVisible && !wasVisible && running) {
                raf = requestAnimationFrame(loop);
            } else if (!isVisible && wasVisible) {
                cancelAnimationFrame(raf);
            }
        }, { threshold: 0 });
        if (heroEl) observer.observe(heroEl);

        function resize() {
            cw = canvas.width = (heroEl ? heroEl.offsetWidth : window.innerWidth) || window.innerWidth;
            ch = canvas.height = (heroEl ? heroEl.offsetHeight : window.innerHeight) || window.innerHeight;
            if (images[frame] && images[frame].complete) {
                paintCover(ctx, images[frame], cw, ch, HERO_ALPHA);
            }
        }
        let rT; window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(resize, 80); }, { passive: true });
        resize();

        function drawHero(idx) {
            const img = images[idx];
            if (img && img.complete && img.naturalWidth > 0) {
                ctx.clearRect(0, 0, cw, ch);
                paintCover(ctx, img, cw, ch, HERO_ALPHA);
            }
        }

        function loop(ts) {
            if (!isVisible) return;
            raf = requestAnimationFrame(loop);
            if (ts - last < MS) return;
            last = ts;

            const maxPlay = Math.min(FRAME_COUNT, Math.max(1, loadedMax));
            frame = (frame % maxPlay) + 1;
            drawHero(frame);
        }

        function start() {
            if (running) return;
            running = true;
            canvas.classList.add('film-ready');  // CSS opacity 0→1
            drawHero(1);
            if (isVisible) raf = requestAnimationFrame(loop);
        }

        window._heroStart = start;

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) { 
                cancelAnimationFrame(raf); 
                running = false; 
            } else if (!running && loadedMax >= 1) {
                start();
            }
        });
    }());

    /* ══════════════════════════════════════════════════════════════════════
       2. SCROLL SECTION
       ══════════════════════════════════════════════════════════════════════ */
    (function scrollSection() {
        const section = document.getElementById('video-scroll-section');
        const canvas = document.getElementById('videoScrollCanvas');
        if (!section || !canvas) return;

        const ctx = canvas.getContext('2d');
        const hint = document.getElementById('vsHint');
        const bar = document.getElementById('vsProgress');
        const lbl = document.getElementById('vsFrameLabel');
        const hd = document.getElementById('vsHeadline');
        const ch = document.getElementById('vsChapter');
        const sub = document.getElementById('vsSub');

        const chapters = [
            { at: 0.00, chapter: 'Origin', headline: 'The First<br/><span>Debate</span>', sub: 'Before halls and microphones, humans gathered around fire and argued over truth.' },
            { at: 0.25, chapter: 'Conflict', headline: 'Where<br/><span>Ideas Clash</span>', sub: 'A great debate is not a war of words — it is a collision of worlds.' },
            { at: 0.55, chapter: 'Resolution', headline: 'Logic<br/><span>Prevails</span>', sub: 'Every argument forged in fire becomes the foundation of tomorrow\'s understanding.' },
            { at: 0.80, chapter: 'Legacy', headline: 'PCIU<br/><span>Debating Forum</span>', sub: 'Join a legacy of thinkers, speakers, and champions.' },
        ];

        let cw = 0, ch2 = 0, active = 1, prev = -1, dirty = false;
        let isVisible = false;
        const observer2 = new IntersectionObserver((entries) => {
            isVisible = entries[0].isIntersecting;
            if (isVisible && dirty) render();
        }, { threshold: 0 });
        observer2.observe(section);

        let rT2; window.addEventListener('resize', () => { clearTimeout(rT2); rT2 = setTimeout(resize2, 100); }, { passive: true });
        function resize2() { cw = canvas.width = window.innerWidth; ch2 = canvas.height = window.innerHeight; if (isVisible) render(); }
        resize2();

        function render() {
            const img = images[active];
            if (!img || !img.complete || img.naturalWidth === 0) return;
            ctx.clearRect(0, 0, cw, ch2);
            paintCover(ctx, img, cw, ch2, SCROLL_ALPHA);
            prev = active; dirty = false;
        }

        let lastCh = null;
        let ticking = false;

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    if (!isVisible) {
                        ticking = false;
                        return;
                    }
                    const rect = section.getBoundingClientRect();
                    const track = section.offsetHeight - window.innerHeight;
                    if (track > 0) {
                        const prog = Math.max(0, Math.min(1, -rect.top / track));
                        const frame = Math.min(FRAME_COUNT, Math.max(1, Math.round(prog * (FRAME_COUNT - 1)) + 1));

                        if (frame !== active) {
                            active = frame;
                            render();
                        }
                        if (bar) bar.style.width = (prog * 100) + '%';
                        if (lbl) lbl.textContent = 'Frame ' + String(frame).padStart(3, '0');
                        if (hint) hint.style.opacity = prog > 0.015 ? '0' : '1';

                        // Chapter update
                        let c = chapters[0];
                        for (const x of chapters) if (prog >= x.at) c = x;
                        if (c !== lastCh) {
                            lastCh = c;
                            if (ch) ch.textContent = c.chapter;
                            if (hd) { hd.style.opacity = '0'; setTimeout(() => { hd.innerHTML = c.headline; hd.style.opacity = '1'; }, 220); }
                            if (sub) { sub.style.opacity = '0'; setTimeout(() => { sub.textContent = c.sub; sub.style.opacity = '1'; }, 220); }
                        }
                    }
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }());

    /* ══════════════════════════════════════════════════════════════════════
       PRELOADER — Progressive & Non-blocking Batched Image Loading
       ══════════════════════════════════════════════════════════════════════ */
    function loadBatch(from, size, done) {
        const to = Math.min(from + size, FRAME_COUNT + 1);
        let n = to - from;
        if (n <= 0) { done && done(); return; }
        for (let i = from; i < to; i++) {
            if (images[i]) { 
                if (!--n) done && done(); 
                continue; 
            }
            const img = new Image();
            images[i] = img;
            img.onload = function () {
                if (this.naturalWidth) loadedMax = Math.max(loadedMax, i);
                if (!--n) done && done();
            };
            img.onerror = function () {
                if (!--n) done && done();
            };
            img.src = frameSrc(i);
        }
    }

    function preload() {
        // Step 1: Instantly load frame 1 and start immediately
        const firstImg = new Image();
        firstImg.onload = function () {
            images[1] = firstImg;
            loadedMax = Math.max(loadedMax, 1);
            if (window._heroStart) window._heroStart();
        };
        firstImg.src = frameSrc(1);
        images[1] = firstImg;

        // Step 2: Load initial batch of 25 frames
        loadBatch(2, 24, () => {
            loadedMax = Math.max(loadedMax, 25);
            if (window._heroStart) window._heroStart();

            // Step 3: Lazy-load remaining frames
            const scrollSec = document.getElementById('video-scroll-section');
            let startedRemaining = false;

            function loadRemaining() {
                if (startedRemaining) return;
                startedRemaining = true;
                let next = 26;
                (function more() {
                    if (next > FRAME_COUNT) return;
                    loadBatch(next, 20, () => { 
                        next += 20; 
                        setTimeout(more, 60); 
                    });
                })();
            }

            if (scrollSec && 'IntersectionObserver' in window) {
                const obs = new IntersectionObserver((entries) => {
                    if (entries[0].isIntersecting) {
                        obs.disconnect();
                        loadRemaining();
                    }
                }, { rootMargin: '600px 0px' });
                obs.observe(scrollSec);
            }

            if ('requestIdleCallback' in window) {
                requestIdleCallback(() => setTimeout(loadRemaining, 1000));
            } else {
                setTimeout(loadRemaining, 2000);
            }
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', preload);
    else preload();

}());
