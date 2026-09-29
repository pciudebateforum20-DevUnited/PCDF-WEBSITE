document.addEventListener('DOMContentLoaded', () => {
    const framesSection = document.getElementById('frames-section');
    const canvas = document.getElementById('frameCanvas');
    if (!framesSection || !canvas) return;

    const ctx = canvas.getContext('2d');
    const frameCount = 393;
    const frames = [];
    let imagesLoaded = 0;

    // Load all frames
    for (let i = 1; i <= frameCount; i++) {
        const img = new Image();
        // frame_0001.webp format
        const frameIndex = i.toString().padStart(4, '0');
        img.src = `/static/frames/frame_${frameIndex}.webp`;
        img.onload = () => {
            imagesLoaded++;
            if (imagesLoaded === 1) {
                // Draw first frame as soon as it loads
                drawImageScaled(img, ctx);
            }
        };
        frames.push(img);
    }

    // Set canvas dimensions
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // Redraw current frame
        updateFrame(currentFrameIndex);
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function drawImageScaled(img, ctx) {
        if (!img.complete || img.naturalWidth === 0) return;
        const canvas = ctx.canvas;
        const hRatio = canvas.width / img.width;
        const vRatio = canvas.height / img.height;
        const ratio = Math.max(hRatio, vRatio);
        const centerShift_x = (canvas.width - img.width * ratio) / 2;
        const centerShift_y = (canvas.height - img.height * ratio) / 2;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, img.width, img.height,
            centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);
    }

    let currentFrameIndex = 0;

    function updateFrame(index) {
        if (frames[index]) {
            drawImageScaled(frames[index], ctx);
        }
    }

    window.addEventListener('scroll', () => {
        const sectionTop = framesSection.offsetTop;
        const sectionHeight = framesSection.clientHeight - window.innerHeight;
        const scrollPosition = window.scrollY - sectionTop;

        if (scrollPosition >= 0 && scrollPosition <= sectionHeight) {
            const scrollFraction = scrollPosition / sectionHeight;
            const frameIndex = Math.min(
                frameCount - 1,
                Math.floor(scrollFraction * frameCount)
            );

            if (frameIndex !== currentFrameIndex) {
                currentFrameIndex = frameIndex;
                updateFrame(currentFrameIndex);
            }
        } else if (scrollPosition < 0) {
            updateFrame(0);
        } else if (scrollPosition > sectionHeight) {
            updateFrame(frameCount - 1);
        }
    });
});
