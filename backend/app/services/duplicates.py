import math

from sqlalchemy.orm import Session

from app.models import Report

DUPLICATE_RADIUS_M = 30


def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def get_canonical_group(category: str) -> str:
    cat = category.lower().strip().rstrip("s")
    
    # Check for road / path / pavement / bridge issues
    if any(k in cat for k in ["pothole", "road", "sidewalk", "street", "pavement", "overpass", "bridge", "path", "fracture", "paving", "paved"]):
        return "road_infrastructure"
        
    # Check for garbage / waste / sanitation / litter issues
    if any(k in cat for k in ["garbage", "sanitation", "litter", "waste", "trash", "dump", "rubbish", "refuse"]):
        return "garbage_sanitation"
        
    # Check for water / drain / pipe / sewage / flood issues
    if any(k in cat for k in ["water", "leak", "drain", "pipe", "sewage", "flood", "leakage"]):
        return "water_drainage"
        
    # Check for electrical / utility / light / signal / power issues
    if any(k in cat for k in ["streetlight", "power", "cable", "wire", "signal", "light", "traffic"]):
        return "electrical_utility"
        
    return cat


def categories_match(a: str, b: str) -> bool:
    na, nb = get_canonical_group(a), get_canonical_group(b)
    if not na or not nb or na == "none" or nb == "none" or na == "-" or nb == "-":
        return False
    return na == nb


def find_duplicate_report(
    db: Session,
    *,
    category: str,
    latitude: float,
    longitude: float,
) -> dict | None:
    if latitude == 0 and longitude == 0:
        return None

    # Ignore resolved or closed reports
    candidates = (
        db.query(Report)
        .filter(Report.status.notin_(["resolved", "closed"]))
        .all()
    )

    best: tuple[Report, float] | None = None
    logged_reasons = []
    
    up_group = get_canonical_group(category)
    
    print("\n--- Duplicate Detection Evaluation ---")
    print(f"Uploaded Category: {category!r} (Normalized Group: {up_group!r})")
    print(f"Uploaded Coordinates: (lat={latitude:.6f}, lon={longitude:.6f})")
    print(f"Search Radius: {DUPLICATE_RADIUS_M} meters")
    
    for report in candidates:
        rep_group = get_canonical_group(report.issue_type)
        cat_matches = categories_match(category, report.issue_type)
        distance = haversine_meters(latitude, longitude, report.latitude, report.longitude)
        
        is_match = cat_matches and (distance <= DUPLICATE_RADIUS_M)
        match_status = "MATCH!" if is_match else "FAILED"
        
        print(f"\nEvaluating Report #{report.id} ({report.title!r}):")
        print(f"  - Status: {report.status!r}")
        print(f"  - Category: {report.issue_type!r} (Normalized Group: {rep_group!r})")
        print(f"  - Category Match: {cat_matches} (Uploaded Group {up_group!r} vs Existing Group {rep_group!r})")
        print(f"  - Coordinates: (lat={report.latitude:.6f}, lon={report.longitude:.6f})")
        print(f"  - Calculated Distance: {distance:.2f} meters")
        print(f"  - Result: {match_status}")
        
        if not is_match:
            reasons = []
            if not cat_matches:
                reasons.append(f"Category mismatch (Uploaded Group {up_group!r} vs Existing Group {rep_group!r})")
            if distance > DUPLICATE_RADIUS_M:
                reasons.append(f"Distance too far ({distance:.2f}m > {DUPLICATE_RADIUS_M}m)")
            reason_str = " and ".join(reasons)
            print(f"  - Failure Reason: {reason_str}")
            logged_reasons.append(f"Report #{report.id}: {reason_str}")
            
        if is_match and (best is None or distance < best[1]):
            best = (report, distance)

    if best:
        report, distance = best
        print(f"\nDuplicate MATCH found: Report #{report.id} at {distance:.2f} meters.")
        print("--- Duplicate Detection End ---\n")
        return {
            "duplicate_found": True,
            "report_id": report.id,
            "title": report.title,
            "distance": round(distance, 1),
            "severity": report.severity,
            "supporter_count": report.supporter_count or 0,
            "status": report.status,
        }
    else:
        print("\nNo duplicate matches found.")
        print(f"Evaluated {len(candidates)} candidates. Reasons for failures:")
        for r_reason in logged_reasons:
            print(f"  - {r_reason}")
        print("--- Duplicate Detection End ---\n")
        return None


def no_duplicate_fields() -> dict:
    return {
        "duplicate_found": False,
        "report_id": None,
        "title": None,
        "distance": None,
        "severity": None,
        "supporter_count": None,
        "status": None,
    }

