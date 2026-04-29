<template>
	<view class="card" @click="handleClick">
		<view v-if="prompt.emoji" class="emoji">{{ prompt.emoji }}</view>
		<text class="title">{{ prompt.name }}</text>
		<text class="desc">{{ prompt.description }}</text>
		<view v-if="visibleTags.length" class="tags">
			<text v-for="tag in visibleTags" :key="tag" class="tag" @click.stop="handleTagClick(tag)">
				{{ tag }}
			</text>
		</view>
	</view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
	prompt: {
		type: Object,
		required: true
	}
})

const emit = defineEmits(['click', 'tagClick'])

const visibleTags = computed(() => {
	return Array.isArray(props.prompt.group) ? props.prompt.group.slice(0, 4) : []
})

const handleClick = () => {
	emit('click', props.prompt)
}

const handleTagClick = (tag) => {
	emit('tagClick', tag)
}
</script>

<style>
.card {
	background: #ffffff;
	border-radius: 28rpx;
	padding: 24rpx 24rpx 22rpx;
	border: 1rpx solid #efe7da;
	box-shadow: 0 10rpx 30rpx rgba(34, 28, 18, 0.06);
}

.card:active {
	transform: translateY(-2rpx);
}

.emoji,
.title,
.desc {
	display: block;
}

.emoji {
	width: 100%;
	font-size: 52rpx;
	line-height: 1.05;
	text-align: left;
}

.title {
	margin-top: 16rpx;
	font-size: 30rpx;
	font-weight: 600;
	line-height: 1.4;
	color: #1f1a14;
	word-break: break-word;
}

.desc {
	margin-top: 10rpx;
	font-size: 24rpx;
	line-height: 1.6;
	color: #7d6f5d;
	word-break: break-word;
	display: -webkit-box;
	-webkit-line-clamp: 4;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.tags {
	display: flex;
	flex-wrap: wrap;
	gap: 10rpx;
	margin-top: 18rpx;
}

.tag {
	padding: 8rpx 16rpx;
	border-radius: 999rpx;
	font-size: 22rpx;
	color: #7d6d5a;
	background: #f6f0e6;
}
</style>
