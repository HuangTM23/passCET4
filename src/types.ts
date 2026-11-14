export interface VocabEntry {
  knowledge_id: string;
  word: string;
  phonetic: string;
  part_of_speech: string;
  meanings_zh: string[];
  collocations?: string[];
  example_sentence: string;
  example_translation: string;
  difficulty: number;
}

export interface VocabQuiz {
  item_id: string;
  quiz_type: "en_to_zh" | "zh_to_en" | "context_cloze" | string;
  knowledge_id: string;
  target_word: string;
  stem: string;
  options: string[];
  answer_index: number;
  answer: string;
  explanation_zh: string;
}

export interface ListeningQuestion {
  item_id: string;
  stem: string;
  options: string[];
  answer_index: number;
  explanation_zh: string;
  key_evidence_line?: string;
}

export interface ListeningCase {
  case_id: string;
  title: string;
  title_zh: string;
  category: string;
  audio_asset_path: string;
  duration_ms: number;
  transcript_lines: { line_id: string; speaker?: string; text: string }[];
  questions: ListeningQuestion[];
}

export interface ReadingPassage {
  passage_id: string;
  title: string;
  title_zh: string;
  topic: string;
  word_count: number;
  paragraphs: { paragraph_id: number; text: string }[];
  questions: {
    item_id: string;
    stem: string;
    options: string[];
    answer_index: number;
    explanation_zh: string;
    evidence_text?: string;
  }[];
}

export interface WritingTask {
  item_id: string;
  task_type: string;
  title: string;
  prompt_zh: string;
  source_text?: string;
  hint?: string;
  checklist_points: string[];
  model_answer: string;
  analysis_zh: string;
}

export interface WordAtlasMeta {
  id: string;
  tip: string;
  en: string;
  topic: string;
}

export interface SeedBundle {
  vocab_entries: VocabEntry[];
  vocab_quizzes: VocabQuiz[];
  listening_cases: ListeningCase[];
  reading_passages: ReadingPassage[];
  writing_tasks: WritingTask[];
}

export interface WordAtlasLookup {
  by_knowledge_id: Record<string, WordAtlasMeta>;
}

export type SkillCategory = "vocab" | "listening" | "reading" | "writing";

export interface SessionTask {
  id: string;
  category: SkillCategory;
  title: string;
  vocabQuizIds?: string[];
  listeningCaseId?: string;
  readingPassageId?: string;
  writingTaskId?: string;
}

export interface ActiveSession {
  id: string;
  minutes: number;
  tasks: SessionTask[];
  taskIndex: number;
  correctCount: number;
  answeredCount: number;
}

export interface MonsterItem {
  id: string;
  category: SkillCategory;
  refId: string;
  label: string;
  wrongCount: number;
  addedAt: number;
}

export interface LocalProgress {
  displayName: string;
  avatarEmoji: string;
  dailyGoalMinutes: number;
  todaySeconds: number;
  todayDate: string;
  practicedToday: SkillCategory[];
  masteredIds: string[];
  monsters: MonsterItem[];
  pausedSession: ActiveSession | null;
}
