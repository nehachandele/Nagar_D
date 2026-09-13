import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { complaintService } from '../api/client';
import { NearbyComplaintItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface NearbyIssuesScreenProps {
  navigation: any;
}

export const NearbyIssuesScreen: React.FC<NearbyIssuesScreenProps> = ({ navigation }) => {
  const [nearby, setNearby] = useState<NearbyComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [radius, setRadius] = useState<number>(1000); // 1 km radius default

  const loadNearby = async () => {
    try {
      setLoading(true);
      let lat = 18.5204;
      let lng = 73.8567;

      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
      } catch {}

      const data = await complaintService.getNearby(lat, lng, radius);
      setNearby(data);
    } catch (err) {
      console.log('Error fetching nearby complaints:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNearby();
  }, [radius]);

  return (
    <View style={styles.container}>
      {/* Header Info */}
      <View style={styles.headerBox}>
        <View>
          <Text style={styles.title}>Nearby Civic Defect Feed</Text>
          <Text style={styles.subtitle}>
            Issues reported within {(radius / 1000).toFixed(1)} km radius of your location
          </Text>
        </View>

        {/* Radius Filter Pills */}
        <View style={styles.radiusRow}>
          {[500, 1000, 3000].map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setRadius(r)}
              style={[styles.radiusPill, radius === r && styles.radiusPillActive]}
            >
              <Text
                style={[
                  styles.radiusPillText,
                  radius === r && styles.radiusPillTextActive,
                ]}
              >
                {r < 1000 ? `${r}m` : `${r / 1000}km`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Scanning PostGIS spatial index...</Text>
        </View>
      ) : nearby.length === 0 ? (
        <View style={styles.centerBox}>
          <MaterialCommunityIcons name="shield-check-outline" size={60} color={COLORS.primary} />
          <Text style={styles.emptyTitle}>Clear Vicinity!</Text>
          <Text style={styles.emptySubtitle}>
            No active civic complaints logged within {radius} meters. Notice an issue? Report it now!
          </Text>
          <TouchableOpacity
            style={styles.reportBtn}
            onPress={() => navigation.navigate('Report')}
          >
            <Text style={styles.reportBtnText}>Report Defect Here</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={nearby}
          keyExtractor={(item) => item.complaint.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadNearby();
              }}
            />
          }
          renderItem={({ item }) => {
            const c = item.complaint;
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Tracking', { complaintId: c.id })}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.distBadge}>
                    <Ionicons name="navigate-outline" size={12} color={COLORS.secondary} />
                    <Text style={styles.distText}>{Math.round(item.distance_meters)}m away</Text>
                  </View>
                  <StatusBadge status={c.status} size="small" />
                </View>

                <Text style={styles.cardCategory}>{c.category}</Text>
                <Text style={styles.cardTitle}>{c.title}</Text>

                {c.address && (
                  <View style={styles.addressRow}>
                    <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.addressText} numberOfLines={1}>
                      {c.address}
                    </Text>
                  </View>
                )}

                <View style={styles.cardFooter}>
                  <Text style={styles.footerNote}>Tap to inspect resolution details</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerBox: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.dark,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  radiusRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  radiusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  radiusPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  radiusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  radiusPillTextActive: {
    color: '#FFF',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.dark,
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  reportBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 18,
  },
  reportBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  distBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  distText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  cardCategory: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.dark,
    marginTop: 2,
    marginBottom: 6,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  addressText: {
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
    borderTopColor: '#F8FAFC',
  },
  footerNote: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
});
