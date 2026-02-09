const fretboard = document.getElementById('fretboard');
const scroller = document.getElementById('scroller');
const playBtn = document.getElementById('play-btn'); // Referencia al botón

// --- ESTADO DE LA APP ---
let isPremium = false; 

// 1. Verificar persistencia
if(localStorage.getItem('arpeggio_status') === 'premium') {
    isPremium = true;
    console.log("💎 Usuario Premium detectado");
}

const notes = ["C", "C#", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const chords = [
    {v:"major", n:"Mayor"}, {v:"minor", n:"Menor"}, 
    {v:"7", n:"7ma"}, {v:"maj7", n:"Maj7"}, 
    {v:"m7", n:"m7"}, {v:"dim", n:"Dim"}
];
const tuning = { 
    standard: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], 
    dropD: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'] 
};

// --- INICIALIZACIÓN VISUAL ---
document.getElementById('root-note').innerHTML = '';
document.getElementById('chord-type').innerHTML = '';
notes.forEach(n => document.getElementById('root-note').innerHTML += `<option value="${n}">${n}</option>`);
chords.forEach(c => document.getElementById('chord-type').innerHTML += `<option value="${c.v}">${c.n}</option>`);


// --- 🎸 SONIDO PROFESIONAL (CON INDICADOR DE CARGA) ---

// Bloqueamos el botón mientras carga para evitar confusión
if(playBtn) {
    playBtn.innerText = "⏳ CARGANDO...";
    playBtn.style.opacity = "0.5";
    playBtn.disabled = true;
}

const reverb = new Tone.Reverb({ decay: 2.0, preDelay: 0.1, wet: 0.3 }).toDestination();

const synth = new Tone.Sampler({
    urls: {
        "F#2": "Fs2.mp3",
        "F#3": "Fs3.mp3",
        "F#4": "Fs4.mp3",
        "F#5": "Fs5.mp3"
    },
    release: 1,
    baseUrl: "https://tonejs.github.io/audio/guitar-acoustic/",
    onload: () => {
        console.log("✅ Sonidos cargados correctamente");
        if(playBtn) {
            playBtn.innerText = "REPRODUCIR";
            playBtn.style.opacity = "1";
            playBtn.disabled = false;
        }
    }
}).connect(reverb);

// --- 🔓 DESBLOQUEO DE AUDIO (CRÍTICO PARA MÓVILES) ---
// Los móviles bloquean el audio hasta que tocas la pantalla.
// Esto fuerza el inicio del motor de audio con el PRIMER clic en cualquier sitio.
document.body.addEventListener('click', async () => {
    if (Tone.context.state !== 'running') {
        await Tone.start();
        console.log("🔊 Motor de Audio Iniciado");
    }
}, { once: true });


// --- FUNCIONES PRINCIPALES ---

function build() {
    fretboard.innerHTML = '';
    const tVal = document.getElementById('tuning-select').value;
    const t = tuning[tVal] || tuning['standard'];
    
    for (let i = 5; i >= 0; i--) {
        const str = document.createElement('div');
        str.className = 'string';
        for (let f = 0; f <= 22; f++) {
            // Nota: Pasamos el nombre de la nota entre comillas simples a la función play
            const noteName = Tonal.Note.transpose(t[i], Tonal.Interval.fromSemitones(f));
            const pc = Tonal.Note.pitchClass(noteName);
            // IMPORTANTE: onclick llama a play() pasando el nombre de la nota
            str.innerHTML += `<div class="fret"><div class="note" data-pc="${pc}" onclick="play('${noteName}')"></div></div>`;
        }
        fretboard.appendChild(str);
    }
    update();
}

function update() {
    const root = document.getElementById('root-note').value;
    const type = document.getElementById('chord-type').value;
    const view = document.getElementById('view-mode').value;
    
    if(!root || !type || typeof Tonal === 'undefined') return;

    const chord = Tonal.Chord.get(root + type);
    
    document.querySelectorAll('.note').forEach(n => {
        n.classList.remove('active');
        const idx = chord.notes.indexOf(n.dataset.pc);
        if (idx !== -1) {
            n.classList.add('active');
            const interval = chord.intervals[idx];
            n.dataset.interval = interval;
            n.innerText = view === 'notes' ? n.dataset.pc : interval;
        }
    });
}

// Función para tocar una nota individual (al hacer clic en el traste)
async function play(note) {
    // Doble chequeo de seguridad para arrancar el audio
    if (Tone.context.state !== 'running') {
        await Tone.start();
    }
    
    // Reproducir nota
    // La duración "2n" da un sonido más largo y natural
    try {
        synth.triggerAttackRelease(note, "2n");
    } catch (e) {
        console.error("Error al reproducir:", e);
    }
}


// --- MODAL PREMIUM ---
const modal = document.getElementById('premium-modal');
const closeModal = document.getElementById('close-modal');
const buyBtn = document.getElementById('buy-btn');

function showPremiumModal() { modal.classList.add('active'); }
if(closeModal) closeModal.onclick = () => modal.classList.remove('active');
if(buyBtn) {
    buyBtn.onclick = () => {
        alert("¡Compra exitosa! Eres PRO.");
        isPremium = true;
        modal.classList.remove('active');
        localStorage.setItem('arpeggio_status', 'premium');
        location.reload(); 
    };
}
window.resetPremium = function() {
    localStorage.removeItem('arpeggio_status');
    isPremium = false;
    alert("Premium reseteado.");
    location.reload();
}

// --- LISTENERS ---
document.getElementById('tuning-select').addEventListener('change', (e) => {
    if (e.target.value !== 'standard' && !isPremium) {
        e.target.value = 'standard';
        showPremiumModal();
        return;
    }
    build();
});

document.getElementById('material-select').addEventListener('change', (e) => {
    if (e.target.value !== 'ebony' && !isPremium) {
        e.target.value = 'ebony';
        scroller.className = 'fretboard-scroll ebony'; 
        showPremiumModal();
        return;
    }
    scroller.className = 'fretboard-scroll ' + e.target.value;
});

// Botón Reproducir (Arpegio completo)
if(playBtn) {
    playBtn.onclick = async () => {
        if(Tone.context.state !== 'running') await Tone.start();
        
        const root = document.getElementById('root-note').value;
        const chord = Tonal.Chord.get(root + document.getElementById('chord-type').value);
        
        const now = Tone.now();
        chord.notes.forEach((n, i) => {
            // Subimos octava para que suene brillante
            synth.triggerAttackRelease(n + "3", "8n", now + i * 0.25);
        });
    };
}

document.getElementById('lefty-btn').onclick = (e) => {
    fretboard.classList.toggle('lefty-mode');
    e.target.innerText = fretboard.classList.contains('lefty-mode') ? "Zurdo" : "Diestro";
};

document.getElementById('root-note').onchange = update;
document.getElementById('chord-type').onchange = update;
document.getElementById('view-mode').onchange = update;

function scrollF(dir) { 
    scroller.scrollBy({ left: dir ? 300 : -300, behavior: 'smooth' }); 
}

// Iniciar
window.addEventListener('load', () => {
    build();
});