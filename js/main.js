'use strict';

/* =========================================================
   小又的打砖块游戏 —— 双向学习 + 难度选择版本
   ---------------------------------------------------------
   基础玩法：
     · 滑块拖动（鼠标 / 触屏 / 键盘）
     · 小球与墙壁、滑块、砖块反弹
     · 生命、得分、横竖屏自适应
     · 六个 Unit 的教材词库与单词砖块
     · 目标卡片、正确消除 / 错误闪烁、单词朗读、合成音效
     · 开始页 + Unit 选择 + 慢速模式
     · 8 秒预习闪卡、过关复习闪卡
     · 总结算页（得分、正确率），支持下一关 / 重玩 / 回首页
     · 连击计数、连击加分、连击 ≥3 时小球加速
     · 击中砖块的粒子与柔和光圈反馈
     · 目标死局检测：自动改选能被小球打到的外层砖块

   本版新增：
     · 出题模式 A：看中文 + emoji，打英文单词砖（按词性配色）
     · 出题模式 B：看 / 听英文 + emoji，打中文砖（统一浅蓝色）
     · 难度选择：简单 1 排、普通 2 排、困难 3 排、地狱 4 排，
       每排最多 4 块砖；开局从本关词库随机抽词
   ========================================================= */

/* =========================================================
   一、可调参数（家长可以修改这些数字来调难度）
   ========================================================= */
const CONFIG = {
  START_LIVES: 3,               // 每关初始生命
  BRICK_SCORE: 10,              // 每消一块砖的基础得分
  COMBO_SCORE_STEP: 2,          // 连击每多 1 次，额外加 2 分
  COMBO_SCORE_MAX: 20,          // 连击加分上限（最多额外 20 分）
  COMBO_SPEED_THRESHOLD: 3,     // 连击达到 3 次时开始加速
  COMBO_SPEED_BONUS: 0.1,       // 加速幅度：约提升 10%
  WRONG_FLASH_MS: 320,          // 击错砖时红色提示的时长（毫秒）
  BRICKS_PER_ROW: 4,            // 每排固定 4 块砖，难度决定排数（1~4 排）
  PREVIEW_SECONDS: 8,           // 每关开始前的预习总时长（秒）
  REVIEW_STEP_MS: 1400,         // 过关复习闪卡每张停留时长（毫秒）
  SLOW_MODE_FACTOR: 0.7,        // 慢速模式速度倍率（约降低 30%）
  BALL_RADIUS: 12,              // 小球半径（逻辑像素）
  BALL_SPEED: 430,              // 小球速度（逻辑像素 / 秒），越大越快
  PADDLE_HEIGHT: 20,            // 滑块高度
  PADDLE_KEYBOARD_SPEED: 760,   // 键盘移动滑块速度
  PADDLE_HIT_PAD: 18,           // 滑块左右额外判定宽度（儿童友好）
  LEVEL_END_DELAY_MS: 650,      // 过关/失败后，稍等再弹出复习闪卡
  TARGET_SPEAK_START_DELAY_MS: 250, // 模式 B 开局朗读目标单词的延迟
  TARGET_SPEAK_DELAY_MS: 1300,  // 模式 B 换目标后朗读新单词的延迟
  PARTICLE_COUNT: 12,           // 每次击中目标砖喷出的粒子数量
  MAX_DPR: 2                    // 高分屏最多按 2 倍像素渲染，避免卡顿
};

// 横屏、竖屏两套逻辑分辨率；画面会等比缩放填满可用区域
const WORLD_LANDSCAPE = { width: 960, height: 640 };
const WORLD_PORTRAIT = { width: 720, height: 960 };

// 出题模式：A = 中文找英文（默认）；B = 英文找中文
const GAME_MODES = {
  A: { label: '中文找英文', targetHint: '找出这个意思的单词' },
  B: { label: '英文找中文', targetHint: '听一听，找出这个单词的中文' }
};

// 难度只决定砖块排数；每排最多 4 块，所以最多 16 块
const DIFFICULTIES = {
  easy:   { rows: 1, label: '简单' },
  normal: { rows: 2, label: '普通' },
  hard:   { rows: 3, label: '困难' },
  hell:   { rows: 4, label: '地狱' }
};

// 小球从滑块反弹时的最大角度（60°）
const MAX_BOUNCE_ANGLE = Math.PI / 3;

// 目标可达性检测的采样步长（像素）。砖块缝隙只有 10~14px，
// 小球直径 24px 钻不过去，用 8px 采样可以准确封住缝隙。
const REACH_SAMPLE_STEP = 8;

/* =========================================================
   二、DOM 与游戏状态
   ========================================================= */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const stage = document.getElementById('stage');
const scoreValue = document.getElementById('scoreValue');
const livesValue = document.getElementById('livesValue');
const unitLabel = document.getElementById('unitLabel');

const startScreen = document.getElementById('startScreen');
const unitGrid = document.getElementById('unitGrid');
const modeOptions = document.getElementById('modeOptions');
const difficultyOptions = document.getElementById('difficultyOptions');
const startTip = document.getElementById('startTip');
const slowModeToggle = document.getElementById('slowModeToggle');
const startBtn = document.getElementById('startBtn');

const flashScreen = document.getElementById('flashScreen');
const flashTitle = document.getElementById('flashTitle');
const flashSubtitle = document.getElementById('flashSubtitle');
const flashTimer = document.getElementById('flashTimer');
const flashGrid = document.getElementById('flashGrid');
const flashSkipBtn = document.getElementById('flashSkipBtn');
const flashContinueBtn = document.getElementById('flashContinueBtn');

const summaryScreen = document.getElementById('summaryScreen');
const summaryEmoji = document.getElementById('summaryEmoji');
const summaryTitle = document.getElementById('summaryTitle');
const summarySubtitle = document.getElementById('summarySubtitle');
const summaryScore = document.getElementById('summaryScore');
const summaryAccuracy = document.getElementById('summaryAccuracy');
const summaryHits = document.getElementById('summaryHits');
const nextLevelBtn = document.getElementById('nextLevelBtn');
const replayLevelBtn = document.getElementById('replayLevelBtn');
const homeBtn = document.getElementById('homeBtn');

// 离屏 2D 上下文：只用来测量文字宽度，不影响画面绘制
const measureCtx = document.createElement('canvas').getContext('2d');

let world = {
  width: WORLD_LANDSCAPE.width,
  height: WORLD_LANDSCAPE.height,
  isPortrait: false
};

// 界面模式：start（开始页）/ flash（预习或复习）/ game（游戏中）/ summary（结算）
let uiMode = 'start';

// 游戏状态：ready（等待发球）；playing（游戏中）；won（过关）；over（失败）
let gameState = 'ready';
let score = 0;
let lives = CONFIG.START_LIVES;
let pointerTargetX = null;
let lastTime = performance.now();

let selectedUnitKey = 'unit1';
let currentUnitKey = 'unit1';
let selectedMode = 'A';           // 出题模式：A / B
let selectedDifficulty = 'normal'; // 难度：easy / normal / hard / hell
let currentTargetBrick = null;
let targetChangedAt = 0;
let targetSpeechTimer = 0;        // 模式 B 朗读目标的延时计时器

let isSlowMode = false;
let levelActive = false;          // 只有真正在玩时才允许发球
let levelWords = [];              // 本关实际铺上砖块的单词（预习/复习用）
let levelStats = { correct: 0, wrong: 0 }; // 本关击中统计（结算正确率）

let combo = 0;                    // 当前连击数：击错砖或漏球清零
let comboChangedAt = 0;           // 连击变化的时刻，用于连击提示的轻弹动画
const particles = [];             // 击中砖块时的粒子
const effects = [];               // 击中砖块时的扩散光圈

let levelToken = 0;               // 防止过期的延时回调影响新关卡
let levelEndTimer = 0;
let flashSession = null;          // 当前预习/复习闪卡的计时器集合

const keys = { left: false, right: false };

const paddle = {
  x: 0,
  y: 0,
  width: 0,
  height: CONFIG.PADDLE_HEIGHT
};

const ball = {
  x: 0,
  y: 0,
  radius: CONFIG.BALL_RADIUS,
  vx: 0,
  vy: 0,
  attached: true
};

// 砖块会随当前 Unit 在 rebuildBricks() 中重建
const bricks = [];

// 砖块上的英文单词使用系统自带字体，无需联网加载
const BRICK_FONT_FAMILY =
  '"Trebuchet MS", "Comic Sans MS", "Microsoft YaHei", sans-serif';

// 目标卡片等中文界面文字
const UI_FONT_FAMILY =
  '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif';

// 按词性取色：名词蓝、动词橙、形容词绿、其他灰
const BRICK_STYLES = {
  noun:  { top: '#9bd9ff', bottom: '#51acef', text: '#0b4f7a' },
  verb:  { top: '#ffd08a', bottom: '#f59b3c', text: '#6b3a05' },
  adj:   { top: '#b7edb2', bottom: '#68c96e', text: '#205d2b' },
  other: { top: '#dbe3eb', bottom: '#aebbc9', text: '#3b4a59' }
};

