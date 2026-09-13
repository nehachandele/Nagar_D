import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { complaintService } from '../api/client';
import { Complaint, ComplaintCategory } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { CategoryCard } from '../components/CategoryCard';

interface HomeScreenProps {
  navigation: any;
  user: any;
}

const CATEGORIES: ComplaintCategory[] = [
  'Pothole',
  'Garbage',
  'Road Damage',
  'Water Leakage',
  'Broken Streetlight',
  'Encroachment',
];

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation, user }) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchComplaints = async () => {
    try {
      const data = await complaintService.getMyComplaints();
      setComplaints(data);
    } catch (err) {
      console.log('Failed to fetch citizen complaints', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchComplaints();
  }, []);

  const stats = {
    total: complaints.length,
    inProgress: complaints.filter((c) => c.status === 'in_progress' || c.status === 'assigned').length,
    resolved: complaints.filter((c) => c.status === 'resolved').length,
  };

  const handleCategoryPress = (category: ComplaintCategory) => {
    navigation.navigate('Report', { preselectedCategory: category });
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.welcomeText}>Namaste, 🙏</Text>
          <Text style={styles.userName}>{user?.full_name || 'Citizen'}</Text>
        </View>
        <TouchableOpacity
          style={styles.notificationBtn}
          onPress={() => navigation.navigate('Nearby')}
        >
          <Ionicons name="location-outline" size={22} color={COLORS.dark} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Hero Report Banner */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.heroCard}
          onPress={() => navigation.navigate('Report')}
        >
          <View style={styles.heroTextContainer}>
            <View style={styles.aiTag}>
              <MaterialCommunityIcons name="robot" size={14} color="#FFF" />
              <Text style={styles.aiTagText}>YOLOv8 AI Enabled</Text>
            </View>
            <Text style={styles.heroTitle}>Report Civic Issue</Text>
            <Text style={styles.heroSubtitle}>
              Snap a picture of pothole, road defect, or garbage. GPS & AI auto-detects it!
            </Text>
            <View style={styles.reportBtn}>
              <Ionicons name="camera" size={18} color="#FFF" />
              <Text style={styles.reportBtnText}>Launch Camera & GPS</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Civic Activity Metric Cards */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricVal}>{stats.total}</Text>
            <Text style={styles.metricLabel}>Total Filed</Text>
          </View>
          <View style={[styles.metricCard, { borderColor: '#DDD6FE' }]}>
            <Text style={[styles.metricVal, { color: COLORS.status.in_progress }]}>
              {stats.inProgress}
            </Text>
            <Text style={styles.metricLabel}>In Action</Text>
          </View>
          <View style={[styles.metricCard, { borderColor: '#A7F3D0' }]}>
            <Text style={[styles.metricVal, { color: COLORS.status.resolved }]}>
              {stats.resolved}
            </Text>
            <Text style={styles.metricLabel}>Resolved</Text>
          </View>
        </View>

        {/* Quick Category Select */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Direct Issue Category</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {CATEGORIES.map((cat) => (
            <CategoryCard
              key={cat}
              category={cat}
              onPress={handleCategoryPress}
            />
          ))}
        </ScrollView>

        {/* Recent Complaints */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Recent Complaints</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Tracking')}>
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : complaints.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No Complaints Lodged</Text>
            <Text style={styles.emptyText}>
              Help keep our city clean and safe! Report any broken roads, potholes, or civic issues nearby.
            </Text>
          </View>
        ) : (
          complaints.slice(0, 5).map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              style={styles.complaintCard}
              onPress={() => navigation.navigate('Tracking', { complaintId: item.id })}
            >
              <View style={styles.cardTop}>
                <Text style={styles.complaintCategory}>{item.category}</Text>
                <StatusBadge status={item.status} size="small" />
              </View>

              <Text style={styles.complaintTitle} numberOfLines={1}>
                {item.title}
              </Text>

              {item.address && (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {item.address}
                  </Text>
                </View>
              )}

              <View style={styles.cardFooter}>
                <Text style={styles.dateText}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
                {item.ai_confidence ? (
                  <View style={styles.aiBadge}>
                    <Text style={styles.aiBadgeText}>
                      AI {Math.round(item.ai_confidence * 100)}%
                    </Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  welcomeText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  userName: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.dark,
    letterSpacing: -0.4,
  },
  notificationBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: COLORS.darkSurface,
    borderRadius: 22,
    padding: 22,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  heroTextContainer: {
    width: '100%',
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.aiAccent,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    marginBottom: 10,
  },
  aiTagText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  reportBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  reportBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  metricVal: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.dark,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.dark,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  categoryScroll: {
    marginBottom: 24,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.dark,
    marginTop: 10,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  complaintCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  complaintCategory: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  complaintTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dateText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  aiBadge: {
    backgroundColor: COLORS.aiLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.aiAccent,
  },
});
