/**
 * PCDF – Video Frame Controller (High Performance & Fast Streaming)
 * ================================================================
 * - Instant Hero Poster: Frame 1 paints immediately (<100ms)
 * - Safe Continuous Buffer: Starts smooth loop once 15 frames are ready
 * - High-speed concurrent parallel preloader for all 393 frames
 * - Zero frame drop / zero blank frame protection
 * - Mobile URL-bar resize & battery-saving IntersectionObserver
 */
(function () {
    'use strict';

    const FRAME_COUNT = 393;
    const HERO_FPS = 24;
    const HERO_ALPHA = 1.0;
    const SCROLL_ALPHA = 0.45;
    const MIN_PLAY_BUFFER = 15; // Start smooth animation after 15 frames buffered (~0.6s)

    const frameSrc = (n) =>
        `/static/framesnew/frame_${String(n).padStart(4, '0')}.webp`;

    /* ── Image cache (1-indexed) & contiguous buffer tracking ──────────── */
    const images = new Array(FRAME_COUNT + 1);
    let maxContiguous = 0;
    let heroLoopStarted = false;

    function updateContiguous() {
        while (maxContiguous < FRAME_COUNT) {
            const next = maxContiguous + 1;
            const img = images[next];
            if (img && img.complete && img.naturalWidth > 0) {
                maxContiguous = next;
            } else {
                break;
            }
        }
    }

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
    let triggerHeroStart = null;

    (function initHeroLoop() {
        const canvas = document.getElementById('heroFilmCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const heroEl = document.getElementById('hero-section');
        const MS = 1000 / HERO_FPS;

        let cw = 0, ch = 0, frame = 1, last = 0, running = false, raf = null;
        let isVisible = true;
        let lastW = 0, lastH = 0;

        function resize() {
            const newW = (heroEl ? heroEl.offsetWidth : window.innerWidth) || window.innerWidth;
            const newH = (heroEl ? heroEl.offsetHeight : window.innerHeight) || window.innerHeight;

            // Mobile address bar height toggle protection
            if (cw === newW && Math.abs(ch - newH) < 120) return;

            cw = canvas.width = newW;
            ch = canvas.height = newH;
            lastW = newW;
            lastH = newH;

            const currentImg = images[frame] || images[1];
            if (currentImg && currentImg.complete && currentImg.naturalWidth > 0) {
                ctx.clearRect(0, 0, cw, ch);
                paintCover(ctx, currentImg, cw, ch, HERO_ALPHA);
            }
        }

        let rT;
        window.addEventListener('resize', () => {
            clearTimeout(rT);
            rT = setTimeout(resize, 80);
        }, { passive: true });
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

            const playLimit = Math.max(1, maxContiguous);
            frame++;
            if (frame > playLimit) {
                frame = 1;
            }
            drawHero(frame);
        }

        function start() {
            if (running) return;
            running = true;
            canvas.classList.add('film-ready');
            if (isVisible) {
                raf = requestAnimationFrame(loop);
            }
        }

        function showPoster() {
            if (images[1] && images[1].complete && images[1].naturalWidth > 0) {
                drawHero(1);
                canvas.classList.add('film-ready');
            }
        }

        triggerHeroStart = function () {
            if (!heroLoopStarted && maxContiguous >= MIN_PLAY_BUFFER) {
                heroLoopStarted = true;
                start();
            }
        };

        window._heroShowPoster = showPoster;
        window._heroStart = triggerHeroStart;

        // IntersectionObserver to pause loop when scrolled down
        const observer = new IntersectionObserver((entries) => {
            const wasVisible = isVisible;
            isVisible = entries[0].isIntersecting;
            if (isVisible && !wasVisible && running) {
                raf = requestAnimationFrame(loop);
            } else if (!isVisible && wasVisible && raf) {
                cancelAnimationFrame(raf);
                raf = null;
            }
        }, { threshold: 0 });
        if (heroEl) observer.observe(heroEl);

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (raf) cancelAnimationFrame(raf);
                running = false;
            } else if (!running && heroLoopStarted) {
                start();
            }
        });
    }());

    /* ══════════════════════════════════════════════════════════════════════
       2. SCROLL SECTION
       ══════════════════════════════════════════════════════════════════════ */
    (function initScrollSection() {
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

        let cw = 0, ch2 = 0, active = 1;
        let isVisible = false;

        const observer2 = new IntersectionObserver((entries) => {
            isVisible = entries[0].isIntersecting;
            if (isVisible) render();
        }, { threshold: 0 });
        observer2.observe(section);

        let rT2;
        window.addEventListener('resize', () => {
            clearTimeout(rT2);
            rT2 = setTimeout(resize2, 100);
        }, { passive: true });

        function resize2() {
            cw = canvas.width = window.innerWidth;
            ch2 = canvas.height = window.innerHeight;
            if (isVisible) render();
        }
        resize2();

        function render() {
            let img = images[active];
            // If active frame isn't loaded yet during fast scroll, find closest loaded frame
            if (!img || !img.complete || img.naturalWidth === 0) {
                for (let off = 1; off <= 30; off++) {
                    if (active - off >= 1 && images[active - off] && images[active - off].complete && images[active - off].naturalWidth > 0) {
                        img = images[active - off];
                        break;
                    }
                    if (active + off <= FRAME_COUNT && images[active + off] && images[active + off].complete && images[active + off].naturalWidth > 0) {
                        img = images[active + off];
                        break;
                    }
                }
            }
            if (!img || !img.complete || img.naturalWidth === 0) return;
            ctx.clearRect(0, 0, cw, ch2);
            paintCover(ctx, img, cw, ch2, SCROLL_ALPHA);
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
       PRELOADER — Rapid Parallel & Progressive Stream Preloader
       ══════════════════════════════════════════════════════════════════════ */
    function loadSingleImage(idx, callback) {
        if (images[idx]) {
            if (callback) callback();
            return;
        }
        const img = new Image();
        img.decoding = 'async';
        images[idx] = img;

        img.onload = function () {
            updateContiguous();
            if (idx === 1 && window._heroShowPoster) {
                window._heroShowPoster();
            }
            if (triggerHeroStart) {
                triggerHeroStart();
            }
            if (callback) callback();
        };

        img.onerror = function () {
            updateContiguous();
            if (callback) callback();
        };

        img.src = frameSrc(idx);
    }

    function loadRange(from, to, callback) {
        let count = to - from + 1;
        if (count <= 0) {
            if (callback) callback();
            return;
        }
        for (let i = from; i <= to; i++) {
            loadSingleImage(i, () => {
                count--;
                if (count === 0 && callback) {
                    callback();
                }
            });
        }
    }

    function startPreloader() {
        // Stage 1: Instantly load frame 1 (poster)
        loadSingleImage(1);

        // Stage 2: Fast load critical buffer (frames 2 to 30 in parallel)
        loadRange(2, 30, () => {
            // Buffer is ready, trigger loop if not already triggered
            if (triggerHeroStart) triggerHeroStart();

            // Stage 3: Rapidly stream all remaining frames (31 to 393) in concurrent chunks of 45
            let current = 31;
            const CHUNK_SIZE = 45;

            function streamNext() {
                if (current > FRAME_COUNT) return;
                const end = Math.min(current + CHUNK_SIZE - 1, FRAME_COUNT);
                const startIdx = current;
                current = end + 1;

                loadRange(startIdx, end, () => {
                    // Instantly trigger next chunk without artificial timeouts
                    streamNext();
                });
            }

            // Launch 2 parallel streams for maximum bandwidth utilization
            streamNext();
            streamNext();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startPreloader);
    } else {
        startPreloader();
    }

}());
