const notes = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const chords = [
    {v:"major", n:"Mayor"}, {v:"minor", n:"Menor"}, 
    {v:"7", n:"7ma"}, {v:"maj7", n:"Maj7"}, 
    {v:"m7", n:"m7"}, {v:"dim", n:"Disminuido"}
];

// Lista ampliada de escalas PRO
const scales = [
    {v:"major", n:"Mayor (Jónica)"},
    {v:"minor", n:"Menor (Eólica)"},
    {v:"major pentatonic", n:"Pentatónica Mayor"},
    {v:"minor pentatonic", n:"Pentatónica Menor"},
    {v:"blues", n:"Blues"},
    {v:"dorian", n:"Dórica"},
    {v:"phrygian", n:"Frigia"},
    {v:"lydian", n:"Lidia"},
    {v:"mixolydian", n:"Mixolidia"},
    {v:"locrian", n:"Locria"},
    {v:"harmonic minor", n:"Menor Armónica"}
];

let currentTuning = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];

// --- 1. CONFIGURACIÓN DE AUDIO (TONE.JS) ---
const playBtn = document.getElementById('play-btn');
if(playBtn) {
    playBtn.innerText = "⏳ CARGANDO...";
    playBtn.disabled = true;
    playBtn.style.opacity = "0.5";
}

const synth = new Tone.Sampler({
    urls: {
        "A2": "A2.mp3",
        "C4": "C4.mp3",
        "E2": "E2.mp3",
        "E4": "E4.mp3"
    },
    release: 1,
    baseUrl: "https://tonejs.github.io/audio/guitar-acoustic/",
    onload: () => {
        console.log("✅ Audio cargado");
        if(playBtn) {
            playBtn.innerText = "REPRODUCIR";
            playBtn.disabled = false;
            playBtn.style.opacity = "1";
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

// --- 2. INICIALIZACIÓN ---
function init() {
    // Llenar Selectores
    const rootSel = document.getElementById('root-note');
    notes.forEach(n => rootSel.innerHTML += `<option value="${n}">${n}</option>`);
    
    // Listeners
    document.getElementById('mode-type').addEventListener('change', updateSelectors);
    document.getElementById('root-note').addEventListener('change', update);
    document.getElementById('sub-type').addEventListener('change', update);
    
    // Afinación
    document.getElementById('tuning-select').addEventListener('change', (e) => {
        currentTuning = e.target.value === 'standard' ? ['E2','A2','D3','G3','B3','E4'] : ['D2','A2','D3','G3','B3','E4'];
        buildFretboard();
    });

    // Modo Zurdo
    document.getElementById('lefty-btn').addEventListener('click', (e) => {
        const container = document.querySelector('.fretboard-container');
        container.classList.toggle('lefty-mode');
        e.target.innerText = container.classList.contains('lefty-mode') ? "Zurdo" : "Diestro";
    });

    // Navegación (Flechas)
    const scroller = document.getElementById('scroller');
    document.getElementById('scroll-left').addEventListener('click', () => {
        scroller.scrollBy({ left: -200, behavior: 'smooth' });
    });
    document.getElementById('scroll-right').addEventListener('click', () => {
        scroller.scrollBy({ left: 200, behavior: 'smooth' });
    });

    // Metrónomo UI
    const bpmSlider = document.getElementById('bpm-slider');
    const bpmDisplay = document.getElementById('bpm-display');
    const metroBtn = document.getElementById('metro-btn');

    bpmSlider.oninput = (e) => {
        const val = e.target.value;
        bpmDisplay.innerText = val;
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

    // Botón Reproducir
    playBtn.onclick = async () => {
        if (Tone.context.state !== 'running') await Tone.start();
        const activeNotes = Array.from(document.querySelectorAll('.note.active'));
        const now = Tone.now();
        activeNotes.forEach((noteDiv, i) => {
            const noteName = noteDiv.dataset.full;
            if(noteName) synth.triggerAttackRelease(noteName, "2n", now + (i * 0.05));
        });
    };

    updateSelectors();
    buildFretboard();
}

function updateSelectors() {
    const isScale = document.getElementById('mode-type').value === 'scale';
    const sub = document.getElementById('sub-type');
    sub.innerHTML = '';
    (isScale ? scales : chords).forEach(item => sub.innerHTML += `<option value="${item.v}">${item.n}</option>`);
    update();
}

// --- 3. CONSTRUCCIÓN DEL DIAPASÓN ---
function buildFretboard() {
    const fb = document.getElementById('fretboard');
    fb.innerHTML = '';
    
    // Cuerdas (de la 6 a la 1 visualmente si es tablatura, aquí usamos índices 5 a 0)
    for (let i = 5; i >= 0; i--) {
        const str = document.createElement('div');
        str.className = 'string';
        str.id = `string-${i}`;
        
        for (let f = 0; f <= 22; f++) {
            const noteName = Tonal.Note.transpose(currentTuning[i], Tonal.Interval.fromSemitones(f));
            str.innerHTML += `<div class="fret">
                                <div class="note" 
                                     data-pc="${Tonal.Note.pitchClass(noteName)}" 
                                     data-full="${noteName}" 
                                     onclick="playNote('${noteName}', ${i})">
                                </div>
                              </div>`;
        }
        fb.appendChild(str);
    }

    buildFretNumbers();
    update();
}

// Construir números inferiores (Alineados pero sin el 0)
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
        
        // TRUCO: Si es 0, texto vacío. Si no, el número.
        numDiv.innerText = (f === 0) ? "" : f;
        
        numRow.appendChild(numDiv);
    }
    scroller.appendChild(numRow);
}

function update() {
    const root = document.getElementById('root-note').value;
    const mode = document.getElementById('mode-type').value;
    const type = document.getElementById('sub-type').value;
    
    if(!Tonal) return;

    let data;
    if (mode === 'chord') {
        data = Tonal.Chord.get(root + type);
    } else {
        data = Tonal.Scale.get(`${root} ${type}`);
    }

    document.querySelectorAll('.note').forEach(n => {
        n.className = 'note';
        n.innerText = '';
        
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