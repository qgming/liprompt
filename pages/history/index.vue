<template>
  <view class="container">
    <!-- 简洁标题 -->
    <view class="header">
      <view class="title-section">
        <text class="logo-text">历史上的今天</text>
        <text class="subtitle">回顾历史 · 启迪未来</text>
      </view>
      <button class="share-btn" open-type="share">
        <text class="share-icon">↗</text>
        <text class="share-text">分享</text>
      </button>
    </view>

    <!-- 日期信息 -->
    <view class="date-info" v-if="historyData">
      <text class="month-day">{{ historyData.month }}月{{ historyData.day }}日</text>
    </view>

    <!-- 事件列表 -->
    <view class="event-list" v-if="historyData && historyData.items">
      <view class="event-item" v-for="(item, index) in historyData.items" :key="index">
        <view class="event-header">
          <text class="event-year">{{ item.year }}</text>
          <text class="event-type" :class="getEventTypeClass(item.event_type)">
            {{ getEventTypeText(item.event_type) }}
          </text>
        </view>
        <text class="event-title">{{ item.title }}</text>
        <text class="event-description">{{ item.description }}</text>
        <view class="event-link" @click="copyToClipboard(item)" v-if="item.link">
          <text>查看详情</text>
        </view>
      </view>
    </view>

    <!-- 加载状态 -->
    <view class="loading" v-if="loading">
      <text>正在获取历史数据...</text>
    </view>

    <!-- 错误状态 -->
    <view class="error" v-if="error">
      <text>{{ error }}</text>
      <button class="retry-btn" @click="fetchHistory">重新获取</button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getApiUrl, getCurrentServer, markServerStatus } from '../../config/apiConfig.js'

const historyData = ref(null)
const loading = ref(false)
const error = ref('')

const fetchHistory = async () => {
  loading.value = true
  error.value = ''

  try {
    // 获取API地址（支持自动重试）
    const apiUrl = await getApiUrl('history')

    const response = await uni.request({
      url: apiUrl,
      method: 'GET',
      data: {
        encoding: 'json'
      },
      timeout: 10000
    })

    if (response.statusCode === 200 && response.data.code === 200) {
      historyData.value = response.data.data
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
    console.error('获取历史数据失败:', err)
  } finally {
    loading.value = false
  }
}

const getEventTypeClass = (type) => {
  const typeMap = {
    'birth': 'type-birth',
    'death': 'type-death',
    'event': 'type-event'
  }
  return typeMap[type] || 'type-event'
}

const getEventTypeText = (type) => {
  const typeMap = {
    'birth': '出生',
    'death': '逝世',
    'event': '事件'
  }
  return typeMap[type] || '事件'
}

const copyToClipboard = (item) => {
  if (item && item.link) {
    uni.setClipboardData({
      data: item.link,
      success: () => {
        uni.showToast({
          title: '链接已复制',
          icon: 'success',
          duration: 2000
        })
      },
      fail: (err) => {
        uni.showToast({
          title: '复制失败',
          icon: 'error',
          duration: 2000
        })
        console.error('复制失败:', err)
      }
    })
  }
}

onMounted(() => {
  fetchHistory()
})
</script>

<script>
// 微信小程序分享配置 - 单独使用选项式API导出
export default {
  onShareAppMessage() {
    return {
      title: '历史上的今天 - 回顾历史',
      path: '/pages/history/index'
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
  letter-spacing: 2rpx;
}

.subtitle {
  font-size: 24rpx;
  color: #333333;
  font-weight: 400;
  font-style: italic;
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

.date-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40rpx;
  padding: 20rpx;
  background: #ffffff;
  border: 1px solid #000000;
  border-radius: 0;
}

.date {
  font-size: 32rpx;
  font-weight: 700;
  color: #000000;
  margin-bottom: 8rpx;
}

.month-day {
  font-size: 32rpx;
  color: #000000;
  font-weight: 600;
}

.event-list {
  margin-bottom: 30rpx;
}

.event-item {
  margin-bottom: 24rpx;
  padding: 20rpx;
  background: #ffffff;
  border: 1px solid #000000;
  border-radius: 0;
  border-left: 4rpx solid #000000;
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.event-year {
  font-size: 20rpx;
  font-weight: 900;
  color: #000000;
  background: #e0e0e0;
  padding: 6rpx 10rpx;
  border-radius: 0;
  border: 1px solid #000000;
}

.event-type {
  font-size: 20rpx;
  font-weight: 600;
  padding: 4rpx 8rpx;
  border-radius: 0;
  border: 1px solid #000000;
}

.type-birth {
  background: #e8f5e8;
  color: #2e7d32;
}

.type-death {
  background: #ffebee;
  color: #c62828;
}

.type-event {
  background: #e3f2fd;
  color: #1565c0;
}

.event-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #000000;
  margin-bottom: 8rpx;
  display: block;
}

.event-description {
  font-size: 28rpx;
  line-height: 1.6;
  color: #000000;
  margin-bottom: 12rpx;
  display: block;
}

.event-link {
  display: inline-block;
  background: #000000;
  color: #ffffff;
  padding: 8rpx 16rpx;
  border: 1px solid #000000;
  border-radius: 0;
  font-size: 20rpx;
  font-weight: 600;
  cursor: pointer;
}

.event-link:active {
  background: #333333;
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
  color: #ffffff;
  padding: 16rpx 32rpx;
  border: 1px solid #000000;
  border-radius: 0;
  font-size: 24rpx;
  font-weight: 600;
}

.retry-btn:active {
  background: #333333;
}
</style>