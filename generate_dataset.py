#!/usr/bin/env python3
"""
Synthetic + hand-written dataset generator for the "UI/UX Prompt Completeness Checker".

Task: token classification (BIO tagging) of UI prompts, then rule-based "missing attribute" check.

Labels : ELEMENT, COLOR, LOCATION, ACTION, LABEL   (BIO scheme -> 11 tags)
Output : dataset/{train,dev,test,handwritten_test}.jsonl  + schema.json

Annotation rules (document these in your report):
  * No implicit inference: "a login button" does NOT imply an ACTION. If it is not stated, it is missing.
  * Vague values ("somewhere on the side", "some nice colour") are NOT labelled, so the attribute counts as missing.
  * An attribute belongs to the element whose clause it appears in (elem_ids field gives the links).
  * Coreference ("make it blue", "another one next to it") is out of scope.

Held-out generalisation: dev uses only the first ~70% of every vocabulary / template list,
the test split uses 100%, so the test set contains unseen colours, labels, phrasings and element nouns.
"""
import argparse, json, os, random, re
from collections import Counter

# --------------------------------------------------------------------------- schema
SCHEMA = {
    "button":   {"allowed": ["COLOR", "LOCATION", "LABEL", "ACTION"], "required": ["LABEL", "ACTION", "COLOR", "LOCATION"]},
    "navbar":   {"allowed": ["COLOR", "LOCATION", "LABEL"],           "required": ["COLOR", "LOCATION", "LABEL"]},
    "input":    {"allowed": ["LABEL", "LOCATION", "COLOR"],           "required": ["LABEL", "LOCATION"]},
    "card":     {"allowed": ["COLOR", "LOCATION", "LABEL"],           "required": ["COLOR", "LOCATION", "LABEL"]},
    "modal":    {"allowed": ["ACTION", "LABEL", "COLOR"],             "required": ["ACTION", "LABEL", "COLOR"]},
    "image":    {"allowed": ["LOCATION", "LABEL"],                    "required": ["LOCATION", "LABEL"]},
    "dropdown": {"allowed": ["LABEL", "LOCATION", "ACTION"],          "required": ["LABEL", "LOCATION", "ACTION"]},
    "sidebar":  {"allowed": ["LOCATION", "COLOR", "LABEL"],           "required": ["LOCATION", "COLOR", "LABEL"]},
    "footer":   {"allowed": ["COLOR", "LABEL"],                       "required": ["COLOR", "LABEL"]},
    "checkbox": {"allowed": ["LABEL", "LOCATION", "COLOR"],           "required": ["LABEL", "LOCATION"]},
}

# --------------------------------------------------------------------------- vocabularies
# NOTE: order matters. The last ~30% of each list is held out from train/dev.
NOUNS = {
    "button":   ["button", "primary button", "CTA button", "call-to-action button"],
    "navbar":   ["navbar", "navigation bar", "menu bar"],
    "input":    ["input field", "text box", "input box", "text field"],
    "card":     ["card", "info card", "content card"],
    "modal":    ["modal", "popup", "dialog box", "modal window"],
    "image":    ["image", "picture", "banner image", "photo"],
    "dropdown": ["dropdown", "dropdown menu", "select box"],
    "sidebar":  ["sidebar", "side menu", "side panel"],
    "footer":   ["footer", "page footer", "footer section"],
    "checkbox": ["checkbox", "tick box", "check box"],
}
COLORS = ["red", "blue", "green", "orange", "purple", "teal", "black", "white", "yellow", "pink",
          "dark blue", "light grey", "navy blue", "dark green", "light blue", "#FF5733", "#2E86C1",
          "royal purple", "off-white", "maroon", "sky blue"]
LOCATIONS = ["in the top right corner", "at the top left", "at the bottom of the page", "on the left side of the screen",
             "at the center of the page", "below the header", "at the top of the page", "in the bottom right corner",
             "on the right side", "next to the logo", "above the footer", "in the middle of the screen",
             "under the hero image", "at the bottom left", "beside the search bar", "in the top center"]
