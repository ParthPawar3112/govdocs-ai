"""
Tests for Smart Search & Advanced Retrieval (Phase 7).

Uses a real SQLite test database with realistic seeded documents - this is
all genuinely testable without any external dependency (no Gemini/network
needed), so unlike Phase 6, everything here is a real, non-mocked test of
actual behavior.

Run with:  python -m tests.test_search_service   (from backend/)
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ["DATABASE_URL"] = "sqlite:///./test_search_service.db"

from app.db.database import Base, SessionLocal, engine  # noqa: E402
from app.models.document import Document  # noqa: E402
from app.services import search_service  # noqa: E402


def make_document(**overrides):
    defaults = dict(
        title="Untitled",
        department="Revenue",
        original_filename="file.pdf",
        filename="stored.pdf",
        filepath="uploads/stored.pdf",
        filesize=1000,
        filetype="pdf",
        uploaded_by="officer",
        status="Pending",
        ocr_text=None,
        ai_title=None,
        ai_summary=None,
        ai_department=None,
        ai_category=None,
        ai_keywords=None,
        ai_confidence=None,
        ai_processed=False,
    )
    defaults.update(overrides)
    return Document(**defaults)


class SearchServiceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)

    def setUp(self):
        self.db = SessionLocal()
        self.db.query(Document).delete()
        self.db.commit()

        self.docs = [
            make_document(
                title="Land Record 2026",
                department="Revenue",
                original_filename="land_record.pdf",
                filename="stored-1.pdf",
                uploaded_by="officer",
                status="Pending",
                ocr_text="Government Birth Certificate issued to Parth Pawar, Kopargaon",
                ai_title="Birth Certificate",
                ai_summary="A government-issued birth certificate.",
                ai_department="Revenue",
                ai_category="Certificate",
                ai_keywords=["birth", "certificate", "kopargaon"],
                ai_confidence=92.0,
                ai_processed=True,
            ),
            make_document(
                title="Vaccination Cert",
                department="Health",
                original_filename="health_cert.pdf",
                filename="stored-2.pdf",
                uploaded_by="admin",
                status="Approved",
                filetype="pdf",
                ocr_text="Vaccination certificate for citizen, dose 2 completed",
                ai_title="Vaccination Record",
                ai_summary="Confirms two-dose vaccination.",
                ai_department="Health",
                ai_category="Medical Record",
                ai_keywords=["vaccination", "health", "medical"],
                ai_confidence=45.0,
                ai_processed=True,
            ),
            make_document(
                title="FIR Copy",
                department="Police",
                original_filename="fir.png",
                filename="stored-3.png",
                filetype="png",
                uploaded_by="officer",
                status="Rejected",
                ocr_text=None,  # not yet OCR'd
                ai_processed=False,
            ),
            make_document(
                title="Land Ownership",
                department="Revenue",
                original_filename="ownership.jpg",
                filename="stored-4.jpg",
                filetype="jpg",
                uploaded_by="admin",
                status="Pending",
                ocr_text="Certificate of Birth for citizen registered under Revenue",
                ai_title="Certificate of Birth",  # reordered words, tests fuzzy/token search
                ai_summary="Official record.",
                ai_department="Revenue",
                ai_category="Certificate",
                ai_keywords=["ownership", "land"],
                ai_confidence=78.0,
                ai_processed=True,
            ),
        ]
        for doc in self.docs:
            self.db.add(doc)
        self.db.commit()
        for doc in self.docs:
            self.db.refresh(doc)

    def tearDown(self):
        self.db.query(Document).delete()
        self.db.commit()
        self.db.close()

    # ---- Search across fields ----

    def test_search_matches_original_filename(self):
        result = search_service.search_documents(self.db, q="land_record")
        titles = [d.title for d in result["items"]]
        self.assertIn("Land Record 2026", titles)
        print("PASS: test_search_matches_original_filename")

    def test_search_matches_ocr_text(self):
        result = search_service.search_documents(self.db, q="dose 2 completed")
        titles = [d.title for d in result["items"]]
        self.assertIn("Vaccination Cert", titles)
        print("PASS: test_search_matches_ocr_text")

    def test_search_matches_ai_title_even_when_not_in_own_title(self):
        # "Birth Certificate" isn't in Document.title ("Land Record 2026")
        # but IS in ai_title - this is the exact scenario from the brief.
        result = search_service.search_documents(self.db, q="Birth Certificate")
        titles = [d.title for d in result["items"]]
        self.assertIn("Land Record 2026", titles)
        print("PASS: test_search_matches_ai_title_even_when_not_in_own_title")

    def test_search_is_case_insensitive(self):
        result = search_service.search_documents(self.db, q="BIRTH certificate")
        self.assertGreaterEqual(result["total"], 1)
        print("PASS: test_search_is_case_insensitive")

    def test_search_matches_word_order_independent(self):
        # ai_title is "Certificate of Birth" (reordered) - query is "Birth Certificate"
        result = search_service.search_documents(self.db, q="Birth Certificate")
        titles = [d.title for d in result["items"]]
        self.assertIn("Land Ownership", titles)  # has ai_title "Certificate of Birth"
        print("PASS: test_search_matches_word_order_independent")

    def test_search_matches_ai_keywords(self):
        result = search_service.search_documents(self.db, q="kopargaon")
        titles = [d.title for d in result["items"]]
        self.assertIn("Land Record 2026", titles)
        print("PASS: test_search_matches_ai_keywords")

    def test_fuzzy_fallback_catches_typo(self):
        # "brith" (typo) shouldn't match via substring SQL search, but should
        # via the fuzzy fallback.
        result = search_service.search_documents(self.db, q="brith certificate")
        self.assertTrue(result["used_fuzzy_fallback"])
        self.assertGreater(result["total"], 0)
        print("PASS: test_fuzzy_fallback_catches_typo")

    def test_no_match_returns_empty_not_error(self):
        result = search_service.search_documents(self.db, q="completely unrelated nonsense zzz")
        self.assertEqual(result["total"], 0)
        self.assertEqual(result["items"], [])
        print("PASS: test_no_match_returns_empty_not_error")

    # ---- Filters ----

    def test_filter_by_department(self):
        result = search_service.search_documents(self.db, department="Health")
        self.assertEqual(result["total"], 1)
        self.assertEqual(result["items"][0].title, "Vaccination Cert")
        print("PASS: test_filter_by_department")

    def test_filter_by_category(self):
        result = search_service.search_documents(self.db, category="Certificate")
        self.assertEqual(result["total"], 2)
        print("PASS: test_filter_by_category")

    def test_filter_by_status(self):
        result = search_service.search_documents(self.db, status="Rejected")
        self.assertEqual(result["total"], 1)
        self.assertEqual(result["items"][0].title, "FIR Copy")
        print("PASS: test_filter_by_status")

    def test_filter_by_file_type(self):
        result = search_service.search_documents(self.db, file_type="png")
        self.assertEqual(result["total"], 1)
        self.assertEqual(result["items"][0].filetype, "png")
        print("PASS: test_filter_by_file_type")

    def test_filter_by_uploaded_by(self):
        result = search_service.search_documents(self.db, uploaded_by="admin")
        self.assertEqual(result["total"], 2)
        print("PASS: test_filter_by_uploaded_by")

    def test_filter_by_ai_processed_true(self):
        result = search_service.search_documents(self.db, ai_processed=True)
        self.assertEqual(result["total"], 3)
        print("PASS: test_filter_by_ai_processed_true")

    def test_filter_by_ai_processed_false(self):
        result = search_service.search_documents(self.db, ai_processed=False)
        self.assertEqual(result["total"], 1)
        self.assertEqual(result["items"][0].title, "FIR Copy")
        print("PASS: test_filter_by_ai_processed_false")

    def test_filter_by_ocr_processed_false(self):
        result = search_service.search_documents(self.db, ocr_processed=False)
        self.assertEqual(result["total"], 1)
        self.assertEqual(result["items"][0].title, "FIR Copy")
        print("PASS: test_filter_by_ocr_processed_false")

    def test_combined_filters(self):
        # department=Revenue AND category=Certificate AND ai_processed=True
        result = search_service.search_documents(
            self.db, department="Revenue", category="Certificate", ai_processed=True
        )
        self.assertEqual(result["total"], 2)
        for doc in result["items"]:
            self.assertEqual(doc.department, "Revenue")
            self.assertEqual(doc.ai_category, "Certificate")
        print("PASS: test_combined_filters")

    # ---- Sorting ----

    def test_sort_by_confidence(self):
        result = search_service.search_documents(self.db, ai_processed=True, sort="confidence")
        confidences = [d.ai_confidence for d in result["items"]]
        self.assertEqual(confidences, sorted(confidences, reverse=True))
        print("PASS: test_sort_by_confidence")

    def test_sort_by_name(self):
        result = search_service.search_documents(self.db, sort="name")
        titles = [d.title for d in result["items"]]
        self.assertEqual(titles, sorted(titles))
        print("PASS: test_sort_by_name")

    def test_sort_oldest_vs_newest(self):
        newest = search_service.search_documents(self.db, sort="newest")
        oldest = search_service.search_documents(self.db, sort="oldest")
        self.assertEqual(newest["items"][0].id, oldest["items"][-1].id)
        print("PASS: test_sort_oldest_vs_newest")

    # ---- Pagination ----

    def test_pagination_page_size(self):
        result = search_service.search_documents(self.db, page=1, page_size=2)
        self.assertEqual(len(result["items"]), 2)
        self.assertEqual(result["total"], 4)
        self.assertEqual(result["total_pages"], 2)
        print("PASS: test_pagination_page_size")

    def test_pagination_second_page(self):
        page1 = search_service.search_documents(self.db, page=1, page_size=2, sort="name")
        page2 = search_service.search_documents(self.db, page=2, page_size=2, sort="name")
        ids_page1 = {d.id for d in page1["items"]}
        ids_page2 = {d.id for d in page2["items"]}
        self.assertEqual(len(ids_page1 & ids_page2), 0)  # no overlap
        print("PASS: test_pagination_second_page")

    # ---- Stats ----

    def test_overall_total_ignores_filters(self):
        result = search_service.search_documents(self.db, department="Health")
        self.assertEqual(result["total"], 1)  # filtered
        self.assertEqual(result["overall_total"], 4)  # unfiltered
        print("PASS: test_overall_total_ignores_filters")

    def test_ai_and_ocr_processed_counts(self):
        result = search_service.search_documents(self.db)
        self.assertEqual(result["ai_processed_count"], 3)
        self.assertEqual(result["ocr_processed_count"], 3)
        print("PASS: test_ai_and_ocr_processed_counts")


if __name__ == "__main__":
    unittest.main(verbosity=2)
