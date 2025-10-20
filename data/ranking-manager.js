// 排行榜数据管理器
// 统一管理所有排行榜数据，支持多个类别的AI模型排名
import textModelsData from "./model-text.json";
import imageModelsData from "./model-image.json";
import videoModelsData from "./model-video.json";
import visionModelsData from "./model-vision.json";
import webdevModelsData from "./model-webdev.json";

// 合并所有模型数据
const ALL_MODELS_DATA = {
  text: textModelsData.data,
  image: imageModelsData.data,
  video: videoModelsData.data,
  vision: visionModelsData.data,
  webdev: webdevModelsData.data,
};

// 类别配置
const CATEGORY_CONFIG = {
  text: {
    name: "文本",
    icon: "📝",
    color: "#667eea",
    description:
      "查看各类大型语言模型在文本处理中的多功能性、语言精确度及文化语境适应性方面的综合排名。",
  },
  image: {
    name: "图片",
    icon: "🎨",
    color: "#f093fb",
    description:
      "查看各类图像生成模型在艺术创作、图像质量、风格多样性及提示词理解能力方面的专业排名。",
  },
  video: {
    name: "视频",
    icon: "🎬",
    color: "#4facfe",
    description:
      "查看各类视频生成模型在画面连贯性、动作真实性、时间长度控制及技术创新方面的综合排名。",
  },
  vision: {
    name: "视觉",
    icon: "👁️",
    color: "#43e97b",
    description:
      "查看多模态模型在图像理解、视觉问答、场景分析及图文结合能力方面的专业排名。",
  },
  webdev: {
    name: "开发",
    icon: "💻",
    color: "#fa709a",
    description:
      "查看各类模型在代码质量、语言支持、调试能力、文档生成及开发效率方面的专业排名。",
  },
};

// 数据管理器类
class RankingManager {
  constructor() {
    this.modelsData = ALL_MODELS_DATA;
    this.categoryConfig = CATEGORY_CONFIG;
    this.currentCategory = "text";

    // 初始化排行榜数据（按排名排序）
    this.initializeRankings();
  }

  // 初始化排行榜数据
  initializeRankings() {
    Object.keys(this.modelsData).forEach((category) => {
      const models = this.modelsData[category];
      // 按分数和投票数综合排序，分数相同时按投票数排序
      models.sort((a, b) => {
        if (a.score !== b.score) {
          return b.score - a.score;
        }
        return b.votes - a.votes;
      });

      // 重新分配排名（处理同分情况）
      let currentRank = 1;
      models.forEach((model, index) => {
        if (index > 0 && model.score < models[index - 1].score) {
          currentRank = index + 1;
        }
        model.displayRank = currentRank;
      });
    });
  }

  // 获取所有类别配置
  getAllCategories() {
    return Object.keys(this.categoryConfig).map((key) => ({
      key,
      ...this.categoryConfig[key],
    }));
  }

  // 获取当前类别
  getCurrentCategory() {
    return this.currentCategory;
  }

  // 设置当前类别
  setCurrentCategory(category) {
    if (this.modelsData[category]) {
      this.currentCategory = category;
      return true;
    }
    return false;
  }

  // 获取指定类别的排行榜数据
  getRankingData(category = null, page = 1, pageSize = 20) {
    const targetCategory = category || this.currentCategory;
    const models = this.modelsData[targetCategory] || [];

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return {
      category: targetCategory,
      config: this.categoryConfig[targetCategory],
      data: models.slice(startIndex, endIndex),
      total: models.length,
      page,
      pageSize,
      hasMore: endIndex < models.length,
    };
  }

  // 搜索模型
  searchModels(searchTerm, category = null) {
    const targetCategory = category || this.currentCategory;
    const models = this.modelsData[targetCategory] || [];

    if (!searchTerm) return models;

    const term = searchTerm.toLowerCase();
    return models.filter(
      (model) =>
        model.model.toLowerCase().includes(term) ||
        model.organization.toLowerCase().includes(term) ||
        model.license.toLowerCase().includes(term)
    );
  }

  // 获取模型详情
  getModelDetails(modelId, category = null) {
    const targetCategory = category || this.currentCategory;
    const models = this.modelsData[targetCategory] || [];

    return models.find((model) => model.id === modelId);
  }

