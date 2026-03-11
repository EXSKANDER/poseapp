import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Pose, PoseCategory } from '@/types/models';
import { Colors } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';

const CATEGORY_LABELS: Record<PoseCategory, string> = {
  'full-body': STRINGS.library.categoryFullBody,
  portraits: STRINGS.library.categoryPortraits,
  'props-objects': STRINGS.library.categoryPropsObjects,
  haircuts: STRINGS.library.categoryHaircuts,
  'natural-objects': STRINGS.library.categoryNaturalObjects,
  'museum-objects': STRINGS.library.categoryMuseumObjects,
  animals: STRINGS.library.categoryAnimals,
};

type SubjectCardProps = {
  pose: Pose;
  isFavourite: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

export function SubjectCard({ pose, isFavourite, onPress, onLongPress }: SubjectCardProps) {
  const primaryCategory = pose.category[0];
  const categoryLabel = primaryCategory ? CATEGORY_LABELS[primaryCategory] : '';

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
    >
      <View style={[styles.thumbnail, { backgroundColor: pose.thumbnailFile }]}>
        <Text style={styles.thumbnailText}>{pose.name}</Text>
        {isFavourite && (
          <View style={styles.heartBadge}>
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
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 4,
    borderRadius: 12,
    backgroundColor: '#1e1e1e',
    overflow: 'hidden',
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
