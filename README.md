# 🍽️ AI Nutrition Tracker for Obsidian

Transform your nutrition tracking with AI-powered food analysis. No more tedious forms or manual calculations - just describe what you ate or snap a photo, and let AI handle the rest.

## ✨ What It Does

**Smart Food Logging**: Describe your meals in natural language or upload photos, and AI automatically extracts nutrition data and creates beautiful food logs in your Obsidian vault.

### 📝 Text Input
```
"2 slices whole wheat toast with avocado and a cup of coffee"
"Large Caesar salad with grilled chicken"
"Homemade chocolate chip cookies, about 3 medium ones"
```

### 📷 Image Input
Upload photos of your meals for visual analysis - perfect for complex dishes or when you want extra accuracy.

### 🍽️ Saved Meals
Save your favorite meals for quick reuse! Perfect for:
- Daily breakfast routines
- Regular lunch orders
- Frequent snacks
- Meal prep portions

Create a meal once, then add it to future logs with a single click.

### 🤖 AI Analysis
Choose from powerful models like Claude 3.5 Sonnet, GPT-4, or Gemini to analyze your food and extract:
- 🔥 Calories
- 💪 Protein  
- 🌾 Carbohydrates
- 🥑 Fat

## 🎨 Beautiful Food Logs

### Card Layout (Light Theme)
<div style="background: linear-gradient(135deg, #f8fafc, #f1f5f9); border-radius: 16px; padding: 20px; margin: 16px 0; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
  <div style="display: flex; align-items: center; margin-bottom: 12px;">
    <span style="font-size: 24px; margin-right: 12px;">🥗</span>
    <div>
      <h3 style="color: #1a202c; margin: 0; font-size: 18px; font-weight: 600;">Grilled Chicken Caesar Salad</h3>
      <div style="color: #4a5568; font-size: 14px; margin-top: 4px;">
        <span style="margin-right: 16px;">📏 1 large bowl</span>
        <span>🕐 1:30 PM</span>
      </div>
    </div>
  </div>
  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
    <div style="text-align: center; padding: 12px; background: linear-gradient(135deg, #fee2e2, #fecaca); border-radius: 10px;">
      <div style="font-size: 20px; margin-bottom: 4px;">🔥</div>
      <div style="color: #b91c1c; font-weight: bold;">450</div>
      <div style="color: #dc2626; font-size: 11px;">KCAL</div>
    </div>
    <div style="text-align: center; padding: 12px; background: linear-gradient(135deg, #dcfce7, #bbf7d0); border-radius: 10px;">
      <div style="font-size: 20px; margin-bottom: 4px;">💪</div>
      <div style="color: #15803d; font-weight: bold;">35g</div>
      <div style="color: #16a34a; font-size: 11px;">PROTEIN</div>
    </div>
    <div style="text-align: center; padding: 12px; background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 10px;">
      <div style="font-size: 20px; margin-bottom: 4px;">🌾</div>
      <div style="color: #a16207; font-weight: bold;">12g</div>
      <div style="color: #d97706; font-size: 11px;">CARBS</div>
    </div>
    <div style="text-align: center; padding: 12px; background: linear-gradient(135deg, #ede9fe, #ddd6fe); border-radius: 10px;">
      <div style="font-size: 20px; margin-bottom: 4px;">🥑</div>
      <div style="color: #6b21a8; font-weight: bold;">28g</div>
      <div style="color: #7c3aed; font-size: 11px;">FAT</div>
    </div>
  </div>
</div>

