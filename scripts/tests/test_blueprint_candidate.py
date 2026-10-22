"""Source-reconciliation checks; use python3 -m unittest discover -s scripts/tests."""

import copy
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from build_blueprint_candidate import ADDITIONS, BASE, OUTPUT, candidate_for, load_json  # noqa: E402

EXPECTED_TAGS = {
    "GES_CCP": [7, 11, 17, 22, 30, 31, 33, 34],
    "CAMBRIDGE_0860": [7, 8, 9, 10, 11, 17, 18, 28, 29, 31, 34],
    "OXFORD_INTL": [12, 13, 22, 28, 29],
    "VOCATIONAL_PRO": [21, 24, 25, 27, 36, 37, 41, 42, 43, 44],
}


class BlueprintCandidateTests(unittest.TestCase):
    def setUp(self):
        self.base = load_json(BASE)
        self.overlay = load_json(ADDITIONS)
        self.candidate = candidate_for(self.base, self.overlay)

    def test_44_course_order_titles_hours_and_active_pilot_untouched(self):
        self.assertEqual(self.base["version"], "draft-1")
        self.assertEqual(self.candidate["version"], "draft-2-candidate")
        self.assertEqual(len(self.candidate["courses"]), 44)
        for old, new in zip(self.base["courses"], self.candidate["courses"]):
            self.assertEqual(old["id"], new["id"])
            self.assertEqual(old["number"], new["number"])
            self.assertEqual(old["title"], new["title"])
            self.assertEqual(old["guidedHours"], new["guidedHours"])
            self.assertEqual(old["project"], new["project"])
            for old_module, new_module in zip(old["modules"], new["modules"]):
                self.assertEqual(old_module["id"], new_module["id"])
                for old_lesson, new_lesson in zip(old_module["lessons"], new_module["lessons"]):
                    for key in old_lesson:
                        self.assertEqual(old_lesson[key], new_lesson[key])
        self.assertEqual(load_json(BASE), self.base)

    def test_exact_strategy_table_without_false_accreditation(self):
        by_code = {code: [] for code in EXPECTED_TAGS}
        for course in self.candidate["courses"]:
            for tag in course["strategyHints"]:
                by_code[tag["code"]].append(course["number"])
                self.assertFalse(tag["displayAsVerifiedAlignment"])
                self.assertEqual(tag["status"], "strategy-proposed")
                self.assertIsNone(tag["officialOutcomeCode"])
                self.assertIsNone(tag["edition"])
        self.assertEqual(by_code, EXPECTED_TAGS)
        self.assertEqual(sum(len(v) for v in by_code.values()), 34)
        self.assertTrue(all(tag["kind"] == "internal-desloop-focus" for c in self.candidate["courses"]
                            for tag in c["strategyHints"] if tag["code"] == "VOCATIONAL_PRO"))

    def test_additions_and_tool_suggestions_are_marked_unreviewed(self):
        additions = [a for c in self.candidate["courses"] for m in c["modules"] for l in m["lessons"]
                     for a in l.get("editorialAdditions", [])]
        suggestions = [l["sandboxProposal"] for c in self.candidate["courses"] for m in c["modules"]
                       for l in m["lessons"] if "sandboxProposal" in l]
        self.assertEqual(len(additions), len(self.overlay["lessonAdditions"]))
        self.assertEqual(len(suggestions), len(self.overlay["toolPlacements"]))
        self.assertTrue(all(a["status"] == "unreviewed-editorial-proposal" for a in additions))
        self.assertTrue(all(s["status"] == "engineering-proposal-not-yet-implemented" for s in suggestions))
        self.assertEqual(self.candidate["policyProposal"]["quizMinimumInclusive"], 80)
        self.assertEqual(self.candidate["policyProposal"]["projectRubricMinimumInclusive"], 70)

    def test_fails_closed_on_changed_release_or_unknown_lesson(self):
        old = copy.deepcopy(self.base)
        old["version"] = "draft-0"
        with self.assertRaises(ValueError):
            candidate_for(old, self.overlay)
        changed_hours = copy.deepcopy(self.base)
        changed_hours["courses"][0]["guidedHours"] += 1
        with self.assertRaises(ValueError):
            candidate_for(changed_hours, self.overlay)
        modified = copy.deepcopy(self.overlay)
        modified["lessonAdditions"][0]["lessonId"] = "c45-l1"
        with self.assertRaises(ValueError):
            candidate_for(self.base, modified)

    def test_output_matches_reproducible_builder(self):
        if OUTPUT.is_file():
            self.assertEqual(json.loads(OUTPUT.read_text(encoding="utf-8")), self.candidate)


if __name__ == "__main__":
    unittest.main()
