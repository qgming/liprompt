<template>
  <view class="container">
    <!-- 简洁标题 -->
    <view class="header">
      <view class="title-section">
        <text class="logo-text">知乎话题榜</text>
        <text class="subtitle">【实时】热门话题 · 全网关注</text>
      </view>
      <button class="share-btn" open-type="share">
        <text class="share-icon">↗</text>
        <text class="share-text">分享</text>
      </button>
    </view>

    <!-- 更新时间 -->
    <view class="update-time" v-if="hotData">
      <text>更新时间：{{ formatTime(hotData.update_time) }}</text>
    </view>

    <!-- 热搜列表 -->
    <view class="hot-list" v-if="hotData && hotData.data">
      <view class="hot-item" v-for="(item, index) in hotData.data" :key="index" @click="openZhihuLink(item.link)">
        <view class="hot-rank">
          <text class="rank-number">{{ index + 1 }}</text>
        </view>

        <view class="hot-content">
          <view class="hot-header">
            <text class="hot-title">{{ item.title }}</text>
            <text class="hot-value">{{ item.hot_value_desc }}</text>
          </view>

          <view class="hot-meta">
            <text class="answer-count">回答：{{ item.answer_cnt }}</text>
            <text class="follower-count">关注：{{ formatNumber(item.follower_cnt) }}</text>
            <text class="comment-count">评论：{{ item.comment_cnt }}</text>
          </view>

          <view class="hot-detail" v-if="item.detail">
            <text class="detail-text">{{ truncateText(item.detail, 100) }}</text>
          </view>

          <view class="hot-cover" v-if="item.cover">
            <image :src="item.cover" mode="aspectFill" class="cover-image"></image>
          </view>

          <view class="create-time">
            <text>创建时间：{{ item.created }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 加载状态 -->
    <view class="loading" v-if="loading">
      <text>正在获取知乎话题榜数据...</text>
    </view>

    <!-- 错误状态 -->
    <view class="error" v-if="error">
      <text>{{ error }}</text>
      <button class="retry-btn" @click="fetchZhihuHot">重新获取</button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getApiUrl, getCurrentServer, markServerStatus } from '../../config/apiConfig.js'

const hotData = ref(null)
const loading = ref(false)
const error = ref('')

const fetchZhihuHot = async () => {
  loading.value = true
  error.value = ''

  try {
    // 获取API地址（支持自动重试）
    const apiUrl = await getApiUrl('zhihu')

    const response = await uni.request({
      url: apiUrl,
      method: 'GET',
      data: {
        encoding: 'json'
      },
      timeout: 10000
    })

    if (response.statusCode === 200 && response.data.code === 200) {
      hotData.value = response.data
      // 添加更新时间
      hotData.value.update_time = new Date().getTime()
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
    console.error('获取知乎话题榜数据失败:', err)
  } finally {
    loading.value = false
  }
}

const formatNumber = (num) => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  } else {
    return num.toString()
  }
}

const truncateText = (text, maxLength) => {
  if (text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength) + '...'
}

const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

const openZhihuLink = (link) => {
  if (link) {
    uni.showModal({
      title: '打开知乎',
      content: '是否打开知乎查看详情？',
      success: (res) => {
        if (res.confirm) {
          // 复制链接到剪贴板
          uni.setClipboardData({
            data: link,
            success: () => {
              uni.showToast({
                title: '链接已复制',
                icon: 'success',
                duration: 2000
              })
            }
          })
        }
      }
    })
  }
}

onMounted(() => {
  fetchZhihuHot()
})
</script>

<script>
// 微信小程序分享配置 - 单独使用选项式API导出
export default {
  onShareAppMessage() {
    return {
      title: '知乎话题榜 - 热门话题榜',
      path: '/pages/zhihu/index'
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

.update-time {
  text-align: center;
  padding: 20rpx;
  background: #e0e0e0;
  margin-bottom: 30rpx;
  font-size: 30rpx;
  color: #000000;
  border: 1px solid #000000;
  font-weight: 600;
}

.hot-list {
  margin-bottom: 30rpx;
}

.hot-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 24rpx;
  padding: 20rpx;
  background: #ffffff;
  border: 1px solid #000000;
  border-radius: 0;
  border-left: 4rpx solid #000000;
  transition: all 0.2s ease;
}

.hot-item:active {
  background: #f0f0f0;
  transform: translateY(2rpx);
}

.hot-rank {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  min-width: 60rpx;
}

.rank-number {
  font-size: 32rpx;
  font-weight: 900;
  color: #000000;
  background: #e0e0e0;
  padding: 8rpx 12rpx;
  border-radius: 0;
  border: 1px solid #000000;
  min-width: 40rpx;
  text-align: center;
}

.hot-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.hot-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12rpx;
}

.hot-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #000000;
  line-height: 1.4;
  flex: 1;
  margin-right: 16rpx;
}

.hot-value {
  font-size: 24rpx;
  font-weight: 600;
  color: #ff0000;
  background: #ffe6e6;
  padding: 4rpx 8rpx;
  border: 1px solid #ff0000;
  white-space: nowrap;
}

.hot-meta {
  display: flex;
  gap: 16rpx;
  margin-bottom: 12rpx;
  flex-wrap: wrap;
}

.answer-count,
.follower-count,
.comment-count {
  font-size: 22rpx;
  color: #666666;
  background: #f0f0f0;
  padding: 4rpx 8rpx;
  border: 1px solid #cccccc;
}

.hot-detail {
  margin-bottom: 12rpx;
}

.detail-text {
  font-size: 24rpx;
  color: #333333;
  line-height: 1.4;
}

.hot-cover {
  margin-bottom: 12rpx;
}

.cover-image {
  width: 100%;
  height: 200rpx;
  border: 1px solid #000000;
}

.create-time {
  font-size: 20rpx;
  color: #999999;
  font-style: italic;
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