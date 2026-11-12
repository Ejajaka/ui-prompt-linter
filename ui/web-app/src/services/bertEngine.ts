/**
 * In-browser BERT detector: runs the fine-tuned DistilBERT token classifier
 * (exported to ONNX) via transformers.js and returns labelled spans with char
 * offsets, matching the server-side `engine/src/bert_tagger.py`.
 */

import { AutoModelForTokenClassification, AutoTokenizer, env, Tensor } from '@huggingface/transformers';

export interface DetectedSpan {
  label: string;
  char_start: number;
  char_end: number;
  text: string;
}

export interface BERTResult {
  spans: DetectedSpan[];
  confidence: number;
}

export interface BERTProgress {
  /** 0-100 when the loader reports a total size. */
  percent: number;
  file: string;
}

export type BERTProgressHandler = (progress: BERTProgress) => void;

// Same tokenizer regex as the Python `src/tokenization.py` (English prompts).
const TOKEN_RE = /[\w]+(?:'[\w]+)?|[^\w\s]/g;

// id2label for the 11-class tagger (matches data/schema.json).
const ID2LABEL = [
  'O', 'B-ELEMENT', 'I-ELEMENT', 'B-COLOR', 'I-COLOR', 'B-LOCATION',
  'I-LOCATION', 'B-ACTION', 'I-ACTION', 'B-LABEL', 'I-LABEL',
];

const MAX_LENGTH = 128;

const MODEL_PATH = `${import.meta.env.BASE_URL || './'}models/bert_tagger/`;

let modelPromise: Promise<{
  tokenizer: any;
  model: any;
  clsId: number;
  sepId: number;
  padId: number;
}> | null = null;

let progressHandler: BERTProgressHandler | null = null;

function softmax(values: number[]): number[] {
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / sum);
}

function argmax(values: number[]): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) if (values[i] > values[best]) best = i;
  return best;
}

/** Split text into words with char offsets (mirrors TOKEN_RE in Python). */
function tokenizeWords(text: string): { text: string; start: number; end: number }[] {
  const words: { text: string; start: number; end: number }[] = [];
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(text)) !== null) {
    words.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  }
  return words;
}

function load(onProgress?: BERTProgressHandler): Promise<any> {
  if (!modelPromise) {
    progressHandler = onProgress ?? null;
    const report = (p: any) => {
      if (!progressHandler || p?.status !== 'progress' || !p.total) return;
      progressHandler({ percent: Math.round((p.loaded / p.total) * 100), file: String(p.file ?? '') });
    };
    modelPromise = (async () => {
      // The weights live next to the app in `models/bert_tagger/` (self-hosted),
      // never on the Hugging Face Hub.
      env.allowLocalModels = true;
      env.allowRemoteModels = false;
      const tokenizer = await AutoTokenizer.from_pretrained(MODEL_PATH);
      const model = await AutoModelForTokenClassification.from_pretrained(MODEL_PATH, {
        dtype: 'q8',
        progress_callback: report,
      });
      const clsId = tokenizer.convert_tokens_to_ids('[CLS]') as number;
      const sepId = tokenizer.convert_tokens_to_ids('[SEP]') as number;
      const padId = tokenizer.convert_tokens_to_ids('[PAD]') as number;
      return { tokenizer, model, clsId, sepId, padId };
    })();
  }
  return modelPromise;
}

/** Run the tagger and return spans + mean entity confidence. */
export async function runBERT(text: string, onProgress?: BERTProgressHandler): Promise<BERTResult> {
  const words = tokenizeWords(text);
  if (words.length === 0) return { spans: [], confidence: 0 };

  const { tokenizer, model, clsId, sepId, padId } = await load(onProgress);

  const inputIds: number[] = [clsId];
  const wordIds: (number | null)[] = [null];
  for (let wi = 0; wi < words.length; wi++) {
    const subs = tokenizer.tokenize(words[wi].text, { add_special_tokens: false }) as string[];
    const ids = tokenizer.convert_tokens_to_ids(subs) as number[];
    for (const id of ids) {
      inputIds.push(id);
      wordIds.push(wi);
    }
  }
  inputIds.push(sepId);
  wordIds.push(null);

  // Truncate to MAX_LENGTH (keep [SEP] as the final token).
  if (inputIds.length > MAX_LENGTH) {
    inputIds.length = MAX_LENGTH;
    wordIds.length = MAX_LENGTH;
    inputIds[MAX_LENGTH - 1] = sepId;
    wordIds[MAX_LENGTH - 1] = null;
  }

  const seqLen = inputIds.length;
  const idsTensor = new Tensor('int64', BigInt64Array.from(inputIds.map((n) => BigInt(n))), [1, seqLen]);
  const maskTensor = new Tensor('int64', BigInt64Array.from(inputIds.map(() => 1n)), [1, seqLen]);

  const output = await model({ input_ids: idsTensor, attention_mask: maskTensor });
  const logits = output.logits as Tensor;
  const data = logits.data as Float32Array;
  const nClasses = logits.dims[2] ?? 11;

  const tags: string[] = words.map(() => 'O');
  const seen = new Set<number>();
  const entityProbs: number[] = [];
  for (let pos = 0; pos < seqLen; pos++) {
    const wi = wordIds[pos];
    if (wi === null || wi === undefined || seen.has(wi)) continue;
    seen.add(wi);
    const start = pos * nClasses;
    const values = Array.from(data.slice(start, start + nClasses));
    const best = argmax(values);
    const tag = ID2LABEL[best] ?? 'O';
    tags[wi] = tag;
    if (tag !== 'O') {
      entityProbs.push(softmax(values)[best]);
    }
  }

  const confidence = entityProbs.length
    ? entityProbs.reduce((a, b) => a + b, 0) / entityProbs.length
    : 0;

  return { spans: tagsToSpans(text, words, tags), confidence };
}

/** Group consecutive same-label BIO tags into spans with char offsets. */
function tagsToSpans(
  text: string,
  words: { text: string; start: number; end: number }[],
  tags: string[],
): DetectedSpan[] {
  const spans: DetectedSpan[] = [];
  let i = 0;
  while (i < tags.length) {
    if (tags[i] === 'O') {
      i += 1;
      continue;
    }
    const label = tags[i].replace(/^[BI]-/, '');
    let j = i;
    while (j < tags.length && tags[j] !== 'O' && tags[j].replace(/^[BI]-/, '') === label) {
      j += 1;
    }
    spans.push({
      label,
      char_start: words[i].start,
      char_end: words[j - 1].end,
      text: text.slice(words[i].start, words[j - 1].end),
    });
    i = j;
  }
  return spans;
}

export function isBERTReady(): boolean {
  return modelPromise !== null;
}
