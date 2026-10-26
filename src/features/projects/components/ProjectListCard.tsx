import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useCallback } from 'react';
import { View } from 'react-native';

import { spacing, useTheme } from '@/theme';
import { Card, Image, PriceLabel, Text } from '@/ui';
import type { ProjectSummary } from '../types';

/**
 * Full-width project row for the projects list screen.
 *
 * `ProjectCard` (the Home rail card) takes a fixed `width` and is tuned for a
 * horizontal scroller; this is the vertical-feed equivalent, matching
 * `PropertyCard`'s full-bleed-photo-then-text layout so the two lists read as
 * one family of screens rather than two different apps.
 */

const COVER_HEIGHT = 190;
const COVER_STYLE = { width: '100%', height: COVER_HEIGHT } as const;

export interface ProjectListCardProps {
  project: ProjectSummary;
  onPress: (id: string) => void;
}

function ProjectListCardComponent({ project, onPress }: ProjectListCardProps) {
  const theme = useTheme();
  const handlePress = useCallback(() => onPress(project.id), [onPress, project.id]);

  const hasRange =
    project.priceMin !== undefined && project.priceMax !== undefined && project.priceMax > project.priceMin;

  // A raised `Card` like the property cards in Search, with the photo clipped
  // to its top corners. The text used to sit straight on the page, so one
  // project's price ran into the next project's photo.
  return (
    <Card
      onPress={handlePress}
      accessibilityLabel={project.name}
      radius="xl"
      padded={false}
      className="overflow-hidden"
    >
      <View>
        {project.coverImage ? (
          <Image uri={project.coverImage} size="thumb" style={COVER_STYLE} />
        ) : (
          <View className="items-center justify-center bg-surface-muted" style={COVER_STYLE}>
            <Ionicons name="business-outline" size={28} color={theme.colors.textMuted} />
          </View>
        )}

        {project.status ? (
          <View
            className="absolute left-md top-md rounded-full px-sm py-xs"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          >
            <Text variant="overline" style={{ color: '#FFFFFF' }}>
              {project.status.toUpperCase()}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ padding: spacing.base }}>
        {project.priceMin !== undefined ? (
          <View className="flex-row items-baseline">
            <PriceLabel price={project.priceMin} variant="title3" />
            {hasRange ? (
              <Text variant="caption" tone="muted" className="ml-xs">
                onwards
              </Text>
            ) : null}
          </View>
        ) : null}

        <Text variant="bodyEmphasis" numberOfLines={1} className="mt-xs">
          {project.name}
        </Text>
        {project.builderName ? (
          <Text variant="footnote" tone="muted" numberOfLines={1}>
            by {project.builderName}
          </Text>
        ) : null}

        <View className="mt-sm flex-row items-center">
          <Ionicons name="location-outline" size={14} color={theme.colors.brand} />
          <Text variant="footnote" tone="secondary" numberOfLines={1} className="ml-xs flex-1">
            {project.locationLabel || 'Location not listed'}
          </Text>
        </View>

        {project.possession ? (
          <View className="mt-xs flex-row items-center">
            <Ionicons name="key-outline" size={14} color={theme.colors.textMuted} />
            <Text variant="footnote" tone="secondary" className="ml-xs">
              Possession {project.possession}
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

export const ProjectListCard = memo(ProjectListCardComponent);
