<template>
	<view class="container">
		<view v-if="prompt" class="detail-content">
			<!-- 头部信息 -->
			<view class="header-section">
				<view class="prompt-emoji">{{ prompt.emoji }}</view>
				<text class="prompt-title">{{ prompt.name }}</text>
				<text class="prompt-description">{{ prompt.description }}</text>

				<!-- 标签 -->
				<view class="prompt-tags">
					<text
						class="tag"
						v-for="tag in prompt.group"
						:key="tag"
					>
						{{ tag }}
					</text>
				</view>
			</view>

			<!-- 提示词内容 -->
			<view class="content-section">
				<view class="section-header">
					<text class="section-title">完整提示词</text>
					<view class="copy-btn" @click="copyPrompt">
						<text class="copy-icon">📋</text>
						<text class="copy-text">复制</text>
					</view>
				</view>

				<view class="prompt-content">
					<text class="content-text">{{ prompt.prompt }}</text>
				</view>
			</view>

			<!-- 操作按钮 -->
			<view class="action-section">
				<view class="action-btn primary" @click="copyPrompt">
					<text class="btn-icon">📋</text>
					<text class="btn-text">复制提示词</text>
				</view>
				<view class="action-btn secondary" @click="sharePrompt">
					<text class="btn-icon">📤</text>
					<text class="btn-text">分享</text>
				</view>
			</view>
		</view>

		<!-- 空状态 -->
		<view v-else class="empty-state">
			<view class="empty-icon">📝</view>
			<text class="empty-text">提示词不存在</text>
			<view class="back-btn" @click="goBack">
				<text class="back-text">返回首页</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const prompt = ref(null)

// 复制提示词
const copyPrompt = () => {
	if (!prompt.value) return

	uni.setClipboardData({
		data: prompt.value.prompt,
		success: () => {
			uni.showToast({
				title: '已复制到剪贴板',
				icon: 'success'
			})
		},
		fail: () => {
			uni.showToast({
				title: '复制失败',
				icon: 'none'
			})
		}
	})
}

// 分享提示词
const sharePrompt = () => {
	if (!prompt.value) return

	// #ifdef MP-WEIXIN
	uni.share({
		provider: 'weixin',
		scene: 'WXSceneSession',
		type: 0,
		href: '',
		title: prompt.value.name,
		summary: prompt.value.description,
		imageUrl: '',
		success: () => {
			uni.showToast({
				title: '分享成功',
				icon: 'success'
			})
		},
		fail: () => {
			uni.showToast({
				title: '分享失败',
				icon: 'none'
			})
		}
	})
	// #endif

	// #ifndef MP-WEIXIN
	uni.showToast({
		title: '当前平台不支持分享',
		icon: 'none'
	})
	// #endif
}

// 返回上一页
const goBack = () => {
	uni.navigateBack({
		fail: () => {
			// 如果无法返回（比如没有历史记录），则跳转到首页
			uni.switchTab({
				url: '/pages/index/index'
			})
		}
	})
}

// 页面加载时获取提示词数据
onMounted(() => {
	try {
		const storedPrompt = uni.getStorageSync('currentPrompt')
		if (storedPrompt) {
			prompt.value = storedPrompt
		} else {
			console.warn('未找到提示词数据')
		}
	} catch (error) {
		console.error('获取提示词数据失败:', error)
	}
})
</script>

<style>
.container {
	min-height: 100vh;
	background: #ffffff;
	padding-bottom: 40rpx;
}

.detail-content {
	padding: 24rpx 32rpx 32rpx 32rpx;
}

/* 头部信息 */
.header-section {
	background: #ffffff;
	border-radius: 20rpx;
	padding: 40rpx 32rpx;
	margin-bottom: 24rpx;
	border: 1rpx solid #f0f0f0;
	text-align: center;
	box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
	transition: all 0.2s ease;
	position: relative;
	overflow: hidden;
}

.header-section::after {
	content: '';
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: linear-gradient(135deg, rgba(255, 215, 0, 0.05) 0%, rgba(255, 165, 0, 0.02) 100%);
	border-radius: 20rpx;
	opacity: 0;
	transition: opacity 0.2s ease;
	pointer-events: none;
}

.header-section:active::after {
	opacity: 1;
}

.prompt-emoji {
	font-size: 80rpx;
	margin-bottom: 20rpx;
}

.prompt-title {
	display: block;
	font-size: 44rpx;
	font-weight: 600;
	color: #1d1d1f;
	margin-bottom: 16rpx;
	line-height: 1.3;
}

