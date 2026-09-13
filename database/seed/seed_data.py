import sys
import os

# Add backend directory to sys.path so it can import app modules cleanly
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database import SessionLocal, engine, Base
from app.models.department import Department
from app.models.user import User
from app.models.complaint import Complaint
from app.models.audit_log import ComplaintStatusHistory
from app.services.auth_service import get_password_hash

def seed_database():
    print("🌱 Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(Department).first():
            print("Database already contains data. Skipping department creation.")
        else:
            print("Inserting default Municipal Departments...")
            departments = [
                Department(name="Road Infrastructure", code="ROADS", description="Maintenance of city roads, potholes, pavements, and dividers.", contact_email="roads@nagardrishti.gov.in"),
                Department(name="Solid Waste Management", code="WASTE", description="Garbage collection, public bins, and sanitation maintenance.", contact_email="waste@nagardrishti.gov.in"),
                Department(name="Water Supply & Drainage", code="WATER", description="Clean drinking water supply, pipeline leaks, and stormwater drains.", contact_email="water@nagardrishti.gov.in"),
                Department(name="Electrical & Street Lighting", code="ELECTRICAL", description="Streetlights, transformers, and public electrical safety.", contact_email="electrical@nagardrishti.gov.in"),
                Department(name="Town Planning & Encroachment", code="PLANNING", description="Public land encroachment, illegal hoardings, and zoning.", contact_email="planning@nagardrishti.gov.in"),
            ]
            db.add_all(departments)
            db.commit()
            print("✓ 5 Municipal Departments inserted.")

        # Check users
        if not db.query(User).filter(User.email == "admin@nagardrishti.gov.in").first():
            print("Inserting default municipal accounts...")
            roads_dept = db.query(Department).filter(Department.code == "ROADS").first()
            waste_dept = db.query(Department).filter(Department.code == "WASTE").first()

            users = [
                User(
                    email="admin@nagardrishti.gov.in",
                    hashed_password=get_password_hash("Admin@123"),
                    full_name="Municipal Commissioner",
                    role="admin",
                    is_active=True
                ),
                User(
                    email="officer.roads@nagardrishti.gov.in",
                    hashed_password=get_password_hash("Officer@123"),
                    full_name="Rajesh Patil (Roads AE)",
                    role="officer",
                    department_id=roads_dept.id if roads_dept else None,
                    is_active=True
                ),
                User(
                    email="officer.waste@nagardrishti.gov.in",
                    hashed_password=get_password_hash("Officer@123"),
                    full_name="Sunita Kulkarni (Sanitation Inspector)",
                    role="officer",
                    department_id=waste_dept.id if waste_dept else None,
                    is_active=True
                ),
                User(
                    email="citizen@example.com",
                    hashed_password=get_password_hash("Citizen@123"),
                    full_name="Aarav Sharma",
                    role="citizen",
                    phone_number="+91 98230 11223",
                    is_active=True
                ),
            ]
            db.add_all(users)
            db.commit()
            print("✓ Admin, Officer, and Citizen accounts created.")

        # Check sample complaints
        if db.query(Complaint).count() == 0:
            print("Inserting sample civic complaints for immediate testing...")
            citizen = db.query(User).filter(User.role == "citizen").first()
            roads_dept = db.query(Department).filter(Department.code == "ROADS").first()
            waste_dept = db.query(Department).filter(Department.code == "WASTE").first()

            sample_complaints = [
                Complaint(
                    title="Deep pothole causing vehicle damage near Shivaji Nagar bus depot",
                    description="Severe asphalt breakage about 2 feet wide. Two-wheelers constantly skidding during evening rush hour.",
                    category="Pothole",
                    severity="high",
                    status="in_progress",
                    latitude=18.5314,
                    longitude=73.8446,
                    address="Shivaji Nagar Bus Depot, JM Road, Pune",
                    citizen_id=citizen.id,
                    department_id=roads_dept.id if roads_dept else None,
                    ai_category="Pothole",
                    ai_confidence=0.94,
                    is_ai_verified=True,
                    priority_score=82.0,
                ),
                Complaint(
                    title="Overflowing community garbage bin near FC Road chowk",
                    description="Waste spilling over onto pedestrian sidewalk for the past 3 days. Foul smell and stray animal nuisance.",
                    category="Garbage",
                    severity="medium",
                    status="assigned",
                    latitude=18.5246,
                    longitude=73.8415,
                    address="Fergusson College Road, Deccan Gymkhana, Pune",
                    citizen_id=citizen.id,
                    department_id=waste_dept.id if waste_dept else None,
                    ai_category="Garbage",
                    ai_confidence=0.91,
                    is_ai_verified=True,
                    priority_score=65.0,
                ),
                Complaint(
                    title="Broken street light cluster leaving junction dark",
                    description="3 consecutive LED poles are non-functional, causing safety issues for pedestrians at night.",
                    category="Broken Streetlight",
                    severity="medium",
                    status="reported",
                    latitude=18.5196,
                    longitude=73.8553,
                    address="Budhwar Peth Chowk, Pune",
                    citizen_id=citizen.id,
                    ai_category="Broken Streetlight",
                    ai_confidence=0.88,
                    is_ai_verified=True,
                    priority_score=52.0,
                ),
            ]
            db.add_all(sample_complaints)
            db.commit()

            # Add status history for sample complaint #1
            c1 = db.query(Complaint).first()
            if c1:
                hist1 = ComplaintStatusHistory(
                    complaint_id=c1.id,
                    previous_status=None,
                    new_status="reported",
                    comment="Citizen registered defect with photo & GPS."
                )
                hist2 = ComplaintStatusHistory(
                    complaint_id=c1.id,
                    previous_status="reported",
                    new_status="assigned",
                    comment="Dispatched to Central Road Maintenance Division."
                )
                hist3 = ComplaintStatusHistory(
                    complaint_id=c1.id,
                    previous_status="assigned",
                    new_status="in_progress",
                    comment="Repair crew dispatched with asphalt mixer."
                )
                db.add_all([hist1, hist2, hist3])
                db.commit()
            print("✓ Sample complaints and audit timeline populated.")

        print("🎉 Database seeding completed successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
