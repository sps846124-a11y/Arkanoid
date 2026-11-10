/* =========================================================
   音效与发音模块
   ---------------------------------------------------------
   · 所有音效都用 Web Audio API 现场合成，不加载任何音频文件
   · 英文单词优先使用有道词典的真人发音（在线，美音）
   · 仅在在线音频加载失败或播放被拒绝时，才用 speechSynthesis 兜底
   ========================================================= */

window.GameAudio = (function () {
  let audioCtx = null;
  let cachedVoices = [];

  /* ---------------- Web Audio 合成音效 ---------------- */

  /** 懒创建 AudioContext（必须由用户点击/按键触发创建） */
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;

      try {
        audioCtx = new AudioContextClass();
      } catch (error) {
        return null;
      }
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    return audioCtx;
  }

  /** 在第一次点击或按键时调用，解锁浏览器音频权限 */
  function unlock() {
    getAudioContext();
    primePronunciationAudio();
  }

  /**
   * 播放一个简单音符
   * @param {number} frequency 频率（Hz）
   * @param {number} startOffset 相对当前时间的延迟（秒）
   * @param {number} duration 时长（秒）
   * @param {string} type 波形：sine / triangle / square ...
   * @param {number} volume 音量（0 ~ 1）
   */
  function playTone(frequency, startOffset, duration, type, volume) {
    const context = getAudioContext();
    if (!context) return;

    try {
      const startTime = context.currentTime + startOffset;
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = type || 'sine';
      oscillator.frequency.setValueAtTime(frequency, startTime);

      // 快速起音 + 指数衰减，声音更柔和、不刺耳
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration + 0.03);
    } catch (error) {
      // 忽略音频错误，保证游戏继续
    }
  }

  /** 击中正确砖：上行短音 */
  function playCorrect() {
    playTone(523.25, 0, 0.12, 'triangle', 0.075);    // C5
    playTone(659.25, 0.08, 0.14, 'triangle', 0.075); // E5
    playTone(783.99, 0.17, 0.18, 'triangle', 0.07);  // G5
  }

  /** 击中错误砖：低沉短音 */
  function playWrong() {
    playTone(220, 0, 0.14, 'sine', 0.09);     // A3
    playTone(164.81, 0.1, 0.2, 'sine', 0.08); // E3
  }

  /** 过关：简短和弦 */
  function playPass() {
    playTone(523.25, 0, 0.35, 'sine', 0.06);
    playTone(659.25, 0.06, 0.35, 'sine', 0.06);
    playTone(783.99, 0.12, 0.4, 'sine', 0.06);
    playTone(1046.5, 0.2, 0.45, 'triangle', 0.05);
  }

  /* ---------------- 单词发音（有道真人发音） ---------------- */

  // 有道词典发音接口：type=2 美音，type=1 英音
  const YOUDAO_AUDIO_URL = 'https://dict.youdao.com/dictvoice';
  const YOUDAO_ACCENT_TYPE = 2;

  // 网络差或音频长时间无法开始播放时，多久后改用系统语音兜底
  const FALLBACK_DELAY_MS = 2500;

  // 一段极短的静音 WAV，用于在用户手势里解锁移动端音频播放权限
  const SILENT_AUDIO_SRC =
    'data:audio/wav;base64,UklGRjQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YRAAAAAAAAAAAAAAAAAAAAAAAAAA';

  let pronunciationAudio = null;
  let audioPrimed = false;
  let currentAudio = null;
  let speakRequestId = 0;
  let activePronunciationCleanup = null;

  /**
   * 复用一个 Audio 对象：iOS Safari 要求音频元素在用户手势中播放过，
   * 之后才允许程序自动播放；每次 new Audio() 可能被拦截。
   */
  function getPronunciationAudio() {
    if (pronunciationAudio) return pronunciationAudio;
    if (typeof Audio !== 'function') return null;

    try {
      pronunciationAudio = new Audio();
      pronunciationAudio.preload = 'auto';
    } catch (error) {
      pronunciationAudio = null;
    }

    return pronunciationAudio;
  }

  /** 在首次点击/按键时播放静音片段，解锁移动端音频 */
  function primePronunciationAudio() {
    if (audioPrimed) return;

    const audio = getPronunciationAudio();
    if (!audio) return;

    // 正在朗读单词时不要用静音片段打断它
    if (currentAudio === audio && !audio.paused) return;

    audioPrimed = true;

    try {
      audio.src = SILENT_AUDIO_SRC;
      const playResult = audio.play();
      if (playResult && typeof playResult.catch === 'function') {
        playResult.catch((error) => {
          // 只有被自动播放策略拦截时才允许下次手势重试；
          // 因切换 src 产生的 AbortError 不应重复解锁。
          if (error && error.name === 'NotAllowedError') {
            audioPrimed = false;
          }
        });
      }
    } catch (error) {
      audioPrimed = false;
    }
  }

  /** 拼接有道发音地址；单词可能含空格、连字符，必须编码 */
  function buildPronunciationUrl(word) {
    return (
      YOUDAO_AUDIO_URL +
      '?audio=' +
      encodeURIComponent(word) +
      '&type=' +
      YOUDAO_ACCENT_TYPE
    );
  }

  /** 暂停并重置当前正在播放的音频，避免连续发音重叠 */
  function stopCurrentAudio() {
    const audio = currentAudio;
    currentAudio = null;
    if (!audio) return;

    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (error) {
      // 音频尚未加载完成时忽略
    }
  }

  /* -------- 系统语音：仅作为真人音频失败时的兜底 -------- */

  function refreshVoices() {
    if (!window.speechSynthesis) return;

    try {
      cachedVoices = window.speechSynthesis.getVoices() || [];
    } catch (error) {
      cachedVoices = [];
    }
  }

  if (window.speechSynthesis) {
    refreshVoices();
    if (typeof window.speechSynthesis.addEventListener === 'function') {
      window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
    }
  }

  /** 优先选择美式/英式英文语音，其次任意英文语音 */
  function pickEnglishVoice() {
    if (cachedVoices.length === 0) refreshVoices();

    const englishVoices = cachedVoices.filter(
      (voice) => /^en[-_]/i.test(voice.lang) || /english/i.test(voice.name)
    );

    if (englishVoices.length === 0) return null;

    return (
      englishVoices.find((voice) => /^en[-_]US/i.test(voice.lang)) ||
      englishVoices.find((voice) => /^en[-_]GB/i.test(voice.lang)) ||
      englishVoices[0]
    );
  }

  /** 用浏览器系统语音朗读（真人音频失败时的兜底，语速稍慢） */
  function speakWithBrowserVoice(word) {
    if (!window.speechSynthesis) return;
    if (typeof window.SpeechSynthesisUtterance !== 'function') return;

    try {
      const utterance = new window.SpeechSynthesisUtterance(word);
      utterance.rate = 0.85;
      utterance.pitch = 1.05;
      utterance.lang = 'en-US';

      const voice = pickEnglishVoice();
      if (voice) {
        utterance.voice = voice;
        if (voice.lang) utterance.lang = voice.lang;
      }

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      // 系统语音也不可用时静默跳过，不影响游戏
    }
  }

  /**
   * 播放单词真人发音（有道美音）。
   * 播放前会暂停并重置上一条音频，避免连击时多个声音叠在一起；
   * 仅在加载失败、播放被拒绝或超时未开始时，才用系统语音兜底。
   */
  function speakWord(word) {
    if (!word) return;

    // 让上一条音频的异步回调全部失效，并停掉正在播放的声音
    stopSpeaking();
    const requestId = ++speakRequestId;

    const audio = getPronunciationAudio();
    if (!audio) {
      speakWithBrowserVoice(word);
      return;
    }

    audio.src = buildPronunciationUrl(word);
    currentAudio = audio;

    let settled = false;
    let fallbackTimer = 0;

    function cleanup() {
      window.clearTimeout(fallbackTimer);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('error', handleFailure);
      if (activePronunciationCleanup === cleanup) {
        activePronunciationCleanup = null;
      }
    }

    function fallbackToBrowserVoice() {
      if (settled || requestId !== speakRequestId) return;
      settled = true;
      cleanup();

      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (error) {
        // 忽略重置资源时的异常
      }

      if (currentAudio === audio) currentAudio = null;
      speakWithBrowserVoice(word);
    }

    function handlePlaying() {
      if (requestId !== speakRequestId) return;
      settled = true;
      cleanup();
    }

    function handleFailure() {
      fallbackToBrowserVoice();
    }

    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('error', handleFailure);
    activePronunciationCleanup = cleanup;

    // 网络差、音频迟迟不开始时兜底
    fallbackTimer = window.setTimeout(
      fallbackToBrowserVoice,
      FALLBACK_DELAY_MS
    );

    const playResult = audio.play();
    if (playResult && typeof playResult.catch === 'function') {
      // 浏览器拒绝播放（如自动播放策略）时立即兜底
      playResult.catch(() => fallbackToBrowserVoice());
    }
  }

  /** 停止正在朗读的单词（切换关卡、关闭闪卡时调用） */
  function stopSpeaking() {
    speakRequestId += 1;

    if (activePronunciationCleanup) {
      activePronunciationCleanup();
    }

    stopCurrentAudio();

    if (!window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel();
    } catch (error) {
      // 忽略语音服务异常
    }
  }

  return {
    unlock,
    playCorrect,
    playWrong,
    playPass,
    speakWord,
    stopSpeaking
  };
})();
