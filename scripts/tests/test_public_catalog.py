"""Release bundle data must never inherit the draft's answer keys."""

import copy
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from build_public_catalog import DESTINATION, SOURCE, STATIC_REDIRECTS, project_public_catalog, static_redirects  # noqa: E402


class PublicCatalogProjectionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = json.loads(SOURCE.read_text())

    def test_ordered_44_courses_and_no_assessment_material(self):
        projected = project_public_catalog(self.source)
        self.assertEqual([c["id"] for c in projected["courses"]], [f"course-{n:02}" for n in range(1, 45)])
        self.assertEqual(len(projected["stages"]), 9)
        self.assertTrue(all(len(c["modules"]) == 4 for c in projected["courses"]))
        self.assertEqual(
            set(projected["courses"][0]),
            {"id", "number", "slug", "title", "purpose", "stage", "guidedHours", "ageAdaptation", "modules"},
        )
        self.assertEqual(set(projected["courses"][0]["modules"][0]), {"title"})
        # Do not inspect strings for ordinary words: forbid sensitive fields at every JSON depth.
        def keys(value):
            if isinstance(value, dict):
                return set(value).union(*(keys(v) for v in value.values()))
            if isinstance(value, list):
                return set().union(*(keys(v) for v in value))
            return set()
        self.assertFalse(keys(projected) & {"correct", "check", "quiz", "answerIndex", "explanation", "workedExample", "independentPractice", "password"})
        serialized = json.dumps(projected, ensure_ascii=False)
        for course in self.source["courses"]:
            for module in course["modules"]:
                for lesson in module["lessons"]:
                    check = lesson["check"]
                    for text in [check["question"], check["explanation"], *check["options"]]:
                        if len(text) >= 30:
                            self.assertNotIn(text, serialized, f"Assessment material appears in {course['id']}")
        self.assertEqual(projected, json.loads(DESTINATION.read_text()))

    def test_rejects_sequence_and_stage_corruption(self):
        broken = copy.deepcopy(self.source)
        broken["courses"][1]["number"] = 9
        with self.assertRaisesRegex(ValueError, "out of sequence"):
            project_public_catalog(broken)
        broken = copy.deepcopy(self.source)
        broken["stages"][1]["first"] = 99
        with self.assertRaisesRegex(ValueError, "contiguous"):
            project_public_catalog(broken)
        broken = copy.deepcopy(self.source)
        broken["courses"][1]["modules"].pop()
        with self.assertRaisesRegex(ValueError, "four modules"):
            project_public_catalog(broken)
        broken = copy.deepcopy(self.source)
        broken["courses"][1]["slug"] = "../demo"
        with self.assertRaisesRegex(ValueError, "unsafe public route slug"):
            project_public_catalog(broken)

    def test_static_rewrites_only_cover_real_public_routes(self):
        projected = project_public_catalog(self.source)
        lines = [line for line in static_redirects(projected).splitlines() if not line.startswith("#")]
        self.assertEqual(len(lines), 48)  # four public pages plus 44 exact course URLs
        self.assertIn("/courses/getting-started-with-learning-and-digital-confidence /index.html 200", lines)
        self.assertNotIn("/* /index.html 200", lines)
        self.assertFalse(any(line.startswith("/pilot") or line.startswith("/demo") for line in lines))
        self.assertEqual(static_redirects(projected), STATIC_REDIRECTS.read_text())

    def test_source_answer_field_change_does_not_change_public_projection(self):
        changed = copy.deepcopy(self.source)
        changed["courses"][0]["modules"][0]["lessons"][0]["check"]["correct"] = 17
        self.assertEqual(project_public_catalog(changed), project_public_catalog(self.source))


if __name__ == "__main__":
    unittest.main()
