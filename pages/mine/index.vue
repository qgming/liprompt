<template>
	<view class="container">
		<scroll-view scroll-y class="page-scroll" enhanced :show-scrollbar="false">
			<view class="hero">
				<text class="eyebrow">MY PROMPTS</text>
				<text class="title">我的</text>
			</view>

			<view v-if="isLoading" class="loading-state">
				<view class="surface loading-card">
					<icon class="loading-icon" type="waiting" size="36" color="#8e8e93" />
					<text class="loading-title">正在整理我的提示词</text>
					<text class="loading-desc">收藏记录和提示词总量正在同步</text>
				</view>
			</view>

			<template v-else>
				<view class="section">
					<view class="stats-row">
						<view class="surface stat-card">
							<text class="stat-label">文本提示词</text>
							<text class="stat-value">{{ stats.text }}</text>
						</view>
						<view class="surface stat-card">
							<text class="stat-label">图片提示词</text>
							<text class="stat-value">{{ stats.image }}</text>
						</view>
					</view>
				</view>

				<view class="section">
					<view class="section-header">
						<text class="section-title">收藏</text>
						<text class="section-meta">{{ favorites.length }} 条</text>
					</view>

					<view v-if="favorites.length" class="waterfall">
						<view v-for="(column, columnIndex) in favoriteColumns" :key="columnIndex" class="waterfall-column">
							<view v-for="favorite in column" :key="favorite.id" class="surface favorite-card" @click="openPromptDetail(favorite)">
								<view class="card-top">
									<view class="type-badge" :class="favorite.promptType === 'image' ? 'image' : 'text'">
										{{ favorite.promptType === 'image' ? '图片提示' : '文本提示' }}
									</view>
									<view class="favorite-action" @click.stop="handleToggleFavorite(favorite)">已收藏</view>
								</view>
								<view v-if="favorite.emoji" class="emoji">{{ favorite.emoji }}</view>
								<text class="card-title">{{ favorite.name }}</text>
								<text v-if="favorite.promptType !== 'image' && favorite.author" class="card-meta">
									{{ favorite.author }} · {{ favorite.section }}
								</text>
								<view v-if="favorite.group?.length" class="tags">
									<text v-for="tag in favorite.group.slice(0, 4)" :key="tag" class="tag">{{ tag }}</text>
								</view>
							</view>
						</view>
					</view>

					<view v-else class="surface empty-state">
						<text class="empty-title">还没有收藏内容</text>
						<text class="empty-desc">去详情页右上角点一下收藏，常用提示词就会出现在这里。</text>
						<view class="empty-action" @click="goExplore">去看看精选</view>
					</view>
				</view>

				<view class="section last-section">
					<view class="section-header"><text class="section-title">关于</text></view>
					<view class="surface about-card">
						<text class="about-title">流金提示词</text>
						<text class="about-desc">一个聚合文本提示词与图片案例的小程序，方便你随时收藏、回看和复用灵感。</text>
						<view class="about-divider"></view>
						<text class="about-subtitle">参考开源项目</text>
						<view class="project-list">
							<view v-for="project in openSourceProjects" :key="project.url" class="project-item" @click="copyProjectLink(project)">
								<text class="project-name">{{ project.name }}</text>
								<text class="project-url">{{ project.url }}</text>
							</view>
						</view>
					</view>
				</view>
			</template>
		</scroll-view>
	</view>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { bootstrapRemoteData } from '@/data/bootstrap.js'
import { getAllPrompts } from '@/data/prompts-manager.js'
import { getAllImagePrompts } from '@/data/image-prompts-manager.js'
import { FAVORITES_CHANGED_EVENT, refreshFavorites, toggleFavoritePrompt } from '@/data/favorites-manager.js'

const COLUMN_COUNT = 2
const BASE_CARD_WEIGHT = 1

const isLoading = ref(true)
const favorites = ref([])
const stats = ref({ text: 0, image: 0 })
const openSourceProjects = [
	{
		name: 'awesome-gpt-image-2-prompts',
		url: 'https://github.com/EvoLinkAI/awesome-gpt-image-2-prompts'
	},
	{
		name: 'cherry-studio',
		url: 'https://github.com/CherryHQ/cherry-studio'
	}
]

