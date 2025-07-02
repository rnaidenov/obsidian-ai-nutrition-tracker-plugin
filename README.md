# Nutrition Tracker Plugin for Obsidian

An AI-powered nutrition tracking plugin for Obsidian that replaces traditional forms with intelligent food analysis.

## Features

✨ **AI-Powered Food Recognition**: Automatically extracts nutrition data from text descriptions or food images
🎨 **Customizable Display Layouts**: Choose between simple or card-based layouts
🌙 **Theme Support**: Light and dark themes for generated food logs
📊 **Multiple Progress Bar Styles**: Emoji dots, modern bars, or percentage-only displays
🔄 **Smart Daily Logging**: Automatically updates daily totals and progress
📷 **Image Support**: Upload food photos for AI analysis
🎯 **Flexible Goals**: Set custom nutrition targets (calories, protein, carbs, fat)
📁 **Organized Storage**: Automatic file and folder management
🔧 **Template System**: Customizable food log templates

## Display Options

### Layout Styles

**Simple Layout** (Compact):
```markdown
### 🍫 Dark chocolate with orange 80% cocoa

**6 squares** ・ 🕐 12:18 PM

🔥 200 kcal ・ 💪 2.5g protein ・ 🌾 15g carbs ・ 🥑 15g fat
```

**Card Layout** (Visual):
Beautiful HTML cards with gradients and modern styling:

Light theme (whitesmoke gradients):
```html
<div style="background: linear-gradient(135deg, #f8fafc, #f1f5f9); border-radius: 16px; padding: 20px; margin: 16px 0; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid rgba(0,0,0,0.05);">
  <div style="display: flex; align-items: center; margin-bottom: 12px;">
    <span style="font-size: 24px; margin-right: 12px;">🍫</span>
    <div>
      <h3 style="color: #1a202c; margin: 0; font-size: 18px; font-weight: 600;">Dark chocolate with orange 80% cocoa</h3>
      <div style="color: #4a5568; font-size: 14px; margin-top: 4px;">
        <span style="margin-right: 16px;">📏 6 squares</span>
        <span>🕐 12:18 PM</span>
      </div>
    </div>
  </div>
  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px;">
    <!-- Nutrition cards with colored gradients and shadows -->
  </div>
</div>
```

Dark theme (cool dark gradients):
```html
<div style="background: linear-gradient(135deg, #2d3748, #4a5568); border-radius: 16px; padding: 20px; margin: 16px 0; box-shadow: 0 8px 32px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);">
  <div style="display: flex; align-items: center; margin-bottom: 12px;">
    <span style="font-size: 24px; margin-right: 12px;">🍫</span>
    <div>
      <h3 style="color: #f7fafc; margin: 0; font-size: 18px; font-weight: 600;">Dark chocolate with orange 80% cocoa</h3>
      <div style="color: #a0aec0; font-size: 14px; margin-top: 4px;">
        <span style="margin-right: 16px;">📏 6 squares</span>
        <span>🕐 12:18 PM</span>
      </div>
    </div>
  </div>
  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px;">
    <!-- Nutrition cards with subtle transparent colors -->
  </div>
</div>
```

### Progress Bar Styles

**Emoji Dots** (Default):
```
| 🔥 Calories | **286** kcal | 2000 kcal | 🔴⚪⚪⚪⚪⚪⚪⚪⚪⚪ **14%** |
```

**Modern Progress Bars**:
```
**🔥 Calories**: 286 / 2000 kcal (14%)
[████████░░░░░░░░░░] (colored HTML progress bar)
```

**Percentage Only**:
```
| 🔥 Calories | **286** kcal | 2000 kcal | **14%** |
```

## AI Model Options

### Recommended Models

| Model | Best For | Speed | Cost |
|-------|----------|-------|------|
| **Claude 3.5 Sonnet** (Default) | Overall accuracy & reliability | Medium | Medium |
| **Gemini 2.5 Pro** | Most capable analysis | Slow | High |
| **Gemini 2.5 Flash** | Fast & smart processing | Fast | Medium |
| **GPT-4O Mini** | Budget-friendly option | Fast | Low |

### All Available Models

**Claude (Anthropic)**:
- `anthropic/claude-3.5-sonnet` - Recommended for accuracy

**GPT (OpenAI)**:
- `openai/gpt-4o` - High quality
- `openai/gpt-4o-mini` - Cost-effective

**Gemini (Google)**:
- `google/gemini-2.5-pro` - Most capable
- `google/gemini-2.5-flash-preview-05-20` - Fast & smart
- `google/gemini-2.5-flash-preview-05-20:thinking` - Reasoning focused
- `google/gemini-2.0-flash-001` - Balanced performance
- `google/gemini-2.0-flash-lite-001` - Cheapest option
- `google/gemini-flash-1.5` - Legacy support

## Installation

1. Download or clone this repository to your Obsidian plugins folder
2. Enable the plugin in Obsidian Settings → Community Plugins
3. Configure your OpenRouter API key in Plugin Settings
4. Set your nutrition goals and preferences

## Configuration

