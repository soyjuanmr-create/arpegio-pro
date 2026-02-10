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

// --- CONFIGURACIÓN DE AUDIO ---
const playBtn = document.getElementById('play-btn');
if(playBtn) { playBtn.disabled = true; }

const synth = new Tone.Sampler({
    urls: { "A2":"A2.mp3", "C4":"C4.mp3", "E2":"E2.mp3", "E4":"E4.mp3" },
    release: 1,
    baseUrl: "https://tonejs.github.io/audio/guitar-acoustic/",
    onload: () => {
        console.log("✅ Audio Loaded");
        if(playBtn) {
            playBtn.disabled = false;
            playBtn.style.color = '#2ed573';
            setTimeout(() => playBtn.style.color = '', 1000);
        }
    }
}).toDestination();

// Metrónomo
let metroLoop;
let isMetroPlaying = false;
const metroSynth = new Tone.MembraneSynth({
    pitchDecay: 0.05, octaves: 10, oscillator: { type: "sine" },
    envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4, attackCurve: "exponential" }
}).toDestination();
metroSynth.volume.value = -10;

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

    document.getElementById('lefty-btn').addEventListener('click', (e) => {
        const container = document.querySelector('.fretboard-container');
        container.classList.toggle('lefty-mode');
        e.target.innerText = container.classList.contains('lefty-mode') ? "Lefty" : "Righty";
    });

    const scroller = document.getElementById('scroller');
    document.getElementById('scroll-left').addEventListener('click', () => {
        scroller.scrollBy({ left: -200, behavior: 'smooth' });
    });
    document.getElementById('scroll-right').addEventListener('click', () => {
        scroller.scrollBy({ left: 200, behavior: 'smooth' });
    });

    // Metrónomo
    const bpmSlider = document.getElementById('bpm-slider');
    const bpmDisplay = document.getElementById('bpm-display');
    const metroBtn = document.getElementById('metro-btn');

    bpmSlider.oninput = (e) => {
        const val = e.target.value;
        if(bpmDisplay) bpmDisplay.innerText = val;
        Tone.Transport.bpm.value = val;
    };

    metroBtn.onclick = async () => {
        if (Tone.context.state !== 'running') await Tone.start();
        if (!isMetroPlaying) {
            metroLoop = new Tone.Loop(time => {
                metroSynth.triggerAttackRelease("C1", "8n", time);
            }, "4n").start(0);
            Tone.Transport.start();
            metroBtn.classList.add('active');
            isMetroPlaying = true;
        } else {
            Tone.Transport.stop();
            if(metroLoop) { metroLoop.stop(); metroLoop.dispose(); }
            metroBtn.classList.remove('active');
            isMetroPlaying = false;
        }
    };

    playBtn.onclick = async () => {
        if (Tone.context.state !== 'running') await Tone.start();
        const activeNotes = Array.from(document.querySelectorAll('.note.active'));
        const now = Tone.now();
        activeNotes.forEach((noteDiv, i) => {
            const noteName = noteDiv.dataset.full;
            if(noteName) synth.triggerAttackRelease(noteName, "2n", now + (i * 0.05));
        });
    };

    loadStateFromURL(); 
    
    if (!document.getElementById('fretboard').innerHTML) {
        populateSubTypeOptions();
        buildFretboard();
        update();
    }
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

    // FIX: Ahora dice "Arpeggio" en el título en vez de "Chord"
    const modeLabel = mode === 'scale' ? 'Scale' : 'Arpeggio';
    document.title = `${root} ${typeName} (${modeLabel}) | Arpeggio Pro`;
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
            str.innerHTML += `<div class="fret"><div class="note" data-pc="${Tonal.Note.pitchClass(noteName)}" data-full="${noteName}" onclick="playNote('${noteName}', ${i})"></div></div>`;
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
        // Obtenemos los datos del acorde (que visualmente es un arpegio)
        data = Tonal.Chord.get(root + type);
    } else {
        data = Tonal.Scale.get(`${root} ${type}`);
    }

    updateUrlState(root, mode, type, typeName);

    const labelDiv = document.getElementById('chord-label');
    // Si es modo acorde, añadimos "Arpeggio" al título visible
    if(labelDiv) {
        labelDiv.innerText = `${root} ${typeName}`;
    }

    document.querySelectorAll('.note').forEach(n => {
        n.className = 'note'; n.innerText = '';
        const idx = data.notes.indexOf(n.dataset.pc);
        if (idx !== -1) {
            n.classList.add('active');
            if(n.dataset.pc === root) n.classList.add('interval-1P');
            else n.classList.add('interval-3M');
            n.innerText = n.dataset.pc;
        }
    });
}

async function playNote(note, sIdx) {
    if (Tone.context.state !== 'running') await Tone.start();
    synth.triggerAttackRelease(note, "1n");
    const s = document.getElementById(`string-${sIdx}`);
    if(s) {
        s.classList.add('vibrating');
        setTimeout(() => s.classList.remove('vibrating'), 300);
    }
}
window.onload = init;