### Card Layout (Dark Theme)
<div style="background: linear-gradient(135deg, #2d3748, #4a5568); border-radius: 16px; padding: 20px; margin: 16px 0; box-shadow: 0 8px 32px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);">
  <div style="display: flex; align-items: center; margin-bottom: 12px;">
    <span style="font-size: 24px; margin-right: 12px;">🥗</span>
    <div>
      <h3 style="color: #f7fafc; margin: 0; font-size: 18px; font-weight: 600;">Grilled Chicken Caesar Salad</h3>
      <div style="color: #a0aec0; font-size: 14px; margin-top: 4px;">
        <span style="margin-right: 16px;">📏 1 large bowl</span>
        <span>🕐 1:30 PM</span>
      </div>
    </div>
  </div>
  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
    <div style="text-align: center; padding: 12px; background: rgba(254, 226, 226, 0.1); border-radius: 10px; border: 1px solid rgba(254, 226, 226, 0.2);">
      <div style="font-size: 20px; margin-bottom: 4px;">🔥</div>
      <div style="color: #fed7d7; font-weight: bold;">450</div>
      <div style="color: #fc8181; font-size: 11px;">KCAL</div>
    </div>
    <div style="text-align: center; padding: 12px; background: rgba(220, 252, 231, 0.1); border-radius: 10px; border: 1px solid rgba(220, 252, 231, 0.2);">
      <div style="font-size: 20px; margin-bottom: 4px;">💪</div>
      <div style="color: #c6f6d5; font-weight: bold;">35g</div>
      <div style="color: #68d391; font-size: 11px;">PROTEIN</div>
    </div>
    <div style="text-align: center; padding: 12px; background: rgba(254, 243, 199, 0.1); border-radius: 10px; border: 1px solid rgba(254, 243, 199, 0.2);">
      <div style="font-size: 20px; margin-bottom: 4px;">🌾</div>
      <div style="color: #faf089; font-weight: bold;">12g</div>
      <div style="color: #f6e05e; font-size: 11px;">CARBS</div>
    </div>
    <div style="text-align: center; padding: 12px; background: rgba(237, 233, 254, 0.1); border-radius: 10px; border: 1px solid rgba(237, 233, 254, 0.2);">
      <div style="font-size: 20px; margin-bottom: 4px;">🥑</div>
      <div style="color: #d6bcfa; font-weight: bold;">28g</div>
      <div style="color: #b794f6; font-size: 11px;">FAT</div>
    </div>
  </div>
</div>

### Simple Layout
```markdown
### 🥗 Grilled Chicken Caesar Salad
**1 large bowl** ・ 🕐 1:30 PM
🔥 450 kcal ・ 💪 35g protein ・ 🌾 12g carbs ・ 🥑 28g fat
```

## 📊 Daily Progress Tracking

Track your nutrition goals with visual progress bars:

| Nutrient | Current | Goal | Progress |
|----------|---------|------|----------|
| 🔥 Calories | **1,450** kcal | 2000 kcal | 🔴🔴🔴🔴🔴🔴🔴⚪⚪⚪ **73%** |
| 💪 Protein | **89g** | 150g | 🔴🔴🔴🔴🔴🔴⚪⚪⚪⚪ **59%** |
| 🌾 Carbs | **156g** | 200g | 🔴🔴🔴🔴🔴🔴🔴🔴⚪⚪ **78%** |
| 🥑 Fat | **67g** | 80g | 🔴🔴🔴🔴🔴🔴🔴🔴⚪⚪ **84%** |

## 🚀 Getting Started

1. **Install**: Add to your Obsidian plugins folder and enable
2. **Configure**: Set your OpenRouter API key and nutrition goals
3. **Track**: Use the nutrition tracker icon or command palette
4. **Describe**: Type what you ate or upload a photo
5. **Done**: AI creates your food log automatically

## ⚙️ Quick Setup

### Required
- OpenRouter API key (get one at [openrouter.ai](https://openrouter.ai))
- Choose your AI model (Claude 3.5 Sonnet recommended)

### Optional
- Set daily nutrition goals
- Pick progress bar style (Emoji dots, Modern bars, or Percentage)

## 💡 Usage Tips

**Text Input Works Best With:**
- Specific portions: "2 slices", "1 cup", "large bowl"
- Cooking methods: "grilled", "baked", "fried"
- Brand names: "Cheerios", "Starbucks latte"

**Image Input Perfect For:**
- Restaurant meals
- Complex homemade dishes
- Packaged foods with labels
- When you want extra accuracy

**Saved Meals Save Time:**
- Save meals you eat regularly
- Edit saved meals to adjust portions
- Quickly log repeated meals without re-describing them
- Perfect for meal prep and routine eating

## 🎯 Features

- 🤖 Multiple AI models (Claude, GPT, Gemini)
- 📝 Natural language food descriptions
- 📷 Photo analysis for meals
- 🍽️ Save and edit meals for quick reuse
- 🎨 Beautiful card or simple layouts
- 🌙 Light and dark themes
- 📊 Visual progress tracking
- 📁 Automatic file organization

---

*Transform your nutrition tracking experience - no more tedious logging, just natural descriptions and beautiful results.* 
For issues, questions, or feature requests, please create an issue on GitHub. 