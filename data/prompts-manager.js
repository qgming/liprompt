// 提示词数据管理器
// 统一管理所有提示词数据源，包括原有的和新增的数据
import { PROMPTS_DATA } from "./prompts.js";
import { MING_PROMPTS } from "./prompts-ming.js";
import { CUSTOM_PROMPTS } from "./prompts-custom.js";

// 合并所有提示词数据
const ALL_PROMPTS = [...PROMPTS_DATA, ...MING_PROMPTS, ...CUSTOM_PROMPTS];

// 创建ID到提示词的映射，提高查询效率
const PROMPTS_MAP = new Map();
ALL_PROMPTS.forEach((prompt) => {
  PROMPTS_MAP.set(prompt.id, prompt);
});

// 数据管理器类
class PromptsManager {
  constructor() {
    this.prompts = ALL_PROMPTS;
    this.promptsMap = PROMPTS_MAP;
  }

  // 获取所有提示词
  getAllPrompts() {
    return this.prompts;
  }

  // 根据ID获取提示词
  getPromptById(id) {
    return this.promptsMap.get(id);
  }

  // 获取所有分类
  getAllCategories() {
    const categories = new Set();
    this.prompts.forEach((prompt) => {
      if (prompt.group && Array.isArray(prompt.group)) {
        prompt.group.forEach((group) => categories.add(group));
      }
    });
    return Array.from(categories).sort();
  }

  // 分页获取提示词
  getPromptsPaginated(page = 1, pageSize = 20, filters = {}) {
    let filteredPrompts = this.prompts;

    // 应用分类过滤
    if (filters.category) {
      filteredPrompts = filteredPrompts.filter(
        (prompt) => prompt.group && prompt.group.includes(filters.category)
      );
    }

    // 应用搜索过滤
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredPrompts = filteredPrompts.filter(
        (prompt) =>
          prompt.name.toLowerCase().includes(searchTerm) ||
          prompt.description.toLowerCase().includes(searchTerm) ||
          (prompt.group &&
            prompt.group.some((g) => g.toLowerCase().includes(searchTerm)))
      );
    }

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return {
      data: filteredPrompts.slice(startIndex, endIndex),
      total: filteredPrompts.length,
      page,
      pageSize,
      hasMore: endIndex < filteredPrompts.length,
    };
  }

  // 添加新的提示词（运行时动态添加）
  addPrompt(prompt) {
    // 检查ID是否已存在
    if (this.promptsMap.has(prompt.id)) {
      console.warn(`提示词ID ${prompt.id} 已存在，将覆盖原有数据`);
    }

    this.prompts.push(prompt);
    this.promptsMap.set(prompt.id, prompt);
    return this;
  }

  // 批量添加提示词
  addPrompts(prompts) {
    prompts.forEach((prompt) => this.addPrompt(prompt));
    return this;
  }

  // 获取数据统计信息
  getStats() {
    const categories = this.getAllCategories();
    const categoryStats = {};

    categories.forEach((category) => {
      categoryStats[category] = this.prompts.filter(
        (prompt) => prompt.group && prompt.group.includes(category)
      ).length;
    });

    return {
      totalPrompts: this.prompts.length,
      totalCategories: categories.length,
      categories: categoryStats,
      originalPrompts: PROMPTS_DATA.length,
      additionalPrompts: ADDITIONAL_PROMPTS.length,
      customPrompts: CUSTOM_PROMPTS.length,
    };
  }
}

// 创建全局实例
const promptsManager = new PromptsManager();

// 导出便捷函数（保持与原有API兼容）
export function getAllPrompts() {
  return promptsManager.getAllPrompts();
}

export function getPromptById(id) {
  return promptsManager.getPromptById(id);
}

export function getAllCategories() {
  return promptsManager.getAllCategories();
}

export function getPromptsPaginated(page, pageSize, filters) {
  return promptsManager.getPromptsPaginated(page, pageSize, filters);
}

// 导出管理器实例，以便进行高级操作
export { promptsManager };

// 导出统计数据
export function getPromptsStats() {
  return promptsManager.getStats();
}
