# Snap Lead Export 🚀

A production-ready React application for capturing and managing leads with AI-powered image analysis capabilities.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

## ✨ Features

- **🎯 Lead Capture**: Streamlined customer information collection with photo functionality
- **🤖 AI Analysis**: Smart image analysis using N8N integration for personalized recommendations
- **🔮 AI Fortune Generation**: Creative, personalized Indonesian fortune gimmicks and stories powered by OpenAI GPT-4o-mini
- **📱 Camera Integration**: Mobile-optimized camera capture with real-time preview
- **💾 Cloud Storage**: Secure photo storage using Supabase
- **📊 Dashboard**: Comprehensive lead management and analytics
- **🔒 Security**: Production-grade security with RLS policies
- **⚡ Performance**: Optimized builds with code splitting and caching

## 🛠 Tech Stack

- **Frontend**: React 18 with TypeScript
- **UI Framework**: Radix UI + Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **AI Integration**: N8N webhooks + OpenAI GPT-4o-mini
- **Build Tool**: Vite
- **Deployment**: Railway

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase project
- N8N instance (optional, for AI features)

### Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd snap-lead-export
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
```

4. **Configure Supabase:**
   - Create required tables and storage buckets
   - Set up Row Level Security policies
   - See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed setup

5. **Start development server:**
```bash
npm run dev
```

The application will be available at `https://localhost:8080` (HTTPS for camera access).

## 📋 Environment Variables

### Required
```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key
```

### Optional
```bash
VITE_N8N_WEBHOOK_URL=your_n8n_webhook_url
VITE_N8N_ANALYZE_URL=your_n8n_analyze_webhook_url
VITE_APP_NAME=Snap Lead Export
VITE_APP_VERSION=1.0.0
VITE_DEV_MODE=false
```

### OpenAI Configuration
The application now includes AI-powered creative fortune generation using OpenAI's GPT-4o-mini. To enable this feature:

1. Get your OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add it to your `.env` file as `VITE_OPENAI_API_KEY`
3. The application will automatically generate personalized Indonesian fortune gimmicks and stories based on the user's detected mood
4. Features dual typing animations for engaging sequential display of gimmick and story

**Language**: All fortunes are generated in Indonesian with authentic, casual expressions that resonate with local users.

**Note**: OpenAI API calls are made from the browser. In a production environment, consider implementing server-side API calls for better security.

## 🏗 Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components (shadcn/ui)
│   ├── CameraCapture.tsx   # Main camera functionality
│   ├── LeadsDashboard.tsx  # Lead management interface
│   └── ...
├── lib/                # Core utilities
│   ├── supabase.ts     # Database client and functions
│   ├── config.ts       # Configuration management
│   └── utils.ts        # Helper functions
├── pages/              # Page components
├── hooks/              # Custom React hooks
└── ...
```

## 🎯 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run build:prod` | Build with production optimizations |
| `npm run start` | Start production server |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |
| `npm run typecheck` | Run TypeScript checker |
| `npm run clean` | Clean build directory |

## 🚀 Deployment

This application is production-ready and optimized for Railway deployment.

**Quick Deploy:**
1. Fork this repository
2. Connect to Railway
3. Set environment variables
4. Deploy!

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## 🎨 Features in Detail

### 📸 Lead Capture Flow
1. **Preferences Collection**: Customer inputs name, gender, and drink preferences
2. **Photo Capture**: Mobile-optimized camera interface
3. **AI Analysis**: Optional image analysis for personalized recommendations
4. **Contact Information**: Email and WhatsApp collection
5. **Thank You**: Automatic redirect for next customer

### 🤖 AI Integration
- **Mood Analysis**: Detect customer mood from photos
- **Age Estimation**: Approximate age for targeted recommendations
- **Drink Matching**: Suggest drinks based on preferences and analysis
- **Fallback Mode**: Graceful degradation when AI is unavailable

### 📊 Dashboard Features
- **Lead Overview**: View all captured leads
- **Export Functionality**: Download lead data as Excel
- **Search & Filter**: Find specific leads quickly
- **Real-time Updates**: Live data synchronization

## 🔧 Configuration

### Supabase Setup
The application requires specific database tables and storage buckets. Run the following SQL to set up your Supabase project:

```sql
-- Create leads table
CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  whatsapp VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'new',
  source VARCHAR(100) DEFAULT 'Photo Capture',
  created_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  image_url TEXT
);

-- Create drink_menu table
CREATE TABLE drink_menu (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100)
);

-- Create syrup_photos table
CREATE TABLE syrup_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  file_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  file_size INTEGER,
  content_type VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB,
  tags TEXT[],
  description TEXT
);
```

### Storage Buckets
Create the following storage buckets in Supabase:
- `lead-images` - For customer photos
- `syrup-bottles` - For syrup bottle images

## 🛡 Security

- **Environment Variables**: All sensitive data stored as environment variables
- **RLS Policies**: Database access controlled by Row Level Security
- **HTTPS Only**: Camera access requires secure connections
- **Input Validation**: All user inputs are validated and sanitized
- **Error Handling**: Graceful error handling with user-friendly messages

## 📈 Performance

- **Code Splitting**: Vendor chunks separated for better caching
- **Tree Shaking**: Unused code eliminated in production
- **Image Optimization**: Compressed images and efficient storage
- **Lazy Loading**: Components loaded on demand
- **CDN Ready**: Static assets optimized for CDN delivery

## 🐛 Troubleshooting

### Common Issues

1. **Camera not working**: Ensure HTTPS is enabled
2. **Configuration errors**: Check environment variables
3. **Database connection**: Verify Supabase credentials
4. **N8N webhooks**: Ensure endpoints are accessible

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed troubleshooting guide.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📚 [Documentation](DEPLOYMENT.md)
- 🐛 [Issues](https://github.com/your-username/snap-lead-export/issues)
- 💬 [Discussions](https://github.com/your-username/snap-lead-export/discussions)

---

Built with ❤️ using React, TypeScript, and Supabase
