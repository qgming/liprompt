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

<style lang="scss">
.prompt-card {
	@include lp-card;
	padding: 26rpx 28rpx;
	transition: background-color 0.16s ease;
	position: relative;
	overflow: hidden;
}

.prompt-card:active {
	@include lp-card-active;
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
	color: $lp-text-primary;
	margin-bottom: 8rpx;
	word-break: break-all;
	overflow-wrap: break-word;
	line-height: 1.4;
}

.prompt-desc {
	display: block;
	font-size: 26rpx;
	color: $lp-text-secondary;
	line-height: 1.55;
	word-break: break-all;
	overflow-wrap: break-word;
}

.prompt-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
}

.tag {
	@include lp-fill-control;
	color: $lp-text-secondary;
	font-size: 24rpx;
	padding: 7rpx 15rpx;
	flex-shrink: 0;
}

.tag:active {
	background: $lp-fill-bg-active;
	color: $lp-text-primary;
	border-color: transparent;
}

/* 没有标签时的样式调整 */
.prompt-header:only-child {
	margin-bottom: 0;
}
</style>
