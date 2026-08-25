/* ═══════════════════════════════════════════════════════════════════
   LUMINIX — Yoga Library Module (Galaxy Design)
   ═══════════════════════════════════════════════════════════════════ */

window.renderYogaView = function(container) {
    container.innerHTML = `
        <div class="mb-6 relative overflow-hidden p-8 rounded-xl glass-card" style="background: linear-gradient(90deg, var(--black-1) 30%, transparent), url('/assets/media_1787652701397.jpg') center/cover; background-blend-mode: multiply; background-position: center 20%;">
            <div class="relative z-10">
                <div class="text-cyan mb-2" style="font-size: 0.65rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase;">MODULE // FOCUS</div>
                <h2 style="font-family:var(--font-display);font-size:3rem;font-weight:800;text-transform:uppercase;line-height:1;margin-bottom:0.5rem">Yoga <br/><span class="text-cyan" style="font-size:0.5em; letter-spacing:0.1em;">DISCIPLINE</span></h2>
                <p style="color:var(--text-secondary);font-size:0.85rem; max-width: 400px;">Guided poses with difficulty levels, benefits, and instructions. Calm the mind.</p>
            </div>
        </div>

        <div class="flex flex-wrap gap-2 mb-6" id="yoga-filters">
            <button class="btn-primary text-xs" onclick="filterYoga('all')" data-filter="all">All</button>
            <button class="btn-secondary text-xs" onclick="filterYoga('Beginner')" data-filter="Beginner">Beginner</button>
            <button class="btn-secondary text-xs" onclick="filterYoga('Intermediate')" data-filter="Intermediate">Intermediate</button>
            <button class="btn-secondary text-xs" onclick="filterYoga('Advanced')" data-filter="Advanced">Advanced</button>
        </div>

        <div id="yoga-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div class="glass-card p-6 rounded-xl text-center" style="grid-column:1/-1">
                <div class="loading-spinner mx-auto mb-3"></div>
                <p style="color:var(--text-dim);font-size:0.85rem">Loading yoga poses...</p>
            </div>
        </div>
    `;
    loadYogaPoses();
};

let allYogaPoses = [];

async function loadYogaPoses() {
    try {
        const res = await fetch('/v1/yoga/poses');
        const data = await res.json();
        allYogaPoses = data.poses || [];
        renderYogaGrid(allYogaPoses);
    } catch (e) {
        document.getElementById('yoga-grid').innerHTML = `
            <div class="glass-card p-6 rounded-xl text-center" style="grid-column:1/-1">
                <p style="color:var(--danger);font-size:0.85rem">Failed to load poses. Check server connection.</p>
            </div>
        `;
    }
}

function renderYogaGrid(poses) {
    const grid = document.getElementById('yoga-grid');
    if (!grid) return;

    if (!poses.length) {
        grid.innerHTML = `<p style="color:var(--text-dim);grid-column:1/-1">No poses found.</p>`;
        return;
    }

    const diffColors = {
        'Beginner': { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.15)', text: '#6ee7b7', badge: 'badge-calc' },
        'Intermediate': { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.15)', text: '#fcd34d', badge: 'badge-demo' },
        'Advanced': { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.15)', text: '#fca5a5', badge: 'badge-live' }
    };

    grid.innerHTML = poses.map((p, i) => {
        const dc = diffColors[p.difficulty] || diffColors['Beginner'];
        return `
        <div class="glass-card rounded-xl overflow-hidden pose-card tilt-card" style="animation:viewFadeIn ${0.3 + i * 0.05}s var(--ease-out) both">
            <div style="padding:1.25rem">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h3 style="font-family:var(--font-display);font-size:1rem;font-weight:800">${p.name}</h3>
                        ${p.sanskrit ? `<p style="font-size:0.65rem;color:var(--text-subtle);font-style:italic">${p.sanskrit}</p>` : ''}
                    </div>
                    <span class="badge ${dc.badge}">${p.difficulty}</span>
                </div>

                <div style="margin-bottom:0.75rem">
                    <p style="font-size:0.7rem;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.25rem">Benefits</p>
                    <p style="font-size:0.8rem;color:var(--text-secondary);line-height:1.5">${p.benefits}</p>
                </div>

                <div>
                    <p style="font-size:0.7rem;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.25rem">Instructions</p>
                    <p style="font-size:0.75rem;color:var(--text-dim);line-height:1.5">${p.instructions}</p>
                </div>
            </div>
            <div style="height:2px;background:linear-gradient(90deg,transparent,${dc.border},transparent)"></div>
        </div>
        `;
    }).join('');

    initTiltCards();
}

window.filterYoga = function(level) {
    const btns = document.querySelectorAll('#yoga-filters button');
    btns.forEach(b => {
        b.className = b.dataset.filter === level ? 'btn-primary text-xs' : 'btn-secondary text-xs';
    });

    if (level === 'all') renderYogaGrid(allYogaPoses);
    else renderYogaGrid(allYogaPoses.filter(p => p.difficulty === level));
};

function initTiltCards() {
    document.querySelectorAll('.tilt-card').forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            card.style.transform = `perspective(600px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg) translateY(-3px)`;
        });
        card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
}

window.stopYoga = function() {};
