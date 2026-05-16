<template>
	<view class="hero-shell">
		<view class="hero">
			<text class="hero-eyebrow">{{ eyebrow }}</text>
			<text class="hero-title">{{ title }}</text>
		</view>

		<view class="toolbar">
			<view class="search-box">
				<input class="search-input" type="text" :value="modelValue" :placeholder="placeholder" @input="handleInput" />
				<image class="search-icon" src="/static/icons/search.svg" mode="aspectFit" />
			</view>
			<slot />
		</view>
	</view>
</template>

<script setup>
defineProps({
	eyebrow: {
		type: String,
		required: true
	},
	title: {
		type: String,
		required: true
	},
	placeholder: {
		type: String,
		default: '搜索...'
	},
	modelValue: {
		type: String,
		default: ''
	}
})

const emit = defineEmits(['update:modelValue', 'input'])

const handleInput = (event) => {
	const value = event.detail?.value ?? ''
	emit('update:modelValue', value)
	emit('input', event)
}
</script>

<style lang="scss">
.hero-shell {
	@include lp-page;
}

.hero {
	padding: 116rpx $lp-page-padding 16rpx;
}

.hero-eyebrow,
.hero-title {
	display: block;
}

.hero-eyebrow {
	font-size: 22rpx;
	letter-spacing: 3rpx;
	color: $lp-text-tertiary;
}

.hero-title {
	margin-top: 12rpx;
	font-size: 54rpx;
	font-weight: 700;
	line-height: 1.12;
	color: $lp-text-primary;
}

.toolbar {
	padding: 0 $lp-page-padding 12rpx;
}

.search-box {
	position: relative;
	display: flex;
	align-items: center;
}

.search-input {
	@include lp-card;
	flex: 1;
	height: 88rpx;
	padding: 0 86rpx 0 30rpx;
	font-size: 30rpx;
	color: $lp-text-primary;
}

.search-input::placeholder {
	color: $lp-text-tertiary;
}

.search-icon {
	position: absolute;
	right: 30rpx;
	width: 36rpx;
	height: 36rpx;
	opacity: 0.72;
}
</style>
