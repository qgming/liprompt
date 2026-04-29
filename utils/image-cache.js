import { getRawMirrorCandidates, getRawSourceCacheKey, getPreferredRawMirrorUrl } from "./remote-source.js";

const IMAGE_CACHE_STORAGE_KEY = "image_file_cache_v1";
const IMAGE_CACHE_MAX_ENTRIES = 80;
const IMAGE_DOWNLOAD_TIMEOUT = 1000 * 60;

const cacheIndex = new Map();
const pendingTasks = new Map();
let hasLoadedIndex = false;

function loadIndex() {
  if (hasLoadedIndex) {
    return;
  }

  const stored = uni.getStorageSync(IMAGE_CACHE_STORAGE_KEY);
  if (stored && typeof stored === "object") {
    Object.entries(stored).forEach(([url, record]) => {
      if (record && typeof record.savedFilePath === "string") {
        cacheIndex.set(getRawSourceCacheKey(url), {
          savedFilePath: record.savedFilePath,
          timestamp: typeof record.timestamp === "number" ? record.timestamp : 0,
          lastAccessed: typeof record.lastAccessed === "number" ? record.lastAccessed : 0,
        });
      }
    });
  }

  hasLoadedIndex = true;
}

function persistIndex() {
  const output = {};
  cacheIndex.forEach((record, url) => {
    output[url] = record;
  });
  uni.setStorageSync(IMAGE_CACHE_STORAGE_KEY, output);
}

function isRemoteImage(url) {
  return typeof url === "string" && /^https?:\/\//.test(url);
}

function updateAccessTime(cacheKey) {
  const record = cacheIndex.get(cacheKey);
  if (!record) {
    return;
  }
  record.lastAccessed = Date.now();
}

function getCachedImageSync(url) {
  loadIndex();
  if (!isRemoteImage(url)) {
    return url || "";
  }

  const cacheKey = getRawSourceCacheKey(url);
  const record = cacheIndex.get(cacheKey);
  if (!record) {
    return "";
  }

  updateAccessTime(cacheKey);
  return record.savedFilePath;
}

function getFileInfo(filePath) {
  return new Promise((resolve) => {
    uni.getFileInfo({
      filePath,
      success: () => resolve(true),
      fail: () => resolve(false),
    });
  });
}

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    uni.downloadFile({
      url,
      timeout: IMAGE_DOWNLOAD_TIMEOUT,
      success: (result) => {
        if (result.statusCode >= 200 && result.statusCode < 300 && result.tempFilePath) {
          resolve(result.tempFilePath);
          return;
        }
        reject(new Error(`图片下载失败: ${result.statusCode || "unknown"}`));
      },
      fail: reject,
    });
  });
}

function saveImage(tempFilePath) {
  return new Promise((resolve, reject) => {
    uni.saveFile({
      tempFilePath,
      success: (result) => resolve(result.savedFilePath),
      fail: reject,
    });
  });
}

function removeSavedFile(filePath) {
  return new Promise((resolve) => {
    if (!filePath) {
      resolve();
      return;
    }

    uni.removeSavedFile({
      filePath,
      complete: () => resolve(),
    });
  });
}

async function removeCacheEntry(cacheKey, record = cacheIndex.get(cacheKey)) {
  cacheIndex.delete(cacheKey);
  persistIndex();
  if (record?.savedFilePath) {
    await removeSavedFile(record.savedFilePath);
  }
}

async function pruneImageCache() {
  if (cacheIndex.size <= IMAGE_CACHE_MAX_ENTRIES) {
    return;
  }

  const records = [...cacheIndex.entries()].sort((left, right) => {
    return (left[1].lastAccessed || left[1].timestamp || 0) - (right[1].lastAccessed || right[1].timestamp || 0);
  });

  while (records.length && cacheIndex.size > IMAGE_CACHE_MAX_ENTRIES) {
    const [url, record] = records.shift();
    await removeCacheEntry(url, record);
  }
}

async function cacheImage(url) {
  loadIndex();
  if (!isRemoteImage(url)) {
    return url;
  }

  const cacheKey = getRawSourceCacheKey(url);
  if (pendingTasks.has(cacheKey)) {
    return pendingTasks.get(cacheKey);
  }

  const task = (async () => {
    const current = cacheIndex.get(cacheKey);
    if (current?.savedFilePath) {
      const exists = await getFileInfo(current.savedFilePath);
      if (exists) {
        updateAccessTime(cacheKey);
        persistIndex();
        return current.savedFilePath;
      }
      cacheIndex.delete(cacheKey);
      persistIndex();
    }

    const candidates = getRawMirrorCandidates(url, "gitee");
    let lastError = null;

    for (const candidate of candidates) {
      try {
        const tempFilePath = await downloadImage(candidate);
        const savedFilePath = await saveImage(tempFilePath);
        cacheIndex.set(cacheKey, {
          savedFilePath,
          timestamp: Date.now(),
          lastAccessed: Date.now(),
        });
        persistIndex();
        await pruneImageCache();
        return savedFilePath;
      } catch (error) {
        lastError = error;
        console.warn(`图片地址加载失败，继续尝试下一个源: ${candidate}`, error);
      }
    }

    throw lastError || new Error("图片下载失败");
  })()
    .catch((error) => {
      console.warn("图片缓存失败，继续使用远程地址", url, error);
      return getPreferredRawMirrorUrl(url, "gitee");
    })
    .finally(() => {
      pendingTasks.delete(cacheKey);
    });

  pendingTasks.set(cacheKey, task);
  return task;
}

export async function cacheImageBatch(urls = []) {
  const uniqueUrls = [...new Set(urls.filter(Boolean))];
  const resolved = await Promise.all(uniqueUrls.map(async (url) => [url, await cacheImage(url)]));
  return Object.fromEntries(resolved);
}

export { getCachedImageSync };
