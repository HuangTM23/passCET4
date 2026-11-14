import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Bug,
  CheckCircle2,
  Circle,
  Compass,
  Headphones,
  Home,
  Mic,
  Pause,
  PenTool,
  Play,
  RotateCcw,
  Sparkles,
  User,
  Volume2,
  Zap
} from "lucide-react";
import {
  ActiveSession,
  LocalProgress,
  SeedBundle,
  SessionTask,
  SkillCategory,
  VocabQuiz,
  WordAtlasLookup
} from "./types";

const STORAGE_KEY = "chengcheng_cet4_progress_v1";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultProgress(): LocalProgress {
  return {
    displayName: "程程同学",
    avatarEmoji: "girl_icon",
    dailyGoalMinutes: 20,
    todaySeconds: 0,
    todayDate: todayStr(),
    practicedToday: [],
    masteredIds: [],
    monsters: [],
    pausedSession: null
  };
}

function loadProgress(): LocalProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as LocalProgress;
    if (parsed.todayDate !== todayStr()) {
      return {
        ...defaultProgress(),
        ...parsed,
        todayDate: todayStr(),
        todaySeconds: 0,
        practicedToday: []
      };
    }
    return { ...defaultProgress(), ...parsed };
  } catch {
    return defaultProgress();
  }
}