.prompt-description {
	display: block;
	font-size: 30rpx;
	color: #8e8e93;
	line-height: 1.5;
	margin-bottom: 24rpx;
}

.prompt-tags {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 12rpx;
}

.tag {
	background: #f2f2f7;
	color: #8e8e93;
	font-size: 24rpx;
	padding: 8rpx 16rpx;
	border-radius: 16rpx;
}

/* 内容区域 */
.content-section {
	background: #ffffff;
	border-radius: 20rpx;
	padding: 32rpx;
	margin-bottom: 24rpx;
	border: 1rpx solid #f0f0f0;
	box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
	transition: all 0.2s ease;
	position: relative;
	overflow: hidden;
}

.content-section::after {
	content: '';
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: linear-gradient(135deg, rgba(255, 215, 0, 0.05) 0%, rgba(255, 165, 0, 0.02) 100%);
	border-radius: 20rpx;
	opacity: 0;
	transition: opacity 0.2s ease;
	pointer-events: none;
}

.content-section:active::after {
	opacity: 1;
}

.section-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20rpx;
}

.section-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #1d1d1f;
}

.copy-btn {
	display: flex;
	align-items: center;
	gap: 8rpx;
	padding: 12rpx 20rpx;
	background: #f2f2f7;
	border-radius: 20rpx;
	transition: all 0.2s ease;
}

.copy-btn:active {
	background: #e8e8ed;
	transform: translateY(-1rpx);
}

.copy-icon {
	font-size: 24rpx;
}

.copy-text {
	font-size: 24rpx;
	color: #8e8e93;
}

.prompt-content {
	background: #fafbfc;
	border-radius: 16rpx;
	padding: 24rpx;
	border: 1rpx solid #f0f0f0;
}

.content-text {
	font-size: 28rpx;
	color: #1d1d1f;
	line-height: 1.6;
	white-space: pre-wrap;
	word-wrap: break-word;
	user-select: text;
	-webkit-user-select: text;
	-moz-user-select: text;
	-ms-user-select: text;
}

/* 操作按钮 */
.action-section {
	display: flex;
	gap: 16rpx;
}

.action-btn {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12rpx;
	padding: 24rpx;
	border-radius: 20rpx;
	transition: all 0.2s ease;
	position: relative;
	overflow: hidden;
}

.action-btn:active {
	transform: translateY(-2rpx);
}

.action-btn.primary {
	background: #B8A88C;
	color: #ffffff;
	box-shadow: 0 4rpx 16rpx rgba(184, 168, 140, 0.3);
}

.action-btn.primary:active {
	background: #a69a7d;
	box-shadow: 0 6rpx 20rpx rgba(184, 168, 140, 0.4);
}

.action-btn.secondary {
	background: #ffffff;
	color: #8e8e93;
	border: 1rpx solid #f0f0f0;
	box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.action-btn.secondary:active {
	background: #f8f9fa;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.btn-icon {
	font-size: 28rpx;
}

.btn-text {
	font-size: 28rpx;
	font-weight: 500;
}

/* 空状态 */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 120rpx 40rpx;
	text-align: center;
}

.empty-icon {
	font-size: 120rpx;
	margin-bottom: 32rpx;
	opacity: 0.6;
}

.empty-text {
	font-size: 32rpx;
	color: #8e8e93;
	margin-bottom: 40rpx;
}

.back-btn {
	padding: 20rpx 40rpx;
	background: #B8A88C;
	color: #ffffff;
	border-radius: 24rpx;
	transition: all 0.2s ease;
}

.back-btn:active {
	background: #a69a7d;
	transform: translateY(-2rpx);
}

.back-text {
	font-size: 28rpx;
	font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 750rpx) {
	.detail-content {
		padding: 16rpx 24rpx 24rpx 24rpx;
	}

	.header-section {
		padding: 32rpx 24rpx;
	}

	.prompt-emoji {
		font-size: 70rpx;
	}

	.prompt-title {
		font-size: 40rpx;
	}

	.prompt-description {
		font-size: 28rpx;
	}

	.content-section {
		padding: 24rpx;
	}

	.section-header {
		margin-bottom: 16rpx;
	}

	.prompt-content {
		padding: 20rpx;
	}

	.content-text {
		font-size: 26rpx;
	}

	.action-section {
		flex-direction: column;
		gap: 12rpx;
	}
}
</style>