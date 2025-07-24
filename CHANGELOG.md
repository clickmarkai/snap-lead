# Changelog
## [1.1.7] - 2024-12-19
### Added
- **Random Drink Selection**: Implemented database-driven drink selection instead of webhook response
  - Added `getRandomDrink()` function to query all drinks from `updated_drink_menu` table
  - Random drink selection ensures variety and consistent user experience
  - Drink selection is no longer dependent on webhook analysis response
  - All webhook calls (gen-ai, gen-ingredients, send, final_message) now use random drink
  - Complete integration across analysis results, response images, and all processing steps

### Changed
- **Analysis Flow**: Modified drink selection logic to use database instead of webhook response
  - Updated `saveLead` function to fetch random drink from database
  - Modified background generation functions to use random drink data
  - Updated auto-send functions to include random drink in webhook payloads
  - Enhanced style regeneration to use random drink instead of webhook response
  - Updated all dependency arrays to include `drinkDetails` for proper reactivity

### Technical
- Added `getRandomDrink()` function in supabase.ts for database-driven drink selection
- Updated CameraCapture component imports to include new function
- Modified all webhook integration points to use random drink data
- Enhanced state management to properly handle random drink selection
- Updated dependency arrays across multiple functions for proper reactivity
- Improved error handling for drink selection and display

## [1.1.6] - 2024-12-19
### Fixed
- **Environment Variable Configuration**: Fixed missing required environment variables causing blank screen
  - Added proper validation for VITE_SUPABASE_ANON_KEY and VITE_OPENAI_API_KEY
  - Enhanced configuration error handling with user-friendly error messages
  - Updated deployment documentation for Netlify environment variable setup
  - Improved startup error display with detailed configuration guidance

### Technical
- Enhanced config.ts validation to catch missing environment variables early
- Added comprehensive error handling for configuration issues
- Updated main.tsx to display user-friendly configuration error messages
- Improved deployment setup documentation

## [1.1.5] - 2024-12-19
### Added
- **AI-Powered Fortune Generation**: Integrated OpenAI GPT-4o-mini for creative Indonesian fortunes
  - Generates both gimmick and fortune_story in Indonesian language
  - Personalized fortune messages based on detected user mood
  - Creative enhancement that ensures no duplicate context
  - Uses authentic Indonesian expressions and casual language
  - Fallback to original fortunes if OpenAI is unavailable
  - Cost-effective implementation using GPT-4o-mini model
  - Added OpenAI configuration to environment setup
  - Enhanced Fortune interface for AI-generated content

- **Dual Typing Animation System**: Added engaging typing effects for complete fortune display
  - Gimmick animation: 30ms per character with 500ms initial delay
  - Story animation: 25ms per character, starts after gimmick completes (800ms delay)
  - Sequential animation flow for better storytelling experience
  - Custom blinking cursor animation with smooth CSS transitions
  - Optimized hooks with proper cleanup and edge case handling
  - Enhanced visual appeal and user engagement

### Technical
- Added `openai` npm package dependency
- Created `generateCreativeFortune()` function in supabase.ts for dual content generation
- Enhanced OpenAI prompt engineering for Indonesian language and creativity
- Updated config.ts to include OpenAI API key management
- Modified fortune fetching logic in CameraCapture component for both gimmick and story
- Added comprehensive error handling and fallback mechanisms
- Updated documentation with OpenAI setup instructions
- Created `useTypingAnimation` custom hook for reusable typing effects
- Implemented dual typing animation system with sequential timing
- Added custom CSS animations for blinking cursor effect
- Enhanced response parsing for structured gimmick and story format

### Fixed
- **Camera Mirror Issue**: Fixed reversed/mirrored camera display for natural viewing experience
  - Applied horizontal flip transform to video preview for intuitive camera view
  - Corrected captured image orientation by flipping canvas during photo capture
  - Maintained proper image orientation for API processing and display
  - Enhanced user experience with natural "mirror-like" camera behavior

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