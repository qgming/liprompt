<template>
	<view class="container">
		<!-- 页面整体滚动 -->
		<scroll-view scroll-y class="page-scroll" enhanced :show-scrollbar="false">
			<!-- 顶部区域 -->
			<view class="header-section">
				<view class="header-content">
					<text class="title-logo">🤖模型排行榜</text>
				</view>
			</view>

			<!-- 内容区域 -->
			<view class="content-wrapper">
				<!-- 模型类型切换 -->
				<view class="model-tabs">
					<view v-for="category in categories" :key="category.key" class="tab-item"
						:class="{ active: activeTab === category.key }" @click="switchTab(category.key)">
						<text class="tab-name">{{ category.name }}</text>
					</view>
				</view>

				<!-- 分类描述卡片 -->
				<view class="description-card">
					<text class="description-text">{{ currentCategoryConfig.description }}</text>
				</view>

				<!-- 排行榜列表 -->
				<view class="ranking-list">
					<view v-for="(model, index) in currentRankingList" :key="model.id" class="ranking-item"
						@click="viewModelDetail(model)">
						<view class="rank-number" :class="{ 'top-three': model.displayRank <= 3 }">
							{{ model.displayRank }}
						</view>
						<view class="model-info">
							<view class="model-header">
								<view class="model-title">{{ model.model }}</view>
							</view>
							<view class="model-stats">
								<view class="stat-tag score">
									<text class="tag-label">{{ model.score }}</text>
								</view>
								<view class="stat-tag votes">
									<text class="tag-label">{{ model.votes }}</text>
								</view>
								<view class="stat-tag vendor">
									<text class="tag-label">{{ model.organization }}</text>
								</view>
							</view>
						</view>
					</view>
				</view>

				<!-- 加载更多 -->
				<view class="load-more" v-if="hasMore" @click="loadMore">
					<text class="load-more-text">加载更多</text>
				</view>

				<!-- 空状态 -->
				<view v-if="currentRankingList.length === 0" class="empty-state">
					<view class="empty-icon">🤖</view>
					<text class="empty-text">暂无模型数据</text>
					<text class="empty-desc">请稍后再试</text>
				</view>

				<!-- 底部数据来源信息 -->
				<view class="footer-section">
					<text class="footer-text">数据来自LMArena</text>
					<text class="footer-date">时间：2025年10月20日</text>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
	getAllCategories,
	getRankingData,
	getRankingStats,
	setCurrentCategory,
	getCurrentCategory
} from '@/data/ranking-manager.js'

const activeTab = ref('text')
const currentPage = ref(1)
const pageSize = ref(20)
const currentRankingList = ref([])
const hasMore = ref(true)
const categories = ref([])
const rankingStats = ref(null)

// 计算当前类别配置
const currentCategoryConfig = computed(() => {
	const category = categories.value.find(cat => cat.key === activeTab.value)
	return category || { name: '', icon: '', description: '' }
})

// 格式化投票数
const formatVotes = (votes) => {
	if (votes >= 1000000) {
		return `${(votes / 1000000).toFixed(1)}M`
	} else if (votes >= 1000) {
		return `${(votes / 1000).toFixed(0)}K`
	}
	return votes.toString()
}

// 加载排行榜数据
const loadRankingData = (reset = false) => {
	if (reset) {
		currentPage.value = 1
		currentRankingList.value = []
	}

	try {
		const result = getRankingData(activeTab.value, currentPage.value, pageSize.value)

		if (reset) {
			currentRankingList.value = result.data
		} else {
			currentRankingList.value = [...currentRankingList.value, ...result.data]
		}

		hasMore.value = result.hasMore

		// 更新统计信息
		rankingStats.value = getRankingStats(activeTab.value)

	} catch (error) {
		console.error('加载排行榜数据失败:', error)
		uni.showToast({
			title: '加载数据失败',
			icon: 'error'
		})
	}
}

// 切换标签页
const switchTab = (tab) => {
	if (activeTab.value === tab) return

	activeTab.value = tab
	setCurrentCategory(tab)
	loadRankingData(true)
}

// 加载更多数据
const loadMore = () => {
	if (!hasMore.value) return

	currentPage.value++
	loadRankingData(false)
}

// 查看模型详情
const viewModelDetail = (model) => {
	console.log('查看模型详情:', model.model)
	uni.showModal({
		title: model.model,
		content: `组织: ${model.organization}\n评分: ${model.score}\n投票: ${model.votes}\n许可证: ${model.license}`,
		showCancel: false,
		confirmText: '确定'
	})
}

// 初始化数据
const initializeData = () => {
	try {
		// 获取所有类别
		categories.value = getAllCategories()

		// 加载初始数据
		loadRankingData(true)

		console.log('排行榜数据初始化完成')
	} catch (error) {
		console.error('初始化失败:', error)
		uni.showToast({
			title: '初始化失败',
			icon: 'error'
		})
	}
}

onMounted(() => {
	initializeData()
})
</script>

