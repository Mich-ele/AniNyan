import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { searchAnimeAdvancedWithMeta } from '../../services/scraperManager';
import { Anime } from '../../types/anime';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { PremiumAnimeCard } from '../../components/PremiumAnimeCard';
import { useHideTabBarOnScroll } from '../../hooks/useTabBarVisibility';
import {
  ANIMEWORLD_FILTER_GROUPS,
  AnimeWorldFilterGroup,
  DEFAULT_ANIMEWORLD_FILTERS,
} from '../../data/animeWorldFilters';
import { AnimeProvider, getUserPreferences } from '../../services/userPreferences';
import {
  ANIMEUNITY_FILTER_GROUPS,
  DEFAULT_ANIMEUNITY_FILTERS,
} from '../../data/animeUnityFilters';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutUp,
  LinearTransition,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const numColumns = 2;
const cardMargin = 8;
const listHorizontalPadding = 12;
const cardWidth = (width - listHorizontalPadding * 2 - cardMargin * 4) / numColumns;

const FILTER_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  genres: 'pricetags-outline',
  season: 'partly-sunny-outline',
  year: 'calendar-outline',
  type: 'albums-outline',
  status: 'pulse-outline',
  subtitles: 'chatbox-ellipses-outline',
  audio: 'volume-high-outline',
  order: 'swap-vertical-outline',
};

const EnhancedAnimeCard = ({ anime, onPress, index = 0 }: { anime: Anime; onPress: () => void; index?: number }) => (
  <PremiumAnimeCard
    anime={anime}
    onPress={onPress}
    index={index}
    width={cardWidth}
    style={styles.enhancedAnimeCard}
  />
);

