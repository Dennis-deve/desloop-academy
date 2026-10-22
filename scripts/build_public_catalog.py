"""Produce only read-only, non-assessment metadata for the public release bundle.

The authoritative draft is still src/curriculum/master.json. This is an explicit
projection, not a copy of lesson checks or an enrolment API.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/curriculum/master.json"
DESTINATION = ROOT / "src/curriculum/public-catalog.json"
STATIC_REDIRECTS = ROOT / "public/_redirects"
AGE_BANDS = ("early", "junior", "teen", "adult")
SAFE_SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")


def project_public_catalog(source: dict) -> dict:
    courses = source["courses"]
    stages = source["stages"]
    if not isinstance(courses, list) or len(courses) != 44:
        raise ValueError("The public draft catalogue must have exactly 44 courses")
    if not isinstance(stages, list) or len(stages) != 9:
        raise ValueError("The public draft catalogue must have exactly nine stages")
    if not str(source["version"]).startswith("draft-"):
        raise ValueError("Only an explicitly draft source may be published as draft metadata")
    if len({course["slug"] for course in courses}) != 44:
        raise ValueError("Course slugs must be unique")

    projected = []
    for number, course in enumerate(courses, start=1):
        if course["number"] != number or course["id"] != f"course-{number:02}":
            raise ValueError(f"Course {number} is out of sequence")
        if not isinstance(course["slug"], str) or not SAFE_SLUG.fullmatch(course["slug"]):
            raise ValueError(f"Course {number} has an unsafe public route slug")
        if len(course["modules"]) != 4:
            raise ValueError(f"Course {number} must have four modules")
        adaptations = course["ageAdaptation"]
        if set(adaptations) != set(AGE_BANDS):
            raise ValueError(f"Course {number} is missing an age-appropriate explanation")
        projected.append(
            {
                "id": course["id"],
                "number": number,
                "slug": course["slug"],
                "title": course["title"],
                "purpose": course["purpose"],
                "stage": course["stage"],
                "guidedHours": course["guidedHours"],
                "ageAdaptation": {band: adaptations[band] for band in AGE_BANDS},
                "modules": [
                    {"title": module["title"]}
                    for module in course["modules"]
                ],
            }
        )
    next_course = 1
    for index, stage in enumerate(stages, start=1):
        if stage["number"] != index or stage["first"] != next_course or stage["last"] < next_course:
            raise ValueError("Stage ranges must be contiguous and ordered")
        next_course = stage["last"] + 1
    if next_course != 45:
        raise ValueError("Stage ranges must cover the full sequence")
    if any(
        course["stage"] != next(
            (stage["title"] for stage in stages if stage["first"] <= course["number"] <= stage["last"]),
            None,
        )
        for course in courses
    ):
        raise ValueError("A course is assigned to the wrong stage")
    return {
        "version": source["version"],
        "reviewStatus": "unreviewed-draft",
        "stages": [
            {key: stage[key] for key in ("number", "title", "subtitle", "first", "last")}
            for stage in stages
        ],
        "courses": projected,
    }


def static_redirects(projected: dict) -> str:
    """Exact informational SPA paths only; never make a static host serve fake routes.

    The private /pilot needs the real Fastify API, not a static-site rewrite.
    Fastify independently validates course slugs in server/src/public-routes.ts.
    """
    public_paths = ["/", "/courses", "/how-it-works", "/availability"]
    public_paths.extend(f"/courses/{course['slug']}" for course in projected["courses"])
    return (
        "# Exact public guide routes only. No wildcard fake workspace or private pilot fallback.\n"
        + "\n".join(f"{path} /index.html 200" for path in public_paths)
        + "\n"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="fail if the committed projection is stale")
    args = parser.parse_args()
    projected = project_public_catalog(json.loads(SOURCE.read_text()))
    text = json.dumps(projected, ensure_ascii=False, indent=2) + "\n"
    redirects = static_redirects(projected)
    if args.check:
        if (
            not DESTINATION.exists() or DESTINATION.read_text() != text
            or not STATIC_REDIRECTS.exists() or STATIC_REDIRECTS.read_text() != redirects
        ):
            print("Public catalogue or static redirects are stale. Run python3 scripts/build_public_catalog.py")
            return 1
        print("Public catalogue and exact static redirects match the draft source")
        return 0
    DESTINATION.write_text(text)
    STATIC_REDIRECTS.write_text(redirects)
    print(f"Wrote {DESTINATION.relative_to(ROOT)} and {STATIC_REDIRECTS.relative_to(ROOT)} with 44 ordered draft course outlines")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
