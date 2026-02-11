#!/usr/bin/env python3
"""
Extract film crew contact information from call sheet PDFs.
"""

import os
import re
import json
import pdfplumber
from pathlib import Path

CALL_SHEETS_DIR = Path("/Users/glendaleexpress/dev/leakedliability/CALL SHEETS")
OUTPUT_DIR = Path("/Users/glendaleexpress/dev/leakedliability/extracted_contacts")

# Common department headers found in call sheets
DEPARTMENTS = [
    "PRODUCTION", "CAMERA", "G/E", "GRIP", "ELECTRIC", "VANITIES",
    "HAIR", "MAKEUP", "WARDROBE", "ART", "SOUND", "TRANSPORTATION",
    "LOCATIONS", "CATERING", "CRAFT", "STUNTS", "VFX", "SPECIAL EFFECTS",
    "PROPS", "SET DEC", "CONSTRUCTION", "ACCOUNTING", "POST"
]

# Email regex pattern
EMAIL_PATTERN = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')

# Phone regex pattern (various formats)
PHONE_PATTERN = re.compile(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}')


def extract_production_info(text):
    """Extract production name, date, and company from the call sheet header."""
    lines = text.split('\n')
    production_info = {
        "production_name": None,
        "date": None,
        "production_company": None,
        "day_info": None
    }

    # Look for date patterns
    date_pattern = re.compile(r'(\w+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})|(\d{1,2}[/:-]\d{1,2}[/:-]\d{2,4})')
    day_pattern = re.compile(r'Day\s+\d+\s+of\s+\d+', re.IGNORECASE)

    for line in lines[:15]:  # Check first 15 lines for header info
        line = line.strip()
        if not line:
            continue

        # Look for date
        date_match = date_pattern.search(line)
        if date_match and not production_info["date"]:
            production_info["date"] = date_match.group()

        # Look for day info
        day_match = day_pattern.search(line)
        if day_match:
            production_info["day_info"] = day_match.group()

        # Look for LLC, Inc, Productions, etc. for company name
        if any(term in line for term in ['LLC', 'Inc', 'Productions', 'Entertainment', 'Studios', 'Pictures']):
            if not production_info["production_company"]:
                production_info["production_company"] = line

    return production_info


def extract_crew_from_tables(pdf_path):
    """Extract crew contact info using pdfplumber table extraction."""
    crew_members = []

    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                # Extract tables
                tables = page.extract_tables()

                for table in tables:
                    if not table:
                        continue

                    current_department = None

                    for row in table:
                        if not row:
                            continue

                        # Clean row values
                        row = [str(cell).strip() if cell else "" for cell in row]
                        row_text = " ".join(row).upper()

                        # Check if this row is a department header
                        for dept in DEPARTMENTS:
                            if dept in row_text and len(row_text) < 50:
                                current_department = dept
                                break

                        # Extract contact info from row
                        emails = EMAIL_PATTERN.findall(" ".join(row))
                        phones = PHONE_PATTERN.findall(" ".join(row))

                        if emails:
                            # This row likely has crew info
                            crew_member = {
                                "department": current_department,
                                "role": None,
                                "name": None,
                                "phone": phones[0] if phones else None,
                                "email": emails[0] if emails else None,
                                "call_time": None
                            }

                            # Try to identify role and name from row
                            for i, cell in enumerate(row):
                                cell = cell.strip()
                                if not cell or cell in emails or (phones and cell in phones):
                                    continue

                                # Check if it looks like a time
                                if re.match(r'\d{1,2}:\d{2}\s*(AM|PM|am|pm)?', cell):
                                    crew_member["call_time"] = cell
                                    continue

                                # Check if it looks like a role
                                role_keywords = ['Director', 'Producer', 'Assistant', 'Coordinator',
                                                'Gaffer', 'Grip', 'AC', 'DP', 'Mixer', 'Designer',
                                                'Operator', 'Manager', 'Supervisor', 'Lead', 'Key',
                                                'Best', 'Boom', 'Loader', 'DIT', 'Script', 'PA',
                                                'Makeup', 'Hair', 'Wardrobe', 'Stylist', 'Art',
                                                'Swing', 'Driver', 'Captain', 'Medic', 'Craft',
                                                'Caterer', 'Location', 'Scout', 'Security']

                                is_role = any(kw.lower() in cell.lower() for kw in role_keywords)

                                if is_role and not crew_member["role"]:
                                    crew_member["role"] = cell
                                elif not crew_member["name"] and len(cell) > 2 and not cell.isdigit():
                                    # Likely a name if it's not already identified
                                    if not any(kw.lower() == cell.lower() for kw in DEPARTMENTS):
                                        crew_member["name"] = cell

                            # Only add if we have at least email and some identifying info
                            if crew_member["email"] and (crew_member["name"] or crew_member["role"]):
                                crew_members.append(crew_member)

                # Also try extracting from raw text if tables didn't work well
                text = page.extract_text() or ""

                # Find all emails and try to extract surrounding context
                for match in EMAIL_PATTERN.finditer(text):
                    email = match.group()
                    # Check if we already have this email
                    if any(cm["email"] == email for cm in crew_members):
                        continue

                    # Get surrounding text
                    start = max(0, match.start() - 100)
                    end = min(len(text), match.end() + 50)
                    context = text[start:end]

                    phones_in_context = PHONE_PATTERN.findall(context)

                    crew_member = {
                        "department": None,
                        "role": None,
                        "name": None,
                        "phone": phones_in_context[0] if phones_in_context else None,
                        "email": email,
                        "call_time": None
                    }

                    # Try to extract name from context (usually before email)
                    before_email = context[:match.start() - start]
                    words = before_email.split()

                    # Look for name-like patterns (capitalized words)
                    potential_names = []
                    for word in reversed(words[-5:]):  # Check last 5 words before email
                        word = word.strip('(),')
                        if word and word[0].isupper() and not word.isdigit():
                            if not any(kw.lower() == word.lower() for kw in DEPARTMENTS):
                                potential_names.insert(0, word)
                            if len(potential_names) >= 2:
                                break

                    if potential_names:
                        crew_member["name"] = " ".join(potential_names)

                    if crew_member["email"]:
                        crew_members.append(crew_member)

    except Exception as e:
        print(f"Error processing {pdf_path}: {e}")
        return []

    # Deduplicate by email
    seen_emails = set()
    unique_crew = []
    for cm in crew_members:
        if cm["email"] and cm["email"] not in seen_emails:
            seen_emails.add(cm["email"])
            unique_crew.append(cm)

    return unique_crew


