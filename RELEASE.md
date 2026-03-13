# PoseApp — Release Guide

## Prerequisites

- Node.js 18+ and npm
- EAS CLI installed globally: `npm install -g eas-cli`
- Expo account: `eas login`
- For iOS: Apple Developer account with App Store Connect access
- For Android: Google Play Developer account with a service account key

## EAS Build Profiles

Three build profiles are configured in `eas.json`:

| Profile       | Purpose                        | Android Output | iOS Output   |
|---------------|--------------------------------|----------------|--------------|
| `development` | Dev builds with expo-dev-client | APK            | Simulator    |
| `preview`     | Internal testing               | APK            | Ad hoc / IPA |
| `production`  | Store submission               | AAB            | IPA          |

## Building

### Development

```bash
eas build --platform android --profile development
eas build --platform ios --profile development
```

### Preview (Internal Testing)

```bash
eas build --platform android --profile preview
eas build --platform ios --profile preview
```

### Production (Store Submission)

```bash
eas build --platform android --profile production
eas build --platform ios --profile production
```

## Store Submission

### Android (Google Play)

1. Build the production AAB:
   ```bash
   eas build --platform android --profile production
   ```
2. Download the AAB from the EAS dashboard or via:
   ```bash
   eas build:list --platform android --status finished
   ```
3. Upload to Google Play Console:
   ```bash
   eas submit --platform android --profile production
   ```
   Or manually upload the AAB through the Google Play Console.
4. Required manual steps:
   - Set up a Google Play service account key and configure it in `eas.json` under `submit.production.android.serviceAccountKeyPath`
   - Create the app listing in Google Play Console (title, description, screenshots, feature graphic)
   - Set content rating via the Play Console questionnaire
   - Set target audience and content settings
   - Provide a privacy policy URL
   - Complete the Data Safety form

### iOS (App Store)

1. Build the production IPA:
   ```bash
   eas build --platform ios --profile production
   ```
2. Submit to App Store Connect:
   ```bash
   eas submit --platform ios --profile production
   ```
   Or use Transporter to upload the IPA manually.
3. Required manual steps:
   - Set `appleId` and `ascAppId` in `eas.json` under `submit.production.ios`
   - Create the app in App Store Connect (bundle ID: `com.poseapp.app`)
   - Prepare App Store listing (title, subtitle, description, keywords, screenshots for all required device sizes)
   - Set the app category (Education or Lifestyle)
   - Provide a privacy policy URL
   - Submit for App Review

## App Configuration

- **Bundle ID / Package**: `com.poseapp.app`
- **Minimum Android**: API 26 (Android 8.0)
- **Minimum iOS**: iOS 15.0
- **Version**: 1.0.0

## Notification Channels (Android)

Two notification channels are registered:
- `practice-reminders` — Daily practice reminders (high importance)
- `streak-warnings` — Streak warning alerts (default importance)

## Environment Variables

No environment variables are required for the base build. If analytics or crash reporting services are added later, their API keys should be stored in EAS Secrets:
```bash
eas secret:create --name API_KEY --value "..."
```

## Versioning

The app uses EAS remote versioning with auto-increment enabled for production builds. To tag a release candidate:

```bash
git tag v1.0.0-rc1
git push origin v1.0.0-rc1
```
