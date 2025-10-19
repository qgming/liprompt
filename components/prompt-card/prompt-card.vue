<template>
	<view class="prompt-card" @click="handleClick">
		<view class="prompt-header">
			<view class="prompt-emoji">{{ prompt.emoji }}</view>
			<view class="prompt-info">
				<text class="prompt-name">{{ prompt.name }}</text>
				<text class="prompt-desc">{{ prompt.description }}</text>
			</view>
		</view>
		<view v-if="prompt.group && prompt.group.length > 0" class="prompt-tags">
			<text class="tag" v-for="tag in prompt.group" :key="tag" @click.stop="handleTagClick(tag)">
				{{ tag }}
			</text>
		</view>
	</view>
</template>

<script setup>
const props = defineProps({
	prompt: {
		type: Object,
		required: true
	}
})

const emit = defineEmits(['click', 'tagClick'])

const handleClick = () => {
	emit('click', props.prompt)
}

const handleTagClick = (tag) => {
	emit('tagClick', tag)
}
</script>

<style>
.prompt-card {
	background: #ffffff;
	border-radius: 20rpx;
	padding: 24rpx 28rpx;
	box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
	border: 1rpx solid #f0f0f0;
	transition: all 0.2s ease;
	position: relative;
	overflow: hidden;
}

.prompt-card:active {
	transform: translateY(-2rpx);
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
	background: #f8f9fa;
}

.prompt-card::after {
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

.prompt-card:active::after {
	opacity: 1;
}

.prompt-header {
	display: flex;
	align-items: flex-start;
	margin-bottom: 16rpx;
}

.prompt-emoji {
	font-size: 44rpx;
	margin-right: 20rpx;
	margin-top: 4rpx;
	width: 44rpx;
	text-align: center;
	flex-shrink: 0;
}

.prompt-info {
	flex: 1;
	min-width: 0;
}

.prompt-name {
	display: block;
	font-size: 32rpx;
	font-weight: 600;
	color: #1d1d1f;
	margin-bottom: 8rpx;
	word-break: break-all;
	overflow-wrap: break-word;
	line-height: 1.4;
}

.prompt-desc {
	display: block;
	font-size: 26rpx;
	color: #8e8e93;
	line-height: 1.4;
	word-break: break-all;
	overflow-wrap: break-word;
}

.prompt-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
}

.tag {
	background: #f2f2f7;
	color: #8e8e93;
	font-size: 24rpx;
	padding: 8rpx 16rpx;
	border-radius: 16rpx;
	transition: all 0.2s ease;
	flex-shrink: 0;
}

.tag:active {
	background: #B8A88C;
	color: #ffffff;
}

/* 没有标签时的样式调整 */
.prompt-header:only-child {
	margin-bottom: 0;
}
</style>