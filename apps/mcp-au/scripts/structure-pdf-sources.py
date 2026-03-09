#!/usr/bin/env python3
"""
Structure PDF sources into ingredient_regulations and claims_rules tables.

Reads content_text from regulatory_sources (PDF), sends to Claude for extraction,
stores structured data in ingredient_regulations, claims_rules, labelling_requirements.

Usage:
  export $(grep -v '^#' .env.local | xargs)
  python3 scripts/structure-pdf-sources.py
"""

import os
import sys
import json
import time
import requests

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"].strip()
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"].strip()
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"].strip()

SB_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

# Key sections to structure — titles containing these patterns
INGREDIENT_SECTIONS = [
    "Schedule 15",   # Permitted food additives
    "Schedule 16",   # Types of food additives
    "Schedule 17",   # Vitamins and minerals
    "Schedule 18",   # Processing aids
    "Schedule 19",   # Contaminant limits
    "Schedule 22",   # Foods and classes of foods
    "Schedule 23",   # Prohibited plants
    "Schedule 24",   # Restricted plants
    "Schedule 25",   # Novel foods
    "Standard 1.3.1", # Food additives
    "Standard 1.3.2", # Vitamins and minerals
    "Standard 1.4.1", # Contaminants
    "Standard 1.4.4", # Prohibited plants
    "Standard 1.5.1", # Novel foods
]

CLAIMS_SECTIONS = [
    "Standard 1.2.7",  # Nutrition, health and related claims
    "Schedule 4",      # Permitted health claims
    "Schedule 5",      # Nutrient profiling
]

LABELLING_SECTIONS = [
    "Standard 1.2.1",  # Labels
    "Standard 1.2.2",  # Food identification
    "Standard 1.2.3",  # Warning statements
    "Standard 1.2.4",  # Statement of ingredients
    "Standard 1.2.5",  # Date marking
    "Standard 1.2.6",  # Directions for use
    "Standard 1.2.8",  # Nutrition information
    "Standard 1.2.10", # Characterising ingredients
    "Schedule 9",      # Mandatory advisory statements
    "Schedule 10",     # Generic ingredient names
    "Schedule 12",     # Nutrition information panels
]


def get_pdf_sources():
    """Fetch PDF source metadata (without content) from DB."""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/regulatory_sources",
        headers=SB_HEADERS,
        params={
            "url": "like.*foodstandards.gov.au/food-standards-code*",
            "content_type": "eq.pdf",
            "content_text": "not.is.null",
            "select": "id,title,url",
            "order": "title",
            "limit": "200",
        },
    )
    return resp.json() if resp.status_code == 200 else []


def get_source_content(source_id):
    """Fetch content_text for a single source."""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/regulatory_sources",
        headers=SB_HEADERS,
        params={
            "id": f"eq.{source_id}",
            "select": "content_text",
        },
    )
    if resp.status_code == 200:
        results = resp.json()
        if results:
            return results[0].get("content_text", "")
    return ""


def classify_source(title):
    """Determine what type of structured data to extract."""
    types = []
    for pattern in INGREDIENT_SECTIONS:
        if pattern.lower() in title.lower():
            types.append("ingredient_regulation")
            break
    for pattern in CLAIMS_SECTIONS:
        if pattern.lower() in title.lower():
            types.append("claims_rule")
            break
    for pattern in LABELLING_SECTIONS:
        if pattern.lower() in title.lower():
            types.append("labelling_requirement")
            break
    return types if types else None