  // 获取排行榜统计信息
  getRankingStats(category = null) {
    const targetCategory = category || this.currentCategory;
    const models = this.modelsData[targetCategory] || [];

    if (models.length === 0) return null;

    // 统计各组织机构数量
    const organizationStats = {};
    models.forEach((model) => {
      organizationStats[model.organization] =
        (organizationStats[model.organization] || 0) + 1;
    });

    // 统计许可证类型
    const licenseStats = {};
    models.forEach((model) => {
      licenseStats[model.license] = (licenseStats[model.license] || 0) + 1;
    });

    // 获取前3名
    const top3 = models.slice(0, 3);

    return {
      totalModels: models.length,
      organizationStats,
      licenseStats,
      top3,
      averageScore: (
        models.reduce((sum, model) => sum + model.score, 0) / models.length
      ).toFixed(1),
      totalVotes: models.reduce((sum, model) => sum + model.votes, 0),
    };
  }

  // 获取热门模型（按投票数排序）
  getPopularModels(category = null, limit = 10) {
    const targetCategory = category || this.currentCategory;
    const models = this.modelsData[targetCategory] || [];

    return [...models].sort((a, b) => b.votes - a.votes).slice(0, limit);
  }

  // 获取推荐模型（综合评分和投票数）
  getRecommendedModels(category = null, limit = 5) {
    const targetCategory = category || this.currentCategory;
    const models = this.modelsData[targetCategory] || [];

    return [...models]
      .sort((a, b) => {
        const scoreA = a.score + Math.log10(a.votes) * 10;
        const scoreB = b.score + Math.log10(b.votes) * 10;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  // 比较模型
  compareModels(modelIds, category = null) {
    const targetCategory = category || this.currentCategory;
    const models = this.modelsData[targetCategory] || [];

    return modelIds
      .map((id) => models.find((model) => model.id === id))
      .filter(Boolean);
  }

  // 获取组织机构排行榜
  getOrganizationRanking(category = null, limit = 10) {
    const targetCategory = category || this.currentCategory;
    const models = this.modelsData[targetCategory] || [];

    const organizationScores = {};
    models.forEach((model) => {
      if (!organizationScores[model.organization]) {
        organizationScores[model.organization] = {
          name: model.organization,
          totalScore: 0,
          modelCount: 0,
          bestModel: null,
          totalVotes: 0,
        };
      }

      const org = organizationScores[model.organization];
      org.totalScore += model.score;
      org.modelCount += 1;
      org.totalVotes += model.votes;

      if (!org.bestModel || model.score > org.bestModel.score) {
        org.bestModel = model;
      }
    });

    return Object.values(organizationScores)
      .map((org) => ({
        ...org,
        averageScore: (org.totalScore / org.modelCount).toFixed(1),
      }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, limit);
  }
}

// 创建全局实例
const rankingManager = new RankingManager();

// 导出便捷函数
export function getAllCategories() {
  return rankingManager.getAllCategories();
}

export function getRankingData(category, page, pageSize) {
  return rankingManager.getRankingData(category, page, pageSize);
}

export function searchModels(searchTerm, category) {
  return rankingManager.searchModels(searchTerm, category);
}

export function getModelDetails(modelId, category) {
  return rankingManager.getModelDetails(modelId, category);
}

export function getRankingStats(category) {
  return rankingManager.getRankingStats(category);
}

export function getPopularModels(category, limit) {
  return rankingManager.getPopularModels(category, limit);
}

export function getRecommendedModels(category, limit) {
  return rankingManager.getRecommendedModels(category, limit);
}

export function compareModels(modelIds, category) {
  return rankingManager.compareModels(modelIds, category);
}

export function getOrganizationRanking(category, limit) {
  return rankingManager.getOrganizationRanking(category, limit);
}

export function setCurrentCategory(category) {
  return rankingManager.setCurrentCategory(category);
}

export function getCurrentCategory() {
  return rankingManager.getCurrentCategory();
}

// 导出管理器实例
export { rankingManager };

// 导出类别配置
export { CATEGORY_CONFIG };
