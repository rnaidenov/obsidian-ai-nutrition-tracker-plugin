# Nutrition Tracker Plugin for Obsidian

AI-powered nutrition tracking with customizable goals and templates.

## Features

- 🤖 AI-powered food recognition and nutrition analysis
- 📊 Customizable nutrition goals and progress tracking
- 📝 Automated food log creation
- 🖼️ Image-based food logging
- 📈 Visual progress indicators
- 🎯 Flexible storage and template configuration

## Available AI Models

### Claude Models
- **Claude 3.5 Sonnet** (Recommended) - Most reliable for nutrition analysis, excellent at following instructions

### OpenAI Models  
- **GPT-4O** - High quality, good multimodal support
- **GPT-4O Mini** - Cheaper alternative, still very capable

### Google Gemini Models
- **Gemini 2.5 Pro** - Most capable, best for complex analysis (higher cost)
- **Gemini 2.5 Flash** - Fast and smart, great balance of speed/quality
- **Gemini 2.5 Flash Thinking** - Uses reasoning capabilities for more accurate analysis
- **Gemini 2.0 Flash** - Balanced performance and cost
- **Gemini 2.0 Flash Lite** - Most economical option
- **Gemini 1.5 Flash** - Legacy model, reliable but older

### Model Selection Tips
- **For accuracy**: Claude 3.5 Sonnet or Gemini 2.5 Pro
- **For speed**: Gemini 2.5 Flash or Gemini 2.0 Flash  
- **For cost**: Gemini 2.0 Flash Lite or GPT-4O Mini
- **For reasoning**: Gemini 2.5 Flash Thinking

## Development

### Prerequisites
- Node.js (v16+)
- npm or yarn

### Setup
```bash
# Install dependencies
npm install

# Build for development (with hot reload)
npm run dev

# Build for production
npm run build
```

### Testing
1. Build the plugin
2. Copy or symlink the built files to your Obsidian vault's plugins folder
3. Enable the plugin in Obsidian settings

## Usage

1. Configure your nutrition goals in the plugin settings
2. Use the "Log Food" command or ribbon icon to add food entries
3. The plugin will process your input using AI and create formatted logs
4. View your progress in the generated daily nutrition logs

## Configuration

- **OpenRouter API Key**: Required for AI food processing
- **AI Model**: Choose from Claude, GPT, or Gemini models based on your needs
- **Nutrition Goals**: Set your daily calorie, protein, carb, and fat targets
- **Storage Paths**: Customize where your food logs and images are stored
- **Templates**: Modify the food log template to match your preferences

## License

MIT 