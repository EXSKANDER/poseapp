export type PoseCategory =
  | 'full-body'
  | 'portraits'
  | 'props-objects'
  | 'haircuts'
  | 'natural-objects'
  | 'museum-objects'
  | 'animals';

export type PoseDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type PoseGender = 'male' | 'female';

export type Pose = {
  id: string;
  name: string;
  category: PoseCategory[];
  gender: PoseGender | null; // null for non-human content
  difficulty: PoseDifficulty;
  modelFile: string;
  thumbnailFile: string;
  tags: string[];
  dateAdded: string; // ISO date
};

export type Favourite = {
  poseId: string;
  addedAt: string; // ISO datetime
};

export type Playlist = {
  id: string;
  name: string;
  poseIds: string[];
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
};

export type SortOption = 'newest' | 'alphabetical' | 'random';