LABELS = {
    "button":   ["Sign Up", "Submit", "Buy Now", "Login", "Download", "Add to Cart", "Subscribe", "Contact Us",
                 "Get Started", "Learn More", "Checkout", "Save"],
    "navbar":   ["Home, About, Contact", "Home, Products, Pricing", "Dashboard, Reports, Settings", "Home, Blog, Login",
                 "Shop, Cart, Profile", "Features, Pricing, FAQ", "Home, Services, Gallery"],
    "input":    ["email", "password", "full name", "phone number", "search query", "username", "address", "city"],
    "card":     ["Product Details", "Our Team", "Latest News", "Pricing Plan", "Featured Course", "Weather Today",
                 "Order Summary"],
    "modal":    ["Confirm Delete", "Subscribe to Newsletter", "Login", "Terms and Conditions", "Payment Details",
                 "Welcome", "Session Expired"],
    "image":    ["a mountain landscape", "the company logo", "a smiling customer", "a coffee cup", "the product photo",
                 "a city skyline", "a team photo"],
    "dropdown": ["country", "language", "category", "size", "payment method", "sort order", "currency"],
    "sidebar":  ["Dashboard, Messages, Settings", "Home, Orders, Customers", "Inbox, Sent, Drafts",
                 "Profile, Billing, Help", "Courses, Grades, Calendar", "Overview, Analytics, Users"],
    "footer":   ["copyright text and social links", "Privacy Policy and Terms", "contact details",
                 "a newsletter signup", "All rights reserved", "company address and phone number"],
    "checkbox": ["Remember me", "I agree to the terms", "Subscribe to updates", "Keep me logged in",
                 "Show password", "Enable notifications", "Send me offers"],
}
ACTIONS = {
    "button":   ["opens the signup form", "submits the form", "takes the user to the checkout page", "downloads the PDF",
                 "adds the item to the cart", "scrolls to the contact section", "logs the user out", "toggles dark mode",
                 "sends a confirmation email", "opens the help chat", "saves the changes", "clears all fields"],
    "modal":    ["appears when the user clicks Delete", "opens when the user clicks Help", "pops up after the user adds an item",
                 "shows when the form is submitted", "appears on page load", "opens when the user clicks the profile icon"],
    "dropdown": ["filters the list by category", "changes the language", "sorts products by price",
                 "updates the displayed currency", "shows the matching results", "switches the theme"],
}
# (lead phrase, quoted?)
LABEL_TAILS = {
    "button":   [("labelled", True), ("with the text", True), ("saying", True), ("that reads", True)],
    "navbar":   [("with links", False), ("containing", False), ("with the items", False)],
    "input":    [("for", False), ("asking for", False), ("meant for", False)],
    "card":     [("titled", True), ("with the heading", True), ("named", True)],
    "modal":    [("titled", True), ("with the title", True), ("called", True)],
    "image":    [("showing", False), ("of", False), ("depicting", False)],
    "dropdown": [("for selecting", False), ("listing", False), ("to choose", False)],
    "sidebar":  [("with", False), ("containing", False), ("listing", False)],
    "footer":   [("with", False), ("containing", False), ("showing", False)],
    "checkbox": [("labelled", True), ("saying", True), ("with the text", True)],
}
VAGUE = {
    "COLOR":    ["in some nice colour", "in a colour that looks good", "in a bright colour", "in any colour you like"],
    "LOCATION": ["somewhere on the side", "somewhere visible", "wherever it fits", "somewhere on the page"],
    "ACTION":   ["that does something useful", "that works properly", "that does the usual thing"],
    "LABEL":    ["with some text", "with suitable content", "with the usual content"],
}
LEAD_FIRST = ["Add", "Create", "Place", "Put", "Insert", "Include", "I want", "I need", "Give me", "Design"]
LEAD_NEXT = ["Also add", "Then add", "Also include", "Next, put", "Then place", "Also create", "Additionally, insert"]
CONTEXT = ["Build a landing page for a coffee shop", "Design a login page for a banking app",
           "I am working on a dashboard for a fitness tracker", "Create a portfolio website",
           "Make a checkout screen for an online store", "Design a settings page for a mobile app",
           "Build the homepage of a travel blog", "I am building a student portal",
           "Create a sign up screen for a food delivery app", "Make an admin panel for a library system"]

