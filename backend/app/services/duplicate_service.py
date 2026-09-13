from typing import Optional, Tuple, List
from sqlalchemy.orm import Session
from app.models.complaint import Complaint
from app.utils.geo import calculate_haversine_distance, compute_geospatial_similarity
from app.services.ai_service import compute_cosine_similarity
from app.config import settings

def find_potential_duplicate(
    db: Session,
    latitude: float,
    longitude: float,
    category: str,
    new_embedding: Optional[List[float]] = None,
    distance_threshold: float = settings.DUPLICATE_DISTANCE_THRESHOLD_METERS,
    score_threshold: float = settings.DUPLICATE_OVERALL_SCORE_THRESHOLD,
) -> Tuple[Optional[int], float, bool]:
    """
    Scans recent complaints within distance_threshold for the same category.
    Calculates combined multi-modal duplicate score:
      Score = 0.5 * SpatialSimilarity + 0.5 * VisualSimilarity
    Returns (duplicate_of_id, best_score, is_potential_duplicate)
    """
    # Query candidates matching category that are not resolved or rejected
    candidates = (
        db.query(Complaint)
        .filter(
            Complaint.category == category,
            Complaint.status.notin_(["resolved", "rejected"])
        )
        .all()
    )

    best_match_id = None
    highest_score = 0.0

    for candidate in candidates:
        dist = calculate_haversine_distance(latitude, longitude, candidate.latitude, candidate.longitude)
        
        # Must be in geographical vicinity
        if dist <= distance_threshold:
            geo_sim = compute_geospatial_similarity(dist, max_radius=distance_threshold)
            
            # If visual embeddings are available, calculate cosine similarity
            if new_embedding and candidate.image_embedding:
                candidate_vec = candidate.image_embedding
                if isinstance(candidate_vec, list):
                    img_sim = compute_cosine_similarity(new_embedding, candidate_vec)
                else:
                    img_sim = 0.85
            else:
                img_sim = 0.85 # Heuristic similarity when image embeddings are pending

            # Weighted combined score
            combined_score = round((0.5 * geo_sim) + (0.5 * img_sim), 3)

            if combined_score > highest_score:
                highest_score = combined_score
                best_match_id = candidate.id

    is_duplicate = highest_score >= score_threshold
    return (best_match_id if is_duplicate else None, highest_score, is_duplicate)