const getShortestColumnIndex = (heights) => {
	return heights.reduce((bestIndex, currentHeight, currentIndex) => {
		return currentHeight < heights[bestIndex] ? currentIndex : bestIndex
	}, 0)
}

const getFavoriteWeight = (favorite) => {
	const titleLength = favorite.name?.length || 0
	const tagCount = Array.isArray(favorite.group) ? Math.min(favorite.group.length, 4) : 0
	const hasEmoji = favorite.emoji ? 0.35 : 0

	return BASE_CARD_WEIGHT + titleLength / 24 + tagCount * 0.24 + hasEmoji
}

const favoriteColumns = computed(() => {
	const columns = Array.from({ length: COLUMN_COUNT }, () => [])
	const heights = Array(COLUMN_COUNT).fill(0)

	favorites.value.forEach((favorite) => {
		const targetIndex = getShortestColumnIndex(heights)
		columns[targetIndex].push(favorite)
		heights[targetIndex] += getFavoriteWeight(favorite)
	})

	return columns
})

const syncStats = () => {
	stats.value = { text: getAllPrompts().length, image: getAllImagePrompts().length }
}

const syncFavorites = () => {
	favorites.value = refreshFavorites()
}

const loadPageData = async () => {
	syncFavorites()
	syncStats()
	isLoading.value = false

	try {
		await bootstrapRemoteData()
		syncStats()
		syncFavorites()
	} catch (error) {
		console.error('加载我的页面失败:', error)
		uni.showToast({ title: '页面加载失败', icon: 'none' })
	}
}

const openPromptDetail = (prompt) => {
	const source = prompt.promptType === 'image' ? '&source=image' : ''
	uni.navigateTo({ url: `/pages/detail/index?id=${prompt.id}${source}` })
}

const handleToggleFavorite = (prompt) => {
	const result = toggleFavoritePrompt(prompt)
	syncFavorites()
	uni.showToast({ title: result.isFavorite ? '已加入收藏' : '已取消收藏', icon: 'success' })
}

const goExplore = () => {
	uni.switchTab({ url: '/pages/index/index' })
}

const copyProjectLink = (project) => {
	uni.setClipboardData({
		data: project.url,
		success: () => uni.showToast({ title: '已复制项目地址', icon: 'success' }),
		fail: () => uni.showToast({ title: '复制失败', icon: 'none' })
	})
}

const handleFavoritesChanged = () => {
	syncFavorites()
}

onMounted(loadPageData)
onMounted(() => {
	if (typeof uni.$on === 'function') {
		uni.$on(FAVORITES_CHANGED_EVENT, handleFavoritesChanged)
	}
})

onUnmounted(() => {
	if (typeof uni.$off === 'function') {
		uni.$off(FAVORITES_CHANGED_EVENT, handleFavoritesChanged)
	}
})

onShow(() => {
	syncFavorites()
})
</script>

<style lang="scss">
.container,
.page-scroll {
	@include lp-viewport-page;
	width: 100vw;
	height: 100vh;
	min-height: 100vh;
}

.hero,
.section,
.loading-state {
	padding: 0 $lp-page-padding;
}

.eyebrow,
.title,
.section-title,
.section-meta,
.loading-title,
.loading-desc,
.stat-label,
.stat-value,
.card-title,
.card-meta,
.empty-title,
.empty-desc,
.about-title,
.about-desc,
.about-subtitle,
.project-name,
.project-url {
	display: block;
}

.hero {
	padding-top: 116rpx;
}

.eyebrow {
	font-size: 22rpx;
	letter-spacing: 3rpx;
	color: $lp-text-tertiary;
}

.title {
	margin-top: 14rpx;
	font-size: 54rpx;
	font-weight: 700;
	line-height: 1.12;
	color: $lp-text-primary;
}

.loading-state {
	padding-top: 40rpx;
}

.surface {
	@include lp-card;
}

.loading-card,
.stat-card,
.favorite-card,
.about-card,
.empty-state {
	padding: 28rpx;
}

.loading-card {
	padding: 40rpx 32rpx;
	text-align: center;
}

