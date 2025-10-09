/**
 * API配置中心
 * 统一管理所有数据接口地址，支持多服务器自动切换
 */

// 多个备用API服务器
const API_SERVERS = [
  "https://api.yanyua.icu",
  "https://60s.qgming.com",
  "https://60api.09cdn.xyz",
  "https://60s.7se.cn",
  "https://60s.crystelf.top",
];

// 各渠道API路径配置
const API_PATHS = {
  // 60秒新闻
  "60s": "/v2/60s",

  // 哔哩哔哩热搜
  bilibili: "/v2/bili",

  // 抖音热搜
  douyin: "/v2/douyin",

  // 微博热搜
  weibo: "/v2/weibo",

  // 小红书热搜
  xiaohongshu: "/v2/rednote",

  // 知乎话题榜
  zhihu: "/v2/zhihu",

  // 历史上的今天
  history: "/v2/today-in-history",

  // 头条热搜
  toutiao: "/v2/toutiao",
};

// 各渠道信息配置
const CHANNEL_INFO = {
  // 60秒新闻
  "60s": {
    name: "60秒读懂世界",
    description: "每日精选 · 全球要闻",
  },

  // 哔哩哔哩热搜
  bilibili: {
    name: "哔哩哔哩热搜",
    description: "【实时】热门话题 · 全网关注",
  },

  // 抖音热搜
  douyin: {
    name: "抖音热搜",
    description: "【实时】热门话题 · 全网关注",
  },

  // 微博热搜
  weibo: {
    name: "微博热搜",
    description: "【实时】热门话题 · 全网关注",
  },

  // 小红书热搜
  xiaohongshu: {
    name: "小红书热搜",
    description: "【实时】热门话题 · 全网关注",
  },

  // 知乎话题榜
  zhihu: {
    name: "知乎话题榜",
    description: "【实时】热门话题 · 全网关注",
  },

  // 历史上的今天
  history: {
    name: "历史上的今天",
    description: "回顾历史 · 启迪未来",
  },

  // 头条热搜
  toutiao: {
    name: "头条热搜",
    description: "【实时】头条热搜榜",
  },
};

// 当前使用的服务器索引
let currentServerIndex = 0;

// 服务器健康状态记录
const serverHealth = new Map();

// 导出配置
export default {
  API_SERVERS,
  API_PATHS,
  CHANNEL_INFO,
};

// 导出服务器列表
export { API_SERVERS };

// 获取当前服务器
export const getCurrentServer = () => {
  return API_SERVERS[currentServerIndex];
};

// 切换到下一个服务器
export const switchToNextServer = () => {
  currentServerIndex = (currentServerIndex + 1) % API_SERVERS.length;
  console.log(`切换到服务器: ${API_SERVERS[currentServerIndex]}`);
  return getCurrentServer();
};

// 标记服务器状态
export const markServerStatus = (serverUrl, isHealthy) => {
  serverHealth.set(serverUrl, {
    isHealthy,
    lastChecked: Date.now(),
  });
};

// 获取API地址（带自动重试）
export const getApiUrl = async (channel, retryCount = 0) => {
  const maxRetries = API_SERVERS.length - 1;

  if (retryCount > maxRetries) {
    throw new Error(`所有服务器都不可用，无法获取 ${channel} 的数据`);
  }

  const server = getCurrentServer();
  const path = API_PATHS[channel];

  if (!path) {
    throw new Error(`未知的渠道: ${channel}`);
  }

  const url = `${server}${path}`;

  // 检查服务器健康状态
  const healthInfo = serverHealth.get(server);
  if (healthInfo && !healthInfo.isHealthy) {
    // 服务器不健康，切换到下一个
    switchToNextServer();
    return getApiUrl(channel, retryCount + 1);
  }

  return url;
};

// 测试服务器连通性
export const testServerConnectivity = async (serverUrl) => {
  try {
    const testUrl = `${serverUrl}/60s`;
    const response = await uni.request({
      url: testUrl,
      method: "GET",
      timeout: 5000,
    });

    const isHealthy = response.statusCode === 200;
    markServerStatus(serverUrl, isHealthy);
    return isHealthy;
  } catch (error) {
    markServerStatus(serverUrl, false);
    return false;
  }
};

// 健康检查所有服务器
export const healthCheckAllServers = async () => {
  const results = [];

  for (const server of API_SERVERS) {
    const isHealthy = await testServerConnectivity(server);
    results.push({ server, isHealthy });
  }

  return results;
};

// 获取最佳服务器（健康检查后选择）
export const getBestServer = async () => {
  const results = await healthCheckAllServers();
  const healthyServers = results.filter((result) => result.isHealthy);

  if (healthyServers.length === 0) {
    throw new Error("没有可用的服务器");
  }

  // 选择第一个健康的服务器
  const bestServer = healthyServers[0].server;
  currentServerIndex = API_SERVERS.indexOf(bestServer);
  return bestServer;
};

// 导出获取渠道信息的方法
export const getChannelInfo = (channel) => {
  return CHANNEL_INFO[channel] || null;
};

// 导出所有渠道列表
export const getAllChannels = () => {
  return Object.keys(API_PATHS);
};

// 导出渠道名称映射
export const getChannelName = (channel) => {
  return CHANNEL_INFO[channel]?.name || channel;
};

// 获取完整的API配置
export const getApiConfig = (channel) => {
  const info = getChannelInfo(channel);
  const path = API_PATHS[channel];
  const server = getCurrentServer();

  if (!info || !path) {
    return null;
  }

  return {
    ...info,
    url: `${server}${path}`,
    path,
    server,
  };
};
