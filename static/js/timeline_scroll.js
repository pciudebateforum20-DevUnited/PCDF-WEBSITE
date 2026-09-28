(function () {
    'use strict';

    var FRAME_COUNT = 393;
    var FRAME_ALPHA = 0.30;

    function pad(n) {
        return n < 10 ? '00' + n : n < 100 ? '0' + n : '' + n;
    }

    function frameSrc(n) {
        return '/static/framesnew/frame_' + pad(n) + '.webp';
    }

    /* ---------- Canvas setup ---------- */
    var canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    var fill = document.getElementById('progressFill');
    var label = document.getElementById('frameLabel');
    var labelFixed = document.getElementById('frameLabelFixed');

    var cw, ch;

    function resize() {
        cw = canvas.width = window.innerWidth;
        ch = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    /* ---------- Image cache ---------- */
    var images = [];

    function drawFrame(idx) {
        var img = images[idx];
        if (!img || !img.complete || img.naturalWidth === 0) return false;
        var s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
        var dw = img.naturalWidth * s;
        var dh = img.naturalHeight * s;
        ctx.clearRect(0, 0, cw, ch);
        ctx.globalAlpha = FRAME_ALPHA;
        ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
        ctx.globalAlpha = 1;
        return true;
    }

    /* ---------- Scroll ---------- */
    var currentFrame = 1;

    function onScroll() {
        var scrollTop = window.scrollY || window.pageYOffset || 0;
        var docHeight = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.offsetHeight,
            document.body.clientHeight,
            document.documentElement.clientHeight
        );
        var winHeight = window.innerHeight;
        var maxScroll = Math.max(docHeight - winHeight, 1);
        var prog = Math.min(1, Math.max(0, scrollTop / maxScroll));

        var f = Math.min(FRAME_COUNT, Math.max(1, Math.round(prog * (FRAME_COUNT - 1)) + 1));
        if (f !== currentFrame) {
            currentFrame = f;
            drawFrame(currentFrame);
        }

        if (fill) fill.style.width = (prog * 100) + '%';
        if (label) label.textContent = 'Frame ' + pad(currentFrame) + ' / ' + FRAME_COUNT;
        if (labelFixed) labelFixed.textContent = 'Frame ' + pad(currentFrame);
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    /* ---------- Preloader ---------- */
    var loaded = 0;

    function loadBatch(from, size, done) {
        var to = Math.min(from + size, FRAME_COUNT + 1);
        var remaining = to - from;
        if (remaining <= 0) { if (done) done(); return; }
        for (var i = from; i < to; i++) {
            if (images[i]) {
                remaining--;
                if (remaining <= 0 && done) done();
                continue;
            }
            (function (idx) {
                var img = new Image();
                images[idx] = img;
                img.onload = img.onerror = function () {
                    if (this.naturalWidth) loaded = Math.max(loaded, idx);
                    remaining--;
                    if (remaining <= 0 && done) done();
                };
                img.src = frameSrc(idx);
            }(i));
        }
    }

    function start() {
        loadBatch(1, 10, function () {
            loaded = 10;
            onScroll();
            var next = 11;
            (function more() {
                if (next > FRAME_COUNT) return;
                loadBatch(next, 5, function () {
                    next += 5;
                    setTimeout(more, 250);
                });
            })();
        });
    }

    /* Redraw on resize */
    var resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () { resize(); drawFrame(currentFrame); }, 150);
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

}());