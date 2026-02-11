const notes = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

// --- ARPEGGIOS COMPLETOS ---
const chords = [
    // Triadas Básicas
    {v:"major", n:"Major (Triad)"},
    {v:"minor", n:"Minor (Triad)"},
    {v:"aug", n:"Augmented (+)"},
    {v:"dim", n:"Diminished (°)"},
    {v:"sus2", n:"Sus2"},
    {v:"sus4", n:"Sus4"},

    // Séptimas
    {v:"maj7", n:"Major 7 (Maj7)"},
    {v:"m7", n:"Minor 7 (m7)"},
    {v:"7", n:"Dominant 7"},
    {v:"m7b5", n:"Half Diminished (m7b5)"},
    {v:"dim7", n:"Diminished 7 (dim7)"},
    {v:"mM7", n:"Minor Major 7 (mMaj7)"},

    // Sextas
    {v:"6", n:"Major 6"},
    {v:"m6", n:"Minor 6"},

    // Extensiones (Jazz/Funk)
    {v:"9", n:"Dominant 9"},
    {v:"maj9", n:"Major 9"},
    {v:"m9", n:"Minor 9"},
    {v:"add9", n:"Add 9"},
    {v:"11", n:"Dominant 11"},
    {v:"13", n:"Dominant 13"}
];

// --- ESCALAS COMPLETAS ---
const scales = [
    {v:"major", n:"Major (Ionian)"},
    {v:"minor", n:"Minor (Aeolian)"},
    {v:"major pentatonic", n:"Major Pentatonic"},
    {v:"minor pentatonic", n:"Minor Pentatonic"},
    {v:"blues", n:"Blues"},
    {v:"dorian", n:"Dorian"},
    {v:"phrygian", n:"Phrygian"},
    {v:"lydian", n:"Lydian"},
    {v:"mixolydian", n:"Mixolydian"},
    {v:"locrian", n:"Locrian"},
    {v:"harmonic minor", n:"Harmonic Minor"},
    {v:"melodic minor", n:"Melodic Minor"},
    {v:"whole tone", n:"Whole Tone"},
    {v:"diminished", n:"Diminished (H-W)"}
];

let currentTuning = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
let metroLoop, isMetroPlaying = false, currentBeat = 0, timeSignature = 4;
let metroSynthStrong, metroSynthWeak;

function init() {
    // Inicializar synths de metrónomo
    if (typeof Tone !== 'undefined') {
        metroSynthStrong = new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 10,
            oscillator: { type: "sine" },
            envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
        }).toDestination();
        metroSynthStrong.volume.value = -8;

        metroSynthWeak = new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 8,
            oscillator: { type: "sine" },
            envelope: { attack: 0.001, decay: 0.3, sustain: 0.01, release: 1.2 }
        }).toDestination();
        metroSynthWeak.volume.value = -12;
    }

    // Poblar notas root
    const rootSel = document.getElementById('root-note');
    if (rootSel) notes.forEach(n => rootSel.innerHTML += `<option value="${n}">${n}</option>`);

    // Event listeners para controles principales
    document.getElementById('mode-type')?.addEventListener('change', () => { 
        populateSubTypeOptions(); 
        update(); 
    });
    document.getElementById('root-note')?.addEventListener('change', update);
    document.getElementById('sub-type')?.addEventListener('change', update);

    // Event listener para cambio de afinación
    document.getElementById('tuning-select')?.addEventListener('change', (e) => {
        const val = e.target.value;
        switch(val) {
            case 'halfStep': currentTuning = ['Eb2','Ab2','Db3','Gb3','Bb3','Eb4']; break;
            case 'dStd':     currentTuning = ['D2','G2','C3','F3','A3','D4']; break;
            case 'dropD':    currentTuning = ['D2','A2','D3','G3','B3','E4']; break;
            case 'dropCs':   currentTuning = ['Db2','Ab2','Db3','Gb3','Bb3','Eb4']; break;
            case 'dropC':    currentTuning = ['C2','G2','C3','F3','A3','D4']; break;
            case 'openG':    currentTuning = ['D2','G2','D3','G3','B3','D4']; break;
            case 'openD':    currentTuning = ['D2','A2','D3','F#3','A3','D4']; break;
            case 'openE':    currentTuning = ['E2','B2','E3','G#3','B3','E4']; break;
            case 'dadgad':   currentTuning = ['D2','A2','D3','G3','A3','D4']; break;
            default:         currentTuning = ['E2','A2','D3','G3','B3','E4'];
        }
        buildFretboard();
    });

    // Event listener para botón Left/Right (CORREGIDO)
    document.getElementById('lefty-btn')?.addEventListener('click', (e) => {
        const container = document.querySelector('.fretboard-container');
        container.classList.toggle('lefty-mode');
        const textSpan = e.currentTarget.querySelector('.hand-text');
        if (textSpan) {
            textSpan.innerText = container.classList.contains('lefty-mode') ? "Left" : "Right";
        }
    });

    // Navegación con flechas
    const scroller = document.getElementById('scroller');
    document.getElementById('scroll-left')?.addEventListener('click', () => 
        scroller.scrollBy({ left: -200, behavior: 'smooth' })
    );
    document.getElementById('scroll-right')?.addEventListener('click', () => 
        scroller.scrollBy({ left: 200, behavior: 'smooth' })
    );

    // Drawer toggle (metrónomo)
    const footer = document.getElementById('metro-footer');
    const handle = document.getElementById('drawer-toggle');
    if(handle) {
        handle.onclick = () => footer.classList.toggle('collapsed');
    }
    
    // Iniciar colapsado en móvil
    if(window.innerWidth < 768) {
        footer?.classList.add('collapsed');
    }

    // BPM slider
    const bpmSlider = document.getElementById('bpm-slider');
    const bpmDisplay = document.getElementById('bpm-display');
    if(bpmSlider) {
        bpmSlider.oninput = (e) => {
            const val = e.target.value;
            if(bpmDisplay) bpmDisplay.innerText = val;
            if(typeof Tone !== 'undefined') Tone.Transport.bpm.value = val;
        };
    }

    // Time signature selector
    const timeSigSelect = document.getElementById('time-signature');
    if(timeSigSelect) {
        timeSigSelect.addEventListener('change', (e) => {
            timeSignature = parseInt(e.target.value);
            updateBeatIndicators();
            // Reiniciar metrónomo si está activo
            if(isMetroPlaying) {
                stopMetronome();
                setTimeout(() => startMetronome(), 100);
            }
        });
    }

    // Botón metrónomo
    const metroBtn = document.getElementById('metro-btn');
    if (metroBtn) {
        metroBtn.onclick = async () => {
            if (typeof Tone === 'undefined') return;
            if (Tone.context.state !== 'running') await Tone.start();
            isMetroPlaying ? stopMetronome() : startMetronome();
        };
    }

    // Inicializar
    populateSubTypeOptions();
    buildFretboard();
    updateBeatIndicators();
}

