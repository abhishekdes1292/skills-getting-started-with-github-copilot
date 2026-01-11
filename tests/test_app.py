from fastapi.testclient import TestClient
import copy
import pytest

from src.app import app, activities

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_activities():
    """Reset the in-memory activities dict before each test"""
    original = copy.deepcopy(activities)
    yield
    activities.clear()
    activities.update(copy.deepcopy(original))


def test_get_activities():
    res = client.get("/activities")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_unsubscribe_flow():
    activity = "Chess Club"
    email = "testuser@example.com"

    # ensure not present
    assert email not in activities[activity]["participants"]

    # signup
    res = client.post(f"/activities/{activity}/signup?email={email}")
    assert res.status_code == 200
    assert f"Signed up {email}" in res.json().get("message", "")
    assert email in activities[activity]["participants"]

    # unregister
    res = client.post(f"/activities/{activity}/unregister?email={email}")
    assert res.status_code == 200
    assert f"Unregistered {email}" in res.json().get("message", "")
    assert email not in activities[activity]["participants"]


def test_signup_conflict_and_errors():
    activity = "Chess Club"
    existing = activities[activity]["participants"][0]

    # signing up someone already signed up should return 400
    res = client.post(f"/activities/{activity}/signup?email={existing}")
    assert res.status_code == 400

    # unregistering someone not signed up should return 400
    res = client.post(f"/activities/{activity}/unregister?email=not@present.com")
    assert res.status_code == 400

    # non-existing activity
    res = client.post(f"/activities/NoSuchActivity/signup?email=a@b.com")
    assert res.status_code == 404
    res = client.post(f"/activities/NoSuchActivity/unregister?email=a@b.com")
    assert res.status_code == 404