.loading-title {
	margin-top: 18rpx;
	font-size: 32rpx;
	font-weight: 600;
	color: $lp-text-primary;
}

.loading-desc,
.about-desc,
.empty-desc {
	margin-top: 14rpx;
	font-size: 24rpx;
	line-height: 1.7;
	color: $lp-text-secondary;
}

.section {
	margin-top: 30rpx;
}

.last-section {
	padding-bottom: 56rpx;
}

.section-header,
.card-top {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.section-header {
	margin-bottom: 20rpx;
}

.section-title {
	font-size: 32rpx;
	font-weight: 600;
	color: $lp-text-primary;
}

.section-meta,
.card-meta {
	font-size: 24rpx;
	color: $lp-text-tertiary;
}

.stats-row {
	display: flex;
	gap: 16rpx;
}

.stats-row .stat-card {
	flex: 1;
	text-align: center;
}

.stat-label {
	font-size: 24rpx;
	color: $lp-text-secondary;
}

.stat-value {
	margin-top: 18rpx;
	font-size: 56rpx;
	font-weight: 700;
	line-height: 1;
	color: $lp-text-primary;
}

.waterfall {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: 16rpx;
}

.waterfall-column {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-width: 0;
	gap: 16rpx;
}

.favorite-card {
	width: 100%;
	box-sizing: border-box;
	transition: background-color 0.16s ease;
}

.favorite-card:active {
	@include lp-card-active;
}

.type-badge,
.favorite-action,
.tag {
	border-radius: 999rpx;
	font-size: 22rpx;
	line-height: 1;
}

.type-badge,
.favorite-action {
	padding: 10rpx 18rpx;
}

.type-badge {
	@include lp-fill-control;
	color: $lp-text-secondary;
}

.type-badge.image {
	color: $lp-text-secondary;
	background: $lp-fill-bg;
}

.type-badge.text {
	color: $lp-accent-text;
	background: $lp-fill-bg;
	border-color: transparent;
}

.favorite-action {
	@include lp-primary-control;
}

.emoji {
	margin-top: 18rpx;
	font-size: 48rpx;
	line-height: 1;
}

.card-title {
	margin-top: 16rpx;
	font-size: 30rpx;
	font-weight: 600;
	line-height: 1.42;
	color: $lp-text-primary;
	word-break: break-word;
}

.card-meta {
	margin-top: 12rpx;
}

.tags {
	display: flex;
	flex-wrap: wrap;
	gap: 10rpx;
	margin-top: 18rpx;
}

.tag {
	@include lp-fill-control;
	padding: 7rpx 14rpx;
	color: $lp-text-secondary;
}

.empty-state {
	text-align: center;
}

.empty-title,
.about-title {
	font-size: 30rpx;
	font-weight: 600;
	color: $lp-text-primary;
}

.empty-action {
	@include lp-primary-control($lp-radius-control);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	margin-top: 24rpx;
	padding: 18rpx 24rpx;
	font-size: 26rpx;
	font-weight: 600;
}

.about-card {
	text-align: left;
	padding: 34rpx 30rpx 30rpx;
}

.about-title {
	font-size: 34rpx;
}

.about-desc {
	max-width: 100%;
	line-height: 1.8;
}

.about-divider {
	height: 1rpx;
	margin: 24rpx 0 20rpx;
	background: $lp-border-subtle;
}

.about-subtitle {
	font-size: 22rpx;
	font-weight: 600;
	letter-spacing: 2rpx;
	color: $lp-text-tertiary;
}

.project-list {
	display: flex;
	flex-direction: column;
	margin-top: 18rpx;
	text-align: left;
}

.project-item {
	padding: 18rpx 0;
	border-bottom: 1rpx solid $lp-border-subtle;
}

.project-item:last-child {
	padding-bottom: 0;
	border-bottom: none;
}

.project-item:active {
	opacity: 0.72;
}

.project-name {
	font-size: 24rpx;
	font-weight: 600;
	color: $lp-text-primary;
}

.project-url {
	margin-top: 8rpx;
	font-size: 22rpx;
	line-height: 1.6;
	color: $lp-text-secondary;
	word-break: break-all;
}
</style>
