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
	border-radius: 22rpx;
	padding: 12rpx 22rpx;
	height: 92rpx;
	box-shadow: 0 10rpx 24rpx rgba(34, 28, 18, 0.06);
	border: 1rpx solid #efe7da;
	transition: all 0.2s ease;
	display: inline-flex;
	flex: 0 0 auto;
	width: auto;
	align-items: center;
	justify-content: flex-start;
	gap: 14rpx;
	max-width: 360rpx;
}

.trending-card:active {
	transform: translateY(-2rpx);
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
	background: #f8f9fa;
}

.trending-emoji {
	font-size: 42rpx;
	flex-shrink: 0;
}

.trending-name {
	display: block;
	font-size: 28rpx;
	font-weight: 600;
	color: #241d14;
	line-height: 1.3;
	text-align: left;
	word-break: keep-all;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	flex: 0 1 auto;
	max-width: 250rpx;
}

/* 响应式设计 */
@media (max-width: 750rpx) {
	.trending-card {
		height: 88rpx;
		padding: 10rpx 18rpx;
		gap: 12rpx;
		max-width: 320rpx;
	}

	.trending-emoji {
		font-size: 36rpx;
	}

	.trending-name {
		font-size: 26rpx;
		max-width: 228rpx;
	}
}
</style>
