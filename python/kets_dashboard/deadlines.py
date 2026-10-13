"""Calendar-day reminders from confirmed due dates; no statutory inference."""
from datetime import date

def deadline_alerts(snapshot, within_days=7):
    if type(within_days) is not int or within_days < 0:
        raise ValueError("within_days must be a nonnegative integer")
    if snapshot["metadata"]["coverage"]["reviews"] == "missing":
        return dict(rows=[], overdue=None, today=None, upcoming=None, unknown=None)
    as_of = date.fromisoformat(snapshot["metadata"]["as_of"])
    rows = []
    for app in snapshot["application_rows"]:
        if not (app["is_reviewing"] and app["waiting"]):
            continue
        days = (date.fromisoformat(app["due_on"]) - as_of).days if app["due_on"] else None
        if days is not None and days > within_days:
            continue
        status = "unknown" if days is None else "overdue" if days < 0 else "today" if days == 0 else "upcoming"
        rows.append(dict(id=app["id"], title=app["title"], owner=app.get("owner") or "", due_on=app["due_on"],
                         days_remaining=days, status=status, next_action=app.get("next_action") or ""))
    rows.sort(key=lambda row: float("inf") if row["days_remaining"] is None else row["days_remaining"])
    return dict(rows=rows, **{key: sum(row["status"] == key for row in rows) for key in ("overdue", "today", "upcoming", "unknown")})
