import {
  REMOTE_REQUEST_TIMEOUT,
  REMOTE_DATA_URLS,
  REMOTE_STORAGE_KEYS,
} from "./remote-config.js";
import { loadRemoteCollection } from "../utils/remote-json.js";
import { getPreferredRawMirrorUrl } from "../utils/remote-source.js";

const ALL_CATEGORY = "全部";
const FEATURED_CATEGORY = "精选";
const LEGACY_IMAGE_CATEGORY = "图片提示";

function uniqueById(prompts = []) {
  const seen = new Set();
  return prompts.filter((prompt) => {
    if (!prompt?.id) {
      return true;
    }
    if (seen.has(prompt.id)) {
      return false;
    }
    seen.add(prompt.id);
    return true;
  });
}

function normalizeCategoryName(category) {
  return typeof category === "string" ? category.replace(/案例/g, "").trim() : "";
}

function getPrimaryCategory(groups = []) {
  return groups.find((item) => item !== FEATURED_CATEGORY) || groups[0] || "";
}

class ImagePromptsManager {
  constructor() {
    this.prompts = [];
    this.promptsMap = new Map();
    this.loadingPromise = null;
  }

  setPrompts(prompts) {
    this.prompts = Array.isArray(prompts)
      ? uniqueById(prompts.map((prompt) => this.normalizePrompt(prompt)))
      : [];
    this.promptsMap = new Map(this.prompts.map((prompt) => [prompt.id, prompt]));
  }

  normalizePrompt(prompt = {}) {
    const group = Array.isArray(prompt.group)
      ? prompt.group
          .map((item) => normalizeCategoryName(item))
          .filter((item) => item && item !== LEGACY_IMAGE_CATEGORY)
      : [];
    const normalizedSection = normalizeCategoryName(prompt.section);
    const section =
      getPrimaryCategory(group) ||
      normalizedSection ||
      "";
    const sourceImages =
      Array.isArray(prompt.images) && prompt.images.length
        ? prompt.images
        : prompt.coverImage
          ? [prompt.coverImage]
          : [];
    const images = Array.from(
      new Set(
        sourceImages
          .map((image) => getPreferredRawMirrorUrl(image, "gitee"))
          .filter(Boolean)
      )
    );

    return {
      ...prompt,
      group,
      promptType: "image",
      section,
      coverImage:
        images[0] || getPreferredRawMirrorUrl(prompt.coverImage, "gitee"),
      images,
    };
  }

  async load(forceRefresh = false) {
    if (this.prompts.length && !forceRefresh) {
      return this.prompts;
    }
    if (this.loadingPromise && !forceRefresh) {
      return this.loadingPromise;
    }
    this.loadingPromise = loadRemoteCollection({
      urls: REMOTE_DATA_URLS.imagePrompts,
      storageKey: REMOTE_STORAGE_KEYS.imagePrompts,
      requestTimeout: REMOTE_REQUEST_TIMEOUT,
      forceRefresh,
      mergeSources: true,
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
    const orderedCategories = Array.from(categories);
    const categoriesWithoutFeatured = orderedCategories.filter(
      (category) => category !== FEATURED_CATEGORY
    );
    return categories.has(FEATURED_CATEGORY)
      ? [ALL_CATEGORY, FEATURED_CATEGORY, ...categoriesWithoutFeatured]
      : [ALL_CATEGORY, ...categoriesWithoutFeatured];
  }

  getPromptsPaginated(page = 1, pageSize = 12, filters = {}) {
    const prompts = this.sortPromptsForDisplay(this.filterPrompts(filters), filters);
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
        filters.category === ALL_CATEGORY ||
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

  sortPromptsForDisplay(prompts = [], filters = {}) {
    if (filters.category && filters.category !== ALL_CATEGORY) {
      return prompts;
    }

    const categories = this.getAllCategories().slice(1);
    const categoryOrderMap = new Map(
      categories.map((category, index) => [category, index])
    );

    return prompts.slice().sort((left, right) => {
      const leftIndex = this.getPromptCategoryOrder(left, categoryOrderMap);
      const rightIndex = this.getPromptCategoryOrder(right, categoryOrderMap);
      return leftIndex - rightIndex;
    });
  }

  getPromptCategoryOrder(prompt = {}, categoryOrderMap = new Map()) {
    const groups = Array.isArray(prompt.group) ? prompt.group : [];
    const category = getPrimaryCategory(groups) || prompt.section || "";
    return categoryOrderMap.has(category)
      ? categoryOrderMap.get(category)
      : Number.MAX_SAFE_INTEGER;
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
