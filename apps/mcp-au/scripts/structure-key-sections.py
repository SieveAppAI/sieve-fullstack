#!/usr/bin/env python3
"""
Extract structured ingredient and claims data from key FSANZ PDF sections.

Reads the full PDF, finds key sections (Schedule 15, Standard 1.2.7, Schedule 4),
sends to Claude in chunks, and stores results.

Usage:
  export $(grep -v '^#' .env.local | xargs)
  python3 scripts/structure-key-sections.py /path/to/Food\ Standards\ Code.pdf
"""

import os
import sys
import json
import time
import re
import requests
import PyPDF2

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"].strip()
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"].strip()
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"].strip()

SB_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation,resolution=merge-duplicates",
}

SOURCE_URL = "https://www.foodstandards.gov.au/food-standards-code"


# Key section page ranges (approximate from ToC)
KEY_SECTIONS = [
    {
        "name": "Standard 1.2.7 — Nutrition, health and related claims",
        "type": "claims_rule",
        "search_start": "Standard 1.2.7",
        "search_end": "Standard 1.2.8",
    },
    {
        "name": "Schedule 4 — Nutrition, health and related claims",
        "type": "claims_rule",
        "search_start": "Schedule 4",
        "search_end": "Schedule 5",
    },
    {
        "name": "Schedule 15 — Substances that may be used as food additives",
        "type": "ingredient_regulation",
        "search_start": "Schedule 15",
        "search_end": "Schedule 16",
    },
    {
        "name": "Schedule 9 — Mandatory advisory statements and declarations",
        "type": "labelling_requirement",
        "search_start": "Schedule 9",
        "search_end": "Schedule 10",
    },
    {
        "name": "Standard 1.2.3 — Warning statements, advisory statements",
        "type": "labelling_requirement",
        "search_start": "Standard 1.2.3",
        "search_end": "Standard 1.2.4",
    },
    {
        "name": "Standard 1.2.1 — Requirements to have labels",
        "type": "labelling_requirement",
        "search_start": "Standard 1.2.1",
        "search_end": "Standard 1.2.2",
    },
    {
        "name": "Standard 1.2.4 — Statement of ingredients",
        "type": "labelling_requirement",
        "search_start": "Standard 1.2.4",
        "search_end": "Standard 1.2.5",
    },
    {
        "name": "Schedule 23 — Prohibited plants and fungi",
        "type": "ingredient_regulation",
        "search_start": "Schedule 23",
        "search_end": "Schedule 24",
    },
    {
        "name": "Schedule 24 — Restricted plants and fungi",
        "type": "ingredient_regulation",
        "search_start": "Schedule 24",
        "search_end": "Schedule 25",
    },
    {
        "name": "Schedule 25 — Permitted novel foods",
        "type": "ingredient_regulation",
        "search_start": "Schedule 25",
        "search_end": "Schedule 25A",
    },
    {
        "name": "Standard 1.3.1 — Food additives",
        "type": "ingredient_regulation",
        "search_start": "Standard 1.3.1",
        "search_end": "Standard 1.3.2",
    },
]


def extract_full_text(pdf_path):
    """Extract all text from PDF."""
    print(f"Reading PDF...")
    reader = PyPDF2.PdfReader(pdf_path)
    pages = []
    for page in reader.pages:
        text = (page.extract_text() or "").replace("\x00", "")
        pages.append(text)
    full = "\n\n".join(pages)
    print(f"  {len(full):,} chars from {len(pages)} pages")
    return full


def find_section(full_text, start_marker, end_marker):
    """Find a section between two markers in the full text."""
    # Find the first occurrence of the standard/schedule heading after the ToC
    # Skip ToC by looking for the heading with actual content following
    pattern_start = re.compile(
        rf"^{re.escape(start_marker)}\s+.+",
        re.MULTILINE
    )

    matches = list(pattern_start.finditer(full_text))
    if not matches:
        return None

    # Use the last substantial match (skip ToC entries which are short)
    best_start = None
    for m in matches:
        # Check if this is a real section (has substantial text after it)
        after = full_text[m.start():m.start() + 2000]
        if len(after.strip()) > 500:
            best_start = m.start()
            break

    if best_start is None and matches:
        best_start = matches[-1].start()

    if best_start is None:
        return None

    # Find end marker
    pattern_end = re.compile(
        rf"^{re.escape(end_marker)}\s+.+",
        re.MULTILINE
    )
    end_matches = list(pattern_end.finditer(full_text[best_start + 100:]))
    if end_matches:
        end_pos = best_start + 100 + end_matches[0].start()
    else:
        end_pos = min(best_start + 200000, len(full_text))

    section_text = full_text[best_start:end_pos]
    return section_text


