import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Pose, PoseCategory } from '@/types/models';
import { Colors } from '@/constants/theme';

const CATEGORY_KEY_MAP: Record<PoseCategory, string> = {
  'full-body': 'library.categoryFullBody',
  portraits: 'library.categoryPortraits',
  'props-objects': 'library.categoryPropsObjects',
  haircuts: 'library.categoryHaircuts',
  'natural-objects': 'library.categoryNaturalObjects',
  'museum-objects': 'library.categoryMuseumObjects',
  animals: 'library.categoryAnimals',
};

type SubjectCardProps = {
  pose: Pose;
  isFavourite: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

export const SubjectCard = React.memo(function SubjectCard({
  pose,
  isFavourite,
  onPress,
  onLongPress,
}: SubjectCardProps) {
  const { t } = useTranslation();
  const primaryCategory = pose.category[0];
  const categoryLabel = primaryCategory ? t(CATEGORY_KEY_MAP[primaryCategory]) : '';

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      accessibilityRole="button"
      accessibilityLabel={`${pose.name}, ${categoryLabel}${isFavourite ? ', favourited' : ''}`}
      accessibilityHint="Tap to view, long press for options"
    >
      <View
        style={[styles.thumbnail, { backgroundColor: pose.thumbnailFile }]}
        accessibilityLabel={`${pose.name} thumbnail`}
      >
        <Text style={styles.thumbnailText}>{pose.name}</Text>
        {isFavourite && (
          <View style={styles.heartBadge} accessibilityLabel="Favourited">
            <Text style={styles.heartIcon}>&#9829;</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {pose.name}
        </Text>
        <Text style={styles.categoryTag} numberOfLines={1}>
          {categoryLabel}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 4,
    borderRadius: 12,
    backgroundColor: '#1e1e1e',
    overflow: 'hidden',
    minHeight: 44,
  },
  thumbnail: {
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  thumbnailText: {
    color: '#ffffffcc',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  heartBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#00000066',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartIcon: {
    color: '#E74C3C',
    fontSize: 14,
  },
  info: {
    padding: 8,
    gap: 2,
  },
  name: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryTag: {
    color: '#999',
    fontSize: 10,
  },
});
