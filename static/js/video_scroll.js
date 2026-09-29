/**
 * PCDF – Video Frame Controller (Continuous Ultra-Smooth Streaming)
 * =================================================================
 *
 * 1. HERO LOOP  (#heroFilmCanvas, z:1)
 *    - Plays all 393 frames at 24fps, looping continuously
 *    - Instant startup upon Frame 1 load (from memory cache or network)
 *    - High performance cover-fit draw loop with smooth fallback
 *
 * 2. SCROLL SECTION  (#videoScrollCanvas, inside #video-scroll-section)
 *    - 400vh sticky section
 *    - Scroll progress 0→1 drives frame 1→393
 *    - Live chapter text + red progress bar
 */
(function () {
    'use strict';

    const FRAME_COUNT = 393;
    const HERO_FPS = 24;
    const HERO_ALPHA = 1.0;
    const SCROLL_ALPHA = 0.45;

    const frameSrc = (n) =>
        `/static/framesnew/frame_${String(n).padStart(4, '0')}.webp`;

    /* ── Shared image cache (1-indexed) ────────────────────────────────── */
    const images = new Array(FRAME_COUNT + 1);
    let loadedCount = 0;
    let maxLoadedIndex = 0;

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

        let cw = 0, ch = 0, currentFrame = 1, last = 0, running = false, raf = null;
        let isVisible = true;

        const observer = new IntersectionObserver((entries) => {
            const wasVisible = isVisible;
            isVisible = entries[0].isIntersecting;
            if (isVisible && !wasVisible && running) {
                raf = requestAnimationFrame(loop);
            } else if (!isVisible && wasVisible) {
                if (raf) cancelAnimationFrame(raf);
            }
        }, { threshold: 0 });
        if (heroEl) observer.observe(heroEl);

        function resize() {
            const newW = (heroEl && heroEl.offsetWidth) || window.innerWidth || 360;
            const newH = (heroEl && heroEl.offsetHeight) || window.innerHeight || 600;
            if (Math.abs(newW - cw) > 10 || Math.abs(newH - ch) > 150 || cw === 0) {
                cw = canvas.width = newW;
                ch = canvas.height = newH;
            }
        }
        let rT; window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(resize, 100); }, { passive: true });
        resize();

        function drawFrame(idx) {
            let img = images[idx];
            if (!img || !img.complete || img.naturalWidth === 0) {
                // Find closest loaded frame <= idx
                for (let f = idx; f >= 1; f--) {
                    if (images[f] && images[f].complete && images[f].naturalWidth > 0) {
                        img = images[f];
                        break;
                    }
                }
            }
            if (!img || !img.complete || img.naturalWidth === 0) {
                img = images[1];
            }
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

            currentFrame = (currentFrame % FRAME_COUNT) + 1;
            drawFrame(currentFrame);
        }

        function start() {
            if (running) return;
            running = true;
            resize();
            drawFrame(1);
            canvas.classList.add('film-ready');
            if (isVisible) raf = requestAnimationFrame(loop);
        }

        window._heroStart = start;

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (raf) cancelAnimationFrame(raf);
                running = false;
            } else if (!running) {
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
            let img = images[active];
            if (!img || !img.complete || img.naturalWidth === 0) {
                for (let f = active; f >= 1; f--) {
                    if (images[f] && images[f].complete && images[f].naturalWidth > 0) {
                        img = images[f];
                        break;
                    }
                }
            }
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
       PRELOADER & STREAMING ENGINE — Fast, Continuous, Non-blocking
       ══════════════════════════════════════════════════════════════════════ */
    function loadSingleFrame(i) {
        if (images[i]) return images[i];
        const img = new Image();
        images[i] = img;
        img.onload = function () {
            if (this.naturalWidth > 0) {
                loadedCount++;
                maxLoadedIndex = Math.max(maxLoadedIndex, i);
                if (i === 1 && window._heroStart) {
                    window._heroStart();
                }
            }
        };
        img.onerror = function () {
            // Silently continue
        };
        img.src = frameSrc(i);

        if (img.complete && img.naturalWidth > 0) {
            loadedCount++;
            maxLoadedIndex = Math.max(maxLoadedIndex, i);
            if (i === 1 && window._heroStart) {
                window._heroStart();
            }
        }
        return img;
    }

    function preload() {
        // 1. Immediately load frame 1
        const f1 = loadSingleFrame(1);
        if (f1.complete && f1.naturalWidth > 0) {
            if (window._heroStart) window._heroStart();
        }

        // 2. Continuous pipelined loader for all 393 frames
        let currentIndex = 2;
        const CHUNK_SIZE = 12;

        function loadNextChunk() {
            if (currentIndex > FRAME_COUNT) return;
            const end = Math.min(currentIndex + CHUNK_SIZE, FRAME_COUNT + 1);
            for (let i = currentIndex; i < end; i++) {
                loadSingleFrame(i);
            }
            currentIndex = end;

            // Schedule next chunk with small delay so browser main thread stays silky 60fps
            if (currentIndex <= FRAME_COUNT) {
                if (currentIndex <= 60) {
                    // Hero priority frames load instantly
                    setTimeout(loadNextChunk, 15);
                } else {
                    setTimeout(loadNextChunk, 35);
                }
            }
        }

        // Kick off streaming immediately
        loadNextChunk();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', preload);
    } else {
        preload();
    }

}());