def extract_talent_info(pdf_path):
    """Extract talent/cast information from call sheet."""
    talent = []

    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()

                for table in tables:
                    if not table:
                        continue

                    # Look for talent table (usually has CHARACTER column)
                    header_row = None
                    for i, row in enumerate(table):
                        if row and any("CHARACTER" in str(cell).upper() for cell in row if cell):
                            header_row = i
                            break

                    if header_row is not None:
                        for row in table[header_row + 1:]:
                            if not row:
                                continue

                            row = [str(cell).strip() if cell else "" for cell in row]

                            # Extract talent info
                            talent_info = {
                                "character": None,
                                "talent_name": None,
                                "call_time": None
                            }

                            for cell in row:
                                if not cell:
                                    continue
                                # Check for quoted character names
                                char_match = re.search(r'"([^"]+)"', cell)
                                if char_match:
                                    talent_info["character"] = char_match.group(1)
                                elif re.match(r'\d{1,2}:\d{2}\s*(AM|PM)?', cell, re.IGNORECASE):
                                    if not talent_info["call_time"]:
                                        talent_info["call_time"] = cell
                                elif len(cell) > 2 and cell[0].isupper() and not cell.isdigit():
                                    if not talent_info["talent_name"]:
                                        talent_info["talent_name"] = cell

                            if talent_info["talent_name"] or talent_info["character"]:
                                talent.append(talent_info)

    except Exception as e:
        print(f"Error extracting talent from {pdf_path}: {e}")

    return talent


def process_call_sheet(pdf_path):
    """Process a single call sheet PDF and return extracted data."""
    result = {
        "source_file": pdf_path.name,
        "production_info": {},
        "crew": [],
        "talent": []
    }

    try:
        with pdfplumber.open(pdf_path) as pdf:
            full_text = ""
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                full_text += page_text + "\n"

        result["production_info"] = extract_production_info(full_text)

        # Try to get production name from filename if not found
        if not result["production_info"]["production_name"]:
            # Filename format: "PRODUCTION NAME" DATE.pdf
            name_match = re.match(r'"([^"]+)"', pdf_path.name)
            if name_match:
                result["production_info"]["production_name"] = name_match.group(1)

        result["crew"] = extract_crew_from_tables(pdf_path)
        result["talent"] = extract_talent_info(pdf_path)

    except Exception as e:
        print(f"Error processing {pdf_path}: {e}")
        result["error"] = str(e)

    return result


def main():
    """Process all call sheets and save extracted data."""
    OUTPUT_DIR.mkdir(exist_ok=True)

    pdf_files = list(CALL_SHEETS_DIR.glob("*.pdf"))
    total = len(pdf_files)

    print(f"Found {total} PDF files to process")

    success_count = 0
    error_count = 0

    for i, pdf_path in enumerate(pdf_files, 1):
        print(f"Processing {i}/{total}: {pdf_path.name}")

        try:
            result = process_call_sheet(pdf_path)

            # Create output filename (sanitize the PDF name)
            safe_name = re.sub(r'[^\w\s-]', '_', pdf_path.stem)
            safe_name = re.sub(r'_+', '_', safe_name).strip('_')
            output_path = OUTPUT_DIR / f"{safe_name}.json"

            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)

            crew_count = len(result.get("crew", []))
            talent_count = len(result.get("talent", []))
            print(f"  -> Extracted {crew_count} crew members, {talent_count} talent")

            success_count += 1

        except Exception as e:
            print(f"  -> ERROR: {e}")
            error_count += 1

    print(f"\nComplete! Processed {success_count} files successfully, {error_count} errors")
    print(f"Output saved to: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
