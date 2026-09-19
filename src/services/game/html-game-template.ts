import { GameData, GameQuestion, GameTemplateId } from '@/types/game.types';

export class HtmlGameTemplateBuilder {
  /**
   * Biên dịch GameData thành 1 file HTML duy nhất chạy hoàn toàn độc lập
   */
  public static buildStandaloneHtml(gameData: {
    title: string;
    lessonCode: string;
    templateId: GameTemplateId;
    questions: GameQuestion[];
  }): string {
    const questionsJson = JSON.stringify(gameData.questions);
    const title = gameData.title || 'TRÒ CHƠI TOÁN HỌC TƯƠNG TÁC';
    const lessonCode = gameData.lessonCode || 'TOAN-8';

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} - ${lessonCode}</title>
  <!-- KaTeX CSS & JS for Math Rendering -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" />
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>

  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>

  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: radial-gradient(circle at top, #1e1b4b, #0f172a, #020617);
      color: #f8fafc;
      min-height: 100vh;
      overflow-x: hidden;
      user-select: none;
    }
    .glass-card {
      background: rgba(30, 41, 59, 0.75);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
    }
    .option-btn {
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .option-btn:hover:not(:disabled) {
      transform: translateY(-2px) scale(1.01);
      box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.5);
    }
    .option-btn:active:not(:disabled) {
      transform: translateY(0) scale(0.99);
    }
    @keyframes pulse-glow {
      0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(99, 102, 241, 0.6)); }
      50% { transform: scale(1.03); filter: drop-shadow(0 0 25px rgba(168, 85, 247, 0.8)); }
    }
    .glow-anim {
      animation: pulse-glow 3s infinite ease-in-out;
    }
    canvas#confetti-canvas {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 999;
    }
  </style>
