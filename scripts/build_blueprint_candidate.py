"""Build an UNPUBLISHED curriculum candidate from the frozen draft-1 and attached PDFs.

Usage: python3 scripts/build_blueprint_candidate.py
The source-informed additions are editorial proposals, not approved lesson scripts,
verified external standards mappings or a replacement for the active adult pilot.
The original src/curriculum/master.json is deliberately never modified.
"""

from __future__ import annotations

import copy
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "src/curriculum/master.json"
ADDITIONS = ROOT / "src/curriculum/candidates/blueprint-additions.json"
INDEX = ROOT / "src/curriculum/candidates/blueprint-course-index.json"
OUTPUT = ROOT / "src/curriculum/candidates/master-draft-2.json"
UPLOADS = ROOT.parent / "uploads"
EXTERNAL_CODES = {"GES_CCP", "CAMBRIDGE_0860", "OXFORD_INTL"}
INTERNAL_CODES = {"VOCATIONAL_PRO"}
ALLOWED_TOOLS = {
    "VISUAL", "WEB", "JAVASCRIPT", "PYTHON", "SQL", "GAME_2D", "ROBOTICS",
    "WIREFRAME", "SPREADSHEET", "DESIGN",
}


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def candidate_for(base: dict, overlay: dict) -> dict:
    index = load_json(INDEX)
    if index["source"] != overlay["sourceDocuments"]["blueprint"]:
        raise ValueError("Blueprint title/hour manifest does not match the source PDF hash")
    if base["version"] != overlay["baseVersion"] or base["version"] != "draft-1":
        raise ValueError("Source version changed; review and create an explicit new overlay")
    if overlay["candidateVersion"] == base["version"]:
        raise ValueError("Candidate cannot overwrite the active release")
    if overlay["policyDecision"]["quizMinimumInclusive"] != 80 or overlay["policyDecision"]["projectRubricMinimumInclusive"] != 70:
        raise ValueError("Policy differs from the owner's recorded decision")
    courses = base["courses"]
    if len(courses) != 44 or [course["id"] for course in courses] != [f"course-{i:02}" for i in range(1, 45)]:
        raise ValueError("All 44 required courses must remain sequential and stable")
    if len(index["courses"]) != 44 or any(
        (course["number"], course["title"], course["guidedHours"]) !=
        (expected["number"], expected["title"], expected["guidedHours"])
        for course, expected in zip(courses, index["courses"])
    ):
        raise ValueError("A course number, title or guided-hours figure differs from the supplied Blueprint")
    result = copy.deepcopy(base)
    result["version"] = overlay["candidateVersion"]
    result["status"] = "Unpublished editorial candidate; subject-expert and safeguarding review required; no official standard verified"
    result["sourceDocuments"] = overlay["sourceDocuments"]
    result["sourceVersion"] = base["version"]
    result["policyProposal"] = overlay["policyDecision"]
    result["courseStructureProposal"] = {
        "phases": overlay["courseStructure"],
        "source": overlay["courseStructureSource"],
        "status": "review-and-build; existing four lessons do not by themselves implement all nine phases",
    }

    lessons = {}
    for course in result["courses"]:
        course["version"] = result["version"]
        course["reviewStatus"] = "unreviewed-source-informed-candidate"
        course["blueprintSource"] = {
            "document": "blueprint",
            "page": 2 if course["number"] <= 11 else 3 if course["number"] <= 21 else 4 if course["number"] <= 32 else 5,
        }
        course["strategyHints"] = []
        for module in course["modules"]:
            for lesson in module["lessons"]:
                if lesson["id"] in lessons:
                    raise ValueError(f"Repeated lesson ID {lesson['id']}")
                lessons[lesson["id"]] = (course, lesson)
    seen_codes = set()
    seen_tags = set()
    for assignment in overlay["strategyTagAssignments"]:
        code = assignment["code"]
        if code in seen_codes or code not in EXTERNAL_CODES | INTERNAL_CODES:
            raise ValueError(f"Unknown or duplicated strategy tag {code}")
        seen_codes.add(code)
        correct_kind = "external-framework-hint" if code in EXTERNAL_CODES else "internal-desloop-focus"
        if assignment["kind"] != correct_kind or assignment["sourcePage"] != 3:
            raise ValueError(f"Invalid type/source for {code}")
        for number in assignment["courseNumbers"]:
            if not isinstance(number, int) or not 1 <= number <= 44 or (number, code) in seen_tags:
                raise ValueError(f"Invalid/duplicate strategy course tag: {number} {code}")
            seen_tags.add((number, code))
            result["courses"][number - 1]["strategyHints"].append({
                "code": code,
                "kind": assignment["kind"],
                "status": "strategy-proposed",
                "displayAsVerifiedAlignment": False,
                "officialOutcomeCode": None,
                "edition": None,
                "source": {"document": "strategy", "page": 3},
            })
    if seen_codes != EXTERNAL_CODES | INTERNAL_CODES:
        raise ValueError("Incomplete source strategy tag list")

    seen_additions = set()
    for addition in overlay["lessonAdditions"]:
        if addition["id"] in seen_additions:
            raise ValueError(f"Duplicate editorial addition {addition['id']}")
        seen_additions.add(addition["id"])
        lesson_id = addition["lessonId"]
        if lesson_id not in lessons or not all(addition.get(field) for field in ("concept", "guidedActivity", "assessmentEvidence")):
            raise ValueError(f"Incomplete addition for {lesson_id}")
        citation = addition["source"]
        source = overlay["sourceDocuments"].get(citation["document"])
        if not source or not citation["pages"] or not all(1 <= page <= source["pages"] for page in citation["pages"]):
            raise ValueError(f"Invalid source citation for {addition['id']}")
        _, lesson = lessons[lesson_id]
        # Never alter draft-1 explanations, checks, answers or gate. Proposals need editorial sign-off.
        lesson.setdefault("editorialAdditions", []).append({
            **{key: value for key, value in addition.items() if key != "lessonId"},
            "status": "unreviewed-editorial-proposal",
        })
    seen_tools = set()
    for placement in overlay["toolPlacements"]:
        lesson_id = placement["lessonId"]
        if lesson_id not in lessons or lesson_id in seen_tools or placement["toolKind"] not in ALLOWED_TOOLS:
            raise ValueError(f"Invalid or duplicated proposed tool placement: {lesson_id}")
        seen_tools.add(lesson_id)
        lessons[lesson_id][1]["sandboxProposal"] = {
            "toolKind": placement["toolKind"], "purpose": placement["purpose"],
            "scope": "GUIDED", "status": "engineering-proposal-not-yet-implemented",
            "provenance": "engineering inference from the two provided PDFs, not an official standards requirement",
        }

    # Source hashes are informational in the artifact; verify them if attachments remain nearby.
    for source in overlay["sourceDocuments"].values():
        local = UPLOADS / source["filename"]
        if local.is_file() and hashlib.sha256(local.read_bytes()).hexdigest() != source["sha256"]:
            raise ValueError(f"The attached source PDF changed: {source['filename']}")
    return result


def main() -> None:
    candidate = candidate_for(load_json(BASE), load_json(ADDITIONS))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(candidate, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Built {OUTPUT.relative_to(ROOT)}: 44 preserved courses, 34 proposed tags, "
          f"{sum(len(l.get('editorialAdditions', [])) for c in candidate['courses'] for m in c['modules'] for l in m['lessons'])} lesson additions")


if __name__ == "__main__":
    main()