def call_claude(content_text, source_url, extraction_type):
    """Send content to Claude for structured extraction."""
    type_prompts = {
        "ingredient_regulation": """Extract INGREDIENT REGULATIONS as JSON:
{
  "type": "ingredient_regulation",
  "entries": [{
    "ingredient_name": string (canonical name),
    "inci_name": string | null,
    "cas_number": string | null,
    "status": "banned" | "restricted" | "permitted" | "permitted_with_limits",
    "product_categories": ["food"],
    "max_concentration_pct": number | null (maximum permitted level as percentage),
    "max_daily_dose_mg": number | null,
    "conditions": string[] (conditions of use),
    "required_warnings": string[] (any required label warnings),
    "regulation_reference": string (e.g. "FSANZ Schedule 15 Section S15-5"),
    "annex_reference": string | null
  }]
}

Focus on extracting:
- Permitted food additives with their maximum levels and conditions
- Banned or restricted substances
- Vitamins and minerals with permitted forms and limits
- Processing aids and their conditions
- Novel foods with conditions

For each substance, capture the exact maximum level if stated (as mg/kg, mg/L, or percentage).
Convert mg/kg to percentage where applicable (divide by 10000).
Include the specific Schedule/Standard section reference.""",

        "claims_rule": """Extract CLAIMS RULES as JSON:
{
  "type": "claims_rule",
  "entries": [{
    "claim_text": string (the actual claim wording, e.g. "low fat", "good source of calcium"),
    "claim_type": "nutrition" | "health" | "therapeutic" | "marketing",
    "status": "permitted" | "prohibited" | "conditional",
    "conditions": {
      "nutrient": string | null,
      "operator": "<=" | ">=" | "=",
      "value": number | null,
      "unit": string | null,
      "qualifying_criteria": string | null
    } | null,
    "product_categories": ["food"],
    "regulation_reference": string (e.g. "FSANZ Standard 1.2.7 Section 1.2.7-12")
  }]
}

Focus on extracting:
- Nutrition content claims (low fat, high fibre, sugar free, etc.) with their qualifying criteria
- Health claims (permitted claims from Schedule 4) with conditions
- General level health claims and their requirements
- High level health claims
- Prohibited/restricted claims""",

        "labelling_requirement": """Extract LABELLING REQUIREMENTS as JSON:
{
  "type": "labelling_requirement",
  "entries": [{
    "element": string (e.g. "Nutrition Information Panel", "Allergen Declaration"),
    "mandatory": boolean,
    "product_categories": ["food"],
    "description": string (what must be included),
    "format_rules": string | null (font size, placement, etc.),
    "exemptions": string[] (when this requirement doesn't apply),
    "regulation_reference": string (e.g. "FSANZ Standard 1.2.1 Section 1.2.1-5")
  }]
}

Focus on extracting:
- Mandatory labelling elements (name, ingredients, date marking, etc.)
- Warning and advisory statement requirements
- Nutrition information panel requirements
- Allergen declaration requirements
- Country of origin labelling""",
    }

    prompt = f"""You are a regulatory data extraction expert for Australia/New Zealand food law (FSANZ).

Given the following content from the FSANZ Food Standards Code, extract structured data.

Source: {source_url}

Content (truncated to 28000 chars):
{content_text[:28000]}

{type_prompts[extraction_type]}

IMPORTANT:
- Only extract data explicitly stated in the content
- Include specific regulation references (Standard X.Y.Z Section X.Y.Z-N)
- If no relevant data can be extracted, return {{"type": "{extraction_type}", "entries": []}}
- Return ONLY valid JSON, no markdown fences or commentary
- Extract as many entries as possible from the content"""

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
            "messages": [{"role": "user", "content": prompt}],
        },
    )

    if resp.status_code != 200:
        print(f"  Claude API error: {resp.status_code} {resp.text[:200]}")
        return None

    data = resp.json()
    text_block = next((b for b in data["content"] if b["type"] == "text"), None)
    if not text_block:
        return None

    text = text_block["text"].strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        print(f"  JSON parse error: {e}")
        print(f"  First 200 chars: {text[:200]}")
        return None


def store_ingredient(entry, source_id, jurisdiction="AU_NZ"):
    """Store an ingredient regulation entry."""
    # First upsert ingredient
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/ingredients",
        headers={**SB_HEADERS, "Prefer": "return=representation,resolution=merge-duplicates"},
        json={
            "canonical_name": entry.get("ingredient_name", "unknown"),
            "inci_name": entry.get("inci_name"),
            "cas_number": entry.get("cas_number"),
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
    )

    ingredient_id = None
    if resp.status_code in (200, 201):
        result = resp.json()
        if isinstance(result, list) and result:
            ingredient_id = result[0].get("id")
        elif isinstance(result, dict):
            ingredient_id = result.get("id")

    if not ingredient_id:
        # Try to find existing
        resp2 = requests.get(
            f"{SUPABASE_URL}/rest/v1/ingredients",
            headers=SB_HEADERS,
            params={"canonical_name": f"eq.{entry.get('ingredient_name', 'unknown')}", "select": "id"},
        )
        if resp2.status_code == 200:
            results = resp2.json()
            if results:
                ingredient_id = results[0]["id"]

    if not ingredient_id:
        return False

    # Upsert regulation
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/ingredient_regulations",
        headers={**SB_HEADERS, "Prefer": "return=representation,resolution=merge-duplicates"},
        json={
            "ingredient_id": ingredient_id,
            "jurisdiction": jurisdiction,
            "regulatory_body": "FSANZ",
            "status": entry.get("status", "permitted"),
            "product_categories": entry.get("product_categories", ["food"]),
            "max_concentration_pct": entry.get("max_concentration_pct"),
            "max_daily_dose_mg": entry.get("max_daily_dose_mg"),
            "conditions": {
                "conditions_of_use": entry.get("conditions", []),
            },
            "required_warnings": entry.get("required_warnings", []),
            "regulation_reference": entry.get("regulation_reference"),
            "annex_reference": entry.get("annex_reference"),
            "source_id": source_id,
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
    )
    return resp.status_code in (200, 201)


