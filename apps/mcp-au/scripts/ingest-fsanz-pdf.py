#!/usr/bin/env python3
"""
Ingest FSANZ Food Standards Code PDF into Supabase.

Extracts text from the 869-page PDF, splits by Standard/Schedule sections,
stores each as a regulatory source, chunks text, and generates OpenAI embeddings.

Usage:
  export $(grep -v '^#' .env.local | xargs)
  python3 scripts/ingest-fsanz-pdf.py /path/to/Food\ Standards\ Code.pdf
"""

import sys
import os
import re
import hashlib
import json
import time
from typing import Optional

import PyPDF2
import requests

# Config
SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"].strip()
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"].strip()
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "").strip()

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

SOURCE_URL = "https://www.foodstandards.gov.au/food-standards-code"
JURISDICTION = "AU_NZ"
REGULATORY_BODY = "FSANZ"

CHUNK_WORDS = 500
OVERLAP_WORDS = 50


def extract_text(pdf_path: str) -> str:
    """Extract all text from PDF."""
    print(f"Extracting text from {pdf_path}...")
    reader = PyPDF2.PdfReader(pdf_path)
    pages = []
    total = len(reader.pages)
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        # Remove null bytes that cause Postgres errors
        text = text.replace("\x00", "")
        pages.append(text)
        if (i + 1) % 100 == 0:
            print(f"  Extracted {i+1}/{total} pages")
    full_text = "\n\n".join(pages)
    print(f"  Total: {len(full_text):,} characters from {total} pages")
    return full_text


# Pattern to split on Standard X.Y.Z or Schedule N headings
SECTION_PATTERN = re.compile(
    r"(?=^(?:Standard\s+\d+\.\d+(?:\.\d+)?[A-Z]?|Schedule\s+\d+)\s+.+)",
    re.MULTILINE,
)


def split_sections(text: str) -> list[dict]:
    """Split full text into sections by Standard/Schedule."""
    # Skip preamble (ToC, terms, etc.) - find first "Standard 1.1.1"
    start_match = re.search(r"^Standard\s+1\.1\.1\s+", text, re.MULTILINE)
    if start_match:
        text = text[start_match.start():]

    parts = SECTION_PATTERN.split(text)
    sections = []

    for part in parts:
        part = part.strip()
        if not part or len(part) < 50:
            continue

        # Extract section ID and title from first line
        first_line_match = re.match(
            r"^(Standard\s+\d+\.\d+(?:\.\d+)?[A-Z]?|Schedule\s+\d+)\s+(.+?)(?:\n|$)",
            part,
        )
        if first_line_match:
            section_id = first_line_match.group(1).strip()
            title = first_line_match.group(2).strip()
            # Clean up title - take only first line
            title = title.split("\n")[0].strip()
        else:
            continue

        sections.append({
            "section_id": section_id,
            "title": title,
            "content": part,
        })

    print(f"  Split into {len(sections)} sections")
    return sections


def chunk_text(text: str) -> list[str]:
    """Split text into overlapping word chunks."""
    words = text.split()
    if len(words) <= CHUNK_WORDS:
        return [text]

    chunks = []
    start = 0
    while start < len(words):
        end = min(start + CHUNK_WORDS, len(words))
        chunks.append(" ".join(words[start:end]))
        start = end - OVERLAP_WORDS
        if start >= len(words) - OVERLAP_WORDS:
            break
    return chunks


def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def supabase_post(table: str, data: dict) -> Optional[dict]:
    """Insert a row into Supabase."""
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers=HEADERS,
        json=data,
    )
    if resp.status_code in (200, 201):
        results = resp.json()
        return results[0] if isinstance(results, list) and results else results
    elif resp.status_code == 409:
        return None  # duplicate
    else:
        print(f"  ERROR inserting into {table}: {resp.status_code} {resp.text[:200]}")
        return None


def supabase_get(table: str, params: dict) -> list:
    """Query Supabase."""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers=HEADERS,
        params=params,
    )
    if resp.status_code == 200:
        return resp.json()
    return []


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Generate embeddings via OpenAI API."""
    resp = requests.post(
        "https://api.openai.com/v1/embeddings",
        headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": "text-embedding-3-small",
            "input": texts,
            "dimensions": 1024,
        },
    )
    if resp.status_code != 200:
        print(f"  OpenAI error: {resp.status_code} {resp.text[:200]}")
        return []
    data = resp.json()
    return [item["embedding"] for item in data["data"]]


def upsert_source(section: dict) -> Optional[str]:
    """Create or find a regulatory_sources row for this section."""
    url = f"{SOURCE_URL}#{section['section_id'].lower().replace(' ', '-')}"

    # Check if already exists
    existing = supabase_get("regulatory_sources", {
        "url": f"eq.{url}",
        "select": "id",
    })
    if existing:
        return existing[0]["id"]

    result = supabase_post("regulatory_sources", {
        "url": url,
        "title": f"FSANZ {section['section_id']} — {section['title']}",
        "domain": "www.foodstandards.gov.au",
        "regulatory_body": REGULATORY_BODY,
        "jurisdiction": JURISDICTION,
        "content_type": "pdf",
        "ingestion_tier": "manual_upload",
        "scrape_status": "structured",
        "content_text": section["content"],
        "content_hash": content_hash(section["content"]),
        "last_scraped_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    })
    if result:
        return result.get("id")
    return None


def store_embeddings(source_id: str, chunks: list[str], embeddings: list[list[float]]):
    """Store chunk embeddings in regulatory_embeddings."""
    for chunk_text_val, embedding in zip(chunks, embeddings):
        supabase_post("regulatory_embeddings", {
            "source_id": source_id,
            "chunk_text": chunk_text_val,
            "embedding": json.dumps(embedding),
        })


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 ingest-fsanz-pdf.py <path-to-pdf>")
        sys.exit(1)

    pdf_path = sys.argv[1]
    if not os.path.exists(pdf_path):
        print(f"File not found: {pdf_path}")
        sys.exit(1)

    if not OPENAI_API_KEY:
        print("WARNING: OPENAI_API_KEY not set. Will store sources but skip embeddings.")

    # Step 1: Extract text
    full_text = extract_text(pdf_path)

    # Step 2: Split into sections
    sections = split_sections(full_text)

    # Step 3: Process each section
    total_chunks = 0
    total_embedded = 0
    errors = []

    for i, section in enumerate(sections):
        sid = section["section_id"]
        print(f"[{i+1}/{len(sections)}] {sid} — {section['title'][:60]}")

        # Upsert source
        source_id = upsert_source(section)
        if not source_id:
            errors.append(f"Failed to upsert source for {sid}")
            continue

        # Chunk
        chunks = chunk_text(section["content"])
        total_chunks += len(chunks)
        print(f"  {len(chunks)} chunks, {len(section['content']):,} chars")

        # Embed
        if OPENAI_API_KEY and chunks:
            # Process in batches of 50
            for batch_start in range(0, len(chunks), 50):
                batch = chunks[batch_start:batch_start + 50]
                embeddings = embed_texts(batch)
                if embeddings:
                    store_embeddings(source_id, batch, embeddings)
                    total_embedded += len(embeddings)
                else:
                    errors.append(f"Embedding failed for {sid} batch {batch_start}")
                time.sleep(0.5)  # Rate limit

    print(f"\n=== DONE ===")
    print(f"Sections: {len(sections)}")
    print(f"Chunks: {total_chunks}")
    print(f"Embedded: {total_embedded}")
    if errors:
        print(f"Errors ({len(errors)}):")
        for e in errors:
            print(f"  - {e}")


if __name__ == "__main__":
    main()
