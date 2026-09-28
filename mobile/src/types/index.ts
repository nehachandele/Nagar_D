export type ComplaintCategory =
  | 'Pothole'
  | 'Garbage'
  | 'Road Damage'
  | 'Water Leakage'
  | 'Broken Streetlight'
  | 'Encroachment'
  | 'Other';

export type ComplaintSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ComplaintStatus =
  | 'reported'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'rejected'
  | 'withdrawn';

export interface StatusHistoryItem {
  id: number;
  previous_status?: string;
  new_status: string;
  changed_by_id?: number;
  comment?: string;
  created_at: string;
}

export interface Complaint {
  id: number;
  title: string;
  description?: string;
  category: ComplaintCategory;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  image_url?: string;
  latitude: number;
  longitude: number;
  address?: string;
  citizen_id: number;
  department_id?: number;
  ai_category?: string;
  ai_confidence?: number;
  is_ai_verified?: boolean;
  duplicate_of_id?: number;
  duplicate_score?: number;
  is_potential_duplicate?: boolean;
  priority_score?: number;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  status_history?: StatusHistoryItem[];
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone_number?: string;
  role: 'citizen' | 'officer' | 'admin';
  department_id?: number;
}

export interface AIClassificationResult {
  predicted_category: ComplaintCategory;
  confidence: number;
  is_confident: boolean;
  suggested_department: string;
  estimated_severity: ComplaintSeverity;
}

export interface NearbyComplaintItem {
  complaint: Complaint;
  distance_meters: number;
}
