<template>
	<view class="container">
		<scroll-view scroll-y class="page-scroll" enhanced :show-scrollbar="false">
			<view class="hero">
				<text class="hero-title">GPT-Image-2 案例库</text>
				<text class="hero-desc">收录 {{ prompts.length }} 条图片案例，图片已切换为 GitHub 直链。</text>
			</view>

			<view class="toolbar">
				<view class="search-box">
					<input class="search-input" v-model="searchKeyword" placeholder="搜索案例、作者、提示词..." @input="handleSearch" />
				</view>
				<scroll-view scroll-x class="chips" show-scrollbar="false">
					<view class="chip-list">
						<view v-for="category in categories" :key="category" class="chip"
							:class="{ active: selectedCategory === category }" @click="selectCategory(category)">
							{{ category }}
						</view>
					</view>
				</scroll-view>
			</view>

			<view class="summary">
				<view class="summary-card">
					<text class="summary-label">当前结果</text>
					<text class="summary-value">{{ filteredCount }}</text>
				</view>
				<view class="summary-card">
					<text class="summary-label">当前分类</text>
					<text class="summary-value small">{{ selectedCategory }}</text>
				</view>
			</view>

			<view v-if="paginatedPrompts.length" class="grid">
				<view v-for="prompt in paginatedPrompts" :key="prompt.id" class="card" @click="viewPromptDetail(prompt)">
					<view class="cover-wrap">
						<image class="cover" :src="prompt.coverImage" mode="aspectFill" lazy-load />
						<view class="badge">{{ prompt.section }}</view>
						<view v-if="getImageCount(prompt) > 1" class="count">{{ getImageCount(prompt) }} 图</view>
					</view>
					<view class="card-content">
						<text class="card-title">{{ prompt.name }}</text>
						<text class="card-desc">{{ prompt.description }}</text>
						<view class="card-meta">
							<text class="card-author">{{ prompt.author }}</text>
							<text class="card-case">Case {{ prompt.caseNumber }}</text>
						</view>
					</view>
				</view>
			</view>

			<view v-else-if="!isLoading" class="empty-state">
				<text class="empty-icon">🖼️</text>
				<text class="empty-title">没有找到匹配案例</text>
				<text class="empty-desc">换个关键词或分类会更快找到灵感。</text>
			</view>

			<view v-if="totalPages > 1" class="pagination">
				<view class="page-btn" :class="{ disabled: currentPage === 1 }" @click="prevPage">上一页</view>
				<text class="page-text">{{ currentPage }} / {{ totalPages }}</text>
				<view class="page-btn" :class="{ disabled: currentPage === totalPages }" @click="nextPage">下一页</view>
			</view>
		</scroll-view>
	</view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import {
	getAllImagePrompts,
	getImageCategories,
	getImagePromptsPaginated,
	loadImagePrompts
} from '@/data/image-prompts-manager.js'

const prompts = ref([])
const categories = ref([])
const searchKeyword = ref('')
const selectedCategory = ref('全部')
const currentPage = ref(1)
const pageSize = ref(12)
const isLoading = ref(true)

const paginationData = computed(() =>
	getImagePromptsPaginated(currentPage.value, pageSize.value, {
		category: selectedCategory.value,
		search: searchKeyword.value
	})
)

const paginatedPrompts = computed(() => paginationData.value.data)
const filteredCount = computed(() => paginationData.value.total)
const totalPages = computed(() => Math.max(1, Math.ceil(filteredCount.value / pageSize.value)))

const resetPage = () => {
	currentPage.value = 1
}

const handleSearch = () => {
	resetPage()
}

const selectCategory = (category) => {
	selectedCategory.value = category
	resetPage()
}

const getImageCount = (prompt) => {
	return Array.isArray(prompt.images) ? prompt.images.length : 0
}

const loadImagePromptsData = async () => {
	try {
		await loadImagePrompts()
		prompts.value = getAllImagePrompts()
		categories.value = getImageCategories()
	} catch (error) {
		console.error('加载图片提示失败:', error)
		uni.showToast({
			title: '图片提示加载失败',
			icon: 'none'
		})
	} finally {
		isLoading.value = false
	}
}

const viewPromptDetail = (prompt) => {
	uni.navigateTo({
		url: `/pages/detail/index?id=${prompt.id}&source=image`
	})
}

const prevPage = () => {
	if (currentPage.value > 1) {
		currentPage.value -= 1
	}
}

const nextPage = () => {
	if (currentPage.value < totalPages.value) {
		currentPage.value += 1
	}
}

onMounted(() => {
	loadImagePromptsData()
})
</script>

