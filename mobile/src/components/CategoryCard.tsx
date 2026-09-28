import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { ComplaintCategory } from '../types';

interface CategoryCardProps {
  category: ComplaintCategory;
  isSelected?: boolean;
  onPress: (category: ComplaintCategory) => void;
}

const CATEGORY_ICONS: Record<ComplaintCategory, keyof typeof MaterialCommunityIcons.glyphMap> = {
  Pothole: 'road-variant',
  Garbage: 'trash-can-outline',
  'Road Damage': 'traffic-cone',
  'Water Leakage': 'water-pump',
  'Broken Streetlight': 'lightbulb-on-outline',
  Encroachment: 'home-alert-outline',
  Other: 'alert-circle-outline',
};

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, isSelected, onPress }) => {
  const icon = CATEGORY_ICONS[category] || 'alert-circle-outline';
  const accent = COLORS.category[category] || COLORS.primary;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress(category)}
      style={[
        styles.card,
        isSelected && { borderColor: accent, backgroundColor: '#F0FDF4' },
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={24}
        color={isSelected ? accent : COLORS.textSecondary}
      />
      <Text
        style={[
          styles.text,
          isSelected && { color: accent, fontWeight: '700' },
        ]}
        numberOfLines={1}
      >
        {category}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    minWidth: 100,
  },
  text: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: 6,
  },
});