<style>
.container {
	width: 100vw;
	height: 100vh;
	background: #ffffff;
	font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

/* 页面整体滚动 */
.page-scroll {
	width: 100%;
	height: 100%;
}

/* 隐藏滚动条 */
.page-scroll ::-webkit-scrollbar {
	display: none;
	width: 0;
	height: 0;
	color: transparent;
}

.page-scroll {
	scrollbar-width: none;
	-ms-overflow-style: none;
}

/* 顶部区域 */
.header-section {
	background: #ffffff;
	padding: 120rpx 32rpx 24rpx 32rpx;
}

.header-content {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

/* 内容区域 */
.content-wrapper {
	background: #ffffff;
}

.title-logo {
	font-size: 48rpx;
	font-weight: 700;
	color: #000000;
	letter-spacing: 2rpx;
	text-align: center;
}

/* 分类描述卡片 */
.description-card {
	margin: 24rpx 32rpx;
	background: #f8f9fa;
	border-radius: 16rpx;
	padding: 20rpx 24rpx;
	box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
	border: 1rpx solid #f0f0f0;
}

.description-text {
	font-size: 26rpx;
	color: #8e8e93;
	line-height: 1.4;
}

/* 模型类型切换 */
.model-tabs {
	display: flex;
	margin: 24rpx 32rpx;
	background: #f5f5f7;
	border-radius: 20rpx;
	padding: 6rpx;
	gap: 4rpx;
}

.tab-item {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 12rpx 8rpx;
	border-radius: 14rpx;
	font-size: 28rpx;
	color: #8e8e93;
	transition: all 0.3s ease;
	min-height: 48rpx;
	font-weight: 500;
}

.tab-item.active {
	background: #ffffff;
	color: #1d1d1f;
	font-weight: 600;
	box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.08);
}


/* 排行榜列表 */
.ranking-list {
	padding: 0 32rpx;
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.ranking-item {
	display: flex;
	align-items: center;
	padding: 24rpx;
	border-radius: 16rpx;
	background: #ffffff;
	box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
	border: 1rpx solid #f0f0f0;
	transition: all 0.2s ease;
}

.ranking-item:active {
	transform: translateY(-2rpx);
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
	background: #f8f9fa;
}

/* 排名数字 */
.rank-number {
	width: 60rpx;
	height: 60rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 26rpx;
	font-weight: 700;
	color: #8e8e93;
	background: #f5f5f7;
	border-radius: 50%;
	margin-right: 20rpx;
	flex-shrink: 0;
}

.rank-number.top-three {
	background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
	color: #ffffff;
	font-size: 28rpx;
	box-shadow: 0 4rpx 12rpx rgba(255, 215, 0, 0.3);
}

/* 模型信息 */
.model-info {
	flex: 1;
}

.model-header {
	display: flex;
	align-items: center;
	margin-bottom: 6rpx;
}

.model-title {
	font-size: 30rpx;
	font-weight: 600;
	color: #1d1d1f;
	line-height: 1.3;
}

/* 模型统计数据 */
.model-stats {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
	margin-top: 12rpx;
}

.stat-tag {
	background: #f2f2f7;
	color: #8e8e93;
	font-size: 22rpx;
	padding: 8rpx 14rpx;
	border-radius: 16rpx;
	transition: all 0.2s ease;
	flex-shrink: 0;
}

.stat-tag.score {
	background: rgba(255, 193, 7, 0.15);
	color: #FF9800;
}

.stat-tag.votes {
	background: rgba(23, 162, 184, 0.15);
	color: #17A2B8;
}

.stat-tag.vendor {
	background: rgba(0, 122, 255, 0.1);
	color: #007AFF;
}

.tag-label {
	font-size: 22rpx;
	font-weight: 500;
}


/* 加载更多 */
.load-more {
	text-align: center;
	padding: 24rpx 32rpx;
	margin: 24rpx 0;
}

.load-more-text {
	font-size: 28rpx;
	color: #007AFF;
	padding: 16rpx 32rpx;
	background: rgba(0, 122, 255, 0.1);
	border-radius: 24rpx;
	border: 1rpx solid rgba(0, 122, 255, 0.2);
	transition: all 0.2s ease;
	display: inline-block;
}

.load-more:active .load-more-text {
	opacity: 0.7;
	transform: scale(0.95);
}

/* 空状态 */
.empty-state {
	text-align: center;
	padding: 120rpx 40rpx;
}

.empty-icon {
	font-size: 120rpx;
	margin-bottom: 32rpx;
	opacity: 0.6;
}

.empty-text {
	display: block;
	font-size: 32rpx;
	color: #8e8e93;
	margin-bottom: 12rpx;
}

.empty-desc {
	display: block;
	font-size: 28rpx;
	color: #c7c7cc;
}

/* 底部数据来源信息 */
.footer-section {
	text-align: center;
	padding: 40rpx 32rpx 60rpx 32rpx;
	margin-top: 40rpx;
	border-top: 1rpx solid #f0f0f0;
	background: #ffffff;
}

.footer-text {
	display: block;
	font-size: 24rpx;
	color: #8e8e93;
	margin-bottom: 8rpx;
}

.footer-date {
	display: block;
	font-size: 22rpx;
	color: #c7c7cc;
}

/* 响应式调整 */
@media (max-width: 750rpx) {
	.tab-name {
		font-size: 22rpx;
	}

	.tab-icon {
		font-size: 24rpx;
	}

	.stats-grid {
		flex-wrap: wrap;
		gap: 16rpx;
	}

	.stat-item {
		flex: 1;
		min-width: 120rpx;
	}
}
</style>