// 模式 B 所有砖块统一使用浅蓝色，避免词性配色泄露答案
const BRICK_STYLE_UNIFIED = {
  top: '#c9edff',
  bottom: '#8ed4f6',
  text: '#0b4f7a'
};

/** 当前模式下砖块使用的配色 */
function getBrickStyle(brick) {
  return selectedMode === 'B'
    ? BRICK_STYLE_UNIFIED
    : BRICK_STYLES[brick.pos] || BRICK_STYLES.other;
}

/** 当前模式下砖块上显示的文字：模式 A 英文，模式 B 中文 */
function getBrickDisplayText(brick) {
  return selectedMode === 'B'
    ? brick.zh || brick.word || ''
    : brick.word || '';
}

/** 砖块文字字体：中文用界面字体，英文用单词字体 */
function getBrickFontFamily() {
  return selectedMode === 'B' ? UI_FONT_FAMILY : BRICK_FONT_FAMILY;
}

/** 当前难度允许的最大砖块数 */
function getMaxBricks() {
  const difficulty = DIFFICULTIES[selectedDifficulty] || DIFFICULTIES.normal;
  return difficulty.rows * CONFIG.BRICKS_PER_ROW;
}

/* =========================================================
   三、初始化与画布尺寸
   ========================================================= */

/** 随机打乱数组（Fisher-Yates），返回新数组 */
function shuffle(list) {
  const result = list.slice();

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }

  return result;
}

/**
 * 从本关词库中随机抽取本关需要的单词。
 * 数量由难度决定（1~4 排、每排 4 块）；
 * 词库单词不足时按实际数量生成，砖块整体居中。
 */
function selectWordsForUnit(words, maxBricks) {
  if (!Array.isArray(words) || words.length === 0) return [];

  return shuffle(words).slice(0, Math.max(0, maxBricks));
}

/** 用选中的单词重建砖块数组 */
function rebuildBricks(words) {
  bricks.length = 0;

  words.forEach((item, index) => {
    bricks.push({
      index,
      word: item.word,
      zh: item.zh,
      pos: item.pos,
      emoji: item.emoji || '',
      alive: true,
      wrongFlashUntil: 0,
      x: 0,
      y: 0,
      width: 0,
      height: 0
    });
  });

  layoutBricks();
}

/**
 * 载入一个 Unit：挑词 → 建砖块 → 重置本局。
 * 预习闪卡结束后由 beginGameplay() 开始发球。
 */
function loadUnit(unitKey) {
  const unit = WORD_DATA[unitKey];

  if (!unit || !Array.isArray(unit.words) || unit.words.length === 0) {
    console.warn('词库中找不到可用的单元：', unitKey);
    return false;
  }

  currentUnitKey = unitKey;

  const title = unit.title || `Unit ${unit.unit}`;
  unitLabel.textContent = title;
  document.title = `小又的打砖块 · ${title}`;

  levelWords = selectWordsForUnit(unit.words, getMaxBricks());
  levelStats = { correct: 0, wrong: 0 };

  rebuildBricks(levelWords);
  resetGame();

  return true;
}

/**
 * 根据窗口可用空间，选择横屏或竖屏逻辑分辨率，
 * 并把画布缩放到尽可能大、同时保持比例。
 */
function fitCanvas() {
  const stageRect = stage.getBoundingClientRect();
  const availableWidth = Math.max(280, stageRect.width);
  const availableHeight = Math.max(280, stageRect.height);

  // 可用区域更高，说明是竖屏
  const nextWorld = availableHeight > availableWidth ? WORLD_PORTRAIT : WORLD_LANDSCAPE;
  const scale = Math.min(
    availableWidth / nextWorld.width,
    availableHeight / nextWorld.height
  );

  const cssWidth = Math.max(1, Math.floor(nextWorld.width * scale));
  const cssHeight = Math.max(1, Math.floor(nextWorld.height * scale));

  // 记录缩放前的相对位置，旋转屏幕后保持滑块和小球的大致位置
  const paddleCenterRatio =
    paddle.width > 0 ? (paddle.x + paddle.width / 2) / world.width : 0.5;
  const ballRatio = {
    x: ball.x / world.width,
    y: ball.y / world.height
  };

  const pixelRatio = Math.min(window.devicePixelRatio || 1, CONFIG.MAX_DPR);

  canvas.style.width = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';
  canvas.width = Math.max(1, Math.round(cssWidth * pixelRatio));
  canvas.height = Math.max(1, Math.round(cssHeight * pixelRatio));

  world = {
    width: nextWorld.width,
    height: nextWorld.height,
    isPortrait: nextWorld === WORLD_PORTRAIT
  };

  layoutPaddle();
  layoutBricks();

  paddle.x = paddleCenterRatio * world.width - paddle.width / 2;
  clampPaddle();

  if (ball.attached || gameState === 'ready') {
    attachBallToPaddle();
  } else {
    ball.x = clamp(ballRatio.x * world.width, ball.radius, world.width - ball.radius);
    ball.y = clamp(ballRatio.y * world.height, ball.radius, world.height - ball.radius);
  }

  // 旋转屏幕后旧的指针位置不再有效
  pointerTargetX = null;

  // 横竖屏切换会改变砖块尺寸，重新检查目标是否会被围死
  ensureTargetReachable();
}

/** 计算滑块的宽度和位置 */
function layoutPaddle() {
  const widthFactor = world.isPortrait ? 0.27 : 0.24;
  paddle.width = clamp(world.width * widthFactor, 150, 240);
  paddle.height = CONFIG.PADDLE_HEIGHT;
  paddle.y = world.height - (world.isPortrait ? 104 : 58);
}

/** 按当前横竖屏重新排列砖块网格（每排最多 4 块，不足一整行时居中） */
function layoutBricks() {
  const cols = CONFIG.BRICKS_PER_ROW;
  const sideMargin = world.isPortrait ? 26 : 70;
  const gap = world.isPortrait ? 10 : 14;
  // 顶部要留出目标卡片的位置
  const top = world.isPortrait ? 108 : 96;
  const brickHeight = world.isPortrait ? 66 : 64;
  const rowGap = world.isPortrait ? 10 : 12;
  const brickWidth =
    (world.width - sideMargin * 2 - gap * (cols - 1)) / cols;

  bricks.forEach((brick) => {
    const col = brick.index % cols;
    const row = Math.floor(brick.index / cols);

    // 最后一行不足一整行时，整行居中摆放
    const countInRow = Math.min(cols, bricks.length - row * cols);
    const rowWidth = countInRow * brickWidth + (countInRow - 1) * gap;
    const rowStartX = (world.width - rowWidth) / 2;

    brick.x = rowStartX + col * (brickWidth + gap);
    brick.y = top + row * (brickHeight + rowGap);
    brick.width = brickWidth;
    brick.height = brickHeight;

    updateBrickTextLayout(brick);
  });
}

/**
 * 计算砖块文字的字号与换行方式。
 * 模式 A 显示英文（按单词换行），模式 B 显示中文（按字换行）；
 * 在 1~3 行之间寻找能放下的最大字号。
 * 结果缓存在砖块对象上，窗口缩放或切换模式时重新计算。
 */
function updateBrickTextLayout(brick) {
  const text = getBrickDisplayText(brick);
  const fontFamily = getBrickFontFamily();
  const maxTextWidth = Math.max(20, brick.width - 18);
  const maxTextHeight = Math.max(20, brick.height - 14);
  const maxFontSize = Math.min(24, brick.height * 0.42);
  const minFontSize = 9;

  let best = null;

  // 分别尝试 1 行、2 行、3 行，取能放下的最大字号
  for (let lineCount = 1; lineCount <= 3; lineCount += 1) {
    let fontSize = maxFontSize;

    while (fontSize >= minFontSize) {
      const lineHeight = fontSize * 1.08;

      if (lineHeight * lineCount <= maxTextHeight) {
        const lines = wrapBrickText(
          text,
          maxTextWidth,
          lineCount,
          fontSize,
          fontFamily
        );

        if (lines) {
          if (!best || fontSize > best.fontSize + 0.01) {
            best = { fontSize, lines };
          }
          break;
        }
      }

      fontSize -= 0.5;
    }
  }

  if (!best) {
    best = { fontSize: minFontSize, lines: [text] };
  }

  brick.textLines = best.lines;
  brick.textFontSize = best.fontSize;
  brick.textLineHeight = best.fontSize * 1.08;
  brick.textFontFamily = fontFamily;
}

/**
 * 把文字按最大宽度拆成不超过 maxLines 行。
 * 有空格时按单词换行，没有空格（中文）时按字符换行；
 * 单个单词/字符仍然过宽时按字符硬拆。放不下返回 null。
 */
