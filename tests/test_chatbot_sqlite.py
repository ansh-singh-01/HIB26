import os
import tempfile
import unittest
from app.services.sqlite_kb import SQLiteClinicalKB


class TestSQLiteClinicalKB(unittest.TestCase):
    def setUp(self):
        self.temp_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.temp_path = self.temp_file.name
        self.temp_file.close()
        self.kb = SQLiteClinicalKB(db_path=self.temp_path)

    def tearDown(self):
        try:
            if os.path.exists(self.temp_path):
                os.remove(self.temp_path)
        except Exception:
            pass

    def test_sqlite_kb_initialization(self):
        """Verifies that the SQLite database initializes and seeds conditions properly."""
        conditions = self.kb.get_all_conditions()
        self.assertGreaterEqual(len(conditions), 20)
        names = [c["name"] for c in conditions]
        self.assertIn("Myocardial Infarction (Heart Attack)", names)
        self.assertIn("Dengue Fever", names)
        self.assertIn("Acute Asthma Attack / Bronchospasm", names)

    def test_emergency_chest_pain_triage(self):
        """Verifies that chest pain symptoms trigger an EMERGENCY triage with immediate actions."""
        res = self.kb.match_symptoms("I have severe crushing chest pain radiating to my left arm")
        self.assertTrue(res["matched"])
        self.assertIn("Heart Attack", res["condition_name"])
        self.assertEqual(res["severity_level"], "EMERGENCY")
        self.assertEqual(res["urgency_code"], "immediate_er")
        self.assertTrue(any("108" in act for act in res["immediate_actions"]))
        self.assertGreater(len(res["recommended_steps"]), 0)
        self.assertIsNotNone(res["recommended_specialist"])

    def test_dengue_fever_triage(self):
        """Verifies that Dengue query identifies platelet/NSAID warnings in immediate actions."""
        res = self.kb.match_symptoms("Sudden high fever with headache, pain behind eyes, and severe joint pain")
        self.assertTrue(res["matched"])
        self.assertIn("Dengue", res["condition_name"])
        self.assertEqual(res["severity_level"], "HIGH")
        actions_text = " ".join(res["immediate_actions"]).lower()
        self.assertTrue("aspirin" in actions_text or "nsaid" in actions_text)
        self.assertIn("platelet", " ".join(res["recommended_steps"]).lower())

    def test_asthma_bronchospasm_triage(self):
        """Verifies that wheezing and acute breathing distress triggers upright posture and inhaler guidance."""
        res = self.kb.match_symptoms("I am wheezing and cannot catch my breath, chest feels tight")
        self.assertTrue(res["matched"])
        self.assertIn("Asthma", res["condition_name"])
        self.assertTrue(any("inhaler" in act.lower() for act in res["immediate_actions"]))

    def test_chat_history_persistence(self):
        """Verifies that user messages and assistant responses are persisted in SQLite."""
        session = "test-session-123"
        self.kb.save_message(session_id=session, role="user", content="Hello, my stomach hurts")
        self.kb.save_message(session_id=session, role="assistant", content="What part of your stomach?", structured_data={"test": 1})

        history = self.kb.get_history(session_id=session)
        self.assertEqual(len(history), 2)
        self.assertEqual(history[0]["role"], "user")
        self.assertEqual(history[0]["content"], "Hello, my stomach hurts")
        self.assertEqual(history[1]["role"], "assistant")
        self.assertEqual(history[1]["structured_data"], {"test": 1})

        self.kb.clear_history(session_id=session)
        self.assertEqual(len(self.kb.get_history(session_id=session)), 0)

    def test_unmatched_emergency_safety_net(self):
        """Verifies that unknown phrases with critical emergency words escalate safely."""
        res = self.kb.match_symptoms("Someone is unconscious and collapsed on the floor")
        self.assertEqual(res["severity_level"], "EMERGENCY")
        self.assertTrue(any("108" in act for act in res["immediate_actions"]))


if __name__ == "__main__":
    unittest.main()
