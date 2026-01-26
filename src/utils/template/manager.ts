import { TFile, normalizePath } from 'obsidian';
import { PluginContext } from '../../types/plugin-context';
import { Template, TemplateType } from './engine';
import * as FileUtils from '../file';

export async function loadTemplate(
  ctx: PluginContext,
  templateName: string
): Promise<Template | null> {
  const templatePath = normalizePath(`${ctx.settings.templatesPath}/${templateName}.md`);
  const file = ctx.vault.getAbstractFileByPath(templatePath);

  if (!(file instanceof TFile)) return null;

  const content = await ctx.vault.read(file);
  return parseTemplate(templateName, content);
}

export function parseTemplate(name: string, content: string): Template {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const body = frontmatterMatch[2];

    const typeMatch = frontmatter.match(/type:\s*(.+)/);
    const descMatch = frontmatter.match(/description:\s*(.+)/);

    return {
      name,
      type: (typeMatch?.[1] as TemplateType) || 'simple-text',
      content: body,
      description: descMatch?.[1]
    };
  }

  return { name, type: 'simple-text', content };
}

export async function listTemplates(ctx: PluginContext): Promise<string[]> {
  const files = ctx.vault.getFiles().filter(f =>
    f.path.startsWith(ctx.settings.templatesPath) && f.extension === 'md'
  );
  return files.map(f => f.basename);
}

export async function createDefaultTemplates(ctx: PluginContext): Promise<void> {
  await FileUtils.ensureDirectoryExists(ctx, ctx.settings.templatesPath);

  const templates = [
    {
      name: 'classic-html',
      content: `---
type: classic-html
description: Original HTML layout with cards and progress bars
---

This template uses the classic HTML card layout with meal categories.
`
    },
    {
      name: 'simple-list',
      content: `---
type: simple-text
description: Simple bullet list grouped by meal category
---

# 🍽️ Food Log {{date}}

{{#each_category}}
## {{category_emoji}} {{category_name}}

{{category_items}}

**Category Total:** {{category_calories}} kcal | P: {{category_protein}}g | C: {{category_carbs}}g | F: {{category_fat}}g

{{/each_category}}

---

## 📊 Daily Totals

- 🔥 **Calories:** {{total_calories}} / {{goal_calories}} kcal
- 🥩 **Protein:** {{total_protein}} / {{goal_protein}}g
- 🍚 **Carbs:** {{total_carbs}} / {{goal_carbs}}g
- 🥑 **Fat:** {{total_fat}} / {{goal_fat}}g
`
    },
    {
      name: 'yaml-tracking',
      content: `---
type: yaml-frontmatter
description: YAML frontmatter for Dataview queries with simple body
---

# Food Log {{date}}

{{#each_category}}
### {{category_emoji}} {{category_name}}

{{category_items}}

{{/each_category}}

---
**Daily Totals:** {{total_calories}} kcal | P: {{total_protein}}g | C: {{total_carbs}}g | F: {{total_fat}}g
`
    }
  ];

  for (const template of templates) {
    const path = normalizePath(`${ctx.settings.templatesPath}/${template.name}.md`);
    const exists = ctx.vault.getAbstractFileByPath(path);
    if (!exists) {
      await ctx.vault.create(path, template.content);
    }
  }
}