# --------------------------------------------------------------------------- helpers
TOK = re.compile(r"\w+(?:'\w+)?|[^\w\s]")


def P(lst, split):
    """Vocabulary visible to a split: 70% for train/dev, 100% for test."""
    n = len(lst) if split == "test" else max(1, int(len(lst) * 0.7))
    return lst[:n]


def article(w):
    return "an" if w[0].lower() in "aeiou" else "a"


def render(segs):
    t = " ".join(s[0] for s in segs)
    t = re.sub(r"\s+([,.;:!?])", r"\1", t)
    t = re.sub(r'"\s+([^"]*?)\s+"', r'"\1"', t)
    return t


def finalize(rid, text, segs, etypes, source):
    tokens, labels, eids = [], [], []
    attrs = {}
    for seg_text, tag, eid in segs:
        toks = TOK.findall(seg_text)
        for i, t in enumerate(toks):
            tokens.append(t)
            if tag:
                labels.append(("B-" if i == 0 else "I-") + tag)
                eids.append(eid)
            else:
                labels.append("O")
                eids.append(0)
        if tag and tag != "ELEMENT":
            attrs.setdefault(eid, {})[tag] = seg_text
    elements = []
    for eid in sorted(etypes):
        et = etypes[eid]
        a = attrs.get(eid, {})
        missing = [x for x in SCHEMA[et]["required"] if x not in a]
        elements.append({"id": eid, "type": et, "attributes": a, "missing": missing})
    return {"id": rid, "source": source, "text": text, "tokens": tokens, "labels": labels,
            "elem_ids": eids, "elements": elements,
            "has_missing": any(e["missing"] for e in elements)}


def value(rng, attr, et, split):
    if attr == "COLOR":
        return rng.choice(P(COLORS, split))
    if attr == "LOCATION":
        return rng.choice(P(LOCATIONS, split))
    if attr == "ACTION":
        return rng.choice(P(ACTIONS[et], split))
    return rng.choice(P(LABELS[et], split))


def label_tail(rng, et, val, eid, split):
    lead, quoted = rng.choice(P(LABEL_TAILS[et], split))
    segs = [(lead, None, 0)]
    if quoted:
        segs += [('"', None, 0), (val, "LABEL", eid), ('"', None, 0)]
    else:
        segs.append((val, "LABEL", eid))
    return segs


def make_clause(rng, split, et, eid, first, present, vague):
    segs = [(rng.choice(LEAD_FIRST if first else LEAD_NEXT), None, 0)]
    color = present.get("COLOR")
    prefix = bool(color) and rng.random() < 0.7
    noun = rng.choice(P(NOUNS[et], split))
    segs.append((article(color if prefix else noun), None, 0))
    if prefix:
        segs.append((color, "COLOR", eid))
    segs.append((noun, "ELEMENT", eid))

    tails = []
    if color and not prefix:
        tails.append(rng.choice([[("coloured", None, 0), (color, "COLOR", eid)],
                                 [("in", None, 0), (color, "COLOR", eid), ("colour", None, 0)]]))
    if "LABEL" in present:
        tails.append(label_tail(rng, et, present["LABEL"], eid, split))
    if "LOCATION" in present:
        tails.append([(present["LOCATION"], "LOCATION", eid)])
    if "ACTION" in present:
        tails.append([(rng.choice(["that", "which"]), None, 0), (present["ACTION"], "ACTION", eid)])
    for a in vague:
        tails.append([(rng.choice(VAGUE[a]), None, 0)])
    rng.shuffle(tails)
    for i, t in enumerate(tails):
        if i > 0 and rng.random() < 0.3:
            segs.append((",", None, 0))
        segs += t
    return segs


