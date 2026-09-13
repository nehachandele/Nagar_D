import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';
import { ComplaintStatus } from '../types';

interface StatusBadgeProps {
  status: ComplaintStatus;
  size?: 'small' | 'medium';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'medium' }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'reported':
        return { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A', label: 'Reported' };
      case 'assigned':
        return { bg: '#DBEAFE', text: '#2563EB', border: '#BFDBFE', label: 'Assigned' };
      case 'in_progress':
        return { bg: '#EDE9FE', text: '#7C3AED', border: '#DDD6FE', label: 'In Progress' };
      case 'resolved':
        return { bg: '#D1FAE5', text: '#059669', border: '#A7F3D0', label: 'Resolved' };
      case 'rejected':
        return { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA', label: 'Rejected' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0', label: status };
    }
  };

  const style = getStatusColor();
  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: style.bg, borderColor: style.border },
        isSmall && styles.badgeSmall,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: style.text }]} />
      <Text style={[styles.label, { color: style.text }, isSmall && styles.labelSmall]}>
        {style.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelSmall: {
    fontSize: 10,
  },
});
