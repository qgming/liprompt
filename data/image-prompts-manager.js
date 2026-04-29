import {
  REMOTE_CACHE_MAX_AGE,
  REMOTE_DATA_URLS,
  REMOTE_STORAGE_KEYS,
} from "./remote-config.js";
import { loadRemoteCollection } from "../utils/remote-json.js";

class ImagePromptsManager {
  constructor() {
    this.prompts = [];
    this.promptsMap = new Map();
    this.loadingPromise = null;
  }

  setPrompts(prompts) {
    this.prompts = Array.isArray(prompts) ? prompts : [];
    this.promptsMap = new Map(this.prompts.map((prompt) => [prompt.id, prompt]));
  }

  async load(forceRefresh = false) {
    if (this.prompts.length && !forceRefresh) {
      return this.prompts;
    }
    if (this.loadingPromise && !forceRefresh) {
      return this.loadingPromise;
    }
    this.loadingPromise = loadRemoteCollection({
      url: REMOTE_DATA_URLS.imagePrompts,
      storageKey: REMOTE_STORAGE_KEYS.imagePrompts,
      maxAge: REMOTE_CACHE_MAX_AGE,
      forceRefresh,
    }).then((prompts) => {
      this.setPrompts(prompts);
      this.loadingPromise = null;
      return this.prompts;
    }).catch((error) => {
      this.loadingPromise = null;
      throw error;
    });
    return this.loadingPromise;
  }

  getAllPrompts() {
    return this.prompts;
  }

  getPromptById(id) {
    return this.promptsMap.get(id);
  }

  getAllCategories() {
    const categories = new Set();
    this.prompts.forEach((prompt) => {
      const groups = Array.isArray(prompt.group) ? prompt.group : [];
      groups.forEach((group) => {
        if (group !== "图片提示") {
          categories.add(group);
        }
      });
    });
    return ["全部", ...Array.from(categories)];
  }

  getPromptsPaginated(page = 1, pageSize = 12, filters = {}) {
    const prompts = this.filterPrompts(filters);
    const startIndex = (page - 1) * pageSize;
    return {
      data: prompts.slice(startIndex, startIndex + pageSize),
      total: prompts.length,
      hasMore: startIndex + pageSize < prompts.length,
    };
  }

  filterPrompts(filters = {}) {
    return this.prompts.filter((prompt) => {
      const groups = Array.isArray(prompt.group) ? prompt.group : [];
      const matchesCategory =
        !filters.category ||
        filters.category === "全部" ||
        groups.includes(filters.category);
      const searchTerm = filters.search
        ? filters.search.trim().toLowerCase()
        : "";
      const matchesSearch =
        !searchTerm ||
        [prompt.name, prompt.description, prompt.prompt, prompt.author]
          .filter(Boolean)
          .some((item) => item.toLowerCase().includes(searchTerm));
      return matchesCategory && matchesSearch;
    });
  }
}

const imagePromptsManager = new ImagePromptsManager();

export function loadImagePrompts(forceRefresh) {
  return imagePromptsManager.load(forceRefresh);
}

export function getAllImagePrompts() {
  return imagePromptsManager.getAllPrompts();
}

export function getImagePromptById(id) {
  return imagePromptsManager.getPromptById(id);
}

export function getImageCategories() {
  return imagePromptsManager.getAllCategories();
}

export function getImagePromptsPaginated(page, pageSize, filters) {
  return imagePromptsManager.getPromptsPaginated(page, pageSize, filters);
}

export { imagePromptsManager };
