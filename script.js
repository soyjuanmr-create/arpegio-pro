const notes = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

// --- 1. LIBRERÍA DE ARPEGIOS AMPLIADA (PRO) ---
const chords = [
    // Triadas Básicas
    {v:"major", n:"Major (Triad)"},
    {v:"minor", n:"Minor (Triad)"},
    {v:"aug", n:"Augmented (+)"},
    {v:"dim", n:"Diminished (°) "},
    {v:"sus2", n:"Sus2"},
    {v:"sus4", n:"Sus4"},

    // Séptimas (Las más usadas)
    {v:"maj7", n:"Major 7 (Maj7)"},
    {v:"m7", n:"Minor 7 (m7)"},
    {v:"7", n:"Dominant 7"},
    {v:"m7b5", n:"Half Diminished (m7b5)"},
    {v:"dim7", n:"Diminished 7 (dim7)"},
    {v:"mM7", n:"Minor Major 7 (mMaj7)"},

    // Sextas
    {v:"6", n:"Major 6"},
    {v:"m6", n:"Minor 6"},

    // Extensiones (9, 11, 13 - Jazz/Funk)
    {v:"9", n:"Dominant 9"},
    {v:"maj9", n:"Major 9"},
    {v:"m9", n:"Minor 9"},
    {v:"add9", n:"Add 9"},
    {v:"11", n:"Dominant 11"},
    {v:"13", n:"Dominant 13"}
];

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

// --- METRÓNOMO MEJORADO ---
let metroLoop;
let isMetroPlaying = false;
let currentBeat = 0;
let timeSignature = 4; // 4/4 por defecto

// Crear dos synths diferentes para beat fuerte y débil
const metroSynthStrong = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 10,
    oscillator: { type: "sine" },
    envelope: { 
        attack: 0.001, 
        decay: 0.4, 
        sustain: 0.01, 
        release: 1.4, 
        attackCurve: "exponential" 
    }
}).toDestination();
metroSynthStrong.volume.value = -8;

const metroSynthWeak = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 8,
    oscillator: { type: "sine" },
    envelope: { 
        attack: 0.001, 
        decay: 0.3, 
        sustain: 0.01, 
        release: 1.2, 
        attackCurve: "exponential" 
    }
}).toDestination();
metroSynthWeak.volume.value = -12;

// --- INIT ---
function init() {
    const rootSel = document.getElementById('root-note');
    notes.forEach(n => rootSel.innerHTML += `<option value="${n}">${n}</option>`);
    
    document.getElementById('mode-type').addEventListener('change', () => {
        populateSubTypeOptions(); 
        update();
    });
    
    document.getElementById('root-note').addEventListener('change', update);
    document.getElementById('sub-type').addEventListener('change', update);
    
    document.getElementById('tuning-select').addEventListener('change', (e) => {
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

    // Handedness toggle (nuevo botón)
    document.getElementById('lefty-btn').addEventListener('click', (e) => {
        const container = document.querySelector('.fretboard-container');
        container.classList.toggle('lefty-mode');
        const textSpan = e.currentTarget.querySelector('.hand-text');
        textSpan.innerText = container.classList.contains('lefty-mode') ? "Left" : "Right";
    });

    const scroller = document.getElementById('scroller');
    document.getElementById('scroll-left').addEventListener('click', () => {
        scroller.scrollBy({ left: -200, behavior: 'smooth' });
    });
    document.getElementById('scroll-right').addEventListener('click', () => {
        scroller.scrollBy({ left: 200, behavior: 'smooth' });
    });

    // --- METRÓNOMO MEJORADO ---
    const bpmSlider = document.getElementById('bpm-slider');
    const bpmDisplay = document.getElementById('bpm-display');
    const metroBtn = document.getElementById('metro-btn');
    const timeSigSelect = document.getElementById('time-signature');

    // Cambio de BPM
    bpmSlider.oninput = (e) => {
        const val = e.target.value;
        if(bpmDisplay) bpmDisplay.innerText = val;
        Tone.Transport.bpm.value = val;
    };

    // Cambio de compás
    if(timeSigSelect) {
        timeSigSelect.addEventListener('change', (e) => {
            timeSignature = parseInt(e.target.value);
            // Actualizar indicadores visuales
            updateBeatIndicators();
            // Reiniciar el metrónomo si está sonando
            if(isMetroPlaying) {
                stopMetronome();
                setTimeout(() => startMetronome(), 100);
            }
        });
    }

    // Click en botón de metrónomo
    metroBtn.onclick = async () => {
        if (Tone.context.state !== 'running') {
            await Tone.start();
        }
        
        if (!isMetroPlaying) {
            startMetronome();
        } else {
            stopMetronome();
        }
    };

    // Tap tempo (doble click en el botón)
    let lastTap = 0;
    let tapTimes = [];
    metroBtn.addEventListener('dblclick', (e) => {
        e.preventDefault();
        const now = Date.now();
        
        if (now - lastTap < 2000) { // Dentro de 2 segundos
            tapTimes.push(now - lastTap);
            
            if (tapTimes.length >= 3) {
                // Calcular BPM promedio
                const avgInterval = tapTimes.reduce((a, b) => a + b) / tapTimes.length;
                const bpm = Math.round(60000 / avgInterval);
                
                if (bpm >= 40 && bpm <= 220) {
                    bpmSlider.value = bpm;
                    bpmDisplay.innerText = bpm;
                    Tone.Transport.bpm.value = bpm;
                    
                    // Feedback visual
                    metroBtn.style.transform = 'scale(1.1)';
                    setTimeout(() => metroBtn.style.transform = '', 100);
                }
                
                tapTimes = [];
            }
        } else {
            tapTimes = [];
        }
        
        lastTap = now;
    });

    loadStateFromURL(); 
    
    if (!document.getElementById('fretboard').innerHTML) {
        populateSubTypeOptions();
        buildFretboard();
        update();
    }

    // Inicializar beat indicators
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
        // Beat fuerte en el primer tiempo
        if (currentBeat === 0) {
            metroSynthStrong.triggerAttackRelease("C2", "16n", time);
        } else {
            metroSynthWeak.triggerAttackRelease("C1", "16n", time);
        }
        
        // Actualizar contador visual
        Tone.Draw.schedule(() => {
            updateMetronomeVisual(currentBeat);
        }, time);
        
        currentBeat = (currentBeat + 1) % timeSignature;
    }, "4n").start(0);
    
    Tone.Transport.start();
    document.getElementById('metro-btn').classList.add('active');
    isMetroPlaying = true;
}

