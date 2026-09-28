import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { complaintService } from '../api/client';
import { Complaint, ComplaintStatus, StatusHistoryItem } from '../types';
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
  const [historyItems, setHistoryItems] = useState<StatusHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Edit Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const routeComplaintId = route.params?.complaintId;

  const loadHistory = async (complaintId: number) => {
    try {
      const history = await complaintService.getHistory(complaintId);
      setHistoryItems(history || []);
    } catch {
      setHistoryItems([]);
    }
  };

  const loadComplaints = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const list = await complaintService.getMyComplaints();
      setComplaints(list);

      let target: Complaint | null = null;
      if (routeComplaintId) {
        target = list.find((c) => c.id === routeComplaintId) || null;
        if (!target) {
          try {
            target = await complaintService.getById(routeComplaintId);
          } catch {}
        }
      } else if (selectedComplaint) {
        target = list.find((c) => c.id === selectedComplaint.id) || list[0] || null;
      } else if (list.length > 0) {
        target = list[0];
      }

      setSelectedComplaint(target);
      if (target) {
        await loadHistory(target.id);
      }
    } catch (err) {
      console.log('Error loading complaints for tracking:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [routeComplaintId, selectedComplaint?.id]);

  useEffect(() => {
    loadComplaints();
  }, [routeComplaintId]);

  const handleSelectComplaint = async (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    await loadHistory(complaint.id);
  };

  const handleWithdraw = () => {
    if (!selectedComplaint) return;
    Alert.alert(
      'Withdraw Complaint',
      `Are you sure you want to withdraw Complaint #${selectedComplaint.id}? This will cancel municipal processing.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Withdraw',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await complaintService.withdrawComplaint(selectedComplaint.id);
              Alert.alert('Complaint Withdrawn', 'Your complaint has been successfully withdrawn.');
              await loadComplaints(true);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to withdraw complaint.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const openEditModal = () => {
    if (!selectedComplaint) return;
    setEditTitle(selectedComplaint.title);
    setEditDescription(selectedComplaint.description || '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedComplaint) return;
    if (!editTitle.trim()) {
      Alert.alert('Required', 'Please enter a complaint title.');
      return;
    }
    try {
      setActionLoading(true);
      const updated = await complaintService.editComplaint(selectedComplaint.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
      });
      setSelectedComplaint(updated);
      setComplaints((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setEditModalVisible(false);
      Alert.alert('Success', 'Complaint details updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update complaint.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStepState = (stepStatus: ComplaintStatus, currentStatus: ComplaintStatus) => {
    if (currentStatus === 'withdrawn') return 'withdrawn';
    if (currentStatus === 'rejected') {
      return stepStatus === 'reported' ? 'completed' : 'rejected';
    }
    const order: ComplaintStatus[] = ['reported', 'assigned', 'in_progress', 'resolved'];
    const currentIdx = order.indexOf(currentStatus);
    const stepIdx = order.indexOf(stepStatus);

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

  const canModify = selectedComplaint && (selectedComplaint.status === 'reported' || selectedComplaint.status === 'assigned');

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
                onPress={() => handleSelectComplaint(c)}
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadComplaints(true)}
              colors={[COLORS.primary]}
            />
          }
        >
          {/* Header Card */}
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.complaintId}>Complaint #{selectedComplaint.id}</Text>
                <Text style={styles.titleText}>{selectedComplaint.title}</Text>
              </View>
              <StatusBadge status={selectedComplaint.status} />
            </View>

            {selectedComplaint.description ? (
              <Text style={styles.descriptionText}>{selectedComplaint.description}</Text>
            ) : null}

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

            {/* Citizen Action Buttons (Edit & Withdraw) if active */}
            {canModify && (
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={[styles.miniBtn, styles.editBtn]}
                  onPress={openEditModal}
                  disabled={actionLoading}
                >
                  <Ionicons name="pencil" size={14} color={COLORS.primary} />
                  <Text style={styles.editBtnText}>Edit Details</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.miniBtn, styles.withdrawBtn]}
                  onPress={handleWithdraw}
                  disabled={actionLoading}
                >
                  <Ionicons name="close-circle-outline" size={14} color="#EF4444" />
                  <Text style={styles.withdrawBtnText}>Withdraw</Text>
                </TouchableOpacity>
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
                          selectedComplaint.status === 'withdrawn' && styles.timelineCircleWithdrawn,
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
                          ? 'Stage verified in municipal system.'
                          : selectedComplaint.status === 'withdrawn'
                          ? 'Processing cancelled (Withdrawn).'
                          : 'Pending municipal dispatch and inspection.'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Audit History Log */}
          {historyItems.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionHeading}>Municipal Activity & Updates ({historyItems.length})</Text>
              {historyItems.map((item, index) => (
                <View key={item.id || index} style={styles.historyRow}>
                  <View style={styles.historyDot} />
                  <View style={styles.historyBody}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyStatusText}>
                        Status: <Text style={{ fontWeight: '800' }}>{item.new_status.toUpperCase()}</Text>
                      </Text>
                      <Text style={styles.historyDate}>
                        {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    {item.comment ? (
                      <Text style={styles.historyComment}>"{item.comment}"</Text>
                    ) : (
                      <Text style={styles.historyNoComment}>Updated by municipal officer</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Edit Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Complaint Details</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.modalInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Complaint title"
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Additional details or landmark"
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveEdit}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  timelineCircleWithdrawn: {
    backgroundColor: '#9CA3AF',
  },
  descriptionText: {
    fontSize: 14,
    color: COLORS.dark,
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  miniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  editBtn: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  withdrawBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  withdrawBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  historyRow: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 6,
    marginRight: 10,
  },
  historyBody: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyStatusText: {
    fontSize: 12,
    color: COLORS.dark,
  },
  historyDate: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  historyComment: {
    fontSize: 13,
    color: COLORS.dark,
    fontStyle: 'italic',
  },
  historyNoComment: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.dark,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.dark,
    backgroundColor: '#F8FAFC',
  },
  modalTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
});