</head>
<body class="flex flex-col items-center justify-center p-4 md:p-6 min-h-screen">
  <canvas id="confetti-canvas"></canvas>

  <!-- Top Info Bar -->
  <header class="w-full max-w-4xl flex justify-between items-center mb-4 px-2">
    <div class="flex items-center gap-3">
      <span class="px-3 py-1 bg-indigo-600/80 rounded-full text-xs font-black uppercase tracking-wider border border-indigo-400/40">
        🚀 SPACE MATH QUIZ
      </span>
      <h1 class="text-sm md:text-base font-bold text-slate-300 truncate max-w-[280px] md:max-w-md">${title}</h1>
    </div>
    <div class="flex items-center gap-4">
      <div class="text-right">
        <span class="text-[11px] text-slate-400 uppercase font-bold block">Điểm số</span>
        <span id="score-display" class="text-xl md:text-2xl font-black text-amber-400 leading-none">0</span>
      </div>
      <button id="sound-toggle" onclick="toggleSound()" class="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700 text-sm">
        🔊
      </button>
    </div>
  </header>

  <!-- Main Game Container -->
  <main class="w-full max-w-4xl glass-card rounded-3xl p-6 md:p-8 relative overflow-hidden flex flex-col min-h-[500px]">
    
    <!-- START SCREEN -->
    <div id="start-screen" class="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-8">
      <div class="w-24 h-24 rounded-3xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-5xl shadow-2xl glow-anim">
        🚀
      </div>
      <div>
        <h2 class="text-2xl md:text-3xl font-black text-white tracking-tight">${title}</h2>
        <p class="text-slate-400 text-sm mt-2 max-w-md mx-auto">
          Chào mừng các em học sinh! Hãy vận dụng kiến thức bài học để vượt qua các câu hỏi thử thách không gian.
        </p>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-md text-xs text-slate-300">
        <div class="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
          <span class="text-slate-500 block">Số câu hỏi</span>
          <span id="total-q-count" class="font-bold text-sm text-indigo-400">--</span>
        </div>
        <div class="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
          <span class="text-slate-500 block">Thời gian mỗi câu</span>
          <span class="font-bold text-sm text-emerald-400">20 giây</span>
        </div>
        <div class="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 col-span-2 md:col-span-1">
          <span class="text-slate-500 block">Chế độ</span>
          <span class="font-bold text-sm text-amber-400">Combo điểm thưởng</span>
        </div>
      </div>

      <button onclick="startGame()" class="px-8 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-base rounded-2xl shadow-xl shadow-indigo-600/40 transform hover:-translate-y-1 transition-all flex items-center gap-2">
        <span>🎮 BẮT ĐẦU CHƠI NGAY</span>
      </button>
    </div>

    <!-- QUIZ PLAY SCREEN -->
    <div id="play-screen" class="hidden flex-1 flex flex-col justify-between space-y-6">
      <!-- Progress Bar & Timer Header -->
      <div class="space-y-2">
        <div class="flex justify-between items-center text-xs font-bold text-slate-400">
          <span id="question-progress">Câu 1 / 5</span>
          <div class="flex items-center gap-1 text-amber-400 font-mono">
            <span>⚡ Combo:</span>
            <span id="combo-count" class="text-sm font-black">x1</span>
          </div>
          <span id="timer-text" class="text-rose-400 font-mono text-sm">⏱️ 20s</span>
        </div>
        <div class="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/50">
          <div id="timer-bar" class="bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 h-full w-full transition-all duration-1000 ease-linear"></div>
        </div>
      </div>

      <!-- Question Box -->
      <div class="p-6 bg-slate-800/80 border border-slate-700/80 rounded-2xl min-h-[110px] flex items-center justify-center text-center shadow-inner">
        <h3 id="question-text" class="text-base md:text-lg font-bold text-white leading-relaxed"></h3>
      </div>

      <!-- Options Grid -->
      <div id="options-grid" class="grid grid-cols-1 sm:grid-cols-2 gap-3.5"></div>

      <!-- Feedback Banner (Correct / Wrong) -->
      <div id="feedback-banner" class="hidden p-4 rounded-xl text-xs md:text-sm font-bold flex justify-between items-center">
        <div id="feedback-text" class="flex items-center gap-2"></div>
        <button id="next-btn" onclick="nextQuestion()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-md">
          Câu tiếp theo ➔
        </button>
      </div>
    </div>

    <!-- END RESULT SCREEN -->
    <div id="end-screen" class="hidden flex-1 flex flex-col items-center justify-center text-center space-y-6 py-6">
      <div id="result-badge" class="w-24 h-24 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-5xl shadow-2xl">
        🏆
      </div>
      <div>
        <h2 id="result-title" class="text-2xl md:text-3xl font-black text-white">XUẤT SẮC HOÀN THÀNH!</h2>
        <p id="result-subtitle" class="text-slate-400 text-sm mt-1">Các em đã xuất sắc giải mã toàn bộ thử thách bài học.</p>
      </div>

      <div class="grid grid-cols-3 gap-3 w-full max-w-sm text-xs">
        <div class="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
          <span class="text-slate-500 block">Tổng điểm</span>
          <span id="final-score" class="font-black text-lg text-amber-400">0</span>
        </div>
        <div class="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
          <span class="text-slate-500 block">Trả lời đúng</span>
          <span id="final-correct" class="font-black text-lg text-emerald-400">0/0</span>
        </div>
        <div class="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
          <span class="text-slate-500 block">Độ chính xác</span>
          <span id="final-accuracy" class="font-black text-lg text-blue-400">0%</span>
        </div>
      </div>

      <div class="flex gap-3">
        <button onclick="restartGame()" class="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg flex items-center gap-2">
          <span>🔄 CHƠI LẠI</span>
        </button>
      </div>
    </div>

  </main>

  <footer class="mt-4 text-center text-slate-500 text-xs">
    Trường THCS Quang Trung — Tổ Toán Tin | Thiết kế cho máy chiếu &amp; bảng tương tác
  </footer>

  <!-- Web Audio Synthesizer & Game Engine Script -->
  <script>
    const QUESTIONS = ${questionsJson};

    let currentIndex = 0;
    let score = 0;
    let combo = 1;
    let correctCount = 0;
    let timerInterval = null;
    let timeLeft = 20;
    let soundEnabled = true;
    let audioCtx = null;

    // Web Audio Sound Generator (Zero external MP3 dependency)
    function getAudioContext() {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      return audioCtx;
    }

    function playSound(type) {
      if (!soundEnabled) return;
      try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;

        if (type === 'correct') {
          // Happy chime arpeggio
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(523.25, now); // C5
          osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
          osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
          osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          osc.start(now);
          osc.stop(now + 0.5);
        } else if (type === 'wrong') {
          // Low buzzer
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(180, now);
          osc.frequency.setValueAtTime(130, now + 0.1);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.start(now);
          osc.stop(now + 0.35);
        } else if (type === 'tick') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, now);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.start(now);
          osc.stop(now + 0.05);
        } else if (type === 'victory') {
          // Victory fanfare
          [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, i) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g);
            g.connect(ctx.destination);
            o.frequency.setValueAtTime(freq, now + i * 0.12);
            g.gain.setValueAtTime(0.25, now + i * 0.12);
            g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);
            o.start(now + i * 0.12);
            o.stop(now + i * 0.12 + 0.4);
          });
        }
      } catch (e) {
        console.log('Audio not supported or blocked:', e);
      }
    }

    function toggleSound() {
      soundEnabled = !soundEnabled;
      document.getElementById('sound-toggle').innerText = soundEnabled ? '🔊' : '🔇';
    }

    function renderMathInPage() {
      if (window.renderMathInElement) {
        renderMathInElement(document.body, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
          ],
          throwOnError: false,
        });
      }
    }

    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('total-q-count').innerText = QUESTIONS.length + ' câu';
      renderMathInPage();
    });

    function startGame() {
      document.getElementById('start-screen').classList.add('hidden');
      document.getElementById('end-screen').classList.add('hidden');
      document.getElementById('play-screen').classList.remove('hidden');

      currentIndex = 0;
      score = 0;
      combo = 1;
      correctCount = 0;
      updateScoreUI();
      loadQuestion();
    }

    function updateScoreUI() {
      document.getElementById('score-display').innerText = score;
      document.getElementById('combo-count').innerText = 'x' + combo;
    }

    function loadQuestion() {
      clearInterval(timerInterval);
      const q = QUESTIONS[currentIndex];

      document.getElementById('question-progress').innerText = \`Câu \${currentIndex + 1} / \${QUESTIONS.length}\`;
      document.getElementById('question-text').innerHTML = q.question;

      const optGrid = document.getElementById('options-grid');
      optGrid.innerHTML = '';

      const letters = ['A', 'B', 'C', 'D'];
      q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn p-4 rounded-xl bg-slate-800/90 border border-slate-700/80 hover:border-indigo-500 hover:bg-slate-750 text-left flex items-center gap-3 text-xs md:text-sm font-medium shadow-md';
        btn.innerHTML = \`<span class="w-7 h-7 rounded-lg bg-slate-700/80 flex items-center justify-center font-bold text-indigo-400 shrink-0">\${letters[idx]}</span> <span class="flex-1">\${opt}</span>\`;
        btn.onclick = () => selectAnswer(idx);
        optGrid.appendChild(btn);
      });

      document.getElementById('feedback-banner').classList.add('hidden');

      // Start Countdown Timer
      timeLeft = q.timeLimitSeconds || 20;
      updateTimerUI();
      timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerUI();
        if (timeLeft <= 5 && timeLeft > 0) playSound('tick');
        if (timeLeft <= 0) {
          clearInterval(timerInterval);
          selectAnswer(-1); // Timeout
        }
      }, 1000);

      setTimeout(renderMathInPage, 50);
    }

    function updateTimerUI() {
      document.getElementById('timer-text').innerText = \`⏱️ \${timeLeft}s\`;
      const pct = (timeLeft / 20) * 100;
      const bar = document.getElementById('timer-bar');
      bar.style.width = pct + '%';
      if (timeLeft <= 5) {
        bar.className = 'bg-rose-500 h-full w-full transition-all duration-1000 ease-linear';
      } else {
        bar.className = 'bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 h-full w-full transition-all duration-1000 ease-linear';
      }
    }

    function selectAnswer(selectedIndex) {
      clearInterval(timerInterval);
      const q = QUESTIONS[currentIndex];
      const isCorrect = selectedIndex === q.correctIndex;
      const buttons = document.querySelectorAll('.option-btn');

      buttons.forEach((btn, idx) => {
        btn.disabled = true;
        if (idx === q.correctIndex) {
          btn.classList.add('bg-emerald-600/40', 'border-emerald-500', 'text-emerald-200');
        } else if (idx === selectedIndex) {
          btn.classList.add('bg-rose-600/40', 'border-rose-500', 'text-rose-200');
        }
      });

      const fbBanner = document.getElementById('feedback-banner');
      const fbText = document.getElementById('feedback-text');
      fbBanner.classList.remove('hidden');

      if (isCorrect) {
        playSound('correct');
        const points = 100 * combo + timeLeft * 5;
        score += points;
        combo++;
        correctCount++;
        fbBanner.className = 'p-4 rounded-xl text-xs md:text-sm font-bold flex justify-between items-center bg-emerald-900/40 border border-emerald-500/50 text-emerald-200';
        fbText.innerHTML = \`<span>✅ CHÍNH XÁC!</span> <span class="text-xs text-emerald-300 font-normal">+\${points} điểm (\${q.explanation || ''})</span>\`;
      } else {
        playSound('wrong');
        combo = 1;
        fbBanner.className = 'p-4 rounded-xl text-xs md:text-sm font-bold flex justify-between items-center bg-rose-900/40 border border-rose-500/50 text-rose-200';
        fbText.innerHTML = \`<span>❌ CHƯA ĐÚNG!</span> <span class="text-xs text-rose-300 font-normal">Đáp án đúng là \${['A','B','C','D'][q.correctIndex]}. \${q.explanation || ''}</span>\`;
      }

      updateScoreUI();
      setTimeout(renderMathInPage, 50);
    }

    function nextQuestion() {
      currentIndex++;
      if (currentIndex < QUESTIONS.length) {
        loadQuestion();
      } else {
        showEndScreen();
      }
    }

    function showEndScreen() {
      document.getElementById('play-screen').classList.add('hidden');
      document.getElementById('end-screen').classList.remove('hidden');

      document.getElementById('final-score').innerText = score;
      document.getElementById('final-correct').innerText = \`\${correctCount}/\${QUESTIONS.length}\`;
      const acc = Math.round((correctCount / QUESTIONS.length) * 100);
      document.getElementById('final-accuracy').innerText = acc + '%';

      if (acc >= 80) {
        playSound('victory');
        triggerConfetti();
      }
    }

    function restartGame() {
      startGame();
    }

    // Lightweight Confetti Particle Engine
    function triggerConfetti() {
      const canvas = document.getElementById('confetti-canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const particles = [];
      const colors = ['#f43f5e', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];

      for (let i = 0; i < 120; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height - canvas.height,
          size: Math.random() * 8 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          vx: (Math.random() - 0.5) * 4,
          vy: Math.random() * 4 + 3,
          rot: Math.random() * 360,
          vRot: (Math.random() - 0.5) * 10,
        });
      }

      let frames = 0;
      function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.rot += p.vRot;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rot * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        });

        frames++;
        if (frames < 180) {
          requestAnimationFrame(render);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      render();
    }
  </script>
</body>
</html>`;
  }
}
