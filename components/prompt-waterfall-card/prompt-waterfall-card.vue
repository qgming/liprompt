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

<style lang="scss">
.card {
	@include lp-card;
	padding: 24rpx 24rpx 22rpx;
	transition: background-color 0.16s ease;
}

.card:active {
	@include lp-card-active;
}

.emoji,
.title,
.desc {
	display: block;
}

.emoji {
	width: 100%;
	font-size: 50rpx;
	line-height: 1.05;
	text-align: left;
}

.title {
	margin-top: 16rpx;
	font-size: 30rpx;
	font-weight: 600;
	line-height: 1.42;
	color: $lp-text-primary;
	word-break: break-word;
}

.desc {
	margin-top: 10rpx;
	font-size: 24rpx;
	line-height: 1.6;
	color: $lp-text-secondary;
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
	margin-top: 20rpx;
}

.tag {
	@include lp-fill-control;
	padding: 7rpx 14rpx;
	font-size: 22rpx;
	color: $lp-text-secondary;
}
</style>