def make_sample(rng, split, rid):
    n = rng.choices([1, 2, 3], [0.4, 0.35, 0.25])[0]
    types = rng.sample(list(SCHEMA), n)
    level = rng.choice([0.25, 0.5, 0.75, 1.0])  # probability a required attribute is mentioned
    segs, etypes = [], {}
    if rng.random() < 0.3:
        segs += [(rng.choice(CONTEXT), None, 0), (".", None, 0)]
    for i, et in enumerate(types, 1):
        present, vague = {}, []
        for a in SCHEMA[et]["allowed"]:
            req = a in SCHEMA[et]["required"]
            if rng.random() < (level if req else 0.2):
                present[a] = value(rng, a, et, split)
            elif req and rng.random() < 0.15:
                vague.append(a)
        segs += make_clause(rng, split, et, i, i == 1, present, vague)
        segs.append((".", None, 0))
        etypes[i] = et
    return finalize(rid, render(segs), segs, etypes, "synthetic")


def generate(split, n, seed, seen):
    rng = random.Random(seed)
    out = []
    while len(out) < n:
        s = make_sample(rng, split, f"{split}-{len(out):04d}")
        if s["text"] in seen:
            continue
        seen.add(s["text"])
        out.append(s)
    return out


# --------------------------------------------------------------------------- hand-written natural prompts
# inline markup: [text|TAG|elem_id]   and   [text|ELEMENT|elem_id|element_type]
HAND = [
    'Add a [red|COLOR|1] [button|ELEMENT|1|button] at the [top right corner|LOCATION|1] labelled "[Sign Up|LABEL|1]" that [opens the signup form|ACTION|1].',
    'I need a [button|ELEMENT|1|button] on my homepage.',
    'Create a [blue|COLOR|1] [navbar|ELEMENT|1|navbar] at the [top of the page|LOCATION|1] with links [Home, About and Contact|LABEL|1].',
    'Put a [Login|LABEL|1] [button|ELEMENT|1|button] in the [top right|LOCATION|1], [green|COLOR|1] colour, that [logs the user in|ACTION|1].',
    'Add a [search|LABEL|1] [input field|ELEMENT|1|input] in the [center of the screen|LOCATION|1].',
    'Add an [email|LABEL|1] [input field|ELEMENT|1|input] and a [password|LABEL|2] [input field|ELEMENT|2|input].',
    'Design a login page with an [input field|ELEMENT|1|input] for [username|LABEL|1], another [input field|ELEMENT|2|input] for [password|LABEL|2] and a [button|ELEMENT|3|button] that [logs in the user|ACTION|3].',
    'Make a [dark blue|COLOR|1] [sidebar|ELEMENT|1|sidebar] on the [left side|LOCATION|1] with [Inbox, Sent and Drafts|LABEL|1].',
    'Add a [modal|ELEMENT|1|modal] titled "[Confirm Delete|LABEL|1]" that [appears when the user clicks Delete|ACTION|1].',
    'I want a [footer|ELEMENT|1|footer] with [privacy policy and terms|LABEL|1] in some nice colour.',
    'Put a [card|ELEMENT|1|card] somewhere on the side titled "[Weather Today|LABEL|1]".',
    'Insert an [image|ELEMENT|1|image] of [a mountain landscape|LABEL|1] at the [top of the page|LOCATION|1].',
    'Add a [dropdown|ELEMENT|1|dropdown] for selecting [country|LABEL|1].',
    'Add a [checkbox|ELEMENT|1|checkbox] labelled "[Remember me|LABEL|1]" [below the password field|LOCATION|1].',
    'Create a [purple|COLOR|1] [button|ELEMENT|1|button] saying "[Buy Now|LABEL|1]" that [adds the item to the cart|ACTION|1].',
    'Add a [button|ELEMENT|1|button] in the [bottom right corner|LOCATION|1].',
    'Place a [navbar|ELEMENT|1|navbar] at the [top|LOCATION|1].',
    'Make the [Submit|LABEL|1] [button|ELEMENT|1|button] [orange|COLOR|1].',
    'Add a [teal|COLOR|1] [card|ELEMENT|1|card] titled "[Our Team|LABEL|1]" in the [middle of the screen|LOCATION|1], and below it a [footer|ELEMENT|2|footer] with [contact details|LABEL|2].',
    'Add a [red|COLOR|1] [button|ELEMENT|1|button] that [deletes the item|ACTION|1].',
    'Add a [button|ELEMENT|1|button] that [downloads the PDF|ACTION|1] at the [bottom of the page|LOCATION|1] with the text "[Download|LABEL|1]" in [light blue|COLOR|1].',
    'Build a dashboard with a [sidebar|ELEMENT|1|sidebar] and a [navbar|ELEMENT|2|navbar] and a [card|ELEMENT|3|card].',
    'Add a [black|COLOR|1] [navbar|ELEMENT|1|navbar] with [Shop, Cart and Profile|LABEL|1].',
    'Include an [input field|ELEMENT|1|input] with a [red|COLOR|1] border at the [bottom|LOCATION|1].',
    'Put a [modal|ELEMENT|1|modal] that [opens when the user clicks Help|ACTION|1] and has a [white|COLOR|1] background with the title "[Help Center|LABEL|1]".',
    'Add a [dropdown|ELEMENT|1|dropdown] in the [top left corner|LOCATION|1] to [sort products by price|ACTION|1] listing [Low to High and High to Low|LABEL|1].',
    'Create a [Subscribe|LABEL|1] [button|ELEMENT|1|button] and make it look nice.',
    'Add a [yellow|COLOR|1] [button|ELEMENT|1|button] [next to the search bar|LOCATION|1].',
    'Add a [footer|ELEMENT|1|footer] in [navy blue|COLOR|1] saying "[All rights reserved|LABEL|1]".',
    'Insert an [image|ELEMENT|1|image] on the [right side|LOCATION|1].',
]
MARK = re.compile(r"\[([^\]|]+)\|([A-Z]+)\|(\d+)(?:\|(\w+))?\]")