def store_claim(entry, source_id, jurisdiction="AU_NZ"):
    """Store a claims rule entry."""
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/claims_rules",
        headers={**SB_HEADERS, "Prefer": "return=representation,resolution=merge-duplicates"},
        json={
            "jurisdiction": jurisdiction,
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
    return resp.status_code in (200, 201)


def store_labelling(entry, source_id, jurisdiction="AU_NZ"):
    """Store a labelling requirement entry."""
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/labelling_requirements",
        headers={**SB_HEADERS, "Prefer": "return=representation,resolution=merge-duplicates"},
        json={
            "jurisdiction": jurisdiction,
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
    return resp.status_code in (200, 201)


def mark_structured(source_id, structured_data):
    """Mark a source as structured."""
    requests.patch(
        f"{SUPABASE_URL}/rest/v1/regulatory_sources",
        headers=SB_HEADERS,
        params={"id": f"eq.{source_id}"},
        json={
            "structured_data": structured_data,
            "scrape_status": "structured",
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
    )


def main():
    sources = get_pdf_sources()
    print(f"Found {len(sources)} PDF sources with content")

    # Filter to relevant sources (by title only, content fetched lazily)
    relevant = []
    for s in sources:
        types = classify_source(s["title"])
        if types:
            relevant.append((s, types))

    print(f"Relevant sources for structuring: {len(relevant)}")

    stats = {"ingredients": 0, "claims": 0, "labelling": 0, "errors": 0, "sources_processed": 0}

    for src, extraction_types in relevant:
        title_short = src["title"][:80]
        print(f"\n[{stats['sources_processed']+1}/{len(relevant)}] {title_short}")

        # Fetch content lazily
        content_text = get_source_content(src["id"])
        content_len = len(content_text)
        print(f"  Content: {content_len:,} chars | Types: {extraction_types}")
        src["content_text"] = content_text

        if content_len < 200:
            print("  Skipping (too short)")
            continue

        all_structured = {}

        for ext_type in extraction_types:
            print(f"  Extracting: {ext_type}...")
            result = call_claude(src["content_text"], src["url"], ext_type)

            if not result or not result.get("entries"):
                print(f"    No entries extracted")
                continue

            entries = result["entries"]
            print(f"    Got {len(entries)} entries")
            all_structured[ext_type] = entries

            stored = 0
            for entry in entries:
                if ext_type == "ingredient_regulation":
                    if store_ingredient(entry, src["id"]):
                        stored += 1
                        stats["ingredients"] += 1
                elif ext_type == "claims_rule":
                    if store_claim(entry, src["id"]):
                        stored += 1
                        stats["claims"] += 1
                elif ext_type == "labelling_requirement":
                    if store_labelling(entry, src["id"]):
                        stored += 1
                        stats["labelling"] += 1

            print(f"    Stored: {stored}/{len(entries)}")

            # Rate limit between Claude calls
            time.sleep(1)

        if all_structured:
            mark_structured(src["id"], all_structured)

        stats["sources_processed"] += 1

    print(f"\n=== DONE ===")
    print(f"Sources processed: {stats['sources_processed']}")
    print(f"Ingredients stored: {stats['ingredients']}")
    print(f"Claims stored: {stats['claims']}")
    print(f"Labelling stored: {stats['labelling']}")
    print(f"Errors: {stats['errors']}")


if __name__ == "__main__":
    main()