function wrapBrickText(text, maxWidth, maxLines, fontSize, fontFamily) {
  measureCtx.font = `700 ${fontSize}px ${fontFamily}`;

  const words = text.split(/\s+/).filter(Boolean);
  const useSpaces = words.length > 1;
  const tokens = useSpaces ? words : Array.from(text);
  const lines = [];
  let current = '';

  function pushCurrent() {
    if (current) {
      lines.push(current);
      current = '';
    }
    return lines.length < maxLines;
  }

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];

    // 已经用满可用行数，却还有内容没放下
    if (lines.length >= maxLines) return null;

    const candidate = current
      ? useSpaces
        ? `${current} ${token}`
        : current + token
      : token;

    if (measureCtx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current && !pushCurrent()) return null;

    // token 本身能放进一行，直接从新行开始
    if (measureCtx.measureText(token).width <= maxWidth) {
      current = token;
      continue;
    }

    // 单个 token 过宽：按字符硬拆
    const chars = Array.from(token);
    for (let c = 0; c < chars.length; c += 1) {
      if (lines.length >= maxLines) return null;

      const next = current + chars[c];
      if (current && measureCtx.measureText(next).width > maxWidth) {
        if (!pushCurrent()) return null;
      }

      current += chars[c];
    }
  }

  if (current) {
    if (lines.length >= maxLines) return null;
    lines.push(current);
  }

  return lines.length > 0 ? lines : null;
}

/** 重开一局（生命、得分、砖块全部复位） */
function resetGame() {
  score = 0;
  lives = CONFIG.START_LIVES;
  gameState = 'ready';

  combo = 0;
  comboChangedAt = 0;
  particles.length = 0;
  effects.length = 0;

  bricks.forEach((brick) => {
    brick.alive = true;
    brick.wrongFlashUntil = 0;
  });

  paddle.x = world.width / 2 - paddle.width / 2;
  clampPaddle();

  ball.vx = 0;
  ball.vy = 0;
  ball.attached = true;
  attachBallToPaddle();

  updateHud();

  // 从全部砖块中随机挑一个目标
  currentTargetBrick = null;
  pickNewTarget();

  lastTime = performance.now();
}

/** 连击达到阈值后的小球加速倍率 */
function getComboSpeedMultiplier() {
  return combo >= CONFIG.COMBO_SPEED_THRESHOLD
    ? 1 + CONFIG.COMBO_SPEED_BONUS
    : 1;
}

/**
 * 当前应有的球速：基础速度 × 慢速模式系数 × 连击加速。
 * 发球、接球、连击变化时都以这个值为准。
 */
function getStartSpeed() {
  const slowFactor = isSlowMode ? CONFIG.SLOW_MODE_FACTOR : 1;
  return CONFIG.BALL_SPEED * slowFactor * getComboSpeedMultiplier();
}

/**
 * 连击数变化后，让正在飞行的小球立即匹配新的目标速度。
 * 保持飞行方向不变，只调整速度大小。
 */
function syncBallSpeedToCombo() {
  if (!levelActive) return;

  const currentSpeed = Math.hypot(ball.vx, ball.vy);
  if (currentSpeed < 0.001) return;

  const targetSpeed = getStartSpeed();
  const factor = targetSpeed / currentSpeed;
  ball.vx *= factor;
  ball.vy *= factor;
}

/** 连击变化：更新计数和提示动画时间 */
function updateCombo(nextCombo) {
  combo = Math.max(0, nextCombo);
  comboChangedAt = performance.now();
  syncBallSpeedToCombo();
}

/* =========================================================
   四、关卡流程：开始页 → 预习 → 游戏 → 复习 → 结算
   ========================================================= */

/** 生成开始页的 Unit 选择按钮 */
function buildUnitGrid() {
  unitGrid.innerHTML = '';

  Object.keys(WORD_DATA).forEach((key) => {
    const unit = WORD_DATA[key];
    if (!unit || !Array.isArray(unit.words)) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'unit-btn';
    button.dataset.unitKey = key;
    button.setAttribute('aria-pressed', 'false');

    const title = document.createElement('span');
    title.className = 'unit-title';
    title.textContent = unit.title || `Unit ${unit.unit}`;

    const count = document.createElement('span');
    count.className = 'unit-count';
    count.textContent = `本关最多 ${Math.min(
      unit.words.length,
      getMaxBricks()
    )} 块砖 · 共 ${unit.words.length} 个单词`;

    button.appendChild(title);
    button.appendChild(count);
    button.addEventListener('click', () => selectUnit(key));

    unitGrid.appendChild(button);
  });
}

/** 刷新 Unit 按钮的选中态 */
function refreshUnitSelectionUI() {
  Array.from(unitGrid.children).forEach((button) => {
    const pressed = button.dataset.unitKey === selectedUnitKey;
    button.classList.toggle('is-selected', pressed);
    button.setAttribute('aria-pressed', String(pressed));
  });
}

/** 刷新出题模式按钮的选中态和底部提示 */
function refreshModeUI() {
  Array.from(modeOptions.querySelectorAll('[data-mode]')).forEach((button) => {
    const active = button.dataset.mode === selectedMode;
    button.classList.toggle('is-selected', active);
    button.setAttribute('aria-checked', String(active));
  });

  startTip.textContent =
    selectedMode === 'B'
      ? '提示：听一听、看一看顶部的英文单词，击中对应的中文砖块。'
      : '提示：看顶部的中文目标，击中对应的英文单词砖。';
}

/** 刷新难度按钮的选中态 */
function refreshDifficultyUI() {
  Array.from(
    difficultyOptions.querySelectorAll('[data-difficulty]')
  ).forEach((button) => {
    const active = button.dataset.difficulty === selectedDifficulty;
    button.classList.toggle('is-selected', active);
    button.setAttribute('aria-checked', String(active));
  });
}

/** 切换出题模式：开始页背景的砖块同步换内容 */
function selectMode(modeKey) {
  if (!GAME_MODES[modeKey] || modeKey === selectedMode) return;

  selectedMode = modeKey;
  refreshModeUI();

  if (uiMode === 'start') {
    loadUnit(selectedUnitKey);
  }
}

/** 切换难度：刷新各 Unit 的砖块数量说明和开始页背景 */
function selectDifficulty(difficultyKey) {
  if (!DIFFICULTIES[difficultyKey] || difficultyKey === selectedDifficulty) {
    return;
  }

  selectedDifficulty = difficultyKey;
  refreshDifficultyUI();
  buildUnitGrid();
  refreshUnitSelectionUI();

  if (uiMode === 'start') {
    loadUnit(selectedUnitKey);
  }
}

/** 在开始页点选一个 Unit（背景同步换成该 Unit 的砖块） */
function selectUnit(unitKey) {
  if (!WORD_DATA[unitKey]) return;

  selectedUnitKey = unitKey;
  refreshUnitSelectionUI();
  loadUnit(unitKey);
}

/** 进入某一关：重载词库 → 显示预习闪卡 */
function startLevel(unitKey) {
  levelToken += 1;
  clearTimeout(levelEndTimer);
  levelEndTimer = 0;
  stopFlashSession();
  stopTargetSpeech();

  selectedUnitKey = unitKey;

  if (!loadUnit(unitKey)) {
    showStartScreen();
    return;
  }

  startScreen.classList.add('hidden');
  summaryScreen.classList.add('hidden');
  levelActive = false;

  showPreview();
}

/** 预习闪卡：8 秒倒计时，依次高亮并朗读单词 */
function showPreview() {
  stopFlashSession();

  uiMode = 'flash';
  levelActive = false;

  flashScreen.classList.remove('hidden');
  startScreen.classList.add('hidden');
  summaryScreen.classList.add('hidden');

  flashTitle.textContent = '预习时间';
  flashSubtitle.textContent = `先看看这些单词，${CONFIG.PREVIEW_SECONDS} 秒后开始游戏`;
  flashTimer.classList.remove('hidden');
  flashTimer.textContent = String(CONFIG.PREVIEW_SECONDS);
  flashSkipBtn.textContent = '跳过预习';
  flashSkipBtn.classList.remove('hidden');
  flashContinueBtn.classList.add('hidden');

  renderFlashGrid(levelWords);

  const session = { done: false, timers: [] };
  flashSession = session;
  session.onFinish = beginGameplay;
  session.skip = endFlashSession;

  const totalMs = CONFIG.PREVIEW_SECONDS * 1000;
  const startedAt = performance.now();
  // 在 8 秒内把每个单词都高亮到；单词多时自动加快切换
  const perWordMs = Math.min(
    1500,
    totalMs / Math.max(1, levelWords.length)
  );

  let index = 0;

  function highlightNextWord() {
    if (!flashSession || session.done) return;
    if (index >= levelWords.length) return;

    setActiveFlashItem(index);

    if (window.GameAudio) {
      GameAudio.speakWord(levelWords[index].word);
    }

    index += 1;
    session.timers.push(setTimeout(highlightNextWord, perWordMs));
  }

  function tickCountdown() {
    if (!flashSession || session.done) return;

    const remaining = Math.max(0, totalMs - (performance.now() - startedAt));
    flashTimer.textContent = String(Math.ceil(remaining / 1000));

    if (remaining <= 0) {
      endFlashSession();
      return;
    }

    session.timers.push(setTimeout(tickCountdown, 200));
  }

  highlightNextWord();
  session.timers.push(setTimeout(tickCountdown, 200));
}

/**
 * 复习闪卡：本关单词逐个高亮朗读。
 * 全部展示完后出现“查看成绩”；也可以随时跳过。
 */
