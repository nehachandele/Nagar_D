import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { complaintService } from '../api/client';
import { Complaint, ComplaintStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface TrackIssueScreenProps {
  route: any;
  navigation: any;
}

const TIMELINE_STEPS: { status: ComplaintStatus; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { status: 'reported', label: 'Reported by Citizen', icon: 'document-text-outline' },
  { status: 'assigned', label: 'Assigned to Municipal Dept', icon: 'person-add-outline' },
  { status: 'in_progress', label: 'Field Work In Progress', icon: 'construct-outline' },
  { status: 'resolved', label: 'Resolved & Closed', icon: 'checkmark-circle-outline' },
];

export const TrackIssueScreen: React.FC<TrackIssueScreenProps> = ({ route, navigation }) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);

  const routeComplaintId = route.params?.complaintId;

  useEffect(() => {
    loadComplaints();
  }, [routeComplaintId]);

  const loadComplaints = async () => {
    try {
      setLoading(true);
      const list = await complaintService.getMyComplaints();
      setComplaints(list);

      if (routeComplaintId) {
        const found = list.find((c) => c.id === routeComplaintId);
        if (found) {
          setSelectedComplaint(found);
        } else {
          // Fetch directly
          try {
            const detail = await complaintService.getById(routeComplaintId);
            setSelectedComplaint(detail);
          } catch {}
        }
      } else if (list.length > 0) {
        setSelectedComplaint(list[0]);
      }
    } catch (err) {
      console.log('Error loading complaints for tracking:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStepState = (stepStatus: ComplaintStatus, currentStatus: ComplaintStatus) => {
    const order: ComplaintStatus[] = ['reported', 'assigned', 'in_progress', 'resolved'];
    const currentIdx = order.indexOf(currentStatus);
    const stepIdx = order.indexOf(stepStatus);

    if (currentStatus === 'rejected') {
      return stepStatus === 'reported' ? 'completed' : 'rejected';
    }
    if (stepIdx <= currentIdx) return 'completed';
    return 'pending';
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Fetching civic complaint status...</Text>
      </View>
    );
  }

  if (complaints.length === 0 && !selectedComplaint) {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons name="clipboard-text-clock-outline" size={56} color={COLORS.textMuted} />
        <Text style={styles.emptyTitle}>No Active Complaints</Text>
        <Text style={styles.emptySub}>When you file a civic defect, you can track real-time municipal updates here.</Text>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('Report')}
        >
          <Text style={styles.actionBtnText}>File First Complaint</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Horizontal Complaint Selector if multiple exist */}
      {complaints.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
          {complaints.map((c) => {
            const isSelected = selectedComplaint?.id === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => setSelectedComplaint(c)}
                style={[styles.selectorChip, isSelected && styles.selectorChipActive]}
              >
                <Text style={[styles.selectorChipText, isSelected && styles.selectorChipTextActive]}>
                  #{c.id} {c.category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {selectedComplaint && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header Card */}
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.complaintId}>Complaint #{selectedComplaint.id}</Text>
                <Text style={styles.titleText}>{selectedComplaint.title}</Text>
              </View>
              <StatusBadge status={selectedComplaint.status} />
            </View>

            {selectedComplaint.image_url && (
              <Image source={{ uri: selectedComplaint.image_url }} style={styles.complaintPhoto} />
            )}

            {/* Geotag and Address */}
            <View style={styles.metaRow}>
              <Ionicons name="location-sharp" size={16} color={COLORS.primary} />
              <Text style={styles.metaText}>{selectedComplaint.address || 'Geotagged Coordinates'}</Text>
            </View>

            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.metaText}>
                Lodged on {new Date(selectedComplaint.created_at).toLocaleString()}
              </Text>
            </View>

            {/* AI Category & Confidence */}
            {selectedComplaint.ai_category && (
              <View style={styles.aiTagBox}>
                <MaterialCommunityIcons name="robot" size={16} color={COLORS.aiAccent} />
                <Text style={styles.aiTagBoxText}>
                  AI Identified: {selectedComplaint.ai_category} ({Math.round((selectedComplaint.ai_confidence || 0.9) * 100)}% Match)
                </Text>
              </View>
            )}

            {/* Potential Duplicate Banner */}
            {selectedComplaint.is_potential_duplicate && (
              <View style={styles.duplicateBox}>
                <Ionicons name="git-merge-outline" size={16} color="#B45309" />
                <Text style={styles.duplicateText}>
                  Linked with existing complaint #{selectedComplaint.duplicate_of_id} (Geospatial & Image Match {Math.round((selectedComplaint.duplicate_score || 0) * 100)}%).
                </Text>
              </View>
            )}
          </View>

          {/* Lifecycle Status Timeline */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Official Resolution Timeline</Text>
            <View style={styles.timeline}>
              {TIMELINE_STEPS.map((step, idx) => {
                const state = getStepState(step.status, selectedComplaint.status);
                const isCompleted = state === 'completed';
                const isLast = idx === TIMELINE_STEPS.length - 1;

                return (
                  <View key={step.status} style={styles.timelineItem}>
                    <View style={styles.timelineIndicatorColumn}>
                      <View
                        style={[
                          styles.timelineCircle,
                          isCompleted && styles.timelineCircleCompleted,
                        ]}
                      >
                        <Ionicons
                          name={step.icon}
                          size={16}
                          color={isCompleted ? '#FFF' : COLORS.textMuted}
                        />
                      </View>
                      {!isLast && (
                        <View
                          style={[
                            styles.timelineLine,
                            isCompleted && styles.timelineLineCompleted,
                          ]}
                        />
                      )}
                    </View>

                    <View style={styles.timelineContent}>
                      <Text
                        style={[
                          styles.timelineStepLabel,
                          isCompleted && styles.timelineStepLabelCompleted,
                        ]}
                      >
                        {step.label}
                      </Text>
                      <Text style={styles.timelineStepDesc}>
                        {isCompleted
                          ? `Stage successfully validated in system.`
                          : `Pending municipal dispatch and inspection.`}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.dark,
    marginTop: 14,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  actionBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 18,
  },
  actionBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
  selectorScroll: {
    backgroundColor: COLORS.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    maxHeight: 56,
  },
  selectorChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectorChipActive: {
    backgroundColor: COLORS.dark,
    borderColor: COLORS.dark,
  },
  selectorChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  selectorChipTextActive: {
    color: '#FFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  complaintId: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  titleText: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.dark,
    marginTop: 2,
  },
  complaintPhoto: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  aiTagBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.aiLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  aiTagBoxText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.aiAccent,
  },
  duplicateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 10,
    gap: 8,
  },
  duplicateText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 16,
  },
  timeline: {
    paddingLeft: 6,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timelineIndicatorColumn: {
    alignItems: 'center',
    width: 32,
  },
  timelineCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineCircleCompleted: {
    backgroundColor: COLORS.primary,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 28,
    backgroundColor: '#E2E8F0',
  },
  timelineLineCompleted: {
    backgroundColor: COLORS.primary,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
  },
  timelineStepLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  timelineStepLabelCompleted: {
    color: COLORS.dark,
    fontWeight: '800',
  },
  timelineStepDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
