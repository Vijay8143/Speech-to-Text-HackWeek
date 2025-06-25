// Replace with your Deepgram API key
const DEEPGRAM_API_KEY = 'fa21dc248e6f0af345fac9eff7549b44a954db5b';
let deepgramSocket;
let isRecording = false;
let mediaRecorder;
let audioChunks = [];

// DOM elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusEl = document.getElementById('status');
const transcriptEl = document.getElementById('transcript');

// Initialize Deepgram connection
function initDeepgram() {
    deepgramSocket = new WebSocket('wss://api.deepgram.com/v1/listen', [
        'token',
        DEEPGRAM_API_KEY
    ]);

    deepgramSocket.onopen = () => {
        statusEl.textContent = 'Connected to Deepgram';
        console.log('Deepgram connection established');
    };

    deepgramSocket.onmessage = (message) => {
        const data = JSON.parse(message.data);
        if (data.channel && data.channel.alternatives && data.channel.alternatives[0]) {
            const transcript = data.channel.alternatives[0].transcript;
            if (transcript && data.is_final) {
                transcriptEl.value += transcript + ' ';
            }
        }
    };

    deepgramSocket.onclose = () => {
        if (isRecording) {
            statusEl.textContent = 'Connection lost - try again';
            console.log('Deepgram connection closed');
        }
    };

    deepgramSocket.onerror = (error) => {
        statusEl.textContent = 'Connection error - try again';
        console.error('Deepgram error:', error);
    };
}

// Start recording
async function startRecording() {
    try {
        statusEl.textContent = 'Starting...';
        
        // Initialize Deepgram connection
        initDeepgram();
        
        // Get microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && deepgramSocket.readyState === WebSocket.OPEN) {
                deepgramSocket.send(event.data);
            }
        };
        
        mediaRecorder.start(250); // Send data every 250ms
        
        mediaRecorder.onstart = () => {
            isRecording = true;
            startBtn.disabled = true;
            stopBtn.disabled = false;
            statusEl.textContent = 'Listening... Speak now!';
            transcriptEl.value = ''; // Clear previous transcript
            console.log('Recording started');
        };
        
    } catch (error) {
        console.error('Error starting recording:', error);
        statusEl.textContent = 'Error accessing microphone';
        startBtn.disabled = false;
        stopBtn.disabled = true;
    }
}

// Stop recording
function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        
        mediaRecorder.onstop = () => {
            isRecording = false;
            startBtn.disabled = false;
            stopBtn.disabled = true;
            statusEl.textContent = 'Ready';
            
            if (deepgramSocket) {
                deepgramSocket.close();
            }
            
            console.log('Recording stopped');
        };
    }
}

// Event listeners
startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);

// Initial state
stopBtn.disabled = true;