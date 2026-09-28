/**
 * PCDF - Unified Debate Topics Pixel Art Engine
 * Represents the 4 core pillars of what we debate:
 * 1. 🇧🇩 Bangladesh 1971: Liberation, Constitution & Democracy
 * 2. ⚖️ Classic Geopolitics: Liberty vs. Revolution (1863 vs 1959)
 * 3. 🌐 Modern Geopolitics: Multipolar Balance & Superpowers
 * 4. ⚽ The Football Debate: Messi vs Ronaldo & Tactical Wars
 */

(function () {
    'use strict';

    // --------------------------------------------------------------------------
    // TOPIC DEFINITIONS
    // --------------------------------------------------------------------------
    const TOPICS = [
        {
            id: 'bangladesh-1971',
            number: '01',
            badge: 'NATIONAL FOUNDATIONS & SOVEREIGNTY',
            flag: '🇧🇩',
            title: '১৯৭১ মুক্তিযুদ্ধ, সংবিধান ও গণতন্ত্র',
            englishTitle: '1971: Liberation, Constitution & Democratic Will',
            humorCaption: 'From the historic thunder of March 7 to judicial constitutionalism — we debate statecraft with burning conviction and rigorous statutory logic.',
            quote: '"The struggle this time is the struggle for our emancipation."',
            imageSrc: '/static/images/debate_topics/bangladesh_1971.jpg',
            accentColor: '#dc2626',
            secondaryColor: '#006a4e',
            glowColor: 'rgba(220, 38, 38, 0.25)',
            spawnMode: 'liberation',
            soundType: 'heroic',
            ringColors: ['rgba(220, 38, 38, 0.9)', 'rgba(0, 106, 78, 0.7)'],
            sparks: ['#dc2626', '#006a4e', '#f6b40e', '#b91c1c'],
            duration: 18000 // 18 seconds (double time hold for Bangladesh 1971)
        },
        {
            id: 'classic-geopolitics',
            number: '02',
            badge: 'HISTORICAL CLASH OF IDEOLOGIES',
            flag: '⚖️',
            title: 'Liberty vs. Revolution (1863 vs. 1959)',
            englishTitle: 'Gettysburg Proclamations vs. Havana Guerrillas',
            humorCaption: 'Debating whether humanity is better liberated through constitutional declarations or revolutionary berets and midnight radio broadcasts.',
            quote: '"Government of the people, by the people... vs. Hasta la Victoria Siempre."',
            imageSrc: '/static/images/debate_topics/classic_geopolitics_1863_1959.jpg',
            accentColor: '#2563eb',
            secondaryColor: '#dc2626',
            glowColor: 'rgba(37, 99, 235, 0.25)',
            spawnMode: 'ideology',
            soundType: 'bell',
            ringColors: ['rgba(37, 99, 235, 0.9)', 'rgba(220, 38, 38, 0.7)'],
            sparks: ['#2563eb', '#dc2626', '#d97706', '#1d4ed8'],
            duration: 9000 // 9 seconds
        },
        {
            id: 'modern-geopolitics',
            number: '03',
            badge: 'GLOBAL POWER & SANCTIONS',
            flag: '🌐',
            title: 'Modern Geopolitics & Multipolar Hegemony',
            englishTitle: 'Superpowers, Trade Wars & Satellite Diplomacy',
            humorCaption: 'Resolving NATO expansions, semiconductor blockades, and global balance-of-power crises in precisely 7 minutes before the judge rings the bell.',
            quote: '"In international relations, there are no permanent friends, only permanent debate motions."',
            imageSrc: '/static/images/debate_topics/modern_geopolitics.jpg',
            accentColor: '#0284c7',
            secondaryColor: '#dc2626',
            glowColor: 'rgba(2, 132, 199, 0.25)',
            spawnMode: 'geopolitics',
            soundType: 'radar',
            ringColors: ['rgba(2, 132, 199, 0.9)', 'rgba(217, 119, 6, 0.7)'],
            sparks: ['#0284c7', '#dc2626', '#d97706', '#0d9488'],
            duration: 9000 // 9 seconds
        },
        {
            id: 'football-debate',
            number: '04',
            badge: 'TACTICAL SUPREMACY & PASSION',
            flag: '⚽',
            title: 'The Great Football & GOAT Debate',
            englishTitle: 'Messi vs. Ronaldo: The Theological Rhetoric',
            humorCaption: 'Proving objectively with geometric theorems why your favorite #10 is the undisputed GOAT — because world peace can wait, but football cannot.',
            quote: '"Some people think football is a matter of life and death. I assure you, it is much more serious than that."',
            imageSrc: '/static/images/debate_topics/football_debate.jpg',
            accentColor: '#d97706',
            secondaryColor: '#2563eb',
            glowColor: 'rgba(217, 119, 6, 0.25)',
            spawnMode: 'football',
            soundType: 'stadium',
            ringColors: ['rgba(217, 119, 6, 0.9)', 'rgba(37, 99, 235, 0.7)'],
            sparks: ['#d97706', '#2563eb', '#dc2626', '#059669'],
            duration: 9000 // 9 seconds
        }
    ];

    // --------------------------------------------------------------------------
    // AUDIO SYNTHESIZER (Zero-dependency Web Audio API)
    // --------------------------------------------------------------------------
    let audioCtx = null;
    let soundEnabled = false;

    function getAudioContext() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                audioCtx = new AudioContext();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function playTopicSound(soundType) {
        if (!soundEnabled) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            if (soundType === 'heroic') {
                // Bangladesh Joy Bangla harmonic chime
                [261.63, 329.63, 392.00, 523.25].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, now + i * 0.05);
                    gain.gain.setValueAtTime(0.12, now + i * 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2 + i * 0.05);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + i * 0.05);
                    osc.stop(now + 1.3 + i * 0.05);
                });
            } else if (soundType === 'bell') {
                // Liberty Bell harmonic chime
                [220.0, 440.0, 659.25, 880.0].forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now);
                    gain.gain.setValueAtTime(0.15 / (idx + 1), now);
                    gain.gain.exponentialRampToValueAtTime(0.0008, now + 1.6);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 1.7);
                });
            } else if (soundType === 'radar') {
                // High-tech radar sonar ping
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(980, now);
                osc.frequency.exponentialRampToValueAtTime(440, now + 0.35);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.85);
            } else if (soundType === 'stadium') {
                // Stadium referee whistle / celebration harmonic
                [587.33, 880.0, 1174.66].forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq + Math.sin(idx) * 20, now);
                    gain.gain.setValueAtTime(0.1, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.95);
                });
            }
        } catch (err) {
            console.warn('Audio playback error:', err);
        }
    }

    // --------------------------------------------------------------------------
    // PARTICLE & SHOCKWAVE CLASSES
    // --------------------------------------------------------------------------
    class TopicParticle {
        constructor(targetX, targetY, r, g, b, a, size, index, total, spawnMode, canvasWidth, canvasHeight) {
            this.targetX = targetX;
            this.targetY = targetY;
            this.r = r;
            this.g = g;
            this.b = b;
            this.a = a;
            this.size = size;
            this.index = index;
            this.color = `rgb(${r},${g},${b})`;

            this.x = targetX;
            this.y = targetY;
            this.vx = 0;
            this.vy = 0;
            this.alpha = 0;

            this.wavePhase = (targetX * 0.015) + (targetY * 0.015) + Math.random() * 0.5;
            this.delay = 0;
            this.elapsed = 0;
            this.isLocked = false;

            this.setupSpawn(spawnMode, total, canvasWidth, canvasHeight);
        }

        setupSpawn(mode, total, w, h) {
            const midX = w * 0.5;
            const midY = h * 0.5;
            const maxDist = Math.hypot(midX, midY) || 1;
            const distFromCenter = Math.hypot(this.targetX - midX, this.targetY - midY);

            // Soothing concentric wave delay based on spatial position
            this.delay = (distFromCenter / maxDist) * 16;

            if (mode === 'liberation') {
                // Bangladesh: Smooth magnetic convergence from soft radial envelope
                const angle = Math.atan2(this.targetY - midY, this.targetX - midX) + (Math.random() - 0.5) * 0.5;
                const distance = 60 + Math.random() * 150;
                this.x = this.targetX + Math.cos(angle) * distance;
                this.y = this.targetY + Math.sin(angle) * distance;
                this.vx = (Math.random() - 0.5) * 3;
                this.vy = (Math.random() - 0.5) * 3;
            } else if (mode === 'ideology') {
                // Liberty vs Revolution: Silky smooth cascade from opposing wings
                const side = this.targetX < midX ? -1 : 1;
                this.x = this.targetX + side * (50 + Math.random() * 140);
                this.y = this.targetY + (Math.random() - 0.5) * 70;
                this.vx = -side * (2 + Math.random() * 3);
                this.vy = (Math.random() - 0.5) * 2.5;
            } else if (mode === 'geopolitics') {
                // Modern Geopolitics: Gentle harmonic orbital descent
                const angle = (this.index / total) * Math.PI * 4;
                const distance = 50 + Math.random() * 130;
                this.x = this.targetX + Math.cos(angle) * distance;
                this.y = this.targetY + Math.sin(angle) * distance * 0.5;
                this.vx = (Math.random() - 0.5) * 2.5;
                this.vy = (Math.random() - 0.5) * 2.5;
            } else {
                // The Football Debate: Gentle stadium upward drift
                this.x = this.targetX + (Math.random() - 0.5) * 80;
                this.y = this.targetY + (30 + Math.random() * 120);
                this.vx = (Math.random() - 0.5) * 2.5;
                this.vy = -(2 + Math.random() * 4);
            }
        }

        update(time, mouseX, mouseY) {
            this.elapsed++;
            if (this.elapsed < this.delay) {
                return;
            }

            if (this.alpha < 1) {
                this.alpha += 0.05;
                if (this.alpha > 1) this.alpha = 1;
            }

            // Smooth soothing mouse repulsion
            if (mouseX !== -2000) {
                const mdx = this.x - mouseX;
                const mdy = this.y - mouseY;
                if (Math.abs(mdx) < 95 && Math.abs(mdy) < 95) {
                    const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
                    const repelRadius = 95;

                    if (mdist < repelRadius && mdist > 0.01) {
                        const force = (1 - mdist / repelRadius) * 11;
                        this.vx += (mdx / mdist) * force;
                        this.vy += (mdy / mdist) * force;
                        this.isLocked = false;
                    }
                }
            }

            // Spring force towards target
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < 0.6 && Math.abs(this.vx) < 0.25 && Math.abs(this.vy) < 0.25) {
                this.isLocked = true;
                // Gentle soothing micro-breathing when settled
                this.x = this.targetX + Math.sin(time * 1.4 + this.wavePhase) * 0.3;
                this.y = this.targetY + Math.cos(time * 1.1 + this.wavePhase) * 0.3;
                this.vx = 0;
                this.vy = 0;
            } else {
                this.isLocked = false;
                const spring = 0.075;   // Softer, buttery magnetic attraction
                const friction = 0.86;  // Gentle, silky smooth damping

                this.vx += dx * spring;
                this.vy += dy * spring;
                this.vx *= friction;
                this.vy *= friction;

                this.x += this.vx;
                this.y += this.vy;
            }
        }

        draw(ctx) {
            if (this.alpha <= 0.01) return;
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.alpha;
            ctx.fillRect(this.x, this.y, this.size, this.size);
        }

        explode() {
            this.vx = (Math.random() - 0.5) * 35;
            this.vy = (Math.random() - 0.5) * 35;
            this.isLocked = false;
        }
    }

    class ShockwaveRing {
        constructor(cx, cy, maxRadius, colors) {
            this.cx = cx;
            this.cy = cy;
            this.radius = 10;
            this.maxRadius = maxRadius || 500;
            this.alpha = 0.95;
            this.speed = 18;
            this.colors = colors || ['rgba(255, 255, 255, 0.9)', 'rgba(255, 200, 0, 0.7)'];
        }

        update() {
            this.radius += this.speed;
            this.alpha = (1 - this.radius / this.maxRadius) * 0.95;
        }

        draw(ctx) {
            if (this.alpha <= 0.01) return;
            ctx.save();
            ctx.strokeStyle = this.colors[0].replace('0.9', this.alpha.toFixed(3));
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.cx, this.cy, this.radius, 0, Math.PI * 2);
            ctx.stroke();

            if (this.colors[1]) {
                ctx.strokeStyle = this.colors[1].replace('0.7', (this.alpha * 0.75).toFixed(3));
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.cx, this.cy, Math.max(0, this.radius - 22), 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    class AmbientSpark {
        constructor(w, h, colorPalette) {
            this.w = w;
            this.h = h;
            this.palette = colorPalette;
            this.reset();
        }

        reset() {
            this.x = Math.random() * this.w;
            this.y = this.h + 20;
            this.vx = (Math.random() - 0.5) * 1.5;
            this.vy = -(1.2 + Math.random() * 2.8);
            this.size = 1.5 + Math.random() * 2.5;
            this.color = this.palette[Math.floor(Math.random() * this.palette.length)];
            this.alpha = 0.3 + Math.random() * 0.7;
            this.decay = 0.006 + Math.random() * 0.01;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.alpha -= this.decay;
            if (this.alpha <= 0 || this.y < -30) {
                this.reset();
            }
        }

        draw(ctx) {
            if (this.alpha <= 0.01) return;
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 6;
            ctx.shadowColor = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // --------------------------------------------------------------------------
    // MAIN DEBATE TOPIC PIXEL ENGINE
    // --------------------------------------------------------------------------
    class DebateTopicPixelEngine {
        constructor(canvasId, containerId) {
            this.canvas = document.getElementById(canvasId);
            this.container = document.getElementById(containerId);
            if (!this.canvas || !this.container) return;

            this.ctx = this.canvas.getContext('2d');
            this.currentIndex = 0;
            this.particles = [];
            this.shockwaves = [];
            this.ambientSparks = [];
            this.mouse = { x: -2000, y: -2000 };
            this.isAutoPlaying = true;
            this.cycleDuration = 9000; // 9 seconds per topic
            this.timerStartTime = Date.now();
            this.cachedImages = {};
            this.pixelSize = 3;
            this.animTime = 0;
            this.isVisible = true;

            this.initObserver();
            this.initDOM();
            this.preloadImages();
            this.bindEvents();
            this.loadTopic(0, false);
            this.startLoop();
        }

        initObserver() {
            if ('IntersectionObserver' in window) {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        this.isVisible = entry.isIntersecting;
                    });
                }, { threshold: 0.02 });
                observer.observe(this.container);
            }
        }

        initDOM() {
            this.uiNumber = document.getElementById('debate-topic-num');
            this.uiBadge = document.getElementById('debate-topic-badge');
            this.uiTitle = document.getElementById('debate-topic-title');
            this.uiEnglishTitle = document.getElementById('debate-topic-eng');
            this.uiCaption = document.getElementById('debate-topic-caption');
            this.uiQuote = document.getElementById('debate-topic-quote');
            this.uiProgressBar = document.getElementById('debate-cycle-progress');
            this.uiPills = document.querySelectorAll('.debate-topic-pill');
            this.uiPlayBtn = document.getElementById('debate-btn-play');
            this.uiSoundBtn = document.getElementById('debate-btn-sound');
        }

        preloadImages() {
            TOPICS.forEach((topic, idx) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = topic.imageSrc;
                this.cachedImages[idx] = img;
            });
        }

        resizeCanvas(img) {
            const containerW = this.container.clientWidth || window.innerWidth;
            const maxW = containerW; // Horizontally full width edge-to-edge
            const ratio = (img && img.naturalWidth && img.naturalHeight) 
                ? (img.naturalWidth / img.naturalHeight) 
                : (16 / 9);

            this.canvas.width = Math.floor(maxW);
            this.canvas.height = Math.floor(maxW / ratio);

            // True Pixel Art Resolution: 2px on mobile (1.5-2) and 3.5px on PC (3-3.5)
            this.pixelSize = window.innerWidth < 768 ? 2 : 3.5;
        }

        buildMesh(img, spawnMode) {
            const w = this.canvas.width;
            const h = this.canvas.height;
            const step = this.pixelSize;

            // 1. Create true low-res pixel grid
            const lowW = Math.max(1, Math.floor(w / step));
            const lowH = Math.max(1, Math.floor(h / step));

            const lowCanvas = document.createElement('canvas');
            lowCanvas.width = lowW;
            lowCanvas.height = lowH;
            const lowCtx = lowCanvas.getContext('2d');
            lowCtx.drawImage(img, 0, 0, lowW, lowH);

            let imgData;
            try {
                imgData = lowCtx.getImageData(0, 0, lowW, lowH);
            } catch (e) {
                console.warn('Could not read image data:', e);
                return;
            }

            // 2. Create permanent pixel art mosaic buffer (imageSmoothingEnabled = false)
            this.pixelArtCanvas = document.createElement('canvas');
            this.pixelArtCanvas.width = w;
            this.pixelArtCanvas.height = h;
            const pCtx = this.pixelArtCanvas.getContext('2d');
            pCtx.imageSmoothingEnabled = false;
            pCtx.mozImageSmoothingEnabled = false;
            pCtx.webkitImageSmoothingEnabled = false;
            pCtx.msImageSmoothingEnabled = false;
            pCtx.drawImage(lowCanvas, 0, 0, w, h);

            // 3. Build particles matching each pixel art block (crisp tactile pixel tiles)
            const data = imgData.data;
            this.particles = [];
            const particleSize = Math.max(1, step - 0.25);
            let count = 0;
            const total = lowW * lowH;

            for (let py = 0; py < lowH; py++) {
                for (let px = 0; px < lowW; px++) {
                    const idx = (py * lowW + px) * 4;
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    const a = data[idx + 3] / 255;

                    if (a > 0.06) {
                        const targetX = px * step;
                        const targetY = py * step;
                        this.particles.push(
                            new TopicParticle(targetX, targetY, r, g, b, a, particleSize, count, total, spawnMode, w, h)
                        );
                        count++;
                    }
                }
            }

            // Init ambient sparks
            this.ambientSparks = [];
            const topic = TOPICS[this.currentIndex];
            for (let i = 0; i < 20; i++) {
                this.ambientSparks.push(new AmbientSpark(w, h, topic.sparks));
            }
        }

        loadTopic(index, triggerSound = true) {
            if (index < 0) index = TOPICS.length - 1;
            if (index >= TOPICS.length) index = 0;

            this.currentIndex = index;
            this.timerStartTime = Date.now();
            const topic = TOPICS[index];
            this.cycleDuration = topic.duration || 9000;

            // Update UI elements (safe null guards)
            if (this.uiNumber) this.uiNumber.innerText = topic.number;
            if (this.uiBadge) {
                this.uiBadge.innerHTML = `<span class="mr-1.5">${topic.flag}</span> ${topic.badge}`;
                this.uiBadge.style.borderColor = topic.accentColor;
                this.uiBadge.style.color = '#111827';
            }
            if (this.uiTitle) {
                this.uiTitle.innerText = topic.title;
            }
            if (this.uiEnglishTitle) {
                this.uiEnglishTitle.innerText = topic.englishTitle;
            }
            if (this.uiCaption) {
                this.uiCaption.innerText = topic.humorCaption;
            }
            if (this.uiQuote) {
                this.uiQuote.innerText = topic.quote;
            }

            if (this.uiPills && this.uiPills.length > 0) {
                this.uiPills.forEach((pill, i) => {
                    if (i === index) {
                        pill.classList.add('active-topic-pill');
                        pill.style.borderColor = '#dc2626';
                        pill.style.color = '#dc2626';
                        pill.style.backgroundColor = '#fef2f2';
                        pill.style.boxShadow = '0 4px 14px rgba(220, 38, 38, 0.15)';
                    } else {
                        pill.classList.remove('active-topic-pill');
                        pill.style.borderColor = '#e5e7eb';
                        pill.style.color = '#374151';
                        pill.style.backgroundColor = '#ffffff';
                        pill.style.boxShadow = 'none';
                    }
                });
            }

            // Load and build mesh
            let img = this.cachedImages[index];
            const onImageReady = (readyImg) => {
                this.resizeCanvas(readyImg);
                this.buildMesh(readyImg, topic.spawnMode);
                if (triggerSound) {
                    playTopicSound(topic.soundType);
                }
                // Trigger an initial central shockwave ring
                const maxDim = Math.max(this.canvas.width, this.canvas.height);
                this.shockwaves.push(
                    new ShockwaveRing(this.canvas.width * 0.5, this.canvas.height * 0.5, maxDim * 0.85, topic.ringColors)
                );
            };

            if (img && img.complete && img.naturalWidth > 0) {
                onImageReady(img);
            } else {
                const fallbackImg = new Image();
                fallbackImg.crossOrigin = 'anonymous';
                fallbackImg.onload = () => onImageReady(fallbackImg);
                fallbackImg.src = topic.imageSrc;
                this.cachedImages[index] = fallbackImg;
            }
        }

        nextTopic(manual = false) {
            if (manual) {
                this.isAutoPlaying = false;
                this.updatePlayStateUI();
            }
            this.loadTopic(this.currentIndex + 1, true);
        }

        prevTopic(manual = false) {
            if (manual) {
                this.isAutoPlaying = false;
                this.updatePlayStateUI();
            }
            this.loadTopic(this.currentIndex - 1, true);
        }

        togglePlay() {
            this.isAutoPlaying = !this.isAutoPlaying;
            this.timerStartTime = Date.now();
            this.updatePlayStateUI();
        }

        updatePlayStateUI() {
            if (!this.uiPlayBtn) return;
            if (this.isAutoPlaying) {
                this.uiPlayBtn.innerHTML = `
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span class="hidden sm:inline">Pause Cycle</span>
                `;
            } else {
                this.uiPlayBtn.innerHTML = `
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span class="hidden sm:inline">Play Cycle</span>
                `;
            }
        }

        toggleSound() {
            soundEnabled = !soundEnabled;
            if (soundEnabled) {
                getAudioContext();
            }
            if (this.uiSoundBtn) {
                this.uiSoundBtn.innerHTML = soundEnabled 
                    ? `<svg class="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>`
                    : `<svg class="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"></path></svg>`;
            }
        }

        triggerShockwaveAt(clickX, clickY) {
            const topic = TOPICS[this.currentIndex];
            playTopicSound(topic.soundType);

            const maxDim = Math.max(this.canvas.width, this.canvas.height);
            this.shockwaves.push(
                new ShockwaveRing(clickX, clickY, maxDim * 0.85, topic.ringColors)
            );

            // Scatter nearby particles
            this.particles.forEach((p) => {
                const dx = p.x - clickX;
                const dy = p.y - clickY;
                if (Math.abs(dx) < 160 && Math.abs(dy) < 160) {
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 160 && dist > 0.01) {
                        const force = (1 - dist / 160) * 38;
                        p.vx += (dx / dist) * force;
                        p.vy += (dy / dist) * force;
                        p.isLocked = false;
                    }
                }
            });
        }

        bindEvents() {
            // Mouse Interaction
            this.canvas.addEventListener('mousemove', (e) => {
                const rect = this.canvas.getBoundingClientRect();
                this.mouse.x = e.clientX - rect.left;
                this.mouse.y = e.clientY - rect.top;
            });

            this.canvas.addEventListener('mouseleave', () => {
                this.mouse.x = -2000;
                this.mouse.y = -2000;
            });

            this.canvas.addEventListener('click', (e) => {
                const rect = this.canvas.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;
                this.triggerShockwaveAt(clickX, clickY);
            });

            // Touch interaction
            this.canvas.addEventListener('touchstart', (e) => {
                if (e.touches.length > 0) {
                    const rect = this.canvas.getBoundingClientRect();
                    const touchX = e.touches[0].clientX - rect.left;
                    const touchY = e.touches[0].clientY - rect.top;
                    this.triggerShockwaveAt(touchX, touchY);
                }
            }, { passive: true });

            // Topic Pill Clicks
            if (this.uiPills && this.uiPills.length > 0) {
                this.uiPills.forEach((pill, idx) => {
                    pill.addEventListener('click', () => {
                        this.isAutoPlaying = false;
                        this.updatePlayStateUI();
                        this.loadTopic(idx, true);
                    });
                });
            }

            // Controls (safe null checks)
            const nextBtn = document.getElementById('debate-btn-next');
            const prevBtn = document.getElementById('debate-btn-prev');
            if (nextBtn) nextBtn.addEventListener('click', () => this.nextTopic(true));
            if (prevBtn) prevBtn.addEventListener('click', () => this.prevTopic(true));
            if (this.uiPlayBtn) this.uiPlayBtn.addEventListener('click', () => this.togglePlay());
            if (this.uiSoundBtn) this.uiSoundBtn.addEventListener('click', () => this.toggleSound());

            const explodeBtn = document.getElementById('debate-btn-explode');
            if (explodeBtn) {
                explodeBtn.addEventListener('click', () => {
                    const topic = TOPICS[this.currentIndex];
                    playTopicSound(topic.soundType);
                    this.particles.forEach(p => p.explode());
                    const maxDim = Math.max(this.canvas.width, this.canvas.height);
                    this.shockwaves.push(
                        new ShockwaveRing(this.canvas.width * 0.5, this.canvas.height * 0.5, maxDim, topic.ringColors)
                    );
                });
            }

            // Window resize
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    const img = this.cachedImages[this.currentIndex];
                    if (img && img.naturalWidth > 0) {
                        this.resizeCanvas(img);
                        this.buildMesh(img, TOPICS[this.currentIndex].spawnMode);
                    }
                }, 200);
            });
        }

        startLoop() {
            const render = () => {
                requestAnimationFrame(render);

                // Viewport Culling: 0% CPU usage when scrolled anywhere else on the page!
                if (!this.isVisible) {
                    return;
                }

                this.animTime += 0.015;

                // Handle auto cycle progress
                if (this.isAutoPlaying) {
                    const elapsed = Date.now() - this.timerStartTime;
                    if (this.uiProgressBar) {
                        const progress = Math.min(100, (elapsed / this.cycleDuration) * 100);
                        this.uiProgressBar.style.width = `${progress}%`;
                    }
                    if (elapsed >= this.cycleDuration) {
                        this.nextTopic(false);
                    }
                } else {
                    if (this.uiProgressBar) {
                        this.uiProgressBar.style.width = '0%';
                    }
                }

                // Render Canvas with pure white background
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

                // Update & draw living pixel mosaic tiles (organic soothing breathing)
                for (let i = 0; i < this.particles.length; i++) {
                    const p = this.particles[i];
                    p.update(this.animTime, this.mouse.x, this.mouse.y);
                    p.draw(this.ctx);
                }

                this.ctx.globalAlpha = 1.0;

                // Update & draw shockwaves
                for (let i = this.shockwaves.length - 1; i >= 0; i--) {
                    const ring = this.shockwaves[i];
                    ring.update();
                    ring.draw(this.ctx);
                    if (ring.alpha <= 0.01) {
                        this.shockwaves.splice(i, 1);
                    }
                }

                // Update & draw ambient sparks
                for (let i = 0; i < this.ambientSparks.length; i++) {
                    this.ambientSparks[i].update();
                    this.ambientSparks[i].draw(this.ctx);
                }
            };
            requestAnimationFrame(render);
        }
    }

    // Expose engine to global window
    window.DebateTopicPixelEngine = DebateTopicPixelEngine;

    // Auto initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('debatePixelCanvas')) {
            window.pcdfDebateEngine = new DebateTopicPixelEngine(
                'debatePixelCanvas',
                'debateCanvasContainer'
            );
        }
    });
})();