<style>
.container,
.page-scroll {
	width: 100vw;
	height: 100vh;
	background: linear-gradient(180deg, #fcfaf6 0%, #ffffff 24%);
}

.hero {
	padding: 116rpx 32rpx 24rpx;
}

.hero-title,
.hero-desc,
.summary-label,
.summary-value,
.empty-title,
.empty-desc,
.page-text {
	display: block;
}

.hero-eyebrow {
	font-size: 22rpx;
	letter-spacing: 4rpx;
	color: #9d8560;
}

.hero-title {
	margin-top: 12rpx;
	font-size: 52rpx;
	font-weight: 700;
	color: #221c12;
}

.hero-desc {
	margin-top: 16rpx;
	font-size: 26rpx;
	line-height: 1.6;
	color: #766957;
}

.toolbar,
.summary,
.grid,
.pagination,
.empty-state {
	padding: 0 32rpx;
}

.search-box {
	padding: 0 32rpx 0 0;
}

.search-input {
	height: 84rpx;
	padding: 0 28rpx;
	background: rgba(255, 255, 255, 0.96);
	border: 1rpx solid #ede3d4;
	border-radius: 24rpx;
	font-size: 28rpx;
	color: #1f1a14;
	box-shadow: 0 10rpx 24rpx rgba(42, 32, 18, 0.04);
}

.chips {
	margin-top: 20rpx;
	white-space: nowrap;
}

.chip-list {
	display: inline-flex;
	gap: 14rpx;
	padding-bottom: 6rpx;
}

.chip {
	padding: 14rpx 24rpx;
	border-radius: 999rpx;
	background: #f5efe4;
	font-size: 24rpx;
	color: #7a6b57;
}

.chip.active {
	background: linear-gradient(135deg, #c9b08b 0%, #a98355 100%);
	color: #ffffff;
	box-shadow: 0 10rpx 24rpx rgba(169, 131, 85, 0.22);
}

.summary {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 16rpx;
	margin-top: 24rpx;
}

.summary-card {
	padding: 22rpx 24rpx;
	border-radius: 24rpx;
	background: #fffdf9;
	border: 1rpx solid #efe5d7;
}

.summary-label {
	font-size: 22rpx;
	color: #9b8b73;
}

.summary-value {
	margin-top: 10rpx;
	font-size: 36rpx;
	font-weight: 700;
	color: #231c12;
}

.summary-value.small {
	font-size: 28rpx;
}

.grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 18rpx;
	margin-top: 24rpx;
	padding-bottom: 24rpx;
}

.card {
	background: #ffffff;
	border-radius: 28rpx;
	overflow: hidden;
	border: 1rpx solid #efe7da;
	box-shadow: 0 10rpx 30rpx rgba(34, 28, 18, 0.06);
}

.card:active {
	transform: translateY(-2rpx);
}

.cover-wrap {
	position: relative;
	height: 320rpx;
	background: linear-gradient(135deg, #f3eee5 0%, #faf8f4 100%);
}

.cover {
	width: 100%;
	height: 100%;
}

.badge,
.count {
	position: absolute;
	top: 18rpx;
	padding: 8rpx 16rpx;
	border-radius: 999rpx;
	font-size: 20rpx;
	color: #ffffff;
	background: rgba(26, 21, 16, 0.7);
}

.badge {
	left: 18rpx;
	max-width: 220rpx;
}

.count {
	right: 18rpx;
}

.card-content {
	padding: 22rpx 22rpx 24rpx;
}

.card-title,
.card-desc,
.card-author,
.card-case {
	display: block;
}

.card-title {
	font-size: 28rpx;
	font-weight: 600;
	line-height: 1.4;
	color: #1f1a14;
}

.card-desc {
	margin-top: 10rpx;
	font-size: 23rpx;
	line-height: 1.5;
	color: #7b6f60;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.card-meta {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12rpx;
	margin-top: 18rpx;
}

.card-author,
.card-case {
	font-size: 22rpx;
	color: #9a8f80;
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-top: 120rpx;
}

.empty-icon {
	font-size: 88rpx;
}

.empty-title {
	margin-top: 24rpx;
	font-size: 32rpx;
	color: #251d13;
}

.empty-desc {
	margin-top: 12rpx;
	font-size: 24rpx;
	color: #8f806d;
}

.pagination {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 18rpx;
	padding-bottom: 48rpx;
}

.page-btn {
	padding: 16rpx 24rpx;
	border-radius: 20rpx;
	background: #f6f0e5;
	font-size: 24rpx;
	color: #6f614f;
}

.page-btn.disabled {
	opacity: 0.35;
}

.page-text {
	font-size: 24rpx;
	color: #7b6d5c;
}
</style>
