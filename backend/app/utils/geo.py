import math

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees).
    Returns distance in meters.
    """
    R = 6371000  # Radius of Earth in meters

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) *
         math.sin(delta_lambda / 2.0) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    distance = R * c
    return distance

def compute_geospatial_similarity(distance_meters: float, max_radius: float = 150.0) -> float:
    """
    Translates distance into a normalized similarity score in [0.0, 1.0].
    Points at distance 0 have score 1.0. Points >= max_radius have score 0.0.
    """
    if distance_meters <= 0:
        return 1.0
    if distance_meters >= max_radius:
        return 0.0
    return 1.0 - (distance_meters / max_radius)
