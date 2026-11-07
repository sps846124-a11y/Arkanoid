/* =========================================================
   音效与发音模块
   ---------------------------------------------------------
   · 所有音效都用 Web Audio API 现场合成，不加载任何音频文件
   · 英文单词用浏览器 speechSynthesis 朗读，优先选择英文语音
   · 浏览器不支持或语音服务不可用时静默跳过，不影响游戏
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

  /* ---------------- 单词发音 ---------------- */

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

  /**
   * 用浏览器语音朗读英文单词（语速稍慢，适合儿童跟读）
   * 不支持 speechSynthesis 时静默返回。
   */
  function speakWord(word) {
    if (!word || !window.speechSynthesis) return;
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

      // 取消上一条，避免连击时单词排队念不完
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      // 浏览器不支持或语音服务不可用时静默兜底
    }
  }

  /** 停止正在朗读的单词（切换关卡、关闭闪卡时调用） */
  function stopSpeaking() {
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