def call_claude(content, section_name, extraction_type):
    """Call Claude for structured extraction."""
    prompts = {
        "ingredient_regulation": f"""Extract ALL ingredient/substance regulations from this FSANZ section.

Section: {section_name}

Content:
{content[:28000]}

Return JSON:
{{
  "entries": [{{
    "ingredient_name": string,
    "cas_number": string | null,
    "status": "banned" | "restricted" | "permitted" | "permitted_with_limits",
    "product_categories": ["food"],
    "max_concentration_pct": number | null,
    "max_daily_dose_mg": number | null,
    "conditions": [string],
    "required_warnings": [string],
    "regulation_reference": string
  }}]
}}

Rules:
- Extract EVERY substance/ingredient mentioned with its regulatory status
- For banned/prohibited substances, set status to "banned"
- For restricted substances with conditions, set status to "restricted"
- For permitted with max levels, set status to "permitted_with_limits"
- Convert mg/kg to percentage (divide by 10000) for max_concentration_pct
- Include the exact section reference (e.g., "FSANZ Schedule 15 S15—5")
- Return ONLY valid JSON""",

        "claims_rule": f"""Extract ALL nutrition and health claims rules from this FSANZ section.

Section: {section_name}

Content:
{content[:28000]}

Return JSON:
{{
  "entries": [{{
    "claim_text": string (e.g., "low fat", "good source of fibre"),
    "claim_type": "nutrition" | "health",
    "status": "permitted" | "prohibited" | "conditional",
    "conditions": {{
      "nutrient": string | null,
      "operator": "<=" | ">=" | "=",
      "value": number | null,
      "unit": string | null,
      "qualifying_criteria": string | null
    }} | null,
    "product_categories": ["food"],
    "regulation_reference": string
  }}]
}}

Rules:
- Extract EVERY claim mentioned with its conditions
- For nutrition content claims (low, free, reduced, high, source, etc.): include the threshold criteria
- For health claims: include the food-health relationship and conditions
- Include qualifying criteria like "per 100g", "per serving"
- Return ONLY valid JSON""",

        "labelling_requirement": f"""Extract ALL labelling requirements from this FSANZ section.

Section: {section_name}

Content:
{content[:28000]}

Return JSON:
{{
  "entries": [{{
    "element": string,
    "mandatory": boolean,
    "product_categories": ["food"],
    "description": string,
    "format_rules": string | null,
    "exemptions": [string],
    "regulation_reference": string
  }}]
}}

Rules:
- Extract EVERY labelling requirement mentioned
- Include mandatory vs optional distinction
- Include specific format rules (font size, placement, etc.)
- Include exemptions (small packages, etc.)
- Return ONLY valid JSON""",
    }

    resp = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        },
        json={
            "model": "claude-sonnet-4-20250514",
            "max_tokens": 8000,
            "messages": [{"role": "user", "content": prompts[extraction_type]}],
        },
    )

    if resp.status_code != 200:
        print(f"  Claude API error: {resp.status_code}")
        return None

    text = next(
        (b["text"] for b in resp.json()["content"] if b["type"] == "text"), ""
    ).strip()

    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        print(f"  JSON parse error. First 200: {text[:200]}")
        return None


