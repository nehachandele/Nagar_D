import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

interface AIConfidenceMeterProps {
  predictedCategory: string;
  confidence: number;
  isConfident?: boolean;
}

export const AIConfidenceMeter: React.FC<AIConfidenceMeterProps> = ({
  predictedCategory,
  confidence,
  isConfident = true,
}) => {
  const percentage = Math.round(confidence * 100);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <MaterialCommunityIcons name="robot" size={18} color={COLORS.aiAccent} />
          <Text style={styles.badgeText}>AI Vision Auto-Classification</Text>
        </View>
        <Text style={styles.confidenceScore}>{percentage}% Confident</Text>
      </View>

      <View style={styles.resultRow}>
        <Text style={styles.categoryTitle}>{predictedCategory}</Text>
        <Text style={styles.verificationNote}>
          {isConfident ? '✓ High confidence match' : '⚠ Moderate match - check below'}
        </Text>
      </View>

      {/* Progress meter bar */}
      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${percentage}%`,
              backgroundColor: percentage > 75 ? COLORS.primary : COLORS.status.reported,
            },
          ]}
        />
      </View>

      <Text style={styles.disclaimer}>
        * AI predictions assist routing. You can manually adjust the category anytime.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.aiLight,
    borderColor: '#C7D2FE',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.aiAccent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  confidenceScore: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.aiAccent,
  },
  resultRow: {
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.dark,
  },
  verificationNote: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E0E7FF',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  disclaimer: {
    fontSize: 11,
    color: '#6366F1',
    fontStyle: 'italic',
    marginTop: 4,
  },
});