function showLevelReview(passed) {
  stopFlashSession();

  uiMode = 'flash';
  levelActive = false;

  flashScreen.classList.remove('hidden');
  startScreen.classList.add('hidden');
  summaryScreen.classList.add('hidden');

  flashTitle.textContent = '复习时间';
  flashSubtitle.textContent = passed
    ? '太棒了！再读一遍本关单词，记得更牢。'
    : '别灰心，再读一遍本关单词，下次一定行。';
  flashTimer.classList.add('hidden');
  flashSkipBtn.textContent = '跳过复习';
  flashSkipBtn.classList.remove('hidden');
  flashContinueBtn.textContent = '查看成绩';
  flashContinueBtn.classList.add('hidden');

  renderFlashGrid(levelWords);

  const session = { done: false, timers: [] };
  flashSession = session;
  session.onFinish = () => showSummary(passed);
  session.skip = () => {
    if (session.done) return;
    session.done = true;
    stopFlashSession();
    showSummary(passed);
  };

  let index = 0;

  function highlightNextWord() {
    if (!flashSession || session.done) return;

    if (index >= levelWords.length) {
      // 全部读完：收起“跳过”，显示“查看成绩”
      setActiveFlashItem(-1);
      flashSkipBtn.classList.add('hidden');
      flashContinueBtn.classList.remove('hidden');
      return;
    }

    setActiveFlashItem(index);

    if (window.GameAudio) {
      GameAudio.speakWord(levelWords[index].word);
    }

    index += 1;
    session.timers.push(setTimeout(highlightNextWord, CONFIG.REVIEW_STEP_MS));
  }

  highlightNextWord();
}

/** 结束当前闪卡计时，并执行闪卡的收尾回调 */
function endFlashSession() {
  if (!flashSession || flashSession.done) return;

  flashSession.done = true;
  const onFinish = flashSession.onFinish;
  stopFlashSession();

  if (typeof onFinish === 'function') {
    onFinish();
  }
}

/** 清理闪卡的所有计时器和正在朗读的语音 */
function stopFlashSession() {
  if (!flashSession) return;

  flashSession.timers.forEach((timerId) => clearTimeout(timerId));
  flashSession = null;

  if (window.GameAudio && typeof GameAudio.stopSpeaking === 'function') {
    GameAudio.stopSpeaking();
  }
}

/** 在闪卡网格中渲染本关单词 */
function renderFlashGrid(words) {
  flashGrid.innerHTML = '';

  words.forEach((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'flash-item';
    button.setAttribute(
      'aria-label',
      `${item.word} ${item.zh || ''}`.trim()
    );

    const emoji = document.createElement('span');
    emoji.className = 'flash-emoji';
    emoji.textContent = item.emoji || '🔤';

    const word = document.createElement('span');
    word.className = 'flash-word';
    word.textContent = item.word;

    const zh = document.createElement('span');
    zh.className = 'flash-zh';
    zh.textContent = item.zh || '';

    button.appendChild(emoji);
    button.appendChild(word);
    button.appendChild(zh);

    // 点击任意单词卡可以再听一遍发音
    button.addEventListener('click', () => {
      setActiveFlashItem(index);
      if (window.GameAudio) {
        GameAudio.speakWord(item.word);
      }
    });

    flashGrid.appendChild(button);
  });
}

/** 高亮闪卡中的某一张；传 -1 表示全部取消高亮 */
function setActiveFlashItem(index) {
  Array.from(flashGrid.children).forEach((child, childIndex) => {
    child.classList.toggle('is-active', childIndex === index);
  });
}

/** 预习结束，正式进入游戏 */
function beginGameplay() {
  stopFlashSession();

  flashScreen.classList.add('hidden');
  summaryScreen.classList.add('hidden');

  uiMode = 'game';
  levelActive = true;
  gameState = 'ready';

  attachBallToPaddle();
  ensureTargetReachable();
  updateHud();

  // 模式 B：开局先把顶部目标单词读一遍
  speakTargetWord(CONFIG.TARGET_SPEAK_START_DELAY_MS);

  lastTime = performance.now();
}

/** 显示结算页 */
function showSummary(passed) {
  stopFlashSession();

  uiMode = 'summary';
  levelActive = false;

  flashScreen.classList.add('hidden');
  startScreen.classList.add('hidden');

  const totalHits = levelStats.correct + levelStats.wrong;
  const accuracy =
    totalHits > 0 ? Math.round((levelStats.correct / totalHits) * 100) : 0;
  const nextKey = getNextUnitKey(currentUnitKey);

  summaryScore.textContent = String(score);
  summaryAccuracy.textContent = `${accuracy}%`;
  summaryHits.textContent = `${levelStats.correct} / ${totalHits}`;

  if (passed) {
    if (nextKey) {
      summaryEmoji.textContent = '🎉';
      summaryTitle.textContent = '本关完成！';
      summarySubtitle.textContent = '所有单词砖都清空啦，准备好挑战下一关吧！';
      nextLevelBtn.classList.remove('hidden');
    } else {
      summaryEmoji.textContent = '🏆';
      summaryTitle.textContent = '全部通关啦！';
      summarySubtitle.textContent = '六个 Unit 都完成了，你真是太厉害了！';
      nextLevelBtn.classList.add('hidden');
    }
  } else {
    summaryEmoji.textContent = '😅';
    summaryTitle.textContent = '别灰心，再来一次';
    summarySubtitle.textContent = '生命用完了。复习一下本关单词，再挑战一次吧！';
    nextLevelBtn.classList.add('hidden');
  }

  summaryScreen.classList.remove('hidden');
}

/** 过关 / 失败后，稍等片刻再进入复习闪卡 */
function finishLevel(passed) {
  levelActive = false;

  const token = levelToken;
  clearTimeout(levelEndTimer);

  levelEndTimer = setTimeout(() => {
    // 如果期间已经回到首页或开始了新关卡，就不要再弹复习
    if (token !== levelToken) return;
    showLevelReview(passed);
  }, CONFIG.LEVEL_END_DELAY_MS);
}

/** 返回开始页 */
function showStartScreen() {
  levelToken += 1;
  clearTimeout(levelEndTimer);
  levelEndTimer = 0;
  stopFlashSession();
  stopTargetSpeech();

  uiMode = 'start';
  levelActive = false;

  flashScreen.classList.add('hidden');
  summaryScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');

  refreshUnitSelectionUI();
  refreshModeUI();
  refreshDifficultyUI();

  // 把顶栏和标签页标题恢复成当前选中的 Unit
  const unit = WORD_DATA[selectedUnitKey];
  if (unit) {
    const title = unit.title || `Unit ${unit.unit}`;
    unitLabel.textContent = title;
    document.title = `小又的打砖块 · ${title}`;
  }
}

/** 取得当前 Unit 的下一关；最后一关返回 null */
function getNextUnitKey(unitKey) {
  const unitKeys = Object.keys(WORD_DATA);
  const index = unitKeys.indexOf(unitKey);

  if (index === -1 || index >= unitKeys.length - 1) return null;

  return unitKeys[index + 1];
}

/* =========================================================
   五、主循环与更新
   ========================================================= */

/** 游戏主循环：更新逻辑 + 绘制画面 */
function gameLoop(now) {
  // 限制单帧时间，防止切换标签页回来后小球“瞬移”
  const dt = Math.min(Math.max((now - lastTime) / 1000, 0), 0.033);
  lastTime = now;

  update(dt);
  draw(now / 1000);

  requestAnimationFrame(gameLoop);
}

function update(dt) {
  updatePaddle(dt);
  updateParticles(dt);
  updateRingEffects(dt);

  if (gameState === 'ready') {
    attachBallToPaddle();
  } else if (gameState === 'playing' && levelActive) {
    updateBall(dt);
  }
}

/** 粒子：受一点点重力影响，逐渐变淡直至消失 */
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];

    particle.life -= dt;
    if (particle.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    particle.vy += particle.gravity * dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
  }
}

/** 光圈：从击中点向外扩散并淡出 */
function updateRingEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i -= 1) {
    const effect = effects[i];

    effect.life -= dt;
    if (effect.life <= 0) {
      effects.splice(i, 1);
      continue;
    }

    const progress = 1 - effect.life / effect.maxLife;
    effect.radius = effect.startRadius + (effect.maxRadius - effect.startRadius) * progress;
  }
}

/** 滑块移动：键盘优先，其次跟随鼠标 / 手指 */
function updatePaddle(dt) {
  let movedByKeyboard = false;

  if (keys.left) {
    paddle.x -= CONFIG.PADDLE_KEYBOARD_SPEED * dt;
    movedByKeyboard = true;
  }
  if (keys.right) {
    paddle.x += CONFIG.PADDLE_KEYBOARD_SPEED * dt;
    movedByKeyboard = true;
  }

  if (movedByKeyboard) {
    pointerTargetX = null;
  } else if (pointerTargetX !== null) {
    paddle.x = pointerTargetX - paddle.width / 2;
  }

  clampPaddle();
}

/**
 * 更新小球位置。
 * 把一帧的移动拆成几个小步，避免高速穿透砖块。
 */
