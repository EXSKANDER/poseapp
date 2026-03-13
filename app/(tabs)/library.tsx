import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { SubjectCard } from '@/components/SubjectCard';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { POSE_CATALOGUE } from '@/data/catalogue';
import { useFavourites } from '@/hooks/use-favourites';
import { usePlaylists } from '@/hooks/use-playlists';
import { Pose, PoseCategory, PoseDifficulty, PoseGender, SortOption } from '@/types/models';

type TabKey = 'all' | PoseCategory | 'playlists';

export default function LibraryScreen() {
  const { t } = useTranslation();

  const CATEGORY_TABS: { key: TabKey; label: string }[] = [
    { key: 'all', label: t('library.categoryAll') },
    { key: 'full-body', label: t('library.categoryFullBody') },
    { key: 'portraits', label: t('library.categoryPortraits') },
    { key: 'props-objects', label: t('library.categoryPropsObjects') },
    { key: 'haircuts', label: t('library.categoryHaircuts') },
    { key: 'natural-objects', label: t('library.categoryNaturalObjects') },
    { key: 'museum-objects', label: t('library.categoryMuseumObjects') },
    { key: 'animals', label: t('library.categoryAnimals') },
    { key: 'playlists', label: t('library.categoryPlaylists') },
  ];
  const router = useRouter();
  const { isFavourite, addFavourite, removeFavourite, toggleFavourite, favouriteIds } =
    useFavourites();
  const {
    playlists,
    createPlaylist,
    renamePlaylist,
    deletePlaylist,
    addToPlaylist,
    removeFromPlaylist,
  } = usePlaylists();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [genderFilter, setGenderFilter] = useState<PoseGender | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<PoseDifficulty | null>(null);
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('newest');

  // Quick actions modal
  const [quickActionPose, setQuickActionPose] = useState<Pose | null>(null);

  // Playlist picker modal
  const [playlistPickerPoseId, setPlaylistPickerPoseId] = useState<string | null>(null);

  // New playlist modal
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistPendingPoseId, setNewPlaylistPendingPoseId] = useState<string | null>(null);

  // Playlist detail view
  const [viewingPlaylistId, setViewingPlaylistId] = useState<string | null>(null);

  // Rename playlist
  const [renamingPlaylistId, setRenamingPlaylistId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  const hasActiveFilters =
    genderFilter !== null || difficultyFilter !== null || favouritesOnly || searchQuery.length > 0;

  // Determine if current tab shows human content (gender filter relevant)
  const showGenderFilter =
    activeTab === 'all' ||
    activeTab === 'full-body' ||
    activeTab === 'portraits' ||
    activeTab === 'haircuts';

  // Filtered & sorted poses
  const filteredPoses = useMemo(() => {
    let results = [...POSE_CATALOGUE];

    // Category filter
    if (activeTab !== 'all' && activeTab !== 'playlists') {
      results = results.filter((p) => p.category.includes(activeTab as PoseCategory));
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    // Gender
    if (genderFilter) {
      results = results.filter((p) => p.gender === genderFilter);
    }

    // Difficulty
    if (difficultyFilter) {
      results = results.filter((p) => p.difficulty === difficultyFilter);
    }

    // Favourites only
    if (favouritesOnly) {
      results = results.filter((p) => favouriteIds.includes(p.id));
    }

    // Sort
    switch (sortOption) {
      case 'newest':
        results.sort((a, b) => b.dateAdded.localeCompare(a.dateAdded));
        break;
      case 'alphabetical':
        results.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'random':
        for (let i = results.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [results[i], results[j]] = [results[j], results[i]];
        }
        break;
    }

    return results;
  }, [activeTab, searchQuery, genderFilter, difficultyFilter, favouritesOnly, sortOption, favouriteIds]);

  // Handlers
  const handleCardPress = useCallback(
    (pose: Pose) => {
      router.push({
        pathname: '/viewer',
        params: { mode: 'free-study', poseId: pose.id, poseName: pose.name },
      });
    },
    [router],
  );

  const handleCardLongPress = useCallback((pose: Pose) => {
    setQuickActionPose(pose);
  }, []);

  const handleQuickActionFavourite = () => {
    if (!quickActionPose) return;
    toggleFavourite(quickActionPose.id);
    setQuickActionPose(null);
  };

  const handleQuickActionAddToPlaylist = () => {
    if (!quickActionPose) return;
    setPlaylistPickerPoseId(quickActionPose.id);
    setQuickActionPose(null);
  };

  const handleQuickActionPreview = () => {
    if (!quickActionPose) return;
    handleCardPress(quickActionPose);
    setQuickActionPose(null);
  };

  const handleSelectPlaylist = (playlistId: string) => {
    if (playlistPickerPoseId) {
      addToPlaylist(playlistId, playlistPickerPoseId);
    }
    setPlaylistPickerPoseId(null);
  };

  const handleCreateNewPlaylistFromPicker = () => {
    setNewPlaylistPendingPoseId(playlistPickerPoseId);
    setPlaylistPickerPoseId(null);
    setNewPlaylistName('');
    setShowNewPlaylistModal(true);
  };

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const pl = createPlaylist(newPlaylistName);
    if (newPlaylistPendingPoseId) {
      addToPlaylist(pl.id, newPlaylistPendingPoseId);
    }
    setNewPlaylistPendingPoseId(null);
    setNewPlaylistName('');
    setShowNewPlaylistModal(false);
  };

  const handleStartSessionFromSelection = () => {
    const poseIds = filteredPoses.map((p) => p.id);
    router.push({
      pathname: '/session-config',
      params: { filterPoseIds: JSON.stringify(poseIds), filterLabel: t('library.sessionFromFilterLabel') },
    });
  };

  const handlePlaylistStartSession = (playlistId: string) => {
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) return;
    router.push({
      pathname: '/session-config',
      params: {
        filterPoseIds: JSON.stringify(playlist.poseIds),
        filterLabel: `${t('library.sessionFromPlaylistLabel')} ${playlist.name}`,
      },
    });
  };

  const handleDeletePlaylist = (playlistId: string) => {
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) return;
    Alert.alert(
      t('library.playlistDeleteConfirmTitle'),
      t('library.playlistDeleteConfirmMessage'),
      [
        { text: t('library.playlistCancelButton'), style: 'cancel' },
        {
          text: t('library.playlistDeleteConfirmButton'),
          style: 'destructive',
          onPress: () => {
            deletePlaylist(playlistId);
            if (viewingPlaylistId === playlistId) {
              setViewingPlaylistId(null);
            }
          },
        },
      ],
    );
  };

  const handleStartRename = (playlistId: string) => {
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) return;
    setRenamingPlaylistId(playlistId);
    setRenameText(playlist.name);
  };

  const handleConfirmRename = () => {
    if (renamingPlaylistId && renameText.trim()) {
      renamePlaylist(renamingPlaylistId, renameText);
    }
    setRenamingPlaylistId(null);
    setRenameText('');
  };

  // Viewing playlist
  const viewingPlaylist = playlists.find((p) => p.id === viewingPlaylistId);
  const viewingPlaylistPoses = viewingPlaylist
    ? POSE_CATALOGUE.filter((p) => viewingPlaylist.poseIds.includes(p.id))
    : [];

  const renderCard = ({ item }: { item: Pose }) => (
    <SubjectCard
      pose={item}
      isFavourite={isFavourite(item.id)}
      onPress={() => handleCardPress(item)}
      onLongPress={() => handleCardLongPress(item)}
    />
  );

  const renderEmptyList = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{t('library.emptyStateTitle')}</Text>
      <Text style={styles.emptyMessage}>{t('library.emptyStateMessage')}</Text>
    </View>
  );

  // Playlists tab content
  if (activeTab === 'playlists') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="title" style={styles.title}>
            {t('library.title')}
          </ThemedText>

          {/* Category tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsRow}
            style={styles.tabsContainer}
          >
            {CATEGORY_TABS.map((tab) => (
              <Pressable
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Playlist detail view */}
          {viewingPlaylist ? (
            <View style={styles.playlistDetail}>
              <View style={styles.playlistDetailHeader}>
                <Pressable onPress={() => setViewingPlaylistId(null)}>
                  <Text style={styles.backButton}>{t('viewer.back')}</Text>
                </Pressable>
                <ThemedText type="subtitle" style={styles.playlistDetailName}>
                  {viewingPlaylist.name}
                </ThemedText>
              </View>
              <FlatList
                data={viewingPlaylistPoses}
                renderItem={({ item }) => (
                  <SubjectCard
                    pose={item}
                    isFavourite={isFavourite(item.id)}
                    onPress={() => handleCardPress(item)}
                    onLongPress={() => {
                      Alert.alert(
                        item.name,
                        undefined,
                        [
                          {
                            text: t('library.playlistRemoveSubject'),
                            style: 'destructive',
                            onPress: () => removeFromPlaylist(viewingPlaylist.id, item.id),
                          },
                          { text: t('library.quickActionCancel'), style: 'cancel' },
                        ],
                      );
                    }}
                  />
                )}
                keyExtractor={(item) => item.id}
                numColumns={2}
                contentContainerStyle={styles.gridContent}
                ListEmptyComponent={renderEmptyList}
              />
              <Pressable
                style={styles.startSessionButton}
                onPress={() => handlePlaylistStartSession(viewingPlaylist.id)}
              >
                <Text style={styles.startSessionButtonText}>
                  {t('library.playlistStartSession')}
                </Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView style={styles.playlistsList} contentContainerStyle={styles.playlistsContent}>
              <Pressable
                style={styles.createPlaylistButton}
                onPress={() => {
                  setNewPlaylistPendingPoseId(null);
                  setNewPlaylistName('');
                  setShowNewPlaylistModal(true);
                }}
              >
                <Text style={styles.createPlaylistButtonText}>
                  {t('library.playlistCreateNew')}
                </Text>
              </Pressable>

              {playlists.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>{t('library.playlistsEmptyTitle')}</Text>
                  <Text style={styles.emptyMessage}>{t('library.playlistsEmptyMessage')}</Text>
                </View>
              ) : (
                playlists.map((playlist) => (
                  <View key={playlist.id} style={styles.playlistRow}>
                    {renamingPlaylistId === playlist.id ? (
                      <View style={styles.renameRow}>
                        <TextInput
                          style={styles.renameInput}
                          value={renameText}
                          onChangeText={setRenameText}
                          autoFocus
                          onSubmitEditing={handleConfirmRename}
                        />
                        <Pressable style={styles.renameConfirmButton} onPress={handleConfirmRename}>
                          <Text style={styles.renameConfirmText}>OK</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        style={styles.playlistInfo}
                        onPress={() => setViewingPlaylistId(playlist.id)}
                      >
                        <Text style={styles.playlistName}>{playlist.name}</Text>
                        <Text style={styles.playlistCount}>
                          {t('library.playlistSubjectCount', { count: playlist.poseIds.length })}
                        </Text>
                      </Pressable>
                    )}
                    <View style={styles.playlistActions}>
                      <Pressable
                        style={styles.playlistActionButton}
                        onPress={() => handlePlaylistStartSession(playlist.id)}
                      >
                        <Text style={styles.playlistActionText}>
                          {t('library.playlistStartSession')}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={styles.playlistActionButtonSecondary}
                        onPress={() => handleStartRename(playlist.id)}
                      >
                        <Text style={styles.playlistActionTextSecondary}>
                          {t('library.playlistRename')}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={styles.playlistActionButtonSecondary}
                        onPress={() => handleDeletePlaylist(playlist.id)}
                      >
                        <Text style={[styles.playlistActionTextSecondary, { color: '#E74C3C' }]}>
                          {t('library.playlistDelete')}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}

          {/* New playlist modal */}
          <NewPlaylistModal
            visible={showNewPlaylistModal}
            name={newPlaylistName}
            onChangeName={setNewPlaylistName}
            onConfirm={handleCreatePlaylist}
            onCancel={() => {
              setShowNewPlaylistModal(false);
              setNewPlaylistPendingPoseId(null);
            }}
          />
        </SafeAreaView>
      </ThemedView>
    );
  }

  // Main grid view
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          {t('library.title')}
        </ThemedText>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={t('library.searchPlaceholder')}
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Category tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
          style={styles.tabsContainer}
        >
          {CATEGORY_TABS.map((tab) => (
            <Pressable
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Filters row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
          style={styles.filtersContainer}
        >
          {/* Gender filter */}
          {showGenderFilter && (
            <>
              <FilterChip
                label={t('library.filterGenderMale')}
                active={genderFilter === 'male'}
                onPress={() => setGenderFilter(genderFilter === 'male' ? null : 'male')}
              />
              <FilterChip
                label={t('library.filterGenderFemale')}
                active={genderFilter === 'female'}
                onPress={() => setGenderFilter(genderFilter === 'female' ? null : 'female')}
              />
            </>
          )}

          {/* Difficulty filters */}
          <FilterChip
            label={t('library.filterDifficultyBeginner')}
            active={difficultyFilter === 'beginner'}
            onPress={() =>
              setDifficultyFilter(difficultyFilter === 'beginner' ? null : 'beginner')
            }
          />
          <FilterChip
            label={t('library.filterDifficultyIntermediate')}
            active={difficultyFilter === 'intermediate'}
            onPress={() =>
              setDifficultyFilter(difficultyFilter === 'intermediate' ? null : 'intermediate')
            }
          />
          <FilterChip
            label={t('library.filterDifficultyAdvanced')}
            active={difficultyFilter === 'advanced'}
            onPress={() =>
              setDifficultyFilter(difficultyFilter === 'advanced' ? null : 'advanced')
            }
          />

          {/* Favourites toggle */}
          <FilterChip
            label={t('library.filterFavouritesOnly')}
            active={favouritesOnly}
            onPress={() => setFavouritesOnly(!favouritesOnly)}
          />

          {/* Sort options */}
          <View style={styles.sortSeparator} />
          <FilterChip
            label={t('library.sortNewest')}
            active={sortOption === 'newest'}
            onPress={() => setSortOption('newest')}
          />
          <FilterChip
            label={t('library.sortAlphabetical')}
            active={sortOption === 'alphabetical'}
            onPress={() => setSortOption('alphabetical')}
          />
          <FilterChip
            label={t('library.sortRandom')}
            active={sortOption === 'random'}
            onPress={() => setSortOption('random')}
          />
        </ScrollView>

        {/* Grid */}
        <FlatList
          data={filteredPoses}
          renderItem={renderCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          ListEmptyComponent={renderEmptyList}
        />

        {/* Start session from selection */}
        {hasActiveFilters && filteredPoses.length > 0 && (
          <Pressable style={styles.startSessionButton} onPress={handleStartSessionFromSelection}>
            <Text style={styles.startSessionButtonText}>
              {t('library.startSessionFromSelection')}
            </Text>
          </Pressable>
        )}

        {/* Quick actions modal */}
        <Modal
          visible={quickActionPose !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setQuickActionPose(null)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setQuickActionPose(null)}>
            <View style={styles.quickActionsSheet}>
              {quickActionPose && (
                <>
                  <Text style={styles.quickActionsTitle}>{quickActionPose.name}</Text>
                  <Pressable style={styles.quickActionItem} onPress={handleQuickActionFavourite}>
                    <Text style={styles.quickActionText}>
                      {isFavourite(quickActionPose.id)
                        ? t('library.quickActionRemoveFavourite')
                        : t('library.quickActionAddFavourite')}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.quickActionItem}
                    onPress={handleQuickActionAddToPlaylist}
                  >
                    <Text style={styles.quickActionText}>
                      {t('library.quickActionAddToPlaylist')}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.quickActionItem} onPress={handleQuickActionPreview}>
                    <Text style={styles.quickActionText}>{t('library.quickActionPreview')}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.quickActionItem, styles.quickActionCancel]}
                    onPress={() => setQuickActionPose(null)}
                  >
                    <Text style={[styles.quickActionText, { color: '#999' }]}>
                      {t('library.quickActionCancel')}
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </Pressable>
        </Modal>

        {/* Playlist picker modal */}
        <Modal
          visible={playlistPickerPoseId !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setPlaylistPickerPoseId(null)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setPlaylistPickerPoseId(null)}>
            <View style={styles.quickActionsSheet}>
              <Text style={styles.quickActionsTitle}>{t('library.playlistSelectTitle')}</Text>
              {playlists.map((pl) => (
                <Pressable
                  key={pl.id}
                  style={styles.quickActionItem}
                  onPress={() => handleSelectPlaylist(pl.id)}
                >
                  <Text style={styles.quickActionText}>
                    {pl.name} ({pl.poseIds.length})
                  </Text>
                </Pressable>
              ))}
              <Pressable
                style={styles.quickActionItem}
                onPress={handleCreateNewPlaylistFromPicker}
              >
                <Text style={[styles.quickActionText, { color: Colors.light.tint }]}>
                  {t('library.playlistCreateNew')}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.quickActionItem, styles.quickActionCancel]}
                onPress={() => setPlaylistPickerPoseId(null)}
              >
                <Text style={[styles.quickActionText, { color: '#999' }]}>
                  {t('library.quickActionCancel')}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        {/* New playlist modal */}
        <NewPlaylistModal
          visible={showNewPlaylistModal}
          name={newPlaylistName}
          onChangeName={setNewPlaylistName}
          onConfirm={handleCreatePlaylist}
          onCancel={() => {
            setShowNewPlaylistModal(false);
            setNewPlaylistPendingPoseId(null);
          }}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

// ----- Helper components -----

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function NewPlaylistModal({
  visible,
  name,
  onChangeName,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  name: string;
  onChangeName: (text: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.modalOverlay} onPress={onCancel}>
        <View style={styles.newPlaylistSheet}>
          <Text style={styles.quickActionsTitle}>{t('library.playlistCreateNew')}</Text>
          <TextInput
            style={styles.newPlaylistInput}
            placeholder={t('library.playlistNamePlaceholder')}
            placeholderTextColor="#888"
            value={name}
            onChangeText={onChangeName}
            autoFocus
            onSubmitEditing={onConfirm}
          />
          <View style={styles.newPlaylistButtons}>
            <Pressable style={styles.newPlaylistCancel} onPress={onCancel}>
              <Text style={styles.newPlaylistCancelText}>{t('library.playlistCancelButton')}</Text>
            </Pressable>
            <Pressable style={styles.newPlaylistConfirm} onPress={onConfirm}>
              <Text style={styles.newPlaylistConfirmText}>
                {t('library.playlistCreateButton')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

// ----- Styles -----

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  title: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },

  // Search
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
  },

  // Tabs
  tabsContainer: {
    maxHeight: 44,
  },
  tabsRow: {
    paddingHorizontal: 12,
    gap: 6,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#1e1e1e',
  },
  tabActive: {
    backgroundColor: Colors.light.tint,
  },
  tabText: {
    color: '#999',
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },

  // Filters
  filtersContainer: {
    maxHeight: 40,
    marginTop: 6,
  },
  filtersRow: {
    paddingHorizontal: 12,
    gap: 6,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#444',
  },
  filterChipActive: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  filterChipText: {
    color: '#999',
    fontSize: 11,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  sortSeparator: {
    width: 1,
    height: 20,
    backgroundColor: '#444',
    marginHorizontal: 4,
  },

  // Grid
  gridContent: {
    padding: 8,
    paddingBottom: 80,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyMessage: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },

  // Start session button
  startSessionButton: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
  },
  startSessionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },

  // Quick actions modal
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'flex-end',
  },
  quickActionsSheet: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  quickActionsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  quickActionItem: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333',
  },
  quickActionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  quickActionCancel: {
    borderBottomWidth: 0,
    marginTop: 8,
  },

  // Playlist picker / new playlist modal
  newPlaylistSheet: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  newPlaylistInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    marginBottom: 16,
  },
  newPlaylistButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  newPlaylistCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#333',
    alignItems: 'center',
  },
  newPlaylistCancelText: {
    color: '#999',
    fontWeight: '600',
  },
  newPlaylistConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
  },
  newPlaylistConfirmText: {
    color: '#fff',
    fontWeight: '600',
  },

  // Playlists list
  playlistsList: {
    flex: 1,
  },
  playlistsContent: {
    padding: 16,
    gap: 12,
  },
  createPlaylistButton: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
  },
  createPlaylistButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  playlistRow: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  playlistInfo: {
    gap: 4,
  },
  playlistName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  playlistCount: {
    color: '#888',
    fontSize: 12,
  },
  playlistActions: {
    flexDirection: 'row',
    gap: 8,
  },
  playlistActionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.light.tint,
  },
  playlistActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  playlistActionButtonSecondary: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#333',
  },
  playlistActionTextSecondary: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '600',
  },

  // Playlist detail
  playlistDetail: {
    flex: 1,
  },
  playlistDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  backButton: {
    color: Colors.light.tint,
    fontSize: 14,
    fontWeight: '600',
  },
  playlistDetailName: {
    flex: 1,
  },

  // Rename
  renameRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  renameInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 14,
  },
  renameConfirmButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.light.tint,
  },
  renameConfirmText: {
    color: '#fff',
    fontWeight: '600',
  },
});
