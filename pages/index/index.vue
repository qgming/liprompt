<template>
	<view class="container">
		<!-- 简洁标题 -->
		<!-- <view class="header">
			<text class="logo-text">流金提示词</text>
		</view> -->

		<!-- 内容区域 -->
		<view class="content">
			<!-- 功能卡片区域 -->
			<view class="card-grid">
				<!-- 60s读懂世界卡片（保持单行） -->
				<view class="card single-card" @click="navigateTo60s">
					<view class="card-left">
						<view class="card-icon">🌍</view>
					</view>
					<view class="card-right">
						<text class="card-title">60s读懂世界</text>
						<text class="card-desc">每日精选 · 全球要闻</text>
					</view>
				</view>

				<!-- 历史上的今天卡片（保持单行） -->
				<view class="card single-card" @click="navigateToHistory">
					<view class="card-left">
						<view class="card-icon">📜</view>
					</view>
					<view class="card-right">
						<text class="card-title">历史上的今天</text>
						<text class="card-desc">回顾历史 · 启迪未来</text>
					</view>
				</view>

				<!-- 热搜卡片区域（两列布局） -->
				<view class="hot-search-grid">
					<!-- 抖音热搜卡片 -->
					<view class="hot-search-card" @click="navigateToDouyin">
						<view class="hot-search-icon">🔥</view>
						<text class="hot-search-title">抖音热搜</text>
					</view>

					<!-- 微博热搜卡片 -->
					<view class="hot-search-card" @click="navigateToWeibo">
						<view class="hot-search-icon">📱</view>
						<text class="hot-search-title">微博热搜</text>
					</view>

					<!-- 小红书热搜卡片 -->
					<view class="hot-search-card" @click="navigateToXiaohongshu">
						<view class="hot-search-icon">📕</view>
						<text class="hot-search-title">小红书热搜</text>
					</view>

					<!-- 哔哩哔哩热搜卡片 -->
					<view class="hot-search-card" @click="navigateToBilibili">
						<view class="hot-search-icon">📺</view>
						<text class="hot-search-title">哔哩哔哩热搜</text>
					</view>

					<!-- 知乎话题榜卡片 -->
					<view class="hot-search-card" @click="navigateToZhihu">
						<view class="hot-search-icon">📝</view>
						<text class="hot-search-title">知乎话题榜</text>
					</view>

					<!-- 头条热搜卡片 -->
					<view class="hot-search-card" @click="navigateToToutiao">
						<view class="hot-search-icon">📰</view>
						<text class="hot-search-title">头条热搜</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
const navigateTo60s = () => {
	uni.navigateTo({
		url: '/pages/60s/index'
	})
}

const navigateToHistory = () => {
	uni.navigateTo({
		url: '/pages/history/index'
	})
}

const navigateToDouyin = () => {
	uni.navigateTo({
		url: '/pages/douyin/index'
	})
}

const navigateToXiaohongshu = () => {
	uni.navigateTo({
		url: '/pages/xiaohongshu/index'
	})
}

const navigateToWeibo = () => {
	uni.navigateTo({
		url: '/pages/weibo/index'
	})
}

const navigateToBilibili = () => {
	uni.navigateTo({
		url: '/pages/bilibili/index'
	})
}

const navigateToZhihu = () => {
	uni.navigateTo({
		url: '/pages/zhihu/index'
	})
}

const navigateToToutiao = () => {
	uni.navigateTo({
		url: '/pages/toutiao/index'
	})
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
	flex-direction: column;
	align-items: center;
	margin-bottom: 40rpx;
	padding-bottom: 20rpx;
	border-bottom: 2px solid #000000;
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

.content {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.card-grid {
	display: flex;
	flex-direction: column;
	gap: 40rpx;
	width: 100%;
}

/* 单行卡片样式（60s和历史上的今天） */
.card.single-card {
	display: flex;
	align-items: center;
	padding: 40rpx 30rpx;
	background: #ffffff;
	border: 1px solid #000000;
	border-radius: 0;
	border-left: 4rpx solid #000000;
	transition: all 0.2s ease;
}

.card.single-card:active {
	background: #f0f0f0;
	transform: translateY(2rpx);
}

.card-left {
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 30rpx;
}

.card-icon {
	font-size: 60rpx;
}

.card-right {
	display: flex;
	flex-direction: column;
	flex: 1;
}

.card-title {
	font-size: 40rpx;
	font-weight: 700;
	color: #000000;
	margin-bottom: 8rpx;
}

.card-desc {
	font-size: 30rpx;
	color: #333333;
	font-weight: 400;
	line-height: 1.4;
}

/* 热搜卡片网格布局 */
.hot-search-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 20rpx;
	width: 100%;
}

.hot-search-card {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 30rpx 20rpx;
	background: #ffffff;
	border: 1px solid #000000;
	border-radius: 0;
	border-left: 4rpx solid #000000;
	transition: all 0.2s ease;
	text-align: center;
	min-height: 120rpx;
}

.hot-search-card:active {
	background: #f0f0f0;
	transform: translateY(2rpx);
}

.hot-search-icon {
	font-size: 48rpx;
	margin-bottom: 10rpx;
}

.hot-search-title {
	font-size: 32rpx;
	font-weight: 700;
	color: #000000;
	line-height: 1.2;
}
</style>