function updateBall(dt) {
  const speed = Math.hypot(ball.vx, ball.vy);
  const distance = speed * dt;
  const maxStep = Math.max(4, ball.radius * 0.6);
  const steps = Math.max(1, Math.ceil(distance / maxStep));
  const stepDt = dt / steps;

  for (let i = 0; i < steps; i += 1) {
    if (moveBall(stepDt)) break;
  }
}

/**
 * 小球移动一小步，并处理所有碰撞。
 * 返回 true 表示本帧已经结束（漏球或过关）。
 */
function moveBall(dt) {
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // 左右墙
  if (ball.x - ball.radius < 0) {
    ball.x = ball.radius;
    ball.vx = Math.abs(ball.vx);
  } else if (ball.x + ball.radius > world.width) {
    ball.x = world.width - ball.radius;
    ball.vx = -Math.abs(ball.vx);
  }

  // 顶部
  if (ball.y - ball.radius < 0) {
    ball.y = ball.radius;
    ball.vy = Math.abs(ball.vy);
  }

  // 砖块
  const hit = findHitBrick();
  if (hit) {
    hitBrick(hit);
    if (gameState !== 'playing') {
      return true;
    }
  }

  // 滑块（只在下落时接球）
  if (ball.vy > 0 && ballHitsPaddle()) {
    bounceOffPaddle();
  }

  // 底部漏球
  if (ball.y - ball.radius > world.height) {
    loseLife();
    return true;
  }

  return false;
}

/* =========================================================
   六、碰撞与得分
   ========================================================= */

function findHitBrick() {
  for (let i = 0; i < bricks.length; i += 1) {
    const brick = bricks[i];
    if (brick.alive && circleHitsRect(ball.x, ball.y, ball.radius, brick)) {
      return brick;
    }
  }
  return null;
}

/** 圆与矩形是否相交 */
function circleHitsRect(cx, cy, radius, rect) {
  const closestX = clamp(cx, rect.x, rect.x + rect.width);
  const closestY = clamp(cy, rect.y, rect.y + rect.height);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= radius * radius;
}

/**
 * 击中砖块：
 *   目标砖 → 消除、加分、朗读、换新目标
 *   其他砖 → 不消除、不扣分，只做温和的红色提示
 */
function hitBrick(brick) {
  if (brick === currentTargetBrick) {
    handleCorrectHit(brick);
  } else {
    handleWrongHit(brick);
  }
}

/** 击中目标砖：消除、连击加分、粒子光效、朗读、换目标 */
function handleCorrectHit(brick) {
  brick.alive = false;
  resolveBrickBounce(brick);

  levelStats.correct += 1;
  updateCombo(combo + 1);

  // 连击加成：第 1 次只得基础分，之后每次 +2 分，最高额外 +20 分
  const comboBonus = Math.min(
    Math.max(combo - 1, 0) * CONFIG.COMBO_SCORE_STEP,
    CONFIG.COMBO_SCORE_MAX
  );
  score += CONFIG.BRICK_SCORE + comboBonus;
  updateHud();

  spawnHitParticles(brick);
  spawnHitRing(brick);

  if (window.GameAudio) {
    GameAudio.playCorrect();

    // 稍等音效起音后再朗读，孩子更容易听清单词
    window.setTimeout(() => {
      if (window.GameAudio) {
        GameAudio.speakWord(brick.word);
      }
    }, 160);
  }

  if (bricks.every((item) => !item.alive)) {
    gameState = 'won';
    currentTargetBrick = null;
    ball.vx = 0;
    ball.vy = 0;

    if (window.GameAudio) {
      GameAudio.playPass();
    }

    finishLevel(true);
  } else {
    // 换新目标前做一次死局检测，只选小球打得到的砖块
    ensureTargetReachable();
  }
}

/** 击中错误砖：温和闪烁、连击清零，不消除、不扣分、不扣命 */
function handleWrongHit(brick) {
  brick.wrongFlashUntil = performance.now() + CONFIG.WRONG_FLASH_MS;
  resolveBrickBounce(brick);

  levelStats.wrong += 1;
  updateCombo(0);

  if (window.GameAudio) {
    GameAudio.playWrong();
  }
}

/** 在砖块中心喷出彩色粒子；连击 ≥3 时粒子更多、更亮 */
function spawnHitParticles(brick) {
  const style = getBrickStyle(brick);
  const centerX = brick.x + brick.width / 2;
  const centerY = brick.y + brick.height / 2;
  const isHotCombo = combo >= CONFIG.COMBO_SPEED_THRESHOLD;
  const count = CONFIG.PARTICLE_COUNT + (isHotCombo ? 8 : 0);
  const palette = [style.top, style.bottom, '#ffffff', '#ffd166'];

  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 70 + Math.random() * (isHotCombo ? 190 : 150);
    const life = 0.42 + Math.random() * 0.4;

    particles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30,
      gravity: 260,
      size: 2.5 + Math.random() * (isHotCombo ? 4.5 : 3),
      life,
      maxLife: life,
      color: palette[Math.floor(Math.random() * palette.length)]
    });
  }
}

/** 在砖块中心加一圈柔和扩散的光环 */
function spawnHitRing(brick) {
  const style = getBrickStyle(brick);
  const isHotCombo = combo >= CONFIG.COMBO_SPEED_THRESHOLD;

  effects.push({
    x: brick.x + brick.width / 2,
    y: brick.y + brick.height / 2,
    radius: 10,
    startRadius: 10,
    maxRadius: isHotCombo ? 96 : 72,
    life: 0.38,
    maxLife: 0.38,
    color: isHotCombo ? '#ffb52e' : style.bottom
  });
}

/**
 * 计算当前小球能够打到的砖块（即“外层、可达”的砖块）。
 *
 * 做法：
 *   1. 把画布中“小球圆心可以出现的位置”按 8px 采样成网格；
 *   2. 每块活砖向外扩大一个球半径（12px）后标记为障碍。
 *      砖块之间只有 10~14px 缝隙，比小球直径 24px 窄，
 *      扩大后这些缝隙会被完全封住，和真实碰撞一致；
 *   3. 从画布四边做洪水填充（小球可以沿墙自由移动）；
 *   4. 若某块砖附近存在可达的接触位置，这块砖就是能被打到的。
 *
 * 被其他砖块完全包围、或只隔着封闭空洞的砖块不会出现在结果里。
 */
function getReachableBricks() {
  const activeBricks = bricks.filter((brick) => brick.alive);
  if (activeBricks.length === 0) return [];

  const radius = CONFIG.BALL_RADIUS;
  const step = REACH_SAMPLE_STEP;
  const minX = radius;
  const minY = radius;
  const maxX = Math.max(minX, world.width - radius);
  const maxY = Math.max(minY, world.height - radius);

  const cols = Math.max(1, Math.floor((maxX - minX) / step) + 1);
  const rows = Math.max(1, Math.floor((maxY - minY) / step) + 1);
  const totalCells = cols * rows;
  const blocked = new Uint8Array(totalCells);

  // 活砖向外扩大一个球半径 = 小球圆心不能进入的区域
  activeBricks.forEach((brick) => {
    const left = brick.x - radius;
    const right = brick.x + brick.width + radius;
    const top = brick.y - radius;
    const bottom = brick.y + brick.height + radius;

    const fromCol = Math.max(0, Math.ceil((left - minX) / step));
    const toCol = Math.min(cols - 1, Math.floor((right - minX) / step));
    const fromRow = Math.max(0, Math.ceil((top - minY) / step));
    const toRow = Math.min(rows - 1, Math.floor((bottom - minY) / step));

    for (let row = fromRow; row <= toRow; row += 1) {
      const rowOffset = row * cols;
      for (let col = fromCol; col <= toCol; col += 1) {
        blocked[rowOffset + col] = 1;
      }
    }
  });

  // 从画布四边开始洪水填充，得到小球圆心能到达的所有位置
  const reachable = new Uint8Array(totalCells);
  const queue = [];
  let head = 0;

  function visit(col, row) {
    if (col < 0 || col >= cols || row < 0 || row >= rows) return;

    const index = row * cols + col;
    if (blocked[index] || reachable[index]) return;

    reachable[index] = 1;
    queue.push(index);
  }

  for (let col = 0; col < cols; col += 1) {
    visit(col, 0);
    visit(col, rows - 1);
  }
  for (let row = 0; row < rows; row += 1) {
    visit(0, row);
    visit(cols - 1, row);
  }

  while (head < queue.length) {
    const index = queue[head];
    head += 1;

    const col = index % cols;
    const row = (index - col) / cols;

    visit(col - 1, row);
    visit(col + 1, row);
    visit(col, row - 1);
    visit(col, row + 1);
  }

  // 判断一个矩形区域内是否存在可达的采样点
  function hasReachablePointInRect(left, right, top, bottom) {
    const fromCol = Math.max(0, Math.ceil((left - minX) / step));
    const toCol = Math.min(cols - 1, Math.floor((right - minX) / step));
    const fromRow = Math.max(0, Math.ceil((top - minY) / step));
    const toRow = Math.min(rows - 1, Math.floor((bottom - minY) / step));

    for (let row = fromRow; row <= toRow; row += 1) {
      const rowOffset = row * cols;
      for (let col = fromCol; col <= toCol; col += 1) {
        if (reachable[rowOffset + col]) return true;
      }
    }

    return false;
  }

  // 在砖块的四条边外侧各取一条很窄的“接触带”。
  // 只要任意一侧的接触带里存在可达位置，小球就能从这一侧打到它。
  // 只认边中部的接触带，可以避免把斜对角的 10~14px 小缝误判成可达。
  const sideRange = step * 1.5;

  return activeBricks.filter((brick) => {
    const left = brick.x;
    const right = brick.x + brick.width;
    const top = brick.y;
    const bottom = brick.y + brick.height;

    return (
      hasReachablePointInRect(
        left,
        right,
        top - radius - sideRange,
        top - radius
      ) ||
      hasReachablePointInRect(
        left,
        right,
        bottom + radius,
        bottom + radius + sideRange
      ) ||
      hasReachablePointInRect(
        left - radius - sideRange,
        left - radius,
        top,
        bottom
      ) ||
      hasReachablePointInRect(
        right + radius,
        right + radius + sideRange,
        top,
        bottom
      )
    );
  });
}

