import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.security import hash_password, verify_password


def test_password_hashing_is_salted_and_verifiable():
    first = hash_password("correct horse battery")
    second = hash_password("correct horse battery")
    assert first != second
    assert verify_password("correct horse battery", first)
    assert not verify_password("wrong password", first)