### Required Settings
- **OpenRouter API Key**: Get one at [openrouter.ai](https://openrouter.ai)
- **LLM Model**: Choose your preferred AI model

### Display Settings
- **Layout Style**: Simple (compact) or Cards (visual)
- **Display Theme**: Auto (matches Obsidian), Light, or Dark
- **Progress Bar Style**: Emoji dots, Modern bars, or Percentage only

### Nutrition Goals
- **Daily Calories**: Your calorie target
- **Daily Protein**: Protein goal in grams  
- **Daily Carbs**: Carbohydrate goal in grams
- **Daily Fat**: Fat goal in grams

### Storage Configuration
- **Food Log Storage Path**: Where daily logs are saved
- **Image Storage Path**: Where food images are stored
- **Template Path**: Custom template file location
- **Date Format**: How dates appear in log files

### Other Options
- **Auto-create daily notes**: Automatically create new log files
- **Date Format**: Customize date formatting

## Usage

1. **Open Food Input**: Click the nutrition tracker icon or use command palette
2. **Describe Your Food**: Type what you ate (e.g., "2 slices of whole wheat toast with avocado")
3. **Add Image** (Optional): Upload a photo for more accurate analysis
4. **Process**: AI analyzes and extracts nutrition data
5. **Auto-Log**: Food entry is automatically added to your daily log

## Example Output

```markdown
# 🍽️ Food Log 2025-07-02

## 🥗 Today's Meals

<div style="background: linear-gradient(135deg, #f8fafc, #f1f5f9); border-radius: 16px; padding: 20px; margin: 16px 0; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid rgba(0,0,0,0.05);">
  <div style="display: flex; align-items: center; margin-bottom: 12px;">
    <span style="font-size: 24px; margin-right: 12px;">🍫</span>
    <div>
      <h3 style="color: #1a202c; margin: 0; font-size: 18px; font-weight: 600;">Dark chocolate with orange 80% cocoa</h3>
      <div style="color: #4a5568; font-size: 14px; margin-top: 4px;">
        <span style="margin-right: 16px;">📏 6 squares</span>
        <span>🕐 12:18 PM</span>
      </div>
    </div>
  </div>
  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px;">
    <div style="text-align: center; padding: 12px; background: linear-gradient(135deg, #fee2e2, #fecaca); border-radius: 10px; border: 1px solid #fca5a5; box-shadow: 0 2px 8px rgba(239, 68, 68, 0.1);">
      <div style="font-size: 20px; margin-bottom: 4px;">🔥</div>
      <div style="color: #b91c1c; font-weight: bold; font-size: 16px;">200</div>
      <div style="color: #dc2626; font-size: 11px; text-transform: uppercase; font-weight: 600;">KCAL</div>
    </div>
    <div style="text-align: center; padding: 12px; background: linear-gradient(135deg, #dcfce7, #bbf7d0); border-radius: 10px; border: 1px solid #86efac; box-shadow: 0 2px 8px rgba(34, 197, 94, 0.1);">
      <div style="font-size: 20px; margin-bottom: 4px;">💪</div>
      <div style="color: #15803d; font-weight: bold; font-size: 16px;">2.5g</div>
      <div style="color: #16a34a; font-size: 11px; text-transform: uppercase; font-weight: 600;">PROTEIN</div>
    </div>
    <div style="text-align: center; padding: 12px; background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 10px; border: 1px solid #fcd34d; box-shadow: 0 2px 8px rgba(251, 191, 36, 0.1);">
      <div style="font-size: 20px; margin-bottom: 4px;">🌾</div>
      <div style="color: #a16207; font-weight: bold; font-size: 16px;">15g</div>
      <div style="color: #d97706; font-size: 11px; text-transform: uppercase; font-weight: 600;">CARBS</div>
    </div>
    <div style="text-align: center; padding: 12px; background: linear-gradient(135deg, #ede9fe, #ddd6fe); border-radius: 10px; border: 1px solid #c4b5fd; box-shadow: 0 2px 8px rgba(168, 85, 247, 0.1);">
      <div style="font-size: 20px; margin-bottom: 4px;">🥑</div>
      <div style="color: #6b21a8; font-weight: bold; font-size: 16px;">15g</div>
      <div style="color: #7c3aed; font-size: 11px; text-transform: uppercase; font-weight: 600;">FAT</div>
    </div>
  </div>
</div>

## 📊 Daily Summary

### 🎯 Totals vs Goals

| Nutrient | Current | Goal | Progress |
|----------|---------|------|----------|
| 🔥 Calories | **200** kcal | 2000 kcal | 🔴⚪⚪⚪⚪⚪⚪⚪⚪⚪ **10%** |
| 💪 Protein | **2.5g** | 150g | ⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪ **2%** |
| 🌾 Carbs | **15g** | 100g | 🔴⚪⚪⚪⚪⚪⚪⚪⚪⚪ **15%** |
| 🥑 Fat | **15g** | 80g | 🔴🔴⚪⚪⚪⚪⚪⚪⚪⚪ **19%** |

### 🏃‍♂️ Overall Progress: 11%

---
*✨ Generated by Nutrition Tracker Plugin*
```

## Development

```bash
# Install dependencies
npm install

# Development build with hot reload
npm run dev

# Production build
npm run build
```

## Requirements

- Obsidian v0.15.0+
- OpenRouter API key
- Internet connection for AI processing

## License

MIT License

## Support

For issues, questions, or feature requests, please create an issue on GitHub. 