/**
 * 从场上尚未消除的砖块里随机选一个作为新目标。
 * 默认只从“小球能打到”的砖块中选；如果外部传入了候选列表则优先使用。
 * 如果剩余砖块多于一块，尽量避免和上一块相同。
 */
function pickNewTarget(candidates) {
  const remaining = bricks.filter((brick) => brick.alive);

  if (remaining.length === 0) {
    currentTargetBrick = null;
    return;
  }

  const reachable = Array.isArray(candidates)
    ? candidates.filter((brick) => brick.alive)
    : getReachableBricks();
  const pool = reachable.length > 0 ? reachable : remaining;

  let next = pool[Math.floor(Math.random() * pool.length)];

  if (pool.length > 1 && next === currentTargetBrick) {
    const alternatives = pool.filter(
      (brick) => brick !== currentTargetBrick
    );
    next = alternatives[Math.floor(Math.random() * alternatives.length)];
  }

  currentTargetBrick = next;
  targetChangedAt = performance.now();

  // 模式 B 换目标后，稍等片刻再朗读新目标的英文单词
  if (uiMode === 'game' && levelActive) {
    speakTargetWord(CONFIG.TARGET_SPEAK_DELAY_MS);
  }
}

/**
 * 模式 B：朗读当前目标砖块的英文单词。
 * 延迟执行可以避免和击中音效、上一个单词的朗读互相打断。
 */
function speakTargetWord(delay) {
  clearTimeout(targetSpeechTimer);
  targetSpeechTimer = 0;

  if (selectedMode !== 'B' || !currentTargetBrick) return;
  if (uiMode !== 'game' || !levelActive) return;
  if (!window.GameAudio) return;

  const word = currentTargetBrick.word;

  targetSpeechTimer = window.setTimeout(() => {
    targetSpeechTimer = 0;

    if (
      selectedMode === 'B' &&
      uiMode === 'game' &&
      levelActive &&
      currentTargetBrick &&
      currentTargetBrick.alive &&
      currentTargetBrick.word === word
    ) {
      GameAudio.speakWord(word);
    }
  }, delay);
}

/** 停止尚未执行的“朗读目标”计时器 */
function stopTargetSpeech() {
  clearTimeout(targetSpeechTimer);
  targetSpeechTimer = 0;
}

/**
 * 死局检测：如果当前目标砖块已经无法被小球打到
 * （被其他砖块完全包围，或只连着封闭空洞），
 * 就自动重新随机选择一个当前可达的外层目标，顶部提示会随之更新。
 */
function ensureTargetReachable() {
  const remaining = bricks.filter((brick) => brick.alive);

  if (remaining.length === 0) {
    currentTargetBrick = null;
    return;
  }

  const reachable = getReachableBricks();

  // 极端兜底：理论上总会有外层砖块，如果检测为空就保持场上砖块可选
  if (reachable.length === 0) {
    if (!currentTargetBrick || !currentTargetBrick.alive) {
      pickNewTarget(remaining);
    }
    return;
  }

  if (
    !currentTargetBrick ||
    !currentTargetBrick.alive ||
    !reachable.includes(currentTargetBrick)
  ) {
    pickNewTarget(reachable);
  }
}

/**
 * 根据穿透深度判断小球从哪一侧撞上砖块，
 * 然后把小球推到砖块外侧并反转对应方向的速度。
 */
function resolveBrickBounce(brick) {
  const overlapLeft = ball.x + ball.radius - brick.x;
  const overlapRight = brick.x + brick.width - (ball.x - ball.radius);
  const overlapTop = ball.y + ball.radius - brick.y;
  const overlapBottom = brick.y + brick.height - (ball.y - ball.radius);

  const overlapX = Math.min(overlapLeft, overlapRight);
  const overlapY = Math.min(overlapTop, overlapBottom);

  if (overlapX < overlapY) {
    if (overlapLeft < overlapRight) {
      ball.x -= overlapLeft;
      ball.vx = -Math.abs(ball.vx);
    } else {
      ball.x += overlapRight;
      ball.vx = Math.abs(ball.vx);
    }
  } else if (overlapTop < overlapBottom) {
    ball.y -= overlapTop;
    ball.vy = -Math.abs(ball.vy);
  } else {
    ball.y += overlapBottom;
    ball.vy = Math.abs(ball.vy);
  }
}

/** 小球是否碰到滑块（左右判定区适当加宽） */
function ballHitsPaddle() {
  if (ball.y + ball.radius < paddle.y) return false;
  if (ball.y - ball.radius > paddle.y + paddle.height) return false;

  const left = paddle.x - CONFIG.PADDLE_HIT_PAD;
  const right = paddle.x + paddle.width + CONFIG.PADDLE_HIT_PAD;
  return ball.x >= left && ball.x <= right;
}

/** 根据击中滑块的位置决定反弹角度 */
function bounceOffPaddle() {
  const halfRange = paddle.width / 2 + CONFIG.PADDLE_HIT_PAD;
  const hitOffset = clamp(
    (ball.x - (paddle.x + paddle.width / 2)) / halfRange,
    -1,
    1
  );
  const angle = hitOffset * MAX_BOUNCE_ANGLE;
  const speed = Math.hypot(ball.vx, ball.vy) || getStartSpeed();

  ball.vx = Math.sin(angle) * speed;
  ball.vy = -Math.cos(angle) * speed;
  ball.y = paddle.y - ball.radius - 0.5;
}

/** 漏球：扣一条命；命用完则本局失败 */
function loseLife() {
  lives = Math.max(0, lives - 1);
  updateHud();

  ball.vx = 0;
  ball.vy = 0;
  ball.attached = true;
  attachBallToPaddle();

  // 漏球也会中断连击
  updateCombo(0);

  if (lives <= 0) {
    gameState = 'over';
    finishLevel(false);
  } else {
    gameState = 'ready';
  }
}

/** 把小球放到滑块正上方 */
function attachBallToPaddle() {
  ball.x = paddle.x + paddle.width / 2;
  ball.y = paddle.y - ball.radius - 3;
}

function clampPaddle() {
  paddle.x = clamp(paddle.x, 0, Math.max(0, world.width - paddle.width));
}

/** 发球 */
function launchBall() {
  if (gameState !== 'ready' || !levelActive) return;

  gameState = 'playing';
  ball.attached = false;

  // 初始方向略微随机，避免每次路线完全相同
  const speed = getStartSpeed();
  const angle = (Math.random() * 2 - 1) * 0.42;
  ball.vx = Math.sin(angle) * speed;
  ball.vy = -Math.cos(angle) * speed;
}

/* =========================================================
   七、界面与 HUD
   ========================================================= */

function updateHud() {
  scoreValue.textContent = String(score);

  const fullHearts = '❤'.repeat(lives);
  const emptyHearts = '♡'.repeat(Math.max(0, CONFIG.START_LIVES - lives));
  livesValue.textContent = fullHearts + emptyHearts;
  livesValue.setAttribute('aria-label', `剩余 ${lives} 条命`);
}

/* =========================================================
   八、绘制
   ========================================================= */

function draw(time) {
  const scaleX = canvas.width / world.width;
  const scaleY = canvas.height / world.height;

  ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  ctx.clearRect(0, 0, world.width, world.height);

  drawBackground(time);
  drawTargetCard();
  drawBricks();
  drawPaddle();
  drawBall();
  drawRingEffects();
  drawParticles();
  drawComboBadge();

  if (gameState === 'ready' && levelActive) {
    drawReadyHint(time);
  }
}

