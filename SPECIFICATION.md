# PoseApp — Application Specification

## Overview

PoseApp is a mobile figure drawing practice tool for Android and iOS. It provides 3D human pose models that artists can study, rotate, and draw from, with timed practice sessions and a library of categorised poses. The app is a mobile-native reimagining of posemaniacs.com, designed from the ground up for touchscreen interaction and mobile hardware.

The app is built with React Native and Expo, using Expo Router for file-based navigation.

---

## Navigation Structure

The app uses a bottom tab navigator with four primary tabs:

| Tab | Icon | Screen |
|-----|------|--------|
| Practice | Play/timer icon | Practice session launcher |
| Library | Grid icon | Pose browsing and search |
| Progress | Chart icon | Statistics and history |
| Settings | Gear icon | App and practice settings |

A pose viewer screen sits outside the tab navigator and is presented as a full-screen modal when a user selects a pose or begins a practice session.

---

## Screen-by-Screen Specification

### 1. Home / Practice Screen

This is the default landing screen and the primary entry point for drawing practice.

**Layout:**
- Large "Start Practice" button (prominent, centre of screen)
- Quick-start preset buttons beneath it (e.g. "30-second gestures", "2-minute poses", "5-minute study")
- Summary card showing today's practice stats (time spent, poses completed)
- Streak indicator (consecutive days practised)

**Quick-Start Presets:**
Each preset is a pre-configured practice session with the following parameters:
- Pose duration (how long each pose is displayed)
- Number of poses in the session
- Pose category filter (or "all")
- Break duration between poses (optional)

Users tap a preset to immediately launch into a session, or tap "Start Practice" to configure a custom session.

**Custom Session Configuration (modal or sub-screen):**
- Pose duration: slider or picker (10s, 30s, 45s, 1m, 2m, 5m, 10m, unlimited)
- Number of poses: picker (1, 5, 10, 20, 50, unlimited/continuous)
- Pose category: multi-select from available categories
- Gender filter: male, female, or both
- Break between poses: off, 5s, 10s, 30s
- Transition style: immediate cut, fade, or countdown overlay
- Audio cue on pose change: on/off
- Random order vs sequential: toggle

---

### 2. Pose Viewer Screen (Full-Screen Modal)

This is the core screen of the app — where the user views and draws from poses. It is presented full-screen with minimal UI to maximise drawing reference space.

**3D Viewport:**
- Displays a single 3D human pose model
- Touch controls:
  - Single finger drag: orbit/rotate the model around a central point
  - Pinch: zoom in/out
  - Two-finger drag: pan the camera
  - Double-tap: reset camera to default front-facing view
- The background behind the model is a solid configurable colour (default: neutral grey)

**Overlay UI (semi-transparent, auto-hides after inactivity):**

*Top bar:*
- Back/close button (returns to previous screen)
- Current pose name or number (e.g. "Pose 12 of 20")
- Session progress indicator (e.g. dots or a thin progress bar)

*Centre (visible only during transitions):*
- Countdown overlay before each new pose ("3… 2… 1…")
- "NEXT POSE" flash text on transition

*Bottom bar:*
- Timer display (large, readable): shows remaining time for current pose
- Play/pause button
- Skip to next pose button
- Skip to previous pose button
- Favourite/bookmark button (saves current pose to favourites)

*Toolbar (collapsible side panel or bottom drawer, toggled by a button):*
- Model display options:
  - Toggle wireframe overlay
  - Toggle muscle group highlighting
  - Toggle skeletal structure overlay
  - Toggle grid/ground plane
  - Opacity/transparency slider for the model
- Lighting angle adjustment (simple directional light control)
- Mirror/flip pose horizontally
- Lock rotation (disable touch rotation, useful for steady reference)

**Session End:**
When all poses are completed (or user ends early):
- Session summary overlay:
  - Total time spent
  - Number of poses viewed
  - Number of poses skipped
  - Poses bookmarked during session
- Buttons: "Save Session", "Restart", "Back to Home"

**Behaviour:**
- Screen stays awake during active session (wake lock)
- Timer pauses if app goes to background
- If the user locks their phone mid-session, the session pauses and resumes on return
- Audio cue (short chime or beep) when pose changes, if enabled in settings

---

### 3. Library Screen

A browsable, searchable catalogue of all available poses.

**Layout:**
- Search bar at top
- Filter chips below search bar (category, gender, difficulty, favourites)
- Pose grid: thumbnail cards showing a static preview render of each pose
- Each card shows: thumbnail image, pose name/ID, category tag, favourite indicator

**Filters:**
- Category: standing, sitting, reclining, action/dynamic, crouching, foreshortened, hands, face/head
- Gender: male, female
- Difficulty: beginner-friendly, intermediate, advanced (based on complexity of the pose)
- Favourites only: toggle to show only bookmarked poses
- Sort: newest, alphabetical, most practised, random

**Interactions:**
- Tap a pose card → opens Pose Viewer in single-pose mode (no timer, free study)
- Long-press a pose card → quick actions menu (add to favourites, add to custom playlist, preview)
- "Start Session from Selection" button appears when user has active filters → launches a practice session using only the filtered poses

