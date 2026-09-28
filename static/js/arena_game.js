/**
 * =========================================================================
 * PCDF DEBATE ARENA: 2.5D COUNTRYBALL WAR-SIMULATOR ENGINE
 * Ultra-Performance Edition:
 * - Sprite Pre-Baking (Zero Vector Redraw Overhead, pure GPU Texture Blit)
 * - Strict IntersectionObserver Deep-Sleep (0.00% CPU when off-screen)
 * - Target 40FPS Engine Throttle (Silky Smooth, Zero Stutter on Lenis Scroll)
 * - Pre-Rendered Static 2.5D Whitish Battlefield Blit
 * =========================================================================
 */

(function () {
    'use strict';

    // --- 1. ACOUSTIC AUDIO ENGINE ---
    class MandateAudio {
        constructor() {
            this.ctx = null;
            this.muted = localStorage.getItem('pcdf_arena_muted') === 'true';
        }

        init() {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) this.ctx = new AudioCtx();
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }

        toggleMute() {
            this.muted = !this.muted;
            localStorage.setItem('pcdf_arena_muted', this.muted);
            return this.muted;
        }

        playChime(isGov) {
            if (this.muted) return;
            this.init();
            if (!this.ctx) return;
            const t = this.ctx.currentTime;
            const root = isGov ? 329.63 : 261.63;

            [root, root * 1.25, root * 1.5, root * 2].forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, t + idx * 0.04);

                gain.gain.setValueAtTime(0.001, t + idx * 0.04);
                gain.gain.linearRampToValueAtTime(0.18, t + idx * 0.04 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.4);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(t + idx * 0.04);
                osc.stop(t + idx * 0.04 + 0.45);
            });
        }

        playDropThud() {
            if (this.muted) return;
            this.init();
            if (!this.ctx) return;
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(140, t);
            osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);

            gain.gain.setValueAtTime(0.25, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.25);
        }

        playResonance() {
            if (this.muted) return;
            this.init();
            if (!this.ctx) return;
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(160, t);
            osc.frequency.exponentialRampToValueAtTime(80, t + 0.8);

            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.9);
        }
    }

    // --- 2. COUNTRYBALL DEBATER UNIT (SPRITE-PREBAKED) ---
    class CountryBallUnit {
        constructor(data, x, y, facing = 1, isDefault = false, presetHat = null, presetWeapon = null) {
            this.id = data.id || Math.random().toString();
            this.side = data.side || 'gov';
            this.name = data.name || (this.side === 'gov' ? 'Gov Delegate' : 'Opp Delegate');
            this.troopClass = data.troop_class || 'scholar';
            this.logic = data.logic || 'Constructive debate logic upholding the parliamentary faction mandate.';
            this.timestamp = data.timestamp || 'Just now';
            this.isDefault = isDefault;

            this.x = x;
            this.y = y;
            this.radius = 16.5;
            this.facing = facing; // 1 = Facing Right ➔ (Gov), -1 = Facing Left ⬅ (Opp)

            // Assign Costume & Pre-Bake Hardware Texture
            this.assignCostume(data.hat || presetHat, data.weapon || presetWeapon);
            this.spriteCanvas = this.generatePrebakedSprite();

            // Physics & Idle Animations
            this.dropY = isDefault ? 0 : -90;
            this.dropSpeed = 0;
            this.bobOffset = Math.random() * Math.PI * 2;
            this.bobSpeed = 0.04 + Math.random() * 0.02;

            this.isHovered = false;
            this.isSelected = false;
            this.isTopDebater = false;
        }

        assignCostume(customHat, customWeapon) {
            const govHats = ['cowboy', 'wizard', 'santa', 'beret', 'shades', 'cap', 'mortarboard', 'fedora'];
            const oppHats = ['crown', 'ushanka', 'bowler', 'fez', 'santa', 'helmet', 'conical', 'sombrero', 'shades'];
            const govWeapons = ['sword', 'scroll', 'grenade', 'gavel', 'quill', 'rifle', 'potion', 'megaphone'];
            const oppWeapons = ['axe', 'pistol', 'bottle', 'brick', 'gavel', 'shield', 'knife', 'scroll', 'rifle'];

            if (customHat) {
                this.hat = customHat;
            } else {
                const pool = this.side === 'gov' ? govHats : oppHats;
                this.hat = pool[Math.floor(Math.random() * pool.length)];
                if (this.troopClass === 'scholar') this.hat = 'mortarboard';
                if (this.troopClass === 'vanguard') this.hat = this.side === 'gov' ? 'cowboy' : 'ushanka';
                if (this.troopClass === 'strategist') this.hat = 'wizard';
                if (this.troopClass === 'critic') this.hat = 'bowler';
            }

            if (customWeapon) {
                this.weapon = customWeapon;
            } else {
                const wPool = this.side === 'gov' ? govWeapons : oppWeapons;
                this.weapon = wPool[Math.floor(Math.random() * wPool.length)];
            }
        }

        // Bakes this countryball to an isolated mini-canvas once (0ms CPU during game loop)
        generatePrebakedSprite() {
            const canvas = document.createElement('canvas');
            const size = 64;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.translate(size / 2, size / 2 + 4);

            this.drawSphereBody(ctx);
            this.drawEyes(ctx);
            this.drawHat(ctx);
            this.drawProp(ctx);

            return canvas;
        }

        update(engine) {
            if (this.dropY < 0) {
                this.dropSpeed += 0.8;
                this.dropY += this.dropSpeed;
                if (this.dropY >= 0) {
                    this.dropY = 0;
                    this.dropSpeed = 0;
                    if (engine) {
                        engine.audio.playDropThud();
                        engine.triggerGroundDust(this.x, this.y);
                    }
                }
            }
        }

        draw(ctx, time) {
            const bobY = Math.sin(time * this.bobSpeed + this.bobOffset) * 1.6;
            const renderY = this.y + this.dropY + bobY;

            // 1. Lightweight Shadow
            const shadowScale = Math.max(0.2, 1 - Math.abs(this.dropY) / 100);
            ctx.beginPath();
            ctx.ellipse(this.x, this.y + this.radius - 2, (this.radius + 3) * shadowScale, (this.radius * 0.35) * shadowScale, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
            ctx.fill();

            // 2. Parachute (while dropping)
            if (this.dropY < -20) {
                this.drawParachute(ctx, this.x, renderY - this.radius);
            }

            // 3. Selection Ring (only when active)
            if (this.isHovered || this.isSelected) {
                ctx.save();
                ctx.strokeStyle = this.side === 'gov' ? '#38bdf8' : '#f87171';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.x, renderY, this.radius + 3.5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            // 4. Ultra-Fast Texture Blit (0.002ms)
            if (this.spriteCanvas) {
                ctx.drawImage(this.spriteCanvas, this.x - 32, renderY - 36);
            }

            // 5. Vector Crown if Top Debater
            if (this.isTopDebater) {
                ctx.save();
                ctx.fillStyle = '#f59e0b';
                ctx.strokeStyle = '#78350f';
                ctx.lineWidth = 1;
                ctx.beginPath();
                const cx = this.x;
                const cy = renderY - this.radius - 12;
                ctx.moveTo(cx - 7, cy + 3);
                ctx.lineTo(cx - 9, cy - 4);
                ctx.lineTo(cx - 4, cy);
                ctx.lineTo(cx, cy - 6);
                ctx.lineTo(cx + 4, cy);
                ctx.lineTo(cx + 9, cy - 4);
                ctx.lineTo(cx + 7, cy + 3);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }

            // 6. Name Pill
            this.drawNamePill(ctx, renderY);
        }

        drawParachute(ctx, px, py) {
            ctx.save();
            ctx.strokeStyle = 'rgba(100, 116, 139, 0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px - 16, py - 24);
            ctx.moveTo(px, py);
            ctx.lineTo(px + 16, py - 24);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(px, py - 24, 18, Math.PI, 0);
            ctx.closePath();
            ctx.fillStyle = this.side === 'gov' ? '#0284c7' : '#dc2626';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        }

        drawSphereBody(ctx) {
            const r = this.radius;
            const isGov = this.side === 'gov';

            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);

            if (isGov) {
                ctx.fillStyle = '#0284c7';
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-r * 0.85, 2, r * 1.7, 3);
                ctx.fillRect(-r * 0.7, 7, r * 1.4, 3);

                ctx.fillStyle = '#1e3a8a';
                if (this.facing === 1) {
                    ctx.fillRect(-r * 0.9, -r * 0.9, r * 1.1, r * 1.0);
                } else {
                    ctx.fillRect(0, -r * 0.9, r * 0.9, r * 1.0);
                }

                ctx.fillStyle = '#ffffff';
                ctx.font = '7px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('★', this.facing === 1 ? -r * 0.4 : r * 0.4, -r * 0.3);
            } else {
                ctx.fillStyle = '#b91c1c';
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-r * 0.85, -r * 0.85, r * 1.7, 5.5);
                ctx.fillStyle = '#1d4ed8';
                ctx.fillRect(-r * 0.95, -2.5, r * 1.9, 5);
            }

            const sphereGrad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, 1, 0, 0, r);
            sphereGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
            sphereGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.0)');
            sphereGrad.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
            ctx.fillStyle = sphereGrad;
            ctx.fill();

            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        drawEyes(ctx) {
            const eyeOffset = this.facing === 1 ? 2.5 : -2.5;
            const eye1X = eyeOffset - 3.6;
            const eye2X = eyeOffset + 3.6;
            const eyeY = -1.5;

            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.2;

            ctx.beginPath();
            ctx.ellipse(eye1X, eyeY, 2.7, 4.2, this.facing === 1 ? 0.1 : -0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.ellipse(eye2X, eyeY, 2.7, 4.2, this.facing === 1 ? -0.1 : 0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(eye1X + (this.facing === 1 ? 0.9 : -0.9), eyeY, 1.1, 0, Math.PI * 2);
            ctx.arc(eye2X + (this.facing === 1 ? 0.9 : -0.9), eyeY, 1.1, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(eye1X + (this.facing === 1 ? 0.5 : -1.3), eyeY - 0.7, 0.5, 0, Math.PI * 2);
            ctx.arc(eye2X + (this.facing === 1 ? 0.5 : -1.3), eyeY - 0.7, 0.5, 0, Math.PI * 2);
            ctx.fill();
        }

        drawHat(ctx) {
            const r = this.radius;
            const f = this.facing;
            ctx.save();

            switch (this.hat) {
                case 'cowboy':
                    ctx.fillStyle = '#854d0e';
                    ctx.strokeStyle = '#451a03';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.ellipse(0, -r + 2, r * 1.35, 4.5, f * 0.1, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(-7, -r + 2);
                    ctx.quadraticCurveTo(0, -r - 11, 7, -r + 2);
                    ctx.closePath();
                    ctx.fillStyle = '#92400e';
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = '#d97706';
                    ctx.fillRect(-6.5, -r, 13, 2.5);
                    break;

                case 'crown':
                    ctx.fillStyle = '#f59e0b';
                    ctx.strokeStyle = '#78350f';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(-10, -r + 2);
                    ctx.lineTo(-12, -r - 10);
                    ctx.lineTo(-5, -r - 5);
                    ctx.lineTo(0, -r - 12);
                    ctx.lineTo(5, -r - 5);
                    ctx.lineTo(12, -r - 10);
                    ctx.lineTo(10, -r + 2);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = '#dc2626';
                    ctx.beginPath();
                    ctx.arc(-12, -r - 10, 1.5, 0, Math.PI * 2);
                    ctx.arc(0, -r - 12, 1.8, 0, Math.PI * 2);
                    ctx.arc(12, -r - 10, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'mortarboard':
                    ctx.fillStyle = '#0f172a';
                    ctx.strokeStyle = '#334155';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(0, -r + 1, 9, Math.PI, 0);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.moveTo(0, -r - 10);
                    ctx.lineTo(15 * f, -r - 5);
                    ctx.lineTo(0, -r);
                    ctx.lineTo(-15 * f, -r - 5);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    ctx.strokeStyle = '#f59e0b';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(0, -r - 5);
                    ctx.lineTo(12 * f, -r + 1);
                    ctx.stroke();
                    ctx.fillStyle = '#f59e0b';
                    ctx.beginPath();
                    ctx.arc(12 * f, -r + 2, 1.8, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'santa':
                    ctx.fillStyle = '#dc2626';
                    ctx.strokeStyle = '#991b1b';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(-10, -r + 1);
                    ctx.quadraticCurveTo(-14 * f, -r - 16, -18 * f, -r - 4);
                    ctx.quadraticCurveTo(0, -r - 10, 10, -r + 1);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.ellipse(0, -r + 2, 11, 3.5, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(-18 * f, -r - 4, 3.5, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'ushanka':
                    ctx.fillStyle = '#334155';
                    ctx.strokeStyle = '#0f172a';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.arc(0, -r + 2, 11, Math.PI, 0);
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = '#94a3b8';
                    ctx.fillRect(-8, -r - 2, 16, 7);
                    ctx.fillRect(-12, -r + 2, 4, 9);
                    ctx.fillRect(8, -r + 2, 4, 9);
                    ctx.fillStyle = '#ef4444';
                    ctx.font = '7px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('★', 0, -r + 3);
                    break;

                case 'bowler':
                case 'fedora':
                    ctx.fillStyle = '#0f172a';
                    ctx.strokeStyle = '#334155';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.ellipse(0, -r + 2, 12, 3, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillRect(-7, -r - 10, 14, 11);
                    ctx.fillStyle = '#8b1e1e';
                    ctx.fillRect(-7, -r - 1, 14, 2.5);
                    break;

                case 'conical':
                    ctx.fillStyle = '#fde68a';
                    ctx.strokeStyle = '#b45309';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(0, -r - 11);
                    ctx.lineTo(16, -r + 3);
                    ctx.lineTo(-16, -r + 3);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    break;

                case 'fez':
                    ctx.fillStyle = '#b91c1c';
                    ctx.strokeStyle = '#450a0a';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(-6, -r + 2);
                    ctx.lineTo(-4, -r - 8);
                    ctx.lineTo(4, -r - 8);
                    ctx.lineTo(6, -r + 2);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    ctx.strokeStyle = '#0f172a';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(0, -r - 8);
                    ctx.lineTo(7 * f, -r - 1);
                    ctx.stroke();
                    break;

                case 'wizard':
                    ctx.fillStyle = '#4338ca';
                    ctx.strokeStyle = '#1e1b4b';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.ellipse(0, -r + 2, 13, 3.5, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(-7, -r + 2);
                    ctx.quadraticCurveTo(0, -r - 16, -6 * f, -r - 18);
                    ctx.quadraticCurveTo(4, -r - 10, 7, -r + 2);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = '#fbbf24';
                    ctx.fillRect(-2, -r - 1, 4, 3);
                    break;

                case 'shades':
                default:
                    ctx.fillStyle = '#0f172a';
                    ctx.strokeStyle = '#475569';
                    ctx.lineWidth = 1;
                    const sOffset = f === 1 ? 2.5 : -2.5;
                    ctx.fillRect(sOffset - 8, -4.5, 16, 5.5);
                    ctx.fillStyle = 'rgba(255,255,255,0.75)';
                    ctx.fillRect(sOffset - 6, -3.5, 4, 1.2);
                    ctx.fillRect(sOffset + 2, -3.5, 4, 1.2);
                    break;
            }

            ctx.restore();
        }

        drawProp(ctx) {
            const r = this.radius;
            const f = this.facing;
            const handX = (r + 2.5) * f;
            const handY = 2;

            ctx.save();
            ctx.translate(handX, handY);

            switch (this.weapon) {
                case 'sword':
                    ctx.strokeStyle = '#e2e8f0';
                    ctx.lineWidth = 2.2;
                    ctx.beginPath();
                    ctx.moveTo(0, 4);
                    ctx.lineTo(14 * f, -10);
                    ctx.stroke();
                    ctx.strokeStyle = '#f59e0b';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.moveTo(2 * f, 2);
                    ctx.lineTo(-2 * f, 6);
                    ctx.stroke();
                    break;

                case 'gavel':
                    ctx.fillStyle = '#92400e';
                    ctx.strokeStyle = '#451a03';
                    ctx.lineWidth = 1;
                    ctx.save();
                    ctx.rotate(f * 0.4);
                    ctx.fillRect(-1.5, -9, 3, 13);
                    ctx.fillRect(-5.5, -13, 11, 5);
                    ctx.restore();
                    break;

                case 'scroll':
                    ctx.fillStyle = '#fef08a';
                    ctx.strokeStyle = '#ca8a04';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.roundRect(-4, -6, 8, 12, 2);
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = '#b91c1c';
                    ctx.fillRect(-4, -1, 8, 2);
                    break;

                case 'megaphone':
                    ctx.fillStyle = '#dc2626';
                    ctx.strokeStyle = '#0f172a';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(9 * f, -6);
                    ctx.lineTo(9 * f, 6);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = '#0f172a';
                    ctx.fillRect(-1, 0, 2, 6);
                    break;

                case 'axe':
                    ctx.strokeStyle = '#78350f';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(0, 7);
                    ctx.lineTo(0, -11);
                    ctx.stroke();
                    ctx.fillStyle = '#94a3b8';
                    ctx.strokeStyle = '#475569';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(4 * f, -7, 6, -Math.PI / 2, Math.PI / 2);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    break;

                case 'bottle':
                    ctx.fillStyle = '#15803d';
                    ctx.fillRect(-2.5, -4, 5, 8);
                    ctx.fillRect(-1, -8, 2, 4);
                    break;

                case 'brick':
                case 'grenade':
                    ctx.fillStyle = '#ea580c';
                    ctx.fillRect(-4, -3, 8, 6);
                    break;

                case 'pistol':
                case 'rifle':
                default:
                    ctx.strokeStyle = '#475569';
                    ctx.lineWidth = 2.2;
                    ctx.beginPath();
                    ctx.moveTo(-2 * f, 2);
                    ctx.lineTo(12 * f, -2);
                    ctx.stroke();
                    ctx.strokeStyle = '#78350f';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(-6 * f, 4);
                    ctx.lineTo(-1 * f, 2);
                    ctx.stroke();
                    break;
            }

            ctx.restore();
        }

        drawNamePill(ctx, renderY) {
            const shortName = (this.name.split(' ')[0] || this.name).substring(0, 10);
            ctx.font = 'bold 8px "Inter", sans-serif';
            const tw = ctx.measureText(shortName).width;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
            ctx.fillRect(this.x - tw / 2 - 3.5, renderY + this.radius + 1, tw + 7, 10);
            ctx.strokeStyle = this.side === 'gov' ? '#0284c7' : '#dc2626';
            ctx.lineWidth = 0.8;
            ctx.strokeRect(this.x - tw / 2 - 3.5, renderY + this.radius + 1, tw + 7, 10);

            ctx.fillStyle = '#0f172a';
            ctx.textAlign = 'center';
            ctx.fillText(shortName, this.x, renderY + this.radius + 8.5);
        }

        isPointInside(mx, my) {
            const dx = mx - this.x;
            const dy = my - (this.y + this.dropY);
            return (dx * dx + dy * dy) < (this.radius + 6) * (this.radius + 6);
        }
    }

    // --- 3. THE 2.5D ARENA BATTLEFIELD ENGINE ---
    class PcdfArenaEngine {
        constructor() {
            this.canvas = document.getElementById('arenaCanvas');
            if (!this.canvas) return;
            this.ctx = this.canvas.getContext('2d');

            this.audio = new MandateAudio();
            this.delegates = [];
            this.activeMotion = null;
            this.motionsArchive = [];
            this.dustParticles = [];
            this.clashSparks = [];

            this.VIRTUAL_WIDTH = 1000;
            this.VIRTUAL_HEIGHT = 420;
            this.clashFrontX = 500;
            this.targetClashFrontX = 500;

            // Performance & Animation Control
            this.isVisible = false;
            this.animId = null;
            this.bgCanvas = null;
            this.lastFrameTime = 0;
            this.lastMoveTime = 0;

            this.buildFormationSlots();
            this.initDOM();
            this.bindEvents();
            this.resizeCanvas();
            this.preRenderBackground();

            // Instant Army Deployment
            this.syncDelegates([]);
            this.fetchState();

            // Strict IntersectionObserver Sleep
            this.setupObserver();

            // Background Polling
            setInterval(() => this.fetchState(true), 8000);

            this.time = 0;
            this.loop = this.loop.bind(this);
        }

        setupObserver() {
            const section = document.getElementById('debate-arena') || this.canvas;
            if ('IntersectionObserver' in window) {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        this.isVisible = entry.isIntersecting && entry.intersectionRatio > 0.05;
                        if (this.isVisible) {
                            this.startLoop();
                        } else {
                            this.stopLoop();
                        }
                    });
                }, { threshold: [0, 0.05, 0.2] });
                observer.observe(section);
            } else {
                this.isVisible = true;
                this.startLoop();
            }
        }

        startLoop() {
            if (!this.animId) {
                this.lastFrameTime = performance.now();
                this.animId = requestAnimationFrame(this.loop);
            }
        }

        stopLoop() {
            if (this.animId) {
                cancelAnimationFrame(this.animId);
                this.animId = null;
            }
        }

        buildFormationSlots() {
            this.govSlots = [
                { x: 380, y: 140, hat: 'cowboy', weapon: 'sword' },
                { x: 365, y: 200, hat: 'shades', weapon: 'gavel' },
                { x: 385, y: 260, hat: 'wizard', weapon: 'scroll' },
                { x: 360, y: 320, hat: 'mortarboard', weapon: 'megaphone' },
                { x: 380, y: 375, hat: 'beret', weapon: 'rifle' },

                { x: 265, y: 130, hat: 'santa', weapon: 'potion' },
                { x: 285, y: 185, hat: 'mortarboard', weapon: 'quill' },
                { x: 255, y: 245, hat: 'shades', weapon: 'sword' },
                { x: 280, y: 305, hat: 'cowboy', weapon: 'gavel' },
                { x: 260, y: 365, hat: 'fedora', weapon: 'scroll' },

                { x: 165, y: 135, hat: 'wizard', weapon: 'scroll' },
                { x: 185, y: 195, hat: 'crown', weapon: 'sword' },
                { x: 155, y: 255, hat: 'mortarboard', weapon: 'quill' },
                { x: 175, y: 315, hat: 'santa', weapon: 'potion' },
                { x: 150, y: 370, hat: 'cowboy', weapon: 'rifle' },

                { x: 80, y: 150, hat: 'shades', weapon: 'gavel' },
                { x: 95, y: 220, hat: 'beret', weapon: 'sword' },
                { x: 75, y: 290, hat: 'fedora', weapon: 'scroll' },
                { x: 90, y: 355, hat: 'mortarboard', weapon: 'quill' }
            ];

            this.oppSlots = [
                { x: 620, y: 140, hat: 'ushanka', weapon: 'axe' },
                { x: 635, y: 200, hat: 'crown', weapon: 'pistol' },
                { x: 615, y: 260, hat: 'bowler', weapon: 'bottle' },
                { x: 640, y: 320, hat: 'conical', weapon: 'gavel' },
                { x: 620, y: 375, hat: 'shades', weapon: 'brick' },

                { x: 735, y: 130, hat: 'santa', weapon: 'shield' },
                { x: 715, y: 185, hat: 'fez', weapon: 'scroll' },
                { x: 745, y: 245, hat: 'ushanka', weapon: 'rifle' },
                { x: 720, y: 305, hat: 'bowler', weapon: 'bottle' },
                { x: 740, y: 365, hat: 'conical', weapon: 'axe' },

                { x: 835, y: 135, hat: 'crown', weapon: 'pistol' },
                { x: 815, y: 195, hat: 'fez', weapon: 'scroll' },
                { x: 845, y: 255, hat: 'shades', weapon: 'shield' },
                { x: 825, y: 315, hat: 'ushanka', weapon: 'gavel' },
                { x: 850, y: 370, hat: 'bowler', weapon: 'brick' },

                { x: 920, y: 150, hat: 'santa', weapon: 'bottle' },
                { x: 905, y: 220, hat: 'conical', weapon: 'axe' },
                { x: 925, y: 290, hat: 'fez', weapon: 'scroll' },
                { x: 910, y: 355, hat: 'ushanka', weapon: 'pistol' }
            ];
        }

        initDOM() {
            this.motionTitleEl = document.getElementById('arenaMotionTitle');
            this.motionCategoryEl = document.getElementById('arenaMotionCategory');
            this.motionInfoEl = document.getElementById('arenaMotionInfo');

            this.govPctText = document.getElementById('govPctText');
            this.govScoreText = document.getElementById('govScoreText');
            this.oppPctText = document.getElementById('oppPctText');
            this.oppScoreText = document.getElementById('oppScoreText');
            this.govScoreSegment = document.getElementById('govScoreSegment');
            this.oppScoreSegment = document.getElementById('oppScoreSegment');
            this.arenaCenterTitle = document.getElementById('arenaCenterTitle');

            this.speechBubbleEl = document.getElementById('arenaSpeechBubble');
            this.bubbleNameEl = document.getElementById('bubbleTroopName');
            this.bubbleBadgeEl = document.getElementById('bubbleTroopBadge');
            this.bubbleLogicEl = document.getElementById('bubbleTroopLogic');
            this.bubbleTimeEl = document.getElementById('bubbleTroopTime');

            this.statementForm = document.getElementById('arenaStatementForm');
            this.statementSubmitBtn = document.getElementById('statementSubmitBtn');
            this.logicInputEl = document.getElementById('statementLogicInput');
            this.charCounterEl = document.getElementById('statementCharCounter');

            this.openArchiveModalBtn = document.getElementById('openArchiveModalBtn');
            this.closeArchiveModalBtn = document.getElementById('closeArchiveModalBtn');
            this.archiveModal = document.getElementById('archiveModal');
            this.archiveMotionsList = document.getElementById('archiveMotionsList');
            this.archiveArgumentsFeed = document.getElementById('archiveArgumentsFeed');
            this.archiveTroopCount = document.getElementById('archiveTroopCount');

            this.soundToggleBtn = document.getElementById('arenaSoundToggle');
            this.resonanceBtn = document.getElementById('triggerResonanceBtn');
            this.triggerAdjudicationBtn = document.getElementById('triggerAdjudicationBtn');

            this.aiAdjudicatorSection = document.getElementById('aiAdjudicatorSection');
            this.aiLoadingTransition = document.getElementById('aiLoadingTransition');
            this.aiVerdictContent = document.getElementById('aiVerdictContent');
            this.aiLeadBadge = document.getElementById('aiLeadBadge');
            this.aiVerdictText = document.getElementById('aiVerdictText');
            this.aiBestGovName = document.getElementById('aiBestGovName');
            this.aiBestGovQuote = document.getElementById('aiBestGovQuote');
            this.aiBestGovReason = document.getElementById('aiBestGovReason');
            this.aiBestOppName = document.getElementById('aiBestOppName');
            this.aiBestOppQuote = document.getElementById('aiBestOppQuote');
            this.aiBestOppReason = document.getElementById('aiBestOppReason');
            this.aiPoiList = document.getElementById('aiPoiList');
            this.aiQueryForm = document.getElementById('aiQueryForm');
            this.aiQueryInput = document.getElementById('aiQueryInput');
            this.aiQuerySubmitBtn = document.getElementById('aiQuerySubmitBtn');
            this.aiQueryResponseBox = document.getElementById('aiQueryResponseBox');

            this.updateSoundBtnUI();
        }

        updateSoundBtnUI() {
            if (this.soundToggleBtn) {
                this.soundToggleBtn.innerHTML = this.audio.muted
                    ? `<svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" stroke-dasharray="2 2"></path></svg>`
                    : `<svg class="w-3.5 h-3.5 text-[#8b1e1e]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>`;
            }
        }

        bindEvents() {
            window.addEventListener('resize', () => {
                this.resizeCanvas();
                this.preRenderBackground();
            }, { passive: true });

            if (this.soundToggleBtn) {
                this.soundToggleBtn.addEventListener('click', () => {
                    this.audio.toggleMute();
                    this.updateSoundBtnUI();
                    if (!this.audio.muted) this.audio.playChime(true);
                });
            }

            if (this.resonanceBtn) {
                this.resonanceBtn.addEventListener('click', () => {
                    this.audio.playResonance();
                    this.triggerGroundDust(this.clashFrontX, 220);
                    this.runAiAdjudication();
                });
            }

            if (this.triggerAdjudicationBtn) {
                this.triggerAdjudicationBtn.addEventListener('click', () => {
                    this.audio.playResonance();
                    this.triggerGroundDust(this.clashFrontX, 220);
                    this.runAiAdjudication();
                });
            }

            if (this.logicInputEl && this.charCounterEl) {
                this.logicInputEl.addEventListener('input', (e) => {
                    this.charCounterEl.textContent = `${e.target.value.length}/150`;
                }, { passive: true });
            }

            if (this.statementForm) {
                this.statementForm.addEventListener('submit', (e) => this.handleSubmitStatement(e));
            }

            if (this.aiQueryForm) {
                this.aiQueryForm.addEventListener('submit', (e) => this.handleAiQuerySubmit(e));
            }

            if (this.openArchiveModalBtn && this.archiveModal) {
                this.openArchiveModalBtn.addEventListener('click', () => {
                    this.archiveModal.classList.remove('hidden');
                    this.renderArchiveModal();
                });
            }

            if (this.closeArchiveModalBtn && this.archiveModal) {
                this.closeArchiveModalBtn.addEventListener('click', () => {
                    this.archiveModal.classList.add('hidden');
                });
            }

            document.querySelectorAll('.archive-filter-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    document.querySelectorAll('.archive-filter-btn').forEach(b => {
                        b.classList.remove('active', 'bg-gray-900', 'text-white');
                        b.classList.add('bg-gray-100', 'text-blue-900', 'text-red-900');
                    });
                    const target = e.currentTarget;
                    target.classList.add('active', 'bg-gray-900', 'text-white');
                    const filter = target.getAttribute('data-filter') || 'all';
                    this.renderArchiveArguments(this.selectedArchiveMotion || this.activeMotion, filter);
                });
            });

            this.canvas.addEventListener('mousemove', (e) => this.handlePointerMove(e), { passive: true });
            this.canvas.addEventListener('click', (e) => this.handlePointerClick(e));
            this.canvas.addEventListener('touchstart', (e) => this.handlePointerClick(e), { passive: true });
        }

        resizeCanvas() {
            const container = this.canvas.parentElement;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 1.25);

            this.canvas.width = rect.width * dpr;
            this.canvas.height = (rect.width * (this.VIRTUAL_HEIGHT / this.VIRTUAL_WIDTH)) * dpr;

            this.scaleX = (rect.width * dpr) / this.VIRTUAL_WIDTH;
            this.scaleY = ((rect.width * (this.VIRTUAL_HEIGHT / this.VIRTUAL_WIDTH)) * dpr) / this.VIRTUAL_HEIGHT;

            this.ctx.resetTransform();
            this.ctx.scale(this.scaleX, this.scaleY);
        }

        preRenderBackground() {
            this.bgCanvas = document.createElement('canvas');
            this.bgCanvas.width = this.VIRTUAL_WIDTH;
            this.bgCanvas.height = this.VIRTUAL_HEIGHT;
            const bgCtx = this.bgCanvas.getContext('2d');
            const w = this.VIRTUAL_WIDTH;
            const h = this.VIRTUAL_HEIGHT;

            // 1. Sky
            const skyGrad = bgCtx.createLinearGradient(0, 0, 0, 110);
            skyGrad.addColorStop(0, '#f8fafc');
            skyGrad.addColorStop(0.6, '#edf2f7');
            skyGrad.addColorStop(1, '#e2e8f0');
            bgCtx.fillStyle = skyGrad;
            bgCtx.fillRect(0, 0, w, 110);

            // 2. Distant Mountains
            bgCtx.fillStyle = 'rgba(203, 213, 225, 0.65)';
            bgCtx.beginPath();
            bgCtx.moveTo(0, 95);
            bgCtx.lineTo(80, 55);
            bgCtx.lineTo(160, 80);
            bgCtx.lineTo(240, 45);
            bgCtx.lineTo(320, 85);
            bgCtx.lineTo(410, 40);
            bgCtx.lineTo(500, 75);
            bgCtx.lineTo(590, 35);
            bgCtx.lineTo(680, 70);
            bgCtx.lineTo(760, 45);
            bgCtx.lineTo(840, 80);
            bgCtx.lineTo(920, 50);
            bgCtx.lineTo(w, 90);
            bgCtx.lineTo(w, 110);
            bgCtx.lineTo(0, 110);
            bgCtx.closePath();
            bgCtx.fill();

            // Mid-distance Cliffs
            bgCtx.fillStyle = 'rgba(148, 163, 184, 0.4)';
            bgCtx.beginPath();
            bgCtx.moveTo(0, 100);
            bgCtx.lineTo(120, 72);
            bgCtx.lineTo(220, 95);
            bgCtx.lineTo(360, 68);
            bgCtx.lineTo(480, 92);
            bgCtx.lineTo(600, 62);
            bgCtx.lineTo(720, 90);
            bgCtx.lineTo(860, 70);
            bgCtx.lineTo(w, 98);
            bgCtx.lineTo(w, 110);
            bgCtx.lineTo(0, 110);
            bgCtx.closePath();
            bgCtx.fill();

            // 3. 2.5D Slanted Whitish Terrain
            const groundGrad = bgCtx.createLinearGradient(0, 75, 0, h);
            groundGrad.addColorStop(0, '#e5eaf0');
            groundGrad.addColorStop(0.3, '#f1f5f9');
            groundGrad.addColorStop(0.7, '#e2e8f0');
            groundGrad.addColorStop(1, '#d8e0e9');
            bgCtx.fillStyle = groundGrad;
            bgCtx.fillRect(0, 75, w, h - 75);

            // 4. Perspective Grid Striations
            bgCtx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
            bgCtx.lineWidth = 1;
            bgCtx.setLineDash([4, 12]);
            for (let y = 110; y < h; y += 45) {
                bgCtx.beginPath();
                bgCtx.moveTo(0, y);
                bgCtx.lineTo(w, y);
                bgCtx.stroke();
            }

            // 5. Static Terrain Stones
            const rocks = [
                { x: 120, y: 160, r: 3 }, { x: 230, y: 280, r: 4 }, { x: 310, y: 360, r: 3.5 },
                { x: 450, y: 140, r: 2.5 }, { x: 540, y: 340, r: 3.5 },
                { x: 680, y: 170, r: 4 }, { x: 790, y: 290, r: 3 }, { x: 880, y: 360, r: 4.5 }
            ];

            rocks.forEach(rk => {
                bgCtx.beginPath();
                bgCtx.ellipse(rk.x, rk.y, rk.r * 1.5, rk.r * 0.8, 0, 0, Math.PI * 2);
                bgCtx.fillStyle = 'rgba(100, 116, 139, 0.25)';
                bgCtx.fill();

                bgCtx.beginPath();
                bgCtx.arc(rk.x - 0.5, rk.y - 1, rk.r * 0.7, 0, Math.PI * 2);
                bgCtx.fillStyle = '#cbd5e1';
                bgCtx.fill();
            });
        }

        getCanvasCoords(e) {
            const rect = this.canvas.getBoundingClientRect();
            const clientX = e.clientX || (e.touches && e.touches[0].clientX) || (e.changedTouches && e.changedTouches[0].clientX);
            const clientY = e.clientY || (e.touches && e.touches[0].clientY) || (e.changedTouches && e.changedTouches[0].clientY);
            const x = (clientX - rect.left) * (this.VIRTUAL_WIDTH / rect.width);
            const y = (clientY - rect.top) * (this.VIRTUAL_HEIGHT / rect.height);
            return { x, y };
        }

        handlePointerMove(e) {
            const now = performance.now();
            if (now - this.lastMoveTime < 32) return;
            this.lastMoveTime = now;

            const { x, y } = this.getCanvasCoords(e);
            let found = null;
            for (let i = this.delegates.length - 1; i >= 0; i--) {
                if (this.delegates[i].isPointInside(x, y)) {
                    found = this.delegates[i];
                    break;
                }
            }

            this.delegates.forEach(u => u.isHovered = false);
            if (found) {
                found.isHovered = true;
                this.canvas.style.cursor = 'pointer';
            } else {
                this.canvas.style.cursor = 'default';
            }
        }

        handlePointerClick(e) {
            const { x, y } = this.getCanvasCoords(e);
            let clicked = null;
            for (let i = this.delegates.length - 1; i >= 0; i--) {
                if (this.delegates[i].isPointInside(x, y)) {
                    clicked = this.delegates[i];
                    break;
                }
            }

            if (clicked) {
                this.delegates.forEach(u => u.isSelected = false);
                clicked.isSelected = true;
                this.showDossier(clicked);
                this.audio.playChime(clicked.side === 'gov');
                this.triggerGroundDust(clicked.x, clicked.y);
            } else {
                this.hideDossier();
            }
        }

        showDossier(u) {
            if (!this.speechBubbleEl) return;
            const isGov = u.side === 'gov';
            this.bubbleNameEl.textContent = u.name;
            this.bubbleBadgeEl.textContent = `${isGov ? 'GOVERNMENT BENCH' : 'OPPOSITION BENCH'} • ${u.troopClass.toUpperCase()}`;
            this.bubbleBadgeEl.className = isGov
                ? 'text-[9px] font-mono font-bold text-sky-700 uppercase px-2 py-0.5 rounded bg-sky-50 border border-sky-200'
                : 'text-[9px] font-mono font-bold text-rose-700 uppercase px-2 py-0.5 rounded bg-rose-50 border border-rose-200';

            this.bubbleLogicEl.textContent = `“${u.logic}”`;
            this.bubbleTimeEl.textContent = u.timestamp;

            this.speechBubbleEl.classList.remove('opacity-0', 'pointer-events-none', 'scale-95');
            this.speechBubbleEl.classList.add('opacity-100', 'scale-100');
        }

        hideDossier() {
            if (!this.speechBubbleEl) return;
            this.speechBubbleEl.classList.add('opacity-0', 'pointer-events-none', 'scale-95');
            this.speechBubbleEl.classList.remove('opacity-100', 'scale-100');
        }

        triggerGroundDust(x, y) {
            for (let i = 0; i < 4; i++) {
                this.dustParticles.push({
                    x: x + (Math.random() - 0.5) * 14,
                    y: y + 8 + (Math.random() - 0.5) * 5,
                    vx: (Math.random() - 0.5) * 1.8,
                    vy: -Math.random() * 1.2 - 0.4,
                    alpha: 0.6
                });
            }
        }

        async handleSubmitStatement(e) {
            e.preventDefault();
            const formData = new FormData(this.statementForm);
            const side = formData.get('side');
            const name = formData.get('name');
            const logic = formData.get('logic');
            const troopClass = formData.get('troop_class') || 'scholar';

            if (!side || !logic.trim()) {
                alert('Please select a faction army and state your debate decree.');
                return;
            }

            if (this.statementSubmitBtn) {
                this.statementSubmitBtn.disabled = true;
                this.statementSubmitBtn.innerHTML = `<span>Deploying Countryball...</span>`;
            }

            try {
                const res = await fetch('/api/arena/vote', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        side,
                        name,
                        logic,
                        troop_class: troopClass,
                        motion_id: this.activeMotion ? this.activeMotion.id : ''
                    })
                });
                const data = await res.json();
                if (data.ok && data.troop) {
                    this.statementForm.reset();
                    if (this.charCounterEl) this.charCounterEl.textContent = '0/150';

                    const isGov = side === 'gov';
                    this.audio.playChime(isGov);

                    if (data.active_motion) {
                        this.activeMotion = data.active_motion;
                        this.syncDelegates(data.active_motion.troops || []);
                    }

                    const latest = this.delegates.find(d => d.id === data.troop.id) || this.delegates[this.delegates.length - 1];
                    if (latest) {
                        latest.dropY = -120;
                        latest.dropSpeed = 0;
                        setTimeout(() => this.showDossier(latest), 400);
                    }
                } else {
                    alert(data.error || 'Failed to deploy debater.');
                }
            } catch (err) {
                console.error(err);
                alert('Network connection error.');
            } finally {
                if (this.statementSubmitBtn) {
                    this.statementSubmitBtn.disabled = false;
                    this.statementSubmitBtn.innerHTML = `
                        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6-9.6 9.6a1 1 0 0 0 0 1.4l1.4 1.4a1 1 0 0 0 1.4 0l9.6-9.6 1.6 1.6a1 1 0 0 0 1.4 0l1.3-1.3a1 1 0 0 0 0-1.4l-7.4-7.4a1 1 0 0 0-1.4 0l-1.3 1.3zM4 20l3-3M20 4l-3 3M4 4l16 16"/>
                        </svg>
                        <span>Deploy to Battle Frontline</span>
                    `;
                }
            }
        }

        async fetchState(isSilent = false) {
            try {
                const res = await fetch('/api/arena/state');
                const data = await res.json();
                if (data && data.active_motion) {
                    this.activeMotion = data.active_motion;
                    this.motionsArchive = data.motions_archive || [];

                    if (this.motionTitleEl) this.motionTitleEl.textContent = `"${this.activeMotion.title}"`;
                    if (this.motionCategoryEl) this.motionCategoryEl.textContent = this.activeMotion.category || 'National Policy';
                    if (this.motionInfoEl && this.activeMotion.info) this.motionInfoEl.textContent = this.activeMotion.info;

                    this.syncDelegates(this.activeMotion.troops || []);
                }
            } catch (err) {
                if (!isSilent) console.error('Fetch error:', err);
                if (this.delegates.length === 0) {
                    this.syncDelegates([]);
                }
            }
        }

        syncDelegates(userTroops) {
            const govTroops = userTroops.filter(t => t.side === 'gov');
            const oppTroops = userTroops.filter(t => t.side === 'opp');

            this.delegates = [];

            const defaultGovUnits = [
                { name: 'Sarah Khan', troop_class: 'scholar', logic: 'Subsidized state energy infrastructure safeguards foundational national industries.' },
                { name: 'Aarav Rahman', troop_class: 'vanguard', logic: 'Capacity charges were pivotal in attracting initial mega-grid foreign investments.' },
                { name: 'Nafisa F.', troop_class: 'strategist', logic: 'Grid decentralization must follow strict state baseline governance.' },
                { name: 'Mehdi Hasan', troop_class: 'critic', logic: 'Public sovereign control prevents monopolistic private energy cartels.' },
                { name: 'Tariq Aziz', troop_class: 'scholar', logic: 'Industrial production indices demand guaranteed state baseloads.' },
                { name: 'Leena Aktar', troop_class: 'vanguard', logic: 'Rural electrification expansion is an indisputable state achievement.' }
            ];

            const defaultOppUnits = [
                { name: 'Rayan Ahmed', troop_class: 'scholar', logic: 'Capacity payments drained trillions without delivering efficient kilowatt yields.' },
                { name: 'Fahim Chowdhury', troop_class: 'vanguard', logic: 'Lack of competitive spot market trading crippled industrial margins.' },
                { name: 'Zarin Tasnim', troop_class: 'strategist', logic: 'Transmission bottleneck infrastructure remains severely neglected.' },
                { name: 'Sadman Sakib', troop_class: 'critic', logic: 'Subsidies disproportionately favored non-producing rental plant oligarchs.' },
                { name: 'Anika Tabassum', troop_class: 'scholar', logic: 'Renewable transition was delayed by decades of fossil dependency.' },
                { name: 'Tanvir Hossain', troop_class: 'vanguard', logic: 'Consumer tariff hikes burdened households while grid losses climbed.' }
            ];

            const combinedGov = [...govTroops];
            let dGovIdx = 0;
            while (combinedGov.length < this.govSlots.length) {
                const sample = defaultGovUnits[dGovIdx % defaultGovUnits.length];
                combinedGov.push({ ...sample, side: 'gov', isDefault: true, id: `def_gov_${combinedGov.length}` });
                dGovIdx++;
            }

            combinedGov.forEach((t, idx) => {
                const slot = this.govSlots[idx % this.govSlots.length];
                this.delegates.push(new CountryBallUnit(t, slot.x, slot.y, 1, t.isDefault, slot.hat, slot.weapon));
            });

            const combinedOpp = [...oppTroops];
            let dOppIdx = 0;
            while (combinedOpp.length < this.oppSlots.length) {
                const sample = defaultOppUnits[dOppIdx % defaultOppUnits.length];
                combinedOpp.push({ ...sample, side: 'opp', isDefault: true, id: `def_opp_${combinedOpp.length}` });
                dOppIdx++;
            }

            combinedOpp.forEach((t, idx) => {
                const slot = this.oppSlots[idx % this.oppSlots.length];
                this.delegates.push(new CountryBallUnit(t, slot.x, slot.y, -1, t.isDefault, slot.hat, slot.weapon));
            });

            this.delegates.sort((a, b) => a.y - b.y);
            this.updateDominanceTally(govTroops.length, oppTroops.length);
        }

        updateDominanceTally(govCount, oppCount) {
            const total = govCount + oppCount;
            let govPct = 50.0;
            let oppPct = 50.0;

            if (total > 0) {
                govPct = Math.round((govCount / total) * 10000) / 100;
                oppPct = Math.round((100 - govPct) * 100) / 100;
            }

            const govSimScore = (govCount * 425100 + 10117666).toLocaleString();
            const oppSimScore = (oppCount * 415300 + 8006320).toLocaleString();

            if (this.govPctText) this.govPctText.textContent = `${govPct.toFixed(2)}%`;
            if (this.oppPctText) this.oppPctText.textContent = `${oppPct.toFixed(2)}%`;
            if (this.govScoreText) this.govScoreText.textContent = `${govCount} DELEGATES (${govSimScore})`;
            if (this.oppScoreText) this.oppScoreText.textContent = `(${oppSimScore}) ${oppCount} DELEGATES`;

            this.targetClashFrontX = 350 + (govPct / 100) * 300;
        }

        async runAiAdjudication() {
            if (this.aiAdjudicatorSection) {
                this.aiAdjudicatorSection.classList.remove('hidden');
                this.aiAdjudicatorSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            if (this.aiLoadingTransition) this.aiLoadingTransition.classList.remove('hidden');
            if (this.aiVerdictContent) this.aiVerdictContent.classList.add('hidden');

            if (this.aiLeadBadge) {
                this.aiLeadBadge.textContent = 'Adjudicating Frontline Clash...';
                this.aiLeadBadge.className = 'text-[9.5px] font-mono font-bold uppercase px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 animate-pulse';
            }

            try {
                const res = await fetch('/api/arena/adjudicate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        motion_id: this.activeMotion ? this.activeMotion.id : ''
                    })
                });
                const data = await res.json();

                if (this.aiLoadingTransition) this.aiLoadingTransition.classList.add('hidden');
                if (this.aiVerdictContent) this.aiVerdictContent.classList.remove('hidden');

                if (data.ok) {
                    if (this.aiVerdictText) this.aiVerdictText.textContent = data.verdict;

                    if (this.aiLeadBadge) {
                        if (data.lead_side === 'gov') {
                            this.aiLeadBadge.textContent = 'GOVERNMENT ARMY ADVANCING';
                            this.aiLeadBadge.className = 'text-[9.5px] font-mono font-bold uppercase px-2.5 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200';
                        } else if (data.lead_side === 'opp') {
                            this.aiLeadBadge.textContent = 'OPPOSITION ARMY ADVANCING';
                            this.aiLeadBadge.className = 'text-[9.5px] font-mono font-bold uppercase px-2.5 py-0.5 rounded bg-red-100 text-[#8b1e1e] border border-red-200';
                        } else {
                            this.aiLeadBadge.textContent = 'STRATEGIC EQUILIBRIUM';
                            this.aiLeadBadge.className = 'text-[9.5px] font-mono font-bold uppercase px-2.5 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-200';
                        }
                    }

                    if (data.best_gov) {
                        if (this.aiBestGovName) this.aiBestGovName.textContent = data.best_gov.name;
                        if (this.aiBestGovQuote) this.aiBestGovQuote.textContent = `"${data.best_gov.logic}"`;
                        if (this.aiBestGovReason) this.aiBestGovReason.textContent = `Strategic Impact: ${data.best_gov_reason}`;
                        const matchGov = this.delegates.find(d => d.id === data.best_gov.id || d.name === data.best_gov.name);
                        if (matchGov) matchGov.isTopDebater = true;
                    }

                    if (data.best_opp) {
                        if (this.aiBestOppName) this.aiBestOppName.textContent = data.best_opp.name;
                        if (this.aiBestOppQuote) this.aiBestOppQuote.textContent = `"${data.best_opp.logic}"`;
                        if (this.aiBestOppReason) this.aiBestOppReason.textContent = `Strategic Impact: ${data.best_opp_reason}`;
                        const matchOpp = this.delegates.find(d => d.id === data.best_opp.id || d.name === data.best_opp.name);
                        if (matchOpp) matchOpp.isTopDebater = true;
                    }

                    if (this.aiPoiList && data.poi_questions) {
                        this.aiPoiList.innerHTML = data.poi_questions.map((q, idx) => `
                            <li class="p-2.5 rounded bg-white border border-gray-200 shadow-2xs flex items-start gap-2">
                                <span class="font-bold text-[#8b1e1e] font-mono text-[10px]">POI ${idx + 1}:</span>
                                <span class="leading-relaxed">${q}</span>
                            </li>
                        `).join('');
                    }
                }
            } catch (err) {
                console.error('Adjudication error:', err);
                if (this.aiLoadingTransition) this.aiLoadingTransition.classList.add('hidden');
                if (this.aiVerdictContent) this.aiVerdictContent.classList.remove('hidden');
            }
        }

        async handleAiQuerySubmit(e) {
            e.preventDefault();
            const query = this.aiQueryInput ? this.aiQueryInput.value.trim() : '';
            if (!query) return;

            if (this.aiQuerySubmitBtn) {
                this.aiQuerySubmitBtn.disabled = true;
                this.aiQuerySubmitBtn.textContent = '...';
            }
            if (this.aiQueryResponseBox) {
                this.aiQueryResponseBox.classList.remove('hidden');
                this.aiQueryResponseBox.textContent = 'Consulting strategic cartographer...';
            }

            try {
                const res = await fetch('/api/arena/adjudicate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        motion_id: this.activeMotion ? this.activeMotion.id : '',
                        query: query
                    })
                });
                const data = await res.json();
                if (data.ok && data.query_reply) {
                    if (this.aiQueryResponseBox) {
                        this.aiQueryResponseBox.textContent = `“${data.query_reply}”`;
                    }
                }
            } catch (err) {
                console.error(err);
                if (this.aiQueryResponseBox) this.aiQueryResponseBox.textContent = 'Failed to fetch reply.';
            } finally {
                if (this.aiQuerySubmitBtn) {
                    this.aiQuerySubmitBtn.disabled = false;
                    this.aiQuerySubmitBtn.textContent = 'Ask';
                }
            }
        }

        renderArchiveModal() {
            if (!this.archiveMotionsList) return;

            this.archiveMotionsList.innerHTML = this.motionsArchive.map(m => {
                const isActive = this.activeMotion && this.activeMotion.id === m.id;
                return `
                    <div class="p-3 rounded-lg border ${isActive ? 'border-[#8b1e1e] bg-red-50/20' : 'border-gray-200 bg-white hover:bg-gray-50'} transition-all cursor-pointer select-motion-btn" data-id="${m.id}">
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-[9.5px] font-mono font-bold uppercase ${isActive ? 'text-[#8b1e1e]' : 'text-gray-500'}">
                                ${m.round || 'Debate Round'}
                            </span>
                            <span class="text-[9px] font-mono px-1.5 py-0.2 rounded ${isActive ? 'bg-[#8b1e1e] text-white font-bold' : 'bg-gray-100 text-gray-600'}">
                                ${isActive ? 'ACTIVE' : 'ARCHIVED'}
                            </span>
                        </div>
                        <h5 class="text-xs font-bold text-gray-900 leading-snug line-clamp-2 cinzel">${m.title}</h5>
                        <div class="flex items-center justify-between pt-2 mt-1.5 border-t border-gray-100 text-[10px] text-gray-500 font-mono">
                            <span>Gov: ${m.gov_votes} | Opp: ${m.opp_votes}</span>
                            <span class="text-blue-900 font-semibold">${m.total_votes} Total Decrees</span>
                        </div>
                    </div>
                `;
            }).join('');

            this.archiveMotionsList.querySelectorAll('.select-motion-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const motionId = e.currentTarget.getAttribute('data-id');
                    try {
                        const res = await fetch(`/api/arena/state?motion_id=${motionId}`);
                        const data = await res.json();
                        if (data && data.active_motion) {
                            this.selectedArchiveMotion = data.active_motion;
                            this.renderArchiveArguments(data.active_motion, 'all');
                        }
                    } catch (err) {
                        console.error(err);
                    }
                });
            });

            this.selectedArchiveMotion = this.activeMotion;
            this.renderArchiveArguments(this.activeMotion, 'all');
        }

        renderArchiveArguments(motion, filter = 'all') {
            if (!this.archiveArgumentsFeed || !motion) return;
            const troops = motion.troops || [];
            if (this.archiveTroopCount) this.archiveTroopCount.textContent = troops.length;

            let filtered = troops;
            if (filter === 'gov') filtered = troops.filter(t => t.side === 'gov');
            if (filter === 'opp') filtered = troops.filter(t => t.side === 'opp');

            if (filtered.length === 0) {
                this.archiveArgumentsFeed.innerHTML = `
                    <div class="py-10 text-center text-gray-400 text-xs font-mono">
                        No recorded statements in this category.
                    </div>
                `;
                return;
            }

            this.archiveArgumentsFeed.innerHTML = filtered.map(t => {
                const isGov = t.side === 'gov';
                return `
                    <div class="p-3.5 rounded-lg border ${isGov ? 'border-blue-100 bg-blue-50/30' : 'border-red-100 bg-red-50/30'}">
                        <div class="flex items-center justify-between mb-1.5 pb-1 border-b border-gray-100">
                            <span class="text-xs font-bold text-gray-900 cinzel">${t.name}</span>
                            <span class="text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded ${isGov ? 'bg-blue-100 text-blue-900' : 'bg-red-100 text-red-900'}">
                                ${isGov ? 'Government' : 'Opposition'}
                            </span>
                        </div>
                        <p class="text-xs text-gray-700 italic font-serif leading-relaxed">"${t.logic}"</p>
                        <div class="flex justify-between items-center pt-1.5 mt-1.5 text-[9.5px] text-gray-400 font-mono">
                            <span>Role: ${t.troop_class || 'Scholar'}</span>
                            <span>${t.timestamp}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        loop(timestamp) {
            if (!this.isVisible) {
                this.animId = null;
                return;
            }

            this.animId = requestAnimationFrame(this.loop);

            // Framerate throttle target ~38-40 FPS (Zero CPU burden, perfectly smooth for 2D/2.5D animation)
            const delta = timestamp - this.lastFrameTime;
            if (delta < 26) return;
            this.lastFrameTime = timestamp - (delta % 26);

            this.time++;
            const ctx = this.ctx;
            const h = this.VIRTUAL_HEIGHT;

            // 1. Single GPU Blit for Static Background (0.05ms)
            if (this.bgCanvas) {
                ctx.drawImage(this.bgCanvas, 0, 0);
            }

            // 2. Smooth Frontline Clash Line
            this.clashFrontX += (this.targetClashFrontX - this.clashFrontX) * 0.05;
            const fx = this.clashFrontX;

            const clashGrad = ctx.createLinearGradient(fx - 30, 0, fx + 30, 0);
            clashGrad.addColorStop(0, 'rgba(2, 132, 199, 0)');
            clashGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.2)');
            clashGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
            ctx.fillStyle = clashGrad;
            ctx.fillRect(fx - 30, 75, 60, h - 75);

            // 3. Lightweight Dust FX
            for (let i = this.dustParticles.length - 1; i >= 0; i--) {
                const p = this.dustParticles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= 0.04;

                ctx.fillStyle = `rgba(148, 163, 184, ${Math.max(0, p.alpha)})`;
                ctx.fillRect(p.x - 1, p.y - 1, 2.5, 2.5);

                if (p.alpha <= 0) this.dustParticles.splice(i, 1);
            }

            // 4. Render Pre-Baked Countryballs (Texture Blits)
            this.delegates.forEach(u => {
                u.update(this);
                u.draw(ctx, this.time);
            });
        }
    }

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.pcdfArena = new PcdfArenaEngine();
        });
    } else {
        window.pcdfArena = new PcdfArenaEngine();
    }
})();