/** 柔和渐变背景 + 慢慢漂浮的半透明泡泡 */
function drawBackground(time) {
  const gradient = ctx.createLinearGradient(0, 0, 0, world.height);
  gradient.addColorStop(0, '#c8efff');
  gradient.addColorStop(0.6, '#ebfaff');
  gradient.addColorStop(1, '#fff6d9');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, world.width, world.height);

  const bubbles = [
    { x: 0.12, y: 0.22, r: 0.1, phase: 0 },
    { x: 0.88, y: 0.18, r: 0.08, phase: 1.7 },
    { x: 0.8, y: 0.8, r: 0.12, phase: 3.1 },
    { x: 0.2, y: 0.82, r: 0.06, phase: 4.4 }
  ];

  ctx.save();
  ctx.fillStyle = '#ffffff';

  bubbles.forEach((bubble, index) => {
    const radius = Math.min(world.width, world.height) * bubble.r;
    const x = world.width * bubble.x + Math.sin(time * 0.35 + bubble.phase) * 8;
    const y = world.height * bubble.y + Math.cos(time * 0.28 + bubble.phase) * 10;

    ctx.globalAlpha = 0.18 + (index % 2) * 0.06;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

/**
 * 画布顶部的目标卡片：
 * 模式 A 显示中文释义 + emoji，模式 B 显示英文单词 + emoji。
 * 卡片只在场上有目标时绘制，切换目标时会轻轻弹一下。
 */
function drawTargetCard() {
  if (!currentTargetBrick) return;

  const isPortrait = world.isPortrait;
  const cardHeight = isPortrait ? 76 : 64;
  const cardWidth = Math.min(
    world.width - (isPortrait ? 80 : 140),
    isPortrait ? 660 : 820
  );
  const x = (world.width - cardWidth) / 2;
  const y = 12;
  const hasEmoji = !!currentTargetBrick.emoji;
  const isModeB = selectedMode === 'B';
  const modeConfig = GAME_MODES[selectedMode] || GAME_MODES.A;

  // 新目标出现时轻微放大，频率很低，不刺眼
  const sinceChange = performance.now() - targetChangedAt;
  const progress = clamp(sinceChange / 280, 0, 1);
  const pulse = 1 + Math.sin(progress * Math.PI) * 0.02;

  const centerX = x + cardWidth / 2;
  const centerY = y + cardHeight / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(pulse, pulse);
  ctx.translate(-centerX, -centerY);

  // 卡片背景
  ctx.shadowColor = 'rgba(30, 100, 145, 0.16)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;

  const background = ctx.createLinearGradient(0, y, 0, y + cardHeight);
  background.addColorStop(0, '#ffffff');
  background.addColorStop(1, '#fff8e5');
  ctx.fillStyle = background;
  roundRectPath(x, y, cardWidth, cardHeight, cardHeight / 2);
  ctx.fill();

  ctx.shadowColor = 'transparent';

  // 左侧 emoji 圆底（emoji 为空时按规格只显示中文）
  if (hasEmoji) {
    const emojiX = x + (isPortrait ? 40 : 36);
    const emojiY = y + cardHeight / 2;
    const emojiRadius = isPortrait ? 24 : 22;

    ctx.fillStyle = 'rgba(255, 209, 102, 0.3)';
    ctx.beginPath();
    ctx.arc(emojiX, emojiY, emojiRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = `${
      isPortrait ? 30 : 28
    }px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentTargetBrick.emoji, emojiX, emojiY + 1);
  }

  // 说明文字
  const textLeft = x + (hasEmoji ? (isPortrait ? 78 : 70) : 28);
  const textRight = x + cardWidth - 20;
  const maxTextWidth = textRight - textLeft;

  ctx.textAlign = 'left';
  ctx.font = `700 ${isPortrait ? 14 : 13}px ${UI_FONT_FAMILY}`;
  ctx.fillStyle = '#6a8aa3';
  ctx.fillText(modeConfig.targetHint, textLeft, y + cardHeight * 0.32);

  // 右侧剩余砖块数
  const remaining = bricks.filter((brick) => brick.alive).length;
  ctx.textAlign = 'right';
  ctx.font = `700 ${isPortrait ? 13 : 12}px ${UI_FONT_FAMILY}`;
  ctx.fillStyle = '#93a9ba';
  ctx.fillText(`剩余 ${remaining} 块`, x + cardWidth - 20, y + cardHeight * 0.32);

  // 模式 A 显示中文释义，模式 B 显示英文单词（太长时自动缩小）
  const promptText = isModeB
    ? currentTargetBrick.word || ''
    : currentTargetBrick.zh || '';
  const promptFontFamily = isModeB ? BRICK_FONT_FAMILY : UI_FONT_FAMILY;
  const promptFontSize = fitTextFontSize(
    promptText,
    maxTextWidth,
    isPortrait ? 26 : 22,
    12,
    promptFontFamily,
    800
  );

  ctx.textAlign = 'left';
  ctx.font = `800 ${promptFontSize}px ${promptFontFamily}`;
  ctx.fillStyle = '#123a5c';
  ctx.fillText(promptText, textLeft, y + cardHeight * 0.68);

  // 金色描边
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 3;
  roundRectPath(x, y, cardWidth, cardHeight, cardHeight / 2);
  ctx.stroke();

  ctx.restore();
}

/** 在限定宽度内找到能放下的最大字号 */
function fitTextFontSize(
  text,
  maxWidth,
  startSize,
  minSize,
  fontFamily,
  fontWeight
) {
  let size = startSize;
  const family = fontFamily || UI_FONT_FAMILY;
  const weight = fontWeight || 800;

  while (size > minSize) {
    measureCtx.font = `${weight} ${size}px ${family}`;
    if (measureCtx.measureText(text).width <= maxWidth) break;
    size -= 1;
  }

  return size;
}

function drawBricks() {
  bricks.forEach((brick) => {
    if (!brick.alive) return;

    const style = getBrickStyle(brick);
    const radius = Math.min(14, brick.height * 0.28);

    // 底部阴影，让砖块有一点厚度
    ctx.fillStyle = 'rgba(22, 86, 126, 0.12)';
    roundRectPath(brick.x, brick.y + 4, brick.width, brick.height, radius);
    ctx.fill();

    // 主体渐变
    const gradient = ctx.createLinearGradient(
      0,
      brick.y,
      0,
      brick.y + brick.height
    );
    gradient.addColorStop(0, style.top);
    gradient.addColorStop(1, style.bottom);

    ctx.fillStyle = gradient;
    roundRectPath(brick.x, brick.y, brick.width, brick.height, radius);
    ctx.fill();

    // 顶部高光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
    roundRectPath(
      brick.x + 8,
      brick.y + 6,
      brick.width - 16,
      Math.max(4, brick.height * 0.14),
      999
    );
    ctx.fill();

    // 击错时的红色柔光（约 0.32 秒，单次平滑脉冲，不快速闪烁）
    const flashAlpha = getWrongFlashAlpha(brick);
    if (flashAlpha > 0) {
      ctx.fillStyle = `rgba(255, 86, 86, ${flashAlpha})`;
      roundRectPath(brick.x, brick.y, brick.width, brick.height, radius);
      ctx.fill();
    }

    // 英文单词
    drawBrickText(brick, style);

    if (flashAlpha > 0) {
      ctx.strokeStyle = `rgba(206, 52, 52, ${0.35 + flashAlpha * 0.6})`;
      ctx.lineWidth = 3;
      roundRectPath(brick.x, brick.y, brick.width, brick.height, radius);
      ctx.stroke();
    }
  });
}

/** 计算错误闪烁当前的透明度；0 表示没有闪烁 */
function getWrongFlashAlpha(brick) {
  const remaining = brick.wrongFlashUntil - performance.now();
  if (remaining <= 0) return 0;

  const progress = clamp(1 - remaining / CONFIG.WRONG_FLASH_MS, 0, 1);
  return Math.sin(progress * Math.PI) * 0.45;
}

/** 在砖块中央绘制当前模式的文字（英文或中文，支持一到三行） */
function drawBrickText(brick, style) {
  const lines = brick.textLines || [getBrickDisplayText(brick)];
  const fontSize = brick.textFontSize || 16;
  const lineHeight = brick.textLineHeight || fontSize * 1.08;
  const centerX = brick.x + brick.width / 2;
  const centerY = brick.y + brick.height / 2 + 1;
  const firstLineY = centerY - ((lines.length - 1) * lineHeight) / 2;

  ctx.save();
  ctx.font = `700 ${fontSize}px ${
    brick.textFontFamily || getBrickFontFamily()
  }`;
  ctx.fillStyle = style.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  lines.forEach((line, index) => {
    ctx.fillText(line, centerX, firstLineY + index * lineHeight);
  });

  ctx.restore();
}

function drawPaddle() {
  const radius = paddle.height / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(20, 110, 170, 0.3)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 5;

  const gradient = ctx.createLinearGradient(
    0,
    paddle.y,
    0,
    paddle.y + paddle.height
  );
  gradient.addColorStop(0, '#9be3ff');
  gradient.addColorStop(0.5, '#45b7f4');
  gradient.addColorStop(1, '#1e8ed6');

  ctx.fillStyle = gradient;
  roundRectPath(paddle.x, paddle.y, paddle.width, paddle.height, radius);
  ctx.fill();
  ctx.restore();

  // 顶部高光
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  roundRectPath(paddle.x + 14, paddle.y + 4, paddle.width - 28, 5, 2.5);
  ctx.fill();

  // 两端的小圆点，增加一点可爱感
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.arc(paddle.x + 12, paddle.y + paddle.height / 2, 3.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(
    paddle.x + paddle.width - 12,
    paddle.y + paddle.height / 2,
    3.2,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

function drawBall() {
  // 掉出画面后不再绘制
  if (ball.y - ball.radius > world.height + 30) return;

  ctx.save();
  ctx.shadowColor = 'rgba(255, 176, 32, 0.85)';
  ctx.shadowBlur = 18;

  const gradient = ctx.createRadialGradient(
    ball.x - ball.radius * 0.35,
    ball.y - ball.radius * 0.35,
    ball.radius * 0.15,
    ball.x,
    ball.y,
    ball.radius * 1.05
  );
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.55, '#ffe27a');
  gradient.addColorStop(1, '#ffb52e');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 绘制击中砖块时喷出的彩色粒子 */
function drawParticles() {
  if (particles.length === 0) return;

  ctx.save();

  particles.forEach((particle) => {
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);

    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(
      particle.x,
      particle.y,
      particle.size * (0.6 + alpha * 0.4),
      0,
      Math.PI * 2
    );
    ctx.fill();
  });

  ctx.restore();
}

/** 绘制击中砖块时向外扩散的柔和光圈 */
function drawRingEffects() {
  if (effects.length === 0) return;

  ctx.save();

  effects.forEach((effect) => {
    const progress = 1 - effect.life / effect.maxLife;

    ctx.globalAlpha = (1 - progress) * 0.55;
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 2 + (1 - progress) * 4;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
    ctx.stroke();
  });

  ctx.restore();
}

/**
 * 在滑块上方显示连击提示。
 * 连击达到 3 次后变成暖金色，并提示“加速”。
 */
function drawComboBadge() {
  if (combo < 2 || gameState !== 'playing') return;

  const isHotCombo = combo >= CONFIG.COMBO_SPEED_THRESHOLD;
  const text = isHotCombo ? `🔥 连击 x${combo} · 加速` : `连击 x${combo}`;
  const fontSize = world.isPortrait ? 24 : 20;
  const height = world.isPortrait ? 54 : 46;

  ctx.save();
  ctx.font = `900 ${fontSize}px ${UI_FONT_FAMILY}`;

  const textWidth = ctx.measureText(text).width;
  const width = textWidth + (world.isPortrait ? 56 : 48);
  const x = (world.width - width) / 2;
  const y = paddle.y - (world.isPortrait ? 118 : 96);

  // 连击变化时轻轻弹一下，幅度温和、频率低
  const sinceChange = performance.now() - comboChangedAt;
  const progress = clamp(sinceChange / 220, 0, 1);
  const pulse = 1 + Math.sin(progress * Math.PI) * 0.06;
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  ctx.translate(centerX, centerY);
  ctx.scale(pulse, pulse);
  ctx.translate(-centerX, -centerY);

  ctx.shadowColor = isHotCombo
    ? 'rgba(255, 140, 30, 0.42)'
    : 'rgba(20, 90, 130, 0.22)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;

  const gradient = ctx.createLinearGradient(0, y, 0, y + height);
  if (isHotCombo) {
    gradient.addColorStop(0, '#fff6da');
    gradient.addColorStop(1, '#ffd166');
  } else {
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(1, '#eaf8ff');
  }

  ctx.fillStyle = gradient;
  roundRectPath(x, y, width, height, height / 2);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = isHotCombo ? '#ffb52e' : '#a9def5';
  ctx.lineWidth = 2.5;
  roundRectPath(x, y, width, height, height / 2);
  ctx.stroke();

  ctx.fillStyle = isHotCombo ? '#b45309' : '#0d5d8c';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, centerX, centerY + 1);

  ctx.restore();
}

/** 等待发球时，在滑块上方显示温和的呼吸提示 */
function drawReadyHint(time) {
  const text = '点击 / 轻触发球';
  const fontSize = world.isPortrait ? 22 : 20;

  ctx.save();
  ctx.font = `700 ${fontSize}px "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif`;

  const textWidth = ctx.measureText(text).width;
  const width = textWidth + 40;
  const height = 38;
  const x = paddle.x + paddle.width / 2 - width / 2;
  const y = paddle.y - 76;

  // 频率很低、幅度温和的呼吸效果（不闪烁）
  ctx.globalAlpha = 0.76 + Math.sin(time * 3.2) * 0.14;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.shadowColor = 'rgba(20, 80, 120, 0.16)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  roundRectPath(x, y, width, height, height / 2);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#0d5d8c';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + width / 2, y + height / 2 + 1);

  ctx.restore();
}

/** 圆角矩形路径（只画路径，由调用者决定填充或描边） */
function roundRectPath(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

/* =========================================================
   九、输入事件
   ========================================================= */

/** 把鼠标 / 手指的屏幕横坐标换算成游戏逻辑坐标 */
function pointerXToWorld(clientX) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0) return null;
  return ((clientX - rect.left) / rect.width) * world.width;
}

canvas.addEventListener('pointerdown', (event) => {
  event.preventDefault();

  // 首次点击时解锁 Web Audio（浏览器要求由用户操作触发）
  if (window.GameAudio) {
    GameAudio.unlock();
  }

  if (canvas.setPointerCapture) {
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (error) {
      // 某些浏览器不支持捕获指针，忽略即可
    }
  }

  const x = pointerXToWorld(event.clientX);
  if (x !== null) {
    pointerTargetX = x;
    updatePaddle(0); // 点击时立刻响应，不用等下一帧
  }

  if (gameState === 'ready') {
    launchBall();
  }
});

canvas.addEventListener('pointermove', (event) => {
  // 鼠标悬停即跟随；触屏在按住拖动时触发
  const x = pointerXToWorld(event.clientX);
  if (x !== null) {
    pointerTargetX = x;
  }
});

window.addEventListener('keydown', (event) => {
  if (window.GameAudio) {
    GameAudio.unlock();
  }

  if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
    keys.left = true;
    event.preventDefault();
  } else if (
    event.key === 'ArrowRight' ||
    event.key === 'd' ||
    event.key === 'D'
  ) {
    keys.right = true;
    event.preventDefault();
  } else if (event.code === 'Space') {
    // 只在真正游戏中拦截空格，避免影响开始页/闪卡上的按钮
    if (levelActive) {
      event.preventDefault();
      if (gameState === 'ready') {
        launchBall();
      }
    }
  }
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
    keys.left = false;
  } else if (
    event.key === 'ArrowRight' ||
    event.key === 'd' ||
    event.key === 'D'
  ) {
    keys.right = false;
  }
});

