const memoryCache = new Map();

function normalizePayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.items)) {
    return payload.items;
  }
  return [];
}

function readStorageCache(storageKey, maxAge) {
  const cached = uni.getStorageSync(storageKey);
  if (!cached || !Array.isArray(cached.data)) {
    return null;
  }
  if (Date.now() - cached.timestamp > maxAge) {
    return null;
  }
  return cached.data;
}

function writeStorageCache(storageKey, data) {
  uni.setStorageSync(storageKey, {
    timestamp: Date.now(),
    data,
  });
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: "GET",
      timeout: 15000,
      success: (response) => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(normalizePayload(response.data));
          return;
        }
        reject(new Error(`请求失败: ${response.statusCode}`));
      },
      fail: (error) => reject(error),
    });
  });
}

export async function loadRemoteCollection(options) {
  const { url, storageKey, maxAge, forceRefresh = false } = options;
  if (!url) {
    throw new Error("远程数据地址未配置");
  }

  if (!forceRefresh && memoryCache.has(storageKey)) {
    return memoryCache.get(storageKey);
  }

  const cached = forceRefresh ? null : readStorageCache(storageKey, maxAge);
  if (cached) {
    memoryCache.set(storageKey, cached);
    return cached;
  }

  const data = await requestJson(url);
  memoryCache.set(storageKey, data);
  writeStorageCache(storageKey, data);
  return data;
}
