/* =========================================================
   单词词库 —— 家长可以自由修改这个文件！
   ---------------------------------------------------------
   修改方法：
   1. 用记事本、VS Code 等文本编辑器打开本文件；
   2. 按下面的格式增删单词；
   3. 保存后刷新浏览器，改动立即生效，不用动其他代码。

   每个单词的字段：
     word  英文单词（必填，字符串）
     zh    中文意思（必填，字符串）
     pos   词性，只能是 "noun" / "verb" / "adj" / "other"
           （决定砖块颜色：名词蓝、动词橙、形容词绿、其他灰）
     emoji 表情（可为空字符串 ""）
     key   可选。带 key: true 的是核心词。
           一关超过 18 个单词时，会优先保留核心词，
           再用其他单词随机补足 18 块砖。

   说明：
   · unit1 ~ unit6 是六个关卡，每关最多铺 18 块砖；
   · 单词超过 18 个时，每次开局随机抽 18 个（核心词优先），
     多玩几次就能覆盖全部单词；
   · 不足 18 个时按实际数量布局。
   ========================================================= */

const WORD_DATA = {
  unit1: {
    unit: 1,
    title: "Unit 1 · 运动与时间",
    words: [
      { word: "jump",       zh: "跳",                       pos: "verb",  emoji: "🦘", key: true },
      { word: "rope",       zh: "绳",                       pos: "noun",  emoji: "🪢" },
      { word: "swim",       zh: "游泳",                     pos: "verb",  emoji: "🏊", key: true },
      { word: "run",        zh: "跑；跑步",                 pos: "verb",  emoji: "🏃", key: true },
      { word: "play",       zh: "参加（体育运动、游戏、比赛等）", pos: "verb",  emoji: "🏅", key: true },
      { word: "ping-pong",  zh: "乒乓球",                   pos: "noun",  emoji: "🏓", key: true },
      { word: "basketball", zh: "篮球",                     pos: "noun",  emoji: "🏀", key: true },
      { word: "football",   zh: "足球",                     pos: "noun",  emoji: "⚽", key: true },
      { word: "once",       zh: "一次",                     pos: "other", emoji: "1️⃣" },
      { word: "week",       zh: "一周",                     pos: "noun",  emoji: "📅", key: true },
      { word: "twice",      zh: "两次",                     pos: "other", emoji: "2️⃣" },
      { word: "time",       zh: "次",                       pos: "noun",  emoji: "🔢", key: true },
      { word: "every",      zh: "每",                       pos: "other", emoji: "🔁", key: true },
      { word: "day",        zh: "一天",                     pos: "noun",  emoji: "📆", key: true },
      { word: "sport",      zh: "体育运动",                 pos: "noun",  emoji: "🏆" },
      { word: "make",       zh: "使变得；结成（朋友）",     pos: "verb",  emoji: "🤝" },
      { word: "be good at", zh: "擅长",                     pos: "verb",  emoji: "💪" },
      { word: "from",       zh: "来自",                     pos: "other", emoji: "📍", key: true },
      { word: "the USA",    zh: "美国",                     pos: "noun",  emoji: "🗽" },
      { word: "China",      zh: "中国",                     pos: "noun",  emoji: "🏯", key: true }
    ]
  },

  unit2: {
    unit: 2,
    title: "Unit 2 · 业余爱好",
    words: [
      { word: "dance",   zh: "跳舞",           pos: "verb",  emoji: "💃", key: true },
      { word: "play",    zh: "演奏（乐器）",   pos: "verb",  emoji: "🎹", key: true },
      { word: "guitar",  zh: "吉他",           pos: "noun",  emoji: "🎸" },
      { word: "paint",   zh: "（用颜料）画",   pos: "verb",  emoji: "🎨" },
      { word: "listen",  zh: "听",             pos: "verb",  emoji: "👂", key: true },
      { word: "music",   zh: "音乐；乐曲",     pos: "noun",  emoji: "🎵", key: true },
      { word: "collect", zh: "收集",           pos: "verb",  emoji: "📦" },
      { word: "stamp",   zh: "邮票",           pos: "noun",  emoji: "📮" },
      { word: "weiqi",   zh: "围棋",           pos: "noun",  emoji: "⚫" },
      { word: "read",    zh: "读；阅读",       pos: "verb",  emoji: "📖", key: true },
      { word: "story",   zh: "故事",           pos: "noun",  emoji: "📚", key: true },
      { word: "practise", zh: "练习",          pos: "verb",  emoji: "✏️" },
      { word: "kung fu", zh: "功夫",           pos: "noun",  emoji: "🥋" },
      { word: "drum",    zh: "鼓",             pos: "noun",  emoji: "🥁" },
      { word: "hobby",   zh: "业余爱好",       pos: "noun",  emoji: "🎯" },
      { word: "these",   zh: "这些",           pos: "other", emoji: "👉", key: true },
      { word: "any",     zh: "任何的；任一的", pos: "other", emoji: "❓", key: true },
      { word: "fishing", zh: "钓鱼",           pos: "noun",  emoji: "🎣" },
      { word: "eat",     zh: "吃；吃饭",       pos: "verb",  emoji: "🍽️" }
    ]
  },

  unit3: {
    unit: 3,
    title: "Unit 3 · 天气",
    words: [
      { word: "hot",       zh: "温度高的；热的",     pos: "adj",   emoji: "🥵", key: true },
      { word: "warm",      zh: "温暖的",             pos: "adj",   emoji: "🌤️", key: true },
      { word: "cool",      zh: "凉的；凉爽的",       pos: "adj",   emoji: "🍃", key: true },
      { word: "cold",      zh: "寒冷的",             pos: "adj",   emoji: "🥶", key: true },
      { word: "sunny",     zh: "阳光充足的；阳光灿烂的", pos: "adj", emoji: "☀️", key: true },
      { word: "rainy",     zh: "多雨的",             pos: "adj",   emoji: "🌧️" },
      { word: "cloudy",    zh: "多云的；阴的",       pos: "adj",   emoji: "☁️", key: true },
      { word: "snowy",     zh: "下雪多的",           pos: "adj",   emoji: "❄️" },
      { word: "windy",     zh: "多风的",             pos: "adj",   emoji: "💨", key: true },
      { word: "weather",   zh: "天气",               pos: "noun",  emoji: "🌦️", key: true },
      { word: "how",       zh: "怎么样",             pos: "other", emoji: "❓", key: true },
      { word: "there",     zh: "在那里",             pos: "other", emoji: "📍", key: true },
      { word: "should",    zh: "（提出建议）应该",   pos: "other", emoji: "💡", key: true },
      { word: "sometimes", zh: "有时候",             pos: "other", emoji: "🔁", key: true },
      { word: "also",      zh: "也；还",             pos: "other", emoji: "➕", key: true },
      { word: "umbrella",  zh: "伞",                 pos: "noun",  emoji: "☂️", key: true },
      { word: "will",      zh: "将；会",             pos: "other", emoji: "🔮" },
      { word: "put on",    zh: "穿上；戴上",         pos: "verb",  emoji: "👕" }
    ]
  },

  unit4: {
    unit: 4,
    title: "Unit 4 · 城市与出行",
    words: [
      { word: "go",            zh: "去",               pos: "verb",  emoji: "🚶", key: true },
      { word: "boating",       zh: "划船",             pos: "noun",  emoji: "🚣" },
      { word: "fly",           zh: "放飞；飞",         pos: "verb",  emoji: "🪁", key: true },
      { word: "snowman",       zh: "雪人",             pos: "noun",  emoji: "⛄" },
      { word: "bookshop",      zh: "书店",             pos: "noun",  emoji: "🏪" },
      { word: "library",       zh: "图书馆",           pos: "noun",  emoji: "🏛️", key: true },
      { word: "cinema",        zh: "电影院",           pos: "noun",  emoji: "🎬", key: true },
      { word: "museum",        zh: "博物馆",           pos: "noun",  emoji: "🖼️" },
      { word: "sports centre", zh: "体育中心",         pos: "noun",  emoji: "🏟️" },
      { word: "fine",          zh: "（天气）晴朗的",   pos: "adj",   emoji: "🌞", key: true },
      { word: "too",           zh: "太；过于",         pos: "other", emoji: "❗", key: true },
      { word: "now",           zh: "现在",             pos: "other", emoji: "⏰", key: true },
      { word: "after",         zh: "（时间）在……后",   pos: "other", emoji: "➡️", key: true },
      { word: "all kinds of",  zh: "各种各样的",       pos: "other", emoji: "🌈" },
      { word: "when",          zh: "当……的时候",       pos: "other", emoji: "🕒", key: true },
      { word: "park",          zh: "公园",             pos: "noun",  emoji: "🏞️", key: true }
    ]
  },

  unit5: {
    unit: 5,
    title: "Unit 5 · 动物与身体",
    words: [
      { word: "bear",      zh: "熊",             pos: "noun",  emoji: "🐻", key: true },
      { word: "panda",     zh: "大熊猫",         pos: "noun",  emoji: "🐼", key: true },
      { word: "tiger",     zh: "老虎",           pos: "noun",  emoji: "🐯", key: true },
      { word: "elephant",  zh: "大象",           pos: "noun",  emoji: "🐘", key: true },
      { word: "monkey",    zh: "猴子",           pos: "noun",  emoji: "🐵", key: true },
      { word: "lion",      zh: "狮子",           pos: "noun",  emoji: "🦁", key: true },
      { word: "arm",       zh: "手臂",           pos: "noun",  emoji: "💪", key: true },
      { word: "foot",      zh: "脚",             pos: "noun",  emoji: "🦶", key: true },
      { word: "leg",       zh: "腿",             pos: "noun",  emoji: "🦵", key: true },
      { word: "body",      zh: "身体",           pos: "noun",  emoji: "🧍", key: true },
      { word: "tail",      zh: "尾巴",           pos: "noun",  emoji: "🦊", key: true },
      { word: "head",      zh: "头",             pos: "noun",  emoji: "🙂", key: true },
      { word: "favourite", zh: "最喜欢的",       pos: "adj",   emoji: "💖", key: true },
      { word: "fast",      zh: "快的；迅速的",   pos: "adj",   emoji: "⚡", key: true },
      { word: "clever",    zh: "聪明的",         pos: "adj",   emoji: "💡", key: true },
      { word: "its",       zh: "它的",           pos: "other", emoji: "👉", key: true },
      { word: "pet",       zh: "宠物",           pos: "noun",  emoji: "🐾", key: true },
      { word: "meat",      zh: "（食用）肉",     pos: "noun",  emoji: "🍖", key: true },
      { word: "slow",      zh: "缓慢的；迟缓的", pos: "adj",   emoji: "🐢", key: true }
    ]
  },

  unit6: {
    unit: 6,
    title: "Unit 6 · 时间与数字",
    words: [
      { word: "thirteen",  zh: "十三",           pos: "other", emoji: "🔢" },
      { word: "fourteen",  zh: "十四",           pos: "other", emoji: "🔢" },
      { word: "fifteen",   zh: "十五",           pos: "other", emoji: "🔢" },
      { word: "sixteen",   zh: "十六",           pos: "other", emoji: "🔢" },
      { word: "seventeen", zh: "十七",           pos: "other", emoji: "🔢" },
      { word: "eighteen",  zh: "十八",           pos: "other", emoji: "🔢" },
      { word: "nineteen",  zh: "十九",           pos: "other", emoji: "🔢" },
      { word: "twenty",    zh: "二十",           pos: "other", emoji: "🔢" },
      { word: "thirty",    zh: "三十",           pos: "other", emoji: "🔢" },
      { word: "forty",     zh: "四十",           pos: "other", emoji: "🔢" },
      { word: "fifty",     zh: "五十",           pos: "other", emoji: "🔢" },
      { word: "get up",    zh: "起床",           pos: "verb",  emoji: "🌅" },
      { word: "time",      zh: "时间",           pos: "noun",  emoji: "🕐", key: true },
      { word: "clock",     zh: "时钟",           pos: "noun",  emoji: "⏰", key: true },
      { word: "have to",   zh: "必须；不得不",   pos: "other", emoji: "❗" },
      { word: "get to",    zh: "到达",           pos: "verb",  emoji: "🏁" },
      { word: "before",    zh: "在……之前",      pos: "other", emoji: "⏪", key: true },
      { word: "hurry up",  zh: "（用于催促）赶紧", pos: "verb", emoji: "💨" },
      { word: "at",        zh: "在（某时刻）",   pos: "other", emoji: "🕒", key: true },
      { word: "o'clock",   zh: "在……点钟",      pos: "other", emoji: "🕰️", key: true },
      { word: "breakfast", zh: "早餐；早饭",     pos: "noun",  emoji: "🥣", key: true },
      { word: "half",      zh: "半；一半",       pos: "other", emoji: "🌗", key: true },
      { word: "hour",      zh: "小时",           pos: "noun",  emoji: "⏳", key: true },
      { word: "go to bed", zh: "上床睡觉",       pos: "verb",  emoji: "🛏️" }
    ]
  }
};
