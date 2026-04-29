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

<style>
.hero {
	padding: 116rpx 32rpx 12rpx;
}

.hero-eyebrow,
.hero-title {
	display: block;
}

.hero-eyebrow {
	font-size: 22rpx;
	letter-spacing: 4rpx;
	color: #9d8560;
}

.hero-title {
	margin-top: 10rpx;
	font-size: 52rpx;
	font-weight: 700;
	color: #221c12;
}

.toolbar {
	padding: 0 32rpx 6rpx;
}

.search-box {
	position: relative;
	display: flex;
	align-items: center;
}

.search-input {
	flex: 1;
	height: 80rpx;
	padding: 0 80rpx 0 28rpx;
	background: #f5f5f7;
	border: none;
	border-radius: 24rpx;
	font-size: 30rpx;
	color: #1d1d1f;
}

.search-input::placeholder {
	color: #8e8e93;
}

.search-icon {
	position: absolute;
	right: 28rpx;
	width: 36rpx;
	height: 36rpx;
}
</style>
