<template>
  <view class="container">
    <!-- 简洁标题 -->
    <view class="header">
      <view class="title-section">
        <text class="logo-text">60秒新闻</text>
        <text class="subtitle">每日精选 · 全球要闻</text>
      </view>
      <button class="share-btn" open-type="share">
        <text class="share-icon">↗</text>
        <text class="share-text">分享</text>
      </button>
    </view>

    <!-- 提示信息 -->
    <view class="tip" v-if="newsData && newsData.tip">
      <text>{{ newsData.tip }}</text>
    </view>

    <!-- 新闻列表 -->
    <view class="news-list" v-if="newsData && newsData.news">
      <view class="news-item" v-for="(item, index) in newsData.news" :key="index">
        <text class="news-index">{{ index + 1 }}</text>
        <text class="news-content">{{ item }}</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view class="loading" v-if="loading">
      <text>正在获取最新新闻...</text>
    </view>

    <!-- 错误状态 -->
    <view class="error" v-if="error">
      <text>{{ error }}</text>
      <button class="retry-btn" @click="fetchNews">重新获取</button>
    </view>

    <!-- 日期信息 -->
    <view class="date-info" v-if="newsData">
      <text class="date">{{ newsData.date }}</text>
      <text class="day-of-week">{{ newsData.day_of_week }}</text>
      <text class="lunar-date">{{ newsData.lunar_date }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getApiUrl, getCurrentServer, markServerStatus } from '../../config/apiConfig.js'

const newsData = ref(null)
const loading = ref(false)
const error = ref('')

const fetchNews = async () => {
  loading.value = true
  error.value = ''

  try {
    // 获取API地址（支持自动重试）
    const apiUrl = await getApiUrl('60s')

    const response = await uni.request({
      url: apiUrl,
      method: 'GET',
      data: {
        encoding: 'json'
      },
      timeout: 10000
    })

    if (response.statusCode === 200 && response.data.code === 200) {
      newsData.value = response.data.data
      // 标记当前服务器为健康状态
      markServerStatus(getCurrentServer(), true)
    } else {
      // 标记当前服务器为不健康状态
      markServerStatus(getCurrentServer(), false)
      throw new Error(response.data?.message || '获取数据失败')
    }
  } catch (err) {
    // 标记当前服务器为不健康状态
    markServerStatus(getCurrentServer(), false)
    error.value = err.message || '网络请求失败，请检查网络连接'
    console.error('获取新闻数据失败:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchNews()
})
</script>

<script>
// 微信小程序分享配置 - 单独使用选项式API导出
export default {
  onShareAppMessage() {
    return {
      title: '60秒新闻 - 每日精选全球要闻',
      path: '/pages/60s/index'
    }
  }
}
</script>

<style>
.container {
  width: 100vw;
  min-height: 100vh;
  margin: 0;
  padding: 40rpx 30rpx;
  background: #f5f5f5;
  box-sizing: border-box;
  font-family: 'Times New Roman', Times, serif;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 40rpx;
  padding-bottom: 20rpx;
  border-bottom: 2px solid #000000;
  /* 加粗黑色分隔线 */
}

.title-section {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
}

.logo-text {
  font-size: 56rpx;
  font-weight: 900;
  color: #000000;
  margin-bottom: 8rpx;
  text-transform: uppercase;
  /* 大写字母 */
  letter-spacing: 2rpx;
  /* 字母间距 */
}

.subtitle {
  font-size: 24rpx;
  color: #333333;
  font-weight: 400;
  font-style: italic;
  /* 斜体 */
}

.share-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #000000;
  color: #ffffff;
  border: 1px solid #000000;
  border-radius: 0;
  padding: 12rpx 20rpx;
  min-width: 80rpx;
  height: auto;
  margin: 0;
  line-height: 1;
}

.share-btn::after {
  border: none;
}

.share-icon {
  font-size: 24rpx;
  font-weight: 600;
  margin-bottom: 4rpx;
}

.share-text {
  font-size: 20rpx;
  font-weight: 400;
}

.share-btn:active {
  background: #333333;
}

.tip {
  text-align: center;
  padding: 20rpx;
  background: #e0e0e0;
  /* 灰色背景 */
  margin-bottom: 30rpx;
  font-size: 30rpx;
  color: #000000;
  border: 1px solid #000000;
  /* 黑色边框 */
  font-weight: 600;
}

.date-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40rpx;
  padding: 20rpx;
  background: #ffffff;
  /* 白色背景 */
  border: 1px solid #000000;
  /* 黑色边框 */
  border-radius: 0;
  /* 去除圆角 */
}

.date {
  font-size: 32rpx;
  font-weight: 700;
  color: #000000;
  margin-bottom: 8rpx;
}

.day-of-week {
  font-size: 24rpx;
  color: #333333;
  margin-bottom: 4rpx;
  font-weight: 600;
}

.lunar-date {
  font-size: 20rpx;
  color: #666666;
  font-style: italic;
}

.news-list {
  margin-bottom: 30rpx;
}

.news-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 24rpx;
  padding: 20rpx;
  background: #ffffff;
  /* 白色背景 */
  border: 1px solid #000000;
  /* 黑色边框 */
  border-radius: 0;
  /* 去除圆角 */
  border-left: 4rpx solid #000000;
  /* 黑色左侧边框 */
}

.news-index {
  font-size: 20rpx;
  font-weight: 900;
  color: #000000;
  background: #e0e0e0;
  /* 灰色背景 */
  padding: 6rpx 10rpx;
  border-radius: 0;
  /* 去除圆角 */
  min-width: 30rpx;
  text-align: center;
  margin-right: 16rpx;
  margin-top: 2rpx;
  border: 1px solid #000000;
  /* 黑色边框 */
}

.news-content {
  font-size: 30rpx;
  line-height: 1.6;
  color: #000000;
  /* 黑色文字 */
  flex: 1;
  font-weight: 400;
}

.loading,
.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx;
  text-align: center;
  background: #ffffff;
  border: 1px solid #000000;
}

.loading {
  color: #000000;
  font-weight: 600;
}

.error {
  color: #000000;
  font-weight: 600;
}

.retry-btn {
  margin-top: 20rpx;
  background: #000000;
  /* 黑色背景 */
  color: #ffffff;
  /* 白色文字 */
  padding: 16rpx 32rpx;
  border: 1px solid #000000;
  border-radius: 0;
  /* 去除圆角 */
  font-size: 24rpx;
  font-weight: 600;
}

.retry-btn:active {
  background: #333333;
  /* 深灰色 */
}
</style>