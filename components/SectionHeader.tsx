import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import theme, { px, fw } from '@/app/styles/theme';

interface SectionHeaderProps {
  title: string;
  cta?: string;
  onSeeAll?: () => void;
}

export function SectionHeader({ title, cta, onSeeAll }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {cta && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAll}>{cta}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: px(theme.spacing.lg),
    marginBottom: px(theme.spacing.md),
    marginTop: px(theme.spacing.lg),
  },
  title: {
    color: theme.colorPalette.text.primary,
    fontSize: px(theme.typography.sizes.title),
    fontWeight: fw(theme.typography.weights.bold),
  },
  seeAll: {
    color: theme.colorPalette.text.secondary,
    fontSize: px(theme.typography.sizes.caption),
    fontWeight: fw(theme.typography.weights.medium),
  },
});
