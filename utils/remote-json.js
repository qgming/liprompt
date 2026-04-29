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

function formatDayKey(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayKey() {
  return formatDayKey(new Date());
}

function normalizeCacheRecord(cached) {
  if (!cached || !Array.isArray(cached.data)) {
    return null;
  }
  const timestamp = typeof cached.timestamp === "number" ? cached.timestamp : 0;
  const fallbackDayKey = timestamp ? formatDayKey(new Date(timestamp)) : "";
  return {
    dayKey: typeof cached.dayKey === "string" && cached.dayKey ? cached.dayKey : fallbackDayKey,
    timestamp,
    data: cached.data,
  };
}

function readStorageCache(storageKey) {
  const cached = uni.getStorageSync(storageKey);
  return normalizeCacheRecord(cached);
}

function writeStorageCache(storageKey, data) {
  uni.setStorageSync(storageKey, {
    dayKey: getTodayKey(),
    timestamp: Date.now(),
    data,
  });
}

function hasTodayCache(cacheRecord) {
  return !!cacheRecord && cacheRecord.dayKey === getTodayKey();
}

function getMemoryCache(storageKey) {
  return normalizeCacheRecord(memoryCache.get(storageKey));
}

function setMemoryCache(storageKey, data) {
  const record = {
    dayKey: getTodayKey(),
    timestamp: Date.now(),
    data,
  };
  memoryCache.set(storageKey, record);
  return record;
}

function requestJson(url, requestTimeout) {
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: "GET",
      timeout: requestTimeout,
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

async function requestJsonWithFallback(urls, requestTimeout) {
  const candidates = Array.isArray(urls) ? urls.filter(Boolean) : [urls].filter(Boolean);
  const errors = [];

  for (const url of candidates) {
    try {
      return await requestJson(url, requestTimeout);
    } catch (error) {
      errors.push({ url, error });
      console.warn(`远程地址加载失败，继续尝试下一个源: ${url}`, error);
    }
  }

  const lastError = errors[errors.length - 1]?.error;
  throw lastError || new Error("远程数据加载失败");
}

function normalizeRequestGroups(requestUrls) {
  if (!Array.isArray(requestUrls)) {
    return [[requestUrls]];
  }

  if (requestUrls.length > 0 && Array.isArray(requestUrls[0])) {
    return requestUrls.map((group) => Array.isArray(group) ? group : [group]);
  }

  return [requestUrls];
}

async function requestCollectionData(requestUrls, requestTimeout) {
  const groups = normalizeRequestGroups(requestUrls);
  const results = await Promise.all(
    groups.map((group) => requestJsonWithFallback(group, requestTimeout))
  );

  if (results.length === 1) {
    return results[0];
  }

  return results.flat();
}

export async function loadRemoteCollection(options) {
  const { url, urls, storageKey, requestTimeout, forceRefresh = false } = options;
  const requestUrls = urls || url;
  if (!requestUrls || (Array.isArray(requestUrls) && !requestUrls.length)) {
    throw new Error("远程数据地址未配置");
  }

  const storageCache = forceRefresh ? null : readStorageCache(storageKey);
  const memoryCacheRecord = forceRefresh ? null : getMemoryCache(storageKey);

  if (!forceRefresh && hasTodayCache(memoryCacheRecord)) {
    return memoryCacheRecord.data;
  }

  if (!forceRefresh && hasTodayCache(storageCache)) {
    memoryCache.set(storageKey, storageCache);
    return storageCache.data;
  }

  try {
    const data = await requestCollectionData(requestUrls, requestTimeout);
    setMemoryCache(storageKey, data);
    writeStorageCache(storageKey, data);
    return data;
  } catch (error) {
    const fallbackCache = storageCache || memoryCacheRecord;
    if (fallbackCache && Array.isArray(fallbackCache.data) && fallbackCache.data.length) {
      memoryCache.set(storageKey, fallbackCache);
      console.warn(`远程加载超时或失败，已回退本地缓存: ${storageKey}`, error);
      return fallbackCache.data;
    }
    throw error;
  }
}