/* ---------------- 开始页 / 闪卡 / 结算页按钮 ---------------- */

modeOptions.addEventListener('click', (event) => {
  const button = event.target.closest('[data-mode]');
  if (!button) return;

  if (window.GameAudio) {
    GameAudio.unlock();
  }

  selectMode(button.dataset.mode);
});

difficultyOptions.addEventListener('click', (event) => {
  const button = event.target.closest('[data-difficulty]');
  if (!button) return;

  selectDifficulty(button.dataset.difficulty);
});

startBtn.addEventListener('click', () => {
  if (window.GameAudio) {
    GameAudio.unlock();
  }

  isSlowMode = slowModeToggle.checked;
  startLevel(selectedUnitKey);
});

slowModeToggle.addEventListener('change', () => {
  isSlowMode = slowModeToggle.checked;
});

flashSkipBtn.addEventListener('click', () => {
  if (!flashSession || typeof flashSession.skip !== 'function') return;
  flashSession.skip();
});

flashContinueBtn.addEventListener('click', () => {
  if (!flashSession) return;

  const onFinish = flashSession.onFinish;
  flashSession.done = true;
  stopFlashSession();

  if (typeof onFinish === 'function') {
    onFinish();
  }
});

nextLevelBtn.addEventListener('click', () => {
  const nextKey = getNextUnitKey(currentUnitKey);

  if (window.GameAudio) {
    GameAudio.unlock();
  }

  if (nextKey) {
    startLevel(nextKey);
  }
});

replayLevelBtn.addEventListener('click', () => {
  if (window.GameAudio) {
    GameAudio.unlock();
  }

  startLevel(currentUnitKey);
});

homeBtn.addEventListener('click', () => {
  showStartScreen();
});

// 窗口尺寸变化时重新缩放画布（合并到下一帧执行，避免频繁计算）
let resizeFrame = 0;

function scheduleFit() {
  if (resizeFrame) return;

  resizeFrame = requestAnimationFrame(() => {
    resizeFrame = 0;
    fitCanvas();
  });
}

window.addEventListener('resize', scheduleFit);
window.addEventListener('orientationchange', scheduleFit);

if (typeof ResizeObserver !== 'undefined') {
  const resizeObserver = new ResizeObserver(scheduleFit);
  resizeObserver.observe(stage);
}

/* =========================================================
   十、工具函数与启动
   ========================================================= */

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function init() {
  buildUnitGrid();
  refreshUnitSelectionUI();
  refreshModeUI();
  refreshDifficultyUI();
  fitCanvas();

  // 开始页背后先放好当前 Unit 的砖块，点“开始游戏”后直接进入预习
  loadUnit(selectedUnitKey);

  requestAnimationFrame(gameLoop);
}

init();