function speakWord(word: string) {
  if (!word) return;
  try {
    const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`;
    const audio = new Audio(url);
    audio.play().catch(() => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(word);
        u.lang = "en-US";
        u.rate = 0.92;
        window.speechSynthesis.speak(u);
      }
    });
  } catch {
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(word);
      u.lang = "en-US";
      window.speechSynthesis.speak(u);
    }
  }
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

function buildSmartSession(bundle: SeedBundle, minutes: number): ActiveSession {
  const tasks: SessionTask[] = [];
  if (minutes <= 3) {
    const quizzes = pickRandom(bundle.vocab_quizzes, 5);
    tasks.push({
      id: `t_vocab_${Date.now()}`,
      category: "vocab",
      title: "高频核心词闪电战 (5题)",
      vocabQuizIds: quizzes.map((q) => q.item_id)
    });
  } else if (minutes <= 5) {
    // 5分钟混合闯关：词汇 + 听力 + 阅读
    const quizzes = pickRandom(bundle.vocab_quizzes, 3);
    const lc = pickRandom(bundle.listening_cases, 1)[0];
    const rp = pickRandom(bundle.reading_passages, 1)[0];
    tasks.push({
      id: `t_vocab_${Date.now()}`,
      category: "vocab",
      title: "高频核心词热身 (3题)",
      vocabQuizIds: quizzes.map((q) => q.item_id)
    });
    if (lc) {
      tasks.push({
        id: `t_listen_${Date.now()}`,
        category: "listening",
        title: lc.title_zh || lc.title,
        listeningCaseId: lc.case_id
      });
    }
    if (rp) {
      tasks.push({
        id: `t_read_${Date.now()}`,
        category: "reading",
        title: rp.title_zh || rp.title,
        readingPassageId: rp.passage_id
      });
    }
  } else if (minutes <= 20) {
    const quizzes = pickRandom(bundle.vocab_quizzes, 6);
    const lc = pickRandom(bundle.listening_cases, 1)[0];
    const rp = pickRandom(bundle.reading_passages, 1)[0];
    const wt = pickRandom(bundle.writing_tasks, 1)[0];
    tasks.push({
      id: `t_vocab_${Date.now()}`,
      category: "vocab",
      title: "核心词汇突破 (6题)",
      vocabQuizIds: quizzes.map((q) => q.item_id)
    });
    if (lc) {
      tasks.push({
        id: `t_listen_${Date.now()}`,
        category: "listening",
        title: lc.title_zh || lc.title,
        listeningCaseId: lc.case_id
      });
    }
    if (rp) {
      tasks.push({
        id: `t_read_${Date.now()}`,
        category: "reading",
        title: rp.title_zh || rp.title,
        readingPassageId: rp.passage_id
      });
    }
    if (wt) {
      tasks.push({
        id: `t_write_${Date.now()}`,
        category: "writing",
        title: wt.title,
        writingTaskId: wt.item_id
      });
    }
  } else {
    const quizzes = pickRandom(bundle.vocab_quizzes, 10);
    const lcs = pickRandom(bundle.listening_cases, 2);
    const rps = pickRandom(bundle.reading_passages, 2);
    const wt = pickRandom(bundle.writing_tasks, 1)[0];
    tasks.push({
      id: `t_vocab_${Date.now()}`,
      category: "vocab",
      title: "深度词汇强化 (10题)",
      vocabQuizIds: quizzes.map((q) => q.item_id)
    });
    lcs.forEach((lc, idx) =>
      tasks.push({
        id: `t_listen_${idx}_${Date.now()}`,
        category: "listening",
        title: lc.title_zh || lc.title,
        listeningCaseId: lc.case_id
      })
    );
    rps.forEach((rp, idx) =>
      tasks.push({
        id: `t_read_${idx}_${Date.now()}`,
        category: "reading",
        title: rp.title_zh || rp.title,
        readingPassageId: rp.passage_id
      })
    );
    if (wt) {
      tasks.push({
        id: `t_write_${Date.now()}`,
        category: "writing",
        title: wt.title,
        writingTaskId: wt.item_id
      });
    }
  }

  return {
    id: `sess_${Date.now()}`,
    minutes,
    tasks,
    taskIndex: 0,
    correctCount: 0,
    answeredCount: 0
  };
}

export default function App() {
  const [bundle, setBundle] = useState<SeedBundle | null>(null);
  const [atlasLookup, setAtlasLookup] = useState<WordAtlasLookup | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [tab, setTab] = useState<"home" | "quest" | "monster" | "profile">("home");
  const [progress, setProgress] = useState<LocalProgress>(loadProgress);
  const [selectedMinutes, setSelectedMinutes] = useState<number>(5);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [nameInput, setNameInput] = useState(progress.displayName);

  useEffect(() => {
    Promise.all([
      fetch("./seed/seed_bundle.json").then((r) => {
        if (!r.ok) throw new Error("题库加载失败");
        return r.json();
      }),
      fetch("./seed/word_atlas_lookup.json").then((r) => (r.ok ? r.json() : { by_knowledge_id: {} }))
    ])
      .then(([b, a]) => {
        setBundle(b as SeedBundle);
        setAtlasLookup(a as WordAtlasLookup);
      })
      .catch((err) => setLoadError(err?.message || "资源加载失败"));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // ignore storage quota errors
    }
  }, [progress]);

  // Foreground session study timer
  useEffect(() => {
    if (!activeSession) return;
    const timer = window.setInterval(() => {
      setProgress((prev) => ({
        ...prev,
        todayDate: todayStr(),
        todaySeconds: prev.todaySeconds + 1
      }));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeSession]);

  const previewSession = useMemo(() => {
    if (!bundle) return null;
    return buildSmartSession(bundle, selectedMinutes);
  }, [bundle, selectedMinutes]);

  if (loadError) {
    return (
      <div className="app-shell">
        <div className="card">
          <h3>加载失败</h3>
          <p className="muted">{loadError}</p>
          <button className="primary-btn" onClick={() => window.location.reload()}>
            重新加载
          </button>
        </div>
      </div>
    );
  }

  if (!bundle) {
    return (
      <div className="app-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="card" style={{ textAlign: "center", width: "100%" }}>
          <div className="avatar-circle" style={{ margin: "0 auto 12px", width: 72, height: 72 }}>
            <img src="./icons/icon-192.png" alt="程程四级" />
          </div>
          <h3 style={{ margin: "0 0 6px" }}>程程四级</h3>
          <p className="muted">正在装载离线词库与听力资源...</p>
        </div>
      </div>
    );
  }

  const startNewSession = (mins: number) => {
    const sess = buildSmartSession(bundle, mins);
    setActiveSession(sess);
  };

  const startSingleCategory = (cat: SkillCategory) => {
    if (cat === "vocab") {
      const qs = pickRandom(bundle.vocab_quizzes, 6);
      setActiveSession({
        id: `sess_${Date.now()}`,
        minutes: 5,
        tasks: [{ id: "t1", category: "vocab", title: "词汇闪电战 (6题)", vocabQuizIds: qs.map((q) => q.item_id) }],
        taskIndex: 0,
        correctCount: 0,
        answeredCount: 0
      });
    } else if (cat === "listening") {
      const lc = pickRandom(bundle.listening_cases, 1)[0];
      setActiveSession({
        id: `sess_${Date.now()}`,
        minutes: 5,
        tasks: [{ id: "t1", category: "listening", title: lc.title_zh || lc.title, listeningCaseId: lc.case_id }],
        taskIndex: 0,
        correctCount: 0,
        answeredCount: 0
      });
    } else if (cat === "reading") {
      const rp = pickRandom(bundle.reading_passages, 1)[0];
      setActiveSession({
        id: `sess_${Date.now()}`,
        minutes: 8,
        tasks: [{ id: "t1", category: "reading", title: rp.title_zh || rp.title, readingPassageId: rp.passage_id }],
        taskIndex: 0,
        correctCount: 0,
        answeredCount: 0
      });
    } else {
      const wt = pickRandom(bundle.writing_tasks, 1)[0];
      setActiveSession({
        id: `sess_${Date.now()}`,
        minutes: 6,
        tasks: [{ id: "t1", category: "writing", title: wt.title, writingTaskId: wt.item_id }],
        taskIndex: 0,
        correctCount: 0,
        answeredCount: 0
      });
    }
  };

  if (activeSession) {
    return (
      <SessionPlayer
        bundle={bundle}
        atlasLookup={atlasLookup}
        session={activeSession}
        onPauseExit={(updated) => {
          setProgress((prev) => ({ ...prev, pausedSession: updated }));
          setActiveSession(null);
        }}
        onRecordAnswer={(refId, label, cat, isCorrect) => {
          setProgress((prev) => {
            const practiced = prev.practicedToday.includes(cat)
              ? prev.practicedToday
              : [...prev.practicedToday, cat];
            const mastered = isCorrect && !prev.masteredIds.includes(refId)
              ? [...prev.masteredIds, refId]
              : prev.masteredIds;
            let monsters = [...prev.monsters];
            if (!isCorrect) {
              const existing = monsters.find((m) => m.refId === refId);
              if (existing) {
                existing.wrongCount += 1;
              } else {
                monsters.push({
                  id: `m_${refId}`,
                  category: cat,
                  refId,
                  label,
                  wrongCount: 1,
                  addedAt: Date.now()
                });
              }
            } else {
              monsters = monsters.filter((m) => m.refId !== refId);
            }
            return {
              ...prev,
              practicedToday: practiced,
              masteredIds: mastered,
              monsters
            };
          });
        }}
        onComplete={() => {
          setProgress((prev) => ({ ...prev, pausedSession: null }));
          setActiveSession(null);
        }}
      />
    );
  }

  const todayMinutes = Math.floor(progress.todaySeconds / 60);
  const goalPct = Math.min(100, Math.round((todayMinutes / Math.max(1, progress.dailyGoalMinutes)) * 100));

  return (
    <div className="app-shell">
      {tab === "home" && (
        <>
          {/* 1. Player HUD */}
          <div className="card">
            <div className="row-between">
              <div className="row-gap">
                <div className="avatar-circle">
                  {progress.avatarEmoji === "girl_icon" ? (
                    <img src="./icons/icon-192.png" alt="头像" />
                  ) : (
                    <span>{progress.avatarEmoji}</span>
                  )}
                </div>
                <div>
                  <h2 className="hud-title">{progress.displayName}</h2>
                  <div className="muted">程程四级 · 专注备考模式</div>
                </div>
              </div>
              <span className="pill pill-mint">今日 {todayMinutes}/{progress.dailyGoalMinutes} 分</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${goalPct}%` }} />
            </div>
          </div>

          {/* 2. 今日路线 & 记忆护盾 */}
          <div className="card">
            <div className="row-between" style={{ marginBottom: 10 }}>
              <strong style={{ fontSize: 16 }}>今日路线 & 记忆护盾</strong>
              <span className="pill pill-purple">已掌握 {progress.masteredIds.length} 项</span>
            </div>
            <div className="row-between" style={{ flexWrap: "wrap", gap: 6 }}>
              {(
                [
                  ["vocab", "词汇"],
                  ["listening", "听力"],
                  ["reading", "阅读"],
                  ["writing", "写译"]
                ] as [SkillCategory, string][]
              ).map(([cat, label]) => {
                const done = progress.practicedToday.includes(cat);
                return (
                  <span key={cat} className={`pill ${done ? "pill-mint" : "pill-muted"}`}>
                    {done ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                    {label}
                  </span>
                );
              })}
            </div>
            <div className="stat-grid-3">
              <div className="stat-box" style={{ background: "var(--coral-soft)", color: "var(--coral)" }}>
                <div className="val">{progress.monsters.length}</div>
                <div className="lbl">待消灭怪兽</div>
              </div>
              <div className="stat-box" style={{ background: "var(--blue-soft)", color: "var(--blue)" }}>
                <div className="val">{progress.practicedToday.length}/4</div>
                <div className="lbl">今日打卡站</div>
              </div>
              <div className="stat-box" style={{ background: "var(--mint-soft)", color: "var(--mint)" }}>
                <div className="val">{progress.masteredIds.length}</div>
                <div className="lbl">已熟练</div>
              </div>
            </div>
          </div>

          {/* 3. 现在有几分钟？(合并继续上次闯关胶囊 + 单行5按键) */}
          <div className="card">
            <div className="row-between">
              <strong style={{ fontSize: 16 }}>现在有几分钟？</strong>
              {progress.pausedSession && (
                <button
                  className="pill pill-blue"
                  style={{ border: "1px solid #93c5fd", cursor: "pointer" }}
                  onClick={() => setActiveSession(progress.pausedSession)}
                >
                  <Play size={12} /> 继续上次闯关
                </button>
              )}
            </div>

            <div className="duration-row">
              {[3, 5, 10, 20, 60].map((m) => (
                <button
                  key={m}
                  className={`duration-btn ${selectedMinutes === m ? "active" : ""}`}
                  onClick={() => setSelectedMinutes(m)}
                >
                  {m}分
                </button>
              ))}
            </div>

            {previewSession && (
              <div className="dispatch-box">
                <div className="row-gap" style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                  <Sparkles size={16} color="#2563eb" />
                  <span>智能派单：{previewSession.tasks[0]?.title}</span>
                </div>
                <div className="muted">
                  关卡序列：{previewSession.tasks.map((t) => t.title).join(" → ")}
                </div>
              </div>
            )}

            <button className="primary-btn" onClick={() => startNewSession(selectedMinutes)}>
              <Zap size={18} /> 立即出发 · {selectedMinutes} 分钟闯关
            </button>
          </div>
        </>
      )}

      {tab === "quest" && (
        <>
          <div className="card">
            <h2 className="hud-title" style={{ marginBottom: 4 }}>智能专项闯关</h2>
            <p className="muted" style={{ marginTop: 0 }}>系统自动智能推荐最适合当前进度的题目，直接开练</p>
          </div>
          {(
            [
              ["vocab", "词汇闪电战", "词义辨析 + 图汇记忆卡片 + 防作弊读音", BookOpen, "pill-blue"],
              ["listening", "听力侦探社", "真实英语配音 MP3 + 细节抓取 + 原文精析", Headphones, "pill-purple"],
              ["reading", "阅读寻宝", "四级话题短文精读 + 定位证据句解析", Compass, "pill-mint"],
              ["writing", "写译微练", "句型改写翻译 + 语音输入 + 参考范文", PenTool, "pill-coral"]
            ] as const
          ).map(([cat, title, desc, IconComp, pillCls]) => (
            <div className="card" key={cat}>
              <div className="row-between">
                <div className="row-gap">
                  <span className={`pill ${pillCls}`} style={{ padding: 10 }}>
                    <IconComp size={20} />
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
                    <div className="muted">{desc}</div>
                  </div>
                </div>
                <button className="outline-btn" onClick={() => startSingleCategory(cat)}>
                  开始
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {tab === "monster" && (
        <>
          <div className="card">
            <div className="row-between">
              <div>
                <h2 className="hud-title">错题怪兽图鉴</h2>
                <div className="muted">做错的题会变成小怪兽，复仇做对即可消灭</div>
              </div>
              <span className="pill pill-coral">{progress.monsters.length} 只待战</span>
            </div>
          </div>
          {progress.monsters.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 32 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
              <div style={{ fontWeight: 700 }}>当前没有错题怪兽</div>
              <div className="muted">保持全胜记录，继续往前闯关吧！</div>
            </div>
          ) : (
            progress.monsters.map((m) => (
              <div className="card" key={m.id}>
                <div className="row-between">
                  <div>
                    <div style={{ fontWeight: 700 }}>{m.label}</div>
                    <div className="muted">
                      分类：{m.category} · 错题 {m.wrongCount} 次
                    </div>
                  </div>
                  <button
                    className="outline-btn"
                    style={{ color: "var(--coral)", borderColor: "#fecaca" }}
                    onClick={() => {
                      if (m.category === "vocab") {
                        setActiveSession({
                          id: `revenge_${Date.now()}`,
                          minutes: 3,
                          tasks: [{ id: "r1", category: "vocab", title: "错题复仇战", vocabQuizIds: [m.refId] }],
                          taskIndex: 0,
                          correctCount: 0,
                          answeredCount: 0
                        });
                      } else {
                        startSingleCategory(m.category);
                      }
                    }}
                  >
                    复仇
                  </button>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {tab === "profile" && (
        <>
          <div className="card">
            <div className="row-between">
              <div className="row-gap">
                <div className="avatar-circle" style={{ width: 60, height: 60 }}>
                  <img src="./icons/icon-192.png" alt="程程四级" />
                </div>
                <div>
                  <h2 className="hud-title">{progress.displayName}</h2>
                  <div className="muted">每日目标 {progress.dailyGoalMinutes} 分钟</div>
                </div>
              </div>
              <button
                className="outline-btn"
                onClick={() => {
                  setNameInput(progress.displayName);
                  setEditingProfile(!editingProfile);
                }}
              >
                {editingProfile ? "完成" : "编辑"}
              </button>
            </div>
            {editingProfile && (
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    fontSize: 14
                  }}
                />
                <button
                  className="outline-btn"
                  onClick={() => {
                    const clean = nameInput.trim() || "程程同学";
                    setProgress((prev) => ({ ...prev, displayName: clean }));
                    setEditingProfile(false);
                  }}
                >
                  保存
                </button>
              </div>
            )}
          </div>

          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 10 }}>每日目标时长</div>
            <div className="duration-row" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              {[10, 20, 30, 60].map((g) => (
                <button
                  key={g}
                  className={`duration-btn ${progress.dailyGoalMinutes === g ? "active" : ""}`}
                  onClick={() => setProgress((prev) => ({ ...prev, dailyGoalMinutes: g }))}
                >
                  {g}分
                </button>
              ))}
            </div>
            <button
              className="outline-btn"
              style={{ width: "100%", marginTop: 8, color: "var(--coral)" }}
              onClick={() => {
                if (window.confirm("确定清空本地学习记录吗？")) {
                  const fresh = defaultProgress();
                  setProgress(fresh);
                }
              }}
            >
              <RotateCcw size={15} /> 重置本地学习记录
            </button>
          </div>
        </>
      )}

      <nav className="bottom-nav">
        <button className={`nav-item ${tab === "home" ? "active" : ""}`} onClick={() => setTab("home")}>
          <Home size={18} /> 首页
        </button>
        <button className={`nav-item ${tab === "quest" ? "active" : ""}`} onClick={() => setTab("quest")}>
          <Compass size={18} /> 闯关
        </button>
        <button className={`nav-item ${tab === "monster" ? "active" : ""}`} onClick={() => setTab("monster")}>
          <Bug size={18} /> 怪兽
        </button>
        <button className={`nav-item ${tab === "profile" ? "active" : ""}`} onClick={() => setTab("profile")}>
          <User size={18} /> 我的
        </button>
      </nav>
    </div>
  );
}

interface SessionPlayerProps {
  bundle: SeedBundle;
  atlasLookup: WordAtlasLookup | null;
  session: ActiveSession;
  onPauseExit: (updated: ActiveSession) => void;
  onRecordAnswer: (refId: string, label: string, cat: SkillCategory, isCorrect: boolean) => void;
  onComplete: () => void;
}

function SessionPlayer({
  bundle,
  atlasLookup,
  session,
  onPauseExit,
  onRecordAnswer,
  onComplete
}: SessionPlayerProps) {
  const [taskIdx, setTaskIdx] = useState(session.taskIndex);
  const [subIdx, setSubIdx] = useState(0);
  const [pickedIdx, setPickedIdx] = useState<number | null>(null);
  const [writingText, setWritingText] = useState("");
  const [showModel, setShowModel] = useState(false);
  const [listeningSpeed, setListeningSpeed] = useState(1.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const task = session.tasks[taskIdx];

  const advance = () => {
    setPickedIdx(null);
    setWritingText("");
    setShowModel(false);
    if (task.category === "vocab" && task.vocabQuizIds && subIdx + 1 < task.vocabQuizIds.length) {
      setSubIdx(subIdx + 1);
      return;
    }
    if (task.category === "listening") {
      const lc = bundle.listening_cases.find((c) => c.case_id === task.listeningCaseId);
      if (lc && subIdx + 1 < lc.questions.length) {
        setSubIdx(subIdx + 1);
        return;
      }
    }
    if (task.category === "reading") {
      const rp = bundle.reading_passages.find((p) => p.passage_id === task.readingPassageId);
      if (rp && subIdx + 1 < rp.questions.length) {
        setSubIdx(subIdx + 1);
        return;
      }
    }
    if (taskIdx + 1 < session.tasks.length) {
      setTaskIdx(taskIdx + 1);
      setSubIdx(0);
    } else {
      onComplete();
    }
  };

  // Vocab anti-cheat auto-speak
  const currentVocabQuiz: VocabQuiz | undefined = useMemo(() => {
    if (task?.category !== "vocab" || !task.vocabQuizIds) return undefined;
    const qid = task.vocabQuizIds[subIdx];
    return bundle.vocab_quizzes.find((q) => q.item_id === qid);
  }, [bundle.vocab_quizzes, task, subIdx]);

  useEffect(() => {
    if (!currentVocabQuiz) return;
    if (currentVocabQuiz.quiz_type !== "zh_to_en") {
      speakWord(currentVocabQuiz.target_word);
    }
  }, [currentVocabQuiz?.item_id]);

  if (!task) {
    onComplete();
    return null;
  }

  return (
    <div className="session-shell">
      <div className="row-between">
        <button
          className="outline-btn"
          onClick={() => onPauseExit({ ...session, taskIndex: taskIdx })}
        >
          <Pause size={15} /> 暂停退出
        </button>
        <span className="pill pill-blue">
          关卡 {taskIdx + 1} / {session.tasks.length}
        </span>
      </div>

      {task.category === "vocab" && currentVocabQuiz && (() => {
        const entry = bundle.vocab_entries.find((e) => e.knowledge_id === currentVocabQuiz.knowledge_id);
        const atlas = atlasLookup?.by_knowledge_id?.[currentVocabQuiz.knowledge_id];
        const answered = pickedIdx !== null;
        const canSpeakPrompt = currentVocabQuiz.quiz_type !== "zh_to_en" || answered;

        return (
          <div className="card">
            <div className="row-between" style={{ marginBottom: 10 }}>
              <span className="pill pill-blue">{task.title}</span>
              {canSpeakPrompt && (
                <button
                  className="outline-btn"
                  onClick={() => speakWord(currentVocabQuiz.target_word)}
                >
                  <Volume2 size={15} /> 朗读
                </button>
              )}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.5, marginBottom: 14 }}>
              {currentVocabQuiz.stem}
            </div>
            {currentVocabQuiz.options.map((opt, idx) => {
              const isCorrectOpt = idx === currentVocabQuiz.answer_index;
              const cls = !answered
                ? "option-btn"
                : isCorrectOpt
                ? "option-btn correct"
                : idx === pickedIdx
                ? "option-btn wrong"
                : "option-btn";
              return (
                <button
                  key={idx}
                  className={cls}
                  disabled={answered}
                  onClick={() => {
                    setPickedIdx(idx);
                    speakWord(currentVocabQuiz.target_word);
                    onRecordAnswer(
                      currentVocabQuiz.item_id,
                      `${currentVocabQuiz.target_word} · ${currentVocabQuiz.answer}`,
                      "vocab",
                      idx === currentVocabQuiz.answer_index
                    );
                  }}
                >
                  <strong>{String.fromCharCode(65 + idx)}.</strong>
                  <span>{opt}</span>
                </button>
              );
            })}

            {answered && (
              <>
                <div className="atlas-card">
                  <div className="row-gap" style={{ alignItems: "flex-start" }}>
                    {atlas?.id && (
                      <img
                        className="atlas-thumb"
                        src={`./seed/atlas_thumbs/${atlas.id}.webp`}
                        alt={currentVocabQuiz.target_word}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>
                        {currentVocabQuiz.target_word}{" "}
                        <span className="muted">{entry?.phonetic}</span>
                      </div>
                      <div style={{ fontSize: 13, marginTop: 4 }}>
                        {entry?.meanings_zh?.join("；") || currentVocabQuiz.answer}
                      </div>
                      {atlas?.tip && (
                        <div className="muted" style={{ marginTop: 6, color: "#1e40af" }}>
                          图汇巧记：{atlas.tip}
                        </div>
                      )}
                    </div>
                  </div>
                  {entry?.example_sentence && (
                    <div style={{ marginTop: 10, fontSize: 13, borderTop: "1px solid #dbeafe", paddingTop: 8 }}>
                      <div>{entry.example_sentence}</div>
                      <div className="muted">{entry.example_translation}</div>
                    </div>
                  )}
                </div>
                <button className="primary-btn" style={{ marginTop: 12 }} onClick={advance}>
                  下一题
                </button>
              </>
            )}
          </div>
        );
      })()}

      {task.category === "listening" && (() => {
        const lc = bundle.listening_cases.find((c) => c.case_id === task.listeningCaseId);
        const q = lc?.questions[subIdx];
        if (!lc || !q) return null;
        const audioSrc = `./${lc.audio_asset_path}`;
        const answered = pickedIdx !== null;
        return (
          <div className="card">
            <div className="row-between" style={{ marginBottom: 10 }}>
              <span className="pill pill-purple">听力 · {lc.title_zh || lc.title}</span>
              <button
                className="outline-btn"
                onClick={() => {
                  const next = listeningSpeed === 1.0 ? 1.2 : listeningSpeed === 1.2 ? 0.8 : 1.0;
                  setListeningSpeed(next);
                  if (audioRef.current) audioRef.current.playbackRate = next;
                }}
              >
                {listeningSpeed}x
              </button>
            </div>
            <audio
              ref={audioRef}
              controls
              src={audioSrc}
              style={{ width: "100%", marginBottom: 12 }}
              onPlay={() => {
                if (audioRef.current) audioRef.current.playbackRate = listeningSpeed;
              }}
            />
            <div style={{ fontWeight: 700, marginBottom: 12 }}>
              Q{subIdx + 1}. {q.stem}
            </div>
            {q.options.map((opt, idx) => {
              const cls = !answered
                ? "option-btn"
                : idx === q.answer_index
                ? "option-btn correct"
                : idx === pickedIdx
                ? "option-btn wrong"
                : "option-btn";
              return (
                <button
                  key={idx}
                  className={cls}
                  disabled={answered}
                  onClick={() => {
                    setPickedIdx(idx);
                    onRecordAnswer(q.item_id, lc.title_zh || lc.title, "listening", idx === q.answer_index);
                  }}
                >
                  <strong>{String.fromCharCode(65 + idx)}.</strong>
                  <span>{opt}</span>
                </button>
              );
            })}
            {answered && (
              <>
                <div className="dispatch-box" style={{ marginTop: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>解析</div>
                  <div className="muted" style={{ marginTop: 4 }}>{q.explanation_zh}</div>
                </div>
                <button className="primary-btn" onClick={advance}>
                  继续
                </button>
              </>
            )}
          </div>
        );
      })()}

      {task.category === "reading" && (() => {
        const rp = bundle.reading_passages.find((p) => p.passage_id === task.readingPassageId);
        const q = rp?.questions[subIdx];
        if (!rp || !q) return null;
        const answered = pickedIdx !== null;
        return (
          <div className="card">
            <div className="row-between" style={{ marginBottom: 8 }}>
              <span className="pill pill-mint">阅读 · {rp.title_zh || rp.title}</span>
              <span className="muted">{subIdx + 1}/{rp.questions.length}</span>
            </div>
            <div className="passage-box" style={{ marginBottom: 12 }}>
              {rp.paragraphs.map((p) => (
                <p key={p.paragraph_id} style={{ margin: "0 0 8px" }}>
                  {p.text}
                </p>
              ))}
            </div>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>{q.stem}</div>
            {q.options.map((opt, idx) => {
              const cls = !answered
                ? "option-btn"
                : idx === q.answer_index
                ? "option-btn correct"
                : idx === pickedIdx
                ? "option-btn wrong"
                : "option-btn";
              return (
                <button
                  key={idx}
                  className={cls}
                  disabled={answered}
                  onClick={() => {
                    setPickedIdx(idx);
                    onRecordAnswer(q.item_id, rp.title_zh || rp.title, "reading", idx === q.answer_index);
                  }}
                >
                  <strong>{String.fromCharCode(65 + idx)}.</strong>
                  <span>{opt}</span>
                </button>
              );
            })}
            {answered && (
              <>
                <div className="dispatch-box" style={{ marginTop: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>解析</div>
                  <div className="muted" style={{ marginTop: 4 }}>{q.explanation_zh}</div>
                </div>
                <button className="primary-btn" onClick={advance}>
                  继续
                </button>
              </>
            )}
          </div>
        );
      })()}

      {task.category === "writing" && (() => {
        const wt = bundle.writing_tasks.find((w) => w.item_id === task.writingTaskId);
        if (!wt) return null;
        return (
          <div className="card">
            <span className="pill pill-coral" style={{ marginBottom: 10 }}>写译微练</span>
            <h3 style={{ margin: "6px 0" }}>{wt.title}</h3>
            <p className="muted">{wt.prompt_zh}</p>
            {wt.source_text && (
              <div className="dispatch-box" style={{ fontSize: 14 }}>
                {wt.source_text}
              </div>
            )}
            <textarea
              className="writing-input"
              placeholder="在此输入英文作答，或点击下方语音听写..."
              value={writingText}
              onChange={(e) => setWritingText(e.target.value)}
            />
            <div className="row-between" style={{ marginTop: 10 }}>
              <button
                className="outline-btn"
                onClick={() => {
                  const SR =
                    (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
                      .SpeechRecognition ||
                    (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
                  if (!SR) {
                    alert("当前浏览器暂不支持网页语音听写，请直接键盘输入或使用手机输入法语音键。");
                    return;
                  }
                  const rec = new (SR as new () => {
                    lang: string;
                    onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
                    start: () => void;
                  })();
                  rec.lang = "en-US";
                  rec.onresult = (e) => {
                    const txt = e.results[0]?.[0]?.transcript || "";
                    setWritingText((prev) => (prev ? `${prev} ${txt}` : txt));
                  };
                  rec.start();
                }}
              >
                <Mic size={15} /> 语音输入
              </button>
              <button className="outline-btn" onClick={() => setShowModel(!showModel)}>
                {showModel ? "收起范文" : "查看参考范文"}
              </button>
            </div>
            {showModel && (
              <div className="atlas-card">
                <div style={{ fontWeight: 700, fontSize: 13 }}>参考表达</div>
                <div style={{ fontSize: 14, marginTop: 4 }}>{wt.model_answer}</div>
                <div className="muted" style={{ marginTop: 6 }}>{wt.analysis_zh}</div>
              </div>
            )}
            <button
              className="primary-btn"
              style={{ marginTop: 12 }}
              onClick={() => {
                onRecordAnswer(wt.item_id, wt.title, "writing", true);
                advance();
              }}
            >
              完成本题
            </button>
          </div>
        );
      })()}
    </div>
  );
}