function stopMetronome() {
    Tone.Transport.stop();
    if(metroLoop) { 
        metroLoop.stop(); 
        metroLoop.dispose(); 
    }
    document.getElementById('metro-btn').classList.remove('active');
    isMetroPlaying = false;
    currentBeat = 0;
    
    // Limpiar indicadores visuales
    document.querySelectorAll('.beat-indicator').forEach(el => {
        el.classList.remove('active');
    });
}

function updateMetronomeVisual(beat) {
    const indicators = document.querySelectorAll('.beat-indicator');
    indicators.forEach((indicator, index) => {
        if (index === beat) {
            indicator.classList.add('active');
        } else {
            indicator.classList.remove('active');
        }
    });
}

function loadStateFromURL() {
    const params = new URLSearchParams(window.location.search);
    const root = params.get('root');
    const mode = params.get('mode');
    const type = params.get('type');

    if(root && mode && type) {
        const rootEl = document.getElementById('root-note');
        if(rootEl.querySelector(`option[value="${root}"]`)) rootEl.value = root;
        const modeEl = document.getElementById('mode-type');
        modeEl.value = mode;
        populateSubTypeOptions();
        const typeEl = document.getElementById('sub-type');
        if(typeEl.querySelector(`option[value="${type}"]`)) typeEl.value = type;
        buildFretboard();
        setTimeout(update, 50); 
    }
}

function updateUrlState(root, mode, type, typeName) {
    const params = new URLSearchParams();
    params.set('root', root);
    params.set('mode', mode);
    params.set('type', type);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);

    const modeLabel = mode === 'scale' ? 'Scale' : 'Arpeggio';
    document.title = `${root} ${typeName} (${modeLabel}) | Arpeggio Pro`;

    // Actualizar indicador compacto (solo desktop)
    const indicator = document.getElementById('current-scale-indicator');
    if (indicator) {
        indicator.innerText = `${root} ${typeName}`;
    }
}

function populateSubTypeOptions() {
    const isScale = document.getElementById('mode-type').value === 'scale';
    const sub = document.getElementById('sub-type');
    sub.innerHTML = ''; 
    const collection = isScale ? scales : chords;
    collection.forEach(item => {
        sub.innerHTML += `<option value="${item.v}" data-name="${item.n}">${item.n}</option>`;
    });
}

function buildFretboard() {
    const fb = document.getElementById('fretboard');
    fb.innerHTML = '';
    for (let i = 5; i >= 0; i--) {
        const str = document.createElement('div');
        str.className = 'string';
        str.id = `string-${i}`;
        for (let f = 0; f <= 22; f++) {
            const noteName = Tonal.Note.transpose(currentTuning[i], Tonal.Interval.fromSemitones(f));
            str.innerHTML += `<div class="fret"><div class="note" data-pc="${Tonal.Note.pitchClass(noteName)}" data-full="${noteName}"></div></div>`;
        }
        fb.appendChild(str);
    }
    buildFretNumbers();
    update();
}

function buildFretNumbers() {
    const existingRow = document.querySelector('.fret-numbers-row');
    if(existingRow) existingRow.remove();
    const scroller = document.getElementById('scroller');
    const numRow = document.createElement('div');
    numRow.className = 'fret-numbers-row';
    const keyFrets = [3, 5, 7, 9, 12, 15, 17, 19, 21];
    for (let f = 0; f <= 22; f++) {
        const numDiv = document.createElement('div');
        numDiv.className = 'fret-number';
        if (keyFrets.includes(f)) numDiv.classList.add('key-fret');
        numDiv.innerText = (f === 0) ? "" : f;
        numRow.appendChild(numDiv);
    }
    scroller.appendChild(numRow);
}

function update() {
    if(!Tonal) return;
    const root = document.getElementById('root-note').value;
    const mode = document.getElementById('mode-type').value;
    const typeSelect = document.getElementById('sub-type');
    const type = typeSelect.value;
    const typeName = typeSelect.options[typeSelect.selectedIndex]?.text || type;

    let data;
    if (mode === 'chord') {
        data = Tonal.Chord.get(root + type);
    } else {
        data = Tonal.Scale.get(`${root} ${type}`);
    }

    updateUrlState(root, mode, type, typeName);

    document.querySelectorAll('.note').forEach(n => {
        n.className = 'note'; n.innerText = '';
        const idx = data.notes.indexOf(n.dataset.pc);
        if (idx !== -1) {
            n.classList.add('active');
            const interval = data.intervals[idx];
            if (interval === '1P')                              n.classList.add('interval-1P');
            else if (interval === '3m' || interval === '3M')   n.classList.add('interval-3rd');
            else if (interval === '5P')                        n.classList.add('interval-5th');
            else if (interval === '7m' || interval === '7M')   n.classList.add('interval-7th');
            else                                                n.classList.add('interval-other');
            n.innerText = n.dataset.pc;
        }
    });
}

window.onload = init;