**Pose Playlists (sub-feature):**
- Users can create named playlists of poses (e.g. "Foreshortening practice", "Warm-up set")
- Playlists are accessible from a "Playlists" tab within the Library screen
- Each playlist can be launched directly as a practice session

---

### 4. Progress Screen

Tracks the user's practice history and provides motivational feedback.

**Layout:**
- Header stats row: total practice time (all-time), current streak, longest streak
- Practice calendar (heatmap style, like GitHub's contribution graph): shows which days the user practised and intensity
- Weekly summary card: time spent this week vs last week, number of sessions, average session length
- Pose coverage: visual indicator showing what percentage of the full pose library the user has practised with

**Detailed History (scrollable list below):**
- Each entry is a completed session, showing:
  - Date and time
  - Duration
  - Number of poses
  - Category breakdown
- Tapping a session entry shows full session details (which poses were viewed, time per pose, which were bookmarked)

**Goals (sub-section or tab):**
- Set daily/weekly practice goals (e.g. "Draw for 30 minutes daily")
- Progress bar toward current goal
- Notification reminders tied to goals

---

### 5. Settings Screen

Divided into clearly labelled sections.

#### 5.1 Practice Defaults
These are the default values pre-filled when starting a new custom session. Users can always override them per-session.

- Default pose duration
- Default number of poses
- Default break duration
- Default transition style
- Default audio cue on/off
- Default category filter
- Default gender filter

#### 5.2 Display & Graphics

- **Theme:** Light / Dark / System default
- **Render quality:** Low / Medium / High (affects 3D model detail and texture resolution)
- **Frame rate cap:** 30fps / 60fps (with note: "Higher frame rate uses more battery")
- **Keep screen awake during sessions:** on/off (default: on)
- **Background colour:** colour picker for the pose viewer background
- **Show grid/ground plane by default:** on/off

#### 5.3 Performance & Battery

- **Performance mode:** Balanced / Performance / Battery saver
  - Battery saver: reduces model quality, caps frame rate at 30fps, disables non-essential animations
  - Performance: maximum quality, uncapped frame rate
  - Balanced: default, adapts to device capability
- **Preload next pose:** on/off (preloads the next pose model during the current pose for smoother transitions; uses more memory)
- **Cache size limit:** slider (100MB – 1GB) for locally cached pose data

#### 5.4 Notifications

- **Practice reminders:** on/off
  - Reminder frequency: daily, every X days, specific days of the week
  - Reminder time: time picker
  - Quiet hours: start and end time (no notifications sent during this window)
- **Streak warnings:** on/off ("You're about to lose your streak!")
- **Session complete feedback:** vibration on/off, sound on/off

#### 5.5 Storage & Data

- **Current cache size** (displayed, with "Clear Cache" button)
- **Download models on Wi-Fi only:** on/off (default: on)
- **Export practice data:** button to export progress history as JSON or CSV
- **Delete all practice data:** button with confirmation dialog

#### 5.6 Accessibility

- **Text size:** follow system / small / medium / large / extra large
- **High contrast UI:** on/off
- **Reduce motion:** on/off (disables pose transition animations, 3D rotation smoothing, and parallax effects)
- **Haptic feedback:** on/off
- **Screen reader optimisations:** on/off (adds descriptive labels to pose models and UI elements)

#### 5.7 Privacy

- **Analytics:** on/off (anonymous usage data to help improve the app)
- **Crash reporting:** on/off
- **Privacy policy:** link
- **Data the app collects:** plain-language summary

#### 5.8 About

- App version and build number
- Check for updates
- Open source licences and attributions
- Credits for 3D models and assets
- Link to project website or repository
- "Send Feedback" link (opens email or feedback form)
- Reset all settings to defaults

---

## Data Models

### Pose
```
{
  id: string,
  name: string,
  category: string[],         // e.g. ["standing", "dynamic"]
  gender: "male" | "female",
  difficulty: "beginner" | "intermediate" | "advanced",
  modelFile: string,          // path or URL to 3D model asset
  thumbnailFile: string,      // path or URL to static preview image
  tags: string[],             // additional searchable tags
  dateAdded: string           // ISO date
}
```

### PracticeSession
```
{
  id: string,
  startTime: string,          // ISO datetime
  endTime: string,
  totalDuration: number,      // seconds
  poseDuration: number,       // configured seconds per pose
  posesViewed: string[],      // array of pose IDs
  posesSkipped: string[],     // array of pose IDs
  posesFavourited: string[],  // array of pose IDs
  categoryFilter: string[],
  completed: boolean          // did user finish or exit early
}
```

### UserPreferences
```
{
  // Practice defaults
  defaultPoseDuration: number,
  defaultPoseCount: number,
  defaultBreakDuration: number,
  defaultTransitionStyle: "cut" | "fade" | "countdown",
  defaultAudioCue: boolean,
  defaultCategories: string[],
  defaultGender: "male" | "female" | "both",

  // Display
  theme: "light" | "dark" | "system",
  renderQuality: "low" | "medium" | "high",
  frameRateCap: 30 | 60,
  keepScreenAwake: boolean,
  viewerBackgroundColour: string,
  showGridByDefault: boolean,

  // Performance
  performanceMode: "balanced" | "performance" | "battery",
  preloadNextPose: boolean,
  cacheSizeLimit: number,

  // Notifications
  practiceReminders: boolean,
  reminderFrequency: string,
  reminderTime: string,
  quietHoursStart: string,
  quietHoursEnd: string,
  streakWarnings: boolean,
  sessionCompleteFeedback: { vibration: boolean, sound: boolean },

  // Storage
  wifiOnlyDownloads: boolean,

  // Accessibility
  textSize: "system" | "small" | "medium" | "large" | "xlarge",
  highContrast: boolean,
  reduceMotion: boolean,
  hapticFeedback: boolean,
  screenReaderOptimisations: boolean,

  // Privacy
  analyticsEnabled: boolean,
  crashReportingEnabled: boolean
}
```

### Playlist
```
{
  id: string,
  name: string,
  poseIds: string[],
  createdAt: string,
  updatedAt: string
}
```

### Favourite
```
{
  poseId: string,
  addedAt: string
}
```

---

## App Flow Diagrams

### First Launch
```
App Opens
  → Onboarding screen 1: Welcome + brief app description
  → Onboarding screen 2: Request notification permission
  → Onboarding screen 3: Choose theme (light/dark/system)
  → Onboarding screen 4: Choose default practice preset (quick setup)
  → Home / Practice Screen
```

### Typical Practice Session
```
Home Screen
  → User taps "30-second gestures" preset
  → Custom Session Config opens (pre-filled with preset values)
  → User confirms or tweaks settings
  → Pose Viewer launches (full screen)
    → Countdown: 3… 2… 1…
    → Pose 1 displayed, timer running
    → User draws from pose, optionally rotates model
    → Timer expires → transition → Pose 2
    → … repeats for all poses …
    → Final pose timer expires
  → Session Summary overlay
  → User taps "Save Session"
  → Returns to Home Screen (stats updated)
```

### Browsing and Free Study
```
Library Screen
  → User scrolls or searches poses
  → User applies filter: "sitting" + "female"
  → Filtered grid displayed
  → User taps a pose thumbnail
  → Pose Viewer opens (single-pose, no timer, free rotation)
  → User studies the pose
  → User taps back
  → Returns to Library
```

### Creating a Playlist
```
Library Screen
  → User long-presses a pose card
  → Quick action menu: "Add to Playlist"
  → Playlist picker appears (existing playlists + "Create New")
  → User creates "Morning Warmup" playlist
  → User continues browsing, adding more poses
  → Later: Library → Playlists tab → "Morning Warmup" → "Start Session"
  → Practice session begins with playlist poses
```

---

## 3D Model Technical Requirements

- **Format:** glTF 2.0 (.glb) — widely supported, compact, and well-suited for mobile rendering
- **Renderer:** Three.js via expo-three or react-three-fiber (Expo-compatible)
- **Polycount target:** 10,000–50,000 polygons per model (scalable by quality setting)
- **Textures:** 1024x1024 for medium quality, 512x512 for low, 2048x2048 for high
- **Lighting:** Single adjustable directional light + ambient light
- **Camera:** Perspective camera, orbiting around model centre point

### Model Display Modes
- **Default:** Solid shaded model with skin-tone or neutral material
- **Muscle overlay:** Semi-transparent layer showing major muscle groups in colour
- **Wireframe:** Wireframe mesh over solid or transparent body
- **Skeleton:** Joint/bone structure overlay
- **Silhouette:** Flat black silhouette against the background (for contour drawing practice)

---

## Offline Behaviour

- The app should function fully offline after initial model data has been downloaded
- Pose models are cached locally up to the user's cache size limit
- Practice sessions, favourites, playlists, and progress data are stored locally on-device
- If models are not yet cached and the user is offline, display a clear message explaining which content is unavailable and offer to start a session with cached poses only
- Settings sync is local-only (no cloud account system in v1)

---

## Platform-Specific Considerations

### Android
- Support back gesture / hardware back button for navigation
- Use system notification channels for practice reminders
- Support adaptive icons
- Target minimum Android 8.0 (API 26)

### iOS
- Support swipe-back gesture for navigation
- Use iOS notification permissions flow
- Support Dynamic Island / Live Activities for active session timer (future consideration)
- Target minimum iOS 15

---

## Future Considerations (Out of Scope for v1)

These features are noted for potential future versions but should not be built now:

- User accounts and cloud sync
- Community features (sharing poses, user-submitted poses)
- Drawing tools (drawing directly over the pose within the app)
- Photo overlay (camera feed with semi-transparent pose overlay for checking proportions)
- AI-based pose generation
- Timed challenge mode with scoring
- Widget showing daily practice reminder or streak on home screen
- Apple Watch / Wear OS companion for session timer
- Tablet-specific layouts with side-by-side drawing area
