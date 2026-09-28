/**
 * PCDF Hero Canvas Engine — Original Aesthetic with Fast 2X Fluid Speed
 * ====================================================================
 * - Exact original physics & line curves from fed-04.txt
 * - 50/50 organic Red (Sine) & structured Black (Cosine)
 * - 2X faster fluid motion speed
 * - High performance RAF pause when off-screen
 */
(function () {
    'use strict';

    function initHeroCanvas() {
        const heroSection = document.getElementById('hero-section');
        const canvas = document.getElementById('artCanvas');
        if (!heroSection || !canvas) return;

        const ctx = canvas.getContext('2d');
        const holeOverlay = document.getElementById('holeOverlay');
        const expandBtn = document.getElementById('expandBtn');

        let width, height;
        let streams = [];
        let mouse = { x: null, y: null };
        let boundsExpanded = false;
        let isVisible = true;
        let rafId = null;

        // Exact subtle, elegant colors from fed-04
        const RED_INK = 'rgba(211, 47, 47, 0.12)';
        const BLACK_INK = 'rgba(17, 17, 17, 0.15)';

        function resize() {
            width = canvas.width = heroSection.clientWidth;
            height = canvas.height = heroSection.clientHeight;

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);

            if (mouse.x === null) {
                mouse.x = width / 2;
                mouse.y = height / 2;
            }
        }

        let rT;
        window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(resize, 80); });

        heroSection.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        }, { passive: true });

        heroSection.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                const rect = canvas.getBoundingClientRect();
                mouse.x = e.touches[0].clientX - rect.left;
                mouse.y = e.touches[0].clientY - rect.top;
            }
        }, { passive: true });

        resize();

        // Toggle the "Hole" expansion
        if (expandBtn) {
            expandBtn.addEventListener('click', (e) => {
                e.preventDefault();
                boundsExpanded = !boundsExpanded;
                const currentOverlay = document.getElementById('holeOverlay') || holeOverlay;
                if (boundsExpanded) {
                    if (currentOverlay) {
                        currentOverlay.style.background = 'radial-gradient(circle at 50% 50%, transparent 150vmin, rgba(255,255,255,0.8) 160vmin, #ffffff 200vmin)';
                    }
                    expandBtn.innerText = "Confine the Chaos";
                } else {
                    if (currentOverlay) {
                        const inner = window.innerWidth < 768 ? '42vmin' : '32vmin';
                        const edge = window.innerWidth < 768 ? '46vmin' : '36vmin';
                        const outer = window.innerWidth < 768 ? '52vmin' : '42vmin';
                        currentOverlay.style.background = `radial-gradient(circle at 50% 50%, transparent ${inner}, rgba(255,255,255,0.8) ${edge}, #ffffff ${outer})`;
                    }
                    expandBtn.innerText = "Unleash the Art";
                }
            });
        }

        class FluidStream {
            constructor(type, id) {
                this.type = type;
                this.id = id;
                this.color = type === 'red' ? RED_INK : BLACK_INK;

                // Spawn from the figure positions
                this.x = type === 'red' ? width * 0.15 : width * 0.85;
                this.y = height * 0.45 + (Math.random() - 0.5) * 100;

                // Movement direction
                this.angle = type === 'red' ? 0 : Math.PI;
                // 2X Speed: smoothly accelerated
                this.baseSpeed = 2.4 + Math.random() * 2.8;
                this.history = [];
                this.thickness = type === 'black' ? (Math.random() * 1 + 0.5) : (Math.random() * 1.5 + 1);
                this.time = Math.random() * 1000;
            }

            update() {
                this.time += 0.02; // 2x wave speed
                let targetX = (mouse.x !== null && !boundsExpanded) ? mouse.x : width / 2;
                let targetY = (mouse.y !== null && !boundsExpanded) ? mouse.y : height / 2;

                // Exact original Fluid Dynamics
                if (this.type === 'red') {
                    // Organic flowing motion (Sine waves)
                    this.angle += Math.sin(this.time) * 0.05;
                } else {
                    // Logical structured motion (Step-like but smooth)
                    this.angle += Math.cos(this.time * 2) * 0.04;
                    if (Math.random() < 0.01) this.angle += Math.PI / 4;
                }

                let dx = targetX - this.x;
                let dy = targetY - this.y;
                let distToTarget = Math.sqrt(dx * dx + dy * dy);

                // Gentle gravity towards center/mouse
                if (distToTarget > 50) {
                    this.angle += (Math.atan2(dy, dx) - this.angle) * 0.01;
                }

                this.vx = Math.cos(this.angle) * this.baseSpeed;
                this.vy = Math.sin(this.angle) * this.baseSpeed;

                // Containment strictly within the large central circle
                if (!boundsExpanded) {
                    let centerX = width / 2;
                    let centerY = height * 0.50;
                    let distToCenter = Math.sqrt((this.x - centerX) ** 2 + (this.y - centerY) ** 2);
                    let maxRadius = Math.min(width, height) * 0.36;

                    if (distToCenter > maxRadius) {
                        // Strong, smooth curve back to center
                        this.angle += (Math.atan2(centerY - this.y, centerX - this.x) - this.angle) * 0.14;
                    }

                    // Top ceiling protection: only protect top 80px navbar
                    if (this.y < 80) {
                        this.angle = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
                    }
                } else {
                    if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
                        this.angle += Math.PI / 2;
                    }
                }

                this.x += this.vx;
                this.y += this.vy;

                this.history.push({ x: this.x, y: this.y });
                if (this.history.length > 50) {
                    this.history.shift();
                }
            }

            draw(c) {
                if (this.history.length < 2) return;

                c.beginPath();
                c.moveTo(this.history[0].x, this.history[0].y);

                // Exact Smooth Bezier Curves
                for (let i = 1; i < this.history.length; i++) {
                    let xc = (this.history[i].x + this.history[i - 1].x) / 2;
                    let yc = (this.history[i].y + this.history[i - 1].y) / 2;
                    c.quadraticCurveTo(this.history[i - 1].x, this.history[i - 1].y, xc, yc);
                }

                c.lineWidth = this.thickness;
                c.strokeStyle = this.color;
                c.lineCap = 'round';
                c.lineJoin = 'round';
                c.stroke();
            }
        }

        // Original 50/50 balance (Exact count: 70 on desktop, 40 on mobile)
        const numStreams = window.innerWidth < 768 ? 40 : 70;
        for (let i = 0; i < numStreams; i++) {
            streams.push(new FluidStream(i % 2 === 0 ? 'red' : 'black', i));
        }

        function animate() {
            if (!isVisible) {
                rafId = null;
                return;
            }
            ctx.fillStyle = 'rgba(255, 255, 255, 0.003)';
            ctx.fillRect(0, 0, width, height);

            for (let i = 0; i < streams.length; i++) {
                streams[i].update();
                streams[i].draw(ctx);
            }
            rafId = requestAnimationFrame(animate);
        }

        // Performance observer — pause when offscreen
        const observer = new IntersectionObserver((entries) => {
            isVisible = entries[0].isIntersecting;
            if (isVisible && !rafId) {
                rafId = requestAnimationFrame(animate);
            } else if (!isVisible && rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        }, { threshold: 0 });
        observer.observe(heroSection);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHeroCanvas);
    } else {
        initHeroCanvas();
    }
})();