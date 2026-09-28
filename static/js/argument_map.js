document.addEventListener('DOMContentLoaded', () => {
    const section = document.getElementById('renaissance-section');
    const canvas = document.getElementById('argument-map');
    const infoCard = document.getElementById('node-info-card');
    const titleEl = document.getElementById('node-title');
    const quoteEl = document.getElementById('node-quote');

    if (!canvas || !section) return;

    const ctx = canvas.getContext('2d');
    let width, height;

    // The great thinkers and concepts of debate
    const knowledgeNodes = [
        { title: "Aristotle", quote: "It is the mark of an educated mind to be able to entertain a thought without accepting it.", angle: 0, radius: 150, orbitSpeed: 0.002 },
        { title: "Logos", quote: "The appeal to logic, the structural integrity of the argument.", angle: Math.PI / 2, radius: 250, orbitSpeed: -0.0015 },
        { title: "Pathos", quote: "The emotional resonance that binds the audience to your words.", angle: Math.PI, radius: 250, orbitSpeed: -0.0015 },
        { title: "Ethos", quote: "The credibility of the speaker. Trust is the foundation of persuasion.", angle: Math.PI * 1.5, radius: 250, orbitSpeed: -0.0015 },
        { title: "Dialectic", quote: "The art of investigating or discussing the truth of opinions.", angle: Math.PI / 4, radius: 350, orbitSpeed: 0.001 },
        { title: "Socrates", quote: "I cannot teach anybody anything. I can only make them think.", angle: Math.PI * 1.25, radius: 350, orbitSpeed: 0.001 },
        { title: "Syllogism", quote: "A kind of logical argument that applies deductive reasoning to arrive at a conclusion.", angle: 0, radius: 0, orbitSpeed: 0 } // Center node
    ];

    let mouse = {
        x: -1000,
        y: -1000,
        isHovering: false
    };

    let hoveredNode = null;
    let centerX, centerY;

    function init() {
        resize();
        window.addEventListener('resize', resize);

        // Mouse Events
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
            checkHover();
        });

        canvas.addEventListener('mouseleave', () => {
            mouse.x = -1000;
            mouse.y = -1000;
            hideCard();
        });

        // Touch support for mobile devices
        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                const rect = canvas.getBoundingClientRect();
                mouse.x = e.touches[0].clientX - rect.left;
                mouse.y = e.touches[0].clientY - rect.top;
                checkHover();
            }
        }, { passive: true });

        requestAnimationFrame(animate);
    }

    function resize() {
        width = canvas.width = section.clientWidth;
        height = canvas.height = section.clientHeight;
        
        // On PC (>= 768px), position the diagram in the left-center area (40% of section width)
        // so the entire celestial orbit is 100% visible and balanced alongside the right card.
        // On mobile (< 768px), keep it perfectly centered.
        centerX = width >= 768 ? width * 0.40 : width / 2;
        centerY = height / 2;

        // Scale proportionally to fit screen
        const minDimension = Math.min(width, height);
        knowledgeNodes.forEach(node => {
            if (!node.originalRadius) node.originalRadius = node.radius;
            // Scale dynamically so circles fit inside canvas
            node.radius = (node.originalRadius / 400) * (minDimension / 2 * (width < 768 ? 0.65 : 0.72));
        });
    }

    function checkHover() {
        let found = null;
        for (let node of knowledgeNodes) {
            const nx = centerX + Math.cos(node.angle) * node.radius;
            const ny = centerY + Math.sin(node.angle) * node.radius;
            const dx = mouse.x - nx;
            const dy = mouse.y - ny;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 28) { // Hover tolerance
                found = node;
                found.screenX = nx;
                found.screenY = ny;
                break;
            }
        }

        if (found !== hoveredNode) {
            hoveredNode = found;
            if (hoveredNode) {
                showCard(hoveredNode);
                canvas.style.cursor = 'pointer';
            } else {
                hideCard();
                canvas.style.cursor = 'crosshair';
            }
        } else if (hoveredNode && infoCard) {
            // Update card position if node is moving
            infoCard.style.left = `${hoveredNode.screenX}px`;
            infoCard.style.top = `${hoveredNode.screenY - 25}px`;
        }
    }

    function showCard(node) {
        if (!infoCard || !titleEl || !quoteEl) return;
        titleEl.textContent = node.title;
        quoteEl.textContent = `"${node.quote}"`;
        infoCard.style.left = `${node.screenX}px`;
        infoCard.style.top = `${node.screenY - 25}px`;
        infoCard.style.opacity = '1';
        infoCard.style.pointerEvents = 'auto';
    }

    function hideCard() {
        if (!infoCard) return;
        infoCard.style.opacity = '0';
        infoCard.style.pointerEvents = 'none';
    }

    function drawDraftingLines() {
        ctx.strokeStyle = 'rgba(62, 54, 46, 0.15)'; // Sepia/dark brown ink
        ctx.lineWidth = 1;

        // Draw orbital paths (Classical Orbits)
        const radii = [...new Set(knowledgeNodes.map(n => n.radius))].filter(r => r > 0);
        radii.forEach(r => {
            ctx.beginPath();
            ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
            ctx.stroke();

            // Draw an inner dotted line for architectural feel
            ctx.beginPath();
            ctx.setLineDash([5, 10]);
            ctx.arc(centerX, centerY, Math.max(0, r - 5), 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        });

        // Draw central axes
        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, height);
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        // Draw diagonal drafting lines
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(width, height);
        ctx.moveTo(width, 0);
        ctx.lineTo(0, height);
        ctx.stroke();

        // If mouse is on screen, draw compass circle around it
        if (mouse.x !== -1000) {
            ctx.strokeStyle = 'rgba(139, 30, 30, 0.25)'; // Faint red ink
            ctx.beginPath();
            ctx.arc(mouse.x, mouse.y, 70, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(mouse.x - 90, mouse.y);
            ctx.lineTo(mouse.x + 90, mouse.y);
            ctx.moveTo(mouse.x, mouse.y - 90);
            ctx.lineTo(mouse.x, mouse.y + 90);
            ctx.stroke();
        }
    }

    function drawNodes() {
        knowledgeNodes.forEach(node => {
            node.angle += node.orbitSpeed;

            const x = centerX + Math.cos(node.angle) * node.radius;
            const y = centerY + Math.sin(node.angle) * node.radius;

            // Draw connection to center
            if (node.radius > 0) {
                ctx.strokeStyle = 'rgba(62, 54, 46, 0.2)';
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(x, y);
                ctx.stroke();
            }

            // Draw Node
            const isHovered = (hoveredNode === node);
            ctx.fillStyle = isHovered ? '#8b1e1e' : '#2c2825';

            ctx.beginPath();
            ctx.arc(x, y, isHovered ? 8 : 5, 0, Math.PI * 2);
            ctx.fill();

            // Draw concentric rings around node
            ctx.strokeStyle = isHovered ? '#8b1e1e' : '#2c2825';
            ctx.beginPath();
            ctx.arc(x, y, 14, 0, Math.PI * 2);
            ctx.stroke();

            if (isHovered) {
                ctx.beginPath();
                ctx.arc(x, y, 20, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Draw text
            ctx.font = "11px 'Cinzel', serif";
            ctx.fillStyle = isHovered ? '#8b1e1e' : '#4a443d';
            ctx.fillText(node.title, x + 15, y + 4);

            if (isHovered) {
                node.screenX = x;
                node.screenY = y;
            }
        });

        // Connect nodes in the same orbit
        const orbit250 = knowledgeNodes.filter(n => Math.abs(n.radius - knowledgeNodes[1].radius) < 10);
        if (orbit250.length > 1) {
            ctx.strokeStyle = 'rgba(62, 54, 46, 0.25)';
            ctx.beginPath();
            ctx.moveTo(centerX + Math.cos(orbit250[0].angle) * orbit250[0].radius, centerY + Math.sin(orbit250[0].angle) * orbit250[0].radius);
            for (let i = 1; i < orbit250.length; i++) {
                ctx.lineTo(centerX + Math.cos(orbit250[i].angle) * orbit250[i].radius, centerY + Math.sin(orbit250[i].angle) * orbit250[i].radius);
            }
            ctx.closePath();
            ctx.stroke();
        }
    }

    let isVisible = false;
    let animId = null;

    function animate() {
        if (!isVisible) {
            animId = null;
            return;
        }
        ctx.clearRect(0, 0, width, height);
        drawDraftingLines();
        drawNodes();
        if (hoveredNode) {
            checkHover();
        }
        animId = requestAnimationFrame(animate);
    }

    const obs = new IntersectionObserver((entries) => {
        isVisible = entries[0].isIntersecting;
        if (isVisible && !animId) {
            animId = requestAnimationFrame(animate);
        } else if (!isVisible && animId) {
            cancelAnimationFrame(animId);
            animId = null;
        }
    }, { rootMargin: '100px 0px' });
    obs.observe(section);

    setTimeout(init, 200);
});
