import {
  REMOTE_REQUEST_TIMEOUT,
  REMOTE_DATA_URLS,
  REMOTE_STORAGE_KEYS,
} from "./remote-config.js";
import { loadRemoteCollection } from "../utils/remote-json.js";

class PromptsManager {
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
      urls: REMOTE_DATA_URLS.textPrompts,
      storageKey: REMOTE_STORAGE_KEYS.textPrompts,
      requestTimeout: REMOTE_REQUEST_TIMEOUT,
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
      groups.forEach((group) => categories.add(group));
    });
    return Array.from(categories).sort();
  }

  getPromptsPaginated(page = 1, pageSize = 20, filters = {}) {
    const prompts = this.filterPrompts(filters);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return {
      data: prompts.slice(startIndex, endIndex),
      total: prompts.length,
      page,
      pageSize,
      hasMore: endIndex < prompts.length,
    };
  }

  filterPrompts(filters = {}) {
    return this.prompts.filter((prompt) => {
      const groups = Array.isArray(prompt.group) ? prompt.group : [];
      const matchesCategory =
        !filters.category || groups.includes(filters.category);
      const searchTerm = filters.search
        ? filters.search.toLowerCase()
        : "";
      const matchesSearch =
        !searchTerm ||
        prompt.name.toLowerCase().includes(searchTerm) ||
        prompt.description.toLowerCase().includes(searchTerm) ||
        groups.some((group) => group.toLowerCase().includes(searchTerm));
      return matchesCategory && matchesSearch;
    });
  }
}

const promptsManager = new PromptsManager();

export function loadPrompts(forceRefresh) {
  return promptsManager.load(forceRefresh);
}

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

export { promptsManager };