def store_ingredient(entry, source_id):
    # Upsert ingredient
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/ingredients",
        headers=SB_HEADERS,
        json={
            "canonical_name": entry.get("ingredient_name", "unknown"),
            "cas_number": entry.get("cas_number"),
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
    )
    ingredient_id = None
    if resp.status_code in (200, 201):
        r = resp.json()
        ingredient_id = r[0]["id"] if isinstance(r, list) and r else r.get("id")

    if not ingredient_id:
        resp2 = requests.get(
            f"{SUPABASE_URL}/rest/v1/ingredients",
            headers={k: v for k, v in SB_HEADERS.items() if k != "Prefer"},
            params={"canonical_name": f"eq.{entry['ingredient_name']}", "select": "id"},
        )
        if resp2.status_code == 200 and resp2.json():
            ingredient_id = resp2.json()[0]["id"]
    if not ingredient_id:
        return False

    requests.post(
        f"{SUPABASE_URL}/rest/v1/ingredient_regulations",
        headers=SB_HEADERS,
        json={
            "ingredient_id": ingredient_id,
            "jurisdiction": "AU_NZ",
            "regulatory_body": "FSANZ",
            "status": entry.get("status", "permitted"),
            "product_categories": entry.get("product_categories", ["food"]),
            "max_concentration_pct": entry.get("max_concentration_pct"),
            "max_daily_dose_mg": entry.get("max_daily_dose_mg"),
            "conditions": {"conditions_of_use": entry.get("conditions", [])},
            "required_warnings": entry.get("required_warnings", []),
            "regulation_reference": entry.get("regulation_reference"),
            "source_id": source_id,
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
    )
    return True


def store_claim(entry, source_id):
    requests.post(
        f"{SUPABASE_URL}/rest/v1/claims_rules",
        headers=SB_HEADERS,
        json={
            "jurisdiction": "AU_NZ",
            "regulatory_body": "FSANZ",
            "claim_text": entry.get("claim_text", "unknown"),
            "claim_type": entry.get("claim_type", "nutrition"),
            "status": entry.get("status", "permitted"),
            "product_categories": entry.get("product_categories", ["food"]),
            "conditions": entry.get("conditions"),
            "regulation_reference": entry.get("regulation_reference"),
            "source_id": source_id,
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
    )
    return True


def store_labelling(entry, source_id):
    requests.post(
        f"{SUPABASE_URL}/rest/v1/labelling_requirements",
        headers=SB_HEADERS,
        json={
            "jurisdiction": "AU_NZ",
            "regulatory_body": "FSANZ",
            "product_category": (entry.get("product_categories") or ["food"])[0],
            "element": entry.get("element", "unknown"),
            "mandatory": entry.get("mandatory", True),
            "description": entry.get("description"),
            "format_rules": entry.get("format_rules"),
            "regulation_reference": entry.get("regulation_reference"),
            "source_id": source_id,
        },
    )
    return True


def get_or_create_source(section_name):
    """Get or create a source for this section."""
    url = f"{SOURCE_URL}#{section_name.split(' — ')[0].lower().replace(' ', '-')}"
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/regulatory_sources",
        headers={k: v for k, v in SB_HEADERS.items() if k != "Prefer"},
        params={"url": f"eq.{url}", "select": "id"},
    )
    if resp.status_code == 200 and resp.json():
        return resp.json()[0]["id"]

    # Create new
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/regulatory_sources",
        headers=SB_HEADERS,
        json={
            "url": url,
            "title": f"FSANZ {section_name}",
            "domain": "www.foodstandards.gov.au",
            "regulatory_body": "FSANZ",
            "jurisdiction": "AU_NZ",
            "content_type": "pdf",
            "ingestion_tier": "manual_upload",
            "scrape_status": "structured",
        },
    )
    if resp.status_code in (200, 201):
        r = resp.json()
        return r[0]["id"] if isinstance(r, list) and r else r.get("id")
    return None


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 structure-key-sections.py <path-to-pdf>")
        sys.exit(1)

    pdf_path = sys.argv[1]
    full_text = extract_full_text(pdf_path)

    stats = {"ingredients": 0, "claims": 0, "labelling": 0}

    for section in KEY_SECTIONS:
        print(f"\n{'='*60}")
        print(f"Section: {section['name']}")
        print(f"Type: {section['type']}")

        text = find_section(full_text, section["search_start"], section["search_end"])
        if not text or len(text) < 200:
            print(f"  Section not found or too short ({len(text) if text else 0} chars)")
            continue

        print(f"  Found: {len(text):,} chars")

        source_id = get_or_create_source(section["name"])
        if not source_id:
            print(f"  Failed to get/create source")
            continue

        # For large sections, process in chunks
        chunk_size = 28000
        chunks = []
        if len(text) > chunk_size:
            for i in range(0, len(text), chunk_size - 2000):
                chunks.append(text[i:i + chunk_size])
        else:
            chunks = [text]

        print(f"  Processing in {len(chunks)} chunk(s)...")

        for ci, chunk in enumerate(chunks):
            print(f"  Chunk {ci+1}/{len(chunks)} ({len(chunk):,} chars)")
            result = call_claude(chunk, section["name"], section["type"])

            if not result or not result.get("entries"):
                print(f"    No entries")
                continue

            entries = result["entries"]
            print(f"    Extracted {len(entries)} entries")

            stored = 0
            for entry in entries:
                if section["type"] == "ingredient_regulation":
                    if store_ingredient(entry, source_id):
                        stored += 1
                        stats["ingredients"] += 1
                elif section["type"] == "claims_rule":
                    if store_claim(entry, source_id):
                        stored += 1
                        stats["claims"] += 1
                elif section["type"] == "labelling_requirement":
                    if store_labelling(entry, source_id):
                        stored += 1
                        stats["labelling"] += 1

            print(f"    Stored: {stored}/{len(entries)}")
            time.sleep(1)

    print(f"\n{'='*60}")
    print(f"DONE")
    print(f"Ingredients: {stats['ingredients']}")
    print(f"Claims: {stats['claims']}")
    print(f"Labelling: {stats['labelling']}")


if __name__ == "__main__":
    main()
