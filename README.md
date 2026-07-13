# 🍽️ AI Nutrition Tracker for Obsidian

[![CI](https://github.com/rnaidenov/obsidian-ai-nutrition-tracker-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/rnaidenov/obsidian-ai-nutrition-tracker-plugin/actions/workflows/ci.yml)

Transform your nutrition tracking with AI-powered food analysis. No more tedious forms or manual calculations - just describe what you ate or snap a photo, and let AI handle the rest.

## ✨ What It Does

**Smart Food Logging**: Describe your meals in natural language or upload photos, and AI automatically extracts nutrition data and creates beautiful food logs in your Obsidian vault.

<img width="502" height="756" alt="image" src="https://github.com/user-attachments/assets/1b1f9381-06e5-49b1-a3a8-bc94ee1829ba" />

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

<img width="459" height="218" alt="image" src="https://github.com/user-attachments/assets/42be5f83-82cb-4b2a-a5c9-2819c0054a59" />
<img width="550" height="899" alt="image" src="https://github.com/user-attachments/assets/4fc43c17-9035-4405-a46d-3481e11874f3" />
<img width="410" height="620" alt="image" src="https://github.com/user-attachments/assets/247f53cf-baef-47da-a814-dbd8b07da7ef" />
<img width="455" height="205" alt="image" src="https://github.com/user-attachments/assets/f8d58447-8a6a-4310-8cf8-af8faa910d98" />


### 🤖 AI Analysis
Choose from powerful models like Gemini, Claude 4.5 Sonnet, GPT-5 to analyze your food and extract:
- 🔥 Calories
- 💪 Protein  
- 🌾 Carbohydrates
- 🥑 Fat

## 🎨 Beautiful Food Logs

### Light Theme
<img width="493" height="913" alt="image" src="https://github.com/user-attachments/assets/beb09d9b-1f73-4239-9a81-e85c97fa361b" />


### Dark Theme
<img width="505" height="913" alt="image" src="https://github.com/user-attachments/assets/1df185a9-c17d-45a8-98df-22b4ca3bc77b" />

## 🚀 Getting Started

1. **Install**: Add to your Obsidian plugins folder and enable
2. **Configure**: Set your OpenRouter API key and nutrition goals
3. **Track**: Use the nutrition tracker icon or command palette
4. **Describe**: Type what you ate or upload a photo
5. **Done**: AI creates your food log automatically

## ⚙️ Quick Setup

### Required
- OpenRouter API key (get one at [openrouter.ai](https://openrouter.ai))
- Choose your AI model or choose a custom one from https://openrouter.ai/models 

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

## 🗄️ How Data Is Stored

Your data lives in your vault, in plain JSON — the rendered notes are a view, not the source of truth:

- **Saved meals**: `{meal folder}/meals.json`
- **Daily food logs**: `{log folder}/.data/{YYYY-MM-DD}.json`
- **Rendered notes**: `{log folder}/{YYYY-MM-DD}.md` and one note per saved meal. Both are regenerated from the JSON above whenever you add, edit, or delete something. The generated cards and progress summary live between `%% ntr:begin %%` / `%% ntr:end %%` markers — any text you write above or below that region is preserved across edits.

**⚠️ Since 3.0.0**: editing the food cards or description in a meal note by hand no longer syncs back — meal notes are a one-way render of `meals.json`. Renaming a meal note in the file explorer still updates the meal's name. See [CHANGELOG.md](CHANGELOG.md) for the full list of breaking changes and how upgrading from 2.x works (it's automatic — the plugin migrates your existing food log notes into the JSON store the first time it loads, and backs up each note's original content to `{log folder}/.data/backup-{date}.md` before rewriting it).

## 🎯 Features

- 🤖 Multiple AI models (Claude, GPT, Gemini)
- 📝 Natural language food descriptions
- 📷 Photo analysis for meals
- 🍽️ Save and edit meals for quick reuse
- 🎨 Beautiful card or simple layouts
- 🌙 Light and dark themes
- 📊 Visual progress tracking
- 📁 Automatic file organization

## 📦 Releasing (maintainers)

`release.yml` builds the plugin and publishes a **draft** GitHub release — it's not published as a draft by accident, that's deliberate. Obsidian's community-plugin update mechanism only picks up published releases, so a draft is a safety net: it gives you a chance to sanity-check the build before real users get it.

Before publishing a draft release:
1. Download the draft's `main.js`, `manifest.json`, and `styles.css`
2. Drop them into a test vault's `.obsidian/plugins/ai-nutrition-tracker/` folder
3. Reload Obsidian and run through the core flows for ~5 minutes: log a food entry, edit it, delete it, save a meal, edit a meal item — and if you're testing a vault that has pre-3.0 data, confirm the migration ran cleanly and backups exist under `{log folder}/.data/backup-*.md`
4. Only then publish the release

To cut a release: either push a bare-semver tag (e.g. `3.0.0`, no `v` prefix — it must match `package.json`'s version exactly, or the workflow fails fast) after bumping the version yourself, or trigger the workflow manually from the Actions tab and let it bump the version for you.

---

*Transform your nutrition tracking experience - no more tedious logging, just natural descriptions and beautiful results.* 
<br>
> For issues, questions, or feature requests, please create an issue on GitHub. 
