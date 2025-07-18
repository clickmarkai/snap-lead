# Changelog
## [1.1.4] - 2024-12-19
### Added
- **Drink Image Integration**: Added drink images from Supabase database
  - Drink images now display in analysis results with glowing border effect
  - Drink images also show below generated personalized images
  - Enhanced DrinkMenu interface to include image_url field
  - Responsive image sizing with mobile/desktop optimization
  - Graceful error handling for missing drink images

### Changed
- **UI Improvements**:
  - Drink images feature glowing blue border effects with animation
  - Moved "YOUR DRINK" card below fortune card in analysis results
  - Reduced drink name font size and left-aligned text
  - Added drink image display on personalized image page
  - Consistent styling between generated images and drink images

## [1.1.3] - 2024-12-19
### Fixed
- Changed UI

## [1.1.2] - 2024-07-15
### Fixed
- Changed UI

## [1.1.1] - 2024-07-15
### Fixed
- Patch release: bug fixes and minor improvements.

## [1.1.0] - 2024-12-19
### Added
- **Fortune Feature**: Personalized fortune display based on mood analysis
  - Added fortune database integration with Supabase
  - Fortune cards now appear after photo analysis with mood-based content
  - Randomized fortune selection from database based on detected mood
  - Clean UI integration with existing analysis results

### Changed
- **UI Improvements**: 
  - Combined fortune display within Analysis Complete card for unified experience
  - Consistent color theming across all analysis components
  - Removed debug information for production-ready code
  - Improved fortune content styling with black text for better readability

### Technical
- Added `Fortune` interface and `getFortuneByMood()` function in Supabase integration
- Enhanced mood detection to support multiple emotion field names (`mood`, `emotion`, `feeling`)
- Integrated fortune fetching in analysis workflow
- Added proper error handling for fortune retrieval

## [1.1.0] - 2024-07-15
### Added
- Drink details card now displays type, glass type, main ingredients, emotion, and feel, with ingredients shown below columns.
- 'Feel' and 'emotion' fields from updated_drink_menu are now supported and shown in the UI.
- Always send generated image link to webhook as 'imageUrl'.
- 'Give Me a Different Look' button always regenerates the image.

### Changed
- Drink details card layout: columns for main fields, ingredients and feel repositioned for clarity.
- Drink name and feel positioning improved for clarity and compactness.
- Removed debug info from camera UI for production.
- Various UI/UX improvements and bug fixes.

## [1.0.0] - 2024-12-19

### Added
- **Initial Release**: AI-powered lead capture and photo analysis application
- **Core Features**:
  - Camera capture functionality with front-facing camera preference
  - Multi-step user preference collection (name, gender, coffee/alcohol preferences)
  - AI-powered photo analysis integration via N8N webhooks
  - Personalized drink recommendations based on analysis
  - Lead management and database storage via Supabase
  - Email and WhatsApp contact collection
  - Responsive design for mobile and desktop

### Technical Foundation
- React 18 with TypeScript
- Vite build system
- Tailwind CSS for styling
- Supabase for database and authentication
- N8N webhook integration for AI analysis
- React Query for state management
- Comprehensive UI component library (Radix UI)

### Features
- **Photo Analysis**: Real-time image analysis with mood and age detection
- **Drink Recommendations**: Personalized beverage suggestions
- **Lead Management**: Complete CRM functionality
- **Mobile Optimized**: Touch-friendly interface with camera integration
- **Netlify Ready**: Production deployment configuration 

## [Unreleased]
### Changed
- Thank you card border radius increased for a rounder look.
- Removed the white background from the processing (analyzing) overlay card for a cleaner UI.
- Removed the ArrowRight icon from the 'Send to Me' button on the response image screen.
- Removed the RotateCcw icon from the 'Give Me a Different Look' button.
- Minor UI/UX tweaks for consistency and clarity. 