const Browse = () => {
  const router = useRouter();
  const { onScroll: onTabBarScroll } = useHideTabBarOnScroll();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>(
    DEFAULT_ANIMEUNITY_FILTERS,
  );
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [optionSearch, setOptionSearch] = useState<Record<string, string>>({});
  const [studio, setStudio] = useState('');
  const [genreAndMode, setGenreAndMode] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [totalPages, setTotalPages] = useState<number | undefined>(undefined);
  const [activeProvider, setActiveProvider] = useState<AnimeProvider>('animeunity');
  const providerRef = useRef<AnimeProvider | null>(null);

  const availableFilterGroups = useMemo(
    () => activeProvider === 'animeunity'
      ? ANIMEUNITY_FILTER_GROUPS
      : ANIMEWORLD_FILTER_GROUPS,
    [activeProvider],
  );

  const filtersQuery = useMemo(() => {
    const optionsQuery = availableFilterGroups.flatMap(group => {
      const ids = selectedFilters[group.id] || [];
      return ids
        .map(id => group.options.find(o => o.id === id)?.query || '')
        .filter(Boolean);
    }).join('');
    const studioQuery = activeProvider === 'animeworld' && studio.trim()
      ? `&studio=${encodeURIComponent(studio.trim())}`
      : '';
    const genreModeQuery = activeProvider === 'animeworld' && genreAndMode ? '&genre_mode=and' : '';
    return `${optionsQuery}${studioQuery}${genreModeQuery}`;
  }, [activeProvider, availableFilterGroups, genreAndMode, selectedFilters, studio]);

  const activeFilterCount = useMemo(
    () => availableFilterGroups.reduce(
      (total, group) => total + (selectedFilters[group.id] || []).length,
      0,
    ) + (activeProvider === 'animeworld' && studio.trim() ? 1 : 0)
      + (activeProvider === 'animeworld' && genreAndMode ? 1 : 0),
    [activeProvider, availableFilterGroups, genreAndMode, selectedFilters, studio],
  );

  useFocusEffect(useCallback(() => {
    let active = true;
    const syncProvider = async () => {
      const provider = (await getUserPreferences()).animeProvider;
      if (!active) return;
      setActiveProvider(provider);
      if (providerRef.current !== provider) {
        setResults([]);
        setSelectedFilters(
          provider === 'animeunity' ? DEFAULT_ANIMEUNITY_FILTERS : DEFAULT_ANIMEWORLD_FILTERS,
        );
        setExpandedGroups({});
        setOptionSearch({});
        setStudio('');
        setGenreAndMode(false);
        setPage(1);
        setHasNext(false);
        setHasPrev(false);
        setTotalPages(undefined);
      }
      providerRef.current = provider;
    };
    void syncProvider();
    return () => {
      active = false;
    };
  }, []));

  const toggleFilterOption = (group: AnimeWorldFilterGroup, optionId: string) => {
    setSelectedFilters(prev => {
      const current = prev[group.id] || [];
      const exists = current.includes(optionId);
      if (group.multi) {
        const next = exists ? current.filter(id => id !== optionId) : [...current, optionId];
        return { ...prev, [group.id]: next };
      }
      return { ...prev, [group.id]: exists ? [] : [optionId] };
    });
  };

  const toggleGroupExpanded = (groupId: string) => {
    setExpandedGroups(prev => {
      const isCurrentlyExpanded = !!prev[groupId];
      if (isCurrentlyExpanded) {
        return {};
      }
      return { [groupId]: true };
    });
  };

  const handleResetFilters = () => {
    setSelectedFilters(
      activeProvider === 'animeunity' ? DEFAULT_ANIMEUNITY_FILTERS : DEFAULT_ANIMEWORLD_FILTERS,
    );
    setOptionSearch({});
    setStudio('');
    setGenreAndMode(false);
    setPage(1);
  };

  const handleSearch = async (targetPage: number = 1) => {
    if (!query.trim() && !filtersQuery) {
      return;
    }
    setLoading(true);
    try {
      const { items, hasNext, hasPrev, totalPages } = await searchAnimeAdvancedWithMeta(
        query,
        filtersQuery,
        targetPage,
      );

      const seen = new Set<string>();
      const unique: Anime[] = [];
      for (const anime of items) {
        if (!anime.id || seen.has(anime.id)) continue;
        seen.add(anime.id);
        unique.push(anime);
      }

      setResults(unique);
      setPage(targetPage);
      setHasNext(!!hasNext);
      setHasPrev(!!hasPrev);
      setTotalPages(totalPages);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item, index }: { item: Anime, index: number }) => (
    <EnhancedAnimeCard
      anime={item}
      index={index}
      onPress={() => router.push({ pathname: '/anime', params: { url: item.url } })}
    />
  );

  const listHeader = (
    <Animated.View entering={FadeInDown.duration(260)} style={styles.headerWrapper}>
      <View style={styles.header}>
        <View style={styles.headerMeta}>
          <Text style={styles.eyebrow}>Catalogo</Text>
          <View style={styles.providerBadge}>
            <Ionicons name="server-outline" size={12} color={theme.colorPalette.accent.primary} />
            <Text style={styles.providerBadgeText}>
              {activeProvider === 'animeunity' ? 'AnimeUnity' : 'AnimeWorld'}
            </Text>
          </View>
        </View>
        <Text style={styles.title}>Cerca un anime</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.colorPalette.text.secondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca un anime..."
            placeholderTextColor={theme.colorPalette.text.secondary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSearch(1)}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchActionButton} onPress={() => handleSearch(1)}>
            <Ionicons name="search" size={16} color="#000" />
          </TouchableOpacity>
        </View>
        {loading && (
          <Animated.View entering={FadeIn.duration(140)} exiting={FadeOut.duration(120)}>
            <ActivityIndicator
              style={styles.loadingIndicator}
              size="small"
              color={theme.colorPalette.text.primary}
            />
          </Animated.View>
        )}
      </View>
      <View style={styles.filtersSection}>
        <TouchableOpacity
          style={styles.advancedToggle}
          onPress={() => setIsAdvancedOpen(value => !value)}
          activeOpacity={0.82}
        >
          <View>
            <Text style={styles.filtersEyebrow}>CATALOGO</Text>
            <Text style={styles.advancedToggleTitle}>
              {isAdvancedOpen ? 'Nascondi filtri avanzati' : 'Filtri avanzati'}
            </Text>
          </View>
          <View style={styles.advancedToggleMeta}>
            {activeFilterCount > 0 && (
              <View style={styles.filterCountBadge}>
                <Text style={styles.filterCountText}>{activeFilterCount}</Text>
              </View>
            )}
            <Ionicons
              name={isAdvancedOpen ? 'chevron-up' : 'options-outline'}
              size={20}
              color={theme.colorPalette.accent.primary}
            />
          </View>
        </TouchableOpacity>
        {isAdvancedOpen && (
          <Animated.View
            entering={FadeInDown.duration(220)}
            exiting={FadeOutUp.duration(160)}
            layout={LinearTransition.duration(180)}
          >
        <View style={styles.filtersList}>
          {availableFilterGroups.map(group => {
            const selectedIds = selectedFilters[group.id] || [];
            const isExpanded = expandedGroups[group.id] ?? false;
            const searchValue = optionSearch[group.id] || '';
            const selectedLabels = group.options
              .filter(option => selectedIds.includes(option.id))
              .map(option => option.label);
            const summaryText = selectedLabels.length > 0
              ? selectedLabels.join(', ')
              : group.hint;
            const visibleOptions = searchValue.trim()
              ? group.options.filter(option => option.label.toLowerCase().includes(searchValue.trim().toLowerCase()))
              : group.options;
            return (
              <Animated.View
                key={group.id}
                layout={LinearTransition.duration(180)}
                style={[styles.filterGroup, isExpanded && styles.filterGroupExpanded]}
              >
                <TouchableOpacity
                  style={styles.filterGroupHeader}
                  onPress={() => toggleGroupExpanded(group.id)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.filterGroupIcon, selectedIds.length > 0 && styles.filterGroupIconActive]}>
                    <Ionicons
                      name={FILTER_ICONS[group.id]}
                      size={18}
                      color={selectedIds.length > 0 ? theme.colorPalette.accent.primary : theme.colorPalette.text.tertiary}
                    />
                  </View>
                  <View style={styles.filterGroupHeaderLeft}>
                    <Text style={styles.filterGroupLabel}>{group.label}</Text>
                    <Text
                      style={styles.filterGroupSummary}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {summaryText}
                    </Text>
                  </View>
                  {selectedIds.length > 0 && (
                    <View style={styles.selectionCount}>
                      <Text style={styles.selectionCountText}>{selectedIds.length}</Text>
                    </View>
                  )}
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={theme.colorPalette.text.secondary}
                  />
                </TouchableOpacity>
                {isExpanded && (
                  <Animated.View
                    entering={FadeInDown.duration(180)}
                    exiting={FadeOut.duration(120)}
                    style={styles.filterExpandedContent}
                  >
                    {group.options.length > 12 && (
                      <View style={styles.optionSearchContainer}>
                        <Ionicons name="search-outline" size={17} color={theme.colorPalette.text.tertiary} />
                        <TextInput
                          value={searchValue}
                          onChangeText={value => setOptionSearch(current => ({ ...current, [group.id]: value }))}
                          placeholder={`Cerca in ${group.label.toLowerCase()}...`}
                          placeholderTextColor={theme.colorPalette.text.tertiary}
                          style={styles.optionSearchInput}
                        />
                      </View>
                    )}
                    {group.id === 'genres' && activeProvider === 'animeworld' && (
                      <TouchableOpacity
                        style={[styles.genreModeRow, genreAndMode && styles.genreModeRowActive]}
                        onPress={() => setGenreAndMode(value => !value)}
                      >
                        <View>
                          <Text style={styles.genreModeTitle}>Combina tutti i generi</Text>
                          <Text style={styles.genreModeHint}>Modalità AND invece di OR</Text>
                        </View>
                        <Ionicons
                          name={genreAndMode ? 'checkmark-circle' : 'ellipse-outline'}
                          size={22}
                          color={genreAndMode ? theme.colorPalette.accent.primary : theme.colorPalette.text.tertiary}
                        />
                      </TouchableOpacity>
                    )}
                    <View style={styles.filterChipsRow}>
                    {visibleOptions.map(option => {
                      const isActive = selectedIds.includes(option.id);
                      return (
                        <TouchableOpacity
                          key={option.id}
                          style={[
                            styles.filterChip,
                            isActive && styles.filterChipActive,
                          ]}
                          onPress={() => toggleFilterOption(group, option.id)}
                        >
                          {isActive && <Ionicons name="checkmark" size={14} color="#ffffff" style={styles.filterChipIcon} />}
                          <Text
                            style={[
                              styles.filterChipText,
                              isActive && styles.filterChipTextActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    </View>
                  </Animated.View>
                )}
              </Animated.View>
            );
          })}
          {activeProvider === 'animeworld' && <View style={styles.studioGroup}>
            <View style={styles.filterGroupIcon}>
              <Ionicons name="business-outline" size={18} color={studio ? theme.colorPalette.accent.primary : theme.colorPalette.text.tertiary} />
            </View>
            <View style={styles.studioFieldCopy}>
              <Text style={styles.filterGroupLabel}>Studio</Text>
              <TextInput
                value={studio}
                onChangeText={setStudio}
                placeholder="Es. MAPPA, ufotable, Madhouse..."
                placeholderTextColor={theme.colorPalette.text.tertiary}
                style={styles.studioInput}
              />
            </View>
            {studio.length > 0 && (
              <TouchableOpacity onPress={() => setStudio('')} style={styles.clearStudioButton}>
                <Ionicons name="close" size={17} color={theme.colorPalette.text.secondary} />
              </TouchableOpacity>
            )}
          </View>}
        </View>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.resetButton} onPress={handleResetFilters}>
            <Ionicons
              name="refresh"
              size={16}
              color={theme.colorPalette.text.primary}
              style={styles.actionIcon}
            />
            <Text style={styles.resetButtonText}>Resetta filtri</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.searchButton} onPress={() => handleSearch(1)}>
            <Ionicons
              name="search"
              size={18}
              color="#000"
              style={styles.actionIcon}
            />
            <Text style={styles.searchButtonText}>Cerca</Text>
          </TouchableOpacity>
        </View>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
          <Stack.Screen options={{ headerShown: false }} />
          <FlatList
            data={results}
            renderItem={renderItem}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            numColumns={numColumns}
            contentContainerStyle={styles.listContainer}
            ListHeaderComponent={listHeader}
            ListFooterComponent={() => (
              results.length > 0 ? (
                <Animated.View entering={FadeIn.duration(180)} style={styles.paginationContainer}>
                  <TouchableOpacity
                    style={[styles.pageButton, (!hasPrev || page <= 1) && styles.pageButtonDisabled]}
                    onPress={() => hasPrev && page > 1 && handleSearch(page - 1)}
                    disabled={!hasPrev || page <= 1 || loading}
                  >
                    <Ionicons name="chevron-back" size={16} color={!hasPrev || page <= 1 ? theme.colorPalette.text.secondary : '#000'} />
                    <Text style={[styles.pageButtonText, (!hasPrev || page <= 1) && styles.pageButtonTextDisabled]}></Text>
                  </TouchableOpacity>
                  <Text style={styles.pageIndicator}>Pagina {page}{typeof totalPages === 'number' ? ` di ${totalPages}` : ''}</Text>
                  <TouchableOpacity
                    style={[styles.pageButton, !hasNext && styles.pageButtonDisabled]}
                    onPress={() => hasNext && handleSearch(page + 1)}
                    disabled={!hasNext || loading}
                  >
                    <Text style={[styles.pageButtonText, !hasNext && styles.pageButtonTextDisabled]}></Text>
                    <Ionicons name="chevron-forward" size={16} color={!hasNext ? theme.colorPalette.text.secondary : '#000'} />
                  </TouchableOpacity>
                </Animated.View>
              ) : null
            )}
            ListEmptyComponent={() =>
              !loading && (query.trim().length > 0 || activeFilterCount > 0) && (
                <Animated.View entering={FadeInDown.duration(220)} style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {query.trim() ? `Nessun risultato per ${query}` : 'Nessun risultato con questi filtri'}
                  </Text>
                </Animated.View>
              )
            }
            showsVerticalScrollIndicator={false}
            onScroll={onTabBarScroll}
            scrollEventThrottle={16}
          />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colorPalette.primary.background,
  },
  safeArea: {
    flex: 1,
  },
  headerWrapper: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 2,
  },
  header: {
    marginBottom: 12,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: theme.colorPalette.accent.primary,
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.primaryBold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 6,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    height: 28,
    backgroundColor: theme.colorPalette.primary.backgroundSecondary,
    marginTop: 8,
  },
  providerBadgeText: {
    color: theme.colorPalette.text.secondary,
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.primaryBold,
  },
  title: {
    color: theme.colorPalette.text.primary,
    fontSize: 28,
    fontFamily: theme.typography.fontFamily.primaryBold,
    marginBottom: 6,
    letterSpacing: 0,
  },
  subtitle: {
    color: theme.colorPalette.text.tertiary,
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colorPalette.primary.backgroundSecondary,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: theme.colorPalette.text.primary,
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.primary,
  },
  searchActionButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 2,
    backgroundColor: theme.colorPalette.accent.primary,
  },
  loadingIndicator: {
    marginTop: 8,
  },
  filtersSection: {
    marginTop: 14,
    marginBottom: 14
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 58,
    paddingHorizontal: 14,
    backgroundColor: theme.colorPalette.primary.backgroundSecondary,
    borderRadius: 6,
  },
  filtersEyebrow: {
    color: theme.colorPalette.accent.primary,
    fontSize: 9,
    letterSpacing: 1.2,
    fontFamily: theme.typography.fontFamily.primaryBold,
    marginBottom: 4,
  },
  advancedToggleTitle: {
    color: theme.colorPalette.text.primary,
    fontSize: 15,
    fontFamily: theme.typography.fontFamily.primaryBold,
  },
  filterCountBadge: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 4,
    backgroundColor: 'rgba(244,117,33,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  advancedToggleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterCountText: {
    color: theme.colorPalette.accent.primary,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primaryBold,
  },
  filtersList: {
    rowGap: 10,
    marginTop: 10,
  },
  filterGroup: {
    width: '100%',
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: theme.colorPalette.primary.backgroundSecondary,
  },
  filterGroupExpanded: {
    backgroundColor: theme.colorPalette.primary.backgroundTertiary,
  },
  filterGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 72,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  filterGroupIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  filterGroupIconActive: {
    backgroundColor: 'rgba(244,117,33,0.14)',
  },
  filterGroupHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  filterGroupLabel: {
    color: theme.colorPalette.text.secondary,
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.primaryBold,
    marginBottom: 4,
  },
  filterGroupSummary: {
    color: theme.colorPalette.text.secondary,
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.primary,
    opacity: 0.8,
  },
  selectionCount: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244,117,33,0.18)',
    marginRight: 9,
  },
  selectionCountText: {
    color: theme.colorPalette.accent.primary,
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.primaryBold,
  },
  filterExpandedContent: {
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  optionSearchContainer: {
    height: 44,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    backgroundColor: theme.colorPalette.primary.background,
    marginBottom: 10,
  },
  optionSearchInput: {
    flex: 1,
    color: theme.colorPalette.text.primary,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primary,
    marginLeft: 9,
  },
  genreModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 4,
    backgroundColor: theme.colorPalette.primary.backgroundTertiary,
  },
  genreModeRowActive: {
    backgroundColor: 'rgba(244,117,33,0.10)',
  },
  genreModeTitle: {
    color: theme.colorPalette.text.primary,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primaryBold,
  },
  genreModeHint: {
    color: theme.colorPalette.text.tertiary,
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.primary,
    marginTop: 2,
  },
  filterChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 8,
    rowGap: 8,
    marginTop: 10,
    paddingHorizontal: 0,
  },
  filterChip: {
    minHeight: 40,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 4,
    backgroundColor: theme.colorPalette.primary.backgroundTertiary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: theme.colorPalette.accent.primary,
  },
  filterChipText: {
    color: theme.colorPalette.text.secondary,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primary,
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontFamily: theme.typography.fontFamily.primaryBold,
  },
  filterChipIcon: {
    marginRight: 5,
  },
  studioGroup: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: theme.colorPalette.primary.backgroundSecondary,
  },
  studioFieldCopy: {
    flex: 1,
    paddingVertical: 11,
  },
  studioInput: {
    minHeight: 30,
    color: theme.colorPalette.text.primary,
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.primary,
    paddingVertical: 0,
  },
  clearStudioButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  resetButton: {
    flex: 1,
    height: 44,
    borderRadius: 2,
    backgroundColor: theme.colorPalette.primary.backgroundTertiary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginRight: 8,
  },
  searchButton: {
    flex: 1,
    height: 44,
    borderRadius: 2,
    backgroundColor: theme.colorPalette.accent.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  actionIcon: {
    marginRight: 6,
  },
  resetButtonText: {
    color: theme.colorPalette.text.primary,
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.primaryBold,
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.primaryBold,
  },
  listContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 100,
  },
  enhancedAnimeCard: {
    width: cardWidth,
    marginBottom: cardMargin * 3,
    marginHorizontal: cardMargin,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: theme.colorPalette.text.secondary,
    fontSize: 15,
    fontFamily: theme.typography.fontFamily.primary,
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 2,
    backgroundColor: theme.colorPalette.accent.primary,
  },
  pageButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  pageButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.primaryBold,
  },
  pageButtonTextDisabled: {
    color: theme.colorPalette.text.secondary,
  },
  pageIndicator: {
    color: theme.colorPalette.text.primary,
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.primaryBold,
  },
});

export default Browse;