def parse_marked(s):
    segs, etypes, pos = [], {}, 0
    for m in MARK.finditer(s):
        if m.start() > pos:
            segs.append((s[pos:m.start()], None, 0))
        text, tag, eid, et = m.groups()
        eid = int(eid)
        segs.append((text, tag, eid))
        if tag == "ELEMENT":
            etypes[eid] = et
        pos = m.end()
    if pos < len(s):
        segs.append((s[pos:], None, 0))
    return segs, etypes


def handwritten():
    out = []
    for i, s in enumerate(HAND):
        segs, etypes = parse_marked(s)
        text = "".join(x[0] for x in segs)
        out.append(finalize(f"hand-{i:03d}", text, segs, etypes, "handwritten"))
    return out


# --------------------------------------------------------------------------- main
def write(path, rows):
    with open(path, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def stats(name, rows):
    lab = Counter(l[2:] for r in rows for l in r["labels"] if l.startswith("B-"))
    miss = Counter(m for r in rows for e in r["elements"] for m in e["missing"])
    n_el = sum(len(r["elements"]) for r in rows)
    n_incomplete = sum(1 for r in rows if r["has_missing"])
    print(f"{name:>16}: {len(rows):4d} prompts | {n_el:4d} elements | incomplete prompts {n_incomplete/len(rows):.0%}")
    print(f"{'':>16}  entity counts {dict(lab)}")
    print(f"{'':>16}  missing counts {dict(miss)}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset"))
    ap.add_argument("--train", type=int, default=800)
    ap.add_argument("--dev", type=int, default=150)
    ap.add_argument("--test", type=int, default=200)
    ap.add_argument("--seed", type=int, default=42)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    seen = set()
    data = {
        "train": generate("train", a.train, a.seed, seen),
        "dev": generate("dev", a.dev, a.seed + 1, seen),
        "test": generate("test", a.test, a.seed + 2, seen),
        "handwritten_test": handwritten(),
    }
    for k, v in data.items():
        write(os.path.join(a.out, f"{k}.jsonl"), v)
        stats(k, v)
    tags = ["O"] + [f"{p}-{l}" for l in ["ELEMENT", "COLOR", "LOCATION", "ACTION", "LABEL"] for p in "BI"]
    with open(os.path.join(a.out, "schema.json"), "w") as f:
        json.dump({"tags": tags, "elements": SCHEMA}, f, indent=2)