function updateBeatIndicators() {
    const container = document.querySelector('.beat-indicators');
    if (!container) return;
    
    container.innerHTML = '';
    for (let i = 0; i < timeSignature; i++) {
        const indicator = document.createElement('div');
        indicator.className = 'beat-indicator';
        container.appendChild(indicator);
    }
}

function startMetronome() {
    currentBeat = 0;
    
    metroLoop = new Tone.Loop(time => {
        // Beat fuerte vs débil
        if (currentBeat === 0) {
            metroSynthStrong.triggerAttackRelease("C2", "16n", time);
        } else {
            metroSynthWeak.triggerAttackRelease("C1", "16n", time);
        }
        
        // Actualizar indicadores visuales
        Tone.Draw.schedule(() => {
            document.querySelectorAll('.beat-indicator').forEach((ind, i) => {
                ind.classList.toggle('active', i === currentBeat);
            });
        }, time);
        
        currentBeat = (currentBeat + 1) % timeSignature;
    }, "4n").start(0);
    
    Tone.Transport.start();
    document.getElementById('metro-btn')?.classList.add('active');
    isMetroPlaying = true;
}

function stopMetronome() {
    Tone.Transport.stop();
    if(metroLoop) { 
        metroLoop.stop(); 
        metroLoop.dispose(); 
    }
    document.getElementById('metro-btn')?.classList.remove('active');
    isMetroPlaying = false;
    currentBeat = 0;
    
    // Limpiar indicadores
    document.querySelectorAll('.beat-indicator').forEach(ind => 
        ind.classList.remove('active')
    );
}

function buildFretboard() {
    const fb = document.getElementById('fretboard');
    if (!fb) return;
    
    fb.innerHTML = '';
    for (let i = 5; i >= 0; i--) {
        const str = document.createElement('div');
        str.className = 'string';
        str.id = `string-${i}`;
        for (let f = 0; f <= 22; f++) {
            const noteName = Tonal.Note.transpose(currentTuning[i], Tonal.Interval.fromSemitones(f));
            str.innerHTML += `<div class="fret"><div class="note" data-pc="${Tonal.Note.pitchClass(noteName)}"></div></div>`;
        }
        fb.appendChild(str);
    }
    buildFretNumbers();
    update();
}

function buildFretNumbers() {
    document.querySelector('.fret-numbers-row')?.remove();
    const scroller = document.getElementById('scroller');
    if (!scroller) return;
    
    const numRow = document.createElement('div');
    numRow.className = 'fret-numbers-row';
    const keyFrets = [3, 5, 7, 9, 12, 15, 17, 19, 21];
    
    for (let f = 0; f <= 22; f++) {
        const numDiv = document.createElement('div');
        numDiv.className = 'fret-number';
        if (keyFrets.includes(f)) numDiv.classList.add('key-fret');
        numDiv.innerText = f === 0 ? "" : f;
        numRow.appendChild(numDiv);
    }
    scroller.appendChild(numRow);
}

function populateSubTypeOptions() {
    const isScale = document.getElementById('mode-type')?.value === 'scale';
    const sub = document.getElementById('sub-type');
    if (!sub) return;
    
    sub.innerHTML = '';
    const collection = isScale ? scales : chords;
    collection.forEach(item => {
        sub.innerHTML += `<option value="${item.v}">${item.n}</option>`;
    });
}

function update() {
    const root = document.getElementById('root-note')?.value;
    const mode = document.getElementById('mode-type')?.value;
    const type = document.getElementById('sub-type')?.value;
    
    if (!root || !mode || !type) return;
    
    const data = mode === 'chord' 
        ? Tonal.Chord.get(root + type) 
        : Tonal.Scale.get(`${root} ${type}`);

    document.querySelectorAll('.note').forEach(n => {
        const idx = data.notes.indexOf(n.dataset.pc);
        n.classList.toggle('active', idx !== -1);
        n.innerText = idx !== -1 ? n.dataset.pc : '';
        
        if(idx !== -1 && data.intervals) {
            const int = data.intervals[idx];
            n.className = 'note active ' + (
                int === '1P' ? 'interval-1P' :
                int.includes('3') ? 'interval-3rd' :
                int.includes('5') ? 'interval-5th' :
                'interval-other'
            );
        }
    });
}

window.onload = init;
