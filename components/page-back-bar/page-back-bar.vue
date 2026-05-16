<template>
	<view class="page-topbar" :style="barStyle">
		<view class="back-pill" :style="pillStyle" @click="handleBack">
			<image class="back-icon" :style="iconStyle" src="/static/icons/back-arrow.svg" mode="aspectFit" />
			<text class="back-label">{{ label }}</text>
		</view>
	</view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'

const props = defineProps({
	label: {
		type: String,
		default: '返回'
	},
	fallbackUrl: {
		type: String,
		default: '/pages/index/index'
	},
	fallbackType: {
		type: String,
		default: 'switchTab'
	},
	marginBottomRpx: {
		type: Number,
		default: 24
	},
	paddingHorizontalRpx: {
		type: Number,
		default: 32
	},
	useSystemInset: {
		type: Boolean,
		default: true
	}
})

const safeTopInset = ref(0)
const topbarHeight = ref(uni.upx2px(64))
const sideInset = ref(uni.upx2px(props.paddingHorizontalRpx))

const barStyle = computed(() => ({
	paddingTop: `${safeTopInset.value}px`,
	minHeight: `${safeTopInset.value + topbarHeight.value}px`,
	paddingLeft: `${sideInset.value}px`,
	paddingRight: `${sideInset.value}px`,
	marginBottom: `${uni.upx2px(props.marginBottomRpx)}px`
}))
const pillStyle = computed(() => ({
	minHeight: `${Math.max(topbarHeight.value, uni.upx2px(50))}px`,
	paddingLeft: `${uni.upx2px(16)}px`,
	paddingRight: `${uni.upx2px(24)}px`,
	borderRadius: `${Math.max(topbarHeight.value, uni.upx2px(50)) / 2}px`
}))
const iconStyle = computed(() => ({
	width: `${uni.upx2px(30)}px`,
	height: `${uni.upx2px(30)}px`
}))

const runFallback = () => {
	if (!props.fallbackUrl) {
		return
	}

	if (props.fallbackType === 'navigateTo') {
		uni.navigateTo({ url: props.fallbackUrl })
		return
	}

	if (props.fallbackType === 'reLaunch') {
		uni.reLaunch({ url: props.fallbackUrl })
		return
	}

	uni.switchTab({ url: props.fallbackUrl })
}

const handleBack = () => {
	uni.navigateBack({
		fail: () => {
			runFallback()
		}
	})
}

const resolveSafeArea = () => {
	const defaultTopbarHeight = uni.upx2px(64)

	try {
		const windowInfo = wx.getWindowInfo()
		const statusBarHeight = Number(windowInfo.statusBarHeight) || 0
		const windowWidth = Number(windowInfo.windowWidth) || 0
		let nextSafeTop = statusBarHeight + 8
		let nextTopbarHeight = defaultTopbarHeight
		let nextSideInset = uni.upx2px(props.paddingHorizontalRpx)

		if (typeof uni.getMenuButtonBoundingClientRect === 'function') {
			const menuButtonRect = uni.getMenuButtonBoundingClientRect()
			if (menuButtonRect?.top) {
				nextSafeTop = menuButtonRect.top
			}
			if (menuButtonRect?.height) {
				nextTopbarHeight = menuButtonRect.height
			}
			if (props.useSystemInset && menuButtonRect?.right && windowWidth) {
				nextSideInset = Math.max(windowWidth - menuButtonRect.right, uni.upx2px(16))
			}
		}

		safeTopInset.value = Math.max(nextSafeTop, uni.upx2px(24))
		topbarHeight.value = Math.max(nextTopbarHeight, defaultTopbarHeight)
		sideInset.value = nextSideInset
	} catch {
		safeTopInset.value = uni.upx2px(24)
		topbarHeight.value = defaultTopbarHeight
		sideInset.value = uni.upx2px(props.paddingHorizontalRpx)
	}
}

onMounted(() => {
	resolveSafeArea()
})
</script>

<style lang="scss">
.page-topbar {
	display: flex;
	align-items: center;
	justify-content: flex-start;
	position: relative;
	z-index: 2;
	box-sizing: border-box;
}

.back-pill {
	@include lp-card($lp-radius-pill);
	display: inline-flex;
	align-items: center;
	gap: 10rpx;
}

.back-pill:active {
	@include lp-card-active;
}

.back-icon {
	width: 30rpx;
	height: 30rpx;
	display: block;
	flex-shrink: 0;
}

.back-label {
	display: block;
	font-size: 28rpx;
	font-weight: 500;
	color: $lp-text-primary;
	line-height: 1;
}
</style>
