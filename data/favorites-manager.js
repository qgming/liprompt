const FAVORITES_STORAGE_KEY = "liprompt_favorites";
export const FAVORITES_CHANGED_EVENT = "liprompt:favorites-changed";

class FavoritesManager {
  constructor() {
    this.favorites = [];
    this.favoriteMap = new Map();
    this.loaded = false;
  }

  ensureLoaded() {
    if (this.loaded) {
      return;
    }
    this.load();
  }

  load() {
    try {
      const stored = uni.getStorageSync(FAVORITES_STORAGE_KEY);
      this.setFavorites(stored);
    } catch (error) {
      console.error("读取收藏失败:", error);
      this.setFavorites([]);
    }
    this.loaded = true;
  }

  setFavorites(favorites) {
    const normalizedFavorites = Array.isArray(favorites)
      ? favorites
          .map((favorite) => this.normalizeFavorite(favorite))
          .filter((favorite) => favorite && favorite.id)
      : [];

    normalizedFavorites.sort((left, right) => {
      return (right.createdAt || 0) - (left.createdAt || 0);
    });

    this.favorites = normalizedFavorites;
    this.favoriteMap = new Map(
      normalizedFavorites.map((favorite) => [favorite.id, favorite])
    );
  }

  save() {
    uni.setStorageSync(FAVORITES_STORAGE_KEY, this.favorites);
  }

  emitChange() {
    if (typeof uni.$emit === "function") {
      uni.$emit(FAVORITES_CHANGED_EVENT, {
        favorites: this.favorites.slice(),
      });
    }
  }

  normalizeFavorite(prompt = {}) {
    const promptType = prompt.promptType === "image" ? "image" : "text";

    return {
      id: prompt.id || "",
      promptType,
      name: prompt.name || "未命名提示词",
      description: prompt.description || "",
      prompt: prompt.prompt || "",
      emoji: prompt.emoji || "",
      group: Array.isArray(prompt.group) ? prompt.group.slice(0, 4) : [],
      author: prompt.author || "",
      section: prompt.section || "",
      coverImage: prompt.coverImage || "",
      createdAt: prompt.createdAt || Date.now(),
    };
  }

  getAllFavorites() {
    this.ensureLoaded();
    return this.favorites.slice();
  }

  refreshFavorites() {
    this.load();
    return this.favorites.slice();
  }

  getFavoritesByType(promptType) {
    this.ensureLoaded();
    return this.favorites.filter((favorite) => favorite.promptType === promptType);
  }

  getFavoriteCount() {
    this.ensureLoaded();
    return this.favorites.length;
  }

  isFavorite(id) {
    this.ensureLoaded();
    return this.favoriteMap.has(id);
  }

  toggle(prompt = {}) {
    this.ensureLoaded();
    if (!prompt.id) {
      return {
        isFavorite: false,
        favorites: this.favorites,
      };
    }

    if (this.favoriteMap.has(prompt.id)) {
      this.setFavorites(
        this.favorites.filter((favorite) => favorite.id !== prompt.id)
      );
      this.save();
      this.emitChange();
      return {
        isFavorite: false,
        favorites: this.favorites.slice(),
      };
    }

    const nextFavorite = this.normalizeFavorite(prompt);
    this.setFavorites([nextFavorite, ...this.favorites]);
    this.save();
    this.emitChange();
    return {
      isFavorite: true,
      favorites: this.favorites.slice(),
    };
  }
}

const favoritesManager = new FavoritesManager();

export function getAllFavorites() {
  return favoritesManager.getAllFavorites();
}

export function refreshFavorites() {
  return favoritesManager.refreshFavorites();
}

export function getFavoritesByType(promptType) {
  return favoritesManager.getFavoritesByType(promptType);
}

export function getFavoriteCount() {
  return favoritesManager.getFavoriteCount();
}

export function isFavoritePrompt(id) {
  return favoritesManager.isFavorite(id);
}

export function toggleFavoritePrompt(prompt) {
  return favoritesManager.toggle(prompt);
}

export { favoritesManager };
