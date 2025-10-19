<template>
	<view class="trending-card" @click="handleClick">
		<view class="trending-emoji">{{ prompt.emoji }}</view>
		<text class="trending-name">{{ prompt.name }}</text>
	</view>
</template>

<script setup>
const props = defineProps({
	prompt: {
		type: Object,
		required: true
	}
})

const emit = defineEmits(['click'])

const handleClick = () => {
	emit('click', props.prompt)
}
</script>

<style>
.trending-card {
	background: #ffffff;
	border-radius: 16rpx;
	padding: 20rpx 24rpx;
	min-width: 120rpx;
	max-width: 200rpx;
	width: fit-content;
	text-align: center;
	box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
	border: 1rpx solid #f0f0f0;
	transition: all 0.2s ease;
	display: inline-flex;
	flex-direction: column;
	align-items: center;
	white-space: nowrap;
}

.trending-card:active {
	transform: translateY(-2rpx);
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
	background: #f8f9fa;
}

.trending-emoji {
	font-size: 40rpx;
	margin-bottom: 12rpx;
	flex-shrink: 0;
}

.trending-name {
	display: block;
	font-size: 26rpx;
	font-weight: 500;
	color: #1d1d1f;
	line-height: 1.3;
	word-break: keep-all;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 100%;
}

/* 响应式设计 */
@media (max-width: 750rpx) {
	.trending-card {
		min-width: 100rpx;
		max-width: 160rpx;
		padding: 16rpx 20rpx;
	}

	.trending-emoji {
		font-size: 36rpx;
	}

	.trending-name {
		font-size: 24rpx;
	}
}
</style>