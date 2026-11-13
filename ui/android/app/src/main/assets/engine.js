/* Prompt Linter — Rules engine port (JavaScript).
 *
 * A faithful port of the Python Rules backend (src/) so the browser extension
 * can run the exact same deterministic analysis with no server and no Pyodide.
 * Output matches analyze_full(text, method="rules", allow_llm=false, ...).
 */
(function (global) {
  'use strict';

  // ------------------------------------------------------------------ schema
  var ATTRIBUTES = ['ELEMENT', 'COLOR', 'LOCATION', 'ACTION', 'LABEL'];
  var ELEMENT_SCHEMA = {
    button:   { allowed: ['COLOR', 'LOCATION', 'LABEL', 'ACTION'], required: ['LABEL', 'ACTION', 'COLOR', 'LOCATION'] },
    navbar:   { allowed: ['COLOR', 'LOCATION', 'LABEL'], required: ['COLOR', 'LOCATION', 'LABEL'] },
    input:    { allowed: ['LABEL', 'LOCATION', 'COLOR'], required: ['LABEL', 'LOCATION'] },
    card:     { allowed: ['COLOR', 'LOCATION', 'LABEL'], required: ['COLOR', 'LOCATION', 'LABEL'] },
    modal:    { allowed: ['ACTION', 'LABEL', 'COLOR'], required: ['ACTION', 'LABEL', 'COLOR'] },
    image:    { allowed: ['LOCATION', 'LABEL'], required: ['LOCATION', 'LABEL'] },
    dropdown: { allowed: ['LABEL', 'LOCATION', 'ACTION'], required: ['LABEL', 'LOCATION', 'ACTION'] },
    sidebar:  { allowed: ['LOCATION', 'COLOR', 'LABEL'], required: ['LOCATION', 'COLOR', 'LABEL'] },
    footer:   { allowed: ['COLOR', 'LABEL'], required: ['COLOR', 'LABEL'] },
    checkbox: { allowed: ['LABEL', 'LOCATION', 'COLOR'], required: ['LABEL', 'LOCATION'] },
  };
  var ELEMENT_TYPES = Object.keys(ELEMENT_SCHEMA);

  var NOUN_KEYWORDS = [
    ['navigation bar', 'navbar'], ['menu bar', 'navbar'], ['nav bar', 'navbar'],
    ['navbar', 'navbar'], ['nav', 'navbar'],
    ['text box', 'input'], ['text field', 'input'], ['textbox', 'input'], ['input', 'input'],
    ['check box', 'checkbox'], ['tick box', 'checkbox'], ['checkbox', 'checkbox'],
    ['modal', 'modal'], ['popup', 'modal'], ['pop-up', 'modal'], ['dialog', 'modal'],
    ['dropdown', 'dropdown'], ['select box', 'dropdown'],
    ['side menu', 'sidebar'], ['side panel', 'sidebar'], ['sidebar', 'sidebar'],
    ['button', 'button'], ['card', 'card'],
    ['banner', 'image'], ['picture', 'image'], ['photo', 'image'],
    ['image', 'image'], ['img', 'image'], ['footer', 'footer'],
  ];

  function nounToType(spanText) {
    var lowered = spanText.toLowerCase();
    for (var i = 0; i < NOUN_KEYWORDS.length; i++) {
      if (lowered.indexOf(NOUN_KEYWORDS[i][0]) !== -1) return NOUN_KEYWORDS[i][1];
    }
    return null;
  }

  // --------------------------------------------------------------- tokenize
  var TOKEN_RE = /\w+(?:'\w+)?|[^\w\s]/g;
  function tokenizeWithOffsets(text) {
    var out = [];
    var m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(text)) !== null) {
      out.push({ token: m[0], start: m.index, end: m.index + m[0].length });
    }
    return out;
  }

  // --------------------------------------------------------------------- bio
  function splitTag(tag) {
    if (tag === 'O') return ['O', 'O'];
    if (tag.length > 2 && tag[1] === '-') return [tag[0], tag.slice(2)];
    return ['O', 'O'];
  }
  function repairBio(tags) {
    var repaired = [];
    var previous = 'O';
    for (var i = 0; i < tags.length; i++) {
      var tag = tags[i];
      var s = splitTag(tag), ps = splitTag(previous);
      if (s[0] === 'I' && !((ps[0] === 'B' || ps[0] === 'I') && ps[1] === s[1])) {
        repaired.push('B-' + s[1]);
      } else {
        repaired.push(s[0] !== 'O' ? s[0] + '-' + s[1] : 'O');
      }
      previous = repaired[repaired.length - 1];
    }
    return repaired;
  }
  function bioToSpans(tokensWithOffsets, tags, text) {
    tags = repairBio(tags);
    var spans = [];
    var start = 0, currentLabel = null;
    function close(end) {
      if (currentLabel === null) return;
      var cs = tokensWithOffsets[start].start;
      var ce = tokensWithOffsets[end - 1].end;
      var surface = text != null ? text.slice(cs, ce) : tokensWithOffsets.slice(start, end).map(function (t) { return t.token; }).join(' ');
      spans.push({ label: currentLabel, start: start, end: end, text: surface, charStart: cs, charEnd: ce, source: 'prompt' });
    }
    for (var i = 0; i < tags.length; i++) {
      var s = splitTag(tags[i]);
      if (s[0] === 'B') { close(i); start = i; currentLabel = s[1]; }
      else if (s[0] === 'I') { if (currentLabel !== s[1]) { close(i); start = i; currentLabel = s[1]; } }
      else { close(i); start = i; currentLabel = null; }
    }
    close(tags.length);
    var attrSet = {};
    ATTRIBUTES.forEach(function (a) { attrSet[a] = true; });
    return spans.filter(function (s) { return attrSet[s.label]; });
  }

  // ------------------------------------------------------------- rules tagger
  var ELEMENT_PHRASES = [
    'button', 'primary button', 'cta button', 'call-to-action button',
    'navbar', 'navigation bar', 'menu bar', 'nav',
    'input field', 'input box', 'text box', 'text field',
    'card', 'info card', 'content card',
    'modal', 'modal window', 'popup', 'pop-up', 'dialog box',
    'image', 'picture', 'banner image', 'photo',
    'dropdown', 'dropdown menu', 'select box',
    'sidebar', 'side menu', 'side panel',
    'footer', 'page footer', 'footer section',
    'checkbox', 'check box', 'tick box',
  ];
  var RELATIONAL_PREPS = ['below', 'under', 'above', 'beside', 'near', 'underneath', 'beneath', 'inside', 'next'];
  var BASE_COLORS = ['red', 'blue', 'green', 'orange', 'purple', 'teal', 'black', 'white', 'yellow', 'pink', 'grey', 'gray', 'maroon', 'brown', 'cyan', 'magenta', 'gold', 'silver', 'violet', 'indigo', 'beige', 'turquoise', 'lime', 'navy', 'crimson'];
  var COLOR_MODIFIERS = ['dark', 'light', 'navy', 'royal', 'sky', 'off', 'bright', 'pale', 'deep'];
  var SPATIAL_WORDS = ['top', 'bottom', 'left', 'right', 'center', 'centre', 'middle', 'corner', 'side'];
  var LOCATION_RUN = SPATIAL_WORDS.concat(['of', 'the', 'page', 'screen']);
  var ACTION_VERBS = ['open', 'opens', 'submit', 'submits', 'take', 'takes', 'download', 'downloads', 'add', 'adds', 'scroll', 'scrolls', 'log', 'logs', 'toggle', 'toggles', 'send', 'sends', 'save', 'saves', 'clear', 'clears', 'filter', 'filters', 'change', 'changes', 'sort', 'sorts', 'update', 'updates', 'show', 'shows', 'switch', 'switches', 'appear', 'appears', 'pop', 'pops', 'delete', 'deletes', 'navigate', 'navigates', 'redirect', 'redirects', 'display', 'displays', 'trigger', 'triggers', 'start', 'starts', 'close', 'closes', 'expand', 'expands', 'play', 'plays', 'reset', 'resets'];
  var ACTION_STOP = ['with', 'labelled', 'labeled', 'saying', 'titled', 'at', 'for', 'listing', 'containing', 'showing', 'depicting'];
  var ACTION_CUES = ['that', 'which', 'to', 'and'];
  var LABEL_CUES = {
    button: ['with the text', 'that reads', 'labelled', 'labeled', 'saying'],
    checkbox: ['with the text', 'labelled', 'labeled', 'saying'],
    navbar: ['with links', 'with the items', 'containing'],
    input: ['asking for', 'meant for', 'for'],
    card: ['with the heading', 'titled', 'named'],
    modal: ['with the title', 'titled', 'called'],
    image: ['showing', 'depicting', 'of'],
    dropdown: ['for selecting', 'to choose', 'listing', 'for'],
    sidebar: ['listing', 'containing', 'with'],
    footer: ['showing', 'containing', 'with'],
  };
  var PREFIX_LABEL_TYPES = ['button', 'input', 'checkbox', 'dropdown'];
  var PREFIX_LABEL_STOP = ['a', 'an', 'the', 'new', 'small', 'large', 'big', 'simple', 'nice', 'main', 'another', 'second', 'floating', 'add', 'create', 'place', 'put', 'insert', 'include', 'design', 'make', 'build', 'give', 'i', 'want', 'need', 'also', 'then', 'next', 'additionally', 'and', 'with'];
  var SENTENCE_END = ['.', '!', '?'];

  function tokenizePhrase(phrase) {
    return tokenizeWithOffsets(phrase).map(function (t) { return t.token.toLowerCase(); });
  }
  function makeSet(arr) { var s = {}; arr.forEach(function (x) { s[x] = true; }); return s; }
  var RELATIONAL_SET = makeSet(RELATIONAL_PREPS);
  var BASE_COLOR_SET = makeSet(BASE_COLORS);
  var COLOR_MODIFIER_SET = makeSet(COLOR_MODIFIERS);
  var SPATIAL_SET = makeSet(SPATIAL_WORDS);
  var LOCATION_RUN_SET = makeSet(LOCATION_RUN);
  var ACTION_VERB_SET = makeSet(ACTION_VERBS);
  var ACTION_STOP_SET = makeSet(ACTION_STOP);
  var ACTION_CUE_SET = makeSet(ACTION_CUES);
  var PREFIX_LABEL_STOP_SET = makeSet(PREFIX_LABEL_STOP);
  var SENTENCE_END_SET = makeSet(SENTENCE_END);
  var HEX_RE = /^[0-9A-Fa-f]{3,8}$/;

  var elementPatterns = ELEMENT_PHRASES.map(function (p) { return { pattern: tokenizePhrase(p), phrase: p }; })
    .sort(function (a, b) { return b.pattern.length - a.pattern.length; });

  function rulesPredict(text) {
    var tokensWithOffsets = tokenizeWithOffsets(text);
    var tokens = tokensWithOffsets.map(function (t) { return t.token; });
    var n = tokens.length;
    var tags = new Array(n).fill('O');
    var claimed = new Array(n).fill(false);
    var lowered = tokens.map(function (t) { return t.toLowerCase(); });

    function setSpan(start, end, label) {
      if (start >= end) return false;
      for (var i = start; i < end; i++) if (claimed[i]) return false;
      for (var j = start; j < end; j++) { tags[j] = (j === start ? 'B-' : 'I-') + label; claimed[j] = true; }
      return true;
    }

    // pass 1: quotes -> LABEL
    var openers = ['"', '\u201c'], closers = ['"', '\u201d'];
    for (var i = 0; i < n; i++) {
      if (openers.indexOf(tokens[i]) !== -1) {
        var j = i + 1;
        while (j < n && closers.indexOf(tokens[j]) === -1) j++;
        if (j < n) { setSpan(i + 1, j, 'LABEL'); i = j; }
      }
    }

    // pass 2: elements (longest phrase, landmark guard)
    var elements = [];
    for (var a = 0; a < n; a++) {
      if (claimed[a]) continue;
      for (var b = 0; b < elementPatterns.length; b++) {
        var pat = elementPatterns[b].pattern, len = pat.length;
        if (a + len > n) continue;
        var match = true;
        for (var k = 0; k < len; k++) if (lowered[a + k] !== pat[k]) { match = false; break; }
        if (!match) continue;
        var ctx = lowered.slice(Math.max(0, a - 3), a);
        var landmark = ctx.some(function (w) { return RELATIONAL_SET[w]; });
        if (landmark) continue;
        if (setSpan(a, a + len, 'ELEMENT')) {
          var surface = tokens.slice(a, a + len).join(' ');
          var type = nounToType(surface);
          if (type) elements.push({ start: a, end: a + len, type: type });
          break;
        }
      }
    }

    // pass 3: colors
    for (var c = 0; c < n;) {
      if (claimed[c]) { c++; continue; }
      if (lowered[c] === '#' && c + 1 < n && HEX_RE.test(tokens[c + 1])) {
        if (setSpan(c, c + 2, 'COLOR')) { c += 2; continue; }
      }
      if (COLOR_MODIFIER_SET[lowered[c]]) {
        if (c + 1 < n && BASE_COLOR_SET[lowered[c + 1]]) {
          if (setSpan(c, c + 2, 'COLOR')) { c += 2; continue; }
        }
        if (c + 2 < n && tokens[c + 1] === '-' && BASE_COLOR_SET[lowered[c + 2]]) {
          if (setSpan(c, c + 3, 'COLOR')) { c += 3; continue; }
        }
      }
      if (BASE_COLOR_SET[lowered[c]]) {
        if (setSpan(c, c + 1, 'COLOR')) { c += 1; continue; }
      }
      c++;
    }

    // pass 4: locations
    for (var d = 0; d < n;) {
      if (claimed[d]) { d++; continue; }
      if (lowered[d] === 'in' || lowered[d] === 'at' || lowered[d] === 'on') {
        if (d > 0 && (lowered[d - 1] === 'somewhere' || lowered[d - 1] === 'anywhere' || lowered[d - 1] === 'wherever')) { d++; continue; }
        var jj = d + 1;
        if (jj < n && lowered[jj] === 'the') jj++;
        var runEnd = jj;
        while (runEnd < n && LOCATION_RUN_SET[lowered[runEnd]]) runEnd++;
        while (runEnd > jj && (lowered[runEnd - 1] === 'of' || lowered[runEnd - 1] === 'the')) runEnd--;
        if (runEnd > jj && lowered.slice(jj, runEnd).some(function (w) { return SPATIAL_SET[w]; })) {
          if (setSpan(d, runEnd, 'LOCATION')) { d = runEnd; continue; }
        }
      }
      if (RELATIONAL_SET[lowered[d]]) {
        var start = d, j2 = d + 1;
        if (lowered[d] === 'next' && j2 < n && lowered[j2] === 'to') j2++;
        var collected = 0, end2 = j2;
        while (end2 < n && collected < 4) {
          var w2 = lowered[end2];
          if (claimed[end2] || tokens[end2] === ',' || tokens[end2] === '.' || tokens[end2] === ';' || tokens[end2] === '!' || tokens[end2] === '?' || tokens[end2] === '"' || tokens[end2] === '\u201c' || tokens[end2] === '\u201d' || ACTION_STOP_SET[w2] || w2 === 'that' || w2 === 'which' || w2 === 'and' || w2 === 'for' || w2 === 'to' || w2 === 'of' || w2 === 'listing' || w2 === 'containing' || w2 === 'showing' || w2 === 'coloured' || w2 === 'colored' || w2 === 'colour' || w2 === 'color') break;
          end2++; collected++;
        }
        if (end2 > j2 && setSpan(start, end2, 'LOCATION')) { d = end2; continue; }
      }
      d++;
    }

    // pass 5: actions
    for (var e = 1; e < n; e++) {
      if (!ACTION_VERB_SET[lowered[e]] || claimed[e]) continue;
      if (!ACTION_CUE_SET[lowered[e - 1]]) continue;
      var end3 = e + 1;
      while (end3 < n) {
        var w3 = lowered[end3];
        if (claimed[end3]) break;
        if (tokens[end3] === ',' || tokens[end3] === '.' || tokens[end3] === ';' || tokens[end3] === '!' || tokens[end3] === '?') break;
        if (ACTION_STOP_SET[w3]) break;
        if ((w3 === 'in' || w3 === 'on') && end3 + 1 < n && SPATIAL_SET[lowered[end3 + 1]]) break;
        if (w3 === 'and' && end3 + 2 < n && (lowered[end3 + 1] === 'a' || lowered[end3 + 1] === 'an' || lowered[end3 + 1] === 'the') && nounToType(tokens[end3 + 2])) break;
        end3++;
      }
      setSpan(e, end3, 'ACTION');
    }

    // pass 6: labels
    var sentenceOf = [];
    var sent = 0;
    tokens.forEach(function (tok) { sentenceOf.push(sent); if (SENTENCE_END_SET[tok]) sent++; });

    function governingElementType(cueStart) {
      var sentence = sentenceOf[cueStart];
      var candidates = elements.filter(function (el) { return el.start < cueStart && sentenceOf[el.end - 1] === sentence; });
      if (!candidates.length) return null;
      return candidates.reduce(function (mx, el) { return el.start > mx.start ? el : mx; }).type;
    }

    var cues = [];
    Object.keys(LABEL_CUES).forEach(function (elemType) {
      LABEL_CUES[elemType].forEach(function (cue) { cues.push({ pattern: tokenizePhrase(cue), cue: cue, type: elemType }); });
    });
    cues.sort(function (a, b) { return b.pattern.length - a.pattern.length; });

    function labelEnd(startIdx) {
      var labelCap = tokens[startIdx] && /^[A-Z]/.test(tokens[startIdx]);
      var e2 = startIdx;
      while (e2 < n) {
        var tok = tokens[e2], w = lowered[e2];
        if (claimed[e2]) break;
        if (tok === '.' || tok === ';' || tok === '!' || tok === '?') break;
        if (tok === ',') {
          var nextCap = e2 + 1 < n && /^[A-Z]/.test(tokens[e2 + 1]);
          if (labelCap && nextCap) { e2++; continue; }
          break;
        }
        if (w === 'that' || w === 'which') break;
        if (w === 'and') {
          if (e2 + 2 < n && (lowered[e2 + 1] === 'a' || lowered[e2 + 1] === 'an' || lowered[e2 + 1] === 'the') && nounToType(tokens[e2 + 2])) break;
          e2++; continue;
        }
        if (BASE_COLOR_SET[w] && e2 > startIdx) break;
        if (w === 'in' && e2 + 1 < n && (BASE_COLOR_SET[lowered[e2 + 1]] || COLOR_MODIFIER_SET[lowered[e2 + 1]] || lowered[e2 + 1] === 'some' || lowered[e2 + 1] === 'any' || lowered[e2 + 1] === 'nice' || lowered[e2 + 1] === 'bright' || lowered[e2 + 1] === 'good' || lowered[e2 + 1] === 'pretty')) break;
        if (w === 'with' || w === 'at' || w === 'below' || w === 'under' || w === 'above' || w === 'beside' || w === 'near' || w === 'labelled' || w === 'labeled' || w === 'saying' || w === 'titled' || w === 'named' || w === 'called' || w === 'listing' || w === 'containing' || w === 'showing' || w === 'depicting') break;
        e2++;
      }
      return e2;
    }

    for (var f = 0; f < n; f++) {
      if (claimed[f]) continue;
      var governing = governingElementType(f);
      if (!governing) continue;
      for (var g = 0; g < cues.length; g++) {
        var cue = cues[g];
        if (cue.type !== governing) continue;
        var clen = cue.pattern.length;
        if (f + clen > n) continue;
        var cmatch = true;
        for (var q = 0; q < clen; q++) if (lowered[f + q] !== cue.pattern[q]) { cmatch = false; break; }
        if (!cmatch) continue;
        var ls = f + clen;
        if (ls >= n || tokens[ls] === '"' || tokens[ls] === '\u201c') continue;
        var le = labelEnd(ls);
        if (le > ls) {
          var labelText = tokens.slice(ls, le).join(' ');
          if (findVague(labelText)['LABEL']) break;
          setSpan(ls, le, 'LABEL');
        }
        break;
      }
    }

    elements.forEach(function (el) {
      if (PREFIX_LABEL_TYPES.indexOf(el.type) === -1 || el.start === 0) return;
      var cand = el.start - 1;
      if (claimed[cand]) return;
      var word = lowered[cand];
      if (!/^\w/.test(word) || PREFIX_LABEL_STOP_SET[word]) return;
      if (BASE_COLOR_SET[word] || COLOR_MODIFIER_SET[word]) return;
      if (ACTION_VERB_SET[word] && !/^[A-Z]/.test(tokens[cand])) return;
      setSpan(cand, cand + 1, 'LABEL');
    });

    return { tokensWithOffsets: tokensWithOffsets, tags: tags };
  }

  // ------------------------------------------------------------------- vague
  var VAGUE_PATTERNS = {
    COLOR: [/\b(?:nice|bright|good|any|some|pretty)\s+colou?r\b/i, /\bcolou?r\s+that\s+looks\s+good\b/i],
    LOCATION: [/\b(?:somewhere|wherever|anywhere)\b/i],
    ACTION: [/\bsomething\s+useful\b/i, /\bworks\s+properly\b/i, /\bthe\s+usual\s+thing\b/i, /\bdoes\s+something\b/i],
    LABEL: [/\bsome\s+text\b/i, /\bsuitable\s+content\b/i, /\busual\s+content\b/i, /\bappropriate\s+(?:text|content)\b/i],
  };
  function findVague(clauseText) {
    var found = {};
    Object.keys(VAGUE_PATTERNS).forEach(function (attr) {
      for (var i = 0; i < VAGUE_PATTERNS[attr].length; i++) {
        var m = VAGUE_PATTERNS[attr][i].exec(clauseText);
        if (m) { found[attr] = m[0]; break; }
      }
    });
    return found;
  }
  function annotateVague(elements, tokensWithOffsets, text) {
    // sentence ids
    var sentenceOf = [];
    var sent = 0;
    tokensWithOffsets.forEach(function (t) { sentenceOf.push(sent); if (t.token === '.' || t.token === '!' || t.token === '?') sent++; });
    elements.forEach(function (el, idx) {
      var start = el.span.start;
      var cs = sentenceOf[start];
      var sentenceEnd = start;
      while (sentenceEnd < tokensWithOffsets.length && sentenceOf[sentenceEnd] === cs) sentenceEnd++;
      var end = sentenceEnd;
      if (idx + 1 < elements.length) {
        var ns = elements[idx + 1].span.start;
        if (sentenceOf[ns] === cs && ns < end) end = ns;
      }
      var clause;
      if (end <= start) clause = el.span.text;
      else {
        var chStart = tokensWithOffsets[start].start, chEnd = tokensWithOffsets[end - 1].end;
        clause = text.slice(chStart, chEnd);
      }
      var cues = findVague(clause);
      var required = ELEMENT_SCHEMA[el.type].required;
      el.vaguePhrases = {};
      Object.keys(cues).forEach(function (a) { if (required.indexOf(a) !== -1) el.vaguePhrases[a] = cues[a]; });
    });
  }

  // ----------------------------------------------------------------- linking
  function linkSpansToElements(spans, tokensWithOffsets) {
    var sentenceOf = [];
    var sent = 0;
    tokensWithOffsets.forEach(function (t) { sentenceOf.push(sent); if (t.token === '.' || t.token === '!' || t.token === '?') sent++; });
    var ordered = spans.slice().sort(function (a, b) { return a.start - b.start || a.end - b.end; });
    var elements = [];
    ordered.forEach(function (span) {
      if (span.label !== 'ELEMENT') return;
      var type = nounToType(span.text);
      if (!type) return;
      elements.push({ id: elements.length + 1, type: type, span: span, attributes: {}, missing: [], vague: [], vaguePhrases: {} });
    });
    var byStart = {};
    elements.forEach(function (el) { byStart[el.span.start] = el; });
    var elementSentences = {};
    elements.forEach(function (el) { elementSentences[el.id] = sentenceOf[el.span.start]; });

    function nearestLeft(span, sentence) {
      var cands = elements.filter(function (el) { return el.span.start < span.start && (sentence == null || elementSentences[el.id] === sentence); });
      if (!cands.length) return null;
      return cands.reduce(function (mx, el) { return el.span.start > mx.span.start ? el : mx; });
    }
    function firstRight(span, sentence) {
      var cands = elements.filter(function (el) { return el.span.start > span.start && (sentence == null || elementSentences[el.id] === sentence); });
      if (!cands.length) return null;
      return cands.reduce(function (mn, el) { return el.span.start < mn.span.start ? el : mn; });
    }

    ordered.forEach(function (span) {
      if (span.label === 'ELEMENT') return;
      var sentence = sentenceOf[span.start];
      var target = null;
      if (span.label === 'COLOR' || span.label === 'LABEL') {
        var adjacent = byStart[span.end];
        if (adjacent && elementSentences[adjacent.id] === sentence) target = adjacent;
      }
      if (!target) target = nearestLeft(span, sentence) || firstRight(span, sentence);
      if (!target) target = nearestLeft(span, null) || firstRight(span, null);
      if (!target) return;
      (target.attributes[span.label] = target.attributes[span.label] || []).push(span);
    });
    return elements;
  }

  // ----------------------------------------------------------------- messages
  var ACTION_PHRASES = {
    button: 'what happens when it is clicked',
    modal: 'what opens it or when it appears',
    dropdown: 'what happens when an option is selected',
  };
  var LABEL_PHRASES = {
    button: 'the text on it', navbar: 'which links or items it should contain',
    sidebar: 'which links or items it should contain', input: 'what it is for (e.g. email, password)',
    card: 'its title', modal: 'its title', image: 'what it should show',
    dropdown: 'what the user chooses from it', footer: 'what it should contain', checkbox: 'the text next to it',
  };
  var PREPOSITIONS = ['in', 'at', 'on', 'below', 'under', 'above', 'beside', 'next', 'near', 'underneath', 'beneath', 'inside'];
  var PREPOSITION_SET = makeSet(PREPOSITIONS);

  function elementLabel(el) { return cap(el.type) + ' #' + el.id + ' ("' + el.span.text + '")'; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function firstText(el, attr) { var sp = el.attributes[attr]; return sp && sp.length ? sp[0].text : null; }

  function missingMessage(el, attr) {
    var e = elementLabel(el);
    var phrase = el.vaguePhrases[attr];
    if (phrase) return e + ': the ' + attr.toLowerCase() + " is too vague ('" + phrase + "'); please be specific.";
    if (attr === 'COLOR') return e + ": you didn't mention its colour (for example 'blue', 'dark green' or a hex code like #2E86C1).";
    if (attr === 'LOCATION') return e + ": you didn't say where it should be placed (for example 'top right corner', 'below the header').";
    if (attr === 'ACTION') return e + ': you didn\'t say ' + (ACTION_PHRASES[el.type] || 'what it should do') + '.';
    if (attr === 'LABEL') return e + ": you didn't say " + (LABEL_PHRASES[el.type] || 'the text for it') + '.';
    return e + ': the ' + attr.toLowerCase() + ' is missing.';
  }

  function colorPrefix(el) {
    var colour = firstText(el, 'COLOR');
    if (colour) return colour + ' ';
    if (ELEMENT_SCHEMA[el.type].required.indexOf('COLOR') !== -1) return '<colour> ';
    return '';
  }
  function locationPhrase(el) {
    var loc = firstText(el, 'LOCATION');
    if (!loc) return 'in the <location>';
    var fw = loc.split(/\s+/)[0].toLowerCase();
    if (PREPOSITION_SET[fw]) return loc;
    return 'at the ' + loc;
  }
  function actionPhrase(el) {
    var act = firstText(el, 'ACTION');
    if (!act) {
      if (el.type === 'modal') return 'that <what opens it>';
      if (el.type === 'dropdown') return 'that <what happens on selection>';
      return 'that <what it does>';
    }
    var lower = act.toLowerCase();
    if (lower.indexOf('that ') === 0 || lower.indexOf('which ') === 0) return act;
    return 'that ' + act;
  }
  function labelPhrase(el, placeholder, quoted) {
    var label = firstText(el, 'LABEL');
    if (label) return quoted ? '"' + label + '"' : label;
    return quoted ? '"<' + placeholder + '>"' : '<' + placeholder + '>';
  }
  function suggestion(el) {
    var t = el.type, colour = colorPrefix(el), loc = locationPhrase(el);
    if (t === 'button') return 'Add a ' + colour + 'button ' + loc + ' labelled ' + labelPhrase(el, 'label', true) + ' ' + actionPhrase(el) + '.';
    if (t === 'navbar') return 'Add a ' + colour + 'navbar ' + loc + ' with links ' + labelPhrase(el, 'links', false) + '.';
    if (t === 'input') return 'Add a ' + colour + 'input field ' + loc + ' for ' + labelPhrase(el, 'purpose', false) + '.';
    if (t === 'card') return 'Add a ' + colour + 'card ' + loc + ' titled ' + labelPhrase(el, 'title', true) + '.';
    if (t === 'modal') return 'Add a ' + colour + 'modal titled ' + labelPhrase(el, 'title', true) + ' ' + actionPhrase(el) + '.';
    if (t === 'image') return 'Add an image ' + loc + ' showing ' + labelPhrase(el, 'subject', false) + '.';
    if (t === 'dropdown') return 'Add a ' + colour + 'dropdown ' + loc + ' for selecting ' + labelPhrase(el, 'options', false) + ' ' + actionPhrase(el) + '.';
    if (t === 'sidebar') return 'Add a ' + colour + 'sidebar ' + loc + ' with ' + labelPhrase(el, 'items', false) + '.';
    if (t === 'footer') return 'Add a ' + colour + 'footer with ' + labelPhrase(el, 'content', false) + '.';
    if (t === 'checkbox') return 'Add a ' + colour + 'checkbox ' + loc + ' labelled ' + labelPhrase(el, 'text', true) + '.';
    return 'Add a ' + colour + t + ' ' + loc + '.';
  }

  // ------------------------------------------------------------------ checker
  function checkElements(elements) {
    var checked = [], nIncomplete = 0;
    elements.forEach(function (el) {
      var required = ELEMENT_SCHEMA[el.type].required;
      el.missing = required.filter(function (a) { return !el.attributes[a]; });
      el.vague = el.missing.filter(function (a) { return el.vaguePhrases[a]; });
      if (el.missing.length) nIncomplete++;
      var orderedAttrs = {};
      ATTRIBUTES.forEach(function (a) { var sp = el.attributes[a]; if (sp) orderedAttrs[a] = sp[0].text; });
      checked.push({
        id: el.id, type: el.type, text: el.span.text,
        attributes: orderedAttrs, missing: el.missing, vague: el.vague,
        status: el.missing.length ? 'incomplete' : 'complete',
        messages: el.missing.map(function (a) { return missingMessage(el, a); }),
        suggestion: suggestion(el),
      });
    });
    var message;
    if (!elements.length) message = 'No UI elements detected. Try mentioning things like a button, navbar or input field.';
    else if (nIncomplete) message = nIncomplete + ' of ' + elements.length + ' elements has missing details.';
    else message = 'All elements complete.';
    return {
      elements: checked,
      summary: { n_elements: elements.length, n_incomplete: nIncomplete, complete: !!elements.length && nIncomplete === 0, message: message },
    };
  }

  // ------------------------------------------------------------- clarification
  var UNKNOWN_ANSWERS = ['', 'unknown', "i don't know", 'i dont know', 'idk', 'not sure', 'skip', 'use placeholder', 'n/a', 'none'];
  var UNKNOWN_SET = makeSet(UNKNOWN_ANSWERS);
  var ATTRIBUTE_EXAMPLES = {
    COLOR: ['blue', 'dark green', '#2E86C1'],
    LOCATION: ['top right corner', 'below the header', 'center of the screen'],
    ACTION: ['opens the signup form', 'saves the changes', 'switches the theme'],
    LABEL: ['Sign Up', 'Email', 'Home, About, Contact'],
  };
  function answerIsUnknown(a) { return a == null || UNKNOWN_SET[a.trim().toLowerCase()]; }
  function answerIsVague(a, attr) { return !!findVague(a)[attr]; }

  function questionText(el, attr, vaguePhrase) {
    if (vaguePhrase) return cap(el.type) + ' #' + el.id + ' ("' + el.span.text + '"): the ' + attr.toLowerCase() + " is too vague ('" + vaguePhrase + "'). What should it be?";
    if (attr === 'ACTION') return cap(el.type) + ' #' + el.id + ' ("' + el.span.text + '"): you did not say ' + (ACTION_PHRASES[el.type] || 'what it should do') + '. What should happen?';
    if (attr === 'LABEL') return cap(el.type) + ' #' + el.id + ' ("' + el.span.text + '"): you did not say ' + (LABEL_PHRASES[el.type] || 'the text for it') + '. What should it be?';
    if (attr === 'COLOR') return cap(el.type) + ' #' + el.id + ' ("' + el.span.text + '"): what colour should it be?';
    if (attr === 'LOCATION') return cap(el.type) + ' #' + el.id + ' ("' + el.span.text + '"): where should it be placed?';
    return cap(el.type) + ' #' + el.id + ' ("' + el.span.text + '"): what should the ' + attr.toLowerCase() + ' be?';
  }

  function buildQuestions(elements, result, answers, maxQuestions) {
    answers = answers || {};
    maxQuestions = maxQuestions || 6;
    var byId = {};
    elements.forEach(function (el) { byId[el.id] = el; });
    var questions = [];
    result.elements.forEach(function (item) {
      var el = byId[item.id];
      if (!el) return;
      item.missing.forEach(function (attr) {
        var qid = 'el' + item.id + '-' + attr;
        var prev = answers[qid];
        if (prev != null && !answerIsUnknown(prev) && !answerIsVague(prev, attr)) return;
        var vaguePhrase = el.vaguePhrases[attr];
        questions.push({
          id: qid, kind: vaguePhrase ? 'vague' : 'missing',
          prompt: questionText(el, attr, vaguePhrase),
          element_id: el.id, element_type: el.type, element_text: el.span.text, attribute: attr,
          examples: ATTRIBUTE_EXAMPLES[attr] || [],
        });
      });
    });
    return questions.slice(0, maxQuestions);
  }

  function unresolvedQuestions(questions, answers) {
    answers = answers || {};
    return questions.filter(function (q) {
      var a = answers[q.id];
      if (answerIsUnknown(a)) return true;
      if (q.attribute && answerIsVague(a, q.attribute)) return true;
      return false;
    });
  }

  function mergeAnswers(elements, questions, answers) {
    var byId = {};
    elements.forEach(function (el) { byId[el.id] = el; });
    questions.forEach(function (q) {
      var a = answers[q.id];
      if (answerIsUnknown(a)) return;
      a = a.trim();
      if ((q.kind === 'missing' || q.kind === 'vague') && q.attribute) {
        if (answerIsVague(a, q.attribute)) return;
        var el = byId[q.element_id];
        if (!el) return;
        (el.attributes[q.attribute] = el.attributes[q.attribute] || []).push({
          label: q.attribute, start: -1, end: -1, text: a, charStart: -1, charEnd: -1, source: 'clarification',
        });
      }
    });
  }

  // --------------------------------------------------------------------- risk
  var WEIGHTS = { completeness: 0.40, vagueness: 0.20, detection: 0.20, unresolved: 0.20 };
  function riskLevel(score) {
    if (score >= 75) return 'Critical';
    if (score >= 50) return 'High';
    if (score >= 25) return 'Medium';
    return 'Low';
  }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function round3(v) { return Math.round(v * 1000) / 1000; }

  function computeRisk(result, confidence, totalQuestions, unresolved) {
    var elements = result.elements;
    if (!elements.length) {
      return {
        score: 100, level: 'Critical',
        components: { completeness: 1.0, vagueness: 1.0, detection: 1.0, unresolved: 1.0 },
        counts: { total_required: 0, missing: 0, vague: 0, questions: totalQuestions, unresolved: unresolved },
        explanation: 'No supported UI elements were detected, so the prompt is treated as unsafe to generate automatically.',
      };
    }
    var totalRequired = 0, missing = 0, vague = 0;
    elements.forEach(function (el) {
      var required = ELEMENT_SCHEMA[el.type].required;
      totalRequired += required.length;
      missing += el.missing.length;
      vague += el.vague.length;
    });
    var completeness = totalRequired ? missing / totalRequired : 0;
    var vagueness = totalRequired ? vague / totalRequired : 0;
    var detection = 1 - clamp01(confidence);
    var unresolvedRatio = totalQuestions ? unresolved / totalQuestions : 0;
    var score = 100 * (WEIGHTS.completeness * completeness + WEIGHTS.vagueness * vagueness + WEIGHTS.detection * detection + WEIGHTS.unresolved * unresolvedRatio);
    score = Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;
    var components = { completeness: round3(completeness), vagueness: round3(vagueness), detection: round3(detection), unresolved: round3(unresolvedRatio) };
    var explanation = deterministicExplanation(score, riskLevel(score), components, missing, totalRequired, vague, unresolved);
    return {
      score: score, level: riskLevel(score), components: components,
      counts: { total_required: totalRequired, missing: missing, vague: vague, questions: totalQuestions, unresolved: unresolved },
      explanation: explanation,
    };
  }
  function deterministicExplanation(score, level, components, missing, totalRequired, vague, unresolved) {
    var parts = ['Risk is ' + score + '/100 (' + level + ').'];
    if (totalRequired) parts.push(missing + ' of ' + totalRequired + ' required details are missing.');
    if (vague) parts.push(vague + ' stated detail(s) are too vague to use safely.');
    if (components.detection >= 0.4) parts.push('The detector confidence for this prompt is low.');
    if (unresolved) parts.push(unresolved + ' clarification question(s) remain unresolved, which keeps the risk elevated.');
    if (score >= 75) parts.push('Do not send this prompt to a UI generator yet.');
    else if (score >= 50) parts.push('Resolve the remaining details before generating UI.');
    else if (score >= 25) parts.push('A few improvements would make this prompt safer.');
    else parts.push('The prompt is specific enough to generate UI.');
    return parts.join(' ');
  }

  // ---------------------------------------------------------------- pipeline
  function rulesConfidence(tags, elements, nTokens) {
    var found = elements.length ? 1.0 : 0.0;
    var labelled = tags.filter(function (t) { return t !== 'O'; }).length;
    var coverage = nTokens ? labelled / nTokens : 0;
    var nAttrs = elements.reduce(function (acc, el) { return acc + Object.keys(el.attributes).reduce(function (a, k) { return a + el.attributes[k].length; }, 0); }, 0);
    var density = elements.length ? nAttrs / elements.length : 0;
    return 0.5 * found + 0.3 * Math.min(density / 3.0, 1.0) + 0.2 * Math.min(coverage / 0.7, 1.0);
  }
  function flattenSpans(elements) {
    var spans = [];
    elements.forEach(function (el) {
      spans.push(el.span);
      Object.keys(el.attributes).forEach(function (a) { spans = spans.concat(el.attributes[a]); });
    });
    return spans.sort(function (a, b) { return (a.charStart >= 0 ? a.charStart : 1e9) - (b.charStart >= 0 ? b.charStart : 1e9); });
  }
  function deterministicFinalPrompt(elements) {
    if (!elements.length) return '';
    var sorted = elements.slice().sort(function (a, b) { return a.span.start - b.span.start; });
    var parts = [];
    sorted.forEach(function (el, i) {
      var t = suggestion(el);
      if (i && t.indexOf('Add ') === 0) t = 'Also add ' + t.slice(4);
      parts.push(t);
    });
    return parts.join(' ');
  }

  function analyzeFull(text, answers, finalize) {
    answers = answers || {};
    finalize = !!finalize;
    var pred = rulesPredict(text);
    var tokensWithOffsets = pred.tokensWithOffsets;
    var tokens = tokensWithOffsets.map(function (t) { return t.token; });
    var tags = repairBio(pred.tags);
    var spans = bioToSpans(tokensWithOffsets, tags, text);
    var elements = linkSpansToElements(spans, tokensWithOffsets);
    annotateVague(elements, tokensWithOffsets, text);
    var result = checkElements(elements);

    var confidence = rulesConfidence(tags, elements, tokens.length);

    var initialQuestions = buildQuestions(elements, result, null);
    var initialUnresolved = unresolvedQuestions(initialQuestions, {});
    var initialRisk = computeRisk(result, confidence, initialQuestions.length, initialUnresolved.length);

    if (Object.keys(answers).length) {
      mergeAnswers(elements, initialQuestions, answers);
      annotateVague(elements, tokensWithOffsets, text);
      result = checkElements(elements);
      spans = flattenSpans(elements);
    }

    var questions = buildQuestions(elements, result, answers);
    var unresolved = unresolvedQuestions(questions, answers);
    var finalRisk = computeRisk(result, confidence, questions.length, unresolved.length);

    var needsClarification = !!questions.length && !finalize;
    var finalPrompt = null, explanation = null, recommendations = null;
    var deterministicPrompt = deterministicFinalPrompt(elements);

    if (!needsClarification) {
      finalPrompt = deterministicPrompt;
      explanation = finalRisk.explanation || '';
      if (unresolved.length) {
        explanation += ' Unresolved: ' + unresolved.map(function (q) { return q.prompt; }).join('; ');
      }
      recommendations = result.elements.map(function (el) { return el.suggestion; });
    }

    return {
      tokens: tokens,
      tags: tags,
      spans: spans,
      result: result,
      engine: 'rules',
      router: { method: 'rules', reason: 'manual selection', scores: {} },
      confidence: round3(confidence),
      llm_meta: {}, llm_error: null, llm_used: false,
      risk: { initial: initialRisk, final: finalRisk },
      clarification: {
        questions: questions,
        answers: answers,
        unresolved: unresolved,
      },
      needs_clarification: needsClarification,
      final_prompt: finalPrompt,
      deterministic_prompt: deterministicPrompt,
      explanation: explanation,
      recommendations: recommendations,
    };
  }

  // --------------------------------------------------- detector-supplied spans
  // Used by BERT and the grounded LLM. They only supply character spans; the
  // same linking, checking, clarification and risk code runs afterwards.
  function analyzeFromSpans(text, detectedSpans, confidence, engine, answers, finalize, llmMeta) {
    answers = answers || {};
    finalize = !!finalize;
    var tokensWithOffsets = tokenizeWithOffsets(text);
    var tokens = tokensWithOffsets.map(function (t) { return t.token; });

    function rangeFor(cs, ce) {
      var start = -1, end = -1;
      for (var i = 0; i < tokensWithOffsets.length; i++) {
        if (tokensWithOffsets[i].end > cs && tokensWithOffsets[i].start < ce) {
          if (start < 0) start = i;
          end = i + 1;
        }
      }
      return start >= 0 ? [start, end] : null;
    }

    var spans = [];
    (detectedSpans || []).forEach(function (d) {
      var label = String(d.label || '').toUpperCase();
      if (ATTRIBUTES.indexOf(label) === -1) return;
      var cs = Number(d.char_start != null ? d.char_start : d.charStart);
      var ce = Number(d.char_end != null ? d.char_end : d.charEnd);
      if (!isFinite(cs) || !isFinite(ce) || ce <= cs || cs < 0 || ce > text.length) return;
      var range = rangeFor(cs, ce);
      if (!range) return;
      spans.push({
        label: label, start: range[0], end: range[1],
        text: text.slice(cs, ce), charStart: cs, charEnd: ce, source: 'detector',
      });
    });

    var elements = linkSpansToElements(spans, tokensWithOffsets);
    annotateVague(elements, tokensWithOffsets, text);
    var result = checkElements(elements);
    var conf = Math.max(0, Math.min(1, Number(confidence) || 0));

    var initialQuestions = buildQuestions(elements, result, null);
    var initialUnresolved = unresolvedQuestions(initialQuestions, {});
    var initialRisk = computeRisk(result, conf, initialQuestions.length, initialUnresolved.length);

    if (Object.keys(answers).length) {
      mergeAnswers(elements, initialQuestions, answers);
      annotateVague(elements, tokensWithOffsets, text);
      result = checkElements(elements);
      spans = flattenSpans(elements);
    }

    var questions = buildQuestions(elements, result, answers);
    var unresolved = unresolvedQuestions(questions, answers);
    var finalRisk = computeRisk(result, conf, questions.length, unresolved.length);
    var needsClarification = !!questions.length && !finalize;
    var finalPrompt = null, explanation = null, recommendations = null;
    var deterministicPrompt = deterministicFinalPrompt(elements);

    if (!needsClarification) {
      finalPrompt = deterministicPrompt;
      explanation = finalRisk.explanation || '';
      if (unresolved.length) {
        explanation += ' Unresolved: ' + unresolved.map(function (q) { return q.prompt; }).join('; ');
      }
      recommendations = result.elements.map(function (el) { return el.suggestion; });
    }

    return {
      tokens: tokens,
      tags: [],
      spans: spans,
      result: result,
      engine: engine || 'bert',
      router: { method: engine || 'bert', reason: 'manual selection', scores: {} },
      confidence: round3(conf),
      llm_meta: llmMeta || {}, llm_error: null, llm_used: engine === 'llm',
      risk: { initial: initialRisk, final: finalRisk },
      clarification: { questions: questions, answers: answers, unresolved: unresolved },
      needs_clarification: needsClarification,
      final_prompt: finalPrompt,
      deterministic_prompt: deterministicPrompt,
      explanation: explanation,
      recommendations: recommendations,
    };
  }

  // ------------------------------------------------------------------ router
  // Port of src/router.py: prompt-only features predict which detector should
  // handle the prompt. The caller then runs the candidate(s) and ranks the
  // actual results by selectionScore().
  var HELD_OUT_COLOURS = ['#ff5733', '#2e86c1', 'royal purple', 'off-white', 'maroon', 'sky blue'];
  var EXPLICIT_CUES = [
    'labelled', 'labeled', 'saying', 'titled', 'named', 'called',
    'with links', 'with the items', 'containing', 'that reads',
    'with the text', 'with the title', 'with the heading', 'for selecting',
    'to choose', 'asking for', 'meant for', 'showing', 'depicting',
  ];
  var ROUTER_RELATIONAL_PREPS = ['below', 'under', 'above', 'beside', 'near', 'underneath', 'beneath', 'inside', 'next'];
  var ROUTER_COMMON_WORDS = [
    'a', 'an', 'the', 'and', 'or', 'but', 'with', 'without', 'for', 'to',
    'of', 'in', 'on', 'at', 'by', 'from', 'as', 'is', 'are', 'be', 'it',
    'this', 'that', 'these', 'those', 'my', 'our', 'your', 'me', 'i', 'we',
    'you', 'add', 'create', 'make', 'build', 'place', 'put', 'insert',
    'include', 'design', 'give', 'want', 'need', 'also', 'then', 'next',
    'page', 'screen', 'app', 'website', 'site', 'which', 'who', 'when',
    'where', 'what', 'how', 'should', 'would', 'can', 'will', 'some', 'any',
    'new', 'small', 'large', 'big', 'simple', 'nice', 'main', 'another',
    'second', 'floating', 'right', 'left', 'top', 'bottom', 'center',
    'centre', 'middle', 'corner', 'side', 'colour', 'color',
  ];
  var KEYWORD_WORDS = (function () {
    var set = {};
    NOUN_KEYWORDS.forEach(function (entry) {
      entry[0].split(/\s+/).forEach(function (word) { set[word] = true; });
    });
    return set;
  })();
  var KNOWN_WORDS = (function () {
    var set = {};
    [KEYWORD_WORDS, makeSet(BASE_COLORS), makeSet(COLOR_MODIFIERS), makeSet(ACTION_VERBS),
      makeSet(SPATIAL_WORDS), makeSet(ROUTER_COMMON_WORDS)].forEach(function (src) {
      Object.keys(src).forEach(function (word) { set[word] = true; });
    });
    return set;
  })();
  var ROUTER_HEX_RE = /#[0-9A-Fa-f]{3,8}\b/;
  var ROUTER_BERT_MARGIN = 1.25;

  function countPhrase(text, phrase) {
    var re = new RegExp('\\b' + phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
    var m = text.match(re);
    return m ? m.length : 0;
  }

  function promptFeatures(text) {
    var lowered = text.toLowerCase();
    var tokens = tokenizeWithOffsets(text).map(function (t) { return t.token.toLowerCase(); });

    var knownNouns = 0, repeatedNoun = false;
    NOUN_KEYWORDS.forEach(function (entry) {
      var c = countPhrase(lowered, entry[0]);
      knownNouns += c;
      if (c > 1) repeatedNoun = true;
    });

    var hasHex = ROUTER_HEX_RE.test(text);
    var hasHeldOut = HELD_OUT_COLOURS.some(function (c) { return lowered.indexOf(c) !== -1; });
    var hasCta = lowered.indexOf('cta') !== -1 || lowered.indexOf('call-to-action') !== -1 || lowered.indexOf('call to action') !== -1;
    var hasExplicitCue = EXPLICIT_CUES.some(function (c) { return lowered.indexOf(c) !== -1; });
    var hasVague = Object.keys(findVague(text)).length > 0;

    var landmark = false;
    for (var i = 0; i < tokens.length; i++) {
      if (ROUTER_RELATIONAL_PREPS.indexOf(tokens[i]) !== -1) {
        var window_ = tokens.slice(i + 1, i + 5);
        if (window_.some(function (w) { return KEYWORD_WORDS[w]; })) { landmark = true; break; }
      }
    }

    var listLike = (text.indexOf(',') !== -1 && lowered.indexOf('and') !== -1) || lowered.indexOf(' and ') !== -1;
    var listWithoutCue = listLike && !['links', 'items', 'containing', 'listing'].some(function (c) {
      return lowered.indexOf(c) !== -1;
    });

    var alphabet = tokens.filter(function (t) { return /^[a-z]+$/.test(t); });
    var oov = alphabet.filter(function (t) { return !KNOWN_WORDS[t]; });
    var oovRate = alphabet.length ? oov.length / alphabet.length : 0;

    return {
      known_nouns: knownNouns,
      repeated_noun: repeatedNoun,
      has_hex: hasHex,
      has_held_out_colour: hasHeldOut,
      has_cta: hasCta,
      has_explicit_cue: hasExplicitCue,
      has_vague: hasVague,
      landmark_pattern: landmark,
      list_without_cue: listWithoutCue,
      oov_rate: Math.round(oovRate * 1000) / 1000,
      n_tokens: tokens.length,
    };
  }

  function routeReason(method, f) {
    if (method === 'llm') {
      if (f.known_nouns === 0) return 'No known UI noun was found; the LLM can interpret free-form wording.';
      if (f.has_vague) return 'The prompt contains vague language; the LLM can interpret it.';
      if (f.oov_rate >= 0.45) return 'Many words are outside the known vocabulary; the LLM is the safer choice.';
      return 'The prompt is ambiguous for the other methods; using the LLM.';
    }
    if (method === 'bert') {
      if (f.repeated_noun) return 'A UI noun is repeated (often inside a label); BERT handles this better.';
      if (f.landmark_pattern) return 'A landmark phrase may hide a real element; BERT handles this better.';
      if (f.list_without_cue) return 'A list-like label has no explicit cue; BERT handles this better.';
      return "The prompt matches BERT's stronger free-form pattern handling.";
    }
    if (f.has_hex || f.has_held_out_colour) return 'The prompt contains a hex or held-out colour that the rule lexicon knows.';
    if (f.has_cta) return 'The prompt contains CTA/call-to-action phrasing that BERT often splits.';
    if (f.known_nouns) return 'The prompt contains known UI nouns and explicit cues; Rules is reliable.';
    return 'Rules is the safe default.';
  }

  function routePrompt(text, allowLlm) {
    var f = promptFeatures(text);
    allowLlm = allowLlm !== false;
    var scores = { rules: 1.0, bert: 0.0, llm: 0.0 };

    if (f.has_hex || f.has_held_out_colour || f.has_cta) scores.rules += 3.0;
    if (f.known_nouns) { scores.rules += 2.0; scores.bert += 0.5; }
    else { scores.llm += 2.0; scores.bert += 1.0; }
    if (f.has_explicit_cue) scores.rules += 1.0;
    if (f.repeated_noun) { scores.bert += 3.0; scores.rules -= 1.5; }
    if (f.landmark_pattern) scores.bert += 1.5;
    if (f.list_without_cue) scores.bert += 3.5;
    if (f.has_vague) scores.llm += 1.0;
    if (f.oov_rate >= 0.45) scores.llm += 1.5;

    var ordered = Object.keys(scores).map(function (k) { return [k, scores[k]]; })
      .sort(function (a, b) { return b[1] - a[1]; });
    var method = ordered[0][0];
    var margin = ordered[0][1] - ordered[1][1];

    if (method === 'llm' && !allowLlm) {
      method = ordered[1][0];
      margin = Math.abs(scores[method] - scores[ordered[2][0]]);
    }
    if (margin < 0.75 && allowLlm) method = 'llm';

    var original = method;
    if (method === 'bert' && margin < ROUTER_BERT_MARGIN) method = 'rules';

    var confidence = Math.max(0.30, Math.min(0.95, 0.55 + margin / 4.0));
    var reason = routeReason(method, f);
    if (original === 'bert' && method === 'rules') {
      reason = "BERT's advantage was not decisive; Rules is safer on this dataset.";
    }
    return {
      method: method,
      scores: { rules: round2(scores.rules), bert: round2(scores.bert), llm: round2(scores.llm) },
      margin: round2(margin),
      confidence: round2(confidence),
      reason: reason,
      features: f,
    };
  }

  function round2(v) { return Math.round(v * 100) / 100; }

  /** Rank a detector run by confidence + grounded detail (mirrors pipeline.py). */
  function selectionScore(payload) {
    var elements = (payload && payload.result && payload.result.elements) || [];
    if (!elements.length) return 0;
    var attrs = 0;
    elements.forEach(function (el) { attrs += Object.keys(el.attributes || {}).length; });
    var completeness = Math.min(attrs / (3 * elements.length), 1);
    var confidence = Math.max(0, Math.min(1, Number(payload.confidence) || 0));
    return Math.round((0.7 * confidence + 0.3 * completeness) * 10000) / 10000;
  }

  global.PromptLinterEngine = {
    analyze: analyzeFull,
    analyzeFromSpans: analyzeFromSpans,
    tokenize: tokenizeWithOffsets,
    suggest: suggestion,
    routePrompt: routePrompt,
    selectionScore: selectionScore,
    promptFeatures: promptFeatures,
  };
})(typeof window !== 'undefined' ? window : globalThis);
